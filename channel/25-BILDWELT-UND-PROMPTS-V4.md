# Bildwelt und Prompts V4

Ergänzt `06-VISUAL-SYSTEM.md`, `08-FLOW-PROMPTING.md` und `15-VISUAL-INTEREST-QC.md`. Gilt für Projekte mit `visualPlanGateVersion >= 1`.
Maschinenlesbar: `config/visual-policy.json → visualPlanV4`.

---

## 1. Figurenbibel: `99-technik/CAST_BIBLE.json`

Jede Figur, die mehr als einmal sichtbar ist, bekommt einen festen Eintrag:

```json
{
  "id": "pepys",
  "name": "Samuel Pepys",
  "identity": "33-year-old English naval official, shoulder-length dark brown periwig, clean-shaven round face, dark wool coat with white linen falling band collar, 1660s breeches",
  "tag": "naval official, brown periwig, band collar",
  "referenceImage": "00-bildprompts/cast/pepys.png",
  "appearsIn": [8, 35, 52]
}
```

- `identity` steht auf Englisch, umfasst 12–45 Wörter und nennt Alter, Gesicht, Haare, Kleidung und Erkennungsmerkmal. Sie steht **nur in der Figurenkarte** (`CAST_<id>.txt`), aus der das Referenzbild entsteht.
- `tag` (2–8 Wörter) sind die wichtigsten Erkennungsmerkmale. Der Compiler setzt `@Name (tag)` in jede Szene, in der die Figur vorkommt. Das Aussehen trägt das Referenzbild, nicht der Text.
- `referenceImage` wird **vor** den Szenen einmal erzeugt: eine Figurenkarte mit Ansicht von vorne und im Dreiviertelprofil auf neutralem Hintergrund. In Google Flow wird sie als Ingredient gespeichert und mit `@Name` aufgerufen.
- Höchstens 5 Hauptfiguren pro Video. Mit mehr Figuren bricht die Konsistenz zusammen.
- Szenen aus der Gegenwart (z. B. der Ort heute) bekommen `modernScene=true` und damit keine Epochenkleidung und keine Epochen-Ausschlüsse.
- `eraWardrobe` (pro Video): 3–6 konkrete Kleidungsmerkmale der Epoche zur Planung. In den Prompt kommt nur `eraTag` (2–8 Wörter, z. B. `1910s Boston working-class clothing`), und zwar nur in Szenen mit anonymen Menschen.
- `eraForbidden`: falsche Epoche, z. B. für 1666 `tricorn hats, 18th-century powdered wigs`. **Nach Wichtigkeit sortieren:** Nur die ersten 3 kommen in jeden Prompt (`maxEraExclusions`).

## 2. Orte und Kameraplan

Jede Scene Card bekommt ein `locationKey`, z. B. `pudding-lane-bakery-street`.

| Regel | Grenzwert |
|---|---|
| Derselbe `locationKey` mit gleichem `shotScale` direkt hintereinander | höchstens 2 |
| Anteil eines einzelnen `locationKey` am Video | höchstens 20 % |
| Kartenanteil (`visualForm=map-geography`) | höchstens 12 % |
| Split-Screen, Panels, Bild-im-Bild | nur mit `splitScreenApproved=true` und Begründung |

Wenn ein Ort wiederkommt, wechselt die **Kamera**: von oben, vom Boden, aus dem Fenster, von hinten, über die Schulter einer Figur, Nahaufnahme eines Details. Ein wiederkehrender Ort bleibt erkennbar, aber nie als dieselbe Postkarte.

**Karten sparsam einsetzen:** Eine Karte zeigt eine **Veränderung**, z. B. die Route bis hierher oder die Ausbreitung des Feuers. Drei ähnliche Weltkarten hintereinander sind verboten. Besser ist der Blick aus dem Bullauge, der zeigt, wo die Flotte gerade ist.

## 3. Prompt-Format V4 kompakt: kurz, aber volle Qualität

