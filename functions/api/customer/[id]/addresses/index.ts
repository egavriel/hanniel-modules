import { addCustomerAddress } from "../../../../_shared/db";

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

  let body: { label: string; address: string; district?: string; city?: string; postal_code?: string; notes?: string; is_default?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.label || !body.address) {
    return new Response(JSON.stringify({ error: "label and address are required" }), {
      status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const addr = await addCustomerAddress(env.DB, id, body);
  return new Response(JSON.stringify(addr), {
    status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
