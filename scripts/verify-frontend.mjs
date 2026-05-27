import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3001";
const SCREENSHOTS_DIR = join(import.meta.dirname, "..", "screenshots");

const routes = [
  { path: "/", name: "01-home" },
  { path: "/markets", name: "02-markets-list" },
  { path: "/markets/create", name: "03-markets-create" },
  { path: "/markets/0", name: "04-markets-detail" },
  { path: "/insurance", name: "05-insurance-list" },
  { path: "/insurance/create", name: "06-insurance-create" },
  { path: "/insurance/0", name: "07-insurance-detail" },
  { path: "/disputes", name: "08-disputes-list" },
  { path: "/disputes/create", name: "09-disputes-create" },
  { path: "/disputes/0", name: "10-disputes-detail" },
  { path: "/status", name: "11-status" },
];

async function main() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  const results = [];

  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    try {
      const response = await page.goto(`${BASE}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait a bit for any async rendering
      await page.waitForTimeout(2000);

      const screenshotPath = join(SCREENSHOTS_DIR, `${route.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const status = response?.status() ?? "no response";
      const title = await page.title();

      results.push({
        route: route.path,
        name: route.name,
        status,
        title,
        errors: errors.filter(
          (e) => !e.includes("ExperimentalWarning") && !e.includes("hydrat")
        ),
        screenshot: screenshotPath,
      });

      console.log(`  ${route.path} -> ${status} | ${errors.length} errors`);
    } catch (err) {
      console.log(`  ${route.path} -> FAILED: ${err.message}`);
      results.push({
        route: route.path,
        name: route.name,
        status: "FAILED",
        errors: [err.message],
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Summary
  console.log("\n=== RESULTS ===\n");
  let hasErrors = false;
  for (const r of results) {
    const errStr = r.errors?.length ? ` [${r.errors.length} errors]` : "";
    console.log(`${r.name}: ${r.status}${errStr}`);
    if (r.errors?.length) {
      hasErrors = true;
      for (const e of r.errors) {
        console.log(`  ERROR: ${e}`);
      }
    }
  }

  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  if (hasErrors) {
    console.log("\nSome pages had errors. Check the details above.");
  } else {
    console.log("\nAll pages loaded without JS errors.");
  }
}

main().catch(console.error);
