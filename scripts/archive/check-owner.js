const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');
const CONTROL_PLANE = '0x07602D7Da6602F538A4e6BBf89987AfC776F9c62';
const cp = new ethers.Contract(CONTROL_PLANE, ['function owner() view returns (address)'], provider);

async function main() {
  const owner = await cp.owner();
  console.log('Owner:', owner);
  console.log('Match:', owner.toLowerCase() === '0xb1937d3f88d40dB94CfE56a890A53213cc582e36'.toLowerCase());
}

main().catch(console.error);