// Compile using embedded solc binary downloaded on the fly
const https = require('https');
const fs = require('fs');
const path = require('path');

const SOLC_VERSION = '0.8.24';
const SOLC_URL = `https://binaries.soliditylang.org/wasm/soljson-v${SOLC_VERSION}+commit.e11b9ed9.js`;
const CACHE_PATH = path.join(__dirname, 'solc-cache.js');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('Downloading solc compiler...');
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded:', dest);
        resolve();
      });
    }).on('error', reject);
  });
}

function compile() {
  const contractPath = path.resolve(__dirname, '../contracts/CodeMint.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  // Load solc
  let solcJson;
  if (fs.existsSync(CACHE_PATH)) {
    solcJson = require(CACHE_PATH);
    console.log('Using cached solc compiler');
  } else {
    // Use solc-js from npm
    console.log('Loading solc via solc-js...');
    const solc = require('solc');
    solcJson = solc;
  }

  const input = {
    language: 'Solidity',
    sources: {
      'CodeMint.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] },
      },
    },
  };

  const output = JSON.parse(solcJson.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('\nCompilation errors:');
      errors.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    output.errors.filter(e => e.severity === 'warning').forEach(e => console.warn(e.formattedMessage));
  }

  const contract = output.contracts['CodeMint.sol']['CodeMint'];

  const outDir = path.resolve(__dirname, '../out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  fs.writeFileSync(path.join(outDir, 'CodeMint.abi.json'), JSON.stringify(abi, null, 2));
  fs.writeFileSync(path.join(outDir, 'CodeMint.bin'), bytecode);

  // Also update the ABI used by frontend
  fs.writeFileSync(
    path.resolve(__dirname, '../contracts/CodeMint.json'),
    JSON.stringify(abi, null, 2)
  );

  console.log('\nCompiled successfully!');
  console.log('ABI:', path.join(outDir, 'CodeMint.abi.json'));
  console.log('Bytecode:', path.join(outDir, 'CodeMint.bin'), `(${bytecode.length} chars)`);
  console.log('\nNext: paste bytecode into scripts/deploy-mint.ts and run deployment');
}

// Try solc-js first, fallback to download
try {
  require.resolve('solc');
  console.log('Found solc, compiling...');
  compile();
} catch (e) {
  // Download solc compiler
  if (!fs.existsSync(CACHE_PATH)) {
    download(SOLC_URL, CACHE_PATH).then(() => {
      compile();
    }).catch(err => {
      console.error('Failed to download solc:', err.message);
      process.exit(1);
    });
  } else {
    compile();
  }
}
