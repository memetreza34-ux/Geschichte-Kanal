# History YouTube Production System

Kanalspezifische Produktionsbasis für einen deutschen **History × Storytelling × Curiosity**-Kanal.

**Zuständigkeit:** Codex übernimmt Phase 1 (Recherche, Skript, Szenen und Bildprompts im bestehenden Stil) und Phase 3 (Zusammenbau der gelieferten Dateien). Der Nutzer erstellt Bilder, Thumbnails und Audio mit seinen eigenen KI-Werkzeugen. Keine eigenständige Bild-/Sprachgenerierung oder Themenwahl durch Codex.

## HÖCHSTE OPERATIVE PRIORITÄT: Jedes Video verbessert die Pipeline

Nach jedem fertigen Video: **komplett sichten → zeitcodierte Beobachtungen → Ursachen → systemischer Fix → Regressionstest und CI → konkrete Lehren für das nächste Video**. Neue Exports legen automatisch `POST_VIDEO_REVIEW.json` an. Solange ein Review unvollständig ist, ist die nächste reguläre Projekterstellung gesperrt. **Technische CI alleine bewertet kein Video.** Siehe `channel/22-CONTINUOUS-IMPROVEMENT.md`.

## Aktueller Status

- Topic Director: **V3 + technisches Scorecard-Gate READY**
- History Storytelling: **V4 READY**
- Story Quality Gate: **V1 + technisches STORY_QC READY**
- Visual System: **Narration-first + Visual Interest Gate READY**
- Flow Compiler: **V3 READY**
- Pipeline: **V4 READY**
- Phase-2-Visual-QC: **SHA-256-gebunden**
- Phase-3-Bildlock: **READY**
- Neue Projektvorlage: **Schema 5 mit Quellen- und Szenenbelegen**
- Export mit `CAPTION.txt`: **READY**
- globale feste Master-Referenzbilder: **NICHT VERWENDET**

Der technische Style-ID bleibt aus Kompatibilitätsgründen `history-stickman-adaptive-v1`, bedeutet aber **keine generischen Stickman-Klone**. Menschen sind stilisierte, individuell gestaltete historische Figuren in einer konsistenten handgezeichneten 2D-Illustrationswelt.

## Neue Produktionen: belegte Recherche und Szenenprüfung

Siehe [Recherche und sichtbare Szenenbelege](channel/23-RESEARCH-AND-SCENE-EVIDENCE.md). Neue Projekte verlangen Quellen mit Fundstellen, belegte historische Aussagen, historische Bildreferenzen, konkrete sichtbare Belege und fortgeführte Zustände wiederkehrender Orte/Objekte. Skript-, Sequenz- und Bildprüfungen werden an den geprüften Stand gebunden. APPROVED-Werte oder Bewertungen dürfen nie automatisch eine echte Prüfung ersetzen.

`npm run preview:youtube-plan -- --dir "<projekt>"` erzeugt eine lokale Szenenübersicht und gibt die aktuellen Review-Fingerprints aus. Kurze geprüfte Beschriftungen und Routen werden über `overlays` im Renderer gesetzt; generierte Storybilder bleiben textfrei. Die Audiovorlage erhält innere Pausen und verwendet normale Sprechgeschwindigkeit. Bestehende Projektdateien werden nicht umgeschrieben.

Voraussetzungen: Node.js 24+, FFmpeg/ffprobe und für die Audioausrichtung Whisper. Installation der festgeschriebenen Node-Abhängigkeiten: `npm ci`; Prüfungen: `npm test`. Auch der direkte Render-Befehl prüft alle Produktionsgates vor dem Kopieren von Assets. PNGs und der fertige MP4-Export werden tatsächlich decodiert.

## Struktur

```text
channel/     menschlich lesbare Kanal- und Qualitätsregeln
config/      maschinenlesbare Policies
src/         ausführbare Pipeline und Validatoren
test/        Regressionstests
youtube/     Templates und konkrete Produktionen
```

## Verbindlicher Produktionspfad

