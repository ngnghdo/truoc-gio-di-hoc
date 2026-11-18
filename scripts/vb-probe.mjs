import { chromium } from "playwright";
import fs from "node:fs";
fs.rmSync("vbdbg",{recursive:true,force:true}); fs.mkdirSync("vbdbg",{recursive:true});
const b = await chromium.launch();
const pg = await (await b.newContext({locale:"vi-VN"})).newPage();
const log=[];
pg.on("response", async r=>{ const u=r.url(); const t=r.request().resourceType(); if(t==="xhr"||t==="fetch"){ let body=""; try{ body=(await r.text()).slice(0,3000);}catch(e){} log.push("XHR "+r.request().method()+" "+u+"\nPOST:"+(r.request().postData()||"").slice(0,500)+"\nBODY:"+body+"\n"); } });
const u="https://vanban.chinhphu.vn/?pageid=473&q="+encodeURIComponent("99/2025/TT-BTC");
await pg.goto(u,{waitUntil:"networkidle",timeout:90000}); await pg.waitForTimeout(8000);
const links=await pg.$$eval("a",as=>as.map(a=>({h:a.href,t:a.textContent.replace(/\s+/g," ").trim()})).filter(x=>/docid=|van-ban|vanban/.test(x.h)));
log.push("LINKS "+JSON.stringify(links.slice(0,40)));
fs.writeFileSync("vbdbg/search.html",await pg.content());
// thử trang chi tiết 1 văn bản đã biết docid từ lần trước
await pg.goto("https://vanban.chinhphu.vn/?pageid=27160&docid=220166&classid=1",{waitUntil:"networkidle",timeout:90000}); await pg.waitForTimeout(3000);
fs.writeFileSync("vbdbg/doc.html",await pg.content());
const att=await pg.$$eval("a",as=>as.map(a=>a.href+" | "+a.textContent.trim()).filter(h=>/\.(pdf|docx?|zip)/i.test(h)||/datafiles|download|tai/i.test(h)));
log.push("ATT "+JSON.stringify(att));
fs.writeFileSync("vbdbg/log.txt",log.join("\n")); console.log(log.join("\n").slice(0,5000));
await b.close();
