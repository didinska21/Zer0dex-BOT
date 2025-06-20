require('dotenv').config();
const { ethers } = require('ethers');
const figlet = require("figlet");
const gradient = require("gradient-string");

const FEE = 100;
const routerAddress = '0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c';

// Validasi environment
if (!process.env.RPC_LIST || !process.env.USDT_TOKEN || !process.env.BTC_TOKEN || !process.env.ETH_TOKEN || !process.env.ZER0DEX_CONTRACT) {
  console.error("❌  Cek kembali .env — beberapa token address atau config belum diset.");
  process.exit(1);
}

const rpcList = process.env.RPC_LIST.split(',').map(r => r.trim());
const TOKENS = [
  { symbol: 'USDT', address: process.env.USDT_TOKEN },
  { symbol: 'BTC', address: process.env.BTC_TOKEN },
  { symbol: 'ETH', address: process.env.ETH_TOKEN }
];
const pairs = [
  ["ETH", "BTC"],
  ["ETH", "USDT"],
  ["BTC", "USDT"]
];

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
  console.clear();
  const banner = figlet.textSync("Zer0dex", { font: "ANSI Shadow" });
  console.log(gradient.pastel.multiline(banner));
  console.log("\x1b[90mbuild by : t.me/didinska\n\x1b[0m");
}

const getRandomPair = () => {
  const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
  const from = TOKENS.find(t => t.symbol === a);
  const to = TOKENS.find(t => t.symbol === b);
  return [from, to];
};
const getRandomDelay = (min = 10, max = 20) => new Promise(r => setTimeout(r, Math.random() * (max - min) * 1000 + min * 1000));
const getRandomPercent = (min = 10, max = 15) => Math.floor(Math.random() * (max - min + 1)) + min;
const getWorkingProvider = async () => {
  for (let rpc of rpcList) {
    const provider = new ethers.JsonRpcProvider(rpc);
    try {
      await provider.getBlockNumber();
      console.log(`✅  Using RPC: ${rpc}`);
      return provider;
    } catch (e) {
      console.warn(`⚠️ RPC error: ${rpc} → ${e.message}`);
    }
  }
  throw new Error("❌  Semua RPC gagal!");
};
const withRetry = async (fn, retries = 3, label = '') => {
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.shortMessage || e?.message || e;
      console.warn(`${label} ❌  Attempt ${i}: ${msg}`);
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

(async () => {
  showBanner();
  const swapCount = parseInt(process.env.SWAP_COUNT || '3', 10);
  const dexAddress = process.env.ZER0DEX_CONTRACT;
  const wallets = Object.entries(process.env).filter(([k, v]) => k.startsWith("PRIVATE_KEY") && v.startsWith("0x")).map(([_, v]) => v);
  if (!wallets.length) return console.error("❌  PRIVATE_KEY tidak ditemukan.");

  for (let w = 0; w < wallets.length; w++) {
    const provider = await getWorkingProvider();
    const wallet = new ethers.Wallet(wallets[w], provider);
    const address = await wallet.getAddress();
    console.log(`\n👜 Wallet #${w + 1}: ${address}`);
    const router = new ethers.Contract(routerAddress, routerAbi, wallet);
    const dex = new ethers.Contract(dexAddress, dexAbi, wallet);

    for (let i = 0; i < swapCount; i++) {
      const [from, to] = getRandomPair();
      const token = new ethers.Contract(from.address, erc20Abi, wallet);
      const decimals = await withRetry(() => token.decimals(), 3, `decimals ${from.symbol}`);
      const balance = await withRetry(() => token.balanceOf(address), 3, `balance ${from.symbol}`);
      if (balance === 0n) continue;
      const amountIn = BigInt(Math.floor(Number(balance) * (Math.random() * 0.04 + 0.01)));
      if (amountIn === 0n) continue;
      const minOut = amountIn / 2n;
      const allowance = await withRetry(() => token.allowance(address, routerAddress), 3, `allowance ${from.symbol}`);
      if (allowance < amountIn) {
        await withRetry(async () => {
          const tx = await token.approve(routerAddress, amountIn);
          await tx.wait();
        }, 3, `approve ${from.symbol}`);
      }
      const params = {
        tokenIn: from.address,
        tokenOut: to.address,
        fee: FEE,
        recipient: address,
        amountIn,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: 0,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 600)
      };
      console.log(`🔄 Swap ${from.symbol} → ${to.symbol} = ${ethers.formatUnits(amountIn, decimals)}`);
      await withRetry(async () => {
        const tx = await router.exactInputSingle(params); // no gasLimit
        const rcpt = await tx.wait();
        console.log(`✅  TX: ${rcpt.hash}`);
      }, 3, `swap ${from.symbol}→${to.symbol}`);
      await getRandomDelay(55, 65);
    }

    const runs = Math.floor(Math.random() * 5) + 1;
    console.log(`\n💧 Add liquidity ${runs}x`);
    for (let r = 1; r <= runs; r++) {
      const [n0, n1] = pairs[Math.floor(Math.random() * pairs.length)];
      const a0 = process.env[`${n0}_TOKEN`], a1 = process.env[`${n1}_TOKEN`];
      if (!a0 || !a1) continue;
      const t0 = new ethers.Contract(a0, erc20Abi, wallet);
      const t1 = new ethers.Contract(a1, erc20Abi, wallet);
      const b0 = await t0.balanceOf(address), b1 = await t1.balanceOf(address);
      if (b0 === 0n || b1 === 0n) continue;
      const d0 = await t0.decimals(), d1 = await t1.decimals();
      const amt0 = b0 * BigInt(getRandomPercent()) / 100n;
      const amt1 = b1 * BigInt(getRandomPercent()) / 100n;
      console.log(`→ Add ${n0}/${n1}: ${ethers.formatUnits(amt0, d0)} ${n0} + ${ethers.formatUnits(amt1, d1)} ${n1}`);

      const a0Allow = await withRetry(() => t0.allowance(address, dexAddress), 3, `check allowance ${n0}`);
      if (a0Allow < amt0) await withRetry(() => t0.approve(dexAddress, amt0), 3, `approve ${n0}`);
      const a1Allow = await withRetry(() => t1.allowance(address, dexAddress), 3, `check allowance ${n1}`);
      if (a1Allow < amt1) await withRetry(() => t1.approve(dexAddress, amt1), 3, `approve ${n1}`);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const mintParams = [a0, a1, 3000, -887220, 887220, amt0, amt1, 0, 0, address, deadline];
      await withRetry(async () => {
        const tx = await dex.mint(mintParams);
        console.log(`✅  Mint TX: ${tx.hash}`);
        await tx.wait();
        console.log(`🎉 Mint sukses`);
      }, 3, `mint ${n0}/${n1}`);
      if (r < runs) await getRandomDelay(55, 60);
    }
    console.log(`✅  Selesai untuk ${address}`);
    if (w < wallets.length - 1) await new Promise(r => setTimeout(r, 3000));
  }
})();

// Tangkap error global
process.on("unhandledRejection", err => {
  console.error("💥 Unhandled Rejection:", err);
  process.exit(1);
});
