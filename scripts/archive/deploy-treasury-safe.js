// Deploy Treasury Safe on Arc Testnet using Safe infrastructure

const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

// Treasury signer addresses
const OWNERS = [
  '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
  '0x037695B203d4348FCa9300B482296fD69026D655',
  '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
];

const THRESHOLD = 2;
const ADMIN_SAFE = '0xfDff2Ef0C32433A2044101257A18219620fFcd5B';

// Arc Testnet Safe infrastructure (from safe-deployments)
const SAFE_SINGLETON = '0xFf51A5898e281Db6DfC7855790607438dF2ca44b';
const PROXY_FACTORY = '0x14F2982D601c9458F93bd70B218933A6f8165e7b';

const proxyFactoryABI = [
  'function createProxyWithNonce(address singleton, bytes initializer, uint256 nonce) external returns (address proxy)',
  'event ProxyCreation(address indexed singleton, address indexed proxy)'
];

const safeSetupABI = [
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, address paymentReceiver, uint256 payment)'
];

async function deployTreasurySafe() {
  console.log('=== DEPLOYING TREASURY SAFE ON ARC TESTNET ===');
  console.log('Network: Arc Testnet (chainId: 5042002)');
  console.log('');

  const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ DEV_WALLET_PRIVATE_KEY not set');
    process.exit(1);
  }

  const deployer = new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, provider);
  console.log('Deployer:', deployer.address);
  console.log('');

  console.log('Treasury Signers:');
  OWNERS.forEach((o, i) => console.log(`  ${i+1}. ${o}`));
  console.log('Threshold:', 2);
  console.log('');

  // Encode the setup call
  const safeSingleton = new ethers.Contract(
    '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
    [
      'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, address paymentReceiver, uint256 payment)'
    ],
    provider
  );

  const initializer = safeSingleton.interface.encodeFunctionData('setup', [
    OWNERS,
    2, // threshold
    ethers.ZeroAddress, // to
    '0x', // data
    ethers.ZeroAddress, // fallbackHandler
    ethers.ZeroAddress, // paymentToken
    ethers.ZeroAddress, // paymentReceiver
    0 // payment
  ]);

  console.log('Initializer encoded, length:', initializer.length);
  console.log('Deploying Safe via Proxy Factory...');

  const proxyFactory = new ethers.Contract(
    '0x14F2982D601c9458F93bd70B218933A6f8165e7b',
    [
      'function createProxyWithNonce(address singleton, bytes initializer, uint256 nonce) external returns (address proxy)',
      'event ProxyCreation(address indexed singleton, address indexed proxy)'
    ],
    new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, provider)
  );

  const nonce = Math.floor(Date.now() / 1000); // Use timestamp as nonce
  console.log('Using nonce:', nonce);
  console.log('Deploying Safe via Proxy Factory...');

  const tx = await proxyFactory.createProxyWithNonce(
    '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
    initializer,
    nonce
  );

  console.log('Deployment TX:', tx.hash);
  const receipt = await tx.wait();
  console.log('Deployment successful! Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Find the proxy address from logs
  const proxyCreationEvent = receipt.logs.find(log => {
    try {
      const parsed = proxyFactory.interface.parseLog(log);
      return parsed && parsed.name === 'ProxyCreation';
    } catch {
      return false;
    }
  });

  let safeAddress;
  if (proxyCreationEvent) {
    const parsed = proxyFactory.interface.parseLog(proxyCreationEvent);
    safeAddress = parsed.args.proxy;
    console.log('Treasury Safe deployed at:', safeAddress);
  } else {
    console.log('Could not find ProxyCreation event in logs');
    console.log('Logs topics:', receipt.logs.map(l => l.topics[0]));
  }

  // Verify the Safe
  console.log('\n=== VERIFYING TREASURY SAFE ===');
  await verifySafe(safeAddress || '0x');

  return { safeAddress, txHash: tx.hash };
}

async function verifySafe(address) {
  if (!address || address === '0x') {
    console.log('Cannot verify - no address');
    return;
  }

  const safe = new ethers.Contract(address, [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)'
  ], provider);

  try {
    const owners = await safe.getOwners();
    const threshold = await safe.getThreshold();
    
    console.log('\n=== VERIFICATION ===');
    console.log('Safe Address:', address);
    console.log('Owners:', owners);
    console.log('Threshold:', threshold.toString());
    
    const expectedOwners = [
      '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
      '0x037695B203d4348FCa9300B482296fD69026D655',
      '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
    ];
    
    const ownersMatch = owners.length === 3 &&
      owners[0].toLowerCase() === '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd'.toLowerCase() &&
      owners[1].toLowerCase() === '0x037695B203d4348FCa9300B482296fD69026D655'.toLowerCase() &&
      owners[2].toLowerCase() === '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'.toLowerCase();
    
    const thresholdMatch = threshold === 2;
    
    console.log('');
    console.log('Owners match expected:', ownersMatch ? '✅ PASS' : '❌ FAIL');
    console.log('Threshold match:', thresholdMatch ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Admin Safe:', address.toLowerCase() !== '0xfDff2Ef0C32433A2044101257A18219620fFcd5b'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Deployer:', address.toLowerCase() !== '0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    
    return { address, owners, threshold, ownersMatch, thresholdMatch };
  } catch (e) {
    console.log('Verification failed:', e.message);
  }
}

