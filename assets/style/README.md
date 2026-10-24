# Kanal-Stil-Referenz

`kanal-stil-referenz.png` ist das feste Stil-Referenzbild des Kanals (`config/visual-policy.json → visualPlanV4.channelStyleReferenceImage`). In Google Flow wird es bei **jedem** Szenenbild als Ingredient angehängt. Es trägt Strich, Farben, Textur und Detailgrad, damit die kurzen V4-Prompts (`channel/25-BILDWELT-UND-PROMPTS-V4.md`) genügen.

| | |
|---|---|
| Quelle | Great Fire of London 1666, Bild 11 (Hinterhof mit Werkstätten) |
| Größe | 1376 × 768 px, PNG geprüft |
| SHA-256 | `63f7ba810bc20560524bba9fff2658781904ae6a2d3e06689f31075abc9ae29a` |

## Warum dieses Bild

- Sauberer Tuschestrich, gedämpfte flache Farben, Papiertextur: genau der Kanal-Look
- Kein Text, keine Schrift, kein Rahmen, kein Split-Screen
- Neutrales Tageslicht. Nacht- oder Feuerbilder würden jede Szene dunkel oder orange einfärben.
- Ruhige Komposition mit viel Material (Holz, Stein, Stoff), an dem Flow den Strich ablesen kann

Verworfen wurden: London 42 und 50 (Nacht und Feuer färben ein), London 72 (Bauplan mit Pseudo-Schrift), Ostsee 54 (geklonte Matrosen, hellerer Comic-Stil) und Ostsee 27 (Nacht, Comic-Gesichter).

## Grenzen

Das Bild zeigt Fachwerkhäuser aus dem Jahr 1666. Wenn Flow aus der Referenz auch **Inhalte** übernimmt (z. B. Fachwerk in Boston 1919), gilt:

1. Im Szenenprompt steht der Ort immer konkret (z. B. „brick tenements, Boston 1919“). Das hat Vorrang.
2. Sobald die ersten drei bis fünf Bilder eines Videos in Phase 2 freigegeben sind, das beste davon als **zweite** Referenz für dieses Video hinzunehmen. Die Kanal-Referenz bleibt trotzdem immer angehängt.
3. Die Referenz nie heimlich austauschen. Ein Wechsel ist eine Kanalentscheidung und gehört in `channel/99-DECISION-LOG.md`.
