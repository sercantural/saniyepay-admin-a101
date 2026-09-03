import { defineStore } from 'pinia'
import { ref } from 'vue'

/*
 * Yakalanmamis istek hatalari.
 *
 * Bildirim deposundan (stores/notifications) ayri duruyor ve bilerek:
 * kullanici "ekranda bildirim karti gosterme" ayarini kapatabiliyor, ama
 * o ayar islem bildirimleri icin. Bir kaydetme isteginin neden basarisiz
 * oldugunu gizlemek hicbir ayarin isi degil -- kullanici dugmeye basip
 * hicbir sey olmadigini gorurse formu tekrar tekrar gonderiyor.
 *
 * Kuyruk cunku arka arkaya iki istek patlayabiliyor; ikincisi
 * birincisini yutmasin.
 */
export const useApiErrorStore = defineStore('apiErrors', () => {
  const current = ref(null)
  const queue = ref([])

  function push(message) {
    if (!message) return

    // Ayni mesaj ust uste gelirse tekrarlama: bir liste ekraninda ayni
    // uctan iki paralel istek patlayinca iki ayni kutu cikiyordu.
    if (current.value === message || queue.value.includes(message)) return

    if (current.value === null) {
      current.value = message
    } else {
      queue.value.push(message)
    }
  }

  function dismiss() {
    current.value = queue.value.shift() ?? null
  }

  function clear() {
    current.value = null
    queue.value = []
  }

  return { current, queue, push, dismiss, clear }
})
