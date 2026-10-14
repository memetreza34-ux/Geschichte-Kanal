# Visual Interest QC — Hard Gate V2

## Zweck

Ein Bild darf nicht nur historisch korrekt und zum Satz passend sein. Es muss den gesprochenen Beat **visuell interessant, klar und sofort lesbar** unterstützen und zugleich in die Bildfolge des gesamten Videos passen.

Der Standard lautet nicht:

> Passt das Motiv irgendwie zum Text?

Sondern:

> Ist das die stärkste Umsetzung dieses Beats — und fühlt sie sich wie der nächste sinnvolle Schritt derselben Geschichte an?

---

## 1. Pflicht pro Scene Card

Neue Produktionen planen mindestens:

- `shotScale`
- `visualEnergyDevice`
- `visualChangeFromPrevious`
- `visualInterestScore`
- `visibleTextPolicy`
- `editorialText`
- `editorialTextPurpose`
- `explanationOnly`

`visualInterestScore` mindestens **8/10**.

---

## 2. Visuelles Interesse

Mögliche Mittel:

- klare Bewegungsrichtung
- Tiefenstaffelung
- Größenkontrast
- räumliche Falle / Blockade
- asymmetrische Komposition
- starke Silhouette
- Nahdetail
- extreme Übersicht
- Vorher/Nachher
- Ursache/Folge
- Objekt-Makro
- Cutaway
- Detail-Inset
- sichtbare Reaktion
- Reveal
- bedeutender Negativraum

Das Mittel muss zum Inhalt passen. Keine zufällige Effekthascherei.

---

## 3. Anti-Langeweile und Anti-Erklärketten

Harte Sequenzrichtwerte:

- maximal **2 gleiche Visual Forms** hintereinander
- maximal **2 Character Scenes** hintereinander
- normalerweise maximal **2 gleiche Shot Scales** hintereinander
- maximal **2 `explanationOnly=true` Visuals** hintereinander
- in 10 Bildern normalerweise mindestens **3 verschiedene Visual Forms**

### Präzisierung zur Shot Scale

`wide`, `medium` usw. beschreiben nur die grobe Bildweite. Drei gleiche Shot-Scale-Werte sind deshalb **nur ausnahmsweise** zulässig, wenn die Regie trotzdem eindeutig wechselt.

Bei drei gleichen Shot Scales hintereinander müssen alle folgenden Bedingungen erfüllt sein:

- jede Szene hat eine klar andere `camera` / Perspektive
- die drei Szenen nutzen mindestens drei unterschiedliche `visualForm`-Werte
- jede Scene Card benennt mit `visualChangeFromPrevious` eine echte sichtbare Veränderung

Beispiel einer zulässigen Folge:

```text
wide water-level view / character-scene
→ wide over-the-shoulder / battle-city-overview
→ wide elevated road view / cause-effect
```

Nicht zulässig:

```text
wide frontal character scene
→ wide frontal character scene
→ wide frontal character scene
```

Die Ausnahme soll echte Regievariation erkennen, nicht eine monotone Sequenz nachträglich rechtfertigen.

Nach einem kurzen abstrakten Erklärblock soll das Video wieder zu einer konkreten historischen Welt zurückkehren: Mensch, Ort, Objekt, Ereignis oder sichtbare Folge.

Abwechslung allein reicht nicht. Ein Wechsel ist nur gut, wenn er aus der Narration logisch folgt.

---

## 4. Shot Scale

Erlaubte Standardwerte:

- `extreme-wide`
- `wide`
- `medium-wide`
- `medium`
- `close`
- `detail`
- `top-down`
- `elevated-overview`
- `sectional`

---

## 5. Figurenbilder

Character Scenes sind erlaubt und wichtig, aber nicht der Default.

Ein Figurenbild braucht mindestens eines:

- konkrete Handlung
- Machtbeziehung
- sichtbare Reaktion
- räumliches Problem
- Entscheidung
- körperliche Arbeit
- Interaktion mit einem zentralen Objekt

Menschen sollen historische Folgen tragen, nicht nur dekorativ im Bild stehen.

