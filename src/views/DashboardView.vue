<template>
  <div class="dashboard">
    <!-- ═══════════════════════════════════════════ -->
    <!-- TOP HERO STATS ROW -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="hero-stats mb-5">
      <div class="hero-card hero-deposit">
        <div class="hero-icon-wrap">
          <v-icon size="28" color="white">mdi-plus-thick</v-icon>
        </div>
        <div class="hero-content">
          <div class="hero-label">Bugünkü Yatırımlar</div>
          <div class="hero-amount">{{ formatCurrency(stats.deposits?.today_volume || 0) }}</div>
          <div class="hero-sub">
            <span class="hero-count">{{ stats.deposits?.today_count || 0 }}</span> işlem tamamlandı
          </div>
        </div>
        <div v-if="stats.deposits?.pending_count" class="hero-badge pulse-badge">
          {{ stats.deposits.pending_count }} bekleyen
        </div>
      </div>

      <div class="hero-card hero-withdrawal">
        <div class="hero-icon-wrap">
          <v-icon size="28" color="white">mdi-minus-thick</v-icon>
        </div>
        <div class="hero-content">
          <div class="hero-label">Bugünkü Çekimler</div>
          <div class="hero-amount">{{ formatCurrency(stats.withdrawals?.today_volume || 0) }}</div>
          <div class="hero-sub">
            <span class="hero-count">{{ stats.withdrawals?.today_count || 0 }}</span> işlem tamamlandı
          </div>
        </div>
        <div v-if="stats.withdrawals?.pending_count" class="hero-badge pulse-badge">
          {{ stats.withdrawals.pending_count }} bekleyen
        </div>
      </div>

      <div class="hero-card hero-pending" v-if="(stats.deposits?.pending_count || 0) + (stats.withdrawals?.pending_count || 0) > 0">
        <div class="hero-icon-wrap">
          <v-icon size="28" color="white">mdi-clock-fast</v-icon>
        </div>
        <div class="hero-content">
          <div class="hero-label">Toplam Bekleyen</div>
          <div class="hero-amount">{{ (stats.deposits?.pending_count || 0) + (stats.withdrawals?.pending_count || 0) }}</div>
          <div class="hero-sub">işlem aksiyon bekliyor</div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- SA: BUSINESS OVERVIEW -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="auth.isSuperAdmin && stats.business" class="mb-5">
      <div class="section-header mb-3">
        <div class="section-icon" style="background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-purple))">
          <v-icon size="18" color="white">mdi-office-building</v-icon>
        </div>
        <div>
          <div class="section-title">Şirket Genel Bakış</div>
          <div class="section-subtitle">Komisyon, mutabakat ve operatör bakiyeleri</div>
        </div>
      </div>

      <div class="glass-grid grid-4">
        <div class="glass-card">
          <div class="glass-card-accent" style="background: linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-error))"></div>
          <div class="glass-label">Toplam Komisyon</div>
          <div class="glass-value" style="color: var(--sp-accent-peach)">{{ formatCurrency(stats.business.total_fees) }}</div>
          <div class="glass-hint">Toplam kazanılan komisyon</div>
        </div>
        <div class="glass-card">
          <div class="glass-card-accent" style="background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-cyan))"></div>
          <div class="glass-label">Mutabakat Edilen</div>
          <div class="glass-value text-success">{{ formatCurrency(stats.business.settled_balance) }}</div>
          <div class="glass-hint">Şirkete transfer edilen</div>
        </div>
        <div class="glass-card">
          <div class="glass-card-accent" style="background: linear-gradient(135deg, var(--sp-accent-amber), var(--sp-accent-peach))"></div>
          <div class="glass-label">Bekleyen Mutabakat</div>
          <div class="glass-value" style="color: var(--sp-accent-amber)">{{ formatCurrency(stats.business.active_settlements) }}</div>
          <div class="glass-hint">İşlemde olan talepler</div>
        </div>
        <div class="glass-card">
          <div class="glass-card-accent" style="background: linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-purple))"></div>
          <div class="glass-label">Mutabakat Edilmemiş</div>
          <div class="glass-value" style="color: var(--sp-accent-indigo)">{{ formatCurrency(stats.business.unsettled_fees) }}</div>
          <div class="glass-hint">Operatörlerde bekleyen komisyon</div>
        </div>
      </div>

      <!-- Operator Flow Summary -->
      <div class="flow-card mt-4">
        <div class="flow-header">
          <v-icon size="16" color="var(--sp-accent-indigo)" class="mr-2">mdi-account-group</v-icon>
          <span class="flow-title">Operatör Para Akışı</span>
        </div>
        <div class="flow-body">
          <div class="flow-item">
            <div class="flow-dot" style="background: var(--sp-accent-success)"></div>
            <div class="flow-item-label">Giren (Yatırım)</div>
            <div class="flow-item-value text-success">{{ formatCurrency(stats.business.operator_deposits) }}</div>
          </div>
          <div class="flow-arrow">
            <v-icon size="16" :style="{ color: 'var(--sp-text-ghost)' }">mdi-minus</v-icon>
          </div>
          <div class="flow-item">
            <div class="flow-dot" style="background: var(--sp-accent-rose)"></div>
            <div class="flow-item-label">Çıkan (Çekim)</div>
            <div class="flow-item-value text-error">{{ formatCurrency(stats.business.operator_withdrawals) }}</div>
          </div>
          <div class="flow-arrow">
            <v-icon size="16" :style="{ color: 'var(--sp-text-ghost)' }">mdi-minus</v-icon>
          </div>
          <div class="flow-item">
            <div class="flow-dot" style="background: var(--sp-accent-purple)"></div>
            <div class="flow-item-label">Mutabakat</div>
            <div class="flow-item-value" style="color: var(--sp-accent-purple)">{{ formatCurrency(stats.business.total_settled) }}</div>
          </div>
          <div class="flow-arrow">
            <v-icon size="16" :style="{ color: 'var(--sp-text-ghost)' }">mdi-equal</v-icon>
          </div>
          <div class="flow-item flow-item-result">
            <div class="flow-dot" style="background: var(--sp-accent-indigo)"></div>
            <div class="flow-item-label">Kalan Bakiye</div>
            <div class="flow-item-value font-weight-bold" :class="stats.business.operator_total_balance >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(stats.business.operator_total_balance) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- SA: MERCHANT CARDS -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="auth.isSuperAdmin && merchants.length" class="mb-5">
      <div class="section-header mb-3">
        <div class="section-icon" style="background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-cyan))">
          <v-icon size="18" color="white">mdi-store</v-icon>
        </div>
        <div>
          <div class="section-title">Bayi Bakiyeleri</div>
          <div class="section-subtitle">{{ merchants.length }} aktif bayi</div>
        </div>
      </div>

      <div class="merchant-grid">
        <div v-for="m in merchants" :key="m.id" class="merchant-card">
          <!-- Merchant header -->
          <div class="merchant-card-header">
            <div class="merchant-avatar">{{ m.name.charAt(0).toUpperCase() }}</div>
            <div class="merchant-info">
              <div class="merchant-name">{{ m.name }}</div>
              <div class="merchant-fees">
                <v-icon size="10" class="mr-1">mdi-percent</v-icon>
                Yatırım {{ m.deposit_fee_percent }}% · Çekim {{ m.withdrawal_fee_percent }}% · Mutabakat {{ m.settlement_fee_percent || 0 }}%
              </div>
            </div>
          </div>

          <!-- Main balance -->
          <div class="merchant-balance-main">
            <div class="merchant-balance-label">Kullanılabilir Bakiye</div>
            <div class="merchant-balance-amount" :class="m.available_balance >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(m.available_balance) }}
            </div>
          </div>

          <!-- Stats grid -->
          <div class="merchant-stats">
            <div class="merchant-stat">
              <div class="merchant-stat-label">Yatırım</div>
              <div class="merchant-stat-value text-success">{{ formatCompact(m.total_deposits) }}</div>
            </div>
            <div class="merchant-stat">
              <div class="merchant-stat-label">Çekim</div>
              <div class="merchant-stat-value" style="color: var(--sp-accent-cyan)">{{ formatCompact(m.total_withdrawals) }}</div>
            </div>
            <div class="merchant-stat">
              <div class="merchant-stat-label">Mutabakat</div>
              <div class="merchant-stat-value" style="color: var(--sp-accent-purple)">{{ formatCompact(m.settled_amount) }}</div>
            </div>
          </div>
          <!-- Fee breakdown -->
          <div class="merchant-stats mt-2">
            <div class="merchant-stat">
              <div class="merchant-stat-label">Y. Komisyon</div>
              <div class="merchant-stat-value" style="color: var(--sp-accent-peach)">{{ formatCompact(m.deposit_fees) }}</div>
            </div>
            <div class="merchant-stat">
              <div class="merchant-stat-label">Ç. Komisyon</div>
              <div class="merchant-stat-value" style="color: var(--sp-accent-peach)">{{ formatCompact(m.withdrawal_fees) }}</div>
            </div>
            <div class="merchant-stat">
              <div class="merchant-stat-label">M. Komisyon</div>
              <div class="merchant-stat-value" style="color: var(--sp-accent-peach)">{{ formatCompact(m.settlement_fees || 0) }}</div>
            </div>
          </div>

          <!-- Bottom badges -->
          <div class="merchant-badges">
            <span v-if="m.active_settlements > 0" class="mbadge mbadge-orange">
              <v-icon size="10" class="mr-1">mdi-clock</v-icon>
              Bekleyen: {{ formatCompact(m.active_settlements) }}
            </span>
            <span v-if="m.pending_withdrawals > 0" class="mbadge mbadge-red">
              <v-icon size="10" class="mr-1">mdi-cash-clock</v-icon>
              Çekim: {{ formatCompact(m.pending_withdrawals) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- ADMIN / MANAGER: OPERATOR BALANCES -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="operators.length" class="mb-5">
      <div class="section-header mb-3">
        <div class="section-icon" style="background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-cyan))">
          <v-icon size="18" color="white">mdi-account-group</v-icon>
        </div>
        <div>
          <div class="section-title">Operatör Kredileri</div>
          <div class="section-subtitle">{{ operators.length }} operatör — kredi bakiyesi ve günlük aktivite</div>
        </div>
      </div>

      <v-card class="glass-table-card">
        <v-table density="compact" class="glass-table">
          <thead>
            <tr>
              <th>Operatör</th>
              <th class="text-right">Kredi</th>
              <th class="text-right">Bugün Yatırım</th>
              <th class="text-right">Bugün Çekim</th>
              <th class="text-right">Bekleyen Teslim</th>
              <th class="text-right">Bugün Teslim</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="op in operators" :key="op.id">
              <td>
                <div style="line-height: 1.3">
                  <div class="font-weight-bold" style="font-size: 13px">{{ op.name }}</div>
                  <div v-if="op.sub_group" class="text-caption" style="color: var(--sp-text-dim); font-size: 10px">
                    {{ op.sub_group.name }}
                  </div>
                </div>
              </td>
              <td class="text-right">
                <v-tooltip :text="creditStateLabel(op.credit_try)" location="top">
                  <template v-slot:activator="{ props }">
                    <span v-bind="props" class="font-weight-bold" :style="{ color: op.credit_try > 0 ? 'var(--sp-accent-success-bright)' : 'var(--sp-accent-amber)' }">
                      {{ formatCurrency(op.credit_try || 0) }}
                    </span>
                  </template>
                </v-tooltip>
              </td>
              <td class="text-right">
                <span v-if="op.today_deposits_try > 0" class="text-success">{{ formatCompact(op.today_deposits_try) }}</span>
                <span v-else style="color: var(--sp-text-dim)">--</span>
              </td>
              <td class="text-right">
                <span v-if="op.today_withdrawals_try > 0" style="color: var(--sp-accent-cyan)">{{ formatCompact(op.today_withdrawals_try) }}</span>
                <span v-else style="color: var(--sp-text-dim)">--</span>
              </td>
              <td class="text-right">
                <span v-if="op.pending_teslim_count > 0" style="color: var(--sp-accent-amber)">
                  {{ formatCompact(op.pending_teslim_try) }}
                  <span class="text-caption">({{ op.pending_teslim_count }})</span>
                </span>
                <span v-else style="color: var(--sp-text-dim)">--</span>
              </td>
              <td class="text-right">
                <span v-if="op.today_teslim_try > 0" style="color: var(--sp-accent-blue)">{{ formatCompact(op.today_teslim_try) }}</span>
                <span v-else style="color: var(--sp-text-dim)">--</span>
              </td>
              <td class="text-right">
                <v-btn
                  :to="{ name: 'Teslimler', query: { operator_id: op.id } }"
                  icon="mdi-hand-coin-outline"
                  size="x-small"
                  variant="text"
                  title="Teslimleri Gör"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- SA: RECENT TRANSACTIONS -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="auth.isSuperAdmin" class="mb-5">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="section-header">
          <div class="section-icon" style="background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-cyan))">
            <v-icon size="18" color="white">mdi-swap-horizontal</v-icon>
          </div>
          <div>
            <div class="section-title">Son İşlemler</div>
            <div class="section-subtitle">Son 10 işlem</div>
          </div>
        </div>
        <v-btn variant="tonal" color="primary" size="small" to="/transactions" rounded="lg">
          <v-icon start size="14">mdi-format-list-bulleted</v-icon> Tüm İşlemler
        </v-btn>
      </div>

      <div v-if="!(stats.recent_transactions || []).length" class="txn-empty">
        <v-icon size="48" :style="{ color: 'var(--sp-text-ghost)' }">mdi-swap-horizontal-bold</v-icon>
        <div class="mt-2" style="color: var(--sp-text-dim); font-size: 13px">Henüz işlem bulunmuyor</div>
      </div>

      <div class="txn-layout" v-else>
        <div class="txn-list-wrap" :class="{ 'txn-list-squeezed': panelOpen }">
          <div class="txn-list">
            <div
              v-for="t in (stats.recent_transactions || [])"
              :key="t.id"
              class="txn-row"
              :class="{ 'txn-row-pending': ['pending','assigned','processing'].includes(t.status), 'txn-row-active': selectedTxnId === t.id }"
              @click="openPanel(t.id)"
            >
              <div class="txn-type-indicator" :class="t.type === 'deposit' ? 'txn-type-deposit' : 'txn-type-withdrawal'">
                <v-icon size="18" color="white">{{ t.type === 'deposit' ? 'mdi-plus-thick' : 'mdi-minus-thick' }}</v-icon>
              </div>
              <div class="txn-main">
                <div class="txn-main-top">
                  <span class="txn-merchant" v-if="t.merchant">{{ t.merchant.name }}</span>
                  <span class="txn-type-label" :class="t.type === 'deposit' ? 'text-success' : 'txn-type-blue'">
                    {{ t.type === 'deposit' ? 'Yatırım' : 'Çekim' }}
                  </span>
                  <span class="txn-id-label">#{{ t.id }}</span>
                </div>
                <div class="txn-main-bottom">
                  <span v-if="t.customer" class="txn-customer">
                    <v-icon size="10" class="mr-1">mdi-account</v-icon>{{ t.customer.external_id }}
                  </span>
                  <span v-if="t.player_account_holder" class="txn-customer-name">{{ t.player_account_holder }}</span>
                </div>
              </div>
              <div class="txn-amount-block">
                <div class="txn-amount" :class="t.type === 'deposit' ? 'text-success' : 'txn-type-blue'">
                  {{ t.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(t.requested_amount) }}
                </div>
                <div v-if="t.amount && t.status === 'approved' && t.amount !== t.requested_amount" class="txn-amount-approved">
                  <v-icon size="8" color="success">mdi-check</v-icon> {{ formatCurrency(t.amount) }}
                </div>
              </div>
              <div class="txn-status-block">
                <div class="txn-status-chip" :class="'txn-status-' + t.status">
                  <div class="txn-status-dot"></div>
                  {{ statusText(t.status) }}
                </div>
              </div>
              <div v-if="!panelOpen" class="txn-actors-block">
                <div v-if="t.locker" class="txn-actor">
                  <v-icon size="10" :style="{ color: 'var(--sp-text-dim)' }" class="mr-1">mdi-account-arrow-right</v-icon>
                  <span>{{ t.locker.name }}</span>
                </div>
                <div v-if="t.approver" class="txn-actor txn-actor-approved">
                  <v-icon size="10" color="var(--sp-accent-success)" class="mr-1">mdi-account-check</v-icon>
                  <span>{{ t.approver.name }}</span>
                </div>
              </div>
              <div class="txn-time-block">
                <div class="txn-time">{{ timeAgo(t.created_at) }}</div>
              </div>
              <div class="txn-arrow">
                <v-icon size="14" :style="{ color: 'var(--sp-text-ghost)' }">mdi-chevron-right</v-icon>
              </div>
            </div>
          </div>
        </div>
        <div v-if="panelOpen" class="txn-panel-wrap">
          <TransactionPanel ref="panelRef" @updated="onPanelUpdated" @close="panelOpen = false; selectedTxnId = null" />
        </div>
      </div>
    </div>

    <!-- Operator/Manager summary — accurate live numbers for the chosen
         period. Complements the Anasayfa widgets (which are period-filtered
         too): this dashboard view focuses on totals + performance per
         period so the operator can see how they're doing at a glance. -->
    <div v-if="!auth.isSuperAdmin" class="mb-5">
      <!-- Header + period filter -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
        <div>
          <div class="text-h6 font-weight-bold" style="color: var(--sp-text)">Merhaba, {{ auth.user?.name }}</div>
          <div class="text-caption" style="color: var(--sp-text-muted)">{{ myStatsDateLabel }}</div>
        </div>
        <v-btn-toggle v-model="datePreset" mandatory density="compact" class="period-toggle">
          <v-btn value="today" size="small">Bugün</v-btn>
          <v-btn value="yesterday" size="small">Dün</v-btn>
          <v-btn value="week" size="small">Bu Hafta</v-btn>
          <v-btn value="month" size="small">Bu Ay</v-btn>
          <v-btn value="all" size="small">Tümü</v-btn>
          <v-btn value="custom" size="small">Özel</v-btn>
        </v-btn-toggle>
      </div>

      <!-- Custom date pickers -->
      <v-row v-if="datePreset === 'custom'" dense class="mb-3">
        <v-col cols="12" sm="5"><v-text-field v-model="customDateFrom" label="Başlangıç" type="date" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="12" sm="5"><v-text-field v-model="customDateTo" label="Bitiş" type="date" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="12" sm="2" class="d-flex align-center">
          <v-btn color="primary" variant="tonal" block @click="loadMyStats" :loading="myStatsLoading"><v-icon start size="16">mdi-magnify</v-icon> Ara</v-btn>
        </v-col>
      </v-row>

      <!-- Live current credit (always real-time, NOT period-filtered) -->
      <v-card class="op-credit-card mb-4" :class="creditCardClass">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div>
            <div class="op-credit-label">{{ creditLabel }}</div>
            <div class="op-credit-amount">
              {{ formatCurrency(operatorCredit?.credit_try || 0) }}
              <span class="op-credit-cur">TRY</span>
            </div>
            <div class="op-credit-hint">{{ creditHint }}</div>
          </div>
          <v-icon size="80" :color="creditIconColor" style="opacity: 0.22">mdi-wallet-outline</v-icon>
        </div>
      </v-card>

      <!-- Period stat cards: Yatırım / Çekim / Teslim / Toplam Komisyon -->
      <div class="op-stats-grid mb-4">
        <v-card class="op-stat-card" style="border-left: 3px solid var(--sp-accent-success-bright)">
          <div class="op-stat-icon" style="background: var(--sp-accent-success-bright)"><v-icon size="20" color="white">mdi-arrow-down-bold</v-icon></div>
          <div class="op-stat-body">
            <div class="op-stat-label">Yatırım</div>
            <div class="op-stat-value">{{ formatCurrency(myBalance.total_deposits || 0) }} <span class="op-stat-cur">TRY</span></div>
            <div class="op-stat-sub">
              {{ myBalance.deposit_count || 0 }} işlem
              <span v-if="myBalance.deposit_commission > 0" class="op-stat-sub-sep">·</span>
              <span v-if="myBalance.deposit_commission > 0">Komisyon: <strong>{{ formatCurrency(myBalance.deposit_commission) }}</strong></span>
            </div>
          </div>
        </v-card>

        <v-card class="op-stat-card" style="border-left: 3px solid var(--sp-accent-info)">
          <div class="op-stat-icon" style="background: var(--sp-accent-info)"><v-icon size="20" color="white">mdi-arrow-up-bold</v-icon></div>
          <div class="op-stat-body">
            <div class="op-stat-label">Çekim</div>
            <div class="op-stat-value">{{ formatCurrency(myBalance.total_withdrawals || 0) }} <span class="op-stat-cur">TRY</span></div>
            <div class="op-stat-sub">
              {{ myBalance.withdrawal_count || 0 }} işlem
              <span v-if="myBalance.withdrawal_commission > 0" class="op-stat-sub-sep">·</span>
              <span v-if="myBalance.withdrawal_commission > 0">Komisyon: <strong>{{ formatCurrency(myBalance.withdrawal_commission) }}</strong></span>
            </div>
          </div>
        </v-card>

        <v-card class="op-stat-card" style="border-left: 3px solid var(--sp-accent-orange)">
          <div class="op-stat-icon" style="background: var(--sp-accent-orange)"><v-icon size="20" color="white">mdi-bitcoin</v-icon></div>
          <div class="op-stat-body">
            <div class="op-stat-label">Teslim</div>
            <div class="op-stat-value">{{ formatCurrency(teslim?.approved_try || 0) }} <span class="op-stat-cur">TRY</span></div>
            <div class="op-stat-sub">
              {{ teslim?.approved_count || 0 }} teslim
              <span v-if="(teslim?.approved_commission || 0) > 0" class="op-stat-sub-sep">·</span>
              <span v-if="(teslim?.approved_commission || 0) > 0">Komisyon: <strong>{{ formatCurrency(teslim.approved_commission) }}</strong></span>
            </div>
          </div>
        </v-card>

        <v-card class="op-stat-card op-stat-total" style="border-left: 3px solid var(--sp-accent-violet)">
          <div class="op-stat-icon" style="background: var(--sp-accent-violet)"><v-icon size="20" color="white">mdi-cash-multiple</v-icon></div>
          <div class="op-stat-body">
            <div class="op-stat-label">Toplam Komisyon</div>
            <div class="op-stat-value">{{ formatCurrency(totalCommission) }} <span class="op-stat-cur">TRY</span></div>
            <div class="op-stat-sub">
              Y {{ formatCompact(myBalance.deposit_commission || 0) }} ·
              Ç {{ formatCompact(myBalance.withdrawal_commission || 0) }} ·
              T {{ formatCompact(teslim?.approved_commission || 0) }}
            </div>
          </div>
        </v-card>
      </div>

      <!-- Performance row -->
      <v-card class="pa-3 mb-4" v-if="perf.total_processed > 0">
        <div class="d-flex align-center mb-2">
          <v-icon start size="18" color="primary">mdi-chart-timeline-variant</v-icon>
          <div class="text-overline" style="color: var(--sp-text-muted); letter-spacing: 0.5px">PERFORMANS</div>
        </div>
        <v-row dense>
          <v-col cols="6" sm="3"><div class="perf-stat"><div class="perf-stat-value" style="color: var(--sp-accent-success-bright)">{{ perf.approved_count }}</div><div class="perf-stat-label">Onaylanan</div></div></v-col>
          <v-col cols="6" sm="3"><div class="perf-stat"><div class="perf-stat-value" style="color: var(--sp-accent-rose)">{{ perf.rejected_count }}</div><div class="perf-stat-label">Reddedilen</div></div></v-col>
          <v-col cols="6" sm="3"><div class="perf-stat"><div class="perf-stat-value" style="color: var(--sp-accent-amber)">{{ perf.abandoned_count }}</div><div class="perf-stat-label">Süresi Doldu</div></div></v-col>
          <v-col cols="6" sm="3"><div class="perf-stat"><div class="perf-stat-value">{{ formatDuration(perf.avg_seconds) }}</div><div class="perf-stat-label">Ort. İşlem Süresi</div></div></v-col>
        </v-row>
      </v-card>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- OPERATOR: TRANSACTION HISTORY -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="!auth.isSuperAdmin" class="mb-5">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="section-header">
          <div class="section-icon" style="background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-cyan))">
            <v-icon size="18" color="white">mdi-history</v-icon>
          </div>
          <div>
            <div class="section-title">İşlem Geçmişi</div>
            <div class="section-subtitle">Geçmiş işlemlerinizi arayın</div>
          </div>
        </div>
        <v-chip v-if="txnPagination.total" size="small" variant="tonal" color="primary" class="font-weight-bold">
          {{ txnPagination.total }} işlem
        </v-chip>
      </div>

      <!-- Filters bar -->
      <div class="txn-filter-bar mb-3">
        <v-text-field
          v-model="txnSearch"
          placeholder="İşlem No veya Oyuncu Ara..."
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          density="compact"
          hide-details
          clearable
          flat
          class="txn-search-field"
          @keyup.enter="loadMyTransactions"
          @click:clear="txnSearch = ''; loadMyTransactions()"
        />
        <v-select v-model="txnTypeFilter" :items="typeOptions" item-title="text" item-value="value" variant="solo-filled" density="compact" hide-details label="Tur" flat class="txn-filter-select" />
        <v-select v-model="txnStatusFilter" :items="statusOptions" item-title="text" item-value="value" variant="solo-filled" density="compact" hide-details label="Durum" flat class="txn-filter-select" />
        <v-text-field v-model="txnDateFrom" label="Başlangıç" type="date" variant="solo-filled" density="compact" hide-details flat class="txn-filter-select" />
        <v-text-field v-model="txnDateTo" label="Bitiş" type="date" variant="solo-filled" density="compact" hide-details flat class="txn-filter-select" />
        <v-btn color="primary" variant="tonal" density="compact" @click="loadMyTransactions" rounded="lg" style="min-width: 40px">
          <v-icon size="16">mdi-magnify</v-icon>
        </v-btn>
      </div>

      <!-- Loading state -->
      <div v-if="txnLoading" class="txn-empty">
        <v-progress-circular size="32" width="2" indeterminate color="primary" />
        <div class="mt-2" style="color: var(--sp-text-dim); font-size: 13px">Yükleniyor...</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!myTransactions.length" class="txn-empty">
        <v-icon size="48" :style="{ color: 'var(--sp-text-ghost)' }">mdi-text-box-search-outline</v-icon>
        <div class="mt-2" style="color: var(--sp-text-dim); font-size: 13px">İşlem bulunamadı</div>
      </div>

      <!-- Transaction rows + panel -->
      <div v-else class="txn-layout">
        <div class="txn-list-wrap" :class="{ 'txn-list-squeezed': panelOpen }">
          <div class="txn-list">
            <div
              v-for="t in myTransactions"
              :key="t.id"
              class="txn-row"
              :class="{ 'txn-row-pending': ['pending','assigned','processing'].includes(t.status), 'txn-row-active': selectedTxnId === t.id }"
              @click="openPanel(t.id)"
            >
              <div class="txn-type-indicator" :class="t.type === 'deposit' ? 'txn-type-deposit' : 'txn-type-withdrawal'">
                <v-icon size="18" color="white">{{ t.type === 'deposit' ? 'mdi-plus-thick' : 'mdi-minus-thick' }}</v-icon>
              </div>
              <div class="txn-main">
                <div class="txn-main-top">
                  <span class="txn-type-label" :class="t.type === 'deposit' ? 'text-success' : 'txn-type-blue'">
                    {{ t.type === 'deposit' ? 'Yatırım' : 'Çekim' }}
                  </span>
                  <span class="txn-id-label">#{{ t.id }}</span>
                </div>
                <div class="txn-main-bottom">
                  <span v-if="t.customer" class="txn-customer">
                    <v-icon size="10" class="mr-1">mdi-account</v-icon>{{ t.customer.external_id }}
                  </span>
                  <span v-if="t.player_account_holder" class="txn-customer-name">{{ t.player_account_holder }}</span>
                  <span v-if="!panelOpen && t.bank_account" class="txn-bank-name">
                    <v-icon size="9" class="mr-1">mdi-bank</v-icon>{{ t.bank_account.bank_name }}
                  </span>
                </div>
              </div>
              <div class="txn-amount-block">
                <div class="txn-amount" :class="t.type === 'deposit' ? 'text-success' : 'txn-type-blue'">
                  {{ t.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(t.requested_amount) }}
                </div>
                <div v-if="t.amount && t.status === 'approved' && t.amount !== t.requested_amount" class="txn-amount-approved">
                  <v-icon size="8" color="success">mdi-check</v-icon> {{ formatCurrency(t.amount) }}
                </div>
              </div>
              <div class="txn-status-block">
                <div class="txn-status-chip" :class="'txn-status-' + t.status">
                  <div class="txn-status-dot"></div>
                  {{ statusText(t.status) }}
                </div>
                <div v-if="!panelOpen" class="txn-indicators">
                  <v-tooltip v-if="t.customer_notified_at" text="Oyuncu ödeme bildirdi" location="top">
                    <template v-slot:activator="{ props }"><v-icon v-bind="props" size="12" color="warning">mdi-cash-check</v-icon></template>
                  </v-tooltip>
                  <v-tooltip v-if="t.rejection_reason" :text="t.rejection_reason" location="top">
                    <template v-slot:activator="{ props }"><v-icon v-bind="props" size="12" color="error">mdi-alert-circle</v-icon></template>
                  </v-tooltip>
                </div>
              </div>
              <div v-if="!panelOpen" class="txn-actors-block">
                <div v-if="t.locker" class="txn-actor">
                  <v-icon size="10" :style="{ color: 'var(--sp-text-dim)' }" class="mr-1">mdi-account-arrow-right</v-icon>
                  <span>{{ t.locker.name }}</span>
                </div>
                <div v-if="t.approver" class="txn-actor txn-actor-approved">
                  <v-icon size="10" color="var(--sp-accent-success)" class="mr-1">mdi-account-check</v-icon>
                  <span>{{ t.approver.name }}</span>
                </div>
              </div>
              <div class="txn-time-block">
                <div class="txn-time">{{ timeAgo(t.created_at) }}</div>
              </div>
              <div class="txn-arrow">
                <v-icon size="14" :style="{ color: 'var(--sp-text-ghost)' }">mdi-chevron-right</v-icon>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="txnPagination.total > txnPerPage" class="txn-pagination">
            <v-pagination
              v-model="txnPage"
              :length="Math.ceil(txnPagination.total / txnPerPage)"
              :total-visible="5"
              density="compact"
              rounded="lg"
              @update:model-value="onTxnPageChange"
            />
          </div>
        </div>
        <div v-if="panelOpen" class="txn-panel-wrap">
          <TransactionPanel ref="panelRef" @updated="onPanelUpdated" @close="panelOpen = false; selectedTxnId = null" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'
import TransactionPanel from '@/components/TransactionPanel.vue'

const auth = useAuthStore()
const stats = ref({})

// Side panel state
const panelOpen = ref(false)
const panelRef = ref(null)
const selectedTxnId = ref(null)

function openPanel(id) {
  selectedTxnId.value = id
  panelOpen.value = true
  setTimeout(() => panelRef.value?.open(id), 0)
}

async function onPanelUpdated() {
  // Reload dashboard data after transaction action
  const { data } = await api.get('/portal/dashboard')
  stats.value = data
  if (!auth.isSuperAdmin) {
    loadMyStats()
    loadMyTransactions()
  }
}
const merchants = computed(() => stats.value.merchants || [])
const operators = computed(() => stats.value.operators || [])
const settlement = ref(null)
const teslim = ref(null)
const operatorCredit = ref(null)

const myBalance = ref({
  total_deposits: 0, total_withdrawals: 0,
  deposit_commission: 0, withdrawal_commission: 0, total_commission: 0,
  today_deposits: 0, today_withdrawals: 0, today_commission: 0,
  deposit_count: 0, withdrawal_count: 0, total_count: 0,
})
const myStatsLoading = ref(false)

const perf = ref({
  total_processed: 0, approved_count: 0, rejected_count: 0, abandoned_count: 0,
  avg_seconds: 0, min_seconds: 0, max_seconds: 0,
  deposit_avg_seconds: 0, deposit_count: 0,
  withdrawal_avg_seconds: 0, withdrawal_count: 0,
  today_processed: 0, today_avg_seconds: 0,
})

const datePreset = ref('today')
const customDateFrom = ref('')
const customDateTo = ref('')

const myStatsDateLabel = computed(() => {
  switch (datePreset.value) {
    case 'today': return 'Bugünkü işlemlerinizin özeti'
    case 'yesterday': return 'Dünkü işlemlerinizin özeti'
    case 'week': return 'Bu haftaki işlemlerinizin özeti'
    case 'month': return 'Bu aydaki işlemlerinizin özeti'
    case 'custom': return customDateFrom.value && customDateTo.value
      ? `${customDateFrom.value} - ${customDateTo.value} arası özet`
      : 'Tarih aralığını seçin'
    default: return 'Onaylanmış işlemlerinizin toplam özeti'
  }
})

// Headline label tells the operator what period the big number refers to.
const earningsLabel = computed(() => {
  switch (datePreset.value) {
    case 'today': return 'Bugün kazandığın komisyon'
    case 'yesterday': return 'Dün kazandığın komisyon'
    case 'week': return 'Bu hafta kazandığın komisyon'
    case 'month': return 'Bu ay kazandığın komisyon'
    case 'custom': return 'Seçili dönemde kazandığın komisyon'
    default: return 'Toplam kazandığın komisyon'
  }
})

const hasPendingTeslim = computed(() => teslim.value && (teslim.value.pending_count || 0) > 0)

// Single positive credit balance — amount platform owes operator. > 0
// means capacity to accept deposits; = 0 means limit reached.
const creditCardClass = computed(() => {
  const v = Number(operatorCredit.value?.credit_try || 0)
  return v > 0 ? 'op-credit-card--good' : 'op-credit-card--warn'
})

const creditIconColor = computed(() => {
  return Number(operatorCredit.value?.credit_try || 0) > 0
    ? 'var(--sp-accent-success-bright)'
    : 'var(--sp-accent-amber)'
})

const creditLabel = computed(() => {
  return Number(operatorCredit.value?.credit_try || 0) > 0 ? 'Mevcut Krediniz' : 'Limit Doldu'
})

const creditHint = computed(() => {
  return Number(operatorCredit.value?.credit_try || 0) > 0
    ? '✅ Bu tutar kadar yatırım kabul edebilirsin'
    : '⚠ Yeni teslim yap ya da bekleyen çekimi tamamla'
})

// Sum of all commissions earned in the period (deposit + withdrawal + teslim)
const totalCommission = computed(() => {
  return Number(myBalance.value?.deposit_commission || 0)
    + Number(myBalance.value?.withdrawal_commission || 0)
    + Number(teslim.value?.approved_commission || 0)
})

// All period math is pinned to Europe/Istanbul regardless of the user's
// browser timezone. Operators may travel or use VPNs, but "today" always
// means today in Istanbul because that's the platform's accounting axis
// (matches Laravel's app.timezone + the MySQL session timezone).
const IST_TZ = 'Europe/Istanbul'
const IST_YMD = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
})

