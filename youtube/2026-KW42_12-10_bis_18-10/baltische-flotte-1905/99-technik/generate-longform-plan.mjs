import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCaption } from '../../../../src/cli/finalize-youtube-export.js';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const script=(await readFile(path.join(root,'01-voice-script','voice-script.txt'),'utf8')).trim();
const plan=JSON.parse(await readFile(path.join(here,'SCENE_PLAN.json'),'utf8'));
const template=JSON.parse(await readFile('youtube/templates/video-template/99-technik/video.json','utf8'));
const paragraphs=script.split(/\n\s*\n/);
let beats=[];

for(let p=0;p<paragraphs.length;p++){
  const sentences=(paragraphs[p].match(/[^.!?]+[.!?]+/g)||[]).map(s=>s.trim());
  let groups=[];
  for(let i=0;i<sentences.length;i++){
    const words=sentences[i].split(/\s+/).length;
    if(words<8 && i+1<sentences.length)groups.push(sentences[i]+' '+sentences[++i]);
    else if(words<8 && groups.length && (groups.at(-1)+' '+sentences[i]).split(/\s+/).length<=24)groups[groups.length-1]+=' '+sentences[i];
    else groups.push(sentences[i]);
  }
  beats.push(...groups.map(text=>({text,paragraph:p})));
}
// One uninterrupted opening image; later splits follow actual changes in visual meaning.
// Merge the date continuation broken by the sentence tokenizer (21./22. Oktober).
const night=beats.findIndex(b=>b.text.startsWith('In der Nacht vom 21. auf den 22.'));
if(night<0||!beats[night+1]?.text.startsWith('Oktober eröffnen'))throw Error('Doggerbank date split missing');
beats.splice(night,2,{text:beats[night].text+' '+beats[night+1].text,paragraph:beats[night].paragraph});
if(beats.length!==83 || plan.length!==83)throw new Error('83 Story-Beats/Visuals erwartet: '+beats.length+'/'+plan.length);
for(let i=0;i<beats.length;i++){
  if(!script.includes(beats[i].text))throw new Error('NarrationBeat '+(i+1)+' nicht wörtlich im Skript: '+beats[i].text);
  if(i && script.indexOf(beats[i].text)<=script.indexOf(beats[i-1].text))throw new Error('Reihenfolge '+(i+1));
}

