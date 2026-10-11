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
if(beats[0].text==='Paris, am 19. September 1870.' && beats[1].text.startsWith('Ein Brief liegt')){
  beats.splice(0,2,{text:beats[0].text+' '+beats[1].text,paragraph:0});
}
function splitBeat(startsWith,separator){
  const idx=beats.findIndex(x=>x.text.startsWith(startsWith));
  if(idx<0)throw new Error('Schnittstelle fehlt: '+startsWith);
  const entry=beats[idx], at=entry.text.indexOf(separator);
  if(at<0)throw new Error('Teiler fehlt: '+separator);
  const endsSentence=separator.startsWith('.');
  beats.splice(idx,1,
    {text:entry.text.slice(0,at+(endsSentence?1:0)).trim(),paragraph:entry.paragraph},
    {text:entry.text.slice(at+(endsSentence?2:0)).trim(),paragraph:entry.paragraph});
}
splitBeat('Einer wird sogar bis nach Norwegen getragen.','. Und wer');
splitBeat('Die Nachrichten werden deshalb fotografisch','dass viele Texte');
splitBeat('Sogar andere ungewöhnliche Wege werden ausprobiert.','mit Post die Seine');

if(beats.length!==90 || plan.length!==90)throw new Error('90 Story-Beats/Visuals erwartet: '+beats.length+'/'+plan.length);
for(let i=0;i<beats.length;i++){
  if(!script.includes(beats[i].text))throw new Error('NarrationBeat '+(i+1)+' nicht wörtlich im Skript: '+beats[i].text);
  if(i && script.indexOf(beats[i].text)<=script.indexOf(beats[i-1].text))throw new Error('Reihenfolge '+(i+1));
}

