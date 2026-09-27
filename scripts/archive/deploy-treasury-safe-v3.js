// Deploy Treasury Safe using a simpler approach - just deploy a new one and track it

const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

const OWNERS = [
  '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
  '0x037695B203d4348FCa9300B482296fD69026D655',
  '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
];

const THRESHOLD = 2;

// Arc Testnet Safe infrastructure
const SAFE_SINGLETON = '0xFf51A5898e281Db6DfC7855790607438dF2ca44b';
const PROXY_FACTORY = '0x14F2982D601c9458F93bd70B218933A6f8165e7b';

async function deploy() {
  console.log('=== DEPLOYING TREASURY SAFE (V3) ===');
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
  const OWNERS = [
    '0x654Bf81CAa71BA8874d24548Dd510A3b42fE71Dd',
    '0x037695B203d4348FCa9300B482296fD69026D655',
    '0x3987BFA8Eb8711b38b22E9BB1eeEBc58A3b8d568'
  ];
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

  // Use a specific nonce we can track
  const nonce = Math.floor(Date.now() / 1000) + 1000; // Future timestamp
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

  // The proxy address is returned by the transaction
  // For CREATE2 via proxy factory, the address is deterministic
  // We can compute it or get it from the return value
  
  // Try to get the proxy address from the transaction receipt
  // The createProxyWithNonce returns the proxy address
  try {
    const proxyAddress = await proxyFactory.createProxyWithNonce.staticCall(
      '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
      initializer,
      nonce
    );
    console.log('Predicted proxy address:', proxyAddress);
  } catch (e) {
    console.log('Static call failed:', e.message);
  }

  // Let's try to get the proxy address from the transaction receipt
  // The return value should be in the receipt
  console.log('Receipt logs:', receipt.logs.length);
  receipt.logs.forEach((log, i) => {
    console.log('Log', i, 'topics:', log.topics);
    console.log('  data:', log.data);
  });

  // Try to call the proxy factory to get the proxy address
  // The createProxyWithNonce returns the proxy address
  try {
    const proxyAddress = await proxyFactory.createProxyWithNonce.staticCall(
      '0xFf51A5898e281Db6DfC7855790607438dF2ca44b',
      initializer,
      nonce
    );
    console.log('Static call result:', proxyAddress);
  } catch (e) {
    console.log('Static call error:', e.message);
  }

  // Let's try to find the Safe by checking the deployer's recent transactions
  // and looking for contract creation
  console.log('\n=== SEARCHING FOR SAFE ===');
  const blockNumber = await provider.getBlockNumber();
  for (let i = blockNumber; i > blockNumber - 50; i--) {
    try {
      const block = await provider.getBlock(i, true);
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (tx.from && tx.from.toLowerCase() === '0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f'.toLowerCase()) {
            console.log('Found deployer TX in block', i, ':', tx.hash);
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (receipt && receipt.contractAddress) {
              console.log('  Contract created:', receipt.contractAddress);
              const code = await provider.getCode(receipt.contractAddress);
              console.log('  Code length:', code.length);
              // Try to verify
              const safe = new ethers.Contract(receipt.contractAddress, [
                'function getOwners() view returns (address[])',
                'function getThreshold() view returns (uint256)'
              ], provider);
              try {
                const owners = await safe.getOwners();
                const threshold = await safe.getThreshold();
                console.log('  Owners:', owners);
                console.log('  Threshold:', threshold.toString());
              } catch (e) {
                console.log('  Not a Safe or error:', e.message.slice(0, 50));
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

async function main() {
  await deploy();
}

main().catch(console.error);