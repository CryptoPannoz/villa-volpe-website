/**
 * ═══════════════════════════════════════════════════════════
 * 🌐 calendar.js — Booking Engine v2 (Villa Volpe)
 * ═══════════════════════════════════════════════════════════
 *
 * Widget unificato: Calendario + Form ospiti + Policy + Conferma
 * Legge disponibilità da Google Calendar API,
 * evidenzia periodi liberi (min 3 notti),
 * invia richieste a BookingRequest.gs via doPost.
 *
 * Flusso: Calendar → Guests → Policy/Summary → Confirmation
 *
 * Fix inclusi:
 *   - CORS risolto con fetch/text-plain
 *   - Checkout day disponibile (checkout avviene la mattina)
 *   - Gap liberi evidenziati visivamente
 * ═══════════════════════════════════════════════════════════
 */

// ── CONFIG (lato browser) ───────────────────────────────────
const BOOKING_CONFIG = {
  calendarId: 'be5a630aebb1f10d8e8bee8144948cda4b8227517394f8ff109a17c9424b6e57@group.calendar.google.com',
  apiKey: 'AIzaSyDkmWoTVEgonSPPTYrKIY9SuoodIVO4lpQ',
  webAppUrl: 'https://script.google.com/macros/s/AKfycbwRS03OQTl9x2KLZbQFEqvA9f3MoccyPcf7sdeHiSzd53r5u6ubnC4b6OS2tE9kuJUo-Q/exec',
  minNights: 3,
  maxNightsToShow: 29,  // Gap > 29 notti non vengono mostrati nella lista
  maxGuests: 4,
  email: 'villavolpeorta@gmail.com'
};


// ── PROMO ───────────────────────────────────────────────────
// Offerta ottobre 2026: due settimane a prezzo fisso, saldo immediato e
// nessun rimborso. Sostituisce le condizioni standard (acconto 30% + saldo
// 21 giorni prima) per queste sole date — vedi renderPromoPolicy().
//
// Per spegnerla: `active: false`, oppure lascia passare `expires`.
// ⚠️ La stessa scadenza e' ripetuta nello snippet inline nell'<head> di ogni
// pagina, quello che toglie la classe `has-promo` e nasconde la fascia in
// cima al sito. Se cambi la data qui, cambiala anche li' (cerca `has-promo`).
var PROMO = {
  active: true,
  expires: '2026-10-01T00:00:00+02:00',   // fine 30/09/2026, ora italiana
  price: 1540,
  weeks: [
    { start: '2026-10-11', end: '2026-10-18' },
    { start: '2026-10-18', end: '2026-10-25' }
  ]
};

function promoIsRunning() {
  return PROMO.active && Date.now() < Date.parse(PROMO.expires);
}

