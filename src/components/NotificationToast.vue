<template>
<teleport to="body">
  <transition name="notif-slide">
    <div
      v-if="notifStore.showToast && notifStore.toastData"
      class="notif-toast"
    >
      <div class="notif-toast-card" :class="`notif-toast-card--${notifStore.toastData.color}`">
        <!-- Header: type label + close -->
        <div class="notif-toast-header">
          <div class="notif-toast-label" :class="`notif-toast-label--${notifStore.toastData.color}`">
            <v-icon size="14" class="mr-1">{{ notifStore.toastData.icon }}</v-icon>
            {{
              notifStore.toastData.type === 'deposit' ? 'YENİ YATIRIM'
              : notifStore.toastData.type === 'withdrawal' ? 'YENİ ÇEKİM'
              : notifStore.toastData.type === 'payment_notified' ? 'ÖDEME BİLDİRİLDİ'
              : notifStore.toastData.type === 'teslim' ? 'TESLİM'
              : 'BİLDİRİM'
            }}
          </div>
          <button class="notif-toast-close" @click="dismissNotifModal">
            <v-icon size="18">mdi-close</v-icon>
          </button>
        </div>

        <!-- ─────────────────────────────────────────────────────────
             Type-driven body. Each notification type renders its own
             block — no shared "always show amount" template, so a
             status notification (e.g. teslim approval) can't ever
             leak amount/currency into the banner.
             ───────────────────────────────────────────────────────── -->

        <!-- Deposit toast: amount + bank account info -->
        <template v-if="notifStore.toastData.type === 'deposit' && notifStore.toastData.extra">
          <div class="notif-toast-amount" :class="`notif-toast-amount--${notifStore.toastData.color}`">
            {{ fmtNotifAmount(notifStore.toastData.extra.amount) }}
            <span class="notif-toast-currency">{{ notifStore.toastData.extra.currency || 'TRY' }}</span>
          </div>
          <div v-if="notifStore.toastData.extra.internalId" class="notif-toast-id">
            #{{ notifStore.toastData.extra.internalId }}
          </div>
          <div class="notif-toast-details">
            <div v-if="notifStore.toastData.extra.bankHolder" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-bank</v-icon>
              <span class="notif-toast-detail-label">Hesap:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.bankHolder }}</span>
            </div>
            <div v-if="notifStore.toastData.extra.bankName" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-bank-outline</v-icon>
              <span class="notif-toast-detail-label">Banka:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.bankName }}</span>
            </div>
            <div v-if="notifStore.toastData.extra.customerName" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-account-circle-outline</v-icon>
              <span class="notif-toast-detail-label">Müşteri:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.customerName }}</span>
            </div>
          </div>
        </template>

        <!-- Withdrawal toast: amount + player bank info -->
        <template v-else-if="notifStore.toastData.type === 'withdrawal' && notifStore.toastData.extra">
          <div class="notif-toast-amount" :class="`notif-toast-amount--${notifStore.toastData.color}`">
            {{ fmtNotifAmount(notifStore.toastData.extra.amount) }}
            <span class="notif-toast-currency">{{ notifStore.toastData.extra.currency || 'TRY' }}</span>
          </div>
          <div v-if="notifStore.toastData.extra.internalId" class="notif-toast-id">
            #{{ notifStore.toastData.extra.internalId }}
          </div>
          <div class="notif-toast-details">
            <div v-if="notifStore.toastData.extra.playerHolder" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-account</v-icon>
              <span class="notif-toast-detail-label">Alıcı:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.playerHolder }}</span>
            </div>
            <div v-if="notifStore.toastData.extra.playerBank" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-bank-outline</v-icon>
              <span class="notif-toast-detail-label">Banka:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.playerBank }}</span>
            </div>
            <div v-if="notifStore.toastData.extra.customerName" class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-account-circle-outline</v-icon>
              <span class="notif-toast-detail-label">Müşteri:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.customerName }}</span>
            </div>
          </div>
        </template>

        <!-- Payment-notified toast: amount + customer -->
        <template v-else-if="notifStore.toastData.type === 'payment_notified' && notifStore.toastData.extra">
          <div class="notif-toast-amount" :class="`notif-toast-amount--${notifStore.toastData.color}`">
            {{ fmtNotifAmount(notifStore.toastData.extra.amount) }}
            <span class="notif-toast-currency">{{ notifStore.toastData.extra.currency || 'TRY' }}</span>
          </div>
          <div v-if="notifStore.toastData.extra.internalId" class="notif-toast-id">
            #{{ notifStore.toastData.extra.internalId }}
          </div>
          <div v-if="notifStore.toastData.extra.customerName" class="notif-toast-details">
            <div class="notif-toast-detail-row">
              <v-icon size="14" class="mr-2" style="color: var(--sp-text-hint)">mdi-account-circle-outline</v-icon>
              <span class="notif-toast-detail-label">Müşteri:</span>
              <span class="notif-toast-detail-value">{{ notifStore.toastData.extra.customerName }}</span>
            </div>
          </div>
        </template>

        <!-- Teslim toast: status-only — title + message, NO amount,
             NO transaction id, NO details. Operators get a clean
             "Teslimin onaylandı." banner. -->
        <template v-else-if="notifStore.toastData.type === 'teslim'">
          <div class="notif-toast-simple" :class="`notif-toast-simple--${notifStore.toastData.color}`">
            <div v-if="notifStore.toastData.title" class="notif-toast-simple-title">{{ notifStore.toastData.title }}</div>
            <div v-if="notifStore.toastData.message" class="notif-toast-simple-msg">{{ notifStore.toastData.message }}</div>
          </div>
        </template>

        <!-- Generic fallback for other notification types — shows
             title + message; falls back to extra-amount only when
             explicitly provided. -->
        <template v-else>
          <div
            v-if="notifStore.toastData.title || notifStore.toastData.message"
            class="notif-toast-simple"
            :class="`notif-toast-simple--${notifStore.toastData.color}`"
          >
            <div v-if="notifStore.toastData.title" class="notif-toast-simple-title">{{ notifStore.toastData.title }}</div>
            <div v-if="notifStore.toastData.message" class="notif-toast-simple-msg">{{ notifStore.toastData.message }}</div>
          </div>
        </template>

        <!-- Actions -->
        <div class="notif-toast-actions">
          <button
            v-if="notifStore.toastData.txnId"
            class="notif-toast-btn notif-toast-btn--view"
            :class="`notif-toast-btn--${notifStore.toastData.color}`"
            @click="goToTxn(notifStore.toastData.txnId); dismissNotifModal()"
          >
            <v-icon size="18" class="mr-1">mdi-eye-outline</v-icon>
            İşlemi Görüntüle
          </button>
          <button class="notif-toast-btn notif-toast-btn--dismiss" @click="dismissNotifModal">
            Kapat
          </button>
        </div>

        <!-- Timer -->
        <div class="notif-toast-timer">
          <div
            class="notif-toast-timer-bar"
            :class="[`notif-toast-timer-bar--${notifStore.toastData.color}`, { 'notif-toast-timer-animate': notifStore.showToast }]"
          />
        </div>
      </div>
    </div>
  </transition>
