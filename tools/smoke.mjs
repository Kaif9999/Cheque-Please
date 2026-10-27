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
const rows = () => page.locator('#panel-body a[data-slug]');
const heading = () => page.locator('#panel-body h1').innerText();
async function fresh(hash) {
  await page.goto('about:blank');
  await page.goto(`${base}${hash}`, { waitUntil: 'load' });
  await page.waitForSelector('.maplibregl-marker', { timeout: 15000 });
  await page.waitForTimeout(1200);
}

await fresh('#/bengaluru');

await check('lists every Bengaluru café beside the map', async () => {
  expect((await rows().count()) === 12, `rows: ${await rows().count()}`);
  expect((await heading()).includes('Bengaluru'), 'headline missing');
});

await check('hovering a row lights up its pin or cluster', async () => {
  await rows().first().hover();
  await page.waitForTimeout(200);
  expect((await page.locator('.maplibregl-marker.is-hover').count()) === 1, 'no highlighted marker');
});

await check('a row opens the café page and routes to it', async () => {
  const name = (await rows().nth(1).locator('span span').first().innerText()).trim();
  await rows().nth(1).click();
  await page.waitForTimeout(500);
  expect((await heading()) === name, `heading "${await heading()}" ≠ "${name}"`);
  expect(/#\/bengaluru\/[\w-]+$/.test(page.url()), page.url());
  expect((await page.locator('.maplibregl-marker.is-selected').count()) >= 1, 'pin not selected');
});

await check('escape goes back to the list', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  expect((await rows().count()) === 12, 'list not restored');
});

await check('a cluster zooms in to separate pins', async () => {
  await fresh('#/bengaluru');
  const before = await page.locator('.maplibregl-marker[data-slug]').count();
  await page.locator('.maplibregl-marker[data-slugs]').first().click();
  await page.waitForTimeout(1500);
  expect((await page.locator('.maplibregl-marker[data-slug]').count()) > before, 'no new pins');
});

await check('a pin opens its café page', async () => {
  const pin = page.locator('.maplibregl-marker[data-slug]').first();
  const slug = await pin.getAttribute('data-slug');
  await pin.click();
  await page.waitForTimeout(500);
  expect(page.url().endsWith(`/${slug}`), page.url());
});

await check('the back link returns to the list', async () => {
  await page.locator('#panel-body a', { hasText: 'All Bengaluru cafés' }).click();
  await page.waitForTimeout(400);
  expect((await rows().count()) === 12, 'list not shown');
});

await check('filter chips narrow the list', async () => {
  const chip = page.locator('[data-filter]:not([data-filter=""])').first();
  const count = Number(await chip.locator('span').last().innerText());
  await chip.click();
  await page.waitForTimeout(400);
  expect((await rows().count()) === count, `rows ${await rows().count()} ≠ ${count}`);
  await page.locator('[data-filter=""]').click();
});

await check('follow all lists everyone with an X handle', async () => {
  await page.locator('[data-follow-all]').click();
  await page.waitForSelector('#follow[open]');
  expect((await page.locator('#follow li').count()) === 8, `rows ${await page.locator('#follow li').count()}`);
  await page.locator('#follow [data-close]').click();
});

await check('the city switch swaps the list', async () => {
  await page.locator('.seg-opt[data-city="mumbai"]').click();
  await page.waitForTimeout(800);
  expect((await heading()).includes('Mumbai'), 'headline did not change');
  expect((await rows().count()) === 12, 'Mumbai rows missing');
});

await check('no page errors', async () => expect(errors.length === 0, errors.join(' | ')));

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