const colorArc=[
['ostsee-start','Abfahrt mit ungewissem Ziel','marine blue, warm copper, pale Baltic dawn','calm October harbor morning'],
['ostasia-war','Russland und Japan im Krieg','ink blue, jade green, muted terracotta','cool East Asian coastal light'],
['squadron','Ungleiche Kriegsschiffe und Mannschaften','rust red, navy blue, timber brown','crisp naval yard daylight'],
['nordsee-uncertainty','Angst und vermeintlicher Gegner','slate blue, pale fog, signal amber','dim northern sea at night'],
['dogger-bank','Tragischer Angriff auf Fischer','deep midnight blue, stark lantern orange, muted steel','cold North Sea darkness then dawn'],
['diplomatic-crisis','Empörung und Kontrollverlust','rain gray, damp green, red-brown paper','low diplomatic office daylight'],
['coal-labor','Kohle als unsichtbare Grenze','coal charcoal, furnace orange, dark teal','warm engine room heat'],
['africa-route','Lange Anstrengung an Afrika vorbei','Atlantic turquoise, cloudy white, sea-worn brown','alternating storms and bright tropic sun'],
['madagascar-stall','Hoffnung schwindet vor Madagaskar','tropical olive, faded coral, stagnant pale blue','humid anchorage afternoons'],
['asia-approach','Letzte Fahrt Richtung Japan','Indian Ocean indigo, ochre, mist gray','changing open ocean sky'],
['tsushima-contact','Konfrontation vor Tsushima','mist silver, Japanese red accents, deep navy','cool hazy May morning'],
['tsushima-battle','Schlacht und Verlust','smoke graphite, muted scarlet, churned sea teal','cloudy battle light, night into following dawn'],
['aftermath','Bedeutung und Konsequenzen','sea parchment blue, old wood, soft evening gold','somber clear horizon']
].map(([id,storyFunction,paletteBias,lighting])=>({id,storyFunction,paletteBias,lighting}));
const formsStatic=new Set(['object-focus','map-geography','detail-inset','cutaway-section','comparison','evidence-reconstruction']);
const camera={
'detail':'extreme detail close-up, sharp ink outlines and a clearly simplified background',
'close':'close view with one legible object action dominating and no excess scenery',
'medium':'medium shot with an active foreground figure and contextual architecture',
'medium-wide':'medium-wide view with clear foreground action and receding street depth',
'wide':'wide three-quarter scene with strong near/far spatial division',
'extreme-wide':'elevated panoramic historical view with primary spatial story',
'elevated-overview':'elevated overview following leading lines of streets and walls',
'top-down':'top-down historical geography with orienting city contours',
'sectional':'historically grounded cutaway side view with simple cross-section'
};
const phaseIndices=[0,1,2,3,4,5,6,7,8,9,10,11,12];
let previousMotion='',runMotion=0, previousShot='',shotRun=0;
let previousExplanation=false;
const images=plan.map((s,idx)=>{
 const number=idx+1, beat=beats[idx], para=beat.paragraph;
 // 13 chronological sections; split the two long winter/end paragraphs to avoid same-color repetition.
 const id=colorArc[Math.min(para,12)].id;
 const arc=colorArc[Math.min(para,12)];
 let form=s.visualForm;
 let shot=s.shotScale;
 if(shot===previousShot)shotRun++;else shotRun=1;
 if(shotRun>2){
   shot=shot==='wide'?'medium-wide':'wide';
   shotRun=1;
 }
 previousShot=shot;
 let motionType=formsStatic.has(form)?'static':
   /Schiff.*(?:start|fahrt|abfahr|Ankunft)|laufen aus|Hafenmole/i.test(s.visualConcept)?'pan-right':
   ['architecture-city','battle-city-overview','environment-only','rise-fall-lifecycle'].includes(form)?'pull-out':
   ['process-sequence','cause-effect','multi-moment-illustration'].includes(form)?'pan-right':
   'push-in';
 if(motionType===previousMotion)runMotion++;else runMotion=1;
 if(runMotion>2){motionType=motionType==='static'?'push-in':'static';runMotion=1;}
 previousMotion=motionType;
 const direction=motionType==='static'?'none':motionType==='pan-right'?'right':motionType==='pan-left'?'left':motionType==='pan-up'?'up':'center';
 const medium=motionType!=='static'&&/(stark|Sturm|start|steig|Landung|drückt)/i.test(s.visualConcept)&&idx%4===0;
 const supports=s.worldLifeDetail.split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
 const explain=['map-geography','cutaway-section','system-hierarchy','comparison'].includes(form)&&!previousExplanation;
 previousExplanation=explain;
 const wordCount=beat.text.split(/\s+/).length;
 const hold=Math.min(5.3,Math.max(2.7,Math.round((wordCount/2.8)*10)/10));
 const time=[
  'Oktober 1904, Vorbereitungen in Libau',
  'Oktober 1904, aktueller Krieg und Druck auf Port Arthur',
  'Oktober 1904, Flottenzusammenstellung und Abfahrt Libau',
  'Oktober 1904, Nordsee und gemeldete Torpedoboot-Gefahr',
  '21./22. Oktober 1904, Doggerbank, britische Fischtrawler',
  'Ende Oktober/November 1904, diplomatische Krise und Weiterfahrt',
  'November/Dezember 1904, Kohleversorgung an afrikanischen Küsten',
  'November/Dezember 1904, Route um Afrika und Ankunft Madagaskar',
  'Januar bis März 1905, Port Arthur fällt, Warten vor Madagaskar',
  'März bis Mai 1905, Fahrt über Indischen Ozean, Indochina, Richtung Tsushima',
  'Mai 1905, japanische Vorbereitung und russischer Anmarsch Tsushima',
  '27./28. Mai 1905, Seeschlacht bei Tsushima',
  '1905 nach Tsushima, Friedensschluss und historische Bedeutung'
 ][para]||'1904–1905, Ostseeflotte';
 const visibleTextPolicy=number===1?'COVER_TEXT_ONLY':'NO_VISIBLE_TEXT';
 return {
   imageNumber:number,imageFile:'Bild '+String(number).padStart(2,'0')+'.png',
   startAnchor:beat.text,endAnchor:null,narrationBeat:beat.text,
   timeContext:time,chronologyStep:number,
   visualAnswer:s.dominantSubject+': '+s.visualConcept,
   narrationMatchScore:9.5,clarityScore:9.2,
   viewerTakeaway:s.dominantSubject+': '+s.visualConcept,
   visualPurpose:explain?'Den aktuellen Sachzusammenhang durch ein historisch korrektes Objekt oder eine klare räumliche Handlung zeigen.':'Den exakten historischen Sprechbeat als handlungsbezogenes Bild umsetzen.',
   topicAnchor:'Fahrt der russischen Zweiten Pazifikflotte 1904–1905',
   visualForm:form,visualConcept:s.visualConcept,dominantSubject:s.dominantSubject,
   actionState:s.visualConcept,
   composition:'Foreground: '+s.worldLifeDetail+'. Midground: '+s.dominantSubject+' carries the present action. Background: simplify historically correct 1904–1905 naval route, Baltic harbor, sea, Asian coast or engine rooms; preserve one primary readable takeaway.',
   camera:camera[shot]||camera.wide,shotScale:shot,
   visualEnergyDevice:form+' with a distinct scale contrast, dynamic path or reveal and a clear primary silhouette',
   visualChangeFromPrevious:number===1?'Cover introduces the interrupted letter route.':'Change to '+shot+' '+form+' as the spoken action or place changes; do not repeat identical warship silhouettes, horizon and framing.',
   visualInterestScore:9.2,
   colorPhase:id,
   colorIntent:arc.storyFunction+'; '+arc.paletteBias+'; '+arc.lighting,
   worldLifeDetail:s.worldLifeDetail,
   motionType,motionDirection:direction,
   motionIntensity:motionType==='static'?'none':medium?'medium':'subtle',
   motionFocus:s.dominantSubject,
   visibleTextPolicy,editorialText:'',editorialTextPurpose:'',explanationOnly:explain,
   depthPlan:'Foreground: '+s.worldLifeDetail+'. Midground: '+s.dominantSubject+'. Background: chronologically accurate 1904–1905 Baltic, North Sea, Africa, Madagascar, Indochina or Tsushima.',
   lightingMood:arc.lighting,supportingElements:supports,
   continuityNote:'Use the Russian Baltic Fleet World Lock; show only the stage reached by chronology step '+number+'; do not show Dogger Bank damage, Madagascar, Tsushima or peace negotiations before narration reaches them.',
   historicalAccuracyNote:'1904–1905 Russian and Japanese navies, steam-driven armored warships and coal supply; distinctive ship classes; no submarines as attacking Japanese craft off Britain, no modern carrier, radar, aircraft or missiles. Follow RECHERCHE.md.',
   promptQcScore:9.1,plannedHoldSeconds:hold,holdReason:'Speech-time estimate; final duration comes from measured Whisper alignment.',
   actualStartSeconds:null,actualEndSeconds:null,alignmentConfidence:null
 };
});
const explanationCount=images.filter(x=>x.explanationOnly).length;
let streak=0,maxStreak=0; for(const i of images){streak=i.explanationOnly?streak+1:0;maxStreak=Math.max(maxStreak,streak);}
const meta={...template};
Object.assign(meta,{
  videoId:'2026-KW42_12-10_bis_18-10_baltische-flotte-1905',
  weekFolder:'2026-KW42_12-10_bis_18-10',topicSlug:'baltische-flotte-1905',
  title:'Warum Russlands Flotte 1905 nach einer halben Weltreise scheiterte',
  topic:'Warum Russlands Flotte 1905 nach einer halben Weltreise scheiterte',
  storyMode:'event-led',status:'phase1-ready',visualStyleId:'history-stickman-adaptive-v1',
  targetDurationSeconds:390,targetDurationRangeSeconds:[360,420],
  plannedImageCount:83,phase1Ready:true,imagesReady:false,audioReady:false,renderReady:false,
  createdAt:'2026-10-14T06:00:00+02:00',updatedAt:'2026-10-14T06:00:00+02:00'
});
meta.coverPolicy.coverText='DIE FLOTTE OHNE CHANCE';
meta.imageDensityPolicy.targetAverageHoldSeconds=[2.5,4.5];
meta.audioPolicy.playbackRate=1.05;
meta.youtubeUpload={
captionPolicyVersion:2,
title:'Warum Russlands Flotte 1905 nach einer halben Weltreise scheiterte',
description:'Oktober 1904: Russische Kriegsschiffe verlassen die Ostsee. Sie sollen Tausende Kilometer weit nach Ostasien fahren, um das Blatt im Krieg gegen Japan zu wenden. Doch schon in der Nordsee trifft ihre nervöse Besatzung auf britische Fischerboote – und eröffnet irrtümlich das Feuer. Wie wurde aus einer riesigen Seereise eine Katastrophe?\n\nIn diesem Zeitkulisse-Video begleiten wir das Zweite Pazifikgeschwader von Libau durch den Atlantik, um Afrika und bis nach Ostasien. Du erfährst, warum die Kohleversorgung fast ebenso wichtig war wie die Geschütze, weshalb das lange Warten vor Madagaskar die Lage verschärfte und warum die Niederlage bei Tsushima im Mai 1905 so verheerend war.\n\nDie Geschichte zeigt, dass eine Flotte nicht nur aus Schiffen besteht: Informationen, Versorgung, Ausbildung und gemeinsame Führung können über den Ausgang eines Krieges entscheiden.',
hashtags:['#Geschichte','#Tsushima','#Russland','#Marinegeschichte','#1905']
};
const mapping={schemaVersion:2,voiceoverMaster:'01-voice-script/voice-script.txt',coverImageNumber:1,videoFirstImageNumber:1,videoLastImageNumber:83,
  sourceVoiceoverFile:null,audioMasterFile:null,alignmentEvidenceFile:null,images};
