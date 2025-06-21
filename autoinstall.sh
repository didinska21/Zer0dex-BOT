#!/bin/bash

# === Banner ===
echo "🚀 Zer0dex-BOT Auto Installer by Didin Ska"
echo "==========================================="

# === Clone Repo jika belum ada ===
if [ ! -d "Zer0dex-BOT" ]; then
  git clone https://github.com/didinska21/Zer0dex-BOT.git
fi

cd Zer0dex-BOT || { echo "❌ Gagal masuk ke folder Zer0dex-BOT"; exit 1; }

# === Install NPM jika belum ada ===
if ! command -v npm &> /dev/null; then
  echo "📦 Menginstal npm..."
  sudo apt update && sudo apt install -y npm
fi

# === Install Dependency ===
echo "📦 Menginstal dependency NPM..."
npm install dotenv@16.5.0 figlet@1.8.1 ethers@5.8.0 gradient-string@1.2.0

# === Konfigurasi .env jika belum ada ===
if [ ! -f ".env" ]; then
  echo "📄 Membuat file .env..."
  cat <<EOF > .env
# ===== RPCs =====
RPC_LIST=https://evmrpc-testnet.0g.ai,https://0g-testnet-rpc.astrostake.xyz,https://0g-galileo-evmrpc.corenodehq.xyz/,https://lightnode-json-rpc-0g.grandvalleys.com,https://0g.json-rpc.cryptomolot.com/

# ===== Wallets =====
PRIVATE_KEY_1=

# ===== Token Addresses =====
ETH_TOKEN=0x0fe9b43625fa7edd663adcec0728dd635e4abf7c
BTC_TOKEN=0x36f6414ff1df609214ddaba71c84f18bcf00f67d
USDT_TOKEN=0x3ec8a8705be1d5ca90066b37ba62c4183b024ebf

# ===== Contract Address =====
ZER0DEX_CONTRACT=0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c
ROUTER_CONTRACT=0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c
EOF
  echo "✅ File .env berhasil dibuat!"
fi

# === Input Private Key ===
read -p "🔐 Masukkan PRIVATE KEY (0x...): " key

if grep -q "PRIVATE_KEY_1=" .env; then
  sed -i "s|PRIVATE_KEY_1=.*|PRIVATE_KEY_1=$key|" .env
else
  echo "PRIVATE_KEY_1=$key" >> .env
fi

echo "✅ PRIVATE_KEY_1 berhasil ditambahkan ke .env!"
sleep 1

# === Jalankan Bot ===
echo -e "\n🚀 Menjalankan Zer0dex-BOT...\n"
node main.js
