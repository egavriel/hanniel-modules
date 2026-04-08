import { findOrCreateCustomer, searchCustomers } from "../_shared/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // GET /api/customers?q=sarah
  if (request.method === "GET") {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    if (!q) {
      return new Response(JSON.stringify({ error: "Query parameter 'q' is required" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const customers = await searchCustomers(env.DB, q);
    return new Response(JSON.stringify({ customers, count: customers.length }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // POST /api/customers — create or upsert
  if (request.method === "POST") {
    let body: { name: string; phone?: string; instagram?: string; notes?: string; preferences?: Record<string, unknown>; tags?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!body.name) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const customer = await findOrCreateCustomer(env.DB, body);
    return new Response(JSON.stringify(customer), {
      status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
