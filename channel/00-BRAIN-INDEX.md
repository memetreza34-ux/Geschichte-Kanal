# Kanal-Gehirn / Brain Index

Diese Dateien sind die dauerhafte Wissensbasis für den Geschichts-Kanal.

## Autorität

Bei Widersprüchen gilt:

1. neueste ausdrückliche Nutzerentscheidung
2. `channel/99-DECISION-LOG.md`
3. kanalspezifische Dateien unter `channel/`
4. `config/channel-policy.json`
5. `config/topic-policy.json`
6. `config/visual-policy.json`
7. `config/narration-alignment-policy.json`
8. `config/pipeline.json`
9. alte Beispiele

Für die Bildwelt zusätzlich:

```text
config/flow-style-lock.json
→ channel/10-STYLE-DNA-V2.md
→ channel/06-VISUAL-SYSTEM.md
→ channel/07-VISUAL-GRAMMAR.md
→ channel/15-VISUAL-INTEREST-QC.md
→ channel/17-WHOLE-VIDEO-COHERENCE-GATE.md
→ channel/18-NARRATION-ALIGNMENT-GATE.md
→ Scene Card
```

Der technische Style-ID `history-stickman-adaptive-v1` ist ein Legacy-Name. Er bedeutet keine generischen Stickman-Klone.

## Preproduction

Neue Projekte starten als `preproduction-review`.

Pflichtdateien:

```text
99-technik/TOPIC_SCORECARD.json
99-technik/STORY_QC.json
```

Topic Director V3 verlangt bei neuen Scorecards zusätzlich:

- konkrete historische Story Core
- `mechanismOnlyTopic = false`
- konkrete menschliche / gesellschaftliche Stakes
- Ereignis-/Veränderungsverlauf
- erwarteter reiner Erkläranteil normalerweise <= 40 %

Duplicate Check bleibt nur Neuheitsprüfung.

## Script-first

Maßgeblich: `channel/03-SCRIPT-BIBLE.md` V4.

Verbindlich:

```text
Recherche
→ vollständiger natürlicher Voice-over-Fließtext
→ laut lesen / Sprachfluss-QC
→ STORY_QC
→ erst danach Story-Beats und Visuals
```

Nicht mehr zulässig:

```text
Bilder planen
→ pro Bild einen Satz schreiben
→ daraus Voice-over bauen
```

## Whole-Video-Coherence-Gate

Neue Projekte führen zusätzlich:

```text
99-technik/WHOLE_VIDEO_QC.json
```

Maßgeblich: `channel/17-WHOLE-VIDEO-COHERENCE-GATE.md`.

Pflicht:

- Script ist zusammenhängender Fließtext
- Read-aloud-QC bestanden
- Visuals wurden erst nach Script abgeleitet
- Bildfolge als Gesamtsequenz geprüft
- explanation-only Visual Share <= 35 %
- maximal 2 explanation-only Visuals hintereinander
- nach Erklärblöcken Rückkehr zur konkreten historischen Welt
- Redaktionstext nur bei echtem Nutzen
- Übergänge geprüft
- Gesamt-Kohärenz >= 8/10

Phase 1 prüft dieses Gate bei neuen Projekten technisch.

## Narration Alignment & Chronology Gate

Maßgeblich: `channel/18-NARRATION-ALIGNMENT-GATE.md` und `config/narration-alignment-policy.json`.

Neue Projekte sind standardmäßig `strict-chronological`.

Jede neue Scene Card benötigt zusätzlich:

```text
narrationBeat
 timeContext
 chronologyStep
 visualAnswer
 narrationMatchScore >= 9
 clarityScore >= 8
```

Verbindlich:

- `narrationBeat` ist ein exakter Ausschnitt aus dem fertigen Voice-over.
- die Bildfolge darf historisch nicht rückwärts laufen.
- spätere Ereignisse, Schäden, Positionen oder Folgen dürfen nicht vorzeitig sichtbar werden.
- jedes Bild beantwortet genau den aktuell gesprochenen Beat, nicht nur das allgemeine Video-Thema.
- jedes Bild hat einen primären Takeaway und muss schnell lesbar sein.
- Rückblenden sind nicht der Standard und benötigen einen ausdrücklichen Projekt-Override.

Der Flow-Prompt-Build, `validate:youtube-phase1` und Phase 3 blockieren neue Projekte, wenn dieses Gate nicht bestanden ist.

## Zentrale Dateien

