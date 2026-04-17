/* ═══ STATE ═══ */
let sampleData = null;
let fullTestData = null;

/* ═══ DATA LOADING ═══ */
async function loadData() {
    try {
        const [sRes, fRes] = await Promise.all([
            fetch('data/sample_data.json'),
            fetch('data/full_test_data.json')
        ]);
        sampleData = await sRes.json();
        fullTestData = await fRes.json();
        return true;
    } catch (err) {
        console.error('Gagal memuat data:', err);
        return false;
    }
}

/* ═══ NAVIGATION ═══ */
function navigate(page) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
    window.scrollTo(0, 0);
    if (page === 'dashboard') renderDashboard();
    if (page === 'prediksi') renderPrediksi();
}

/* ═══ DASHBOARD ═══ */
function renderDashboard() {
    if (!sampleData || !sampleData.data || !sampleData.data.length) {
        document.getElementById('dashboard-metrics').innerHTML = '<div class="warning-box">Data sampel tidak ditemukan.</div>';
        return;
    }
    var data = sampleData.data;
    var latest = data[data.length - 1];
    var sum = 0; for (var i = 0; i < data.length; i++) sum += data[i].actual;
    var avg = sum / data.length;
    var max = -Infinity, min = Infinity;
    for (var i = 0; i < data.length; i++) {
        if (data[i].actual > max) max = data[i].actual;
        if (data[i].actual < min) min = data[i].actual;
    }

    document.getElementById('stat-latest').textContent = latest.actual.toFixed(2) + ' kW';
    document.getElementById('stat-avg').textContent = avg.toFixed(2) + ' kW';
    document.getElementById('stat-avg-help').textContent = data.length + ' data points';
    document.getElementById('stat-max').textContent = max.toFixed(2) + ' kW';
    document.getElementById('stat-min').textContent = min.toFixed(2) + ' kW';
    document.getElementById('dashboard-points').textContent = data.length;

    createChart(data, 'dashboard-chart', 'Perbandingan Prediksi 3 Model (' + data.length + ' Jam)', null, 460);

    if (sampleData.metrics) {
        document.getElementById('dashboard-metrics').innerHTML = renderMetricsHTML(
            sampleData.metrics,
            'Perbandingan Metrik Evaluasi (Test Set)',
            'Semakin kecil MAE & RMSE = semakin baik. Semakin besar R² (mendekati 1) = semakin baik.'
        );
    }
}

/* ═══ PREDIKSI ═══ */
function renderPrediksi() {
    var total = fullTestData ? fullTestData.data.length : (sampleData ? sampleData.data.length : 0);
    document.getElementById('prediksi-points').textContent = total;
    updatePrediksi();
}

function updatePrediksi() {
    var checked = document.querySelector('input[name="timeRange"]:checked');
    if (!checked) return;
    var timeRange = parseInt(checked.value);
    var showModels = {
        actual: document.getElementById('show-actual').checked,
        rf: document.getElementById('show-rf').checked,
        gb: document.getElementById('show-gb').checked,
        lstm: document.getElementById('show-lstm').checked
    };

    var source = (timeRange > 168 || timeRange === 0) ? fullTestData : sampleData;
    if (!source || !source.data) return;

    var data = source.data;
    if (timeRange > 0) data = data.slice(-timeRange);

    var labels = { 0: 'Full Test Set', 24: '24 Jam', 48: '48 Jam', 168: '7 Hari', 720: '30 Hari' };
    var timeLabel = labels[timeRange] || timeRange + ' Jam';

    createChart(data, 'prediksi-chart', 'Perbandingan Prediksi — ' + timeLabel + ' (' + data.length + ' points)', showModels, 500);
    renderErrorAnalysis(data);

    var dynamicMetrics = computeMetrics(data);
    document.getElementById('dynamic-metrics').innerHTML = renderMetricsHTML(
        dynamicMetrics,
        'Metrik Evaluasi — ' + timeLabel + ' (' + data.length + ' points)',
        'Dihitung ulang secara dinamis berdasarkan rentang waktu yang dipilih.'
    );

    if (sampleData && sampleData.metrics) {
        document.getElementById('official-metrics').innerHTML = renderMetricsHTML(
            sampleData.metrics,
            'Metrik Evaluasi Resmi — Full Test Set (5.121 points)',
            'Metrik tetap dari evaluasi seluruh test set (15% data). Ini adalah angka yang dilaporkan di skripsi.'
        );
    }

    renderInterpretation();
    renderConclusion();
}