---

## 6. Weirdness-/Plausibilitätscheck

Vor Freigabe prüfen:

- unbeabsichtigt albernes Gesicht / Pose?
- Hände oder Körper unverständlich?
- historische Situation plausibel?
- unfreiwillig komische Komposition?
- Klon-Nebenfiguren?
- Hauptmotiv sofort lesbar?
- wirkt das Bild wie Meme, Poster oder Schulbuchtafel?

Negativer Treffer → in Phase 2 neu generieren.

---

## 7. Sichtbarer Text — kontrolliert statt pauschal verboten

### Bild 01 (neue Projekte)

Die erste Szene erzählt Geschichte, **ohne** Covertext. Der exakte Covertext ist nur auf dem separaten Thumbnail erlaubt. Alte Projekte mit `firstSceneIsCover=true` dürfen Bild 01 weiterhin als Cover verwenden.

Immer verboten:

- `Bild 01`
- `BILD 01`
- `Image 01`
- `Scene 01`
- Zusatzüberschrift
- Wasserzeichen
- Pseudo-Schrift

### Bild 02 bis Bild NN

Standard:

```text
visibleTextPolicy = NO_VISIBLE_TEXT
```

Dann ist **null sichtbarer Text** erlaubt.

Gezielte Ausnahme:

```text
visibleTextPolicy = EDITORIAL_TEXT
editorialText = "1816"
editorialTextPurpose = "year"
```

Dann darf genau **dieser eine freigegebene Text** erscheinen und nichts anderes.

Geeignete Zwecke:

- `year`
- `date`
- `place`
- `time-jump`
- `short-comparison`
- `orientation`

Richtwert: höchstens **5 Wörter** und normalerweise nur eine Informationseinheit.

### Immer Hard Fail

- `BILD 11`
- `IMAGE 11`
- `SCENE 11`
- interne Nummern
- Prompt-Metadaten
- nicht freigegebene Zusatzlabels
- Wasserzeichen
- Pseudo-Schrift

---

## 8. Phase-2-Visual-QC

Neue Produktionen benötigen:

`99-technik/PHASE2_VISUAL_QC.json`

Pflicht pro Bild:

- Narration Support >= 8/10
- Visual Interest >= 8/10
- Style Consistency >= 8/10
- keine Weirdness
- keine sichtbare interne Bildnummer
- kein unerwarteter Text
- keine Pseudo-Schrift
- Bild freigegeben
- exakter SHA-256 bei hash-gated Projekten

Textprüfung:

- Neue Projekte: Thumbnail separat mit `PHASE2_VISUAL_QC.thumbnail` (SHA-256, exakter Covertext, Lesbarkeit, Style), `Bild 01` folgt der normalen Szenen-Textregel. Nur Legacy-Projekte prüfen den Covertext auf Bild 01.
- Für `figureReviewGateVersion>=1` muss pro Bild `prominentPeopleVisible` wahrheitsgemäß gesetzt sein; falls `true` oder `visualForm=character-scene`, müssen alle sechs Figurenprüfungen bestanden sein.
- `NO_VISIBLE_TEXT`: `visibleTextDetected=false`, `visibleTextExact` leer
- `EDITORIAL_TEXT`: `visibleTextDetected=true`, `visibleTextExact` = exakt freigegebener `editorialText`

Ohne vollständig freigegebenes Visual-QC darf Phase 3 nicht starten.

---

## 9. Gesamtsequenz

Einzeln gute Bilder können zusammen trotzdem schlecht sein. Deshalb zusätzlich `channel/17-WHOLE-VIDEO-COHERENCE-GATE.md` beachten.

Prüffrage bei jedem Übergang:

> Warum kommt dieses Bild genau jetzt?

„Damit es abwechslungsreich ist“ reicht nicht.

## Kurzformel

```text
Beat verstehen
→ bestes visuelles Mittel
→ klare Veränderung zum vorherigen Bild
→ kontrollierten Text nur bei echtem Nutzen
→ generieren
→ Passung / Weirdness / Text / Sequenz prüfen
→ freigeben
```
