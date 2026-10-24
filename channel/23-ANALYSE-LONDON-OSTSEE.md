# Analyse der ersten zwei Longform-Videos

Gesichtet am 24.10.2026: alle Szenenbilder, das komplette Voice-over-Skript sowie die Scene Cards und Flow-Prompts der fertigen Exporte.

| Video | Dauer | Bilder | Quelle |
|---|---|---|---|
| Great Fire of London 1666 | 5:30 | 84 | `youtube/2026-KW41_05-10_bis_11-10/great-fire-london-1666` |
| Ostseeflotte 1904/05 | 6:34 | 83 | `youtube/2026-KW42_12-10_bis_18-10/baltische-flotte-1905` |

Das `POST_VIDEO_REVIEW.json` der Ostseeflotte stand noch auf `PENDING_REVIEW`. Diese Analyse liefert die Befunde dafür.

---

## 1. Skript

### Was schon gut ist

- Beide Skripte sind sachlich sauber, chronologisch und flüssig formuliert.
- Die Ostseeflotte hat starke Szenen: Doggerbank, Kohleschaufeln und am Ende die Mütze im Wasser.
- London endet mit einem Rückgriff auf den Anfang („Ein einzelner Funke …“). Diese Technik soll Standard werden.

### Was die Videos schwächer macht

| # | Befund | Beleg | Ursache |
|---|---|---|---|
| S1 | **Einstieg mit Datum statt Szene.** Beide starten mit „Am frühen Morgen des 2. September 1666 …“ bzw. „Oktober 1904.“ | jeweils der erste Satz | Kein Regelwerk für den Cold Open; `STORY_QC` prüft den Hook nur über einen selbst vergebenen Score. |
| S2 | **Lexikon-Ton statt Erzählung.** Sätze wie „Das ist entscheidend, denn …“, „Schon jetzt zeigt sich das erste Problem“, „Trotzdem zeigt die Reise … etwas Grundsätzliches“ | London Absatz 4–5, Ostsee letzter Absatz | Das Skript erklärt, was die Zuschauer denken sollen, statt es zu zeigen. |
| S3 | **Kaum Menschen, durch deren Augen wir sehen.** Pepys kommt in London nur in einem Absatz vor. In der Ostsee bleiben die Matrosen namenlos und ohne Gefühle. | London Absatz 8, Ostsee gesamt | Es gibt keine Pflicht für eine Führungsfigur oder Perspektive. |
| S4 | **Die stärksten Details fehlen.** London: Pepys vergräbt Wein und Parmesan im Garten. Ostsee: rund 18.000 Seemeilen, sieben Monate auf See, und am Ende ein Kräfteverhältnis von 21 gesunkenen russischen Schiffen gegen 3 japanische Torpedoboote. | — | Die Recherche sammelt Fakten, aber keine „Gänsehaut-Details“. |
| S5 | **Keine offenen Schleifen zwischen den Kapiteln.** Jeder Absatz schließt in sich ab, nichts zieht die Zuschauer weiter. | Absatzenden | Die Absätze sind wie eine Liste aufgebaut, nicht wie eine Spannungskurve. |
| S6 | **Das Ende fasst zusammen wie ein Schulaufsatz.** London zählt im vorletzten Absatz sechs Ursachen hintereinander auf. | London vorletzter Absatz | Das Gate `endingAnswersOpeningQuestion` erzwingt eine Antwort, aber nicht deren Form. |

## 2. Bildwelt

### Was schon gut ist

- Der Zeichenstil ist hochwertig, besonders London: gemalte Tusche, gutes Licht.
- In der Ostsee wirken viele Szenen menschlich und gut gewählt (27, 30, 41, 73, 83).

### Was die Videos schwächer macht

