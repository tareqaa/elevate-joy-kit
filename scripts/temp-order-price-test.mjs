/* ============================================================
   TEMPORARY TEST — server-side price verification (GX checkout)
   Calls the order-creation logic twice:
     1) honest total matching catalog prices -> must succeed
     2) faked (cheaper) total                -> must be rejected
                                                and write NO orders row
   Run:    node scripts/temp-order-price-test.mjs
   Delete: rm scripts/temp-order-price-test.mjs src/routes/api/public/temp-price-test.ts
   ============================================================ */

const BASE = process.env.TEST_BASE_URL || "http://localhost:8080";
const URL_ = `${BASE}/api/public/temp-price-test`;

const CART_ID = "canva-12"; // catalog price: 2 JOD
const REAL_UNIT = 2;
const QTY = 1;
const REAL_TOTAL = REAL_UNIT * QTY;
const FAKE_TOTAL = 0.5;
const STAMP = Date.now();

const marker = (kind) => `PRICE-TEST-${kind}-${STAMP}`;

const payload = (totalJOD, kind) => ({
  items: [{ cartId: CART_ID, product_slug: "canva", name: "Canva Pro", qty: QTY, price: REAL_UNIT }],
  totalJOD,
  currency: "JOD",
  customerName: marker(kind),
  customerWhatsapp: "0790000000",
  contactType: "whatsapp",
});

const post = (body) =>
  fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const countRows = (m) => fetch(`${URL_}?marker=${encodeURIComponent(m)}`).then((r) => r.json());

const log = (s = "") => console.log(s);

(async () => {
  log("=== GX server-side price verification test ===");
  log(`item ${CART_ID} x${QTY} @ ${REAL_UNIT} JOD  →  real total = ${REAL_TOTAL} JOD`);
  log();

  // --- 1) honest total ---
  const okRes = await post(payload(REAL_TOTAL, "HONEST"));
  const okRows = await countRows(marker("HONEST"));
  const pass1 = okRes.ok === true && !!okRes.order_number && okRows.count === 1;
  log(`[1] honest total ${REAL_TOTAL} JOD  → ${pass1 ? "PASS ✅ order created" : "FAIL ❌"}`);
  log(`    order_number=${okRes.order_number ?? "-"}  rows=${okRows.count}  error=${okRes.error ?? "-"}`);
  log();

  // --- 2) tampered total ---
  const badRes = await post(payload(FAKE_TOTAL, "TAMPERED"));
  const badRows = await countRows(marker("TAMPERED"));
  const pass2 = badRes.ok === false && !badRes.order_number && badRows.count === 0;
  log(`[2] faked total ${FAKE_TOTAL} JOD   → ${pass2 ? "PASS ✅ rejected, no row written" : "FAIL ❌"}`);
  log(`    rejected_with="${badRes.error ?? "-"}"  rows=${badRows.count}`);
  log();

  const allPass = pass1 && pass2;
  log(`RESULT: ${allPass ? "ALL PASS ✅ — the server never trusts the client total" : "FAILURE ❌"}`);
  log();
  log(`NOTE: test [1] creates one real pending order (${marker("HONEST")}) — cancel it from the admin panel.`);
  log("CLEANUP: rm scripts/temp-order-price-test.mjs src/routes/api/public/temp-price-test.ts");
  process.exit(allPass ? 0 : 1);
})();