```text
30+ Themenideen
→ 12er Shortlist
→ Duplicate Check
→ TOPIC_SCORECARD >= 7.6/10
→ Recherche
→ Script V4 als vollständiger Fließtext
→ STORY_QC APPROVED
→ Story Beats
→ Viewer Takeaway
→ bestes visuelles Mittel
→ Scene Cards + Visual Interest
→ FLOW_WORLD_LOCK READY
→ Flow Compiler V3
→ Phase 1
→ Google Flow
→ finale Bilder
→ PHASE2_VISUAL_QC + SHA-256
→ Phase 2
→ PHASE3_IMAGE_LOCK
→ Audio / Alignment / Timeline / Pacing
→ Remotion
→ FINAL_VIDEO + THUMBNAIL + CAPTION + SRT
→ POST_VIDEO_REVIEW: Sichten / Befunde / Ursachen / Fix / Regressionstest
→ VERIFIED → nächste Produktion
```

## Preproduction: Thema und Skript

Neue Projekte besitzen:

```text
99-technik/TOPIC_SCORECARD.json
99-technik/STORY_QC.json
```

`TOPIC_SCORECARD.json` erzwingt unter anderem:

- mindestens 30 Rohideen
- mindestens 12 Shortlist-Kandidaten
- Duplicate Check bestanden
- Story Engine vorhanden
- Bedeutung über bloße Kuriosität hinaus
- mindestens 3 Titelrichtungen
- mindestens 5 sinnvolle Visual Forms
- Quellenbasis
- Diversity Gate
- gewichteter Gesamtscore mindestens 7,6/10

`STORY_QC.json` erzwingt unter anderem:

- klare zentrale Frage
- Story-Spine
- historische Bedeutung
- Hook, Story Progression, Meaning und Payoff jeweils mindestens 8/10
- zentraler Story-Anteil mindestens 70 %
- reine Personality-/Curiosity-Anteile höchstens 30 %
- höchstens zwei reine Personality-/Curiosity-Beats hintereinander

Prüfung:

```bash
npm run validate:youtube-preproduction -- --dir "youtube/<week>/<slug>"
```

Phase 1 prüft dieses Gate bei neuen Projekten erneut.

## Narration-first Visuals

Vor jedem Bild lautet die Frage:

> **Welches visuelle Mittel erklärt genau diesen gesprochenen Beat am besten?**

Erlaubt sind unter anderem Character Scene, Environment, Map/Geography, Object Focus, Architecture, System, Cause→Effect, Process, Comparison, Multi-Moment Illustration, Detail Inset, Cutaway Section und Evidence Reconstruction.

Figuren sind nie der automatische Fallback. Prominente unabhängige Figuren unterscheiden sich sichtbar; wiederkehrende Hauptfiguren bleiben konsistent.

## Visual Interest

Neue Scene Cards benötigen zusätzlich:

- `shotScale`
- `visualEnergyDevice`
- `visualChangeFromPrevious`
- `visualInterestScore >= 8`
- korrekte `visibleTextPolicy`

Sequenzregeln:

- max. 2 gleiche Visual Forms hintereinander
- max. 2 Character Scenes hintereinander
- max. 2 gleiche Shot Scales hintereinander
- in 10 Bildern normalerweise mindestens 3 Visual Forms

**Für neue Videos:** Bild 01 ist die erste normale Story-Szene. Alle Bilder 01–NN haben standardmäßig **null sichtbaren Text**. Der YouTube-Covertext erscheint ausschließlich auf `00-bildprompts/thumbnail.png`, nie in einem Video-Frame. Redaktionstext bleibt nur bei expliziter `EDITORIAL_TEXT`-Freigabe erlaubt. Frühere Projekte mit `coverPolicy.firstSceneIsCover=true` bleiben unverändert.

## Bilddichte

Die numerische Wahrheit liegt in `config/pipeline.json`.

Aktuell:

- Ziel Ø 2,5–4,2 s pro Visual
- ab 5,5 s Split prüfen
- ab 7 s Split stark bevorzugen
- 9 s Hard-Max ohne klare Begründung
- 60 s häufig 18–26 Visuals
- 90 s häufig 24–34 Visuals
- 120 s häufig 32–44 Visuals

