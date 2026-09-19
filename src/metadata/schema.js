// src/metadata/schema.js
// BUILD_011 — Metadata System
// Standardized provenance, Signal ID, and evidence for Signal Artifacts.
// Version: v1.0.0

const { getCurrentNetwork } = require("../orchestrator/networks");
const { keccak256, toUtf8Bytes } = require("ethers");

/**
 * Generate a deterministic Signal ID from signal data and provenance.
 * Uses canonical keccak256(payload) as per signal-spec.yaml v1.0.0.
 * Payload: chainId|signalType|signalVersion|blockNumber|blockHash|transactionHash|logIndex|relevantAddresses|relevantValues
 * Output format: sig_<hex>
 */
function generateSignalId(signal, provenance) {
  // Canonical payload fields per signal-spec.yaml v1.0.0
  const network = getCurrentNetwork();
  
  // Build canonical payload components
  const components = [
    String(network.chainId),                                    // chainId
    String(signal.type || "unknown"),                           // signalType
    String(signal.version || "1.0.0"),                          // signalVersion
    String(provenance.block || signal.data?.blockNumber || "0"), // blockNumber
    String(provenance.blockHash || "0x"),                       // blockHash
    String(provenance.sourceTransaction || signal.data?.txHash || signal.evidence?.txHash || "0x"), // transactionHash
    String(provenance.logIndex || signal.data?.logIndex || "0"), // logIndex
    // relevantAddresses: from, to, contractAddress (comma-separated)
    [
      provenance.from || signal.data?.from || signal.evidence?.from || "",
      provenance.to || signal.data?.to || "",
      provenance.contractAddress || signal.data?.contractAddress || ""
    ].filter(Boolean).join(",") || "",                          // relevantAddresses
    // relevantValues: valueUsdc, inputLength, txCount, etc. (comma-separated)
    [
      signal.data?.valueUsdc !== undefined ? String(signal.data.valueUsdc) : "",
      signal.data?.inputLength !== undefined ? String(signal.data.inputLength) : "",
      signal.data?.txCount !== undefined ? String(signal.data.txCount) : "",
      signal.data?.interval !== undefined ? String(signal.data.interval) : "",
      signal.data?.averageVolume !== undefined ? String(signal.data.averageVolume) : ""
    ].filter(Boolean).join(",") || ""                           // relevantValues
  ];

  // Join with '|' separator as per spec
  const payload = components.join("|");
  
  // Compute keccak256
  const hash = keccak256(toUtf8Bytes(payload));
  
  // Remove 0x prefix, take first 8 bytes (16 hex chars) for compact ID
  // Full hash is 32 bytes (64 hex chars), we use 8 bytes for compactness
  const compactHash = hash.slice(2, 18); // 16 hex chars = 8 bytes
  
  return `sig_${compactHash}`;
}

/**
 * Build provenance object from signal and block data.
 */
function buildProvenance(signal, blockData) {
  const network = getCurrentNetwork();
  const provenance = {
    chain: network.name,
    chainId: network.chainId,
    block: signal.data?.blockNumber ?? blockData?.number ?? null,
    sourceTransaction: signal.evidence?.txHash || signal.data?.txHash || null,
  };
  // Only add timestamp if it's a genuine source/event timestamp
  if (signal.timestamp) {
    provenance.timestamp = signal.timestamp;
  }
  // Add optional fields if available
  if (signal.data?.from) provenance.from = signal.data.from;
  if (signal.data?.to) provenance.to = signal.data.to;
  if (signal.data?.contractAddress) provenance.contractAddress = signal.data.contractAddress;
  if (signal.data?.logIndex !== undefined) provenance.logIndex = signal.data.logIndex;
  if (signal.data?.eventSignature) provenance.eventSignature = signal.data.eventSignature;
  if (signal.data?.blockHash) provenance.blockHash = signal.data.blockHash;
  return provenance;
}

/**
 * Build evidence array from signal's evidence object.
 * Evidence must be machine-readable and factual.
 */
