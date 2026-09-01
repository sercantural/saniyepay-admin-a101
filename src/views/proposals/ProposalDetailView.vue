<template>
  <div>
    <div class="d-flex align-center mb-4 ga-2 flex-wrap" v-if="p">
      <v-btn icon variant="text" size="small" @click="router.back()"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <div class="text-h6 font-weight-bold" style="color: var(--sp-text)">Teklif #{{ p.id }}</div>
      <v-chip :color="sColor(p.status)" variant="flat" size="small" label class="font-weight-bold ml-2">{{ sLabel(p.status) }}</v-chip>
      <v-spacer />
      <v-btn v-if="can('proposals.change_status') && p.status==='draft'" variant="tonal" color="info" size="small" @click="setStatus('sent')" :loading="acting" class="mr-1"><v-icon start size="16">mdi-send</v-icon> Gönderildi</v-btn>
      <v-btn v-if="can('proposals.change_status') && p.status==='sent'" variant="tonal" color="success" size="small" @click="setStatus('accepted')" :loading="acting" class="mr-1"><v-icon start size="16">mdi-check-circle</v-icon> Kabul</v-btn>
      <v-btn v-if="can('proposals.change_status') && p.status==='sent'" variant="tonal" color="error" size="small" @click="setStatus('rejected')" :loading="acting" class="mr-1"><v-icon start size="16">mdi-close-circle</v-icon> Red</v-btn>
      <v-btn v-if="p.status==='draft'" variant="tonal" size="small" :to="{ name: 'ProposalEdit', params: { id: p.id } }" class="mr-1"><v-icon start size="16">mdi-pencil</v-icon> Düzenle</v-btn>
      <v-btn variant="tonal" color="primary" size="small" @click="printIt" class="mr-1"><v-icon start size="16">mdi-printer</v-icon> Yazdır</v-btn>
      <v-btn variant="elevated" color="error" size="small" @click="downloadPdf" :loading="downloading" class="mr-1"><v-icon start size="16">mdi-file-pdf-box</v-icon> PDF</v-btn>
      <v-btn variant="elevated" color="info" size="small" @click="downloadWord" :loading="downloadingWord"><v-icon start size="16">mdi-file-word</v-icon> Word</v-btn>
    </div>

    <div v-if="p" id="proposal-print" class="offer-page">
      <div class="offer-top-accent"></div>

      <div class="offer-header">
        <div class="offer-logo-wrap"><img src="/saniye-logo.png" alt="SaniyePay" class="offer-logo" /></div>
        <div class="offer-header-meta">
          <div class="offer-doc-type">{{ t.docType }}</div>
          <div v-if="p.valid_until" class="offer-doc-valid">{{ t.validUntil }}: {{ fmtDate(p.valid_until) }}</div>
        </div>
      </div>

      <div class="offer-hero">
        <div class="offer-hero-label">{{ t.preparedFor }}</div>
        <div class="offer-hero-name">{{ p.merchant_name }}</div>
        <div class="offer-hero-details">
          <span v-if="p.contact_name">{{ p.contact_name }}</span>
          <span v-if="p.contact_name && p.contact_email"> · </span>
          <span v-if="p.contact_email" style="color: var(--sp-accent-cyan)">{{ p.contact_email }}</span>
        </div>
      </div>

      <div class="offer-label">{{ t.paymentMethod }}</div>
      <div class="offer-method">
        <div class="method-icon">⚡</div>
        <div class="method-text">{{ p.payment_method || t.paymentMethodDefault }}</div>
      </div>

      <div class="offer-label">{{ t.commissionRates }}</div>
      <div class="offer-rates">
        <div class="rate-card rate-deposit"><div class="rate-badge">{{ t.deposit }}</div><div class="rate-value">%{{ p.deposit_fee_percent }}</div><div class="rate-bar"><div class="rate-bar-fill rate-bar-green" :style="{ width: Math.min(p.deposit_fee_percent*10,100)+'%' }"></div></div></div>
        <div class="rate-card rate-withdrawal"><div class="rate-badge">{{ t.withdrawal }}</div><div class="rate-value">%{{ p.withdrawal_fee_percent }}</div><div class="rate-bar"><div class="rate-bar-fill rate-bar-blue" :style="{ width: Math.min(p.withdrawal_fee_percent*10,100)+'%' }"></div></div></div>
        <div class="rate-card rate-settlement"><div class="rate-badge">{{ t.settlement }}</div><div class="rate-value">%{{ p.settlement_fee_percent }}</div><div class="rate-bar"><div class="rate-bar-fill rate-bar-purple" :style="{ width: Math.min(p.settlement_fee_percent*10,100)+'%' }"></div></div></div>
      </div>

      <div class="offer-label">{{ t.transactionLimits }}</div>
      <div class="offer-limits">
        <div class="limit-card limit-card-deposit">
          <div class="limit-card-header"><div class="limit-card-icon limit-icon-green">↓</div><span>{{ t.depositLabel }}</span></div>
          <div class="limit-card-body">
            <div class="limit-item"><span class="limit-item-label">Min</span><span class="limit-item-value">{{ p.min_deposit_amount ? fmtAmt(p.min_deposit_amount) : t.noLimit }} <span class="limit-item-curr" v-if="p.min_deposit_amount">{{ p.currency }}</span></span></div>
            <div class="limit-divider"></div>
            <div class="limit-item"><span class="limit-item-label">Maks</span><span class="limit-item-value">{{ p.max_deposit_amount ? fmtAmt(p.max_deposit_amount) : t.noLimit }} <span class="limit-item-curr" v-if="p.max_deposit_amount">{{ p.currency }}</span></span></div>
          </div>
        </div>
        <div class="limit-card limit-card-withdrawal">
          <div class="limit-card-header"><div class="limit-card-icon limit-icon-blue">↑</div><span>{{ t.withdrawalLabel }}</span></div>
          <div class="limit-card-body">
            <div class="limit-item"><span class="limit-item-label">Min</span><span class="limit-item-value">{{ p.min_withdrawal_amount ? fmtAmt(p.min_withdrawal_amount) : t.noLimit }} <span class="limit-item-curr" v-if="p.min_withdrawal_amount">{{ p.currency }}</span></span></div>
            <div class="limit-divider"></div>
            <div class="limit-item"><span class="limit-item-label">Maks</span><span class="limit-item-value">{{ p.max_withdrawal_amount ? fmtAmt(p.max_withdrawal_amount) : t.noLimit }} <span class="limit-item-curr" v-if="p.max_withdrawal_amount">{{ p.currency }}</span></span></div>
          </div>
        </div>
      </div>

      <div class="offer-label">{{ t.settlement }}</div>
      <div class="offer-settle-row">
        <div class="settle-chip"><span class="settle-chip-label">{{ t.method }}</span>{{ p.settlement_method }}</div>
        <div class="settle-chip"><span class="settle-chip-label">{{ t.networks }}</span>{{ p.settlement_networks || 'TRC20' }}</div>
        <div class="settle-chip"><span class="settle-chip-label">{{ t.currency }}</span>{{ p.currency }}</div>
      </div>

      <div v-if="p.notes" style="padding: 0 24px; margin-top: 8px">
        <div class="offer-label" style="padding:0">{{ t.notes }}</div>
        <div class="offer-notes" v-html="renderNotes(p.notes)"></div>
      </div>

      <div class="offer-footer">
        <div class="offer-footer-gradient"></div>
        <div v-if="p.valid_until" class="offer-footer-valid">{{ t.footerValid(fmtDate(p.valid_until)) }}</div>
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

    <div v-else class="d-flex justify-center py-12"><v-progress-circular indeterminate color="primary" size="48" /></div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
