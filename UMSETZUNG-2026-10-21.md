# Umsetzung nach der Kanalanalyse

Stand: 21.10.2026. Basis: `09eee4f18f0619508218a1a18e7d96fd7b731b7d`. Änderungen gelten für zukünftige Produktionen; kein bestehender Videoordner und kein ursprünglicher Antigravity-Export wurde bearbeitet.

## Produktionsqualität

- Neue Vorlage Schema 5: Quellen mit Fundstellen, Aussagen mit Belegen und Unsicherheiten, historische Bildreferenzen mit Muss-/Ausschlussmerkmalen.
- Skriptfreigabe vor Szenenplanung, konkrete Ursache-Entscheidung-Folge-Belege und eine beantwortete Leitfrage.
- Scene Cards mit Erkenntnisgewinn und sichtbarem Beleg. Wiederkehrende Identitäten und Zustände werden fortgeschrieben; deklarierte Zustandssprünge fallen durch.
- Skript-, Sequenz- und Bildprüfungen sind an den aktuellen Inhalt gebunden. Die Bildprüfung verlangt konkrete Beobachtungen statt allein Bewertungen und Booleans.
- Kompakter Promptmodus für neue Projekte, der historische Bildmerkmale und den sichtbaren Beleg direkt nennt.
- Beschriftungen und Routen als kontrollierte Renderer-Overlays. Fokuskoordinaten wirken auf die Bildbewegung, ohne freie Bildränder aufzuziehen.
- Lokale Storyboard-Ansicht vor der Bildproduktion; sie zeigt Belege und vorhandene Bilder und erteilt keine Freigabe.
- Neue Audiovorlagen erhalten innere Pausen und laufen mit normaler Geschwindigkeit. Keine automatische Pflicht, Audio allein für eine kürzere Laufzeit zu beschleunigen.

Details und Datenbeispiele: [channel/23-RESEARCH-AND-SCENE-EVIDENCE.md](channel/23-RESEARCH-AND-SCENE-EVIDENCE.md).

## Geschlossene technische Fehler

1. Einfache Video-IDs und Symlink-Prüfung verhindern, dass Render-Staging andere Pfade rekursiv löscht.
2. Auch direktes Rendern prüft Phase 1, Phase 2, Phase 3 und Pacing vor dem Ersetzen von Staging-Dateien.
3. Alignment-Cache berücksichtigt Skript, Modell, Sprache und Szenenanker; ungültige oder fehlende Zeiten werden abgewiesen.
4. Audio-/Alignment-Berichte und Timeline müssen zu den aktuellen Dateien passen. Auch Timeline-Szenen und Render-Vorgaben werden gegen die Quelldaten geprüft.
5. Bild-QC-Mindestbewertungen bleiben mindestens 8/10, auch wenn eine QC-Datei kleinere Mindestwerte angibt.
6. PNG-Prüfung umfasst komprimierte Daten und tatsächliche FFmpeg-Decodierung.
7. MP4-Prüfung kontrolliert Container, H.264, Auflösung, Bildrate, Audiospur und Dauer und decodiert den vollständigen Export.
8. Der letzte Bildabschnitt deckt auch den durch Aufrunden entstehenden Schlussframe ab.
9. Render-Kopien von Bildern und Audio müssen mit den freigegebenen Hashes übereinstimmen.
10. Node-Abhängigkeiten besitzen eine Lockdatei; CI verwendet `npm ci` und installiert FFmpeg.

## Prüfung

- 86 Tests bestanden, darunter neue Fehlertests für Cache-Veraltung, Löschpfade, manipulierte Qualitätsgrenzen, falsche Bilddaten, MP4-Attrappen, direkte Render-Umgehung, Quellen-/Planbindung und Kontinuität.
- Echter Remotion-Testrender mit synthetischen Farbbalken, zwei Szenen, Fokusbewegung, Beschriftungen, Route und Testton: 1280×720, 30 fps, 61 Frames bei geplanter Dauer 2,001 s.
- Export mit ffprobe und vollständiger FFmpeg-Decodierung geprüft. Schlussframe 60 tatsächlich angesehen: Bild, Route und lesbare Beschriftung vorhanden, kein leerer Schlussframe.
- Test zur Audiopause: 2,800 s Quelle → 2,797 s Ausgabe; innere Pause erhalten, Original-SHA-256 unverändert.
- Remotion-Bundle erfolgreich. Die neue Darstellung nutzt die im Repo festgeschriebene Version 4.0.500.

Der synthetische Render ist ein technischer Nachweis, kein fertiges Geschichtsvideo und kein Beleg für Zuschauerbindung. Er liegt lokal unter `/tmp/geschichte-smoke-20261021.mp4`; der geprüfte Schlussframe unter `/tmp/geschichte-smoke-last-frame-20261021.png`.

## Grenzen und nächster Produktionsschritt

Automatische Prüfungen können weder Quelleninterpretation noch eine wirkliche Bildsichtung garantieren. Die numerischen Pacing-Grenzen der bisherigen Regie-Policy gelten weiter; ein flexibleres, ebenfalls belegpflichtiges Ausnahmeverfahren ist hier nicht eingeführt. Auch eine bessere Vorlage allein beweist noch keine bessere fertige Produktion.

Die nächste neue Produktion muss Quellen, Skript und die zusammenhängende Bildfolge tatsächlich durchlaufen. Vor dem vollständigen Bildsatz werden Einstieg, Erklärmoment und Übergang als Probe geprüft. Das vorhandene Thumbnail-Auswahlverfahren bleibt bestehen: drei konkrete Kandidaten, danach ausdrückliche Nutzerauswahl vor den Storybildern. Alte Videos werden nicht dafür neu bearbeitet.
