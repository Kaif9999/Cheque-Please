/**
 * Screenshot + console-check harness.
 *
 *   node tools/shot.mjs --url http://127.0.0.1:4190/#/mumbai --out shots/mumbai.png
 *   node tools/shot.mjs --url ... --mobile --eval "__cheque.go({ kind: 'cafe', slug: 'some-slug' })"
 *
 * Prints console errors and page errors, and exits non-zero if any occurred.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next === undefined || next.startsWith('--') ? 'true' : next;
}

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));

const url = arg('url', 'http://127.0.0.1:4190/');
const out = resolve(arg('out', 'shots/shot.png'));
const mobile = arg('mobile') === 'true';
const evalJs = arg('eval');
const click = arg('click');
const wait = Number(arg('wait', '3.5'));

mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(wait * 1000);
if (evalJs) {
  await page.evaluate(evalJs);
  await page.waitForTimeout(1600);
}
if (click) {
  await page.click(click);
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: out });
await browser.close();
for (const p of problems) console.log(p);
console.log(`saved ${out}`);
process.exit(problems.some((p) => p.startsWith('[error]') || p.startsWith('[pageerror]')) ? 1 : 0);