// docx + file-saver are dynamically imported in downloadWord() to reduce initial chunk size
import api from '@/plugins/axios'

const auth = useAuthStore()
// Ekran ici eylemler de izne bagli.
const can = (p) => auth.can(p) || auth.isSuperAdmin

const router = useRouter(), route = useRoute()
const p = ref(null), acting = ref(false), downloading = ref(false), downloadingWord = ref(false)

const i18n = {
  tr: {
    docType: 'TEKLİF',
    validUntil: 'Son Geçerlilik',
    preparedFor: 'Hazırlanan Firma',
    paymentMethod: 'Ödeme Yöntemi',
    paymentMethodDefault: 'Hızlı Havale (FAST)',
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
    currency: 'Para Birimi',
    notes: 'Notlar ve Özel Koşullar',
    footerValid: (d) => `Bu teklif ${d} tarihine kadar geçerlidir.`,
  },
  en: {
    docType: 'PROPOSAL',
    validUntil: 'Valid Until',
    preparedFor: 'Prepared For',
    paymentMethod: 'Payment Method',
    paymentMethodDefault: 'Fast Bank Transfer (FAST)',
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
    currency: 'Currency',
    notes: 'Notes & Special Conditions',
    footerValid: (d) => `This proposal is valid until ${d}.`,
  },
}

