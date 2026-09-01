<template>
  <div class="portal">
    <div class="portal-grid-bg" aria-hidden="true"></div>

    <!-- ── Kenar cubugu ────────────────────────────────────── -->
    <aside class="portal-sidebar" :class="{ open: drawer }">
      <div class="portal-sidebar-head">
        <!-- Bilerek markasiz: panel herkese acik olmayan bir adreste
             duruyor ve bir marka tasimasi icin sebep yok. -->
        <router-link :to="{ name: 'Home' }" class="portal-brand">
          <i class="brand-mark" aria-hidden="true"></i>
          <strong>YÖNETİM</strong>
          <span>PANELİ</span>
        </router-link>
        <button class="portal-mobile-close" @click="drawer = false" aria-label="Menüyü kapat">
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>

      <div class="portal-user-card">
        <div class="portal-user-avatar">{{ initials }}</div>
        <div>
          <span>OTURUM</span>
          <strong>{{ auth.user?.name || '—' }}</strong>
        </div>
        <i v-if="auth.isClockedIn && !auth.isSuperAdmin" class="clock-live" title="Mesaide"></i>
      </div>

      <nav
        ref="navEl"
        class="portal-nav"
        :class="{ 'has-more': navHasMore }"
        aria-label="Yönetim menüsü"
        @scroll="updateNavScroll"
      >
        <template v-for="group in menu" :key="group.label || 'kok'">
          <span v-if="group.label" class="portal-nav-label">{{ group.label }}</span>
          <router-link
            v-for="item in group.items"
            :key="item.name"
            :to="{ name: item.name }"
            custom
            v-slot="{ href, navigate, isExactActive, isActive }"
          >
            <a
              :href="href"
              :class="{ active: item.exact ? isExactActive : isActive }"
              :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
              @click="navigate($event); drawer = false"
            >
              <v-icon size="17">{{ item.icon }}</v-icon>
              <span>
                <b>{{ item.title }}</b>
                <small>{{ item.sub }}</small>
              </span>
              <em v-if="item.badge && item.badge()" class="nav-badge">{{ item.badge() }}</em>
              <i class="nav-mark"></i>
            </a>
          </router-link>
        </template>
      </nav>

      <div class="portal-sidebar-bottom">
        <!-- Mesai kartı: süper yönetici mesai takibine tabi değil -->
        <div v-if="!auth.isSuperAdmin" class="portal-clock-card" :class="{ off: !auth.isClockedIn }">
          <div>
            <v-icon size="12">mdi-clock-outline</v-icon>
            {{ auth.isClockedIn ? 'MESAİ AÇIK' : 'MESAİ KAPALI' }}
          </div>
          <strong>{{ currentTime }}</strong>
          <span v-if="auth.isClockedIn">{{ elapsedTime }} çalışıldı</span>
          <span v-else>Mesaiye başlamadınız</span>
        </div>
        <div v-else class="portal-clock-card">
          <div><v-icon size="12">mdi-clock-outline</v-icon> TÜRKİYE SAATİ</div>
          <strong>{{ currentTime }}</strong>
        </div>

        <button class="portal-logout" @click="handleLogout">
          <v-icon size="15">mdi-logout</v-icon> Güvenli çıkış
        </button>
      </div>
    </aside>

    <button v-if="drawer" class="portal-overlay" aria-label="Menüyü kapat" @click="drawer = false"></button>

    <!-- ── Kabuk ───────────────────────────────────────────── -->
    <div class="portal-shell">
      <header class="portal-topbar">
        <div class="portal-mobile-brand">
          <button @click="drawer = true" aria-label="Menüyü aç"><v-icon size="17">mdi-menu</v-icon></button>
          <strong>YÖNETİM</strong>
        </div>

        <div class="portal-breadcrumb">
          <span>YÖNETİM PANELİ</span>
          <i>/</i>
          <strong>{{ pageTitle }}</strong>
        </div>

        <div class="portal-top-actions">
          <span class="portal-system-pill"><i></i> Sistemler normal</span>

          <v-menu v-model="notifMenu" :close-on-content-click="false" :max-width="380" :min-width="340" offset="10" location="bottom end">
            <template v-slot:activator="{ props }">
              <button v-bind="props" class="portal-notification" aria-label="Bildirimler">
                <v-icon size="16">mdi-bell-outline</v-icon>
                <i v-if="notifStore.unreadCount > 0"></i>
              </button>
            </template>
            <NotificationMenu @select="onNotifSelect" />
          </v-menu>

          <div class="portal-user-wrap" ref="userWrap">
            <button class="portal-user" @click="userMenu = !userMenu" :aria-expanded="userMenu">
              <span>{{ initials }}</span>
              <div>
                <strong>{{ auth.user?.name || '—' }}</strong>
                <small>{{ roleName(auth.user?.roles?.[0]?.name) }}</small>
              </div>
              <v-icon size="14">mdi-chevron-down</v-icon>
            </button>

            <div v-if="userMenu" class="portal-user-menu">
              <div class="portal-user-menu-head">
                <span>{{ initials }}</span>
                <div>
                  <strong>{{ auth.user?.name }}</strong>
                  <small>{{ auth.user?.email }}</small>
                </div>
              </div>
              <router-link :to="{ name: 'ProfileSettings' }" @click="userMenu = false">
                <v-icon size="14">mdi-cog-outline</v-icon> Ayarlar
              </router-link>
              <button @click="handleLogout"><v-icon size="14">mdi-logout</v-icon> Çıkış yap</button>
            </div>
          </div>
        </div>
      </header>

      <div class="portal-content">
        <router-view v-if="!blockedByClockIn" />

        <!-- Mesai girisi yapilmadan islem ekranlari acilmiyor -->
        <div v-else class="clock-gate">
          <div class="clock-gate-card">
            <div class="clock-gate-icon"><v-icon size="30">mdi-clock-check-outline</v-icon></div>
            <span class="clock-gate-kicker">MESAİ GEREKLİ</span>
            <h2>Mesaiye başlayın.</h2>
            <p>İşlemleri görüntülemek ve yönetmek için mesaiye giriş yapmanız gerekiyor.</p>
            <button class="clock-gate-btn" @click="handleClockIn" :disabled="clockingIn">
              <span v-if="clockingIn" class="portal-spin"></span>
              <v-icon v-else size="16">mdi-login</v-icon>
              Mesaiye başla
            </button>
            <small>{{ currentDate }}</small>
          </div>
        </div>

        <footer class="portal-footer">
          <span>© {{ year }} · Yönetim Paneli</span>
          <div>
            <span><i></i> Bağlantı: Aktif</span>
            <span>{{ currentTime }}</span>
          </div>
        </footer>
      </div>
    </div>

    <NotificationToast />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useNotificationStore } from '@/stores/notifications'