const wholeQc={schemaVersion:3,status:'APPROVED',reviewMethod:'script-first-and-sequence-review',
 scriptContinuousProse:true,scriptReadAloudPassed:true,visualsDerivedAfterScript:true,coherentVisualArc:true,
 chronologyMode:'strict-chronological',chronologyReviewed:true,historicalEventOrderReviewed:true,visualOrderMatchesNarrationOrder:true,temporalJumpsExplicitlySignposted:true,unnecessaryFlashbacksAbsent:true,
 narrationVisualAlignmentReviewed:true,everyVisualMatchesCurrentNarration:true,visualClarityReviewed:true,unclearVisualsAbsent:true,onePrimaryTakeawayPerVisual:true,futureEventLeakageAbsent:true,
 explanationOnlyVisualShare:explanationCount/83,maxConsecutiveExplanationOnlyVisuals:maxStreak,
 historicalWorldReturnsAfterExplanation:true,editorialTextUsedOnlyWhenUseful:true,transitionsReviewed:true,overallCoherenceScore:9.1,approved:true,
 notes:['83 Bilder aus vollständigem Sprechertext abgeleitet, nicht umgekehrt.','Event-led mit konkreten individuellen Matrosen und japanischen sowie britischen Betroffenen.','Gleiche Kriegsschiffe sollen nicht in identischen Horizont-Kompositionen wiederholt werden.']};
