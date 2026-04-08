import { listInvoices } from "../_shared/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const invoices = await listInvoices(env.DB, {
    customer_id: url.searchParams.get("customer_id") ? Number(url.searchParams.get("customer_id")) : undefined,
    customer_name: url.searchParams.get("customer_name") ?? undefined,
    template: url.searchParams.get("template") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    date_from: url.searchParams.get("date_from") ?? undefined,
    date_to: url.searchParams.get("date_to") ?? undefined,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined,
  });

  return new Response(JSON.stringify({ invoices, count: invoices.length }), {
    status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