// Today in Istanbul, as a YYYY-MM-DD string + a Date pinned to that day's
// local-midnight (so getDay()/getMonth()/etc. on it reflect Istanbul date).
function istanbulToday() {
  const ymdStr = IST_YMD.format(new Date())
  return { ymd: ymdStr, date: new Date(ymdStr + 'T00:00:00') }
}

function ymd(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function getDateRange() {
  const { ymd: today, date: nowIst } = istanbulToday()
  switch (datePreset.value) {
    case 'today':
      return { date_from: today, date_to: today }
    case 'yesterday': {
      const y = new Date(nowIst)
      y.setDate(nowIst.getDate() - 1)
      const yStr = ymd(y)
      return { date_from: yStr, date_to: yStr }
    }
    case 'week': {
      const dow = nowIst.getDay()
      const monday = new Date(nowIst)
      monday.setDate(nowIst.getDate() - (dow === 0 ? 6 : dow - 1))
      return { date_from: ymd(monday), date_to: today }
    }
    case 'month': {
      const firstDay = new Date(nowIst.getFullYear(), nowIst.getMonth(), 1)
      return { date_from: ymd(firstDay), date_to: today }
    }
    case 'custom':
      return { date_from: customDateFrom.value || undefined, date_to: customDateTo.value || undefined }
    default:
      return {}
  }
}

async function loadMyStats() {
  if (auth.isSuperAdmin) return
  myStatsLoading.value = true
  try {
    const params = getDateRange()
    const { data } = await api.get('/portal/dashboard/my-stats', { params })
    if (data.performance) perf.value = data.performance
    if (data.settlement) settlement.value = data.settlement
    if (data.teslim) teslim.value = data.teslim
    if (data.operator_credit) operatorCredit.value = data.operator_credit
    myBalance.value = data
  } catch { /* silent */ }
  finally { myStatsLoading.value = false }
}

watch(datePreset, (val) => {
  if (val !== 'custom') loadMyStats()
})

// --- Transaction History ---
const myTransactions = ref([])
const txnLoading = ref(false)
const txnPagination = ref({ total: 0 })
const txnSearch = ref('')
const txnTypeFilter = ref('')
const txnStatusFilter = ref('')
const txnDateFrom = ref('')
const txnDateTo = ref('')
const txnPage = ref(1)
const txnPerPage = ref(20)

const typeOptions = [
  { text: 'Tümü', value: '' },
  { text: 'Yatırım', value: 'deposit' },
  { text: 'Çekim', value: 'withdrawal' },
]

const statusOptions = [
  { text: 'Tümü', value: '' },
  { text: 'Beklemede', value: 'pending' },
  { text: 'Atandı', value: 'assigned' },
  { text: 'Ödeme Görüldü', value: 'payment_seen' },
  { text: 'İşlemde', value: 'processing' },
  { text: 'Onaylandı', value: 'approved' },
  { text: 'Reddedildi', value: 'rejected' },
  { text: 'Süresi Doldu', value: 'expired' },
]

// txnHeaders no longer used (card-row layout), kept for reference
const txnHeaders = []

async function loadMyTransactions() {
  if (auth.isSuperAdmin) return
  txnLoading.value = true
  try {
    const params = { page: txnPage.value, per_page: txnPerPage.value }
    if (txnSearch.value) params.search = txnSearch.value
    if (txnTypeFilter.value) params.type = txnTypeFilter.value
    if (txnStatusFilter.value) params.status = txnStatusFilter.value
    if (txnDateFrom.value) params.date_from = txnDateFrom.value
    if (txnDateTo.value) params.date_to = txnDateTo.value

    const { data } = await api.get('/portal/dashboard/my-transactions', { params })
    myTransactions.value = data.data || []
    txnPagination.value = data.meta || { total: data.data?.length || 0 }
  } catch { /* silent */ }
  finally { txnLoading.value = false }
}

function onTxnPageChange(page) { txnPage.value = page; loadMyTransactions() }
function onTxnPerPageChange(perPage) { txnPerPage.value = perPage; txnPage.value = 1; loadMyTransactions() }

let filterDebounce = null
watch([txnTypeFilter, txnStatusFilter, txnDateFrom, txnDateTo], () => {
  clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => { txnPage.value = 1; loadMyTransactions() }, 300)
})

