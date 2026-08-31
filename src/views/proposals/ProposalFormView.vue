<template>
  <div>
    <div class="d-flex align-center mb-4 ga-2">
      <v-btn icon variant="text" size="small" @click="router.back()"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <div class="text-h6 font-weight-bold" style="color: var(--sp-text)">{{ editing ? 'Teklif Düzenle' : 'Yeni Teklif' }}</div>
      <v-spacer />
      <v-btn-toggle v-model="lang" density="compact" mandatory variant="outlined" divided color="primary">
        <v-btn value="tr" size="small">TR</v-btn>
        <v-btn value="en" size="small">EN</v-btn>
      </v-btn-toggle>
    </div>

    <div class="d-flex ga-4 flex-wrap" style="align-items: flex-start">
      <!-- Form -->
      <v-card class="flex-grow-1" style="min-width: 340px; max-width: 480px">
        <v-card-text class="pa-5">
          <div class="form-section-title">BAYI BİLGİLERİ</div>
          <v-text-field v-model="form.merchant_name" label="Bayi Adı *" variant="outlined" density="compact" class="mb-2" />
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="form.contact_name" label="İletişim Kişisi" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model="form.contact_email" label="E-posta" variant="outlined" density="compact" /></v-col>
          </v-row>

          <div class="form-section-title mt-4">ÖDEME YÖNTEMİ</div>
          <v-text-field v-model="form.payment_method" label="Ödeme Yöntemi" variant="outlined" density="compact" class="mb-2" />

          <div class="form-section-title mt-4">KOMİSYON ORANLARI</div>
          <v-row dense>
            <v-col cols="4"><v-text-field v-model.number="form.deposit_fee_percent" label="Yatırım %" type="number" step="0.01" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-text-field v-model.number="form.withdrawal_fee_percent" label="Çekim %" type="number" step="0.01" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-text-field v-model.number="form.settlement_fee_percent" label="Mutabakat %" type="number" step="0.01" variant="outlined" density="compact" /></v-col>
          </v-row>

          <div class="form-section-title mt-4">İŞLEM LİMİTLERİ</div>
          <v-row dense>
            <v-col cols="6"><v-text-field v-model.number="form.min_deposit_amount" label="Min Yatırım" type="number" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model.number="form.max_deposit_amount" label="Max Yatırım" type="number" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model.number="form.min_withdrawal_amount" label="Min Çekim" type="number" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-text-field v-model.number="form.max_withdrawal_amount" label="Max Çekim" type="number" variant="outlined" density="compact" /></v-col>
          </v-row>

          <div class="form-section-title mt-4">MUTABAKAT</div>
          <v-row dense>
            <v-col cols="4"><v-text-field v-model="form.settlement_method" label="Yöntem" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-text-field v-model="form.settlement_networks" label="Ağlar" variant="outlined" density="compact" placeholder="TRC20" /></v-col>
            <v-col cols="4"><v-text-field v-model="form.currency" label="Para Birimi" variant="outlined" density="compact" /></v-col>
          </v-row>

          <div class="form-section-title mt-4">DİĞER</div>
          <v-text-field v-model="form.valid_until" label="Geçerlilik Tarihi" type="date" variant="outlined" density="compact" class="mb-2" />
          <div class="d-flex align-center ga-2 mb-2">
            <v-btn variant="tonal" color="primary" size="x-small" @click="applyTemplate">
              <v-icon start size="14">mdi-file-document-outline</v-icon> Şablon Kullan ({{ lang.toUpperCase() }})
            </v-btn>
          </div>
          <v-textarea v-model="form.notes" label="Notlar / Özel Koşullar" variant="outlined" density="compact" rows="12" />

          <div class="d-flex ga-2 mt-4">
            <v-btn color="primary" variant="elevated" @click="save('draft')" :loading="saving" class="flex-grow-1">
              <v-icon start>mdi-content-save</v-icon> Taslak Kaydet
            </v-btn>
            <v-btn color="success" variant="elevated" @click="save('sent')" :loading="saving" class="flex-grow-1">
              <v-icon start>mdi-send</v-icon> Kaydet & Gönder
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Live Preview -->
      <div class="flex-grow-1" style="min-width: 440px">
        <div class="offer-page">
          <div class="offer-top-accent"></div>

          <!-- Header -->
          <div class="offer-header">
            <div class="offer-logo-wrap"><img src="/saniye-logo.png" alt="SaniyePay" class="offer-logo" /></div>
            <div class="offer-header-meta">
              <div class="offer-doc-type">{{ t.docType }}</div>
              <div v-if="form.valid_until" class="offer-doc-valid">{{ t.validUntil }}: {{ formatDate(form.valid_until) }}</div>
            </div>
          </div>

          <!-- Merchant hero -->
          <div class="offer-hero">
            <div class="offer-hero-label">{{ t.preparedFor }}</div>
            <div class="offer-hero-name">{{ form.merchant_name || t.merchantPlaceholder }}</div>
            <div class="offer-hero-details">
              <span v-if="form.contact_name">{{ form.contact_name }}</span>
              <span v-if="form.contact_name && form.contact_email"> · </span>
              <span v-if="form.contact_email" style="color: var(--sp-accent-cyan)">{{ form.contact_email }}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="offer-label">{{ t.paymentMethod }}</div>
          <div class="offer-method">
            <div class="method-icon">⚡</div>
            <div class="method-text">{{ form.payment_method || t.paymentMethodPlaceholder }}</div>
          </div>

          <!-- Rates -->
          <div class="offer-label">{{ t.commissionRates }}</div>
          <div class="offer-rates">
            <div class="rate-card rate-deposit">
              <div class="rate-badge">{{ t.deposit }}</div>
              <div class="rate-value">%{{ form.deposit_fee_percent || 0 }}</div>
              <div class="rate-bar"><div class="rate-bar-fill rate-bar-green" :style="{ width: Math.min(form.deposit_fee_percent * 10, 100) + '%' }"></div></div>
            </div>
            <div class="rate-card rate-withdrawal">
              <div class="rate-badge">{{ t.withdrawal }}</div>
              <div class="rate-value">%{{ form.withdrawal_fee_percent || 0 }}</div>
              <div class="rate-bar"><div class="rate-bar-fill rate-bar-blue" :style="{ width: Math.min(form.withdrawal_fee_percent * 10, 100) + '%' }"></div></div>
            </div>
            <div class="rate-card rate-settlement">
              <div class="rate-badge">{{ t.settlement }}</div>
              <div class="rate-value">%{{ form.settlement_fee_percent || 0 }}</div>
              <div class="rate-bar"><div class="rate-bar-fill rate-bar-purple" :style="{ width: Math.min(form.settlement_fee_percent * 10, 100) + '%' }"></div></div>
            </div>
          </div>

          <!-- Limits -->
          <div class="offer-label">{{ t.transactionLimits }}</div>
          <div class="offer-limits">
            <div class="limit-card">
              <div class="limit-card-header"><div class="limit-card-icon limit-icon-green">↓</div><span>{{ t.depositLabel }}</span></div>
              <div class="limit-card-body">
                <div class="limit-item"><span class="limit-item-label">Min</span><span class="limit-item-value">{{ form.min_deposit_amount ? fmtAmount(form.min_deposit_amount) : t.noLimit }} <span class="limit-item-curr" v-if="form.min_deposit_amount">{{ form.currency }}</span></span></div>
                <div class="limit-divider"></div>
                <div class="limit-item"><span class="limit-item-label">Maks</span><span class="limit-item-value">{{ form.max_deposit_amount ? fmtAmount(form.max_deposit_amount) : t.noLimit }} <span class="limit-item-curr" v-if="form.max_deposit_amount">{{ form.currency }}</span></span></div>
              </div>
            </div>
            <div class="limit-card">
              <div class="limit-card-header"><div class="limit-card-icon limit-icon-blue">↑</div><span>{{ t.withdrawalLabel }}</span></div>
              <div class="limit-card-body">
                <div class="limit-item"><span class="limit-item-label">Min</span><span class="limit-item-value">{{ form.min_withdrawal_amount ? fmtAmount(form.min_withdrawal_amount) : t.noLimit }} <span class="limit-item-curr" v-if="form.min_withdrawal_amount">{{ form.currency }}</span></span></div>
                <div class="limit-divider"></div>
                <div class="limit-item"><span class="limit-item-label">Maks</span><span class="limit-item-value">{{ form.max_withdrawal_amount ? fmtAmount(form.max_withdrawal_amount) : t.noLimit }} <span class="limit-item-curr" v-if="form.max_withdrawal_amount">{{ form.currency }}</span></span></div>
              </div>
            </div>
          </div>

          <!-- Settlement -->
          <div class="offer-label">{{ t.settlement }}</div>
          <div class="offer-settle-row">
            <div class="settle-chip"><span class="settle-chip-label">{{ t.method }}</span>{{ form.settlement_method }}</div>
            <div class="settle-chip"><span class="settle-chip-label">{{ t.networks }}</span>{{ form.settlement_networks || 'TRC20' }}</div>
            <div class="settle-chip"><span class="settle-chip-label">{{ t.settleCurrency }}</span>{{ form.currency }}</div>
          </div>

          <!-- Notes -->
          <div v-if="form.notes" style="padding: 0 28px; margin-top: 16px">
            <div class="offer-label" style="padding: 0">{{ t.notes }}</div>
            <div class="offer-notes" v-html="renderNotes(form.notes)"></div>
          </div>

          <!-- Footer -->
          <div class="offer-footer">
            <div class="offer-footer-gradient"></div>
            <div v-if="form.valid_until" class="offer-footer-valid">{{ t.footerValid(formatDate(form.valid_until)) }}</div>
            <div class="offer-footer-inner">
              <div class="offer-footer-brand">
                <div class="offer-footer-logo-wrap"><img src="/saniye-logo.png" alt="" class="offer-footer-logo" /></div>
                <span>SaniyePay Payment Solutions</span>
              </div>
              <div class="offer-footer-contact">
                <span>saniyepay.com</span>
                <span class="offer-footer-sep">·</span>
                <span>info@saniyepay.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/plugins/axios'

