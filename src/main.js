import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from '@/plugins/vuetify'
import router from '@/router'
import App from '@/App.vue'
import { useApiErrorStore } from '@/stores/apiErrors'
import { apiErrorMessage } from '@/plugins/apiError'

const app = createApp(App)

app.use(createPinia())
app.use(vuetify)
app.use(router)

app.mount('#app')

/*
 * Hicbir yerin yakalamadigi istek hatasi.
 *
 * Cogu ekran hatayi kendi gosteriyor; gostermeyenlerde kullanici
 * dugmeye basip HICBIR SEY olmadigini goruyordu -- ornegin kullanici
 * olustururken sunucu "bu e-posta zaten kayitli" diyordu ve ekranda tek
 * kelime cikmiyordu. Bu dinleyici o bosluğu kapatiyor.
 *
 * Bilerek yutulan hatalar (catch bloklari) buraya hic dusmuyor, cunku
 * onlarin bir sahibi var.
 */
window.addEventListener('unhandledrejection', (event) => {
  const hata = event.reason

  if (!hata?.isAxiosError) return

  // 401'i gostermiyoruz: oturum bitince yonlendirme zaten oluyor ve
  // ust uste "oturumunuz sona ermis" kutusu cikmasi kafa karistirici.
  if (hata.response?.status === 401) return

  useApiErrorStore().push(hata.uiMessage || apiErrorMessage(hata))

  // Konsolda "Uncaught (in promise)" gurultusu kalmasin; hatayi zaten
  // kullaniciya gosterdik.
  event.preventDefault()
})