// recentHeaders no longer used (card-row layout)
const recentHeaders = []

// Helpers
function statusColor(status) {
  return { pending: 'grey', assigned: 'secondary', payment_seen: 'secondary', processing: 'warning', approved: 'success', rejected: 'error', expired: 'grey-darken-1', cancelled: 'grey-darken-2' }[status] || 'grey'
}

function statusText(status) {
  return { pending: 'Beklemede', assigned: 'Atandı', payment_seen: 'Ödeme Görüldü', processing: 'İşlemde', approved: 'Onaylandı', rejected: 'Reddedildi', expired: 'Süresi Doldu', cancelled: 'İptal Edildi' }[status] || status
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

// Operator credit is a single non-negative balance: amount platform owes
// the operator. > 0 means they have capacity. = 0 means limit reached.
function creditStateLabel(v) {
  const n = Number(v || 0)
  return n > 0 ? 'Mevcut kredi (yatırım kabul edebilir)' : 'Limit doldu — yeni teslim gerekli'
}

function formatCompact(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M'
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K'
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(amount)
}

function formatUsdt(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' USDT'
}

function truncateHash(hash) {
  if (!hash || hash.length < 16) return hash || '--'
  return hash.substring(0, 8) + '...' + hash.substring(hash.length - 6)
}

function settlementStatusColor(status) {
  return { pending_approval: 'secondary', assigned: 'info', pending_final: 'warning', approved: 'success', rejected: 'error', pending: 'warning' }[status] || 'grey'
}

function settlementStatusText(status) {
  return { pending_approval: 'Onay Bekliyor', assigned: 'Operatörde', pending_final: 'Son Onay', approved: 'Tamamlandı', rejected: 'Reddedildi', pending: 'Beklemede' }[status] || status
}

function teslimStatusColor(status) {
  return { pending: 'warning', approved: 'success', rejected: 'error' }[status] || 'grey'
}
function teslimStatusText(status) {
  return { pending: 'Beklemede', approved: 'Onaylandı', rejected: 'Reddedildi' }[status] || status
}

function formatDate(date) {
  if (!date) return '--'
  return new Date(date).toLocaleString('tr-TR')
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '--'
  if (seconds < 60) return `${seconds} sn`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins} dk ${secs} sn` : `${mins} dk`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs} sa ${remainMins} dk` : `${hrs} sa`
}