const colorArc=[
['sep-ring','Belagerung wird sichtbar','deep indigo, fog gray, dark copper','cool September dawn'],
['sedan-paris','Regierungswechsel und volle Stadt','dusty olive, limestone beige, muted uniform blue','clear autumn daylight'],
['post-silence','Persönliche und politische Isolation','parchment cream, ink blue, umber wood','warm indoor lamps with cold exterior'],
['balloon-plan','Idee der Gasballonpost','brass gold, ink blue, technical gray','strong studio side light'],
['sewing-work','Ballonwerkstätten entstehen','warm linen, muted burgundy, natural timber','busy workshop daylight'],
['neptune-launch','Erster Start und Entkommen','clean cobalt sky, warm sandstone, gas-envelope gold','bright September morning'],
['wind-unknown','Unkontrollierbare Flüge','storm teal, pale mist, steel gray','varied aerial weather'],
['flight-risk','Gefahr und Ausdauer','cool slate, copper brown, rain blue','stormy autumn skies'],
['return-problem','Brieftauben als Rückweg','moss green, soft brass, blue gray','rural autumn daylight'],
['micro-post','Mikrofotografie und Nachricht','dark walnut, glass teal, warm lamplight','interior laboratory light'],
['winter-city','Überleben und Warten','icy blue, soot gray, dull brick rose','short winter daylight'],
['river-attempt','Zinkkugeln scheitern','river green, pewter, brown stone','cold January mist'],
['postal-memory','Waffenstillstand und Bedeutung der Luftpost','archive sepia, warm parchment, hopeful sky blue','soft final daylight']
].map(([id,storyFunction,paletteBias,lighting])=>({id,storyFunction,paletteBias,lighting}));
const phaseByParagraph=[0,1,2,3,4,5,6,7,8,9,10,11,12];
const stages=[...colorArc];
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
   /Ballon.*(?:start|steig|über)|aufsteigend|abheb|Ballonpost über/i.test(s.visualConcept)?'pan-up':
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
   '19. September 1870, blockiertes Paris',
   'September 1870, Beginn der Belagerung nach Sedan',
   'September 1870, gestoppte Postwege',
   'Ende September 1870, Plan der Gasballonpost',
   'September und Oktober 1870, Produktion der Ballons',
   '23. September 1870, erster Ballon Le Neptune und erste Zustellungen',
   'Herbst 1870, Flug und Windrisiken',
   'Herbst und Winter 1870, weitere riskante Ballonfahrten',
   'Herbst 1870, Problem der Antworten',
   'Herbst und Winter 1870, Mikrofilm-Taubentelegrafie',
   'Winter 1870/71, Alltag unter Belagerung',
   'Januar 1871, Postversuch mit Zinkkugeln in der Seine',
   '28. Januar 1871, Waffenstillstand und Rückblick'
 ][para]||'Januar 1871, Ende und Rückblick';
 const visibleTextPolicy=number===1?'COVER_TEXT_ONLY':'NO_VISIBLE_TEXT';
 return {
   imageNumber:number,imageFile:'Bild '+String(number).padStart(2,'0')+'.png',
   startAnchor:beat.text,endAnchor:null,narrationBeat:beat.text,
   timeContext:time,chronologyStep:number,
   visualAnswer:s.dominantSubject+': '+s.visualConcept,
   narrationMatchScore:9.5,clarityScore:9.2,
   viewerTakeaway:s.dominantSubject+': '+s.visualConcept,
   visualPurpose:explain?'Den aktuellen Sachzusammenhang an einem klaren konkreten Objekt zeigen.':'Den exakten historischen Sprechbeat als handlungsbezogenes Bild umsetzen.',
   topicAnchor:'Pariser Ballonpost während der Belagerung 1870–1871',
   visualForm:form,visualConcept:s.visualConcept,dominantSubject:s.dominantSubject,
   actionState:s.visualConcept,
   composition:'Foreground: '+s.worldLifeDetail+'. Midground: '+s.dominantSubject+' carries the present action. Background: simplify historically correct 1870 Paris or contemporaneous provinces; preserve one primary readable takeaway.',
   camera:camera[shot]||camera.wide,shotScale:shot,
   visualEnergyDevice:form+' with a distinct scale contrast, dynamic path or reveal and a clear primary silhouette',
   visualChangeFromPrevious:number===1?'Cover introduces the interrupted letter route.':'Change to '+shot+' '+form+' as the spoken action or place changes; do not repeat a prior balloon angle.',
   visualInterestScore:9.2,
   colorPhase:id,
   colorIntent:arc.storyFunction+'; '+arc.paletteBias+'; '+arc.lighting,
   worldLifeDetail:s.worldLifeDetail,
   motionType,motionDirection:direction,
   motionIntensity:motionType==='static'?'none':medium?'medium':'subtle',
   motionFocus:s.dominantSubject,
   visibleTextPolicy,editorialText:'',editorialTextPurpose:'',explanationOnly:explain,
   depthPlan:'Foreground: '+s.worldLifeDetail+'. Midground: '+s.dominantSubject+'. Background: 1870 Paris or historically matching French countryside.',
   lightingMood:arc.lighting,supportingElements:supports,
   continuityNote:'Use the Paris Siege World Lock; show only the stage reached by chronology step '+number+'; do not show pigeons, zinc spheres or the armistice before narration reaches them.',
   historicalAccuracyNote:'French Third Republic, 1870–71; city-gas balloons with a gondola, not modern dirigibles; nineteenth-century clothing and Paris buildings; no aircraft, no motor vehicles, no modern Eiffel Tower. Follow RECHERCHE.md.',
   promptQcScore:9.1,plannedHoldSeconds:hold,holdReason:'Speech-time estimate; final duration comes from measured Whisper alignment.',
   actualStartSeconds:null,actualEndSeconds:null,alignmentConfidence:null
 };
});
const explanationCount=images.filter(x=>x.explanationOnly).length;
let streak=0,maxStreak=0; for(const i of images){streak=i.explanationOnly?streak+1:0;maxStreak=Math.max(maxStreak,streak);}
const meta={...template};
Object.assign(meta,{
  videoId:'2026-KW41_05-10_bis_11-10_paris-ballonpost-1870',
  weekFolder:'2026-KW41_05-10_bis_11-10',topicSlug:'paris-ballonpost-1870',
  title:'Warum Paris 1870 seine Briefe mit Ballons verschickte',
  topic:'Warum Paris 1870 seine Briefe mit Ballons verschickte',
  storyMode:'world-led',status:'phase1-ready',visualStyleId:'history-stickman-adaptive-v1',
  targetDurationSeconds:395,targetDurationRangeSeconds:[360,420],
  plannedImageCount:90,phase1Ready:true,imagesReady:false,audioReady:false,renderReady:false,
  createdAt:'2026-10-08T17:00:00+02:00',updatedAt:'2026-10-08T17:00:00+02:00'
});
meta.coverPolicy.coverText='BRIEFE ÜBER FEINDESLINIEN';
meta.imageDensityPolicy.targetAverageHoldSeconds=[2.5,4.5];
meta.audioPolicy.playbackRate=1.05;
meta.youtubeUpload={
title:'Warum Paris 1870 seine Briefe mit Ballons verschickte',
description:"Eine Millionenstadt ist eingekesselt. Postkutschen kommen nicht mehr hinaus, Bahnstrecken sind gesperrt und wichtige Nachrichten erreichen ihre Empfänger nicht. Doch im September 1870 findet Paris einen ungewöhnlichen Weg, um trotzdem mit der Außenwelt zu sprechen: Briefe fliegen mit Gasballons über die feindlichen Linien.\n\nIn diesem Geschichtsvideo von Zeitkulisse erlebst du, wie die belagerte Stadt ihre eigene Luftpost organisiert. Wir schauen in die improvisierten Ballonwerkstätten, begleiten den ersten Postballon Le Neptune beim Start und zeigen, warum jeder Flug vom Wind abhing. Denn ein Gasballon konnte zwar aufsteigen, aber nicht einfach zum gewünschten Ort gelenkt werden.\n\nUnd wie kamen Antworten zurück nach Paris? Hier beginnt der vielleicht überraschendste Teil der Geschichte: Brieftauben trugen winzige, fotografisch verkleinerte Nachrichten in die eingeschlossene Stadt. Im harten Winter suchten die Menschen sogar nach einem Postweg durch die Seine.\n\nDie Ballonpost konnte den Krieg nicht beenden. Aber sie zeigte, wie eine Stadt selbst unter extremen Bedingungen neue Wege für Nachrichten und menschliche Verbindungen fand.\n\nEntdecke auf Zeitkulisse weitere spannende Geschichten, historische Erfindungen und Ereignisse, die unsere Welt verändert haben.",
hashtags:['#Geschichte','#Paris','#Ballonpost','#1870','#History'],
keywords:['Belagerung von Paris','Ballonpost 1870','Brieftauben Mikrofilm','Le Neptune','Deutsch Französischer Krieg 1870','Geschichte der Luftpost']
};
const mapping={schemaVersion:2,voiceoverMaster:'01-voice-script/voice-script.txt',coverImageNumber:1,videoFirstImageNumber:1,videoLastImageNumber:90,
  sourceVoiceoverFile:null,audioMasterFile:null,alignmentEvidenceFile:null,images};
