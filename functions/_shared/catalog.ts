import catalogData from "../../shared/catalog.json";
import type { Product, TemplateInfo } from "./types";

const PRODUCTS = catalogData.products as Record<string, Product>;

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

export function getAllTemplates(): TemplateInfo[] {
  const counts: Record<string, number> = {};
  for (const product of Object.values(PRODUCTS)) {
    counts[product.template] = (counts[product.template] || 0) + 1;
  }
  return Object.keys(TEMPLATE_FEATURES).map((id) => ({
    id,
    label: TEMPLATE_LABELS[id] ?? id,
    features: TEMPLATE_FEATURES[id],
    product_count: counts[id] ?? 0,
  }));
}

export function getProductsByTemplate(template: string): Record<string, Product> {
  return Object.fromEntries(
    Object.entries(PRODUCTS).filter(([, p]) => p.template === template)
  );
}

export function getAllProducts(): Record<string, Product> {
  return PRODUCTS;
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS[id];
}

export function isValidTemplate(template: string): boolean {
  return template in TEMPLATE_FEATURES;
}
