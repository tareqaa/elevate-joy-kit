import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://pvwsktauvvxvmdpdzqrb.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d3NrdGF1dnZ4dm1kcGR6cXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjM1NjUsImV4cCI6MjEwMDkzOTU2NX0.iqwL3MJAcKJsmPceBm0ZyFEQa4m3wjcsisv31I9sgO4";

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "https://gxstore.me";
const today = new Date().toISOString().split("T")[0];

async function main() {
  console.log("Generating sitemap for GX Store...");

  // 1. Static high-priority pages
  const staticPages = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${BASE_URL}/products`, priority: "0.9", changefreq: "daily" },
    { loc: `${BASE_URL}/faq`, priority: "0.5", changefreq: "weekly" },
    { loc: `${BASE_URL}/policy`, priority: "0.4", changefreq: "monthly" },
    { loc: `${BASE_URL}/privacy-policy`, priority: "0.4", changefreq: "monthly" },
  ];

  // 2. Fetch active categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("slug, parent_id, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catError) {
    console.error("Error fetching categories:", catError);
  }

  const categoryPages = (categories || [])
    .filter((c) => c.slug && c.slug !== "products" && c.slug !== "all")
    .map((c) => ({
      loc: `${BASE_URL}/category/${c.slug}`,
      priority: c.parent_id ? "0.80" : "0.90",
      changefreq: "daily",
    }));

  // 3. Fetch active products
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("slug, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (prodError) {
    console.error("Error fetching products:", prodError);
  }

  const productPages = (products || [])
    .filter((p) => p.slug)
    .map((p) => ({
      loc: `${BASE_URL}/product/${p.slug}`,
      priority: "0.80",
      changefreq: "daily",
    }));

  const allUrls = [...staticPages, ...categoryPages, ...productPages];

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const item of allUrls) {
    xml += "  <url>\n";
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;
    xml += "  </url>\n";
  }

  xml += "</urlset>\n";

  const publicDir = path.resolve(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.resolve(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf-8");

  console.log(`Successfully generated sitemap with ${allUrls.length} URLs at ${sitemapPath}`);
}

main().catch((err) => {
  console.error("Failed to generate sitemap:", err);
  process.exit(1);
});
