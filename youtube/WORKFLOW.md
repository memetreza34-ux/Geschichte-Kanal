# YouTube Workflow — Geschichts-Kanal

## 0. Preproduction

Neue Projekte starten als `preproduction-review`.

```text
30+ Rohideen
→ 12er Shortlist
→ Duplicate Check
→ TOPIC_SCORECARD.json APPROVED
→ Recherche
→ vollständiger Voice-over-Fließtext
→ Read-aloud-QC
→ STORY_QC.json APPROVED
```

Technische Prüfung:

```bash
npm run validate:youtube-preproduction -- --dir "youtube/<week>/<slug>"
```

## 1. Topic Director V3

`TOPIC_SCORECARD.json` Schema 2 ist für neue Produktionen vorgesehen.

Erforderlich:

- mindestens 30 Rohideen
- mindestens 12 Shortlist-Kandidaten
- Score >= 7,6/10
- Story Engine
- größere historische Bedeutung
- Quellenbasis
- mindestens 3 Titelrichtungen
- mindestens 5 Visual Forms
- Diversity Gate
- konkrete historische Story Core
- `mechanismOnlyTopic=false`
- konkrete menschliche / gesellschaftliche Stakes
- Ereignis-/Veränderungsverlauf
- reiner Erklärmechanismus-Anteil normalerweise <= 40 %

## 2. Script V4 — Fließtext zuerst

Nach `channel/03-SCRIPT-BIBLE.md`.

Verbindlicher Ablauf:

```text
Recherche
→ vollständiger natürlicher Fließtext
→ laut lesen / Sprachfluss verbessern
→ Story-QC
→ erst danach Visuals
```

Nicht zuerst Bilder planen und dann pro Bild einen Satz schreiben.

Das Script soll als zusammenhängende Erzählung funktionieren und nach kurzen Erklärpassagen wieder in die konkrete historische Welt zurückkehren.

## 3. Story Quality Gate

`99-technik/STORY_QC.json` prüft zentrale Frage, Story-Spine, historische Bedeutung, Progression und Payoff.

Pflicht unter anderem:

- Hook / Progression / Meaning / Payoff >= 8/10
- zentraler Story-Anteil >= 70 %
- Personality-/Curiosity-Anteil <= 30 %
- max. 2 reine Personality-/Curiosity-Beats hintereinander

## 4. Story Beats und Visual Selection

Erst nach dem fertigen Script werden Beats markiert.

Vor jedem Visual:

> Was muss der Zuschauer genau jetzt sehen, verstehen oder fühlen — und welches visuelle Mittel leistet das am besten?

Mögliche Werkzeuge:

- Character Scene
- Environment
- Map
- Object Focus
- Architecture
- Cause→Effect
- Process
- Comparison
- Multi-Moment
- Detail Inset
- Cutaway
- Evidence Reconstruction
- kurze redaktionelle Jahreszahl / Datum / Ort, wenn Orientierung dadurch besser wird

Figuren sind kein Default-Fallback. Diagramm-/Erklärbilder ebenfalls nicht.

## 5. Scene Card + Visual Interest

Neue Scene Cards planen zusätzlich:

- `shotScale`
- `visualEnergyDevice`
- `visualChangeFromPrevious`
- `visualInterestScore >= 8`
- `visibleTextPolicy`
- `editorialText`
- `editorialTextPurpose`
- `explanationOnly`

Anti-Monotonie:

- max. 2 gleiche Visual Forms hintereinander
- max. 2 Character Scenes hintereinander
- max. 2 gleiche Shot Scales hintereinander
- max. 2 `explanationOnly=true` Visuals hintereinander
- in 10 Bildern normalerweise mindestens 3 Visual Forms

## 6. Whole-Video-Coherence-Gate

Vor Phase 1 muss bei neuen Projekten:

```text
99-technik/WHOLE_VIDEO_QC.json
```

auf `APPROVED` stehen.

Geprüft werden:

- Fließtext statt Stakkato
- Script vor Visuals fertig
- Read-aloud bestanden
- komplette Bildfolge als Sequenz kohärent
- explanation-only Visual Share <= 35 %
- max. 2 Erklärvisuals hintereinander
- Rückkehr zu Mensch / Ort / Objekt / Ereignis nach Erklärung
- redaktioneller Text nur bei echtem Nutzen
- Übergänge geprüft
- Gesamt-Kohärenz >= 8/10

