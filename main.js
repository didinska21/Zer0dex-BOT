// === Zer0dex Auto Swap Script - ethers v5 Compatible ===
const figlet = require("figlet");
const gradient = require("gradient-string");
const ora = require("ora");
const dotenv = require("dotenv");
const { ethers } = require("ethers");

dotenv.config();

const RPC_LIST = process.env.RPC_LIST.split(",").map(rpc => rpc.trim());
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",").map(pk => pk.trim());
const ZERO_ROUTER = process.env.ZERO_ROUTER;
const TOKEN_LIST = {
  BTC: process.env.BTC_ADDRESS,
  ETH: process.env.ETH_ADDRESS,
  USDT: process.env.USDT_ADDRESS,
};

function showBanner() {
  console.clear();
  const banner = figlet.textSync("Zer0dex", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
    verticalLayout: "default",
  });
  console.log(gradient.pastel.multiline(banner));
  console.log("build by : t.me/didinska\n");
}

async function delay(ms) {
  const spinner = ora(`Menunggu ${ms / 1000} detik...`).start();
  for (let i = ms; i > 0; i -= 1000) {
    spinner.text = `Countdown: ${Math.floor(i / 1000)} detik...`;
    await new Promise(r => setTimeout(r, 1000));
  }
  spinner.succeed("Lanjut swap berikutnya.");
}

async function doSwap(wallet, provider, fromToken, toToken) {
  const spinner = ora(`Swap ${fromToken} -> ${toToken} untuk ${wallet.address}`).start();
  try {
    // Simulasi transaksi
    const tx = {
      to: ZERO_ROUTER,
      value: ethers.utils.parseEther("0.001"),
      gasLimit: 300000,
    };
    const sent = await wallet.sendTransaction(tx);
    await sent.wait();
    spinner.succeed(`Swap ${fromToken}->${toToken} TX: ${sent.hash}`);
  } catch (err) {
    spinner.fail(`Gagal swap ${fromToken}->${toToken}: ${err.message}`);
  }
}

async function main() {
  showBanner();

  const prompt = require("prompt-sync")();
  const jumlahSwap = parseInt(prompt("Berapa kali per pasangan swap? (max 30): "));
  if (isNaN(jumlahSwap) || jumlahSwap < 1 || jumlahSwap > 30) {
    console.log("Input tidak valid. Harus angka antara 1 - 30.");
    process.exit();
  }

  const pairs = [
    ["BTC", "ETH"],
    ["ETH", "BTC"],
    ["ETH", "USDT"],
    ["USDT", "ETH"],
    ["BTC", "USDT"],
    ["USDT", "BTC"],
  ];

  const wallets = PRIVATE_KEYS.map((pk, i) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_LIST[i % RPC_LIST.length]);
    return new ethers.Wallet(pk, provider);
  });

  while (true) {
    for (let [from, to] of pairs) {
      for (let i = 0; i < jumlahSwap; i++) {
        for (let wallet of wallets) {
          await doSwap(wallet, wallet.provider, from, to);
          await delay(5 * 60 * 1000); // 5 menit
        }
      }
    }

    // Setelah selesai semua pasangan
    const dayDelay = 24 * 60 * 60 * 1000;
    const spinner = ora("Menunggu 24 jam sebelum mengulang...").start();
    for (let i = dayDelay; i > 0; i -= 1000) {
      spinner.text = `Countdown: ${Math.floor(i / 1000 / 60 / 60)} jam ${Math.floor(i / 1000 / 60) % 60} menit ${Math.floor(i / 1000) % 60} detik...`;
      await new Promise(r => setTimeout(r, 1000));
    }
    spinner.succeed("Mengulang siklus swap!");
  }
}

main();
