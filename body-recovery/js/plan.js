// Tréninkový plán na celé tělo doma s jednoručkami: 8 týdnů, 10–15 minut denně.
// Každý týden má tři krátké sestavy, které se střídají dokola: A (síla: dřep, tlak, přítah),
// B (pohyblivost a střed těla) a C (síla: předklon, výpad, tlak nad hlavu).
// Fáze 1 rozjezd a technika, fáze 2 síla (dvojitá progrese), fáze 3 kondice (spojené cviky, kratší pauzy).
// Stejná struktura se ukládá do databáze pod pairs/<kód>/plan; appka pak použije verzi z databáze.
// `rest` u cviku je pauza mezi sériemi pro časovač, položka v týdnu ji může přepsat.
const ytSearch = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
const DAY_A = { id: "A", short: "Síla 1", title: "Dřep, tlak, přítah" };
const DAY_B = { id: "B", short: "Pohyb", title: "Pohyblivost a střed těla" };
const DAY_C = { id: "C", short: "Síla 2", title: "Předklon, výpad, tlak nad hlavu" };

window.PLAN = {
  version: 1,
  name: "Tělo zpět",
  weeklyGoal: 5,
  // Další čtení k tématu. Appka je bere vždy z kódu, ne z databáze.
  resources: [],
  // Žolíci: jiná aktivita nahradí trénink z plánu, každá nejvýš perWeek× týdně.
  jokers: [
    { id: "sport", ex: "sport", short: "Jiný pohyb", icon: "🏃", perWeek: 2, link: true, placeholder: "Např. 5 km běh, fotbal, plavání, výlet…" }
  ],
  phases: [
    { id: 1, name: "Rozjezd", range: "týdny 1–2", summary: "Tělo si zvyká. Lehké jednoručky, pomalé tempo a čistá technika. Po každé sérii zůstanou aspoň 3 opakování v rezervě.",
      // Přirozený pohyb během dne. Odškrtává se zvlášť, do tréninků se nepočítá.
      everyday: [
        { id: "water", name: "Sklenice vody po probuzení", text: "Ještě před kávou. Tělo je ráno žíznivé." },
        { id: "walk", name: "Procházka 20 minut", text: "Cestou do práce, po obědě nebo večer. Svižně, ať se trochu zahřeješ." },
        { id: "standup", name: "Vstaň každou hodinu", text: "Při sezení se na minutu protáhni: ramena dozadu, pár dřepů, předklon." },
        { id: "stairs", name: "Schody místo výtahu", text: "Celým chodidlem, v klidném tempu." },
        { id: "sleep", name: "Spánek 7 hodin", text: "Svaly rostou ve spánku, ne při tréninku. Odškrtni ráno za uplynulou noc." }
      ] },
    { id: 2, name: "Síla", range: "týdny 3–5", summary: "Těžší jednoručky. 8–12 opakování, a když dáš všechny série na 12, příště přidej váhu. Poslední 2 opakování mají být těžká.",
      everyday: [
        { id: "steps", name: "8 000 kroků", text: "Telefon nebo hodinky je spočítají za tebe." },
        { id: "standup", name: "Vstaň každou hodinu", text: "Minuta pohybu: kroužení rameny, 10 dřepů, pár kroků." },
        { id: "posture", name: "Lopatky k sobě", text: "U počítače nebo při čekání 10× stáhni lopatky dozadu a dolů." },
        { id: "protein", name: "Bílkoviny ke každému jídlu", text: "Maso, ryba, vejce, tvaroh, jogurt nebo luštěniny. Bez nich síla neroste." },
        { id: "sleep", name: "Spánek 7 hodin", text: "Odškrtni ráno za uplynulou noc." }
      ] },
    { id: 3, name: "Kondice", range: "týdny 6–8", summary: "Spojené cviky a kratší pauzy. Síla zůstává, přidává se dech a tep. Pořád 10–15 minut.",
      everyday: [
        { id: "steps", name: "10 000 kroků", text: "Klidně ve dvou procházkách." },
        { id: "stairs", name: "Schody svižně", text: "Nahoru rychleji, klidně ob schod." },
        { id: "protein", name: "Bílkoviny ke každému jídlu", text: "Hrst masa, ryby, tvarohu nebo luštěnin na talíř." },
        { id: "evening", name: "2 minuty protažení večer", text: "Kočka a kráva a protažení kyčle před spaním." },
        { id: "sleep", name: "Spánek 7 hodin", text: "Odškrtni ráno za uplynulou noc." }
      ] }
  ],
  rules: [
    { title: "Technika před vahou", text: "Váhu přidávej, až je pohyb čistý: rovná záda, kolena ve směru špiček, plynulé tempo bez švihu." },
    { title: "Opakování v rezervě", text: "Sérii skonči, když by šla ještě 1–3 opakování. Do úplného vyčerpání chodit netřeba." },
    { title: "Dvojitá progrese", text: "Když dáš všechny série na horní hranici opakování, příště vezmi těžší jednoručky a začni zase dole. Kila zapisuj, appka ti je příště připomene." },
    { title: "Svalovka ano, bolest ne", text: "Tupá svalovka 1–3 dny po tréninku je v pořádku. Ostrá bolest v kloubu nebo zádech ne: cvik vynech, zmenši váhu nebo rozsah." },
    { title: "Každý den kousek", text: "Deset minut denně udělá víc než hodina jednou za týden. Když na sílu není den, udělej aspoň sestavu B." },
    { title: "Dýchej", text: "Výdech při námaze, nádech při povolení. Dech nezadržuj." },
    { title: "Regenerace mimo trénink", text: "Spánek 7–9 hodin, bílkoviny a voda. Bez nich se tělo nezotaví." },
    { title: "Kdy přestat", text: "Bolest na hrudi, závrať, dušnost nebo bolest vystřelující do ruky či nohy: přestaň a jdi k lékaři." }
  ],
  exercises: {
    warmup: {
      name: "Rozcvička", alias: "Rozhýbání celého těla", type: "time",
      why: "Zahřeje klouby a svaly, aby první série nebyla na studeno.",
      steps: ["Kroužení rameny a pažemi dopředu i dozadu.", "Kroužení pánví a koleny.", "Pár pomalých dřepů bez váhy.", "Pochod na místě s vysokými koleny."],
      gear: "Nic.",
      avoid: ["Rychlé švihy do krajních poloh."]
    },
    squat: {
      name: "Dřep s jednoručkou u hrudi", alias: "Goblet squat", type: "reps", rest: "45 s", load: true,
      why: "Základní cvik na nohy a hýždě. Jednoručka vpředu drží trup vzpřímený a učí správný dřep.",
      steps: ["Stoupni si na šířku ramen, špičky mírně ven.", "Jednoručku drž svisle u hrudi oběma rukama.", "Sedni si mezi paty, kolena jdou ve směru špiček. Dolů 2–3 s.", "Odraz se celým chodidlem zpět nahoru."],
      tip: "Když hloubka nejde, dřepuj na židli a jen se jí dotkni.",
      gear: "Jedna jednoručka.",
      avoid: ["Kolena padají dovnitř.", "Paty se zvedají od země.", "Kulatá záda dole."],
      video: ytSearch("goblet squat dumbbell form")
    },
    pushup: {
      name: "Kliky", alias: "Push-up", type: "reps", rest: "45 s",
      why: "Hrudník, ramena, triceps a zpevnění trupu najednou. Výška opory určuje obtížnost.",
      steps: ["Ruce na šířku ramen o stůl, opěradlo gauče nebo na zem.", "Tělo v jedné linii od hlavy k patám, zpevni břicho a hýždě.", "Pomalu dolů, lokty asi 45° od těla, hrudník k opoře.", "Odtlač se zpět nahoru."],
      tip: "Začni o stůl. Když dáš všechny série čistě, sniž oporu: gauč, schod, zem.",
      gear: "Stůl nebo jiná pevná opora.",
      avoid: ["Prohnutá bedra.", "Lokty do stran jako písmeno T.", "Hlava předkloněná k zemi."],
      video: ytSearch("incline push up form")
    },
    floorpress: {
      name: "Tlak na zemi s jednoručkami", alias: "Floor press", type: "reps", rest: "45 s", load: true,
      why: "Tlak na hrudník a triceps bez lavičky. Podlaha zastaví lokty, takže ramena jsou v bezpečí.",
      steps: ["Lehni si na záda, kolena pokrčená, jednoručky nad hrudníkem.", "Pomalu spouštěj, až se lokty (asi 45° od těla) dotknou země.", "Krátká pauza a vytlač zpět nad hrudník."],
      gear: "Dvě jednoručky.",
      avoid: ["Odrážení loktů od země.", "Zápěstí zalomená dozadu: drž je rovně."],
      video: ytSearch("dumbbell floor press form")
    },
    row: {
      name: "Přítah jednoručky v předklonu", alias: "One-arm row", type: "reps", rest: "45 s", load: true,
      why: "Záda a lopatky. Vyrovnává sezení u počítače a kulatá ramena.",
      steps: ["Jednu ruku a koleno opři o židli nebo gauč, záda rovně.", "Jednoručku v druhé ruce táhni k boku, ne k rameni.", "Nahoře stáhni lopatku, pomalu dolů.", "Všechna opakování jednou rukou, pak druhou. Série jsou obě strany."],
      tip: "Představ si, že loktem míříš do zadní kapsy.",
      gear: "Jednoručka, židle nebo gauč.",
      avoid: ["Rotace trupu a švih.", "Rameno vytažené k uchu."],
      video: ytSearch("one arm dumbbell row form")
    },
    rdl: {
      name: "Rumunský mrtvý tah", alias: "RDL s jednoručkami", type: "reps", rest: "45 s", load: true,
      why: "Zadní strana stehen, hýždě a záda. Naučí správný předklon, který chrání záda i při zvedání věcí.",
      steps: ["Stůj na šířku boků, jednoručky před stehny.", "Kolena mírně pokrčená, pánev posílej dozadu ke zdi za sebou.", "Jednoručky kloužou po stehnech dolů, záda rovně, až ucítíš tah v zadní straně stehen.", "Nahoru zatnutím hýždí."],
      tip: "Kolena se skoro nehýbou. Je to předklon, ne dřep.",
      gear: "Dvě jednoručky (nebo jedna oběma rukama).",
      avoid: ["Kulatá záda.", "Jednoručky daleko od těla.", "Záklon nahoře."],
      video: ytSearch("dumbbell romanian deadlift form")
    },
    splitsquat: {
      name: "Výpad na místě", alias: "Split squat", type: "reps", rest: "45 s", load: true,
      why: "Nohy a hýždě po jedné straně. Srovná rozdíl mezi nohama a zlepší rovnováhu.",
      steps: ["Velký krok: jedna noha vpředu, druhá vzadu na špičce.", "Jednoručky podél těla, nebo zatím bez váhy.", "Spusť zadní koleno kolmo dolů skoro k zemi, trup rovně.", "Vytlač se přední nohou. Všechna opakování, pak výměna nohou."],
      tip: "Kvůli rovnováze se můžeš jednou rukou držet zdi.",
      gear: "Jednoručky, zeď na dosah.",
      avoid: ["Přední koleno padá dovnitř.", "Krátký krok, pata přední nohy se zvedá."],
      video: ytSearch("dumbbell split squat form")
    },
    reverselunge: {
      name: "Výpad vzad", alias: "Reverse lunge", type: "reps", rest: "45 s", load: true,
      why: "Dynamičtější výpad. Šetrný ke kolenům a víc zapojí hýždě a stabilitu.",
      steps: ["Stůj rovně, jednoručky podél těla.", "Dlouhý krok vzad, zadní koleno spusť k zemi.", "Odraz se přední nohou zpět do stoje.", "Střídej nohy, počítej opakování na každou."],
      gear: "Jednoručky.",
      avoid: ["Došlap zadní nohy na celé chodidlo.", "Předklon trupu."],
      video: ytSearch("dumbbell reverse lunge form")
    },
    ohp: {
      name: "Tlak nad hlavu", alias: "Overhead press", type: "reps", rest: "45 s", load: true,
      why: "Ramena, triceps a zpevnění celého trupu ve stoje.",
      steps: ["Stůj na šířku boků, jednoručky u ramen.", "Zpevni břicho a hýždě.", "Vytlač jednoručky nad hlavu, až jsou paže natažené vedle uší.", "Pomalu zpět k ramenům."],
      tip: "Když ramena protestují, cvič vkleče na jednom koleni, nebo střídavě jednou rukou.",
      gear: "Dvě jednoručky.",
      avoid: ["Prohýbání beder.", "Tlačení před sebe místo nahoru."],
      video: ytSearch("standing dumbbell shoulder press form")
    },
    carry: {
      name: "Farmářská chůze", alias: "Farmer's carry", type: "time", rest: "45 s", load: true,
      why: "Úchop, ramena, střed těla a držení těla. Jednoduché a překvapivě náročné.",
      steps: ["Vezmi těžké jednoručky do obou rukou.", "Stůj vzpřímeně, ramena dolů a dozadu.", "Choď po bytě krátkými kroky, dokud běží čas."],
      tip: "Těžší varianta: jen jedna jednoručka jako kufr, trup se nesmí naklonit. V půlce vyměň ruku.",
      gear: "Dvě co nejtěžší jednoručky.",
      avoid: ["Shrbená ramena.", "Naklánění do strany."],
      video: ytSearch("farmers carry dumbbell form")
    },
    thruster: {
      name: "Dřep s tlakem nad hlavu", alias: "Thruster", type: "reps", rest: "45 s", load: true,
      why: "Dřep a tlak v jednom plynulém pohybu. Pracuje celé tělo a tep jde nahoru.",
      steps: ["Jednoručky u ramen, stůj na šířku ramen.", "Dřep jako u dřepu s jednoručkou.", "Při cestě nahoru plynule vytlač jednoručky nad hlavu.", "Spusť je k ramenům a jdi rovnou do dalšího dřepu."],
      tip: "Vezmi lehčí váhu než na samotný tlak nad hlavu.",
      gear: "Dvě jednoručky.",
      avoid: ["Tlak dřív, než se narovnají nohy.", "Prohnutá bedra nahoře."],
      video: ytSearch("dumbbell thruster form")
    },
    swing: {
      name: "Švih jednoručkou", alias: "Dumbbell swing", type: "reps", rest: "45 s", load: true,
      why: "Výbušná práce hýždí a zadní strany stehen. Kondice a síla v jednom.",
      steps: ["Stůj o něco šířeji než na šířku ramen, jednoručku drž oběma rukama za jeden konec.", "Pošli ji mezi stehna předklonem v kyčlích jako u mrtvého tahu.", "Prudkým zatnutím hýždí ji vymršti před sebe do výšky hrudníku.", "Nech ji padat zpět mezi nohy a rovnou navaž."],
      tip: "Paže jen drží, práci dělají boky. Nejdřív zvládni rumunský mrtvý tah.",
      gear: "Jedna jednoručka, volné místo kolem.",
      avoid: ["Zvedání rukama.", "Dřep místo předklonu.", "Kulatá záda dole."],
      video: ytSearch("dumbbell swing form")
    },
    bridge: {
      name: "Hýžďový most", alias: "Glute bridge", type: "reps", rest: "30 s", load: true,
      why: "Probudí hýždě, které při sezení usínají. Uleví bedrům.",
      steps: ["Lehni si na záda, kolena pokrčená, chodidla na šířku boků.", "Zatni hýždě a zvedni pánev, až jsou kolena, boky a ramena v jedné linii.", "Nahoře 2 s výdrž, pomalu dolů."],
      tip: "Těžší: jednoručka na bocích, nebo jedna noha ve vzduchu.",
      gear: "Podložka, jednoručka podle potřeby.",
      avoid: ["Prohýbání beder nahoře: práci dělají hýždě.", "Tlak do krku."],
      video: ytSearch("glute bridge form")
    },
    deadbug: {
      name: "Mrtvý brouk", alias: "Dead bug", type: "reps", rest: "30 s",
      why: "Hluboké svaly břicha, které chrání záda. Bedra zůstávají u země, zatímco se hýbou ruce a nohy.",
      steps: ["Lehni si na záda, paže kolmo vzhůru, kolena nad boky v pravém úhlu.", "Přitlač bedra k zemi.", "S výdechem pomalu natáhni opačnou ruku a nohu nad zem.", "Vrať a vystřídej. Opakování počítej na každou stranu."],
      tip: "Těžší: drž v rukou jednoručku.",
      gear: "Podložka.",
      avoid: ["Bedra se odlepují od země: zkrať pohyb.", "Rychlé kmitání."],
      video: ytSearch("dead bug exercise form")
    },
    birddog: {
      name: "Ptačí pes", alias: "Bird dog", type: "reps", rest: "30 s",
      why: "Stabilita zad a koordinace. Šetrný cvik i při bolavých zádech.",
      steps: ["Na kolenou a dlaních, ruce pod rameny, kolena pod boky.", "Natáhni opačnou ruku a nohu do roviny se zády.", "Vydrž 2 s, vrať a vystřídej."],
      tip: "Představ si na zádech sklenici vody, která nesmí spadnout.",
      gear: "Podložka.",
      avoid: ["Prohnutá bedra.", "Natáčení pánve."],
      video: ytSearch("bird dog exercise form")
    },
    plank: {
      name: "Prkno", alias: "Plank", type: "time", rest: "30 s",
      why: "Zpevnění celého trupu.",
      steps: ["Předloktí pod rameny, nohy natažené, opora na špičkách.", "Tělo v jedné linii, zatni břicho a hýždě.", "Klidně dýchej."],
      tip: "Lehčí: na kolenou. Těžší: střídavě zvedej nohu.",
      gear: "Podložka.",
      avoid: ["Propadlá bedra.", "Zadek vysoko nahoře."],
      video: ytSearch("plank form")
    },
    sideplank: {
      name: "Boční prkno", alias: "Side plank", type: "time", rest: "15 s",
      why: "Boční svaly trupu a hýždí, stabilita pánve.",
      steps: ["Lehni si na bok, loket pod ramenem.", "Zvedni boky, tělo v jedné linii.", "Série střídej: jedna na pravém boku, další na levém."],
      tip: "Lehčí: spodní koleno na zemi.",
      gear: "Podložka.",
      avoid: ["Boky padají k zemi.", "Rameno u ucha."],
      video: ytSearch("side plank form")
    },
    catcow: {
      name: "Kočka a kráva", alias: "Mobilita páteře", type: "time",
      why: "Rozhýbe celou páteř a uleví po sezení.",
      steps: ["Na kolenou a dlaních.", "S nádechem prohni záda a zvedni hlavu.", "S výdechem vyhrb záda a hlavu svěs.", "Pomalu, obratel po obratli."],
      gear: "Podložka.",
      avoid: ["Rychlé kmitání."],
      video: ytSearch("cat cow stretch")
    },
    wgs: {
      name: "Výpad s rotací", alias: "World's greatest stretch", type: "time",
      why: "Jedno protažení na kyčle, zadní stranu stehen, hrudní páteř i ramena.",
      steps: ["Velký výpad vpřed, zadní koleno na zemi nebo těsně nad ní.", "Ruku na straně přední nohy polož na zem vedle chodidla.", "Pak ji vytoč ke stropu a podívej se za ní.", "3–5× na stranu, pak výměna nohou."],
      gear: "Podložka.",
      avoid: ["Tlačení do bolesti: má to příjemně táhnout."],
      video: ytSearch("world's greatest stretch")
    },
    hipflexor: {
      name: "Protažení kyčle v kleku", alias: "Hip flexor stretch", type: "time", rest: "10 s",
      why: "Po sezení zkrácené kyčle tahají za bedra. Tohle je povolí.",
      steps: ["Klekni si na jedno koleno (pod koleno polštář), druhá noha vpředu.", "Zatni hýždi na straně zadní nohy a podsaď pánev.", "Posuň se lehce vpřed, až ucítíš tah vpředu na zadní kyčli.", "Série střídej: jedna na pravou, další na levou."],
      gear: "Polštář pod koleno.",
      avoid: ["Prohýbání beder místo podsazení pánve."],
      video: ytSearch("half kneeling hip flexor stretch")
    },
    thoracic: {
      name: "Otevírání knihy", alias: "Rotace hrudní páteře", type: "reps", rest: "10 s",
      why: "Rotace hrudní páteře a otevření hrudníku. Proti kulatým zádům.",
      steps: ["Lehni si na bok, kolena pokrčená před sebou, paže natažené před hrudníkem.", "Horní paži přetoč obloukem na druhou stranu, hlava ji sleduje.", "Kolena zůstávají u sebe na zemi. Pomalu zpět.", "Série střídej strany."],
      gear: "Podložka.",
      avoid: ["Zvedání kolen ze země."],
      video: ytSearch("open book stretch thoracic rotation")
    },
    breathing: {
      name: "Dýchání do břicha", alias: "Zklidnění", type: "time",
      why: "Konec tréninku. Zklidní tep a tělo se přepne do regenerace.",
      steps: ["Lehni si na záda, kolena pokrčená, ruku na břicho.", "Nádech nosem 4 s do břicha, výdech pusou 6 s.", "Povol ramena a čelist."],
      gear: "Podložka."
    },
    sport: {
      name: "Jiný pohyb", alias: "Žolík", type: "time",
      why: "Běh, kolo, plavání, fotbal nebo výlet, aspoň 30 minut. Kondice se počítá, sílu ale nebuduje, proto nahradí nejvýš 2 tréninky týdně.",
      steps: ["Rozcvič se, jak se k aktivitě hodí.", "Po aktivitě 2 minuty protažení: výpad s rotací, kočka a kráva.", "Odkaz na aktivitu (Strava, Garmin, Suunto…) můžeš vložit do zápisu."],
      tip: "Když zbyde energie, přidej 2 série kliků a dřepů.",
      gear: "Podle aktivity.",
      avoid: ["Velký skok v objemu po delší pauze.", "Výkon přes bolest kloubů."]
    }
  },
  weeks: [
    { week: 1, phase: 1, title: "Technika", focus: "Lehké jednoručky, pomalé tempo, čistý pohyb. Po sérii mají zůstat aspoň 3 opakování v rezervě. Svalovka první dny je normální.",
      days: [
        { ...DAY_A, minutes: 10, items: [
          { ex: "warmup", sets: 1, time: "2 min" },
          { ex: "squat", sets: 2, reps: 10, note: "lehce, 2 s dolů" },
          { ex: "pushup", sets: 2, reps: 8, note: "o stůl" },
          { ex: "row", sets: 2, reps: 10, note: "na každou ruku" }
        ] },
        { ...DAY_B, minutes: 10, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min", note: "střídej strany" },
          { ex: "bridge", sets: 2, reps: 12, note: "bez váhy" },
          { ex: "deadbug", sets: 2, reps: 6, note: "na každou stranu" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 10, items: [
          { ex: "warmup", sets: 1, time: "2 min" },
          { ex: "rdl", sets: 2, reps: 10, note: "lehce, nauč se předklon" },
          { ex: "splitsquat", sets: 2, reps: 8, note: "na každou nohu, klidně bez váhy" },
          { ex: "ohp", sets: 2, reps: 10 }
        ] }
      ] },
    { week: 2, phase: 1, title: "Rytmus", focus: "Stejné cviky, víc sérií. Najdi váhu, se kterou dáš 10 opakování a 2–3 by ještě šla. Zapisuj kila.",
      days: [
        { ...DAY_A, minutes: 13, items: [
          { ex: "warmup", sets: 1, time: "2 min" },
          { ex: "squat", sets: 3, reps: 10 },
          { ex: "pushup", sets: 2, reps: 10, note: "o stůl nebo nižší oporu" },
          { ex: "row", sets: 3, reps: 10, note: "na každou ruku" }
        ] },
        { ...DAY_B, minutes: 12, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "bridge", sets: 2, reps: 15 },
          { ex: "deadbug", sets: 2, reps: 8, note: "na každou stranu" },
          { ex: "sideplank", sets: 2, time: "20 s", note: "pravý a levý bok" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 13, items: [
          { ex: "warmup", sets: 1, time: "2 min" },
          { ex: "rdl", sets: 3, reps: 10 },
          { ex: "splitsquat", sets: 2, reps: 10, note: "na každou nohu" },
          { ex: "ohp", sets: 2, reps: 10 },
          { ex: "carry", sets: 2, time: "30 s" }
        ] }
      ] },
    { week: 3, phase: 2, title: "Víc váhy", focus: "Těžší jednoručky, rozsah 8–12 opakování. Poslední 2 opakování mají být těžká. Když dáš všechny série na 12, příště přidej.",
      days: [
        { ...DAY_A, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "squat", sets: 3, reps: "8–12" },
          { ex: "floorpress", sets: 3, reps: "8–12" },
          { ex: "row", sets: 3, reps: "8–12", note: "na každou ruku" }
        ] },
        { ...DAY_B, minutes: 13, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "deadbug", sets: 3, reps: 8, note: "na každou stranu" },
          { ex: "sideplank", sets: 4, time: "20 s", note: "střídej strany" },
          { ex: "thoracic", sets: 2, reps: 8, note: "pravá a levá strana" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "rdl", sets: 3, reps: "8–12" },
          { ex: "splitsquat", sets: 2, reps: "8–12", note: "na každou nohu" },
          { ex: "ohp", sets: 3, reps: "8–12" },
          { ex: "carry", sets: 2, time: "40 s" }
        ] }
      ] },
    { week: 4, phase: 2, title: "Pauza dole", focus: "Stejná váha nebo o kousek víc. U dřepu a mrtvého tahu 2 s pauza v dolní poloze: síla tam, kde je nejtěžší.",
      days: [
        { ...DAY_A, minutes: 14, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "squat", sets: 3, reps: "8–10", note: "2 s pauza dole" },
          { ex: "pushup", sets: 3, reps: "6–12", note: "nižší opora než minule" },
          { ex: "row", sets: 3, reps: "8–12", note: "na každou ruku" }
        ] },
        { ...DAY_B, minutes: 12, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "plank", sets: 2, time: "40 s" },
          { ex: "sideplank", sets: 4, time: "25 s", note: "střídej strany" },
          { ex: "hipflexor", sets: 2, time: "45 s", note: "pravá a levá" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "rdl", sets: 3, reps: "8–12", note: "2 s pauza dole" },
          { ex: "splitsquat", sets: 2, reps: "8–10", note: "na každou nohu" },
          { ex: "ohp", sets: 3, reps: "8–12" },
          { ex: "carry", sets: 2, time: "45 s" }
        ] }
      ] },
    { week: 5, phase: 2, title: "Pomalé spouštění", focus: "U silových cviků spouštěj 3 s. Lehčí váha je v pořádku. Poslední týden síly, pak přidáme tempo.",
      days: [
        { ...DAY_A, minutes: 14, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "squat", sets: 3, reps: 8, note: "3 s dolů" },
          { ex: "floorpress", sets: 3, reps: 8, note: "3 s dolů" },
          { ex: "row", sets: 3, reps: 10, note: "na každou ruku, 1 s nahoře" }
        ] },
        { ...DAY_B, minutes: 13, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "deadbug", sets: 3, reps: 10, note: "s jednoručkou v rukou" },
          { ex: "sideplank", sets: 4, time: "30 s", note: "střídej strany" },
          { ex: "thoracic", sets: 2, reps: 10, note: "pravá a levá strana" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "rdl", sets: 3, reps: 8, note: "3 s dolů" },
          { ex: "reverselunge", sets: 2, reps: 10, note: "na každou nohu" },
          { ex: "ohp", sets: 3, reps: 8, note: "3 s dolů" },
          { ex: "carry", sets: 2, time: "60 s" }
        ] }
      ] },
    { week: 6, phase: 3, title: "Celé tělo naráz", focus: "Nové cviky: dřep s tlakem nad hlavu a švih. Lehčí váha, plynulý pohyb, pauza 45 s.",
      days: [
        { ...DAY_A, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "thruster", sets: 3, reps: 10 },
          { ex: "row", sets: 3, reps: "10–12", note: "na každou ruku" },
          { ex: "pushup", sets: 3, reps: "8–15", note: "ze země nebo z kolen" }
        ] },
        { ...DAY_B, minutes: 13, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "plank", sets: 3, time: "40 s" },
          { ex: "birddog", sets: 2, reps: 10, note: "na každou stranu" },
          { ex: "hipflexor", sets: 2, time: "45 s", note: "pravá a levá" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "swing", sets: 3, reps: 15 },
          { ex: "reverselunge", sets: 2, reps: 10, note: "na každou nohu" },
          { ex: "ohp", sets: 2, reps: "10–12" },
          { ex: "carry", sets: 2, time: "60 s" }
        ] }
      ] },
    { week: 7, phase: 3, title: "Hustota", focus: "Stejné cviky, pauzy jen 30 s. Když dech nestíhá, prodluž pauzu, ne cvik.",
      days: [
        { ...DAY_A, minutes: 14, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "thruster", sets: 3, reps: 12, rest: "30 s" },
          { ex: "row", sets: 3, reps: 12, rest: "30 s", note: "na každou ruku" },
          { ex: "pushup", sets: 3, reps: "8–15", rest: "30 s" }
        ] },
        { ...DAY_B, minutes: 14, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "deadbug", sets: 3, reps: 12, note: "s jednoručkou v rukou" },
          { ex: "sideplank", sets: 4, time: "40 s", note: "střídej strany" },
          { ex: "thoracic", sets: 2, reps: 10, note: "pravá a levá strana" },
          { ex: "breathing", sets: 1, time: "1 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "swing", sets: 3, reps: 15, rest: "30 s" },
          { ex: "reverselunge", sets: 2, reps: 12, rest: "30 s", note: "na každou nohu" },
          { ex: "ohp", sets: 3, reps: 10, rest: "30 s" },
          { ex: "carry", sets: 2, time: "60 s", rest: "30 s" }
        ] }
      ] },
    { week: 8, phase: 3, title: "Vrchol", focus: "Nejtěžší váhy plánu, 6–10 opakování. Porovnej kila s prvním týdnem. Po plánu pokračuj týdny 6–8 dokola a přidávej váhu.",
      days: [
        { ...DAY_A, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "squat", sets: 3, reps: "6–10" },
          { ex: "floorpress", sets: 3, reps: "6–10" },
          { ex: "row", sets: 3, reps: "6–10", note: "na každou ruku" }
        ] },
        { ...DAY_B, minutes: 14, items: [
          { ex: "catcow", sets: 1, time: "1 min" },
          { ex: "wgs", sets: 1, time: "2 min" },
          { ex: "plank", sets: 2, time: "60 s" },
          { ex: "sideplank", sets: 4, time: "40 s", note: "střídej strany" },
          { ex: "hipflexor", sets: 2, time: "60 s", note: "pravá a levá" },
          { ex: "breathing", sets: 1, time: "2 min" }
        ] },
        { ...DAY_C, minutes: 15, items: [
          { ex: "warmup", sets: 1, time: "90 s" },
          { ex: "rdl", sets: 3, reps: "6–10" },
          { ex: "splitsquat", sets: 3, reps: "6–10", note: "na každou nohu" },
          { ex: "ohp", sets: 3, reps: "6–10" }
        ] }
      ] }
  ],
  cheers: [
    "Deset minut a hotovo. 💪",
    "Každý den o kousek silnější.",
    "Jednoručky čekají!",
    "Dneska A, B, nebo C? Hlavně ať je. 🔥",
    "Fandím ti, drž to.",
    "Nejtěžší je začít. Pak už to jede.",
    "Jak svalovka? Doufám, že jen ta dobrá. 😄"
  ]
};

