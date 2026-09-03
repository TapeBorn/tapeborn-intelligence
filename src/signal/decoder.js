// src/signal/decoder.js
// Event log decoder — ERC-20 Transfer, Approval, and other common events.
// Supports Arc testnet (Ethereum-compatible logs).

const { hexToInt } = require("../orchestrator/arc");

// ERC-20 event signatures (keccak256 of the event signature)
const SIGNATURES = {
  TRANSFER: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  APPROVAL: "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
  DEPOSIT: "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c", // WETH deposit
  WITHDRAWAL: "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65", // WETH withdrawal
};

function padHex(s) {
  if (!s) return "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (s.startsWith("0x")) s = s.slice(2);
  return "0x" + s.padStart(64, "0");
}

function decodeAddress(data, offset = 0) {
  // data is a hex string like "0x0000...0000abcdef..."
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  const start = offset * 64;
  const slice = hex.slice(start, start + 64);
  // Last 40 chars = address
  const addr = "0x" + slice.slice(-40);
  return addr;
}

function decodeUint(data, offset = 0) {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  const start = offset * 64;
  const slice = hex.slice(start, start + 64);
  return BigInt("0x" + slice);
}

function decodeTransfer(log) {
  // ERC-20 Transfer: indexed topics [0]=sig, [1]=from, [2]=to; data = value
  const topics = log.topics || [];
  if (topics.length < 3) return null;
  if (topics[0] !== SIGNATURES.TRANSFER) return null;

  const from = "0x" + topics[1].slice(-40);
  const to = "0x" + topics[2].slice(-40);
  let value = 0n;
  if (log.data && log.data !== "0x") {
    try { value = BigInt(log.data); } catch (_) { value = 0n; }
  }

  return {
    event: "Transfer",
    from,
    to,
    valueWei: "0x" + value.toString(16),
    valueDec: value.toString(),
    valueHuman: Number(value) / 1e18, // assuming 18 decimals; adjust per token
  };
}

function decodeApproval(log) {
  const topics = log.topics || [];
  if (topics.length < 3) return null;
  if (topics[0] !== SIGNATURES.APPROVAL) return null;

  const owner = "0x" + topics[1].slice(-40);
  const spender = "0x" + topics[2].slice(-40);
  let value = 0n;
  if (log.data && log.data !== "0x") {
    try { value = BigInt(log.data); } catch (_) { value = 0n; }
  }

  return {
    event: "Approval",
    owner,
    spender,
    valueWei: "0x" + value.toString(16),
    valueDec: value.toString(),
    valueHuman: Number(value) / 1e18,
  };
}

function decodeDeposit(log) {
  const topics = log.topics || [];
  if (topics[0] !== SIGNATURES.DEPOSIT) return null;
  const dst = "0x" + topics[1].slice(-40);
  const wad = BigInt(log.data || "0x0");
  return {
    event: "Deposit",
    dst,
    wadWei: "0x" + wad.toString(16),
    wadDec: wad.toString(),
    wadHuman: Number(wad) / 1e18,
  };
}

function decodeWithdrawal(log) {
  const topics = log.topics || [];
  if (topics[0] !== SIGNATURES.WITHDRAWAL) return null;
  const src = "0x" + topics[1].slice(-40);
  const wad = BigInt(log.data || "0x0");
  return {
    event: "Withdrawal",
    src,
    wadWei: "0x" + wad.toString(16),
    wadDec: wad.toString(),
    wadHuman: Number(wad) / 1e18,
  };
}

function decodeLog(log) {
  if (!log || !log.topics || log.topics.length === 0) return null;
  const sig = log.topics[0];
  if (sig === SIGNATURES.TRANSFER) return decodeTransfer(log);
  if (sig === SIGNATURES.APPROVAL) return decodeApproval(log);
  if (sig === SIGNATURES.DEPOSIT) return decodeDeposit(log);
  if (sig === SIGNATURES.WITHDRAWAL) return decodeWithdrawal(log);
  return null;
}

module.exports = {
  decodeLog,
  decodeTransfer,
  decodeApproval,
  decodeDeposit,
  decodeWithdrawal,
  SIGNATURES,
  hexToInt,
};