import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// "Signal" — tanitim sitesi, giris ekrani ve bayi paneliyle ayni dil.
// Neredeyse siyah zemin, tek mint sinyal rengi. Anlamsal renkler
// (uyari / hata) sinyal renginden ayri tutuluyor ki durum okunabilsin.
const darkComfort = {
  dark: true,
  colors: {
    background: '#070B09',
    surface: '#0D1310',
    'surface-bright': '#101815',
    'surface-variant': '#16211C',
    'on-background': '#EDF7F1',
    'on-surface': '#EDF7F1',
    primary: '#66F1BD',
    'primary-darken-1': '#4BD3A0',
    secondary: '#70A9FF',
    success: '#66F1BD',
    warning: '#FFBE5B',
    error: '#FF8E82',
    info: '#70A9FF',
  },
}

/*
 * "Signal" acik varyant.
 *
 * Ayni dil, ters zemin: neredeyse beyaz, mint tek sinyal rengi olarak
 * kaliyor ama beyaz ustunde okunabilmesi icin koyulastirildi (#66F1BD
 * beyazda 1.4:1 kontrast veriyor, #0E8F63 ise 4.6:1). Anlamsal renkler de
 * ayni sebeple bir ton koyu. Onceki lightComfort indigo tabanliydi ve
 * Signal'e gecince silinmisti; bu onun yerine gecen, ayni aileden bir
 * varyant.
 */
const lightComfort = {
  dark: false,
  /*
   * Vurgu opakliklari. Vuetify'in acik varsayilani orta vurgu icin 0.6:
   * tablolardaki alt yazilar (.text-medium-emphasis, .text-caption
   * ile birlikte) beyaz zeminde acik gri kaliyor. Sistem admini bunu
   * "yazilar belli olmuyor" diye bildirdi. Koyu temada ayni siniflar
   * okunuyor cunku zemin koyu; acikta ayni oran yetmiyor.
   */
  variables: {
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.8,
    'disabled-opacity': 0.5,
  },
  colors: {
    background: '#F4F8F6',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-variant': '#E9F0EC',
    'on-background': '#0B1410',
    'on-surface': '#0B1410',
    primary: '#0E8F63',
    'primary-darken-1': '#0B7350',
    secondary: '#2F6FD6',
    success: '#0E8F63',
    warning: '#B86E00',
    error: '#C8483A',
    info: '#2F6FD6',
  },
}

export default createVuetify({
  components,
  directives,
  locale: {
    locale: 'tr',
    messages: {
      tr: {
        dataIterator: {
          rowsPerPageText: 'Sayfa başına satır:',
          pageText: '{0}-{1} / {2}',
          noResultsText: 'Sonuç bulunamadı',
          loadingText: 'Yükleniyor...',
        },
        dataTable: {
          itemsPerPageText: 'Sayfa başına satır:',
          ariaLabel: {
            sortDescending: 'Azalan sırada.',
            sortAscending: 'Artan sırada.',
            sortNone: 'Sıralanmamış.',
            activateNone: 'Sıralamayı kaldır.',
            activateDescending: 'Azalan sırala.',
            activateAscending: 'Artan sırala.',
          },
          sortBy: 'Sırala',
        },
        dataFooter: {
          itemsPerPageText: 'Sayfa başına satır:',
          itemsPerPageAll: 'Tümü',
          nextPage: 'Sonraki sayfa',
          prevPage: 'Önceki sayfa',
          firstPage: 'İlk sayfa',
          lastPage: 'Son sayfa',
          pageText: '{0}-{1} / {2}',
        },
        pagination: {
          ariaLabel: {
            root: 'Sayfalama',
            previous: 'Önceki sayfa',
            next: 'Sonraki sayfa',
            currentPage: 'Sayfa {0}',
            page: 'Sayfa {0}\'a git',
          },
        },
        input: {
          clear: 'Temizle',
          prependAction: '{0} önceki işlem',
          appendAction: '{0} sonraki işlem',
        },
        fileInput: {
          counter: '{0} dosya',
          counterSize: '{0} dosya (toplam {1})',
        },
        noDataText: 'Veri bulunamadı',
        carousel: {
          prev: 'Önceki',
          next: 'Sonraki',
          ariaLabel: { delimiter: 'Slayt {0} / {1}' },
        },
        calendar: { moreEvents: '{0} daha' },
        badge: '{0} yeni öğe',
        close: 'Kapat',
        open: 'Aç',
        loading: 'Yükleniyor...',
        infiniteScroll: {
          loadMore: 'Daha fazla yükle',
          empty: 'Başka veri yok',
        },
        confirmEdit: {
          ok: 'Tamam',
          cancel: 'İptal',
        },
      },
    },
  },
  theme: {
    defaultTheme: 'darkComfort',
    themes: {
      darkComfort,
      lightComfort,
    },
  },
  defaults: {
    // Signal sifir kose yaricapli; rounded='lg' varsayilanlari kaldirildi.
    VCard: { rounded: 0, elevation: 0 },
    VBtn: { rounded: 0 },
    VTextField: { variant: 'outlined', density: 'compact', rounded: 0 },
    VSelect: { variant: 'outlined', density: 'compact', rounded: 0 },
    VTextarea: { variant: 'outlined', density: 'compact', rounded: 0 },
    VChip: { rounded: 0 },
    VDataTable: { density: 'comfortable' },
  },
})
