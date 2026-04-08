import { getAllProducts, getProductsByTemplate, isValidTemplate } from "../_shared/catalog";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const template = url.searchParams.get("template");

  if (template !== null) {
    if (!isValidTemplate(template)) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}`, code: "INVALID_TEMPLATE", field: "template" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    const products = getProductsByTemplate(template);
    return new Response(JSON.stringify({ template, products }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  }

  const products = getAllProducts();
  return new Response(JSON.stringify({ products }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
};
