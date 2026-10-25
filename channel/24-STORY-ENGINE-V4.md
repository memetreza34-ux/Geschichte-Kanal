# Story Engine V4 — So erzählt der Kanal Geschichte

Ergänzt `03-SCRIPT-BIBLE.md`. Gilt für alle Projekte mit `storyEngineGateVersion >= 1`.
Maschinenlesbar: `config/story-engine-policy.json`, Prüfung: `npm run story:youtube -- --dir "youtube/<week>/<slug>"`.

> **Kernidee:** Wir erklären Geschichte nicht. Wir lassen die Zuschauer sie erleben und erst danach verstehen.

Diese Muster nutzen erfolgreiche Erzählkanäle:

- *Fall of Civilizations* startet mit einer atmosphärischen Szene an einem konkreten Ort und fragt, wie es sich angefühlt hat, dabei zu sein.
- *Simple History* begleitet einen einfachen Menschen durch das Ereignis.
- *Oversimplified* gibt historischen Figuren Persönlichkeit und Motive.
- Erklärkanäle mit hoher Bindung arbeiten mit offenen Schleifen, die später aufgelöst werden, und setzen alle 60 bis 90 Sekunden einen neuen Reiz.

---

## 1. Der Aufbau (Roter Faden)

| Teil | Anteil | Aufgabe | Pflicht |
|---|---|---|---|
| **Cold Open** | 0–20 s | Mitten in einer konkreten Szene: ein Mensch, ein Ort, ein Sinneseindruck, ein Problem | Kein Datum als erstes Wort. Keine Zusammenfassung. |
| **Versprechen** | bis 35 s | Die zentrale Frage und warum sie überrascht | Eine Frage, die das Video am Ende beantwortet. |
| **Kontext** | max. 15 % | Nur so viel Hintergrund, wie für die nächste Szene nötig ist | Danach sofort zurück zu Menschen. |
| **Akt 1: Die Lage kippt** | ~25 % | Erste Entscheidung, erster Fehler | Wendepunkt mit „aber“ oder „deshalb“. |
| **Akt 2: Eskalation** | ~35 % | Es wird schlimmer, die Optionen schwinden. Mittelpunkt mit Überraschung. | Mindestens ein Rückschlag, eine offene Schleife pro Kapitel. |
| **Akt 3: Höhepunkt** | ~15 % | Der entscheidende Moment, so konkret wie möglich | Die Führungsfigur ist dabei. |
| **Auflösung** | ~10 % | Antwort auf die Frage aus dem Versprechen, in einem Bild statt einer Liste | Rückgriff auf ein Detail aus dem Cold Open. |

**Aber-Deshalb-Regel:** Kapitel werden mit „aber“ oder „deshalb“ verbunden, nie mit „und dann“. Wenn zwei Absätze nur mit „Außerdem“ verbunden werden können, gehört einer davon gestrichen.

## 2. Pflichtbausteine

1. **Führungsfigur oder Perspektive.** Eine reale Person (z. B. Samuel Pepys) oder eine klar beschriebene Gruppe (z. B. die Heizer im Kesselraum). Sie kommt am Anfang, in der Mitte und am Ende vor.
2. **Mindestens 3 offene Schleifen.** Jede wird früh aufgemacht („Was er nicht weiß: …“) und später **im Skript sichtbar** aufgelöst.
3. **Mindestens 5 konkrete Details** mit Zahl, Name oder Sinneseindruck, jeweils mit Quelle im Blueprint. Beispiele: der vergrabene Parmesan, 18.000 Seemeilen, Kohlestaub in den Kojen.
4. **Ein Zeitzeugnis.** Ein kurzes, wörtliches oder sinngemäßes Zitat aus einer Quelle (Tagebuch, Brief, Bericht), sauber eingeordnet.
5. **Wiedererkennbarer Schluss.** Der letzte Absatz greift ein konkretes Element aus dem Cold Open wieder auf.

## 3. Verbotene Lexikon-Formeln

Diese Formeln erklären, statt zu erzählen. Das Gate blockiert sie (Liste in `config/story-engine-policy.json`):

