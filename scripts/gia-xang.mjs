// Lấy bảng giá bán lẻ Petrolimex (trang chủ render bằng JS) → gia-xang.json
import { chromium } from "playwright";
import fs from "node:fs";
const b = await chromium.launch();
const pg = await b.newPage({ locale: "vi-VN" });
await pg.goto("https://www.petrolimex.com.vn/", { waitUntil: "domcontentloaded", timeout: 90000 });
await pg.waitForFunction(() => [...document.querySelectorAll("tr")].some(t => /E10 RON 95-III/i.test(t.textContent) && /\d{2}\.\d{3}/.test(t.textContent)), null, { timeout: 90000 });
const data = await pg.evaluate(() => {
  const items = {};
  for (const tr of document.querySelectorAll("tr")) {
    const td = [...tr.children].map(x => x.textContent.trim());
    if (td.length >= 3 && /\d{2}\.\d{3}/.test(td[1])) {
      const n = v => +v.replace(/\./g, "").replace(/[^\d]/g, "");
      if (!items[td[0]]) items[td[0]] = [n(td[1]), n(td[2])];
    }
  }
  const a = [...document.querySelectorAll("a")].map(x => x.href).find(h => /dieu-chinh-gia-xang-dau/.test(h)) || "";
  return { items, link: a };
});
await b.close();
if (!Object.keys(data.items).length) { console.error("Không đọc được bảng giá"); process.exit(1); }
let ky = "", kyIso = null;
const m = data.link.match(/tu-(\d{1,2})-gio-(\d{2})-phut-ngay-(\d{2})-(\d{2})-(\d{4})/);
if (m) { ky = `${m[1].padStart(2,"0")}:${m[2]} ${m[3]}/${m[4]}/${m[5]}`; kyIso = `${m[5]}-${m[4]}-${m[3]}T${m[1].padStart(2,"0")}:${m[2]}:00+07:00`; }
const f = "gia-xang.json";
let old = null; try { old = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
const same = old && JSON.stringify(old.items) === JSON.stringify(data.items);
const out = {
  src: "Petrolimex", ky: ky || (old && old.ky) || "", kyIso: kyIso || (old && old.kyIso) || null,
  items: data.items, link: data.link,
  prev: same ? (old.prev || null) : (old ? { ky: old.ky, items: old.items } : null),
  updated: new Date().toISOString()
};
if (same && old.ky === out.ky) { console.log("Giá không đổi"); process.exit(0); }
fs.writeFileSync(f, JSON.stringify(out, null, 1));
console.log("Đã cập nhật", out.ky, out.items);
