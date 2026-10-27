/**
 * Drives the main flows in a real browser and fails loudly if one breaks.
 *
 *   node tools/smoke.mjs --url http://127.0.0.1:4190/
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const i = process.argv.indexOf('--url');
const base = (i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:4190/').replace(/#.*$/, '');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const bodyHas = (cls) => page.evaluate((c) => document.body.classList.contains(c), cls);

await page.goto(`${base}#/bengaluru`, { waitUntil: 'load' });
await page.waitForSelector('.stack, .spot', { timeout: 15000 });

await check('starts on the intro', async () => expect(await bodyHas('intro'), 'body is not .intro'));

await check('scrolling the map dives in', async () => {
  await page.mouse.move(1100, 450);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(800);
  expect(await bodyHas('dived'), 'body did not switch to .dived');
});

await check('a cluster card zooms in to café cards', async () => {
  await page.goto('about:blank');
  await page.goto(`${base}#/bengaluru`, { waitUntil: 'load' });
  await page.waitForSelector('.stack .spot-name', { timeout: 15000 });
  await page.waitForTimeout(1200);
  const before = await page.locator('.spot').count();
  await page.locator('.stack').first().click();
  await page.waitForTimeout(1400);
  expect((await page.locator('.spot').count()) > before, 'no new café cards after zooming');
});

await check('a café card opens its bill', async () => {
  await page.locator('.spot').first().click();
  await page.waitForSelector('#bill:not([hidden]) .bill-title');
  expect(/#\/bengaluru\/[\w-]+$/.test(page.url()), `hash did not route to the café: ${page.url()}`);
});

await check('the bill follow button scopes the sheet to that café', async () => {
  const btn = page.locator('[data-follow-bill]');
  if (await btn.count()) {
    await btn.click();
    await page.waitForSelector('#follow[open]');
    expect((await page.locator('#follow .sheet-kicker').innerText()).toLowerCase().includes('bill'), 'sheet is not scoped');
    await page.locator('#follow [data-close]').click();
  }
});

await check('escape closes the bill', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await page.locator('#bill').isHidden(), 'bill still open');
});

await check('zone legend filters the map', async () => {
  const rows = page.locator('.zone-row');
  const label = await rows.first().innerText();
  await rows.first().click();
  await page.waitForTimeout(600);
  expect((await rows.first().getAttribute('aria-pressed')) === 'true', `${label} not pressed`);
  await rows.first().click();
});

await check('city switch swaps the headline and data', async () => {
  await page.locator('.switch-opt[data-city="mumbai"]').click();
  await page.waitForTimeout(800);
  expect((await page.locator('#headline').innerText()).toLowerCase().includes('cutting'), 'headline did not change');
});

await check('the full tab lists every café', async () => {
  await page.goto(`${base}#/mumbai/list`, { waitUntil: 'load' });
  await page.waitForSelector('#tab:not([hidden]) .tab-row');
  const rows = await page.locator('.tab-row').count();
  const expected = await page.evaluate(() => document.querySelectorAll('.tab-cafe').length);
  expect(rows > 0 && rows === expected, `rows ${rows}`);
});

await check('a tab row opens that bill on the map', async () => {
  await page.locator('.tab-cafe').first().click();
  await page.waitForSelector('#bill:not([hidden]) .bill-title');
  expect(await page.locator('#tab').isHidden(), 'tab still open');
});

await check('the brand returns to the intro', async () => {
  await page.locator('#brand').click();
  await page.waitForTimeout(500);
  expect(await bodyHas('intro'), 'not back on intro');
  expect(await page.locator('#bill').isHidden(), 'bill still open');
});

await check('no page errors', async () => expect(errors.length === 0, errors.join(' | ')));

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
