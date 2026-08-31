<template>
  <!-- SA-only read-only side drawer. Slides in from the right when a row
       is clicked; shows every detail that doesn't fit in the compact
       table columns (fees, IBANs, ids, audit timestamps, dekont). The
       row keeps its inline action buttons; this pane is for review. -->
  <v-navigation-drawer
    v-model="open"
    location="right"
    temporary
    width="480"
    class="txn-detail-drawer"
  >
    <div v-if="txn" class="d-flex flex-column h-100">
      <!-- Header band -->
      <div class="drawer-header" :class="`drawer-header--${txn.type}`">
        <div class="d-flex align-center mb-2">
          <v-icon size="22" :color="txn.type === 'deposit' ? 'success' : 'info'" class="mr-2">
            {{ txn.type === 'deposit' ? 'mdi-arrow-down-bold-circle' : 'mdi-arrow-up-bold-circle' }}
          </v-icon>
          <div class="drawer-eyebrow">{{ txn.type === 'deposit' ? 'YATIRIM' : 'ÇEKİM' }} DETAY</div>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="open = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <div class="drawer-amount">
          {{ formatCurrency(txn.requested_amount) }}
          <span class="drawer-amount-cur">{{ txn.currency }}</span>
        </div>
        <div class="d-flex align-center ga-2 mt-2">
          <v-chip :color="statusColor(txn.status)" size="small" variant="flat" label class="font-weight-bold">
            {{ statusText(txn.status) }}
          </v-chip>
          <v-chip v-if="txn.is_sandbox" size="small" color="warning" variant="tonal" label>Sandbox</v-chip>
          <v-chip v-else size="small" color="success" variant="tonal" label>Canlı</v-chip>
        </div>
        <div class="drawer-id-row mt-2">
          <span class="drawer-id">#{{ txn.internal_id }}</span>
          <span v-if="txn.merchant_trx_id" class="drawer-id-ref">· {{ txn.merchant_trx_id }}</span>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="drawer-body">
        <!-- Approval-time amount if different from requested -->
        <Section v-if="txn.amount && Number(txn.amount) !== Number(txn.requested_amount)" title="Onaylanan Tutar">
          <Row label="Onay Tutarı" :value="formatCurrency(txn.amount) + ' ' + txn.currency" highlight />
          <Row label="Talep" :value="formatCurrency(txn.requested_amount) + ' ' + txn.currency" muted />
        </Section>

        <!-- Merchant + customer -->
        <Section title="Bayi & Müşteri">
          <Row label="Bayi" :value="txn.merchant?.name" />
          <Row label="Bayi ID" :value="txn.merchant_id" mono small />
          <Row v-if="txn.customer" label="Oyuncu" :value="customerFullName(txn)" />
          <Row v-if="txn.customer?.email" label="Oyuncu E-posta" :value="txn.customer.email" mono small />
          <Row v-if="txn.customer?.external_id" label="Oyuncu Ext. ID" :value="txn.customer.external_id" mono small />
        </Section>

        <!-- Fees breakdown -->
        <Section v-if="hasFees(txn)" title="Komisyon">
          <Row v-if="txn.merchant_fee_amount != null" label="Bayi Komisyonu" :value="formatFee(txn.merchant_fee_amount, txn.merchant_fee_percent)" />
          <Row v-if="txn.operator_fee_amount != null" label="Operatör Komisyonu" :value="formatFee(txn.operator_fee_amount, txn.operator_fee_percent)" />
          <Row v-if="txn.owner_fee_amount != null" label="Şirket Komisyonu" :value="formatCurrency(txn.owner_fee_amount) + ' ' + txn.currency" />
        </Section>

        <!-- Bank account routing.
             Deposit: this is OUR account that received the funds — show
               account holder so admin can verify.
             Withdrawal: this is the operator's source account — holder
               often differs from the operator (external/family account),
               so we omit it to avoid the misleading mismatch. Bank +
               IBAN are enough to identify the source. -->
        <Section v-if="txn.bank_account" :title="txn.type === 'deposit' ? 'Hedef Hesap (Bizden)' : 'Kullanılan Hesap'">
          <Row label="Banka" :value="txn.bank_account.bank_name" />
          <Row v-if="txn.type === 'deposit'" label="Hesap Sahibi" :value="txn.bank_account.account_holder" />
          <Row label="IBAN" :value="txn.bank_account.iban" mono copyable />
          <Row v-if="txn.bank_account.daily_limit" label="Günlük Limit" :value="formatCurrency(txn.bank_account.daily_limit) + ' ' + txn.currency" muted />
        </Section>

        <!-- Player bank info (withdrawals: where money goes — keep holder
             since this IS the customer we're paying out to). -->
        <Section v-if="txn.player_iban || txn.player_bank_name || txn.player_account_holder" title="Oyuncu Hesabı">
          <Row v-if="txn.player_account_holder" label="Hesap Sahibi" :value="txn.player_account_holder" />
          <Row v-if="txn.player_bank_resolved || txn.player_bank_name" label="Banka" :value="txn.player_bank_resolved || txn.player_bank_name" />
          <Row v-if="txn.player_iban" label="IBAN" :value="txn.player_iban" mono copyable />
        </Section>

        <!-- Manual payer (≥5k withdrawals — operator-supplied external
             account; holder name skipped for the same reason as above). -->
        <Section v-if="txn.payer_iban || txn.payer_bank_name" title="Kullanılan Hesap (Manuel)">
          <Row v-if="txn.payer_bank_name" label="Banka" :value="txn.payer_bank_name" />
          <Row v-if="txn.payer_iban" label="IBAN" :value="txn.payer_iban" mono copyable />
        </Section>

        <!-- Dekont quick action -->
        <Section v-if="txn.dekont_path || txn.dekont_url" title="Dekont">
          <div class="px-3 pb-3">
            <v-btn block size="small" variant="tonal" color="secondary" prepend-icon="mdi-file-eye" @click="$emit('preview-dekont', txn)">
              Dekontu İncele
            </v-btn>
          </div>
        </Section>

        <!-- Audit -->
        <Section title="Zaman & Kayıt">
          <Row label="Oluşturuldu" :value="formatDate(txn.created_at)" mono small />
          <Row v-if="txn.locked_at" label="Üzerine Alındı" :value="formatDate(txn.locked_at)" mono small />
          <Row v-if="txn.locker" label="İşleyen" :value="txn.locker.name" />
          <Row v-if="txn.proof_submitted_at" label="Dekont Gönderildi" :value="formatDate(txn.proof_submitted_at)" mono small />
          <Row v-if="txn.approved_at" label="Onaylandı" :value="formatDate(txn.approved_at)" mono small />
          <Row v-if="txn.approver" label="Onaylayan" :value="txn.approver.name" />
          <Row v-if="txn.resolved_at && txn.status === 'rejected'" label="Reddedildi" :value="formatDate(txn.resolved_at)" mono small />
          <Row v-if="txn.expires_at" label="Geçerlilik" :value="formatDate(txn.expires_at)" mono small />
        </Section>

        <!-- Internal IDs (always at the bottom, mono small) -->
        <Section title="Sistem">
          <Row label="UUID" :value="txn.id" mono small copyable />
          <Row v-if="txn.idempotency_key" label="Idempotency Key" :value="txn.idempotency_key" mono small copyable />
          <Row v-if="txn.notes" label="Notlar" :value="txn.notes" />
          <Row v-if="txn.rejection_reason" label="Red Sebebi" :value="txn.rejection_reason" />
        </Section>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  txn: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'preview-dekont'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(Number(amount) || 0)
}
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR')
}
function formatFee(amount, percent) {
  const pct = percent != null && Number(percent) > 0 ? ` (${Number(percent).toFixed(2)}%)` : ''
  return formatCurrency(amount) + ' ' + (props.txn?.currency || 'TRY') + pct
}
function hasFees(txn) {
  return [txn.merchant_fee_amount, txn.operator_fee_amount, txn.owner_fee_amount].some(v => v != null && Number(v) !== 0)
}
function customerFullName(txn) {
  const c = txn.customer
  if (!c) return '—'
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return full || c.name || c.external_id || '—'
}

