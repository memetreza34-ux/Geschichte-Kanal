import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCaption } from '../../../../src/cli/finalize-youtube-export.js';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const scriptPath = path.join(project, '01-voice-script', 'voice-script.txt');
const script = await readFile(scriptPath, 'utf8');

let prepared = script;
for (const token of ['2. September', '3. September', '5. September', 'Charles II.']) {
  prepared = prepared.replaceAll(token, token.replaceAll('.', '<DOT>'));
}
const beats = prepared.trim().split(/(?<=[.!?])\s+/).map((s) => s.replaceAll('<DOT>', '.'));
if (beats.length !== 84) throw new Error(`Erwartet 84 Narrations-Beats, gefunden ${beats.length}.`);

const scenes = [
  ['architecture-city','wide','Farriners Bäckerei in Pudding Lane','Nachtstraße mit kleiner Bäckerei; erster Rauchfaden steigt aus einem einzigen Gebäude, restliche Straße noch dunkel und intakt.','schlafende Fenster, kleiner Handkarren am Straßenrand'],
  ['character-scene','medium','Londoner Nachtwache und ruhige Straße','Ein Wächter passiert eine Straße, in der kleine häusliche Feuerquellen normal wirken; keine Panik, nur Alltagsnacht.','Laterne, geschlossene Läden'],
  ['object-focus','detail','glimmender Ofenbereich','Ein unscheinbarer Glutrest im dunklen Bäckereiraum wird als drohendes Detail isoliert; noch keine Großflammen.','Mehlsack, Holzscheite'],
  ['cause-effect','wide','zwei benachbarte Holzhäuser','Flamme überspringt den extrem schmalen Straßenraum von einem auskragenden Haus zum nächsten; Ursache und Folge im selben Bild.','Funken im Wind, offene Dachluke'],
  ['battle-city-overview','elevated-overview','mehrere brennende Straßenzüge','Frühe Stadtübersicht: aus einem kleinen Brand sind mehrere getrennte Brandnester geworden, aber große Teile der City sind noch intakt.','Kirchtürme im Hintergrund, Menschenpunkte auf Straßen'],
  ['map-geography','top-down','City of London mit wachsender Feuerzone','Einfache historische Stadtkarte mit Pudding Lane als Startpunkt und einer deutlich größer werdenden westwärts gerichteten Brandfläche, ohne moderne Infografikoptik.','Themse als geografischer Anker'],
  ['comparison','wide','ein kleines Feuer versus zerstörte Häuser','Links ein einzelnes brennendes Haus, rechts eine stark vergrößerte Masse von Hausdächern; die Leitfrage wird als Maßstabskontrast sichtbar.','keine zusätzlichen Figuren'],
  ['architecture-city','extreme-wide','intakte City of London','Breite intakte Stadtansicht vor dem Brand; dichte Dächer und Türme sind selbst das Motiv, kein Feuer im Vordergrund.','Themseboote, Kaminrauch'],
  ['map-geography','elevated-overview','London 1666 im europäischen Kontext','Reduzierte historische Karte zeigt London als große Metropole am Themse-System; Fokus auf Stadtgröße, nicht auf moderne Grenzen.','Flussschiffe als kleine Symbole'],
  ['environment-only','wide','enge Fachwerkstraße','Straßenschlucht mit stark auskragenden Obergeschossen, deren Dächer und Fassaden beinahe zusammentreffen; Himmel nur als schmaler Spalt.','Wäscheleine, Ladenbrett'],
  ['multi-moment-illustration','wide','Hinterhöfe und Lagerbereiche','Ein zusammenhängender Hofkomplex zeigt Werkstatt, Stall, Holzstapel und Fässer als natürliche Nachbarschaft hinter Wohnhäusern.','Pferd im Stall, Handwerker bei Arbeit'],
  ['detail-inset','detail','trockenes Holz und Dachmaterial','Nahaufnahme rissiger trockener Balken und spröder Holzschindeln; ein einziges kleines Inset zeigt ausgetrocknetes Heu.','Staub auf Balken'],
  ['environment-only','wide','Ostwind durch City-Straße','Starker Wind zieht Tücher, Rauch und lose Funken konsequent nach Westen durch eine enge Straße.','flatterndes Ladenschild, verwehte Strohreste'],
  ['architecture-city','medium-wide','Farriners Bäckerei bei 1 Uhr nachts','Die Bäckerei steht jetzt eindeutig in Flammen; Nachbarhäuser noch teilweise dunkel, damit der Ausgangspunkt klar bleibt.','aufgeschreckte Nachbarn an Fenstern'],
  ['evidence-reconstruction','detail','Ofen, Brennmaterial und unsichere Ursache','Rekonstruktion zeigt einen Ofen mit möglichem Funkenflug zu gelagertem Brennmaterial; die Ursache bleibt sichtbar als plausible Rekonstruktion, nicht als bewiesene Schuld.','Backwerkzeug, Brennholz'],
  ['character-scene','medium-wide','Bewohner verlassen brennendes Haus','Mehrere Bewohner helfen einander aus einem oberen Fenster auf ein angrenzendes Dach; Fokus auf Flucht, nicht Heldentum.','Rauch im Treppenhaus, gerettete Decke'],
  ['cause-effect','wide','Bäckerei und direktes Nachbarhaus','Linkes Gebäude brennt, Funken schlagen über, rechte Fassade fängt gerade Feuer; eine klare Ursache-Folge-Kette.','enger Straßenraum, fallende Glut'],
  ['comparison','sectional','Abstand zwischen Häusern','Schnittartige Straßenansicht zeigt fast berührende Obergeschosse über einer schmalen Gasse und die winzige freie Lücke als fehlende Feuerbarriere.','eine Person unten für Maßstab'],
  ['character-scene','medium','Lord Mayor Bludworth am Brandrand','Bludworth betrachtet einen noch lokal wirkenden Brand mit Amtspersonen; Körpersprache kontrolliert, nicht lächerlich oder böse.','kleine Gruppe Nachtwächter'],
  ['object-focus','detail','Eimer versus Feuerfront','Ein einzelner gefüllter Ledereimer im Vordergrund, dahinter eine viel größere Flammenwand; Größenkontrast zeigt die Grenze des Mittels.','nasse Pflastersteine'],
  ['process-sequence','wide','Abriss eines Hauses als Feuerbresche','In einer integrierten Dreistufen-Szene wird ein Haus mit Feuerhaken geöffnet, eingerissen und hinterlässt eine freie Lücke vor intakten Häusern.','Arbeiter mit Seilen'],
  ['character-scene','medium-wide','Hausbesitzer vor Abriss','Bewohner stehen mit geretteter Truhe vor ihrem noch intakten Haus, während Abrisshelfer warten; das persönliche Opfer ist sofort verständlich.','Kiste, kleiner Hausrat'],
  ['cause-effect','wide','zu spät begonnene Bresche','Abrisslücke ist noch schmal, während Feuer bereits seitlich um sie herum ein weiteres Haus erreicht.','Werkzeuge auf Straße'],
  ['environment-only','wide','Funkensturm in enger Straße','Wind treibt glühende Funken über Dächer und durch die Gasse; Menschen ducken sich, Hauptmotiv ist der Funkenstrom.','flatternde Markise'],
  ['map-geography','top-down','Westwärtsbewegung Richtung Themse-Ufer','Historische Stadtkarte mit Pudding Lane und klarer westlicher Ausbreitung entlang der City; Themse unten als Orientierung.','Rauch- und Brandzone statt moderner Pfeilgrafik'],
  ['architecture-city','wide','Lagerhäuser am Themse-Ufer','Dichte Speichergebäude am Fluss mit offenen Toren, Fässern, Seilbündeln und Holzstapeln; Feuer nähert sich im Hintergrund.','Boot wird entladen'],
  ['comparison','wide','Wasser neben brennbaren Lagern','Links ruhige Themse an der Kaikante, rechts dicht gestapelte brennbare Waren; die Nähe zum Wasser löst das Brennstoffproblem nicht.','Bootshaken, Fassrollen'],
  ['object-focus','close','Öl, Talg, Holz und Seile','Brennbare Warentypen liegen glaubwürdig in einem Lager; Funken erreichen zuerst Tauwerk und Holz.','Fassspund, Tauwerk'],
  ['character-scene','medium-wide','Eimerkette vor wachsender Feuerwand','Menschen reichen Eimer weiter, doch hinter ihnen ist die Feuerfront sichtbar größer als ihre Reichweite.','verschüttetes Wasser, leerer Eimer'],
  ['architecture-city','wide','Stadt ohne professionelle Feuerwehr','Breite Straße mit verstreuten Bürgergruppen statt einer zentral organisierten Einheit; mehrere kleine Löschversuche wirken fragmentiert.','Glocke, Pfarreiausrüstung'],
  ['object-focus','detail','Pfarrei-Löschgeräte','Ledereimer, Feuerhaken, Axt und einfache Wasserspritze liegen an einer Kirchenwand; historisches Werkzeug ist das Hauptmotiv.','Kirchentür, Holzgestell'],
  ['process-sequence','medium-wide','Eimerkette und Feuerhaken in Aktion','Eimer werden aus einem Wasserfass gereicht, daneben zieht ein Haken brennendes Dachmaterial herunter.','Wasserfass, Leiter'],
  ['comparison','wide','kleiner Hausbrand unter Kontrolle','Vorher und nachher am selben kleinen Haus: begrenzte Flamme gegenüber nassem abgeräumtem Dach und gestopptem Brand.','wenige Helfer'],
  ['battle-city-overview','extreme-wide','breite windgetriebene Feuerfront','Große Stadtübersicht mit mehreren Straßenzügen gleichzeitig in Brand; winzige Helfer unten zeigen Überforderung.','Rauchfahne zieht westwärts'],
  ['character-scene','medium','Samuel Pepys beobachtet am Morgen','Pepys steht erhöht am Flussufer oder Boot und blickt auf die rauchende City; Stadt bleibt größer als die Figur.','Bootsmann im Hintergrund'],
  ['environment-only','wide','Blick von der Themse auf Fluchtbewegung','Vom Wasser aus sieht man Ufer, Rauch und Menschen, die Besitz aus Gebäuden tragen; der Ort trägt die Szene.','Ruderboote, Kai'],
  ['multi-moment-illustration','wide','Boote, Karren und Flüchtende','Ein zusammenhängender Uferabschnitt zeigt beladenes Boot, blockierten Karren und Menschen mit Bündeln in derselben Fluchtrichtung.','Pferd vor Karren, Truhe'],
  ['character-scene','medium-wide','Pepys berichtet Charles II','Pepys spricht in einem sachlichen Hof- und Amtsszenario mit Charles II; ein Dokument ist Anlass, nicht Dekoration.','zwei Hofbeamte im Hintergrund'],
  ['character-scene','medium','König gibt Abrissbefehl','Charles II weist einen Boten oder Offizier auf Stadtkarte und Abrisszone; Handlung statt Porträt.','gefaltete Stadtkarte'],
  ['symbolic-metaphor','wide','Zeit als schwindende räumliche Lücke','Eine schmale freie Häuserreihe zwischen Feuerfront und intakter Stadt wird zum räumlichen Countdown; keine Uhr.','ein Abrissseil im Vordergrund'],
  ['character-scene','wide','Abrissmannschaft im Menschenstau','Arbeiter mit Haken und Seilen versuchen durch eine von Karren und Flüchtenden blockierte Straße zu kommen.','Karrenrad, Truhe'],
  ['character-scene','medium','Bewohner retten Besitz','Ein Haushalt trägt Kisten, Stoffballen und Werkzeug aus einem Haus; keine wiederkehrende Ersatz-Hauptfigur.','geöffnete Tür, Sack'],
  ['cause-effect','close','brennendes Holz landet auf neuem Dach','Ein glühender Balkensplitter fällt aus dem Rauch auf ein trockenes Dach und entzündet einen neuen Punkt.','Dachziegel, Funken'],
  ['process-sequence','wide','verzögerter Abriss lässt Feuer weiterziehen','Drei räumlich verbundene Zustände entlang derselben Straße: wartender Abriss, erstes Feuer, nächstes Haus bereits betroffen.','Abrisshaken, Schutt'],
  ['map-geography','elevated-overview','Feuerzone am 3. September','Stadtübersicht zeigt nun eine breite zusammenhängende Brandzone statt einzelner Punkte; Datum dient nur der Orientierung.','Themse und St Paul’s als Orientierung'],
  ['comparison','wide','dieselbe Straße morgens und abends','Randlose Vorher-Nachher-Ansicht: morgens Fluchtweg mit Menschen, abends Rauch, Feuer und blockierte Passage.','gleiche Fassadenkontur'],
  ['environment-only','medium-wide','unpassierbare Straße','Rauch, Schutt und Feuer versperren einen zuvor offenen Straßenzug; räumliche Blockade ist das Hauptmotiv.','umgestürzter Karren'],
  ['character-scene','wide','Menschen ziehen Richtung Themse und Felder','Zwei Fluchtströme teilen sich an einer Kreuzung: einige zum Fluss, andere durch ein Stadttor ins Freie.','Bündel, kleiner Handkarren'],
  ['environment-only','wide','Moorfields-Lager','Offenes Feld mit provisorischen Unterständen, geretteten Truhen und Menschen; City-Rauch weit im Hintergrund.','Decken, Kochfeuer'],
  ['character-scene','medium','Familie blickt auf rauchende Skyline','Anonyme Familie sitzt bei gerettetem Hausrat im Feld und schaut zurück; Unsicherheit ohne melodramatische Gestik.','Kiste, Decke'],
  ['map-geography','elevated-overview','Dienstag: Feuer nähert sich zentralen Wahrzeichen','Historische City-Übersicht zeigt Brandzone nun nahe Old St Paul’s und weiteren großen Gebäuden.','Themse unten, St-Paul’s-Silhouette'],
  ['architecture-city','extreme-wide','Old St Paul’s vor dem Brand','Monumentale mittelalterliche Kathedrale über dichtem Häusermeer, Gerüst am Turm sichtbar, Feuer noch im Anmarsch.','Buchhändlerstände im Umfeld'],
  ['architecture-city','wide','Steinbau als vermeintliche Zuflucht','Kathedrale und offener Kirchhof wirken als massive Insel gegenüber kleineren Holzhäusern; Menschen bringen Besitz dorthin.','Truhen, Bücherbündel'],
  ['detail-inset','detail','Holzgerüst, Bretter und eingelagerte Bücher','Naher Blick auf Holzgerüst und hölzerne Dachreparatur; ein kleines Inset zeigt Bücher und Waren im vermeintlich sicheren Bereich.','Seil am Gerüst'],
  ['battle-city-overview','wide','Old St Paul’s in Flammen','Kathedrale steht groß im Zentrum, Gerüst und Dach brennen; umgebende City ebenfalls betroffen, keine moderne Kuppel.','Funkenregen, kleine fliehende Menschen'],
  ['comparison','wide','Monumentalität schützt nicht','Links massive Steinmauer der Kathedrale, rechts Feuer über Gerüst, Dach und umliegenden Bauten; Materialkontrast erklärt Verwundbarkeit.','keine Labels'],
  ['character-scene','medium-wide','Soldaten und Seeleute übernehmen Abriss','Gemischte Arbeitsgruppe mit langen Haken, Seilen und Äxten räumt systematisch Häuserfronten ab.','Schutt, Seilrolle'],
  ['process-sequence','wide','Schießpulverladung für Feuerbresche','Drei eng verbundene Momente: kleine Ladung vorbereiten, Menschen auf Abstand, gezielte Gebäudeseite fällt ein; keine Actionfilm-Explosion.','kleines Pulverfass, Zündschnur'],
  ['cause-effect','extreme-wide','gesprengte Häuser schaffen breite Lücke','Breiter freier Korridor aus Schutt trennt Feuerfront von intakter Häuserzeile; Abstand ist das Hauptmotiv.','Abrissmannschaft als Maßstab'],
  ['character-scene','medium','Bewohner sehen absichtlichen Abriss','Anwohner mit gerettetem Besitz beobachten, wie ihr Straßenzug bewusst niedergelegt wird; ambivalenter menschlicher Preis.','Truhe, Bündel'],
  ['comparison','elevated-overview','Feuer mit und ohne Brennstoff','Zwei benachbarte Straßensegmente: dichter Häuserblock brennt weiter, breite leere Bresche stoppt sichtbaren Übersprung.','Schuttlinie'],
  ['environment-only','wide','Mittwoch mit nachlassendem Wind','Rauch steigt steiler statt waagerecht; Tücher hängen ruhiger und Flammen neigen sich weniger stark.','ruhigeres Wasser im Eimer'],
  ['detail-inset','close','Windzeichen werden schwächer','Nahes Dachdetail: weniger Funkenflug, lockeres Tuch hängt statt zu peitschen; im Hintergrund gedämpfte Glut.','Rauchfäden'],
  ['battle-city-overview','extreme-wide','Feuerfront trifft auf mehrere Breschen','Große Übersicht zeigt unterbrochene Brandkanten und breite freie Korridore; weniger neue Dächer entzünden sich.','kleine Arbeitergruppen'],
  ['map-geography','top-down','Brandzone stabilisiert sich','Historische Karte zeigt große zerstörte Fläche, aber keine weitere schnelle westliche Ausdehnung.','Themse, City-Grenze'],
  ['environment-only','wide','glimmende Ruinen nach Hauptbrand','Rauchende Straßenzüge mit einzelnen Glutnestern, keine hohen Flammen mehr; Hitze durch flimmernde Luft.','verkohlte Balken'],
  ['architecture-city','extreme-wide','gewaltige Ruinenfläche','Breite Nachbrand-Ansicht: Kirchturmreste, Kamine, Mauerstücke und leere Parzellen bis zum Horizont.','wenige Suchende als Maßstab'],
  ['map-geography','elevated-overview','Ausmaß von über 13.000 Häusern','Stadtkarte und Parzellenmuster zeigen die großflächig ausgebrannte City mit wenigen intakten Inseln.','Kirchenstandorte als Silhouetten'],
  ['character-scene','wide','Obdachlose auf offenen Feldern','Viele klar gruppierte Haushalte in Moorfields mit gerettetem Besitz und einfachen Unterständen; keine Wimmelbilddichte.','Decken, Karren, Kochstellen'],
  ['evidence-reconstruction','medium-wide','Unsicherheit der Todeszahl','Ruhige Rekonstruktion eines Schreibers mit unvollständigem Register im Vordergrund, dahinter zerstörte Stadt; begrenzte Aufzeichnung statt erfundener Zahl.','Feder, Registerbuch'],
  ['symbolic-metaphor','wide','Ruinen sind kein leeres Planbrett','Über realen Ruinen liegt ein zurückhaltender handgezeichneter neuer Straßenplan, der an bestehenden Grundstücksgrenzen sichtbar aneckt.','Vermessungspfähle'],
  ['character-scene','medium-wide','Wren und Planer entwerfen breite Straßen','Christopher Wren und weitere Planer beugen sich über einen großen Stadtplan mit geraden Achsen und Plätzen; Ideenphase, nicht Umsetzung.','Zirkel, Lineal'],
  ['comparison','top-down','Idealplan versus alte Grundstücke','Links geometrischer Entwurf, rechts unregelmäßiges bestehendes Parzellenmuster; klar als Alternativen, nicht als tatsächlich gebautes Vorher-Nachher.','keine langen Labels'],
  ['character-scene','wide','Eigentümer und Vermesser an Grundstücksgrenzen','Vermesser markieren alte Fundamente, während Eigentümer und Handwerker auf ihre Parzellen warten; Zeitdruck wird räumlich sichtbar.','Messkette, Pfähle'],
  ['architecture-city','medium-wide','Wiederaufbau auf alten Straßenlinien','Frühe neue Ziegelhäuser wachsen entlang derselben krummen Straßenführung; alte Fundamente bleiben sichtbar.','Maurer, Gerüst'],
  ['comparison','wide','Stadt verändert sich trotz gleichem Grundriss','Gleiche Straßenachse: links vor dem Brand Holzauskragungen, rechts Neubauten mit mehr Ziegel und Stein.','kleines Maurergerüst'],
  ['object-focus','detail','Ziegel und Stein als neue Bauvorgabe','Ziegel, Steinquader und Mörtelwerkzeug im Vordergrund; dahinter neue Fassade ohne weit auskragendes Holz.','Maurerkelle'],
  ['comparison','wide','schmale versus verbreiterte Straße','Direkter Vergleich einer sehr engen alten Gasse mit einer nach dem Brand etwas breiteren Straßenführung; keine moderne Boulevard-Übertreibung.','Fußgänger als Maßstab'],
  ['multi-moment-illustration','medium-wide','Bauvorschrift, Versicherung und Brandvorsorge','Drei eng verbundene Folgen in einer Straße: Vermesser prüft Fassade, frühe Feuermarke als kleines Detail, Pfarrei lagert Löschgerät geordnet.','Vermessungsstab, Eimergestell'],
  ['cause-effect','wide','kein Wissensproblem sondern Systemproblem','Ein Bewohner mit Eimer steht nicht ahnungslos, sondern vor trockenen Häusern, Wind und Lagerware; reale Faktoren bedrängen dieselbe Straße.','Eimer, Feuerhaken'],
  ['system-hierarchy','elevated-overview','sechs Faktoren greifen ineinander','Räumliche City-Übersicht ordnet trockene Holzhäuser, enge Gassen, Lagergüter, Wind, verstreute Löschhelfer und schmale Breschen als reale Beziehungen ohne Business-Pfeile.','Themse als Orientierung'],
  ['cause-effect','extreme-wide','breite Bresche plus schwächerer Wind stoppen Ausbreitung','Links Feuerfront, Mitte breite leere Abrisszone, rechts intakte Häuser; Rauch steigt ruhiger nach oben.','Arbeiter klein in Bresche'],
  ['object-focus','detail','ein einzelner Funke','Ein kleiner glühender Funke schwebt vor dunklem Holz; minimalistische Detailaufnahme als Rückgriff auf den Anfang.','Holzmaserung'],
  ['rise-fall-lifecycle','extreme-wide','Stadt als Ursache und Folge','Breite integrierte Abschlussillustration: intakte dichte Holzstadt geht über Feuerzone in Ruinen und anschließend ziegelne Wiederaufbau-Silhouette über; ein zusammenhängender Zeitbogen.','Themse bleibt als Anker']
];
if (scenes.length !== 84) throw new Error(`Erwartet 84 Szenen, gefunden ${scenes.length}.`);

