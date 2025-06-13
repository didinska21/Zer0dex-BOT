const ethers = require("ethers");
const fs = require("fs");
const figlet = require("figlet");
const gradient = require("gradient-string");
const ora = require("ora");
require("dotenv").config();
const readline = require("readline");

const ETH = process.env.ETH_TOKEN;
const BTC = process.env.BTC_TOKEN;
const USDT = process.env.USDT_TOKEN;
const ZER0DEX_CONTRACT = process.env.ZER0DEX_CONTRACT;

const RPC_LIST = process.env.RPC_LIST.split(",");
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showBanner() {
  console.clear();
  const banner = figlet.textSync("Zer0dex", {
    font: "ANSI Shadow",
  });
  console.log(gradient.pastel.multiline(banner));
  console.log("\x1b[90mbuild by : t.me/didinska\n\x1b[0m");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdownWithSpinner(seconds) {
  let spinner = ora(`Countdown: ${seconds} detik...`).start();
  for (let i = seconds; i >= 0; i--) {
    spinner.text = `Countdown: ${i} detik...`;
    await wait(1000);
  }
  spinner.succeed("Countdown selesai!");
}

async function sendTx(wallet, tokenIn, tokenOut) {
  const iface = new ethers.utils.Interface([
    "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) returns (uint256)"
  ]);
  const provider = wallet.provider;
  const contract = new ethers.Contract(ZER0DEX_CONTRACT, iface, wallet);
  const value = ethers.utils.parseUnits("0.001", 18);
  const params = {
    tokenIn,
    tokenOut,
    fee: 3000,
    recipient: await wallet.getAddress(),
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    amountIn: value,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
  try {
    const tx = await contract.exactInputSingle(params);
    console.log(`\u2714 Swap ${symbol(tokenIn)}->${symbol(tokenOut)} TX: ${tx.hash}`);
    console.log(`🌐 Explorer: https://chainscan.galileo.0g.ai/tx/${tx.hash}\n`);
    await tx.wait();
  } catch (e) {
    console.log("\u274C Error saat swap:", e.reason || e);
  }
}

function symbol(address) {
  if (address === ETH) return "ETH";
  if (address === BTC) return "BTC";
  if (address === USDT) return "USDT";
  return "?";
}

async function startBot(n) {
  const pairs = [
    [BTC, ETH],
    [ETH, BTC],
    [ETH, USDT],
    [USDT, ETH],
    [BTC, USDT],
    [USDT, BTC],
  ];
  while (true) {
    for (let [tokenIn, tokenOut] of pairs) {
      for (let i = 0; i < n; i++) {
        for (let key of PRIVATE_KEYS) {
          const provider = new ethers.providers.JsonRpcProvider(
            RPC_LIST[Math.floor(Math.random() * RPC_LIST.length)]
          );
          const wallet = new ethers.Wallet(key, provider);
          await sendTx(wallet, tokenIn, tokenOut);
          await countdownWithSpinner(300);
        }
      }
    }
    await countdownWithSpinner(86400); // 24 jam
  }
}

showBanner();
rl.question("Berapa kali per pasangan swap? (max 30): ", async answer => {
  const n = Math.min(parseInt(answer), 30);
  if (isNaN(n) || n <= 0) {
    console.log("Input tidak valid.");
    process.exit(1);
  }
  await startBot(n);
  rl.close();
});
