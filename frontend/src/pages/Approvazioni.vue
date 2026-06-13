<script setup>
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import ApprovazioniInner from './ApprovazioniInner.vue';
</script>

<template>
  <NConfigProvider :locale="itIT" :date-locale="dateItIT">
    <NDialogProvider>
      <NMessageProvider>
        <ApprovazioniInner />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