- „Das ist entscheidend, denn …“, „Schon jetzt zeigt sich …“, „Es zeigt sich …“
- „… etwas Grundsätzliches“, „Zusammenfassend …“, „Abschließend lässt sich sagen …“
- „In diesem Video …“, „Lass uns …“, „Heute schauen wir uns an …“
- „also nicht deshalb …, weil …“ als Fazitformel

Stattdessen: das zeigen, was passiert, und die Zuschauer den Schluss selbst ziehen lassen.

**Aufzählungs-Ende:** Im letzten Absatz sind höchstens 3 Kommas am Stück in einer Ursachenliste erlaubt. Eine Liste aus sechs Ursachen ist ein Referat, kein Ende.

## 4. Vorher und nachher

### London: Cold Open

**Vorher:**
> Am frühen Morgen des 2. September 1666 beginnt in einer kleinen Bäckerei in der Pudding Lane ein Feuer. Solche Brände sind in London nichts Ungewöhnliches.

**Nachher:**
> Es ist kurz nach ein Uhr nachts, als Thomas Farriner von beißendem Rauch geweckt wird. Unten in seiner Backstube in der Pudding Lane schlagen Flammen aus dem Ofen. Er rettet sich mit seiner Familie über die Dächer. Seine Magd schafft es nicht. Ein Hausbrand, wie London ihn jede Woche erlebt. Doch dieser hier wird vier Tage dauern und 13.000 Häuser verschlingen. Warum konnte niemand ihn stoppen?

### London: offene Schleife mit Führungsfigur

> Samuel Pepys sieht das Feuer vom Tower aus und notiert alles in sein Tagebuch. Was er an diesem Morgen noch nicht ahnt: Zwei Tage später wird er in seinem Garten eine Grube ausheben, für seinen Wein und seinen kostbaren Parmesan.

Die Auflösung steht im dritten Akt, als das Feuer auf sein Viertel zukommt.

### Ostsee: Cold Open

**Vorher:**
> Oktober 1904. In einem russischen Hafen an der Ostsee bereiten sich Matrosen auf eine Reise vor …

**Nachher:**
> Der Heizer schaufelt seit Stunden Kohle, und der Staub sitzt ihm schon in der Lunge. Über ihm, auf der Brücke, ist Admiral Roschestwenski schon wieder wütend. Vor ihnen liegen rund 18.000 Seemeilen, mehr als einmal halb um die Erde. Am Ende dieser Reise wartet eine Schlacht, die nur wenige Stunden dauern wird. Wie konnte eine ganze Flotte die halbe Welt umrunden, nur um dann in einem Nachmittag unterzugehen?

### Ostsee: Schluss mit Rückgriff

**Vorher:**
> Die Matrosen hatten fast die halbe Welt überquert. Doch die lange Fahrt hatte die Schwächen ihres Verbandes nicht behoben. Sie hatte sie nur bis zum entscheidenden Tag mitgeschleppt.

**Nachher:**
> 18.000 Seemeilen haben die Heizer Kohle geschaufelt. Für eine Schlacht, die vorbei war, bevor die Sonne unterging. Auf dem Wasser vor Tsushima treibt eine Matrosenmütze. Sie hat die halbe Welt gesehen.

## 5. STORY_BLUEPRINT.json

Bevor das Skript geschrieben wird, entsteht der Blueprint. Danach prüft das Gate den **tatsächlichen Skripttext** dagegen:

| Feld | Prüfung im Skript |
|---|---|
| `coldOpen.firstWords` | Das Skript beginnt mit diesen Worten. Das erste Wort darf kein Monat und keine Jahreszahl sein. |
| `centralQuestion` | Die Frage steht wörtlich im ersten Hookfenster (Standard: die ersten 120 Wörter) und endet mit `?`. |
| `guideCharacter.name` | Kommt im ersten, mittleren und letzten Drittel vor. |
| `openLoops[].setupQuote` / `payoffQuote` | Beide Zitate stehen wörtlich im Skript, die Auflösung nach dem Aufbau. |
| `vividDetails[].quote` | Jedes Detail steht wörtlich im Skript und hat eine Quelle. |
| `eyewitness.quote` | Steht im Skript und hat eine Quelle. |
| `endingCallback.quote` | Steht im letzten Absatz **und** im Cold Open (erste 120 Wörter). |

So kann kein Gate mehr mit selbst vergebenen Scores bestanden werden: Was im Blueprint behauptet wird, muss im Skript stehen.