import api from '@/plugins/axios'
import NotificationMenu from '@/components/NotificationMenu.vue'
import NotificationToast from '@/components/NotificationToast.vue'

const auth = useAuthStore()
const txnStore = useTransactionStore()
const notifStore = useNotificationStore()
const router = useRouter()
const route = useRoute()

const drawer = ref(false)
const navEl = ref(null)
const navHasMore = ref(false)
const notifMenu = ref(false)
const userMenu = ref(false)
const userWrap = ref(null)
const clockingIn = ref(false)

const year = computed(() => new Date().getFullYear())

/* ── Menu ──────────────────────────────────────────────────
 * Izinler menuyu suzuyor; goremeyecegi sayfayi kullaniciya
 * gostermiyoruz. Yetki kontrolu asil olarak backend'de.
 * -------------------------------------------------------- */
const can = (p) => auth.can(p) || auth.isSuperAdmin

const menu = computed(() => {
  const groups = [
    {
      label: null,
      items: [
        { name: 'Home', title: 'Ana Sayfa', sub: 'Günlük özet', icon: 'mdi-home-outline', exact: true, show: true },
      ],
    },
    {
      label: 'İŞLEMLER',
      items: [
        { name: 'Deposits', title: 'Yatırımlar', sub: 'Yatırım işlemleri', icon: 'mdi-plus-circle-outline',
          show: can('transactions.view.deposit'), badge: () => txnStore.pendingDepositCount },
        { name: 'Withdrawals', title: 'Çekimler', sub: 'Çekim işlemleri', icon: 'mdi-minus-circle-outline',
          show: can('transactions.view.withdrawal'), badge: () => txnStore.pendingWithdrawalCount },
        // Havuz ayri bir menu: sahipsiz bekleyen cekimler. Operator
        // kendine aldiginda kayit Cekimler ekranina gecer.
        { name: 'WithdrawalPool', title: 'Çekim Havuzu', sub: 'Sahipsiz çekimler', icon: 'mdi-tray-full',
          show: can('withdrawal_pool.view'), badge: () => txnStore.poolCount },
        { name: 'Settlements', title: 'Mutabakat', sub: 'Kripto talepleri', icon: 'mdi-bank-transfer-out',
          show: can('settlement.handle'), badge: () => txnStore.pendingSettlementCount },
        { name: 'Teslimler', title: 'Teslim', sub: 'Nakit teslim', icon: 'mdi-hand-coin-outline',
          show: can('teslim.view'), badge: () => txnStore.pendingTeslimCount },
        { name: 'CompanyWallets', title: 'Şirket Cüzdanları', sub: 'Cüzdan yönetimi', icon: 'mdi-wallet-outline',
          show: can('company_wallets.view') || can('company_wallet.manage') },
        // Operatorlerin guncel kredisi -- teslimle yuklenen bakiyeyi
        // yonetim tarafinda gorebilecek bir yer yoktu.
        { name: 'OperatorBalances', title: 'Operatör Bakiyeleri', sub: 'Güncel krediler', icon: 'mdi-scale-balance',
          show: can('operator_balances.view'), badge: undefined },
      ],
    },
    {
      label: 'YÖNETİM',
      items: [
        { name: 'Dashboard', title: 'Genel Bakış', sub: 'İstatistikler', icon: 'mdi-chart-box-outline', show: can('dashboard.view') },
        { name: 'BankAccounts', title: 'Banka Hesapları', sub: 'Hesap yapılandırması', icon: 'mdi-bank-outline', show: can('bank_accounts.view') },
        { name: 'Users', title: 'Kullanıcılar', sub: 'Yetki yönetimi', icon: 'mdi-account-group-outline', show: can('users.view') },
        { name: 'Roles', title: 'Roller', sub: 'Rol ve izinler', icon: 'mdi-shield-account-outline', show: can('roles.view') },
        { name: 'Team', title: 'Ekibim', sub: 'Ekip yönetimi', icon: 'mdi-account-multiple-plus-outline',
          show: !auth.isSuperAdmin && auth.can('team.create') },
        { name: 'SubGroups', title: 'Alt Gruplar', sub: 'Grup yapılandırması', icon: 'mdi-folder-account-outline', show: can('sub_groups.view') },
        { name: 'Merchants', title: 'Bayiler', sub: 'Bayi ve API', icon: 'mdi-store-outline', show: can('merchants.view') },
        { name: 'Reports', title: 'Raporlar', sub: 'Finansal raporlar', icon: 'mdi-chart-bar', show: can('reports.view') },
        { name: 'ApiLogs', title: 'API Kayıtları', sub: 'İstek ve yanıtlar', icon: 'mdi-console-network', show: can('api_logs.view') },
        { name: 'Proposals', title: 'Teklifler', sub: 'Bayi teklifleri', icon: 'mdi-file-document-outline', show: can('proposals.view') },
        { name: 'ClockTracking', title: 'Mesai Takibi', sub: 'Personel kayıtları', icon: 'mdi-clock-check-outline',
          show: can('clock.view') },
        { name: 'PlatformSettings', title: 'Platform Ayarları', sub: 'Sistem yapılandırması', icon: 'mdi-cog-outline', show: can('settings.view') },
      ],
    },
  ]
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length)
})