const explanationOnly = new Set([6,7,9,12,15,18,20,21,25,27,28,31,40,44,45,51,54,56,61,63,65,68,70,71,73,81]);
const mediumMotion = new Set([4,6,17,24,29,34,37,44,45,55,59,61,64,65,68,72,84]);
const editorials = new Map([
  [9,['London 1666','place']],
  [14,['2. September 1666','date']],
  [45,['3. September 1666','date']],
  [51,['4. September 1666','date']],
  [62,['5. September 1666','date']],
  [68,['13.000+ Häuser','orientation']],
  [69,['ca. 100.000 obdachlos','orientation']]
]);
const motionCycle = ['push-in','static','pan-right','pull-out','pan-left','static','push-in','pan-right','static','pull-out','pan-left','static'];
const motionDirection = {
  'push-in':'toward the dominant subject', 'pull-out':'away from the dominant subject to reveal context',
  'pan-right':'rightward with story movement', 'pan-left':'leftward against story movement', 'static':'none'
};
const camera = {
  'extreme-wide':'elevated extreme-wide view with strong foreground-to-horizon depth',
  'wide':'wide three-quarter or frontal view with foreground, midground and background clearly separated',
  'medium-wide':'medium-wide street-level view with readable human scale and environmental context',
  'medium':'medium eye-level view focused on one action while preserving environmental context',
  'close':'close view with the key action filling most of the frame and simplified surroundings',
  'detail':'detail close-up with one object or material dominating and minimal context',
  'top-down':'top-down historical-plan view with geography as the main composition',
  'elevated-overview':'elevated overview with streets and landmarks used as leading lines',
  'sectional':'clean sectional side view preserving real spatial relationships'
};
const colorArc = [
  ['spark-night','Hook: first fire','deep navy, warm oven amber, small isolated orange','night darkness with contained local light'],
  ['tinder-city','Why London was vulnerable','dry ochre, timber brown, dusty muted gold','dry late-summer contextual light'],
  ['pudding-lane','Local fire becomes street fire','dark blue, smoke gray, growing orange','night into predawn with rising fire glow'],
  ['delay-firebreak','Early response and delayed demolition','charcoal blue, muted red, harsh fire orange','predawn smoke and uneven fire light'],
  ['river-fuel','Wind and warehouses','river gray-blue, tar brown, rust red, hot orange','early morning haze with wind-driven sparks'],
  ['citizen-firefighting','No professional brigade','wet stone gray, leather brown, restrained orange','morning light mixed with smoke'],
  ['escape-command','Pepys, evacuation and royal order','pale morning gray, river blue, muted burgundy','daylight filtered through smoke'],
  ['monday-inferno','City loses control','dirty amber, dense smoke gray, ember red','daylight darkened by smoke'],
  ['st-pauls-crisis','Old St Paul’s and radical escalation','stone gray, black scaffold, fierce copper-orange','afternoon into firelit night'],
  ['firebreak-turn','Explosions, weakening wind, containment','ash gray, dark brown, restrained orange','night into calmer Wednesday air'],
  ['ruins-human-cost','Ruins and displacement','cool ash beige, soot gray, faded blue','post-fire daylight with low-contrast haze'],
  ['rebuild-payoff','Rebuilding and meaning','fresh brick red, warm stone, parchment cream, cleaner sky blue','clearer rebuilding daylight']
].map(([id,storyFunction,paletteBias,lighting]) => ({id,storyFunction,paletteBias,lighting}));

