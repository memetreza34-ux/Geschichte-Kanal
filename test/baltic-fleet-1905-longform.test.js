import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validatePhase1Full } from '../src/cli/validate-youtube-phase1-full.js';
import { validatePreproduction } from '../src/cli/validate-youtube-preproduction.js';
const dir='youtube/2026-KW42_12-10_bis_18-10/baltische-flotte-1905';
const json=async(s)=>JSON.parse(await readFile(dir+'/'+s,'utf8'));
test('Ostseeflotte 1904/05: neues Ereignisvideo mit 83 chronologischen unterschiedlichen Bildern',async()=>{
 const [meta,score,mapping,scenePlan,world,whole,script,prompt]=await Promise.all([
  json('99-technik/video.json'),json('99-technik/TOPIC_SCORECARD.json'),
  json('99-technik/BILD_AUDIO_ZUORDNUNG.json'),json('99-technik/SCENE_PLAN.json'),
  json('99-technik/FLOW_WORLD_LOCK.json'),json('99-technik/WHOLE_VIDEO_QC.json'),
  readFile(dir+'/01-voice-script/voice-script.txt','utf8'),
  readFile(dir+'/00-bildprompts/google-flow-prompt.txt','utf8')
 ]);
 assert.equal(meta.storyMode,'event-led');
 assert.equal(meta.postVideoImprovementGateVersion,1);
 assert.equal(score.mainCharacterRequired,false);
 assert.equal(meta.audioPolicy.playbackRate,1.05);
 assert.deepEqual(meta.targetDurationRangeSeconds,[360,420]);
 assert.equal(meta.plannedImageCount,83);
 assert.equal(mapping.images.length,83);
 assert.equal(scenePlan.length,83);
 assert.ok(script.trim().split(/\s+/).length>=1000);
 assert.ok(script.trim().split(/\s+/).length<=1250);
 assert.equal(new Set(mapping.images.map(x=>x.visualConcept)).size,83);
 assert.ok(new Set(mapping.images.map(x=>x.visualForm)).size>=12);
 assert.ok(new Set(mapping.images.map(x=>x.colorPhase)).size>=12);
 assert.ok(mapping.images.every(x=>x.narrationMatchScore>=9&&x.clarityScore>=8));
 assert.ok(mapping.images.every(x=>script.includes(x.narrationBeat)));
 assert.ok(mapping.images.every(x=>x.actualStartSeconds===null&&x.actualEndSeconds===null));
 assert.equal(whole.visualsDerivedAfterScript,true);
 assert.equal(meta.coverPolicy.coverCandidateCount,3);
 assert.equal(meta.coverPolicy.coverText,'DIE FLOTTE OHNE CHANCE');
 assert.equal((prompt.match(/^BILD\s+\d+\s*$/gm)||[]).length,83);
 assert.equal((prompt.match(/DIRECTING — HARD:/g)||[]).length,83);
 assert.equal(world.status,'READY');
 assert.match(prompt,/BILD 83/);
 assert.doesNotMatch(script,/\bParis\b/);
 const dogger=mapping.images.find(x=>x.narrationBeat.startsWith('In der Nacht vom 21.'));
 assert.ok(dogger);
 assert.match(dogger.narrationBeat,/22\. Oktober/);
 assert.match(dogger.visualAnswer,/russische Schiffe/i);
 assert.ok(mapping.images.find(x=>x.visualConcept.includes('Suez')));
 assert.ok(mapping.images.find(x=>x.visualConcept.includes('Kap der Guten Hoffnung')));
 const firstDamage=mapping.images.findIndex(x=>/Tsushima.*Feuerlinie|Schlachtschiffe im Feuer/.test(x.visualAnswer));
 const firstMeeting=mapping.images.findIndex(x=>/27\. Mai 1905/.test(x.narrationBeat));
 assert.ok(firstDamage>firstMeeting,'Keine Tsushima-Zerstörung vor der Begegnung zeigen');
 const cover=await readFile(dir+'/00-bildprompts/FLOW_BATCHES/00_COVER_3_VARIANTEN.txt','utf8');
 assert.match(cover,/exactly THREE distinct COVER candidates/);
 assert.equal((cover.match(/^BILD\s+\d+\s*$/gm)||[]).length,1);
 for(let start=2;start<=83;start+=10){
   const end=Math.min(start+9,83);
   const f=dir+'/00-bildprompts/FLOW_BATCHES/BILD_'+String(start).padStart(2,'0')+'_bis_'+String(end).padStart(2,'0')+'.txt';
   const batch=await readFile(f,'utf8');
   assert.equal((batch.match(/^BILD\s+\d+\s*$/gm)||[]).length,end-start+1);
   assert.match(batch,/Do not create or change BILD 01/);
   assert.match(batch,/VIDEO WORLD LOCK/);
 }
 const pre=await validatePreproduction(dir);
 assert.equal(pre.passed,true,pre.errors.join('\n'));
 const p1=await validatePhase1Full(dir);
 assert.equal(p1.passed,true,p1.errors.join('\n'));
});
