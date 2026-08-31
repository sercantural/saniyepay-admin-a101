<template>
  <div v-if="txn">
    <!-- Back Button -->
    <v-btn variant="text" size="small" class="mb-3 back-btn" @click="$router.back()">
      <v-icon start size="16">mdi-arrow-left</v-icon> Geri
    </v-btn>

    <!-- ===== TOP: Status Banner + Actions ===== -->
    <div class="status-banner mb-4" :class="`status-banner--${txn.status}`">
      <div class="d-flex align-center flex-wrap ga-3">
        <div class="status-icon-wrap">
          <v-icon size="28" color="white">{{ txn.type === 'deposit' ? 'mdi-plus-thick' : 'mdi-minus-thick' }}</v-icon>
        </div>
        <div>
          <div class="d-flex align-center ga-2">
            <span class="status-ref">{{ txn.id }}</span>
            <v-chip v-if="txn.is_sandbox" size="x-small" color="warning" variant="elevated">SANDBOX</v-chip>
          </div>
          <div class="d-flex align-center ga-2 mt-1">
            <span class="status-type">{{ txn.type === 'deposit' ? 'Yatırım' : 'Çekim' }}</span>
            <span v-if="isSuperAdmin && txn.merchant_trx_id" class="merchant-ref-badge">
              <v-icon size="10" class="mr-1">mdi-link-variant</v-icon>{{ txn.merchant_trx_id }}
            </span>
          </div>
        </div>
        <v-spacer />
        <div class="text-right">
          <div class="status-amount">{{ formatCurrency(txn.requested_amount) }} <span class="status-currency">{{ txn.currency }}</span></div>
          <v-chip :color="statusChipColor(txn.status)" variant="elevated" size="small" class="mt-1">
            <v-icon start size="14">{{ statusIcon(txn.status) }}</v-icon>
            {{ statusText(txn.status) }}
          </v-chip>
        </div>
      </div>

      <!-- Action buttons inside banner -->
      <div v-if="canAct" class="mt-4 d-flex justify-end ga-2">
        <v-btn v-if="canLock" color="white" variant="elevated" size="small" @click="handleLock" :loading="acting" class="action-btn">
          <v-icon start size="16">mdi-hand-extended</v-icon> İşleme Al
        </v-btn>
        <v-btn v-if="canApprove" color="white" variant="elevated" size="small" @click="openApproveDialog" class="action-btn action-btn--approve">
          <v-icon start size="16">mdi-check-circle</v-icon> Onayla
        </v-btn>
        <v-btn v-if="canReject" color="white" variant="elevated" size="small" @click="rejectDialog = true" class="action-btn action-btn--reject">
          <v-icon start size="16">mdi-close-circle</v-icon> Reddet
        </v-btn>
      </div>
    </div>

    <!-- ===== PAYMENT NOTIFICATION ALERT ===== -->
    <div v-if="txn.customer_notified_at && !['approved', 'rejected', 'expired', 'cancelled'].includes(txn.status)" class="payment-alert mb-4">
      <v-icon color="warning" size="24" class="mr-3 pulse-icon">mdi-cash-check</v-icon>
      <div>
        <div class="font-weight-bold" style="color: var(--sp-text)">Oyuncu ödeme yaptığını bildirdi!</div>
        <div class="text-caption" style="color: var(--sp-text-muted)">{{ formatDate(txn.customer_notified_at) }} -- Banka hesabını kontrol edip işlemi onaylayın veya reddedin.</div>
      </div>
    </div>

    <!-- ===== INSUFFICIENT BALANCE WARNING (withdrawal) ===== -->
    <div v-if="txn.merchant_balance && !txn.merchant_balance.can_afford && !['approved','rejected','expired','cancelled'].includes(txn.status)" class="balance-alert mb-4">
      <v-icon color="error" size="24" class="mr-3 pulse-icon">mdi-alert</v-icon>
      <div>
        <div class="font-weight-bold" style="color: var(--sp-accent-error)">Yetersiz Bayi Bakiyesi!</div>
        <div class="text-caption" style="color: var(--sp-text-muted)">Lütfen bu hesaba para göndermeyin, bayinin bakiyesi yeterli değil. İşlemi reddedin!</div>
      </div>
    </div>

    <!-- ===== REJECTION REASON ===== -->
    <div v-if="txn.rejection_reason" class="reject-alert mb-4">
      <v-icon color="error" size="20" class="mr-3">mdi-alert-circle</v-icon>
      <div>
        <div class="text-caption font-weight-bold" style="color: var(--sp-text-muted)">RED SEBEBİ</div>
        <div style="color: var(--sp-text)">{{ txn.rejection_reason }}</div>
      </div>
    </div>

    <v-row>
      <!-- ===== LEFT COLUMN ===== -->
      <v-col cols="12" :lg="isSuperAdmin ? 8 : 12">

        <!-- Tutar Detayları -->
        <div class="detail-section mb-4">
          <div class="section-title">
            <v-icon size="16" class="mr-2" style="color: var(--sp-primary)">mdi-currency-try</v-icon>
            Tutar Bilgileri
          </div>
          <v-row dense>
            <v-col cols="6" sm="3">
              <div class="detail-box">
                <div class="detail-label">Talep Edilen</div>
                <div class="detail-value">{{ formatCurrency(txn.requested_amount) }}</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="detail-box">
                <div class="detail-label">Onaylanan</div>
                <div class="detail-value" :style="txn.amount ? 'color: var(--sp-accent-success)' : ''">{{ txn.amount ? formatCurrency(txn.amount) : '--' }}</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="detail-box">
                <div class="detail-label">Para Birimi</div>
                <div class="detail-value">{{ txn.currency }}</div>
              </div>
            </v-col>
            <v-col v-if="isSuperAdmin" cols="6" sm="3">
              <div class="detail-box">
                <div class="detail-label">Bayi İşlem No</div>
                <div class="detail-value text-truncate" style="font-size: 14px"><code class="iban-code">{{ txn.merchant_trx_id || '--' }}</code></div>
              </div>
            </v-col>
          </v-row>

          <!-- Komisyon (sadece super admin) -->
          <div v-if="isSuperAdmin && txn.merchant_fee_percent != null" class="mt-3">
            <div class="section-divider" />
            <div class="detail-label mb-2" style="font-size: 10px; letter-spacing: 1px">KOMİSYON DAĞILIMI</div>
            <v-row dense>
              <v-col cols="12" sm="6" md="4">
                <div class="detail-mini">
                  <div class="detail-mini-label">Oran</div>
                  <div class="detail-mini-value" style="color: var(--sp-accent-amber)">%{{ txn.merchant_fee_percent }}</div>
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="detail-mini">
                  <div class="detail-mini-label">Komisyon</div>
                  <div class="detail-mini-value" style="color: var(--sp-accent-amber)">{{ formatCurrency(txn.merchant_fee_amount || 0) }}</div>
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="detail-mini">
                  <div class="detail-mini-label">Grup (%{{ txn.operator_fee_percent || 0 }})</div>
                  <div class="detail-mini-value" style="color: var(--sp-accent-cyan)">{{ formatCurrency(txn.operator_fee_amount || 0) }}</div>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="detail-mini">
                  <div class="detail-mini-label">Sahip Kârı</div>
                  <div class="detail-mini-value" style="color: var(--sp-accent-success)">{{ formatCurrency(txn.owner_fee_amount || 0) }}</div>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="detail-mini">
                  <div class="detail-mini-label">Bayiye Net</div>
                  <div class="detail-mini-value">{{ txn.amount ? formatCurrency(txn.amount - (txn.merchant_fee_amount || 0)) : '--' }}</div>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Bayi & Müşteri + Banka & Grup -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <div class="detail-section h-100">
              <div class="section-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-primary)">{{ isSuperAdmin ? 'mdi-store' : 'mdi-account' }}</v-icon>
                {{ isSuperAdmin ? 'Bayi & Müşteri' : 'Müşteri' }}
              </div>
              <div class="detail-grid">
                <div v-if="isSuperAdmin">
                  <div class="detail-label">Bayi</div>
                  <div class="detail-text">{{ txn.merchant?.name || '--' }}</div>
                </div>
                <div>
                  <div class="detail-label">Müşteri ID</div>
                  <div class="detail-text">{{ txn.customer?.external_id || '--' }}</div>
                </div>
                <div>
                  <div class="detail-label">Ad Soyad</div>
                  <div class="detail-text">{{ customerName }}</div>
                </div>
                <div>
                  <div class="detail-label">E-posta</div>
                  <div class="detail-text">{{ txn.customer?.email || '--' }}</div>
                </div>
              </div>
            </div>
          </v-col>
          <v-col v-if="isSuperAdmin" cols="12" md="6">
            <div class="detail-section h-100">
              <div class="section-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-primary)">mdi-bank</v-icon>
                Operatör Banka Hesabı
              </div>
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Banka</div>
                  <div class="detail-text">{{ txn.bank_account?.bank_name || '--' }}</div>
                </div>
                <div>
                  <div class="detail-label">Hesap Sahibi</div>
                  <div class="detail-text">{{ txn.bank_account?.account_holder || '--' }}</div>
                </div>
                <div style="grid-column: 1 / -1">
                  <div class="detail-label">IBAN</div>
                  <div class="detail-text"><code v-if="txn.bank_account?.iban" class="iban-code">{{ txn.bank_account.iban }}</code><span v-else>--</span></div>
                </div>
                <div>
                  <div class="detail-label">Alt Grup</div>
                  <div class="detail-text">
                    <v-chip v-if="txn.sub_group" size="x-small" variant="tonal" color="primary">{{ txn.sub_group.name }}</v-chip>
                    <span v-else>--</span>
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Çekim: Oyuncu Banka -->
        <div v-if="txn.type === 'withdrawal'" class="detail-section mb-4">
          <div class="section-title">
            <v-icon size="16" class="mr-2" style="color: var(--sp-accent-cyan)">mdi-credit-card</v-icon>
            Oyuncu Banka Bilgileri
          </div>
          <v-row dense>
            <v-col cols="12" sm="4">
              <div class="detail-label">IBAN</div>
              <div class="detail-text"><code class="iban-code">{{ txn.player_iban || '--' }}</code></div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="detail-label">Hesap Sahibi</div>
              <div class="detail-text">{{ txn.player_account_holder || '--' }}</div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="detail-label">Banka</div>
              <div class="detail-text">{{ txn.player_bank_name || '--' }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- İşlem Süreci -->
        <div class="detail-section mb-4">
          <div class="section-title">
            <v-icon size="16" class="mr-2" style="color: var(--sp-accent-amber)">mdi-account-clock</v-icon>
            İşlem Süreci
          </div>

          <!-- Timeline-like steps -->
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
                <div class="step-title d-flex align-center ga-2">
                  İşleme Alındı
                  <v-chip v-if="txn.locker" size="x-small" variant="tonal" color="warning">{{ txn.locker.name }}</v-chip>
                </div>
                <div class="step-time">{{ txn.locked_at ? formatDate(txn.locked_at) : '--' }}</div>
              </div>
            </div>

            <div class="process-step" v-if="txn.customer_notified_at">
              <div class="step-dot step-dot--warning" />
              <div class="step-content">
                <div class="step-title">Oyuncu Ödeme Bildirdi</div>
                <div class="step-time">{{ formatDate(txn.customer_notified_at) }}</div>
              </div>
            </div>

            <div class="process-step" v-if="txn.status === 'approved'">
              <div class="step-dot step-dot--success" />
              <div class="step-content">
                <div class="step-title d-flex align-center ga-2">
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

            <!-- Waiting step for active transactions -->
            <div class="process-step" v-if="['pending', 'assigned', 'processing'].includes(txn.status)">
              <div class="step-dot step-dot--waiting" />
              <div class="step-content">
                <div class="step-title" style="color: var(--sp-text-dimmer)">Onay Bekleniyor...</div>
                <div class="step-time" v-if="txn.expires_at">Son: {{ formatDate(txn.expires_at) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Teknik Bilgiler (collapsed) -->
        <v-expansion-panels variant="accordion" class="mb-4">
          <v-expansion-panel class="tech-panel">
            <v-expansion-panel-title class="text-caption font-weight-bold" style="color: var(--sp-text-dimmer)">
              <v-icon size="14" class="mr-2">mdi-code-braces</v-icon> TEKNİK BİLGİLER
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row dense>
                <v-col cols="6" sm="4">
                  <div class="detail-label">Idempotency Key</div>
                  <div class="detail-text text-truncate"><code class="iban-code" style="font-size: 11px">{{ txn.idempotency_key || '--' }}</code></div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="detail-label">Son Geçerlilik</div>
                  <div class="detail-text">{{ txn.expires_at ? formatDate(txn.expires_at) : '--' }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="detail-label">İşlem ID</div>
                  <div class="detail-text text-truncate"><code class="iban-code" style="font-size: 11px">{{ txn.id }}</code></div>
                </v-col>
              </v-row>

              <!-- Audit Log -->
              <div class="section-divider my-3" />
              <div class="detail-label mb-2" style="font-size: 10px; letter-spacing: 1px">İŞLEM GEÇMİŞİ</div>
              <div v-for="log in txn.logs" :key="log.id" class="log-entry">
                <v-icon :color="logColor(log.action)" size="14" class="mr-2">{{ logIcon(log.action) }}</v-icon>
                <span class="font-weight-medium">{{ actionText(log.action) }}</span>
                <span v-if="log.from_status" class="ml-1">
                  <span style="color: var(--sp-text-dimmer)">{{ statusText(log.from_status) }}</span>
                  <v-icon size="12" class="mx-1" style="color: var(--sp-text-faint)">mdi-arrow-right</v-icon>
                  <span :style="`color: ${statusHex(log.to_status)}`">{{ statusText(log.to_status) }}</span>
                </span>
                <span class="log-meta ml-auto">{{ log.user?.name || 'Sistem' }} &bull; {{ formatDate(log.created_at) }}</span>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Notlar -->
        <div v-if="txn.notes" class="detail-section mb-4">
          <div class="section-title">
            <v-icon size="16" class="mr-2" style="color: var(--sp-text-dimmer)">mdi-note-text</v-icon>
            Notlar
          </div>
          <div class="text-body-2" style="color: var(--sp-text-secondary)">{{ txn.notes }}</div>
        </div>
      </v-col>

      <!-- ===== RIGHT COLUMN: Webhooks (super admin only) ===== -->
      <v-col v-if="isSuperAdmin" cols="12" lg="4">
        <div class="detail-section sticky-panel">
          <div class="d-flex align-center mb-3">
            <div class="section-title mb-0">
              <v-icon size="16" class="mr-2" style="color: var(--sp-primary)">mdi-webhook</v-icon>
              Webhook
            </div>
            <v-spacer />
            <v-btn
              v-if="['approved', 'rejected'].includes(txn.status)"
              size="x-small"
              color="warning"
              variant="tonal"
              @click="retryWebhook"
              :loading="retryingWebhook"
            >
              <v-icon start size="12">mdi-refresh</v-icon> Tekrar
            </v-btn>
          </div>

          <div v-if="txn.webhook_logs?.length">
            <div
              v-for="wh in txn.webhook_logs"
              :key="wh.id"
              class="wh-entry"
              @click="selectedWebhook = wh"
            >
              <div class="d-flex align-center">
                <div class="wh-dot" :class="`wh-dot--${wh.status}`" />
                <span class="text-body-2 font-weight-medium" style="color: var(--sp-text)">Deneme #{{ wh.attempt }}</span>
                <v-spacer />
                <span class="wh-code">{{ wh.response_code || (wh.status === 'success' ? 'OK' : wh.status === 'failed' ? 'ERR' : '...') }}</span>
              </div>
              <div class="text-caption mt-1" style="color: var(--sp-text-dim); padding-left: 18px">
                {{ wh.sent_at ? formatDate(wh.sent_at) : 'Beklemede' }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6" style="color: var(--sp-text-dim)">
            <v-icon size="32" class="mb-2" style="color: var(--sp-text-ghost)">mdi-webhook</v-icon>
            <div class="text-caption">Webhook gönderilmedi</div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- ===== DIALOGS ===== -->

    <!-- Webhook Detail -->
    <v-dialog v-model="webhookDetailDialog" max-width="650">
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

    <!-- Approve Dialog -->
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
            :placeholder="String(txn.requested_amount)"
            hint="Talep edilen tutarı kullanmak için boş bırakın"
            persistent-hint
          />

          <!-- Bank Account selector for withdrawals -->
          <div v-if="txn.type === 'withdrawal'" class="mt-4">
            <v-select
              v-model="approveBankAccountId"
              :items="operatorBankAccounts"
              item-title="label"
              item-value="id"
              label="Kullanılan Banka Hesabı"
              variant="outlined"
              density="compact"
              :loading="loadingBankAccounts"
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

    <!-- Reject Dialog -->
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
          <v-textarea v-model="rejectReason" label="Red Sebebi" variant="outlined" :rules="[v => !!v || 'Gerekli']" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectDialog = false">İptal</v-btn>
          <v-btn
            color="error" variant="elevated" @click="handleReject" :loading="acting"
            :disabled="!rejectReason || (txn?.type === 'deposit' && rejectCooldownSeconds > 0)"
          >
            Reddet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <!-- Loading -->
  <div v-else class="d-flex flex-column justify-center align-center" style="min-height: 400px">
    <v-progress-circular indeterminate color="primary" size="40" width="3" />
    <div class="text-caption mt-3" style="color: var(--sp-text-dim)">Yükleniyor...</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import api from '@/plugins/axios'

const route = useRoute()
const auth = useAuthStore()
const txnStore = useTransactionStore()

const txn = ref(null)
const acting = ref(false)
const approveDialog = ref(false)
const rejectDialog = ref(false)
const approveAmount = ref(null)
const rejectReason = ref('')
const approveError = ref('')
const retryingWebhook = ref(false)
const selectedWebhook = ref(null)
const webhookDetailDialog = ref(false)
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
const txnType = computed(() => txn.value?.type)

const canAct = computed(() => txn.value && ['pending', 'assigned', 'processing'].includes(txn.value.status))
const canLock = computed(() => {
  if (!txn.value || txn.value.status !== 'assigned') return false
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

async function loadTxn() {
  const { data } = await api.get(`/portal/transactions/${route.params.id}`)
  txn.value = data
}

async function handleLock() {
  acting.value = true
  try { await txnStore.lock(txn.value.id); await loadTxn() } finally { acting.value = false }
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

async function handleApprove() {
  approveAttempted.value = true

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
    await loadTxn()
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
    await txnStore.reject(txn.value.id, rejectReason.value)
    rejectDialog.value = false
    await loadTxn()
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

async function retryWebhook() {
  retryingWebhook.value = true
  try { await api.post(`/portal/transactions/${txn.value.id}/retry-webhook`); setTimeout(() => loadTxn(), 2000) }
  catch (e) { alert(e.response?.data?.message || 'Webhook başarısız') }
  finally { retryingWebhook.value = false }
}

watch(selectedWebhook, v => { if (v) webhookDetailDialog.value = true })
watch(webhookDetailDialog, v => { if (!v) selectedWebhook.value = null })

onMounted(() => loadTxn())
</script>

<style scoped>
/* Fixed-width digits so the surrounding text doesn't reflow each tick. */
.tnum {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  display: inline-block;
}

/* ── Back Button ── */
.back-btn {
  color: var(--sp-text-dimmer) !important;
}
.back-btn:hover {
  color: var(--sp-text) !important;
}

/* ── Status Banner ── */
.status-banner {
  padding: 20px 24px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-modal-bg) 0%, var(--sp-surface-bright) 100%);
  border: 1px solid var(--sp-badge-bg);
}
.status-banner--approved { border-left: 4px solid var(--sp-accent-success); }
.status-banner--rejected { border-left: 4px solid var(--sp-accent-error); }
.status-banner--processing { border-left: 4px solid var(--sp-accent-amber); }
.status-banner--assigned { border-left: 4px solid var(--sp-text-muted); }
.status-banner--pending { border-left: 4px solid var(--sp-text-muted); }
.status-banner--expired { border-left: 4px solid var(--sp-text-muted); }
.status-banner--cancelled { border-left: 4px solid var(--sp-text-muted); }

.status-icon-wrap {
  width: 48px; height: 48px; border-radius: 0;
  background: var(--sp-accent-border-vivid);
  display: flex; align-items: center; justify-content: center;
}
.status-ref { font-size: 20px; font-weight: 800; color: var(--sp-text); letter-spacing: -0.5px; }
.status-type { font-size: 12px; color: var(--sp-text-dimmer); font-weight: 500; }
.merchant-ref-badge {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(var(--sp-primary-rgb),0.7);
  background: rgba(var(--sp-primary-rgb),0.08);
  border: 1px solid rgba(var(--sp-primary-rgb),0.12);
  padding: 1px 8px; border-radius: 0;
}
.status-amount { font-size: 28px; font-weight: 800; color: var(--sp-text); letter-spacing: -0.5px; }
.status-currency { font-size: 14px; font-weight: 600; color: var(--sp-text-dimmer); }

.action-btn { font-weight: 600; letter-spacing: 0.2px; }
.action-btn--approve { color: var(--sp-accent-success) !important; }
.action-btn--reject { color: var(--sp-accent-error) !important; }

/* ── Alerts ── */
.payment-alert {
  display: flex; align-items: center;
  padding: 16px 20px; border-radius: 0;
  background: rgba(255,190,91,0.08);
  border: 1px solid rgba(255,190,91,0.15);
}
.reject-alert {
  display: flex; align-items: flex-start;
  padding: 14px 18px; border-radius: 0;
  background: rgba(255,142,130,0.06);
  border: 1px solid rgba(255,142,130,0.12);
}
.balance-alert {
  display: flex; align-items: flex-start;
  padding: 14px 18px; border-radius: 0;
  background: rgba(255,142,130,0.08);
  border: 1px solid rgba(255,142,130,0.2);
}

/* ── Detail Sections ── */
.detail-section {
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-divider);
  border-radius: 0;
  padding: 20px;
}
.section-title {
  display: flex; align-items: center;
  font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--sp-text-muted);
  margin-bottom: 16px;
  text-transform: uppercase;
}
.section-divider {
  height: 1px;
  background: var(--sp-divider);
  margin: 12px 0;
}

.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.detail-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
  color: var(--sp-text-hint);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.detail-text {
  font-size: 14px; font-weight: 500;
  color: var(--sp-text);
}

.detail-box {
  background: rgba(var(--sp-primary-rgb),0.03);
  border: 1px solid rgba(var(--sp-primary-rgb),0.04);
  border-radius: 0;
  padding: 12px 14px;
}
.detail-value {
  font-size: 18px; font-weight: 700;
  color: var(--sp-text);
}

.detail-mini {
  text-align: center;
  padding: 8px;
  background: rgba(var(--sp-primary-rgb),0.03);
  border-radius: 0;
}
.detail-mini-label {
  font-size: 10px; font-weight: 600;
  color: var(--sp-text-dim);
  text-transform: uppercase;
  margin-bottom: 2px;
}
.detail-mini-value {
  font-size: 15px; font-weight: 700;
  color: var(--sp-text);
}

.iban-code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--sp-primary);
  background: rgba(var(--sp-primary-rgb),0.06);
  padding: 2px 6px;
  border-radius: 0;
}

/* ── Process Steps ── */
.process-steps {
  position: relative;
  padding-left: 20px;
}
.process-steps::before {
  content: '';
  position: absolute;
  left: 5px; top: 8px; bottom: 8px;
  width: 2px;
  background: var(--sp-accent-bg-hover);
}
.process-step {
  display: flex; align-items: flex-start;
  margin-bottom: 16px;
  position: relative;
}
.process-step:last-child { margin-bottom: 0; }
.step-dot {
  width: 12px; height: 12px; border-radius: 50%;
  position: absolute; left: -20px; top: 3px;
  z-index: 1;
}
.step-dot--done { background: var(--sp-primary); box-shadow: 0 0 8px rgba(var(--sp-primary-rgb),0.3); }
.step-dot--success { background: var(--sp-accent-success); box-shadow: 0 0 8px rgba(102,241,189,0.3); }
.step-dot--warning { background: var(--sp-accent-amber); box-shadow: 0 0 8px rgba(255,190,91,0.3); }
.step-dot--error { background: var(--sp-accent-error); box-shadow: 0 0 8px rgba(255,142,130,0.3); }
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

.step-content { padding-left: 4px; }
.step-title { font-size: 13px; font-weight: 600; color: var(--sp-text); }
.step-time { font-size: 11px; color: var(--sp-text-hint); margin-top: 2px; }

/* ── Webhook Entries ── */
.wh-entry {
  padding: 10px 12px;
  border-radius: 0;
  cursor: pointer;
  margin-bottom: 6px;
  background: rgba(var(--sp-primary-rgb),0.03);
  border: 1px solid rgba(var(--sp-primary-rgb),0.04);
  transition: all 0.15s ease;
}
.wh-entry:hover {
  background: var(--sp-divider);
  border-color: var(--sp-badge-bg);
}
.wh-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; flex-shrink: 0;
}
.wh-dot--success { background: var(--sp-accent-success); }
.wh-dot--failed { background: var(--sp-accent-error); }
.wh-dot--pending { background: var(--sp-text-muted); }

.wh-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 600;
  color: var(--sp-text-muted);
  padding: 2px 6px;
  background: var(--sp-divider);
  border-radius: 0;
}

/* ── Log Entries ── */
.log-entry {
  display: flex; align-items: center; flex-wrap: wrap;
  padding: 6px 0;
  font-size: 12px;
  color: var(--sp-text-secondary);
  border-bottom: 1px solid rgba(var(--sp-primary-rgb),0.04);
}
.log-entry:last-child { border-bottom: none; }
.log-meta {
  font-size: 11px;
  color: var(--sp-text-dim);
}

/* ── Tech Panel ── */
.tech-panel {
  background: var(--sp-card-bg) !important;
  border: 1px solid var(--sp-divider) !important;
}

/* ── Code Block ── */
.code-block {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: var(--sp-bg);
  color: var(--sp-text);
  border: 1px solid var(--sp-divider);
  border-radius: 0;
  padding: 12px 16px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 250px;
}

/* ── Sticky Panel ── */
.sticky-panel {
  position: sticky;
  top: 76px;
}

/* ── Pulse Icon ── */
.pulse-icon {
  animation: pulse-warn 1.5s ease-in-out infinite;
}
@keyframes pulse-warn {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

/* Light mode */
:global(.v-theme--lightComfort .detail-section) {
  box-shadow: 0 1px 4px rgba(16,33,27, 0.06);
}
:global(.v-theme--lightComfort .status-banner) {
  box-shadow: 0 1px 3px rgba(16,33,27, 0.04);
}
:global(.v-theme--lightComfort .tech-panel) {
  box-shadow: 0 1px 3px rgba(16,33,27, 0.04);
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .status-banner .d-flex.align-center.flex-wrap {
    flex-direction: column;
    align-items: flex-start !important;
  }
  .status-banner .text-right {
    text-align: left !important;
    margin-top: 8px;
  }
  .status-amount {
    font-size: 22px;
  }
  .status-ref {
    font-size: 16px;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .status-banner {
    padding: 14px 16px;
  }
  .status-amount {
    font-size: 18px;
  }
  .status-icon-wrap {
    width: 38px;
    height: 38px;
  }
  .detail-section {
    padding: 14px;
  }
  .detail-value {
    font-size: 15px;
  }
  .detail-mini-value {
    font-size: 13px;
  }
  .log-entry {
    font-size: 11px;
  }
  .log-meta {
    font-size: 10px;
    width: 100%;
    margin-top: 2px;
  }
}
</style>