</teleport>
</template>

<script setup>
import { watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

/**
 * Gelen bildirim icin ekranin kosesinde beliren kart.
 *
 * Govde bildirim tipine gore ayri ayri ciziliyor -- ortak bir "her zaman
 * tutari goster" sablonu yok, boylece durum bildirimi (ornegin teslim
 * onayi) yanlislikla tutar/para birimi sizdiramiyor.
 *
 * AppLayout'tan buraya tasindi: kabuk yeniden yazilirken 150 satirlik bu
 * blok kabugu okunmaz hale getiriyordu.
 */
const notifStore = useNotificationStore()
const router = useRouter()

let timer = null

function dismissNotifModal() {
  notifStore.showToast = false
  if (timer) { clearTimeout(timer); timer = null }
}

function fmtNotifAmount(v) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(v || 0)
}

// Bildirimi ilgili liste sayfasina goturur. Islem bagli bildirimlerde
// ?highlight={txnId} veriliyor ki liste ilgili satira kaydirip vurgulasin.
function routeForNotification(n) {
  if (!n) return null
  const query = n.txnId ? { highlight: String(n.txnId) } : undefined
  switch (n.type) {
    case 'deposit':
    case 'payment_notified': return { name: 'Deposits', query }
    case 'withdrawal': return { name: 'Withdrawals', query }
    case 'settlement': return { name: 'Settlements' }
    case 'teslim': return { name: 'Teslimler' }
    default: return { name: 'Deposits', query }
  }
}

function goToTxn() {
  const target = routeForNotification(notifStore.toastData)
  if (target) router.push(target)
}

// 15 saniye sonra kendiliginden kapanir
watch(() => notifStore.showToast, (val) => {
  if (timer) { clearTimeout(timer); timer = null }
  if (val) timer = setTimeout(() => { notifStore.showToast = false }, 15000)
})