/** '2026-10-11' → Date locale a mezzanotte (evita lo shift UTC di new Date(str)) */
function promoParseDate(iso) {
  var p = iso.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** Prezzo nel formato della lingua: €1,540 in EN, 1.540 € in IT/DE, 1 540 € in FR.
 *  `useGrouping: 'always'` non e' un vezzo: in italiano e tedesco il CLDR non
 *  raggruppa i numeri di quattro cifre, quindi verrebbe "1540 €" mentre la
 *  fascia in cima al sito scrive "1.540 €". Due prezzi scritti diversi nella
 *  stessa pagina sembrano due prezzi. */
function promoPrice() {
  try {
    return new Intl.NumberFormat(BOOKING_LOCALE, {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
      useGrouping: 'always'
    }).format(PROMO.price);
  } catch (e) {
    return PROMO.price.toLocaleString(BOOKING_LOCALE) + ' €';
  }
}

/** La settimana promo che corrisponde esattamente alle date scelte, o null. */
function promoWeekFor(checkIn, checkOut) {
  if (!promoIsRunning() || !checkIn || !checkOut) return null;
  for (var i = 0; i < PROMO.weeks.length; i++) {
    var w = PROMO.weeks[i];
    if (promoParseDate(w.start).toDateString() === checkIn.toDateString() &&
        promoParseDate(w.end).toDateString() === checkOut.toDateString()) {
      return w;
    }
  }
  return null;
}

/** Settimane promo ancora future e con tutte le notti libere. */
function promoBookableWeeks() {
  if (!promoIsRunning()) return [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  return PROMO.weeks.filter(function(w) {
    var start = promoParseDate(w.start);
    var end = promoParseDate(w.end);
    if (start < today) return false;
    // Stesso criterio della selezione manuale: check-in libero e nessuna
    // notte bloccata in mezzo (il giorno di check-out non conta, si libera
    // la mattina).
    return !isDateBlocked(start) && !hasBlockedDatesInRange(start, end);
  });
}


// ── I18N (booking widget) ───────────────────────────────────
var BOOKING_LANG = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
if (['en', 'fr', 'de', 'it'].indexOf(BOOKING_LANG) === -1) BOOKING_LANG = 'en';
var BOOKING_LOCALE = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' }[BOOKING_LANG];

var I18N = {
  en: {
    noGaps: 'No available periods found. Please contact us directly.',
    gapsLoadError: 'Availability could not be loaded. Please email us directly at',
    dayHeaders: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    rangeUnavailable: 'Your selection includes unavailable dates. Please choose dates within the same available period.',
    selectDate: 'Select date',
    selectCheckout: 'Select checkout',
    hintCheckin: 'Select your check-in date',
    hintCheckout: 'Now select your check-out date',
    loadError: 'Unable to load availability. Please try again later.',
    connError: 'Connection error. Please refresh the page.',
    sending: 'Sending...',
    sendError: function(email) { return 'Error sending request. Please contact us at ' + email; },
    minStay: function(min, sel) { return 'Minimum stay: ' + min + ' nights. You selected ' + sel + '.'; },
    nightsAvailable: function(n) { return n + ' nights available'; },
    nights: function(n) { return n + ' night' + (n > 1 ? 's' : ''); },
    guests: function(a, c) {
      var s = a + ' adult' + (a > 1 ? 's' : '');
      if (c > 0) s += ', ' + c + ' child' + (c > 1 ? 'ren' : '');
      return s;
    },
    petsYes: 'Yes (€120 cleaning fee applies)',
    petsNo: 'No',
    ariaUnavailable: 'unavailable',
    ariaAvailable: 'available',
    ariaCheckin: 'selected as check-in',
    ariaCheckout: 'selected as check-out',
    ariaGapSelect: function(from, to) { return 'Select availability from ' + from + ' to ' + to; },
    promoTag: 'Offer',
    promoNights: function(p) { return '7 nights · ' + p + ' all included'; },
    promoTerms: 'Pay in full on booking · non-refundable',
    promoSummaryLabel: 'Offer price',
    promoSummaryValue: function(p) { return p + ' — all included'; },
    promoPolicyTitle: 'October offer — terms',
    promoPolicyIntro: 'For these dates the following terms apply instead of the standard payment and cancellation policy below.',
    promoPolicyItems: function(p) { return [
      '<strong>Price:</strong> ' + p + ' for 7 nights, cleaning and linen included',
      '<strong>Payment:</strong> full amount due on booking, not a 30% deposit',
      '<strong>Cancellation:</strong> non-refundable — no refund if you cancel or change dates',
      '<strong>Tourist tax:</strong> €1.00 per night per guest, still payable on arrival'
    ]; },
    promoRequestNote: function(p) { return 'OCTOBER OFFER — ' + p + ' for 7 nights, all included. Pay in full on booking, non-refundable.'; }
  },
  fr: {
    noGaps: 'Aucune période disponible trouvée. Merci de nous contacter directement.',
    gapsLoadError: 'Impossible de charger les disponibilités. Écrivez-nous directement à',
    dayHeaders: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    rangeUnavailable: 'Votre sélection inclut des dates indisponibles. Veuillez choisir des dates au sein d’une même période disponible.',
    selectDate: 'Choisir une date',
    selectCheckout: 'Choisir le départ',
    hintCheckin: 'Sélectionnez votre date d’arrivée',
    hintCheckout: 'Sélectionnez maintenant votre date de départ',
    loadError: 'Impossible de charger les disponibilités. Veuillez réessayer plus tard.',
    connError: 'Erreur de connexion. Veuillez actualiser la page.',
    sending: 'Envoi en cours...',
    sendError: function(email) { return 'Erreur lors de l’envoi de la demande. Merci de nous contacter à ' + email; },
    minStay: function(min, sel) { return 'Séjour minimum : ' + min + ' nuits. Vous avez sélectionné ' + sel + '.'; },
    nightsAvailable: function(n) { return n + ' nuits disponibles'; },
    nights: function(n) { return n + ' nuit' + (n > 1 ? 's' : ''); },
    guests: function(a, c) {
      var s = a + ' adulte' + (a > 1 ? 's' : '');
      if (c > 0) s += ', ' + c + ' enfant' + (c > 1 ? 's' : '');
      return s;
    },
    petsYes: 'Oui (frais de ménage de 120 €)',
    petsNo: 'Non',
    ariaUnavailable: 'indisponible',
    ariaAvailable: 'disponible',
    ariaCheckin: 'sélectionné comme arrivée',
    ariaCheckout: 'sélectionné comme départ',
    ariaGapSelect: function(from, to) { return 'Sélectionner la disponibilité du ' + from + ' au ' + to; },
    promoTag: 'Offre',
    promoNights: function(p) { return '7 nuits · ' + p + ' tout compris'; },
    promoTerms: 'Paiement intégral à la réservation · non remboursable',
    promoSummaryLabel: 'Prix de l’offre',
    promoSummaryValue: function(p) { return p + ' — tout compris'; },
    promoPolicyTitle: 'Offre d’octobre — conditions',
    promoPolicyIntro: 'Pour ces dates, les conditions suivantes remplacent la politique de paiement et d’annulation standard ci-dessous.',
    promoPolicyItems: function(p) { return [
      '<strong>Prix :</strong> ' + p + ' pour 7 nuits, ménage et linge inclus',
      '<strong>Paiement :</strong> intégralité due à la réservation, et non un acompte de 30 %',
      '<strong>Annulation :</strong> non remboursable — aucun remboursement en cas d’annulation ou de changement de dates',
      '<strong>Taxe de séjour :</strong> 1,00 € par nuit et par personne, à régler sur place'
    ]; },
    promoRequestNote: function(p) { return 'OFFRE OCTOBRE — ' + p + ' pour 7 nuits, tout compris. Paiement intégral à la réservation, non remboursable.'; }
  },
  de: {
    noGaps: 'Keine verfügbaren Zeiträume gefunden. Bitte kontaktieren Sie uns direkt.',
    gapsLoadError: 'Verfügbarkeit konnte nicht geladen werden. Schreiben Sie uns direkt an',
    dayHeaders: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    rangeUnavailable: 'Ihre Auswahl enthält nicht verfügbare Daten. Bitte wählen Sie Daten innerhalb desselben verfügbaren Zeitraums.',
    selectDate: 'Datum wählen',
    selectCheckout: 'Abreise wählen',
    hintCheckin: 'Wählen Sie Ihr Anreisedatum',
    hintCheckout: 'Wählen Sie nun Ihr Abreisedatum',
    loadError: 'Verfügbarkeit konnte nicht geladen werden. Bitte versuchen Sie es später erneut.',
    connError: 'Verbindungsfehler. Bitte laden Sie die Seite neu.',
    sending: 'Wird gesendet...',
    sendError: function(email) { return 'Fehler beim Senden der Anfrage. Bitte kontaktieren Sie uns unter ' + email; },
    minStay: function(min, sel) { return 'Mindestaufenthalt: ' + min + ' Nächte. Sie haben ' + sel + ' gewählt.'; },
    nightsAvailable: function(n) { return n + ' Nächte verfügbar'; },
    nights: function(n) { return n + (n > 1 ? ' Nächte' : ' Nacht'); },
    guests: function(a, c) {
      var s = a + (a > 1 ? ' Erwachsene' : ' Erwachsener');
      if (c > 0) s += ', ' + c + (c > 1 ? ' Kinder' : ' Kind');
      return s;
    },
    petsYes: 'Ja (120 € Reinigungsgebühr)',
    petsNo: 'Nein',
    ariaUnavailable: 'nicht verfügbar',
    ariaAvailable: 'verfügbar',
    ariaCheckin: 'als Anreise ausgewählt',
    ariaCheckout: 'als Abreise ausgewählt',
    ariaGapSelect: function(from, to) { return 'Verfügbarkeit vom ' + from + ' bis ' + to + ' auswählen'; },
    promoTag: 'Angebot',
    promoNights: function(p) { return '7 Nächte · ' + p + ' alles inklusive'; },
    promoTerms: 'Vollständige Zahlung bei Buchung · nicht erstattbar',
    promoSummaryLabel: 'Angebotspreis',
    promoSummaryValue: function(p) { return p + ' — alles inklusive'; },
    promoPolicyTitle: 'Oktober-Angebot — Bedingungen',
    promoPolicyIntro: 'Für diese Daten gelten die folgenden Bedingungen anstelle der unten stehenden Standard-Zahlungs- und Stornierungsbedingungen.',
    promoPolicyItems: function(p) { return [
      '<strong>Preis:</strong> ' + p + ' für 7 Nächte, Endreinigung und Wäsche inklusive',
      '<strong>Zahlung:</strong> Gesamtbetrag bei Buchung fällig, keine Anzahlung von 30 %',
      '<strong>Stornierung:</strong> nicht erstattbar — keine Rückerstattung bei Stornierung oder Datumsänderung',
      '<strong>Kurtaxe:</strong> 1,00 € pro Nacht und Person, weiterhin vor Ort zu zahlen'
    ]; },
    promoRequestNote: function(p) { return 'OKTOBER-ANGEBOT — ' + p + ' für 7 Nächte, alles inklusive. Vollständige Zahlung bei Buchung, nicht erstattbar.'; }
  },
  it: {
    noGaps: 'Nessun periodo disponibile trovato. Contattaci direttamente.',
    gapsLoadError: 'Impossibile caricare le disponibilità. Scrivici direttamente a',
    dayHeaders: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
    rangeUnavailable: 'La tua selezione include date non disponibili. Scegli date all\u2019interno dello stesso periodo disponibile.',
    selectDate: 'Seleziona la data',
    selectCheckout: 'Seleziona il check-out',
    hintCheckin: 'Seleziona la data di check-in',
    hintCheckout: 'Ora seleziona la data di check-out',
    loadError: 'Impossibile caricare le disponibilit\u00e0. Riprova pi\u00f9 tardi.',
    connError: 'Errore di connessione. Ricarica la pagina.',
    sending: 'Invio in corso...',
    sendError: function(email) { return 'Errore nell\u2019invio della richiesta. Contattaci a ' + email; },
    minStay: function(min, sel) { return 'Soggiorno minimo: ' + min + ' notti. Ne hai selezionate ' + sel + '.'; },
    nightsAvailable: function(n) { return n + ' notti disponibili'; },
    nights: function(n) { return n + (n > 1 ? ' notti' : ' notte'); },
    guests: function(a, c) {
      var s = a + (a > 1 ? ' adulti' : ' adulto');
      if (c > 0) s += ', ' + c + (c > 1 ? ' bambini' : ' bambino');
      return s;
    },
    petsYes: 'S\u00ec (supplemento pulizie di 120 \u20ac)',
    petsNo: 'No',
    ariaUnavailable: 'non disponibile',
    ariaAvailable: 'disponibile',
    ariaCheckin: 'selezionato come check-in',
    ariaCheckout: 'selezionato come check-out',
    ariaGapSelect: function(from, to) { return 'Seleziona la disponibilit\u00e0 dal ' + from + ' al ' + to; },
    promoTag: 'Offerta',
    promoNights: function(p) { return '7 notti \u00b7 ' + p + ' tutto incluso'; },
    promoTerms: 'Saldo immediato alla prenotazione \u00b7 non rimborsabile',
    promoSummaryLabel: 'Prezzo offerta',
    promoSummaryValue: function(p) { return p + ' \u2014 tutto incluso'; },
    promoPolicyTitle: 'Offerta ottobre \u2014 condizioni',
    promoPolicyIntro: 'Per queste date valgono le condizioni qui sotto, al posto della politica standard di pagamento e cancellazione riportata pi\u00f9 in basso.',
    promoPolicyItems: function(p) { return [
      '<strong>Prezzo:</strong> ' + p + ' per 7 notti, pulizie finali e biancheria incluse',
      '<strong>Pagamento:</strong> saldo dell\u2019intero importo alla prenotazione, non l\u2019acconto del 30%',
      '<strong>Cancellazione:</strong> non rimborsabile \u2014 nessun rimborso in caso di disdetta o cambio date',
      '<strong>Tassa di soggiorno:</strong> 1,00 \u20ac a notte a persona, comunque da versare in loco'
    ]; },
    promoRequestNote: function(p) { return 'OFFERTA OTTOBRE \u2014 ' + p + ' per 7 notti, tutto incluso. Saldo immediato alla prenotazione, non rimborsabile.'; }
  }
};
var T = I18N[BOOKING_LANG];


// ── STATE ───────────────────────────────────────────────────

var state = {
  currentMonth: new Date(),
  checkInDate: null,
  checkOutDate: null,
  blockedDates: [],
  availableGaps: [],   // Array di { start: Date, end: Date, nights: number }
  calendarLoaded: false,
  hasAutoJumpedToAvailability: false,
  guestData: {
    name: '',
    email: '',
    phone: '',
    adults: 2,
    children: 0,
    pets: 'no',
    requests: ''
  }
};


// ── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  renderCalendar();
  setupEventListeners();
  loadBlockedDates();
});


