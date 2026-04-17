/**
 * Vercel build script — runs automatically before deployment.
 *
 * Pipeline:
 *   1. Extract individual+household+electric+power+consumption.zip → data/
 *   2. Parse household_power_consumption.txt (1-min intervals, semicolon-delimited)
 *   3. Resample to hourly mean of Global_active_power
 *   4. Merge with pre-computed model predictions (data/predictions.json)
 *   5. Write data/full_test_data.json (5121 hourly points, test set)
 *      and data/sample_data.json (last 168 hours = 7 days)
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR       = path.join(__dirname, '..', 'data');
const ZIP_NAME       = 'individual+household+electric+power+consumption.zip';
const TXT_NAME       = 'household_power_consumption.txt';
const PRED_FILE      = path.join(DATA_DIR, 'predictions.json');
const FULL_OUT       = path.join(DATA_DIR, 'full_test_data.json');
const SAMPLE_OUT     = path.join(DATA_DIR, 'sample_data.json');
const SAMPLE_HOURS   = 168; // last 7 days of test set

async function extractZip(zipPath, destDir) {
  const unzipper = require('unzipper');
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}

function findZip() {
  const primary = path.join(DATA_DIR, ZIP_NAME);
  if (fs.existsSync(primary)) return primary;
  // fallback: any .zip in data/
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.zip'));
  if (files.length) return path.join(DATA_DIR, files[0]);
  return null;
}

function findTxt() {
  const primary = path.join(DATA_DIR, TXT_NAME);
  if (fs.existsSync(primary)) return primary;
  // fallback: any .txt in data/
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'));
  if (files.length) return path.join(DATA_DIR, files[0]);
  return null;
}

/**
 * Parse txt line-by-line and aggregate to hourly mean.
 * Format: Date;Time;Global_active_power;...
 *         dd/mm/yyyy;hh:mm:ss;value;...
 * Missing values are marked as '?' — skip those.
 */
function buildHourlyMap(txtPath) {
  console.log('Parsing', path.basename(txtPath), '...');
  const content = fs.readFileSync(txtPath, 'utf8');
  const lines   = content.split('\n');
  const hourly  = new Map(); // "YYYY-MM-DDTHH:00:00" → {sum, count}

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length < 3) continue;

    const datePart = parts[0]; // dd/mm/yyyy
    const timePart = parts[1]; // hh:mm:ss
    const gapStr   = parts[2]; // Global_active_power
    if (!datePart || !timePart || gapStr === '' || gapStr === '?') continue;

    const gap = parseFloat(gapStr);
    if (isNaN(gap)) continue;

    // Build ISO hour key
    const [day, mon, yr] = datePart.split('/');
    const [hr]           = timePart.split(':');
    const key = `${yr}-${mon.padStart(2,'0')}-${day.padStart(2,'0')}T${hr.padStart(2,'0')}:00:00`;

    let bucket = hourly.get(key);
    if (!bucket) { bucket = { sum: 0, count: 0 }; hourly.set(key, bucket); }
    bucket.sum += gap;
    bucket.count++;

    if (i % 500000 === 0) process.stdout.write(`  parsed ${i.toLocaleString()} lines...\r`);
  }

  console.log(`\nParsed ${hourly.size.toLocaleString()} unique hours from ${(lines.length - 1).toLocaleString()} readings`);
  return hourly;
}

async function main() {
  // ── 1. Extract zip ──────────────────────────────────────────────────
  const zipPath = findZip();
  if (!zipPath) {
    console.error('ERROR: Dataset zip not found in data/');
    process.exit(1);
  }

  const txtPath = findTxt();
  if (!txtPath) {
    console.log(`Extracting ${path.basename(zipPath)} ...`);
    await extractZip(zipPath, DATA_DIR);
    console.log('Extraction complete.');
  } else {
    console.log(`Found existing ${path.basename(txtPath)}, skipping extraction.`);
  }

  const resolvedTxt = findTxt();
  if (!resolvedTxt) {
    console.error('ERROR: household_power_consumption.txt not found after extraction.');
    process.exit(1);
  }

  // ── 2. Load predictions ──────────────────────────────────────────────
  if (!fs.existsSync(PRED_FILE)) {
    console.error('ERROR: data/predictions.json not found.');
    process.exit(1);
  }
  const predictions = JSON.parse(fs.readFileSync(PRED_FILE, 'utf8'));
  console.log(`Loaded ${predictions.data.length} model predictions.`);

  // ── 3. Parse household txt → hourly map ─────────────────────────────
  const hourlyMap = buildHourlyMap(resolvedTxt);

  // ── 4. Merge predictions with actual hourly values ───────────────────
  let matched = 0, missing = 0;
  const allData = predictions.data.map(pred => {
    const bucket = hourlyMap.get(pred.datetime);
    let actual;
    if (bucket && bucket.count > 0) {
      actual = Math.round((bucket.sum / bucket.count) * 10000) / 10000;
      matched++;
    } else {
      actual = 0;
      missing++;
    }
    return {
      datetime  : pred.datetime,
      actual    : actual,
      rf_pred   : pred.rf,
      gb_pred   : pred.gb,
      lstm_pred : pred.lstm
    };
  });

  console.log(`Merged: ${matched} matched, ${missing} missing actual values.`);

  // ── 5. Write output files ────────────────────────────────────────────
  const fullOut   = { data: allData, metrics: predictions.metrics };
  const sampleOut = { data: allData.slice(-SAMPLE_HOURS), metrics: predictions.metrics };

  fs.writeFileSync(FULL_OUT,   JSON.stringify(fullOut));
  fs.writeFileSync(SAMPLE_OUT, JSON.stringify(sampleOut));

  const fullKB   = Math.round(fs.statSync(FULL_OUT).size   / 1024);
  const sampleKB = Math.round(fs.statSync(SAMPLE_OUT).size / 1024);
  console.log(`full_test_data.json  → ${fullKB} KB  (${allData.length} points)`);
  console.log(`sample_data.json     → ${sampleKB} KB  (${sampleOut.data.length} points)`);
  console.log('Build complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