const pages = {
  Home: 'Ana Sayfa', Dashboard: 'Genel Bakış', Deposits: 'Yatırımlar', Withdrawals: 'Çekimler',
  WithdrawalPool: 'Çekim Havuzu', OperatorBalances: 'Operatör Bakiyeleri', Roles: 'Roller ve İzinler',
  TxnDetail: 'İşlem Detayı', BankAccounts: 'Banka Hesapları', Users: 'Kullanıcılar', Team: 'Ekibim',
  SubGroups: 'Alt Gruplar', Merchants: 'Bayiler', Settlements: 'Mutabakat', Teslimler: 'Teslim',
  CompanyWallets: 'Şirket Cüzdanları', ApiLogs: 'API Kayıtları', Reports: 'Raporlar',
  ProfileSettings: 'Ayarlar', PlatformSettings: 'Platform Ayarları', ClockTracking: 'Mesai Takibi',
  Proposals: 'Teklifler', ProposalCreate: 'Yeni Teklif', ProposalDetail: 'Teklif Detayı', ProposalEdit: 'Teklif Düzenle',
}
const pageTitle = computed(() => pages[route.name] || route.name)

const initials = computed(() =>
  (auth.user?.name || '').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '—'
)

function roleName(role) {
  return {
    super_admin: 'Süper Yönetici', grup_yoneticisi: 'Grup Yöneticisi',
    yatirim_sorumlusu: 'Yatırım Sorumlusu', cekim_sorumlusu: 'Çekim Sorumlusu',
    muhasebe: 'Muhasebe', izleyici: 'İzleyici', sub_group_manager: 'Grup Yöneticisi',
    deposit_operator: 'Yatırım Operatörü', withdrawal_operator: 'Çekim Operatörü',
    bank_checker: 'Banka Kontrol', viewer: 'İzleyici',
  }[role] || role || '—'
}