const t = computed(() => i18n[p.value?.lang || 'tr'])

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR') : '--' }
function renderNotes(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
function fmtAmt(v) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(v || 0) }
function sColor(s) { return { draft:'secondary', sent:'info', accepted:'success', rejected:'error' }[s] || 'grey' }
function sLabel(s) { return { draft:'Taslak', sent:'Gönderildi', accepted:'Kabul Edildi', rejected:'Reddedildi' }[s] || s }

async function setStatus(status) {
  acting.value = true
  try { const { data } = await api.patch(`/portal/proposals/${route.params.id}/status`, { status }); p.value = data }
  finally { acting.value = false }
}

async function downloadPdf() {
  downloading.value = true
  try {
    const el = document.getElementById('proposal-print')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    let y = 0
    while (y < h) { if (y > 0) pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -y, w, h); y += pdf.internal.pageSize.getHeight() }
    pdf.save(`Teklif-${p.value.id}-${p.value.merchant_name.replace(/\s+/g, '_')}.pdf`)
  } catch { alert('PDF hatası') }
  finally { downloading.value = false }
}

async function downloadWord() {
  downloadingWord.value = true
  try {
    // Convert logo to base64 so Word can display it
    let logoBase64 = ''
    try {
      const logoRes = await fetch('/saniye-logo.png')
      const logoBlob = await logoRes.blob()
      logoBase64 = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(logoBlob)
      })
    } catch {}

    // Clone the on-screen HTML and replace logo src with base64
    const el = document.getElementById('proposal-print')
    let content = el.outerHTML
    if (logoBase64) {
      content = content.replace(/src="\/saniye-logo\.png"/g, `src="${logoBase64}"`)
    }

    // Word-compatible CSS (no CSS variables, no gradients Word can't handle)
    const wordCSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Calibri','Inter',sans-serif;color:#0F172A}