/* ═══ CHART ═══ */
function createChart(data, containerId, title, showModels, height) {
    if (!data || !data.length) return;
    if (!showModels) showModels = { actual: true, rf: true, gb: true, lstm: true };

    var dt = [], ac = [], rf = [], gb = [], ls = [];
    for (var i = 0; i < data.length; i++) {
        dt.push(data[i].datetime);
        ac.push(data[i].actual);
        rf.push(data[i].rf_pred);
        gb.push(data[i].gb_pred);
        ls.push(data[i].lstm_pred);
    }

    var traces = [];
    if (showModels.actual) traces.push({ x: dt, y: ac, name: 'Data Aktual', mode: 'lines', line: { color: '#3b82f6', width: 2.5 } });
    if (showModels.rf)     traces.push({ x: dt, y: rf, name: 'Random Forest', mode: 'lines', line: { color: '#10b981', width: 2, dash: 'dash' } });
    if (showModels.gb)     traces.push({ x: dt, y: gb, name: 'Gradient Boosting', mode: 'lines', line: { color: '#f97316', width: 2, dash: 'dot' } });
    if (showModels.lstm)   traces.push({ x: dt, y: ls, name: 'LSTM', mode: 'lines', line: { color: '#ef4444', width: 2, dash: 'dashdot' } });

    var layout = {
        title: { text: title, font: { color: '#f1f5f9', size: 16 } },
        xaxis: { title: 'Waktu', gridcolor: '#334155', color: '#94a3b8', tickfont: { size: 11 }, showline: true, linecolor: '#475569' },
        yaxis: { title: 'Global Active Power (kW)', gridcolor: '#334155', color: '#94a3b8', tickfont: { size: 11 }, showline: true, linecolor: '#475569' },
        plot_bgcolor: '#0f172a', paper_bgcolor: '#1e293b',
        font: { color: '#e2e8f0' },
        legend: { bgcolor: 'rgba(30,41,59,0.8)', bordercolor: '#475569', borderwidth: 1, font: { size: 12 } },
        height: height || 500,
        margin: { l: 60, r: 20, t: 50, b: 60 },
        hovermode: 'x unified'
    };

    Plotly.newPlot(containerId, traces, layout, { responsive: true, displayModeBar: false });
}

/* ═══ METRICS ═══ */
function computeMetrics(dataPoints) {
    var models = [
        { key: 'rf_pred', name: 'Random Forest' },
        { key: 'gb_pred', name: 'Gradient Boosting' },
        { key: 'lstm_pred', name: 'LSTM' }
    ];
    var results = [];
    for (var m = 0; m < models.length; m++) {
        var mod = models[m];
        var valid = [];
        for (var i = 0; i < dataPoints.length; i++) {
            if (dataPoints[i][mod.key] && dataPoints[i][mod.key] !== 0) valid.push(dataPoints[i]);
        }
        if (!valid.length) { results.push({ model: mod.name, MAE: 0, RMSE: 0, R2: 0 }); continue; }

        var n = valid.length, sumAbs = 0, sumSq = 0, sumA = 0;
        for (var i = 0; i < n; i++) {
            var err = valid[i].actual - valid[i][mod.key];
            sumAbs += Math.abs(err);
            sumSq += err * err;
            sumA += valid[i].actual;
        }
        var mae = sumAbs / n;
        var rmse = Math.sqrt(sumSq / n);
        var mean = sumA / n;
        var ssTot = 0;
        for (var i = 0; i < n; i++) ssTot += Math.pow(valid[i].actual - mean, 2);
        var r2 = ssTot !== 0 ? 1 - sumSq / ssTot : 0;
        results.push({ model: mod.name, MAE: mae, RMSE: rmse, R2: r2 });
    }
    return results;
}