Keine Füllbilder; Inhalt entscheidet.

## Flow

Vor Build muss `99-technik/FLOW_WORLD_LOCK.json` READY sein.

```bash
npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"
npm run validate:youtube-phase1 -- --dir "youtube/<week>/<slug>"
```

Neues Thumbnail-Gate: Flow erzeugt zuerst **drei eigenständige Thumbnail-Kandidaten A/B/C**, stoppt und wartet auf die Auswahl. Den freigegebenen Kandidaten unter `00-bildprompts/thumbnail.png` speichern, **außerhalb** von `images/`. Danach alle Szenen `Bild 01.png` bis `Bild NN.png` ausschließlich nach ihrer Narration erzeugen. Bild 01 startet die Handlung ohne Covertext. Vor Phase 3 verlangt das Visual-QC eine geprüfte Thumbnail-Datei mit genauem Hash, korrektem Covertext und Freigabe.

**Figuren-QC für neue Videos:** Bei jedem Bild `prominentPeopleVisible` explizit setzen. Bei prominenten Menschen müssen `faceNatural`, `proportionsPlausible`, `handsGesturesPlausible`, `distinctIdentities`, `historicalWardrobePlausible` und `characterStyleConsistent` jeweils `true` sein. Bei Fehlern in Phase 2 regenerieren; keine Reparaturen in Phase 3.

## Flow-Bildvollständigkeit und sichere Dateinamen

Nach der Google-Flow-Erzeugung und **vor** der Phase-2-Bildfreigabe:

```bash
npm run audit:youtube-images -- --dir "youtube/<week>/<slug>" --write-report
```

Der Bericht `99-technik/FLOW_IMAGE_AUDIT.json` nennt alle fehlenden, beschädigten oder überzähligen Bilder und enthält Bilddateinamen, Auflösungen und SHA-256. Fehlende Bilder müssen **in Phase 2** erzeugt und geprüft werden. Das Audit generiert keine Bilder.

Eine optionale, explizit auszuführende Reparatur für eindeutig benannte Dateien wie `Bild 1.png` oder `image_2.png`:

```bash
npm run audit:youtube-images -- --dir "youtube/<week>/<slug>" --repair-names --write-report
```

Bei Konflikten wird vor der ersten Änderung abgebrochen. Nach Phase-2-Freigabe oder aktivem Phase-3-Bildlock ist Umbenennen verboten. Neue Produktionen prüfen darüber hinaus echte PNG-Struktur und CRC, Mindestauflösung 1280×720 und 16:9-Format. Eine technische Prüfung ersetzt **keine** tatsächliche visuelle Kontrolle.

## Phase 2

Jedes finale Bild wird in `99-technik/PHASE2_VISUAL_QC.json` geprüft auf:

- Narrationspassung
- Visual Interest
- Style Consistency
- Weirdness
- Text-/Bildnummern-Leakage

Bei neuen Projekten speichert jeder QC-Eintrag zusätzlich `fileName` und `sha256`. Phase 2 akzeptiert nur exakt dieselbe Datei, die visuell freigegeben wurde.

## Phase 3

Phase 3 verwendet ausschließlich vorhandene freigegebene Bilder. `PHASE3_IMAGE_LOCK.json` sichert Dateiname, Größe und SHA-256. Fehlt oder verändert sich ein Bild: **abbrechen und melden, niemals automatisch reparieren oder neu erzeugen.**

## Export

```text
03-export/
├── FINAL_VIDEO.mp4
├── THUMBNAIL.png
└── CAPTION.txt
```

`CAPTION.txt` enthält YouTube-Titel, Beschreibung und Hashtags. Neue Vorlagen verwenden Caption V2 mit zwei Absätzen und fünf unterschiedlichen Hashtags. Interne Keywords und Thumbnail-Text gehören nicht in die Caption.

## Autorität

Bei Detailfragen zuerst `channel/00-BRAIN-INDEX.md` lesen. Maschinenlesbare Kernquellen sind `config/channel-policy.json`, `config/topic-policy.json`, `config/visual-policy.json`, `config/flow-style-lock.json` und `config/pipeline.json`.
