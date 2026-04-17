# Smart Home Energy Prediction

> **Prediksi Konsumsi Energi Rumah Tangga Menggunakan Metode Random Forest, Gradient Boosting, dan LSTM pada Sistem Smart Home**

Proyek skripsi yang membandingkan tiga algoritma Machine Learning/Deep Learning untuk memprediksi konsumsi daya aktif rumah tangga (`Global_active_power`) menggunakan dataset [UCI - Individual Household Electric Power Consumption](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption). Hasil evaluasi divisualisasikan dalam website interaktif yang di-deploy ke **Vercel**.

> **Institusi:** STMIK TIME Medan — Program Studi Teknik Informatika  
> **Penulis:** Franscen Yosafat Sinambela (NIM. 2244053) — 2025

---

## Sumber Dataset Resmi

**UCI Machine Learning Repository — Individual Household Electric Power Consumption**

```
https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption
```

Link langsung: <https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption>

| Detail | Keterangan |
|--------|------------|
| Nama Dataset | Individual Household Electric Power Consumption |
| Repository | UCI Machine Learning Repository (Dataset ID: 235) |
| Periode | Desember 2006 – November 2010 (~4 tahun) |
| Resolusi | Per 1 menit |
| Total Records | 2.075.260 baris |
| Ukuran File | ~125 MB (terkompresi ~20 MB dalam zip) |
| Target | `Global_active_power` (kW) |
| Lisensi | Creative Commons Attribution 4.0 International (CC BY 4.0) |
| Kontributor | Georges Hébrail, Alice Bérard (2012) |

> **Untuk Dosen Pembimbing / Penguji:** Dataset yang digunakan dalam skripsi ini adalah dataset **resmi dan publik** dari UCI Machine Learning Repository. Silakan klik link di atas untuk verifikasi dan mengunduh dataset asli. Dataset yang sama di-commit dalam format zip di folder `data/` repositori ini (lihat [`data/individual+household+electric+power+consumption.zip`](data/individual+household+electric+power+consumption.zip)).

---

## Hasil Evaluasi Model

| Ranking | Model | MAE (kW) | RMSE (kW) | R² |
|:-------:|-------|----------:|----------:|---:|
| 1 | **Gradient Boosting** | **0.015776** | **0.023924** | **0.998864** |
| 2 | Random Forest | 0.016618 | 0.024882 | 0.998771 |
| 3 | LSTM (baseline) | 0.346233 | 0.489603 | 0.524311 |

> Evaluasi pada **5.121 titik** data test set (April – November 2010, 15% dari total data).

---

## Stack Teknologi (Versi Terkunci)

### Training Model (Python / Google Colab)

| Paket | Versi | Kegunaan |
|-------|-------|----------|
| Python | 3.10.12 | Runtime utama |
| numpy | 1.26.4 | Operasi array |
| pandas | 2.2.2 | Manipulasi data |
| scikit-learn | 1.3.2 | Random Forest, Gradient Boosting, preprocessing |
| tensorflow | 2.13.1 | LSTM (Keras API) |
| keras | 2.13.1 | High-level neural network API |
| matplotlib | 3.8.4 | Visualisasi training |
| joblib | 1.3.2 | Serialisasi model |

### Build Pipeline (Node.js)

| Paket | Versi | Kegunaan |
|-------|-------|----------|
| Node.js | 18.x LTS | Runtime build script |
| unzipper | 0.12.3 | Ekstrak dataset zip saat Vercel build |

### Frontend (Static)

| Library | Versi | Kegunaan |
|---------|-------|----------|
| Plotly.js | 2.35.2 | Grafik interaktif (CDN) |
| HTML5 / CSS3 / Vanilla JS | — | SPA tanpa framework |

### Deployment

| Platform | Keterangan |
|----------|------------|
| Vercel | Static hosting + custom build command |
| GitHub | Version control + trigger Vercel CI/CD |

---

## Arsitektur Sistem

```
GITHUB REPOSITORY
├── data/
│   ├── individual+household+electric+power+consumption.zip   <- dataset (< 100 MB, di-commit)
│   └── predictions.json                                       <- prediksi RF/GB/LSTM per jam (~364 KB)
├── scripts/
│   ├── build.js               <- build script (dijalankan Vercel saat deploy)
│   └── extract-predictions.js <- utility lokal sekali pakai
├── index.html / css/ / js/    <- frontend statis
├── package.json               <- dependency: unzipper@0.12.3
└── vercel.json                <- buildCommand + Cache-Control headers
```

