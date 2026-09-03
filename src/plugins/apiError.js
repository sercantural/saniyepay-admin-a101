/*
 * Sunucu hatasini okunabilir tek bir cumleye cevirir.
 *
 * Laravel dogrulama hatasini iki yerde birden donduruyor: ust seviye
 * "message" ilk hatayi tasiyor, "errors" ise alan alan hepsini. Yalnizca
 * "message" gostermek cok alanli bir formda yaniltici: kullanici e-posta
 * hatasini duzeltip tekrar gonderiyor, bu sefer sifre hatasini goruyor.
 * Bu yuzden butun alanlari topluyoruz.
 */
export function apiErrorMessage(error, fallback = 'İşlem başarısız.') {
  if (!error) return fallback

  // Istek hic gitmediyse (ag yok, sunucu kapali, CORS) response olmuyor.
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'Sunucu zamanında yanıt vermedi. Tekrar deneyin.'

    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'
  }

  const { status, data } = error.response

  const alanHatalari = data?.errors && typeof data.errors === 'object'
    ? Object.values(data.errors).flat().filter(Boolean)
    : []

  if (alanHatalari.length) {
    return alanHatalari.join(' ')
  }

  if (data?.message) return data.message

  // Govdesiz yanitlar: durum koduna gore anlasilir bir karsilik.
  const koda_gore = {
    401: 'Oturumunuz sona ermiş. Tekrar giriş yapın.',
    403: 'Bu işlem için yetkiniz yok.',
    404: 'Kayıt bulunamadı.',
    409: 'Bu kayıt bu sırada başkası tarafından değiştirildi.',
    413: 'Gönderilen dosya çok büyük.',
    419: 'Oturumunuz sona ermiş. Sayfayı yenileyin.',
    422: 'Gönderilen bilgiler geçersiz.',
    429: 'Çok fazla istek gönderildi. Biraz bekleyin.',
    500: 'Sunucuda beklenmeyen bir hata oluştu.',
    503: 'Sistem şu anda bakımda.',
  }

  return koda_gore[status] || fallback
}