function avgTimeColor(seconds) {
  if (!seconds || seconds <= 0) return 'rgba(200,204,216,0.4)'
  if (seconds <= 60) return 'var(--sp-accent-success)'
  if (seconds <= 180) return 'var(--sp-accent-amber)'
  if (seconds <= 300) return 'var(--sp-accent-rose)'
  return 'var(--sp-accent-error)'
}

function perfGradient(seconds) {
  if (!seconds || seconds <= 0) return 'linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-purple))'
  if (seconds <= 60) return 'linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-cyan))'
  if (seconds <= 180) return 'linear-gradient(135deg, var(--sp-accent-amber), var(--sp-accent-peach))'
  return 'linear-gradient(135deg, var(--sp-accent-error), var(--sp-accent-error))'
}

function perfCardClass(seconds) {
  if (!seconds || seconds <= 0) return ''
  if (seconds <= 60) return 'glass-perf-fast'
  if (seconds <= 180) return 'glass-perf-normal'
  return 'glass-perf-slow'
}

function timeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)
  if (diffMin < 1) return 'Az önce'
  if (diffMin < 60) return `${diffMin} dk önce`
  if (diffHrs < 24) return `${diffHrs} saat önce`
  if (diffDays < 7) return `${diffDays} gün önce`
  return past.toLocaleDateString('tr-TR')
}