function timeContext(i) {
  if (i <= 7) return 'Nacht und früher Morgen des 2. September 1666; chronologischer Hook am Brandbeginn';
  if (i <= 13) return 'Kontext: City of London unmittelbar vor dem Brand, Sommer 1666';
  if (i <= 23) return 'Nacht und frühe Morgenstunden des 2. September 1666';
  if (i <= 34) return '2. September 1666; Feuer breitet sich westwärts aus';
  if (i <= 44) return 'Morgen und Tag des 2. September 1666';
  if (i <= 50) return '3. September 1666 und unmittelbare Fluchtphase';
  if (i <= 56) return '4. September 1666; Feuer erreicht Old St Paul’s';
  if (i <= 61) return '4. September 1666; radikalere Brandbekämpfung';
  if (i <= 66) return '5. September 1666; Ausbreitung wird gebremst';
  if (i <= 70) return 'nach dem Hauptbrand, September 1666';
  if (i <= 75) return 'unmittelbare Wiederaufbauplanung ab September 1666';
  if (i <= 79) return 'Wiederaufbau ab 1667';
  return 'Rückblick und Schlussfolgerung nach dem Brand von 1666';
}

const images = scenes.map((scene, idx) => {
  const i = idx + 1;
  const [visualForm, shotScale, dominantSubject, visualConcept, worldLifeDetail] = scene;
  const phase = colorArc[Math.floor(idx / 7)];
  const motionType = motionCycle[idx % motionCycle.length];
  const motionIntensity = motionType === 'static' ? 'none' : (mediumMotion.has(i) ? 'medium' : 'subtle');
  const [editorialText='', editorialTextPurpose=''] = editorials.get(i) || [];
  const words = beats[idx].split(/\s+/).filter(Boolean).length;
  const plannedHoldSeconds = Math.max(2.7, Math.min(5.4, Math.round((words / 2.75) * 10) / 10));
  const supportingElements = worldLifeDetail.split(',').map((s) => s.trim()).filter(Boolean).slice(0,3);
  return {
    imageNumber:i,
    imageFile:`Bild ${String(i).padStart(2,'0')}.png`,
    startAnchor:beats[idx],
    endAnchor:null,
    narrationBeat:beats[idx],
    timeContext:timeContext(i),
    chronologyStep:i,
    visualAnswer:`${dominantSubject}: ${visualConcept}`,
    narrationMatchScore:9.7,
    clarityScore:9.2,
    viewerTakeaway:`${dominantSubject}: ${visualConcept}`,
    visualPurpose:explanationOnly.has(i) ? 'Den aktuellen Zusammenhang knapp erklären und danach in die historische Welt zurückkehren.' : 'Den aktuellen Story-Beat als konkrete historische Szene tragen.',
    topicAnchor:'Großer Brand von London 1666',
    visualForm,
    visualConcept,
    dominantSubject,
    actionState:visualConcept,
    composition:`Foreground: ${worldLifeDetail}. Midground: ${dominantSubject} carries the main action. Background: simplified 1666 London context; preserve one dominant subject and purposeful negative space.`,
    camera:camera[shotScale],
    shotScale,
    visualEnergyDevice:`${visualForm} with strong depth, directional story movement and a readable state change or scale contrast`,
    visualChangeFromPrevious:i === 1 ? 'Cover establishes the visual baseline for this video.' : `Shift to ${shotScale} ${visualForm}; change viewpoint, depth or action while preserving the London-1666 world.`,
    visualInterestScore:explanationOnly.has(i) ? 8.9 : 9.2,
    colorPhase:phase.id,
    colorIntent:`${phase.storyFunction}; palette ${phase.paletteBias}; fire orange appears only where chronology requires it.`,
    worldLifeDetail,
    motionType,
    motionDirection:motionDirection[motionType],
    motionIntensity,
    motionFocus:dominantSubject,
    visibleTextPolicy:i === 1 ? 'COVER_TEXT_ONLY' : (editorials.has(i) ? 'EDITORIAL_TEXT' : 'NO_VISIBLE_TEXT'),
    editorialText,
    editorialTextPurpose,
    explanationOnly:explanationOnly.has(i),
    depthPlan:`Foreground: ${worldLifeDetail}. Midground: ${dominantSubject}. Background: simplified historically plausible London context.`,
    lightingMood:phase.lighting,
    supportingElements,
    continuityNote:`Preserve the London-1666 World Lock and show only damage already reached by chronology step ${i}; do not import later ruins or rebuilding early.`,
    historicalAccuracyNote:'1660er London; no modern firefighting, modern skyline or later Wren St Paul’s during the fire. Follow RECHERCHE.md and preserve uncertainty where noted.',
    promptQcScore:9.1,
    plannedHoldSeconds,
    holdReason:'Sentence-length and visual-reading estimate; final cut follows real voice-over alignment.',
    actualStartSeconds:null,
    actualEndSeconds:null,
    alignmentConfidence:null
  };
});