const router = useRouter()
const route = useRoute()
const editing = ref(false)
const saving = ref(false)
const lang = ref('tr')

const form = reactive({
  merchant_name: '', contact_name: '', contact_email: '',
  lang: 'tr',
  payment_method: 'Hızlı Havale (FAST)',
  deposit_fee_percent: 0, withdrawal_fee_percent: 0, settlement_fee_percent: 0,
  min_deposit_amount: null, max_deposit_amount: null,
  min_withdrawal_amount: null, max_withdrawal_amount: null,
  settlement_method: 'TRX', settlement_networks: 'TRC20', currency: 'TRY',
  notes: '', valid_until: '',
})

const i18n = {
  tr: {
    docType: 'TEKLİF',
    validUntil: 'Son Geçerlilik',
    preparedFor: 'Hazırlanan Firma',
    merchantPlaceholder: 'Bayi Adı',
    paymentMethod: 'Ödeme Yöntemi',
    paymentMethodPlaceholder: 'Hızlı Havale (FAST)',
    commissionRates: 'Komisyon Oranları',
    deposit: 'YATIRIM',
    withdrawal: 'ÇEKİM',
    settlement: 'MUTABAKAT',
    transactionLimits: 'İşlem Limitleri',
    depositLabel: 'Yatırım',
    withdrawalLabel: 'Çekim',
    noLimit: 'Limit yok',
    method: 'Yöntem',
    networks: 'Ağlar',
    settleCurrency: 'Para Birimi',
    notes: 'Notlar ve Özel Koşullar',
    footerValid: (d) => `Bu teklif ${d} tarihine kadar geçerlidir.`,
  },
  en: {
    docType: 'PROPOSAL',
    validUntil: 'Valid Until',
    preparedFor: 'Prepared For',
    merchantPlaceholder: 'Company Name',
    paymentMethod: 'Payment Method',
    paymentMethodPlaceholder: 'Fast Bank Transfer (FAST)',
    commissionRates: 'Commission Rates',
    deposit: 'DEPOSIT',
    withdrawal: 'WITHDRAWAL',
    settlement: 'SETTLEMENT',
    transactionLimits: 'Transaction Limits',
    depositLabel: 'Deposit',
    withdrawalLabel: 'Withdrawal',
    noLimit: 'No limit',
    method: 'Method',
    networks: 'Networks',
    settleCurrency: 'Currency',
    notes: 'Notes & Special Conditions',
    footerValid: (d) => `This proposal is valid until ${d}.`,
  },
}

