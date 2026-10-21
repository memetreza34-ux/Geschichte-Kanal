# Figuren gezielt verfeinern

Nutzerauftrag vom 21.10.2026: Die vorhandene Bildwelt ist eine brauchbare Richtung; besonders die Figuren wirken noch befremdlich. Kleine begründete Stilkorrekturen sind erlaubt. Bilder und Audio erstellt der Nutzer, Codex liefert Phase 1 und Phase 3.

## Beobachtete Ausgabe

Für die Figurendetails wurden drei neue Einzelbilder in voller Exportauflösung aus der vorhandenen, unveränderten Flotten-MP4 gelesen. Die zuvor vorhandenen kleinen Szenenframes dienen nur der Orientierung. Dies ist eine visuelle Bewertung, keine gemessene Zuschauerreaktion.

| Zeit im vorhandenen Export | Sichtbefund | Konsequenz für neue Prompts |
| --- | --- | --- |
| 00:44, Bild 08 | Starke weiße Augenflächen und hochgezogene Brauen; Zeigegeste, Fernglas und gefaltete Hände konkurrieren um Aufmerksamkeit. | Blick und Handlung gezielt verteilen; Sorge nicht pauschal durch große Augen und Gesten darstellen. |
| 01:31, Bild 17 | Ruhige Mimik, eine verständliche Dokumentübergabe und stehende Körper mit erkennbarem Bodenkontakt wirken stimmiger. Die Inszenierung bleibt etwas steif. | Diese Zurückhaltung als Richtung nutzen; Körper leicht zur Handlung ausrichten, ohne eine neue Standardschablone zu kopieren. |
| 02:58, Bild 36 | Viele prominente Personen mit offenen Mündern, angehobenen Händen und großen Augen; der Alarm wird mehrfach gleichzeitig ausgespielt. | Eine Hauptaktion, passende sekundäre Aufgaben und abgestufte Reaktionen planen. Einzelne intensive Emotionen bleiben situationsabhängig erlaubt. |

Die Aufnahmen beweisen keine allgemeine Ursache im Bildmodell. Sie zeigen, welche sichtbaren Eigenschaften verbessert werden sollen. In dieser Stichprobe ist die überzeichnete Mimik klarer belegt als eine allgemeine Behauptung, alle Köpfe oder Hände seien anatomisch falsch.

Lokale Detailbelege: `/tmp/geschichte-figuren-008-20261021.png`, `/tmp/geschichte-figuren-017-20261021.png`, `/tmp/geschichte-figuren-036-20261021.png`. Ursprung: bestehender Antigravity-Export `baltische-flotte-1905/03-export/FINAL_VIDEO.mp4`; keine Änderung an diesem Video.

## Konkrete Anpassung

- Beibehalten: handgezeichnete 2D-Welt, dunkle mittlere Kontur, gedeckte Farben, wenige Cel-Schatten, leichte Papiertextur und die gezeichneten Umgebungen.
- Verfeinern: kleine ruhig gezeichnete Augen, sparsame Linien an Mund und Brauen, wenige Gesichtsschatten, schlüssiger Hals-/Schulteraufbau und konkrete Handkontakte.
- Proportionen: Kopfgröße auf die gesamte anatomische Körperhöhe beziehen, nicht auf einen Bildausschnitt. Bei Erwachsenen ungefähr sieben Kopflängen als Orientierung, keine starre Zahl für jede Haltung oder jedes Alter.
- Schauspiel: konkrete Aufgabe und Blickrichtung vorgeben; Hauptfigur und Reaktionen gewichten. Dramatische Mimik folgt einer notwendigen Handlung statt dem allgemeinen Wort „Gefahr“.
- Promptführung: vier kurze spezifische Regieangaben für prominente Personen. Hintergrundfiguren einfacher halten; bei Architektur- oder Objektbildern keinen Personenblock ergänzen.

Die bestehenden Stilvorgaben enthielten bereits Verbote für Karikaturen und falsche Hände. Weitere Verbote allein reichen nicht. Die neue Fassung beschreibt zusätzlich positiv, wie Gesichter und Körper zusammengehören und was Hände in der jeweiligen Szene tatsächlich tun.

## Prüfung durch den Nutzer

`FIGUREN-TESTPROMPTS.md` enthält drei kopierfertige, ausdrücklich nicht ausgeführte Prüfbeispiele: eine Person, eine Interaktion und eine Gruppe. Sie sind keine neue Produktion und keine Überarbeitung eines alten Videos. Im eigenen KI-Werkzeug mit denselben Einstellungen und Stilreferenzen vergleichen. Keine Pipeline-Freigabe allein aus dem Prompt ableiten.

Bei den erzeugten Bildern prüfen: Mimik passend und abgestuft? Blickziel lesbar? Griff und Objektkontakt schlüssig? Personen und Umgebung derselbe Zeichenstil? Wiederkehrende Identitäten stabil? Auf Handygröße bleibt die Hauptaktion erkennbar?

**Status:** Prompt-/Vorlagenänderung umgesetzt; eine Verbesserung an neu erzeugten Bildern ist noch nicht visuell bestätigt. Codex hat keine Bilder oder Audiodateien erzeugt.