onUnmounted(() => { if (timer) clearTimeout(timer) })
</script>

<style scoped>
/* ── Notification Toast ── */
.notif-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}
.notif-toast-card {
  position: relative;
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--sp-surface-bright);
  border-radius: 0;
  padding: 0;
  overflow: hidden;
  animation: notif-pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.notif-toast-card--success { border: 2px solid rgba(102,241,189, 0.5); box-shadow: 0 0 40px rgba(102,241,189, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--error { border: 2px solid rgba(255,142,130, 0.5); box-shadow: 0 0 40px rgba(255,142,130, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--warning { border: 2px solid rgba(255,208,138, 0.5); box-shadow: 0 0 40px rgba(255,208,138, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--info { border: 2px solid rgba(112,169,255, 0.5); box-shadow: 0 0 40px rgba(112,169,255, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--primary { border: 2px solid rgba(var(--sp-primary-rgb), 0.5); box-shadow: 0 0 40px rgba(var(--sp-primary-rgb), 0.2), 0 12px 40px rgba(0,0,0,0.3); }
/* Header */
.notif-toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--sp-divider);
}
.notif-toast-close {
  width: 32px; height: 32px;
  border-radius: 0;
  border: none;
  background: var(--sp-accent-bg);
  color: var(--sp-text-dimmer);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.notif-toast-close:hover {
  background: var(--sp-accent-bg-active);
  color: var(--sp-text);
}
/* Label (type tag) */
.notif-toast-label {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 4px 12px;
  border-radius: 0;
}
.notif-toast-label--success { background: rgba(102,241,189, 0.12); color: var(--sp-accent-success-bright); }
.notif-toast-label--error { background: rgba(255,142,130, 0.12); color: var(--sp-accent-error); }
.notif-toast-label--warning { background: rgba(255,208,138, 0.12); color: var(--sp-accent-orange-bright); }
.notif-toast-label--info { background: rgba(112,169,255, 0.12); color: var(--sp-accent-blue); }
.notif-toast-label--primary { background: rgba(var(--sp-primary-rgb), 0.12); color: var(--sp-primary); }
/* Amount */
.notif-toast-amount {
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
  padding: 14px 18px 4px;
  line-height: 1.15;
}
.notif-toast-amount--success { color: var(--sp-accent-success-bright); }
.notif-toast-amount--info { color: var(--sp-accent-blue); }
.notif-toast-amount--warning { color: var(--sp-accent-orange-bright); }
.notif-toast-amount--error { color: var(--sp-accent-error); }
.notif-toast-amount--primary { color: var(--sp-primary); }
.notif-toast-currency {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.6;
  margin-left: 2px;
}
/* Simple text-only toast — used when the notification carries no amount
   (e.g. teslim approval status updates pushed to the operator). */
.notif-toast-simple {
  text-align: center;
  padding: 18px 20px 6px;
}
.notif-toast-simple-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.notif-toast-simple-msg {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sp-text-secondary, var(--sp-text));
  line-height: 1.35;
}
.notif-toast-simple--success .notif-toast-simple-title { color: var(--sp-accent-success-bright); }
.notif-toast-simple--info    .notif-toast-simple-title { color: var(--sp-accent-blue); }
.notif-toast-simple--warning .notif-toast-simple-title { color: var(--sp-accent-orange-bright); }
.notif-toast-simple--error   .notif-toast-simple-title { color: var(--sp-accent-error); }
.notif-toast-simple--primary .notif-toast-simple-title { color: var(--sp-primary); }
.notif-toast-id {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-dimmer);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 16px;
}
/* Detail rows */
.notif-toast-details {
  padding: 0 20px 16px;
}
.notif-toast-detail-row {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 0;
  background: var(--sp-accent-bg);
  margin-bottom: 6px;
}
.notif-toast-detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-text-muted);
  margin-right: 8px;
  white-space: nowrap;
}
.notif-toast-detail-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Action buttons */
.notif-toast-actions {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
}
.notif-toast-btn {
  border: none;
  border-radius: 0;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 24px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}
.notif-toast-btn--view {
  color: #fff;
}
.notif-toast-btn--success { background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-success-bright)); }
.notif-toast-btn--error { background: linear-gradient(135deg, var(--sp-accent-error), var(--sp-accent-error)); }
.notif-toast-btn--warning { background: linear-gradient(135deg, var(--sp-accent-orange), var(--sp-accent-orange-bright)); }
.notif-toast-btn--info { background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-blue)); }
.notif-toast-btn--primary { background: linear-gradient(135deg, var(--sp-accent-indigo), var(--sp-primary)); }
.notif-toast-btn--view:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
.notif-toast-btn--dismiss {
  background: var(--sp-accent-bg);
  color: var(--sp-text-muted);
}
.notif-toast-btn--dismiss:hover {
  background: var(--sp-accent-bg-active);
  color: var(--sp-text);
}
/* Timer bar */
.notif-toast-timer {
  height: 3px;
  background: var(--sp-accent-bg-hover);
  overflow: hidden;
}
.notif-toast-timer-bar {
  height: 100%;
  width: 100%;
}
.notif-toast-timer-bar--success { background: linear-gradient(90deg, var(--sp-accent-success), var(--sp-accent-success)); }
.notif-toast-timer-bar--error { background: linear-gradient(90deg, var(--sp-accent-error), var(--sp-accent-rose)); }
.notif-toast-timer-bar--warning { background: linear-gradient(90deg, var(--sp-accent-orange), var(--sp-accent-amber)); }
.notif-toast-timer-bar--info { background: linear-gradient(90deg, var(--sp-accent-blue), var(--sp-accent-cyan)); }
.notif-toast-timer-bar--primary { background: linear-gradient(90deg, var(--sp-primary), var(--sp-accent-purple)); }
.notif-toast-timer-animate {
  animation: notif-timer-shrink 15s linear forwards;
}
/* Transition */
.notif-slide-enter-active {
  transition: all 0.3s ease;
}
.notif-slide-leave-active {
  transition: all 0.25s ease-in;
}
.notif-slide-enter-from {
  opacity: 0;
  transform: translateX(100px);
}
.notif-slide-leave-to {
  opacity: 0;
  transform: translateX(60px);
}
.notif-toast--light .notif-toast-card {
  background: #FFFFFF !important;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18) !important;
}
.notif-toast--light .notif-toast-header {
  border-bottom-color: #E3E5EE;
}
.notif-toast--light .notif-toast-amount { color: var(--sp-surface-bright); }
.notif-toast--light .notif-toast-amount--success { color: var(--sp-accent-success) !important; }
.notif-toast--light .notif-toast-amount--info { color: var(--sp-accent-info) !important; }
.notif-toast--light .notif-toast-amount--warning { color: var(--sp-accent-orange) !important; }
.notif-toast--light .notif-toast-amount--error { color: var(--sp-accent-error) !important; }
.notif-toast--light .notif-toast-id { color: var(--sp-text-muted); }
.notif-toast--light .notif-toast-currency { color: var(--sp-text-muted); }
.notif-toast--light .notif-toast-label--success { background: rgba(102,241,189, 0.1); color: var(--sp-accent-success); }
.notif-toast--light .notif-toast-label--error { background: rgba(255,142,130, 0.1); color: var(--sp-accent-error); }
.notif-toast--light .notif-toast-label--warning { background: rgba(255,174,91, 0.1); color: var(--sp-accent-orange); }
.notif-toast--light .notif-toast-label--info { background: rgba(3, 169, 244, 0.1); color: var(--sp-accent-info); }
.notif-toast--light .notif-toast-detail-row { background: #F5F6FA; }
.notif-toast--light .notif-toast-detail-label { color: var(--sp-text-muted); }
.notif-toast--light .notif-toast-detail-value { color: var(--sp-surface-bright); }
.notif-toast--light .notif-toast-close { background: #F0F1F5; color: var(--sp-text-muted); }
.notif-toast--light .notif-toast-close:hover { background: #E3E5EE; color: var(--sp-surface-bright); }
.notif-toast--light .notif-toast-btn--dismiss { background: #F0F1F5; color: var(--sp-text-muted); }
.notif-toast--light .notif-toast-btn--dismiss:hover { background: #E3E5EE; color: var(--sp-surface-bright); }
.notif-toast--light .notif-toast-timer { background: #E3E5EE; }
.notif-toast--light .notif-toast-card--success { border-color: rgba(102,241,189, 0.4); box-shadow: 0 12px 40px rgba(102,241,189, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--info { border-color: rgba(112,169,255, 0.4); box-shadow: 0 12px 40px rgba(112,169,255, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--warning { border-color: rgba(255,208,138, 0.4); box-shadow: 0 12px 40px rgba(255,208,138, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--error { border-color: rgba(255,142,130, 0.4); box-shadow: 0 12px 40px rgba(255,142,130, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
</style>
