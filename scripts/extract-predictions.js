/**
 * One-time local script: extract predictions from full_test_data.json
 * into a compact predictions.json that is committed to git.
 *
 * Run: node scripts/extract-predictions.js
 */
const fs = require('fs');
const path = require('path');

const fullPath  = path.join(__dirname, '../data/full_test_data.json');
const sampPath  = path.join(__dirname, '../data/sample_data.json');
const outPath   = path.join(__dirname, '../data/predictions.json');

if (!fs.existsSync(fullPath)) {
  console.error('ERROR: data/full_test_data.json not found.');
  process.exit(1);
}

const full   = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const sample = JSON.parse(fs.readFileSync(sampPath, 'utf8'));

const compact = {
  metrics: sample.metrics,
  data: full.data.map(d => ({
    datetime : d.datetime,
    rf       : d.rf_pred,
    gb       : d.gb_pred,
    lstm     : d.lstm_pred
  }))
};

fs.writeFileSync(outPath, JSON.stringify(compact));
console.log(`predictions.json written — ${compact.data.length} records, metrics: ${compact.metrics.length} models`);
