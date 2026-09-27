const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

// Treasury signer addresses
const TREASURY_1 = '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd';
const TREASURY_2 = '0x037695B203d4348FCa9300B482296fD69026D655';
const TREASURY_3 = '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568';

async function check() {
  const b1 = await provider.getBalance(TREASURY_1);
  const b2 = await provider.getBalance(TREASURY_2);
  const b3 = await provider.getBalance(TREASURY_3);
  
  console.log('TREASURY_1:', TREASURY_1, 'Balance:', ethers.formatEther(b1), 'ETH');
  console.log('TREASURY_2:', TREASURY_2, 'Balance:', ethers.formatEther(b2), 'ETH');
  console.log('TREASURY_3:', TREASURY_3, 'Balance:', ethers.formatEther(b3), 'ETH');
}

check().catch(console.error);