.offer-page{background:#fff;display:block;width:100%}
.offer-top-accent{height:6px;background:var(--sp-primary)}
.offer-header{display:flex;justify-content:space-between;align-items:center;padding:14px 24px 0}
.offer-logo-wrap{width:180px;height:55px;overflow:hidden}.offer-logo{height:55px;object-fit:contain}
.offer-header-meta{text-align:right}
.offer-doc-type{font-size:9px;font-weight:800;letter-spacing:4px;color:var(--sp-primary);margin-bottom:2px}
.offer-doc-valid{font-size:10px;color:var(--sp-accent-cyan);font-weight:600;margin-top:1px}
.offer-hero{margin:10px 24px;padding:16px 22px;background:#0F172A;border-radius:0;color:#fff}
.offer-hero-label{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:4px}
.offer-hero-name{font-size:20px;font-weight:900;letter-spacing:-0.5px}
.offer-hero-details{font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px}
.offer-label{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--sp-primary);padding:0 24px;margin-bottom:6px;margin-top:12px}
.offer-method{display:flex;align-items:center;gap:10px;margin:0 24px;padding:8px 14px;border-radius:0;background:var(--sp-success-bg);border:1px solid var(--sp-success-bg)}
.method-icon{font-size:16px}.method-text{font-size:13px;font-weight:700;color:var(--sp-accent-success)}
.offer-rates{display:flex;gap:8px;padding:0 24px}
.rate-card{flex:1;padding:10px;border-radius:0;text-align:center;background:#F8FAFC;border:1px solid #E2E8F0}
.rate-badge{font-size:8px;font-weight:800;letter-spacing:1.5px;display:inline-block;padding:2px 8px;border-radius:0;margin-bottom:4px}
.rate-deposit .rate-badge{background:var(--sp-success-bg);color:var(--sp-accent-success)}
.rate-withdrawal .rate-badge{background:#E8F0FE;color:var(--sp-accent-info)}
.rate-settlement .rate-badge{background:var(--sp-accent-bg);color:var(--sp-primary)}
.rate-value{font-size:26px;font-weight:900;color:#0F172A;letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
.rate-bar{height:3px;background:#E2E8F0;border-radius:0;overflow:hidden}
.rate-bar-fill{height:100%;border-radius:0;min-width:4px}
.rate-bar-green{background:var(--sp-accent-success)}.rate-bar-blue{background:var(--sp-accent-blue)}.rate-bar-purple{background:var(--sp-primary)}
.offer-limits{display:flex;gap:8px;padding:0 24px}
.limit-card{flex:1;border-radius:0;background:#F8FAFC;border:1px solid #E2E8F0;overflow:hidden}
.limit-card-header{display:flex;align-items:center;gap:6px;padding:8px 12px 0;font-weight:700;font-size:11px;color:var(--sp-surface-variant)}
.limit-card-icon{width:20px;height:20px;border-radius:0;display:inline-block;text-align:center;font-size:11px;font-weight:900;line-height:20px}
.limit-icon-green{background:var(--sp-success-bg);color:var(--sp-accent-success)}.limit-icon-blue{background:#E8F0FE;color:var(--sp-accent-info)}
.limit-card-body{padding:6px 12px 10px}
.limit-item{display:flex;justify-content:space-between;align-items:center;padding:3px 0}
.limit-item-label{font-size:10px;font-weight:600;color:var(--sp-text-muted);text-transform:uppercase;letter-spacing:0.5px}
.limit-item-value{font-size:13px;font-weight:800;color:#0F172A}
.limit-item-curr{font-size:10px;font-weight:600;color:var(--sp-text-muted);margin-left:3px}
.limit-divider{height:1px;background:#E2E8F0;margin:1px 0}
.offer-settle-row{display:flex;gap:8px;padding:0 24px}
.settle-chip{flex:1;padding:8px 12px;border-radius:0;background:#F8FAFC;border:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0F172A}
.settle-chip-label{display:block;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sp-text-muted);margin-bottom:2px}
.offer-notes{white-space:pre-wrap;background:var(--sp-warning-bg);border:1px solid var(--sp-warning-bg);border-radius:0;padding:8px 12px;font-size:9px;color:var(--sp-accent-amber);line-height:1.5}
.offer-footer{margin-top:20px;padding:0 24px 12px}
.offer-footer-gradient{height:2px;margin-bottom:8px;background:var(--sp-primary)}
.offer-footer-inner{display:flex;justify-content:space-between;align-items:center}
.offer-footer-valid{font-size:9px;color:#64748B;margin-bottom:6px}
.offer-footer-contact{font-size:9px;font-weight:500;color:var(--sp-text-muted)}
.offer-footer-sep{margin:0 4px;color:#CBD5E1}
.offer-footer-brand{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:600;letter-spacing:0.5px;color:var(--sp-text-muted)}
.offer-footer-logo-wrap{width:50px;height:16px;overflow:hidden;display:inline-block}.offer-footer-logo{height:16px;object-fit:contain}
@page{size:A4;margin:10mm 12mm}
`

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>${wordCSS}</style>
</head>
<body>${content}</body></html>`

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Teklif-${p.value.id}-${p.value.merchant_name.replace(/\s+/g, '_')}.doc`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
    alert('Word dışa aktarma hatası')
  } finally {
    downloadingWord.value = false
  }
}

function printIt() {
  const el = document.getElementById('proposal-print')
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>Teklif #${p.value.id}</title><style>${printCSS}</style></head><body>${el.outerHTML}</body></html>`)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 400)
}

const printCSS = `
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',-apple-system,sans-serif;color:#0F172A}
.offer-page{background:#fff;display:flex;flex-direction:column;height:297mm}
.offer-top-accent{height:6px;background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-blue),var(--sp-accent-cyan),var(--sp-accent-success))}
.offer-header{display:flex;justify-content:space-between;align-items:center;padding:14px 24px 0}
.offer-logo-wrap{width:180px;height:55px;overflow:hidden;display:flex;align-items:center;justify-content:center}.offer-logo{height:160px;object-fit:contain}
.offer-header-meta{text-align:right}.offer-doc-type{font-size:9px;font-weight:800;letter-spacing:4px;color:var(--sp-primary)}.offer-doc-date{font-size:11px;color:var(--sp-text-muted)}.offer-doc-valid{font-size:10px;color:var(--sp-accent-cyan);font-weight:600;margin-top:1px}
.offer-hero{margin:10px 24px;padding:16px 22px;background:linear-gradient(135deg,#0F172A,var(--sp-surface-variant));border-radius:0;color:#fff;position:relative;overflow:hidden}
.offer-hero::before{content:'';position:absolute;right:-40px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(102,241,189,.2) 0%,transparent 70%)}
.offer-hero-label{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:4px}
.offer-hero-name{font-size:20px;font-weight:900;letter-spacing:-.5px;position:relative;z-index:1}.offer-hero-details{font-size:11px;color:rgba(255,255,255,.6);margin-top:4px;position:relative;z-index:1}
.offer-label{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--sp-primary);padding:0 24px;margin-bottom:6px;margin-top:12px}
.offer-method{display:flex;align-items:center;gap:10px;margin:0 24px;padding:8px 14px;border-radius:0;background:linear-gradient(135deg,var(--sp-success-bg),var(--sp-success-bg));border:1px solid var(--sp-success-bg)}
.method-icon{font-size:16px}.method-text{font-size:13px;font-weight:700;color:var(--sp-accent-success);letter-spacing:-.2px}
.offer-rates{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 24px}
.rate-card{padding:10px;border-radius:0;text-align:center;background:#F8FAFC;border:1px solid #E2E8F0}
.rate-badge{font-size:8px;font-weight:800;letter-spacing:1.5px;display:inline-block;padding:2px 8px;border-radius:0;margin-bottom:4px}
.rate-deposit .rate-badge{background:rgba(102,241,189,.1);color:var(--sp-accent-success)}.rate-withdrawal .rate-badge{background:rgba(112,169,255,.1);color:var(--sp-accent-info)}.rate-settlement .rate-badge{background:rgba(102,241,189,.1);color:var(--sp-primary)}
.rate-value{font-size:26px;font-weight:900;color:#0F172A;letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
.rate-bar{height:3px;background:#E2E8F0;border-radius:0;overflow:hidden}.rate-bar-fill{height:100%;border-radius:0;min-width:4px}
.rate-bar-green{background:linear-gradient(90deg,var(--sp-accent-success),var(--sp-accent-success))}.rate-bar-blue{background:linear-gradient(90deg,var(--sp-accent-blue),var(--sp-accent-blue))}.rate-bar-purple{background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-purple))}
.offer-limits{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 24px}
.limit-card{border-radius:0;background:#F8FAFC;border:1px solid #E2E8F0;overflow:hidden}
.limit-card-header{display:flex;align-items:center;gap:8px;padding:12px 16px 0;font-weight:700;font-size:13px;color:var(--sp-surface-variant)}
.limit-card-icon{width:26px;height:26px;border-radius:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900}
.limit-icon-green{background:rgba(102,241,189,.12);color:var(--sp-accent-success)}.limit-icon-blue{background:rgba(112,169,255,.12);color:var(--sp-accent-info)}
.limit-card-body{padding:10px 16px 14px}
.limit-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0}
.limit-item-label{font-size:11px;font-weight:600;color:var(--sp-text-muted);text-transform:uppercase;letter-spacing:.5px}
.limit-item-value{font-size:16px;font-weight:800;color:#0F172A}
.limit-item-curr{font-size:11px;font-weight:600;color:var(--sp-text-muted);margin-left:3px}
.limit-divider{height:1px;background:#E2E8F0;margin:2px 0}
.offer-settle-row{display:flex;gap:8px;padding:0 24px;flex-wrap:wrap}.settle-chip{flex:1;min-width:80px;padding:8px 12px;border-radius:0;background:linear-gradient(135deg,#F8FAFC,#F1F5F9);border:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0F172A}
.settle-chip-label{display:block;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sp-text-muted);margin-bottom:2px}
.offer-notes{white-space:pre-wrap;background:var(--sp-warning-bg);border:1px solid var(--sp-warning-bg);border-radius:0;padding:8px 12px;font-size:9px;color:var(--sp-accent-amber);line-height:1.5}
.offer-footer{margin-top:auto;padding:0 24px 12px}.offer-footer-gradient{height:2px;border-radius:0;margin-bottom:8px;background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-blue),var(--sp-accent-cyan),var(--sp-accent-success))}
.offer-footer-inner{display:flex;justify-content:space-between;align-items:center}.offer-footer-valid{font-size:9px;color:#64748B;margin-bottom:6px}
.offer-footer-contact{font-size:9px;font-weight:500;color:var(--sp-text-muted)}.offer-footer-sep{margin:0 4px;color:#CBD5E1}
.offer-footer-brand{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:600;letter-spacing:.5px;color:var(--sp-text-muted)}
.offer-footer-logo-wrap{width:50px;height:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}.offer-footer-logo{height:50px;object-fit:contain}
@media print{body{padding:0}.offer-page{box-shadow:none}}
`

onMounted(async () => { const { data } = await api.get(`/portal/proposals/${route.params.id}`); p.value = data })
</script>

<style scoped>
.offer-page{width:210mm;height:297mm;max-width:100%;background:#fff;border-radius:0;box-shadow:0 2px 24px rgba(0,0,0,.08);overflow:hidden;font-family:'Inter',-apple-system,sans-serif;color:#0F172A;display:flex;flex-direction:column}
.offer-top-accent{height:6px;background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-blue),var(--sp-accent-cyan),var(--sp-accent-success))}
.offer-header{display:flex;justify-content:space-between;align-items:center;padding:14px 24px 0}
.offer-logo-wrap{width:180px;height:55px;overflow:hidden;display:flex;align-items:center;justify-content:center}.offer-logo{height:160px;object-fit:contain}
.offer-header-meta{text-align:right}.offer-doc-type{font-size:9px;font-weight:800;letter-spacing:4px;background:linear-gradient(135deg,var(--sp-primary),var(--sp-accent-blue));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:2px}.offer-doc-date{font-size:11px;color:var(--sp-text-muted)}.offer-doc-valid{font-size:10px;color:var(--sp-accent-cyan);font-weight:600;margin-top:1px}
.offer-hero{margin:10px 24px;padding:16px 22px;background:linear-gradient(135deg,#0F172A,var(--sp-surface-variant));border-radius:0;color:#fff;position:relative;overflow:hidden}
.offer-hero::before{content:'';position:absolute;right:-40px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(102,241,189,.2) 0%,transparent 70%)}
.offer-hero::after{content:'';position:absolute;left:-20px;bottom:-20px;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,rgba(6,182,212,.15) 0%,transparent 70%)}
.offer-hero-label{font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:4px}
.offer-hero-name{font-size:20px;font-weight:900;letter-spacing:-.5px;position:relative;z-index:1}.offer-hero-details{font-size:11px;color:rgba(255,255,255,.6);margin-top:4px;position:relative;z-index:1}
.offer-label{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--sp-primary);padding:0 24px;margin-bottom:6px;margin-top:12px}
.offer-method{display:flex;align-items:center;gap:10px;margin:0 24px;padding:8px 14px;border-radius:0;background:linear-gradient(135deg,var(--sp-success-bg),var(--sp-success-bg));border:1px solid var(--sp-success-bg)}
.method-icon{font-size:16px}.method-text{font-size:13px;font-weight:700;color:var(--sp-accent-success);letter-spacing:-.2px}
.offer-rates{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 24px}
.rate-card{padding:10px;border-radius:0;text-align:center;background:#F8FAFC;border:1px solid #E2E8F0}
.rate-badge{font-size:8px;font-weight:800;letter-spacing:1.5px;display:inline-block;padding:2px 8px;border-radius:0;margin-bottom:4px}
.rate-deposit .rate-badge{background:rgba(102,241,189,.1);color:var(--sp-accent-success)}.rate-withdrawal .rate-badge{background:rgba(112,169,255,.1);color:var(--sp-accent-info)}.rate-settlement .rate-badge{background:rgba(102,241,189,.1);color:var(--sp-primary)}
.rate-value{font-size:26px;font-weight:900;color:#0F172A;letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
.rate-bar{height:3px;background:#E2E8F0;border-radius:0;overflow:hidden}.rate-bar-fill{height:100%;border-radius:0;transition:width .3s;min-width:4px}
.rate-bar-green{background:linear-gradient(90deg,var(--sp-accent-success),var(--sp-accent-success))}.rate-bar-blue{background:linear-gradient(90deg,var(--sp-accent-blue),var(--sp-accent-blue))}.rate-bar-purple{background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-purple))}
.offer-limits{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 24px}
.limit-card{border-radius:0;background:#F8FAFC;border:1px solid #E2E8F0;overflow:hidden}
.limit-card-header{display:flex;align-items:center;gap:6px;padding:8px 12px 0;font-weight:700;font-size:11px;color:var(--sp-surface-variant)}
.limit-card-icon{width:20px;height:20px;border-radius:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}
.limit-icon-green{background:rgba(102,241,189,.12);color:var(--sp-accent-success)}.limit-icon-blue{background:rgba(112,169,255,.12);color:var(--sp-accent-info)}
.limit-card-body{padding:6px 12px 10px}
.limit-item{display:flex;justify-content:space-between;align-items:center;padding:3px 0}
.limit-item-label{font-size:10px;font-weight:600;color:var(--sp-text-muted);text-transform:uppercase;letter-spacing:.5px}
.limit-item-value{font-size:13px;font-weight:800;color:#0F172A}
.limit-item-curr{font-size:10px;font-weight:600;color:var(--sp-text-muted);margin-left:3px}
.limit-divider{height:1px;background:#E2E8F0;margin:1px 0}
.offer-settle-row{display:flex;gap:8px;padding:0 24px;flex-wrap:wrap}.settle-chip{flex:1;min-width:80px;padding:8px 12px;border-radius:0;background:linear-gradient(135deg,#F8FAFC,#F1F5F9);border:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0F172A}
.settle-chip-label{display:block;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--sp-text-muted);margin-bottom:2px}
.offer-notes{white-space:pre-wrap;background:var(--sp-warning-bg);border:1px solid var(--sp-warning-bg);border-radius:0;padding:8px 12px;font-size:9px;color:var(--sp-accent-amber);line-height:1.5}
.offer-footer{margin-top:auto;padding:0 24px 12px}.offer-footer-gradient{height:2px;border-radius:0;margin-bottom:8px;background:linear-gradient(90deg,var(--sp-primary),var(--sp-accent-blue),var(--sp-accent-cyan),var(--sp-accent-success))}
.offer-footer-inner{display:flex;justify-content:space-between;align-items:center}.offer-footer-valid{font-size:9px;color:#64748B;margin-bottom:6px}
.offer-footer-contact{font-size:9px;font-weight:500;color:var(--sp-text-muted)}.offer-footer-sep{margin:0 4px;color:#CBD5E1}
.offer-footer-brand{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:600;letter-spacing:.5px;color:var(--sp-text-muted)}
.offer-footer-logo-wrap{width:50px;height:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}.offer-footer-logo{height:50px;object-fit:contain}
</style>
