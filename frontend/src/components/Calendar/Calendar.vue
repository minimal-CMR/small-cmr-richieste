<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';
import api from '../../api/client';
import { isFestivo, WEEKDAYS, STATO_COLORS, STATO_LABELS } from './calendarUtils';
import BookingModal from './BookingModal.vue';
import MonthPicker from './MonthPicker.vue';

const props = defineProps({
  userId: { type: Number, default: null },
  readOnly: { type: Boolean, default: false },
  refreshTrigger: { type: Number, default: 0 },
  onStateChange: { type: Function, default: null },
});
const emit = defineEmits(['bookings-change']);

const currentDate = ref(new Date());
const bookings = ref([]);
const rangeStart = ref(null);
const selectedRange = ref(null);
const showModal = ref(false);
const showMonthPicker = ref(false);
const detailBooking = ref(null);

const fetchBookings = async () => {
  try {
    const r = props.userId
      ? await api.get('/api/bookings/all', { params: { user_id: props.userId } })
      : await api.get('/api/bookings/my');
    bookings.value = r.data;
  } catch (e) {
    console.error(e);
  }
};

onMounted(fetchBookings);
watch(() => [props.userId, props.refreshTrigger], fetchBookings);

const monthStati = computed(() => {
  const map = {};
  bookings.value.forEach(b => {
    try {
      const start = parseISO(b.data_inizio);
      const end = parseISO(b.data_fine);
      let cur = startOfMonth(start);
      while (cur <= end) {
        const key = format(cur, 'yyyy-MM');
        if (!map[key]) map[key] = new Set();
        map[key].add(b.stato);
        cur = addMonths(cur, 1);
      }
    } catch {}
  });
  const result = {};
  Object.entries(map).forEach(([k, v]) => { result[k] = [...v]; });
  return result;
});

const cells = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentDate.value), { weekStartsOn: 1 });
  const arr = []; let day = start;
  while (day <= end) { arr.push(day); day = addDays(day, 1); }
  return arr;
});

const getBookingsForDay = (day) => bookings.value.filter(b => {
  try {
    return isWithinInterval(day, { start: parseISO(b.data_inizio), end: parseISO(b.data_fine) });
  } catch { return false; }
});

const handleDayClick = (day) => {
  if (props.readOnly) return;
  detailBooking.value = null;
  if (!rangeStart.value) {
    rangeStart.value = day;
  } else {
    const [start, end] = rangeStart.value <= day ? [rangeStart.value, day] : [day, rangeStart.value];
    selectedRange.value = { start, end };
    rangeStart.value = null;
    showModal.value = true;
  }
};

const handleDayDoubleClick = (day) => {
  if (props.readOnly) return;
  rangeStart.value = null;
  detailBooking.value = null;
  selectedRange.value = { start: day, end: day };
  showModal.value = true;
};

const handleDotClick = (e, booking) => {
  e.stopPropagation();
  rangeStart.value = null;
  detailBooking.value = detailBooking.value?.id === booking.id ? null : booking;
};

const handleDeleteBooking = async () => {
  if (!detailBooking.value) return;
  try {
    await api.delete(`/api/bookings/${detailBooking.value.id}`);
    detailBooking.value = null;
    fetchBookings();
    emit('bookings-change');
  } catch (e) { console.error(e); }
};

const handleSaved = () => {
  showModal.value = false;
  selectedRange.value = null;
  fetchBookings();
  emit('bookings-change');
};

const changeStateInDetail = async (newStato) => {
  if (!props.onStateChange || !detailBooking.value) return;
  try {
    await props.onStateChange(detailBooking.value.id, newStato);
    detailBooking.value = { ...detailBooking.value, stato: newStato };
  } catch {}
};

const fmt = format;
const itLocale = it;
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="currentDate = subMonths(currentDate, 1)">&#8249;</button>
      <span class="calendar-title" @click="showMonthPicker = true">
        {{ fmt(currentDate, 'MMMM yyyy', { locale: itLocale }) }}
      </span>
      <button @click="currentDate = addMonths(currentDate, 1)">&#8250;</button>
    </div>

    <MonthPicker v-if="showMonthPicker" :current="currentDate" :month-stati="monthStati"
                 @select="(d) => { currentDate = d; showMonthPicker = false; }"
                 @close="showMonthPicker = false" />

    <div class="calendar-grid">
      <div v-for="d in WEEKDAYS" :key="d" class="calendar-weekday">{{ d }}</div>
      <div v-for="(day, i) in cells" :key="i"
           :class="['calendar-day', {
             faded: !isSameMonth(day, currentDate),
             'range-start': rangeStart && isSameDay(day, rangeStart),
           }]"
           @click="handleDayClick(day)" @dblclick="handleDayDoubleClick(day)">
        <span :class="['day-number', { festivo: isFestivo(day) }]">{{ fmt(day, 'd') }}</span>
        <div class="day-dots">
          <span v-for="b in getBookingsForDay(day)" :key="b.id"
                class="booking-dot"
                :style="{ backgroundColor: STATO_COLORS[b.stato] }"
                :title="`${b.tipo} — ${STATO_LABELS[b.stato]}`"
                @click="(e) => handleDotClick(e, b)" />
        </div>
      </div>
    </div>

    <p v-if="rangeStart" class="range-hint">
      Clicca su un secondo giorno per selezionare il range, oppure doppio-click per un giorno singolo.
    </p>

    <BookingModal v-if="showModal && selectedRange"
                  :range="selectedRange"
                  @close="showModal = false; selectedRange = null"
                  @saved="handleSaved" />

    <div v-if="detailBooking" class="modal-overlay" @click="detailBooking = null">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Dettaglio Prenotazione</h2>
          <button class="btn-close" @click="detailBooking = null">×</button>
        </div>
        <div class="detail-grid">
          <span class="detail-label">Tipo</span>
          <span class="detail-value capitalize">{{ detailBooking.tipo }}</span>

          <span class="detail-label">Date</span>
          <span class="detail-value">
            {{ detailBooking.data_inizio }}
            <template v-if="detailBooking.data_inizio !== detailBooking.data_fine"> → {{ detailBooking.data_fine }}</template>
          </span>

          <span class="detail-label">Durata</span>
          <span class="detail-value">
            {{ detailBooking.tutto_il_giorno ? 'Tutto il giorno' : detailBooking.ore ? `${detailBooking.ore} ore` : '—' }}
          </span>

          <span class="detail-label">Stato</span>
          <span :class="`stato-badge ${detailBooking.stato}`">
            {{ STATO_LABELS[detailBooking.stato] }}
          </span>

          <span class="detail-label">Nota</span>
          <span class="detail-value">{{ detailBooking.note }}</span>

          <template v-if="onStateChange">
            <span class="detail-label">Cambia Stato</span>
            <select class="stato-select" :value="detailBooking.stato"
                    @change="changeStateInDetail($event.target.value)">
              <option v-for="(label, k) in STATO_LABELS" :key="k" :value="k">{{ label }}</option>
            </select>
          </template>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="detailBooking = null">Chiudi</button>
          <button v-if="!readOnly" class="btn-danger" @click="handleDeleteBooking">Elimina</button>
        </div>
      </div>
    </div>
  </div>
</template>
