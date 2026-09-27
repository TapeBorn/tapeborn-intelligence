// Deploy Treasury Safe on Arc Testnet using Safe Protocol Kit properly

const { ethers } = require('ethers');
const { SafeFactory } = require('@safe-global/protocol-kit');
const { EthersAdapter } = require('@safe-global/protocol-kit');
const Safe = require('@safe-global/protocol-kit').default;

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

const OWNERS = [
  '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
  '0x037695B203d4348FCa9300B482296fD69026D655',
  '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
];

const THRESHOLD = 2;
const ADMIN_SAFE = '0xfDff2Ef0C32433A2044101257A18219620fFcd5B';

async function deployWithProtocolKit() {
  console.log('=== DEPLOYING TREASURY SAFE WITH SAFE PROTOCOL KIT ===');
  console.log('Network: Arc Testnet (chainId: 5042002)');
  console.log('');

  const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ DEV_WALLET_PRIVATE_KEY not set');
    process.exit(1);
  }

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, new ethers.JsonRpcProvider('https://rpc.testnet.arc.io'))
  });

  const safeFactory = await SafeFactory.create({ ethAdapter });

  console.log('Deploying new Treasury Safe...');
  console.log('Owners:', OWNERS);
  console.log('Threshold: 2');
  console.log('');

  const safeAccountConfig = {
    owners: OWNERS,
    threshold: 2,
  };

  try {
    const safeDeployment = await safeFactory.deploySafe({ safeAccountConfig });
    console.log('Safe deployed at:', safeDeployment.safeAddress);
    console.log('Deployment TX:', safeDeployment.transactionHash);
    console.log('Block:', safeDeployment.blockNumber);

    // Verify
    const safe = await Safe.create({ ethAdapter, safeAddress: safeDeployment.safeAddress });
    const owners = await safe.getOwners();
    const threshold = await safe.getThreshold();

    console.log('');
    console.log('=== VERIFICATION ===');
    console.log('Safe Address:', safeDeployment.safeAddress);
    console.log('Owners:', owners);
    console.log('Threshold:', threshold);
    console.log('');
    console.log('Owners match expected:', 
      owners[0].toLowerCase() === '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd'.toLowerCase() &&
      owners[1].toLowerCase() === '0x037695B203d4348FCa9300B482296fD69026D655'.toLowerCase() &&
      owners[2].toLowerCase() === '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    console.log('Threshold match:', threshold === 2 ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Admin Safe:', safeDeployment.safeAddress.toLowerCase() !== '0xfDff2Ef0C32433A2044101257A18219620fFcd5b'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Deployer:', safeDeployment.safeAddress.toLowerCase() !== '0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f'.toLowerCase() ? '✅ PASS' : '❌ FAIL');

    return { safeAddress: safeDeployment.safeAddress, txHash: safeDeployment.transactionHash };

  } catch (e) {
    console.error('Deployment failed:', e.message);
    if (e.data) console.log('Error data:', e.data);
  }
}

deployWithProtocolKit().catch(console.error);