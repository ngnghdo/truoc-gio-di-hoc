import { chromium } from "playwright";
import fs from "node:fs";
fs.mkdirSync("vbdbg",{recursive:true});
const b = await chromium.launch();
const ctx = await b.newContext({ locale:"vi-VN", userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36" });
const pg = await ctx.newPage();
async function save(name,url){
  try{ const r=await pg.goto(url,{waitUntil:"domcontentloaded",timeout:60000}); await pg.waitForTimeout(4000);
    const h=await pg.content(); fs.writeFileSync("vbdbg/"+name+".html",h.slice(0,400000)); console.log(name,r&&r.status(),h.length,await pg.title());
    return h; }catch(e){ console.log(name,"ERR",String(e).slice(0,200)); return ""; }
}
const h1=await save("tvpl_search","https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword="+encodeURIComponent("99/2025/TT-BTC"));
const m=h1.match(/href="(https:\/\/thuvienphapluat\.vn\/van-ban\/[^"]+\.aspx)"/); console.log("first",m&&m[1]);
if(m) await save("tvpl_doc",m[1]);
await save("vbpl_search","https://vbpl.vn/pages/vbpq-timkiem.aspx?type=0&s=1&SearchIn=Title,Title1&Keyword="+encodeURIComponent("99/2025/TT-BTC"));
await save("vbpl_home","https://vbpl.vn/");
await save("chinhphu_search","https://vanban.chinhphu.vn/?pageid=27160&q="+encodeURIComponent("99/2025/TT-BTC"));
await save("luatvn","https://luatvietnam.vn/tim-van-ban.html?Keywords="+encodeURIComponent("99/2025/TT-BTC"));
await b.close();