// ═══════════════════════════════════════════════════════════
// AVAILABLE GAPS CALCULATION
// ═══════════════════════════════════════════════════════════

/**
 * Dopo aver caricato le date bloccate, calcola i periodi
 * consecutivi liberi di almeno minNights notti.
 * Guarda avanti 12 mesi da oggi.
 */
function calculateAvailableGaps() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 12);

  state.availableGaps = [];
  var gapStart = null;

  var current = new Date(today);
  while (current <= endDate) {
    var dateStr = current.toISOString().split('T')[0];
    var blocked = state.blockedDates.indexOf(dateStr) >= 0;

    if (!blocked) {
      if (!gapStart) {
        gapStart = new Date(current);
      }
    } else {
      if (gapStart) {
        var gapEnd = new Date(current);
        var nights = Math.round((gapEnd - gapStart) / (1000 * 60 * 60 * 24));
        if (nights >= BOOKING_CONFIG.minNights) {
          state.availableGaps.push({
            start: new Date(gapStart),
            end: new Date(gapEnd),
            nights: nights
          });
        }
        gapStart = null;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  // Chiudi l'ultimo gap se aperto
  if (gapStart) {
    var nights = Math.round((endDate - gapStart) / (1000 * 60 * 60 * 24));
    if (nights >= BOOKING_CONFIG.minNights) {
      state.availableGaps.push({
        start: new Date(gapStart),
        end: new Date(endDate),
        nights: nights
      });
    }
  }

  renderAvailableGapsList();
}

/**
 * Verifica se una data è dentro un gap disponibile (≥ minNights)
 */
function isInAvailableGap(date) {
  var d = new Date(date);
  d.setHours(0, 0, 0, 0);
  for (var i = 0; i < state.availableGaps.length; i++) {
    var gap = state.availableGaps[i];
    if (d >= gap.start && d < gap.end) {
      return true;
    }
  }
  return false;
}

/**
 * Renderizza la lista dei prossimi periodi disponibili
 * sotto il calendario
 */
function renderAvailableGapsList() {
  var container = document.getElementById('available-gaps');
  if (!container) return;

  if (state.availableGaps.length === 0) {
    container.innerHTML = '<p class="no-gaps">' + T.noGaps + '</p>';
    return;
  }

  // Le settimane in offerta vanno in cima, con il loro chip dedicato: sono da
  // 7 notti e quindi non coincidono mai con i blocchi da 5 generati sotto.
  var promoWeeks = promoBookableWeeks();

  // Spezza i gap in blocchi da suggestedNights (5). Con l'offerta attiva ne
  // mostriamo meno, altrimenti la lista diventa una colonna di sei bottoni.
  var suggestedNights = 5;
  var maxBlocks = promoWeeks.length ? 2 : 3;
  var blocks = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 0; i < state.availableGaps.length && blocks.length < maxBlocks; i++) {
    var gap = state.availableGaps[i];
    if (gap.end <= today) continue;

    // Punto di partenza: oggi se il gap è già iniziato, altrimenti inizio gap
    var blockStart = gap.start < today ? new Date(today) : new Date(gap.start);

    while (blocks.length < maxBlocks) {
      var blockEnd = new Date(blockStart);
      blockEnd.setDate(blockEnd.getDate() + suggestedNights);

      // Se il blocco sfora il gap, prendi quello che resta (solo se >= minNights)
      if (blockEnd > gap.end) {
        var remainingNights = Math.round((gap.end - blockStart) / (1000 * 60 * 60 * 24));
        if (remainingNights >= BOOKING_CONFIG.minNights) {
          blocks.push({ start: new Date(blockStart), end: new Date(gap.end), nights: remainingNights, gapIndex: i });
        }
        break;
      }

      blocks.push({ start: new Date(blockStart), end: new Date(blockEnd), nights: suggestedNights, gapIndex: i });
      blockStart = new Date(blockEnd);
    }
  }

  var html = '';
  for (var w = 0; w < promoWeeks.length; w++) {
    var ps = promoParseDate(promoWeeks[w].start);
    var pe = promoParseDate(promoWeeks[w].end);
    html += '<button type="button" class="gap-chip gap-chip--promo" data-start="' + ps.toISOString() + '" data-end="' + pe.toISOString() + '" aria-label="' + T.ariaGapSelect(formatDateDisplay(ps), formatDateDisplay(pe)) + '">'
      + '<span class="gap-chip__body">'
      + '<span class="gap-dates">' + formatDateShort(ps) + ' → ' + formatDateShort(pe) + '</span>'
      + '<span class="gap-nights">' + T.promoNights(promoPrice()) + '</span>'
      + '<span class="gap-promo-terms">' + T.promoTerms + '</span>'
      + '</span>'
      + '<span class="gap-promo-tag">' + T.promoTag + '</span>'
      + '</button>';
  }

  for (var b = 0; b < blocks.length; b++) {
    var block = blocks[b];
    html += '<button type="button" class="gap-chip" data-gap-index="' + block.gapIndex + '" data-start="' + block.start.toISOString() + '" data-end="' + block.end.toISOString() + '" aria-label="' + T.ariaGapSelect(formatDateDisplay(block.start), formatDateDisplay(block.end)) + '">'
      + '<span class="gap-dates">'
      + formatDateShort(block.start) + ' → ' + formatDateShort(block.end)
      + '</span>'
      + '<span class="gap-nights">' + T.nightsAvailable(block.nights) + '</span>'
      + '</button>';
  }

  container.innerHTML = html;

  // Click su un blocco: naviga al mese corrispondente
  container.querySelectorAll('.gap-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var startDate = new Date(this.dataset.start);
      var endDate = new Date(this.dataset.end);
      state.currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      state.checkInDate = startDate;
      state.checkOutDate = endDate;
      updateDateDisplay();
      renderCalendar();
    });
  });
}