// Status palette mirrors the table chips for visual continuity.
function statusColor(status) {
  const c = { pending: 'amber-darken-2', assigned: 'amber-darken-2', payment_seen: 'secondary', processing: 'warning', admin_review: 'purple-darken-2', approved: 'success', rejected: 'error', expired: 'grey-darken-1', cancelled: 'grey-darken-2' }
  return c[status] || 'grey'
}
function statusText(status) {
  const t = { pending: 'Beklemede', assigned: 'Yeni', payment_seen: 'Ödeme Görüldü', processing: 'İşlemde', admin_review: 'Yönetici Onayı', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu', cancelled: 'İptal Edildi' }
  return t[status] || status
}

// --- Tiny render helpers used in the template (declared as functional
// components so we can keep the markup uncluttered in the main template). ---
const Section = (props, { slots }) => h(
  'div',
  { class: 'drawer-section' },
  [
    h('div', { class: 'drawer-section-title' }, props.title),
    h('div', { class: 'drawer-section-body' }, slots.default ? slots.default() : []),
  ],
)
Section.props = ['title']

const Row = (rowProps) => {
  const value = rowProps.value
  if (value === null || value === undefined || value === '') return null
  const valueClasses = ['drawer-row-value']
  if (rowProps.mono) valueClasses.push('drawer-row-value--mono')
  if (rowProps.small) valueClasses.push('drawer-row-value--small')
  if (rowProps.muted) valueClasses.push('drawer-row-value--muted')
  if (rowProps.highlight) valueClasses.push('drawer-row-value--highlight')

  const valueChildren = [String(value)]
  if (rowProps.copyable) {
    valueChildren.push(h('button', {
      class: 'drawer-copy-btn',
      title: 'Kopyala',
      onClick: async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(String(value))
          const btn = e.currentTarget
          btn.classList.add('drawer-copy-btn--ok')
          setTimeout(() => btn.classList.remove('drawer-copy-btn--ok'), 1200)
        } catch { /* clipboard denied */ }
      },
    }, '⧉'))
  }
  return h('div', { class: 'drawer-row' }, [
    h('div', { class: 'drawer-row-label' }, rowProps.label),
    h('div', { class: valueClasses.join(' ') }, valueChildren),
  ])
}
Row.props = ['label', 'value', 'mono', 'small', 'muted', 'highlight', 'copyable']
</script>

