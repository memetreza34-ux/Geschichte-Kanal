# YouTube Caption V2 — Titel, Beschreibung, fünf Hashtags

**Gültig:** nur für künftige Projekte mit `video.json.youtubeUpload.captionPolicyVersion=2`; keine nachträgliche Änderung bestehender Videos.

## Ziel

Eine ausführliche, natürliche und **direkt für YouTube verwendbare Beschreibung**, die Neugier erzeugt und konkrete historische Inhalte ankündigt. Die Beschreibung ist **kein** zweites Skript und kein künstlich aufgefülltes SEO-Textfeld.

## Textaufbau

1. **Erster Absatz:** historische Situation (wenn zutreffend: Ort, Zeit), ungewöhnliche Wendung oder Kernfrage. Direkt und verständlich; kein „Willkommen auf meinem Kanal“.
2. **Zweiter Absatz:** mehrere konkrete Dinge, die im Video tatsächlich erklärt oder erzählt werden; Handlung, Ursache, Entscheidung oder Folge. Keine erfundenen Details, keine vollständige Spoiler-Zusammenfassung.
3. **Optional dritter Absatz:** historische Bedeutung oder ein sinnvoller Schlussgedanke; nur wenn zusätzlicher Mehrwert.
4. **Letzte Zeile:** genau fünf einzigartige und thematisch passende Hashtags, durch Leerzeichen getrennt.

**Länge des reinen Beschreibungstextes (ohne Hashtags):** 450–1.400 Zeichen, mindestens zwei natürliche Absätze. Kein leeres Füllmaterial nur zum Erreichen der Untergrenze.

## Pflichtqualität

- Stil: Deutsch, klar und professionell; kurzweilig, nicht reißerisch.
- Historische Angaben nur aus geprüfter Recherche und Voice-over, keine erfundenen Zahlen, Zitate, Fundstellen oder Links.
- Wichtige Eigennamen und Begriffe natürlich im Text verwenden; keine wiederholten Keyword-Ketten.
- Titel separat. Die Hashtags stehen direkt unter der Beschreibung, sodass **Beschreibung samt fünf Hashtags** in einem Schritt kopiert werden kann.
- Keine `KEYWORDS:`, `THUMBNAIL_TEXT:` und keine zusätzliche `HASHTAGS:`-Rubrik in Caption V2.

## Maschinenlesbarer Projektstandard

```json
{
  "youtubeUpload": {
    "captionPolicyVersion": 2,
    "title": "",
    "description": "",
    "hashtags": []
  }
}
```

Vor Phase 1 müssen die leeren Felder inhaltlich befüllt werden. `validate:youtube-phase1` prüft Länge, Absätze und genau fünf eindeutige Hashtags. `finalize:youtube-export` prüft erneut.

**CAPTION.txt (nur zukünftige Projekte):**

```text
TITLE:
<YouTube-Titel>

DESCRIPTION:
<Absatz 1>

<Absatz 2, bei Bedarf Absatz 3>

#Geschichte #Thema #Ort #Epoche #Historie
```

Hashtags im Beispiel müssen für das tatsächliche Video individuell und sinnvoll sein. `SUBTITLES.srt` bleibt eine separate Exportdatei.

## Legacy-Schutz

Ohne `captionPolicyVersion=2` verwendet der Export weiterhin das bisherige Format. Bestehende `video.json`-Dateien, `CAPTION.txt`-Dateien und bereits veröffentlichte Uploads **nicht** umschreiben.
