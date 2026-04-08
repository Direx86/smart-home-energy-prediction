# Smart Home Energy Prediction

> **Prediksi Konsumsi Energi Rumah Tangga Menggunakan Metode Random Forest, Gradient Boosting, dan LSTM pada Sistem Smart Home**

Proyek skripsi yang membandingkan tiga algoritma Machine Learning/Deep Learning untuk memprediksi konsumsi daya aktif rumah tangga (`Global_active_power`) menggunakan dataset [UCI - Individual Household Electric Power Consumption](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption). Hasil evaluasi divisualisasikan dalam website interaktif yang di-deploy ke **Vercel**.

---

## Arsitektur Sistem

```
+=====================================================================+
|                        PIPELINE PENELITIAN                          |
+=====================================================================+
|                                                                     |
|  +-------------------+     +--------------------+                   |
|  | Dataset UCI (Raw) |---->| Pra-pemrosesan     |                   |
|  | 2.075.259 baris   |     | - Missing values   |                   |
|  | per menit         |     | - Resampling 1 jam |                   |
|  +-------------------+     | - 34.168 baris     |                   |
|                            +--------+-----------+                   |
|                                     |                               |
|                    +----------------+----------------+              |
|                    |                |                |               |
|             +------v------+  +------v------+  +-----v-------+      |
|             | Feature Eng |  | Feature Eng |  | StandardScaler|     |
|             | 24 fitur    |  | 24 fitur    |  | Window = 24h  |     |
|             +------+------+  +------+------+  +------+------+      |
|                    |                |                |               |
|             +------v------+  +------v------+  +-----v-------+      |
|             | Random      |  | Gradient    |  |    LSTM      |     |
|             | Forest      |  | Boosting    |  | (64-32-16-1) |     |
|             | n_est=300   |  | n_est=500   |  | epochs=100   |     |
|             +------+------+  +------+------+  +------+------+      |
|                    |                |                |               |
|                    +----------------+----------------+              |
|                                     |                               |
|                            +--------v---------+                     |
|                            | Evaluasi Model   |                     |
|                            | MAE, RMSE, R2    |                     |
|                            +--------+---------+                     |
|                                     |                               |
|  +----------------------------------v----------------------------+  |
|  |              WEBSITE INTERAKTIF (Vercel)                      |  |
|  |  +------------+  +-------------------+  +------------------+  |  |
|  |  | Dashboard  |  | Prediksi &        |  | Informasi Model  |  |  |
|  |  | Statistik  |  | Perbandingan      |  | Arsitektur &     |  |  |
|  |  | & Grafik   |  | Grafik Interaktif |  | Parameter        |  |  |
|  |  +------------+  +-------------------+  +------------------+  |  |
|  +---------------------------------------------------------------+  |
+=====================================================================+
```

```
+-----------------------------------------+
|       ARSITEKTUR WEBSITE (Vercel)       |
+-----------------------------------------+
|                                         |
|   Browser                               |
|   +-----------------------------------+ |
|   |          index.html (SPA)         | |
|   |   +----------+  +-------------+  | |
|   |   | style.css|  | Plotly.js   |  | |
|   |   | Dark UI  |  | CDN Charts |  | |
|   |   +----------+  +-------------+  | |
|   |          |                        | |
|   |   +------v--------+              | |
|   |   |   app.js      |              | |
|   |   |   Navigation  |              | |
|   |   |   Rendering   |              | |
|   |   |   Metrics Calc|              | |
|   |   +------+--------+              | |
|   |          |                        | |
|   +----------|------------------------+ |
|              | fetch()                  |
|   +----------v-----------+              |
|   |   data/ (Static JSON)|              |
|   |   sample_data.json   |  168 pts    |
|   |   full_test_data.json|  5.121 pts  |
|   +-----------------------+              |
+-----------------------------------------+
```

---

## Dataset

**Sumber:** [UCI Machine Learning Repository - Individual Household Electric Power Consumption](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption)

| Detail | Keterangan |
|---|---|
| Lokasi | Sceaux, Prancis |
| Periode | Desember 2006 - November 2010 (~4 tahun) |
| Resolusi Asli | Per menit (2.075.259 records) |
| Resampling | Rata-rata per jam (`resample('1H').mean()`) |
| Total Resampled | 34.168 records |
| Missing Values | Ditangani dengan `na_values=['?']` |
| Split | Train 70% (23.902) / Val 15% (5.121) / Test 15% (5.121) |
| Metode Split | Time-based (kronologis, tanpa shuffling) |