const t = computed(() => i18n[lang.value])

watch(lang, (v) => { form.lang = v })
watch(() => form.lang, (v) => { if (v && v !== lang.value) lang.value = v })

const notesTemplates = {
  tr: `**Mutabakat Koşulları**
• Saat 19:00'a kadar oluşturulan mutabakat talepleri, aynı gün saat 23:59'a kadar tamamlanır.
• Minimum mutabakat tutarı 1.000 USDT karşılığıdır.
• TRX (TRC20) ile yapılan mutabakatlarda en düşük komisyon oranı uygulanır. USDT ve diğer kripto para birimleri ile yapılan mutabakatlarda %0,50 ek komisyon yansıtılır.
• Mutabakat işlemlerinde Binance kuru, işlemin gerçekleştiği andaki anlık kur üzerinden hesaplanır. Bayi panelinde talep oluşturulurken gösterilen kur oranı yalnızca bilgilendirme amaçlıdır.
• Desteklenen kripto para birimleri: TRX, USDT, BTC, ETH, SOL, XRP, AVAX, DOGE.

**İşlem Süreleri**
• İşlem onaylanma süresi, mücbir sebepler dışında 5 dakikayı geçmemektedir.

**Entegrasyon**
• Platform yalnızca API (H2H) entegrasyonu ile çalışmakta olup manuel yatırım ve çekim işlemi yapılmamaktadır. Mutabakat modülü isteğe bağlıdır.
• API entegrasyonu kolaylaştırılmış olup bayi panelinden sunulan sandbox erişimi sayesinde yazılımcılar entegrasyon sürecini en kısa sürede tamamlayabilmektedir.

**Genel Koşullar**
• Komisyon oranları, piyasa koşulları veya mücbir sebepler doğrultusunda 30 gün önceden yazılı bildirim yapılmak kaydıyla revize edilebilir.
• Yatırım alt limitleri mücbir sebepler durumunda önceden haber verilmeksizin değişebilmektedir. Bu durumda bayi, limit değişiminden anında haberdar edilecek ve yeni limit derhal uygulamaya alınacaktır.`,
  en: `**Settlement Terms**
• Settlement requests submitted by 19:00 are completed by 23:59 on the same day.
• The minimum settlement amount is the equivalent of 1,000 USDT.
• Settlements made in TRX (TRC20) benefit from the lowest commission rate. Settlements in USDT and other cryptocurrencies are subject to an additional 0.50% fee.
• Settlement conversions are calculated using the Binance rate at the exact moment of execution. The exchange rate displayed in the merchant panel at the time of request is for informational purposes only.
• Supported cryptocurrencies: TRX, USDT, BTC, ETH, SOL, XRP, AVAX, DOGE.

**Processing Times**
• Transaction approval time does not exceed 5 minutes, except in cases of force majeure.

**Integration**
• The platform operates exclusively via API (H2H) integration; manual deposit and withdrawal processing is not supported. The settlement module is optional.
• API integration has been streamlined, and sandbox access is available directly from the merchant panel, enabling developers to complete the integration process in the shortest possible time.

**General Terms**
• Commission rates may be revised due to market conditions or force majeure, provided that written notice is given at least 30 days in advance.
• Deposit minimum limits are subject to change without prior notice in cases of force majeure. In such cases, the merchant will be notified immediately, and the new limit will take effect right away.`,
}

