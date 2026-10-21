# Repository-Analyse: Geschichte-Kanal

Prüfdatum: 20. Oktober 2026. Repository: [memetreza34-ux/Geschichte-Kanal](https://github.com/memetreza34-ux/Geschichte-Kanal). Geprüfter Stand: [`09eee4f`](https://github.com/memetreza34-ux/Geschichte-Kanal/commit/09eee4f18f0619508218a1a18e7d96fd7b731b7d), letzter Commit vom 14. Oktober 2026.

## Urteil

Eine gut ausgearbeitete redaktionelle und visuelle Produktionsgrundlage. Die technische Absicherung hat jedoch Lücken bei Löschpfaden, Freigaben, Audio-Zuordnung, Bildintegrität und Exportprüfung. Für einen verlässlichen wiederholten Produktionsbetrieb sollten diese zuerst geschlossen werden.

Das größte systemische Problem: Manche Qualitätsregeln prüfen automatisch erzeugte Bestätigungen statt belastbarer Review-Ergebnisse. Mehr Regeln allein würden dieses Problem nicht lösen.

## Was tatsächlich geprüft wurde

- Repository-Inventar mit 320 versionierten Dateien, Architektur, zentrale Konfiguration, Produktionsanweisungen und CI.
- Ausführbare Pipeline unter `src/`, einschließlich Projektanlage, Themenprüfung, Prompt-Build, Qualitätsprüfungen, Bildlock, Audio, Alignment, Timeline, Renderer und Export.
- Vorhandene Tests sowie Phase-1-Prüfung aller zwölf Produktions- und Testprojekte.
- Redaktionelle Regeln und konkrete Beispiele, insbesondere Ostseeflotte und Pariser Ballonpost. Dies ist keine unabhängige Verifikation sämtlicher historischen Aussagen.
- Isolierte Fehlernachweise in temporären Testordnern. Bei Löschtests wurden ausschließlich selbst erzeugte Testdateien verwendet.

**Ergebnisse:** Node 24.15.0; `npm test`: **72 bestanden, 0 fehlgeschlagen**. Die letzten fünf abgefragten GitHub-CI-Läufe waren erfolgreich; der aktuelle [Node-CI-Lauf](https://github.com/memetreza34-ux/Geschichte-Kanal/actions/runs/38526319117) gehört zum geprüften Commit.

**Grenze:** Im geprüften Git-Stand liegen keine fertigen Bild-, Audio- oder Videodateien, keine `EXPORT_REPORT.json` und keine `POST_VIDEO_REVIEW.json`. Es wurde kein vollständiger Remotion-Render durchgeführt. Bildwirkung, Stimmqualität, tatsächliche Synchronität und Zuschauerbindung sind damit nicht beurteilbar. Fehlende Medien im Repository beweisen nicht, dass außerhalb des Repositories keine Produktionen existieren.

Die untersuchten Quelldateien wurden nicht verändert. Dieser Bericht und die zugehörige Ergebnisdatei sind neue Analyseartefakte.

## Stärken

1. **Klare redaktionelle Richtung.** Geschichte wird über konkrete Fragen, Entwicklung und Folgen erzählt. Die Script Bible verlangt zusammenhängende Sprache, sinnvollen Kontext und ein Ende, das die Ausgangsfrage beantwortet.
2. **Sinnvolle visuelle Planung.** Bildform, Blickwinkel, Narrationsbezug, historische Zeit und Kontinuität werden ausdrücklich geplant. Figuren müssen nicht jede Szene dominieren.
3. **Gute Grundidee für Asset-Schutz.** Bildfreigaben sind an SHA-256 gebunden. Ein vorhandener Phase-3-Lock lässt sich nach einem Bildaustausch nicht still neu schreiben. Dafür existieren sinnvolle Regressionstests.
4. **Sorgfalt bei Recherchematerial.** Die Pariser Recherche dokumentiert widersprüchliche Quellenzahlen und vermeidet eine künstlich genaue Zahl. Sie benennt konkrete Bildfehler wie Heißluftbrenner oder einen Eiffelturm im Jahr 1870. Die historische Richtigkeit dieser Angaben wurde hier nicht separat geprüft.
5. **Nachgelagerte Verbesserung ist vorgesehen.** Neue Exportreviews starten ohne erfundene Beobachtungen als `PENDING_REVIEW`. Konkrete Befunde, Ursachen und Lerntransfer sind ausdrücklich verlangt.
6. **Überschaubarer Code.** Die Aufteilung in `channel/`, `config/`, `src/`, `test/` und konkrete Produktionen ist verständlich. Die Pipeline benötigt für ihre Logik keine unnötig komplexe Serverarchitektur.

## Konkrete Fehler, nach Priorität

P1 = vor der nächsten produktiven Nutzung beheben. P2 = relevante Zuverlässigkeitslücke. Dies ist eine Priorisierung für dieses Produktionswerkzeug, keine Behauptung einer öffentlich erreichbaren Sicherheitslücke.

### 1. P1: Render-Vorbereitung kann außerhalb ihres Arbeitsordners löschen

**Stelle:** [render-youtube.js, Zeile 11](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/render-youtube.js#L11).

`meta.videoId` fließt ungeprüft in `path.resolve('public', '__render', meta.videoId)`. Anschließend wird dieses Verzeichnis rekursiv gelöscht. Eine fehlerhafte ID mit `../` kann den vorgesehenen Ordner verlassen.

**Nachweis:** Mit `videoId='../../victim'` wurde eine selbst erzeugte Markerdatei in einem benachbarten Testordner gelöscht. Der Aufruf blieb erfolgreich.

**Korrektur:** Video-ID als einfachen Bezeichner validieren; Trennzeichen und Punktsegmente verbieten. Vor jeder Löschung zusätzlich sicherstellen, dass das Ziel ein echter Unterordner von `public/__render` ist und nicht der Basisordner selbst. Die bereits vorhandene Pfadschutzfunktion kann dafür ergänzt und verwendet werden.

### 2. P1: Generatoren vergeben ihre eigenen Qualitätsfreigaben

**Stelle:** [Ostseeflotten-Generator, Zeile 165](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/youtube/2026-KW42_12-10_bis_18-10/baltische-flotte-1905/99-technik/generate-longform-plan.mjs#L165); auch London und Paris enthalten dieses Muster.

Der Generator setzt unter anderem `status='APPROVED'`, `scriptReadAloudPassed=true`, `approved=true` und eine feste Kohärenznote. Szenen erhalten konstante Noten wie `narrationMatchScore:9.5` und `visualInterestScore:9.2`.

**Folge:** Ein erneuter Generatorlauf erzeugt wieder eine Freigabe, auch nach inhaltlichen Änderungen. Der Code führt die behauptete redaktionelle Kontrolle nicht aus. Aus diesen Feldern lässt sich keine unabhängige Prüfung ableiten. Das beweist nicht, dass nie eine manuelle Prüfung stattgefunden hat; der Generator kann sie jedoch weder belegen noch nach Änderungen erhalten.

**Korrektur:** Generatoren erzeugen ausschließlich Entwürfe mit offenen Bewertungen. Ein separater Reviewschritt speichert Prüfer, Datum, konkrete Beobachtungen sowie Hashes von Skript und Szenenplan. Änderungen an diesen Eingaben machen die Freigabe ungültig.

### 3. P1: Alignment-Cache ignoriert Änderungen an Szenen und Ankern

**Stelle:** [auto-align-youtube.js, Zeile 52](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/auto-align-youtube.js#L52).

Für die Wiederverwendung genügt dieselbe Audiodatei mit einem früheren `passed=true`. Änderungen an Ankern, Szenenzahl, Reihenfolge, Sprache oder Modell werden nicht vollständig berücksichtigt. Auch das aktuelle Mapping wird vor der Rückgabe nicht auf gültige Zeitwerte geprüft.

**Nachweis:** Geänderte Anker und `actualStartSeconds=null` wurden mit passendem Audiohash als `reused=true` zurückgegeben. Auch ein anderes angefordertes Modell erzwang keine Neuberechnung.

**Folge:** Nach einer Überarbeitung können alte Bildwechsel weiterverwendet werden oder spätere Schritte scheitern, obwohl Alignment als bestanden gilt.

**Korrektur:** Den Cache an die relevanten Eingaben binden: Audiohash, Skript-/Ankerstand, Bildreihenfolge, Sprache und Modell. Wiederverwendete Zeiten müssen vollständig, endlich und monoton sein.

### 4. P1: Direkter Render-Aufruf umgeht die Qualitätsprüfungen

**Stelle:** [render-youtube.js, Zeile 48](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/render-youtube.js#L48).

Der Gesamtablauf `phase3:youtube` führt mehrere Prüfungen aus. Das ebenfalls angebotene `render:youtube` ruft dagegen direkt `prepareRender()` und Remotion auf. Bildfreigabe, Bildlock, Audiozustand und Timeline werden dort nicht eigenständig verifiziert.

**Nachweis:** Die Render-Vorbereitung akzeptierte ein isoliertes Projekt ohne Phase-2-Freigabe und ohne Bildlock. Ein tatsächlicher Remotion-Render war für diesen Nachweis nicht nötig und wurde nicht ausgeführt.

**Korrektur:** Gemeinsame Vorbedingungen unmittelbar vor jedem Render prüfen, unabhängig vom aufrufenden CLI-Befehl. Zusätzlich den tatsächlich kopierten Render-Bildbestand gegen den freigegebenen Bestand verifizieren.

### 5. P2: Bild-QC kann seine Mindestnoten selbst absenken

**Stelle:** [validate-youtube-phase2.js, Zeile 25](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/validate-youtube-phase2.js#L25).

Die Mindestwerte werden aus dem zu prüfenden QC-Dokument gelesen. Die Vorgabe von mindestens 8/10 wird dadurch nicht als feste Untergrenze durchgesetzt.

**Nachweis:** Ein Bild mit drei Qualitätsnoten von jeweils 0 fiel zunächst durch. Nach Ergänzung von `minimumNarrationSupportScore:0`, `minimumVisualInterestScore:0` und `minimumStyleConsistencyScore:0` bestand derselbe Datensatz die Phase-2-Prüfung.

**Korrektur:** Verbindliche Untergrenzen aus zentralen Policies lesen. Ein Projektreport darf sie verschärfen, aber nicht absenken.

### 6. P2: PNG-Prüfung erkennt nicht decodierbare Bilddaten nicht

**Stelle:** [image-integrity.js, Zeile 50](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/lib/image-integrity.js#L50).

Signatur, Chunklängen, CRC, Bildmaße und vorhandene IDAT/IEND-Chunks werden geprüft. Der Inhalt des Bilddatenstroms wird nicht decodiert.

**Nachweis:** Ein künstliches PNG mit korrekten Prüfsummen, aber ungültigem komprimiertem Bildinhalt erhielt `passed=true`. FFmpeg konnte dieselbe Datei nicht decodieren: `inflate returned error -3`.

**Korrektur:** Vor der Freigabe zusätzlich eine vollständige Decodierung ausführen. Die bisherigen Strukturprüfungen bleiben als schnelle Vorprüfung sinnvoll.

### 7. P2: Phase 3 vertraut veralteten Audio-Berichten

**Stelle:** [validate-youtube-phase3.js, Zeile 30](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/validate-youtube-phase3.js#L30).

Die Prüfung verlangt `passed=true` im Audio- und Alignment-Bericht sowie das Vorhandensein der Audiodatei. Die gespeicherten Audiohashes werden dort nicht mit der aktuellen Datei verglichen.

**Nachweis:** Aktueller Audiohash, Audio-Pacing-Hash und Alignment-Hash waren alle verschieden. Phase 3 meldete trotzdem bestanden.

**Korrektur:** Beide Berichte müssen zur aktuellen Audiodatei gehören. Auch die Timeline sollte ihren Audio- und Mappingstand referenzieren. Die vollständige Orchestrierung reduziert das Risiko durch Neuberechnungen, ersetzt diese Prüfung aber für einzelne Befehle und spätere Änderungen nicht.

### 8. P2: Die Exportprüfung akzeptiert eine beliebige große Datei als MP4

**Stelle:** [validate-youtube-phase3.js, Zeile 46](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/validate-youtube-phase3.js#L46).

Nach dem Render werden beim Video im Wesentlichen Existenz und eine Mindestgröße von 100.000 Bytes geprüft. Container, Videospur, Audiospur, Dauer und Decodierbarkeit fehlen.

**Nachweis:** Eine Datei aus 100.001 ASCII-Buchstaben namens `FINAL_VIDEO.mp4` bestand `validatePhase3(..., {postRender:true})` bei sonst erfüllten Vorbedingungen.

**Korrektur:** Mit FFprobe Container, Auflösung, Bildrate, Dauer und beide Spuren kontrollieren; zusätzlich den Export auf Decodierfehler prüfen. Das Uploadpaket sollte auch Caption und SRT vollständig validieren.

### 9. P2: Unterschiedliche Frame-Rundung lässt einen letzten Frame offen

**Stellen:** [Root.jsx, Zeile 31](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/youtube-renderer/Root.jsx#L31) und [YouTubeComposition.jsx, Zeile 37](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/youtube-renderer/YouTubeComposition.jsx#L37).

Die Komposition verwendet `ceil(duration * fps)`, das Ende des letzten Bildes `round(end * fps)`.

**Rechnerischer Nachweis:** 10,001 Sekunden bei 30 fps ergeben 301 Kompositionsframes, aber ein exklusives Sequenzende bei Frame 300. Ein Frame bleibt ohne Bildsequenz und zeigt nach dem Komponentenaufbau den dunklen Hintergrund. Dies wurde rechnerisch und am Code geprüft, nicht als gerendertes Video gesichtet.

**Korrektur:** Einmal ganzzahlige Framegrenzen bestimmen und das letzte Bild exakt bis zum Kompositionsende führen.

### 10. P2: Phase 1 besteht auch ohne Recherchedatei

**Stelle:** [validate-youtube-phase1.js, Zeile 67](https://github.com/memetreza34-ux/Geschichte-Kanal/blob/09eee4f18f0619508218a1a18e7d96fd7b731b7d/src/cli/validate-youtube-phase1.js#L67).

Die redaktionelle Policy verlangt Quellen und Unsicherheiten. Die Pflichtdateiprüfung umfasst jedoch keine `RECHERCHE.md`; ein ausgefülltes `sourceabilityEvidence` in der Scorecard genügt dem entsprechenden Teil der technischen Prüfung.

**Nachweis:** In einer Kopie der Ostseeflotten-Produktion wurde ausschließlich die Recherchedatei entfernt. `validatePhase1Full()` bestand weiterhin ohne Fehler.

**Korrektur:** Ein Rechercheartefakt und überprüfbare Quellenreferenzen verpflichtend machen. Für zentrale Behauptungen Aussage, Quelle, Fundstelle und Unsicherheit erfassen. Das garantiert keine historische Wahrheit, verhindert aber Freigaben ohne nachvollziehbare Recherchegrundlage.

## Produktionsstand

| Projekt | Phase 1 | Hinweis |
|---|---|---|
| Caesar/Piraten | bestanden | Status weiterhin pausierte Themenprüfung |
| Hannibals Feuertrick | bestanden | wartet laut Status auf Coverauswahl |
| Holland/Wasserlinie | bestanden | vorbereitet |
| Konstantinopel | bestanden | vorbereitet |
| Mittelalterliche Stadttore | bestanden | world-led |
| Tambora | bestanden | vorbereitet |
| Römisches Marschlager | bestanden | Testprojekt |
| London 1666 | bestanden | 84 Bilder, Zieldauer 375 s |
| Pariser Ballonpost | bestanden | 90 Bilder, Zieldauer 395 s |
| Ostseeflotte | bestanden | 83 Bilder, Zieldauer 390 s |
| Kenilworth | nicht bestanden | ausdrücklich altes Schema-V1-Testprojekt |
| Pompeji | nicht bestanden | ausdrücklich altes Schema-V1-Testprojekt |

Die beiden alten Testprojekte sind bekannte Altstände und kein Beleg dafür, dass die aktuelle Testsuite fehlschlägt. Ein bestandenes Phase-1-Gate bedeutet außerdem keine Produktionsfreigabe für pausierte Projekte und keine Bild-/Audio-/Videoabnahme.

## Redaktionelles und visuelles Feedback

**Beibehalten:** Den Ablauf von Recherche über vollständigen Sprechertext zu Visuals. Die Ostseeflotten-Geschichte hat einen verständlichen Weg von Vorbereitung über Zwischenfall und Versorgung bis zur Niederlage. Sie benötigt keine erfundene Hauptfigur. Die Pariser Recherche benennt konkrete historische Grenzen für die Illustration.

**Einstieg präzisieren:** Im Ostseeflotten-Skript wirkt „eine verlorengehende Seeschlacht doch noch zu verhindern“ unklar. „Russlands Lage im Krieg gegen Japan noch zu wenden“ beschreibt den Auftrag verständlicher. Das ist eine redaktionelle Formulierungsempfehlung, keine hier nachgewiesene historische Falschbehauptung.

**Geplante Haltezeiten realistischer machen:** Der Ostseeflotten-Generator begrenzt seine Schätzung auf 5,3 Sekunden, unabhängig davon, wie lang der zugeordnete Sprechertext ist. Beispiel: Die erste Szene hat 25 Wörter. Bei der durchschnittlichen Sprechgeschwindigkeit, die zur Zieldauer des gesamten Skripts passen würde, wären das ungefähr 8,7 Sekunden. Die Regiepolicy erlaubt regulär maximal 6,5 Sekunden. Das ist eine Planungsabschätzung, keine gemessene Audiodauer. Solche Konflikte sollten vor der Bildproduktion sichtbar werden, damit Phase 3 nicht erst nach dem Bildlock eine Aufteilung verlangt.

**Variationsregeln als Hilfe behandeln:** Verschiedene Bildformen und Blickwinkel sind sinnvoll. Automatisches Wechseln von Kamerabezeichnungen oder Bewegungen belegt aber keine gute Bildfolge. Die jeweilige Handlung und Verständlichkeit müssen die Abfolge rechtfertigen.

**Formatentscheidung dokumentieren:** Die Kanal-DNA bevorzugt 8–15 Minuten; die jüngeren Longform-Projekte planen etwa 6–7 Minuten. Die Regeln erlauben inhaltsgetriebene Längen. Deshalb ist das kein harter Fehler, sollte aber als aktuelle Formatentscheidung klar beschrieben werden.

## Wartbarkeit, Tests und Betrieb

### Tests auf die tatsächlichen Übergänge ausweiten

Die vorhandenen 72 Tests enthalten nützliche Fehlertests, insbesondere für Bildlocks und Integrität. Ein Teil prüft aber Konfigurationswerte, Dokumentformulierungen oder vorhandene Planungsdaten. Das erklärt, warum sie die oben belegten Laufzeitlücken nicht erkennen.

Für `alignProject`, `buildTimeline`, `prepareRender`, `optimizeAudio`, `validatePacing` und `validatePhase3` fehlen direkte Funktionsaufrufe in den vorhandenen Testdateien. Priorität haben Tests für die belegten Fehler sowie ein kleiner Durchlauf mit synthetischen, gültigen Bildern und Audio bis zum decodierbaren MP4. Ein solcher Test prüft den technischen Ablauf; kreative Qualität braucht weiterhin eine tatsächliche Sichtung.

### Abhängigkeiten reproduzierbar installieren

Es gibt keine versionierte Lockdatei. CI verwendet `npm install`. Zwar sind die direkten Pakete exakt versioniert, ihre indirekten Abhängigkeiten sind damit nicht vollständig eingefroren. Lockdatei einchecken und CI auf `npm ci` umstellen. FFmpeg, FFprobe, Whisper und die Systemvoraussetzungen sollten mit einem kurzen Einrichtungsweg dokumentiert sein.

### Aktuelle Regeln eindeutig halten

Der Brain Index sagt im Abschnitt „Bild 01“ noch „Nur exakter Covertext“. Die Entscheidung vom 14. Oktober und die aktuelle Vorlage verlangen für neue Projekte dagegen eine normale erste Szene und ein separates Thumbnail. Die Autoritätsreihenfolge löst den Konflikt theoretisch, aber Agenten und Menschen können am alten Abschnitt hängen bleiben.

Aktuelle Regel einmal klar formulieren und die frühere Variante ausdrücklich als Legacy kennzeichnen. Auch Versionsbezeichnungen in README, Topic-System und Workflow sollten vereinheitlicht werden.

### Freigaben an Eingaben binden

Die Bildhashes sind ein guter Anfang. Dasselbe Prinzip sollte auch Skript, Szenenplan, Audio, Timeline und Export verbinden. Dann ist überprüfbar, welche Freigabe für welchen Stand gilt. Für Projektmetadaten helfen außerdem klare Schemas mit Typen, Mindestwerten und erlaubten Zustandswechseln; fehlende oder falsch geschriebene Versionsmarker sollten neue Projekte nicht still zu Legacy-Fällen machen.

## Empfohlene Reihenfolge

1. **Löschpfad absichern und direkte Render-Vorbedingungen schließen.**
2. **Generator-Freigaben entfernen; echte Reviews an Skript und Szenenstand binden.**
3. **Alignment-Cache und Audio-/Timeline-Nachweise zuverlässig invalidieren.**
4. **Bildnoten-Untergrenzen festsetzen; PNGs und MP4s wirklich decodieren.**
5. **Frame-Rundung korrigieren und die belegten Fehler durch Regressionstests absichern.**
6. **Einen vollständigen technischen Testlauf und anschließend einen echten Video-Review dokumentieren.**
7. **Lockdatei, Recherchepflicht und widersprüchliche Dokumentation bereinigen.**

Die Ergebnisse der isolierten Prüfungen stehen zusätzlich in `REPO-PRUEFERGEBNISSE-2026-10-20.json`.