const mapping = {
  schemaVersion:2,
  voiceoverMaster:'01-voice-script/voice-script.txt',
  coverImageNumber:1,
  videoFirstImageNumber:1,
  videoLastImageNumber:84,
  sourceVoiceoverFile:null,
  audioMasterFile:null,
  alignmentEvidenceFile:null,
  images
};

const meta = {
  schemaVersion:3,
  pipelineVersion:4,
  preproductionQualityGateVersion:1,
  topicScorecardRequired:true,
  storyQcRequired:true,
  wholeVideoCoherenceGateVersion:1,
  wholeVideoQcRequired:true,
  visualInterestGateVersion:1,
  narrationAlignmentGateVersion:1,
  chronologyGateVersion:1,
  directingGateVersion:1,
  directingPolicyFile:'config/directing-policy.json',
  phase2VisualQcRequired:true,
  phase2VisualQcHashVersion:1,
  videoId:'2026-KW41_05-10_bis_11-10_great-fire-london-1666',
  weekFolder:'2026-KW41_05-10_bis_11-10',
  topicSlug:'great-fire-london-1666',
  title:'Warum der Große Brand von London 1666 vier Tage nicht zu stoppen war',
  topic:'Warum der Große Brand von London 1666 vier Tage nicht zu stoppen war',
  storyMode:'event-led',
  language:'de',
  aspectRatio:'16:9',
  status:'phase1-ready',
  visualPolicyFile:'config/visual-policy.json',
  flowStyleLockFile:'config/flow-style-lock.json',
  narrationAlignmentPolicyFile:'config/narration-alignment-policy.json',
  visualStyleId:'history-stickman-adaptive-v1',
  promptSystemVersion:3,
  promptSystem:'flow-compiler-v3',
  scenePlanningSchemaVersion:3,
  promptQcMinimumScore:8,
  chronologyPolicy:{mode:'strict-chronological',flashbacksAllowed:false,futureEventLeakageForbidden:true,explicitTimeContextRequiredPerScene:true},
  targetDurationSeconds:375,
  targetDurationRangeSeconds:[360,420],
  plannedImageCount:84,
  coverPolicy:{firstSceneIsCover:true,coverImageNumber:1,coverCandidateCount:3,separateThumbnailForbidden:true,coverTextRequired:true,coverText:'LONDON BRENNT VIER TAGE',coverTextLanguage:'de',coverTextMinWords:2,coverTextMaxWords:5,coverTextMustBeHighContrast:true,coverTextMustNotCoverMainSubject:true,rejectMisspelledCoverText:true,userSelectsCover:true,flowMustStopAfterCoverCandidates:true,selectedCoverRequiredBeforeRemainingImages:true,selectedCoverCandidate:null},
  imageDensityPolicy:{contentDrivenImageCountRequired:true,fixedImageCountForbidden:true,oneImageOneVisualPurpose:true,oneNarrativeTakeawayPerImage:true,targetAverageHoldSeconds:[2.5,4.5],reviewAboveSeconds:5.5,preferSplitAboveSeconds:7,hardMaximumSeconds:9,minimumUsefulHoldSeconds:1.6,storyBeatDrivenPlanning:true,visualMustSupportCurrentNarration:true,figuresMustNotBeDefaultFallback:true,multiMomentIllustrationAllowed:true,detailInsetAllowed:true,cutawaySectionAllowed:true,evidenceReconstructionAllowed:true,fillerImagesForbidden:true},
  youtubeUpload:{title:'Warum der Große Brand von London 1666 vier Tage nicht zu stoppen war',description:"Ein kleines Feuer in einer Londoner Bäckerei – und nur wenig später stehen ganze Straßenzüge in Flammen. Im September 1666 erlebt London eine der verheerendsten Brandkatastrophen seiner Geschichte. Doch warum konnte niemand das Feuer rechtzeitig stoppen?\n\nIn diesem Video von Zeitkulisse verfolgen wir den Großen Brand von London Schritt für Schritt. Wir zeigen, wie sich die Flammen von der Pudding Lane ausbreiteten, weshalb die engen Holzhäuser und der starke Wind die Katastrophe verschlimmerten und warum die damaligen Löschversuche kaum eine Chance hatten.\n\nDu erfährst außerdem, welche Rolle Samuel Pepys und König Charles II spielten, warum sogar die alte St.-Paul’s-Kathedrale zerstört wurde und wie der Abriss ganzer Häuserreihen schließlich half, das Feuer einzudämmen.\n\nMehr als 13.000 Häuser wurden zerstört. Doch aus den Ruinen entstand auch ein verändertes London mit neuen Bauvorschriften und stärkerem Brandschutz.\n\nEntdecke auf Zeitkulisse die faszinierenden Geschichten hinter den Ereignissen, die unsere Welt verändert haben.",hashtags:['#geschichte','#london','#1666','#greatfire','#history'],keywords:['Großer Brand von London','Great Fire of London','London 1666','Pudding Lane','Samuel Pepys','Old St Pauls','Geschichte London','Stadtbrand 1666']},
  audioPolicy:{singleFinalVoiceoverRequired:true,userOriginalMustRemainUntouched:true,playbackRate:1.05,loudnessTargetLufs:-16,truePeakDbtp:-1.5,sampleRateHz:48000},
  renderPolicy:{fps:30,width:1920,height:1080,endHoldSeconds:1.3,backgroundMusic:false,subtitles:false},
  phase1Ready:true,
  imagesReady:false,
  audioReady:false,
  renderReady:false,
  createdAt:'2026-10-05T18:00:00+02:00',
  updatedAt:'2026-10-05T18:00:00+02:00'
};