// ═══════════════════════════════════════════════════════════
// CALENDAR RENDERING
// ═══════════════════════════════════════════════════════════

function renderCalendar() {
  var grid = document.getElementById('calendar-grid');
  var monthDisplay = document.getElementById('current-month');

  var year = state.currentMonth.getFullYear();
  var month = state.currentMonth.getMonth();

  monthDisplay.textContent = state.currentMonth.toLocaleDateString(BOOKING_LOCALE, {
    month: 'long',
    year: 'numeric'
  });

  grid.innerHTML = '';

  // Day headers
  var dayHeaders = T.dayHeaders;
  dayHeaders.forEach(function(day) {
    var header = document.createElement('div');
    header.className = 'calendar-day header';
    header.textContent = day;
    grid.appendChild(header);
  });

  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before month starts
  for (var i = 0; i < firstDay; i++) {
    var empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // Day cells
  for (var day = 1; day <= daysInMonth; day++) {
    var date = new Date(year, month, day);
    var dayCell = document.createElement('button');
    dayCell.className = 'calendar-day';
    dayCell.type = 'button';
    dayCell.textContent = day;
    dayCell.dataset.date = date.toISOString().split('T')[0];

    var isPast = date < today;
    var isBlocked = isDateBlocked(date);

    if (isPast || isBlocked) {
      dayCell.classList.add('blocked');
      dayCell.disabled = true;
      dayCell.setAttribute('aria-label', formatDateDisplay(date) + ' ' + T.ariaUnavailable);
    } else {
      dayCell.classList.add('available');
      dayCell.setAttribute('aria-label', formatDateDisplay(date) + ' ' + T.ariaAvailable);

      // Evidenzia se il giorno fa parte di un gap valido (≥ minNights)
      if (state.calendarLoaded && isInAvailableGap(date)) {
        dayCell.classList.add('in-gap');
      }

      dayCell.addEventListener('click', (function(d) {
        return function() { selectDate(d); };
      })(new Date(date)));
    }

    if (date.toDateString() === today.toDateString()) {
      dayCell.classList.add('today');
    }

    // Selected dates
    if (state.checkInDate && date.toDateString() === state.checkInDate.toDateString()) {
      dayCell.classList.add('selected', 'checkin-selected');
      dayCell.setAttribute('aria-pressed', 'true');
      dayCell.setAttribute('aria-label', formatDateDisplay(date) + ' ' + T.ariaCheckin);
    }
    if (state.checkOutDate && date.toDateString() === state.checkOutDate.toDateString()) {
      dayCell.classList.add('selected', 'checkout-selected');
      dayCell.setAttribute('aria-pressed', 'true');
      dayCell.setAttribute('aria-label', formatDateDisplay(date) + ' ' + T.ariaCheckout);
    }

    // Range between check-in and check-out
    if (state.checkInDate && state.checkOutDate) {
      if (date > state.checkInDate && date < state.checkOutDate) {
        dayCell.classList.add('in-range');
      }
    }

    grid.appendChild(dayCell);
  }

  // Se il calendario è caricato, aggiorna il loading state
  if (state.calendarLoaded) {
    var loader = document.getElementById('calendar-loader');
    if (loader) loader.style.display = 'none';
  }
}


// ═══════════════════════════════════════════════════════════
// DATE SELECTION
// ═══════════════════════════════════════════════════════════

function selectDate(date) {
  var errorEl = document.getElementById('date-error');
  if (errorEl) errorEl.style.display = 'none';

  if (!state.checkInDate || (state.checkInDate && state.checkOutDate)) {
    // Primo click o reset: setta check-in
    state.checkInDate = date;
    state.checkOutDate = null;
  } else if (state.checkInDate && !state.checkOutDate) {
    // Secondo click: setta check-out
    if (date < state.checkInDate) {
      state.checkOutDate = state.checkInDate;
      state.checkInDate = date;
    } else if (date.toDateString() === state.checkInDate.toDateString()) {
      // Click sulla stessa data: reset
      state.checkInDate = null;
      updateDateDisplay();
      renderCalendar();
      return;
    } else {
      state.checkOutDate = date;
    }

    // Validazione: minimo notti
    var nights = calculateNights(state.checkInDate, state.checkOutDate);
    if (nights < BOOKING_CONFIG.minNights) {
      showDateError(T.minStay(BOOKING_CONFIG.minNights, nights));
      state.checkOutDate = null;
    }

    // Validazione: nessuna data bloccata nel range
    if (state.checkOutDate && hasBlockedDatesInRange(state.checkInDate, state.checkOutDate)) {
      showDateError(T.rangeUnavailable);
      state.checkInDate = null;
      state.checkOutDate = null;
    }
  }

  updateDateDisplay();
  renderCalendar();
}

function showDateError(message) {
  var errorEl = document.getElementById('date-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    setTimeout(function() { errorEl.style.display = 'none'; }, 5000);
  }
}

function updateDateDisplay() {
  var checkInDisplay = document.getElementById('checkin-display');
  var checkOutDisplay = document.getElementById('checkout-display');
  var nightsDisplay = document.getElementById('nights-display');
  var nightsCount = document.getElementById('nights-count');
  var continueBtn = document.getElementById('continue-to-guests');

  checkInDisplay.textContent = state.checkInDate
    ? formatDateDisplay(state.checkInDate)
    : T.selectDate;

  if (state.checkOutDate) {
    checkOutDisplay.textContent = formatDateDisplay(state.checkOutDate);
    nightsCount.textContent = calculateNights(state.checkInDate, state.checkOutDate);
    nightsDisplay.style.display = 'block';
    continueBtn.disabled = false;
  } else {
    checkOutDisplay.textContent = state.checkInDate ? T.selectCheckout : T.selectDate;
    nightsDisplay.style.display = 'none';
    continueBtn.disabled = true;
  }

  // Hint sotto il calendario
  var hint = document.getElementById('selection-hint');
  if (hint) {
    if (!state.checkInDate) {
      hint.textContent = T.hintCheckin;
    } else if (!state.checkOutDate) {
      hint.textContent = T.hintCheckout;
    } else {
      hint.textContent = '';
    }
  }
}


// ═══════════════════════════════════════════════════════════
// BLOCKED DATES (Google Calendar API)
// ═══════════════════════════════════════════════════════════

function loadBlockedDates() {
  var timeMin = new Date().toISOString();
  var timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 12);

  var url = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(BOOKING_CONFIG.calendarId)
    + '/events?key=' + BOOKING_CONFIG.apiKey
    + '&timeMin=' + timeMin
    + '&timeMax=' + timeMax.toISOString()
    + '&singleEvents=true'
    + '&orderBy=startTime';

  // Mostra loader
  var loader = document.getElementById('calendar-loader');
  if (loader) loader.style.display = 'flex';

  fetch(url)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.error) {
        console.error('Calendar API Error:', data.error);
        showCalendarError(T.loadError);
        return;
      }

      if (data.items) {
        data.items.forEach(function(event) {
          var startDate, endDate;

          if (event.start.date) {
            startDate = new Date(event.start.date);
            endDate = new Date(event.end.date);
          } else if (event.start.dateTime) {
            startDate = new Date(event.start.dateTime);
            endDate = new Date(event.end.dateTime);
          }

          if (startDate && endDate) {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            // Block from check-in to day BEFORE checkout
            // Checkout day is available (checkout happens in the morning)
            var currentDate = new Date(startDate);
            while (currentDate < endDate) {
              var dateStr = currentDate.toISOString().split('T')[0];
              if (state.blockedDates.indexOf(dateStr) === -1) {
                state.blockedDates.push(dateStr);
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        });
      }

      state.calendarLoaded = true;
      calculateAvailableGaps();
      jumpToFirstAvailableMonth();
      renderCalendar();
    })
    .catch(function(error) {
      console.error('Error loading availability:', error);
      showCalendarError(T.connError);
    });
}

