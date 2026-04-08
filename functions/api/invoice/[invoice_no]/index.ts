import { getInvoice } from "../../../_shared/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ params, env, request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const invoiceNo = decodeURIComponent(params.invoice_no as string);
  const invoice = await getInvoice(env.DB, invoiceNo);

  if (!invoice) {
    return new Response(JSON.stringify({ error: "Invoice not found", code: "NOT_FOUND" }), {
      status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(invoice), {
    status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