<style scoped>
.txn-detail-drawer {
  background: var(--sp-surface) !important;
  border-left: 1px solid var(--sp-card-border) !important;
}

.drawer-header {
  padding: 16px 18px 18px;
  background: linear-gradient(180deg, rgba(102,241,189, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid var(--sp-card-border);
}
.drawer-header--deposit { background: linear-gradient(180deg, rgba(102,241,189, 0.10) 0%, transparent 100%); }
.drawer-header--withdrawal { background: linear-gradient(180deg, rgba(112,169,255, 0.10) 0%, transparent 100%); }
.drawer-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--sp-text-muted);
}
.drawer-amount {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--sp-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.drawer-amount-cur {
  font-size: 14px;
  font-weight: 700;
  color: var(--sp-text-muted);
  margin-left: 4px;
}
.drawer-id-row {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--sp-text-muted);
}
.drawer-id { font-weight: 700; color: var(--sp-text); }
.drawer-id-ref { color: var(--sp-text-hint); margin-left: 4px; }

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 24px;
}

.drawer-section {
  margin-top: 14px;
}
.drawer-section-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-hint);
  padding: 0 18px 6px;
  border-bottom: 1px solid var(--sp-card-border);
  margin-bottom: 4px;
}
.drawer-section-body {
  padding: 0 4px;
}

:deep(.drawer-row) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  border-radius: 6px;
}
:deep(.drawer-row:hover) { background: rgba(102,241,189, 0.05); }
:deep(.drawer-row-label) {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 110px;
}
:deep(.drawer-row-value) {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  text-align: right;
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
:deep(.drawer-row-value--mono) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 500;
}
:deep(.drawer-row-value--small) { font-size: 11.5px; }
:deep(.drawer-row-value--muted) { color: var(--sp-text-muted); font-weight: 500; }
:deep(.drawer-row-value--highlight) {
  color: var(--sp-accent-success-bright);
  font-size: 14px;
  font-weight: 800;
}

:deep(.drawer-copy-btn) {
  background: rgba(102,241,189, 0.12);
  border: 0;
  color: var(--sp-accent-blue);
  width: 18px; height: 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
:deep(.drawer-copy-btn:hover) { background: rgba(102,241,189, 0.22); }
:deep(.drawer-copy-btn--ok) {
  background: rgba(102,241,189, 0.18);
  color: var(--sp-accent-success-bright);
}
</style>
