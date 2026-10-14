# Google Flow Prompting — Flow Compiler V3 / Pipeline V4

## Ziel

Google Flow bekommt einen kompilierten Prompt aus geprüften Scene Cards, Channel Style Lock und Video World Lock.

Neue Grundregel:

> **Jedes BILD unterstützt den exakt zugeordneten gesprochenen Story-Beat. Die Visual Form wird wegen ihrer Aussage gewählt, nicht aus Gewohnheit.**

## Verbindliche Quellen

1. `config/flow-style-lock.json`
2. `channel/10-STYLE-DNA-V2.md`
3. `channel/06-VISUAL-SYSTEM.md`
4. `channel/07-VISUAL-GRAMMAR.md`
5. `channel/11-VISUAL-DIRECTOR.md`
6. `channel/12-PROMPT-QC.md`
7. `99-technik/FLOW_WORLD_LOCK.json`
8. `src/lib/flow-prompt.js`

## Kernpfad

```text
Script V3
→ Story Beat
→ Viewer Takeaway
→ bestes visuelles Mittel
→ Scene Card V2
→ Prompt QC >= 8/10
→ READY World Lock
→ Flow Compiler V3
→ Phase-1-Validator
→ Google Flow
```

## Channel Style Lock

Fixiert:

- handgezeichnete 2D-History-Explainer-DNA
- Ink-Linien
- flache gedeckte Farbwelt
- Cel-Shading
- Papier-/Tuschetextur
- Grad der menschlichen Vereinfachung
- Detailhierarchie
- Figuren-Individualitätsregeln

Der technische Style-ID bleibt `history-stickman-adaptive-v1`, aber Menschen sind **individuelle stilisierte historische Figuren**, keine generischen identischen Stickman-Klone.

### Figurenregel

- wiederkehrende Person → identifizierende Merkmale konstant
- unterschiedliche prominente Personen → sichtbar unterschiedliche Gesichter/Silhouetten/Kleidung/Haltung
- gleiche Rendering-DNA ≠ gleiche Figur
- Figuren nur einsetzen, wenn sie den Beat wirklich tragen

## Video World Lock

Fixiert innerhalb eines Videos:

- Orte
- wiederkehrende Figuren
- Props
- lokale Farben
- Zeit/Wetter
- räumliche Kontinuität

## Scene Direction

Pro Bild individuell:

- Viewer Takeaway
- Visual Form
- Visual Concept
- Dominant Subject
- Action / State
- Composition
- Camera
- Depth
- Lighting / Mood
- Supporting Elements
- Continuity
- Historical Accuracy

## Narration-first-Regel im Compiler

Der Master-Prompt sagt Flow ausdrücklich:

- Bild muss den aktuellen Story-Beat unterstützen
- keine Person nur zum Füllen des Bildes hinzufügen
- geplante Visual Form bewahren
- keine generische Character Scene aus einer Karte, Ursache/Wirkung oder Objektidee machen

## Unterstützte Visual Forms

Besondere Compiler-Guards existieren u. a. für:

- `comparison`
- `cause-effect`
- `process-sequence`
- `system-hierarchy`
- `battle-city-overview`
- `object-focus`
- `character-scene`
- `multi-moment-illustration`
- `detail-inset`
- `cutaway-section`
- `evidence-reconstruction`

### Detail Inset

Eine Hauptszene + genau ein untergeordnetes vergrößertes Detail. Keine Label-Tafel.

### Cutaway Section

Nur nutzen, um verborgene räumliche Struktur verständlich zu machen. Kein Corporate-/Schulbuch-Look.

### Evidence Reconstruction

Historischen Beleg/Überrest mit einer stilisierten Rekonstruktion verbinden. Unsichere Details nicht als sichere Tatsache darstellen.

## Konsistenz ohne Gleichförmigkeit

Dürfen variieren:

- Kamera
- Perspektive
- Hauptmotivposition
- Licht
- Wetter
- Tageszeit
- Stimmung
- Visual Form
- Aussehen nicht wiederkehrender Personen

Bleiben stabil:

- Illustrationstechnik
- Detailhierarchie
- menschlicher Vereinfachungsgrad
- wiederkehrende Figuren und Orte

## Keine generischen Style-Wörter

Blockiert/vermeiden:

```text
cinematic
epic
ultra detailed
hyper detailed
photographic
realistic lighting
depth of field
bokeh
```

Stattdessen konkrete Kamera-, Raum- und Lichtregie.

## Build

```bash
npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"
npm run validate:youtube-phase1 -- --dir "youtube/<week>/<slug>"
```

Den kompilierten Prompt nicht manuell umschreiben. Änderungen an Scene Card, World Lock, Cover oder Style Lock vornehmen und neu bauen.

## Anti-Gleichförmigkeitscheck

Vor Build Sequenz prüfen:

- zu viele Character Scenes hintereinander?
- gleiche Kamera ohne Grund?
- verschiedene Menschen sehen wie Klone aus?
- wäre Karte, Objekt, Übersicht, Detail, Cutaway oder Prozess besser?
- bleibt ein Bild stehen, obwohl die Narration bereits einen neuen Beat erreicht?

## Thumbnail-Gate (neue Projekte)

### Stage 1

- Genau drei eigene Thumbnail-Kandidaten mit demselben deutschen Covertext
- STOP und Nutzerauswahl
- Gewinner = `00-bildprompts/thumbnail.png`, außerhalb des Story-Bilderordners

### Stage 2

- **BILD 01 ist die erste normale Handlungsszene**, nicht mehr Cover
- BILD 01–NN erzeugen; alle nach Narration und Scene Card
- Visuelle Welt gleich halten; Cover ist keine Vorlage zum Klonen von Komposition oder Figuren
- Prominente Personen müssen natürlich proportioniert, glaubwürdig und untereinander unterscheidbar sein; QC lehnt übertriebene Comics, seltsame Hände und Gesichtsklone ab

## Textregel

BILD 01–NN: kein Covertext. Standard kein sichtbarer Text, keine Labels, Pseudo-Schrift, Wasserzeichen oder Bildnummern. Ausnahmen nur als expliziter `EDITORIAL_TEXT`-Eintrag. Alte Projekte mit `firstSceneIsCover=true` behalten ihre bisherigen Regeln.

## Definition of Done

Ein Flow-Prompt ist bereit, wenn:

1. jeder Beat einen klaren Viewer Takeaway besitzt,
2. die Visual Form die Narration wirklich unterstützt,
3. Scene Cards vollständig sind,
4. Prompt-QC >= 8/10 ist,
5. World Lock READY ist,
6. Figuren nicht als automatischer Fallback verwendet werden,
7. prominente nicht wiederkehrende Personen nicht wie Klone aussehen sollen,
8. Flow Compiler erfolgreich lief,
9. Cover-/No-Text-Regeln stimmen,
10. Phase 1 besteht.
