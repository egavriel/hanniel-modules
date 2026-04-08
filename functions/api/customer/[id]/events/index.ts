import { addCustomerEvent } from "../../../../_shared/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ params, env, request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const id = Number(params.id);
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid customer ID" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: { event_type: string; summary?: string; invoice_id?: number; created_by?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.event_type) {
    return new Response(JSON.stringify({ error: "event_type is required" }), {
      status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const event = await addCustomerEvent(env.DB, { customer_id: id, ...body });
  return new Response(JSON.stringify(event), {
    status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
