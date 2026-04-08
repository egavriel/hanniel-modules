import puppeteer from "@cloudflare/puppeteer";
import { calculateInvoice } from "../../_shared/calculator";
import { buildInvoiceHtml, getBackgroundInfo } from "../../_shared/html-builder";
import type { InvoiceInput } from "../../_shared/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  BROWSER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: InvoiceInput;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Calculate invoice
  const calcResult = calculateInvoice(body);
  if (!calcResult.ok) {
    return new Response(JSON.stringify(calcResult.error), {
      status: 422,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Load background image as base64
  const bgInfo = getBackgroundInfo(body.template);
  if (!bgInfo) {
    return new Response(JSON.stringify({ error: "Unknown template", code: "INVALID_TEMPLATE" }), {
      status: 422,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let bgBase64: string;
  try {
    // Fetch the background image from the static assets (same origin)
    const url = new URL(request.url);
    const bgUrl = `${url.origin}/${bgInfo.file}`;
    const bgResponse = await fetch(bgUrl);
    if (!bgResponse.ok) {
      throw new Error(`Failed to fetch background: ${bgResponse.status}`);
    }
    const bgBuffer = await bgResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(bgBuffer);
    bgBase64 = `data:${bgInfo.mime};base64,${base64}`;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to load background image: ${message}`, code: "BG_LOAD_ERROR" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Build self-contained HTML
  const html = buildInvoiceHtml(calcResult.result, bgBase64);

  // Render to JPEG using headless Chrome
  let jpegBuffer: Buffer | Uint8Array;
  try {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Set viewport to match invoice dimensions
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.5 });

    await page.setContent(html, { waitUntil: "networkidle0" });

    // Screenshot the invoice container
    jpegBuffer = (await page.screenshot({
      type: "jpeg",
      quality: 80,
      clip: { x: 0, y: 0, width: 794, height: 1123 },
    })) as Buffer;

    await browser.close();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Image rendering failed: ${message}`, code: "RENDER_ERROR" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Build filename
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const safeName = calcResult.result.customer_name.replace(/[^a-zA-Z0-9.\- ]/g, "");
  const filename = `Invoice_${safeName}_${timestamp}.jpg`;

  return new Response(jpegBuffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
