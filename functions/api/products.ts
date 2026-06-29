import { getAllProducts, getProductsByTemplate, isValidTemplate } from "../_shared/catalog";
import { createProduct, updateProduct, deactivateProduct, reactivateProduct } from "../_shared/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // GET — list products
  if (request.method === "GET") {
    const template = url.searchParams.get("template");

    try {
      if (template !== null) {
        if (!(await isValidTemplate(env, template))) {
          return new Response(
            JSON.stringify({ error: `Unknown template: ${template}`, code: "INVALID_TEMPLATE", field: "template" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
        const products = await getProductsByTemplate(env, template);
        return new Response(JSON.stringify({ template, products }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
        });
      }

      const products = await getAllProducts(env);
      return new Response(JSON.stringify({ products }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const stack = e instanceof Error ? e.stack : undefined;
      console.error(`[products.ts] GET failed: ${message}`, stack);
      return new Response(JSON.stringify({ error: message, code: "PRODUCTS_LOOKUP_ERROR" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // POST — create product
  if (request.method === "POST") {
    let body: { name: string; price: number; template: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!body.name || !body.price || !body.template) {
      return new Response(JSON.stringify({ error: "name, price, and template are required", code: "MISSING_FIELDS" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!(await isValidTemplate(env, body.template))) {
      return new Response(JSON.stringify({ error: `Unknown template: ${body.template}`, code: "INVALID_TEMPLATE" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    try {
      const product = await createProduct(env.DB, body);
      return new Response(JSON.stringify(product), {
        status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return new Response(JSON.stringify({ error: message, code: "CREATE_ERROR" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // PUT — update product
  if (request.method === "PUT") {
    let body: { id: string; name?: string; price?: number };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!body.id) {
      return new Response(JSON.stringify({ error: "id is required", code: "MISSING_ID" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    try {
      const product = await updateProduct(env.DB, body.id, { name: body.name, price: body.price });
      return new Response(JSON.stringify(product), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return new Response(JSON.stringify({ error: message, code: "UPDATE_ERROR" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // DELETE — soft-delete product
  if (request.method === "DELETE") {
    let body: { id: string; reactivate?: boolean };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!body.id) {
      return new Response(JSON.stringify({ error: "id is required", code: "MISSING_ID" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    try {
      if (body.reactivate) {
        const product = await reactivateProduct(env.DB, body.id);
        return new Response(JSON.stringify(product), {
          status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const product = await deactivateProduct(env.DB, body.id);
      return new Response(JSON.stringify(product), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return new Response(JSON.stringify({ error: message, code: "DELETE_ERROR" }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }), {
    status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
