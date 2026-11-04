/*
 * Villa Volpe — pianta interattiva della pagina Discover (4 lingue, dalla lingua di <html>).
 * Punti numerati sulla pianta (images/plan/villa-volpe-plan.webp: la pianta di scripts/villa-plan.py di v5 resa con
 * Higgsfield e riallineata sui muri): toccandone uno, la scheda accanto mostra foto, testo e il link alla galleria della
 * stanza. Niente lente: Alberto l'ha tolta il 04/11/2026.
 * Markup: <div class="vv-plan" data-vv-plan data-base="../"></div> (data-base vuoto alla radice).
 * Le coordinate dei punti sono quelle della planimetria (come in v5): xy() le porta in percentuale del disegno.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-vv-plan]');
  if (!root) return;

  var LANGS = ['en', 'it', 'de', 'fr'];
  var L = Math.max(0, LANGS.indexOf((document.documentElement.lang || 'en').slice(0, 2)));
  var BASE = root.getAttribute('data-base') || '';
  var SRC = BASE + 'images/plan/villa-volpe-plan.webp';
  var GAL = BASE + 'images/gallery/';
  var W = 1840, H = 1552;
  function xy(x, y) { return { left: (4 * x + 440) / W * 100, top: (4 * y + 160) / H * 100 }; }

  var UI = [
    { intro: 'Explore the house', introText: '65 m² on a single level, three metres from the water: an open-plan living room with kitchen, two king-size bedrooms, an accessible bathroom, a terrace on the lake and private access to the water.', hint: 'Tap a number to discover that corner of the house.', photos: 'See the photos', prev: 'Previous', next: 'Next', close: 'Close', plan: 'Floor plan of Villa Volpe' },
    { intro: 'Esplora la casa', introText: '65 m² su un solo piano, a tre metri dall\'acqua: soggiorno open space con cucina, due camere king-size, un bagno accessibile, una terrazza sul lago e l\'accesso privato all\'acqua.', hint: 'Tocca un numero per scoprire quell\'angolo della casa.', photos: 'Vedi le foto', prev: 'Precedente', next: 'Successivo', close: 'Chiudi', plan: 'Pianta di Villa Volpe' },
    { intro: 'Das Haus entdecken', introText: '65 m² auf einer Ebene, drei Meter vom Wasser: offener Wohnraum mit Küche, zwei Schlafzimmer mit King-Size-Betten, ein barrierefreies Bad, eine Terrasse am See und ein privater Zugang zum Wasser.', hint: 'Tippen Sie auf eine Zahl, um diesen Teil des Hauses zu entdecken.', photos: 'Fotos ansehen', prev: 'Zurück', next: 'Weiter', close: 'Schließen', plan: 'Grundriss der Villa Volpe' },
    { intro: 'Explorer la maison', introText: '65 m² de plain-pied, à trois mètres de l\'eau : séjour ouvert avec cuisine, deux chambres avec lit king-size, une salle de bain accessible, une terrasse sur le lac et un accès privé à l\'eau.', hint: 'Touchez un numéro pour découvrir ce coin de la maison.', photos: 'Voir les photos', prev: 'Précédent', next: 'Suivant', close: 'Fermer', plan: 'Plan de Villa Volpe' }
  ][L];

  // [x, y, stanza?, ancora della galleria, foto, titoli EN/IT/DE/FR, testi EN/IT/DE/FR]
  var POINTS = [
    { x: 290, y: -26, anchor: 'amenities', photo: 'villavolpeorta-exterior-facade-entrance-ivy-closeup.jpg',
      t: ['Parking & ramp', 'Parcheggio e rampa', 'Parkplatz & Rampe', 'Parking et rampe'],
      d: ['Private parking above the villa and a step-free ramp down to the front door.', 'Parcheggio privato sopra la villa e una rampa senza gradini fino alla porta.', 'Privatparkplatz oberhalb der Villa und eine stufenlose Rampe bis zur Haustür.', 'Parking privé au-dessus de la villa et une rampe sans marches jusqu\'à la porte.'] },
    { x: 150, y: 120, room: true, anchor: 'living', photo: 'villavolpeorta-interior-living-room-sofa-lake-panorama.jpg',
      t: ['Living room', 'Soggiorno', 'Wohnraum', 'Séjour'],
      d: ['Open space with sofa and round dining table, French windows onto the lake and San Giulio island.', 'Open space con divano e tavolo tondo, portefinestre sul lago e sull\'isola di San Giulio.', 'Offener Raum mit Sofa und rundem Esstisch, Balkontüren zum See und zur Insel San Giulio.', 'Espace ouvert avec canapé et table ronde, portes-fenêtres sur le lac et l\'île San Giulio.'] },
    { x: 118, y: 178, anchor: 'living', photo: 'villavolpeorta-interior-kitchen-dining-lake-view.jpg',
      t: ['Kitchen', 'Cucina', 'Küche', 'Cuisine'],
      d: ['A fully equipped corner kitchen, with Nespresso and moka pot, right next to the French windows on the lake.', 'Cucina ad angolo completa, con Nespresso e moka, accanto alle portefinestre sul lago.', 'Voll ausgestattete Eckküche, mit Nespresso und Moka-Kanne, direkt neben den Balkontüren zum See.', 'Cuisine d\'angle tout équipée, avec Nespresso et moka, juste à côté des portes-fenêtres sur le lac.'] },
    { x: 262, y: 135, room: true, anchor: 'bedrooms', photo: '4.villavolpeorta-interior-bedroom2-kingbed-mirror-wide.jpg',
      t: ['Bedroom 2', 'Camera 2', 'Schlafzimmer 2', 'Chambre 2'],
      d: ['King-size bed, wardrobe and air conditioning.', 'Letto king-size, armadio e aria condizionata.', 'King-Size-Bett, Kleiderschrank und Klimaanlage.', 'Lit king-size, armoire et climatisation.'] },
    { x: 125, y: 250, room: true, anchor: 'bedrooms', photo: 'villavolpeorta-interior-bedroom-double-bed-ensuite.jpg',
      t: ['Bedroom 1', 'Camera 1', 'Schlafzimmer 1', 'Chambre 1'],
      d: ['King-size bed, wardrobe and a window onto the lake.', 'Letto king-size, armadio e una finestra sul lago.', 'King-Size-Bett, Kleiderschrank und ein Fenster zum See.', 'Lit king-size, armoire et une fenêtre sur le lac.'] },
    { x: 262, y: 268, room: true, anchor: 'bathroom', photo: 'villavolpeorta-interior-bathroom-walk-in-shower-sink.jpg',
      t: ['Bathroom', 'Bagno', 'Bad', 'Salle de bain'],
      d: ['Fully accessible: walk-in shower, grab handles, movable seat and heated towel rail.', 'Completamente accessibile: doccia a filo pavimento, maniglioni, seduta mobile e scaldasalviette.', 'Vollständig barrierefrei: bodengleiche Dusche, Haltegriffe, mobiler Sitz und Handtuchwärmer.', 'Entièrement accessible : douche à l\'italienne, barres d\'appui, siège mobile et sèche-serviettes.'] },
    { x: 50, y: 240, room: true, anchor: 'outdoor', photo: 'villavolpeorta-exterior-terrace-sliding-doors-lake-view.jpg',
      t: ['Terrace', 'Terrazza', 'Terrasse', 'Terrasse'],
      d: ['A stone terrace along the whole house, with two sun awnings, an outdoor dining table and loungers on the lawn facing the lake.', 'Una terrazza in pietra lungo tutta la casa, con due tende da sole, il tavolo da pranzo all\'aperto e i lettini sul prato verso il lago.', 'Eine Steinterrasse entlang des ganzen Hauses, mit zwei Markisen, einem Esstisch im Freien und Liegen auf dem Rasen zum See.', 'Une terrasse en pierre le long de la maison, avec deux stores, une table à manger en plein air et des transats sur la pelouse face au lac.'] },
    { x: 10, y: 314, anchor: 'outdoor',
      t: ['Outdoor shower', 'Doccia esterna', 'Außendusche', 'Douche extérieure'],
      d: ['Hot and cold, for after a swim in the lake.', 'Calda e fredda, per dopo il bagno nel lago.', 'Warm und kalt, für nach dem Baden im See.', 'Chaude et froide, pour après la baignade.'] },
    { x: -44, y: 290, room: true, anchor: 'outdoor', photo: 'villavolpeorta-exterior-sunloungers-sunset-lake-reflection.jpg',
      t: ['Private lake access', 'Accesso privato al lago', 'Privater Seezugang', 'Accès privé au lac'],
      d: ['No beach: a stone wall on the water, with steps down into the lake. Swim, paddle or simply watch the sunset over San Giulio.', 'Niente spiaggia: un muro di pietra sull\'acqua, con i gradini che scendono nel lago. Bagno, SUP o solo il tramonto su San Giulio.', 'Kein Strand: eine Steinmauer am Wasser, mit Stufen hinunter in den See. Baden, paddeln oder einfach den Sonnenuntergang über San Giulio genießen.', 'Pas de plage : un mur de pierre au bord de l\'eau, avec des marches qui descendent dans le lac. Baignade, paddle ou simplement le coucher de soleil sur San Giulio.'] }
  ];

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  // ── markup ──
  var stage = el('div', 'vv-plan__stage');
  var img = el('img', 'vv-plan__img', { src: SRC, alt: UI.plan, width: W, height: H, draggable: 'false', loading: 'lazy' });
  stage.appendChild(img);
  var pins = POINTS.map(function (p, i) {
    var pos = xy(p.x, p.y);
    var b = el('button', 'vv-plan__pin' + (p.room ? ' vv-plan__pin--room' : ''), { type: 'button', 'aria-label': (i + 1) + '. ' + p.t[L], 'aria-pressed': 'false' });
    b.style.left = pos.left + '%';
    b.style.top = pos.top + '%';
    b.innerHTML = '<span class="vv-plan__num">' + (i + 1) + '</span>' + (p.room ? '<span class="vv-plan__name">' + p.t[L] + '</span>' : '');
    b.addEventListener('click', function (e) { e.stopPropagation(); select(active === i ? null : i); });
    stage.appendChild(b);
    return b;
  });
  var card = el('div', 'vv-plan__card', { 'aria-live': 'polite' });
  var chips = el('div', 'vv-plan__chips');
  POINTS.forEach(function (p, i) {
    var c = el('button', 'vv-plan__chip', { type: 'button' });
    c.innerHTML = '<span>' + (i + 1) + '</span>' + p.t[L];
    c.addEventListener('click', function () { select(i); if (window.innerWidth < 960) stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    chips.appendChild(c);
  });
  root.appendChild(stage);
  root.appendChild(card);
  root.appendChild(chips);

  // ── stato ──
  var active = null;

  function renderCard() {
    if (active === null) {
      card.innerHTML = '<div class="vv-plan__body"><h3 class="vv-plan__title">' + UI.intro + '</h3><p class="vv-plan__text">' + UI.introText + '</p><p class="vv-plan__hint">' + UI.hint + '</p></div>';
      return;
    }
    var p = POINTS[active];
    card.innerHTML =
      (p.photo ? '<img class="vv-plan__photo" src="' + GAL + p.photo + '" alt="' + p.t[L] + '" loading="lazy">' : '') +
      '<div class="vv-plan__body">' +
      '<div class="vv-plan__head"><span class="vv-plan__badge">' + (active + 1) + '</span><h3 class="vv-plan__title">' + p.t[L] + '</h3>' +
      '<button type="button" class="vv-plan__close" aria-label="' + UI.close + '">&times;</button></div>' +
      '<p class="vv-plan__text">' + p.d[L] + '</p>' +
      '<div class="vv-plan__nav"><span><button type="button" class="vv-plan__arrow" data-step="-1" aria-label="' + UI.prev + '">&#8249;</button>' +
      '<button type="button" class="vv-plan__arrow" data-step="1" aria-label="' + UI.next + '">&#8250;</button></span>' +
      (p.anchor ? '<a class="vv-plan__more" href="#' + p.anchor + '">' + UI.photos + ' &rarr;</a>' : '') + '</div></div>';
    card.querySelector('.vv-plan__close').addEventListener('click', function () { select(null); });
    Array.prototype.forEach.call(card.querySelectorAll('.vv-plan__arrow'), function (b) {
      b.addEventListener('click', function () { select((active + Number(b.getAttribute('data-step')) + POINTS.length) % POINTS.length); });
    });
  }

  function select(i) {
    active = i;
    pins.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
    Array.prototype.forEach.call(chips.children, function (c, n) { c.classList.toggle('is-active', n === i); });
    renderCard();
  }

  stage.addEventListener('click', function () { if (active !== null) select(null); });

  renderCard();
})();
