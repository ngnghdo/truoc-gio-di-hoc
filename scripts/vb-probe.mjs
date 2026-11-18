import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("vbdbg",{recursive:true,force:true}); fs.mkdirSync("vbdbg",{recursive:true});
const b = await chromium.launch();
const pg = await (await b.newContext({locale:"vi-VN"})).newPage();
const log=[];
for (const k of ["99/2025/TT-BTC","254/2026/NĐ-CP","108/2025/QH15"]) {
  const u="https://vanban.chinhphu.vn/?pageid=473&q="+encodeURIComponent(k);
  await pg.goto(u,{waitUntil:"domcontentloaded",timeout:60000}); await pg.waitForTimeout(3000);
  const links=await pg.$$eval("a",as=>as.map(a=>({h:a.href,t:a.textContent.replace(/\s+/g," ").trim()})).filter(x=>/docid=/.test(x.h)));
  log.push(k+" :: "+JSON.stringify(links.slice(0,6)));
  fs.writeFileSync("vbdbg/s_"+k.replace(/\W/g,"_")+".html",(await pg.content()).slice(0,300000));
  const hit=links.find(x=>x.t.includes(k))||links[0];
  if(hit){ await pg.goto(hit.h,{waitUntil:"domcontentloaded",timeout:60000}); await pg.waitForTimeout(3000);
    const h=await pg.content(); fs.writeFileSync("vbdbg/d_"+k.replace(/\W/g,"_")+".html",h.slice(0,600000));
    const att=await pg.$$eval("a",as=>as.map(a=>a.href).filter(h=>/\.(pdf|docx?|zip|rar)(\?|$)/i.test(h)||/datafiles|download|file/i.test(h)));
    log.push("  doc "+hit.h+" len "+h.length+" att "+JSON.stringify(att.slice(0,10)));
  }
}
fs.writeFileSync("vbdbg/log.txt",log.join("\n")); console.log(log.join("\n"));
await b.close();
