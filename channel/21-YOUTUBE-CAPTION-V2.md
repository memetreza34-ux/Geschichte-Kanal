# YouTube Caption V2 — künftige Video-Uploads

**Gültigkeit:** Neue Videoprojekte mit `video.json.youtubeUpload.captionPolicyVersion=2`. Bestehende Videos werden nicht bearbeitet.

## Beschreibung schreiben

Die Beschreibung wird nach Recherche und Skript erstellt und soll den Zuschauer neugierig machen, ohne bloß den gesamten Sprechertext zu wiederholen.

- **Absatz 1:** Konkrete historische Ausgangssituation, Zeit/Ort falls relevant, eine starke Frage oder unerwartete Entwicklung.
- **Absatz 2:** Was passiert im Video wirklich? Wichtige Konflikte, Entscheidungen, Ursachen, Konsequenzen, glaubwürdige Details, natürliche Suchbegriffe.
- **Optional Absatz 3:** Historische Bedeutung und ergänzender Kontext, nur wenn es echten Mehrwert gibt.
- **Ganz unten:** Genau fünf sinnvolle, verschiedene Hashtags, alle mit `#`.

**Pflicht bei neuen Videos:** 450–1.400 Zeichen Beschreibungstext (ohne Hashtags), mindestens zwei Absätze und fünf unterschiedliche Hashtags. **Schreibziel:** idealerweise 500–1.000 Zeichen in gutem Deutsch. Kein Keyword-Stuffing, keine Füllsätze oder unbelegten Behauptungen, keine erfundenen Quellenlinks.

## CAPTION.txt

Die Upload-Datei ist direkt kopierbar. Sie enthält nur:

```text
TITLE:
Hier steht der YouTube-Titel

DESCRIPTION:
Erster ausführlicher Absatz zur historischen Ausgangslage.

Zweiter inhaltlicher Absatz über Handlung, Ursachen und Folgen.

#Geschichte #Beispiel #Historie #Thema #Zeitreise
```

Die Hashtags im Beispiel sind Platzhalter für **fünf individuell passende Hashtags**. Es gibt keine zusätzlichen Rubriken `KEYWORDS`, `THUMBNAIL_TEXT` oder `HASHTAGS`. Ein Thumbnail bleibt in `THUMBNAIL.png`, Tags können intern vorliegen, gehören aber nicht in den Beschreibungstext.

Die Exportlogik ist für alle Projekte schon aufgeräumt. Der neue **harte Qualitätscheck** läuft ausschließlich für `captionPolicyVersion=2` und blockiert Phase 1 und den finalen Export bei zu kurzen Beschreibungen, fehlenden Absätzen oder falschen Hashtags. Bestehende Videodateien und Metadaten werden nicht nachträglich geändert.
