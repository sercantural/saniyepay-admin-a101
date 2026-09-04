<template>
  <div v-if="visible" class="txn-panel">
    <!-- Panel Header -->
    <div class="panel-header">
      <v-btn icon variant="tonal" size="small" @click="close" class="mr-2 close-btn">
        <v-icon size="20">mdi-close</v-icon>
      </v-btn>
      <span class="text-caption font-weight-bold" style="color: var(--sp-text-dimmer); letter-spacing: 0.5px">
        {{ txn?.type === 'deposit' ? 'YATIRIM' : 'ÇEKİM' }} DETAY
      </span>
      <v-spacer />
      <v-btn size="x-small" variant="tonal" color="primary" :to="`/transactions/${txn?.id}`">
        <v-icon start size="12">mdi-open-in-new</v-icon> Tam Sayfa
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex flex-column justify-center align-center" style="min-height: 300px">
      <v-progress-circular indeterminate color="primary" size="36" width="3" />
      <div class="text-caption mt-3" style="color: var(--sp-text-dim)">Yükleniyor...</div>
    </div>

    <!-- Panel Body -->
    <div v-else-if="txn" class="panel-body">

      <!-- Big Amount + Status -->
      <div class="hero-banner mb-4" :class="`hero-banner--${txn.status}`">
        <div class="hero-amount-row">
          <div class="hero-amount">{{ formatCurrency(txn.requested_amount) }} <span class="hero-currency">{{ txn.currency }}</span></div>
          <v-chip v-if="txn.is_sandbox" size="small" color="warning" variant="elevated" class="ml-2">SB</v-chip>
        </div>
        <div class="hero-status-row">
          <v-chip :color="statusChipColor(txn.status)" variant="flat" size="default" label class="font-weight-bold hero-status-chip">
            <v-icon start size="18">{{ statusIcon(txn.status) }}</v-icon>
            {{ statusText(txn.status) }}
          </v-chip>
          <v-chip variant="tonal" size="small" :color="txn.type === 'deposit' ? 'success' : 'info'" label class="ml-2">
            <v-icon start size="14">{{ txn.type === 'deposit' ? 'mdi-plus-thick' : 'mdi-minus-thick' }}</v-icon>
            {{ txn.type === 'deposit' ? 'Yatırım' : 'Çekim' }}
          </v-chip>
        </div>
        <div class="hero-id">#{{ txn.internal_id }} <span v-if="isSuperAdmin && txn.merchant_trx_id" class="hero-ref">{{ txn.merchant_trx_id }}</span></div>
      </div>

      <!-- Action Buttons (big, clear) -->
      <div v-if="canAct" class="action-bar mb-4">
        <v-btn v-if="canLock" color="primary" variant="elevated" size="large" block @click="handleLock" :loading="acting" class="mb-2">
          <v-icon start size="20">mdi-hand-extended</v-icon> İşleme Al
        </v-btn>
        <div class="d-flex ga-2">
          <v-btn v-if="canApprove" color="success" variant="elevated" size="large" class="flex-grow-1" @click="openApproveDialog">
            <v-icon start size="20">mdi-check-circle</v-icon> Onayla
          </v-btn>
          <v-btn v-if="canReject" color="error" variant="elevated" size="large" class="flex-grow-1" @click="rejectDialog = true">
            <v-icon start size="20">mdi-close-circle</v-icon> Reddet
          </v-btn>
        </div>
      </div>

      <!-- Payment Notification -->
      <div v-if="txn.customer_notified_at && !['approved','rejected','expired','cancelled'].includes(txn.status)" class="payment-alert mb-3">
        <v-icon color="warning" size="22" class="mr-3 pulse-icon">mdi-cash-check</v-icon>
        <div>
          <div class="font-weight-bold" style="color: var(--sp-text); font-size: 14px">Oyuncu ödeme bildirdi!</div>
          <div style="color: var(--sp-text-muted); font-size: 12px">{{ formatDate(txn.customer_notified_at) }}</div>
        </div>
      </div>

      <!-- Bayi bakiyesi uyarisi yalnizca firma kimligini gorene: taserona
           gitmez (backend alani zaten gondermiyor; bu ikinci kapi). -->
      <div v-if="(auth.isSuperAdmin || auth.can('scope.merchant_identity')) && txn.merchant_balance && !txn.merchant_balance.can_afford && !['approved','rejected','expired','cancelled'].includes(txn.status)" class="balance-alert mb-3">
        <v-icon color="error" size="22" class="mr-3 pulse-icon">mdi-alert</v-icon>
        <div style="flex: 1">
          <div class="font-weight-bold" style="color: var(--sp-accent-error); font-size: 14px">Yetersiz Bayi Bakiyesi!</div>
          <div style="color: var(--sp-text-muted); font-size: 12px">Para göndermeyin! Bakiye yetersiz. İşlemi reddedin.</div>
        </div>
      </div>

      <!-- Rejection Reason -->
      <div v-if="txn.rejection_reason" class="reject-alert mb-3">
        <v-icon color="error" size="20" class="mr-3">mdi-alert-circle</v-icon>
        <div>
          <div class="font-weight-bold" style="color: var(--sp-text-muted); font-size: 11px; letter-spacing: 0.5px">RED SEBEBI</div>
          <div style="color: var(--sp-text); font-size: 13px">{{ txn.rejection_reason }}</div>
        </div>
      </div>

      <!-- Tutar Bilgileri -->
      <div class="detail-section mb-3">
        <div class="section-title">
          <v-icon size="14" class="mr-1" style="color: var(--sp-primary)">mdi-currency-try</v-icon>
          Tutar Bilgileri
        </div>
        <div class="detail-row-grid">
          <div class="detail-item">
            <div class="detail-label">Talep Edilen</div>
            <div class="detail-val detail-val--big">{{ formatCurrency(txn.requested_amount) }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Onaylanan</div>
            <div class="detail-val detail-val--big" :style="txn.amount ? 'color: var(--sp-accent-success-bright)' : ''">{{ txn.amount ? formatCurrency(txn.amount) : '--' }}</div>
          </div>
        </div>

        <!-- Komisyon (super admin) -->
        <div v-if="isSuperAdmin && txn.merchant_fee_percent != null" class="mt-2">
          <div class="section-divider" />
          <div class="detail-row-grid mt-2">
            <div class="detail-item">
              <div class="detail-label">Oran</div>
              <div class="detail-val" style="color: var(--sp-accent-amber)">%{{ txn.merchant_fee_percent }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Komisyon</div>
              <div class="detail-val" style="color: var(--sp-accent-amber)">{{ formatCurrency(txn.merchant_fee_amount || 0) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Grup</div>
              <div class="detail-val" style="color: var(--sp-accent-cyan)">{{ formatCurrency(txn.operator_fee_amount || 0) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Sahip</div>
              <div class="detail-val" style="color: var(--sp-accent-success)">{{ formatCurrency(txn.owner_fee_amount || 0) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Müşteri Bilgileri -->
      <div class="detail-section mb-3">
        <div class="section-title">
          <v-icon size="14" class="mr-1" style="color: var(--sp-primary)">mdi-account</v-icon>
          {{ isSuperAdmin ? 'Bayi & Müşteri' : 'Müşteri' }}
        </div>
        <div class="detail-row-grid">
          <div v-if="isSuperAdmin" class="detail-item">
            <div class="detail-label">Bayi</div>
            <div class="detail-val">{{ txn.merchant?.name || '--' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Müşteri ID</div>
            <div class="detail-val">{{ txn.customer?.external_id || '--' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Ad Soyad</div>
            <div class="detail-val">{{ customerName }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">E-posta</div>
            <div class="detail-val text-truncate">{{ txn.customer?.email || '--' }}</div>
          </div>
        </div>
      </div>

      <!-- Banka Hesabı (deposits only) -->
      <div v-if="txn.type === 'deposit'" class="detail-section mb-3">
        <div class="section-title">
          <v-icon size="14" class="mr-1" style="color: var(--sp-primary)">mdi-bank</v-icon>
          Banka Hesabı
        </div>
        <template v-if="txn.bank_account">
          <div class="detail-row-grid">
            <div class="detail-item">
              <div class="detail-label">Banka</div>
              <div class="detail-val">{{ txn.bank_account?.bank_name || '--' }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Hesap Sahibi</div>
              <div class="detail-val">{{ txn.bank_account?.account_holder || '--' }}</div>
            </div>
          </div>
          <div class="mt-2">
            <div class="detail-label">IBAN</div>
            <div class="detail-val"><code v-if="txn.bank_account?.iban" class="iban-code">{{ txn.bank_account.iban }}</code><span v-else>--</span></div>
          </div>
        </template>
        <template v-else>
          <div class="text-center py-3" style="color: var(--sp-text-hint); font-size: 13px">
            <v-icon size="24" class="mb-1" style="color: var(--sp-text-ghost)">mdi-bank-off</v-icon>
            <div>Henüz atanmadı</div>
          </div>
        </template>
        <div v-if="txn.sub_group" class="mt-2">
          <v-chip size="small" variant="tonal" color="primary">{{ txn.sub_group.name }}</v-chip>
        </div>

        <!-- Manual Assignment (SA only, unassigned withdrawals) -->
        <div v-if="canAssign && txn.type === 'withdrawal' && ['pending', 'assigned'].includes(txn.status)" class="mt-3">
          <div class="section-divider mb-2" />
          <div class="detail-label mb-1">OPERATÖRE ATA</div>
          <v-select
            v-model="assignOperatorId"
            :items="withdrawalOperators"
            item-title="label"
            item-value="id"
            variant="outlined"
            density="compact"
            placeholder="Operatör seç..."
            hide-details
            class="mb-2"
            style="font-size: 11px"
            :loading="loadingOperators"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  <span :style="item.raw.balance >= 0 ? 'color: var(--sp-accent-success)' : 'color: var(--sp-accent-error)'">{{ item.raw.subtitle }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>
          <v-btn
            size="x-small"
            color="primary"
            variant="elevated"
            block
            :disabled="!assignOperatorId"
            :loading="assigning"
            @click="handleAssign"
          >
            <v-icon start size="14">mdi-account-arrow-right</v-icon> Ata
          </v-btn>
        </div>
      </div>

      <!-- Oyuncu Banka (withdrawal) -->
      <div v-if="txn.type === 'withdrawal'" class="detail-section mb-3">
        <div class="section-title">
          <v-icon size="14" class="mr-1" style="color: var(--sp-accent-blue)">mdi-credit-card-outline</v-icon>
          Oyuncu Banka Bilgileri
        </div>
        <div class="detail-row-grid">
          <div class="detail-item">
            <div class="detail-label">Hesap Sahibi</div>
            <div class="detail-val detail-val--big">{{ txn.player_account_holder || '--' }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Banka</div>
            <div class="detail-val" style="color: var(--sp-accent-blue)">{{ txn.player_bank_resolved || txn.player_bank_name || '--' }}</div>
          </div>
        </div>
        <div class="mt-2">
          <div class="detail-label">IBAN</div>
          <div class="detail-val"><code class="iban-code">{{ txn.player_iban || '--' }}</code></div>
        </div>
      </div>

      <!-- İşlem Süreci -->
      <div class="detail-section mb-3">
        <div class="section-title">
          <v-icon size="12" class="mr-1" style="color: var(--sp-accent-amber)">mdi-account-clock</v-icon>
          İşlem Süreci
        </div>
        <div class="process-steps">
          <div class="process-step">
            <div class="step-dot step-dot--done" />
            <div class="step-content">
              <div class="step-title">Oluşturuldu</div>
              <div class="step-time">{{ formatDate(txn.created_at) }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.locked_at || txn.locker">
            <div class="step-dot step-dot--done" />
            <div class="step-content">
              <div class="step-title d-flex align-center ga-1">
                İşleme Alındı
                <v-chip v-if="txn.locker" size="x-small" variant="tonal" color="warning">{{ txn.locker.name }}</v-chip>
              </div>
              <div class="step-time">{{ txn.locked_at ? formatDate(txn.locked_at) : '--' }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.customer_notified_at">
            <div class="step-dot step-dot--warning" />
            <div class="step-content">
              <div class="step-title">Ödeme Bildirdi</div>
              <div class="step-time">{{ formatDate(txn.customer_notified_at) }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.status === 'approved'">
            <div class="step-dot step-dot--success" />
            <div class="step-content">
              <div class="step-title d-flex align-center ga-1">
                Onaylandı
                <v-chip v-if="txn.approver" size="x-small" variant="tonal" color="success">{{ txn.approver.name }}</v-chip>
              </div>
              <div class="step-time">{{ txn.approved_at ? formatDate(txn.approved_at) : '--' }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.status === 'rejected'">
            <div class="step-dot step-dot--error" />
            <div class="step-content">
              <div class="step-title">Reddedildi</div>
              <div class="step-time">{{ txn.approved_at ? formatDate(txn.approved_at) : formatDate(txn.updated_at) }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.status === 'expired'">
            <div class="step-dot step-dot--grey" />
            <div class="step-content">
              <div class="step-title">Süresi Doldu</div>
              <div class="step-time">{{ txn.expires_at ? formatDate(txn.expires_at) : '--' }}</div>
            </div>
          </div>
          <div class="process-step" v-if="txn.status === 'cancelled'">
            <div class="step-dot step-dot--grey" />
            <div class="step-content">
              <div class="step-title">İptal Edildi</div>
              <div class="step-time">{{ formatDate(txn.updated_at) }}</div>
            </div>
          </div>
          <div class="process-step" v-if="['pending','assigned','processing'].includes(txn.status)">
            <div class="step-dot step-dot--waiting" />
            <div class="step-content">
              <div class="step-title" style="color: var(--sp-text-dimmer)">Onay Bekleniyor...</div>
              <div class="step-time" v-if="txn.expires_at">Son: {{ formatDate(txn.expires_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Webhook (super admin only) -->
      <div v-if="isSuperAdmin" class="detail-section mb-3">
        <div class="d-flex align-center mb-2">
          <div class="section-title mb-0">
            <v-icon size="12" class="mr-1" style="color: var(--sp-primary)">mdi-webhook</v-icon>
            Webhook
          </div>
          <v-spacer />
          <v-btn
            v-if="['approved','rejected'].includes(txn.status)"
            size="x-small"
            color="warning"
            variant="tonal"
            @click="retryWebhook"
            :loading="retryingWebhook"
          >
            <v-icon start size="10">mdi-refresh</v-icon> Tekrar
          </v-btn>
        </div>
        <div v-if="txn.webhook_logs?.length">
          <div v-for="wh in txn.webhook_logs" :key="wh.id" class="wh-entry" @click="selectedWebhook = wh">
            <div class="d-flex align-center">
              <div class="wh-dot" :class="`wh-dot--${wh.status}`" />
              <span class="text-caption font-weight-medium" style="color: var(--sp-text)">#{{ wh.attempt }}</span>
              <v-spacer />
              <span class="wh-code">{{ wh.response_code || (wh.status === 'success' ? 'OK' : 'ERR') }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-3" style="color: var(--sp-text-faint)">
          <v-icon size="22" class="mb-1" style="color: rgba(200,204,216,0.12)">mdi-webhook</v-icon>
          <div style="font-size: 11px">Webhook gönderilmedi</div>
        </div>
      </div>

      <!-- Audit Log (collapsed) -->
      <v-expansion-panels variant="accordion" class="mb-3">
        <v-expansion-panel class="tech-panel">
          <v-expansion-panel-title class="text-caption font-weight-bold" style="color: var(--sp-text-dimmer); min-height: 36px; padding: 8px 16px">
            <v-icon size="12" class="mr-2">mdi-code-braces</v-icon> TEKNİK BİLGİLER
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="detail-row-grid mb-2">
              <div class="detail-item" style="grid-column: 1 / -1">
                <div class="detail-label">Idempotency Key</div>
                <div class="detail-val text-truncate"><code class="iban-code" style="font-size: 10px">{{ txn.idempotency_key || '--' }}</code></div>
              </div>
            </div>
            <div v-if="txn.expires_at" class="mb-2">
              <div class="detail-label">Son Geçerlilik</div>
              <div class="detail-val">{{ formatDate(txn.expires_at) }}</div>
            </div>
            <div class="section-divider my-2" />
            <div class="detail-label mb-1" style="font-size: 9px; letter-spacing: 1px">İŞLEM GEÇMİŞİ</div>
            <div v-for="log in txn.logs" :key="log.id" class="log-entry">
              <v-icon :color="logColor(log.action)" size="12" class="mr-1">{{ logIcon(log.action) }}</v-icon>
              <span class="font-weight-medium">{{ actionText(log.action) }}</span>
              <span v-if="log.from_status" class="ml-1">
                <span style="color: var(--sp-text-dimmer)">{{ statusText(log.from_status) }}</span>
                <v-icon size="10" class="mx-1" style="color: var(--sp-text-faint)">mdi-arrow-right</v-icon>
                <span :style="`color: ${statusHex(log.to_status)}`">{{ statusText(log.to_status) }}</span>
              </span>
              <div class="log-meta">{{ log.user?.name || 'Sistem' }} &bull; {{ formatDate(log.created_at) }}</div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

    </div>

    <!-- ===== DIALOGS ===== -->
    <v-dialog v-model="webhookDetailDialog" max-width="600">
      <v-card v-if="selectedWebhook">
        <v-card-title class="d-flex align-center">
          <v-icon start size="18" color="primary">mdi-webhook</v-icon>
          Webhook #{{ selectedWebhook.attempt }}
          <v-spacer />
          <v-chip :color="selectedWebhook.status === 'success' ? 'success' : selectedWebhook.status === 'failed' ? 'error' : 'grey'" size="small" variant="tonal">
            HTTP {{ selectedWebhook.response_code || '--' }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <div class="mb-3">
            <div class="detail-label mb-1">URL</div>
            <code class="iban-code">{{ selectedWebhook.url }}</code>
          </div>
          <div class="mb-3" v-if="selectedWebhook.payload">
            <div class="detail-label mb-1">Payload</div>
            <pre class="code-block">{{ JSON.stringify(selectedWebhook.payload, null, 2) }}</pre>
          </div>
          <div v-if="selectedWebhook.response_body">
            <div class="detail-label mb-1">Yanıt</div>
            <pre class="code-block">{{ selectedWebhook.response_body }}</pre>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" @click="webhookDetailDialog = false">Kapat</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="approveDialog" max-width="420">
      <v-card>
        <v-card-title>
          <v-icon start color="success" size="20">mdi-check-circle</v-icon>
          İşlemi Onayla
        </v-card-title>
        <v-card-text>
          <v-alert v-if="approveError" type="error" variant="tonal" class="mb-4" closable @click:close="approveError = ''">
            {{ approveError }}
          </v-alert>
          <v-text-field
            v-model.number="approveAmount"
            label="Onaylanan Tutar"
            type="number"
            variant="outlined"
            :placeholder="String(txn?.requested_amount)"
            hint="Talep edilen tutarı kullanmak için boş bırakın"
            persistent-hint
          />

          <!-- Bank Account selector for withdrawals -->
          <div v-if="txn?.type === 'withdrawal'" class="mt-4">
            <v-select
              v-model="approveBankAccountId"
              :items="operatorBankAccounts"
              item-title="label"
              item-value="id"
              label="Kullanılan Banka Hesabı"
              variant="outlined"
              density="compact"
              :loading="loadingBankAccounts"
              :rules="[v => !!v || 'Banka hesabı seçmeniz gerekir']"
              :error-messages="!approveBankAccountId && approveAttempted ? ['Banka hesabı seçmeniz gerekir'] : []"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #subtitle>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--sp-text-muted)">{{ item.raw.iban }}</span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              <div class="text-caption">Çekim transferini gönderdiğiniz banka hesabını seçin.</div>
            </v-alert>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="approveDialog = false; approveError = ''; approveAttempted = false">İptal</v-btn>
          <v-btn color="success" variant="elevated" @click="handleApprove" :loading="acting">Onayla</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="rejectDialog" max-width="420">
      <v-card>
        <v-card-title>
          <v-icon start color="error" size="20">mdi-close-circle</v-icon>
          İşlemi Reddet
        </v-card-title>
        <v-card-text>
          <v-alert v-if="rejectError" type="error" variant="tonal" density="compact" class="mb-3" closable @click:close="rejectError = ''">
            {{ rejectError }}
          </v-alert>
          <v-alert
            v-if="txn?.type === 'deposit' && rejectCooldownSeconds > 0"
            type="warning" variant="tonal" density="compact" class="mb-3"
          >
            <div class="font-weight-bold">10 dakika dolmadı</div>
            <div class="text-caption">
              Yatırım talebi oluşturulduktan sonra en az 10 dakika geçmeden reddedilemez.
              Kalan süre: <strong class="tnum">{{ formatCountdown(rejectCooldownSeconds) }}</strong>
            </div>
          </v-alert>
          <div style="color: var(--sp-text-muted); font-size: 14px">
            Bu işlemi reddetmek istediğinizden emin misiniz?
          </div>
          <div class="mt-2 text-caption" style="color: var(--sp-text-hint)">
            İşlem: #{{ txn?.internal_id }} · {{ txn ? formatCurrency(txn.requested_amount) : '' }} {{ txn?.currency }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectDialog = false">İptal</v-btn>
          <v-btn
            color="error" variant="elevated" @click="handleReject" :loading="acting"
            :disabled="txn?.type === 'deposit' && rejectCooldownSeconds > 0"
          >
            Reddet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import api from '@/plugins/axios'

const emit = defineEmits(['updated', 'close'])

const auth = useAuthStore()
const txnStore = useTransactionStore()

const visible = ref(false)
const txn = ref(null)
const loading = ref(false)
const acting = ref(false)
const approveDialog = ref(false)
const rejectDialog = ref(false)
const approveAmount = ref(null)
const rejectReason = ref('')
const approveError = ref('')
const retryingWebhook = ref(false)
const selectedWebhook = ref(null)
const webhookDetailDialog = ref(false)
const assignOperatorId = ref(null)
const assigning = ref(false)
const withdrawalOperators = ref([])
const loadingOperators = ref(false)
const approveBankAccountId = ref(null)
const operatorBankAccounts = ref([])
const loadingBankAccounts = ref(false)
const approveAttempted = ref(false)
const rejectError = ref('')
const rejectCooldownSeconds = ref(0)
let cooldownTimer = null

function startCooldownTimer() {
  stopCooldownTimer()
  updateCooldown()
  cooldownTimer = setInterval(updateCooldown, 1000)
}

function stopCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function updateCooldown() {
  if (!txn.value || txn.value.type !== 'deposit' || !txn.value.created_at) {
    rejectCooldownSeconds.value = 0
    return
  }
  const created = new Date(txn.value.created_at).getTime()
  const elapsed = Math.floor((Date.now() - created) / 1000)
  const remaining = Math.max(0, 600 - elapsed)
  rejectCooldownSeconds.value = remaining
  if (remaining === 0) stopCooldownTimer()
}

// MM:SS (both zero-padded) so the surrounding text doesn't reflow as the
// counter ticks. Pair with tabular-nums on the rendered span.
function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

watch(rejectDialog, (open) => {
  if (open) startCooldownTimer()
  else { stopCooldownTimer(); rejectError.value = '' }
})

onUnmounted(stopCooldownTimer)

const isSuperAdmin = computed(() => auth.isSuperAdmin)

// Operatore atama artik role degil izne bagli; backend de ayni izne
// (transactions.assign) bakiyor.
const canAssign = computed(() => auth.isSuperAdmin || auth.can('transactions.assign'))

const txnType = computed(() => txn.value?.type)

const canAct = computed(() => txn.value && ['pending', 'assigned', 'processing'].includes(txn.value.status))
const canLock = computed(() => {
  if (!txn.value) return false
  // Allow locking 'assigned' status, or 'pending' withdrawals for SA
  const lockableStatus = txn.value.status === 'assigned' ||
    (isSuperAdmin.value && txn.value.status === 'pending' && txn.value.type === 'withdrawal')
  if (!lockableStatus) return false
  if (txn.value.locked_by) return false
  return isSuperAdmin.value || auth.can('transactions.lock')
})
const canApprove = computed(() => {
  if (txn.value?.status !== 'processing') return false
  if (!isSuperAdmin.value && String(txn.value?.locked_by) !== String(auth.user?.id)) return false
  return isSuperAdmin.value || auth.can(`transactions.approve.${txnType.value}`)
})
const canReject = computed(() => {
  if (txn.value?.status !== 'processing') return false
  if (!isSuperAdmin.value && String(txn.value?.locked_by) !== String(auth.user?.id)) return false
  return isSuperAdmin.value || auth.can(`transactions.reject.${txnType.value}`)
})

const customerName = computed(() => {
  const c = txn.value?.customer
  if (!c) return '--'
  if (c.first_name || c.last_name) return `${c.first_name || ''} ${c.last_name || ''}`.trim()
  return c.name || '--'
})

function statusChipColor(s) {
  return { pending: 'secondary', assigned: 'secondary', processing: 'warning', approved: 'success', rejected: 'error', expired: 'grey', cancelled: 'grey' }[s] || 'grey'
}
function statusIcon(s) {
  return { pending: 'mdi-clock-outline', assigned: 'mdi-account-arrow-right', processing: 'mdi-progress-clock', approved: 'mdi-check-circle', rejected: 'mdi-close-circle', expired: 'mdi-timer-off', cancelled: 'mdi-cancel' }[s] || 'mdi-help-circle'
}
function statusText(s) {
  return { pending: 'Beklemede', assigned: 'Atandı', processing: 'İşlemde', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu', cancelled: 'İptal Edildi' }[s] || s
}
function statusHex(s) {
  return { pending: 'var(--sp-text-muted)', assigned: 'var(--sp-text-muted)', processing: 'var(--sp-accent-amber)', approved: 'var(--sp-accent-success)', rejected: 'var(--sp-accent-error)', expired: 'var(--sp-text-muted)', cancelled: 'var(--sp-text-muted)' }[s] || '#999'
}
function actionText(a) {
  return { created: 'Oluşturuldu', status_changed: 'Durum Değişti', locked: 'İşleme Alındı', note_added: 'Not Eklendi' }[a] || a
}
function logColor(a) {
  return { created: 'primary', status_changed: 'warning', locked: 'warning', note_added: 'grey' }[a] || 'grey'
}
function logIcon(a) {
  return { created: 'mdi-plus-circle', status_changed: 'mdi-swap-horizontal', locked: 'mdi-hand-extended', note_added: 'mdi-note-plus' }[a] || 'mdi-circle-small'
}
function formatCurrency(a) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(a) }
function formatDate(d) { return new Date(d).toLocaleString('tr-TR') }

async function loadTxn(id) {
  loading.value = true
  try {
    const { data } = await api.get(`/portal/transactions/${id}`)
    txn.value = data
    // Atama listesi yalnizca atama izni olana yuklensin.
    if (canAssign.value && data.type === 'withdrawal' && ['pending', 'assigned'].includes(data.status)) {
      loadWithdrawalOperators()
    }
  } finally {
    loading.value = false
  }
}

function open(transactionId) {
  approveDialog.value = false
  rejectDialog.value = false
  approveError.value = ''
  approveAmount.value = null
  rejectReason.value = ''
  visible.value = true
  loadTxn(transactionId)
}

function close() {
  visible.value = false
  txn.value = null
  emit('close')
}

async function handleLock() {
  acting.value = true
  try {
    await txnStore.lock(txn.value.id)
    await loadTxn(txn.value.id)
    emit('updated')
  } finally { acting.value = false }
}

async function handleApprove() {
  approveAttempted.value = true

  // For withdrawals, require bank account selection
  if (txn.value?.type === 'withdrawal' && !approveBankAccountId.value) {
    approveError.value = 'Lütfen kullanılan banka hesabını seçin.'
    return
  }

  acting.value = true
  approveError.value = ''
  try {
    await txnStore.approve(txn.value.id, approveAmount.value, approveBankAccountId.value)
    approveDialog.value = false
    approveAttempted.value = false
    await loadTxn(txn.value.id)
    emit('updated')
  } catch (e) {
    const data = e.response?.data
    if (data?.error === 'insufficient_balance') {
      approveError.value = data?.message || 'Yetersiz bakiye'
    } else {
      approveError.value = data?.message || 'Onaylama hatası'
    }
  } finally { acting.value = false }
}

async function handleReject() {
  acting.value = true
  rejectError.value = ''
  try {
    // Reason no longer collected from UI for deposit/withdrawal rejections;
    // send a standard marker so the backend column is populated.
    await txnStore.reject(txn.value.id, 'Reddedildi')
    rejectDialog.value = false
    await loadTxn(txn.value.id)
    emit('updated')
  } catch (e) {
    const data = e.response?.data
    if (data?.error === 'reject_too_early') {
      rejectError.value = data.message
      if (data.remaining_seconds != null) {
        rejectCooldownSeconds.value = data.remaining_seconds
        startCooldownTimer()
      }
    } else {
      rejectError.value = data?.message || 'Reddedilemedi'
    }
  } finally { acting.value = false }
}

async function loadWithdrawalOperators() {
  loadingOperators.value = true
  try {
    const { data } = await api.get('/portal/transactions/withdrawal-operators')
    withdrawalOperators.value = data.map(op => ({
      id: op.id,
      label: op.name,
      subtitle: `Bakiye: ${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(op.available_balance)} ${txn.value?.currency || 'TRY'}`,
      balance: op.available_balance,
    }))
  } finally {
    loadingOperators.value = false
  }
}

async function handleAssign() {
  if (!assignOperatorId.value) return
  assigning.value = true
  try {
    await txnStore.assign(txn.value.id, assignOperatorId.value)
    assignOperatorId.value = null
    await loadTxn(txn.value.id)
    emit('updated')
  } catch (e) {
    alert(e.response?.data?.message || 'Atama hatası')
  } finally {
    assigning.value = false
  }
}

function openApproveDialog() {
  approveError.value = ''
  approveAmount.value = null
  approveBankAccountId.value = null
  approveAttempted.value = false
  approveDialog.value = true
  if (txn.value?.type === 'withdrawal') {
    loadOperatorBankAccounts()
  }
}

async function loadOperatorBankAccounts() {
  loadingBankAccounts.value = true
  try {
    const { data } = await api.get('/portal/bank-accounts')
    operatorBankAccounts.value = (data.data || data).map(acc => ({
      id: acc.id,
      label: `${acc.bank_name} - ${acc.account_holder}`,
      iban: acc.iban,
    }))
  } finally {
    loadingBankAccounts.value = false
  }
}

async function retryWebhook() {
  retryingWebhook.value = true
  try {
    await api.post(`/portal/transactions/${txn.value.id}/retry-webhook`)
    setTimeout(() => loadTxn(txn.value.id), 2000)
  } catch (e) {
    alert(e.response?.data?.message || 'Webhook başarısız')
  } finally { retryingWebhook.value = false }
}

watch(selectedWebhook, v => { if (v) webhookDetailDialog.value = true })
watch(webhookDetailDialog, v => { if (!v) selectedWebhook.value = null })

defineExpose({ open, close, visible, txn })
</script>

<style scoped>
/* Fixed-width digits so the surrounding text doesn't reflow each tick. */
.tnum {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  display: inline-block;
}

.txn-panel {
  background: var(--sp-sidebar);
  border-left: 1px solid var(--sp-accent-bg-hover);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  position: sticky;
  top: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sp-divider);
  flex-shrink: 0;
}

.close-btn {
  color: var(--sp-text-muted) !important;
}
.close-btn:hover {
  color: var(--sp-text) !important;
  background: rgba(255,142,130, 0.1) !important;
}

.panel-body {
  padding: 12px 14px 20px;
  overflow-y: auto;
  flex: 1;
}

/* Hero Banner */
.hero-banner {
  padding: 18px 16px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-modal-bg) 0%, var(--sp-surface-bright) 100%);
  border: 1px solid var(--sp-badge-bg);
  text-align: center;
}
.hero-banner--approved { border-left: 4px solid var(--sp-accent-success-bright); }
.hero-banner--rejected { border-left: 4px solid var(--sp-accent-error); }
.hero-banner--processing { border-left: 4px solid var(--sp-accent-orange); }
.hero-banner--assigned { border-left: 4px solid var(--sp-accent-info); }
.hero-banner--pending { border-left: 4px solid var(--sp-text-muted); }
.hero-banner--expired { border-left: 4px solid var(--sp-text-muted); }
.hero-banner--cancelled { border-left: 4px solid var(--sp-text-muted); }

.hero-amount-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.hero-amount {
  font-size: 28px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -1px;
}
.hero-currency {
  font-size: 14px;
  font-weight: 600;
  color: var(--sp-text-dimmer);
}
.hero-status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.hero-status-chip {
  font-size: 13px !important;
  height: 32px !important;
  letter-spacing: 0.2px;
}
.hero-id {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-text-dimmer);
  font-family: 'JetBrains Mono', monospace;
}
.hero-ref {
  color: var(--sp-text-hint);
  margin-left: 6px;
}

/* Action Buttons */
.action-bar :deep(.v-btn) {
  font-weight: 700;
  letter-spacing: 0.3px;
  font-size: 14px;
}

/* Alerts */
.payment-alert {
  display: flex; align-items: center;
  padding: 14px 16px; border-radius: 0;
  background: rgba(255,190,91,0.1);
  border: 2px solid rgba(255,190,91,0.25);
}
.reject-alert {
  display: flex; align-items: flex-start;
  padding: 14px 16px; border-radius: 0;
  background: rgba(255,142,130,0.06);
  border: 2px solid rgba(255,142,130,0.2);
}
.balance-alert {
  display: flex; align-items: flex-start;
  padding: 14px 16px; border-radius: 0;
  background: rgba(255,142,130,0.1);
  border: 2px solid rgba(255,142,130,0.25);
  animation: balance-pulse 2s ease-in-out infinite;
}
@keyframes balance-pulse {
  0%, 100% { border-color: rgba(255,142,130,0.25); }
  50% { border-color: rgba(255,142,130,0.5); }
}

.info-row {
  display: flex; align-items: center;
  font-size: 12px;
}

/* Detail Sections */
.detail-section {
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-divider);
  border-radius: 0;
  padding: 12px;
}
.section-title {
  display: flex; align-items: center;
  font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
}
.section-divider {
  height: 1px;
  background: var(--sp-divider);
}

.detail-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.detail-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  color: var(--sp-text-hint);
  text-transform: uppercase;
  margin-bottom: 3px;
}
.detail-val {
  font-size: 13px; font-weight: 600;
  color: var(--sp-text);
}
.detail-val--big {
  font-size: 16px;
  font-weight: 800;
}

.iban-code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--sp-primary);
  background: rgba(var(--sp-primary-rgb), 0.06);
  padding: 3px 6px;
  border-radius: 0;
  word-break: break-all;
  display: inline-block;
}

/* Process Steps */
.process-steps {
  position: relative;
  padding-left: 16px;
}
.process-steps::before {
  content: '';
  position: absolute;
  left: 4px; top: 6px; bottom: 6px;
  width: 2px;
  background: var(--sp-accent-bg-hover);
}
.process-step {
  display: flex; align-items: flex-start;
  margin-bottom: 10px;
  position: relative;
}
.process-step:last-child { margin-bottom: 0; }
.step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  position: absolute; left: -16px; top: 3px;
  z-index: 1;
}
.step-dot--done { background: var(--sp-primary); box-shadow: 0 0 6px rgba(var(--sp-primary-rgb), 0.3); }
.step-dot--success { background: var(--sp-accent-success); box-shadow: 0 0 6px rgba(102,241,189,0.3); }
.step-dot--warning { background: var(--sp-accent-amber); box-shadow: 0 0 6px rgba(255,190,91,0.3); }
.step-dot--error { background: var(--sp-accent-error); box-shadow: 0 0 6px rgba(255,142,130,0.3); }
.step-dot--grey { background: var(--sp-text-muted); }
.step-dot--waiting {
  background: transparent;
  border: 2px solid var(--sp-text-ghost);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { border-color: var(--sp-text-ghost); }
  50% { border-color: var(--sp-text-muted); }
}

.step-content { padding-left: 6px; }
.step-title { font-size: 13px; font-weight: 600; color: var(--sp-text); }
.step-time { font-size: 11px; color: var(--sp-text-hint); margin-top: 2px; }

/* Webhook */
.wh-entry {
  padding: 6px 8px;
  border-radius: 0;
  cursor: pointer;
  margin-bottom: 3px;
  background: rgba(var(--sp-primary-rgb), 0.03);
  border: 1px solid rgba(var(--sp-primary-rgb), 0.04);
  transition: all 0.15s ease;
}
.wh-entry:hover {
  background: var(--sp-divider);
  border-color: var(--sp-badge-bg);
}
.wh-dot {
  width: 6px; height: 6px; border-radius: 50%; margin-right: 8px; flex-shrink: 0;
}
.wh-dot--success { background: var(--sp-accent-success); }
.wh-dot--failed { background: var(--sp-accent-error); }
.wh-dot--pending { background: var(--sp-text-muted); }
.wh-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 600;
  color: var(--sp-text-muted);
  padding: 1px 4px;
  background: var(--sp-divider);
  border-radius: 0;
}

/* Log Entries */
.log-entry {
  display: flex; align-items: flex-start; flex-wrap: wrap;
  padding: 4px 0;
  font-size: 10px;
  color: var(--sp-text-secondary);
  border-bottom: 1px solid rgba(var(--sp-primary-rgb), 0.04);
}
.log-entry:last-child { border-bottom: none; }
.log-meta {
  font-size: 9px;
  color: var(--sp-text-dim);
  width: 100%;
  margin-top: 1px;
}

/* Tech Panel */
.tech-panel {
  background: var(--sp-card-bg) !important;
  border: 1px solid var(--sp-divider) !important;
}

/* Code Block */
.code-block {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--sp-bg);
  color: var(--sp-text);
  border: 1px solid var(--sp-divider);
  border-radius: 0;
  padding: 10px 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
}

/* Pulse */
.pulse-icon {
  animation: pulse-warn 1.5s ease-in-out infinite;
}
@keyframes pulse-warn {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

/* Light mode */

/* ── Responsive ── */
@media (max-width: 960px) {
  .txn-panel {
    height: calc(100dvh - 48px);
    position: fixed;
    top: 48px;
    right: 0;
    width: 100%;
    max-width: 420px;
    z-index: 100;
    border-radius: 0;
    border-left: 1px solid var(--sp-accent-bg-hover);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  }
  .detail-row-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
}

@media (max-width: 600px) {
  .txn-panel {
    max-width: 100%;
  }
  .detail-row-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .hero-amount {
    font-size: 24px;
  }
  .hero-status-chip {
    font-size: 12px !important;
    height: 28px !important;
  }
  .panel-body {
    padding: 10px 12px 20px;
  }
  .panel-header {
    padding: 12px 14px;
  }
  .close-btn {
    width: 36px !important;
    height: 36px !important;
  }
  .status-banner {
    padding: 10px 12px;
  }
  .code-block {
    font-size: 10px;
    padding: 8px 10px;
  }
}
</style>
