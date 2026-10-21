# Recherche und sichtbare Szenenbelege

Gilt für neue Projekte mit `schemaVersion=5` und `creativeEvidenceVersion=1`. Bestehende Produktionen werden nicht migriert oder neu gerendert. Neue Projekte immer mit `create:youtube` aus der aktuellen Vorlage starten; Generatoren in alten Videoordnern sind keine freigegebenen Vorlagen.

## Zuständigkeit

Ausdrückliche Nutzerentscheidung vom 21.10.2026: Codex bearbeitet Phase 1 und Phase 3. Phase 1 liefert Recherche, fertiges Skript, Szenenplanung und Bildprompts im bestehenden Kanalstil. Der Nutzer erzeugt sämtliche Bilder, Thumbnails und Audiodateien selbst mit seinen KI-Werkzeugen. Codex führt keine Bild- oder Sprachgenerierung aus. Die Anweisungen im Flow-Prompt sind eine Übergabe an das Werkzeug des Nutzers. Phase 3 verarbeitet ausschließlich dessen bereitgestellte finale Dateien. Ein neues Thema wird vorher mit dem Nutzer abgestimmt.

## Reihenfolge und Freigaben

1. Quellen und historische Aussagen in `RESEARCH_EVIDENCE.json` dokumentieren. Eine URL allein reicht nicht: konkrete Fundstelle und inhaltlicher Beleg sind Pflicht. Interpretation und Unsicherheit im Skript kenntlich machen.
2. Vollständigen gesprochenen Fließtext schreiben. Leitfrage, menschliche/gesellschaftliche Folgen und Ursache → Entscheidung → Folge prüfen. Der Anfang eröffnet ein konkretes Problem, der Schluss beantwortet es. Keine vorgeschriebene Sekundenzahl und kein Bild pro Satz.
3. Skript tatsächlich als zusammenhängenden gesprochenen Text prüfen. Reviewer, Zeitpunkt, exakte Skriptbelege und Beobachtungen in `CREATIVE_REVIEW.json.script` festhalten. `scriptSha256` und `researchFingerprint` binden die Freigabe an diesen Stand.
4. Erst danach `mapping.planningStartedAt` setzen und Scene Cards ableiten. Ein Bild bekommt eine eigene Erkenntnis und einen sichtbaren Beleg. Eine wechselnde Formbezeichnung allein ist keine neue Bildidee. Sinnvolle zusammenhängende Vorher-/Nachher-Paare dürfen ihre Perspektive behalten.
5. Ganze Sequenz prüfen. `CREATIVE_REVIEW.json.sequence` protokolliert konkrete Beobachtungen und den aktuellen `planFingerprint`. Änderungen an Skript, Recherche, Bildwelt oder geplanten Szenen machen die Freigabe ungültig. Später gemessene Alignment-Zeiten ändern den geplanten Inhalt nicht.
6. Bilder wirklich ansehen. In `PHASE2_VISUAL_QC.json` neben SHA-256 und Bewertungen auch `reviewer`, `reviewedAt`, `planFingerprint` und pro Bild konkrete Sichtbefunde erfassen: `narrationEvidence`, `continuityEvidence`, `historicalEvidence`, `textEvidence`. Ein Generator darf weder diese Befunde noch APPROVED-Zustände erfinden. Dokumentierte Prüfungen ersetzen nicht die Sichtung.

Die vorhandenen Topic-, Story-, Whole-Video- und Stilprüfungen gelten zusätzlich. Das neue Gate prüft die Nachvollziehbarkeit; es kann nicht automatisch beweisen, dass eine Quelle richtig gelesen oder ein Bild aufmerksam angesehen wurde.

## Datenbeispiele

`RESEARCH_EVIDENCE.json` enthält folgende Strukturen. IDs und Belege müssen projektspezifisch ausgefüllt werden:

```json
{
  "schemaVersion": 1,
  "sources": [{
    "id": "building-record",
    "title": "Amtlicher Eintrag zum historischen Bauwerk",
    "url": "https://historicengland.org.uk/listing/the-list/list-entry/1079157",
    "locator": "Baugeschichte: Neubau nach dem Brand, errichtet 1675–1710"
  }],
  "claims": [{
    "id": "later-dome",
    "statement": "Die heute bekannte Kuppel entstand erst nach dem Brand von 1666.",
    "sourceIds": ["building-record"],
    "evidence": "Der Eintrag datiert den Neubau auf 1675–1710.",
    "certainty": "supported"
  }],
  "visualReferences": [{
    "id": "old-cathedral",
    "sourceId": "building-record",
    "description": "Das Baujahr schließt den späteren Kuppelbau in einer Szene von 1666 aus; für die damalige Form zusätzliche zeitgenössische Ansichten recherchieren.",
    "mustShow": ["Die für den dargestellten Zeitpunkt belegte Bauform"],
    "mustAvoid": ["Die spätere Kuppel des nach 1675 errichteten Neubaus"]
  }]
}
```

