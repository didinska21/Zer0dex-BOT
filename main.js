// 🔧 Dependencies
require("dotenv").config();
const figlet = require("figlet");
const prompt = require("prompt-sync")();
const { ethers } = require("ethers");

// 🔗 Constants
const rpcList = process.env.RPC_LIST.split(",").map((r) => r.trim());
const TOKENS = {
  BTC: process.env.BTC_TOKEN,
  ETH: process.env.ETH_TOKEN,
  USDT: process.env.USDT_TOKEN,
};
const routerAddress = process.env.ZER0DEX_CONTRACT;
const SWAP_COUNT = parseInt(process.env.SWAP_COUNT) || 5;
const FEE = 100;
const DELAY_RANGE = [3000, 7000];

const routerAbi = [
  "function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint256 deadline,uint160 sqrtPriceLimitX96)) external payable returns (uint256)",
];
const erc20Abi = [
  "function balanceOf(address) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// 🔄 Helpers
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const countdown = async (sec) => {
  for (let i = sec; i >= 0; i--) {
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
      console.log(`✅  Using RPC: ${rpc}`);
      return provider;
    } catch {}
  }
  throw new Error("❌ All RPCs failed");
};

const getTokenInfo = async (wallet, symbol) => {
  const contract = new ethers.Contract(TOKENS[symbol], erc20Abi, wallet);
  const decimals = await contract.decimals();
  const balance = await contract.balanceOf(wallet.address);
  return { contract, decimals, balance };
};

const randomDelay = () =>
  Math.floor(Math.random() * (DELAY_RANGE[1] - DELAY_RANGE[0]) + DELAY_RANGE[0]);

const safeWait = async (tx) => {
  try {
    return await tx.wait();
  } catch (err) {
    console.warn("⏱ Retry wait in 3s...");
    await delay(3000);
    return await tx.wait();
  }
};

const swapTokens = async (wallet, fromSymbol, toSymbol) => {
  try {
    const router = new ethers.Contract(routerAddress, routerAbi, wallet);
    const from = await getTokenInfo(wallet, fromSymbol);
    const to = await getTokenInfo(wallet, toSymbol);
    if (from.balance === 0n) return;

    const amountIn = from.balance / 10n;
    const minOut = amountIn / 2n;

    const allowance = await from.contract.allowance(wallet.address, routerAddress);
    if (allowance < amountIn) {
      const approveTx = await from.contract.approve(routerAddress, amountIn);
      await safeWait(approveTx);
    }

    const params = {
      tokenIn: TOKENS[fromSymbol],
      tokenOut: TOKENS[toSymbol],
      fee: FEE,
      recipient: wallet.address,
      amountIn,
      amountOutMinimum: minOut,
      deadline: Math.floor(Date.now() / 1000) + 600,
      sqrtPriceLimitX96: 0,
    };

    const tx = await router.exactInputSingle(params, { gasLimit: 300_000 });
    const receipt = await safeWait(tx);
    console.log(`✅  Swapped ${fromSymbol} → ${toSymbol}: TX ${receipt.hash}`);
  } catch (e) {
    console.error(`❌  Swap failed: ${fromSymbol} → ${toSymbol} ::`, e.message);
  }
};

// 🚀 Main
(async () => {
  console.clear();
  console.log(figlet.textSync("Zer0Dex BOT"));
  console.log("Build by: t.me/didinska\n");

  const provider = await getWorkingProvider();
  const wallets = Object.entries(process.env)
    .filter(([key]) => key.startsWith("PRIVATE_KEY"))
    .map(([_, key]) => new ethers.Wallet(key, provider));

  for (const wallet of wallets) {
    console.log(`👜 Wallet: ${wallet.address}`);
    for (let symbol of ["BTC", "ETH", "USDT"]) {
      const info = await getTokenInfo(wallet, symbol);
      const pretty = ethers.formatUnits(info.balance, info.decimals);
      console.log(`💰 ${symbol}: ${pretty}`);
    }
  }

  console.log("\n📋 Menu:");
  console.log("1. Swap BTC ⇄ ETH");
  console.log("2. Swap ETH ⇄ USDT");
  console.log("3. Swap USDT ⇄ BTC");
  console.log("4. Swap semuanya (otomatis)");
  console.log("5. Exit\n");

  const choice = prompt("Pilih opsi: ");
  if (!["1", "2", "3", "4"].includes(choice)) return console.log("❌ Exit");

  const pairs = {
    1: [["BTC", "ETH"], ["ETH", "BTC"]],
    2: [["ETH", "USDT"], ["USDT", "ETH"]],
    3: [["USDT", "BTC"], ["BTC", "USDT"]],
  };

  if (choice !== "4") {
    for (const wallet of wallets) {
      for (const [from, to] of pairs[choice]) {
        await swapTokens(wallet, from, to);
        await delay(randomDelay());
      }
    }
    return;
  }

  const total = parseInt(prompt(`Berapa kali swap (1–30)? `), 10);
  if (isNaN(total) || total < 1 || total > 30) return console.log("❌ Jumlah tidak valid");

  while (true) {
    for (const wallet of wallets) {
      for (let i = 0; i < total; i++) {
        const allPairs = [
          ["BTC", "ETH"],
          ["ETH", "USDT"],
          ["USDT", "BTC"],
        ];
        const [from, to] = allPairs[Math.floor(Math.random() * allPairs.length)];
        await swapTokens(wallet, from, to);
        await delay(randomDelay());
      }
    }
    await countdown(86400); // 24 jam
  }
})();
