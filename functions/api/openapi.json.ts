const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Little Hanniel Invoice API",
    version: "1.0.0",
    description:
      "Agent-friendly REST API for querying the Little Hanniel product catalog and generating calculated invoices. Prices are in IDR (Indonesian Rupiah) as integers.",
  },
  paths: {
    "/api/templates": {
      get: {
        operationId: "listTemplates",
        summary: "List all invoice templates",
        description: "Returns all 8 seasonal templates with their features and product counts.",
        responses: {
          "200": {
            description: "List of templates",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    templates: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TemplateInfo" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/products": {
      get: {
        operationId: "listProducts",
        summary: "List products",
        description: "Returns all products, or products filtered by template. Use the returned product_id strings in the calculate endpoint.",
        parameters: [
          {
            name: "template",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["christmas", "cny", "cnyhp", "eid", "eidhp", "hanniel", "hanniel-dp", "hanniel-fi"],
            },
            description: "Filter products by template ID",
          },
        ],
        responses: {
          "200": {
            description: "Product catalog (keys are product_id strings)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    template: { type: "string" },
                    products: {
                      type: "object",
                      additionalProperties: { $ref: "#/components/schemas/Product" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/api/invoice/calculate": {
      post: {
        operationId: "calculateInvoice",
        summary: "Calculate invoice totals",
        description:
          "Submit an order and receive fully calculated totals. Grand total logic varies by template: standard (subtotal − discount + delivery), hanniel-dp (grand_total = deposit_paid), hanniel-fi (balance_due = total_order_value − deposit_paid, grand_total = balance_due + delivery).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InvoiceInput" },
              example: {
                template: "hanniel-fi",
                customer_name: "Budi Santoso",
                items: [
                  {
                    product_id: "Custom tin cookie hamper::hanniel-fi",
                    quantity: 2,
                    description: "Vanilla",
                  },
                ],
                delivery_fee: 25000,
                discount_rate: 0.1,
                courtesy_adjustment: 0,
                deposit_paid: 65000,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculated invoice",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InvoiceResult" },
              },
            },
          },
          "422": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/api/invoice/generate": {
      post: {
        operationId: "generateInvoiceImage",
        summary: "Generate invoice as JPEG image",
        description:
          "Submit an order and receive a rendered JPEG invoice image. Uses the same calculation logic as /api/invoice/calculate but returns a pixel-perfect invoice image rendered via headless Chrome. The response Content-Disposition header includes a suggested filename.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InvoiceInput" },
              example: {
                template: "eid",
                customer_name: "Ms. Ksenia",
                items: [
                  { product_id: "Noor Royale Set::eid", quantity: 1 },
                ],
                delivery_fee: 25000,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Rendered JPEG invoice image",
            content: {
              "image/jpeg": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "422": { $ref: "#/components/responses/ApiError" },
          "500": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "integer", description: "Price in IDR" },
          template: { type: "string" },
        },
        required: ["name", "price", "template"],
      },
      TemplateInfo: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          features: {
            type: "object",
            properties: {
              discount: { type: "boolean" },
              courtesy_adjustment: { type: "boolean" },
              deposit: { type: "boolean" },
              item_description: { type: "boolean" },
              balance_due: { type: "boolean" },
            },
          },
          product_count: { type: "integer" },
        },
        required: ["id", "label", "features", "product_count"],
      },
      InvoiceItem: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Exact product_id from /api/products" },
          quantity: { type: "integer", minimum: 1 },
          description: { type: "string", description: "Optional item description (hanniel-dp/fi only)" },
        },
        required: ["product_id", "quantity"],
      },
      InvoiceInput: {
        type: "object",
        properties: {
          template: {
            type: "string",
            enum: ["christmas", "cny", "cnyhp", "eid", "eidhp", "hanniel", "hanniel-dp", "hanniel-fi"],
          },
          customer_name: { type: "string" },
          items: { type: "array", items: { $ref: "#/components/schemas/InvoiceItem" }, minItems: 1 },
          delivery_fee: { type: "integer", default: 0 },
          discount_rate: { type: "number", minimum: 0, maximum: 1, default: 0 },
          courtesy_adjustment: { type: "integer", default: 0, description: "Flat deduction (hanniel-dp/fi only)" },
          deposit_paid: { type: "integer", default: 0, description: "Deposit amount (hanniel-dp/fi only)" },
        },
        required: ["template", "customer_name", "items"],
      },
      InvoiceResultItem: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          name: { type: "string" },
          quantity: { type: "integer" },
          unit_price: { type: "integer" },
          line_total: { type: "integer" },
          description: { type: "string" },
        },
        required: ["product_id", "name", "quantity", "unit_price", "line_total"],
      },
      InvoiceResult: {
        type: "object",
        properties: {
          template: { type: "string" },
          customer_name: { type: "string" },
          items: { type: "array", items: { $ref: "#/components/schemas/InvoiceResultItem" } },
          subtotal: { type: "integer" },
          discount_rate: { type: "number" },
          discount_amount: { type: "integer" },
          courtesy_adjustment: { type: "integer" },
          total_order_value: { type: "integer" },
          delivery_fee: { type: "integer" },
          deposit_paid: { type: "integer" },
          balance_due: { type: "integer" },
          grand_total: { type: "integer" },
          currency: { type: "string", enum: ["IDR"] },
          calculated_at: { type: "string", format: "date-time" },
        },
        required: [
          "template", "customer_name", "items", "subtotal", "discount_rate",
          "discount_amount", "courtesy_adjustment", "total_order_value",
          "delivery_fee", "deposit_paid", "balance_due", "grand_total",
          "currency", "calculated_at",
        ],
      },
      ApiError: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          field: { type: "string" },
        },
        required: ["error", "code"],
      },
    },
    responses: {
      ApiError: {
        description: "Error response",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
  },
};

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return new Response(JSON.stringify(SPEC, null, 2), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