// Milníky zůstávají v kódu (obsahují funkce), do databáze se neukládají.
window.MILESTONES = [
  { id: "first", name: "První krok", desc: "Zapsaný první trénink", test: s => s.total >= 1 },
  { id: "days3", name: "Tři dny v řadě", desc: "3 dny po sobě s tréninkem", test: s => s.bestDayStreak >= 3 },
  { id: "week", name: "Splněný týden", desc: "Poprvé splněný týdenní cíl", test: s => s.weeksHit >= 1 },
  { id: "ten", name: "Desítka", desc: "10 tréninků", test: s => s.total >= 10 },
  { id: "days7", name: "Celý týden", desc: "7 dní po sobě s tréninkem", test: s => s.bestDayStreak >= 7 },
  { id: "heavier", name: "Těžší jednoručky", desc: "U cviku přibyla váha", test: s => s.kgUp >= 1 },
  { id: "phase2", name: "Konec rozjezdu", desc: "2 splněné týdny, čas na sílu", test: s => s.weeksHit >= 2 },
  { id: "streak3", name: "Tři v řadě", desc: "3 týdny v řadě splněný cíl", test: s => s.bestStreak >= 3 },
  { id: "calm", name: "Bez bolesti", desc: "10 tréninků po sobě s bolestí do 2", test: s => s.calmRun >= 10 },
  { id: "twentyfive", name: "Čtvrtstovka", desc: "25 tréninků", test: s => s.total >= 25 },
  { id: "stronger", name: "Silnější všude", desc: "Přidaná váha u 5 cviků", test: s => s.kgUp >= 5 },
  { id: "fifty", name: "Padesátka", desc: "50 tréninků", test: s => s.total >= 50 },
  { id: "plan", name: "Celý plán", desc: "8 splněných týdnů", test: s => s.weeksHit >= 8 }
];