- `02-TOPIC-SYSTEM.md` — Topic Director V3
- `03-SCRIPT-BIBLE.md` — History Storytelling V4 / Script-first
- `04-RESEARCH-POLICY.md` — Quellen / Unsicherheit
- `05-VIDEO-BLUEPRINT.md` — Produktionspfad
- `06-VISUAL-SYSTEM.md` — Narration-first Bildwelt
- `07-VISUAL-GRAMMAR.md` — Visual Form pro Story Beat
- `08-FLOW-PROMPTING.md` — Google Flow / Cover Gate
- `09-IMAGE-PROMPT-TEMPLATE.md` — Promptstruktur
- `10-STYLE-DNA-V2.md` — aktuelle Style DNA trotz Legacy-Dateiname
- `11-VISUAL-DIRECTOR.md` — Scene Cards
- `12-PROMPT-QC.md` — Prompt-QC >= 8/10
- `13-PREPRODUCTION-QUALITY-GATE.md` — technische Preproduction
- `14-PHASE3-ASSET-LOCK.md` — read-only Bilder in Phase 3
- `15-VISUAL-INTEREST-QC.md` — Anti-Monotonie / kontrollierter Text / Bild-QC
- `16-STORY-QUALITY-GATE.md` — Story statt Anekdoten-Kette
- `17-WHOLE-VIDEO-COHERENCE-GATE.md` — Fließtext + Gesamtsequenz + Erkläranteil
- `18-NARRATION-ALIGNMENT-GATE.md` — harte Bild-Skript-Passung + Chronologie + Klarheit
- `21-YOUTUBE-CAPTION-V2.md` — längere, kopierfertige YouTube-Beschreibungen für neue Projekte
- `99-DECISION-LOG.md` — chronologische Entscheidungen

## Maschinenlesbare Kernquellen

```text
config/channel-policy.json
config/topic-policy.json
config/visual-policy.json
config/narration-alignment-policy.json
config/flow-style-lock.json
config/pipeline.json
```

## Verbindlicher Produktionspfad

```text
30+ Themenideen
→ 12er Shortlist
→ Duplicate Check
→ TOPIC_SCORECARD APPROVED
→ Recherche
→ kompletter Voice-over-Fließtext
→ Read-aloud-QC
→ STORY_QC APPROVED
→ Story Beats aus dem fertigen Script ableiten
→ narrationBeat / timeContext / chronologyStep / visualAnswer
→ Narration Match >= 9 / Clarity >= 8
→ Viewer Takeaway / Visual Form
→ Shot Scale / Visual Energy / Change From Previous
→ explanationOnly markieren
→ Redaktionstext nur gezielt planen
→ WHOLE_VIDEO_QC V3 APPROVED
→ Prompt QC >= 8
→ Visual Interest >= 8
→ FLOW_WORLD_LOCK READY
→ Narration-Alignment-Gate
→ Flow Compiler V3
→ Phase 1 Full
→ Google Flow
→ finale Bilder prüfen
→ PHASE2_VISUAL_QC APPROVED + SHA-256
→ Phase 2
→ PHASE3_IMAGE_LOCK
→ Audio / Alignment / Timeline / Pacing
→ Remotion
→ FINAL_VIDEO + THUMBNAIL + CAPTION + SUBTITLES.srt
```

## Bildregeln

Neue Produktionen:

- max. 2 gleiche Visual Forms hintereinander
- max. 2 Character Scenes hintereinander
- max. 2 gleiche Shot Scales hintereinander
- max. 2 `explanationOnly=true` Visuals hintereinander
- 10-Bilder-Fenster normalerweise mindestens 3 Visual Forms
- jedes Bild braucht `visualEnergyDevice`
- jedes Bild braucht `visualInterestScore >= 8`
- jedes Bild braucht `narrationMatchScore >= 9`
- jedes Bild braucht `clarityScore >= 8`
- Bildwechsel müssen aus der Narration begründet sein, nicht nur aus dem Wunsch nach Abwechslung
- zukünftige Zustände/Ereignisse dürfen nicht vorzeitig im Bild auftauchen

### Bild 01

Nur exakter Covertext. Keine Bildnummer, Zusatzüberschrift oder Labels.

### Bild 02–NN

Standard: `NO_VISIBLE_TEXT`.

Gezielt erlaubt: `EDITORIAL_TEXT`, wenn in der Scene Card exakt freigegeben. Geeignet sind kurze Jahreszahlen, Daten, Orte, Zeitwechsel, Orientierung oder kurze Vergleiche.

Immer verboten:

- `BILD`, `IMAGE`, `SCENE`
- interne Bildnummern
- Prompt-Metadaten
- Wasserzeichen
- Pseudo-Schrift
- zusätzlicher nicht freigegebener Text

## Phase-2-Visual-QC

Bei neuen Projekten speichert `PHASE2_VISUAL_QC.json` pro Bild `fileName` + `sha256`.

Textprüfung folgt exakt der Scene Card:

- Cover → exakter Covertext
- NO_VISIBLE_TEXT → kein Text
- EDITORIAL_TEXT → exakt der freigegebene `editorialText`

Wird ein freigegebenes Bild ersetzt, fällt Phase 2 durch.

## Phase 3

Ab `PHASE3_IMAGE_LOCK` ist `00-bildprompts/images/` read-only. Bei Asset-Fehlern abbrechen und melden, niemals automatisch reparieren oder Bilder erzeugen.

## Export

```text
03-export/
FINAL_VIDEO.mp4
THUMBNAIL.png
CAPTION.txt
SUBTITLES.srt
```

Neue Projekte verwenden `youtubeUpload.captionPolicyVersion=2`: Beschreibung mit 450–1.400 Zeichen, mindestens zwei Absätzen und fünf Hashtags direkt am Ende. `CAPTION.txt` enthält bei diesen Projekten nur Titel und Beschreibung mit Hashtags, keine Keywords- oder Thumbnail-Text-Rubriken. Ältere Projekte bleiben unverändert.

Den kompilierten `google-flow-prompt.txt` nicht manuell pflegen; Quelldaten ändern und neu bauen.