function applyTemplate() {
  form.notes = notesTemplates[lang.value]
}

function renderNotes(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

const today = new Date().toLocaleDateString('tr-TR')
function formatDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR') : '--' }
function fmtAmount(v) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(v || 0) }

async function save(status) {
  if (!form.merchant_name) return alert('Bayi adı zorunludur.')
  saving.value = true
  try {
    const payload = { ...form, status }
    if (editing.value) {
      await api.put(`/portal/proposals/${route.params.id}`, payload)
      if (status === 'sent') await api.patch(`/portal/proposals/${route.params.id}/status`, { status: 'sent' })
    } else {
      await api.post('/portal/proposals', payload)
    }
    router.push({ name: 'Proposals' })
  } catch (e) { alert(e.response?.data?.message || 'Hata oluştu') }
  finally { saving.value = false }
}

onMounted(async () => {
  if (route.params.id) {
    editing.value = true
    const { data } = await api.get(`/portal/proposals/${route.params.id}`)
    Object.assign(form, data)
    form.valid_until = data.valid_until ? data.valid_until.split('T')[0] : ''
    if (data.lang) lang.value = data.lang
  }
})
</script>

<style scoped>
.form-section-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--sp-text-muted); margin-bottom: 10px; }

/* ═══ OFFER PAGE ═══ */
.offer-page {
  width: 210mm; min-height: 297mm; max-width: 100%;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 2px 24px rgba(0,0,0,0.08);
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #0F172A;
  display: flex; flex-direction: column;
}

