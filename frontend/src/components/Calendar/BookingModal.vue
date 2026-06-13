<script setup>
import { ref, computed } from 'vue';
import { format, isSameDay } from 'date-fns';
import api from '../../api/client';

const props = defineProps({
  range: { type: Object, required: true },  // { start, end }
});
const emit = defineEmits(['close', 'saved']);

const tipo = ref('ferie');
const tuttoIlGiorno = ref(true);
const ore = ref('');
const note = ref('');
const error = ref('');
const saving = ref(false);

const singleDay = computed(() => isSameDay(props.range.start, props.range.end));

const handleSave = async () => {
  if (!note.value.trim()) { error.value = 'La nota è obbligatoria.'; return; }
  if (tipo.value === 'permesso' && !ore.value) { error.value = 'Specificare il numero di ore.'; return; }
  if (tipo.value === 'ferie' && !tuttoIlGiorno.value && !ore.value) {
    error.value = 'Specificare le ore oppure selezionare "tutto il giorno".';
    return;
  }

  saving.value = true; error.value = '';
  try {
    await api.post('/api/bookings/', {
      tipo: tipo.value,
      data_inizio: format(props.range.start, 'yyyy-MM-dd'),
      data_fine: format(props.range.end, 'yyyy-MM-dd'),
      ore: tipo.value === 'permesso' || (tipo.value === 'ferie' && !tuttoIlGiorno.value) ? parseFloat(ore.value) : null,
      tutto_il_giorno: tipo.value === 'ferie' ? tuttoIlGiorno.value : false,
      note: note.value.trim(),
    });
    emit('saved');
  } catch (e) {
    error.value = e.response?.data?.detail || 'Errore nel salvataggio.';
    saving.value = false;
  }
};
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal" @click.stop>
      <h2>Nuova Prenotazione</h2>
      <p class="modal-dates">
        {{ format(range.start, 'dd/MM/yyyy') }}
        <template v-if="!singleDay"> → {{ format(range.end, 'dd/MM/yyyy') }}</template>
      </p>

      <div class="form-group">
        <label>Tipo</label>
        <div class="radio-group">
          <label>
            <input type="radio" value="ferie" :checked="tipo === 'ferie'" @change="tipo = 'ferie'" />
            Ferie
          </label>
          <label>
            <input type="radio" value="permesso" :checked="tipo === 'permesso'" @change="tipo = 'permesso'" />
            Permesso
          </label>
        </div>
      </div>

      <div v-if="tipo === 'ferie'" class="form-group">
        <label>
          <input type="checkbox" v-model="tuttoIlGiorno" /> Tutto il giorno
        </label>
        <input v-if="!tuttoIlGiorno" type="number" placeholder="Ore totali"
               min="0.5" max="24" step="0.5" v-model="ore" />
      </div>

      <div v-if="tipo === 'permesso'" class="form-group">
        <label>Numero di ore</label>
        <input type="number" placeholder="Es. 2" min="0.5" max="8" step="0.5" v-model="ore" />
      </div>

      <div class="form-group">
        <label>Nota *</label>
        <textarea rows="3" v-model="note" placeholder="Descrizione obbligatoria..." />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Annulla</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? 'Salvataggio...' : 'Salva' }}
        </button>
      </div>
    </div>
  </div>
</template>
