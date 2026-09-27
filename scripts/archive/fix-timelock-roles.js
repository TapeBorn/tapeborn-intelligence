// TB-CP-FIX-002: Clean up deployer privileges on Timelock
// Remove DEFAULT_ADMIN_ROLE and EXECUTOR_ROLE from deployer
// Grant EXECUTOR_ROLE to address(0)

const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.io');

const TIMELOCK = '0xb1937d3f88d40dB94CfE56a890A53213cc582e36';
const DEPLOYER = '0xCA672F44F5C6001C4e5Bf49DFFf9861276Bca22f';
const ADMIN_SAFE = '0xfDff2Ef0C32433A2044101257A18219620fFcd5B';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const timelockABI = [
  'function getMinDelay() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function PROPOSER_ROLE() view returns (bytes32)',
  'function CANCELLER_ROLE() view returns (bytes32)',
  'function EXECUTOR_ROLE() view returns (bytes32)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function getMinDelay() view returns (uint256)',
  'function owner() view returns (address)'
];

async function fixTimelockRoles() {
  console.log('=== TB-CP-FIX-002: TIMELOCK ROLE CLEANUP ===');
  console.log('Network: Arc Testnet (chainId: 5042002)');
  console.log('Timelock:', TIMELOCK);
  console.log('Deployer:', DEPLOYER);
  console.log('Admin Safe:', ADMIN_SAFE);
  console.log('');

  const privateKey = process.env.DEV_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ DEV_WALLET_PRIVATE_KEY not set');
    process.exit(1);
  }

  const deployer = new ethers.Wallet(process.env.DEV_WALLET_PRIVATE_KEY, provider);
  console.log('Connected as:', deployer.address);
  console.log('');

  const tl = new ethers.Contract(TIMELOCK, [
    'function getMinDelay() view returns (uint256)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'function PROPOSER_ROLE() view returns (bytes32)',
    'function CANCELLER_ROLE() view returns (bytes32)',
    'function EXECUTOR_ROLE() view returns (bytes32)',
    'function grantRole(bytes32 role, address account) external',
    'function revokeRole(bytes32 role, address account) external',
    'function getMinDelay() view returns (uint256)',
    'function owner() view returns (address)'
  ], deployer);

  const DEFAULT_ADMIN = await tl.DEFAULT_ADMIN_ROLE();
  const PROPOSER = await tl.PROPOSER_ROLE();
  const CANCELLER = await tl.CANCELLER_ROLE();
  const EXECUTOR = await tl.EXECUTOR_ROLE();

  console.log('=== BEFORE ROLE MATRIX ===');
  console.log('minDelay:', (await tl.getMinDelay()).toString());
  console.log('Owner:', await tl.owner());
  console.log('');
  
  const beforeMatrix = {
    minDelay: (await tl.getMinDelay()).toString(),
    owner: await tl.owner(),
    DEFAULT_ADMIN: {
      timelock: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), TIMELOCK),
      deployer: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), DEPLOYER),
      adminSafe: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), ADMIN_SAFE)
    },
    PROPOSER: {
      adminSafe: await tl.hasRole(await tl.PROPOSER_ROLE(), ADMIN_SAFE),
      deployer: await tl.hasRole(await tl.PROPOSER_ROLE(), DEPLOYER)
    },
    CANCELLER: {
      adminSafe: await tl.hasRole(await tl.CANCELLER_ROLE(), ADMIN_SAFE),
      deployer: await tl.hasRole(await tl.CANCELLER_ROLE(), DEPLOYER)
    },
    EXECUTOR: {
      deployer: await tl.hasRole(await tl.EXECUTOR_ROLE(), DEPLOYER),
      zeroAddress: await tl.hasRole(await tl.EXECUTOR_ROLE(), ethers.ZeroAddress)
    }
  };

  console.log('DEFAULT_ADMIN_ROLE:');
  console.log('  Timelock:', beforeMatrix.DEFAULT_ADMIN.timelock);
  console.log('  Deployer:', beforeMatrix.DEFAULT_ADMIN.deployer);
  console.log('  Admin Safe:', beforeMatrix.DEFAULT_ADMIN.adminSafe);
  console.log('');
  console.log('PROPOSER_ROLE:');
  console.log('  Admin Safe:', beforeMatrix.PROPOSER.adminSafe);
  console.log('  Deployer:', beforeMatrix.PROPOSER.deployer);
  console.log('');
  console.log('CANCELLER_ROLE:');
  console.log('  Admin Safe:', beforeMatrix.CANCELLER.adminSafe);
  console.log('  Deployer:', beforeMatrix.CANCELLER.deployer);
  console.log('');
  console.log('EXECUTOR_ROLE:');
  console.log('  Deployer:', beforeMatrix.EXECUTOR.deployer);
  console.log('  address(0):', beforeMatrix.EXECUTOR.zeroAddress);
  console.log('');

  // Step 1: Grant EXECUTOR_ROLE to address(0)
  console.log('=== STEP 1: Grant EXECUTOR_ROLE to address(0) ===');
  if (await tl.hasRole(await tl.EXECUTOR_ROLE(), ethers.ZeroAddress)) {
    console.log('EXECUTOR_ROLE already granted to address(0)');
  } else {
    console.log('Granting EXECUTOR_ROLE to address(0)...');
    const tx1 = await tl.grantRole(await tl.EXECUTOR_ROLE(), ethers.ZeroAddress);
    console.log('TX:', tx1.hash);
    await tx1.wait();
    console.log('✅ EXECUTOR_ROLE granted to address(0)');
  }

  // Step 2: Revoke EXECUTOR_ROLE from deployer
  console.log('\n=== STEP 2: Revoke EXECUTOR_ROLE from deployer ===');
  if (await tl.hasRole(await tl.EXECUTOR_ROLE(), DEPLOYER)) {
    console.log('Revoking EXECUTOR_ROLE from deployer...');
    const tx2 = await tl.revokeRole(await tl.EXECUTOR_ROLE(), DEPLOYER);
    console.log('TX:', tx2.hash);
    await tx2.wait();
    console.log('✅ EXECUTOR_ROLE revoked from deployer');
  } else {
    console.log('Deployer does not have EXECUTOR_ROLE');
  }

  // Step 3: Revoke DEFAULT_ADMIN_ROLE from deployer
  console.log('\n=== STEP 3: Revoke DEFAULT_ADMIN_ROLE from deployer ===');
  if (await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), DEPLOYER)) {
    console.log('Revoking DEFAULT_ADMIN_ROLE from deployer...');
    const tx3 = await tl.revokeRole(await tl.DEFAULT_ADMIN_ROLE(), DEPLOYER);
    console.log('TX:', tx3.hash);
    await tx3.wait();
    console.log('✅ DEFAULT_ADMIN_ROLE revoked from deployer');
  } else {
    console.log('Deployer does not have DEFAULT_ADMIN_ROLE');
  }

  // Verify final state
  console.log('\n=== AFTER ROLE MATRIX ===');
  const minDelay = await tl.getMinDelay();
  console.log('minDelay:', minDelay.toString());
  console.log('Owner:', await tl.owner());
  console.log('');

  const afterMatrix = {
    minDelay: (await tl.getMinDelay()).toString(),
    owner: await tl.owner(),
    DEFAULT_ADMIN: {
      timelock: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), TIMELOCK),
      deployer: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), DEPLOYER),
      adminSafe: await tl.hasRole(await tl.DEFAULT_ADMIN_ROLE(), ADMIN_SAFE)
    },
    PROPOSER: {
      adminSafe: await tl.hasRole(await tl.PROPOSER_ROLE(), ADMIN_SAFE),
      deployer: await tl.hasRole(await tl.PROPOSER_ROLE(), DEPLOYER)
    },
    CANCELLER: {
      adminSafe: await tl.hasRole(await tl.CANCELLER_ROLE(), ADMIN_SAFE),
      deployer: await tl.hasRole(await tl.CANCELLER_ROLE(), DEPLOYER)
    },
    EXECUTOR: {
      deployer: await tl.hasRole(await tl.EXECUTOR_ROLE(), DEPLOYER),
      zeroAddress: await tl.hasRole(await tl.EXECUTOR_ROLE(), ethers.ZeroAddress)
    }
  };

  console.log('minDelay:', afterMatrix.minDelay);
  console.log('Owner:', afterMatrix.owner);
  console.log('');
  console.log('DEFAULT_ADMIN_ROLE:');
  console.log('  Timelock:', afterMatrix.DEFAULT_ADMIN.timelock);
  console.log('  Deployer:', afterMatrix.DEFAULT_ADMIN.deployer);
  console.log('  Admin Safe:', afterMatrix.DEFAULT_ADMIN.adminSafe);
  console.log('');
  console.log('PROPOSER_ROLE:');
  console.log('  Admin Safe:', afterMatrix.PROPOSER.adminSafe);
  console.log('  Deployer:', afterMatrix.PROPOSER.deployer);
  console.log('');
  console.log('CANCELLER_ROLE:');
  console.log('  Admin Safe:', afterMatrix.CANCELLER.adminSafe);
  console.log('  Deployer:', afterMatrix.CANCELLER.deployer);
  console.log('');
  console.log('EXECUTOR_ROLE:');
  console.log('  Deployer:', afterMatrix.EXECUTOR.deployer);
  console.log('  address(0):', afterMatrix.EXECUTOR.zeroAddress);
  console.log('');

  // Negative tests
  console.log('=== NEGATIVE TESTS ===');
  console.log('1. Deployer cannot administer Timelock roles (no DEFAULT_ADMIN):', !afterMatrix.DEFAULT_ADMIN.deployer ? '✅ PASS' : '❌ FAIL');
  console.log('2. Deployer cannot schedule as proposer (no PROPOSER_ROLE):', !afterMatrix.PROPOSER.deployer ? '✅ PASS' : '❌ FAIL');
  console.log('3. Deployer is not an executor (no EXECUTOR_ROLE):', !afterMatrix.EXECUTOR.deployer ? '✅ PASS' : '❌ FAIL');
  console.log('4. Admin Safe remains proposer:', afterMatrix.PROPOSER.adminSafe ? '✅ PASS' : '❌ FAIL');
  console.log('5. Admin Safe remains canceller:', afterMatrix.CANCELLER.adminSafe ? '✅ PASS' : '❌ FAIL');
  console.log('6. Timelock self-administration intact:', afterMatrix.DEFAULT_ADMIN.timelock ? '✅ PASS' : '❌ FAIL');
  console.log('7. Timelock delay unchanged (60s):', afterMatrix.minDelay === '60' ? '✅ PASS' : '❌ FAIL');
  console.log('8. Control Plane owner remains Timelock:', 'VERIFY SEPARATELY');
  console.log('');

  // Control Plane owner check
  const CONTROL_PLANE = '0x07602D7Da6602F538A4e6BBf89987AfC776F9c62';
  const cp = new ethers.Contract(CONTROL_PLANE, ['function owner() view returns (address)'], provider);
  const cpOwner = await cp.owner();
  console.log('Control Plane owner:', cpOwner);
  console.log('Control Plane owner == Timelock:', cpOwner.toLowerCase() === TIMELOCK.toLowerCase() ? '✅ PASS' : '❌ FAIL');

  // Final classification
  console.log('\n=== CLASSIFICATION ===');
  const allPass = 
    !afterMatrix.DEFAULT_ADMIN.deployer &&
    !afterMatrix.PROPOSER.deployer &&
    !afterMatrix.CANCELLER.deployer &&
    !afterMatrix.EXECUTOR.deployer &&
    afterMatrix.PROPOSER.adminSafe &&
    afterMatrix.CANCELLER.adminSafe &&
    afterMatrix.DEFAULT_ADMIN.timelock &&
    afterMatrix.EXECUTOR.zeroAddress &&
    afterMatrix.minDelay === '60' &&
    cpOwner.toLowerCase() === TIMELOCK.toLowerCase();

  console.log('Overall:', allPass ? '✅ PASS' : '❌ FAIL');
}

fixTimelockRoles().catch(console.error);