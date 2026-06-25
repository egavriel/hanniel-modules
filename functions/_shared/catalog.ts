// Catalog — D1 is now the runtime source of truth for PRODUCTS only.
//
// This module used to read `shared/catalog.json` at module-load time. The
// JSON file drifted out of sync with the deployed catalog because edits
// happened via the Cloudflare Dashboard and were never pushed back to git.
//
// As of migration 0002, products live in the `products` D1 table, populated
// either by the migration seed or by the existing /api/products POST/PUT/
// DELETE handlers (which already exist in functions/api/products.ts and use
// the helpers in functions/_shared/db.ts — no admin auth added because the
// business has trusted internal endpoints already; add auth separately if
// the project gets exposed publicly).
//
// Template feature flags stay hardcoded below — they change rarely and are
// not user-data. If you need them in D1 later, add a `template_registry`
// table and wire it here.
//
// Fallback: if D1 has no rows (fresh project, before migration runs), we
// fall back to `shared/catalog.json` so the API still serves *something*
// instead of an empty list. This is the only place the JSON file is still
// consulted.

import type { D1Database } from "@cloudflare/workers-types";
import catalogJson from "../../shared/catalog.json";
import type { Product, TemplateInfo } from "./types";

export interface CatalogEnv {
  DB: D1Database;
}

// ---------------------------------------------------------------------------
// In-request memoization — one Products query per request
// ---------------------------------------------------------------------------

interface RequestCache {
  products?: Record<string, Product>;
}

function getCache(env: CatalogEnv & { __cache?: RequestCache }): RequestCache {
  if (!env.__cache) env.__cache = {};
  return env.__cache;
}

// ---------------------------------------------------------------------------
// Products — D1 with JSON fallback
// ---------------------------------------------------------------------------

export async function getAllProducts(env: CatalogEnv): Promise<Record<string, Product>> {
  const cache = getCache(env);
  if (cache.products) return cache.products;

  const rows = await env.DB
    .prepare(
      "SELECT id, name, price, template FROM products WHERE active = 1 ORDER BY template, name"
    )
    .all<{ id: string; name: string; price: number; template: string }>();

  const products: Record<string, Product> = {};
  for (const r of rows.results) {
    products[r.id] = { name: r.name, price: r.price, template: r.template };
  }

  // Fallback: if D1 is empty (cold start, before migration runs), use the
  // bundled JSON so /api/products still returns something.
  //
  // The JSON file MUST mirror D1 exactly — kept in sync by syncing from
  // /api/products after any product change. If you see this log line in
  // production, D1 is empty and needs the migration applied:
  //   wrangler d1 execute hanniel-invoices --file migrations/0002_create_products.sql --remote
  if (Object.keys(products).length === 0) {
    const jsonProducts = (catalogJson as { products: Record<string, Product> }).products;
    Object.assign(products, jsonProducts);
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "catalog_fallback_json",
        message: "D1 products table empty — falling back to shared/catalog.json. Apply migration 0002 to production D1.",
        product_count: Object.keys(products).length,
      })
    );
  }

  cache.products = products;
  return products;
}

export async function getProductsByTemplate(env: CatalogEnv, template: string): Promise<Record<string, Product>> {
  const all = await getAllProducts(env);
  const out: Record<string, Product> = {};
  for (const [id, p] of Object.entries(all)) {
    if (p.template === template) out[id] = p;
  }
  return out;
}

export async function getProductById(env: CatalogEnv, id: string): Promise<Product | undefined> {
  const all = await getAllProducts(env);
  return all[id];
}

// ---------------------------------------------------------------------------
// Templates — hardcoded (template_registry was scoped out as not in
// the objective of this patch)
// ---------------------------------------------------------------------------

export const TEMPLATE_FEATURES: Record<string, TemplateInfo["features"]> = {
  christmas:    { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  cny:          { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  cnyhp:        { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  eid:          { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  eidhp:        { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  hanniel:      { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  "hanniel-dp": { discount: true, courtesy_adjustment: true,  deposit: true,  item_description: true,  balance_due: false },
  "hanniel-fi": { discount: true, courtesy_adjustment: true,  deposit: true,  item_description: true,  balance_due: true },
};

const TEMPLATE_LABELS: Record<string, string> = {
  christmas:    "Christmas",
  cny:          "Chinese New Year",
  cnyhp:        "Chinese New Year Hamper",
  eid:          "Eid",
  eidhp:        "Eid Hamper",
  hanniel:      "Hanniel",
  "hanniel-dp": "Hanniel Deposit",
  "hanniel-fi": "Hanniel Final Invoice",
};

export async function getAllTemplates(env: CatalogEnv): Promise<TemplateInfo[]> {
  const products = await getAllProducts(env);
  const counts: Record<string, number> = {};
  for (const p of Object.values(products)) {
    counts[p.template] = (counts[p.template] || 0) + 1;
  }
  return Object.keys(TEMPLATE_FEATURES).map((id) => ({
    id,
    label: TEMPLATE_LABELS[id] ?? id,
    features: TEMPLATE_FEATURES[id],
    product_count: counts[id] ?? 0,
  }));
}

export async function isValidTemplate(env: CatalogEnv, template: string): Promise<boolean> {
  return template in TEMPLATE_FEATURES;
}