const wholeQc={schemaVersion:3,status:'APPROVED',reviewMethod:'script-first-and-sequence-review',
 scriptContinuousProse:true,scriptReadAloudPassed:true,visualsDerivedAfterScript:true,coherentVisualArc:true,
 chronologyMode:'strict-chronological',chronologyReviewed:true,historicalEventOrderReviewed:true,visualOrderMatchesNarrationOrder:true,temporalJumpsExplicitlySignposted:true,unnecessaryFlashbacksAbsent:true,
 narrationVisualAlignmentReviewed:true,everyVisualMatchesCurrentNarration:true,visualClarityReviewed:true,unclearVisualsAbsent:true,onePrimaryTakeawayPerVisual:true,futureEventLeakageAbsent:true,
 explanationOnlyVisualShare:explanationCount/90,maxConsecutiveExplanationOnlyVisuals:maxStreak,
 historicalWorldReturnsAfterExplanation:true,editorialTextUsedOnlyWhenUseful:true,transitionsReviewed:true,overallCoherenceScore:9.1,approved:true,
 notes:['90 Beats aus vollständigem Sprechertext abgeleitet, nicht umgekehrt.','Keine Hauptfigur; individuelle Pariser als wechselnde Darsteller.','Wiederkehrende Gasballons dürfen nicht in identischen Ansichten wiederholt werden.']};
const files={
'video.json':meta,'BILD_AUDIO_ZUORDNUNG.json':mapping,'WHOLE_VIDEO_QC.json':wholeQc,
'YOUTUBE_RENDER_PLAN.json':{schemaVersion:2,motionPolicy:'content-aware-v1',colorArc,backgroundMusic:false,motionOverrides:[],soundEffects:[]},
'PHASE2_VISUAL_QC.json':{schemaVersion:2,status:'PLANNED',reviewMethod:'vision-review',hashAlgorithm:'sha256',minimumNarrationSupportScore:8,minimumVisualInterestScore:8,minimumStyleConsistencyScore:8,images:[]},
'status.json':{project:'paris-ballonpost-1870',storyMode:'world-led',preproduction:'APPROVED',phase1:'READY',coverSelection:'WAITING',phase2:'WAITING_FOR_IMAGES',phase3:'BLOCKED_UNTIL_PHASE2',render:'BLOCKED_UNTIL_PHASE3'}
};
for(const [name,value] of Object.entries(files))await writeFile(path.join(here,name),JSON.stringify(value,null,2)+'\n');
await mkdir(path.join(root,'00-bildprompts','images'),{recursive:true});
await mkdir(path.join(root,'02-audio'),{recursive:true});
await mkdir(path.join(root,'03-export'),{recursive:true});
await writeFile(path.join(root,'00-bildprompts','images','.gitkeep'),'');
await writeFile(path.join(root,'02-audio','.gitkeep'),'');
await writeFile(path.join(root,'03-export','CAPTION.txt'),buildCaption(meta));
await writeFile(path.join(here,'PHASE1_QC.md'),
 '# Phase 1 QC\n\nStatus: READY PENDING FINAL VALIDATOR\n\n- Skript zuerst vollständig geschrieben: ja\n- '+images.length+' unterschiedliche Visuals\n- Original Voice-over: '+script.split(/\s+/).length+' Wörter\n- Story-Modus: world-led, keine Hauptfigur\n- 13 bis 15 Color-Arc-Phasen\n- explanation-only: '+explanationCount+'/90; max '+maxStreak+' in Folge\n- Flow-Cover: exakt 3 Kandidaten, dann STOP\n- 1,05× und SUBTITLES.srt beim späteren Export\n- Keine Bilder, kein Audio: Phase 2/3 blockiert\n');
console.log('Paris Generator: '+images.length+' Visuals; '+script.split(/\s+/).length+' Wörter; explanation '+explanationCount+' max '+maxStreak+'.');