| # | Befund | Bilder | Ursache |
|---|---|---|---|
| B1 | **Interne Prompt-Texte im Bild.** „BILD 45: Feuerzone am 3. September“, „BILD 46“, „BILD 51: Dienstag …“, „BILD 62“, „BILD 66“, „BILD 68“, „BILD 69“ | London 45, 46, 51, 62, 66, 68, 69 | Der Master-Prompt enthält die Überschriften `BILD NN`, und Flow hat sie als Bildinhalt übernommen. |
| B2 | **Falscher oder englischer Text im Bild.** „Fire zone“, „ting Demolition / First Fire / Next House Affected“, „Tidding Pudding Lane“, Cover-Text mitten im Video | London 6, 25, 33, 44, 63 | Wie B1. Phase 2 hat diese Bilder freigegeben, obwohl sie eindeutig gegen die Regeln verstoßen. |
| B3 | **Dieselbe Straßenansicht immer wieder.** Die Bäckerei von Farriner mit identischer Kamera erscheint in rund 15 Bildern. | London 1, 2, 4, 10, 13, 14, 16–19, 23, 24, 41, 44, 47, 54, 66 | `FLOW_WORLD_LOCK` sagt „recurring places must remain visually identical“. Es fehlt eine Begrenzung, wie oft derselbe Ort aus derselben Kamera vorkommen darf. |
| B4 | **Split-Screens und Rahmen.** Zweigeteilte Bilder, weiße Ränder, Bild-im-Bild | London 7, 18, 33, 46, 54, 63, 73, 76, 78; Ostsee 7, 15, 48 | Die visualForm `comparison` wird von Flow als zwei Bildhälften umgesetzt. |
| B5 | **Zu viele Karten.** 13 von 83 Bildern sind Karten, und viele sehen sich sehr ähnlich. | Ostsee 5, 6, 11, 19, 22, 43, 45, 46, 57, 59, 60, 65, 77, 81 | Es gibt keine Obergrenze für Karten. |
| B6 | **Gesichter der Hauptfiguren wechseln.** Roschestwenski sieht in jedem Auftritt anders aus. | Ostsee 13, 21, 37, 73 | Es gibt keine Figurenbibel mit festem Aussehen und kein Referenzbild als Flow-Ingredient. |
| B7 | **Falsche Epoche.** Dreispitze und Kleidung des 18. Jahrhunderts im Jahr 1666 | London 39, 70, 74 | Der Prompt nennt keine konkreten Kleidungsmerkmale der Zeit. |
| B8 | **Zwei verschiedene Kanal-Looks.** London ist gemalt und gedämpft, die Ostsee ein heller Comic-Tuschestil. | gesamt | Der Style-Lock ist nur Text, es gibt kein festes Stil-Referenzbild. |

## 3. Scene Cards und Prompts: die eigentliche Ursache

1. **Scene Cards sind Schablonen.** In beiden Videos gibt es für `visualPurpose` nur zwei verschiedene Werte. `visualAnswer`, `viewerTakeaway`, `visualConcept` und `actionState` enthalten oft denselben Satz. Der Hintergrund lautet in fast jedem Ostsee-Bild „simplify historically correct 1904–1905 naval route, Baltic harbor, sea, Asian coast or engine rooms“, also eine Liste von Orten statt eines konkreten Ortes.
2. **Die Prompts bestehen zu rund 70 % aus Textbausteinen.** Ein Szenenprompt hat etwa 4.000 Zeichen. Die eigentliche Szene steht darin zwei- bis dreimal wiederholt, der Rest sind allgemeine Regeln. Laut Imagen-Leitfaden sollte ein Prompt aber aus **Subjekt, Kontext und Stil** bestehen und schrittweise verfeinert werden.
3. **Scores werden selbst vergeben.** `visualInterestScore` liegt in allen 83 Ostsee-Bildern genau bei 9.2. Die Gates prüfen nur, ob ein Wert vorhanden und hoch genug ist, nicht ob Skript oder Bild wirklich so sind.

## 4. Konsequenzen

| Befund | Neue Regel bzw. neues Werkzeug |
|---|---|
| S1–S6 | `channel/24-STORY-ENGINE-V4.md` und `99-technik/STORY_BLUEPRINT.json`. Das Gate prüft den **echten Skripttext**: Hook, offene Schleifen mit Auflösung, konkrete Details, Führungsfigur, verbotene Lexikonformeln, Aufzählungs-Ende. |
| B1, B2 | Zusätzlich pro Szene eine eigene Prompt-Datei `00-bildprompts/FLOW_PROMPTS/Bild NN.txt` **ohne** Bildnummer im Inhalt. Flow sieht dadurch keine `BILD NN`-Überschrift mehr. |
| B3–B5 | Neues Bildplan-Gate: Pflichtfeld `locationKey` pro Bild, Grenzen für denselben Ort und dieselbe Kamera, Kartenanteil höchstens 12 %, Split-Screen nur mit ausdrücklicher Freigabe. |
| B6–B8 | `99-technik/CAST_BIBLE.json`: feste Figurenbeschreibung und Referenzbild pro Hauptfigur, plus Kleidungsmerkmale der Epoche. Der Compiler fügt die Beschreibung automatisch in jede Szene ein, in der die Figur vorkommt. |
| Ursache 1–3 | Erkennung von Schablonen-Cards, kürzere Prompts im Format Subjekt → Ort und Zeit → Kamera → Licht → Figuren. |
