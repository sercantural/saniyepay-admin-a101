<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="8" class="pa-4">
          <v-card-title class="text-center text-h5 font-weight-bold">
            <v-icon size="large" color="primary" class="mr-2">mdi-shield-lock</v-icon>
            İki Faktörlü Doğrulama
          </v-card-title>
          <v-card-subtitle class="text-center">
            {{ useRecovery ? 'Kurtarma kodunuzu girin' : 'Doğrulama uygulamanızdaki 6 haneli kodu girin' }}
          </v-card-subtitle>

          <v-card-text class="mt-4">
            <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable>
              {{ error }}
            </v-alert>

            <v-form @submit.prevent="handleVerify">
              <!-- TOTP Code -->
              <v-text-field
                v-if="!useRecovery"
                v-model="code"
                label="Doğrulama Kodu"
                prepend-inner-icon="mdi-numeric"
                variant="outlined"
                maxlength="6"
                autofocus
                :rules="[v => !!v || 'Kod gereklidir', v => v?.length === 6 || '6 haneli kod girin']"
                class="mb-4"
              />

              <!-- Recovery Code -->
              <v-text-field
                v-else
                v-model="recoveryCode"
                label="Kurtarma Kodu"
                prepend-inner-icon="mdi-key"
                variant="outlined"
                autofocus
                :rules="[v => !!v || 'Kurtarma kodu gereklidir']"
                class="mb-4"
              />

              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
              >
                Doğrula
              </v-btn>

              <v-btn
                variant="text"
                block
                class="mt-2"
                @click="useRecovery = !useRecovery; error = ''"
              >
                {{ useRecovery ? 'Doğrulama kodu kullan' : 'Kurtarma kodu kullan' }}
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const code = ref('')
const recoveryCode = ref('')
const useRecovery = ref(false)
const loading = ref(false)
const error = ref('')

async function handleVerify() {
  loading.value = true
  error.value = ''
  try {
    if (useRecovery.value) {
      await auth.verifyTwoFactor(recoveryCode.value, true)
    } else {
      await auth.verifyTwoFactor(code.value, false)
    }
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.message || 'Doğrulama başarısız oldu'
  } finally {
    loading.value = false
  }
}
</script>