function showCalendarError(message) {
  var loader = document.getElementById('calendar-loader');
  if (loader) {
    loader.innerHTML = '<span class="loader-error">' + message + '</span>';
  }

  var gaps = document.getElementById('available-gaps');
  if (gaps) {
    gaps.innerHTML = '<p class="no-gaps">' + T.gapsLoadError + ' <a href="mailto:' + BOOKING_CONFIG.email + '">' + BOOKING_CONFIG.email + '</a>.</p>';
  }
}

function jumpToFirstAvailableMonth() {
  if (state.hasAutoJumpedToAvailability || !state.availableGaps.length) return;

  var firstGap = state.availableGaps[0];
  state.currentMonth = new Date(firstGap.start.getFullYear(), firstGap.start.getMonth(), 1);
  state.hasAutoJumpedToAvailability = true;
}


// ═══════════════════════════════════════════════════════════
// SEND BOOKING REQUEST
// ═══════════════════════════════════════════════════════════

function sendBookingRequest() {
  var nights = calculateNights(state.checkInDate, state.checkOutDate);
  var totalGuests = state.guestData.adults + state.guestData.children;

  var sendButton = document.getElementById('send-request');
  var originalText = sendButton.textContent;
  sendButton.textContent = T.sending;
  sendButton.disabled = true;

  // L'offerta viaggia dentro specialRequests, non in un campo suo: cosi'
  // finisce nella mail e nella colonna NOTE del foglio senza dover
  // ridistribuire l'Apps Script (BookingHandler.gs ignorerebbe un campo nuovo).
  var promoWeek = promoWeekFor(state.checkInDate, state.checkOutDate);
  var requests = state.guestData.requests || '';
  if (promoWeek) {
    requests = T.promoRequestNote(promoPrice()) + (requests ? '\n\n' + requests : '');
  }

  var bookingData = {
    guestName: state.guestData.name,
    guestEmail: state.guestData.email,
    guestPhone: state.guestData.phone,
    checkIn: formatDateForSheet(state.checkInDate),
    checkOut: formatDateForSheet(state.checkOutDate),
    nights: nights,
    adults: state.guestData.adults,
    children: state.guestData.children,
    totalGuests: totalGuests,
    pets: state.guestData.pets,
    promo: promoWeek ? 'october-2026' : '',
    promoPrice: promoWeek ? PROMO.price : '',
    specialRequests: requests
  };

  fetch(BOOKING_CONFIG.webAppUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(bookingData)
  })
  .then(function() {
    document.getElementById('confirmation-email').textContent = state.guestData.email;
    goToStep('confirmation');
  })
  .catch(function(error) {
    console.error('Error:', error);
    alert(T.sendError(BOOKING_CONFIG.email));
    sendButton.textContent = originalText;
    sendButton.disabled = false;
  });
}


// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function setupEventListeners() {
  // Calendar navigation
  document.getElementById('prev-month').addEventListener('click', function() {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', function() {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    renderCalendar();
  });

  // Step 1 → Step 2: Continue to guests
  document.getElementById('continue-to-guests').addEventListener('click', function() {
    goToStep('guests');
  });

  // Guest count validation
  var adultsSelect = document.getElementById('num-adults');
  var childrenSelect = document.getElementById('num-children');
  var warningDiv = document.getElementById('guest-limit-warning');

  function validateGuestCount() {
    var total = (parseInt(adultsSelect.value) || 0) + (parseInt(childrenSelect.value) || 0);
    warningDiv.style.display = total > BOOKING_CONFIG.maxGuests ? 'flex' : 'none';
    return total <= BOOKING_CONFIG.maxGuests;
  }

  adultsSelect.addEventListener('change', validateGuestCount);
  childrenSelect.addEventListener('change', validateGuestCount);

  // Step 2 → Step 3: Continue to policy
  document.getElementById('continue-to-policy').addEventListener('click', function() {
    var guestForm = document.getElementById('guest-form');
    if (!guestForm.checkValidity()) { guestForm.reportValidity(); return; }
    if (!validateGuestCount()) return;

    state.guestData = {
      name: document.getElementById('guest-name').value,
      email: document.getElementById('guest-email').value,
      phone: document.getElementById('guest-phone').value,
      adults: parseInt(document.getElementById('num-adults').value),
      children: parseInt(document.getElementById('num-children').value),
      pets: document.getElementById('pets').value,
      requests: document.getElementById('special-requests').value
    };

    updateSummary();
    goToStep('policy');
  });

  // Policy acceptance
  document.getElementById('accept-policy').addEventListener('change', function(e) {
    document.getElementById('send-request').disabled = !e.target.checked;
  });

  // Send request
  document.getElementById('send-request').addEventListener('click', sendBookingRequest);
}