/* Top accent */
.offer-top-accent { height: 8px; background: linear-gradient(90deg, var(--sp-primary), var(--sp-accent-blue), var(--sp-accent-cyan), var(--sp-accent-success)); }

/* Header */
.offer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px 0;
}
.offer-logo-wrap { width: 220px; height: 80px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.offer-logo { height: 200px; object-fit: contain; }
.offer-header-meta { text-align: right; }
.offer-doc-type {
  font-size: 10px; font-weight: 800; letter-spacing: 4px;
  background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent-blue));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 4px;
}
.offer-doc-date { font-size: 12px; color: var(--sp-text-muted); }
.offer-doc-valid { font-size: 11px; color: var(--sp-accent-cyan); font-weight: 600; margin-top: 2px; }

/* Merchant hero */
.offer-hero {
  margin: 20px 28px; padding: 24px 28px;
  background: linear-gradient(135deg, #0F172A 0%, var(--sp-surface-variant) 100%);
  border-radius: 0; color: #FFFFFF;
  position: relative; overflow: hidden;
}
.offer-hero::before {
  content: ''; position: absolute; right: -40px; top: -40px;
  width: 160px; height: 160px; border-radius: 50%;
  background: radial-gradient(circle, rgba(102,241,189,0.2) 0%, transparent 70%);
}
.offer-hero::after {
  content: ''; position: absolute; left: -20px; bottom: -20px;
  width: 100px; height: 100px; border-radius: 50%;
  background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
}
.offer-hero-label {
  font-size: 9px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 6px;
}
.offer-hero-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; position: relative; z-index: 1; }
.offer-hero-details { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 6px; position: relative; z-index: 1; }

/* Section label */
.offer-label {
  font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
  color: var(--sp-primary); padding: 0 28px; margin-bottom: 10px; margin-top: 22px;
}

/* Payment method */
.offer-method {
  display: flex; align-items: center; gap: 12px;
  margin: 0 28px; padding: 14px 18px; border-radius: 0;
  background: linear-gradient(135deg, var(--sp-success-bg) 0%, var(--sp-success-bg) 100%);
  border: 1px solid var(--sp-success-bg);
}
.method-icon { font-size: 20px; }
.method-text { font-size: 15px; font-weight: 700; color: var(--sp-accent-success); letter-spacing: -0.2px; }

