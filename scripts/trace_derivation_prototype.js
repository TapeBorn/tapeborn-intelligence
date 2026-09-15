/**
 * Trace-linked Mint Mechanic Prototype
 * Derives deterministic Trace trait from on-chain data (txHash, blockNumber)
 *
 * Algorithm:
 * 1. Combine txHash (without 0x) and blockNumber (as decimal string) into a single string.
 * 2. Compute keccak256 hash of that string to get a 32-byte seed.
 * 3. Use the seed to derive:
 *    - entryX: (seed[0] % 10)  // 0-9
 *    - entryY: (seed[1] % 10)  // 0-9
 *    - exitX:  (seed[2] % 10)  // 0-9
 *    - exitY:  (seed[3] % 10)  // 0-9
 *    - bendCount: 1 + (seed[4] % 2) // 1 or 2
 * 4. Ensure entry and exit points are not the same; if they are, shift exit by +1 mod 10.
 *
 * Returns an object: { entry: [x, y], exit: [x, y], bends: number }
 */

const { keccak256, toUtf8Bytes } = require('ethers');

function deriveTrace(txHash, blockNumber) {
  // Normalize inputs
  const cleanTxHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  const blockStr = String(blockNumber);
  const input = cleanTxHash + blockStr;

  // Generate seed
  const hash = keccak256(toUtf8Bytes(input));
  // Remove 0x, get bytes
  const hashBytes = hash.slice(2);
  // Convert hex to bytes array
  const bytes = [];
  for (let i = 0; i < hashBytes.length; i += 2) {
    bytes.push(parseInt(hashBytes.substring(i, i + 2), 16));
  }

  // Derive values
  let entryX = bytes[0] % 10;
  let entryY = bytes[1] % 10;
  let exitX = bytes[2] % 10;
  let exitY = bytes[3] % 10;
  let bends = 1 + (bytes[4] % 2); // 1 or 2

  // Ensure entry != exit
  if (entryX === exitX && entryY === exitY) {
    // Shift exit by +1 mod 10 on X
    exitX = (exitX + 1) % 10;
  }

  return {
    entry: [entryX, entryY],
    exit: [exitX, exitY],
    bends: bends
  };
}

module.exports = { deriveTrace };

// If run directly, test with sample data
if (require.main === module) {
  const sampleTx = '0x15a05ba5c255fc05c1ebcfd9c77db97e48646e3b9a797ed4755611f8e03e0587';
  const sampleBlock = 60347218;
  const trace = deriveTrace(sampleTx, sampleBlock);
  console.log('Sample Trace:', trace);
}