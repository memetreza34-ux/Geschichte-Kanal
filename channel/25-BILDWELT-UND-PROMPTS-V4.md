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
  "referenceImage": "00-bildprompts/cast/pepys.png",
  "appearsIn": [8, 35, 52]
}
```

- `identity` steht auf Englisch, umfasst 12–45 Wörter und nennt Alter, Gesicht, Haare, Kleidung und Erkennungsmerkmal. Der Compiler setzt diesen Text **wortgleich** in jede Szene, in der die Figur vorkommt.
- `referenceImage` wird **vor** den Szenen einmal erzeugt: eine Figurenkarte mit Ansicht von vorne und im Dreiviertelprofil auf neutralem Hintergrund. In Google Flow wird sie als Ingredient gespeichert und mit `@Name` aufgerufen.
- Höchstens 5 Hauptfiguren pro Video. Mit mehr Figuren bricht die Konsistenz zusammen.
- Szenen aus der Gegenwart (z. B. der Ort heute) bekommen `modernScene=true` und damit keine Epochenkleidung und keine Epochen-Ausschlüsse.
- `eraWardrobe` (pro Video): 3–6 konkrete Kleidungsmerkmale der Epoche plus `eraForbidden`, z. B. für 1666: `tricorn hats, 18th-century powdered wigs`.

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

## 3. Prompt-Format V4 (Imagen-Leitfaden: Subjekt, Kontext, Stil)

Pro Szene eine eigene Datei `00-bildprompts/FLOW_PROMPTS/Bild NN.txt`. Der Inhalt enthält **keine** Bildnummer, keine Überschrift und keine Regeln für andere Bilder. Reihenfolge:

```text
1. Subjekt + Handlung      Who/what does what, in one sentence.
2. Ort + Zeit              Concrete place, year, time of day, weather.
3. Kamera                  Shot scale + viewpoint (from below, over-the-shoulder, aerial …).
4. Licht + Stimmung        One light source, one mood.
5. Figuren                 Identity text from CAST_BIBLE, word for word, @Name for Flow.
6. Stil-Anker              Short channel style anchor (one sentence).
7. Ausschlüsse             Text, letters, numbers, split screen, panels, border, frame, watermark + eraForbidden
```

Zielgröße: **350–1.200 Zeichen**. Schablonen-Sätze, die in jedem Prompt stehen, kommen höchstens einmal vor.

Ausschlüsse werden als Stichwortliste geschrieben, nicht als „no …“ oder „don’t …“. So empfiehlt es Googles Imagen-Leitfaden für Negative Prompts.

**Beispiel (London, Bild 35):**

```text
Samuel Pepys stands on a Thames riverbank writing in a small notebook while watching the burning city across the water.
London, 2 September 1666, morning, smoke-filled sky, boats loaded with furniture on the river.
Medium shot from slightly behind his shoulder, burning skyline in the background.
Warm orange firelight against cold grey morning, quiet tension.
@Pepys: 33-year-old English naval official, shoulder-length dark brown periwig, clean-shaven round face, dark wool coat with white linen falling band collar, 1660s breeches.
Hand-drawn 2D historical illustration, clean ink outlines, muted flat colors, subtle cel shading, paper texture.
Exclude: text, letters, numbers, captions, split screen, panels, border, frame, watermark, tricorn hats, 18th-century powdered wigs.
```

## 4. Schablonen-Erkennung

Das Bildplan-Gate blockiert Scene Cards, wenn …

- in einem Bild `visualConcept`, `actionState` und `viewerTakeaway` alle wortgleich sind,
- mehr als 25 % der Bilder denselben `composition`-Text haben,
- ein Szenenprompt länger als 1.200 Zeichen ist,
- eine Figur aus der `CAST_BIBLE` in der Szene genannt wird, aber in `castIds` fehlt.

## 5. Workflow in Google Flow

1. **Stil-Referenz:** Ein festes Kanal-Referenzbild (`config/visual-policy.json → visualPlanV4.channelStyleReferenceImage`) einmal erzeugen, als Ingredient anlegen und in jedem Video verwenden. So sehen London und die Ostseeflotte nach demselben Kanal aus.
2. **Figurenkarten:** Für jede Figur aus der `CAST_BIBLE` die Datei `00-bildprompts/FLOW_PROMPTS/CAST_<id>.txt` erzeugen, das Bild speichern und als Ingredient anlegen.
3. **Szenen:** Die Dateien `Bild NN.txt` einzeln in Flow einfügen, nie den ganzen Master-Prompt. Das Ergebnis wird als `Bild NN.png` gespeichert.
4. **Phase 2:** Bei jedem Bild prüfen: Ist irgendwo Text zu sehen? Stimmt die Epoche? Ist es dieselbe Figur? Wiederholt sich die Kamera?
