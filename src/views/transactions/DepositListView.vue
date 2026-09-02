<template>
  <v-card>
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon start color="success">mdi-plus-circle</v-icon>
      Yatırımlar
      <v-spacer />
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="No, kullanıcı adı, ad soyad ile ara..."
        density="compact"
        variant="outlined"
        hide-details
        class="search-field"
        @keyup.enter="loadData"
      />
    </v-card-title>

    <!-- ── Filter bar — modern, surfaces the most-used controls inline.
         Mirrors the WithdrawalListView layout for visual consistency. ── -->
    <div class="filter-shell">
      <!-- Quick status pills -->
      <div class="filter-row filter-status-row">
        <button
          v-for="opt in statusQuickOptions"
          :key="opt.value || 'all'"
          class="status-pill"
          :class="[opt.color, { 'is-active': (statusFilter || '') === opt.value }]"
          type="button"
          @click="setStatusQuick(opt.value)"
        >
          <v-icon size="13" class="mr-1">{{ opt.icon }}</v-icon>{{ opt.text }}
        </button>
      </div>

      <!-- Date preset chips -->
      <div class="filter-row filter-date-row">
        <button
          v-for="p in datePresets"
          :key="p.id"
          class="date-pill"
          :class="{ 'is-active': activeDatePreset === p.id }"
          type="button"
          @click="applyDatePreset(p.id)"
        >
          <v-icon size="12" class="mr-1">{{ p.icon }}</v-icon>{{ p.label }}
        </button>
        <v-btn
          variant="text"
          size="small"
          class="more-btn"
          @click="showFilters = !showFilters"
        >
          <v-icon start size="16">{{ showFilters ? 'mdi-chevron-up' : 'mdi-tune-variant' }}</v-icon>
          Daha Fazla
          <v-chip v-if="activeFilterCount > 0 && !showFilters" size="x-small" color="primary" class="ml-2">{{ activeFilterCount }}</v-chip>
        </v-btn>
        <v-btn
          v-if="activeFilterCount > 0"
          variant="text"
          size="small"
          color="warning"
          @click="clearFilters"
        >
          <v-icon start size="16">mdi-filter-off-outline</v-icon>Temizle
        </v-btn>
      </div>

      <!-- Active filter chips -->
      <div v-if="activeFilterChips.length" class="filter-row filter-chip-row">
        <v-chip
          v-for="c in activeFilterChips"
          :key="c.key"
          size="small"
          variant="tonal"
          color="primary"
          closable
          class="active-filter-chip"
          @click:close="clearFilter(c.key)"
        >
          <span class="chip-key">{{ c.label }}:</span>&nbsp;<span class="chip-val">{{ c.value }}</span>
        </v-chip>
      </div>

      <!-- Expandable "Daha Fazla" panel -->
      <v-expand-transition>
        <div v-if="showFilters" class="filter-row filter-advanced">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="dateFrom" label="Başlangıç" type="datetime-local" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-calendar-start" @change="onDateChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="dateTo" label="Bitiş" type="datetime-local" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-calendar-end" @change="onDateChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="customerFilter"
                label="Oyuncu ID"
                placeholder="Örn: player-ali-001"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-account-search"
                @keyup.enter="loadData"
                @click:clear="customerFilter = ''; loadData()"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="bankAccountFilter"
                :items="bankAccounts"
                :item-title="bankAccountLabel"
                item-value="id"
                label="Banka Hesabı"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-bank"
                @update:model-value="loadData"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                :model-value="formatAmountInput(amountMin)"
                @update:model-value="v => { amountMin = parseAmountInput(v); }"
                label="Min Tutar"
                type="text"
                inputmode="numeric"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                suffix="TRY"
                @keyup.enter="loadData"
                @click:clear="amountMin = null; loadData()"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                :model-value="formatAmountInput(amountMax)"
                @update:model-value="v => { amountMax = parseAmountInput(v); }"
                label="Max Tutar"
                type="text"
                inputmode="numeric"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                suffix="TRY"
                @keyup.enter="loadData"
                @click:clear="amountMax = null; loadData()"
              />
            </v-col>
            <v-col v-if="seesFinancials" cols="12" md="6">
              <v-autocomplete v-model="merchantFilter" :items="merchants" item-title="name" item-value="id" label="Bayi" variant="outlined" density="compact" hide-details clearable prepend-inner-icon="mdi-store" @update:model-value="loadData" />
            </v-col>
            <v-col v-if="auth.isSuperAdmin" cols="12" md="6">
              <v-select v-model="sandboxFilter" :items="sandboxOptions" item-title="text" item-value="value" label="Ortam" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-test-tube" @update:model-value="loadData" />
            </v-col>
          </v-row>
          <div class="d-flex ga-2 mt-3">
            <v-btn color="primary" variant="flat" @click="loadData" class="flex-grow-1" prepend-icon="mdi-magnify">Ara</v-btn>
            <v-btn variant="text" @click="showFilters = false">Kapat</v-btn>
          </div>
        </div>
      </v-expand-transition>
    </div>

    <v-data-table-server
      :headers="visibleHeaders"
      :items="txnStore.items"
      :items-length="txnStore.pagination?.total || 0"
      :loading="txnStore.loading"
      :items-per-page="20"
      @update:page="page = $event; loadData()"
      density="compact"
      no-data-text="Yatırım işlemi bulunamadı"
      loading-text="Yükleniyor..."
      :row-props="rowProps"
      :hover="auth.isSuperAdmin"
      @click:row="openDetail"
    >
      <template v-slot:item.internal_id="{ item }">
        <div style="line-height: 1.3">
          <div class="font-weight-bold" style="font-size: 14px; color: var(--sp-text)">#{{ item.internal_id }}</div>
          <div v-if="auth.isSuperAdmin && item.merchant_trx_id" class="text-caption" style="color: var(--sp-text-hint); font-family: 'JetBrains Mono', monospace; font-size: 10px">
            {{ item.merchant_trx_id }}
          </div>
        </div>
      </template>
      <template v-slot:item.customer="{ item }">
        <div style="line-height: 1.35">
          <div class="font-weight-bold" style="font-size: 14px; color: var(--sp-text)">{{ customerFullName(item) }}</div>
          <div v-if="item.customer?.external_id" class="text-caption" style="color: var(--sp-accent-info); font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600">@{{ item.customer.external_id }}</div>
        </div>
      </template>
      <template v-slot:item.environment="{ item }">
        <v-chip v-if="item.is_sandbox" size="x-small" color="warning">Sandbox</v-chip>
        <v-chip v-else size="x-small" color="success">Canlı</v-chip>
      </template>
      <template v-slot:item.merchant="{ item }">
        <span v-if="item.merchant?.name" class="font-weight-bold" style="color: var(--sp-text)">{{ item.merchant.name }}</span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template v-slot:item.status="{ item }">
        <div class="status-cell">
          <div class="d-flex align-center ga-1 flex-wrap">
            <v-chip :color="statusColor(item.status)" size="default" variant="flat" class="status-chip font-weight-bold" label>
              <v-icon start size="16">{{ statusIcon(item.status) }}</v-icon>
              {{ statusText(item.status) }}
            </v-chip>
            <v-tooltip v-if="item.customer_notified_at && !['approved','rejected','expired','cancelled'].includes(item.status)" text="Oyuncu ödeme yaptığını bildirdi" location="top">
              <template v-slot:activator="{ props }">
                <v-chip v-bind="props" color="warning" variant="flat" size="small" class="notification-pulse font-weight-bold" label>
                  <v-icon start size="14">mdi-cash-check</v-icon>
                  Ödendi
                </v-chip>
              </template>
            </v-tooltip>
          </div>
          <!-- Operator finalization time — locked → resolved. Same badge
               as the withdrawal page so SA can review throughput across
               both transaction types with one visual language. -->
          <v-tooltip
            v-if="finalizationMinutes(item) != null"
            :text="`Operatör kilitleme → karar: ${finalizationMinutes(item)} dakika`"
            location="top"
          >
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="finalize-badge" :class="finalizeBadgeClass(item)">
                <v-icon size="10" class="mr-1">mdi-timer-outline</v-icon>{{ finalizationMinutes(item) }} dk
              </span>
            </template>
          </v-tooltip>
        </div>
      </template>
      <template v-slot:item.requested_amount="{ item }">
        <div style="line-height: 1.4">
          <div class="d-flex align-center ga-1">
            <div class="amount-text font-weight-bold">{{ formatCurrency(item.requested_amount) }} <span class="amount-currency">{{ item.currency }}</span></div>
            <!-- Inline amount edit — only on rows the operator can act on.
                 Edited value is staged client-side and used on the next
                 Approve click; the row shows "Onaylanacak: X" until then. -->
            <v-tooltip v-if="canActOnLocked(item)" text="Onay tutarını düzenle" location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="14" color="primary" style="cursor:pointer" @click.stop="openAmountEdit(item)">mdi-pencil-outline</v-icon>
              </template>
            </v-tooltip>
          </div>
          <div v-if="pendingAmounts[item.id] != null && Number(pendingAmounts[item.id]) !== Number(item.requested_amount)" class="amount-approved" style="color: var(--sp-accent-amber)">
            Onaylanacak: {{ formatCurrency(pendingAmounts[item.id]) }} {{ item.currency }}
          </div>
          <div v-else-if="item.amount && Number(item.amount) !== Number(item.requested_amount)" class="amount-approved">
            Onay: {{ formatCurrency(item.amount) }} {{ item.currency }}
          </div>
        </div>
      </template>
      <template v-slot:item.bank_account="{ item }">
        <div v-if="item.bank_account" style="line-height: 1.4">
          <div v-if="item.bank_account.bank_name" class="font-weight-bold" style="color: var(--sp-accent-blue); font-size: 13px">{{ item.bank_account.bank_name }}</div>
          <div class="font-weight-bold" style="color: var(--sp-text); font-size: 12px">{{ item.bank_account.account_holder }}</div>
          <div class="d-flex align-center ga-1">
            <div class="text-caption text-medium-emphasis" style="font-family: 'JetBrains Mono', monospace; font-size: 10px">{{ item.bank_account.iban }}</div>
            <v-tooltip text="IBAN kopyala" location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="14" :color="copiedIban === item.bank_account.iban ? 'success' : 'primary'" style="cursor:pointer" @click.stop="copyIban(item.bank_account.iban)">
                  {{ copiedIban === item.bank_account.iban ? 'mdi-check' : 'mdi-content-copy' }}
                </v-icon>
              </template>
            </v-tooltip>
          </div>
        </div>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template v-slot:item.sub_group="{ item }">
        <v-chip v-if="item.sub_group" size="x-small" variant="tonal" color="primary">
          {{ item.sub_group.name }}
        </v-chip>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template v-slot:item.approver="{ item }">
        <v-chip v-if="item.approver" size="x-small" color="success">{{ item.approver.name }}</v-chip>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <!-- Tarih (date-only) — separate column right after ID for at-a-
           glance day grouping. -->
      <template v-slot:item.date_only="{ item }">
        <div class="date-cell">{{ formatDateOnly(item.created_at) }}</div>
      </template>
      <!-- Saat: created + approved/resolved times stacked. Date no longer
           repeated here (it lives in the Tarih column); the cross-day
           prefix on the resolved row is kept for the rare midnight cross. -->
      <template v-slot:item.created_at="{ item }">
        <div class="time-cell">
          <div class="time-row">
            <v-icon size="11" color="grey">mdi-clock-plus-outline</v-icon>
            <span class="time-val">{{ formatTimeOnly(item.created_at) }}</span>
          </div>
          <div v-if="item.approved_at || item.resolved_at" class="time-row time-row--done">
            <v-icon size="11" :color="item.status === 'approved' ? 'success' : 'error'">
              {{ item.status === 'approved' ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
            </v-icon>
            <span class="time-val">
              <template v-if="!sameCalendarDay(item.created_at, item.approved_at || item.resolved_at)">
                {{ formatDateOnly(item.approved_at || item.resolved_at).slice(0,5) }}
              </template>
              {{ formatTimeOnly(item.approved_at || item.resolved_at) }}
            </span>
          </div>
          <div v-if="showCounter(item)" class="counter-bar" :class="counterClass(item)">
            {{ elapsedDisplay(item) }}
          </div>
        </div>
      </template>
      <template v-slot:item.actions="{ item }">
        <div class="d-flex ga-1 justify-end">
          <!-- Stage 1: ÜZERİME AL — for unlocked pending/assigned txns -->
          <v-btn
            v-if="canLock(item)"
            size="small"
            variant="tonal"
            color="primary"
            @click="handleLock(item)"
            :loading="actingId === item.id"
            prepend-icon="mdi-hand-extended"
          >
            İşleme Al
          </v-btn>
          <!-- Stage 2: ONAYLA / REDDET — after operator has locked it -->
          <template v-else-if="canActOnLocked(item)">
            <v-btn
              v-if="canApproveItem(item)"
              size="small"
              variant="flat"
              color="success"
              @click="openApprove(item)"
              prepend-icon="mdi-check"
            >
              Onayla
            </v-btn>
            <v-btn
              v-if="canRejectItem(item)"
              size="small"
              variant="flat"
              color="error"
              @click="openReject(item)"
              prepend-icon="mdi-close"
            >
              Reddet
            </v-btn>
          </template>
          <!-- Locked by another operator -->
          <v-tooltip v-else-if="item.locker && item.locked_by !== auth.user?.id" :text="`${item.locker.name} işliyor`" location="top">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="20" color="warning">mdi-lock</v-icon>
            </template>
          </v-tooltip>
        </div>
      </template>
    </v-data-table-server>

    <!-- Confirm: Approve — bold, hero-style modal. The amount is the
         single thing the operator should re-read before clicking, so it
         dominates the layout. Any amount adjustment must already be
         staged via the pencil button next to the amount cell. -->
    <v-dialog v-model="approveDialog" max-width="480">
      <v-card v-if="selectedTxn" class="approve-card">
        <!-- Header band: green gradient, big check, bold prompt -->
        <div class="approve-hero">
          <div class="approve-hero-icon">
            <v-icon size="44" color="white">mdi-check-decagram</v-icon>
          </div>
          <div class="approve-hero-title">İŞLEMİ ONAYLA</div>
          <div class="approve-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- Amount block: the eye magnet -->
        <div class="approve-amount-block">
          <div class="approve-amount-label">{{ amountChangedFromRequest ? 'Onaylanacak Tutar' : 'Talep Edilen Tutar' }}</div>
          <div class="approve-amount-value">
            {{ formatCurrency(approveStagedAmount) }}
            <span class="approve-amount-cur">{{ selectedTxn.currency }}</span>
          </div>
          <div v-if="amountChangedFromRequest" class="approve-amount-note">
            <v-icon size="14" color="warning" class="mr-1">mdi-pencil</v-icon>
            Talep: <strong>{{ formatCurrency(selectedTxn.requested_amount) }} {{ selectedTxn.currency }}</strong> (operatör tarafından düzenlendi)
          </div>
        </div>

        <!-- Customer + bank summary so operator double-checks before clicking -->
        <div class="approve-meta">
          <div v-if="selectedTxn.customer" class="approve-meta-row">
            <v-icon size="16" color="primary">mdi-account</v-icon>
            <span>{{ customerFullName(selectedTxn) }}</span>
          </div>
          <div v-if="selectedTxn.bank_account" class="approve-meta-row">
            <v-icon size="16" color="primary">mdi-bank</v-icon>
            <span>{{ selectedTxn.bank_account.bank_name }} — {{ selectedTxn.bank_account.account_holder }}</span>
          </div>
        </div>

        <!-- Warning band -->
        <div class="approve-warning">
          <v-icon size="20" color="warning" class="mr-2">mdi-alert-circle</v-icon>
          <div>
            <div class="approve-warning-title">Bu işlem geri alınamaz</div>
            <div class="approve-warning-text">Paranın hesabınıza geçtiğinden emin olun.</div>
          </div>
        </div>

        <v-alert v-if="approveError" type="error" density="compact" class="mx-5 mb-3">{{ approveError }}</v-alert>

        <!-- Big actions -->
        <v-card-actions class="approve-actions">
          <v-btn variant="text" size="large" @click="approveDialog = false" class="flex-grow-1">Vazgeç</v-btn>
          <v-btn color="success" variant="flat" size="large" @click="confirmApprove" :loading="actingId === selectedTxn?.id" class="flex-grow-1 approve-confirm-btn" prepend-icon="mdi-check-bold">
            Evet, Onayla
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit amount before approving — same hero shape as the approve /
         reject confirm dialogs (purple palette for "edit"). Saved value
         persists in localStorage so a refresh doesn't wipe the draft. -->
    <v-dialog v-model="amountEditDialog" max-width="480">
      <v-card v-if="selectedTxn" class="amount-edit-card">
        <!-- Header band: purple gradient, big pencil, bold prompt -->
        <div class="amount-edit-hero">
          <div class="amount-edit-hero-icon">
            <v-icon size="44" color="white">mdi-pencil-circle</v-icon>
          </div>
          <div class="amount-edit-hero-title">ONAY TUTARINI DÜZENLE</div>
          <div class="amount-edit-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- Talep edilen — mirror of the approve modal's amount block -->
        <div class="amount-edit-amount-block">
          <div class="amount-edit-amount-label">Talep Edilen Tutar</div>
          <div class="amount-edit-amount-value">
            {{ formatCurrency(selectedTxn.requested_amount) }}
            <span class="amount-edit-amount-cur">{{ selectedTxn.currency }}</span>
          </div>
        </div>

        <!-- Input — type="text" + inputmode="numeric" so the dot
             thousand-separator doesn't get rejected by a native
             number input. parseAmountInput keeps the model a number. -->
        <div class="amount-edit-input-section">
          <v-text-field
            :model-value="formatAmountInput(editedAmount)"
            @update:model-value="v => editedAmount = parseAmountInput(v)"
            label="Yeni Onay Tutarı"
            type="text"
            inputmode="numeric"
            variant="outlined"
            density="comfortable"
            :hint="amountHint"
            persistent-hint
            autofocus
            :suffix="selectedTxn.currency"
          />
        </div>

        <v-alert v-if="amountEditError" type="error" density="compact" class="mx-5 mb-3">{{ amountEditError }}</v-alert>

        <!-- Actions: split, large, primary purple. Sıfırla shown only
             when there's an override to reset. -->
        <v-card-actions class="amount-edit-actions">
          <v-btn variant="text" size="large" @click="amountEditDialog = false" class="flex-grow-1">Vazgeç</v-btn>
          <v-btn
            v-if="pendingAmounts[selectedTxn.id] != null"
            variant="tonal"
            color="warning"
            size="large"
            @click="clearAmountOverride"
            prepend-icon="mdi-restore"
            class="flex-grow-1"
          >
            Sıfırla
          </v-btn>
          <v-btn
            color="secondary"
            variant="flat"
            size="large"
            @click="saveAmountEdit"
            class="flex-grow-1 amount-edit-confirm-btn"
            prepend-icon="mdi-check-bold"
          >
            Kaydet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm: Reject — hero-style modal in error tones. No reason
         field; server's 10-min hold is the safety net. -->
    <v-dialog v-model="rejectDialog" max-width="480">
      <v-card v-if="selectedTxn" class="reject-card">
        <!-- Header band: red gradient, big X, bold prompt -->
        <div class="reject-hero">
          <div class="reject-hero-icon">
            <v-icon size="44" color="white">mdi-close-octagon</v-icon>
          </div>
          <div class="reject-hero-title">İŞLEMİ REDDET</div>
          <div class="reject-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- Amount block — same eye-magnet as approve, in red -->
        <div class="reject-amount-block">
          <div class="reject-amount-label">Reddedilecek Tutar</div>
          <div class="reject-amount-value">
            {{ formatCurrency(selectedTxn.requested_amount) }}
            <span class="reject-amount-cur">{{ selectedTxn.currency }}</span>
          </div>
        </div>

        <!-- Customer + bank summary -->
        <div class="reject-meta">
          <div v-if="selectedTxn.customer" class="reject-meta-row">
            <v-icon size="16" color="error">mdi-account</v-icon>
            <span>{{ customerFullName(selectedTxn) }}</span>
          </div>
          <div v-if="selectedTxn.bank_account" class="reject-meta-row">
            <v-icon size="16" color="error">mdi-bank</v-icon>
            <span>{{ selectedTxn.bank_account.bank_name }} — {{ selectedTxn.bank_account.account_holder }}</span>
          </div>
        </div>

        <!-- Strong warning band -->
        <div class="reject-warning">
          <v-icon size="20" color="error" class="mr-2">mdi-alert-octagram</v-icon>
          <div>
            <div class="reject-warning-title">Bu işlem geri alınamaz</div>
            <div class="reject-warning-text">Müşterinin parası hesabınıza ulaşmadığından kesinlikle eminseniz devam edin.</div>
          </div>
        </div>

        <v-alert v-if="rejectError" type="error" density="compact" class="mx-5 mb-3">{{ rejectError }}</v-alert>

        <v-card-actions class="reject-actions">
          <v-btn variant="text" size="large" @click="rejectDialog = false" class="flex-grow-1">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" size="large" @click="confirmReject" :loading="actingId === selectedTxn?.id" class="flex-grow-1 reject-confirm-btn" prepend-icon="mdi-close-thick">
            Evet, Reddet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SA-only detail drawer -->
    <TransactionDetailsDrawer v-model="detailDrawer" :txn="detailTxn" />
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import api from '@/plugins/axios'
import TransactionDetailsDrawer from '@/components/TransactionDetailsDrawer.vue'

const txnStore = useTransactionStore()
const auth = useAuthStore()

/*
 * Bayi filtresi ticari bilgidir: rol degil izin belirliyor.
 * Backend de ayni izne (scope.financials) bakiyor, dolayisiyla izni
 * olmayan zaten bayi alanlarini iceren bir yanit almiyor.
 */
const seesFinancials = computed(() => auth.isSuperAdmin || auth.can('scope.financials'))
const notifications = useNotificationStore()
const route = useRoute()
const router = useRouter()

// When a notification routes here with ?highlight={txnId}, we scroll to
// that row and pulse it for ~5s so the operator instantly sees what to
// act on (instead of hunting through the list).
const highlightId = ref(route.query.highlight ? String(route.query.highlight) : null)
let highlightClearTimer = null

function rowProps({ item }) {
  const classes = [`status-row--${item.status}`]
  if (highlightId.value && String(item.id) === highlightId.value) classes.push('highlighted-row')
  return {
    class: classes.join(' '),
    'data-txn-id': item.id,
  }
}

async function scrollToHighlight() {
  if (!highlightId.value) return
  await nextTick()
  // Small delay for v-data-table-server to finish rendering rows
  setTimeout(() => {
    const el = document.querySelector(`tr[data-txn-id="${highlightId.value}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 150)
  if (highlightClearTimer) clearTimeout(highlightClearTimer)
  highlightClearTimer = setTimeout(() => {
    highlightId.value = null
    // Strip the query param so a refresh doesn't re-trigger the highlight
    if (route.query.highlight) {
      const q = { ...route.query }
      delete q.highlight
      router.replace({ query: q })
    }
  }, 5000)
}

watch(() => route.query.highlight, (v) => {
  highlightId.value = v ? String(v) : null
  if (v) scrollToHighlight()
})

// Re-trigger scroll once the data lands (highlighted row may not exist yet
// at mount time if the list is still loading).
watch(() => txnStore.items.length, () => {
  if (highlightId.value) scrollToHighlight()
})


// Live "now" ticker — updated every second so the elapsed counter on each
// row is always current without a full reload. Ably push handles real
// data updates via txnStore.transactionUpdateTick.
const now = ref(Date.now())
let nowTimer = null

watch(() => txnStore.transactionUpdateTick, () => loadData())

// Drop pending amount overrides whose txn has reached a terminal status
// — keeps localStorage from growing unbounded as txns settle.
const TERMINAL_STATUSES = ['approved', 'rejected', 'expired', 'cancelled']
watch(() => txnStore.items, (items) => {
  if (!items?.length) return
  for (const item of items) {
    if (pendingAmounts[item.id] != null && TERMINAL_STATUSES.includes(item.status)) {
      delete pendingAmounts[item.id]
    }
  }
}, { deep: true })

const search = ref('')
const statusFilter = ref(null)
const sandboxFilter = ref('real')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const showFilters = ref(false)

// Advanced filters
const merchantFilter = ref(null)
const customerFilter = ref('')
const amountMin = ref(null)
const amountMax = ref(null)
const bankAccountFilter = ref(null)
const merchants = ref([])
const bankAccounts = ref([])
// Server-resolved date preset — see WithdrawalListView for the same pattern.
const activeDatePreset = ref('all')

// Action state
const actingId = ref(null)
const selectedTxn = ref(null)
const approveDialog = ref(false)
const rejectDialog = ref(false)
const approveError = ref('')
const rejectError = ref('')

// SA detail side pane
const detailDrawer = ref(false)
const detailTxn = ref(null)
function openDetail(event, { item }) {
  if (!auth.isSuperAdmin) return
  const tgt = event?.target
  if (tgt?.closest?.('button, a, .v-btn, .v-icon, .v-list-item, [role="menuitem"]')) return
  detailTxn.value = item
  detailDrawer.value = true
}

// Amount override staging — keyed by txn id. Persisted to localStorage so
// the operator's pre-edit survives a page refresh (intentional: an edit is
// a deliberate decision the operator wants to commit on the next Approve).
// Cleared on: explicit Sıfırla, successful Approve, or terminal status
// (approved/rejected/expired/cancelled) detected during list refresh.
const PENDING_AMOUNTS_KEY = 'depositPendingAmounts.v1'

function readPersistedAmounts() {
  try {
    const raw = localStorage.getItem(PENDING_AMOUNTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}

const pendingAmounts = reactive(readPersistedAmounts())

// Mirror every write back to localStorage. `deep: true` catches both the
// `pendingAmounts[id] = v` assignment and `delete pendingAmounts[id]`.
watch(pendingAmounts, (v) => {
  try { localStorage.setItem(PENDING_AMOUNTS_KEY, JSON.stringify(v)) } catch { /* quota? */ }
}, { deep: true })

const amountEditDialog = ref(false)
const editedAmount = ref(null)
const amountEditError = ref('')

const activeFilterCount = computed(() => activeFilterChips.value.length)

const statusOptions = [
  { text: 'Hepsi', value: '' },
  { text: 'İşlemde', value: 'pending,assigned,payment_seen,processing' },
  { text: 'Onaylandı', value: 'approved' },
  { text: 'Reddedildi', value: 'rejected' },
]

// Quick-pill row above the table — same pattern as WithdrawalListView.
const statusQuickOptions = [
  { value: '',                                            text: 'Hepsi',         icon: 'mdi-format-list-bulleted', color: 'pill-grey' },
  { value: 'pending,assigned,payment_seen,processing',    text: 'İşlemde',       icon: 'mdi-clock-outline',        color: 'pill-amber' },
  { value: 'approved',                                    text: 'Onaylandı',     icon: 'mdi-check-decagram',       color: 'pill-success' },
  { value: 'rejected',                                    text: 'Reddedildi',    icon: 'mdi-close-octagon',        color: 'pill-error' },
  { value: 'expired',                                     text: 'Süresi Doldu',  icon: 'mdi-timer-sand-empty',     color: 'pill-grey' },
]

const datePresets = [
  { id: 'all',       label: 'Tümü',        icon: 'mdi-infinity' },
  { id: 'today',     label: 'Bugün',       icon: 'mdi-calendar-today' },
  { id: 'yesterday', label: 'Dün',         icon: 'mdi-calendar-arrow-left' },
  { id: 'week',      label: 'Bu Hafta',    icon: 'mdi-calendar-week' },
  { id: 'month',     label: 'Bu Ay',       icon: 'mdi-calendar-month' },
]

function setStatusQuick(value) {
  statusFilter.value = value === '' ? null : value
  loadData()
}

function applyDatePreset(id) {
  activeDatePreset.value = id
  // Server resolves the range in app.timezone — we just send the name.
  dateFrom.value = ''
  dateTo.value = ''
  loadData()
}

function onDateChange() {
  activeDatePreset.value = 'custom'
  loadData()
}

const statusLabelByValue = computed(() => {
  const m = {}
  for (const o of statusQuickOptions) m[o.value] = o.text
  return m
})

const datePresetLabel = computed(() => {
  const m = { today: 'Bugün', yesterday: 'Dün', week: 'Bu Hafta', month: 'Bu Ay' }
  return m[activeDatePreset.value]
})

const activeFilterChips = computed(() => {
  const chips = []
  if (statusFilter.value) chips.push({ key: 'status', label: 'Durum', value: statusLabelByValue.value[statusFilter.value] || statusFilter.value })
  if (datePresetLabel.value) {
    chips.push({ key: 'datePreset', label: 'Tarih', value: datePresetLabel.value })
  } else {
    if (dateFrom.value) chips.push({ key: 'dateFrom', label: 'Başlangıç', value: dateFrom.value.replace('T', ' ') })
    if (dateTo.value)   chips.push({ key: 'dateTo', label: 'Bitiş', value: dateTo.value.replace('T', ' ') })
  }
  if (customerFilter.value) chips.push({ key: 'customer', label: 'Oyuncu', value: customerFilter.value })
  if (amountMin.value != null) chips.push({ key: 'amountMin', label: 'Min', value: formatCurrency(amountMin.value) + ' TRY' })
  if (amountMax.value != null) chips.push({ key: 'amountMax', label: 'Max', value: formatCurrency(amountMax.value) + ' TRY' })
  if (merchantFilter.value) chips.push({ key: 'merchant', label: 'Bayi', value: (merchants.value.find(m => m.id === merchantFilter.value)?.name) || '#' + merchantFilter.value })
  if (bankAccountFilter.value) {
    const ba = bankAccounts.value.find(b => b.id === bankAccountFilter.value)
    chips.push({ key: 'bankAccount', label: 'Hesap', value: ba ? bankAccountLabel(ba) : '#' + bankAccountFilter.value })
  }
  return chips
})

function clearFilter(key) {
  switch (key) {
    case 'status':      statusFilter.value = null; break
    case 'datePreset':  activeDatePreset.value = 'all'; break
    case 'dateFrom':    dateFrom.value = ''; activeDatePreset.value = 'custom'; break
    case 'dateTo':      dateTo.value = '';   activeDatePreset.value = 'custom'; break
    case 'customer':    customerFilter.value = ''; break
    case 'amountMin':   amountMin.value = null; break
    case 'amountMax':   amountMax.value = null; break
    case 'merchant':    merchantFilter.value = null; break
    case 'bankAccount': bankAccountFilter.value = null; break
  }
  loadData()
}

// Filter amount inputs reuse the formatAmountInput / parseAmountInput
// helpers defined alongside formatCurrency below — same integer-only,
// thousand-separator behaviour as the edit-amount modal.

const sandboxOptions = [
  { text: 'Sadece Canlı', value: 'real' },
  { text: 'Sadece Sandbox', value: 'sandbox' },
  { text: 'Tümü', value: 'all' },
]

const allHeaders = [
  { title: 'ID', key: 'internal_id', width: '80px' },
  { title: 'Tarih', key: 'date_only', sortable: false, width: '90px' },
  { title: 'Kullanıcı Ad Soyad', key: 'customer', sortable: false },
  { title: 'Ortam', key: 'environment', sortable: false },
  { title: 'Bayi', key: 'merchant', value: (item) => item.merchant?.name || '—', sortable: false },
  { title: 'Tutar', key: 'requested_amount' },
  { title: 'Hedef Hesap', key: 'bank_account', sortable: false },
  { title: 'Durum', key: 'status' },
  { title: 'Onaylayan', key: 'approver', sortable: false },
  { title: 'Saat', key: 'created_at', sortable: false },
  { title: 'İşlem', key: 'actions', sortable: false, align: 'end' },
]

const visibleHeaders = computed(() => {
  let headers = allHeaders
  if (!auth.isSuperAdmin) {
    // Operators see a lean view: drop the merchant/environment columns
    // (admin-only context) and the "Onaylayan" column (only useful for
    // post-hoc review, not for taking action). What's left is everything
    // they need to act: who sent it, how much, where, when, what to do.
    headers = headers.filter(h => !['merchant', 'environment', 'approver'].includes(h.key))
  }
  return headers
})

function statusColor(status) {
  const colors = { pending: 'amber-darken-2', assigned: 'light-blue-darken-1', payment_seen: 'secondary', processing: 'warning', admin_review: 'purple-darken-2', approved: 'success', rejected: 'error', expired: 'grey-darken-1', cancelled: 'grey-darken-2' }
  return colors[status] || 'grey'
}
function statusText(status) {
  const texts = { pending: 'Beklemede', assigned: 'Atandı', payment_seen: 'Ödeme Görüldü', processing: 'İşlemde', admin_review: 'Yönetici Onayı', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu', cancelled: 'İptal Edildi' }
  return texts[status] || status
}
function statusIcon(status) {
  const icons = { pending: 'mdi-clock-outline', assigned: 'mdi-account-arrow-right', payment_seen: 'mdi-cash-check', processing: 'mdi-progress-clock', admin_review: 'mdi-shield-account', approved: 'mdi-check-circle', rejected: 'mdi-close-circle', expired: 'mdi-timer-off-outline', cancelled: 'mdi-cancel' }
  return icons[status] || 'mdi-help-circle-outline'
}

// Sender's full name. Prefer first_name + last_name (the structured fields
// the merchant API populates) so we always show "Ahmet Yılmaz" rather than
// the legacy single 'name' blob. Falls back to whatever's available.
function customerFullName(item) {
  const c = item.customer
  if (!c) return '—'
  const first = (c.first_name || '').trim()
  const last = (c.last_name || '').trim()
  if (first || last) return [first, last].filter(Boolean).join(' ')
  if (c.name) return c.name
  return c.external_id || '—'
}

const copiedIban = ref(null)
let copiedTimer = null
function copyIban(iban) {
  if (!iban) return
  navigator.clipboard.writeText(iban).then(() => {
    copiedIban.value = iban
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copiedIban.value = null }, 1800)
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount || 0)
}

// Live thousand-separator formatting for the edit-amount input.
// Integer-only (operator approves whole-TRY amounts in this flow); the
// suffix/cell display elsewhere still shows decimals via formatCurrency.
const amountInputFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

function formatAmountInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return amountInputFormatter.format(Math.trunc(num))
}

function parseAmountInput(value) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits === '' ? null : parseInt(digits, 10)
}
function formatDate(date) {
  return new Date(date).toLocaleString('tr-TR')
}
function formatDateShort(date) {
  return new Date(date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}
// Tarih-cell helpers. The cell shows the date ONCE at the top, then the
// created + finalized times below. If the txn spans two days (created
// before midnight, approved after) the second time row prepends its own
// short date so we don't mislead the operator.
function formatDateOnly(date) {
  if (!date) return ''
  const d = new Date(date)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}
function formatTimeOnly(date) {
  if (!date) return ''
  const d = new Date(date)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function sameCalendarDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate()
}

// --- Elapsed-time counter for in-flight rows ---
const ACTIVE_STATUSES = ['pending', 'assigned', 'payment_seen', 'processing']
const RED_THRESHOLD_MS = 8 * 60 * 1000   // 8 minutes
const REJECT_HOLD_MS  = 10 * 60 * 1000   // 10-min reject hold

function showCounter(item) {
  return ACTIVE_STATUSES.includes(item.status)
}
function elapsedMs(item) {
  return now.value - new Date(item.created_at).getTime()
}
function elapsedDisplay(item) {
  const ms = Math.max(0, elapsedMs(item))
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function counterClass(item) {
  return elapsedMs(item) >= RED_THRESHOLD_MS ? 'counter-bar--red' : 'counter-bar--info'
}

// Time the operator took from locking the txn to finalising it. Returns
// minutes (≥ 1) or null when we can't compute. Same logic as the
// withdrawal page so the badge reads identically across both lists.
function finalizationMinutes(item) {
  if (!item || !item.locked_at) return null
  const end = item.resolved_at || item.approved_at
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(item.locked_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.max(1, Math.round(ms / 60000))
}
function finalizeBadgeClass(item) {
  const m = finalizationMinutes(item)
  if (m == null) return ''
  if (m <= 5)  return 'finalize-badge--fast'
  if (m <= 15) return 'finalize-badge--normal'
  if (m <= 30) return 'finalize-badge--slow'
  return 'finalize-badge--late'
}

// --- Action capability ---
function canLock(item) {
  if (item.locked_by) return false
  if (!['pending', 'assigned'].includes(item.status)) return false
  return auth.isSuperAdmin || auth.can('transactions.lock')
}
function canActOnLocked(item) {
  if (!['processing', 'payment_seen'].includes(item.status)) return false
  if (auth.isSuperAdmin) return true
  return item.locked_by === auth.user?.id
}

/*
 * Onay ve red AYRI izinler.
 *
 * Onceden yalnizca canActOnLocked'a bakiliyordu, yani kilidi elinde
 * olan herkes iki dugmeyi de goruyordu -- transactions.approve.* /
 * reject.* izinleri arayuzde hic kontrol edilmiyordu. Sunucu zaten
 * reddediyordu ama kullanici bunu ancak tikladiktan sonra ogreniyordu.
 */
function canApproveItem(item) {
  return canActOnLocked(item) && (auth.isSuperAdmin || auth.can('transactions.approve.deposit'))
}
function canRejectItem(item) {
  return canActOnLocked(item) && (auth.isSuperAdmin || auth.can('transactions.reject.deposit'))
}

async function handleLock(item) {
  actingId.value = item.id
  try {
    await txnStore.lock(item.id)
  } catch (e) {
    notifications.addNotification({ type: 'error', title: 'Kilit alınamadı', message: e?.response?.data?.message || 'İşlem kilitlenemedi.' })
  } finally {
    actingId.value = null
  }
}

function openApprove(item) {
  selectedTxn.value = item
  approveError.value = ''
  approveDialog.value = true
}

// Amount staged for the currently-selected row in the approve dialog —
// reads from the pendingAmounts map and falls back to requested_amount.
const approveStagedAmount = computed(() => {
  const id = selectedTxn.value?.id
  if (id == null) return null
  return pendingAmounts[id] != null ? Number(pendingAmounts[id]) : Number(selectedTxn.value.requested_amount)
})

const amountChangedFromRequest = computed(() => {
  if (!selectedTxn.value) return false
  return approveStagedAmount.value != null
    && Number(approveStagedAmount.value) !== Number(selectedTxn.value.requested_amount)
})

function openAmountEdit(item) {
  selectedTxn.value = item
  amountEditError.value = ''
  editedAmount.value = pendingAmounts[item.id] != null
    ? Number(pendingAmounts[item.id])
    : Number(item.requested_amount || 0)
  amountEditDialog.value = true
}

const amountHint = computed(() => {
  const requested = Number(selectedTxn.value?.requested_amount || 0)
  return `Talep: ${formatCurrency(requested)}`
})

function saveAmountEdit() {
  if (!selectedTxn.value) return
  amountEditError.value = ''
  const v = Number(editedAmount.value)
  if (!v || v <= 0) { amountEditError.value = 'Geçerli bir tutar girin.'; return }
  pendingAmounts[selectedTxn.value.id] = v
  amountEditDialog.value = false
}

function clearAmountOverride() {
  if (!selectedTxn.value) return
  delete pendingAmounts[selectedTxn.value.id]
  amountEditDialog.value = false
}

async function confirmApprove() {
  if (!selectedTxn.value) return
  approveError.value = ''
  actingId.value = selectedTxn.value.id
  try {
    // Use the staged override if the operator pre-edited the amount;
    // otherwise pass null so the backend uses requested_amount.
    const id = selectedTxn.value.id
    const amount = pendingAmounts[id] != null ? Number(pendingAmounts[id]) : null
    await txnStore.approve(id, amount)
    delete pendingAmounts[id]
    approveDialog.value = false
    selectedTxn.value = null
  } catch (e) {
    approveError.value = e?.response?.data?.message || 'Onay başarısız.'
  } finally {
    actingId.value = null
  }
}

function openReject(item) {
  selectedTxn.value = item
  rejectError.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  if (!selectedTxn.value) return
  rejectError.value = ''
  // 10-minute reject hold (server enforces too — surface a friendly UI msg)
  if (elapsedMs(selectedTxn.value) < REJECT_HOLD_MS) {
    const remainSec = Math.ceil((REJECT_HOLD_MS - elapsedMs(selectedTxn.value)) / 1000)
    rejectError.value = `İşlem 10 dakika dolmadan reddedilemez. Kalan: ${Math.floor(remainSec/60)}:${String(remainSec%60).padStart(2,'0')}`
    return
  }
  actingId.value = selectedTxn.value.id
  try {
    await txnStore.reject(selectedTxn.value.id)
    rejectDialog.value = false
    selectedTxn.value = null
  } catch (e) {
    if (e?.response?.data?.error === 'reject_too_early') {
      const r = e.response.data.remaining_seconds || 0
      rejectError.value = `İşlem 10 dakika dolmadan reddedilemez. Kalan: ${Math.floor(r/60)}:${String(r%60).padStart(2,'0')}`
    } else {
      rejectError.value = e?.response?.data?.message || 'Red başarısız.'
    }
  } finally {
    actingId.value = null
  }
}

function bankAccountLabel(item) {
  return `${item.account_holder} — ${item.bank_name}`
}

function clearFilters() {
  statusFilter.value = null
  sandboxFilter.value = 'real'
  dateFrom.value = ''
  dateTo.value = ''
  search.value = ''
  merchantFilter.value = null
  customerFilter.value = ''
  amountMin.value = null
  amountMax.value = null
  bankAccountFilter.value = null
  activeDatePreset.value = 'all'
  page.value = 1
  loadData()
}

function loadData() {
  const params = {
    type: 'deposit',
    status: statusFilter.value,
    sandbox: sandboxFilter.value,
    search: search.value,
    page: page.value,
  }
  // Either a server-resolved preset OR manual datetime-local range.
  if (activeDatePreset.value && activeDatePreset.value !== 'all' && activeDatePreset.value !== 'custom') {
    params.date_preset = activeDatePreset.value
  } else {
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value)   params.date_to   = dateTo.value
  }
  if (merchantFilter.value) params.merchant_id = merchantFilter.value
  if (customerFilter.value) params.customer = customerFilter.value
  if (amountMin.value != null) params.amount_min = amountMin.value
  if (amountMax.value != null) params.amount_max = amountMax.value
  if (bankAccountFilter.value) params.bank_account_id = bankAccountFilter.value
  txnStore.fetchList(params)
}

async function loadFilterOptions() {
  try {
    if (seesFinancials.value) {
      const { data } = await api.get('/portal/merchants')
      merchants.value = data
    }
    const { data: ba } = await api.get('/portal/bank-accounts')
    bankAccounts.value = ba
  } catch { /* silent */ }
}

onMounted(() => {
  loadData()
  loadFilterOptions()
  txnStore.resetNewCount('deposit')
  nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
  if (highlightId.value) scrollToHighlight()
})
onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer)
  if (highlightClearTimer) clearTimeout(highlightClearTimer)
})
</script>

<style scoped>
.status-chip {
  font-size: 12px !important;
  letter-spacing: 0.2px;
  padding: 0 10px;
  height: 28px !important;
}

/* Status cell — chip stack + finalization badge below. */
.status-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; line-height: 1.1; }

/* Date-only cell (Tarih column). */
.date-cell {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-text);
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Saat cell — two-row stack (created + approved/resolved). */
.time-cell { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; }
.time-row { display: flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
.time-row .time-val { font-size: 11px; font-weight: 700; color: var(--sp-text); letter-spacing: 0.2px; }
.time-row--done .time-val { color: var(--sp-text-muted); font-weight: 600; }
.finalize-badge {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
  border: 1px solid transparent;
}
.finalize-badge--fast   { background: rgba(102,241,189,0.15); color: var(--sp-accent-success); border-color: rgba(102,241,189,0.25); }
.finalize-badge--normal { background: rgba(113,132,122,0.15); color: var(--sp-text-muted); border-color: rgba(150,150,150,0.20); }
.finalize-badge--slow   { background: rgba(255,190,91,0.15);  color: var(--sp-accent-orange); border-color: rgba(255,190,91,0.25); }
.finalize-badge--late   { background: rgba(255,142,130,0.18); color: var(--sp-accent-rose); border-color: rgba(255,142,130,0.3); }

.amount-text {
  font-size: 14px;
  color: var(--sp-text);
}
.amount-currency {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.6;
}
/* Notification highlight — pulse the targeted row for 5s after click. */
:deep(tr.highlighted-row) {
  animation: row-highlight-pulse 1.2s ease-in-out infinite;
}
@keyframes row-highlight-pulse {
  0%, 100% { background-color: rgba(102,241,189, 0.10) !important; box-shadow: inset 4px 0 0 var(--sp-primary); }
  50% { background-color: rgba(102,241,189, 0.25) !important; box-shadow: inset 4px 0 0 var(--sp-primary); }
}

/* Status-row tints live in the unscoped block at the bottom of this file
   so they can fight Vuetify's `.v-table tbody tr:hover` rule (which has
   higher specificity than scoped `:deep()` selectors can reach). */

.amount-approved {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-accent-success-bright);
  margin-top: 1px;
}

/* Per-row elapsed counter — bold pill, info color until 8min then red. */
.counter-bar {
  display: inline-block;
  margin-top: 3px;
  padding: 2px 8px;
  border-radius: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.4;
}
.counter-bar--info {
  background: rgba(33, 150, 243, 0.14);
  color: var(--sp-accent-info);
}
.counter-bar--red {
  background: rgba(255,142,130, 0.18);
  color: var(--sp-accent-error);
  animation: counter-pulse 1s ease-in-out infinite;
}
@keyframes counter-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* Row separators */
:deep(.v-table tbody tr > td) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.22) !important;
}
.v-theme--light :deep(.v-table tbody tr > td) {
  border-bottom-color: rgba(0, 0, 0, 0.14) !important;
}
.v-theme--dark :deep(.v-table tbody tr > td) {
  border-bottom-color: rgba(255, 255, 255, 0.10) !important;
}

/* ── Modern filter shell — same visual language as WithdrawalListView ── */
.filter-shell {
  padding: 12px 16px 6px;
  border-bottom: 1px solid var(--sp-divider, rgba(255,255,255,0.06));
  background: linear-gradient(180deg, rgba(102,241,189,0.04), transparent);
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.filter-row:last-child { margin-bottom: 0; }
.filter-status-row { gap: 6px; }
.filter-date-row {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,0.04);
}
.filter-chip-row {
  margin-top: 6px;
  padding-top: 6px;
}
.filter-advanced {
  margin-top: 10px;
  padding: 14px 12px 8px;
  border-radius: 0;
  background: var(--sp-surface-1, rgba(102,241,189,0.04));
  border: 1px solid var(--sp-border);
}

.status-pill {
  display: inline-flex; align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--sp-border);
  color: var(--sp-text-muted);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.status-pill:hover { transform: translateY(-1px); }
.status-pill.is-active { color: #fff; }
.status-pill.pill-grey.is-active    { background: rgba(113,132,122,0.35); border-color: rgba(160,160,160,0.6); color: #FFF; }
.status-pill.pill-amber.is-active   { background: rgba(255,190,91,0.22);  border-color: rgba(255,190,91,0.55);  color: var(--sp-accent-orange); }
.status-pill.pill-success.is-active { background: rgba(102,241,189,0.22); border-color: rgba(102,241,189,0.55); color: var(--sp-accent-success); }
.status-pill.pill-error.is-active   { background: rgba(255,142,130,0.22); border-color: rgba(255,142,130,0.55); color: var(--sp-accent-rose); }

.date-pill {
  display: inline-flex; align-items: center;
  padding: 4px 10px;
  border-radius: 0;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--sp-border);
  color: var(--sp-text-muted);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.date-pill:hover { color: var(--sp-text); border-color: rgba(102,241,189,0.4); }
.date-pill.is-active {
  background: rgba(102,241,189,0.16);
  border-color: rgba(102,241,189,0.55);
  color: var(--sp-accent-success);
}

.more-btn { margin-left: auto !important; }

.active-filter-chip { font-size: 11px !important; }
.active-filter-chip .chip-key { color: var(--sp-text-muted); font-weight: 500; }
.active-filter-chip .chip-val { font-weight: 700; }

.notification-pulse {
  animation: pulse-warning 1.5s ease-in-out infinite;
}
@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.search-field {
  max-width: 300px;
  width: 100%;
}

/* Fluid table — fits the viewport. Detail-heavy fields live in the SA
   side pane that opens on row click. Only phones fall back to scroll. */
:deep(.v-data-table table) { min-width: 0; }
:deep(.v-data-table th),
:deep(.v-data-table td) { white-space: normal; }
@media (max-width: 700px) {
  :deep(.v-data-table) { overflow-x: auto; }
  :deep(.v-data-table > .v-table__wrapper) { overflow-x: auto; }
  :deep(.v-data-table table) { min-width: 720px; }
}
@media (max-width: 600px) {
  .search-field { max-width: 100% !important; }
  .status-chip {
    font-size: 11px !important;
    height: 26px !important;
    padding: 0 8px;
  }
}

/* ── Approve modal ── */
.approve-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(102,241,189, 0.25) !important;
  box-shadow: 0 12px 48px rgba(102,241,189, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.approve-hero {
  background: linear-gradient(135deg, var(--sp-accent-success) 0%, var(--sp-accent-success) 50%, var(--sp-accent-success-bright) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.approve-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.approve-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: approve-icon-pop 0.4s ease-out;
}
@keyframes approve-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.approve-hero-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
.approve-hero-sub {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}

.approve-amount-block {
  padding: 22px 24px 18px;
  text-align: center;
  background: linear-gradient(180deg, rgba(102,241,189, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.approve-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
}
.approve-amount-value {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.approve-amount-cur {
  font-size: 18px;
  font-weight: 700;
  color: var(--sp-accent-success-bright);
  margin-left: 6px;
  letter-spacing: 0;
}
.approve-amount-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--sp-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.approve-meta {
  padding: 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.approve-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--sp-text);
}

.approve-warning {
  margin: 14px 20px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255,190,91, 0.10);
  border-left: 3px solid var(--sp-accent-orange);
  display: flex;
  align-items: flex-start;
}
.approve-warning-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
  line-height: 1.3;
}
.approve-warning-text {
  font-size: 12px;
  color: var(--sp-text-muted);
  margin-top: 2px;
}

.approve-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
}
.approve-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.45) !important;
}
.approve-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(102,241,189, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Reject modal — same hero shape, red palette ── */
.reject-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255,142,130, 0.28) !important;
  box-shadow: 0 12px 48px rgba(255,142,130, 0.20), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.reject-hero {
  background: linear-gradient(135deg, var(--sp-accent-error) 0%, var(--sp-accent-error) 50%, var(--sp-accent-error) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.reject-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.reject-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: reject-icon-shake 0.5s ease-out;
}
@keyframes reject-icon-shake {
  0%   { transform: scale(0.6) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.05) rotate(8deg);  opacity: 1; }
  100% { transform: scale(1) rotate(0);        opacity: 1; }
}
.reject-hero-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}
.reject-hero-sub {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}

.reject-amount-block {
  padding: 22px 24px 18px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255,142,130, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.reject-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
}
.reject-amount-value {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.reject-amount-cur {
  font-size: 18px;
  font-weight: 700;
  color: var(--sp-accent-error);
  margin-left: 6px;
  letter-spacing: 0;
}

.reject-meta {
  padding: 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.reject-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--sp-text);
}

.reject-warning {
  margin: 14px 20px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255,142,130, 0.12);
  border-left: 3px solid var(--sp-accent-error);
  display: flex;
  align-items: flex-start;
}
.reject-warning-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
  line-height: 1.3;
}
.reject-warning-text {
  font-size: 12px;
  color: var(--sp-text-muted);
  margin-top: 2px;
}

.reject-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
}
.reject-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(255,142,130, 0.45) !important;
}
.reject-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(255,142,130, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Amount-edit modal — same hero shape as approve/reject, purple palette ── */
.amount-edit-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(102,241,189, 0.25) !important;
  box-shadow: 0 12px 48px rgba(102,241,189, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.amount-edit-hero {
  background: linear-gradient(135deg, var(--sp-accent-purple) 0%, var(--sp-primary) 50%, var(--sp-accent-purple) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.amount-edit-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.amount-edit-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: amount-edit-icon-pop 0.4s ease-out;
  position: relative; z-index: 1;
}
@keyframes amount-edit-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.amount-edit-hero-title {
  font-size: 18px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  position: relative; z-index: 1;
}
.amount-edit-hero-sub {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
  position: relative; z-index: 1;
}

.amount-edit-amount-block {
  padding: 20px 24px 14px;
  text-align: center;
  background: linear-gradient(180deg, rgba(102,241,189, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.amount-edit-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
}
.amount-edit-amount-value {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1.2px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.amount-edit-amount-cur {
  font-size: 16px;
  font-weight: 700;
  color: var(--sp-accent-purple);
  margin-left: 6px;
  letter-spacing: 0;
}

.amount-edit-input-section {
  padding: 18px 24px 4px;
}

.amount-edit-actions {
  padding: 14px 20px 20px !important;
  gap: 8px;
}
.amount-edit-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.45) !important;
}
.amount-edit-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(102,241,189, 0.6) !important;
  transform: translateY(-1px);
}
</style>

<!-- Unscoped on purpose: Vuetify's hover rule targets `.v-table > .v-table__wrapper > table > tbody > tr:hover` with a high-specificity selector that scoped CSS via :deep() loses to. We also tint each <td> because cells in v-data-table-server have an opaque cell background that masks any tr-level background, so a tr-only rule appears to do nothing. The custom-tint class is added on the row in rowProps() so unrelated tables in the app are unaffected. -->
<style>
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending > td       { background: rgba(255,190,91, 0.08) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending:hover > td { background: rgba(255,190,91, 0.22) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--assigned,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--assigned > td       { background: rgba(112,169,255, 0.09) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--assigned:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--assigned:hover > td { background: rgba(112,169,255, 0.24) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--payment_seen,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--payment_seen > td       { background: rgba(168,182,255, 0.10) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--payment_seen:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--payment_seen:hover > td { background: rgba(168,182,255, 0.26) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing > td       { background: rgba(255,174,91, 0.10) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing:hover > td { background: rgba(255,174,91, 0.26) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review > td       { background: rgba(168,182,255, 0.11) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review:hover > td { background: rgba(168,182,255, 0.26) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved > td       { background: rgba(102,241,189, 0.07) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved:hover > td { background: rgba(102,241,189, 0.20) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected > td       { background: rgba(255,142,130, 0.08) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected:hover > td { background: rgba(255,142,130, 0.22) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired > td       { background: rgba(113,132,122, 0.08) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired:hover > td { background: rgba(113,132,122, 0.20) !important; }

.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled > td       { background: rgba(113,132,122, 0.08) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled:hover > td { background: rgba(113,132,122, 0.20) !important; }

/* Left-edge accent bar — applied on the first td so it sits inside the
   row's clip area and isn't hidden by the cell's own background. */
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending      > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-orange); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--assigned     > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-blue); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--payment_seen > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-purple); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing   > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-orange); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-purple); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved     > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-success); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected     > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-error); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired      > td:first-child { box-shadow: inset 3px 0 0 var(--sp-text-muted); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled    > td:first-child { box-shadow: inset 3px 0 0 var(--sp-text-muted); }
</style>
