/*
 * Villa Volpe — pianta interattiva della pagina Discover (4 lingue, dalla lingua di <html>).
 * Punti numerati sulla pianta (images/plan/villa-volpe-plan.webp: la pianta di scripts/villa-plan.py di v5 resa da
 * scripts/villa-plan-render.py, con l'esterno rifatto il 05/11/2026 sulla foto del drone): toccandone uno, la scheda
 * accanto mostra foto, testo e il link alla galleria della stanza. Niente lente: Alberto l'ha tolta il 04/11/2026.
 * Markup: <div class="vv-plan" data-vv-plan data-base="../"></div> (data-base vuoto alla radice).
 * Le coordinate dei punti sono quelle della planimetria (come in v5). L'immagine inquadra x −315…475 e y −146…486 con
 * 2,5924 px per unità: xy() porta i punti in percentuale dell'immagine (stessa formula di planXY in v5). Il ?v= sul
 * file evita che per 10 minuti (la cache di GitHub Pages) i punti nuovi finiscano sull'immagine vecchia.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-vv-plan]');
  if (!root) return;

  var LANGS = ['en', 'it', 'de', 'fr'];
  var L = Math.max(0, LANGS.indexOf((document.documentElement.lang || 'en').slice(0, 2)));
  var BASE = root.getAttribute('data-base') || '';
  var SRC = BASE + 'images/plan/villa-volpe-plan.webp?v=20261105b';
  var GAL = BASE + 'images/gallery/';
  var W = 2048, H = 1638;
  function xy(x, y) { return { left: (2.5924 * x + 816.6) / W * 100, top: (2.5924 * y + 378.5) / H * 100 }; }

  var UI = [
    { intro: 'Explore the house', introText: '65 m² on a single level, three metres from the water: an open-plan living room with kitchen, two king-size bedrooms, an accessible bathroom, a terrace on the lake and private access to the water.', hint: 'Tap a number to discover that corner of the house.', photos: 'See the photos', prev: 'Previous', next: 'Next', close: 'Close', plan: 'Floor plan of Villa Volpe' },
    { intro: 'Esplora la casa', introText: '65 m² su un solo piano, a tre metri dall\'acqua: soggiorno open space con cucina, due camere king-size, un bagno accessibile, una terrazza sul lago e l\'accesso privato all\'acqua.', hint: 'Tocca un numero per scoprire quell\'angolo della casa.', photos: 'Vedi le foto', prev: 'Precedente', next: 'Successivo', close: 'Chiudi', plan: 'Pianta di Villa Volpe' },
    { intro: 'Das Haus entdecken', introText: '65 m² auf einer Ebene, drei Meter vom Wasser: offener Wohnraum mit Küche, zwei Schlafzimmer mit King-Size-Betten, ein barrierefreies Bad, eine Terrasse am See und ein privater Zugang zum Wasser.', hint: 'Tippen Sie auf eine Zahl, um diesen Teil des Hauses zu entdecken.', photos: 'Fotos ansehen', prev: 'Zurück', next: 'Weiter', close: 'Schließen', plan: 'Grundriss der Villa Volpe' },
    { intro: 'Explorer la maison', introText: '65 m² de plain-pied, à trois mètres de l\'eau : séjour ouvert avec cuisine, deux chambres avec lit king-size, une salle de bain accessible, une terrasse sur le lac et un accès privé à l\'eau.', hint: 'Touchez un numéro pour découvrir ce coin de la maison.', photos: 'Voir les photos', prev: 'Précédent', next: 'Suivant', close: 'Fermer', plan: 'Plan de Villa Volpe' }
  ][L];

  // [x, y, stanza?, ancora della galleria, foto (una, o photos: più foto), titoli EN/IT/DE/FR, testi EN/IT/DE/FR]
  var POINTS = [
    { x: 404, y: 42, anchor: 'amenities', photo: 'villavolpeorta-exterior-facade-entrance-ivy-closeup.jpg',
      t: ['Parking & ramp', 'Parcheggio e rampa', 'Parkplatz & Rampe', 'Parking et rampe'],
      d: ['Private parking above the villa and a step-free ramp down to the front door.', 'Parcheggio privato sopra la villa e una rampa senza gradini fino alla porta.', 'Privatparkplatz oberhalb der Villa und eine stufenlose Rampe bis zur Haustür.', 'Parking privé au-dessus de la villa et une rampe sans marches jusqu\'à la porte.'] },
    { x: 150, y: 100, room: true, anchor: 'living', photos: ['villavolpeorta-interior-living-room-sofa-lake-panorama.jpg', 'villavolpeorta-interior-kitchen-dining-lake-view.jpg'],
      t: ['Living room', 'Soggiorno', 'Wohnraum', 'Séjour'],
      d: ['Open space with sofa and round dining table, French windows onto the lake and San Giulio island.', 'Open space con divano e tavolo tondo, portefinestre sul lago e sull\'isola di San Giulio.', 'Offener Raum mit Sofa und rundem Esstisch, Balkontüren zum See und zur Insel San Giulio.', 'Espace ouvert avec canapé et table ronde, portes-fenêtres sur le lac et l\'île San Giulio.'] },
    { x: 106, y: 188, anchor: 'living', photo: 'villavolpeorta-interior-kitchen1.jpg',
      t: ['Kitchen', 'Cucina', 'Küche', 'Cuisine'],
      d: ['A fully equipped corner kitchen, with Nespresso and moka pot, right next to the French windows on the lake.', 'Cucina ad angolo completa, con Nespresso e moka, accanto alle portefinestre sul lago.', 'Voll ausgestattete Eckküche, mit Nespresso und Moka-Kanne, direkt neben den Balkontüren zum See.', 'Cuisine d\'angle tout équipée, avec Nespresso et moka, juste à côté des portes-fenêtres sur le lac.'] },
    { x: 262, y: 140, room: true, anchor: 'bedrooms', photo: 'villavolpeorta-interior-bedroom-double-bed-ensuite.jpg',
      t: ['Bedroom 1', 'Camera 1', 'Schlafzimmer 1', 'Chambre 1'],
      d: ['King-size bed, wardrobe and air conditioning.', 'Letto king-size, armadio e aria condizionata.', 'King-Size-Bett, Kleiderschrank und Klimaanlage.', 'Lit king-size, armoire et climatisation.'] },
    { x: 110, y: 285, room: true, anchor: 'bedrooms', photo: '4.villavolpeorta-interior-bedroom2-kingbed-mirror-wide.jpg',
      t: ['Bedroom 2', 'Camera 2', 'Schlafzimmer 2', 'Chambre 2'],
      d: ['King-size bed, wardrobe and a window onto the lake.', 'Letto king-size, armadio e una finestra sul lago.', 'King-Size-Bett, Kleiderschrank und ein Fenster zum See.', 'Lit king-size, armoire et une fenêtre sur le lac.'] },
    { x: 262, y: 240, room: true, anchor: 'bathroom', photo: 'villavolpeorta-interior-bathroom-walk-in-shower-sink.jpg',
      t: ['Bathroom', 'Bagno', 'Bad', 'Salle de bain'],
      d: ['Fully accessible: walk-in shower, grab handles, movable seat and heated towel rail.', 'Completamente accessibile: doccia a filo pavimento, maniglioni, seduta mobile e scaldasalviette.', 'Vollständig barrierefrei: bodengleiche Dusche, Haltegriffe, mobiler Sitz und Handtuchwärmer.', 'Entièrement accessible : douche à l\'italienne, barres d\'appui, siège mobile et sèche-serviettes.'] },
    { x: 262, y: -18, room: true, anchor: 'outdoor', photo: 'villavolpeorta-exterior-terrace-sliding-doors-lake-view.jpg',
      t: ['Entrance, lake view', 'Ingresso, vista lago', 'Eingang mit Seeblick', 'Entrée, vue sur le lac'],
      d: ['Down the ramp you reach the corner of the house: the walkway leads to the front door, with the lake straight ahead.', 'Scesi dalla rampa si arriva all\'angolo della casa: il vialetto porta alla porta d\'ingresso, con il lago davanti.', 'Über die Rampe erreicht man die Hausecke: Der Weg führt zur Haustür, mit dem See direkt vor Augen.', 'En bas de la rampe, on arrive à l\'angle de la maison : l\'allée mène à la porte d\'entrée, avec le lac droit devant.'] },
    { x: -1, y: 322, anchor: 'outdoor', photo: 'villavolpeorta-exterior-outdoor-shower-stone-sink.jpg',
      t: ['Outdoor shower', 'Doccia esterna', 'Außendusche', 'Douche extérieure'],
      d: ['Hot and cold, for after a swim in the lake.', 'Calda e fredda, per dopo il bagno nel lago.', 'Warm und kalt, für nach dem Baden im See.', 'Chaude et froide, pour après la baignade.'] },
    { x: -55, y: 322, anchor: 'outdoor', photo: 'villavolpeorta-exterior-sunloungers-sunset-lake-reflection.jpg',
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

  function photosHtml(p) {
    var list = p.photos || (p.photo ? [p.photo] : []);
    var imgs = list.map(function (f, i) { return '<img class="vv-plan__photo" src="' + GAL + f + '" alt="' + p.t[L] + (list.length > 1 ? ' ' + (i + 1) : '') + '" loading="lazy">'; }).join('');
    if (list.length < 2) return imgs;
    return '<div class="vv-plan__photos"><div class="vv-plan__strip">' + imgs + '</div><div class="vv-plan__dots">' +
      list.map(function (f, i) { return '<button type="button" class="vv-plan__dot" aria-label="' + (i + 1) + '/' + list.length + '"' + (i ? '' : ' aria-current="true"') + '></button>'; }).join('') + '</div></div>';
  }

  function wirePhotos() {
    var strip = card.querySelector('.vv-plan__strip');
    if (!strip) return;
    var dots = card.querySelectorAll('.vv-plan__dot');
    Array.prototype.forEach.call(dots, function (d, i) {
      d.addEventListener('click', function () { strip.scrollTo({ left: i * strip.clientWidth, behavior: 'smooth' }); });
    });
    strip.addEventListener('scroll', function () {
      var i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
      Array.prototype.forEach.call(dots, function (d, n) { if (n === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    });
  }

  function renderCard() {
    if (active === null) {
      card.innerHTML = '<div class="vv-plan__body"><h3 class="vv-plan__title">' + UI.intro + '</h3><p class="vv-plan__text">' + UI.introText + '</p><p class="vv-plan__hint">' + UI.hint + '</p></div>';
      return;
    }
    var p = POINTS[active];
    card.innerHTML =
      photosHtml(p) +
      '<div class="vv-plan__body">' +
      '<div class="vv-plan__head"><span class="vv-plan__badge">' + (active + 1) + '</span><h3 class="vv-plan__title">' + p.t[L] + '</h3>' +
      '<button type="button" class="vv-plan__close" aria-label="' + UI.close + '">&times;</button></div>' +
      '<p class="vv-plan__text">' + p.d[L] + '</p>' +
      '<div class="vv-plan__nav"><span><button type="button" class="vv-plan__arrow" data-step="-1" aria-label="' + UI.prev + '">&#8249;</button>' +
      '<button type="button" class="vv-plan__arrow" data-step="1" aria-label="' + UI.next + '">&#8250;</button></span>' +
      (p.anchor ? '<a class="vv-plan__more" href="#' + p.anchor + '">' + UI.photos + ' &rarr;</a>' : '') + '</div></div>';
    card.querySelector('.vv-plan__close').addEventListener('click', function () { select(null); });
    wirePhotos();
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