// Mesai girisi bekleyen kullanici yalnizca profil ve mesai sayfalarini gorebilir
const blockedByClockIn = computed(
  () => auth.needsClockIn && !['ProfileSettings', 'ClockTracking'].includes(route.name)
)

function onNotifSelect(n) {
  notifMenu.value = false
  const query = n.txnId ? { highlight: String(n.txnId) } : undefined
  const target = {
    deposit: { name: 'Deposits', query },
    payment_notified: { name: 'Deposits', query },
    withdrawal: { name: 'Withdrawals', query },
    settlement: { name: 'Settlements' },
    teslim: { name: 'Teslimler' },
  }[n.type] || { name: 'Deposits', query }
  router.push(target)
}

/* ── Saat ve mesai ─────────────────────────────────────────── */
const currentTime = ref('')
const elapsedTime = ref('')
const currentDate = computed(() =>
  new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
let clockInterval = null
let timeInterval = null

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul',
  })
}
function updateElapsed() {
  if (!auth.clockInAt) { elapsedTime.value = ''; return }
  const mins = Math.floor((Date.now() - new Date(auth.clockInAt).getTime()) / 60000)
  const hrs = Math.floor(mins / 60)
  elapsedTime.value = hrs > 0 ? `${hrs}sa ${mins % 60}dk` : `${mins}dk`
}
async function handleClockIn() {
  clockingIn.value = true
  try {
    await auth.clockIn()
    updateElapsed()
  } finally {
    clockingIn.value = false
  }
}

/* ── Canlilik sinyali ──────────────────────────────────────
 * Backend kimin ekran basinda oldugunu bundan biliyor.
 * Super yonetici mesai takibine tabi degil, ping gondermiyor.
 * -------------------------------------------------------- */
