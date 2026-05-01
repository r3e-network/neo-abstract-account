#!/usr/bin/env node

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(MODULE_DIR, "..");
const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.AA_FRONTEND_E2E_PORT || 4173);
const VITE_BIN = path.resolve(FRONTEND_DIR, "node_modules", "vite", "bin", "vite.js");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAvailablePort(startPort, attempts = 50) {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, HOST);
    });
    if (available) return port;
  }
  throw new Error(
    `No available preview port found from ${startPort} to ${startPort + attempts - 1}`
  );
}

async function waitForHttpReady(url, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2_000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  const exited = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (!exited) {
    child.kill("SIGKILL");
  }
}

async function startPreviewServer(port) {
  const baseUrl = `http://${HOST}:${port}`;
  const child = spawn(
    process.execPath,
    [VITE_BIN, "preview", "--host", HOST, "--port", String(port), "--strictPort"],
    {
      cwd: FRONTEND_DIR,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  try {
    await waitForHttpReady(baseUrl);
  } catch (error) {
    await stopProcess(child);
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${output}`.trim());
  }

  return { child, baseUrl, output: () => output };
}

async function waitForVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await locator.isVisible(), true, `${label} should be visible`);
}

test("browser smoke covers home, identity, app workspace, market, and docs", async (t) => {
  const server = await startPreviewServer(await findAvailablePort(DEFAULT_PORT));
  t.after(async () => {
    await stopProcess(server.child);
  });

  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const baseUrl = server.baseUrl;

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await waitForVisible(page.getByRole("heading", { name: /Smart Wallets That Never Lock You Out/i }), "home hero");
  await waitForVisible(page.getByRole("link", { name: /Open Console/i }).first(), "open console link");
  await assert.doesNotReject(() => page.title(), "home title should be readable");

  await page.goto(`${baseUrl}/app`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page.getByRole("heading", { name: /Abstract Account Workspace/i }), "workspace heading");
  await waitForVisible(
    page.locator("#main-content").getByRole("button", { name: /Connect Wallet/i }),
    "connect wallet button"
  );

  await page.goto(`${baseUrl}/identity`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page.getByRole("heading", { name: /Web3Auth \/ NeoDID Workspace/i }), "identity heading");
  await waitForVisible(page.getByText(/Identity Control Plane/i).first(), "identity eyebrow");

  await page.goto(`${baseUrl}/market`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page.getByText(/Trustless escrow for AA address transfers/i).first(), "market subtitle");
  await waitForVisible(page.getByText(/Create Escrow Listing/i).first(), "market listing form");

  await page.goto(`${baseUrl}/docs`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page.getByText(/^Documentation$/).first(), "docs heading");
  await waitForVisible(page.getByLabel(/Search documentation/i), "docs search");
});