function renderMetricsHTML(metrics, title, subtitle) {
    var bestMAE = 0, bestRMSE = 0, bestR2 = 0;
    for (var i = 1; i < metrics.length; i++) {
        if (metrics[i].MAE < metrics[bestMAE].MAE) bestMAE = i;
        if (metrics[i].RMSE < metrics[bestRMSE].RMSE) bestRMSE = i;
        if (metrics[i].R2 > metrics[bestR2].R2) bestR2 = i;
    }
    var rows = '';
    for (var i = 0; i < metrics.length; i++) {
        var m = metrics[i];
        rows += '<tr>';
        rows += '<td>' + m.model + '</td>';
        rows += '<td' + (i === bestMAE ? ' class="best"' : '') + '>' + m.MAE.toFixed(4) + '</td>';
        rows += '<td' + (i === bestRMSE ? ' class="best"' : '') + '>' + m.RMSE.toFixed(4) + '</td>';
        rows += '<td' + (i === bestR2 ? ' class="best"' : '') + '>' + m.R2.toFixed(4) + '</td>';
        rows += '</tr>';
    }
    return '<h3>' + title + '</h3>' +
        '<p class="section-caption">' + subtitle + '</p>' +
        '<table class="metrics-table"><thead><tr><th>Model</th><th>MAE ↓</th><th>RMSE ↓</th><th>R² ↑</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
}

/* ═══ ERROR ANALYSIS ═══ */
function renderErrorAnalysis(data) {
    document.getElementById('error-points').textContent = data.length;
    var models = [
        { key: 'rf_pred', name: 'Random Forest', color: '#10b981' },
        { key: 'gb_pred', name: 'Gradient Boosting', color: '#f97316' },
        { key: 'lstm_pred', name: 'LSTM', color: '#ef4444' }
    ];
    var html = '';
    for (var m = 0; m < models.length; m++) {
        var mod = models[m];
        var errors = [], count = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i][mod.key] && data[i][mod.key] !== 0) {
                errors.push(Math.abs(data[i].actual - data[i][mod.key]));
                count++;
            }
        }
        if (!count) continue;
        var sumE = 0, sumSq = 0, maxE = 0;
        for (var i = 0; i < errors.length; i++) {
            sumE += errors[i]; sumSq += errors[i] * errors[i];
            if (errors[i] > maxE) maxE = errors[i];
        }
        var mae = sumE / count;
        var rmse = Math.sqrt(sumSq / count);
        html += '<div class="error-card">' +
            '<h4 style="color:' + mod.color + '">' + mod.name + '</h4>' +
            '<div class="error-metric"><span class="error-metric-label">MAE</span><span class="error-metric-value">' + mae.toFixed(4) + ' kW</span></div>' +
            '<div class="error-metric"><span class="error-metric-label">RMSE</span><span class="error-metric-value">' + rmse.toFixed(4) + ' kW</span></div>' +
            '<div class="error-metric"><span class="error-metric-label">Max Error</span><span class="error-metric-value">' + maxE.toFixed(4) + ' kW</span></div>' +
            '<p class="error-points">' + count + ' data points</p></div>';
    }
    document.getElementById('error-content').innerHTML = html;
}

