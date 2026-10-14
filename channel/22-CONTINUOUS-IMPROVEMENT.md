# Continuous Improvement — höchste Priorität nach JEDEM Video

**Oberste Arbeitsregel für Zeitkulisse:** Ein produziertes Video ist nicht nur ein Upload, sondern ein Test der Produktionspipeline. **Nach jedem fertig exportierten Video** werden konkrete Schwächen gesucht, mit Belegen bewertet, systematisch behoben und in den nächsten Produktionsdurchlauf übernommen. Die größte Priorität ist nicht blind mehr Bilder oder mehr Features, sondern **nachweisbar bessere nächste Videos**.

Keine Erfolgsmeldung ohne echten Video-Review. Keine Selbstnoten als Ersatz für echte Beobachtung. Keine erfundene Review-Zeit, keine erfundenen Video-Messwerte, keine frei erfundenen Nutzerreaktionen oder YouTube-Analytics.

## Pflichtreihenfolge

1. **Finalen Export sichern:** `FINAL_VIDEO.mp4`, `EXPORT_REPORT.json`, Video-SHA-256. Eine geplante Szene ist kein fertig geprüftes Bild.
2. **Video vollständig ansehen und hören:** Hook und Versprechen, Erzählfluss, Quellen, visualisierte Handlung, Stil/Konsistenz, Bilderabfolge, Pacing, Motion, Übergänge, Voice, YouTube-Verpackung. Zeitmarken notieren.
3. **Messung + Urteil trennen:** Reale Timeline-Zahlen (Dauer, Anzahl und Länge der Holds, schnelle/schleichende Abschnitte) von visueller Einzelfallbeurteilung unterscheiden; ohne echte Videoanalyse kein behauptetes „alles geprüft“.
4. **Befunde priorisieren:** mindestens drei konkrete, mit Timecode und Beobachtung belegte Schwachstellen / Verbesserungschancen. P0 = historisch falsch oder unbrauchbar; P1 = starke Zuschauerwirkung; P2 = Feinschliff. Auch gute Videos kritisch überprüfen, aber **keine Fehler erfinden**.
5. **Ursache statt Symptom:** Formuliere, **warum** der Fehler entstand (Skript, Prompt, Bildauswahl, Modelloutput, Generator, Timing, Motion, Export, fehlender QC-Schritt); nicht nur „Bild 19 sieht schlecht aus“.
6. **Mindestens einen echten Pipeline-Fix umsetzen:** Quelle der Wiederholung ändern (Template, Validator, Regie, Skriptpolitik oder Code), nicht einfach ein altes Video kosmetisch verbessern.
7. **Regressionstest und CI:** Vorher/Nachher erläutern; den Fehler testbar verhindern. Wenn semantische Bildqualität nicht vollautomatisch prüfbar ist, beschreibe konkrete visuelle Abnahme und automatisiere nur objektiv prüfbare Teilaspekte. Keine unbegründete „KI hat alles geprüft“-Behauptung.
8. **Lerntransfer:** mindestens zwei konkrete Regeln/Vorsätze für das nächste Video dokumentieren. Beim nächsten Thema, Skript, Scene Cards und Render tatsächlich anwenden; erfolgreiche Änderungen von Fehlannahmen unterscheiden.
9. **Review VERIFIED:** Erst nach Code-/Policyänderung und grüner CI den Review auf `VERIFIED` setzen. Sonst `PENDING_REVIEW` oder `IN_PROGRESS` beibehalten.
10. **Nächster Produktionsstart:** Wenn ein neu exportiertes Video noch kein gültiges Review besitzt, verhindert das Gate die reguläre Projekterstellung und neue Phase-1-Freigaben. Ältere Videos ohne Opt-in bleiben aus Kompatibilitätsgründen unberührt.

## Prioritäten pro Video