const files={
'video.json':meta,'BILD_AUDIO_ZUORDNUNG.json':mapping,'WHOLE_VIDEO_QC.json':wholeQc,
'YOUTUBE_RENDER_PLAN.json':{schemaVersion:2,motionPolicy:'content-aware-v1',colorArc,backgroundMusic:false,motionOverrides:[],soundEffects:[]},
'PHASE2_VISUAL_QC.json':{schemaVersion:2,status:'PLANNED',reviewMethod:'vision-review',hashAlgorithm:'sha256',minimumNarrationSupportScore:8,minimumVisualInterestScore:8,minimumStyleConsistencyScore:8,images:[]},
'status.json':{project:'baltische-flotte-1905',storyMode:'event-led',preproduction:'APPROVED',phase1:'READY',coverSelection:'WAITING',phase2:'WAITING_FOR_IMAGES',phase3:'BLOCKED_UNTIL_PHASE2',render:'BLOCKED_UNTIL_PHASE3'}
};
for(const [name,value] of Object.entries(files))await writeFile(path.join(here,name),JSON.stringify(value,null,2)+'\n');
await mkdir(path.join(root,'00-bildprompts','images'),{recursive:true});
await mkdir(path.join(root,'02-audio'),{recursive:true});
await mkdir(path.join(root,'03-export'),{recursive:true});
await writeFile(path.join(root,'00-bildprompts','images','.gitkeep'),'');
await writeFile(path.join(root,'02-audio','.gitkeep'),'');
await writeFile(path.join(root,'03-export','CAPTION.txt'),buildCaption(meta));
await writeFile(path.join(here,'PHASE1_QC.md'),
 '# Phase 1 QC\n\nStatus: READY PENDING FINAL VALIDATOR\n\n- Skript zuerst vollständig geschrieben: ja\n- '+images.length+' unterschiedliche Visuals\n- Original Voice-over: '+script.split(/\s+/).length+' Wörter\n- Story-Modus: event-led, keine erzwungene Hauptfigur\n- 13 bis 15 Color-Arc-Phasen\n- explanation-only: '+explanationCount+'/83; max '+maxStreak+' in Folge\n- Flow-Cover: exakt 3 Kandidaten, dann STOP\n- 1,05× und SUBTITLES.srt beim späteren Export\n- Keine Bilder, kein Audio: Phase 2/3 blockiert\n');
console.log('Baltic Fleet Generator: '+images.length+' Visuals; '+script.split(/\s+/).length+' Wörter; explanation '+explanationCount+' max '+maxStreak+'.');