function buildEvidence(signal) {
  const evidence = [];
  if (signal.evidence?.txHash) {
    evidence.push({
      type: "transaction",
      value: signal.evidence.txHash,
      description: "Source transaction hash",
    });
  }
  if (signal.evidence?.block) {
    evidence.push({
      type: "block",
      value: signal.evidence.block,
      description: "Block number where signal was detected",
    });
  }
  if (signal.data?.inputLength !== undefined) {
    evidence.push({
      type: "inputLength",
      value: signal.data.inputLength,
      description: "Transaction input length in bytes",
    });
  }
  if (signal.data?.valueUsdc !== undefined) {
    evidence.push({
      type: "valueUsdc",
      value: signal.data.valueUsdc,
      description: "USDC value transferred",
    });
  }
  if (signal.data?.txCount !== undefined) {
    evidence.push({
      type: "txCount",
      value: signal.data.txCount,
      description: "Number of transactions in block from same sender",
    });
  }
  if (signal.data?.blockRange) {
    evidence.push({
      type: "blockRange",
      value: signal.data.blockRange,
      description: "Block range for windowed detection",
    });
  }
  if (signal.data?.averageVolume !== undefined) {
    evidence.push({
      type: "averageVolume",
      value: signal.data.averageVolume,
      description: "Historical average volume for comparison",
    });
  }
  if (signal.data?.lastSeenBlock !== undefined) {
    evidence.push({
      type: "lastSeenBlock",
      value: signal.data.lastSeenBlock,
      description: "Last block where address was active",
    });
  }
  if (signal.data?.interval !== undefined) {
    evidence.push({
      type: "interval",
      value: signal.data.interval,
      description: "Blocks since last activity",
    });
  }
  // Add any other evidence fields from signal.evidence that aren't already covered
  for (const [key, val] of Object.entries(signal.evidence || {})) {
    if (!["txHash", "block", "description", "from"].includes(key)) {
      evidence.push({
        type: key,
        value: val,
        description: `Additional evidence: ${key}`,
      });
    }
  }
  return evidence;
}

/**
 * Build a standardized metadata object for a Signal Artifact.
 */
function buildMetadata(signal, blockData, options = {}) {
  const { artifactNumber = null, customName = null } = options;

  const provenance = buildProvenance(signal, blockData);
  const signalId = generateSignalId(signal, provenance);
  const evidence = buildEvidence(signal);

  // Build description from signal's evidence description if available
  let description = signal.evidence?.description || `Signal of type ${signal.type}`;
  // Add artifact number if provided
  if (artifactNumber !== null) {
    description = `Signal Artifact #${artifactNumber}: ${description}`;
  }

  const metadata = {
    name: customName || (artifactNumber !== null ? `Signal Artifact #${artifactNumber}` : "Signal Artifact"),
    description: description,
    signalId: signalId,
    signalType: signal.type,
    provenance: provenance,
    signal: {
      confidence: signal.confidence || 0.8,
      version: signal.version || "v0",
    },
    evidence: evidence,
    // Additional metadata fields
    schemaVersion: "v1.0.0",
    generatedAt: new Date().toISOString(),
  };

  return metadata;
}

/**
 * Validate that metadata contains all required fields.
 * Returns { valid: boolean, errors: string[] }
 */
function validateMetadata(metadata) {
  const errors = [];
  const required = [
    "name",
    "description",
    "signalId",
    "signalType",
    "provenance",
    "signal",
    "evidence",
  ];
  for (const field of required) {
    if (!metadata[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (metadata.provenance) {
    const provRequired = ["chain", "chainId", "block"];
    // sourceTransaction is optional; may be null for some signal types (e.g., high_frequency_wallet)
    for (const field of provRequired) {
      if (metadata.provenance[field] === undefined || metadata.provenance[field] === null) {
        errors.push(`Missing provenance field: ${field}`);
      }
    }
    // sourceTransaction is optional, but if present it should be a string
    if (metadata.provenance.sourceTransaction !== undefined && metadata.provenance.sourceTransaction !== null) {
      // valid
    }
  }
  if (metadata.signal) {
    if (metadata.signal.confidence === undefined || metadata.signal.confidence === null) {
      errors.push("Missing signal.confidence");
    }
    if (!metadata.signal.version) {
      errors.push("Missing signal.version");
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  generateSignalId,
  buildProvenance,
  buildEvidence,
  buildMetadata,
  validateMetadata,
};