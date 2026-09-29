import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 900, height: 300 }, deviceScaleFactor: 1 });
await page.setContent(`
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; background: transparent; }
    body { display: flex; gap: 44px; padding: 22px; }
    .cell { display: grid; place-items: center; width: 256px; height: 256px; }
    .spin {
      width: 220px; height: 220px; border: 9px solid #9f701c; border-radius: 50%;
      color: #fff8e8;
      background: radial-gradient(circle at 50% 24%, #ff5860 0 12%, #c41224 42%, #65040e 74%, #250104 100%);
      box-shadow: inset 0 8px rgba(255,255,255,.38), inset 0 -18px rgba(20,0,0,.75), inset 0 0 24px rgba(255,55,45,.52), inset 0 0 0 6px rgba(30,0,0,.52), 0 12px 18px rgba(0,0,0,.7);
      font: 900 46px/1 Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase;
    }
    .down { width: 198px; height: 198px; margin-top: 18px; filter: brightness(.72); box-shadow: inset 0 3px rgba(255,255,255,.18), inset 0 -10px rgba(20,0,0,.8), inset 0 0 15px rgba(255,55,45,.25), inset 0 0 0 7px rgba(30,0,0,.62), 0 5px 9px rgba(0,0,0,.8); font-size: 41px; }
    .disabled { filter: grayscale(.86) brightness(.58); color: #d0c5bc; box-shadow: inset 0 6px rgba(255,255,255,.13), inset 0 -18px rgba(20,0,0,.78), inset 0 0 0 6px rgba(30,0,0,.62), 0 9px 14px rgba(0,0,0,.7); }
  </style>
  <div class="cell" id="up"><button class="spin">Spin</button></div>
  <div class="cell" id="down"><button class="spin down">Spin</button></div>
  <div class="cell" id="disabled"><button class="spin disabled" disabled>Spin</button></div>
`);
for (const state of ["up", "down", "disabled"]) {
  await page.locator(`#${state}`).screenshot({ path: `/private/tmp/gate-c-spin-${state}.png`, omitBackground: true });
}
await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(`
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 512px; height: 512px; background: transparent; }
    body { display: grid; place-items: center; }
    .rim {
      width: 470px; height: 470px; border-radius: 50%; padding: 25px;
      background: conic-gradient(from 20deg, #704007, #f2be45 8%, #fff3aa 15%, #b66d12 25%, #ffe98d 37%, #8b4d09 49%, #ffd765 60%, #fff5b4 71%, #9b570b 82%, #efb83d 92%, #704007);
      mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
      filter: drop-shadow(0 8px 8px rgba(0,0,0,.52));
    }
    .rim:after { content: ""; display: block; width: 100%; height: 100%; border-radius: 50%; border: 4px solid rgba(255,248,186,.8); box-shadow: inset 0 0 0 5px rgba(83,37,3,.7), 0 0 0 5px rgba(83,37,3,.55); }
  </style>
  <div class="rim" id="rim"></div>
`);
await page.locator("body").screenshot({ path: "/private/tmp/gate-c-medallion-rim.png", omitBackground: true });
await browser.close();
