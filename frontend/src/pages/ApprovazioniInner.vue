<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useMessage } from 'naive-ui';
import api from '../api/client';
import Calendar from '../components/Calendar/Calendar.vue';

const msg = useMessage();

const STATI = ['in_validazione', 'approvato', 'non_approvato', 'in_attesa_conferma'];
const STATO_LABELS = {
  in_validazione: 'In Validazione', approvato: 'Approvato',
  non_approvato: 'Non Approvato', in_attesa_conferma: 'In Attesa di Conferma',
};
const STATO_COLORS = {
  in_validazione: '#f59e0b', approvato: '#22c55e',
  non_approvato: '#ef4444', in_attesa_conferma: '#f59e0b',
};
const STATO_TEXT = {
  in_validazione: '#78350f', approvato: '#14532d',
  non_approvato: '#ffffff', in_attesa_conferma: '#78350f',
};

const statoStyle = (s) => s ? {
  backgroundColor: STATO_COLORS[s],
  color: STATO_TEXT[s],
  borderColor: STATO_COLORS[s],
  fontWeight: 600,
} : {};

const users = ref([]);
const allBookings = ref([]);
const filters = ref({ nome: '', cognome: '', azienda: '', email: '', da: '', a: '', stato: '' });
const selectedUser = ref(null);
const userBookings = ref([]);
const selectedBookingIds = ref([]);
const bulkStato = ref('approvato');
const exportIds = ref([]);
const calendarRefreshTrigger = ref(0);

const fetchUsers = async () => { users.value = (await api.get('/api/users/')).data; };
const fetchAllBookings = async (da, a) => {
  const params = {};
  if (da) params.da = da;
  if (a) params.a = a;
  allBookings.value = (await api.get('/api/bookings/all', { params })).data;
};
const fetchUserBookings = async (userId) => {
  userBookings.value = (await api.get('/api/bookings/all', { params: { user_id: userId } })).data;
  selectedBookingIds.value = [];
};

onMounted(fetchUsers);
watch(() => [filters.value.da, filters.value.a],
      () => fetchAllBookings(filters.value.da, filters.value.a),
      { immediate: true });
watch(selectedUser, (u) => { if (u) fetchUserBookings(u.id); });

const refreshAfterStateChange = () => {
  if (selectedUser.value) fetchUserBookings(selectedUser.value.id);
  fetchAllBookings(filters.value.da, filters.value.a);
  calendarRefreshTrigger.value += 1;
};

const getStatiForUser = (userId) => {
  const s = new Set(allBookings.value.filter(b => b.user_id === userId).map(b => b.stato));
  return [...s];
};

const handleBulkStato = async () => {
  if (!selectedBookingIds.value.length) return;
  await api.patch('/api/bookings/bulk/stato', { booking_ids: selectedBookingIds.value, stato: bulkStato.value });
  msg.success('Stato aggiornato');
  refreshAfterStateChange();
};

const handleSingleStato = async (bookingId, stato) => {
  await api.patch(`/api/bookings/${bookingId}/stato`, { stato });
  refreshAfterStateChange();
};

const handleExportCSV = async (ids) => {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('user_ids', id));
  const r = await api.get(`/api/bookings/export/csv?${params.toString()}`, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};

const toggleBooking = (id) => {
  const idx = selectedBookingIds.value.indexOf(id);
  if (idx >= 0) selectedBookingIds.value.splice(idx, 1);
  else selectedBookingIds.value.push(id);
};

const toggleExport = (uid, checked) => {
  if (checked) exportIds.value.push(uid);
  else exportIds.value = exportIds.value.filter(x => x !== uid);
};

const usersWithBookings = computed(() => (filters.value.da || filters.value.a)
  ? new Set(allBookings.value.map(b => b.user_id))
  : null
);