## 7. World Lock + Flow

Vor Build muss `FLOW_WORLD_LOCK.json` READY sein.

```bash
npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"
npm run validate:youtube-phase1 -- --dir "youtube/<week>/<slug>"
```

Phase 1 revalidiert Topic, Story und bei neuen Projekten Whole-Video-Coherence.

### Cover Gate

Stage 1:

- genau drei Bild-01-Kandidaten
- nur exakter Covertext
- danach STOP
- Nutzer wählt

Stage 2:

- Gewinner = `Bild 01.png`
- Bild 02–NN erzeugen

### Text auf Nicht-Cover-Bildern

Standard:

```text
visibleTextPolicy = NO_VISIBLE_TEXT
```

Gezielt erlaubt:

```text
visibleTextPolicy = EDITORIAL_TEXT
editorialText = "1816"
editorialTextPurpose = "year"
```

Dann darf genau dieser Text erscheinen und nichts anderes.

Immer verboten: `BILD`, `IMAGE`, `SCENE`, interne Nummern, Prompt-Metadaten, Wasserzeichen und Pseudo-Schrift.

## 8. Phase 2 — echte Bildprüfung

Vor Phase 3 jedes Bild in `PHASE2_VISUAL_QC.json` prüfen:

- Narrationspassung >= 8/10
- Visual Interest >= 8/10
- Style Consistency >= 8/10
- keine Weirdness
- keine sichtbare interne Bildnummer
- kein unerwarteter Text
- keine Pseudo-Schrift
- sichtbarer Text entspricht exakt der Scene Card

Hash-gated Projekte speichern:

```text
fileName
sha256
```

```bash
npm run validate:youtube-phase2 -- --dir "youtube/<week>/<slug>"
```

## 9. Phase 3 — Assets read-only

```bash
npm run phase3:youtube -- --dir "youtube/<week>/<slug>"
```

Ab `PHASE3_IMAGE_LOCK.json` sind Bilder read-only.

Fehler:

```text
ABBRUCH
→ keine automatische Reparatur
→ keine Bildgenerierung
→ Fehler melden
```

## 10. Export

Final:

```text
03-export/
├── FINAL_VIDEO.mp4
├── THUMBNAIL.png
├── CAPTION.txt
└── SUBTITLES.srt
```


`CAPTION.txt` ist eine **direkt kopierbare YouTube-Uploadhilfe**: nur `TITLE:` (eigener YouTube-Titel) und `DESCRIPTION:` (mehrere sinnvolle Absätze, idealerweise mindestens 500 Zeichen). Die 5 relevanten Hashtags stehen **am Ende der Beschreibung**, ohne eigene `HASHTAGS`-Überschrift. Interne Metadaten wie `KEYWORDS` und `THUMBNAIL_TEXT` werden nicht ausgegeben; Keywords und Cover-Text dürfen weiterhin intern in `video.json` liegen.

Für **neue** Videoprojekte gilt `youtubeUpload.captionPolicyVersion=2`. Die Beschreibung wird nach dem Skript geschrieben: 450–1.400 Zeichen, mindestens zwei inhaltliche Absätze und genau fünf passende Hashtags am Ende. Die Qualität wird in Phase 1 und beim Export geprüft. Vorhandene Projekte werden nicht rückwirkend bearbeitet. Siehe `channel/21-YOUTUBE-CAPTION-V2.md`.

Die Datei `SUBTITLES.srt` wird aus den **gemessenen Whisper-/Audio-Alignment-Zeiten** der Scene Cards erzeugt. Jeder Eintrag enthält den zugehörigen `narrationBeat` mit echtem Start- und Endzeitpunkt und kann direkt als deutsche Untertiteldatei bei YouTube hochgeladen werden. Geschätzte Zeitcodes ohne Alignment sind nicht erlaubt.

Audio-Geschwindigkeit: Standard für neue Videos ist **1,05×**. Ein projektspezifischer Wert in `video.json.audioPolicy.playbackRate` hat Vorrang vor dem globalen Standard.

## Definition of Done

Ein Video ist erst fertig, wenn Topic Scorecard, Story QC, Whole-Video-QC, Phase 1, Phase-2-Visual-QC, Phase 2, Phase 3, Render und Export-QC bestanden sind.