function maskIban(iban) {
  if (!iban || iban.length < 10) return iban || '--'
  return iban.substring(0, 6) + '****' + iban.substring(iban.length - 4)
}

onMounted(async () => {
  const { data } = await api.get('/portal/dashboard')
  stats.value = data
  if (!auth.isSuperAdmin) {
    loadMyStats()
    loadMyTransactions()
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════ */
/* OPERATOR DASHBOARD — simplified */
/* ═══════════════════════════════════════ */
.hero-earnings {
  padding: 28px 32px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--sp-accent-success) 0%, var(--sp-accent-success) 100%);
  color: white;
  position: relative;
  overflow: hidden;
}
.hero-earnings-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  opacity: 0.85;
  margin-bottom: 6px;
}
.hero-earnings-amount {
  font-size: 44px;
  font-weight: 900;
  letter-spacing: -1.5px;
  line-height: 1.05;
  color: white;
}
.hero-earnings-currency {
  font-size: 18px;
  font-weight: 700;
  opacity: 0.85;
  margin-left: 4px;
}
.hero-earnings-meta {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.92;
  font-weight: 500;
}

.simple-card {
  padding: 18px 22px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--sp-glass-border);
  background: var(--sp-card-bg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.simple-card[href], .simple-card[to], a.simple-card { cursor: pointer; }
.simple-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.simple-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.simple-card-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--sp-text-dimmer);
  margin-bottom: 4px;
}
.simple-card-value {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.simple-card-hint {
  font-size: 12px;
  color: var(--sp-text-dim);
  margin-top: 4px;
}
.simple-card--credit-good     .simple-card-icon { background: rgba(102,241,189,0.10); }
.simple-card--credit-earnings .simple-card-icon { background: rgba(112,169,255,0.10); }
.simple-card--credit-bad      .simple-card-icon { background: rgba(113,132,122,0.12); }
.simple-card--pending         .simple-card-icon { background: rgba(255,190,91,0.10); }

/* ── Operator dashboard widgets ── */
.op-credit-card {
  padding: 22px 26px;
  border-radius: 16px;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  border-left: 5px solid var(--sp-accent-success-bright);
}
.op-credit-card--good { border-left-color: var(--sp-accent-success-bright); }
.op-credit-card--warn { border-left-color: var(--sp-accent-amber); }
.op-credit-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 6px;
}
.op-credit-amount {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--sp-text);
  line-height: 1.1;
}
.op-credit-cur {
  font-size: 16px;
  font-weight: 700;
  color: var(--sp-text-muted);
  margin-left: 4px;
}
.op-credit-hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-muted);
  margin-top: 8px;
}

