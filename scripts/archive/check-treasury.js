const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');
const CONTROL_PLANE = '0x07602D7Da6602F538A4e6BBf89987AfC776F9c62';
const cp = new ethers.Contract(CONTROL_PLANE, ['function getTreasuryMultisig() view returns (address)'], provider);

async function main() {
  const treasury = await cp.getTreasuryMultisig();
  console.log('Treasury Multisig from contract:', treasury);
}

main().catch(console.error);