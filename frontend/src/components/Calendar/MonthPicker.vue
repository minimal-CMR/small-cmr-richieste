<script setup>
import { ref } from 'vue';
import { getYear, getMonth } from 'date-fns';

const props = defineProps({
  current: { type: Date, required: true },
  monthStati: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['select', 'close']);

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const STATO_COLORS = {
  in_validazione: '#f59e0b', approvato: '#22c55e',
  non_approvato: '#ef4444', in_attesa_conferma: '#f59e0b',
};

const year = ref(getYear(props.current));
const handleSelect = (i) => emit('select', new Date(year.value, i, 1));
</script>

<template>
  <div class="month-picker-overlay" @click="emit('close')">
    <div class="month-picker" @click.stop>
      <div class="month-picker-header">
        <button @click="year -= 1">&#8249;</button>
        <span>{{ year }}</span>
        <button @click="year += 1">&#8250;</button>
      </div>
      <div class="month-picker-grid">
        <button v-for="(m, i) in MONTHS" :key="i"
                :class="{ active: i === getMonth(current) && year === getYear(current) }"
                @click="handleSelect(i)">
          <span>{{ m }}</span>
          <div class="month-stati">
            <span v-for="s in (monthStati[`${year}-${String(i + 1).padStart(2, '0')}`] || [])"
                  :key="s" class="month-stato-line"
                  :style="{ backgroundColor: STATO_COLORS[s] }" />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
