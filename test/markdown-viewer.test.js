import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, resolve, sep } from "node:path";
import { after, before, test } from "node:test";
import puppeteer from "puppeteer-core";

const outputDirectory = resolve("output");
const markdown = await readFile(new URL("./fixtures/markdown.md", import.meta.url), "utf8");
let server;
let browser;
let origin;

before(async () => {
  await readFile(`${outputDirectory}/markdown/index.html`);
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = resolve(outputDirectory, `.${pathname}${pathname.endsWith("/") ? "index.html" : ""}`);
    if (!file.startsWith(outputDirectory + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const content = await readFile(file);
      const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
      response.writeHead(200, { "Content-Type": contentTypes[extname(file)] || "application/octet-stream" });
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/chromium",
    headless: true,
    args: process.getuid?.() === 0 ? ["--no-sandbox"] : [],
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise((done) => server.close(done));
});

async function openViewer(t, route = "/markdown/") {
  const page = await browser.newPage();
  t.after(() => page.close());
  const response = await page.goto(origin + route);
  assert.equal(response.status(), 200);
  assert.equal(new URL(page.url()).pathname, route);
  await page.waitForSelector("#file-input:not(:disabled)");
  return page;
}

async function dropFiles(page, files) {
  await page.evaluate((files) => {
    const transfer = new DataTransfer();
    for (const { name, content } of files) {
      transfer.items.add(new File([content], name, { type: "" }));
    }
    document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, files);
}

test("renders dropped CommonMark and GFM on both routes", async (t) => {
  for (const route of ["/markdown/", "/md/"]) {
    const page = await openViewer(t, route);
    await dropFiles(page, [{ name: "readme.MD", content: markdown }]);
    await page.waitForSelector("#document:not([hidden])");
    assert.equal(await (await page.$("#drop-zone")).isVisible(), false);
    assert.equal(await (await page.$("#viewer-intro")).isVisible(), false);
    assert.equal(await (await page.$("#clear-files")).isVisible(), true);
    assert.ok(await page.$eval("#markdown-preview", (element) => element.getBoundingClientRect().top < 100));

    const rendered = await page.$eval("#markdown-preview", (preview) => ({
      heading: preview.querySelector("h1 strong")?.textContent,
      emphasis: preview.querySelector("em strong")?.textContent,
      quote: preview.querySelector("blockquote strong")?.textContent,
      code: preview.querySelector("pre code.language-ruby")?.textContent,
      table: preview.querySelector("tbody td")?.textContent,
      aligned: preview.querySelector("th[align=right]")?.textContent,
      tasks: Array.from(preview.querySelectorAll("input[type=checkbox]"), (input) => [input.checked, input.disabled]),
      strike: preview.querySelector("del")?.textContent,
      autolink: preview.querySelector('a[href="https://example.com"]')?.textContent,
      reference: preview.querySelector('a[href="https://example.com/guide"]')?.textContent,
      footnote: preview.querySelector("[data-footnotes] li p")?.textContent,
    }));

    assert.deepEqual(rendered, {
      heading: "local",
      emphasis: "nested emphasis",
      quote: "formatting",
      code: 'puts "<local>"\n',
      table: "Tables",
      aligned: "Supported",
      tasks: [[true, true], [false, true]],
      strike: "Obsolete",
      autolink: "https://example.com",
      reference: "reference links",
      footnote: "Kept in this document. ↩",
    });

    await page.click("[data-footnote-ref]");
    assert.match(new URL(page.url()).hash, /^#user-content-fn-/);
    await page.click("[data-footnote-backref]");
    assert.match(new URL(page.url()).hash, /^#user-content-fnref-/);

    await dropFiles(page, [{ name: "replacement.md", content: "# Replacement\n" }]);
    await page.waitForSelector("#document:not([hidden])");
    assert.equal(await page.$eval("#markdown-preview h1", (element) => element.textContent), "Replacement");
    assert.equal(await page.evaluate(() => scrollY), 0);
  }
});

test("opens selected files, switches documents, and clears them", async (t) => {
  const directory = await mkdtemp(`${tmpdir()}/markdown-viewer-`);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const secondFile = `${directory}/second.markdown`;
  await writeFile(secondFile, "# Second document\n");

  const page = await openViewer(t);
  await page.setViewport({ width: 390, height: 844 });
  const [chooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click(".file-picker"),
  ]);
  await chooser.accept([resolve("test/fixtures/markdown.md"), secondFile]);
  await page.waitForSelector("#document:not([hidden])");
  assert.equal(await page.$eval("#document-name", (element) => element.textContent), "markdown.md");

  await page.select("#document-select", "1");
  await page.waitForFunction(() => document.querySelector("#document-name").textContent === "second.markdown");
  assert.equal(await page.$eval("#markdown-preview h1", (element) => element.textContent), "Second document");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  await page.click("#clear-files");
  assert.equal(await (await page.$("#drop-zone")).isVisible(), true);
  assert.equal(await (await page.$("#viewer-intro")).isVisible(), true);
  assert.equal(await (await page.$("#clear-files")).isVisible(), false);
  assert.equal(await page.$eval("#document", (element) => element.hidden), true);
  assert.equal(await page.$eval("#markdown-preview", (element) => element.textContent), "");
  assert.equal(await page.$eval("#document-select", (element) => element.options.length), 0);

  const input = await page.$("#file-input");
  await input.uploadFile(secondFile);
  await page.waitForSelector("#document:not([hidden])");
  assert.equal(await page.$eval("#markdown-preview h1", (element) => element.textContent), "Second document");
});

test("keeps document content inert and does not request embedded images", async (t) => {
  const page = await openViewer(t);
  const requests = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));

  await dropFiles(page, [{
    name: "untrusted.md",
    content: [
      "# Untrusted document",
      '<script>window.markdownExecuted = true</script>',
      '<img src="https://example.com/raw.png" onerror="window.markdownExecuted = true">',
      "![Remote image](https://example.com/tracker.png)",
      "![Local image](./private.png)",
      "[Script link](javascript:alert%281%29)",
      "[Local document](./another.md)",
      "[External link](https://example.com)",
    ].join("\n\n"),
  }]);
  await page.waitForSelector("#document:not([hidden])");
  await page.waitForNetworkIdle({ idleTime: 100 });

  const content = await page.$eval("#markdown-preview", (preview) => ({
    executableElements: preview.querySelectorAll("script, img, iframe").length,
    rawHtml: preview.textContent.includes("<script>"),
    placeholders: Array.from(preview.querySelectorAll(".image-placeholder"), (element) => element.textContent),
    links: Array.from(preview.querySelectorAll("a"), (element) => ({
      href: element.getAttribute("href"),
      target: element.target,
      rel: element.rel,
    })),
    executed: window.markdownExecuted === true,
  }));

  assert.equal(content.executableElements, 0);
  assert.equal(content.rawHtml, true);
  assert.equal(content.executed, false);
  assert.deepEqual(content.placeholders, ["[Image: Remote image]", "[Image: Local image]"]);
  assert.deepEqual(content.links, [
    { href: null, target: "", rel: "" },
    { href: null, target: "", rel: "" },
    { href: "https://example.com", target: "_blank", rel: "noopener noreferrer" },
  ]);
  assert.equal(requests.some(({ url, method }) => !url.startsWith(origin + "/") || method !== "GET"), false);
  assert.equal(requests.some(({ url }) => /tracker\.png|private\.png|raw\.png/.test(url)), false);
});

test("handles unsupported, oversized, and empty files without losing the viewer", async (t) => {
  const page = await openViewer(t);
  await dropFiles(page, [{ name: "valid.md", content: "# A valid document\n" }]);
  await page.waitForSelector("#document:not([hidden])");

  await dropFiles(page, [{ name: "photo.png", content: "Not Markdown" }]);
  assert.match(await page.$eval("#viewer-status", (element) => element.textContent), /Choose Markdown files/);
  assert.equal(await page.$eval("#markdown-preview h1", (element) => element.textContent), "A valid document");

  await dropFiles(page, [{ name: "large.md", content: "x".repeat(1024 * 1024 + 1) }]);
  assert.match(await page.$eval("#viewer-status", (element) => element.textContent), /1 MiB or smaller/);

  await dropFiles(page, [{ name: "empty.md", content: "\n" }]);
  await page.waitForFunction(() => document.querySelector("#viewer-status").textContent === "empty.md is empty.");
  assert.equal(await page.$eval("#document", (element) => element.hidden), true);

  await dropFiles(page, [{ name: "recovered.md", content: "# Recovered\n" }]);
  await page.waitForSelector("#document:not([hidden])");
  assert.equal(await page.$eval("#markdown-preview h1", (element) => element.textContent), "Recovered");
});