/* ═══ INTERPRETATION ═══ */
function renderInterpretation() {
    var metrics = sampleData && sampleData.metrics ? sampleData.metrics : [];
    var rf = findMetric(metrics, 'RandomForest', { MAE: 0.0166, RMSE: 0.0249, R2: 0.9988 });
    var gb = findMetric(metrics, 'GradientBoosting', { MAE: 0.0158, RMSE: 0.0239, R2: 0.9989 });
    var lstm = findMetric(metrics, 'LSTM', { MAE: 0.3462, RMSE: 0.4896, R2: 0.5243 });

    document.getElementById('interpretation-cards').innerHTML =
        interpCard('Random Forest (RF)', rf, '', [
            '<strong>MAE sangat kecil</strong> (~' + rf.MAE.toFixed(3) + ' kW) — prediksi hampir selalu sangat dekat dengan nilai aktual.',
            '<strong>RMSE ≈ MAE</strong> — tidak ada kesalahan ekstrem, prediksi sangat konsisten.',
            '<strong>R² = ' + rf.R2.toFixed(4) + '</strong> — model menjelaskan <strong>' + (rf.R2 * 100).toFixed(2) + '%</strong> variasi konsumsi energi.',
            'Keunggulan berkat <strong>24 fitur</strong> (sensor + kalender + lag + rolling statistics).'
        ]) +
        interpCard('Gradient Boosting (GB) — Model Terbaik', gb, 'border-left:3px solid #f97316', [
            '<strong>MAE terendah</strong> (' + gb.MAE.toFixed(4) + ' kW) — akurasi tertinggi di antara ketiga model.',
            '<strong>RMSE terendah</strong> (' + gb.RMSE.toFixed(4) + ' kW) — paling konsisten.',
            '<strong>R² tertinggi</strong> (' + gb.R2.toFixed(4) + ') — menjelaskan <strong>' + (gb.R2 * 100).toFixed(2) + '%</strong> variasi data.',
            'Strategi <em>sequential learning</em> (boosting): setiap tree baru mengoreksi kesalahan tree sebelumnya.',
            'Ukuran model hanya ~330 KB (vs RF ~48 MB) — <strong>lebih efisien untuk deployment</strong>.'
        ], true) +
        interpCard('LSTM (Long Short-Term Memory)', lstm, '', [
            '<strong>MAE ~' + lstm.MAE.toFixed(2) + ' kW</strong> — sekitar <strong>' + Math.round(lstm.MAE / gb.MAE) + '× lebih besar</strong> dari Gradient Boosting.',
            '<strong>RMSE ≫ MAE</strong> — ada beberapa prediksi yang meleset cukup jauh.',
            '<strong>R² = ' + lstm.R2.toFixed(4) + '</strong> — hanya menjelaskan <strong>' + (lstm.R2 * 100).toFixed(2) + '%</strong> variasi data.',
            '<strong>Penyebab:</strong> LSTM hanya menggunakan <strong>1 fitur</strong> (Global_active_power), tanpa sensor lain atau fitur lag/rolling (24 fitur).',
            'Tetap mampu menangkap <strong>tren umum</strong> konsumsi energi harian.',
            'Berfungsi sebagai <strong>baseline univariate</strong> untuk menunjukkan pentingnya feature engineering.'
        ]);
}

function interpCard(title, m, style, points, isBest) {
    var metricsHTML = '<div class="interp-metrics">';
    var labels = ['MAE', 'RMSE', 'R²'];
    var values = [m.MAE.toFixed(4) + ' kW', m.RMSE.toFixed(4) + ' kW', m.R2.toFixed(4)];
    for (var i = 0; i < 3; i++) {
        metricsHTML += '<div class="interp-metric"><p class="interp-metric-label">' + labels[i] + '</p>' +
            '<p class="interp-metric-value">' + values[i] + '</p>' +
            (isBest ? '<p class="interp-metric-delta">Best</p>' : '') + '</div>';
    }
    metricsHTML += '</div>';

    var listHTML = '<ul>';
    for (var i = 0; i < points.length; i++) listHTML += '<li>' + points[i] + '</li>';
    listHTML += '</ul>';

    return '<div class="interp-card"' + (style ? ' style="' + style + '"' : '') + '>' +
        '<h3>' + title + '</h3>' + metricsHTML + listHTML + '</div>';
}