/* Rate cards */
.offer-rates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 0 28px; }
.rate-card {
  padding: 16px; border-radius: 0; text-align: center;
  background: #F8FAFC; border: 1px solid #E2E8F0;
}
.rate-badge {
  font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
  display: inline-block; padding: 2px 10px; border-radius: 0; margin-bottom: 8px;
}
.rate-deposit .rate-badge { background: rgba(102,241,189,0.1); color: var(--sp-accent-success); }
.rate-withdrawal .rate-badge { background: rgba(112,169,255,0.1); color: var(--sp-accent-info); }
.rate-settlement .rate-badge { background: rgba(102,241,189,0.1); color: var(--sp-primary); }
.rate-value { font-size: 32px; font-weight: 900; color: #0F172A; letter-spacing: -1.5px; line-height: 1; margin-bottom: 10px; }
.rate-bar { height: 4px; background: #E2E8F0; border-radius: 0; overflow: hidden; }
.rate-bar-fill { height: 100%; border-radius: 0; transition: width 0.3s; min-width: 4px; }
.rate-bar-green { background: linear-gradient(90deg, var(--sp-accent-success), var(--sp-accent-success)); }
.rate-bar-blue { background: linear-gradient(90deg, var(--sp-accent-blue), var(--sp-accent-blue)); }
.rate-bar-purple { background: linear-gradient(90deg, var(--sp-primary), var(--sp-accent-purple)); }

/* Limits */
.offer-limits { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 28px; }
.limit-card { border-radius: 0; background: #F8FAFC; border: 1px solid #E2E8F0; overflow: hidden; }
.limit-card-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px 0; font-weight: 700; font-size: 13px; color: var(--sp-surface-variant); }
.limit-card-icon { width: 26px; height: 26px; border-radius: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; }
.limit-icon-green { background: rgba(102,241,189,0.12); color: var(--sp-accent-success); }
.limit-icon-blue { background: rgba(112,169,255,0.12); color: var(--sp-accent-info); }
.limit-card-body { padding: 10px 16px 14px; }
.limit-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.limit-item-label { font-size: 11px; font-weight: 600; color: var(--sp-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.limit-item-value { font-size: 16px; font-weight: 800; color: #0F172A; }
.limit-item-curr { font-size: 11px; font-weight: 600; color: var(--sp-text-muted); margin-left: 3px; }
.limit-divider { height: 1px; background: #E2E8F0; margin: 2px 0; }

/* Settlement chips */
.offer-settle-row { display: flex; gap: 10px; padding: 0 28px; flex-wrap: wrap; }
.settle-chip {
  flex: 1; min-width: 90px; padding: 12px 16px; border-radius: 0;
  background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
  border: 1px solid #E2E8F0; font-size: 15px; font-weight: 700; color: #0F172A;
}
.settle-chip-label {
  display: block; font-size: 9px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--sp-text-muted); margin-bottom: 4px;
}

/* Notes */
.offer-notes {
  white-space: pre-wrap; background: var(--sp-warning-bg); border: 1px solid var(--sp-warning-bg);
  border-radius: 0; padding: 12px 16px; font-size: 12px; color: var(--sp-accent-amber); line-height: 1.6;
}

/* Footer */
.offer-footer { margin-top: auto; padding: 0 28px 24px; }
.offer-footer-gradient {
  height: 3px; border-radius: 0; margin-bottom: 16px;
  background: linear-gradient(90deg, var(--sp-primary), var(--sp-accent-blue), var(--sp-accent-cyan), var(--sp-accent-success));
}
.offer-footer-inner { display: flex; justify-content: space-between; align-items: center; }
.offer-footer-valid { font-size: 11px; color: #64748B; margin-bottom: 10px; }
.offer-footer-contact { font-size: 10px; font-weight: 500; color: var(--sp-text-muted); }
.offer-footer-sep { margin: 0 6px; color: #CBD5E1; }
.offer-footer-brand {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.5px; color: var(--sp-text-muted);
}
.offer-footer-logo-wrap { width: 60px; height: 20px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.offer-footer-logo { height: 60px; object-fit: contain; }

@media (max-width: 960px) {
  .offer-rates { grid-template-columns: 1fr; }
}
</style>
