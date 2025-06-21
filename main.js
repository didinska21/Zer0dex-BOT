require('dotenv').config();
const { ethers } = require('ethers');
const { JsonRpcProvider } = require('@ethersproject/providers');
const readline = require('readline');
const figlet = require("figlet");
const gradient = require("gradient-string");

const FEE = 500; // 0.05% - pastikan cocok dengan pool yang tersedia
const routerAddress = process.env.ROUTER_CONTRACT;
const dexAddress = process.env.ZER0DEX_CONTRACT;

const rpcList = process.env.RPC_LIST.split(',').map(r => r.trim());
const TOKENS = [
  { symbol: 'USDT', address: process.env.USDT_TOKEN },
  { symbol: 'BTC', address: process.env.BTC_TOKEN },
  { symbol: 'ETH', address: process.env.ETH_TOKEN }
];
const pairs = [["ETH", "BTC"], ["ETH", "USDT"], ["BTC", "USDT"]];

const routerAbi = [
  "function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint256 deadline,uint160 sqrtPriceLimitX96)) external payable returns (uint256)"
];
const dexAbi = [{
  "inputs": [{ "components": [
    { "internalType": "address", "name": "token0", "type": "address" },
    { "internalType": "address", "name": "token1", "type": "address" },
    { "internalType": "uint24", "name": "fee", "type": "uint24" },
    { "internalType": "int24", "name": "tickLower", "type": "int24" },
    { "internalType": "int24", "name": "tickUpper", "type": "int24" },
    { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
    { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
    { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
    { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
    { "internalType": "address", "name": "recipient", "type": "address" },
    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
  ], "internalType": "struct MintParams", "name": "params", "type": "tuple" }],
  "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"
}];
const erc20Abi = [
  "function balanceOf(address) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

function showBanner() {
  const banner = figlet.textSync("Zer0dex", { font: "ANSI Shadow" });
  console.log(gradient.pastel.multiline(banner));
  console.log("\x1b[90mbuild by : t.me/didinska\n\x1b[0m");
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function showMenu() {
  console.log("=== Zer0dex Menu ===");
  console.log("1. Swap");
  console.log("2. Add Pool");
  console.log("3. Exit");
  const choice = await ask("Pilih opsi [1-3]: ");
  return choice;
}

const getWorkingProvider = async () => {
  for (let rpc of rpcList) {
    const provider = new JsonRpcProvider(rpc);
    try {
      await provider.getBlockNumber();
      return provider;
    } catch (_) {}
  }
  throw new Error("❌ Semua RPC gagal!");
};

async function doSwap() {
  const wallets = Object.entries(process.env).filter(([k]) => k.startsWith("PRIVATE_KEY")).map(([_, v]) => v);
  for (let pk of wallets) {
    const provider = await getWorkingProvider();
    const wallet = new ethers.Wallet(pk, provider);
    const address = await wallet.getAddress();
    const router = new ethers.Contract(routerAddress, routerAbi, wallet);
    const [from, to] = pairs[Math.floor(Math.random() * pairs.length)].map(sym => TOKENS.find(t => t.symbol === sym));
    const token = new ethers.Contract(from.address, erc20Abi, wallet);
    const balance = await token.balanceOf(address);
    const percent = Math.floor(Math.random() * 4 + 1); // hasil dalam number
    const amountIn = balance.mul(percent).div(100); // semua pakai BigNumber
    const minOut = amountIn.div(2);
    if (amountIn.eq(0)) continue;
    const allowance = await token.allowance(address, routerAddress);
    if (allowance.lt(amountIn)) {
      const tx = await token.approve(routerAddress, amountIn);
      await tx.wait();
    }
    const params = {
      tokenIn: from.address,
      tokenOut: to.address,
      fee: FEE,
      recipient: address,
      amountIn,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0,
      deadline: Math.floor(Date.now() / 1000) + 600
    };
    const tx = await router.exactInputSingle(params);
    console.log(`✅ Swap TX: ${tx.hash}`);
    await tx.wait();
  }
}

async function doAddPool() {
  const wallets = Object.entries(process.env).filter(([k]) => k.startsWith("PRIVATE_KEY")).map(([_, v]) => v);
  for (let pk of wallets) {
    try {
      const provider = await getWorkingProvider();
      const wallet = new ethers.Wallet(pk, provider);
      const address = await wallet.getAddress();
      const dex = new ethers.Contract(dexAddress, dexAbi, wallet);
      const [n0, n1] = pairs[Math.floor(Math.random() * pairs.length)];
      const a0 = process.env[`${n0}_TOKEN`], a1 = process.env[`${n1}_TOKEN`];
      const t0 = new ethers.Contract(a0, erc20Abi, wallet);
      const t1 = new ethers.Contract(a1, erc20Abi, wallet);
      const b0 = await t0.balanceOf(address), b1 = await t1.balanceOf(address);
      const amt0 = b0.mul(Math.floor(Math.random() * 6 + 5)).div(100);
      const amt1 = b1.mul(Math.floor(Math.random() * 6 + 5)).div(100);
      if (amt0.eq(0) || amt1.eq(0)) continue;
      if ((await t0.allowance(address, dexAddress)).lt(amt0)) await (await t0.approve(dexAddress, amt0)).wait();
      if ((await t1.allowance(address, dexAddress)).lt(amt1)) await (await t1.approve(dexAddress, amt1)).wait();
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const tickLower = -120;
      const tickUpper = 120;
      const mintParams = [a0, a1, FEE, tickLower, tickUpper, amt0, amt1, 0, 0, address, deadline];
      const tx = await dex.mint(mintParams, { gasLimit: 3000000 });
      console.log(`✅ Mint TX: ${tx.hash}`);
      await tx.wait();
    } catch (err) {
      console.error(`❌  Gagal Add Pool: ${err.reason || err.message}`);
    }
  }
}

(async () => {
  showBanner();
  const choice = await showMenu();

  if (choice === "1") {
    const repeat = parseInt(await ask("Berapa kali ulangi swap? "), 10);
    for (let i = 1; i <= repeat; i++) {
      console.log(`\n🔁 Swap ke-${i}`);
      await doSwap();
    }
  } else if (choice === "2") {
    const repeat = parseInt(await ask("Berapa kali ulangi add pool? "), 10);
    for (let i = 1; i <= repeat; i++) {
      console.log(`\n🔁 Add Pool ke-${i}`);
      await doAddPool();
    }
  } else {
    console.log("👋 Keluar...");
    process.exit(0);
  }
})();