let heartbeatInterval = null
async function sendHeartbeat() {
  if (auth.isSuperAdmin) return
  try { await api.post('/portal/heartbeat') } catch { /* sessiz */ }
}

function onDocClick(e) {
  if (userMenu.value && userWrap.value && !userWrap.value.contains(e.target)) userMenu.value = false
}
function onEsc(e) {
  if (e.key !== 'Escape') return
  userMenu.value = false
  drawer.value = false
}

async function handleLogout() {
  userMenu.value = false
  await auth.logout()
  router.push({ name: 'Login' })
}

/** Menude asagida gorulmeyen madde kaldi mi? */
function updateNavScroll() {
  const el = navEl.value
  if (!el) return
  // Esik, alta eklenen 10px boslugu asmali: aksi halde en alta
  // inildiginde bile "devami var" solmasi gorunuyor.
  navHasMore.value = el.scrollHeight - el.scrollTop - el.clientHeight > 16
}

/**
 * Acilista aktif maddeyi gorunur kil.
 *
 * Menu ekrana sigmadigi icin ornegin Platform Ayarlari'ndayken madde
 * kaydirma alaninin disinda kaliyor ve kullanici nerede oldugunu
 * goremiyordu.
 */
function revealActiveItem() {
  const el = navEl.value
  const active = el?.querySelector('a.active')
  if (!el || !active) return
  const a = active.getBoundingClientRect()
  const n = el.getBoundingClientRect()
  if (a.top < n.top || a.bottom > n.bottom) {
    active.scrollIntoView({ block: 'nearest' })
  }
  updateNavScroll()
}

onMounted(() => {
  sendHeartbeat()
  heartbeatInterval = setInterval(sendHeartbeat, 60000)
  txnStore.subscribeRealtime()
  txnStore.fetchPendingCounts()
  updateElapsed()
  updateTime()
  clockInterval = setInterval(updateElapsed, 60000)
  timeInterval = setInterval(updateTime, 1000)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
  nextTick(revealActiveItem)
})

// Sayfa degisince aktif madde yine gorunur kalsin
watch(() => route.name, () => nextTick(revealActiveItem))

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  if (clockInterval) clearInterval(clockInterval)
  if (timeInterval) clearInterval(timeInterval)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
/* ============================================================
   Yonetim paneli kabugu — "Signal"
   Bayi panelindeki portal kabuguyla ayni yapi: sabit kenar
   cubugu, yapiskan ust cubuk, mobilde cekmece.
   ============================================================ */
.portal {
  --mint: #66F1BD;
  position: relative;
  min-height: 100svh;
  color: var(--sp-text);
  background: var(--sp-bg);
  font-family: Manrope, 'Helvetica Neue', Arial, sans-serif;
  font-size: 12px;
}
.portal :deep(h1), .portal :deep(h2) {
  font-family: Archivo, 'Arial Narrow', sans-serif;
  letter-spacing: -0.03em;
}

.portal-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(102, 241, 189, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 241, 189, 0.02) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(circle at 50% 30%, #000 0, transparent 75%);
  mask-image: radial-gradient(circle at 50% 30%, #000 0, transparent 75%);
}

/* ── Kenar cubugu ─────────────────────────────────────────── */
.portal-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 268px;
  height: 100svh;
  padding: 24px 16px 18px;
  overflow: hidden;
  background: var(--sp-sidebar);
  border-right: 1px solid var(--sp-card-border);
}
.portal-sidebar::after {
  content: '';
  position: absolute;
  top: 12%;
  right: -1px;
  width: 1px;
  height: 28%;
  background: linear-gradient(transparent, var(--mint), transparent);
  opacity: 0.55;
}
.portal-sidebar-head {
  display: flex;
  align-items: center;
  padding: 0 6px 22px;
  border-bottom: 1px solid var(--sp-divider);
}
.portal-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand-mark {
  width: 4px;
  height: 20px;
  flex: none;
  background: var(--mint);
  box-shadow: 0 0 14px rgba(102, 241, 189, 0.5);
}
.portal-brand strong {
  font-family: Archivo, 'Arial Narrow', sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--sp-text);
}
.portal-brand span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.3px;
  color: var(--sp-text-dim);
  border-left: 1px solid var(--sp-divider);
  padding-left: 11px;
}
.portal-mobile-close { display: none; }