Jede Scene Card ergänzt `sequenceId`, `beatFunction` (orientation/cause/decision/action/reaction/consequence/evidence/payoff), `knowledgeChange`, `visibleEvidence`, `claimIds`, `visualReferenceIds`, `focusPoint`, `continuity` und `overlays`.

Wiederkehrende Objekte erhalten in `FLOW_WORLD_LOCK.json.entities` eine feste `id`, eine konkrete `identity` und einen `initialState`. Jede erneute Darstellung führt den letzten Zustand weiter:

```json
{
  "sequenceId": "blocked-road",
  "beatFunction": "consequence",
  "knowledgeChange": "Der Wagen erreicht das Tor wegen der Sperre nicht.",
  "visibleEvidence": "Der beladene Wagen steht vor der geschlossenen Holzbarriere.",
  "claimIds": ["supply-blocked"],
  "visualReferenceIds": ["period-gate"],
  "focusPoint": {"x": 0.35, "y": 0.6},
  "continuity": [{"entityId": "road", "fromState": "Frei befahrbare Zufahrtsstraße", "toState": "Holzbarriere sperrt die Zufahrtsstraße"}],
  "overlays": [{"type": "label", "text": "Stadttor", "x": 0.75, "y": 0.2, "purpose": "Ziel der blockierten Zufahrt eindeutig benennen"}]
}
```

Der Validator erkennt deklarierte Zustandssprünge. Die Sichtprüfung muss zusätzlich feststellen, ob der Bildinhalt dazu passt. Zustände niemals einfach leer lassen, um Kontinuitätsfehler zu umgehen.

## Beschriftung, Routen und Kamera

Neue Storybilder bleiben `NO_VISIBLE_TEXT`. Keine KI-Schrift für Jahreszahlen und Ortsnamen: geprüfte Wörter über `overlays` setzen. Ein `label` hat exakten Text, normierte x/y-Position und Zweck. Eine `route` hat 2–12 normierte `points` und Zweck. Höchstens vier Orientierungselemente; keine Beschriftung als Dekoration. Die Quelle muss auch Kartenlage und Route stützen. Das separate Thumbnail behält seinen eigenen Text und das bestehende Auswahlverfahren.

`focusPoint` steuert den Kamerafokus tatsächlich. Bild, Beschriftungen und Routen bewegen sich gemeinsam. Die Bewegung wird an den Bildrändern begrenzt, damit kein schwarzer Rand aufzieht. Ein ruhiges Bild bleibt zulässig, wenn der Blick seine Aussage verstehen muss.

Mit `npm run preview:youtube-plan -- --dir "<projekt>"` entsteht `99-technik/STORYBOARD.html`. Sie zeigt Skript, Bildidee, historischen Beleg, Zustandsänderung und vorhandene Bilder. Der Befehl gibt die aktuellen Fingerprints aus und erteilt keine Freigabe. Hashes erst nach tatsächlicher Prüfung in die Review-Dateien übernehmen.

Neue Audiovorlagen verwenden normale Sprechgeschwindigkeit und erhalten innere Pausen (`playbackRate=1`, `preserveInternalPauses=true`). Ein- und Auslauf werden bereinigt, die Lautheit wird geprüft. Geschwindigkeit oder Pausen erst nach Anhören projektspezifisch ändern; kürzer bedeutet nicht automatisch besser.

## Grundlage

Die Recherche vom 20.10.2026 ist in `KREATIV-ANALYSE-2026-10-20.md` dokumentiert, mit öffentlichen Referenzvideos, eigenen Bildbefunden und Grenzen der Untersuchung. Öffentliche Beispiele zeigen beobachtbare Gestaltung, keine internen Prompts der Vergleichskanäle. Aus diesen Beispielen wird keine feste Schnittfrequenz abgeleitet.

YouTubes [Retention-Hilfe](https://support.google.com/youtube/answer/9314415) beschreibt die Auswertung des tatsächlichen Zuschauerverlaufs. Die Forschung zu [lernwirksamen Videos](https://doi.org/10.1187/cbe.16-03-0125) stützt klare Blickführung und das Vermeiden unnötiger visueller Belastung; sie belegt keine garantierten YouTube-Ergebnisse. Bauzeiten werden am [amtlichen Eintrag von St Paul’s](https://historicengland.org.uk/listing/the-list/list-entry/1079157) geprüft.
