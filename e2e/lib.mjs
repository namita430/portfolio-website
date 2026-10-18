import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const BASE = (process.env.E2E_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
export const shotsDir = path.join(here, 'screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

/** These tests create, edit and delete content and send a contact message, so they must only run against a dev/test copy. */
export function guardLocal() {
  const host = new URL(BASE).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.E2E_ALLOW_REMOTE !== '1') {
    console.error(`Refusing to run against ${BASE}: these tests modify data. Set E2E_ALLOW_REMOTE=1 only for a throw-away deployment.`);
    process.exit(2);
  }
}

const BROWSER_CANDIDATES = [
  process.env.E2E_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

export async function launch() {
  const executablePath = BROWSER_CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) {
    console.error('No Chrome/Edge/Chromium found. Install one or set E2E_BROWSER to its executable path.');
    process.exit(2);
  }
  return chromium.launch({ executablePath, headless: true });
}

export function credentials() {
  const user = process.env.E2E_ADMIN_USER;
  const pass = process.env.E2E_ADMIN_PASSWORD;
  if (!user || !pass) {
    console.error('Set E2E_ADMIN_USER and E2E_ADMIN_PASSWORD (an admin account on the dev database, created with `npm run admin:create`).');
    process.exit(2);
  }
  return { user, pass };
}

/** Runs named steps, never aborting the whole run, and prints a PASS/FAIL line for each. */
export function stepRunner(page) {
  const results = [];
  let n = 0;
  async function step(name, fn) {
    n += 1;
    const label = `${String(n).padStart(2, '0')} ${name}`;
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`PASS ${label}`);
    } catch (e) {
      const msg = String(e.message).split('\n')[0].slice(0, 300);
      results.push({ name, ok: false, error: msg });
      console.log(`FAIL ${label}\n       ${msg}`);
      if (page) await page.screenshot({ path: path.join(shotsDir, `fail-${String(n).padStart(2, '0')}.png`) }).catch(() => {});
    }
  }
  const summary = () => {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
    return failed.length;
  };
  return { step, summary, results };
}

// ---- tiny test-file generators (no image library needed)
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A valid solid-colour PNG. */
export function makePng(width, height, [r, g, b]) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3)]);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** A minimal, script-free PDF. */
export const makePdf = () => Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'latin1');

export const tmp = os.tmpdir();