### Variabel Dataset

| No | Variabel | Satuan | Deskripsi |
|:---:|---|---|---|
| 1 | `Global_active_power` | kW | Total daya aktif rumah tangga **(TARGET)** |
| 2 | `Global_reactive_power` | kW | Total daya reaktif rumah tangga |
| 3 | `Voltage` | Volt | Tegangan listrik rata-rata |
| 4 | `Global_intensity` | Ampere | Arus listrik rata-rata |
| 5 | `Sub_metering_1` | Wh | Dapur: dishwasher, oven, microwave |
| 6 | `Sub_metering_2` | Wh | Laundry: mesin cuci, pengering, kulkas |
| 7 | `Sub_metering_3` | Wh | Pemanas air listrik & AC |

---

## Feature Engineering

### Random Forest & Gradient Boosting (24 fitur)

| Kategori | Fitur | Jumlah |
|---|---|:---:|
| **Sensor** | `Global_reactive_power`, `Voltage`, `Global_intensity`, `Sub_metering_1`, `Sub_metering_2`, `Sub_metering_3` | 6 |
| **Kalender** | `hour`, `dayofweek`, `is_weekend`, `month` | 4 |
| **Lag** | `lag_1`, `lag_2`, `lag_3`, `lag_6`, `lag_12`, `lag_24` | 6 |
| **Rolling Mean** | `rollmean_3`, `rollmean_6`, `rollmean_12`, `rollmean_24` | 4 |
| **Rolling Std** | `rollstd_3`, `rollstd_6`, `rollstd_12`, `rollstd_24` | 4 |

### LSTM (univariate)

| Parameter | Nilai |
|---|---|
| Input | `Global_active_power` (1 fitur) |
| Window Size | 24 jam |
| Normalisasi | `StandardScaler` (fit pada training set) |
| Input Shape | `(batch, 24, 1)` |

---

## Konfigurasi Model

### Random Forest Regressor

| Parameter | Default | Tuned (RandomizedSearchCV) |
|---|---|---|
| `n_estimators` | 300 | 80-200 |
| `max_depth` | None | 8, 12, None |
| `min_samples_split` | 2 | 2-6 |
| `min_samples_leaf` | 1 | 1-4 |
| `max_features` | - | sqrt, None |
| `random_state` | 42 | 42 |
| `n_jobs` | -1 | -1 |

### Gradient Boosting Regressor

| Parameter | Default | Tuned (RandomizedSearchCV) |
|---|---|---|
| `n_estimators` | 500 | 120-360 |
| `learning_rate` | 0.03 | 0.05-0.20 |
| `max_depth` | 3 | 2-6 |
| `subsample` | - | 0.8-1.0 |
| `min_samples_split` | 2 | 2-6 |
| `random_state` | 42 | 42 |

### LSTM Network

| Parameter | Nilai |
|---|---|
| Architecture | `LSTM(64)` - `Dropout(0.2)` - `LSTM(32)` - `Dense(16, ReLU)` - `Dense(1)` |
| Optimizer | Adam (`lr=0.001`) |
| Loss | Mean Squared Error (MSE) |
| Batch Size | 64 |
| Epochs | 100 (EarlyStopping `patience=10`) |
| Window | 24 jam |

---

## Hasil Evaluasi

### Default Models (Test Set - 5.121 data points)

| Model | MAE (kW) | RMSE (kW) | R² |
|---|:---:|:---:|:---:|
| Random Forest | 0.0134 | 0.0221 | 0.9990 |
| **Gradient Boosting** | **0.0126** | **0.0206** | **0.9992** |
| LSTM | 0.3411 | 0.4863 | 0.5307 |

### Tuned Models (Test Set - 5.121 data points)

| Model | MAE (kW) | RMSE (kW) | R² |
|---|:---:|:---:|:---:|
| RF Tuned | 0.0166 | 0.0248 | 0.9988 |
| **GB Tuned** | **0.0147** | **0.0226** | **0.9990** |

### Kesimpulan

```
+-------------------------------------------------------+
|                  RANKING MODEL                         |
+-------------------------------------------------------+
|  #1  Gradient Boosting  |  R² = 0.9992  |  MAE terkecil, RMSE terkecil
|  #2  Random Forest      |  R² = 0.9990  |  Sangat dekat dengan GB
|  #3  LSTM               |  R² = 0.5307  |  Hanya 1 fitur (univariate)
+-------------------------------------------------------+
```

