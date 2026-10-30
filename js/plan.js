// Tréninkový plán pro Achillovu šlachu (tendinopatie): 10 týdnů, 3× týdně.
// Fáze 1 izometrie a tlumení bolesti, fáze 2 těžká pomalá zátěž (HSR) a excentrické
// výpony, fáze 3 pružnost a návrat k běhu. Stejná struktura se ukládá do databáze
// pod pairs/<kód>/plan; appka pak použije verzi z databáze místo této vestavěné.
// `rest` u cviku je pauza mezi sériemi pro časovač (jinak 1 min u cviků na čas, 2 min u opakování).
const SRC = "https://fyzioklinika.cz/poradna/navody-na-cviceni/boli-me/boli-me-pata-achillova-slacha/cviky-pri-bolestech-paty-achillovy-slachy";

window.PLAN = {
  version: 7,
  name: "Silná Achillovka",
  weeklyGoal: 3,
  source: SRC,
  // Další čtení k tématu. Appka je bere vždy z kódu, ne z databáze.
  resources: [
    { title: "Cviky při bolestech paty a Achillovy šlachy", author: "Fyzioklinika", url: SRC },
    { title: "Periodizace tréninku, zánět achilovky, intervaly, horko místo ledu", author: "Karel Holub, Běžím dokud můžu", note: "Část o achilovce: příznaky, příčiny, tři fáze léčby a prevence.", url: "https://karelholub.substack.com/p/periodizace-treninku-zanet-achilovky" }
  ],
  // Žolíci: jiná aktivita nahradí trénink z plánu, každá nejvýš perWeek× týdně.
  jokers: [
    { id: "bike", ex: "bike", short: "Kolo do práce", icon: "🚲", perWeek: 1, km: true, minKm: 10, defaultKm: 20, placeholder: "Např. protivítr, šlacha po jízdě v klidu…" },
    { id: "kb5", ex: "kb5", short: "KB5", icon: "🏋️", perWeek: 3, link: true, placeholder: "Např. swingy 16 kg, protažení, šlacha v klidu…" }
  ],
  // Rehabka: cviky od lékaře (IC klinika, od 30. 10. 2026). Dělají se každý den, odškrtávají se
  // zvlášť na Přehledu (rehab/<datum>/<cvik>) a do tréninků z plánu se nepočítají.
  rehab: {
    since: "2026-10-30",
    name: "Rehabka",
    note: "Cviky od lékaře z rehabilitace. Jednou denně, všechny tři. Klidně rozděl během dne.",
    clinic: { name: "IC klinika, Rehabilitace & Fitness", address: "Nové sady 676/4, Brno", phone: "+420 530 347 169", hours: "Po–Čt 7–15, Pá 7–12" },
    calendar: "https://calendar.google.com/calendar/u/0?cid=Mzg5NGViMDhlMDNhMDJjZjkwZmY0OGJjYjkwNmFhYjI1ODMyNWQzYzhkMTUyYzQ5MTRlYjcxNDRkOGMwMjNhZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t",
    items: [
      { ex: "rhbhold", sets: "3–4", time: "40–45 s" },
      { ex: "rhbband", sets: "3–4", reps: "15–20" },
      { ex: "rhbtap", sets: "3–4", reps: "15–20" }
    ],
    // Termíny na klinice (z kalendáře Rehabka IC). Appka ukáže nejbližší.
    visits: [
      { date: "2026-10-30", time: "8:00", what: "RHB #1" },
      { date: "2026-11-06", time: "8:30", what: "RHB #2" },
      { date: "2026-11-09", time: "13:15", what: "Laser #1" },
      { date: "2026-11-11", time: "13:15", what: "Laser #2" },
      { date: "2026-11-12", time: "13:45", what: "Laser #3" },
      { date: "2026-11-13", time: "9:30", what: "RHB #3" },
      { date: "2026-11-16", time: "8:45", what: "Laser #4" },
      { date: "2026-11-18", time: "8:45", what: "Laser #5" },
      { date: "2026-11-20", time: "7:30", what: "RHB #4" }
    ]
  },
  phases: [
    { id: 1, name: "Zklidnění", range: "týdny 1–2", summary: "Šlacha bolí i při chůzi. Žádné švihy ani skoky. Izometrické výdrže tlumí bolest, horní tělo a střed těla cvič vsedě nebo vleže.",
      // Přirozený pohyb během dne. Odškrtává se zvlášť, do tréninků se nepočítá.
      everyday: [
        { id: "morning", name: "Ráno před prvním krokem", text: "Ještě v posteli 20× přitáhni a natáhni špičky a pár kroužků kotníkem. První kroky pak tolik nebolí." },
        { id: "teeth", name: "Výdrž při čištění zubů", text: "Obounož do polovičního výponu a vydrž 30 s. Dvakrát za čištění." },
        { id: "stairs-up", name: "Schody nahoru", text: "Klidně, celým chodidlem, ruka na zábradlí. Když bolí víc než 3 z 10, jeď výtahem." },
        { id: "stairs-down", name: "Schody dolů", text: "Pomalu, po jednom schodu. Seběh šlachu zatěžuje nejvíc, zatím ne." },
        { id: "walk", name: "Chůze", text: "Krátké procházky po rovině v botách s mírným dropem. Doma ne bosky po tvrdé podlaze." }
      ] },
    { id: 2, name: "Síla šlachy", range: "týdny 3–7", summary: "Chůze už nebolí. Těžké a pomalé výpony (HSR) a excentrické spouštění. 70–85 % maxima, 6–12 opakování, 3 série, pauza 1–2 min.",
      everyday: [
        { id: "stairs", name: "Schody místo výtahu", text: "Nahoru normálním tempem, celé chodidlo na schodu. Posledních pár schodů přes špičku, pomalu." },
        { id: "teeth", name: "Výpony při čištění zubů", text: "15 pomalých výponů obounož, později na bolavé noze. Ve dny bez tréninku stačí." },
        { id: "wait", name: "Výdrž při čekání", text: "Na tramvaj nebo ve frontě: pár výdrží ve výponu po 10–20 s." },
        { id: "walk", name: "Delší procházky", text: "Půl hodiny až hodina, klidně do mírného kopce. Z kopce zatím pomalu." }
      ] },
    { id: 3, name: "Pružnost a běh", range: "týdny 8–10", summary: "Šlacha znovu snáší rychlou zátěž: poskoky, švihadlo a postupný návrat k běhu. Síla zůstává 2× týdně.",
      everyday: [
        { id: "stairs", name: "Schody svižně", text: "Nahoru rychleji, klidně ob schod. Dolů už normálně, ale ještě ne seběhem." },
        { id: "teeth", name: "Výpony na jedné noze", text: "Při čištění zubů 10–15 výponů na každé noze." },
        { id: "terrain", name: "Chůze v terénu", text: "Les, tráva, nerovný povrch. Kotník a šlacha si zvyknou na různé směry." },
        { id: "jog", name: "Krátký poklus", text: "Když ujíždí tramvaj, můžeš pár metrů popoběhnout. Druhé ráno zkontroluj šlachu." }
      ] }
  ],
  rules: [
    { title: "Bolest do 3 z 10 je v pořádku", text: "Během cvičení smí šlacha bolet nanejvýš na 3–4 z 10. Ostrá nebo rostoucí bolest znamená ubrat zátěž nebo cvik vynechat." },
    { title: "Rozhoduje druhé ráno", text: "Ranní ztuhlost a bolest při prvních krocích nesmí být horší než den předtím. Když je, příští trénink uber a týden zopakuj." },
    { title: "Pomalu a těžce", text: "Šlacha reaguje na těžký a pomalý tah, ne na švihy. Každé opakování 3 s nahoru, 3 s dolů." },
    { title: "Úplný klid nepomáhá", text: "Dlouhý klid šlachu oslabuje. Zatěžuj ji pravidelně, jen v dávce, kterou snese." },
    { title: "Den pauzy mezi silovými tréninky", text: "Šlacha se přestavuje 24–48 h. Silový trénink obden, izometrie jdou i denně." },
    { title: "Po plánu přichází prevence", text: "Běžecký objem zvyšuj pozvolna, bez skoků. Boty s mírným dropem (8–12 mm), ne minimalistické. Drž sílu lýtek a hamstringů, protahuj kotník (hluboký dřep) a střídej běh s kolem nebo plaváním." },
    { title: "Injekce kortikoidů jen výjimečně", text: "Krátkodobě uleví, ale šlachu dlouhodobě oslabují. Raději trpělivá zátěž." }
  ],
  exercises: {
    isoboth: {
      name: "Výdrž ve výponu obounož", alias: "Izometrie", type: "time", rest: "1 min",
      why: "Statická výdrž, kdy je šlacha pod napětím a nehýbe se. Prokazatelně tlumí bolest. Hodí se i v akutní fázi a před během.",
      steps: ["Stoupni si rovně, ruce lehce o zeď nebo opěradlo.", "Zvedni se do polovičního výponu (paty asi 5 cm nad zemí).", "Vydrž 30–45 s, dýchej, pak pomalu dolů. Pauza 1–2 min."],
      tip: "Bolest by během výdrže měla spíš klesat. Když roste, sniž výšku nebo délku výdrže.",
      gear: "Zeď nebo opěradlo na přidržení.",
      avoid: ["Plný výpon na maximum: stačí polovina, šlacha nemá být v krajní poloze.", "Přenášení váhy na zdravou nohu: obě nohy nesou stejně.", "Zadržený dech."],
      video: SRC
    },
    isoseated: {
      name: "Výdrž vsedě se zátěží", alias: "Izometrie lýtka (soleus)", type: "time", rest: "1 min", load: true,
      why: "Pokrčené koleno přenáší práci na hluboký lýtkový sval (soleus), který šlachu nese hlavně při chůzi a běhu.",
      steps: ["Sedni si na židli, chodidla na zemi, kolena v pravém úhlu.", "Na kolena polož zátěž (batoh, činku, lahve).", "Zvedni paty do polovičního výponu a vydrž 30–45 s."],
      gear: "Židle, zátěž na kolena (batoh s knihami, činka).",
      avoid: ["Tlačení rukama: zátěž leží volně na kolenou.", "Paty úplně nahoře: jen do poloviny."],
      video: SRC
    },
    roll: {
      name: "Uvolnění lýtka a plosky", alias: "Válec a míček", type: "time",
      why: "Uvolní napjaté lýtko a plosku nohy, které táhnou za patu. Nebolí, dá se dělat denně.",
      steps: ["Lýtko polož na válec nebo lahev a pomalu po něm jezdi od kotníku ke koleni.", "Plosku nohy přejížděj vestoje po tenisáku od paty k prstům.", "Na každé místo 1–2 min."],
      gear: "Masážní válec nebo lahev, tenisák.",
      avoid: ["Válení přímo po šlaše: šlachu nemasíruj tlakem, jen sval nad ní.", "Silný tlak do bolesti: stačí příjemný tah."],
      video: SRC
    },
    mobility: {
      name: "Kroužení a abeceda kotníkem", alias: "Rozsah pohybu", type: "time",
      why: "Udrží kotník pohyblivý a prokrví šlachu bez zátěže.",
      steps: ["Sedni si, nohu nech volně viset.", "Píšu špičkou velká písmena abecedy, pomalu a v celém rozsahu.", "Pak 10× kroužení na každou stranu."],
      gear: "Židle.",
      avoid: ["Rychlé švihy: pohyb je pomalý a plynulý."],
      video: SRC
    },
    core: {
      name: "Střed těla a horní polovina", alias: "Bez zátěže nohy", type: "time",
      why: "Kondice a síla zůstávají, i když noha odpočívá. Vše vleže nebo vsedě.",
      steps: ["Prkno na předloktích 3× 30–45 s.", "Boční prkno 2× 20–30 s na stranu.", "Kliky (i z kolen) a přítahy s gumou vsedě 3× 10–12."],
      gear: "Podložka, guma nebo jednoručky.",
      avoid: ["Cviky ve stoje na špičkách nebo se skoky: zatím ne."]
    },
    raiseboth: {
      name: "Výpony obounož", alias: "Calf raise", type: "reps", rest: "2 min", load: true,
      why: "První pohyb šlachy pod zátěží. Plynulý přechod z izometrie na pohyb.",
      steps: ["Stoupni si rovně, ruce lehce o zeď.", "3 s nahoru až na špičky, 1 s nahoře, 3 s dolů.", "Váha na palci a druhém prstu, kotník se nebortí."],
      tip: "Když je to snadné, přidej batoh nebo činku v ruce.",
      gear: "Zeď na přidržení, později batoh nebo činka.",
      avoid: ["Rychlé pérování: tempo 3–1–3.", "Kotník uhýbá ven: tlač na palec.", "Pokrčená kolena: nohy propnuté."],
      video: SRC
    },
    raisesingle: {
      name: "Výpony na jedné noze na schodu", alias: "Heavy Slow Resistance", type: "reps", rest: "2 min", load: true,
      why: "Hlavní silový cvik. Těžký a pomalý tah dělá šlachu silnější a pevnější.",
      steps: ["Stoupni si přední částí chodidla bolavé nohy na schod, druhá noha volně.", "3 s nahoru, 3 s dolů až pod úroveň schodu (u úponové bolesti jen do roviny).", "Zátěž v ruce na straně bolavé nohy."],
      tip: "Váhu vol tak, aby poslední 1–2 opakování byla těžká (70–85 % maxima). Zapiš kila a příští týden přidej.",
      gear: "Schod, zábradlí na přidržení, činka nebo batoh.",
      avoid: ["Bolest nad 4/10: uber zátěž.", "Pata pod schodem při bolesti přímo v úponu na patě: pak cvič jen na rovné zemi.", "Odrážení se ze dna: dole krátká pauza."],
      video: SRC
    },
    eccentric: {
      name: "Excentrické výpony", alias: "Spouštění na bolavé noze", type: "reps", rest: "2 min", load: true,
      why: "Nahoru oběma nohama, dolů jen bolavou. Brzdivá práce je pro šlachu silný a bezpečný podnět.",
      steps: ["Stoupni si na špičky obou nohou na schod.", "Zvedni zdravou nohu.", "Pomalu, 3–5 s, klesej na patu bolavé nohy. Nahoru zase oběma."],
      tip: "Polovinu sérií s propnutým kolenem, polovinu s mírně pokrčeným (soleus).",
      gear: "Schod a zábradlí.",
      avoid: ["Rychlý pád dolů: počítej nahlas do pěti.", "Zvedání nahoru bolavou nohou: nahoru vždy obě."],
      video: "https://www.youtube.com/shorts/4hXBCVaOAGY"
    },
    seated: {
      name: "Výpony vsedě se zátěží", alias: "Soleus HSR", type: "reps", rest: "2 min", load: true,
      why: "Soleus nese při běhu až několikanásobek váhy těla. Silný soleus šetří šlachu.",
      steps: ["Sedni si, špičky na kotouči nebo knize, zátěž na kolenou.", "3 s nahoru, 3 s dolů, plný rozsah.", "Na stroji (seated calf) stejně."],
      gear: "Židle, kotouč nebo kniha pod špičky, činka na kolena nebo stroj.",
      avoid: ["Malá zátěž: tady se klidně jde do desítek kil.", "Zkrácený rozsah."],
      video: SRC
    },
    balance: {
      name: "Stoj na jedné noze", alias: "Propriocepce", type: "time", rest: "30 s",
      why: "Rychlé drobné reakce kotníku. Chrání před vyvrtnutím a připravuje na běh.",
      steps: ["Stoupni si na bolavou nohu, koleno mírně pokrčené.", "Vydrž bez zakolísání."],
      tip: "Těžší varianta: zavřené oči, polštář pod nohou nebo házení míčkem.",
      gear: "Zeď na dosah, později polštář.",
      avoid: ["Zamčené koleno.", "Kotník padá dovnitř: váha na celé chodidlo."]
    },
    pogo: {
      name: "Poskoky snožmo", alias: "Pogo", type: "reps", rest: "1 min",
      why: "Šlacha je pružina. Krátké nízké poskoky ji učí znovu ukládat a vracet energii.",
      steps: ["Stůj na špičkách, kolena skoro propnutá.", "Drobné rychlé poskoky na místě, jen z kotníků.", "Měkký dopad na přední část chodidla."],
      tip: "Začni 2× 10 poskoků. Když druhé ráno nic, přidej.",
      gear: "Rovná pevná podlaha, sportovní boty.",
      avoid: ["Vysoké skoky: stačí pár centimetrů.", "Dopad na paty.", "Skákání s bolestí nad 3/10."]
    },
    hop: {
      name: "Poskoky na jedné noze", alias: "Single-leg hop", type: "reps", rest: "1 min",
      why: "Plná pružná zátěž jedné šlachy, poslední krok před během.",
      steps: ["Stoupni si na bolavou nohu.", "Nízké poskoky na místě, pak dopředu a dozadu.", "Měkký a tichý dopad."],
      gear: "Rovná podlaha, sportovní boty.",
      avoid: ["Tvrdý hlučný dopad.", "Pokračování při bolesti."]
    },
    rope: {
      name: "Švihadlo", alias: "Rope skipping", type: "time", rest: "30 s",
      why: "Opakovaná lehká pružná zátěž, příprava na rytmus běhu.",
      steps: ["Snožmo, nízko, na špičkách.", "Intervaly 30 s skákání, 30 s pauza."],
      gear: "Švihadlo, pevná podložka.",
      avoid: ["Dlouhé souvislé série hned na začátku."]
    },
    run: {
      name: "Chůze a běh střídavě", alias: "Návrat k běhu", type: "time",
      why: "Postupný návrat k běhu po rovině, kontrolovaně.",
      steps: ["5 min svižné chůze na zahřátí.", "Střídej 1 min lehkého klusu a 1–2 min chůze.", "Skonči chůzí. Druhé ráno zkontroluj ztuhlost."],
      tip: "Běhej obden, ideálně po měkkém povrchu. Rychlost a kopce, hlavně seběhy, až po 2 týdnech bez reakce šlachy.",
      gear: "Běžecké boty s mírným dropem (8–10 mm), rovný terén.",
      avoid: ["Kopce a sprinty: zatím ne.", "Bosé nebo minimalistické boty: šlacha by dostala víc práce.", "Běh dva dny po sobě."]
    },
    rhbhold: {
      name: "Výdrž na schodu v rovině", alias: "Rehabka · izometrie na hraně", type: "time", rest: "1 min",
      why: "Cvik od lékaře. Chodidlo vodorovně s hranou schodu pod klouby prstů: šlacha drží tah v prodloužené poloze, bez pohybu. Tlumí bolest a zvyká šlachu na zátěž.",
      steps: ["Stoupni si na schod tak, aby hrana byla pod klouby prstů (bříška prstů přes hranu). Ruka na zábradlí.", "Chodidlo srovnej do vodorovné polohy: pata ani nahoře, ani pod schodem.", "Vydrž 40–45 s, dýchej. Pak sestup a krátká pauza."],
      tip: "Když je to snadné, ber víc váhy na bolavou nohu. Bolest nad 3–4 z 10 znamená zkrátit výdrž.",
      gear: "Schod a zábradlí nebo zeď.",
      avoid: ["Pata klesá pod schod: držíš vodorovně, ne protažení.", "Prsty křečovitě svírají hranu: váha je na kloubech prstů, prsty volné.", "Zamčená kolena a zadržený dech."]
    },
    rhbband: {
      name: "Výpony na schodu s gumou do strany", alias: "Rehabka · nahoru a dolů", type: "reps", rest: "1 min",
      why: "Cvik od lékaře. Stejná poloha jako výdrž, ale v pohybu. Guma tahá koleno a kotník do strany a nutí je držet osu, takže pracuje i vnější část lýtka a stabilizátory kotníku.",
      steps: ["Gumu uvaž kolem zábradlí nebo ji podrž tak, aby tahala koleno do strany (ven nebo dovnitř, podle zadání z rehabky).", "Stoupni si na schod s hranou pod klouby prstů, ruka na zábradlí.", "Plynule nahoru na špičky a dolů do vodorovné polohy. 15–20 opakování, tempo klidné, ne švih."],
      tip: "Kotník drž rovně proti tahu gumy, kolena ať neuhýbají. Posledních pár opakování má být cítit v lýtku.",
      gear: "Schod, zábradlí, odporová guma.",
      avoid: ["Guma vyhrává: koleno a kotník se nechají stáhnout do strany.", "Rychlé pérování: každé opakování pod kontrolou.", "Dolů hluboko pod schod: zatím jen do roviny."]
    },
    rhbtap: {
      name: "Dynamika u futer", alias: "Rehabka · špičky", type: "reps", rest: "45 s",
      why: "Cvik od lékaře. První rychlejší práce šlachy: z výponu rychle klesnout a špičkami plácnout o zem. Učí šlachu pružit a vracet energii, připravuje na chůzi do schodů a běh.",
      steps: ["Opři se rukama o rám dveří (futra), nohy na šířku boků.", "Zvedni se na špičky.", "Rychle klesni dolů tak, že špičkama plácneš o zem, a hned zase nahoru. 15–20 opakování, 3–4 série."],
      tip: "Začni opatrně, dopad má být slyšet jako plácnutí, ne dunění. Když šlacha druhé ráno reaguje, příště uber sérii.",
      gear: "Rám dveří nebo zeď na opření, rovná podlaha.",
      avoid: ["Tvrdý dopad na patu: dopadají špičky a přední část chodidla.", "Vysoké skoky: nohy zem neopouštějí, jen výpon a plácnutí.", "Cvičení při ostré bolesti."]
    },
    kb5: {
      name: "KB5: kettlebelly a protažení", alias: "Žolík", type: "time",
      why: "Silový trénink s kettlebelly a protažení v KB5. Drží sílu celého těla a kondici, šlachu ale cíleně nebuduje, proto výpony z plánu zůstávají hlavní. Nahradí nejvýš 3 tréninky týdně.",
      steps: ["Rozcvičení 5–10 min, kotníky a lýtka rozhýbat v klidu.", "Kettlebell cviky (swingy, mrtvé tahy, dřepy, tlaky) s celým chodidlem na zemi.", "Na konci jemné protažení lýtka, bez dlouhého hlubokého tahu na šlachu.", "Odkaz na aktivitu ze Suunta vlož do zápisu."],
      tip: "Když zbyde čas, přidej na konec 3 série výponů z aktuálního týdne plánu.",
      gear: "Kettlebelly v KB5, boty s rovnou podrážkou.",
      avoid: ["Skoky, poskoky a švihadlo před fází 3.", "Hluboké protahování lýtka přes hranu schodu, hlavně při bolesti v úponu na patě.", "Bolest šlachy nad 3–4 z 10: uber nebo cvik vynech."]
    },
    bike: {
      name: "Kolo do práce", alias: "Žolík", type: "time",
      why: "Kolo šlachu skoro nezatěžuje a drží kondici. Sílu šlachy ale nebuduje, proto nahradí nejvýš jeden trénink týdně.",
      steps: ["Pedál pod nártem (středem chodidla), ne pod špičkou: lýtko a šlacha méně pracují.", "Lehký převod, vyšší kadence. Žádné stoupání ve stoje.", "Po příjezdu zkontroluj šlachu, druhé ráno ztuhlost."],
      tip: "Oba směry za den počítej jako jednu jízdu.",
      gear: "Kolo, správně nastavené sedlo, přilba.",
      avoid: ["Příliš vysoké sedlo: noha se natahuje špičkou dolů a táhne za šlachu.", "Těžký převod do kopce ve stoje.", "Nášlapné pedály s kufrem pod špičkou: v akutní fázi radši ploché."]
    }
  },
  weeks: [
    { week: 1, phase: 1, title: "Zklidnění", focus: "Šlacha bolí i při chůzi. Jen výdrže, uvolnění a horní tělo. Izometrie klidně denně.",
      items: [
        { ex: "isoboth", sets: 4, time: "30 s", note: "pauza 1–2 min" },
        { ex: "isoseated", sets: 4, time: "30 s", note: "lehká zátěž na kolenou" },
        { ex: "mobility", sets: 1, time: "3 min" },
        { ex: "roll", sets: 1, time: "4 min" },
        { ex: "core", sets: 1, time: "15 min" }
      ] },
    { week: 2, phase: 1, title: "Delší výdrže", focus: "Výdrže prodluž. Když chůze přestane bolet, od příštího týdne začínáme s pohybem.",
      items: [
        { ex: "isoboth", sets: 5, time: "45 s", note: "zkus víc váhy na bolavou nohu" },
        { ex: "isoseated", sets: 5, time: "45 s", note: "těžší zátěž" },
        { ex: "balance", sets: 3, time: "30 s" },
        { ex: "roll", sets: 1, time: "4 min" },
        { ex: "core", sets: 1, time: "15 min" }
      ] },
    { week: 3, phase: 2, title: "První pohyb", focus: "Výpony obounož v tempu 3–1–3 a první excentrika. Izometrie jako rozcvička.",
      items: [
        { ex: "isoboth", sets: 2, time: "45 s", note: "rozcvička" },
        { ex: "raiseboth", sets: 3, reps: 15, note: "vlastní váha, tempo 3–1–3" },
        { ex: "eccentric", sets: 3, reps: 10, note: "dolů 3–5 s" },
        { ex: "seated", sets: 3, reps: 15, note: "střední zátěž" },
        { ex: "balance", sets: 3, time: "30 s" }
      ] },
    { week: 4, phase: 2, title: "Jedna noha", focus: "Přechod na výpony na jedné noze. Zátěž zatím jen vlastní váha.",
      items: [
        { ex: "isoboth", sets: 2, time: "45 s", note: "rozcvička" },
        { ex: "raisesingle", sets: 3, reps: 12, note: "vlastní váha, na rovině nebo schodu" },
        { ex: "eccentric", sets: 3, reps: 12, note: "polovina s pokrčeným kolenem" },
        { ex: "seated", sets: 3, reps: 12, note: "přidej zátěž" },
        { ex: "balance", sets: 3, time: "45 s" }
      ] },
    { week: 5, phase: 2, title: "Těžká zátěž", focus: "HSR: zátěž, se kterou zvládneš 10–12 pomalých opakování. Zapisuj kila.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 12, note: "batoh nebo činka, 70 % maxima" },
        { ex: "eccentric", sets: 3, reps: 12, note: "s batohem" },
        { ex: "seated", sets: 3, reps: 12, note: "těžce" },
        { ex: "balance", sets: 3, time: "45 s", note: "na polštáři" }
      ] },
    { week: 6, phase: 2, title: "Těžší, méně", focus: "Zátěž nahoru, opakování dolů. Pauza mezi sériemi 2 min.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 10, note: "o 2–5 kg víc, 75–80 % maxima" },
        { ex: "eccentric", sets: 3, reps: 10, note: "se zátěží" },
        { ex: "seated", sets: 3, reps: 10, note: "o stupeň těžší" },
        { ex: "balance", sets: 3, time: "60 s", note: "zavřené oči" }
      ] },
    { week: 7, phase: 2, title: "Maximum", focus: "Nejtěžší týden. 6–8 opakování na 80–85 % maxima. Bez bolesti druhé ráno = připraven na skoky.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 8, note: "80–85 % maxima" },
        { ex: "seated", sets: 3, reps: 8, note: "těžce" },
        { ex: "eccentric", sets: 2, reps: 10 },
        { ex: "pogo", sets: 2, reps: 10, note: "jen jako test, nízko" },
        { ex: "balance", sets: 3, time: "60 s" }
      ] },
    { week: 8, phase: 3, title: "Pružina", focus: "Poskoky snožmo a švihadlo. Silový trénink zůstává.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 8, note: "zátěž jako minule" },
        { ex: "seated", sets: 3, reps: 8 },
        { ex: "pogo", sets: 3, reps: 15 },
        { ex: "rope", sets: 4, time: "30 s" },
        { ex: "run", sets: 1, time: "15 min", note: "1 min klus, 2 min chůze, obden" }
      ] },
    { week: 9, phase: 3, title: "Jedna noha ve vzduchu", focus: "Poskoky na jedné noze a delší běžecké intervaly.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 8, note: "zkus přidat" },
        { ex: "pogo", sets: 3, reps: 20 },
        { ex: "hop", sets: 3, reps: 10, note: "na každou nohu" },
        { ex: "rope", sets: 5, time: "45 s" },
        { ex: "run", sets: 1, time: "20 min", note: "2 min klus, 1 min chůze" }
      ] },
    { week: 10, phase: 3, title: "Souvislý běh", focus: "Konec plánu. Dál výpony se zátěží 2× týdně jako prevence, objem běhu přidávej pozvolna.",
      items: [
        { ex: "raisesingle", sets: 3, reps: 8, note: "udržovací" },
        { ex: "seated", sets: 3, reps: 8 },
        { ex: "hop", sets: 3, reps: 15, note: "dopředu a dozadu" },
        { ex: "run", sets: 1, time: "20 min", note: "souvisle, pomalu, po rovině" }
      ] }
  ],
  cheers: [
    "Šlacha ti poděkuje. 💪",
    "Pomalu a těžce. Přesně tak.",
    "Kolo do práce se počítá. 🚲",
    "Každý výpon se počítá. Hrdý na tebe.",
    "Dneska dobrý den na trénink? Fandím ti!",
    "Tři série a máš to.",
    "Jak bylo ráno? Doufám, že klidně. ❤️"
  ]
};