```
VERCEL DEPLOY PIPELINE
          git push
             |
             v
    [npm install]
    pasang unzipper@0.12.3
             |
             v
    [node scripts/build.js]
             |
    +--------+--------+
    |                 |
    v                 v
Ekstrak zip      Load predictions.json
    |            (5.121 prediksi RF/GB/LSTM)
    v
household_power_consumption.txt
(125 MB, tidak di-commit ke git)
    |
    v
Parse 2.075.259 baris
format: dd/mm/yyyy;hh:mm:ss;Global_active_power;...
    |
    v
Resample -> rata-rata per jam
(test set: April 2010 - November 2010)
    |
    v
Merge aktual + prediksi
    |
    +--------> data/full_test_data.json   (5.121 titik, ~580 KB)
    +--------> data/sample_data.json      (168 titik = 7 hari, ~27 KB)
             |
             v
    [deploy static files]
             |
             v
    Vercel CDN (site live)
```

```
FRONTEND - STATIC SPA (BROWSER)
             |
    fetch('data/sample_data.json')      <- 168 titik, 7 hari terakhir test set
    fetch('data/full_test_data.json')   <- 5.121 titik, full test set
             |
             v
    index.html  (Single Page Application, 3 halaman)
    +---------------------+----------------------+-------------------+
    |     Dashboard        |  Prediksi &          |  Informasi Model  |
    |  - stat cards        |  Perbandingan        |  - RF/GB/LSTM     |
    |  - variabel dataset  |  - grafik interaktif |    arsitektur     |
    |  - chart 7 hari      |  - filter 24h/7d/30d |  - hyperparameter |
    |  - metrik resmi      |  - error analysis    |  - feature eng.   |
    +---------------------+  - metrik dinamis    |  - dataset info   |
                           |  - interpretasi      +-------------------+
                           +----------------------+
             |
             v
    js/app.js (Vanilla JavaScript)
    loadData() - createChart() - computeMetrics()
    renderPrediksi() - renderErrorAnalysis() - renderDashboard()
             |
             v
    Plotly.js v2.35.2 (CDN) -- dark theme interactive charts
```

```
ALUR PELATIHAN MODEL (PYTHON / GOOGLE COLAB)

household_power_consumption.txt (125 MB, 2.07 juta baris)
             |
             v
    Preprocessing
    - hapus missing values ('?')
    - resample 1 menit -> 1 jam (mean)
    - normalisasi Min-Max (RF/GB) / StandardScaler (LSTM)
             |
             v
    Feature Engineering (24 fitur untuk RF & GB)
    - Sensor    (6): Global_reactive_power, Voltage, Global_intensity, Sub_metering_1/2/3
    - Kalender  (4): hour, dayofweek, is_weekend, month
    - Lag       (6): lag1, lag2, lag3, lag6, lag12, lag24
    - Rolling   (8): rollmean3/6/12/24, rollstd3/6/12/24
             |
             v
    Train/Test Split -- time-based (85% / 15%)
    - Train : Des 2006 - Apr 2010  (29.047 jam)   <- validasi via CV internal
    - Test  : Apr 2010 - Nov 2010  ( 5.121 jam)   <- ditampilkan di website
             |
    +--------+--------+
    |        |        |
    v        v        v
   RF       GB      LSTM
(sklearn) (sklearn)(Keras)
RandomizedSearchCV  Early Stopping
100 iter, 5-fold    patience=10
    |        |        |
    v        v        v
 .joblib  .joblib  .keras
(~48 MB) (~330 KB)(~400 KB)
[tidak di-commit ke git -- terlalu besar]
             |
             v
    Prediksi pada test set (5.121 jam)
             |
             v
    Export -> data/predictions.json   <- disimpan di repo (~364 KB)
```

---

## Dataset

**UCI Household Power Consumption**  
Sumber: [archive.ics.uci.edu](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption)

| Atribut | Keterangan |
|---------|------------|
| Periode pengukuran | Desember 2006 – November 2010 |
| Interval asli | 1 menit |
| Total baris | 2.075.259 |
| Ukuran file .txt | ~125 MB (tidak di-commit, ada di dalam zip) |
| Kolom target | `Global_active_power` (kW) |
| Kolom fitur | `Global_reactive_power`, `Voltage`, `Global_intensity`, `Sub_metering_1`, `Sub_metering_2`, `Sub_metering_3` |
| Missing values | Ditandai dengan `?`, dihapus saat preprocessing |

**Pembagian data setelah resampling hourly:**

```
2.075.260 baris (1 menit)
          |
          v  resample hourly mean
     34.168 jam total
          |
    +-----+-----+
    |           |
   85%         15%
  Train       Test
 29.047 jam  5.121 jam
 (Des 2006  (Apr 2010
  - Apr      - Nov
  2010)      2010)
    |
    v
Validasi dilakukan via
Cross-Validation internal
(RandomizedSearchCV, 5-fold)
pada set training
```

> **Catatan penting:** Website hanya menampilkan **5.121 titik test set (April – November 2010)** — bukan full dataset 4 tahun. Ini adalah praktik standar ML: evaluasi model dilakukan pada data yang **belum pernah dilihat saat training** agar tidak overfit. Data training (Des 2006 – April 2010) tidak divisualisasikan karena prediksi di atasnya akan terlihat "sempurna" dan tidak mencerminkan performa sesungguhnya.

---

## Model Machine Learning

### Feature Engineering (RF & GB — 24 fitur)

