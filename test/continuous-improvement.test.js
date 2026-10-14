import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  REQUIRED_DIMENSIONS, createPendingReview, validatePostVideoReview,
  ensurePendingPostVideoReview, findUnreviewedExports, assertImprovementLoopReady
} from '../src/lib/continuous-improvement.js';
import { reviewYoutubeVideo } from '../src/cli/review-youtube-video.js';
import { finalizeYoutubeExport } from '../src/cli/finalize-youtube-export.js';

const HASH='a'.repeat(64);
const report={videoSha256:HASH};
const meta={videoId:'test-video',postVideoImprovementGateVersion:1};
function finishedReview() {
 const o=createPendingReview(meta,report);
 return {
  ...o,status:'VERIFIED',reviewer:'geprüftes Video-Review',
  reviewedAt:'2026-10-14T05:00:00+02:00',
  source:{...o.source,reviewedVideoDurationSeconds:90},
  dimensionScores:Object.fromEntries(REQUIRED_DIMENSIONS.map(key=>[key,8])),
  findings:[
   {id:'F1',dimension:'visualVariety',priority:'P1',timestampSeconds:12,
    observation:'Drei nacheinander folgende Stadtübersichten ähneln sich zu stark.',
    evidence:'Bei 00:12–00:18 wiederholt sich der Horizont ohne neue Handlung.',
    rootCause:'Szenenauswahl hat Maßstab variiert, aber die Bildidee nicht überprüft.'},
   {id:'F2',dimension:'pacingAndTransitions',priority:'P1',timestampSeconds:32,
    observation:'Bildfolge springt zu schnell von einem Detail zu einer langen Szene.',
    evidence:'Bei 00:32–00:40 auffälliger Wechsel zwischen 1,5 s und 6,5 s.',
    rootCause:'Das Pacing berücksichtigt nur Durchschnittswerte, nicht Nachbarsprünge.'},
   {id:'F3',dimension:'audioAndVoice',priority:'P2',timestampSeconds:54,
    observation:'Sprecher liest die Überleitung ohne erkennbare Betonung vor.',
    evidence:'Bei 00:54–01:00 geht der Wendepunkt klanglich unter.',
    rootCause:'Read-aloud-QC hat Betonung und Pausen in Übergängen nicht geprüft.'}
  ],
  verifiedImprovements:[
   {findingId:'F2',rootCauseAddressed:'Nachbarsprünge werden künftig einzeln technisch begrenzt.',
    policyOrCodePath:'config/channel-policy.json',regressionTestPath:'test/continuous-improvement.test.js',
    before:'Vorher keine Prüfung für den starken lokalen Tempo-Wechsel.',
    after:'Nachher wird ein lokaler Pacing-Regressionsfall zurückgewiesen.',
    verificationEvidence:'PR-Review mit bestandenem Node-CI und lokalem Pacing-Fall.',
    status:'VERIFIED'}
  ],
  nextVideoLessons:[
   'Bildvarianten müssen einen erkennbar neuen Handlungsschritt zeigen, nicht nur eine andere Blickhöhe.',
   'Bei jedem Wendepunkt manuell prüfen, ob Pause, Szenenwechsel und Kamerabewegung zusammenpassen.'
  ],
  CI:{regressionChecksPassed:true,reference:'Node CI PR example #123'}
 };
}
async function fixture() {
 const root=await mkdtemp(path.join(tmpdir(),'post-video-loop-'));
 const dir=path.join(root,'youtube','2026-KW42','review-video');
 await mkdir(path.join(dir,'99-technik'),{recursive:true});
 await mkdir(path.join(dir,'03-export'),{recursive:true});
 await writeFile(path.join(dir,'99-technik','video.json'),JSON.stringify(meta));
 await writeFile(path.join(dir,'99-technik','EXPORT_REPORT.json'),JSON.stringify(report));
 return {root,dir};
}

test('neuer Exportreview ist ausnahmslos PENDING und keine erfundene Bestätigung',()=>{
 const p=createPendingReview(meta,report);
 assert.equal(p.status,'PENDING_REVIEW');
 assert.equal(p.source.exportVideoSha256,HASH);
 assert.equal(p.dimensionScores.audioAndVoice,null);
 assert.equal(p.findings.length,0);
 assert.equal(validatePostVideoReview(p,report).passed,false);
});

test('konkreter Review mit 3 Befunden, realer Ursache, Upgrade und CI besteht',()=>{
 const review=finishedReview();
 assert.equal(validatePostVideoReview(review,report).passed,true);
 review.source.exportVideoSha256='b'.repeat(64);
 const result=validatePostVideoReview(review,report);
 assert.equal(result.passed,false);
 assert.match(result.errors.join(' '),/SHA/);
});

test('Review blockiert ohne geprüften Fix, ohne Beleg und ohne CI',()=>{
 const review=finishedReview();
 review.verifiedImprovements=[];
 review.findings[0].evidence='';
 review.CI.regressionChecksPassed=false;
 const result=validatePostVideoReview(review,report);
 assert.equal(result.passed,false);
 assert.match(result.errors.join(' '),/mindestens eine/);
 assert.match(result.errors.join(' '),/Befund 1/);
 assert.match(result.errors.join(' '),/CI/);
});

