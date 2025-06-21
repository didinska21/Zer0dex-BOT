#!/bin/bash

echo "🚀 Menginstall Zer0dex-BOT..."

# 1. Clone repository
git clone https://github.com/didinska21/Zer0dex-BOT.git
cd Zer0dex-BOT || { echo "❌ Gagal masuk ke folder Zer0dex-BOT"; exit 1; }

# 2. Cek dan install npm jika belum ada
if ! command -v npm &> /dev/null; then
    echo "📦 npm belum ditemukan. Menginstall..."
    sudo apt update && sudo apt install -y npm
else
    echo "📦 npm sudah terinstall."
fi

# 3. Install dependency
echo "📦 Menginstall dependency..."
npm install dotenv@16.5.0 figlet@1.8.1 ethers@5.8.0 gradient-string@1.2.0

# 4. Konfigurasi .env
echo "🔐 Masukkan Private Key kamu (tanpa spasi):"
read -r PRIVATE_KEY

echo "PRIVATE_KEY_1=$PRIVATE_KEY" > .env

echo "✅ File .env berhasil dibuat."

# 5. Jalankan bot
echo "🚀 Menjalankan bot..."
node main.js