function findMetric(metrics, name, fallback) {
    for (var i = 0; i < metrics.length; i++) {
        if (metrics[i].model === name) return metrics[i];
    }
    return fallback;
}

/* ═══ CONCLUSION ═══ */
function renderConclusion() {
    var metrics = sampleData && sampleData.metrics ? sampleData.metrics : [];
    var rf = findMetric(metrics, 'RandomForest', { MAE: 0.0166, RMSE: 0.0249, R2: 0.9988 });
    var gb = findMetric(metrics, 'GradientBoosting', { MAE: 0.0158, RMSE: 0.0239, R2: 0.9989 });

    document.getElementById('conclusion-section').innerHTML =
        '<div class="card"><h3>Perbandingan RF vs GB: Mana yang Terbaik?</h3>' +
        '<table class="metrics-table"><thead><tr><th>Metrik</th><th>Random Forest</th><th>Gradient Boosting</th><th>Pemenang</th></tr></thead><tbody>' +
        '<tr><td>MAE (↓ lebih baik)</td><td>' + rf.MAE.toFixed(4) + '</td><td class="best">' + gb.MAE.toFixed(4) + ' ⭐</td><td>Gradient Boosting</td></tr>' +
        '<tr><td>RMSE (↓ lebih baik)</td><td>' + rf.RMSE.toFixed(4) + '</td><td class="best">' + gb.RMSE.toFixed(4) + ' ⭐</td><td>Gradient Boosting</td></tr>' +
        '<tr><td>R² (↑ lebih baik)</td><td>' + rf.R2.toFixed(4) + '</td><td class="best">' + gb.R2.toFixed(4) + ' ⭐</td><td>Gradient Boosting</td></tr>' +
        '</tbody></table>' +
        '<h4 style="margin-top:20px">Kesimpulan: Gradient Boosting adalah Model Terbaik</h4>' +
        '<p>GB mengungguli semua model di ketiga metrik:</p>' +
        '<ol><li><strong>MAE terendah</strong> — rata-rata error ~5% lebih kecil dari RF.</li>' +
        '<li><strong>RMSE terendah</strong> — lebih konsisten, kesalahan besar lebih jarang (~4% lebih kecil dari RF).</li>' +
        '<li><strong>R² tertinggi</strong> — menjelaskan variasi data sedikit lebih baik dari RF.</li>' +
        '<li><strong>Ukuran model lebih kecil</strong> (~330 KB vs ~48 MB) — lebih efisien untuk deployment.</li></ol>' +
        '<p style="margin-top:12px">Metode <em>boosting</em> (sequential learning) secara iteratif mengoreksi kesalahan tree sebelumnya, menghasilkan akurasi lebih tinggi dibanding <em>bagging</em> (RF) pada dataset ini.</p></div>';
}

/* ═══ TABS ═══ */
function initTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
            var tabId = this.dataset.tab;
            var parent = this.closest('.tabs');
            var allBtns = parent.querySelectorAll('.tab-btn');
            var allContents = parent.querySelectorAll('.tab-content');
            for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove('active');
            for (var j = 0; j < allContents.length; j++) allContents[j].classList.remove('active');
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    }
}

/* ═══ MOBILE ═══ */
function initMobile() {
    document.getElementById('menu-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    });
    document.getElementById('sidebar-overlay').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    });
}

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded', async function () {
    // Navigation
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function (e) {
            e.preventDefault();
            navigate(this.dataset.page);
        });
    }

    // Controls
    var radios = document.querySelectorAll('input[name="timeRange"]');
    for (var i = 0; i < radios.length; i++) radios[i].addEventListener('change', updatePrediksi);
    var checkIds = ['show-actual', 'show-rf', 'show-gb', 'show-lstm'];
    for (var i = 0; i < checkIds.length; i++) {
        var el = document.getElementById(checkIds[i]);
        if (el) el.addEventListener('change', updatePrediksi);
    }

    initTabs();
    initMobile();

    var ok = await loadData();
    if (ok) renderDashboard();
});
