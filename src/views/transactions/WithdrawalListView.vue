<template>
  <v-card>
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <v-icon start color="info">mdi-minus-circle</v-icon>
      Çekimler
      <v-spacer />
      <!-- Parca cekim: buyuk bir talep gruplara bolunerek elle giriliyor.
           Yalnizca ic firmalara islenir, backend de bunu dogruluyor. -->
      <v-btn
        v-if="canCreateManual"
        color="primary"
        variant="outlined"
        density="comfortable"
        prepend-icon="mdi-call-split"
        class="mr-2"
        @click="openManual()"
      >
        Parça Çekim
      </v-btn>
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
         Status pills + date presets are one-click; the rest is folded
         into an expandable "Daha fazla" panel. ── -->
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

      <!-- "Benim islemlerim" — kendi uzerine aldiklarini suzer.
           Destek panelinde ozellikle istendi: "SADECE KENDINE AIT GECMIS
           ISLEMLERI gorebilir." Kendine daraltmak kapsam genisletmesi
           olmadigi icin herkese acik. -->
      <div class="filter-row filter-mine-row">
        <button
          class="status-pill"
          :class="{ 'is-active': sadeceBenim }"
          type="button"
          @click="sadeceBenim = !sadeceBenim; page = 1; loadData()"
        >
          <v-icon size="13" class="mr-1">mdi-account-check-outline</v-icon>Benim İşlemlerim
        </button>
      </div>

      <!-- Date preset chips + custom open -->
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

      <!-- Active filter chips — at-a-glance summary, individually removable -->
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
            <v-col v-if="seesAllGroups" cols="12" md="6">
              <v-autocomplete v-model="subGroupFilter" :items="subGroups" item-title="name" item-value="id" label="Grup" variant="outlined" density="compact" hide-details clearable prepend-inner-icon="mdi-account-group" @update:model-value="loadData" />
            </v-col>
            <v-col v-if="seesFinancials" cols="12" md="6">
              <v-autocomplete v-model="merchantFilter" :items="merchants" item-title="name" item-value="id" label="Site" variant="outlined" density="compact" hide-details clearable prepend-inner-icon="mdi-store" @update:model-value="loadData" />
            </v-col>
            <v-col v-if="auth.isSuperAdmin" cols="12" md="6">
              <v-autocomplete v-model="lockerFilter" :items="operatorOptions" item-title="name" item-value="id" label="İşlemi Yapan Operatör" variant="outlined" density="compact" hide-details clearable prepend-inner-icon="mdi-account-hard-hat" @update:model-value="loadData" />
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

    <!-- Toplu atama seridi: yalnizca secim varken cikiyor ki normal
         kullanimda tablonun ustunu kaplamasin. -->
    <div v-if="canAssign && selectedIds.length" class="bulk-bar">
      <v-icon size="16" class="mr-2">mdi-checkbox-multiple-marked-outline</v-icon>
      <span class="bulk-count">{{ selectedIds.length }} çekim seçildi</span>
      <v-spacer />
      <v-btn size="small" variant="text" @click="selectedIds = []">Seçimi Bırak</v-btn>
      <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-account-group" @click="openBulkAssign()">
        Gruba İlet
      </v-btn>
    </div>

    <v-data-table-server
      v-model="selectedIds"
      :show-select="canAssign"
      item-value="id"
      :headers="visibleHeaders"
      :items="txnStore.items"
      :items-length="txnStore.pagination?.total || 0"
      :loading="txnStore.loading"
      :items-per-page="20"
      @update:page="page = $event; loadData()"
      density="compact"
      no-data-text="Çekim işlemi bulunamadı"
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
      <template v-slot:item.merchant="{ item }">
        <span v-if="item.merchant?.name" class="font-weight-bold" style="color: var(--sp-text)">{{ item.merchant.name }}</span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template v-slot:item.customer="{ item }">
        <div style="line-height: 1.3">
          <div class="font-weight-bold" style="font-size: 13px; color: var(--sp-text)">{{ customerName(item) }}</div>
          <div v-if="item.customer?.external_id" class="text-caption" style="color: var(--sp-text-hint); font-size: 11px">@{{ item.customer.external_id }}</div>
        </div>
      </template>
      <template v-slot:item.environment="{ item }">
        <v-chip v-if="item.is_sandbox" size="x-small" color="warning">Sandbox</v-chip>
        <v-chip v-else size="x-small" color="success">Canlı</v-chip>
      </template>
      <template v-slot:item.status="{ item }">
        <div class="status-cell">
          <v-chip :color="statusColor(item.status)" size="default" variant="flat" class="status-chip font-weight-bold" label>
            <v-icon start size="16">{{ statusIcon(item.status) }}</v-icon>
            {{ statusText(item.status) }}
          </v-chip>
          <!-- Onaylayan/reddeden kisi rozetin altinda. Ayri sutun yerine
               burada: "kim onayladi" sorusu durumun devami. -->
          <div v-if="item.approver" class="approver-line">
            <v-icon size="10" class="mr-1">mdi-account-check-outline</v-icon>{{ item.approver.name }}
          </div>
          <!-- Operator finalization time — locked → resolved. Surfaces
               who-took-how-long at a glance for SA throughput review. -->
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
        <div class="d-flex align-center ga-1" style="line-height: 1.4">
          <div>
            <div class="amount-text font-weight-bold">{{ formatCurrency(item.requested_amount) }} <span class="amount-currency">{{ item.currency }}</span></div>
            <div v-if="item.amount && Number(item.amount) !== Number(item.requested_amount)" class="amount-approved">
              Onay: {{ formatCurrency(item.amount) }} {{ item.currency }}
            </div>
            <div v-if="Number(item.requested_amount) >= ADMIN_REVIEW_THRESHOLD" class="text-caption" style="color: var(--sp-accent-blue); font-size: 10px; font-weight: 700; margin-top: 1px">
              ≥ 5K · Yönetici onayı gerekli
            </div>
          </div>
        </div>
      </template>
      <template v-slot:item.player_bank="{ item }">
        <div v-if="item.player_iban" style="line-height: 1.4">
          <div class="text-caption font-weight-bold" style="color: var(--sp-text); font-size: 12px">{{ item.player_account_holder || '-' }}</div>
          <div v-if="item.player_bank_resolved" class="font-weight-bold" style="color: var(--sp-accent-blue); font-size: 13px">{{ item.player_bank_resolved }}</div>
          <div class="d-flex align-center ga-1">
            <div class="text-caption text-medium-emphasis" style="font-family: 'JetBrains Mono', monospace; font-size: 10px">{{ item.player_iban }}</div>
            <v-tooltip text="IBAN kopyala" location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="14" color="primary" style="cursor:pointer" @click.stop="copyIban(item.player_iban)">mdi-content-copy</v-icon>
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
      <!-- Tarih (date-only) — separate column right after No. -->
      <template v-slot:item.date_only="{ item }">
        <div class="date-cell">{{ formatDateOnly(item.created_at) }}</div>
      </template>
      <!-- Saat: created + approved/resolved times stacked. -->
      <template v-slot:item.created_at="{ item }">
        <div class="time-cell">
          <!-- Gun ve saat tek sutunda: ayri "Tarih" sutunu kaldirildi. -->
          <div class="date-cell">{{ formatDateOnly(item.created_at) }}</div>
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
            {{ remainingDisplay(item) }}
          </div>
        </div>
      </template>
      <template v-slot:item.actions="{ item }">
        <div class="action-cell">
          <!-- Primary actions cluster — biggest, decisive buttons -->
          <div class="action-primary">
            <!-- Stage 1: ISLEME AL — atanmis islerin baslatilmasi.
                 "Üzerime Al" degil: is operatorun onune havuzdan gelmis
                 olabilecegi gibi super admin tarafindan da atanmis
                 olabilir; ikinci durumda "uzerime alma" yanlis okunuyor.
                 Alma = sahiplik, isleme alma = calismaya baslama. -->
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

            <!-- Stage 2 (<5k): direct Onayla -->
            <v-btn
              v-else-if="canApproveItem(item) && Number(item.requested_amount) < ADMIN_REVIEW_THRESHOLD"
              size="small"
              variant="flat"
              color="success"
              @click="openApprove(item)"
              prepend-icon="mdi-check"
            >
              Onayla
            </v-btn>

            <!-- Stage 2 (≥5k): Dekont / URL upload -->
            <template v-else-if="canSubmitProof(item) && Number(item.requested_amount) >= ADMIN_REVIEW_THRESHOLD">
              <v-btn size="small" variant="flat" color="secondary" @click="openProof(item, 'file')" prepend-icon="mdi-file-upload">Dekont Yükle</v-btn>
              <v-btn size="small" variant="flat" color="info" @click="openProof(item, 'url')"  prepend-icon="mdi-link-variant">URL Yükle</v-btn>
            </template>

            <!-- Stage 3 (admin_review, SA only): inspect → decide -->
            <template v-if="item.status === 'admin_review' && (auth.isSuperAdmin || auth.can('transactions.approve.withdrawal'))">
              <!-- Decisive actions side-by-side; review action on its own row below -->
              <div class="admin-review-stack">
                <div class="admin-review-decision">
                  <v-btn size="small" variant="flat" color="success" @click.stop="openApprove(item)" prepend-icon="mdi-check" class="flex-grow-1">Onayla</v-btn>
                  <v-btn size="small" variant="flat" color="error"   @click.stop="openReject(item)"  prepend-icon="mdi-close" class="flex-grow-1">Reddet</v-btn>
                </div>
                <v-btn
                  v-if="item.dekont_path || item.dekont_url"
                  size="small"
                  variant="tonal"
                  color="secondary"
                  @click.stop="openDekontPreview(item)"
                  prepend-icon="mdi-file-eye"
                  block
                >
                  Dekontu İncele
                </v-btn>
              </div>
            </template>

            <span v-else-if="item.status === 'admin_review'" class="action-pending-pill">Yönetici onayı bekleniyor</span>
          </div>

          <!-- Secondary actions cluster — text buttons / icon menus -->
          <div class="action-secondary">
            <!-- Geri Bırak — operator-only release -->
            <v-btn
              v-if="canRelease(item)"
              size="small"
              variant="text"
              color="warning"
              @click="openRelease(item)"
              prepend-icon="mdi-account-arrow-right"
            >
              Geri Bırak
            </v-btn>

            <!-- Admin overflow: reassign + cancel collapsed into a 3-dot menu
                 so they never compete with primary actions for space. -->
            <v-menu v-if="hasAdminOverflow(item)" location="bottom end">
              <template v-slot:activator="{ props }">
                <v-tooltip text="Diğer işlemler" location="top">
                  <template v-slot:activator="{ props: tipProps }">
                    <v-btn v-bind="{ ...props, ...tipProps }" size="small" variant="text" icon density="comfortable">
                      <v-icon size="20">mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </template>
              <v-list density="compact">
                <v-list-item
                  v-if="canAssign && !['approved','rejected','expired','cancelled'].includes(item.status)"
                  prepend-icon="mdi-account-switch"
                  @click="openAssign(item)"
                >
                  <v-list-item-title>Operatöre Ata</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-if="canTransferGroup && item.status === 'approved'"
                  prepend-icon="mdi-swap-horizontal-bold"
                  @click="openTransfer(item)"
                >
                  <v-list-item-title>Başka Gruba Aktar</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-if="canCancel && item.status === 'approved'"
                  prepend-icon="mdi-cancel"
                  @click="openCancel(item)"
                >
                  <v-list-item-title>İptal Et</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>

            <!-- Locked by other operator -->
            <v-tooltip v-if="item.locker && item.locked_by !== auth.user?.id && item.status === 'processing'" :text="`${item.locker.name} işliyor`" location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="18" color="warning">mdi-lock</v-icon>
              </template>
            </v-tooltip>
          </div>
        </div>
      </template>
    </v-data-table-server>

    <!-- Approve dialog — adaptive:
           • <5k operator flow: just amount + bank picker
           • admin_review flow (SA): rich review with all context the
             admin needs to make a yes/no call without leaving the modal
             (operator who handled it, bank source they used, dekont
             quick-open, customer/payee). -->
    <v-dialog v-model="approveDialog" max-width="540">
      <v-card v-if="selectedTxn" class="wd-approve-card">
        <!-- Hero band -->
        <div class="wd-approve-hero">
          <div class="wd-approve-hero-icon">
            <v-icon size="42" color="white">{{ approveIsAdminReview ? 'mdi-shield-check' : 'mdi-check-decagram' }}</v-icon>
          </div>
          <div class="wd-approve-hero-title">{{ approveIsAdminReview ? 'ÇEKİMİ ONAYLA' : 'İŞLEMİ ONAYLA' }}</div>
          <div class="wd-approve-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- Amount block -->
        <div class="wd-approve-amount">
          <div class="wd-approve-amount-label">Çekim Tutarı</div>
          <div class="wd-approve-amount-value">
            {{ formatCurrency(selectedTxn.requested_amount) }}
            <span class="wd-approve-amount-cur">{{ selectedTxn.currency }}</span>
          </div>
        </div>

        <!-- Customer + payee bank — shown to everyone so the operator
             can confirm WHO they're paying and WHERE the money goes
             before clicking Onayla. The SA-only rows (handler, dekont
             timestamp) live in the conditional block below. -->
        <div v-if="selectedTxn.customer || selectedTxn.player_iban" class="wd-approve-meta">
          <div v-if="selectedTxn.customer" class="wd-approve-row">
            <v-icon size="16" color="secondary">mdi-account</v-icon>
            <div class="wd-approve-row-label">Müşteri</div>
            <div class="wd-approve-row-value">
              {{ customerName(selectedTxn) }}
              <span v-if="selectedTxn.customer.external_id" class="wd-approve-row-meta">@{{ selectedTxn.customer.external_id }}</span>
            </div>
          </div>

          <div v-if="selectedTxn.player_iban" class="wd-approve-row">
            <v-icon size="16" color="secondary">mdi-bank-transfer-out</v-icon>
            <div class="wd-approve-row-label">Yatırılacak hesap</div>
            <div class="wd-approve-row-value">
              <div v-if="selectedTxn.player_account_holder">{{ selectedTxn.player_account_holder }}</div>
              <div v-if="selectedTxn.player_bank_resolved || selectedTxn.player_bank_name" class="wd-approve-row-meta">{{ selectedTxn.player_bank_resolved || selectedTxn.player_bank_name }}</div>
              <div class="wd-approve-row-mono">{{ selectedTxn.player_iban }}</div>
            </div>
          </div>

          <!-- Admin-review-only context (handler + dekont). Hidden in
               the operator <threshold flow since they are the handler. -->
          <template v-if="approveIsAdminReview">
            <div v-if="selectedTxn.locker" class="wd-approve-row">
              <v-icon size="16" color="secondary">mdi-account-hard-hat</v-icon>
              <div class="wd-approve-row-label">İşlemi yapan</div>
              <div class="wd-approve-row-value">{{ selectedTxn.locker.name }}</div>
            </div>

            <div v-if="selectedTxn.dekont_path || selectedTxn.dekont_url" class="wd-approve-dekont">
              <v-btn
                block
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-file-eye"
                @click="approveDialog = false; openDekontPreview(selectedTxn)"
              >
                Dekontu İncele
              </v-btn>
            </div>

            <div v-if="selectedTxn.proof_submitted_at" class="wd-approve-row wd-approve-row--quiet">
              <v-icon size="14" color="grey">mdi-clock-check-outline</v-icon>
              <div class="wd-approve-row-label">Dekont gönderildi</div>
              <div class="wd-approve-row-value wd-approve-row-mono">{{ formatDate(selectedTxn.proof_submitted_at) }}</div>
            </div>
          </template>
        </div>

        <!-- Inline amount edit (kept from before — rare case) -->
        <div v-if="amountEditOpen" class="px-5 pb-2">
          <v-text-field
            v-model.number="editedAmount"
            type="number"
            step="0.01"
            label="Onay Tutarı"
            variant="outlined"
            density="compact"
            :hint="amountHint"
            persistent-hint
          />
        </div>
        <div v-else-if="!approveIsAdminReview" class="px-5 pb-2">
          <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-pencil" @click="enableAmountEdit">Tutarı düzenle</v-btn>
        </div>

        <v-alert v-if="approveError" type="error" density="compact" class="mx-5 mb-3">{{ approveError }}</v-alert>

        <v-card-actions class="wd-approve-actions">
          <v-btn variant="text" size="large" @click="approveDialog = false" class="flex-grow-1">Vazgeç</v-btn>
          <v-btn color="success" variant="flat" size="large" @click="confirmApprove" :loading="actingId === selectedTxn?.id" class="flex-grow-1 wd-approve-confirm-btn" prepend-icon="mdi-check-bold">
            Evet, Onayla
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject dialog -->
    <v-dialog v-model="rejectDialog" max-width="450">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="32" color="error" class="mr-2">mdi-close-circle</v-icon>
          İşlemi reddetmek istiyor musunuz?
        </v-card-title>
        <v-card-text v-if="selectedTxn">
          <div class="text-body-2 mb-2">
            #{{ selectedTxn.internal_id }} — {{ formatCurrency(selectedTxn.requested_amount) }} {{ selectedTxn.currency }}
          </div>
          <v-textarea v-model="rejectReason" label="Red sebebi" variant="outlined" density="compact" rows="2" counter="255" maxlength="255" class="mt-2" />
          <v-alert v-if="rejectError" type="error" density="compact" class="mt-2">{{ rejectError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectDialog = false">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" @click="confirmReject" :loading="actingId === selectedTxn?.id">Reddet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Proof submission dialog — operator has already paid out the cash;
         this dialog just records the receipt. Wording assumes the action
         is done; we're collecting evidence, not asking permission. -->
    <v-dialog v-model="proofDialog" max-width="520">
      <v-card v-if="selectedTxn" class="proof-card">
        <!-- Header band: purple gradient, receipt icon -->
        <div class="proof-hero">
          <div class="proof-hero-icon">
            <v-icon size="44" color="white">mdi-receipt-text-check</v-icon>
          </div>
          <div class="proof-hero-title">DEKONT YÜKLE</div>
          <div class="proof-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- Amount block -->
        <div class="proof-amount-block">
          <div class="proof-amount-label">Gönderilen Tutar</div>
          <div class="proof-amount-value">
            {{ formatCurrency(selectedTxn.requested_amount) }}
            <span class="proof-amount-cur">{{ selectedTxn.currency }}</span>
          </div>
        </div>

        <!-- Brief recipient context — operator should know who they're
             paying and which IBAN they're sending to before grabbing the
             dekont from their banking app. -->
        <div v-if="selectedTxn.customer || selectedTxn.player_iban" class="proof-meta">
          <div v-if="selectedTxn.customer" class="proof-meta-row">
            <v-icon size="14" color="secondary">mdi-account</v-icon>
            <div class="proof-meta-label">Müşteri</div>
            <div class="proof-meta-value">
              {{ customerName(selectedTxn) }}
              <span v-if="selectedTxn.customer.external_id" class="proof-meta-meta">@{{ selectedTxn.customer.external_id }}</span>
            </div>
          </div>
          <div v-if="selectedTxn.player_iban" class="proof-meta-row">
            <v-icon size="14" color="secondary">mdi-bank-transfer-out</v-icon>
            <div class="proof-meta-label">Yatırılacak hesap</div>
            <div class="proof-meta-value">
              <div v-if="selectedTxn.player_account_holder">{{ selectedTxn.player_account_holder }}</div>
              <div v-if="selectedTxn.player_bank_resolved || selectedTxn.player_bank_name" class="proof-meta-meta">{{ selectedTxn.player_bank_resolved || selectedTxn.player_bank_name }}</div>
              <div class="proof-meta-mono">{{ selectedTxn.player_iban }}</div>
            </div>
          </div>
        </div>

        <!-- Proof file/url -->
        <div class="proof-input-section">
          <div class="proof-prompt">
            <v-icon size="18" color="secondary" class="mr-2">mdi-paperclip</v-icon>
            <span>Para transferinin dekontunu yükle veya bağlantısını yapıştır.</span>
          </div>
          <v-tabs v-model="proofTab" density="compact" align-tabs="center" class="proof-tabs mt-2">
            <v-tab value="file"><v-icon start>mdi-file-upload</v-icon> Dekont Dosyası</v-tab>
            <v-tab value="url"><v-icon start>mdi-link-variant</v-icon> URL Bağlantısı</v-tab>
          </v-tabs>
          <v-window v-model="proofTab" class="mt-3">
            <v-window-item value="file">
              <v-file-input
                v-model="proofFile"
                label="Dekont seçin"
                hint="PDF, JPG veya PNG · maksimum 10 MB"
                persistent-hint
                accept="application/pdf,image/jpeg,image/png"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
              />
            </v-window-item>
            <v-window-item value="url">
              <v-text-field
                v-model="proofUrl"
                label="Dekont URL"
                placeholder="https://..."
                hint="Banka veya transfer sağlayıcısının dekont bağlantısı"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-link-variant"
              />
            </v-window-item>
          </v-window>
        </div>

        <v-alert v-if="proofError" type="error" density="compact" class="mx-5 mb-3">{{ proofError }}</v-alert>

        <v-card-actions class="proof-actions">
          <v-btn variant="text" size="large" @click="proofDialog = false" class="flex-grow-1">Vazgeç</v-btn>
          <v-btn color="secondary" variant="flat" size="large" @click="confirmProof" :loading="actingId === selectedTxn?.id" class="flex-grow-1 proof-confirm-btn" prepend-icon="mdi-check-bold">
            Onayla
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dekont preview modal — admin sees a render of the proof BEFORE
         choosing to download or open in a new tab. Image/PDF files render
         inline via blob URL; external URLs show as a labelled link with
         the bare URL exposed (iframes get blocked by most banks). -->
    <v-dialog v-model="dekontPreviewDialog" max-width="720" scrollable @update:model-value="onDekontPreviewToggle">
      <v-card v-if="selectedTxn" class="dekont-preview-card">
        <div class="dekont-preview-header">
          <div class="d-flex align-center">
            <v-icon size="26" color="secondary" class="mr-2">mdi-file-eye</v-icon>
            <div>
              <div class="dekont-preview-title">Dekont İnceleme</div>
              <div class="dekont-preview-sub">#{{ selectedTxn.internal_id }} · {{ formatCurrency(selectedTxn.requested_amount) }} {{ selectedTxn.currency }}</div>
            </div>
          </div>
          <v-btn icon variant="text" @click="dekontPreviewDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>

        <div class="dekont-preview-body">
          <!-- URL-style proof: show URL, render iframe attempt + fallback -->
          <template v-if="selectedTxn.dekont_url">
            <div class="dekont-url-bar">
              <v-icon size="18" color="primary" class="mr-2">mdi-link-variant</v-icon>
              <a :href="selectedTxn.dekont_url" target="_blank" rel="noopener" class="dekont-url-link">{{ selectedTxn.dekont_url }}</a>
              <v-tooltip text="Bağlantıyı kopyala" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" size="16" :color="dekontUrlCopied ? 'success' : 'primary'" style="cursor:pointer; margin-left: 8px" @click="copyDekontUrl">
                    {{ dekontUrlCopied ? 'mdi-check' : 'mdi-content-copy' }}
                  </v-icon>
                </template>
              </v-tooltip>
            </div>
            <div class="dekont-frame-wrap">
              <iframe
                :src="selectedTxn.dekont_url"
                class="dekont-frame"
                sandbox="allow-same-origin allow-scripts allow-popups"
                referrerpolicy="no-referrer"
              ></iframe>
              <div class="dekont-frame-note">
                <v-icon size="14" color="text-medium-emphasis" class="mr-1">mdi-information-outline</v-icon>
                Bazı banka sayfaları iframe ile gösterilemez. Yüklenmezse <strong>Yeni Sekmede Aç</strong> ile inceleyin.
              </div>
            </div>
          </template>

          <!-- File-style proof: image preview or PDF embed via blob URL -->
          <template v-else-if="selectedTxn.dekont_path">
            <div v-if="dekontBlobLoading" class="dekont-loading">
              <v-progress-circular indeterminate color="secondary" size="32" />
              <div class="mt-2">Dekont yükleniyor...</div>
            </div>
            <div v-else-if="dekontBlobError" class="dekont-error">
              <v-icon size="32" color="error" class="mb-1">mdi-alert-circle</v-icon>
              <div>{{ dekontBlobError }}</div>
            </div>
            <template v-else-if="dekontBlobUrl">
              <img v-if="dekontBlobIsImage" :src="dekontBlobUrl" alt="Dekont" class="dekont-image" />
              <iframe v-else :src="dekontBlobUrl" class="dekont-frame"></iframe>
            </template>
          </template>

          <!-- Neither — shouldn't normally happen since the button is gated -->
          <div v-else class="dekont-empty">
            Bu işlem için dekont bulunamadı.
          </div>
        </div>

        <v-card-actions class="dekont-preview-actions">
          <v-btn variant="text" @click="dekontPreviewDialog = false">Kapat</v-btn>
          <v-spacer />
          <v-btn
            v-if="selectedTxn.dekont_url"
            variant="tonal"
            color="primary"
            :href="selectedTxn.dekont_url"
            target="_blank"
            rel="noopener"
            prepend-icon="mdi-open-in-new"
          >
            Yeni Sekmede Aç
          </v-btn>
          <v-btn
            v-if="selectedTxn.dekont_path"
            variant="tonal"
            color="primary"
            @click="downloadDekont(selectedTxn)"
            prepend-icon="mdi-download"
          >
            İndir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign dialog (super admin) — reassign to any operator -->
    <!-- Toplu atama: cekler secilir, tek grup secilir, iletilir.
         Arada baska biri bir cekimi almissa o cek atlanir ve sonuc
         listesinde sebebiyle gosterilir. -->
    <v-dialog v-model="bulkDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="28" color="primary" class="mr-2">mdi-account-group</v-icon>
          Seçili Çekimleri Gruba İlet
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            {{ selectedIds.length }} çekim seçili. Bu sırada başka biri bir çekimi işleme aldıysa o çek atlanır.
          </v-alert>
          <v-autocomplete
            v-model="bulkSubGroupId"
            :items="subGroups"
            item-value="id"
            item-title="name"
            label="Hedef Grup"
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-alert v-if="bulkError" type="error" density="compact" class="mt-3">{{ bulkError }}</v-alert>
          <div v-if="bulkResult" class="mt-3">
            <div class="text-body-2 font-weight-bold mb-1">{{ bulkResult.message }}</div>
            <v-list v-if="bulkResult.skipped?.length" density="compact" class="bulk-skip-list">
              <v-list-item v-for="sk in bulkResult.skipped" :key="sk.id" density="compact">
                <v-list-item-title class="text-caption">#{{ sk.id }} — {{ sk.sebep }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="bulkDialog = false">Kapat</v-btn>
          <v-btn color="primary" variant="flat" :loading="bulkLoading" :disabled="!bulkSubGroupId" @click="confirmBulkAssign">
            İlet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Parca cekim / elle islem girisi -->
    <v-dialog v-model="manualDialog" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="28" color="primary" class="mr-2">mdi-call-split</v-icon>
          Elle Çekim Gir
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            Bayinin onaylanmış büyük talebini parçalara bölmek için kullanılır. Yalnızca iç firmalara işlenir.
          </v-alert>
          <v-autocomplete
            v-model="manualForm.merchant_id"
            :items="internalMerchants"
            item-value="id"
            item-title="name"
            label="Firma"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
            no-data-text="Tanımlı iç firma yok"
          />
          <v-text-field
            :model-value="formatAmountInput(manualForm.amount)"
            @update:model-value="v => { manualForm.amount = parseAmountInput(v) }"
            label="Tutar"
            type="text"
            inputmode="numeric"
            suffix="TRY"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
          <v-autocomplete
            v-model="manualForm.bank_account_id"
            :items="manualAccounts"
            item-value="id"
            :item-title="accountLabel"
            label="Hedef Hesap (boş bırakılırsa havuzda kalır)"
            variant="outlined"
            density="compact"
            class="mb-3"
            clearable
            hide-details
            :loading="manualAccountsLoading"
          />
          <v-text-field v-model="manualForm.player_account_holder" label="Alıcı Ad Soyad" variant="outlined" density="compact" class="mb-3" hide-details />
          <v-text-field v-model="manualForm.player_iban" label="Alıcı IBAN" variant="outlined" density="compact" class="mb-3" hide-details />
          <v-textarea v-model="manualForm.notes" label="Not" variant="outlined" density="compact" rows="2" hide-details />
          <v-alert v-if="manualError" type="error" density="compact" class="mt-3">{{ manualError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="manualDialog = false">Vazgeç</v-btn>
          <v-btn color="primary" variant="flat" :loading="manualLoading" :disabled="!manualForm.merchant_id || !manualForm.amount" @click="submitManual">
            Oluştur
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Gruplar arasi aktarim: kredi eski gruptan dusulup yenisine yaziliyor -->
    <v-dialog v-model="transferDialog" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="28" color="warning" class="mr-2">mdi-swap-horizontal-bold</v-icon>
          Başka Gruba Aktar
        </v-card-title>
        <v-card-text v-if="selectedTxn">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            Kredi eski gruptan düşülüp yeni gruba yazılır. Ödediğini söyleyip ödememiş grup için kullanılır.
          </v-alert>
          <div class="text-body-2 mb-3">
            <strong>#{{ selectedTxn.internal_id }}</strong> — {{ formatCurrency(selectedTxn.requested_amount) }} {{ selectedTxn.currency }}
            <div class="text-caption text-medium-emphasis mt-1">Mevcut grup: {{ selectedTxn.sub_group?.name || '—' }}</div>
          </div>
          <v-autocomplete
            v-model="transferSubGroupId"
            :items="subGroups"
            item-value="id"
            item-title="name"
            label="Yeni Grup"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
          <v-textarea
            v-model="transferReason"
            label="Gerekçe (zorunlu)"
            variant="outlined"
            density="compact"
            rows="2"
            counter="255"
            maxlength="255"
          />
          <v-alert v-if="transferError" type="error" density="compact">{{ transferError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="transferDialog = false">Vazgeç</v-btn>
          <v-btn color="warning" variant="flat" :loading="transferLoading" :disabled="!transferSubGroupId || !transferReason.trim()" @click="confirmTransfer">
            Aktar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="assignDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="32" color="primary" class="mr-2">mdi-account-switch</v-icon>
          Operatöre Ata
        </v-card-title>
        <v-card-text v-if="selectedTxn">
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            Çekimi istediğin operatöre atayabilirsin. Mevcut operatör kilidi kaldırılır ve işlem yeni operatörün listesine düşer.
          </v-alert>
          <div class="text-body-2 mb-3">
            <strong>#{{ selectedTxn.internal_id }}</strong> — {{ formatCurrency(selectedTxn.requested_amount) }} {{ selectedTxn.currency }}
            <div class="text-caption text-medium-emphasis mt-1">Mevcut durum: {{ statusText(selectedTxn.status) }}</div>
          </div>
          <v-autocomplete
            v-model="assignOperatorId"
            :items="assignableOperators"
            item-value="id"
            item-title="name"
            label="Operatör"
            variant="outlined"
            density="compact"
            :loading="assignLoading"
            no-data-text="Çekim hesabı tanımlı operatör yok"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.name">
                <template v-slot:subtitle>
                  Bakiye: {{ formatCurrency(item.raw.available_balance || 0) }}
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
          <v-alert v-if="assignError" type="error" density="compact" class="mt-2">{{ assignError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="assignDialog = false">Vazgeç</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmAssign" :loading="actingId === selectedTxn?.id" :disabled="!assignOperatorId">
            Ata
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Release dialog — hero-style warning. Releasing is irreversible:
         the operator forfeits the txn (and its commission) and the system
         routes it elsewhere. The dialog stresses both points hard. -->
    <v-dialog v-model="releaseDialog" max-width="480">
      <v-card v-if="selectedTxn" class="release-card">
        <!-- Header band: amber gradient, hand-off icon -->
        <div class="release-hero">
          <div class="release-hero-icon">
            <v-icon size="44" color="white">mdi-hand-back-right-off</v-icon>
          </div>
          <div class="release-hero-title">İŞLEMİ GERİ BIRAK</div>
          <div class="release-hero-sub">#{{ selectedTxn.internal_id }}</div>
        </div>

        <!-- No-operators-available state replaces the rest of the dialog -->
        <template v-if="releaseNoOperators">
          <div class="release-blocked">
            <v-icon size="42" color="warning" class="mb-2">mdi-alert-circle</v-icon>
            <div class="release-blocked-title">Uygun başka operatör yok</div>
            <div class="release-blocked-text">Şu anda bu işlemi alabilecek başka bir operatör bulunmuyor. Lütfen yöneticinizle iletişime geçin — işlem hâlâ size atanmış.</div>
          </div>
          <v-card-actions class="release-actions">
            <v-btn variant="flat" color="warning" size="large" @click="releaseDialog = false" class="flex-grow-1">Kapat</v-btn>
          </v-card-actions>
        </template>

        <template v-else>
          <!-- Amount block -->
          <div class="release-amount-block">
            <div class="release-amount-label">İşlem Tutarı</div>
            <div class="release-amount-value">
              {{ formatCurrency(selectedTxn.requested_amount) }}
              <span class="release-amount-cur">{{ selectedTxn.currency }}</span>
            </div>
          </div>

          <div class="release-warning-line">
            <v-icon size="20" color="warning" class="mr-2">mdi-alert-octagon</v-icon>
            <span>Bu işlemi tamamladıysanız geri bırakmayın. Geri bıraktığınızda tekrar üzerinize alamazsınız.</span>
          </div>

          <v-alert v-if="releaseError" type="error" density="compact" class="mx-5 mb-3">{{ releaseError }}</v-alert>

          <v-card-actions class="release-actions">
            <v-btn variant="text" size="large" @click="releaseDialog = false" class="flex-grow-1">Vazgeç</v-btn>
            <v-btn
              color="warning"
              variant="flat"
              size="large"
              @click="confirmRelease"
              :loading="actingId === selectedTxn?.id"
              class="flex-grow-1 release-confirm-btn"
              prepend-icon="mdi-hand-back-right-off"
            >
              Evet, Geri Bırak
            </v-btn>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

    <!-- Cancel dialog (super admin) -->
    <v-dialog v-model="cancelDialog" max-width="450">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon size="32" color="grey-darken-2" class="mr-2">mdi-cancel</v-icon>
          İşlemi iptal et
        </v-card-title>
        <v-card-text v-if="selectedTxn">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            Onaylanmış bir çekimi iptal ediyorsunuz. Operatör kredisi otomatik olarak yeniden hesaplanacak.
          </v-alert>
          <div class="text-body-2 mb-2">
            #{{ selectedTxn.internal_id }} — {{ formatCurrency(selectedTxn.amount || selectedTxn.requested_amount) }} {{ selectedTxn.currency }}
          </div>
          <v-textarea v-model="cancelReason" label="İptal sebebi" variant="outlined" density="compact" rows="2" counter="255" maxlength="255" class="mt-2" />
          <v-alert v-if="cancelError" type="error" density="compact" class="mt-2">{{ cancelError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelDialog = false">Vazgeç</v-btn>
          <v-btn color="grey-darken-2" variant="flat" @click="confirmCancel" :loading="actingId === selectedTxn?.id">İptal Et</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SA-only detail drawer — opened via @click:row -->
    <TransactionDetailsDrawer
      v-model="detailDrawer"
      :txn="detailTxn"
      @preview-dekont="(t) => { detailDrawer = false; openDekontPreview(t) }"
    />
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactionStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import api from '@/plugins/axios'
import TransactionDetailsDrawer from '@/components/TransactionDetailsDrawer.vue'

const txnStore = useTransactionStore()
const auth = useAuthStore()
const notifications = useNotificationStore()
const route = useRoute()
const router = useRouter()

/*
 * Yonetim eylemleri: rol degil izin.
 *
 * auth.can() super admin'i de kapsiyor (backend /portal/me yanitinda
 * super admin'in tum izinlerini donduruyor), bu yuzden ayrica
 * isSuperAdmin sormaya gerek yok. Backend ayni izinlere bakiyor.
 */
const canAssign = computed(() => auth.isSuperAdmin || auth.can('transactions.assign'))
// Firma adini gorenler Site sutununu, butun gruplari gorenler Grup
// sutununu ve grup suzgecini gorur. Destek ikisini de goruyor.
const seesFinancials = computed(() =>
  auth.isSuperAdmin || auth.can('scope.merchant_identity') || auth.can('scope.commissions')
)
const seesAllGroups = computed(() =>
  auth.isSuperAdmin || auth.can('scope.all_groups')
)
const canCreateManual = computed(() => auth.isSuperAdmin || auth.can('transactions.create_manual'))
const canTransferGroup = computed(() => auth.isSuperAdmin || auth.can('transactions.transfer_group'))
const canCancel = computed(() => auth.isSuperAdmin || auth.can('transactions.cancel'))

// Notification → highlight the row (mirrors DepositListView).
const highlightId = ref(route.query.highlight ? String(route.query.highlight) : null)
let highlightClearTimer = null

function rowProps({ item }) {
  // Pending+assigned both render as "Yeni" (amber) in the status chip; tint
  // the row with the same color so the visual stays consistent.
  const tintStatus = item.status === 'assigned' ? 'pending' : item.status
  const classes = [`status-row--${tintStatus}`]
  if (highlightId.value && String(item.id) === highlightId.value) classes.push('highlighted-row')
  return {
    class: classes.join(' '),
    'data-txn-id': item.id,
  }
}

async function scrollToHighlight() {
  if (!highlightId.value) return
  await nextTick()
  setTimeout(() => {
    const el = document.querySelector(`tr[data-txn-id="${highlightId.value}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 150)
  if (highlightClearTimer) clearTimeout(highlightClearTimer)
  highlightClearTimer = setTimeout(() => {
    highlightId.value = null
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

watch(() => txnStore.items.length, () => {
  if (highlightId.value) scrollToHighlight()
})

// Loaded from /portal/settings on mount. Default mirrors the backend
// fallback so the UI gates correctly even before the settings call returns.
const ADMIN_REVIEW_THRESHOLD = ref(5000)
const COUNTDOWN_TOTAL_MS = 15 * 60 * 1000
const RED_REMAINING_MS = 5 * 60 * 1000

const now = ref(Date.now())
let nowTimer = null

watch(() => txnStore.transactionUpdateTick, () => loadData())

const search = ref('')
const statusFilter = ref(null)
const sandboxFilter = ref('real')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const showFilters = ref(false)

const merchantFilter = ref(null)
const subGroups = ref([])
const subGroupFilter = ref(null)
const sadeceBenim = ref(false)
const customerFilter = ref('')
const lockerFilter = ref(null)
const amountMin = ref(null)
const amountMax = ref(null)
const merchants = ref([])
const operatorOptions = ref([])
// Track which date preset is currently active so the chip styling
// reflects the user's last quick-pick (cleared when they edit dates).
const activeDatePreset = ref('all')
const ownBankAccounts = ref([])

const actingId = ref(null)
const selectedTxn = ref(null)

// Approve
const approveDialog = ref(false)
const approveError = ref('')
const amountEditOpen = ref(false)
const editedAmount = ref(null)

// Reject
const rejectDialog = ref(false)
const rejectError = ref('')
const rejectReason = ref('')

// Proof submission (≥ dekont threshold)
const proofDialog = ref(false)
const proofTab = ref('file')
const proofFile = ref(null)
const proofUrl = ref('')
const proofError = ref('')

// Cancel approved (SA only)
const cancelDialog = ref(false)
const cancelReason = ref('')
const cancelError = ref('')

// Release (operator) — redirects to next-best operator if available
const releaseDialog = ref(false)
const releaseError = ref('')
const releaseNoOperators = ref(false)

// Detail side pane (SA only) — click a row to open. The pane absorbs
// every verbose field that would otherwise blow out the table width
// (full IBANs, IDs, fee breakdown, audit timestamps).
const detailDrawer = ref(false)
const detailTxn = ref(null)

function openDetail(event, { item }) {
  if (!auth.isSuperAdmin) return
  // Don't open the pane when the click was on an action button, menu,
  // icon, or link inside the row — those have their own behaviour.
  const tgt = event?.target
  if (tgt?.closest?.('button, a, .v-btn, .v-icon, .v-list-item, [role="menuitem"]')) return
  detailTxn.value = item
  detailDrawer.value = true
}

// Dekont preview (admin) — single modal with inline preview before
// committing to download / open in new tab. Blob URL is created on
// open and revoked on close so we don't leak object URLs.
const dekontPreviewDialog = ref(false)
const dekontBlobUrl = ref(null)
const dekontBlobIsImage = ref(false)
const dekontBlobLoading = ref(false)
const dekontBlobError = ref('')
const dekontUrlCopied = ref(false)

// Assign (super admin) — reassign withdrawal to any operator manually
const assignDialog = ref(false)
const assignError = ref('')
const assignOperatorId = ref(null)
const assignableOperators = ref([])
const assignLoading = ref(false)

// Toplu atama: cekler secilir, tek grup secilir, iletilir.
const selectedIds = ref([])
const bulkDialog = ref(false)
const bulkSubGroupId = ref(null)
const bulkLoading = ref(false)
const bulkError = ref('')
const bulkResult = ref(null)

// Elle cekim (parca cekim) formu.
const manualDialog = ref(false)
const manualLoading = ref(false)
const manualError = ref('')
const internalMerchants = ref([])
const manualAccounts = ref([])
const manualAccountsLoading = ref(false)
const manualForm = ref({
  merchant_id: null,
  amount: null,
  bank_account_id: null,
  player_account_holder: '',
  player_iban: '',
  notes: '',
})

// Gruplar arasi aktarim.
const transferDialog = ref(false)
const transferSubGroupId = ref(null)
const transferReason = ref('')
const transferLoading = ref(false)
const transferError = ref('')

const activeFilterCount = computed(() => activeFilterChips.value.length)

// Status options used by the quick-pill row above the table. Includes
// "Hepsi" so users can clear a status filter with one click.
const statusQuickOptions = [
  { value: '',                                            text: 'Hepsi',           icon: 'mdi-format-list-bulleted', color: 'pill-grey' },
  { value: 'pending,assigned,payment_seen,processing',    text: 'İşlemde',         icon: 'mdi-clock-outline',        color: 'pill-amber' },
  { value: 'admin_review',                                text: 'Yönetici Onayı',  icon: 'mdi-shield-search',        color: 'pill-info' },
  { value: 'approved',                                    text: 'Onaylandı',       icon: 'mdi-check-decagram',       color: 'pill-success' },
  { value: 'rejected',                                    text: 'Reddedildi',      icon: 'mdi-close-octagon',        color: 'pill-error' },
  { value: 'expired',                                     text: 'Süresi Doldu',    icon: 'mdi-timer-sand-empty',     color: 'pill-grey' },
  { value: 'cancelled',                                   text: 'İptal',           icon: 'mdi-cancel',               color: 'pill-grey' },
]

const datePresets = [
  { id: 'all',       label: 'Tümü',        icon: 'mdi-infinity' },
  { id: 'today',     label: 'Bugün',       icon: 'mdi-calendar-today' },
  { id: 'yesterday', label: 'Dün',         icon: 'mdi-calendar-arrow-left' },
  { id: 'week',      label: 'Bu Hafta',    icon: 'mdi-calendar-week' },
  { id: 'month',     label: 'Bu Ay',       icon: 'mdi-calendar-month' },
]

function setStatusQuick(value) {
  // Empty string clears the status filter; any value applies it.
  statusFilter.value = value === '' ? null : value
  loadData()
}

// Date presets are resolved on the BACKEND in app.timezone. The frontend
// sends only the preset name (today / yesterday / week / month / all) so
// browser-vs-server TZ skew can never miscount the range. When the user
// edits the datetime-local fields manually, the preset flips to "custom"
// and date_from / date_to take over.
function applyDatePreset(id) {
  activeDatePreset.value = id
  // Clear manual datetime-local inputs so the chip reflects the preset
  // and we don't double-filter on the server.
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

// Active filter chips — one entry per applied filter, removable.
const activeFilterChips = computed(() => {
  const chips = []
  if (statusFilter.value) chips.push({ key: 'status', label: 'Durum', value: statusLabelByValue.value[statusFilter.value] || statusFilter.value })
  // Preset trumps manual date when active.
  if (datePresetLabel.value) {
    chips.push({ key: 'datePreset', label: 'Tarih', value: datePresetLabel.value })
  } else {
    if (dateFrom.value) chips.push({ key: 'dateFrom', label: 'Başlangıç', value: dateFrom.value.replace('T', ' ') })
    if (dateTo.value)   chips.push({ key: 'dateTo', label: 'Bitiş', value: dateTo.value.replace('T', ' ') })
  }
  if (customerFilter.value) chips.push({ key: 'customer', label: 'Oyuncu', value: customerFilter.value })
  if (amountMin.value != null) chips.push({ key: 'amountMin', label: 'Min', value: formatCurrency(amountMin.value) + ' TRY' })
  if (amountMax.value != null) chips.push({ key: 'amountMax', label: 'Max', value: formatCurrency(amountMax.value) + ' TRY' })
  if (merchantFilter.value) chips.push({ key: 'merchant', label: 'Site', value: (merchants.value.find(m => m.id === merchantFilter.value)?.name) || '#' + merchantFilter.value })
  if (subGroupFilter.value) chips.push({ key: 'sub_group', label: 'Grup', value: (subGroups.value.find(g => g.id === subGroupFilter.value)?.name) || '#' + subGroupFilter.value })
  if (lockerFilter.value)   chips.push({ key: 'locker', label: 'Operatör', value: (operatorOptions.value.find(o => o.id === lockerFilter.value)?.name) || '#' + lockerFilter.value })
  return chips
})

function clearFilter(key) {
  switch (key) {
    case 'status':    statusFilter.value = null; break
    case 'datePreset':activeDatePreset.value = 'all'; break
    case 'dateFrom':  dateFrom.value = ''; activeDatePreset.value = 'custom'; break
    case 'dateTo':    dateTo.value = '';   activeDatePreset.value = 'custom'; break
    case 'customer':  customerFilter.value = ''; break
    case 'amountMin': amountMin.value = null; break
    case 'amountMax': amountMax.value = null; break
    case 'merchant':  merchantFilter.value = null; break
    case 'sub_group': subGroupFilter.value = null; break
    case 'locker':    lockerFilter.value = null; break
  }
  loadData()
}

// Re-use the same integer thousand-separator helpers as the other
// amount inputs in the app for visual consistency.
const filterAmountFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })
function formatAmountInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return filterAmountFormatter.format(Math.trunc(num))
}
function parseAmountInput(value) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits === '' ? null : parseInt(digits, 10)
}

const statusOptions = [
  { text: 'Hepsi', value: '' },
  { text: 'İşlemde', value: 'pending,assigned,payment_seen,processing' },
  { text: 'Yönetici Onayı', value: 'admin_review' },
  { text: 'Onaylandı', value: 'approved' },
  { text: 'Reddedildi', value: 'rejected' },
  { text: 'İptal Edildi', value: 'cancelled' },
]

const sandboxOptions = [
  { text: 'Sadece Canlı', value: 'real' },
  { text: 'Sadece Sandbox', value: 'sandbox' },
  { text: 'Tümü', value: 'all' },
]

const allHeaders = [
  { title: 'ID', key: 'internal_id', width: '70px' },
  // value getter resolves the nested name so the cell renders the string
  // even without a v-slot (Vuetify 3's default-cell renderer JSON-stringifies
  // raw objects). Slot still wins when present.
  { title: 'Site', key: 'merchant', value: (item) => item.merchant?.name || '—', sortable: false },
  { title: 'Grup', key: 'sub_group', sortable: false, width: '120px' },
  { title: 'İsim', key: 'customer', sortable: false },
  { title: 'Hedef Hesap', key: 'player_bank', sortable: false },
  { title: 'Tutar', key: 'requested_amount' },
  { title: 'Durum', key: 'status' },
  { title: 'Tarih', key: 'created_at', sortable: false, width: '130px' },
  { title: 'Ortam', key: 'environment', sortable: false },
  { title: 'İşlem', key: 'actions', sortable: false, align: 'end' },
]

/*
 * Sutun gorunurlugu izne bagli, role degil.
 *
 * Onceden tek isSuperAdmin kontrolu vardi ve destek ekibi, firmayla
 * iletisime gecmesi gerektigi halde Site sutununu goremiyordu.
 * Onaylayan ayri bir sutun degil artik; durum rozetinin altinda.
 */
const visibleHeaders = computed(() => {
  const gizli = []
  if (!seesFinancials.value) gizli.push('merchant')
  if (!seesAllGroups.value) gizli.push('sub_group')
  if (!auth.isSuperAdmin) gizli.push('environment')
  return allHeaders.filter(h => !gizli.includes(h.key))
})

// Status display: "assigned" means routed to an operator's bank account
// but no one has clicked İşleme Al yet — visually the same as "pending"
// for the operator (both = "do something"). Only "processing" (locked by
// an operator) shows as Kontrolde.
function statusColor(status) {
  const colors = { pending: 'amber-darken-2', assigned: 'amber-darken-2', payment_seen: 'secondary', processing: 'warning', admin_review: 'purple-darken-2', approved: 'success', rejected: 'error', expired: 'grey-darken-1', cancelled: 'grey-darken-2' }
  return colors[status] || 'grey'
}
function statusText(status) {
  const texts = { pending: 'Yeni', assigned: 'Yeni', payment_seen: 'Ödeme Görüldü', processing: 'Kontrolde', admin_review: 'Yönetici Onayı', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu', cancelled: 'İptal Edildi' }
  return texts[status] || status
}
function statusIcon(status) {
  const icons = { pending: 'mdi-bell-ring', assigned: 'mdi-bell-ring', payment_seen: 'mdi-cash-check', processing: 'mdi-progress-clock', admin_review: 'mdi-shield-account', approved: 'mdi-check-circle', rejected: 'mdi-close-circle', expired: 'mdi-timer-off-outline', cancelled: 'mdi-cancel' }
  return icons[status] || 'mdi-help-circle-outline'
}

function customerName(item) {
  const c = item.customer
  if (!c) return '—'
  if (c.name) return c.name
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ')
  return full || c.external_id || '—'
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount || 0)
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

// 15-min countdown for in-flight rows. Counts DOWN from 15:00; turns red
// below 5:00; clamps at 00:00 when overdue.
const ACTIVE_STATUSES = ['pending', 'assigned', 'payment_seen', 'processing', 'admin_review']
function showCounter(item) { return ACTIVE_STATUSES.includes(item.status) }

// Time the operator took from locking the txn to finalising it (approve
// or reject). Returns minutes, or null when we can't compute (no lock,
// no resolve, or negative diff from clock skew).
function finalizationMinutes(item) {
  if (!item || !item.locked_at) return null
  const end = item.resolved_at || item.approved_at
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(item.locked_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  // Sub-minute resolves still display as "1 dk" — anything <1 min just
  // means "instant" but rounding to 0 reads as missing data.
  return Math.max(1, Math.round(ms / 60000))
}

// Colour-code the badge so SA spots slow ones at a glance.
//   ≤ 5 dk  → green   (snappy)
//   ≤ 15 dk → grey    (normal)
//   ≤ 30 dk → amber   (slow)
//   > 30 dk → red     (very slow)
function finalizeBadgeClass(item) {
  const m = finalizationMinutes(item)
  if (m == null) return ''
  if (m <= 5)  return 'finalize-badge--fast'
  if (m <= 15) return 'finalize-badge--normal'
  if (m <= 30) return 'finalize-badge--slow'
  return 'finalize-badge--late'
}
function elapsedMs(item) { return now.value - new Date(item.created_at).getTime() }
function remainingMs(item) { return Math.max(0, COUNTDOWN_TOTAL_MS - elapsedMs(item)) }
function remainingDisplay(item) {
  const ms = remainingMs(item)
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function counterClass(item) {
  const r = remainingMs(item)
  if (r === 0) return 'counter-bar--overdue'
  return r < RED_REMAINING_MS ? 'counter-bar--red' : 'counter-bar--info'
}

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
 * Onay, red ve dekont AYRI izinler.
 *
 * Onceden yalnizca canActOnLocked'a bakiliyordu: kilidi elinde olan
 * herkes onay dugmesini goruyordu. Sunucu zaten reddediyordu ama
 * kullanici bunu ancak tikladiktan sonra ogreniyordu.
 */
function canApproveItem(item) {
  return canActOnLocked(item) && (auth.isSuperAdmin || auth.can('transactions.approve.withdrawal'))
}
function canRejectItem(item) {
  return canActOnLocked(item) && (auth.isSuperAdmin || auth.can('transactions.reject.withdrawal'))
}
function canSubmitProof(item) {
  return canActOnLocked(item) && (auth.isSuperAdmin || auth.can('transactions.submit_proof'))
}

// Reassignment is super-admin-only now — operators can't release a
// withdrawal once it's assigned to them (prevents cherry-picking).
// SA reassigns via the "Operatöre Ata" overflow menu item.
function canRelease(_item) {
  return false
}

// Whether the SA's overflow menu has any items for this row. Avoids
// rendering an empty 3-dot menu on terminal-but-not-approved rows.
/*
 * Menude gosterilecek bir sey var mi?
 *
 * Eskiden kosul "auth.isSuperAdmin" idi: atama ve iptal izinleri
 * katalogda oldugu halde yalnizca super admin bu menuye ulasabiliyordu.
 * Artik iki maddenin kendi izni belirliyor -- backend de ayni izinlere
 * bakiyor (transactions.assign / transactions.cancel).
 */
function hasAdminOverflow(item) {
  const atanabilir = canAssign.value && !['approved', 'rejected', 'expired', 'cancelled'].includes(item.status)
  const iptalEdilebilir = canCancel.value && item.status === 'approved'

  return atanabilir || iptalEdilebilir
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

function copyIban(iban) {
  if (!iban) return
  navigator.clipboard.writeText(iban).then(() => {
    notifications.addNotification({ type: 'success', title: 'Kopyalandı', message: 'IBAN panoya alındı.' })
  })
}

// --- Approve ---
function openApprove(item) {
  selectedTxn.value = item
  approveError.value = ''
  amountEditOpen.value = false
  editedAmount.value = null
  approveDialog.value = true
}
function enableAmountEdit() {
  amountEditOpen.value = true
  editedAmount.value = Number(selectedTxn.value?.requested_amount || 0)
}
// SA approving an admin_review row → richer modal with all the context
// the admin needs (operator who handled it, source bank, dekont, etc.).
const approveIsAdminReview = computed(() => {
  return auth.isSuperAdmin && selectedTxn.value?.status === 'admin_review'
})

const amountHint = computed(() => {
  const requested = Number(selectedTxn.value?.requested_amount || 0)
  return `Talep: ${formatCurrency(requested)} • Sapma izni: ±1.000 TRY`
})
async function confirmApprove() {
  if (!selectedTxn.value) return
  approveError.value = ''
  if (amountEditOpen.value) {
    const requested = Number(selectedTxn.value.requested_amount)
    const v = Number(editedAmount.value)
    if (!v || v <= 0) { approveError.value = 'Geçerli bir tutar girin.'; return }
    if (Math.abs(v - requested) > 1000) {
      approveError.value = 'Sapma izni ±1.000 TRY ile sınırlıdır.'
      return
    }
  }

  actingId.value = selectedTxn.value.id
  try {
    const payload = {}
    if (amountEditOpen.value) payload.amount = Number(editedAmount.value)

    const { data } = await api.post(`/portal/transactions/${selectedTxn.value.id}/approve`, payload)
    // Sync the local store cache so list updates without a full reload.
    txnStore.upsertItem?.(data) || (await loadData())
    approveDialog.value = false
    selectedTxn.value = null
  } catch (e) {
    const data = e?.response?.data
    approveError.value = data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : (data?.message || 'Onay başarısız.')
  } finally {
    actingId.value = null
  }
}

// --- Reject ---
function openReject(item) {
  selectedTxn.value = item
  rejectError.value = ''
  rejectReason.value = ''
  rejectDialog.value = true
}
async function confirmReject() {
  if (!selectedTxn.value) return
  rejectError.value = ''
  if (!rejectReason.value || rejectReason.value.trim().length < 3) {
    rejectError.value = 'Lütfen red sebebini yazın.'
    return
  }
  actingId.value = selectedTxn.value.id
  try {
    await txnStore.reject(selectedTxn.value.id, rejectReason.value)
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

// --- Proof submission (≥ dekont threshold) ---
function openProof(item, mode = 'file') {
  selectedTxn.value = item
  proofTab.value = mode
  proofFile.value = null
  proofUrl.value = ''
  proofError.value = ''
  proofDialog.value = true
}
function pickFile(v) {
  // v-file-input v-model can be a File, an array of Files, or null/empty.
  if (!v) return null
  if (Array.isArray(v)) return v[0] || null
  return v
}

async function confirmProof() {
  if (!selectedTxn.value) return
  proofError.value = ''

  if (proofTab.value === 'file' && !pickFile(proofFile.value)) {
    proofError.value = 'Dekont dosyası seçin.'
    return
  }
  if (proofTab.value === 'url' && (!proofUrl.value || !/^https?:\/\//i.test(proofUrl.value))) {
    proofError.value = 'Geçerli bir URL girin (http/https).'
    return
  }

  actingId.value = selectedTxn.value.id
  try {
    if (proofTab.value === 'file') {
      // Multipart upload — let axios/browser set Content-Type with the
      // boundary param. Setting it manually breaks parsing on the server.
      const fd = new FormData()
      fd.append('dekont', pickFile(proofFile.value))
      await api.post(`/portal/transactions/${selectedTxn.value.id}/submit-proof`, fd)
    } else {
      await api.post(`/portal/transactions/${selectedTxn.value.id}/submit-proof`, {
        dekont_url: proofUrl.value,
      })
    }
    proofDialog.value = false
    selectedTxn.value = null
    // No notification — operator sees the row's status flip to "Yönetici
    // Onayı" via the live update; explicit toast is just noise.
    loadData()
  } catch (e) {
    // Surface Laravel validation errors when present (more helpful than the
    // generic message), fall back to message or status text.
    const data = e?.response?.data
    if (data?.errors) {
      proofError.value = Object.values(data.errors).flat().join(' ')
    } else {
      proofError.value = data?.message || e?.message || 'Gönderilemedi.'
    }
  } finally {
    actingId.value = null
  }
}

async function downloadDekont(item) {
  try {
    const res = await api.get(`/portal/transactions/${item.id}/dekont`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `dekont-${item.internal_id}`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    notifications.addNotification({ type: 'error', title: 'Dekont indirilemedi', message: e?.response?.data?.message || '' })
  }
}

// --- Dekont preview (admin) ---
async function openDekontPreview(item) {
  selectedTxn.value = item
  dekontUrlCopied.value = false
  dekontBlobError.value = ''
  dekontBlobUrl.value = null
  dekontBlobIsImage.value = false
  dekontPreviewDialog.value = true

  // For URL-style proofs we don't fetch anything — the URL goes straight
  // into an iframe / link. For file-style proofs we fetch a blob so we
  // can render <img> for images and <iframe> for PDFs without forcing a
  // download. Mime-type comes from the response Content-Type.
  if (item.dekont_path && !item.dekont_url) {
    dekontBlobLoading.value = true
    try {
      const res = await api.get(`/portal/transactions/${item.id}/dekont`, { responseType: 'blob' })
      const mime = res.data.type || res.headers?.['content-type'] || 'application/octet-stream'
      dekontBlobIsImage.value = mime.startsWith('image/')
      dekontBlobUrl.value = window.URL.createObjectURL(new Blob([res.data], { type: mime }))
    } catch (e) {
      dekontBlobError.value = e?.response?.data?.message || 'Dekont yüklenemedi.'
    } finally {
      dekontBlobLoading.value = false
    }
  }
}

function onDekontPreviewToggle(open) {
  if (open) return
  // Revoke the blob URL so we don't leak object URLs across previews.
  if (dekontBlobUrl.value) {
    window.URL.revokeObjectURL(dekontBlobUrl.value)
    dekontBlobUrl.value = null
  }
  dekontBlobIsImage.value = false
  dekontBlobError.value = ''
  dekontBlobLoading.value = false
}

async function copyDekontUrl() {
  if (!selectedTxn.value?.dekont_url) return
  try {
    await navigator.clipboard.writeText(selectedTxn.value.dekont_url)
    dekontUrlCopied.value = true
    setTimeout(() => { dekontUrlCopied.value = false }, 1500)
  } catch { /* clipboard denied — silent */ }
}

// --- Release (operator) ---
function openRelease(item) {
  selectedTxn.value = item
  releaseError.value = ''
  releaseNoOperators.value = false
  releaseDialog.value = true
}
async function confirmRelease() {
  if (!selectedTxn.value) return
  releaseError.value = ''
  releaseNoOperators.value = false
  actingId.value = selectedTxn.value.id
  try {
    await api.post(`/portal/transactions/${selectedTxn.value.id}/release`)
    releaseDialog.value = false
    selectedTxn.value = null
    notifications.addNotification({
      type: 'success',
      title: 'Devredildi',
      message: 'İşlem başka bir operatöre atandı.',
    })
    loadData()
  } catch (e) {
    const data = e?.response?.data
    if (data?.error === 'no_other_operator') {
      releaseNoOperators.value = true
      releaseError.value = data.message
    } else {
      releaseError.value = data?.message || 'Devretme başarısız.'
    }
  } finally {
    actingId.value = null
  }
}

/*
 * Toplu atama.
 *
 * Backend her cekimi tek tek kosullu guncelliyor: arada baska biri
 * isleme aldiysa o satir etkilenmiyor ve "atlanan" listesine dusuyor.
 * Bu yuzden burada onceden filtreleme yapmiyoruz, sonucu gosteriyoruz.
 */
function openBulkAssign() {
  bulkError.value = ''
  bulkResult.value = null
  bulkSubGroupId.value = null
  bulkDialog.value = true
}

async function confirmBulkAssign() {
  if (!bulkSubGroupId.value || !selectedIds.value.length) return
  bulkError.value = ''
  bulkResult.value = null
  bulkLoading.value = true
  try {
    const { data } = await api.post('/portal/transactions/bulk-assign', {
      transaction_ids: selectedIds.value,
      sub_group_id: bulkSubGroupId.value,
    })
    bulkResult.value = data
    // Atananlari secimden dusuruyoruz; atlananlar secili kaliyor ki
    // kullanici tekrar deneyebilsin.
    const atanan = new Set(data.assigned || [])
    selectedIds.value = selectedIds.value.filter(id => !atanan.has(id))
    notifications.addNotification({ type: 'success', title: 'Toplu Atama', message: data.message })
    loadData()
  } catch (e) {
    bulkError.value = e?.response?.data?.message || 'Toplu atama başarısız.'
  } finally {
    bulkLoading.value = false
  }
}

// --- Elle cekim girisi (parca cekim) ---
function accountLabel(a) {
  const grup = a.sub_group?.name || a.sub_group_name || ''
  return grup ? `${grup} — ${a.account_holder || a.bank_name}` : (a.account_holder || a.bank_name || `#${a.id}`)
}

async function openManual() {
  manualError.value = ''
  manualForm.value = {
    merchant_id: null,
    amount: null,
    bank_account_id: null,
    player_account_holder: '',
    player_iban: '',
    notes: '',
  }
  manualDialog.value = true
  if (!internalMerchants.value.length || !manualAccounts.value.length) {
    manualAccountsLoading.value = true
    try {
      const [{ data: ms }, { data: accs }] = await Promise.all([
        api.get('/portal/merchants', { params: { internal: 1 } }),
        api.get('/portal/bank-accounts'),
      ])
      // Ic firma isareti backend'den geliyor; gelmezse listeyi
      // daraltmiyoruz, backend zaten disaridakini reddediyor.
      const icOlanlar = (ms || []).filter(m => m.is_internal)
      internalMerchants.value = icOlanlar.length ? icOlanlar : (ms || [])
      manualAccounts.value = (accs || []).filter(a => a.is_active !== false)
    } catch (e) {
      manualError.value = e?.response?.data?.message || 'Firma ve hesap listesi alınamadı.'
    } finally {
      manualAccountsLoading.value = false
    }
  }
}

async function submitManual() {
  manualError.value = ''
  manualLoading.value = true
  try {
    const { data } = await api.post('/portal/transactions/manual', {
      merchant_id: manualForm.value.merchant_id,
      type: 'withdrawal',
      amount: manualForm.value.amount,
      bank_account_id: manualForm.value.bank_account_id || null,
      player_account_holder: manualForm.value.player_account_holder || null,
      player_iban: manualForm.value.player_iban || null,
      notes: manualForm.value.notes || null,
    })
    manualDialog.value = false
    notifications.addNotification({
      type: 'success',
      title: 'Çekim Oluşturuldu',
      message: data?.message || 'Elle çekim kaydı oluşturuldu.',
    })
    loadData()
  } catch (e) {
    manualError.value = e?.response?.data?.message || 'Çekim oluşturulamadı.'
  } finally {
    manualLoading.value = false
  }
}

// --- Gruplar arasi aktarim ---
function openTransfer(item) {
  selectedTxn.value = item
  transferError.value = ''
  transferSubGroupId.value = null
  transferReason.value = ''
  transferDialog.value = true
}

async function confirmTransfer() {
  if (!selectedTxn.value) return
  transferError.value = ''
  transferLoading.value = true
  try {
    const { data } = await api.post(`/portal/transactions/${selectedTxn.value.id}/transfer-group`, {
      sub_group_id: transferSubGroupId.value,
      reason: transferReason.value.trim(),
    })
    transferDialog.value = false
    selectedTxn.value = null
    notifications.addNotification({
      type: 'success',
      title: 'Aktarıldı',
      message: data?.message || 'Çekim yeni gruba aktarıldı.',
    })
    loadData()
  } catch (e) {
    transferError.value = e?.response?.data?.message || 'Aktarım başarısız.'
  } finally {
    transferLoading.value = false
  }
}

// --- Assign / reassign (SA only) ---
async function openAssign(item) {
  selectedTxn.value = item
  assignError.value = ''
  assignOperatorId.value = null
  assignDialog.value = true
  if (!assignableOperators.value.length) {
    assignLoading.value = true
    try {
      const { data } = await api.get('/portal/transactions/withdrawal-operators')
      assignableOperators.value = data || []
    } catch (e) {
      assignError.value = e?.response?.data?.message || 'Operatör listesi alınamadı.'
    } finally {
      assignLoading.value = false
    }
  }
}
async function confirmAssign() {
  if (!selectedTxn.value || !assignOperatorId.value) {
    assignError.value = 'Bir operatör seçin.'
    return
  }
  assignError.value = ''
  actingId.value = selectedTxn.value.id
  try {
    await api.post(`/portal/transactions/${selectedTxn.value.id}/assign`, {
      operator_id: assignOperatorId.value,
    })
    assignDialog.value = false
    selectedTxn.value = null
    notifications.addNotification({
      type: 'success',
      title: 'Atandı',
      message: 'İşlem seçilen operatöre atandı.',
    })
    loadData()
  } catch (e) {
    assignError.value = e?.response?.data?.message || 'Atama başarısız.'
  } finally {
    actingId.value = null
  }
}

// --- Cancel approved (SA) ---
function openCancel(item) {
  selectedTxn.value = item
  cancelError.value = ''
  cancelReason.value = ''
  cancelDialog.value = true
}
async function confirmCancel() {
  if (!selectedTxn.value) return
  cancelError.value = ''
  if (!cancelReason.value || cancelReason.value.trim().length < 3) {
    cancelError.value = 'İptal sebebini yazın.'; return
  }
  actingId.value = selectedTxn.value.id
  try {
    await api.post(`/portal/transactions/${selectedTxn.value.id}/cancel`, { reason: cancelReason.value })
    cancelDialog.value = false
    selectedTxn.value = null
    loadData()
  } catch (e) {
    cancelError.value = e?.response?.data?.message || 'İptal başarısız.'
  } finally {
    actingId.value = null
  }
}

function bankAccountLabel(item) { return `${item.account_holder} — ${item.bank_name}` }

function clearFilters() {
  statusFilter.value = null
  sandboxFilter.value = 'real'
  dateFrom.value = ''
  dateTo.value = ''
  search.value = ''
  merchantFilter.value = null
  subGroupFilter.value = null
  customerFilter.value = ''
  lockerFilter.value = null
  amountMin.value = null
  amountMax.value = null
  activeDatePreset.value = 'all'
  page.value = 1
  loadData()
}

function loadData() {
  const params = {
    type: 'withdrawal',
    status: statusFilter.value,
    sandbox: sandboxFilter.value,
    search: search.value,
    page: page.value,
  }
  // Either a server-resolved preset OR manual datetime-local range —
  // never both. Empty preset / 'all' means no date filter.
  if (activeDatePreset.value && activeDatePreset.value !== 'all' && activeDatePreset.value !== 'custom') {
    params.date_preset = activeDatePreset.value
  } else {
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value)   params.date_to   = dateTo.value
  }
  if (merchantFilter.value) params.merchant_id = merchantFilter.value
  if (subGroupFilter.value) params.sub_group_id = subGroupFilter.value
  if (sadeceBenim.value && auth.user?.id) params.locker_id = auth.user.id
  if (customerFilter.value) params.customer = customerFilter.value
  if (lockerFilter.value) params.locker_id = lockerFilter.value
  if (amountMin.value != null) params.amount_min = amountMin.value
  if (amountMax.value != null) params.amount_max = amountMax.value
  txnStore.fetchList(params)
  // Pull the latest threshold alongside data — covers the case where SA
  // changes the dekont threshold while the operator's tab is open.
  loadDekontThreshold()
}

async function loadFilterOptions() {
  try {
    // Site listesi artik firma adini gorebilen herkese yukleniyor:
    // destek de bu suzgeci kullaniyor. Grup listesi yalnizca butun
    // gruplari gorene, cunku tek grupluya secenek sunmak anlamsiz.
    if (seesFinancials.value && !auth.isSuperAdmin) {
      const { data: m } = await api.get('/portal/merchants')
      merchants.value = m
    }
    if (seesAllGroups.value) {
      const { data: sg } = await api.get('/portal/sub-groups')
      subGroups.value = sg
    }
    if (auth.isSuperAdmin) {
      const [{ data: m }, ops] = await Promise.all([
        api.get('/portal/merchants'),
        // The withdrawal-operators endpoint returns operators that have
        // owned a withdrawal-capable account or handled a withdrawal — i.e.
        // the realistic candidate pool for the locker filter.
        api.get('/portal/transactions/withdrawal-operators').catch(() => ({ data: [] })),
      ])
      merchants.value = m
      operatorOptions.value = (ops.data || []).map(o => ({ id: o.id ?? o.user_id, name: o.name }))
    }
  } catch { /* silent */ }
}

// Pull the dekont threshold from platform settings so the badge / proof
// gate reflect the live super-admin-configured value. Silent on failure
// so a missing route or a 403 (operator without read access) doesn't
// break the whole page — the default 5000 fallback stays.
async function loadDekontThreshold() {
  try {
    const { data } = await api.get('/portal/settings')
    const v = Number(data?.['withdrawal.dekont_threshold'])
    if (Number.isFinite(v) && v > 0) ADMIN_REVIEW_THRESHOLD.value = v
  } catch { /* keep default */ }
}

onMounted(() => {
  loadData()
  loadFilterOptions()
  loadDekontThreshold()
  txnStore.resetNewCount('withdrawal')
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

/* Notification highlight — pulse the targeted row for 5s after click. */
:deep(tr.highlighted-row) {
  animation: row-highlight-pulse 1.2s ease-in-out infinite;
}
@keyframes row-highlight-pulse {
  0%, 100% { background-color: rgba(102,241,189, 0.10) !important; box-shadow: inset 4px 0 0 var(--sp-primary); }
  50% { background-color: rgba(102,241,189, 0.25) !important; box-shadow: inset 4px 0 0 var(--sp-primary); }
}

/* Status-row tints live in the unscoped block at the bottom of this file.
   See DepositListView for rationale. */

.amount-text { font-size: 14px; color: var(--sp-text); }
.amount-currency { font-size: 11px; font-weight: 600; opacity: 0.6; }
.amount-approved { font-size: 11px; font-weight: 600; color: var(--sp-accent-success-bright); margin-top: 1px; }

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
.counter-bar--overdue {
  background: rgba(127, 29, 29, 0.35);
  color: #fff;
}
@keyframes counter-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

:deep(.v-table tbody tr > td) {
  border-bottom: 1px solid rgba(128, 128, 128, 0.22) !important;
}
.v-theme--light :deep(.v-table tbody tr > td) {
  border-bottom-color: rgba(0, 0, 0, 0.14) !important;
}
.v-theme--dark :deep(.v-table tbody tr > td) {
  border-bottom-color: rgba(255, 255, 255, 0.10) !important;
}

.search-field { max-width: 320px; width: 100%; }

/* Status cell — chip + finalization badge stacked. */
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

/* Toplu atama seridi — tablonun hemen ustunde, hairline cerceveli. */
.bulk-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--sp-border);
  border-bottom: 1px solid var(--sp-border);
  background: var(--sp-surface-2, rgba(102, 241, 189, 0.06));
}
.bulk-count { font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
.bulk-skip-list { max-height: 180px; overflow-y: auto; }

/* Onaylayan satiri — durum rozetinin altinda, kucuk ve sessiz. */
.approver-line {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 700;
  color: var(--sp-text-muted);
  letter-spacing: 0.2px;
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

/* ── Modern filter shell ─────────────────────────────────────────── */
.filter-shell {
  padding: 12px 16px 6px;
  border-bottom: 1px solid var(--sp-divider, rgba(255,255,255,0.06));
  background: linear-gradient(180deg, rgba(102,241,189,0.03), transparent);
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.filter-row:last-child { margin-bottom: 0; }
.filter-mine-row { gap: 6px; margin-top: 4px; }
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

/* Status pill (clickable) */
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
.status-pill.is-active {
  color: #fff;
}
.status-pill.pill-grey.is-active    { background: rgba(113,132,122,0.35); border-color: rgba(160,160,160,0.6); color: #FFF; }
.status-pill.pill-amber.is-active   { background: rgba(255,190,91,0.22);  border-color: rgba(255,190,91,0.55);  color: var(--sp-accent-orange); }
.status-pill.pill-info.is-active    { background: rgba(112,169,255,0.20);  border-color: rgba(112,169,255,0.55);  color: var(--sp-accent-blue); }
.status-pill.pill-success.is-active { background: rgba(102,241,189,0.22); border-color: rgba(102,241,189,0.55); color: var(--sp-accent-success); }
.status-pill.pill-error.is-active   { background: rgba(255,142,130,0.22); border-color: rgba(255,142,130,0.55); color: var(--sp-accent-rose); }

/* Date preset pill */
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
  color: var(--sp-accent-purple);
}

.more-btn { margin-left: auto !important; }

/* Active filter chip */
.active-filter-chip { font-size: 11px !important; }
.active-filter-chip .chip-key { color: var(--sp-text-muted); font-weight: 500; }
.active-filter-chip .chip-val { font-weight: 700; }

/* Fluid table — fits the viewport without a horizontal scrollbar. Cells
   wrap when needed; verbose detail (fees, IDs, IBAN, approver) lives in
   the SA-only side pane that opens on row click. Only narrow phones
   fall back to horizontal scroll. */
:deep(.v-data-table table) { min-width: 0; }
:deep(.v-data-table th),
:deep(.v-data-table td) { white-space: normal; }
@media (max-width: 700px) {
  :deep(.v-data-table) { overflow-x: auto; }
  :deep(.v-data-table > .v-table__wrapper) { overflow-x: auto; }
  :deep(.v-data-table table) { min-width: 720px; }
}

/* ── Withdrawal approve modal (admin review-aware) ── */
.wd-approve-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(102,241,189, 0.25) !important;
  box-shadow: 0 12px 48px rgba(102,241,189, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.wd-approve-hero {
  background: linear-gradient(135deg, var(--sp-accent-success) 0%, var(--sp-accent-success) 50%, var(--sp-accent-success-bright) 100%);
  padding: 24px 22px 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.wd-approve-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.wd-approve-hero-icon {
  width: 70px; height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 10px;
  border: 3px solid rgba(255, 255, 255, 0.35);
}
.wd-approve-hero-title {
  font-size: 19px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
.wd-approve-hero-sub {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}

.wd-approve-amount {
  padding: 18px 22px 14px;
  text-align: center;
  background: linear-gradient(180deg, rgba(102,241,189, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.wd-approve-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 6px;
}
.wd-approve-amount-value {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.wd-approve-amount-cur {
  font-size: 16px;
  font-weight: 700;
  color: var(--sp-accent-success-bright);
  margin-left: 6px;
}

.wd-approve-meta {
  padding: 12px 20px 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.wd-approve-row {
  display: grid;
  grid-template-columns: 18px 110px 1fr;
  gap: 8px 10px;
  align-items: start;
  font-size: 13px;
}
.wd-approve-row--quiet { opacity: 0.7; }
.wd-approve-row-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  padding-top: 1px;
}
.wd-approve-row-value {
  font-weight: 600;
  color: var(--sp-text);
  line-height: 1.4;
  word-break: break-all;
}
.wd-approve-row-meta {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 1px;
}
.wd-approve-row-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 2px;
}
.wd-approve-dekont {
  margin: 8px 0 4px;
}

.wd-approve-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
}
.wd-approve-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.45) !important;
}
.wd-approve-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(102,241,189, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Proof (dekont) modal — purple/admin-review hero ── */
.proof-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(168,182,255, 0.30) !important;
  box-shadow: 0 12px 48px rgba(168,182,255, 0.20), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.proof-hero {
  background: linear-gradient(135deg, var(--sp-accent-purple) 0%, var(--sp-accent-purple) 50%, var(--sp-accent-purple) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.proof-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.proof-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: proof-icon-pop 0.4s ease-out;
}
@keyframes proof-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.proof-hero-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}
.proof-hero-sub {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}

.proof-amount-block {
  padding: 22px 24px 18px;
  text-align: center;
  background: linear-gradient(180deg, rgba(168,182,255, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.proof-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
}
.proof-amount-value {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.proof-amount-cur {
  font-size: 18px;
  font-weight: 700;
  color: var(--sp-accent-purple);
  margin-left: 6px;
  letter-spacing: 0;
}
.proof-amount-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--sp-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.proof-meta {
  padding: 12px 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.proof-meta-row {
  display: grid;
  grid-template-columns: 14px max-content 1fr;
  gap: 6px 10px;
  align-items: start;
  font-size: 12.5px;
  color: var(--sp-text);
}
.proof-meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  padding-top: 1px;
}
.proof-meta-value {
  font-weight: 600;
  color: var(--sp-text);
  line-height: 1.4;
  word-break: break-all;
}
.proof-meta-meta {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 1px;
}
.proof-meta-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 2px;
}

.proof-input-section {
  padding: 18px 20px 4px;
}
.proof-prompt {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  background: rgba(168,182,255, 0.08);
  border-left: 3px solid var(--sp-accent-purple);
  padding: 10px 12px;
  border-radius: 0;
  line-height: 1.4;
}
.proof-tabs :deep(.v-tab) {
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
  text-transform: none !important;
}

.proof-warning {
  margin: 8px 20px 14px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(168,182,255, 0.12);
  border-left: 3px solid var(--sp-accent-purple);
  display: flex;
  align-items: flex-start;
}
.proof-warning-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
  line-height: 1.3;
}
.proof-warning-text {
  font-size: 12px;
  color: var(--sp-text-muted);
  margin-top: 2px;
}

.proof-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
}
.proof-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(168,182,255, 0.45) !important;
}
.proof-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(168,182,255, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Release (Geri Bırak) modal — amber/warning hero ── */
.release-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255,174,91, 0.32) !important;
  box-shadow: 0 12px 48px rgba(255,174,91, 0.20), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.release-hero {
  background: linear-gradient(135deg, var(--sp-accent-orange) 0%, var(--sp-accent-orange) 50%, var(--sp-accent-orange) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.release-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.22), transparent 60%);
  pointer-events: none;
}
.release-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: release-icon-pop 0.4s ease-out;
}
@keyframes release-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.release-hero-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}
.release-hero-sub {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 4px;
}

.release-amount-block {
  padding: 22px 24px 18px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255,174,91, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.release-amount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 8px;
}
.release-amount-value {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -1.5px;
  color: var(--sp-text);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.release-amount-cur {
  font-size: 18px;
  font-weight: 700;
  color: var(--sp-accent-orange-bright);
  margin-left: 6px;
  letter-spacing: 0;
}

.release-warning-line {
  margin: 14px 20px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255,174,91, 0.10);
  border-left: 3px solid var(--sp-accent-orange);
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  line-height: 1.45;
}

.release-blocked {
  padding: 28px 24px;
  text-align: center;
}
.release-blocked-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sp-text);
  margin-bottom: 6px;
}
.release-blocked-text {
  font-size: 13px;
  color: var(--sp-text-muted);
  line-height: 1.5;
  max-width: 380px;
  margin: 0 auto;
}

.release-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
}
.release-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(255,174,91, 0.45) !important;
}
.release-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(255,174,91, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Dekont preview modal (admin) ── */
.dekont-preview-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(168,182,255, 0.22) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
}
.dekont-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 14px 20px;
  background: linear-gradient(135deg, rgba(168,182,255, 0.18) 0%, rgba(168,182,255, 0.10) 100%);
  border-bottom: 1px solid rgba(168,182,255, 0.20);
}
.dekont-preview-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: 0.3px;
}
.dekont-preview-sub {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-text-muted);
  font-family: 'JetBrains Mono', monospace;
  margin-top: 2px;
}
.dekont-preview-body {
  padding: 16px 20px;
  background: var(--sp-surface);
}

.dekont-url-bar {
  display: flex;
  align-items: center;
  background: rgba(168,182,255, 0.10);
  border: 1px solid rgba(168,182,255, 0.25);
  border-radius: 0;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
}
.dekont-url-link {
  color: var(--sp-accent-blue);
  text-decoration: none;
  flex: 1;
  font-weight: 500;
}
.dekont-url-link:hover {
  text-decoration: underline;
}

.dekont-frame-wrap {
  position: relative;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--sp-card-border);
  background: #FFFFFF;
}
.dekont-frame {
  width: 100%;
  height: 480px;
  border: 0;
  background: #FFFFFF;
  display: block;
}
.dekont-frame-note {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #FFF;
  font-size: 11px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  line-height: 1.3;
}

.dekont-image {
  display: block;
  max-width: 100%;
  max-height: 520px;
  margin: 0 auto;
  border-radius: 0;
  border: 1px solid var(--sp-card-border);
  background: #FFFFFF;
}

.dekont-loading,
.dekont-error,
.dekont-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--sp-text-muted);
  font-size: 13px;
}
.dekont-error { color: var(--sp-accent-rose); }

.dekont-preview-actions {
  padding: 12px 20px 16px !important;
  background: var(--sp-surface);
  border-top: 1px solid var(--sp-card-border);
  gap: 8px;
}

/* ── Action cell layout ──
   Two clusters: primary (decisive coloured buttons) and secondary
   (text/icon helpers). They sit on the same line but never break each
   other's grouping when wrapping. */
.action-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  row-gap: 6px;
}
.action-primary,
.action-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  row-gap: 6px;
}
.action-primary :deep(.v-btn),
.action-secondary :deep(.v-btn) {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 700 !important;
  min-width: 0;
  height: 32px !important;
}
.action-primary :deep(.v-btn--variant-flat) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
/* "Yönetici onayı bekleniyor" pill — uses cyan/info palette so it
   stands OUT against the purple `status-row--admin_review` row tint
   (the row background is already purple; matching colours would make
   the pill disappear). */
.action-pending-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(112,169,255, 0.16);
  color: var(--sp-accent-blue);
  border: 1px solid rgba(112,169,255, 0.4);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.action-pending-pill::before {
  content: '⏳';
  margin-right: 6px;
  font-size: 13px;
}

/* Admin-review action layout: Onayla + Reddet on the top row,
   Dekontu İncele on its own line beneath them. */
.admin-review-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}
.admin-review-decision {
  display: flex;
  gap: 6px;
}
.admin-review-decision :deep(.v-btn) {
  min-width: 0;
}
</style>

<!-- Unscoped — see DepositListView for rationale. Withdrawal has fewer
     statuses (no assigned/payment_seen) but shares the same palette. -->
<style>
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending > td       { background: rgba(255,190,91, 0.08) !important; }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending:hover,
.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending:hover > td { background: rgba(255,190,91, 0.22) !important; }

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

.v-table > .v-table__wrapper > table > tbody > tr.status-row--pending      > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-orange); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--processing   > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-orange); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--admin_review > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-purple); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--approved     > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-success); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--rejected     > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-error); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--expired      > td:first-child { box-shadow: inset 3px 0 0 var(--sp-text-muted); }
.v-table > .v-table__wrapper > table > tbody > tr.status-row--cancelled    > td:first-child { box-shadow: inset 3px 0 0 var(--sp-text-muted); }
</style>
