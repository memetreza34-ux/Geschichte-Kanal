# Repository Agent Rules

## PREPRODUCTION — THEMA UND SCRIPT ZUERST

Neue Produktionen müssen vor Phase 1 die Topic- und Story-Gates bestehen.

Pflicht:

1. Duplicate Check ist nur Neuheitsprüfung, keine Qualitätsfreigabe.
2. Neue `TOPIC_SCORECARD.json` (Schema >= 2) braucht eine konkrete historische Story, menschliche/gesellschaftliche Stakes und einen Ereignisverlauf. Reine Mechanismus-Themen werden nicht freigegeben.
3. Das vollständige Voice-over wird zuerst als natürlicher Fließtext geschrieben.
4. Nicht für jedes geplante Bild einen separaten Satz schreiben.
5. Script einmal zusammenhängend lesen/prüfen und Stakkato-/Stichpunktwirkung entfernen.
6. Erst danach Story-Beats und Scene Cards ableiten.

## WHOLE-VIDEO COHERENCE — PFLICHT

Bei `wholeVideoCoherenceGateVersion >= 1` muss `99-technik/WHOLE_VIDEO_QC.json` vor Phase 1 APPROVED sein.

- Das Video muss als zusammenhängende Geschichte funktionieren, nicht als Sammlung einzelner korrekter Bilder.
- Normalerweise höchstens zwei `explanationOnly=true` Visuals direkt hintereinander.
- `explanationOnlyVisualShare` normalerweise höchstens 0.35.
- Nach abstrakten Erklärbildern wieder zu Mensch, Gruppe, Ort, Objekt, Ereignis oder sichtbarer historischer Folge zurückkehren.
- Alle Visual-Übergänge als Sequenz prüfen: Warum kommt genau dieses Bild jetzt?

Maßgeblich: `channel/17-WHOLE-VIDEO-COHERENCE-GATE.md`.

## SICHTBARER TEXT

- **Neue Projekte:** Bild 01–NN sind reine Narrationsszenen, grundsätzlich `NO_VISIBLE_TEXT` (außer explizit freigegebenem Redaktionstext). Das ausgewählte Cover ist ausschließlich `00-bildprompts/thumbnail.png`, nie Szene 1.
- Nur alte Projekte mit `coverPolicy.firstSceneIsCover=true` nutzen Bild 01 als Cover.
- `EDITORIAL_TEXT` ist gezielt erlaubt, wenn die Scene Card exakt `editorialText` und `editorialTextPurpose` vorgibt.
- Sinnvolle Fälle: Jahreszahl, Datum, kurzer Ort, Zeitwechsel, kurze Vergleichsangabe oder Orientierung.
- Nur den exakt freigegebenen Text rendern; kein zusätzlicher Text.
- `BILD`, `IMAGE`, `SCENE`, Bildnummern, Prompt-Metadaten, Wasserzeichen und Pseudo-Schrift sind immer harte Fehler.

## PHASE 2 — VISUAL-QC IST PFLICHT

Bevor Phase 3 gestartet werden darf, müssen alle finalen Bilder tatsächlich visuell geprüft werden.

1. Jedes Bild gegen Narration und Scene Card prüfen.
2. Prüfen, ob das Bild den gesprochenen Gedanken klar unterstützt und nicht nur thematisch ähnlich ist.
3. Prüfen, ob die gesamte Sequenz zusammenhängend wirkt und nicht wie zufällig gemischte Illustrationen.
4. Langweilige Wiederholung und lange Diagramm-/Erklärketten ablehnen.
5. Unbeabsichtigt alberne, übertrieben comicartige Gesichter, seltsame Körperproportionen, falsche Finger/Hände, unmögliche Griffe, steife Gestik und komische Kompositionen ablehnen. Für neue Projekte sechs Figuren-QC-Felder wahrheitsgemäß dokumentieren.
6. Generische Klon-Figuren ablehnen.
7. Sichtbaren Text exakt gegen die Scene Card prüfen.
8. Fehlerhafte Bilder werden in Phase 2 neu generiert und erneut geprüft.
9. Narration-Support, Visual Interest und Style Consistency mindestens 8/10.
10. Für hash-gated Produktionen `fileName` und SHA-256 jedes freigegebenen Bildes speichern.
11. Ohne vollständig freigegebene `PHASE2_VISUAL_QC.json` darf Phase 3 nicht beginnen.

## PHASE 3 — HARTE ASSET-SPERRE

Wenn der Nutzer sinngemäß `fang an`, `start`, `mach Phase 3` oder `render das Video` sagt:

1. Ausschließlich vorhandene finale Bilder aus `00-bildprompts/images/` verwenden.
2. In Phase 3 niemals neue Bilder erzeugen.
3. Bilder niemals regenerieren, bearbeiten, ersetzen, löschen, verschieben oder ergänzen.
4. Kein Bildgenerierungsmodell oder externes Bildtool als Fallback aufrufen.
5. Fehlt ein Bild, stimmt die Zahl nicht oder ist eine Datei ungültig: sofort abbrechen.
6. Fehler nicht selbst reparieren; dem Nutzer exakt melden.
7. `PHASE3_IMAGE_LOCK.json` schützt den Bildbestand per Hash.
8. Phase 3 darf Audio, Alignment, Timeline, Remotion-Render und Export bearbeiten, aber der Bilderordner bleibt read-only.

Kurzform: **erst flüssige Story, dann kohärente Visual-Sequenz; Phase 2 prüft und korrigiert, Phase 3 montiert nur freigegebene Assets.**
