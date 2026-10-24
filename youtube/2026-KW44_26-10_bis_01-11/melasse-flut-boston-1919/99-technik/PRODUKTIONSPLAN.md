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
- [x] 83 Einzel-Prompts + 5 Figurenkarten in `00-bildprompts/FLOW_PROMPTS/`
- [ ] Voice-over aufnehmen → `02-audio/`
- [ ] Figurenkarten in Flow erzeugen
- [ ] Thumbnail A/B/C → Auswahl → `00-bildprompts/thumbnail.png`
- [ ] 83 Szenenbilder → `00-bildprompts/images/Bild NN.png`
- [ ] Phase 2: echte Sichtprüfung jedes Bildes
- [ ] Phase 3: Audio, Alignment, Render, Export
- [ ] `POST_VIDEO_REVIEW.json`

## Workflow in Google Flow

1. **Stil-Referenz:** `assets/style/kanal-stil-referenz.png` als Ingredient laden (siehe `assets/style/README.md`). Sind die ersten Melasse-Bilder freigegeben, das beste davon als zweite Referenz dazunehmen, damit kein Fachwerk aus London nach Boston wandert.
2. **Figurenkarten:** `FLOW_PROMPTS/CAST_isaac-gonzalez.txt` usw. einfügen. Die beste Variante unter `00-bildprompts/cast/<id>.png` speichern und in Flow als Ingredient mit dem Namen aus dem Prompt anlegen (z. B. `@IsaacGonzalez`).
3. **Thumbnail:** drei Varianten mit exakt „TÖDLICHE WELLE AUS SIRUP“. Dann STOPP, auswählen und als `00-bildprompts/thumbnail.png` speichern.
4. **Szenen:** `FLOW_PROMPTS/Bild 01.txt` bis `Bild 83.txt` **einzeln** einfügen. **Immer** die Stil-Referenz als Ingredient anhängen, bei `@Name` zusätzlich die Figurenkarte. Die Prompts sind bewusst kurz (Median 480 Zeichen): Aussehen und Stil kommen aus den Referenzbildern. Speichern als `images/Bild NN.png`.
5. Der lange technische Master-Prompt liegt bewusst in `99-technik/FLOW_MASTER_PROMPT.txt` und gehört **nicht** in Flow. Ein Master-Prompt am Stück hat in London die `BILD NN`-Texte ins Bild gebracht.

## Phase-2-Checkliste pro Bild

- Ist irgendwo Text, eine Zahl oder Pseudo-Schrift zu sehen? → neu erzeugen
- Stimmt die Epoche (1910er: Schiebermützen, lange Röcke, Gaslaternen, keine Dreispitze)?
- Sieht die Figur aus wie auf ihrer Figurenkarte?
- Kein Split-Screen, kein Rahmen, kein Bild-im-Bild?
- Opfer nur über Gegenstände und Abwesenheit, keine Körper?
- Vor Bild 41 (12:30 Uhr) ist der Tank intakt, keine Welle?
