import { chromium } from "playwright";
import fs from "node:fs";
import { execSync } from "node:child_process";
fs.rmSync("vbdbg",{recursive:true,force:true}); fs.mkdirSync("vbdbg",{recursive:true});
const b = await chromium.launch();
const ctx = await b.newContext({locale:"vi-VN",userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"});
const log=[];
for (const k of ["99/2025/TT-BTC","254/2026/NĐ-CP","88/2015/QH13"]) {
  for (const [nm,u] of [["bing","https://www.bing.com/search?q="+encodeURIComponent('site:vanban.chinhphu.vn "'+k+'"')],["ddg","https://html.duckduckgo.com/html/?q="+encodeURIComponent('site:vanban.chinhphu.vn '+k)]]) {
    const pg=await ctx.newPage();
    try{ await pg.goto(u,{waitUntil:"domcontentloaded",timeout:45000}); await pg.waitForTimeout(2500);
      const h=await pg.content(); const ids=[...new Set((h.match(/docid(?:=|%3D)\d+/g)||[]))];
      log.push(nm+" "+k+" "+h.length+" "+JSON.stringify(ids.slice(0,8))); }catch(e){ log.push(nm+" "+k+" ERR "+String(e).slice(0,120)); }
    await pg.close();
  }
}
// pdf có text không?
try{ execSync("curl -sL -o vbdbg/t.pdf https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/11/399_2026_nd-cp_02112026_7-signed.pdf && pdftotext -layout vbdbg/t.pdf vbdbg/t.txt"); log.push("PDF txt bytes "+fs.statSync("vbdbg/t.txt").size); fs.writeFileSync("vbdbg/t_head.txt",fs.readFileSync("vbdbg/t.txt","utf8").slice(0,3000)); fs.rmSync("vbdbg/t.pdf"); }catch(e){ log.push("PDF ERR "+String(e).slice(0,200)); }
// liệt kê trang danh sách văn bản Bộ Tài chính
const pg=await ctx.newPage();
try{ await pg.goto("https://vanban.chinhphu.vn/he-thong-van-ban?classid=1&mode=1&typegroupid=5",{waitUntil:"domcontentloaded",timeout:45000}); await pg.waitForTimeout(2000);
  const h=await pg.content(); log.push("list typegroup5 "+((h.match(/docid=\d+/g)||[]).length)+" pager:"+JSON.stringify((h.match(/href="[^"]*(?:page|trang)[^"]*"/gi)||[]).slice(0,8))); fs.writeFileSync("vbdbg/list.html",h.slice(0,300000)); }catch(e){ log.push("list ERR "+e); }
fs.writeFileSync("vbdbg/log.txt",log.join("\n")); console.log(log.join("\n"));
await b.close();