.op-stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 600px) { .op-stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1264px) { .op-stats-grid { grid-template-columns: repeat(4, 1fr); } }

.op-stat-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
}
.op-stat-icon {
  width: 40px; height: 40px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.op-stat-body { flex: 1; min-width: 0; }
.op-stat-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--sp-text-hint);
  margin-bottom: 4px;
}
.op-stat-value {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--sp-text);
  line-height: 1.2;
}
.op-stat-cur {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-text-hint);
  margin-left: 2px;
}
.op-stat-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 4px;
}
.op-stat-sub-sep { margin: 0 4px; opacity: 0.5; }

.perf-stat { text-align: center; padding: 8px 4px; }
.perf-stat-value {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--sp-text);
  line-height: 1.1;
}
.perf-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-text-muted);
  margin-top: 2px;
  letter-spacing: 0.3px;
}

.period-toggle :deep(.v-btn) {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.simple-stat {
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-glass-border);
}
.simple-stat-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--sp-text-dimmer);
  margin-bottom: 6px;
}
.simple-stat-value {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

/* ═══════════════════════════════════════ */
/* HERO STATS */
/* ═══════════════════════════════════════ */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.hero-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--sp-glass-border);
}

.hero-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.08;
  z-index: 0;
}

.hero-deposit { background: linear-gradient(135deg, rgba(102,241,189,0.12), rgba(56,249,215,0.05)); border-color: rgba(102,241,189,0.15); }
.hero-withdrawal { background: linear-gradient(135deg, rgba(112,169,255,0.12), rgba(0,242,254,0.05)); border-color: rgba(112,169,255,0.15); }
.hero-pending { background: linear-gradient(135deg, rgba(255,190,91,0.12), rgba(253,160,133,0.05)); border-color: rgba(255,190,91,0.15); }

.hero-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.hero-deposit .hero-icon-wrap { background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-cyan)); }
.hero-withdrawal .hero-icon-wrap { background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-cyan)); }
.hero-pending .hero-icon-wrap { background: linear-gradient(135deg, var(--sp-accent-amber), var(--sp-accent-peach)); }

.hero-content { position: relative; z-index: 1; flex: 1; }
.hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--sp-text-muted); font-weight: 600; margin-bottom: 4px; }
.hero-amount { font-size: 24px; font-weight: 800; color: var(--sp-text); letter-spacing: -0.5px; }
.hero-sub { font-size: 12px; color: var(--sp-text-dimmer); margin-top: 2px; }
.hero-count { font-weight: 700; color: var(--sp-text-secondary); }

.hero-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255,190,91,0.15);
  color: var(--sp-accent-amber);
  z-index: 1;
}

.pulse-badge { animation: pulse-glow 2s ease-in-out infinite; }

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,190,91,0.2); }
  50% { box-shadow: 0 0 0 6px rgba(255,190,91,0); }
}

/* ═══════════════════════════════════════ */
/* SECTION HEADERS */
/* ═══════════════════════════════════════ */
.section-header { display: flex; align-items: center; gap: 12px; }
.section-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--sp-text); }
.section-subtitle { font-size: 11px; color: var(--sp-text-dimmer); }

