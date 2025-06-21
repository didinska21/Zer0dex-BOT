# Zer0dex-BOT

Zer0dex-BOT adalah bot sederhana berbasis Node.js yang digunakan untuk melakukan operasi DeFi (seperti swap atau add liquidity) menggunakan Zer0dex protocol.

## ðŸ“¦ Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/didinska21/Zer0dex-BOT.git
cd Zer0dex-BOT
```

### 2. Install NPM (Jika Belum)
Untuk sistem berbasis Debian/Ubuntu:
```bash
sudo apt install npm
```

> **Catatan:** Jika sudah memiliki npm, lewati langkah ini.

### 3. Install Dependency
```bash
npm install dotenv@16.5.0 figlet@1.8.1 ethers@5.8.0 gradient-string@1.2.0
```

### 4. Konfigurasi Environment Variable
Buat dan edit file `.env`:
```bash
nano .env
```
Lalu ganti nilai berikut:
```
PRIVATE_KEY_1=0x123...
```
Ubah `0x123...` menjadi private key kalian yang valid.

Simpan file dengan kombinasi:
```
Ctrl + X, lalu tekan Y dan Enter
```

## ðŸš€ Menjalankan Bot

Jalankan dengan perintah berikut:
```bash
node main.js
```

---

## ðŸ“– Lisensi
Proyek ini dilisensikan di bawah MIT License.

---

Created by [Didin Ska](https://github.com/didinska21)
