import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("vbdbg",{recursive:true,force:true}); fs.mkdirSync("vbdbg",{recursive:true});
const b = await chromium.launch({args:["--disable-blink-features=AutomationControlled"]});
const ctx = await b.newContext({ locale:"vi-VN", userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", viewport:{width:1280,height:900} });
await ctx.addInitScript(()=>{ Object.defineProperty(navigator,'webdriver',{get:()=>undefined}); });
const pg = await ctx.newPage();
const log=[];
async function save(name,url,wait=6000){
  try{ const r=await pg.goto(url,{waitUntil:"domcontentloaded",timeout:60000}); await pg.waitForTimeout(wait);
    const h=await pg.content(); fs.writeFileSync("vbdbg/"+name+".html",h.slice(0,600000)); const l=`${name} ${r&&r.status()} ${h.length} ${await pg.title()} ${pg.url()}`; console.log(l); log.push(l); return h; }catch(e){ const l=name+" ERR "+String(e).slice(0,150); console.log(l); log.push(l); return ""; }
}
const K="99/2025/TT-BTC", E=encodeURIComponent;
await save("tvpl_search","https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword="+E(K),15000);
await save("cp_search","https://vanban.chinhphu.vn/he-thong-van-ban?classid=1&mode=0&keyword="+E("99/2025"));
await save("vbplco","https://vanbanphapluat.co/tim-kiem?kwd="+E(K));
await save("thukyluat","https://thukyluat.vn/tim-kiem/?keyword="+E(K));
await save("htpl","https://hethongphapluat.com/search?q="+E(K));
await save("caselaw","https://caselaw.vn/tim-kiem?keyword="+E(K));
await save("lawnet","https://lawnet.vn/tim-van-ban?keyword="+E(K));
await save("luatvn2","https://luatvietnam.vn/tim-van-ban.html?Keywords="+E(K),15000);
await save("vbpl2","https://vbpl.vn/TW/Pages/vbpq-timkiem.aspx?Keyword="+E(K));
await save("ddg","https://html.duckduckgo.com/html/?q="+E("Thông tư 99/2025/TT-BTC toàn văn"));
fs.writeFileSync("vbdbg/log.txt",log.join("\n"));
await b.close();