.portal-user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  margin: 18px 0 20px;
  padding: 11px;
  background: var(--sp-surface);
  border: 1px solid var(--sp-card-border);
}
.portal-user-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  font-size: 13px;
  font-weight: 900;
  color: #07100C;
  background: var(--mint);
}
.portal-user-card > div:nth-child(2) { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.portal-user-card span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--sp-text-dim);
}
.portal-user-card strong {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.clock-live {
  position: absolute;
  top: 11px;
  right: 11px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 0 4px rgba(102, 241, 189, 0.12);
}

/* Menu 16 madde tasiyor ve ekrana sigmiyor: 559px gorunur alanda 924px
 * icerik var, yani 365px gizli kaliyor. Onceden bunu belli eden hicbir
 * sey yoktu -- solma yok, kaydirma cubugu 4px ve Windows'ta ustune
 * gelmeden gorunmuyor, son madde de kenara sifir boslukla yapisikti.
 * Kullanici alttaki maddelere ulasmakta zorlaniyordu. */
.portal-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Son madde kenara yapismasin */
  padding-bottom: 10px;
  /* Kaydirma cubugu icerigi daraltmasin */
  margin-right: -6px;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--sp-scrollbar) transparent;
}
.portal-nav::-webkit-scrollbar { width: 6px; }
.portal-nav::-webkit-scrollbar-track { background: transparent; }
.portal-nav::-webkit-scrollbar-thumb { background: var(--sp-scrollbar); }
.portal-nav:hover::-webkit-scrollbar-thumb { background: var(--sp-scrollbar-hover); }

/* Asagida devami oldugunu gosteren solma. Yalnizca kaydirilacak yer
 * varken ciziliyor; en alta inilince kayboluyor. */
.portal-nav-wrap { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; }
.portal-nav.has-more { -webkit-mask-image: linear-gradient(#000 calc(100% - 26px), transparent); mask-image: linear-gradient(#000 calc(100% - 26px), transparent); }
.portal-nav-label {
  margin: 16px 10px 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.25px;
  color: var(--sp-text-dim);
}
.portal-nav a {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 50px;
  padding: 7px 11px;
  color: var(--sp-text-muted);
  text-decoration: none;
  border: 1px solid transparent;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.portal-nav a:hover { color: var(--sp-text); background: var(--sp-accent-bg-subtle); }
.portal-nav a.active {
  color: var(--mint);
  background: var(--sp-accent-bg);
  border-color: var(--sp-accent-border-strong);
}
/* Vuetify ikonu da <i> olarak render ediliyor; kural sinifsiz
 * yazilinca aktif maddenin ikonunu da mutlak konumlandirip sag kenara
 * firlatiyor ve rozetin uzerine bindiriyordu. */
.portal-nav a.active > .nav-mark {
  position: absolute;
  right: -1px;
  width: 3px;
  height: 22px;
  background: var(--mint);
  box-shadow: 0 0 14px rgba(102, 241, 189, 0.55);
}
.portal-nav a > span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.portal-nav a b { color: inherit; font-size: 12px; font-weight: 700; }
.portal-nav a small { font-size: 9px; color: var(--sp-text-ghost); }
.nav-badge {
  margin-left: auto;
  /* Sag kenardaki aktif gostergesinden ve parlamasindan uzak dursun */
  margin-right: 8px;
  padding: 2px 6px;
  font-style: normal;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #07100C;
  background: var(--sp-accent-amber);
}

.portal-sidebar-bottom {
  flex: none;
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--sp-divider);
}
.portal-clock-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
  padding: 13px;
  background: var(--sp-surface);
  border: 1px solid var(--sp-card-border);
}
.portal-clock-card > div {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--mint);
}
.portal-clock-card.off > div { color: var(--sp-accent-amber); }
.portal-clock-card strong { font-size: 17px; font-variant-numeric: tabular-nums; }
.portal-clock-card > span { font-size: 10px; color: var(--sp-text-dim); }