/* ═══════════════════════════════════════ */
/* GLASS CARDS */
/* ═══════════════════════════════════════ */
.glass-grid {
  display: grid;
  gap: 12px;
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }
.grid-5 { grid-template-columns: repeat(5, 1fr); }
.grid-6 { grid-template-columns: repeat(6, 1fr); }

@media (max-width: 960px) {
  .grid-4, .grid-5, .grid-6 { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .grid-2, .grid-4, .grid-5, .grid-6 { grid-template-columns: repeat(2, 1fr); }
}

.glass-card {
  position: relative;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 14px;
  padding: 18px 16px;
  text-align: center;
  overflow: hidden;
  transition: all 0.2s ease;
}

.glass-card:hover {
  border-color: var(--sp-accent-border-vivid);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--sp-shadow);
}

.glass-card-compact { padding: 14px 12px; }

.glass-card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 14px 14px 0 0;
}

.glass-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--sp-text-muted);
  font-weight: 600;
  margin-bottom: 8px;
}

.glass-value { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
.glass-value-sm { font-size: 17px; font-weight: 700; }
.glass-hint { font-size: 10px; color: var(--sp-text-dim); margin-top: 4px; }

.glass-perf-fast { border-color: rgba(102,241,189,0.2) !important; }
.glass-perf-normal { border-color: rgba(255,190,91,0.2) !important; }
.glass-perf-slow { border-color: rgba(255,142,130,0.2) !important; }

/* ═══════════════════════════════════════ */
/* FLOW CARD (Operator balance flow) */
/* ═══════════════════════════════════════ */
.flow-card {
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 14px;
  overflow: hidden;
}

.flow-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--sp-divider);
}

.flow-title { font-size: 13px; font-weight: 600; color: var(--sp-text-muted); }

.flow-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  flex-wrap: wrap;
}

.flow-item {
  text-align: center;
  padding: 12px 20px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 12px;
  min-width: 140px;
}

.flow-item-result {
  background: rgba(var(--sp-primary-rgb), 0.06);
  border-color: rgba(var(--sp-primary-rgb), 0.15);
}

.flow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 0 auto 6px;
}

.flow-item-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--sp-text-dimmer); font-weight: 600; margin-bottom: 4px; }
.flow-item-value { font-size: 16px; font-weight: 700; }
.flow-arrow { color: var(--sp-text-ghost); display: flex; align-items: center; }

@media (max-width: 960px) {
  .flow-body { flex-direction: column; gap: 4px; }
  .flow-arrow { transform: rotate(90deg); }
}

/* ═══════════════════════════════════════ */
/* MERCHANT CARDS */
/* ═══════════════════════════════════════ */
.merchant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.merchant-card {
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
}

.merchant-card:hover {
  border-color: rgba(112,169,255,0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--sp-shadow);
}

.merchant-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.merchant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--sp-accent-blue), var(--sp-accent-cyan));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}

.merchant-name { font-size: 15px; font-weight: 700; color: var(--sp-text); }
.merchant-fees { font-size: 10px; color: var(--sp-text-hint); display: flex; align-items: center; margin-top: 2px; }

.merchant-balance-main {
  text-align: center;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 12px;
}

.merchant-balance-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--sp-text-dimmer); font-weight: 600; margin-bottom: 4px; }
.merchant-balance-amount { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

.merchant-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.merchant-stat {
  text-align: center;
  padding: 8px 4px;
  background: var(--sp-glass-bg);
  border-radius: 8px;
}

.merchant-stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; color: var(--sp-text-hint); font-weight: 600; margin-bottom: 2px; }
.merchant-stat-value { font-size: 13px; font-weight: 700; }

.merchant-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.mbadge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; }
.mbadge-orange { background: var(--sp-accent-amber-bg); color: var(--sp-accent-amber); }
.mbadge-red { background: var(--sp-accent-error-bg); color: var(--sp-accent-rose); }

/* ═══════════════════════════════════════ */
/* GLASS TABLES */
/* ═══════════════════════════════════════ */
.glass-table-card {
  background: var(--sp-glass-bg) !important;
  border: 1px solid var(--sp-glass-border) !important;
  border-radius: 16px !important;
  overflow: hidden;
}

.glass-table-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sp-divider);
}

.glass-table {
  background: transparent !important;
}

.glass-table :deep(th) {
  font-size: 10px !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sp-text-dimmer) !important;
  border-bottom: 1px solid var(--sp-divider) !important;
}

