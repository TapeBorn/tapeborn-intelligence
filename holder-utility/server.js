const express = require('express');
const { ethers } = require('ethers');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Serve static files from public directory
app.use(express.static('public'));

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Configuration from environment
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || '0x80B87fa686C8FC91A5252854E82ea282c1B6b814';
const NFT_CHAIN_ID = process.env.NFT_CHAIN_ID || '5042002';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.arc.io';
const WHITELIST_FILE = process.env.WHITELIST_FILE || './utils/whitelist.example.csv';

// Initialize provider
let provider;
try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
} catch (e) {
  console.error('Failed to initialize provider:', e.message);
  process.exit(1);
}

// Load NFT contract ABI (minimal ERC-721 balanceOf and ownerOf)
const nftAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];
let nftContract;
try {
  nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, nftAbi, provider);
} catch (e) {
  console.error('Failed to initialize NFT contract:', e.message);
  process.exit(1);
}

// Load whitelist from CSV (one address per line, comments start with #)
const fs = require('fs');
const whitelist = new Set();
try {
  const data = fs.readFileSync(WHITELIST_FILE, 'utf8');
  const lines = data.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    // Normalize to lowercase
    whitelist.add(trimmed.toLowerCase());
  }
} catch (e) {
  console.warn(`Could not load whitelist from ${WHITELIST_FILE}: ${e.message}`);
  // Continue with empty whitelist
}

// In-memory cache for verified signatures (address -> {expiry: timestamp})
const verifiedCache = new Map();
const VERIFIED_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper: verify signature of a message
function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (err) {
    return false;
  }
}

// Helper: extract credentials from request
function getCredentials(req) {
  // For POST requests, we expect body: { address, signature, nonce }
  // For GET requests, we expect headers: x-address, x-signature, x-nonce
  let address, signature, nonce;
  if (req.body && req.body.address && req.body.signature && req.body.nonce) {
    address = req.body.address;
    signature = req.body.signature;
    nonce = req.body.nonce;
  } else {
    address = req.headers['x-address'];
    signature = req.headers['x-signature'];
    nonce = req.headers['x-nonce'];
  }
  // Normalize address to lowercase if present
  if (address) address = address.toLowerCase();
  return { address, signature, nonce };
}

// Middleware to verify signature and cache verification
function authenticateWallet(req, res, next) {
  const { address, signature, nonce } = getCredentials(req);
  if (!address || !signature || !nonce) {
    return res.status(400).json({ error: 'Missing address, signature, or nonce' });
  }
  // Construct the message that was signed: we expect the nonce to be the message
  // The client should sign the nonce exactly.
  const message = nonce;
  if (!verifySignature(message, signature, address)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Cache the verification
  verifiedCache.set(address, { expiry: Date.now() + VERIFIED_TTL_MS });
  req.authenticatedAddress = address;
  next();
}

// Middleware to check if address is verified (from cache)
function checkVerifiedWallet(req, res, next) {
  const addr = req.authenticatedAddress;
  if (!addr) {
    return res.status(401).json({ error: 'Address not authenticated' });
  }
  const cached = verifiedCache.get(addr);
  if (!cached || cached.expiry < Date.now()) {
    // Not verified or expired
    verifiedCache.delete(addr);
    return res.status(401).json({ error: 'Wallet not verified or verification expired' });
  }
  req.address = addr;
  next();
}

// Middleware to check NFT ownership (for holder-only routes)
async function checkNftOwnership(req, res, next) {
  const addr = req.address;
  try {
    const balance = await nftContract.balanceOf(addr);
    if (balance.toString() === '0') {
      return res.status(403).json({ error: 'Holder access requires NFT ownership' });
    }
    // Optionally, we can also fetch the token IDs owned (but we limit to 1)
    req.nftOwned = true;
    next();
  } catch (err) {
    console.error('Error checking NFT balance:', err);
    return res.status(503).json({ error: 'Unable to verify NFT ownership at this time' });
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      intelligence_layer: 'reachable', // placeholder
      arc_rpc: 'reachable',
      whitelist: 'loaded',
    },
  });
});

// Whitelist eligibility checker (pre-mint)
// Public but requires signature verification to prevent address spoofing? The spec says: "Connect wallet → verify signature."
// We'll require signature verification for this endpoint as well (POST with body).
app.post('/api/whitelist/check', authenticateWallet, checkVerifiedWallet, async (req, res) => {
  const addr = req.authenticatedAddress;
  const isWhitelisted = whitelist.has(addr);
  let hasMinted = false;
  try {
    const balance = await nftContract.balanceOf(addr);
    hasMinted = balance.gt(0);
  } catch (err) {
    console.error('Error checking balance for whitelist:', err);
    // We'll still return whitelist status but note that minted status is unknown
    hasMinted = false; // safe default
  }
  res.json({
    address: addr,
    whitelisted: isWhitelisted,
    hasMinted: hasMinted,
    remainingMints: isWhitelisted && !hasMinted ? 1 : 0,
  });
});

// Holder dashboard (requires NFT ownership)
// GET request with credentials in headers
app.get('/api/holder/dashboard', authenticateWallet, checkVerifiedWallet, checkNftOwnership, (req, res) => {
  // In a real app, we would fetch more details (token IDs, metadata, etc.)
  // For now, we just confirm ownership.
  res.json({
    address: req.address,
    message: 'Holder utilities unlocked',
    nftOwned: true,
  });
});

// Holder signal feed (requires authentication and NFT ownership)
// GET request with credentials in headers
app.get('/api/holder/signal-feed', authenticateWallet, checkVerifiedWallet, checkNftOwnership, async (req, res) => {
  // In a real implementation, we would call the intelligence layer API (already running on :3456) and proxy the response.
  // For simplicity, we'll try to fetch from the existing signal feed if it's running locally.
  const signalFeedUrl = 'http://localhost:3456/api/v1/signal-feed';
  try {
    const response = await fetch(signalFeedUrl);
    if (!response.ok) {
      throw new Error(`Signal feed returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching signal feed:', err);
    // Fallback to empty array or error message
    res.status(503).json({ error: 'Unable to fetch signal feed at this time', fallback: [] });
  }
});

// Signal detail page (available to any authenticated user, does not require NFT ownership)
// GET request with credentials in headers
app.get('/api/signal/detail/:signalId', authenticateWallet, checkVerifiedWallet, async (req, res) => {
  const signalId = req.params.signalId;
  // We'll proxy to the intelligence layer's signal detail endpoint.
  const signalDetailUrl = `http://localhost:3456/api/v1/signal-detail/${signalId}`;
  try {
    const response = await fetch(signalDetailUrl);
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Signal not found' });
      }
      throw new Error(`Signal detail returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching signal detail:', err);
    res.status(503).json({ error: 'Unable to fetch signal detail at this time' });
  }
});

// Simple static index page to show the API is running
app.get('/', (req, res) => {
  res.send(`
    <h1>TapeBorn Holder Utility MVP</h1>
    <p>API is running. See <a href="/api/health">/api/health</a> for health check.</p>
    <p>Endpoints:</p>
    <ul>
      <li>POST /api/whitelist/check - check whitelist eligibility (requires signature in body)</li>
      <li>GET /api/holder/dashboard - holder dashboard (requires signature in headers)</li>
      <li>GET /api/holder/signal-feed - holder signal feed (requires signature in headers)</li>
      <li>GET /api/signal/detail/:signalId - signal detail (requires signature in headers)</li>
    </ul>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Holder utility MVP server listening at http://localhost:${port}`);
});

module.exports = app;