.portal-logout {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px;
  font-size: 11px;
  color: var(--sp-text-muted);
  background: none;
  border: 0;
  transition: color 0.2s;
}
.portal-logout:hover { color: var(--sp-accent-error); }

/* ── Kabuk ve ust cubuk ───────────────────────────────────── */
.portal-shell { position: relative; min-height: 100svh; margin-left: 268px; }

.portal-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  padding: 0 30px;
  background: rgba(8, 13, 10, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--sp-card-border);
}
.portal-breadcrumb { display: flex; align-items: center; gap: 10px; }
.portal-breadcrumb span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--sp-text-dim);
}
.portal-breadcrumb i { color: var(--sp-text-ghost); font-style: normal; }
.portal-breadcrumb strong { color: var(--sp-text-secondary); font-size: 11px; }

.portal-top-actions { display: flex; align-items: center; gap: 10px; }
.portal-system-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 11px;
  font-size: 10px;
  color: #70DCB4;
  background: var(--sp-accent-bg);
  border: 1px solid var(--sp-accent-border-strong);
}
.portal-system-pill i,
.portal-footer i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 0 4px rgba(102, 241, 189, 0.08);
}
.portal-notification {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--sp-text-muted);
  background: var(--sp-surface);
  border: 1px solid var(--sp-card-border);
}
.portal-notification:hover { color: var(--sp-text); }
.portal-notification i {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sp-accent-error);
  border: 1px solid var(--sp-surface);
}

.portal-user-wrap { position: relative; }
.portal-user {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 168px;
  height: 44px;
  padding: 5px 9px;
  text-align: left;
  background: var(--sp-surface);
  border: 1px solid var(--sp-card-border);
}
.portal-user > span {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  flex: none;
  font-size: 11px;
  font-weight: 800;
  color: var(--mint);
  background: var(--sp-accent-bg-active);
}
.portal-user div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.portal-user strong { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.portal-user small { font-size: 10px; color: var(--sp-text-dim); }
.portal-user > .v-icon { margin-left: auto; color: var(--sp-text-ghost); }

.portal-user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  padding: 6px;
  background: var(--sp-dropdown-bg);
  border: 1px solid var(--sp-card-border);
  box-shadow: 0 24px 60px var(--sp-shadow);
}
.portal-user-menu-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px 13px;
  margin-bottom: 5px;
  border-bottom: 1px solid var(--sp-divider);
}
.portal-user-menu-head > span {
  display: grid;
  place-items: center;
  width: 33px;
  height: 33px;
  flex: none;
  font-size: 12px;
  font-weight: 800;
  color: var(--mint);
  background: var(--sp-accent-bg-active);
}
.portal-user-menu-head div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.portal-user-menu-head strong { font-size: 12px; }
.portal-user-menu-head small {
  font-size: 10px;
  color: var(--sp-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.portal-user-menu a,
.portal-user-menu > button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  font-size: 12px;
  color: var(--sp-text-muted);
  background: none;
  border: 0;
  text-align: left;
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}
.portal-user-menu a:hover { color: var(--sp-text); background: var(--sp-accent-bg-subtle); }
.portal-user-menu > button:hover { color: var(--sp-accent-error); background: var(--sp-error-bg); }

/* ── Icerik ───────────────────────────────────────────────── */
.portal-content { position: relative; width: min(1560px, 100% - 56px); margin: 0 auto; padding: 30px 0 20px; }

.portal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  margin-top: 12px;
  font-size: 10px;
  color: var(--sp-text-ghost);
}
.portal-footer > div { display: flex; align-items: center; gap: 20px; }
.portal-footer > div span { display: flex; align-items: center; gap: 6px; color: var(--sp-text-dim); }

