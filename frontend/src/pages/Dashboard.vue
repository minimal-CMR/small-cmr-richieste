<script setup>
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import Calendar from '../components/Calendar/Calendar.vue';
</script>

<template>
  <NConfigProvider :locale="itIT" :date-locale="dateItIT">
    <NDialogProvider>
      <NMessageProvider>
        <div class="page">
          <h1>Le mie Prenotazioni</h1>
          <Calendar />
        </div>
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
