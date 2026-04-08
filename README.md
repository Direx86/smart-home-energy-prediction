# Smart Home Energy Prediction

Prediksi Konsumsi Energi Rumah Tangga menggunakan **Random Forest**, **Gradient Boosting**, dan **LSTM** pada Sistem Smart Home.

Website statis yang di-deploy ke **Vercel**, berbasis dataset [UCI - Individual Household Electric Power Consumption](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption).

## Demo

Setelah deploy ke Vercel, buka URL yang diberikan.

## Dataset

**Sumber:** [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption)

| Detail | Keterangan |
|---|---|
| Jumlah Baris | 2.075.259 (per menit) |
| Periode | Desember 2006 - November 2010 |
| Resampling | Rata-rata per jam -> 34.168 baris |
| Split Data | Train 70% / Val 15% / Test 15% |

## Hasil Evaluasi (Full Test Set - 5.121 data points)

| Model | MAE | RMSE | R2 |
|---|---|---|---|
| Random Forest | 0.0166 | 0.0249 | 0.9988 |
| **Gradient Boosting** | **0.0158** | **0.0239** | **0.9989** |
| LSTM | 0.3462 | 0.4896 | 0.5243 |

**Gradient Boosting** adalah model terbaik - unggul di semua metrik.

## Fitur Website

- **Dashboard** - Statistik konsumsi, variabel dataset, grafik perbandingan 3 model
- **Prediksi & Perbandingan** - Filter waktu, toggle model, grafik interaktif, analisis error
- **Informasi Model** - Arsitektur, parameter, feature engineering, info dataset

## Struktur Proyek

```
vercel/
├── index.html              # Halaman utama (SPA)
├── css/
│   └── style.css           # Dark theme styling
├── js/
│   └── app.js              # Logika aplikasi + Plotly charts
├── data/
│   ├── sample_data.json    # 168 data points (7 hari terakhir test set)
│   └── full_test_data.json # 5.121 data points (seluruh test set)
├── vercel.json             # Konfigurasi Vercel
├── .gitignore
└── README.md
```

## Deploy ke Vercel

### Cara 1: Vercel CLI

```bash
npm i -g vercel
cd vercel
vercel
```

### Cara 2: GitHub + Vercel Dashboard

1. Push repository ke GitHub
2. Buka [vercel.com](https://vercel.com)
3. Import repository, pilih folder `vercel/` sebagai root directory
4. Deploy

### Cara 3: Drag & Drop

1. Buka [vercel.com/new](https://vercel.com/new)
2. Drag folder `vercel/` ke halaman tersebut
3. Deploy otomatis

## Menjalankan Lokal

```bash
cd vercel
python -m http.server 8000
```

Buka `http://localhost:8000`

## Catatan

- Semua data prediksi berasal dari model ML yang dilatih pada **dataset UCI asli**, bukan data sintetis
- File JSON berisi hasil prediksi nyata dari ketiga model pada test set (15% data)
- Total ukuran deploy: ~661 KB

---

Skripsi - Franscen Yosafat Sinambela - 2025