/* ── Mesai kapisi ─────────────────────────────────────────── */
.clock-gate { display: grid; place-items: center; min-height: 62svh; }
.clock-gate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(430px, 100%);
  padding: 40px 34px 34px;
  text-align: center;
  background: var(--sp-surface);
  border: 1px solid var(--sp-card-border);
}
.clock-gate-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 22px;
  color: var(--mint);
  background: var(--sp-accent-bg);
  border: 1px solid var(--sp-accent-border-strong);
}
.clock-gate-kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
  color: var(--mint);
}
.clock-gate-card h2 {
  font-family: Archivo, sans-serif;
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -0.035em;
  margin: 13px 0 10px;
}
.clock-gate-card p { max-width: 320px; margin: 0 0 26px; font-size: 12px; line-height: 1.7; color: var(--sp-text-muted); }
.clock-gate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 50px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  color: #06110C;
  background: var(--mint);
  border: 0;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.clock-gate-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(102, 241, 189, 0.15); }
.clock-gate-btn:disabled { opacity: 0.7; cursor: default; }
.clock-gate-card small { margin-top: 16px; font-size: 10px; color: var(--sp-text-dim); }

.portal-spin {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(6, 17, 12, 0.3);
  border-top-color: #06110C;
  border-radius: 50%;
  animation: portalSpin 0.7s linear infinite;
}
@keyframes portalSpin { to { transform: rotate(360deg); } }

.portal-overlay { display: none; }
/* Masaustunde gizli; 960px altinda medya sorgusu aciyor. */
.portal-mobile-brand { display: none; }

@media (prefers-reduced-motion: reduce) {
  .portal-nav a, .clock-gate-btn { transition: none; }
  .portal-spin { animation-duration: 2s; }
}

/* ── Duyarli ──────────────────────────────────────────────── */
@media (max-width: 1180px) {
  .portal-content { width: min(100% - 40px, 1180px); }
}

@media (max-width: 960px) {
  .portal-sidebar {
    transform: translateX(-100%);
    transition: transform 0.24s;
    box-shadow: 25px 0 80px rgba(0, 0, 0, 0.45);
  }
  .portal-sidebar.open { transform: translateX(0); }
  .portal-sidebar::after { display: none; }
  .portal-mobile-close {
    position: absolute;
    top: 16px;
    right: 12px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    color: var(--sp-text-muted);
    background: var(--sp-surface);
    border: 1px solid var(--sp-card-border);
  }
  .portal-overlay {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: block;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    border: 0;
  }
  .portal-shell { margin-left: 0; }
  .portal-topbar { padding: 0 20px; }
  .portal-breadcrumb { display: none; }
  .portal-mobile-brand { display: flex; align-items: center; gap: 13px; }
  .portal-mobile-brand button {
    display: grid;
    place-items: center;
    width: 37px;
    height: 37px;
    color: var(--sp-text-secondary);
    background: var(--sp-surface);
    border: 1px solid var(--sp-card-border);
  }
  .portal-mobile-brand strong {
    font-family: Archivo, 'Arial Narrow', sans-serif;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .portal-content { width: min(100% - 32px, 780px); padding-top: 24px; }
  .portal-top-actions .portal-system-pill { display: none; }
}

@media (max-width: 600px) {
  .portal-topbar { padding: 0 14px; height: 62px; }
  .portal-user { width: 42px; min-width: 0; padding: 5px; }
  .portal-user div, .portal-user > .v-icon { display: none; }
  .portal-content { width: calc(100% - 22px); }
  .portal-footer { flex-direction: column; align-items: flex-start; gap: 10px; padding: 18px 0; }
}
</style>
