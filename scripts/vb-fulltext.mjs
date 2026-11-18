// Tải toàn văn văn bản từ vanban.chinhphu.vn (Cổng TTĐT Chính phủ) → vb/<slug>.json
import { chromium } from "playwright";
import fs from "node:fs";
import { execSync } from "node:child_process";
const LIST=JSON.parse(fs.readFileSync("scripts/vb-list.json","utf8"));
const slug=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const norm=s=>slug(s||"");
fs.mkdirSync("vb",{recursive:true}); fs.mkdirSync("/tmp/vbf",{recursive:true});
let IDX={}; try{ IDX=JSON.parse(fs.readFileSync("vb/index.json","utf8")); }catch(e){}
const ONLY=process.env.ONLY?process.env.ONLY.split(","):null;
const b=await chromium.launch(); const ctx=await b.newContext({locale:"vi-VN"}); const pg=await ctx.newPage();
const LISTURL="https://vanban.chinhphu.vn/he-thong-van-ban?classid=1&mode=1";
function reflow(t){
  const L=t.replace(/\r/g,"").replace(/\f/g,"\n").split("\n").map(x=>x.replace(/\s+/g," ").trim());
  const out=[]; let cur="";
  const head=x=>/^(Chương|CHƯƠNG|Mục|MỤC|Phần|PHẦN|Điều \d|Phụ lục|PHỤ LỤC|[IVXLC]+\.|\d+\.|[a-zđ]\)|-|\+|•)/.test(x);
  for(const x of L){ if(!x){ if(cur){out.push(cur);cur="";} continue; }
    if(/^\d+$/.test(x)) continue; // số trang
    if(!cur){cur=x;continue;}
    if(head(x)||/[.:;!?]$/.test(cur)||x===x.toUpperCase()&&x.length>3){ out.push(cur); cur=x; } else cur+=" "+x; }
  if(cur) out.push(cur); return out;
}
async function findDoc(q){ console.log("tìm",q,new Date().toISOString());
  await pg.goto(LISTURL,{waitUntil:"domcontentloaded",timeout:60000});
  await pg.fill("#ctrl_191017_163_txtSearchKeyword",q);
  await Promise.all([pg.waitForLoadState("domcontentloaded").catch(()=>{}), pg.click("#ctrl_191017_163_btnSearch")]);
  await pg.waitForTimeout(2500);
  const rows=await pg.$$eval("a[href*='docid=']",as=>as.map(a=>{ const tr=a.closest("tr"); const td=tr&&tr.querySelector("td"); return {h:a.href,s:(td||a).textContent.replace(/\s+/g," ").trim(),t:(tr||a).textContent.replace(/\s+/g," ").trim()}; }));
  const nq=norm(q);
  const hit=rows.find(r=>norm(r.s)===nq)||rows.find(r=>norm(r.t).startsWith(nq))||rows.find(r=>norm(r.s).startsWith(nq));
  if(!hit) console.log("  rows:",JSON.stringify(rows.slice(0,6).map(r=>r.s+" | "+r.t.slice(0,80))));
  return hit||null;
}
for(const it of LIST){
  const id=slug(it.so); if(ONLY&&!ONLY.includes(id)) continue;
  if(IDX[id]&&IDX[id].ok&&!process.env.FORCE) { console.log("skip",id); continue; }
  const rec={so:it.so,ok:false};
  try{
    const hit=await findDoc(it.q);
    if(!hit){ rec.err="không tìm thấy trên vanban.chinhphu.vn"; throw 0; }
    rec.src=hit.h;
    await pg.goto(hit.h,{waitUntil:"domcontentloaded",timeout:60000}); await pg.waitForTimeout(1500);
    const att=[...new Set(await pg.$$eval("a",as=>as.map(a=>a.href).filter(h=>/datafiles\.chinhphu\.vn\/.*\.(pdf|docx?)$/i.test(h))))];
    rec.files=att; console.log("  trang",hit.h,"tệp",att.length);
    let paras=[];
    for(const u of att.sort((a,b)=>(/\.docx?$/i.test(b)?1:0)-(/\.docx?$/i.test(a)?1:0))){
      console.log("  tải",u); const f="/tmp/vbf/x"+(u.match(/\.\w+$/)[0].toLowerCase());
      try{ execSync(`curl -sL --max-time 120 -o ${f} "${u}"`);
        let txt="";
        if(f.endsWith(".pdf")){ txt=execSync(`pdftotext -enc UTF-8 ${f} -`,{maxBuffer:1<<28}).toString();
          const pages=+((execSync(`pdfinfo ${f}`).toString().match(/Pages:\s+(\d+)/)||[])[1]||1);
          if(txt.replace(/\s/g,"").length < pages*300){ // PDF scan → OCR tiếng Việt
            console.log("  OCR",pages,"trang"); execSync(`rm -rf /tmp/vbf/pg && mkdir -p /tmp/vbf/pg && pdftoppm -r 170 -gray -png ${f} /tmp/vbf/pg/p`);
            execSync(`ls /tmp/vbf/pg/*.png | xargs -P 4 -I{} sh -c 'OMP_THREAD_LIMIT=1 tesseract {} {} -l vie --oem 1 --psm 4 quiet'`,{maxBuffer:1<<26,timeout:45*60*1000});
            const fs2=fs.readdirSync("/tmp/vbf/pg").filter(x=>x.endsWith(".txt")).sort((a,b)=>(+a.match(/(\d+)/)[1])-(+b.match(/(\d+)/)[1]));
            txt=fs2.map(x=>fs.readFileSync("/tmp/vbf/pg/"+x,"utf8")).join("\n\n"); rec.ocr=true; } }
        else if(f.endsWith(".docx")) txt=execSync(`pandoc -t plain --wrap=none ${f}`,{maxBuffer:1<<28}).toString();
        else txt=execSync(`catdoc -d utf-8 -w ${f}`,{maxBuffer:1<<28}).toString();
        if(txt.replace(/\s/g,"").length>200){ paras=paras.concat(paras.length?["———"]:[]).concat(reflow(txt)); if(/\.docx?$/i.test(u)) break; }
      }catch(e){ console.log("file err",u,String(e).slice(0,100)); }
    }
    if(!paras.length){ rec.err="tệp đính kèm là ảnh scan hoặc không đọc được"; throw 0; }
    fs.writeFileSync(`vb/${id}.json`,JSON.stringify({so:it.so,src:rec.src,files:att,ocr:!!rec.ocr,p:paras}));
    rec.ok=true; rec.n=paras.join("\n").length;
  }catch(e){ if(e) rec.err=rec.err||String(e).slice(0,150); }
  IDX[id]=rec; fs.writeFileSync("vb/index.json",JSON.stringify(IDX,null,1));
  try{ execSync(`git add vb && git commit -q -m "Toàn văn: ${it.so}" && (git push -q || (git pull -q --rebase && git push -q))`,{stdio:"inherit"}); }catch(e){}
  console.log(id,rec.ok?("OK "+rec.n):("FAIL "+rec.err));
}
await b.close();