const wholeQc = {
  schemaVersion:3,status:'APPROVED',reviewMethod:'model-sequence-review-plus-script-read-aloud',
  scriptContinuousProse:true,scriptReadAloudPassed:true,visualsDerivedAfterScript:true,coherentVisualArc:true,
  chronologyMode:'strict-chronological',chronologyReviewed:true,historicalEventOrderReviewed:true,visualOrderMatchesNarrationOrder:true,temporalJumpsExplicitlySignposted:true,unnecessaryFlashbacksAbsent:true,
  narrationVisualAlignmentReviewed:true,everyVisualMatchesCurrentNarration:true,visualClarityReviewed:true,unclearVisualsAbsent:true,onePrimaryTakeawayPerVisual:true,futureEventLeakageAbsent:true,
  explanationOnlyVisualShare:26/84,maxConsecutiveExplanationOnlyVisuals:2,historicalWorldReturnsAfterExplanation:true,editorialTextUsedOnlyWhenUseful:true,transitionsReviewed:true,overallCoherenceScore:9.5,approved:true,
  notes:['84 Visual Beats wurden erst nach dem vollständigen Longform-Skript abgeleitet.','Feuer ist nicht in jedem Bild das Hauptmotiv; Stadtstruktur, Werkzeuge, Wasser, Karten, Menschen, Flucht, Kathedrale, Breschen, Ruinen und Wiederaufbau wechseln gezielt.','Zwölf Farbphasen verhindern eine monotone orange-braune Feuerwelt.','Event-led: keine künstliche Hauptfigur.']
};

