#!/usr/bin/env node
/**
 * Sync invoicing/master_data.js and shared/catalog.json from GET /api/products.
 * Run after any D1 product change; invoicing UI also fetches live on page load.
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const API_BASE = process.env.HANNIEL_API_BASE || 'https://app.hanniel.co';
const REPO = process.env.HANNIEL_MODULES_ROOT || '/root/hanniel-modules';
const CATALOG_PATH = path.join(REPO, 'shared/catalog.json');
const MASTER_DATA_PATH = path.join(REPO, 'invoicing/master_data.js');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Invalid JSON: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function jsKey(id) {
  return /^[a-zA-Z_$][\w$]*$/.test(id) ? id : JSON.stringify(id);
}

function buildMasterDataJs(products) {
  const lines = ['const MASTER_DATA = {'];
  const keys = Object.keys(products).sort();
  for (const id of keys) {
    const p = products[id];
    const name = JSON.stringify(p.name || '');
    const price = Number(p.price) || 0;
    const template = JSON.stringify(p.template || '');
    lines.push(`    ${jsKey(id)}: { name: ${name}, price: ${price}, template: ${template} },`);
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const url = `${API_BASE}/api/products`;
  console.log(`[sync-products] GET ${url}`);
  const data = await fetchJson(url);
  const products = data.products || data;
  if (!products || typeof products !== 'object') {
    throw new Error(`Unexpected shape: ${Object.keys(data).join(',')}`);
  }
  const count = Object.keys(products).length;
  console.log(`[sync-products] ${count} products`);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify({ products }, null, 2) + '\n', 'utf8');
  console.log(`[sync-products] wrote ${CATALOG_PATH}`);

  fs.writeFileSync(MASTER_DATA_PATH, buildMasterDataJs(products), 'utf8');
  console.log(`[sync-products] wrote ${MASTER_DATA_PATH}`);
}

main().catch((e) => {
  console.error(`[sync-products] FAILED: ${e.message}`);
  process.exit(1);
});