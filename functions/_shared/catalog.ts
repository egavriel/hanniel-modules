import type { Product, TemplateInfo } from "./types";

export const TEMPLATE_FEATURES: Record<string, TemplateInfo["features"]> = {
  christmas: { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  cny:       { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  cnyhp:     { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  eid:       { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  eidhp:     { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  hanniel:   { discount: true, courtesy_adjustment: false, deposit: false, item_description: false, balance_due: false },
  "hanniel-dp": { discount: true, courtesy_adjustment: true, deposit: true, item_description: true, balance_due: false },
  "hanniel-fi": { discount: true, courtesy_adjustment: true, deposit: true, item_description: true, balance_due: true },
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

export async function getAllTemplates(db: D1Database): Promise<TemplateInfo[]> {
  const rows = await db
    .prepare("SELECT template, COUNT(*) as cnt FROM products WHERE active = 1 GROUP BY template")
    .all<{ template: string; cnt: number }>();

  const counts: Record<string, number> = {};
  for (const row of rows.results) {
    counts[row.template] = row.cnt;
  }

  return Object.keys(TEMPLATE_FEATURES).map((id) => ({
    id,
    label: TEMPLATE_LABELS[id] ?? id,
    features: TEMPLATE_FEATURES[id],
    product_count: counts[id] ?? 0,
  }));
}

export async function getProductsByTemplate(db: D1Database, template: string): Promise<Record<string, Product>> {
  const rows = await db
    .prepare("SELECT id, name, price, template FROM products WHERE template = ?1 AND active = 1")
    .bind(template)
    .all<{ id: string; name: string; price: number; template: string }>();

  return Object.fromEntries(
    rows.results.map((r) => [r.id, { name: r.name, price: r.price, template: r.template }])
  );
}

export async function getAllProducts(db: D1Database, includeInactive = false): Promise<Record<string, Product>> {
  const sql = includeInactive
    ? "SELECT id, name, price, template FROM products"
    : "SELECT id, name, price, template FROM products WHERE active = 1";
  const rows = await db.prepare(sql).all<{ id: string; name: string; price: number; template: string }>();

  return Object.fromEntries(
    rows.results.map((r) => [r.id, { name: r.name, price: r.price, template: r.template }])
  );
}

export async function getProductById(db: D1Database, id: string): Promise<Product | undefined> {
  const row = await db
    .prepare("SELECT name, price, template FROM products WHERE id = ?1 AND active = 1")
    .bind(id)
    .first<{ name: string; price: number; template: string }>();

  return row ?? undefined;
}

export function isValidTemplate(template: string): boolean {
  return template in TEMPLATE_FEATURES;
}