| Kelompok | Jumlah | Fitur |
|----------|:------:|-------|
| Sensor | 6 | `Global_reactive_power`, `Voltage`, `Global_intensity`, `Sub_metering_1`, `Sub_metering_2`, `Sub_metering_3` |
| Kalender | 4 | `hour`, `dayofweek`, `is_weekend`, `month` |
| Lag | 6 | `lag1`, `lag2`, `lag3`, `lag6`, `lag12`, `lag24` |
| Rolling | 8 | `rollmean3`, `rollmean6`, `rollmean12`, `rollmean24`, `rollstd3`, `rollstd6`, `rollstd12`, `rollstd24` |

### Random Forest

| Parameter | Nilai |
|-----------|-------|
| estimator | `RandomForestRegressor` (scikit-learn 1.3.2) |
| n_estimators | 80–200 (RandomizedSearchCV, 100 iter, 5-fold CV) |
| max_depth | 8, 12, atau None |
| min_samples_split | 2–5 |
| random_state | 42 |
| n_jobs | -1 |
| Ukuran model | ~48 MB (.joblib) |

### Gradient Boosting (Model Terbaik)

| Parameter | Nilai |
|-----------|-------|
| estimator | `GradientBoostingRegressor` (scikit-learn 1.3.2) |
| n_estimators | 120–360 (RandomizedSearchCV, 100 iter, 5-fold CV) |
| learning_rate | 0.05–0.20 |
| max_depth | 3 |
| random_state | 42 |
| Ukuran model | ~330 KB (.joblib) |

### LSTM (Baseline Univariate)

| Parameter | Nilai |
|-----------|-------|
| framework | TensorFlow 2.13.1 / Keras 2.13.1 |
| arsitektur | `LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dense(16, relu) -> Dense(1)` |
| input | 1 fitur (`Global_active_power`), window 24 jam |
| normalisasi | `StandardScaler` (mean=1.086397, std=0.929282) |
| optimizer | Adam (lr=0.001) |
| loss | MSE |
| epochs | 50, Early Stopping patience=10 |
| batch_size | 64 |
| Ukuran model | ~400 KB (.keras) |

---

## Struktur Proyek

```
smart-home-energy-prediction/
|
+-- index.html                           <- SPA (3 halaman)
+-- css/
|   +-- style.css                        <- dark theme, responsive layout
+-- js/
|   +-- app.js                           <- SPA logic: fetch, chart, metrics
|
+-- data/
|   +-- individual+household+            <- dataset UCI (zip, di-commit ke git)
|   |   electric+power+consumption.zip
|   +-- predictions.json                 <- prediksi model (di-commit, ~364 KB)
|   +-- full_test_data.json              <- [GENERATED saat build] 5.121 titik
|   +-- sample_data.json                 <- [GENERATED saat build] 168 titik
|
+-- scripts/
|   +-- build.js                         <- Vercel build: ekstrak + proses + generate
|   +-- extract-predictions.js          <- utility lokal (sudah dijalankan sekali)
|
+-- package.json                         <- dep: unzipper@0.12.3
+-- vercel.json                          <- buildCommand + Cache-Control headers
+-- .gitignore
+-- README.md
```

> File **[GENERATED]** tidak di-commit. Dibuat otomatis setiap Vercel build dari zip + predictions.json.

---

## Setup & Deployment

### 1. Tambahkan Dataset ke Repo

Salin file zip dataset ke folder `data/`:

```
data/individual+household+electric+power+consumption.zip
```

Download dari UCI: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption

> Pastikan ukuran zip **< 100 MB** (batas GitHub). File .txt 125 MB setelah diekstrak tidak di-commit.

### 2. Commit dan Push

```bash
git add data/individual+household+electric+power+consumption.zip
git add data/predictions.json scripts/ package.json vercel.json .gitignore README.md
git commit -m "Add dataset zip and Vercel build pipeline"
git push
```

### 3. Deploy ke Vercel

Vercel menjalankan otomatis:

```
npm install
node scripts/build.js
```

Build script mengekstrak zip, memproses `household_power_consumption.txt` (2.07 juta baris), dan men-generate JSON data. Setelah selesai, Vercel men-deploy semua file statis.

### 4. Jalankan Lokal

```bash
# Install dependensi build
npm install

# Butuh: data/individual+household+electric+power+consumption.zip
npm run build

# Serve static files
npx serve . -p 3000
# atau
python -m http.server 8000
```

---

## Referensi

1. Breiman, L. (2001). Random forests. *Machine Learning*, 45(1), 5–32.
2. Friedman, J. H. (2001). Greedy function approximation: A gradient boosting machine. *Annals of Statistics*, 29(5), 1189–1232.
3. Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. *Neural Computation*, 9(8), 1735–1780.
4. Géron, A. (2019). *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (2nd ed.). O'Reilly Media.
5. UCI Machine Learning Repository. (2012). *Individual Household Electric Power Consumption Data Set*. https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption
