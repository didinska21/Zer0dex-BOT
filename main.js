// 🔧 Dependencies
require('dotenv').config();
const figlet = require('figlet');
const prompt = require('prompt-sync')();
const { ethers } = require('ethers');

// 🔗 Constants
const rpcList = process.env.RPC_LIST.split(',').map(r => r.trim());
const TOKENS = {
  BTC: process.env.BTC_TOKEN,
  ETH: process.env.ETH_TOKEN,
  USDT: process.env.USDT_TOKEN
};
const FEE = 100;
const routerAddress = '0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c';

const routerAbi = [
  "function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint256 deadline,uint160 sqrtPriceLimitX96)) external payable returns (uint256)"
];
const erc20Abi = [
  "function balanceOf(address) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// 🔄 Helpers
const delay = ms => new Promise(res => setTimeout(res, ms));
const countdown = async (seconds) => {
  for (let i = seconds; i >= 0; i--) {
    process.stdout.write(`\r⏳ Next round in: ${i}s `);
    await delay(1000);
  }
  console.log("\n🔁 Restarting...");
};

const getWorkingProvider = async () => {
  for (let rpc of rpcList) {
    const provider = new ethers.JsonRpcProvider(rpc);
    try {
      await provider.getBlockNumber();
      console.log(`✅ Using RPC: ${rpc}`);
      return provider;
    } catch {}
  }
  throw new Error("❌ All RPC failed");
};

const getTokenInfo = async (wallet, symbol) => {
  const contract = new ethers.Contract(TOKENS[symbol], erc20Abi, wallet);
  const decimals = await contract.decimals();
  const balance = await contract.balanceOf(wallet.address);
  return { contract, decimals, balance };
};

const swapTokens = async (wallet, fromSymbol, toSymbol) => {
  const provider = wallet.provider;
  const router = new ethers.Contract(routerAddress, routerAbi, wallet);
  const from = await getTokenInfo(wallet, fromSymbol);
  const to = await getTokenInfo(wallet, toSymbol);
  if (from.balance === 0n) return;

  const amountIn = from.balance / 10n;
  const minOut = amountIn / 2n;
  const allowance = await from.contract.allowance(wallet.address, routerAddress);

  if (allowance < amountIn) {
    const tx = await from.contract.approve(routerAddress, amountIn);
    await tx.wait();
  }

  const params = {
    tokenIn: TOKENS[fromSymbol],
    tokenOut: TOKENS[toSymbol],
    fee: FEE,
    recipient: wallet.address,
    amountIn,
    amountOutMinimum: minOut,
    sqrtPriceLimitX96: 0,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600)
  };

  const tx = await router.exactInputSingle(params, { gasLimit: 300000n });
  const rcpt = await tx.wait();
  console.log(`✅ Swapped ${fromSymbol} → ${toSymbol}: TX ${rcpt.hash}`);
};

// 🚀 Main
(async () => {
  console.clear();
  console.log(figlet.textSync("Zer0Dex BOT"));
  console.log("Build by: t.me/didinska\n");

  const provider = await getWorkingProvider();
  const wallets = Object.entries(process.env).filter(([k]) => k.startsWith("PRIVATE_KEY"))
    .map(([_, v]) => new ethers.Wallet(v, provider));

  const wallet = wallets[0];
  const address = await wallet.getAddress();
  console.log(`👜 Wallet: ${address}`);

  for (let symbol of ['BTC', 'ETH', 'USDT']) {
    const info = await getTokenInfo(wallet, symbol);
    console.log(`💰 ${symbol}: ${ethers.formatUnits(info.balance, info.decimals)}`);
  }

  console.log("\n📋 Menu:");
  console.log("1. Swap BTC ⇄ ETH");
  console.log("2. Swap ETH ⇄ USDT");
  console.log("3. Swap USDT ⇄ BTC");
  console.log("4. Swap semuanya (otomatis)");
  console.log("5. Exit\n");

  const choice = prompt("Pilih opsi: ");
  if (choice === '1') {
    await swapTokens(wallet, 'BTC', 'ETH');
    await swapTokens(wallet, 'ETH', 'BTC');
  } else if (choice === '2') {
    await swapTokens(wallet, 'ETH', 'USDT');
    await swapTokens(wallet, 'USDT', 'ETH');
  } else if (choice === '3') {
    await swapTokens(wallet, 'USDT', 'BTC');
    await swapTokens(wallet, 'BTC', 'USDT');
  } else if (choice === '4') {
    const total = parseInt(prompt("Berapa kali swap (1–30)? "), 10);
    if (isNaN(total) || total < 1 || total > 30) return console.log("❌ Jumlah tidak valid");

    while (true) {
      for (let i = 0; i < total; i++) {
        const pairs = [['BTC', 'ETH'], ['ETH', 'USDT'], ['USDT', 'BTC']];
        const [from, to] = pairs[Math.floor(Math.random() * pairs.length)];
        await swapTokens(wallet, from, to);
        await delay(5000);
      }
      await countdown(86400); // 24 jam
    }
  } else if (choice === '5') {
    console.log("👋 Keluar");
    process.exit();
  } else {
    console.log("❌ Pilihan tidak valid");
    process.exit();
  }
})();
