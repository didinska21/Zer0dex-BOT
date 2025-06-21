#!/bin/bash

echo "🚀 Instalasi Zer0dex-BOT dimulai..."

# Step 1: Clone repo jika belum ada
if [ ! -d "Zer0dex-BOT" ]; then
  git clone https://github.com/didinska21/Zer0dex-BOT.git
fi
cd Zer0dex-BOT || exit

# Step 2: Install Node.js & NPM (hanya jika belum ada)
if ! command -v npm &>/dev/null; then
  echo "📦 Menginstal npm..."
  sudo apt update && sudo apt install -y npm
fi

# Step 3: Install dependencies
echo "📦 Menginstal dependencies..."
npm install dotenv@16.5.0 figlet@1.8.1 ethers@5.8.0 gradient-string@1.2.0

# Step 4: Cek dan buat file .env jika belum ada
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "🔧 Membuat file .env default..."
  cat <<EOF > $ENV_FILE
# ===== RPCs =====
RPC_LIST=https://evmrpc-testnet.0g.ai,https://0g-testnet-rpc.astrostake.xyz,https://0g-galileo-evmrpc.corenodehq.xyz/,https://lightnode-json-rpc-0g.grandvalleys.com,https://0g.json-rpc.cryptomolot.com/

# ===== Wallets =====
# PRIVATE_KEY_1=...

# ===== Token Addresses =====
ETH_TOKEN=0x0fe9b43625fa7edd663adcec0728dd635e4abf7c
BTC_TOKEN=0x36f6414ff1df609214ddaba71c84f18bcf00f67d
USDT_TOKEN=0x3ec8a8705be1d5ca90066b37ba62c4183b024ebf

# ===== Contract Address =====
ZER0DEX_CONTRACT=0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c
ROUTER_CONTRACT=0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c
EOF
fi

# Step 5: Input Private Key via terminal
echo ""
read -p "🔐 Masukkan PRIVATE KEY (0x...): " PRIVATE_KEY

# Hapus baris lama dan sisipkan PRIVATE_KEY_1 ke dalam .env
sed -i '/^PRIVATE_KEY_1=/d' $ENV_FILE
awk -v pk="PRIVATE_KEY_1=$PRIVATE_KEY" '
  BEGIN {written=0}
  {
    print $0
    if ($0 ~ /# ===== Wallets =====/ && written == 0) {
      print pk
      written=1
    }
  }
' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"

echo "✅ PRIVATE_KEY_1 berhasil ditambahkan!"

# Step 6: Jalankan bot
echo ""
echo "🚀 Jalankan bot dengan perintah:"
echo "    node main.js"
echo "📁 Direktori kerja: $(pwd)"
