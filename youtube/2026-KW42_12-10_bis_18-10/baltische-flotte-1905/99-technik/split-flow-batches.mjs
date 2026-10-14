import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(here,'..');
const prompt=await readFile(path.join(dir,'00-bildprompts','google-flow-prompt.txt'),'utf8');
const markers=[...prompt.matchAll(/^BILD\s+\d+\s*$/gm)].map(m=>({number:Number(m[0].match(/\d+/)[0]),at:m.index}));
if(markers.length!==83||markers.some((m,i)=>m.number!==i+1))throw new Error('Erwartet 83 vollständige BILD-Header');
const globalHeader=prompt.slice(0,markers[0].at);
const blocks=markers.map((marker,index)=>prompt.slice(marker.at,index+1<markers.length?markers[index+1].at:prompt.length).trim());
const last=blocks[89];
const match=/\n(?:GLOBAL(?:\s+NEGATIVE\s+STYLE)?\s+RULES?|GENERATION\s+WORKFLOW|TEXT\s+RULES?|FINAL\s+QUALITY)\s*[:—-]/i.exec(last);
const footer=match?last.slice(match.index).trim():'';
if(footer)blocks[89]=last.slice(0,match.index).trim();
function globalFor(count){
 return globalHeader.replace(/Create 83 separate 16:9 historical explainer illustrations/g,'Create ONLY '+count+' separate 16:9 historical explainer illustrations')
 .replace(/The headings BILD 01 through BILD 83 are prompt metadata only/g,'The following BILD headings are prompt metadata only');
}
const output=path.join(dir,'00-bildprompts','FLOW_BATCHES');
await mkdir(output,{recursive:true});
const cover='STAGE 1 ONLY: Generate exactly THREE distinct COVER candidates from BILD 01. STOP for user selection. Do NOT generate BILD 02 or any other image.\n\n'+globalFor(1)+'\n\n'+blocks[0]+'\n\n'+footer+'\n';
await writeFile(path.join(output,'00_COVER_3_VARIANTEN.txt'),cover);
let batchCount=0;
for(let start=2;start<=83;start+=10){
 const end=Math.min(start+9,83),items=blocks.slice(start-1,end);
 if(items.length!==end-start+1)throw Error('Unvollständiger Batch');
 const instructions='STAGE 2: COVER SELECTED. Generate ONLY BILD '+String(start).padStart(2,'0')+' through BILD '+String(end).padStart(2,'0')+' ('+items.length+' separate images). Do not create or change BILD 01. Use the user-selected cover reference to preserve the exact locked visual world, lighting logic and human styles. STOP after the batch.\n\n';
 const text=instructions+globalFor(items.length)+'\n\n'+items.join('\n\n')+'\n\n'+footer+'\n';
 const filename='BILD_'+String(start).padStart(2,'0')+'_bis_'+String(end).padStart(2,'0')+'.txt';
 await writeFile(path.join(output,filename),text);
 batchCount++;
}
const readme=[
 '# Flow-Batches — Ostseeflotte 1904–1905',
 '',
 '1. Zuerst Datei 00_COVER_3_VARIANTEN.txt in Google Flow: drei Kandidaten, dann STOP.',
 '2. Nutzer wählt Cover. Gewinner wird Bild 01.png.',
 '3. Die gewählte Cover-Datei als Style-/World-Referenz für alle weiteren Batches verwenden.',
 '4. Danach BILD_02_bis_11.txt bis BILD_82_bis_83.txt einzeln verarbeiten.',
 '5. Die BILD-Nummern sind Metadaten, nicht sichtbarer Bildinhalt.',
 '6. Google Flow wird nicht automatisch gestartet. Ohne echte Bilder kein Phase-2- oder Phase-3-Status.',
 ''
].join('\n');
await writeFile(path.join(output,'README.md'),readme);
console.log('Flow-Batches: Cover-Stopp + '+batchCount+' Folgepakete für BILD 02–83.');
