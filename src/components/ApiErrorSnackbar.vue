<script setup>
import { computed } from 'vue'
import { useApiErrorStore } from '@/stores/apiErrors'

/*
 * Yakalanmamis istek hatalarinin son duragi.
 *
 * Bir ekran hatayi kendi gosteriyorsa buraya hic dusmuyor; burasi
 * yalnizca hicbir yerin yakalamadigi durumlar icin. Onceden o durumda
 * ekranda HICBIR SEY olmuyordu: kullanici Kaydet'e basiyor, dialog acik
 * kaliyor, sunucu 422 donuyor ve kimse soylemiyordu.
 */
const store = useApiErrorStore()

const acik = computed({
  get: () => store.current !== null,
  set: (v) => { if (!v) store.dismiss() },
})
</script>

<template>
  <v-snackbar
    v-model="acik"
    :timeout="7000"
    color="error"
    location="top"
    multi-line
    class="api-error-snackbar"
  >
    <div class="d-flex align-start ga-2">
      <v-icon size="20" class="mt-1">mdi-alert-circle-outline</v-icon>
      <span>{{ store.current }}</span>
    </div>

    <template #actions>
      <v-btn variant="text" @click="store.dismiss()">Kapat</v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
/* Signal dili: sifir radius, mono olmayan ama net bir govde. */
.api-error-snackbar :deep(.v-snackbar__wrapper) {
  border-radius: 0;
}
</style>
