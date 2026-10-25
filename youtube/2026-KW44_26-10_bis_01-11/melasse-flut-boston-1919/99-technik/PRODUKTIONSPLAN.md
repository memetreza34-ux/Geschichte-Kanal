# Produktionsplan — Melasse-Flut Boston 1919

Erstes Video nach **Story Engine V4** und **Bildplan V4** (`channel/24`, `channel/25`).

| | |
|---|---|
| Titel | Warum eine Welle aus Melasse 1919 Boston überrollte |
| Thumbnail-Text | TÖDLICHE WELLE AUS SIRUP |
| Modus | event-led mit Führungsfigur Isaac Gonzalez |
| Skript | 985 Wörter, ca. 5:50 Min. bei 1,05× |
| Bilder | 83, jedes mit eigenem Subjekt, eigener Kamera und eigenem `locationKey` |
| Figuren | Isaac Gonzalez, Arthur Jell, Hugh Ogden, George Layhe, Bridget Clougherty (`CAST_BIBLE.json`) |

## Status

- [x] Themenrunde (30 → 12 → 1), Scorecard 9,05 (PRIORITY)
- [x] Recherche mit Quellen (`RECHERCHE.md`)
- [x] `STORY_BLUEPRINT.json` + Skript, Story Engine bestanden
- [x] Figurenbibel, World Lock, 83 Scene Cards, Phase 1 bestanden
- [x] `00-bildprompts/google-flow-prompt.txt` mit ganzem Ablauf und kurzen Prompts (52 KB)
- [ ] Voice-over aufnehmen → `02-audio/`
- [ ] Figurenkarten in Flow erzeugen
- [ ] Thumbnail A/B/C → Auswahl → `00-bildprompts/thumbnail.png`
- [ ] 83 Szenenbilder → `00-bildprompts/images/Bild NN.png`
- [ ] Phase 2: echte Sichtprüfung jedes Bildes
- [ ] Phase 3: Audio, Alignment, Render, Export
- [ ] `POST_VIDEO_REVIEW.json`

## Workflow in Google Flow

1. In Flow die **Kanal-Stil-Referenz** `assets/style/kanal-stil-referenz.png` als Ingredient anhängen.
2. Die komplette `00-bildprompts/google-flow-prompt.txt` einfügen. Sie führt durch alle sieben Schritte:
   1. drei Cover-Varianten, dann STOPP
   2. du wählst eine, die anderen beiden werden gelöscht, die gewählte wird `thumbnail.png`
   3. fünf Figurenkarten als Ingredients (`@IsaacGonzalez` usw.)
   4. Szenenbilder in Zehnerschritten mit Cover und Stil-Referenz als Vorlage
   5. umbenennen in `Bild 01.png` bis `Bild 83.png`
   6. alles nochmal prüfen
   7. alle Bilder in einen Ordner `images`
3. Sind die ersten Bilder freigegeben, kann das beste Melasse-Bild als zusätzliche Vorlage dazukommen, damit kein Fachwerk aus London nach Boston wandert.

## Phase-2-Checkliste pro Bild

- Ist irgendwo Text, eine Zahl oder Pseudo-Schrift zu sehen? → neu erzeugen
- Stimmt die Epoche (1910er: Schiebermützen, lange Röcke, Gaslaternen, keine Dreispitze)?
- Sieht die Figur aus wie auf ihrer Figurenkarte?
- Kein Split-Screen, kein Rahmen, kein Bild-im-Bild?
- Opfer nur über Gegenstände und Abwesenheit, keine Körper?
- Vor Bild 41 (12:30 Uhr) ist der Tank intakt, keine Welle?
