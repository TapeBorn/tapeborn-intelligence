const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

const OWNERS = [
  '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
  '0x037695B203d4348FCa9300B482296fD69026D655',
  '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
];

async function main() {
  console.log('=== FINDING TREASURY SAFE ===');
  
  // The deployment TX: 0xf5aa9aaab11f16213377f03fad68636ab458dadb27668327d47b80a0350de35b
  // Let's try to find the Safe by checking if there's a contract with the expected owners
  // We can use the Safe Protocol Kit to predict the address
  
  // For now, let's try a different approach - deploy a new Safe with a known nonce
  // so we can predict the address using CREATE2 formula
  
  // CREATE2 formula: proxy = keccak256(0xff ++ deployer ++ nonce ++ keccak256(initCode))[12:]
  // initCode = singletonBytecode + setupCalldata
  
  // We need the Safe singleton bytecode
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');
  
  // Get the singleton bytecode
  const singletonCode = await provider.getCode('0xFf51A5898e281Db6DfC7855790607438dF2ca44b');
  console.log('Singleton code length:', singletonCode.length);
  
  // The initCode = singletonBytecode + setupCalldata
  // But we need the raw bytecode, not the deployed code
  
  // For now, let's try a different approach - use the Safe Protocol Kit
  // to deploy a new Safe with a known nonce so we can predict the address
  
  console.log('Cannot easily compute without Safe Protocol Kit deployment');
  console.log('Need to use Safe Protocol Kit to deploy and get the address');
  
  // Let's try deploying again with the Safe Protocol Kit properly
  const { SafeFactory } = require('@safe-global/protocol-kit');
  const { Safe, SafeAccountConfig } = require('@safe-global/protocol-kit');
  
  // We need an EthAdapter
  const { EthersAdapter } = require('@safe-global/protocol-kit');
  
  console.log('Cannot use Safe Protocol Kit easily without proper setup');
  console.log('Let us try a simpler approach - just deploy again with known nonce');
}

main().catch(console.error);