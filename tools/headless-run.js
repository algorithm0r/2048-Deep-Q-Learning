// Run the agent headless for N seconds and report learning: average score per block of 20 games,
// tensor count (a leak shows as growth), and the last training lines.
//
//   cd tools && npm i --no-save playwright-core
//   node headless-run.js 360          (seconds; default 360)
//
// Uses the Chromium that Playwright already installed under %LOCALAPPDATA%\ms-playwright.
// Set CHROME to point at a different browser binary.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort() : [];
  for (const d of dirs.reverse()) {
    const exe = path.join(root, d, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('No Playwright Chromium found; set CHROME');
}

const secs = +process.argv[2] || 360;
const page_url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const page = await browser.newPage();
  const lines = [];
  page.on('console', m => { const t = m.text(); if (/moves\.|Epoch|NaN|rror/.test(t)) lines.push(t.slice(0, 150)); });
  page.on('pageerror', e => lines.push('PAGEERR ' + e.message.slice(0, 150)));
  await page.goto(page_url);
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    await page.waitForTimeout(30000);
    const s = await page.evaluate(() => ({ tensors: tf.memory().numTensors, backend: tf.getBackend() }));
    console.log(`t=${Math.round((Date.now() - t0) / 1000)}s tensors=${s.tensors} backend=${s.backend}`);
  }
  const scores = lines.filter(l => /moves\./.test(l)).map(l => +l.split(' ')[0]);
  const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  console.log(`games=${scores.length}`);
  for (let i = 0; i < scores.length; i += 20) {
    const b = scores.slice(i, i + 20);
    console.log(`games ${i + 1}-${i + b.length}: avg ${avg(b)} max ${Math.max(...b)}`);
  }
  for (const l of lines.filter(l => !/moves/.test(l)).slice(-4)) console.log('  ' + l);
  console.log('status: ' + await page.textContent('#agent-status'));
  await browser.close();
})();
