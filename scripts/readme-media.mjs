// Renders the README's images from the 3D guide into assets/readme/:
//   build.webp    the bench going up step by step, then a slow look around the finished bench
//   design.jpg    the finished bench in 3D, framed like the photo (assets/workbench.png)
//   guide.jpg     the guide itself, mid-build, with its callouts and tool chips
//   cuts.jpg      two of the to-scale cut plans
//   social.jpg    the GitHub social preview (upload it in Settings > General > Social preview)
//
//   npm install && npm run readme-media
//
// Serves the repo on a free port and drives index.html through its own globals (setStep, theta,
// phi, dist, TARGET), so the images always show the current guide. Frames are rendered one at a
// time rather than recorded, so the animation is identical run to run. The animation is encoded
// by scripts/animate.py, which needs Python 3 with Pillow.
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "assets/readme");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

const server = http.createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root)) return res.writeHead(403).end();
  try {
    const file = (await fs.stat(p)).isDirectory() ? path.join(p, "index.html") : p;
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }).end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// Prefer the installed Chrome (no download); fall back to Playwright's own Chromium.
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
await fs.mkdir(out, { recursive: true });

async function open(width, height, scale = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto(base);
  await page.waitForFunction(() => typeof setStep === "function");
  return page;
}
// Set the step and camera, then wait two frames so the render loop has drawn them.
async function pose(page, { step, theta, phi, dist, target, callouts = true }) {
  await page.evaluate(({ step, theta: t, phi: p, dist: d, target, callouts }) => {
    if (step) setStep(step);
    if (t !== undefined) theta = t;
    if (p !== undefined) phi = p;
    if (d !== undefined) dist = d;
    if (target) TARGET.set(...target);
    if (!callouts) ANNOTATIONS.forEach((a) => { a.group.visible = false; });
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { step, theta, phi, dist, target, callouts });
}
const hideUI = (page) => page.addStyleTag({ content: "#title, #hint, #tabs, #legend, #hud { display: none !important; }" });
const save = async (page, name, opts = {}) => {
  await page.screenshot({ path: path.join(out, name), type: "jpeg", quality: 85, ...opts });
  console.log(`  assets/readme/${name}`);
};
const HERO = { theta: -0.55, phi: 1.22, dist: 122, target: [30, 25, 10] };
console.log("Rendering README images…");

// 1. The guide as a builder sees it: step 19, the top joists, with callouts and tool chips
let page = await open(1280, 800, 1.5);
await pose(page, { step: 19 });
await save(page, "guide.jpg");

// 2. Two cut plans, to scale: the pocket-hole map and the plywood sheet
await page.click("#tabCuts");
await page.evaluate(() => {
  const inner = document.getElementById("cutsInner");
  const keep = [...inner.querySelectorAll("h2")].filter((h) => /pocket|plywood/i.test(h.textContent));
  const nodes = keep.flatMap((h) => {
    const list = [h];
    for (let n = h.nextElementSibling; n && n.tagName !== "H2"; n = n.nextElementSibling) list.push(n);
    return list;
  });
  inner.replaceChildren(...nodes);
  document.querySelector("#cuts .rules")?.remove();
  Object.assign(document.getElementById("cuts").style, { position: "static", padding: "28px 24px 12px", overflow: "visible" });
  document.documentElement.style.overflow = document.body.style.overflow = "visible";
  document.getElementById("scene").style.display = "none";
  document.getElementById("tabs").style.display = "none";
  document.getElementById("title").style.display = "none";
});
await save(page, "cuts.jpg", { fullPage: true });
await page.close();

// 3. The finished bench in 3D, framed like the photo of the real one
page = await open(1024, 768, 1.5);
await hideUI(page);
await pose(page, { step: 1, theta: 0.32, phi: 1.3, dist: 132, target: [30, 36, 10] });
await save(page, "design.jpg");
await page.close();

// 4. Social preview: the finished bench on the right, the name on the left
page = await open(1280, 640);
await hideUI(page);
await page.addStyleTag({ content: `
  #card { position: absolute; inset: 0; z-index: 30; padding: 0 0 0 76px; display: flex; flex-direction: column; justify-content: center;
    background: linear-gradient(90deg, rgba(29,33,37,.97) 0%, rgba(29,33,37,.9) 36%, rgba(29,33,37,0) 58%); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  #card .kicker { color: #e8762d; font-size: 18px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  #card h1 { color: #f3efe7; font-size: 62px; line-height: 1.04; margin: 18px 0 22px; font-weight: 800; letter-spacing: -.01em; }
  #card p { color: #9aa3ab; font-size: 22px; line-height: 1.5; }
  #card p b { color: #e9e4da; font-weight: 600; }` });
await page.evaluate(() => document.body.insertAdjacentHTML("beforeend",
  `<div id="card"><div class="kicker">Interactive 3D build guide</div><h1>Stud-Anchored<br>Workbench</h1>
   <p><b>60" × 24" × 36⅛"</b> · glue-free · ~$216<br>26 steps, designed with Claude Code</p></div>`));
await pose(page, { step: 1, theta: -0.62, phi: 1.2, dist: 118, target: [8, 26, 10] });
await save(page, "social.jpg");
await page.close();

// 5. The build: every assembly step in order (new parts in orange), then a slow look around.
const FPS = 20;
page = await open(1120, 630);
await hideUI(page);
await page.addStyleTag({ content: `
  #cap { position: absolute; left: 28px; bottom: 24px; z-index: 30; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: rgba(20,23,26,.82); border: 1px solid #3a4148; border-radius: 10px; padding: 10px 14px; }
  #cap .n { color: #e8762d; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  #cap .t { color: #e9e4da; font-size: 19px; font-weight: 600; margin-top: 3px; }` });
await page.evaluate(() => document.body.insertAdjacentHTML("beforeend", `<div id="cap"><div class="n"></div><div class="t"></div></div>`));
const caption = (n, t) => page.evaluate(([n, t]) => {
  document.querySelector("#cap .n").textContent = n;
  document.querySelector("#cap .t").textContent = t;
}, [n, t]);
const frameDir = await fs.mkdtemp(path.join(os.tmpdir(), "workbench-build-"));
let frame = 0;
async function frames(seconds) { // one render, held for `seconds`
  const shot = await page.screenshot({ type: "jpeg", quality: 95 });
  for (let i = 0; i < Math.max(1, Math.round(seconds * FPS)); i++) {
    await fs.writeFile(path.join(frameDir, `${String(frame++).padStart(4, "0")}.jpg`), shot);
  }
}
const [first, total, titles] = await page.evaluate(() => [7, N, STEPS.map((s) => s[0])]); // 1–6 are prep and marking lines
for (let s = first; s <= total; s++) {
  await pose(page, { step: s, ...HERO, callouts: false });
  await caption(`Step ${s} of ${total}`, titles[s - 1].replace(/^Optional: /, ""));
  await frames(s === total ? 1.4 : 0.75);
}
// the finished bench, turning to show its side and back again
await caption("Done", `60" × 24" × 36⅛" · no glue · bolted to the studs`);
await pose(page, { step: 1, ...HERO, callouts: false });
await frames(0.8);
const SWING = 3.6, AMP = 0.7;
for (let i = 1; i <= SWING * FPS; i++) {
  const t = i / (SWING * FPS);
  await pose(page, { theta: HERO.theta + AMP * Math.sin(Math.PI * t) ** 2 }); // out and back, easing at both ends
  await frames(1 / FPS);
}
await frames(0.6);
await page.close();
await fs.writeFile(path.join(frameDir, "times.json"), JSON.stringify(Array.from({ length: frame }, (_, i) => i / FPS)));
try {
  execFileSync("python3", [path.join(root, "scripts/animate.py"), frameDir, path.relative(process.cwd(), path.join(out, "build.webp")), "--fps", String(FPS)], { stdio: "inherit" });
} catch {
  console.warn("  build.webp not updated (scripts/animate.py needs Python 3 with Pillow)");
}
await fs.rm(frameDir, { recursive: true, force: true });

await browser.close();
server.close();