// ═══════════════════════════════════════════════════════════
// STEP NAVIGATION & SUMMARY
// ═══════════════════════════════════════════════════════════

function goToStep(stepName) {
  document.querySelectorAll('.step').forEach(function(step) {
    step.classList.remove('active');
  });
  document.getElementById('step-' + stepName).classList.add('active');

  // Update progress indicator
  var steps = ['calendar', 'guests', 'policy', 'confirmation'];
  var currentIndex = steps.indexOf(stepName);
  document.querySelectorAll('.progress-step').forEach(function(el, idx) {
    el.classList.remove('active', 'completed');
    if (idx < currentIndex) el.classList.add('completed');
    if (idx === currentIndex) el.classList.add('active');
  });

  // Scroll to widget top
  var widget = document.querySelector('.booking-widget');
  if (widget) {
    widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateSummary() {
  document.getElementById('summary-checkin').textContent = formatDateDisplay(state.checkInDate);
  document.getElementById('summary-checkout').textContent = formatDateDisplay(state.checkOutDate);

  var nights = calculateNights(state.checkInDate, state.checkOutDate);
  document.getElementById('summary-nights').textContent = T.nights(nights);

  document.getElementById('summary-guests').textContent = T.guests(state.guestData.adults, state.guestData.children);
  document.getElementById('summary-name').textContent = state.guestData.name;
  document.getElementById('summary-email').textContent = state.guestData.email;
  document.getElementById('summary-pets').textContent =
    state.guestData.pets === 'yes' ? T.petsYes : T.petsNo;

  renderPromoTerms();
}


/**
 * Se le date scelte sono una settimana in offerta, il riepilogo mostra il
 * prezzo fisso e le condizioni dell'offerta.
 *
 * Le condizioni promo (saldo subito, niente rimborso) contraddicono quelle
 * standard stampate nella pagina (acconto 30%, rimborso fino a 21 giorni
 * prima): il blocco va quindi in cima a .policy-section e dice a chiare
 * lettere che sostituisce quelle sotto. Non le nascondiamo, cosi' l'ospite
 * vede entrambe e non puo' dire di non essere stato avvisato.
 */
function renderPromoTerms() {
  var week = promoWeekFor(state.checkInDate, state.checkOutDate);
  var price = promoPrice();

  // Il riquadro va rifatto a ogni passaggio: l'ospite puo' tornare indietro
  // e cambiare le date, e allora l'offerta non vale piu'.
  var oldRow = document.getElementById('promo-summary-row');
  if (oldRow) oldRow.remove();
  var oldBlock = document.getElementById('promo-policy-block');
  if (oldBlock) oldBlock.remove();

  var note = document.getElementById('summary-pricing-note');
  if (note) {
    if (!note.dataset.standardText) note.dataset.standardText = note.textContent;
    note.textContent = week ? T.promoSummaryValue(price) : note.dataset.standardText;
  }

  if (!week) return;

  var card = document.querySelector('.summary-card');
  if (card) {
    var row = document.createElement('div');
    row.id = 'promo-summary-row';
    row.className = 'summary-row summary-row--promo';
    row.innerHTML = '<span>' + T.promoSummaryLabel + '</span><strong>' + price + '</strong>';
    card.appendChild(row);
  }

  var policy = document.querySelector('.policy-section');
  if (policy) {
    var items = T.promoPolicyItems(price).map(function(li) { return '<li>' + li + '</li>'; }).join('');
    var block = document.createElement('div');
    block.id = 'promo-policy-block';
    block.className = 'promo-policy';
    block.innerHTML = '<h3>' + T.promoPolicyTitle + '</h3>'
      + '<p class="promo-policy__intro">' + T.promoPolicyIntro + '</p>'
      + '<ul>' + items + '</ul>';
    policy.insertBefore(block, policy.firstChild);
  }
}

function resetWidget() {
  state.checkInDate = null;
  state.checkOutDate = null;
  state.guestData = { name: '', email: '', phone: '', adults: 2, children: 0, pets: 'no', requests: '' };
  document.getElementById('guest-form').reset();
  document.getElementById('accept-policy').checked = false;
  document.getElementById('date-error').style.display = 'none';
  updateDateDisplay();
  goToStep('calendar');
  renderCalendar();
}


// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function formatDateDisplay(date) {
  return date.toLocaleDateString(BOOKING_LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(date) {
  return date.toLocaleDateString(BOOKING_LOCALE, { month: 'short', day: 'numeric' });
}

function formatDateForSheet(date) {
  var dd = String(date.getDate()).padStart(2, '0');
  var mm = String(date.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + date.getFullYear();
}

function calculateNights(checkIn, checkOut) {
  return Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));
}

function isDateBlocked(date) {
  return state.blockedDates.indexOf(date.toISOString().split('T')[0]) >= 0;
}

function hasBlockedDatesInRange(startDate, endDate) {
  var current = new Date(startDate);
  current.setDate(current.getDate() + 1);
  while (current < endDate) {
    if (isDateBlocked(current)) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}
