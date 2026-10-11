# Decision Log — Geschichts-Kanal

Chronologisches Register ausdrücklicher Kanalentscheidungen. **Neuere Entscheidungen ersetzen ältere**, wenn sie sich widersprechen.

## 2026-09-28 — Repo und Kanal

- `memetreza34-ux/Youtube-dingestickman` ist der konkrete Geschichts-Kanal.
- Positionierung: **History × Storytelling × Curiosity**.
- Geschichte wird über spannende Fragen, Entwicklungen und konkrete menschliche Situationen erzählt, nicht wie trockener Unterricht.
- Skripte starten direkt, erklären Ursache/Wirkung und beantworten die Ausgangsfrage.

## 2026-09-28 — Grundbildwelt V1

- Verbindlicher technischer Style-ID: `history-stickman-adaptive-v1`.
- Handgezeichnete 2D-History-Explainer-Welt.
- Historische Figuren, Karten, Architektur, Landschaften, Objekte, Systeme, Vergleiche und Symbolbilder sind gleichwertig.
- Historische Plausibilität vor dekorativer Coolness.
- Der Zeichenstil bleibt konstant; Epoche, Stimmung, Licht, Kamera und Komposition dürfen sich anpassen.

## 2026-09-29 — Bildprompt-Qualität

- Ein Bild braucht eine klare Kernaussage und bewusste visuelle Hierarchie.
- Maximal 1–3 notwendige Supporting Elements bei normalen Einzelmomenten.
- Keine Wimmelbilder, Museumstafeln oder überfüllten Schulbuchposter als Standard.
- Wiederkehrende Orte, Figuren, Räume und Props werden innerhalb eines Videos über Continuity/World Lock konstant gehalten.

## 2026-09-29 — Cover-Gate

- Bild 01 ist Cover + erste Szene.
- Cover-Text ist deutsch, kurz, exakt vorgegeben und gut lesbar.
- Flow erzeugt zuerst genau drei Cover-Kandidaten und stoppt danach.
- Flow wählt keinen Gewinner selbst.
- Erst nach ausdrücklicher Nutzerwahl dürfen Bild 02–NN erzeugt werden.

## 2026-09-30 — Visual Director V2

- Pflichtpfad: `Script → Aussage → Visual Concept → Visual Form → Composition → Camera → Mood/Light → Continuity → Prompt QC`.
- Scene Card V2 ist Pflicht.
- Prompt-QC Mindestscore **8/10**.

## 2026-09-30 — Flow Compiler V3

- Prompt-System: `flow-compiler-v3`.
- `config/flow-style-lock.json` ist die maschinenlesbare Channel-Zeichen-DNA.
- Jedes Video besitzt `99-technik/FLOW_WORLD_LOCK.json`.
- Der finale Prompt wird kompiliert, nicht frei improvisiert.
- Drift-Wörter wie `cinematic`, `epic`, `ultra detailed`, `photographic`, `realistic lighting`, `depth of field` und `bokeh` werden vermieden/blockiert.

## 2026-09-30 — Keine globalen Master-Referenzbilder

- Keine festen globalen Master-Referenzbilder.
- Wiedererkennung kommt aus Style Lock + Style DNA, nicht aus wiederholten Referenzkompositionen.
- Gleicher Stil bedeutet nicht gleiche Komposition.

## 2026-09-30 — Mehr Story-Beats und Mehrmoment-Illustrationen

- Planung folgt Story-Beats statt Absätzen.
- Mehrere eng verbundene Momente in einer Illustration sind erlaubt.
- Neue Visual Form: `multi-moment-illustration`.
- Ein Bild = ein klarer erzählerischer Takeaway, nicht zwingend nur ein einzelner Zeitpunkt.

## 2026-10-01 — Pipeline V4: noch höhere Bilddichte

Diese Entscheidung ersetzt die langsameren Richtwerte vom 30.09.

- Zielbereich durchschnittlicher Holds: ungefähr **2,5–4,2 Sekunden**.
- Ab **5,5 s** muss geprüft werden, ob die Narration bereits einen neuen visuellen Beat braucht.
- Ab **7 s** wird Split stark bevorzugt.
- **9 s** ist Hard-Max ohne klare visuelle Begründung.
- Richtwerte, nicht Quoten:
  - ca. 60 s → häufig 18–26 Visuals
  - ca. 90 s → häufig 24–34 Visuals
  - ca. 120 s → häufig 32–44 Visuals
