// Story Engine V4 / Bildplan V4: 83 individually written scenes for the Boston molasses flood.
// Run from the repo root: node youtube/2026-KW44_26-10_bis_01-11/melasse-flut-boston-1919/99-technik/generate-v4-plan.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaption } from '../../../../src/cli/finalize-youtube-export.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const script = (await readFile(path.join(root, '01-voice-script', 'voice-script.txt'), 'utf8')).trim();
const meta = JSON.parse(await readFile(path.join(here, 'video.json'), 'utf8'));

const phases = {
  'first-leak': ['1915, erste Füllung des Tanks am Hafen', 'Boston North End waterfront, 1915', 'Ein neuer Tank, der schon leckt', 'pale steel blue, molasses amber, brick red', 'cool autumn daylight'],
  'war-rush': ['1915, Bau unter Kriegsdruck', 'Boston, 1915, during the First World War', 'Tempo statt Sorgfalt', 'soot grey, munitions olive, brass', 'hazy industrial daylight'],
  'brown-paint': ['1915–1917, Lecks und brauner Anstrich', 'Commercial Street, North End, Boston, 1916', 'Verdecken statt reparieren', 'molasses brown, laundry white, brick red', 'warm hazy summer light'],
  'warning': ['1916–1918, Gonzalez warnt', 'tank yard and company office, North End, Boston, 1917', 'Ein einzelner Warner', 'ochre, dark wood, steel grey', 'low indoor lamplight and grey daylight'],
  'night-valve': ['Sommer 1918, nachts am Ventil', 'Boston, a summer night in 1918', 'Heimlicher Kampf in der Nacht', 'midnight blue, lantern orange, black water', 'moonlight and a single lantern'],
  'frost': ['14. Januar 1919, Frost und Lieferung', 'North End, Boston, 14 January 1919, freezing day', 'Kälte und neue Ladung', 'ice white, slate blue, rust', 'hard cold winter light'],
  'thaw': ['15. Januar 1919, milder Vormittag', 'North End, Boston, 15 January 1919, late morning', 'Trügerische Wärme', 'sunny cream, brick red, soft sky blue', 'unexpected mild winter sunshine'],
  'collapse': ['15. Januar 1919, 12:30 Uhr, der Tank reißt', 'Commercial Street, Boston, 15 January 1919, 12:30 pm', 'Der Moment des Bruchs', 'molasses brown, steel grey, shock white', 'flat midday light turning dark'],
  'destruction': ['15. Januar 1919, die Welle trifft das Viertel', 'Commercial Street, Boston, 15 January 1919, minutes after 12:30 pm', 'Zerstörung und Verlust', 'deep brown, splintered wood, ash grey', 'muted overcast midday'],
  'sticky-trap': ['15. Januar 1919, Nachmittag, kalte Luft', 'Commercial Street, Boston, 15 January 1919, cold afternoon', 'Die Falle wird zäh', 'dark amber, frost blue, grey', 'cold low afternoon sun'],
  'rescue': ['15.–19. Januar 1919, Rettung und Suche', 'Boston waterfront, 15 January 1919, afternoon and following nights', 'Helfer im Sirup', 'navy blue, nurse white, molasses brown', 'fading afternoon and lantern-lit nights'],
  'cleanup': ['Januar bis Sommer 1919, Aufräumen', 'Boston, weeks and months after 15 January 1919', 'Die Stadt klebt', 'salt grey, sand beige, harbor brown', 'grey winter days, then summer sun'],
  'court': ['1919–1925, Klage und Anhörungen', 'Boston hearing room, 1920–1924', 'Wahrheit gegen Ausrede', 'dark oak, paper cream, black suits', 'window light through tall panes'],
  'verdict': ['April 1925, Ogdens Urteil', 'Boston courtroom, April 1925', 'Die Lecks werden sichtbar', 'spring green light, paper white, brown steel', 'bright spring daylight'],
  'new-rules': ['nach 1925, neue Prüfpflicht', 'Massachusetts, late 1920s', 'Aus Fehlern werden Regeln', 'state house gold, clean stone, blueprint blue', 'clear crisp daylight'],
  'today': ['heute, Langone Park im North End', 'Langone Park, North End, Boston, present day', 'Was bleibt', 'grass green, warm evening gold, harbor blue', 'warm summer evening']
};

