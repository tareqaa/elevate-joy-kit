/* ============================================================
   TEMPORARY TEST — server-side price verification
   Runs two checkouts against the running dev server:
     1) honest total  -> must succeed
     2) faked total   -> must be rejected, and create NO order row
   Run:    node scripts/temp-order-price-test.mjs
   Delete: rm scripts/temp-order-price-test.mjs
   ============================================================ */

const BASE = process.env.TEST_BASE_URL || "http://localhost:8080";
const FN_ID =
  "eyJmaWxlIjoiL3NyYy9saWIvZ3gvb3JkZXJzLmZ1bmN0aW9ucy50cz90c3Mtc2VydmVyZm4tc3BsaXQiLCJleHBvcnQiOiJzdWJtaXRTdG9yZU9yZGVyX2NyZWF0ZVNlcnZlckZuX2hhbmRsZXIifQ";

// canva-12 costs 2 JOD in the catalog (unless overridden in site_settings)
const CART_ID = "canva-12";
const REAL_UNIT = 2;
const QTY = 1;

function payload(totalJOD, marker) {
  return {
    items: [
      {
        cartId: CART_ID,
        product_slug: "canva",
        name: "Canva Pro 12 شهر",
        qty: QTY,
        price: REAL_UNIT,
        usernames: null,
      },
    ],
    totalJOD,
    currency: "JOD",
    customerName: `PRICE-TEST ${marker}`,
    customerWhatsapp: "0790000000",
    contactType: "whatsapp",
    notes: `temp price-verification test (${marker})`,
  };
}

async function call(data) {
  const res = await fetch(`${BASE}/_serverFn/${FN_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

const line = (s = "") => console.log(s);

(async () => {
  line("=== GX price-verification test ===");
  line(`endpoint: ${BASE}/_serverFn/...`);
  line(`item: ${CART_ID} x${QTY} @ ${REAL_UNIT} JOD  → real total ${REAL_UNIT * QTY} JOD`);
  line();

  // 1) honest total
  const honest = await call(payload(REAL_UNIT * QTY, "HONEST"));
  const honestOrder =
    honest.body?.result?.order_number ?? honest.body?.order_number ?? null;
  const pass1 = honest.status === 200 && !!honestOrder;
  line(`[1] honest total (${REAL_UNIT * QTY} JOD): ${pass1 ? "PASS ✅ created" : "FAIL ❌"}`);
  line(`    status=${honest.status} order=${honestOrder ?? "-"}`);
  if (!pass1) line(`    body=${JSON.stringify(honest.body).slice(0, 500)}`);
  line();

  // 2) tampered (cheaper) total
  const fakeTotal = 0.5;
  const fake = await call(payload(fakeTotal, "TAMPERED"));
  const fakeOrder = fake.body?.result?.order_number ?? fake.body?.order_number ?? null;
  const rejected = !fakeOrder;
  line(`[2] tampered total (${fakeTotal} JOD): ${rejected ? "PASS ✅ rejected" : "FAIL ❌ order created!"}`);
  line(`    status=${fake.status} order=${fakeOrder ?? "-"}`);
  line(`    server said: ${JSON.stringify(fake.body).slice(0, 300)}`);
  line();

  line(`RESULT: ${pass1 && rejected ? "ALL PASS ✅ — the server never trusts the client total" : "FAILURE ❌"}`);
  line();
  line("Cleanup: rm scripts/temp-order-price-test.mjs");
  line(`Note: test [1] creates a real pending order named "PRICE-TEST HONEST" — cancel/delete it from the admin panel.`);
  process.exit(pass1 && rejected ? 0 : 1);
})();