- Inhalt gewinnt immer. Keine Füllbilder nur zum Erreichen einer Zahl.

## 2026-10-01 — Narration-first Visual Selection

- Jedes Bild muss den aktuell gesprochenen Gedanken direkt unterstützen, erklären, verstärken oder räumlich verständlich machen.
- Nicht zuerst „Welche Figur zeigen wir?“, sondern „Welches visuelle Mittel erklärt diesen Beat am besten?“
- Figuren sind niemals der Standard-Fallback.
- Gleichwertige Mittel sind u. a. Karte, Objektfokus, Architektur, Prozess, Ursache→Wirkung, Vergleich, räumliche Übersicht, Detail-Inset, Cutaway, Evidence-Reconstruction und Mehrmoment-Illustration.
- Neue unterstützte Visual Forms:
  - `detail-inset`
  - `cutaway-section`
  - `evidence-reconstruction`

## 2026-10-01 — Figuren: individueller, keine generischen Stickman-Klone

Diese Entscheidung ersetzt die frühere starke Betonung einer identischen Stickman-Grundfigur.

- Der technische Style-ID bleibt zur Kompatibilität `history-stickman-adaptive-v1`.
- Inhaltlich sind Menschen **stilisierte historische Figuren mit vereinfachter, aber menschlich lesbarer Anatomie**.
- Generische identische Stickman-Klone sind verboten.
- Prominente, nicht wiederkehrende Personen unterscheiden sich möglichst in mindestens drei Achsen: Alterseindruck, Gesicht, Haare/Bart, Kopfbedeckung, Größe/Statur, Kleidung, Ausrüstung oder Haltung.
- Wiederkehrende Hauptfiguren bleiben erkennbar und konsistent.
- **Gleicher Illustrator bedeutet nicht gleiche Person.**

## 2026-10-01 — History Storytelling V3

- Script Bible V3 ist aktiv.
- Einstieg bevorzugt mitten in einer konkreten historischen Lage.
- Kontext kommt just in time.
- Story Engine: `Problem → Entscheidung → Folge → neue Komplikation → Reveal/Wendepunkt → Auflösung → Bedeutung`.
- Informationen werden möglichst dann enthüllt, wenn sie narrativ Wirkung haben, statt die Lösung sofort vorwegzunehmen.
- Gegner und getäuschte Parteien behalten nachvollziehbare eigene Logik.
- Ende braucht Payoff statt bloßer Zusammenfassung.

## 2026-10-01 — Caption-/Upload-Datei im Export

- `03-export` enthält künftig zusätzlich **`CAPTION.txt`**.
- `CAPTION.txt` enthält mindestens:
  - YouTube-Titel
  - Beschreibung
- Optional zusätzlich:
  - Hashtags
  - Keywords
  - Thumbnail-Text
- `finalize-youtube-export.js` erzeugt die Datei automatisch aus `video.json.youtubeUpload`.
- Neue Projekt-Templates enthalten `youtubeUpload` von Anfang an.

## 2026-10-11 — Uploadbeschreibung für neue Videos

- Neue Videos bekommen **ausführlichere, konkrete YouTube-Beschreibungen** (450–1.400 Zeichen, mindestens zwei Absätze).
- **Genau fünf thematisch passende Hashtags** am Ende des Beschreibungstextes.
- Die Upload-Datei `CAPTION.txt` soll nur Titel, Beschreibung und die fünf Hashtags enthalten, ohne `KEYWORDS`, `THUMBNAIL_TEXT` und ohne eigene `HASHTAGS`-Überschrift.
- Nur neue Projekt-Templates erhalten `youtubeUpload.captionPolicyVersion=2`; die neue Qualitätsprüfung blockiert kurze oder unvollständige Beschreibungen ab Phase 1 und Export.
- Bereits vorhandene Projektdateien und veröffentlichte Videos werden **nicht nachträglich geändert**.
- Maßgeblich: `channel/21-YOUTUBE-CAPTION-V2.md`.

## Aktuelle Style-Autorität

```text
neueste Nutzerentscheidung / dieses Decision Log
→ config/flow-style-lock.json
→ channel/10-STYLE-DNA-V2.md
→ channel/06-VISUAL-SYSTEM.md
→ channel/07-VISUAL-GRAMMAR.md
→ videospezifische Scene Direction
```