.glass-table :deep(td) {
  font-size: 12px !important;
  border-bottom: 1px solid var(--sp-accent-bg-subtle) !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.glass-table :deep(tr:hover td) {
  background: var(--sp-glass-bg) !important;
}

.hash-code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10px;
  color: var(--sp-primary);
  background: rgba(var(--sp-primary-rgb), 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ═══════════════════════════════════════ */
/* PERIOD TOGGLE */
/* ═══════════════════════════════════════ */
.period-toggle {
  border-radius: 10px !important;
  overflow: hidden;
}

.period-toggle .v-btn {
  font-size: 11px !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

/* ═══════════════════════════════════════ */
/* TRANSACTION ROWS */
/* ═══════════════════════════════════════ */
/* Panel layout */
.txn-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.txn-list-wrap {
  flex: 1;
  min-width: 0;
  transition: all 0.3s ease;
}

.txn-list-squeezed {
  flex: 1 1 0;
}

.txn-panel-wrap {
  width: 400px;
  min-width: 400px;
  flex-shrink: 0;
  animation: panel-slide-in 0.25s ease-out;
}

@keyframes panel-slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 1200px) {
  .txn-panel-wrap { width: 360px; min-width: 360px; }
}

.txn-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.txn-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.15s ease;
  cursor: pointer;
}

.txn-row:hover {
  background: var(--sp-glass-hover);
  border-color: rgba(var(--sp-primary-rgb), 0.15);
  transform: translateX(2px);
}

.txn-row-pending {
  border-left: 3px solid rgba(255,190,91,0.4);
}

.txn-row-active {
  background: rgba(var(--sp-primary-rgb), 0.06) !important;
  border-color: rgba(var(--sp-primary-rgb), 0.2) !important;
}

.txn-type-indicator {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.txn-type-deposit { background: linear-gradient(135deg, rgba(102,241,189,0.8), rgba(56,249,215,0.8)); }
.txn-type-withdrawal { background: linear-gradient(135deg, rgba(112,169,255,0.8), rgba(0,242,254,0.8)); }

.txn-main { flex: 1; min-width: 0; }

.txn-main-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.txn-merchant {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
}

.txn-type-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.txn-type-blue { color: var(--sp-accent-cyan); }

.txn-id-label {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--sp-text-faint);
}

.txn-main-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.txn-customer {
  font-size: 11px;
  color: var(--sp-text-muted);
  display: flex;
  align-items: center;
}

.txn-customer-name {
  font-size: 10px;
  color: var(--sp-text-hint);
}

.txn-bank-name {
  font-size: 10px;
  color: var(--sp-text-dim);
  display: flex;
  align-items: center;
}

.txn-amount-block {
  text-align: right;
  flex-shrink: 0;
  min-width: 110px;
}

.txn-amount {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.txn-amount-approved {
  font-size: 10px;
  color: var(--sp-accent-success);
  margin-top: 1px;
}

.txn-status-block {
  flex-shrink: 0;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.txn-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.txn-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.txn-status-pending { background: rgba(158,158,158,0.1); color: var(--sp-text-muted); }
.txn-status-pending .txn-status-dot { background: var(--sp-text-dimmer); }

.txn-status-assigned { background: rgba(96,125,139,0.12); color: var(--sp-text-muted); }
.txn-status-assigned .txn-status-dot { background: var(--sp-text-muted); }

.txn-status-payment_seen { background: rgba(179,136,255,0.1); color: var(--sp-accent-violet); }
.txn-status-payment_seen .txn-status-dot { background: var(--sp-accent-violet); }

.txn-status-processing { background: var(--sp-accent-amber-bg); color: var(--sp-accent-orange); }
.txn-status-processing .txn-status-dot { background: var(--sp-accent-orange); animation: pulse-dot 1.5s ease-in-out infinite; }

.txn-status-approved { background: var(--sp-accent-success-bg); color: var(--sp-accent-success); }
.txn-status-approved .txn-status-dot { background: var(--sp-accent-success); }

.txn-status-rejected { background: var(--sp-accent-error-bg); color: var(--sp-accent-rose); }
.txn-status-rejected .txn-status-dot { background: var(--sp-accent-rose); }

.txn-status-expired { background: rgba(158,158,158,0.08); color: var(--sp-text-hint); }
.txn-status-expired .txn-status-dot { background: var(--sp-text-faint); }

.txn-status-cancelled { background: rgba(158,158,158,0.08); color: var(--sp-text-dim); }
.txn-status-cancelled .txn-status-dot { background: var(--sp-text-ghost); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.txn-indicators {
  display: flex;
  gap: 4px;
}

.txn-actors-block {
  flex-shrink: 0;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.txn-actor {
  display: flex;
  align-items: center;
  font-size: 10px;
  color: var(--sp-text-hint);
  white-space: nowrap;
}

.txn-actor-approved {
  color: rgba(102,241,189,0.6);
}

.txn-time-block {
  flex-shrink: 0;
  text-align: right;
  min-width: 80px;
}

.txn-time {
  font-size: 11px;
  color: var(--sp-text-dimmer);
}

.txn-time-approved {
  font-size: 9px;
  color: rgba(102,241,189,0.5);
  margin-top: 2px;
}

.txn-arrow {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.txn-row:hover .txn-arrow { opacity: 1; }

.txn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--sp-glass-bg);
  border: 1px dashed var(--sp-glass-border);
  border-radius: 14px;
}

.txn-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* Filter bar */
.txn-filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.txn-search-field {
  flex: 2;
  min-width: 200px;
}

.txn-filter-select {
  flex: 1;
  min-width: 120px;
}

.txn-filter-bar :deep(.v-field) {
  background: var(--sp-glass-bg) !important;
  border-radius: 10px !important;
}

@media (max-width: 960px) {
  .txn-row { flex-wrap: wrap; gap: 8px; }
  .txn-amount-block { min-width: auto; }
  .txn-status-block { min-width: auto; }
  .txn-actors-block { min-width: auto; }
  .txn-time-block { min-width: auto; }
  .txn-arrow { display: none; }
}

/* ═══════════════════════════════════════ */
/* LIGHT MODE — solid white, clean shadows */
/* ═══════════════════════════════════════ */
:global(.v-theme--lightComfort .hero-card) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
:global(.v-theme--lightComfort .hero-deposit) { background: #FFFFFF; border-left: 3px solid var(--sp-accent-success); }
:global(.v-theme--lightComfort .hero-withdrawal) { background: #FFFFFF; border-left: 3px solid var(--sp-accent-blue); }
:global(.v-theme--lightComfort .hero-pending) { background: #FFFFFF; border-left: 3px solid var(--sp-accent-amber); }

:global(.v-theme--lightComfort .glass-card) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
:global(.v-theme--lightComfort .glass-card:hover) {
  border-color: #D0D3E4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

:global(.v-theme--lightComfort .flow-card) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
:global(.v-theme--lightComfort .flow-item) {
  background: #F7F8FB;
  border-color: #E3E5EE;
}
:global(.v-theme--lightComfort .flow-item-result) {
  background: #EEF0FA;
  border-color: #D0D3E4;
}

:global(.v-theme--lightComfort .merchant-card) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
:global(.v-theme--lightComfort .merchant-card:hover) {
  border-color: #D0D3E4;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
:global(.v-theme--lightComfort .merchant-balance-main) {
  background: #F7F8FB;
  border-color: #E3E5EE;
}
:global(.v-theme--lightComfort .merchant-stat) {
  background: #F7F8FB;
}

:global(.v-theme--lightComfort .txn-row) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
:global(.v-theme--lightComfort .txn-row:hover) {
  background: #F7F8FB;
  border-color: #D0D3E4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
:global(.v-theme--lightComfort .txn-row-active) {
  background: #EEF0FA !important;
  border-color: var(--sp-text) !important;
}

:global(.v-theme--lightComfort .txn-empty) {
  background: #F7F8FB;
  border-color: #E3E5EE;
}

:global(.v-theme--lightComfort .glass-table-card) {
  background: #FFFFFF !important;
  border-color: #E3E5EE !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
}

:global(.v-theme--lightComfort .section-icon) {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:global(.v-theme--lightComfort .txn-filter-bar :deep(.v-field)) {
  background: #F7F8FB !important;
}

/* ═══════════════════════════════════════ */
/* RESPONSIVE — TABLET (max-width: 960px) */
/* ═══════════════════════════════════════ */
@media (max-width: 960px) {
  /* Hero stats: 2 columns */
  .hero-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* Merchant grid: 2 columns */
  .merchant-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* Merchant inner stats: 2 columns */
  .merchant-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Transaction layout: stack vertically */
  .txn-layout {
    flex-direction: column;
  }

  .txn-panel-wrap {
    width: 100% !important;
    min-width: 0 !important;
  }

  /* Flow items: reduce padding */
  .flow-item {
    min-width: 110px;
    padding: 10px 14px;
  }

  /* Reduce card paddings */
  .hero-card {
    padding: 16px 18px;
  }

  .merchant-card {
    padding: 16px;
  }

  /* Filter bar: stack */
  .txn-filter-bar {
    flex-direction: column;
  }

  .txn-search-field,
  .txn-filter-select {
    flex: 1 1 100%;
    min-width: 0;
    width: 100%;
  }
}

/* ═══════════════════════════════════════ */
/* RESPONSIVE — MOBILE (max-width: 600px) */
/* ═══════════════════════════════════════ */
@media (max-width: 600px) {
  /* Hero stats: single column */
  .hero-stats {
    grid-template-columns: 1fr !important;
    gap: 10px;
  }

  .hero-card {
    padding: 14px 16px;
    gap: 12px;
    border-radius: 12px;
  }

  .hero-icon-wrap {
    width: 42px;
    height: 42px;
    border-radius: 10px;
  }

  .hero-amount {
    font-size: 20px;
  }

  /* Glass grid: single column for smaller grids */
  .glass-grid {
    gap: 8px;
  }

  .grid-2 {
    grid-template-columns: 1fr !important;
  }

  /* Glass cards: reduced padding */
  .glass-card {
    padding: 14px 12px;
    border-radius: 10px;
  }

  .glass-value {
    font-size: 17px;
  }

  /* Merchant grid: single column */
  .merchant-grid {
    grid-template-columns: 1fr !important;
    gap: 10px;
  }

  .merchant-card {
    padding: 14px;
    border-radius: 12px;
  }

  .merchant-balance-amount {
    font-size: 20px;
  }

  .merchant-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  /* Flow card: tighter spacing */
  .flow-body {
    padding: 14px;
    gap: 6px;
  }

  .flow-item {
    min-width: 0;
    width: 100%;
    padding: 10px 12px;
  }

  .flow-item-value {
    font-size: 14px;
  }

  /* Transaction rows: compact on mobile */
  .txn-row {
    padding: 10px 12px;
    gap: 10px;
    border-radius: 10px;
  }

  .txn-type-indicator {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .txn-amount {
    font-size: 13px;
  }

  .txn-status-block {
    min-width: 70px;
  }

  .txn-actors-block {
    display: none;
  }

  .txn-time-block {
    min-width: 60px;
  }

  /* Transaction panel: full width */
  .txn-panel-wrap {
    width: 100% !important;
    min-width: 0 !important;
  }

  /* Section headers: tighter */
  .section-header {
    gap: 8px;
  }

  .section-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  .section-title {
    font-size: 14px;
  }

  /* Glass table: horizontal scroll */
  .glass-table-card {
    border-radius: 12px !important;
  }

  .glass-table {
    overflow-x: auto;
  }

  /* Period toggle */
  .period-toggle .v-btn {
    font-size: 10px !important;
    padding: 0 8px !important;
  }

  /* General: prevent overflow */
  .dashboard {
    overflow-x: hidden;
    max-width: 100%;
  }

  /* Flow card */
  .flow-card {
    border-radius: 10px;
  }

  .flow-header {
    padding: 10px 14px;
  }
}
</style>