const filteredUsers = computed(() => users.value.filter(u => {
  const f = filters.value;
  if (usersWithBookings.value && !usersWithBookings.value.has(u.id)) return false;
  if (f.nome && !u.nome.toLowerCase().includes(f.nome.toLowerCase())) return false;
  if (f.cognome && !u.cognome.toLowerCase().includes(f.cognome.toLowerCase())) return false;
  if (f.azienda && !(u.azienda || '').toLowerCase().includes(f.azienda.toLowerCase())) return false;
  if (f.email && !u.email.toLowerCase().includes(f.email.toLowerCase())) return false;
  if (f.stato && !allBookings.value.some(b => b.user_id === u.id && b.stato === f.stato)) return false;
  return true;
}));
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Approvazioni</h1>
      <button class="btn-secondary"
              @click="handleExportCSV(exportIds.length ? exportIds : filteredUsers.map(u => u.id))">
        Export CSV {{ exportIds.length ? '(' + exportIds.length + ')' : 'tutti' }}
      </button>
    </div>

    <div class="filters">
      <input v-for="f in ['nome', 'cognome', 'azienda', 'email']" :key="f"
             :placeholder="f.charAt(0).toUpperCase() + f.slice(1)" v-model="filters[f]" />
      <input type="date" v-model="filters.da" title="Da" />
      <input type="date" v-model="filters.a" title="A" />
      <select v-model="filters.stato" :style="statoStyle(filters.stato)">
        <option value="">Tutti gli stati</option>
        <option v-for="s in STATI" :key="s" :value="s"
                :style="{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }">
          {{ STATO_LABELS[s] }}
        </option>
      </select>
    </div>

    <div class="approvazioni-layout">
      <div class="users-list">
        <div v-for="u in filteredUsers" :key="u.id"
             :class="['user-row', { selected: selectedUser?.id === u.id }]"
             @click="selectedUser = u">
          <input type="checkbox" :checked="exportIds.includes(u.id)"
                 @click.stop @change="toggleExport(u.id, $event.target.checked)" />
          <div class="user-info">
            <strong>{{ u.nome }} {{ u.cognome }}</strong>
            <small>{{ u.email }}<template v-if="u.azienda"> — {{ u.azienda }}</template></small>
          </div>
          <div class="user-stati">
            <span v-for="s in getStatiForUser(u.id)" :key="s" class="stato-dot"
                  :style="{ backgroundColor: STATO_COLORS[s] }"
                  :title="STATO_LABELS[s]" />
          </div>
        </div>
        <p v-if="filteredUsers.length === 0" class="empty-state">Nessun utente trovato.</p>
      </div>

      <div v-if="selectedUser" class="user-detail">
        <div class="detail-header">
          <h2>{{ selectedUser.nome }} {{ selectedUser.cognome }}</h2>
          <button class="btn-sm" @click="handleExportCSV([selectedUser.id])">Export CSV</button>
        </div>

        <div class="calendar-section">
          <p class="section-title">Calendario</p>
          <Calendar :user-id="selectedUser.id" :read-only="true"
                    :refresh-trigger="calendarRefreshTrigger"
                    :on-state-change="handleSingleStato" />
        </div>

        <p class="section-title">Gestione Prenotazioni</p>

        <div class="bulk-bar">
          <select v-model="bulkStato" :style="statoStyle(bulkStato)">
            <option v-for="s in STATI" :key="s" :value="s"
                    :style="{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }">
              {{ STATO_LABELS[s] }}
            </option>
          </select>
          <button class="btn-primary" @click="handleBulkStato" :disabled="!selectedBookingIds.length">
            Applica a {{ selectedBookingIds.length }} selezionati
          </button>
        </div>

        <div class="bookings-list">
          <p v-if="userBookings.length === 0" class="empty-state">Nessuna prenotazione.</p>
          <div v-for="b in userBookings" :key="b.id" class="booking-item">
            <input type="checkbox" :checked="selectedBookingIds.includes(b.id)"
                   @change="toggleBooking(b.id)" />
            <span class="stato-dot" :style="{ backgroundColor: STATO_COLORS[b.stato] }" />
            <span class="booking-tipo">{{ b.tipo }}</span>
            <span class="booking-date">
              {{ b.data_inizio }}<template v-if="b.data_inizio !== b.data_fine"> → {{ b.data_fine }}</template>
            </span>
            <span class="booking-ore">
              {{ b.tutto_il_giorno ? 'Tutto il giorno' : b.ore ? b.ore + 'h' : '—' }}
            </span>
            <span class="booking-note" :title="b.note">{{ b.note }}</span>
            <select class="stato-select" :value="b.stato"
                    @change="handleSingleStato(b.id, $event.target.value)"
                    :style="statoStyle(b.stato)">
              <option v-for="s in STATI" :key="s" :value="s"
                      :style="{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }">
                {{ STATO_LABELS[s] }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div v-else class="detail-empty">Seleziona un utente per vedere le prenotazioni.</div>
    </div>
  </div>
</template>