test('Legacy-Projekte werden nicht zu Reviews gezwungen, opt-in Exports werden es',async()=>{
 const f=await fixture();
 try{
  assert.equal((await findUnreviewedExports(f.root)).length,1);
  await assert.rejects(()=>assertImprovementLoopReady(f.root),/POST-VIDEO-IMPROVEMENT-HARD-GATE/);
  await writeFile(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'),JSON.stringify(finishedReview()));
  assert.equal((await findUnreviewedExports(f.root)).length,0);
  assert.equal((await assertImprovementLoopReady(f.root)).passed,true);
  await writeFile(path.join(f.dir,'99-technik','video.json'),JSON.stringify({...meta,postVideoImprovementGateVersion:0}));
  await rm(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'));
  assert.equal((await findUnreviewedExports(f.root)).length,0);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('Review-Entwurf wird für dieselbe Video-SHA niemals überschrieben',async()=>{
 const f=await fixture();
 try{
  let r=await ensurePendingPostVideoReview(f.dir,meta,report);
  assert.equal(r.created,true);
  await writeFile(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'),JSON.stringify(finishedReview()));
  r=await ensurePendingPostVideoReview(f.dir,meta,report);
  assert.equal(r.created,false);
  assert.equal(r.existingStatus,'VERIFIED');
  r=await ensurePendingPostVideoReview(f.dir,meta,{videoSha256:'b'.repeat(64)});
  assert.equal(r.created,true);
  const review=JSON.parse(await readFile(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'),'utf8'));
  assert.equal(review.status,'PENDING_REVIEW');
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('CLI bindet Review an tatsächliche FINAL_VIDEO.mp4 und Existenz von Testdateien',async()=>{
 const f=await fixture();
 try{
  const videoPath=path.join(f.dir,'03-export','FINAL_VIDEO.mp4');
  await writeFile(videoPath,'actual video bytes');
  const videoHash=createHash('sha256').update('actual video bytes').digest('hex');
  await writeFile(path.join(f.dir,'99-technik','EXPORT_REPORT.json'),JSON.stringify({videoSha256:videoHash}));
  const initial=await reviewYoutubeVideo(f.dir,{init:true});
  assert.equal(initial.created,true);
  assert.equal((await reviewYoutubeVideo(f.dir)).passed,false);
  const done=finishedReview(); done.source.exportVideoSha256=videoHash;
  await writeFile(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'),JSON.stringify(done));
  assert.equal((await reviewYoutubeVideo(f.dir)).passed,true);
  done.verifiedImprovements[0].regressionTestPath='test/file-does-not-exist-test.js';
  await writeFile(path.join(f.dir,'99-technik','POST_VIDEO_REVIEW.json'),JSON.stringify(done));
  assert.equal((await reviewYoutubeVideo(f.dir)).passed,false);
 }finally{await rm(f.root,{recursive:true,force:true});}
});

test('finalize export legt Review NUR für Opt-in-Projekt an und speichert Video-SHA',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'post-video-export-'));
 try{
  for(const x of ['00-bildprompts/images','03-export','99-technik'])await mkdir(path.join(root,x),{recursive:true});
  await writeFile(path.join(root,'00-bildprompts/images/Bild 01.png'),'cover');
  await writeFile(path.join(root,'03-export/FINAL_VIDEO.mp4'),'finished video');
  await writeFile(path.join(root,'99-technik/video.json'),JSON.stringify({
   ...meta,title:'Testtitel',topic:'Ein dokumentierter Sachverhalt',
   youtubeUpload:{title:'Test',description:'Test description',hashtags:[]}
  }));
  await writeFile(path.join(root,'99-technik/BILD_AUDIO_ZUORDNUNG.json'),JSON.stringify({
   images:[{imageNumber:1,narrationBeat:'Ein Satz.',actualStartSeconds:0,actualEndSeconds:2}]
  }));
  const report=await finalizeYoutubeExport(root);
  assert.match(report.videoSha256,/^[a-f0-9]{64}$/);
  const review=JSON.parse(await readFile(path.join(root,'99-technik','POST_VIDEO_REVIEW.json'),'utf8'));
  assert.equal(review.status,'PENDING_REVIEW');
  assert.equal(review.source.exportVideoSha256,report.videoSha256);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Zukünftige Vorlage und Brain Index machen Review zur höchsten Priorität',async()=>{
 const template=JSON.parse(await readFile('youtube/templates/video-template/99-technik/video.json','utf8'));
 const channel=JSON.parse(await readFile('config/channel-policy.json','utf8'));
 const docs=await readFile('channel/00-BRAIN-INDEX.md','utf8');
 assert.equal(template.postVideoImprovementGateVersion,1);
 assert.equal(channel.highestOperationalPriority,'CONTINUOUS_IMPROVEMENT_AFTER_EVERY_VIDEO');
 assert.equal(channel.continuousImprovement.minimumVerifiedSystemUpgrades,1);
 assert.match(docs,/PRIORITÄT 0/);
});