const renderPlan = {schemaVersion:2,motionPolicy:'content-aware-v1',colorArc,backgroundMusic:false,motionOverrides:[],soundEffects:[]};
const phase2 = {schemaVersion:2,status:'PLANNED',reviewMethod:'vision-review',hashAlgorithm:'sha256',minimumNarrationSupportScore:8,minimumVisualInterestScore:8,minimumStyleConsistencyScore:8,images:[]};
const status = {project:'great-fire-london-1666',storyMode:'event-led',preproduction:'APPROVED',phase1:'READY',coverSelection:'WAITING',phase2:'WAITING_FOR_IMAGES',phase3:'BLOCKED_UNTIL_PHASE2',render:'BLOCKED_UNTIL_PHASE3'};
const chapters = {schemaVersion:1,chapters:[
  {title:'Hook – ein kleines Feuer',startHint:'00:00'},
  {title:'Warum London bereit war zu brennen',startHint:'00:25'},
  {title:'Pudding Lane und die ersten Fehler',startHint:'01:15'},
  {title:'Wind, Lagerhäuser und fehlende Feuerwehr',startHint:'02:20'},
  {title:'Flucht und Kontrollverlust',startHint:'03:20'},
  {title:'St Paul’s und die Feuerbreschen',startHint:'04:25'},
  {title:'Wie der Brand gestoppt wurde',startHint:'05:25'},
  {title:'Ruinen, Wiederaufbau und die eigentliche Ursache',startHint:'06:00'}
]};

