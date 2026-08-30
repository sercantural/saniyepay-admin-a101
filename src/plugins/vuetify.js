import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Eye-comfort dark theme — optimised for long screen sessions
// Uses warm-tinted neutrals, muted accent colours, and low contrast ratios
const darkComfort = {
  dark: true,
  colors: {
    background: '#0F1117',       // Deep navy-black
    surface: '#171921',          // Card / drawer
    'surface-bright': '#1E2030', // Elevated cards
    'surface-variant': '#252736',// Hover / subtle bg
    'on-background': '#C8CCD8', // Primary text (not pure white)
    'on-surface': '#C8CCD8',
    primary: '#7C8FE4',         // Soft indigo — easy on eyes
    'primary-darken-1': '#5C6FC4',
    secondary: '#A78BFA',       // Soft purple
    success: '#6EC47A',         // Muted green
    warning: '#E4A34F',         // Warm amber
    error: '#E06C6C',           // Soft red
    info: '#5EAFC7',            // Muted teal-blue
  },
}

// Eye-comfort light theme — clean, professional, low-glare
const lightComfort = {
  dark: false,
  colors: {
    background: '#F0F2F8',       // Warm grey-blue canvas
    surface: '#FFFFFF',          // White cards
    'surface-bright': '#FFFFFF', // Elevated cards
    'surface-variant': '#E8EAF2',// Hover / subtle bg
    'on-background': '#1E2030', // Rich dark text (not pure black)
    'on-surface': '#1E2030',
    primary: '#4F63B8',         // Deep indigo — strong contrast
    'primary-darken-1': '#3D4FA0',
    secondary: '#6B4DAD',       // Rich purple
    success: '#2E7D32',         // Forest green
    warning: '#E67E00',         // Deep amber
    error: '#C62828',           // Strong red
    info: '#0277BD',            // Deep blue
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
    VCard: { rounded: 'lg', elevation: 0 },
    VBtn: { rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'compact', rounded: 'lg' },
    VSelect: { variant: 'outlined', density: 'compact', rounded: 'lg' },
    VTextarea: { variant: 'outlined', density: 'compact', rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VDataTable: { density: 'comfortable' },
  },
})