// Milníky zůstávají v kódu (obsahují funkce), do databáze se neukládají.
window.MILESTONES = [
  { id: "first", name: "První krok", desc: "Zapsaný první trénink", test: s => s.total >= 1 },
  { id: "five", name: "Pětka", desc: "5 tréninků", test: s => s.total >= 5 },
  { id: "week", name: "Splněný týden", desc: "Poprvé splněný týdenní cíl", test: s => s.weeksHit >= 1 },
  { id: "calm", name: "Klidná šlacha", desc: "5 tréninků po sobě s bolestí do 3", test: s => s.calmRun >= 5 },
  { id: "phase2", name: "Konec zklidnění", desc: "2 splněné týdny, čas na pohyb", test: s => s.weeksHit >= 2 },
  { id: "ten", name: "Desítka", desc: "10 tréninků", test: s => s.total >= 10 },
  { id: "heavy", name: "Pod zátěží", desc: "Výpon na jedné noze se zátěží 10 kg", test: s => s.maxKg >= 10 },
  { id: "streak3", name: "Tři v řadě", desc: "3 týdny v řadě splněný cíl", test: s => s.bestStreak >= 3 },
  { id: "rehab7", name: "Poctivá rehabka", desc: "7 dní v řadě všechny cviky od lékaře", test: s => s.rehabStreak >= 7 },
  { id: "twenty", name: "Dvacítka", desc: "20 tréninků", test: s => s.total >= 20 },
  { id: "bike100", name: "Sto kilometrů", desc: "100 km na kole do práce", test: s => s.bikeKm >= 100 },
  { id: "plan", name: "Celý plán", desc: "10 splněných týdnů", test: s => s.weeksHit >= 10 }
];