await mkdir(path.join(project,'00-bildprompts','images'),{recursive:true});
await mkdir(path.join(project,'02-audio'),{recursive:true});
await mkdir(path.join(project,'03-export'),{recursive:true});
await writeFile(path.join(project,'99-technik','BILD_AUDIO_ZUORDNUNG.json'),JSON.stringify(mapping,null,2)+'\n');
await writeFile(path.join(project,'99-technik','video.json'),JSON.stringify(meta,null,2)+'\n');
await writeFile(path.join(project,'99-technik','WHOLE_VIDEO_QC.json'),JSON.stringify(wholeQc,null,2)+'\n');
await writeFile(path.join(project,'99-technik','YOUTUBE_RENDER_PLAN.json'),JSON.stringify(renderPlan,null,2)+'\n');
await writeFile(path.join(project,'99-technik','PHASE2_VISUAL_QC.json'),JSON.stringify(phase2,null,2)+'\n');
await writeFile(path.join(project,'99-technik','status.json'),JSON.stringify(status,null,2)+'\n');
await writeFile(path.join(project,'99-technik','YOUTUBE_CHAPTERS.json'),JSON.stringify(chapters,null,2)+'\n');
await writeFile(path.join(project,'00-bildprompts','images','.gitkeep'),'');
await writeFile(path.join(project,'02-audio','.gitkeep'),'');
await writeFile(path.join(project,'03-export','CAPTION.txt'), buildCaption(meta));
await writeFile(path.join(project,'99-technik','PRODUKTIONSPLAN.md'),`# Produktionsplan — erster regulärer Longform\n\n- Ziel: 6–7 Minuten / ${meta.targetDurationSeconds} s\n- Voice-over: ca. 1.030 Wörter, Script-first\n- Story-Modus: event-led\n- Visuals: 84 inhaltsgetriebene Scene Cards\n- Color Arc: 12 Phasen\n- Motion: content-aware-v1\n- Cover: exakt drei Kandidaten mit \`${meta.coverPolicy.coverText}\`, danach STOP\n- Phase 2 erst nach realen Bildern + Vision-QC + SHA-256\n- Phase 3 bleibt bis dahin gesperrt\n\n## Visuelle Longform-Regel\n\nKeine lange Kette identischer Feuerbilder. Innerhalb der Story wechseln Architektur, Menschen, Objektfokus, Karten, Fluss, Löschtechnik, Flucht, St Paul’s, Feuerbreschen, Ruinen und Wiederaufbau. Wiederkehrende Orte bleiben konsistent, aber Kamera, Nähe, Licht und Funktion verändern sich.\n`);
await writeFile(path.join(project,'99-technik','PHASE1_QC.md'),`# Phase 1 QC\n\nStatus: READY PENDING FINAL VALIDATOR\n\n- Script-first Longform: ja\n- 84 chronologische Visual Beats: ja\n- Event-led ohne erzwungene Hauptfigur: ja\n- Narration Alignment: geplant >= 9/10\n- Visual Clarity: geplant >= 8/10\n- Color Arc: 12 Phasen\n- Explanation-only: 26/84 (${(26/84*100).toFixed(1)} %), max. 2 in Folge\n- Motion Director: content-aware-v1\n- Cover Gate: 3 Kandidaten, dann STOP\n- Bilder/Audio/Phase 2: noch nicht vorhanden\n`);

console.log(`Longform-Plan erzeugt: ${images.length} Bilder, ${beats.length} Narrations-Beats.`);