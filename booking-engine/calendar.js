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
  webAppUrl: 'https://script.google.com/macros/s/AKfycbyR_KhUaMlt0TrvT3mqjn28L_cI9LfcKVQ6pwLTSXioBZn4NCXk6mk1Wv_Xh7gi69ugyg/exec',
  minNights: 3,
  maxNightsToShow: 29,  // Gap > 29 notti non vengono mostrati nella lista
  maxGuests: 4,
  email: 'villavolpeorta@gmail.com'
};


// ── STATE ───────────────────────────────────────────────────

var state = {
  currentMonth: new Date(),
  checkInDate: null,
  checkOutDate: null,
  blockedDates: [],
  availableGaps: [],   // Array di { start: Date, end: Date, nights: number }
  calendarLoaded: false,
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
    container.innerHTML = '<p class="no-gaps">No available periods found. Please contact us directly.</p>';
    return;
  }

  // Mostra max 5 prossimi gap
  var html = '';
  var shown = 0;
  for (var i = 0; i < state.availableGaps.length && shown < 5; i++) {
    var gap = state.availableGaps[i];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (gap.end <= today) continue;

    // Non mostrare periodi troppo lunghi (> maxNightsToShow)
    if (gap.nights > BOOKING_CONFIG.maxNightsToShow) continue;

    html += '<div class="gap-chip" data-gap-index="' + i + '">'
      + '<span class="gap-dates">'
      + formatDateShort(gap.start) + ' → ' + formatDateShort(gap.end)
      + '</span>'
      + '<span class="gap-nights">' + gap.nights + ' nights available</span>'
      + '</div>';
    shown++;
  }

  container.innerHTML = html;

  // Click su un gap: naviga al mese corrispondente
  container.querySelectorAll('.gap-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var idx = parseInt(this.dataset.gapIndex);
      var gap = state.availableGaps[idx];
      state.currentMonth = new Date(gap.start.getFullYear(), gap.start.getMonth(), 1);
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

  monthDisplay.textContent = state.currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  grid.innerHTML = '';

  // Day headers
  var dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    var dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    dayCell.dataset.date = date.toISOString().split('T')[0];

    var isPast = date < today;
    var isBlocked = isDateBlocked(date);

    if (isPast || isBlocked) {
      dayCell.classList.add('blocked');
    } else {
      dayCell.classList.add('available');

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
    }
    if (state.checkOutDate && date.toDateString() === state.checkOutDate.toDateString()) {
      dayCell.classList.add('selected', 'checkout-selected');
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
      showDateError('Minimum stay: ' + BOOKING_CONFIG.minNights + ' nights. You selected ' + nights + '.');
      state.checkOutDate = null;
    }

    // Validazione: nessuna data bloccata nel range
    if (state.checkOutDate && hasBlockedDatesInRange(state.checkInDate, state.checkOutDate)) {
      showDateError('Your selection includes unavailable dates. Please choose dates within the same available period.');
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
    : 'Select date';

  if (state.checkOutDate) {
    checkOutDisplay.textContent = formatDateDisplay(state.checkOutDate);
    nightsCount.textContent = calculateNights(state.checkInDate, state.checkOutDate);
    nightsDisplay.style.display = 'block';
    continueBtn.disabled = false;
  } else {
    checkOutDisplay.textContent = state.checkInDate ? 'Select checkout' : 'Select date';
    nightsDisplay.style.display = 'none';
    continueBtn.disabled = true;
  }

  // Hint sotto il calendario
  var hint = document.getElementById('selection-hint');
  if (hint) {
    if (!state.checkInDate) {
      hint.textContent = 'Select your check-in date';
    } else if (!state.checkOutDate) {
      hint.textContent = 'Now select your check-out date';
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
        showCalendarError('Unable to load availability. Please try again later.');
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
      renderCalendar();
    })
    .catch(function(error) {
      console.error('Error loading availability:', error);
      showCalendarError('Connection error. Please refresh the page.');
    });
}

function showCalendarError(message) {
  var loader = document.getElementById('calendar-loader');
  if (loader) {
    loader.innerHTML = '<span class="loader-error">' + message + '</span>';
  }
}


// ═══════════════════════════════════════════════════════════
// SEND BOOKING REQUEST
// ═══════════════════════════════════════════════════════════

function sendBookingRequest() {
  var nights = calculateNights(state.checkInDate, state.checkOutDate);
  var totalGuests = state.guestData.adults + state.guestData.children;

  var sendButton = document.getElementById('send-request');
  var originalText = sendButton.textContent;
  sendButton.textContent = 'Sending...';
  sendButton.disabled = true;

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
    specialRequests: state.guestData.requests || ''
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
    alert('Error sending request. Please contact us at ' + BOOKING_CONFIG.email);
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
  document.getElementById('summary-nights').textContent = nights + ' night' + (nights > 1 ? 's' : '');

  var guestText = state.guestData.adults + ' adult' + (state.guestData.adults > 1 ? 's' : '');
  if (state.guestData.children > 0) {
    guestText += ', ' + state.guestData.children + ' child' + (state.guestData.children > 1 ? 'ren' : '');
  }
  document.getElementById('summary-guests').textContent = guestText;
  document.getElementById('summary-name').textContent = state.guestData.name;
  document.getElementById('summary-email').textContent = state.guestData.email;
  document.getElementById('summary-pets').textContent =
    state.guestData.pets === 'yes' ? 'Yes (€120 cleaning fee applies)' : 'No';
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
