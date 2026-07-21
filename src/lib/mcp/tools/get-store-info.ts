import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_store_info",
  title: "Get store info",
  description:
    "Return general information about GX Store: contact WhatsApp number, base currency, and store description.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            name: "GX Store",
            description:
              "متجر إلكتروني للاشتراكات الرقمية، بطاقات الهدايا، وشحن الألعاب. تفعيل فوري وأسعار منافسة.",
            base_currency: "JOD",
            supported_currencies: ["JOD", "SAR", "USD", "AED"],
            whatsapp: "+962776252313",
            website_home: "/app/index.html",
            categories_page: "/app/index.html#categories",
          },
          null,
          2,
        ),
      },
    ],
  }),
});
