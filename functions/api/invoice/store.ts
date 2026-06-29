import { calculateInvoice } from "../../_shared/calculator";
import { createInvoice } from "../../_shared/db";
import type { InvoiceInput } from "../../_shared/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: InvoiceInput;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Calculate invoice
  const calcResult = await calculateInvoice(env, body);
  if (!calcResult.ok) {
    return new Response(JSON.stringify(calcResult.error), {
      status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Store in database
  try {
    const stored = await createInvoice(env.DB, {
      result: calcResult.result,
      customer_id: body.customer_id,
      customer_phone: body.customer_phone,
      delivery_address_id: body.delivery_address_id,
      delivery_address: body.delivery_address,
      notes: body.notes,
      created_by: body.created_by,
    });

    return new Response(JSON.stringify(stored), {
      status: 201,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, code: "STORE_ERROR" }), {
      status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
};