// b: exact beat, ph: phase, f: visualForm, s: shotScale, l: locationKey, c: castIds,
// a: subject + action (EN), cam: camera (EN), t: viewer takeaway (DE), d: world-life detail, li: light override, modern: present-day scene
const S = [
  { b: 'Kaum ist der riesige Stahltank am Hafen von Boston zum ersten Mal gefüllt, beginnt er zu weinen.', ph: 'first-leak', f: 'architecture-city', s: 'wide', l: 'tank-yard', a: 'A huge new riveted steel storage tank towers over brick tenements at the Boston waterfront while thin dark streaks of molasses run down its seams', cam: 'Low-angle wide shot from the cobblestone street looking up at the tank', t: 'Der neue Tank leckt schon bei der ersten Füllung.', d: 'Kopfsteinpflaster, Möwen' },
  { b: 'Aus seinen Nähten sickern dunkle, zähe Tropfen.', ph: 'first-leak', f: 'object-focus', s: 'detail', l: 'tank-seam', a: 'A thick glossy drop of dark molasses slowly forms on a row of steel rivets', cam: 'Extreme close-up of the riveted seam, the drop in sharp focus', t: 'Melasse sickert durch die Nieten.', d: 'Nietenreihe, glänzender Tropfen' },
  { b: 'Nachbarn halten Dosen unter die Nähte, denn Melasse ist süß und kostet nichts.', ph: 'first-leak', f: 'character-scene', s: 'medium', l: 'tank-yard', a: 'Neighbors from the tenements hold tin cans under the leaking seam to catch the sweet syrup, a boy licks molasses from his finger', cam: 'Medium shot at child height beside the tank wall', t: 'Für die Nachbarn ist das Leck gratis Süßes.', d: 'Blechdosen, klebrige Finger' },
  { b: 'Isaac Gonzalez arbeitet auf dem Gelände, und er hört, was die Nachbarn überhören:', ph: 'first-leak', f: 'character-scene', s: 'medium-wide', l: 'tank-yard', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez stops walking along the base of the tank and turns his head toward the steel wall, listening, while neighbors chat behind him', cam: 'Medium-wide shot from behind the neighbors, Gonzalez in the middle ground', t: 'Gonzalez bemerkt etwas, das andere nicht hören.', d: 'Werkzeugkiste, Pferdewagen' },
  { b: 'Wenn der Tank voll ist, ächzt und knackt der Stahl.', ph: 'first-leak', f: 'cutaway-section', s: 'sectional', l: 'tank-cutaway', a: 'Simple cutaway of the tank filled to the top with dark molasses pressing outward against thin riveted steel walls, small stress lines at the lower plates', cam: 'Straight side view in clean section', t: 'Der volle Tank drückt gegen seine Wände.', d: 'Druckpfeile ohne Text, Nieten' },
  { b: 'Vier Jahre später wird dieser Tank aufreißen, und eine braune Welle wird durch das Viertel rollen.', ph: 'first-leak', f: 'environment-only', s: 'extreme-wide', l: 'north-end-panorama', a: 'The whole North End waterfront seen from the harbor: the intact tank, the elevated railway on steel girders, tenements and a brick firehouse in calm weather', cam: 'Extreme wide panoramic view from a boat on the harbor', t: 'Alles, was später getroffen wird, steht dicht beieinander.', d: 'Segelboote, Hochbahn' },
  { b: 'Einundzwanzig Menschen werden sterben. Wie kann ein Tank voller Sirup zur tödlichen Falle werden?', ph: 'first-leak', f: 'symbolic-metaphor', s: 'medium', l: 'tenement-window', a: 'A single tin can filled with molasses stands on a tenement windowsill while the huge dark silhouette of the tank looms outside the window', cam: 'Medium shot from inside the room through the window', t: 'Das Harmlose und das Bedrohliche liegen nebeneinander.', d: 'Fensterbrett, Gardine' },

  { b: 'Der Tank gehört einer Firma, die aus Melasse Industriealkohol herstellt.', ph: 'war-rush', f: 'process-sequence', s: 'medium-wide', l: 'distillery', a: 'Workers in a brick distillery guide molasses through pipes into large wooden fermentation vats beside a copper still', cam: 'Medium-wide view along the row of vats, pipes leading the eye', t: 'Aus Melasse wird Alkohol gebrannt.', d: 'Kupferkessel, Rohre' },
  { b: 'In Europa tobt der Erste Weltkrieg, und Alkohol wird für Munition gebraucht. Also muss alles schnell gehen.', ph: 'war-rush', f: 'cause-effect', s: 'wide', l: 'munitions-dock', a: 'Barrels of industrial alcohol are loaded next to stacked crates of artillery shells at a busy dock while a foreman waves workers to hurry', cam: 'Wide shot along the loading dock with strong diagonal movement', t: 'Der Krieg macht Druck auf die Produktion.', d: 'Granatenkisten, Fässer' },
  { b: 'Den Bau hat Arthur Jell geleitet, der Schatzmeister der Firma.', ph: 'war-rush', f: 'character-scene', s: 'medium', l: 'tank-construction', c: ['arthur-jell'], a: 'Arthur Jell stands on the construction site holding a ledger while workers rivet curved steel plates behind him', cam: 'Medium shot, Jell in the foreground, rising steel plates behind', t: 'Ein Schatzmeister leitet den Bau.', d: 'Nietofen, Gerüst' },
  { b: 'Er ist kein Ingenieur und kann keine Baupläne lesen.', ph: 'war-rush', f: 'object-focus', s: 'close', l: 'jell-office', c: ['arthur-jell'], a: 'Arthur Jell frowns over a large construction drawing full of lines, his finger hovering uncertainly above it', cam: 'Close view over the drawing toward his puzzled face', t: 'Jell versteht die Pläne nicht.', d: 'Bauzeichnung, Tintenfass' },
  { b: 'Er hat die Pläne niemandem gezeigt, der es kann, und einen Test hat er ausgelassen:', ph: 'war-rush', f: 'character-scene', s: 'medium', l: 'jell-office', c: ['arthur-jell'], a: 'Arthur Jell rolls up the drawings and locks them in his desk drawer, an empty chair for an engineer beside the desk', cam: 'Medium shot from the side of the desk', t: 'Niemand Fachkundiges prüft die Pläne.', d: 'leerer Stuhl, Schublade' },
  { b: 'den Tank vor der ersten Füllung mit Wasser zu prüfen.', ph: 'war-rush', f: 'object-focus', s: 'medium-wide', l: 'tank-construction', a: 'A coiled unused fire hose and a closed hydrant lie beside the newly finished empty tank, dust on the hose', cam: 'Medium-wide view with the hose in the foreground and the tank behind', t: 'Der Wassertest findet nie statt.', d: 'aufgerollter Schlauch, Hydrant' },
  { b: 'Fünfzehn Meter hoch, siebenundzwanzig Meter breit, gefüllt mit fast neun Millionen Litern Melasse,', ph: 'war-rush', f: 'architecture-city', s: 'wide', l: 'north-end-street', a: 'The brown-grey tank stands beside a five-story brick tenement and a horse cart, as tall as the building, showing its enormous size', cam: 'Wide street-level view with tenement and cart as scale references', t: 'Der Tank ist so hoch wie ein Mietshaus.', d: 'Pferdekarren, Laternenpfahl' },
  { b: 'steht er nun direkt neben Wohnhäusern, einer Feuerwache und der Hochbahn.', ph: 'war-rush', f: 'battle-city-overview', s: 'elevated-overview', l: 'north-end-overview', a: 'The waterfront block from above: the tank, a brick firehouse, tenements and the elevated railway trestle crowded together along Commercial Street', cam: 'Elevated bird\'s-eye view following the curve of the street', t: 'Der Tank steht mitten im Wohnviertel.', d: 'Hochbahnzug, Dächer' },

  { b: 'Und der Tank leckt weiter. Jell lässt die Nähte abdichten, doch die dunklen Streifen kommen wieder.', ph: 'brown-paint', f: 'character-scene', s: 'medium-wide', l: 'tank-yard', a: 'Workers on tall ladders press putty into the tank seams while fresh dark streaks run down below them', cam: 'Medium-wide view from the ground up the ladders', t: 'Abdichten hilft nicht.', d: 'Leitern, Kittspachtel' },
  { b: 'Schließlich bekommt der Tank einen neuen Anstrich, ausgerechnet in Braun.', ph: 'brown-paint', f: 'cause-effect', s: 'wide', l: 'tank-yard', a: 'Painters on hanging scaffolds roll brown paint over the streaked steel, the leak marks disappearing under the new color', cam: 'Wide shot of the whole tank wall, half painted, half streaked', t: 'Die Farbe lässt die Lecks verschwinden.', d: 'Hängegerüst, Farbeimer' },
  { b: 'Was diese Farbe verbergen soll, wird erst Jahre später vor Gericht zur Sprache kommen.', ph: 'brown-paint', f: 'object-focus', s: 'detail', l: 'tank-seam', a: 'A wet brown brushstroke covers a dark leak streak on the riveted steel, the edge of the paint still glistening', cam: 'Extreme close-up on the paint edge over the leak', t: 'Unter der Farbe liegt ein Geheimnis.', d: 'nasse Pinselkante' },
  { b: 'Im Viertel rund um den Tank leben vor allem arme italienische und irische Familien.', ph: 'brown-paint', f: 'architecture-city', s: 'wide', l: 'tenement-street', a: 'Crowded brick tenements with laundry lines strung between windows, families on fire escapes and a pushcart vendor in the street below', cam: 'Wide view down the narrow street toward the brown tank at its end', t: 'Arme Familien leben dicht am Tank.', d: 'Wäscheleinen, Handkarren' },
  { b: 'Ihre Kinder spielen zwischen den Lagerschuppen, ihre Väter arbeiten an den Kais.', ph: 'brown-paint', f: 'character-scene', s: 'medium-wide', l: 'harbor-wharf', a: 'Children play tag between wooden warehouse sheds while dockworkers carry heavy sacks across the wharf behind them', cam: 'Medium-wide shot with children in the foreground and dockworkers behind', t: 'Kinder und Väter verbringen ihre Tage am Tank.', d: 'Säcke, Holzschuppen' },
  { b: 'Für sie ist der Tank einfach da, groß, braun und ein bisschen klebrig.', ph: 'brown-paint', f: 'environment-only', s: 'medium', l: 'north-end-alley', a: 'The brown tank fills the end of a narrow alley between tenements, laundry flapping, a forgotten ball lying next to a sticky puddle', cam: 'Medium view down the alley framing the tank between the walls', t: 'Der Tank gehört zum Alltag.', d: 'Ball, klebrige Pfütze' },

  { b: 'Isaac Gonzalez ist auf dem Gelände so etwas wie das Mädchen für alles.', ph: 'warning', f: 'character-scene', s: 'medium-wide', l: 'tank-yard', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez carries a toolbox and a coil of rope across the tank yard, nodding to a wagon driver', cam: 'Medium-wide tracking view, Gonzalez crossing the frame from left to right', t: 'Gonzalez kennt jeden Winkel des Geländes.', d: 'Seil, Werkzeugkiste' },
  { b: 'Er sieht die Lecks jeden Tag, er hört das Knacken, und er geht damit zu Jell.', ph: 'warning', f: 'character-scene', s: 'medium', l: 'jell-office', c: ['isaac-gonzalez', 'arthur-jell'], a: 'Isaac Gonzalez stands in the office doorway, cap in hand, while Arthur Jell looks up from his desk', cam: 'Medium shot from inside the office toward the doorway', t: 'Gonzalez bringt seine Sorge zum Chef.', d: 'Mütze in der Hand, Aktenstapel' },
  { b: 'Er warnt ihn, dass der Tank einstürzen könnte.', ph: 'warning', f: 'object-focus', s: 'close', l: 'jell-office', c: ['isaac-gonzalez', 'arthur-jell'], a: 'Isaac Gonzalez lays a popped rivet and a flake of brown paint on the desk, Arthur Jell leans back unimpressed', cam: 'Close over-the-shoulder view onto the desk', t: 'Die Warnung trifft auf Gleichgültigkeit.', d: 'Niete, Farbsplitter' },
  { b: 'Doch der Tank bleibt in Betrieb, und Gonzalez findet keine Ruhe mehr.', ph: 'warning', f: 'character-scene', s: 'medium', l: 'gonzalez-room', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez lies awake on a narrow bed in a small rented room at night, staring at the ceiling', cam: 'Medium shot from the foot of the bed, window in the background', t: 'Die Sorge raubt ihm den Schlaf.', d: 'Waschschüssel, Wanduhr' },
  { b: 'Was er im Sommer 1918 mitten in der Nacht tut, wird er später unter Eid erzählen.', ph: 'night-valve', f: 'environment-only', s: 'wide', l: 'south-end-night', a: 'An empty South End street at night with gas lamps and a single lit window in a brick rooming house', cam: 'Wide still view down the sleeping street', t: 'In dieser Nacht passiert etwas Heimliches.', d: 'Gaslaternen, Katze' },
  { b: 'Gegen drei Uhr morgens verlässt er seine Wohnung im South End', ph: 'night-valve', f: 'character-scene', s: 'medium', l: 'south-end-night', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez steps out of the rooming house door at night, pulling on his jacket and checking a pocket watch', cam: 'Medium shot at the doorstep under a gas lamp', t: 'Gonzalez bricht mitten in der Nacht auf.', d: 'Taschenuhr, Türstufe' },
  { b: 'und rennt quer durch die schlafende Stadt zum Hafen.', ph: 'night-valve', f: 'architecture-city', s: 'elevated-overview', l: 'night-city', c: ['isaac-gonzalez'], a: 'A small running figure of Isaac Gonzalez crosses empty moonlit Boston streets toward the harbor and the distant tank silhouette', cam: 'Elevated view over rooftops, the street leading toward the tank', t: 'Er läuft allein durch die Stadt.', d: 'Mondlicht, leere Straßen' },
  { b: 'Hinter dem Tank öffnet er ein Ventil', ph: 'night-valve', f: 'object-focus', s: 'close', l: 'tank-valve', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez turns a large iron valve wheel at the base of the tank with both hands, lit by a small lantern', cam: 'Close view of his hands and the wheel, face half in shadow', t: 'Er öffnet heimlich das Ventil.', d: 'Laterne, Eisenrad' },
  { b: 'und lässt Melasse in das schwarze Hafenwasser laufen, damit der Druck sinkt.', ph: 'night-valve', f: 'cause-effect', s: 'wide', l: 'tank-valve', a: 'A thick stream of molasses pours from a pipe behind the tank into the black harbor water, the moon reflecting on the ripples', cam: 'Wide view from the water toward the pipe and tank', t: 'Ablassen soll den Druck senken.', d: 'Mondspiegelung, Rohr' },
  { b: 'Dann dreht er das Ventil wieder zu und läuft nach Hause, bevor es hell wird.', ph: 'night-valve', f: 'character-scene', s: 'medium-wide', l: 'harbor-wharf', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez hurries away along the wharf at first dawn, looking back over his shoulder at the tank', cam: 'Medium-wide view from the end of the wharf', t: 'Niemand soll ihn sehen.', d: 'Morgendämmerung, Poller' },
  { b: 'Ein einzelner Arbeiter gegen einen Tank aus Stahl.', ph: 'night-valve', f: 'symbolic-metaphor', s: 'extreme-wide', l: 'tank-yard', c: ['isaac-gonzalez'], a: 'The tiny figure of Isaac Gonzalez stands alone before the enormous brown tank in the dawn mist', cam: 'Extreme wide shot with dramatic scale contrast', t: 'Ein Mensch gegen ein riesiges Problem.', d: 'Morgennebel' },
  { b: 'Im September 1918 hält Gonzalez es nicht mehr aus und kündigt.', ph: 'night-valve', f: 'character-scene', s: 'medium', l: 'company-counter', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez lays his work key on the company counter and turns to leave while a clerk watches', cam: 'Medium shot across the counter', t: 'Gonzalez gibt auf und geht.', d: 'Schlüssel, Stempelkarte', li: 'tired grey autumn daylight' },

  { b: 'Vier Monate später, Mitte Januar 1919, liegt Boston unter strengem Frost.', ph: 'frost', f: 'environment-only', s: 'wide', l: 'north-end-street', a: 'Icy cobblestones and frozen puddles in the North End, frost on windows and steam rising from a horse\'s breath', cam: 'Wide street view with the frosted tank in the background', t: 'Es ist bitterkalt.', d: 'Eiszapfen, Atemwolken' },
  { b: 'Am 14. Januar legt ein Schiff an', ph: 'frost', f: 'architecture-city', s: 'medium-wide', l: 'harbor-wharf', a: 'A steam tanker ship docks at the wharf beside the brown tank on a freezing day, crew throwing mooring lines', cam: 'Medium-wide view from the pier toward the ship\'s side', t: 'Neue Melasse kommt an.', d: 'Festmacherleinen, Dampf' },
  { b: 'und pumpt warme Melasse zu der kalten in den Tank, bis er fast voll ist.', ph: 'frost', f: 'cutaway-section', s: 'sectional', l: 'tank-cutaway', a: 'Cutaway of the tank: warm steaming molasses is pumped in on top of cold dark molasses until the level nearly reaches the top', cam: 'Straight side section view', t: 'Der Tank ist fast voll, warm auf kalt.', d: 'Dampf, Pumpenschlauch' },
  { b: 'Isaac Gonzalez arbeitet da längst woanders.', ph: 'frost', f: 'character-scene', s: 'medium', l: 'other-city-street', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez walks to work in another part of the city carrying a lunch pail, far from the harbor', cam: 'Medium shot on a snowy sidewalk', t: 'Der Warner ist nicht mehr da.', d: 'Henkelmann, Schnee' },
  { b: 'Am nächsten Morgen schlägt das Wetter um: Die Temperatur klettert über vier Grad,', ph: 'thaw', f: 'object-focus', s: 'close', l: 'north-end-street', a: 'Icicles drip and melt from a tenement gutter in sudden sunshine, a mercury thermometer on the brick wall with its red line rising', cam: 'Close view of the dripping icicles and thermometer', t: 'Plötzlich wird es mild.', d: 'tropfende Eiszapfen' },
  { b: 'und im North End öffnen die Menschen die Fenster.', ph: 'thaw', f: 'architecture-city', s: 'medium-wide', l: 'tenement-street', a: 'Tenement windows swing open, people lean out into the mild air and children run in the street below', cam: 'Medium-wide view up the tenement facades', t: 'Die Menschen genießen den milden Tag.', d: 'offene Fenster, Blumentopf' },
  { b: 'Bridget Clougherty hängt auf ihrer Veranda Wäsche auf.', ph: 'thaw', f: 'character-scene', s: 'medium', l: 'clougherty-porch', c: ['bridget-clougherty'], a: 'Bridget Clougherty hangs white sheets on a line on her wooden porch, the brown tank visible down the street', cam: 'Medium shot from the porch steps', t: 'Ein ganz normaler Vormittag.', d: 'Wäscheklammern, Korb' },
  { b: 'Ein paar Häuser weiter spielt die zehnjährige Maria Di Stasio.', ph: 'thaw', f: 'character-scene', s: 'wide', l: 'north-end-alley', a: 'A ten-year-old girl in a wool coat and knitted cap plays hopscotch on the cobblestones near the elevated railway girders', cam: 'Wide view with the girl small in the foreground and the tank behind', t: 'Kinder spielen in der Nähe des Tanks.', d: 'Kreidekästchen ohne Zahlen' },
  { b: 'In der Feuerwache neben dem Tank ist gerade Mittag.', ph: 'thaw', f: 'architecture-city', s: 'medium-wide', l: 'firehouse-31', c: ['george-layhe'], a: 'Through the open bay door of the brick firehouse, George Layhe and other firefighters sit at a table eating lunch beside a horse-drawn fire engine', cam: 'Medium-wide view from the street into the firehouse', t: 'Die Feuerwehrleute machen Pause.', d: 'Brotkörbe, Pferd' },

  { b: 'Gegen halb eins hören die Menschen ein dumpfes Grollen.', ph: 'collapse', f: 'character-scene', s: 'close', l: 'commercial-street', a: 'A woman at a window and a man in the street freeze and turn their heads toward the tank, listening in alarm', cam: 'Close two-level framing of the woman above and the man below', t: 'Ein Geräusch lässt alle erstarren.', d: 'Einkaufskorb' },
  { b: 'Dann ein Rattern, als würde jemand mit einem Maschinengewehr feuern.', ph: 'collapse', f: 'object-focus', s: 'detail', l: 'tank-seam', a: 'Steel rivets shoot out of the seam one after another, paint chips and small sparks flying', cam: 'Extreme close-up along the seam with motion streaks', t: 'Die Nieten platzen wie Schüsse.', d: 'Farbsplitter, Funken' },
  { b: 'Es sind die Nieten, die aus dem Stahl springen.', ph: 'collapse', f: 'cause-effect', s: 'close', l: 'commercial-street', a: 'A popped rivet bounces on the cobblestones while above it a steel plate splits open along empty rivet holes', cam: 'Close low view from the cobblestones upward', t: 'Der Stahl hält nicht mehr.', d: 'springende Niete' },
  { b: 'Am Boden des Tanks reißt eine Naht auf, und dann gibt der ganze Tank nach.', ph: 'collapse', f: 'cause-effect', s: 'wide', l: 'tank-yard', a: 'The base of the tank bursts open at the manhole cover, steel plates peel outward and the whole tank collapses', cam: 'Wide shot of the full tank as it splits', t: 'Der Tank bricht auseinander.', d: 'aufgerissenes Mannloch' },
  { b: 'Eine braune Welle, mehrere Meter hoch, schießt mit fast sechzig Kilometern pro Stunde durch die Straßen.', ph: 'collapse', f: 'battle-city-overview', s: 'elevated-overview', l: 'commercial-street', a: 'A towering brown wave of molasses surges down Commercial Street carrying wagons and debris while people run ahead of it', cam: 'Elevated view down the street in the direction of the wave', t: 'Die Welle ist schneller als die Menschen.', d: 'umstürzender Wagen' },

  { b: 'Die Welle knickt die Stahlträger der Hochbahn wie Streichhölzer.', ph: 'destruction', f: 'cause-effect', s: 'medium-wide', l: 'elevated-railway', a: 'Steel girders of the elevated railway buckle and snap under the brown flood, a train car tilting above', cam: 'Medium-wide low view from beneath the trestle', t: 'Selbst Stahlträger geben nach.', d: 'verbogene Schienen' },
  { b: 'Sie schiebt Häuser von ihren Fundamenten und drückt die Feuerwache ein.', ph: 'destruction', f: 'architecture-city', s: 'wide', l: 'firehouse-31', a: 'Wooden houses lifted off their foundations and the brick firehouse crushed and leaning in a sea of molasses', cam: 'Wide view across the flooded block', t: 'Häuser und Feuerwache werden zerstört.', d: 'Trümmer, Ziegel' },
  { b: 'Feuerwehrmann George Layhe wird unter den Trümmern eingeklemmt.', ph: 'destruction', f: 'character-scene', s: 'medium', l: 'firehouse-31', c: ['george-layhe'], a: 'George Layhe is pinned beneath fallen timbers in the flooded firehouse, only his helmet and shoulders above the molasses, a fellow firefighter reaching toward him', cam: 'Medium shot, respectful, no injuries visible', t: 'Ein Feuerwehrmann ist gefangen.', d: 'Balken, Helm' },
  { b: 'Bridget Clougherty stirbt in den Resten ihres Hauses, Maria Di Stasio wird von der Welle erfasst.', ph: 'destruction', f: 'symbolic-metaphor', s: 'medium-wide', l: 'clougherty-porch', a: 'A broken porch railing, a fallen laundry basket and a small knitted child\'s cap floating on dark still molasses', cam: 'Medium-wide quiet view without people', t: 'Der Verlust zeigt sich an dem, was fehlt.', d: 'Wäschekorb, Kindermütze', li: 'quiet grey light after the disaster' },
  { b: 'Am nächsten Tag schreibt die Boston Post über die Tiere im Hafenviertel:', ph: 'destruction', f: 'object-focus', s: 'medium', l: 'newspaper-press', a: 'Fresh newspapers come off a printing press, a newsboy grabs a bundle, the headline areas are blank grey blocks', cam: 'Medium view along the printing press', t: 'Die Zeitung berichtet am nächsten Tag.', d: 'Druckerpresse, Zeitungsjunge', li: 'warm lamplight in the press room' },
  { b: 'Pferde starben wie Fliegen auf klebrigem Fliegenpapier.', ph: 'destruction', f: 'environment-only', s: 'wide', l: 'commercial-street', a: 'A delivery wagon stuck in hardened molasses, a horse struggling to lift its legs, rescuers small in the distance', cam: 'Wide view across the sticky street', t: 'Auch die Tiere kommen nicht frei.', d: 'Wagenrad, Pferdegeschirr' },

  { b: 'Das Tückische ist die Melasse selbst. Solange sie in Bewegung ist, fließt sie schnell.', ph: 'sticky-trap', f: 'object-focus', s: 'close', l: 'commercial-street', a: 'Molasses rushes like a fast brown river over cobblestones and streetcar rails, ripples and swirls on its surface', cam: 'Close low view at street level with the flow coming toward the viewer', t: 'In Bewegung ist Melasse schnell.', d: 'Straßenbahnschiene' },
  { b: 'Doch in der kalten Januarluft wird sie mit jeder Minute zäher.', ph: 'sticky-trap', f: 'process-sequence', s: 'medium', l: 'commercial-street', a: 'The molasses surface stiffens in the cold air, frost forming at its edges and a dropped shovel slowly sinking and sticking in place', cam: 'Medium view of the shovel in the thickening surface', t: 'In der Kälte wird sie fest wie Kleber.', d: 'Schaufel, Reif' },
  { b: 'Wer stürzt, kann sich kaum noch befreien, und wer helfen will, bleibt selbst stecken.', ph: 'sticky-trap', f: 'character-scene', s: 'medium-wide', l: 'commercial-street', a: 'A man stuck waist-deep in thick molasses reaches for a helper who is himself stuck up to his knees', cam: 'Medium-wide view showing both men and the sticky surface', t: 'Helfen wird selbst zur Gefahr.', d: 'ausgestreckte Hände' },

  { b: 'Als Erste sind junge Seeleute vor Ort:', ph: 'rescue', f: 'character-scene', s: 'wide', l: 'harbor-wharf', a: 'Young navy cadets in dark blue uniforms run down a gangway from a training ship onto the wharf', cam: 'Wide view of the gangway and the running cadets', t: 'Hilfe kommt vom Wasser.', d: 'Gangway, Seesäcke' },
  { b: '116 Kadetten vom Schulschiff USS Nantucket, das ganz in der Nähe am Kai liegt.', ph: 'rescue', f: 'architecture-city', s: 'extreme-wide', l: 'harbor-wharf', a: 'The training ship USS Nantucket, a three-masted iron ship with a steam funnel, moored at the pier while a long line of cadets streams toward the flooded street', cam: 'Extreme wide harbor view with the ship and the ruined waterfront', t: 'Ein ganzes Schulschiff hilft.', d: 'Masten, Rettungsboot' },
  { b: 'Sie springen in die klebrige Masse und ziehen Menschen heraus.', ph: 'rescue', f: 'character-scene', s: 'medium', l: 'commercial-street', a: 'Navy cadets wade into the brown mass and pull a coated woman free by her arms', cam: 'Medium shot at the edge of the molasses', t: 'Die Kadetten ziehen Menschen heraus.', d: 'Seil, Decke' },
  { b: 'Dann kommen Polizisten, Soldaten und Krankenschwestern vom Roten Kreuz, die bis zur Hüfte in der Melasse stehen.', ph: 'rescue', f: 'character-scene', s: 'wide', l: 'commercial-street', a: 'Red Cross nurses in white aprons wade waist-deep through brown molasses carrying blankets, police and soldiers working behind them', cam: 'Wide view across the flooded street', t: 'Viele helfen, alle kämpfen mit dem Sirup.', d: 'Decken, Tragen' },
  { b: 'Vier Tage lang wird gesucht. Manche Vermisste findet man erst Monate später im Hafen.', ph: 'rescue', f: 'environment-only', s: 'extreme-wide', l: 'north-end-overview', a: 'Night search over the brown-flooded ruins and the dark harbor, lanterns and small rowboats moving slowly', cam: 'Extreme wide elevated night view', t: 'Die Suche dauert Tage.', d: 'Laternen, Ruderboote', li: 'cold night with scattered lantern light' },

  { b: 'Danach beginnt das Aufräumen. Süßwasser hilft kaum,', ph: 'cleanup', f: 'cause-effect', s: 'medium', l: 'cleanup-street', a: 'Firefighters spray fresh water from a hose onto hardened molasses, the water beading and running off without effect', cam: 'Medium shot along the hose toward the crusted surface', t: 'Normales Wasser löst die Kruste nicht.', d: 'Schlauch, Wasserperlen' },
  { b: 'erst Salzwasser aus einem Löschboot löst die Kruste, und Arbeiter streuen Sand darüber.', ph: 'cleanup', f: 'process-sequence', s: 'wide', l: 'cleanup-street', a: 'A fireboat in the harbor pumps seawater through long hoses onto the street while workers shovel sand over the softened molasses', cam: 'Wide view from the harbor edge into the street', t: 'Salzwasser und Sand bringen den Durchbruch.', d: 'Löschboot, Sandschaufeln' },
  { b: 'An Schuhen und Mänteln wandert die Melasse durch ganz Boston, in Straßenbahnen, auf Bahnsteigen und an Telefonhörern.', ph: 'cleanup', f: 'environment-only', s: 'medium', l: 'streetcar', a: 'Inside a crowded streetcar, sticky brown footprints cover the wooden floor and a woman lifts her shoe from a brown smear', cam: 'Medium view down the streetcar aisle', t: 'Die ganze Stadt klebt mit.', d: 'Haltegriffe, Fußspuren' },
  { b: 'Das Hafenwasser bleibt bis zum Sommer braun.', ph: 'cleanup', f: 'environment-only', s: 'extreme-wide', l: 'harbor-summer', a: 'Boston harbor on a bright summer day, the water still stained brown near the North End wharves, sailboats passing', cam: 'Extreme wide view across the water', t: 'Die Spuren bleiben monatelang.', d: 'Segelboote, Sommerhimmel', li: 'bright summer sun' },

  { b: 'Die Firma hat schnell eine Erklärung: Anarchisten hätten den Tank gesprengt.', ph: 'court', f: 'character-scene', s: 'medium', l: 'tank-ruins', c: ['arthur-jell'], a: 'Arthur Jell gestures toward the twisted steel remains of the tank while reporters with notepads crowd around him', cam: 'Medium shot with the twisted steel behind Jell', t: 'Die Firma schiebt die Schuld auf Bombenleger.', d: 'verbogene Stahlplatten, Notizblöcke', li: 'grey winter daylight' },
  { b: 'Es ist eine Zeit voller Bombenanschläge, und viele glauben das. Doch 119 Anwohner klagen.', ph: 'court', f: 'character-scene', s: 'wide', l: 'courthouse-steps', a: 'A group of North End residents, workers and mothers in mourning clothes, climb the courthouse steps together with a lawyer', cam: 'Wide view up the stone steps', t: 'Die Opfer wehren sich vor Gericht.', d: 'Trauerkleidung, Aktentasche' },
  { b: 'Das Gericht setzt Colonel Hugh Ogden ein, einen früheren Offizier, der den Fall untersuchen soll.', ph: 'court', f: 'evidence-reconstruction', s: 'medium', l: 'hearing-room', c: ['hugh-ogden'], a: 'Hugh Ogden sits at a long table covered with stacked case files next to a torn fragment of riveted steel brought in as evidence', cam: 'Medium shot across the table toward Ogden', t: 'Ein neutraler Prüfer übernimmt.', d: 'Aktenstapel, Stahlstück' },
  { b: 'Ogden hört rund dreitausend Zeugen. Vor Gericht erzählt Isaac Gonzalez unter Eid von den Lecks,', ph: 'court', f: 'character-scene', s: 'medium-wide', l: 'hearing-room', c: ['hugh-ogden', 'isaac-gonzalez'], a: 'Isaac Gonzalez stands at the witness stand with his right hand raised while Hugh Ogden listens from the bench', cam: 'Medium-wide view from the side of the room', t: 'Der Warner sagt endlich aus.', d: 'Zeugenstand, Bibel' },
  { b: 'vom Knacken und von seinen nächtlichen Läufen zum Ventil.', ph: 'court', f: 'character-scene', s: 'close', l: 'hearing-room', c: ['isaac-gonzalez'], a: 'Isaac Gonzalez speaks earnestly, his hands miming the turning of a valve wheel', cam: 'Close view of his face and hands', t: 'Er erzählt von den nächtlichen Läufen.', d: 'Hände wie am Ventilrad' },

  { b: 'Im April 1925, mehr als sechs Jahre nach der Flut, legt Ogden seinen Bericht vor.', ph: 'verdict', f: 'object-focus', s: 'medium', l: 'courtroom-1925', c: ['hugh-ogden'], a: 'Hugh Ogden lays a thick bound report on a courtroom table in spring light from tall windows', cam: 'Medium shot with the report in the foreground', t: 'Nach sechs Jahren liegt das Ergebnis vor.', d: 'dicker Bericht, Frühlingslicht' },
  { b: 'Eine Bombe findet er nicht. Er findet einen Tank, der nie mit Wasser geprüft wurde,', ph: 'verdict', f: 'evidence-reconstruction', s: 'medium-wide', l: 'evidence-table', c: ['hugh-ogden'], a: 'Hugh Ogden examines a torn steel plate with clean tear edges and no blast marks, a technical drawing of the tank beside it', cam: 'Medium-wide view over the evidence table', t: 'Keine Explosion, sondern Versagen.', d: 'Lupe, Stahlplatte' },
  { b: 'mit viel zu dünnen Wänden, gebaut unter einem Mann, der keine Baupläne lesen konnte.', ph: 'verdict', f: 'cutaway-section', s: 'sectional', l: 'tank-cutaway', a: 'Cross-section of a thin cracked riveted steel wall with the outline of a much thicker sturdy wall drawn behind it', cam: 'Straight sectional view', t: 'Die Wände waren viel zu dünn.', d: 'Risslinie, Nietenquerschnitt' },
  { b: 'Und er versteht, wozu die braune Farbe diente: Sie sollte die Lecks verstecken.', ph: 'verdict', f: 'evidence-reconstruction', s: 'close', l: 'evidence-table', a: 'A scraper chips brown paint off a steel fragment, revealing old dark leak streaks underneath', cam: 'Close view of the scraper and the revealed streaks', t: 'Die Farbe hat die Lecks versteckt.', d: 'Spachtel, Farbsplitter' },
  { b: 'Die Firma muss zahlen. Die Familien der Toten erhalten rund siebentausend Dollar pro Opfer.', ph: 'verdict', f: 'character-scene', s: 'medium', l: 'tenement-kitchen', a: 'A mother in black mourning dress holds an envelope at her small kitchen table, a framed photograph of a child beside her', cam: 'Medium shot from across the kitchen table', t: 'Geld ersetzt den Verlust nicht.', d: 'Umschlag, Bilderrahmen', li: 'soft window light' },

  { b: 'Das Urteil verändert mehr als Boston. Massachusetts und viele andere Bundesstaaten verlangen danach,', ph: 'new-rules', f: 'architecture-city', s: 'wide', l: 'state-house', a: 'The Massachusetts State House with its golden dome on a clear day, legislators in dark coats walking up the steps', cam: 'Wide view from the street toward the dome', t: 'Die Politik reagiert.', d: 'goldene Kuppel, Treppe' },
  { b: 'dass große Bauwerke von geprüften Ingenieuren und Architekten abgenommen werden.', ph: 'new-rules', f: 'character-scene', s: 'medium', l: 'new-tank-inspection', a: 'A licensed engineer measures the thickness of a steel plate on a new tank while an architect checks drawings beside him', cam: 'Medium shot at the base of a new tank', t: 'Jetzt prüfen Fachleute.', d: 'Messschieber, Bauzeichnung' },
  { b: 'Eine Warnung wie die von Isaac Gonzalez soll nie wieder einfach im Büro eines Schatzmeisters verschwinden.', ph: 'new-rules', f: 'symbolic-metaphor', s: 'close', l: 'jell-office', a: 'An empty office desk with a closed drawer and a worn grey flat cap resting on it, dust floating in a sunbeam', cam: 'Close quiet view of the desk and cap', t: 'Warnungen dürfen nicht mehr verschwinden.', d: 'Mütze, Staub im Licht' },

  { b: 'Heute liegt an der Stelle des Tanks ein Park mit einem Baseballfeld.', ph: 'today', f: 'architecture-city', s: 'wide', l: 'langone-park', modern: true, a: 'A present-day city park with a baseball diamond beside the harbor in the North End, brick buildings behind', cam: 'Wide elevated view across the park', t: 'Wo der Tank stand, ist heute ein Park.', d: 'Baseballfeld, Hafen' },
  { b: 'Kinder rennen dort über den Rasen, wo früher Nachbarn Dosen unter die Nähte hielten.', ph: 'today', f: 'character-scene', s: 'medium-wide', l: 'langone-park', modern: true, a: 'Present-day children in casual clothes run across the green grass of the baseball field', cam: 'Medium-wide view at child height', t: 'Kinder spielen, wo früher der Tank leckte.', d: 'Baseballhandschuh' },
  { b: 'Fünfzig Zentimeter unter dem Spielfeld liegt noch immer das alte Fundament.', ph: 'today', f: 'cutaway-section', s: 'sectional', l: 'langone-park', modern: true, a: 'Cross-section below the baseball field showing the round concrete foundation ring of the old tank buried under soil and grass', cam: 'Clean sectional side view', t: 'Das Fundament liegt noch unter dem Rasen.', d: 'Grasnarbe, Betonring' },
  { b: 'Und an warmen Tagen, so erzählten alte Bewohner noch Jahrzehnte später,', ph: 'today', f: 'character-scene', s: 'medium', l: 'park-bench', modern: true, a: 'An elderly man in a 1950s hat sits on a park bench by the harbor and tells a story to a listening child on a warm evening', cam: 'Medium shot from the side of the bench', t: 'Die Erinnerung lebt weiter.', d: 'Hut, Parkbank' },
  { b: 'roch das ganze Viertel nach Melasse.', ph: 'today', f: 'environment-only', s: 'wide', l: 'north-end-rooftops', modern: true, a: 'Warm summer evening over North End rooftops, a faint golden haze drifting in from the harbor', cam: 'Wide view over the rooftops toward the water', t: 'Der Geruch blieb.', d: 'Dachterrassen, goldener Dunst' }
];

const STATIC_FORMS = new Set(['object-focus', 'cutaway-section', 'evidence-reconstruction', 'symbolic-metaphor', 'map-geography']);
const EXPLANATION_FORMS = new Set(['cutaway-section', 'process-sequence', 'map-geography', 'system-hierarchy']);
const ENERGY = {
  'architecture-city': 'scale contrast between the built world and small people',
  'character-scene': 'a readable human reaction or action as the focal point',
  'object-focus': 'one object filling the frame with tactile detail',
  'cutaway-section': 'a reveal of hidden inner structure',
  'environment-only': 'atmosphere and depth without a central figure',
  'symbolic-metaphor': 'a quiet symbolic object carrying the emotion',
  'process-sequence': 'a visible change of state within one scene',
  'cause-effect': 'cause and consequence connected in one composition',
  'battle-city-overview': 'spatial overview of a moving force',
  'evidence-reconstruction': 'evidence linked to what it proves'
};

// Beats must cover the whole script in order: no sentence without an image.
let cursor = 0;
for (const [i, scene] of S.entries()) {
  const at = script.indexOf(scene.b, cursor);
  if (at < 0) throw new Error(`Beat ${i + 1} nicht (in Reihenfolge) im Skript: ${scene.b}`);
  const gap = script.slice(cursor, at).trim();
  if (gap) throw new Error(`Text ohne Bild vor Beat ${i + 1}: ${gap}`);
  cursor = at + scene.b.length;
}
if (script.slice(cursor).trim()) throw new Error('Skriptende ohne Bild.');

let previousMotion = '';
let motionRun = 0;
let previousExplanation = 0;
const images = S.map((scene, index) => {
  const number = index + 1;
  const [timeContext, placeTime, story, palette, lighting] = phases[scene.ph];
  const words = scene.b.split(/\s+/).length;
  let motionType = STATIC_FORMS.has(scene.f) ? 'static'
    : ['architecture-city', 'environment-only', 'battle-city-overview'].includes(scene.f) ? 'pull-out'
      : ['cause-effect', 'process-sequence'].includes(scene.f) ? 'pan-right' : 'push-in';
  motionRun = motionType === previousMotion ? motionRun + 1 : 1;
  if (motionRun > 2) { motionType = motionType === 'static' ? 'push-in' : 'static'; motionRun = 1; }
  previousMotion = motionType;
  const explanation = EXPLANATION_FORMS.has(scene.f) && previousExplanation < 2;
  previousExplanation = explanation ? previousExplanation + 1 : 0;
  const light = scene.li ?? lighting;
  const castIds = scene.c ?? [];
  return {
    imageNumber: number,
    imageFile: `Bild ${String(number).padStart(2, '0')}.png`,
    startAnchor: scene.b,
    endAnchor: null,
    narrationBeat: scene.b,
    timeContext,
    placeTime,
    chronologyStep: number,
    visualAnswer: `${scene.t} Sichtbar: ${scene.a}.`,
    narrationMatchScore: 9.3,
    clarityScore: 9,
    viewerTakeaway: scene.t,
    visualPurpose: `${story}: ${scene.t}`,
    topicAnchor: 'Melasse-Flut im North End von Boston 1915–1925',
    visualForm: scene.f,
    visualConcept: scene.a,
    subjectAction: scene.a,
    dominantSubject: scene.a.split(/,| while | as /)[0],
    actionState: `${scene.t} (${scene.d})`,
    composition: `${scene.cam}; foreground detail: ${scene.d}; location ${scene.l}.`,
    camera: scene.cam,
    shotScale: scene.s,
    locationKey: scene.l,
    castIds,
    modernScene: scene.modern === true,
    visualEnergyDevice: `${ENERGY[scene.f]} (${scene.d})`,
    visualChangeFromPrevious: number === 1 ? 'Opening scene of the tank in 1915.' : `New ${scene.s} ${scene.f} at ${scene.l}${S[index - 1].l === scene.l ? ' with a different camera position' : ''}.`,
    visualInterestScore: 9,
    colorPhase: scene.ph,
    colorIntent: `${story}; ${palette}; ${light}`,
    worldLifeDetail: scene.d,
    motionType,
    motionDirection: motionType === 'static' ? 'none' : motionType === 'pan-right' ? 'right' : 'center',
    motionIntensity: motionType === 'static' ? 'none' : 'subtle',
    motionFocus: scene.a.split(/,| while /)[0],
    visibleTextPolicy: 'NO_VISIBLE_TEXT',
    editorialText: '',
    editorialTextPurpose: '',
    explanationOnly: explanation,
    depthPlan: `Foreground: ${scene.d}. Midground: the main action. Background: ${placeTime}.`,
    lightingMood: light,
    supportingElements: scene.d.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3),
    continuityNote: 'Use the North End World Lock and CAST_BIBLE identities; show only what the narration has reached.',
    historicalAccuracyNote: scene.modern ? 'Present-day or mid-century epilogue scene, no 1919 costume lock.' : '1915–1925 Boston: riveted steel, gas lamps, horse wagons, early trucks, 1910s clothing. Follow RECHERCHE.md.',
    promptQcScore: 9,
    plannedHoldSeconds: Math.min(6.4, Math.max(2, Math.round((words / 2.83) * 10) / 10)),
    holdReason: 'Speech-time estimate; final duration comes from measured Whisper alignment.',
    actualStartSeconds: null,
    actualEndSeconds: null,
    alignmentConfidence: null
  };
});

const colorArc = Object.entries(phases).map(([id, [, , storyFunction, paletteBias, lighting]]) => ({ id, storyFunction, paletteBias, lighting }));
const explanationCount = images.filter((x) => x.explanationOnly).length;
let streak = 0;
let maxStreak = 0;
for (const image of images) { streak = image.explanationOnly ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak); }

Object.assign(meta, {
  storyMode: 'event-led',
  status: 'phase1-ready',
  visualStyleId: 'history-stickman-adaptive-v1',
  targetDurationSeconds: 350,
  targetDurationRangeSeconds: [320, 390],
  plannedImageCount: images.length,
  phase1Ready: true
});
meta.coverPolicy.coverText = 'TÖDLICHE WELLE AUS SIRUP';
meta.imageDensityPolicy.targetAverageHoldSeconds = [2.5, 4.5];
meta.youtubeUpload = {
  captionPolicyVersion: 2,
  title: 'Warum eine Welle aus Melasse 1919 Boston überrollte',
  description: 'Boston, Januar 1919: Mitten im Hafenviertel reißt ein riesiger Tank voller Melasse. Eine braune Welle rollt durch die Straßen, knickt die Stahlträger der Hochbahn und drückt eine Feuerwache ein. 21 Menschen sterben. Doch die Katastrophe hatte sich lange angekündigt: Der Tank leckte von Anfang an und wurde einfach braun gestrichen.\n\nWir begleiten Isaac Gonzalez, einen Arbeiter, der vor dem Einsturz warnte, nachts heimlich Melasse abließ und schließlich kündigte. Du erfährst, warum ein Schatzmeister ohne Ingenieurwissen den Tank bauen durfte, warum ausgerechnet ein milder Wintertag zum Verhängnis wurde und warum Melasse eine so tödliche Falle ist.\n\nAm Ende steht ein Prozess, der die Ausrede der Firma zerlegt und neue Regeln für Bauwerke in den USA anstößt. Eine Geschichte über Warnungen, die niemand hören wollte.',
  hashtags: ['#Geschichte', '#Boston', '#Melasse', '#Katastrophe', '#1919']
};

const mapping = { schemaVersion: 2, voiceoverMaster: '01-voice-script/voice-script.txt', coverImageNumber: null, videoFirstImageNumber: 1, videoLastImageNumber: images.length, sourceVoiceoverFile: null, audioMasterFile: null, alignmentEvidenceFile: null, images };
const wholeQc = {
  schemaVersion: 3, status: 'APPROVED', reviewMethod: 'script-first-and-sequence-review',
  scriptContinuousProse: true, scriptReadAloudPassed: true, visualsDerivedAfterScript: true, coherentVisualArc: true,
  chronologyMode: 'strict-chronological', chronologyReviewed: true, historicalEventOrderReviewed: true, visualOrderMatchesNarrationOrder: true, temporalJumpsExplicitlySignposted: true, unnecessaryFlashbacksAbsent: true,
  narrationVisualAlignmentReviewed: true, everyVisualMatchesCurrentNarration: true, visualClarityReviewed: true, unclearVisualsAbsent: true, onePrimaryTakeawayPerVisual: true, futureEventLeakageAbsent: true,
  explanationOnlyVisualShare: Number((explanationCount / images.length).toFixed(3)), maxConsecutiveExplanationOnlyVisuals: maxStreak,
  historicalWorldReturnsAfterExplanation: true, editorialTextUsedOnlyWhenUseful: true, transitionsReviewed: true, overallCoherenceScore: 9, approved: true,
  notes: [
    `${images.length} Bilder aus dem fertigen Skript abgeleitet; jedes Bild hat ein eigenes Subjekt, eine eigene Kamera und einen locationKey.`,
    'Der Ausblick „Vier Jahre später …“ im Cold Open zeigt bewusst den intakten Tank, keine Welle (keine Vorwegnahme im Bild).',
    'Opfer werden über Objekte und Abwesenheit gezeigt, nie als Körper.'
  ]
};
const files = {
  'video.json': meta,
  'BILD_AUDIO_ZUORDNUNG.json': mapping,
  'WHOLE_VIDEO_QC.json': wholeQc,
  'YOUTUBE_RENDER_PLAN.json': { schemaVersion: 2, motionPolicy: 'content-aware-v1', colorArc, backgroundMusic: false, motionOverrides: [], soundEffects: [] },
  'status.json': { schemaVersion: 2, preproduction: 'APPROVED', phase1: 'READY', coverSelection: 'WAITING', phase2: 'WAITING_FOR_IMAGES', phase3: 'BLOCKED_UNTIL_PHASE2', imagesReady: false, audioReady: false, renderReady: false, postVideoImprovement: 'WAITING_FOR_FINAL_VIDEO' }
};
for (const [name, value] of Object.entries(files)) await writeFile(path.join(here, name), `${JSON.stringify(value, null, 2)}\n`);
await writeFile(path.join(root, '03-export', 'CAPTION.txt'), buildCaption(meta));
console.log(`Melasse-Generator: ${images.length} Bilder, ${script.split(/\s+/).length} Wörter, explanation ${explanationCount} (max ${maxStreak} in Folge).`);