| Rang | Thema | Konkrete Prüffrage |
|---|---|---|
| P0 | Historische Wahrheit, grober Bildfehler, Leak, ausgelassene wichtige Bilder | Ist etwas falsch oder unverständlich? |
| P1 | Hook, Script, Story, Dramaturgie | Warum sollte der Zuschauer bis zum Schluss bleiben? |
| P1 | Bildwelt, Abwechslung, Handlung | Wiederholen sich ähnliche Bilder? Gibt es Leben, Farbe, konkrete Tätigkeit? |
| P1 | Bild-Sprecher-Passung, Chronologie | Zeigt das Bild genau das, was gerade erzählt wird? |
| P1 | Pacing, Motion, Schnitt, Audio | Sind die Wechsel natürlich, die Bewegungen koordiniert und der Sprecher verständlich? |
| P2 | Thumbnail, Titel, YouTube-Beschreibung, SRT | Kann ein Interessierter verstehen, worum es geht? |

Die Reihenfolge der Verbesserungen folgt **Wirkung × Häufigkeit × Schwere**, nicht der Bequemlichkeit einer Codeänderung.

## Pflichtdaten

Nach einem neuen Export entsteht `99-technik/POST_VIDEO_REVIEW.json` mit `status=PENDING_REVIEW`. Ein `VERIFIED`-Review enthält:

- Exakter SHA256 des **wirklich angesehenen** `FINAL_VIDEO.mp4`
- Video-Laufzeit, prüfende Person/Instanz, Zeitpunkt
- 8 Bewertungsperspektiven (keine automatisch erfundenen Scores)
- mindestens 3 priorisierte Befunde mit **timestampSeconds**, Beobachtung, Beleg und Ursache
- mindestens 1 verifizierte Systemverbesserung mit `findingId`, `policyOrCodePath`, `regressionTestPath`, **Vorher/Nachher** und tatsächlichem Prüfbeleg
- mindestens 2 konkret umsetzbare `nextVideoLessons`
- erfolgreiche CI mit konkreter Commit-/Workflow-Referenz

### Handhabung

```bash
# Nur nach tatsächlichem FINAL_VIDEO + EXPORT_REPORT:
npm run review:youtube -- --dir "youtube/<week>/<slug>" --init

# Bei neuen Projekten durch den Export automatisch angelegt.
# POST_VIDEO_REVIEW.json nach vollständigem Sichten/Fix ausfüllen und prüfen:
npm run validate:youtube-postmortem -- --dir "youtube/<week>/<slug>"

# Gesamten Verbesserungs-Rückstand prüfen:
npm run review:youtube -- --backlog
```

**Wichtig:** Nach `--init` stehen Scores und Findings leer. Die CLI sieht kein Video automatisch an, wertet keine privaten Analytics aus und ändert keine Bilder. Sie prüft Bericht und technische Belege. Reale Videoqualität muss tatsächlich gesichtet werden.

**Nach jeder Iteration:** Im nächsten Review ausdrücklich prüfen, ob der alte Fehler wieder aufgetreten ist. Bleibt er bestehen, wird die Ursache neu untersucht; nicht einfach den Gate-Schwellenwert senken.

## Sicherheit und Kompatibilität

- Hard-Gate ist nur für neue Projekte mit `postVideoImprovementGateVersion >= 1` aktiv; bereits vorhandene unmarkierte Projekte unverändert.
- Das geplante Paris-Longform wurde ausdrücklich bereits markiert; ältere London-Exports werden **nicht** geändert.
- Phase-3-Asset-Lock gilt weiterhin: Postvideo-Reviews können Regeln für spätere Produktionen ändern, aber **keine** Bilder im abgeschlossenen Phase-3-Bestand generieren, ersetzen oder manipulieren.
- Export bleibt ein fertiger Export, **kein** automatisch gut bewertetes Video. Review ist ein separater, nachgelagerter Schritt.
- Ein Video kann trotz bestandener technischer CI kreative Fehler haben. Die Reviewpflicht umfasst deshalb eine konkrete Sichtung und Befunde. Verbesserung ist ein Ziel; einen garantierten Zuschauererfolg kann kein Validator beweisen.