**Methode:** Alles, was in jeder Szene gleich wäre, trägt ein **Referenzbild** statt Text. Der Text beschreibt nur, was diese eine Szene einzigartig macht.

| Wird getragen von | Inhalt |
|---|---|
| Stil-Referenzbild (Ingredient) | Strich, Farben, Textur, Proportionen |
| Figurenkarte (Ingredient `@Name`) | Gesicht, Haare, Kleidung der Figur |
| **Prompt-Text** | Handlung, Ort und Zeit, Licht, Kamera, kurzer Stil-Anker, die wichtigsten Ausschlüsse |

Pro Szene eine eigene Datei `00-bildprompts/FLOW_PROMPTS/Bild NN.txt`, ohne Bildnummer und ohne Überschrift:

```text
1. Subjekt + Handlung       Who/what does what, in one sentence.
2. Ort, Zeit, Licht         Concrete place, year, time of day, one light mood.
3. Kamera                   Shot scale + viewpoint.
4. Figuren                  @Name (tag) – nur wenn die Figur sichtbar ist.
5. Epoche                   People in <eraTag> – nur bei anonymen Menschen.
6. Stil + Ausschlüsse       Short style anchor. Exclude: text, letters, numbers, split screen, border, watermark, photorealism + top 3 eraForbidden.
```

Zielgröße: **150–600 Zeichen** (Gate). Beim Melasse-Video sank der Median damit von rund 830 auf 480 Zeichen (−43 %), ohne dass eine szenenspezifische Angabe wegfiel.

Ausschlüsse werden als Stichwortliste geschrieben, nicht als „no …“ oder „don’t …“. So empfiehlt es Googles Imagen-Leitfaden für Negative Prompts.

**Beispiel (Melasse, Bild 29, 506 Zeichen):**

```text
Isaac Gonzalez turns a large iron valve wheel at the base of the tank with both hands, lit by a small lantern.
Boston, a summer night in 1918, moonlight and a single lantern.
Close view of his hands and the wheel, face half in shadow.
@IsaacGonzalez (young laborer, grey flat cap, thin mustache).
Hand-drawn 2D ink illustration, muted flat colors, paper texture, natural proportions. Exclude: text, letters, numbers, split screen, border, watermark, photorealism, modern clothing, post-1920 cars, tricorn hats.
```

**Wichtig:** Das funktioniert nur, wenn in Flow die Ingredients angehängt sind (Stil-Referenz immer, Figurenkarte bei `@Name`). Ohne Referenzbild ist der kurze Prompt zu vage.

## 4. Schablonen-Erkennung

Das Bildplan-Gate blockiert Scene Cards, wenn …

- in einem Bild `visualConcept`, `actionState` und `viewerTakeaway` alle wortgleich sind,
- mehr als 25 % der Bilder denselben `composition`-Text haben,
- ein Szenenprompt länger als 600 Zeichen ist,
- eine Figur aus der `CAST_BIBLE` in der Szene genannt wird, aber in `castIds` fehlt.

## 5. Workflow in Google Flow

1. **Stil-Referenz:** Ein festes Kanal-Referenzbild (`config/visual-policy.json → visualPlanV4.channelStyleReferenceImage`) einmal erzeugen, als Ingredient anlegen und in jedem Video verwenden. So sehen London und die Ostseeflotte nach demselben Kanal aus.
2. **Figurenkarten:** Für jede Figur aus der `CAST_BIBLE` die Datei `00-bildprompts/FLOW_PROMPTS/CAST_<id>.txt` erzeugen, das Bild speichern und als Ingredient anlegen.
3. **Szenen:** Die Dateien `Bild NN.txt` einzeln in Flow einfügen. Der lange technische Master-Prompt liegt bei V4-Projekten in `99-technik/FLOW_MASTER_PROMPT.txt` und gehört nicht in Flow. Das Ergebnis wird als `Bild NN.png` gespeichert.
4. **Phase 2:** Bei jedem Bild prüfen: Ist irgendwo Text zu sehen? Stimmt die Epoche? Ist es dieselbe Figur? Wiederholt sich die Kamera?