async function main() {
  try {
    console.log('=== DEPLOYING TREASURY SAFE ON ARC TESTNET ===');
    console.log('Network: Arc Testnet (chainId: 5042002)');
    console.log('');

    const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ DEV_WALLET_PRIVATE_KEY not set');
      process.exit(1);
    }

    const deployer = new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, provider);
    console.log('Deployer:', deployer.address);
    console.log('');

    const OWNERS = [
      '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
      '0x037695B203d4348FCa9300B482296fD69026D655',
      '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
    ];

    console.log('Treasury Signers:');
    OWNERS.forEach((o, i) => console.log(`  ${i+1}. ${o}`));
    console.log('Threshold: 2');
    console.log('');

    // Encode the setup call
    const safeSingleton = new ethers.Contract(
      '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
      [
        'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, address paymentReceiver, uint256 payment)'
      ],
      provider
    );

    const initializer = safeSingleton.interface.encodeFunctionData('setup', [
      OWNERS,
      2, // threshold
      ethers.ZeroAddress, // to
      '0x', // data
      ethers.ZeroAddress, // fallbackHandler
      ethers.ZeroAddress, // paymentToken
      ethers.ZeroAddress, // paymentReceiver
      0 // payment
    ]);

    console.log('Initializer encoded, length:', initializer.length);
    console.log('Deploying Safe via Proxy Factory...');

    const proxyFactory = new ethers.Contract(
      '0x14F2982D601c9458F93bd70B218933A6f8165e7b',
      [
        'function createProxyWithNonce(address singleton, bytes initializer, uint256 nonce) external returns (address proxy)',
        'event ProxyCreation(address indexed singleton, address indexed proxy)'
      ],
      new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, provider)
    );

    const nonce = Math.floor(Date.now() / 1000); // Use timestamp as nonce
    console.log('Using nonce:', nonce);
    console.log('Deploying Safe via Proxy Factory...');

    const tx = await proxyFactory.createProxyWithNonce(
      '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
      initializer,
      nonce
    );

    console.log('Deployment TX:', tx.hash);
    const receipt = await tx.wait();
    console.log('Deployment successful! Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    // Find the proxy address from logs
    const proxyCreationEvent = receipt.logs.find(log => {
      try {
        const parsed = proxyFactory.interface.parseLog(log);
        return parsed && parsed.name === 'ProxyCreation';
      } catch {
        return false;
      }
    });

    let safeAddress;
    if (proxyCreationEvent) {
      const parsed = proxyFactory.interface.parseLog(proxyCreationEvent);
      safeAddress = parsed.args.proxy;
      console.log('Treasury Safe deployed at:', safeAddress);
    } else {
      console.log('Could not find ProxyCreation event in logs');
      console.log('Logs topics:', receipt.logs.map(l => l.topics[0]));
    }

    // Verify the Safe
    console.log('\n=== VERIFYING TREASURY SAFE ===');
    await verifySafe(safeAddress || '0x');

    return { safeAddress, txHash: tx.hash };
  } catch (e) {
    console.error('Deployment failed:', e.message);
    if (e.data) console.log('Error data:', e.data);
  }
}

async function verifySafe(address) {
  if (!address || address === '0x') {
    console.log('Cannot verify - no address');
    return;
  }

  const safe = new ethers.Contract(address, [
    'function getOwners() view returns (address[])',
    'function getThreshold() view returns (uint256)'
  ], provider);

  try {
    const owners = await safe.getOwners();
    const threshold = await safe.getThreshold();
    
    console.log('\n=== VERIFICATION ===');
    console.log('Safe Address:', address);
    console.log('Owners:', owners);
    console.log('Threshold:', threshold.toString());
    
    const expectedOwners = [
      '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
      '0x037695B203d4348FCa9300B482296fD69026D655',
      '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
    ];
    
    const ownersMatch = owners.length === 3 &&
      owners[0].toLowerCase() === '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd'.toLowerCase() &&
      owners[1].toLowerCase() === '0x037695B203d4348FCa9300B482296fD69026D655'.toLowerCase() &&
      owners[2].toLowerCase() === '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'.toLowerCase();
    
    const thresholdMatch = threshold === 2;
    
    console.log('');
    console.log('Owners match expected:', ownersMatch ? '✅ PASS' : '❌ FAIL');
    console.log('Threshold match:', thresholdMatch ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Admin Safe:', address.toLowerCase() !== '0xfDff2Ef0C32433A2044101257A18219620fFcd5b'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    console.log('Different from Deployer:', address.toLowerCase() !== '0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f'.toLowerCase() ? '✅ PASS' : '❌ FAIL');
    
    return { address, owners, threshold, ownersMatch, thresholdMatch };
  } catch (e) {
    console.log('Verification failed:', e.message);
  }
}

main().catch(console.error);