- **Gradient Boosting** unggul di **semua metrik** (MAE, RMSE, R²) dengan ukuran model paling kecil (~330 KB vs RF ~48 MB)
- **Random Forest** sangat dekat performanya, namun model jauh lebih besar
- **LSTM** hanya menggunakan 1 fitur (`Global_active_power`) vs 24 fitur pada tree models, sehingga performanya lebih rendah. LSTM berfungsi sebagai **baseline univariate** untuk menunjukkan pentingnya feature engineering
- Metode **boosting** (sequential learning) secara iteratif mengoreksi kesalahan tree sebelumnya, menghasilkan akurasi lebih tinggi dibanding **bagging** (Random Forest)

---

## Tech Stack

### Training & Eksperimen (Google Colab)

| Komponen | Teknologi | Versi |
|---|---|---|
| Bahasa | Python | 3.12 |
| ML Framework | scikit-learn | 1.x |
| DL Framework | TensorFlow / Keras | 2.x |
| Data Processing | Pandas, NumPy | - |
| Visualisasi | Matplotlib, Seaborn | - |
| Hyperparameter Tuning | RandomizedSearchCV | scikit-learn |
| Serialisasi Model | joblib, Keras `.keras` | - |

### Website (Production)

| Komponen | Teknologi |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Charts | [Plotly.js](https://plotly.com/javascript/) 2.35 |
| UI Theme | Custom Dark Theme (CSS Variables) |
| Deployment | [Vercel](https://vercel.com) (Static Site) |
| Data Format | JSON (pre-computed predictions) |

### Development Tools

| Tool | Kegunaan |
|---|---|
| Google Colab | Training model & eksperimen |
| VS Code | Pengembangan website |
| Git + GitHub | Version control |
| Vercel CLI | Deployment |

---

## Fitur Website

| Halaman | Fitur |
|---|---|
| **Dashboard** | Kartu statistik (konsumsi terakhir, rata-rata, min/max), penjelasan variabel dataset, grafik perbandingan 3 model, tabel metrik evaluasi |
| **Prediksi & Perbandingan** | Filter rentang waktu (24h/48h/7d/30d/full), toggle model (Aktual/RF/GB/LSTM), grafik interaktif Plotly, metrik dinamis & resmi, analisis error, interpretasi hasil, kesimpulan |
| **Informasi Model** | Arsitektur detail tiap model, hyperparameter, kelebihan/kekurangan, feature engineering (24 fitur tree + 1 fitur LSTM), info dataset UCI |

---

## Struktur Proyek

```
smart-home-energy-prediction/
|
|-- index.html                 # Single Page Application (3 halaman)
|-- css/
|   +-- style.css              # Dark theme + responsive design
|-- js/
|   +-- app.js                 # Logika aplikasi, Plotly charts, metrik
|-- data/
|   |-- sample_data.json       # 168 data points (7 hari terakhir test set)
|   +-- full_test_data.json    # 5.121 data points (seluruh test set)
|-- vercel.json                # Konfigurasi deployment Vercel
|-- .gitignore
+-- README.md
```

**Total ukuran deploy: ~661 KB**

---

## Deployment

### Vercel (Recommended)

```bash
# Cara 1: CLI
npm i -g vercel
vercel

# Cara 2: GitHub Integration
# 1. Push ke GitHub
# 2. Import di vercel.com
# 3. Deploy otomatis
```

### Lokal

```bash
python -m http.server 8000
# Buka http://localhost:8000
```

---

## Referensi

1. D. Ageng et al., "A Short-Term Household Load Forecasting Framework Using LSTM and Data Preparation," *IEEE Access*, vol. 9, 2021
2. A. S. Shah et al., "Dynamic user preference parameters selection and energy consumption optimization for smart homes," *IEEE Access*, vol. 8, 2020
3. L. Xiang et al., "Prediction model of household appliance energy consumption based on machine learning," *J. Phys. Conf. Ser.*, 2020
4. M. Xue et al., "Research on Load Forecasting of Charging Station Based on XGBoost and LSTM Model," *J. Phys. Conf. Ser.*, 2021
5. S. V. Oprea and A. Bara, "Machine Learning Algorithms for Short-Term Load Forecast in Residential Buildings Using Smart Meters," *IEEE Access*, vol. 7, 2019
6. [UCI Dataset - Individual Household Electric Power Consumption](https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption)

---

<p align="center">
  <strong>Skripsi</strong> - Program Studi Teknik Informatika<br>
  <strong>Franscen Yosafat Sinambela</strong> (NIM. 2244053)<br>
  STMIK TIME Medan - 2025
</p>
