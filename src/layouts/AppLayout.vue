<template>
  <v-layout>
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      :permanent="!isMobile"
      :temporary="isMobile"
      @update:model-value="v => drawer = v"
      class="sidebar"
    >
      <!-- Brand -->
      <div class="sidebar-brand" :class="{ 'justify-center': rail }">
        <img v-if="!rail" src="/admin-logo.png" alt="Logo" class="sidebar-logo" />
        <img v-else src="/admin-logo.png" alt="Logo" class="sidebar-logo-rail" />
        <v-btn
          v-if="!rail"
          icon="mdi-chevron-left"
          variant="text"
          size="x-small"
          class="collapse-btn sidebar-collapse-btn"
          @click="rail = true"
        />
      </div>

      <div class="sidebar-divider" />

      <!-- Menu -->
      <v-list density="compact" nav class="sidebar-nav px-2" bg-color="transparent">
        <v-list-item
          prepend-icon="mdi-home-outline"
          title="Ana Sayfa"
          :to="{ name: 'Home' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
          exact
        />

        <div v-if="!rail" class="nav-section">İŞLEMLER</div>

        <!-- Pending deposit alert -->
        <div
          v-if="!rail && txnStore.pendingDepositCount > 0 && (auth.can('transactions.view.deposit') || auth.isSuperAdmin)"
          class="pending-alert pending-alert--deposit"
          @click="router.push({ name: 'Deposits' })"
        >
          <div class="pending-alert-icon">
            <v-icon size="14" color="warning">mdi-alert</v-icon>
          </div>
          <div class="pending-alert-text">
            <span class="pending-alert-count">{{ txnStore.pendingDepositCount }}</span> yatırım bekliyor
          </div>
        </div>

        <v-list-item
          v-if="auth.can('transactions.view.deposit') || auth.isSuperAdmin"
          prepend-icon="mdi-plus-circle-outline"
          title="Yatırımlar"
          :to="{ name: 'Deposits' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        >
          <template v-slot:append v-if="txnStore.pendingDepositCount > 0">
            <div class="nav-badge nav-badge--deposit">{{ txnStore.pendingDepositCount }}</div>
          </template>
        </v-list-item>

        <!-- Pending withdrawal alert -->
        <div
          v-if="!rail && txnStore.pendingWithdrawalCount > 0 && (auth.can('transactions.view.withdrawal') || auth.isSuperAdmin)"
          class="pending-alert pending-alert--withdrawal"
          @click="router.push({ name: 'Withdrawals' })"
        >
          <div class="pending-alert-icon">
            <v-icon size="14" color="error">mdi-alert</v-icon>
          </div>
          <div class="pending-alert-text">
            <span class="pending-alert-count">{{ txnStore.pendingWithdrawalCount }}</span> çekim bekliyor
          </div>
        </div>

        <v-list-item
          v-if="auth.can('transactions.view.withdrawal') || auth.isSuperAdmin"
          prepend-icon="mdi-minus-circle-outline"
          title="Çekimler"
          :to="{ name: 'Withdrawals' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        >
          <template v-slot:append v-if="txnStore.pendingWithdrawalCount > 0">
            <div class="nav-badge nav-badge--withdrawal">{{ txnStore.pendingWithdrawalCount }}</div>
          </template>
        </v-list-item>

        <!-- Pending settlement alert (admins / settlement officers only) -->
        <div
          v-if="(auth.isSuperAdmin || auth.can('settlement.handle')) && !rail && txnStore.pendingSettlementCount > 0"
          class="pending-alert pending-alert--settlement"
          @click="router.push({ name: 'Settlements' })"
        >
          <div class="pending-alert-icon">
            <v-icon size="14" color="deep-purple">mdi-alert</v-icon>
          </div>
          <div class="pending-alert-text">
            <span class="pending-alert-count">{{ txnStore.pendingSettlementCount }}</span> mutabakat bekliyor
          </div>
        </div>

        <v-list-item
          v-if="auth.isSuperAdmin || auth.can('settlement.handle')"
          prepend-icon="mdi-bank-transfer-out"
          title="Mutabakat"
          :to="{ name: 'Settlements' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        >
          <template v-slot:append v-if="txnStore.pendingSettlementCount > 0">
            <div class="nav-badge nav-badge--settlement">{{ txnStore.pendingSettlementCount }}</div>
          </template>
        </v-list-item>

        <v-list-item
          prepend-icon="mdi-hand-coin-outline"
          title="Teslim"
          :to="{ name: 'Teslimler' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        >
          <template v-slot:append v-if="txnStore.pendingTeslimCount > 0">
            <div class="nav-badge nav-badge--settlement">{{ txnStore.pendingTeslimCount }}</div>
          </template>
        </v-list-item>

        <v-list-item
          v-if="auth.can('company_wallet.manage') || auth.isSuperAdmin"
          prepend-icon="mdi-wallet-outline"
          title="Şirket Cüzdanları"
          :to="{ name: 'CompanyWallets' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <div v-if="!rail" class="nav-section">YÖNETİM</div>

        <v-list-item
          prepend-icon="mdi-chart-box-outline"
          title="Genel Bakış"
          :to="{ name: 'Dashboard' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.can('bank_accounts.view') || auth.isSuperAdmin"
          prepend-icon="mdi-bank-outline"
          title="Banka Hesapları"
          :to="{ name: 'BankAccounts' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.can('users.view') || auth.isSuperAdmin"
          prepend-icon="mdi-account-group-outline"
          title="Kullanıcılar"
          :to="{ name: 'Users' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="!auth.isSuperAdmin && auth.can('team.create')"
          prepend-icon="mdi-account-multiple-plus-outline"
          title="Ekibim"
          :to="{ name: 'Team' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.can('sub_groups.view') || auth.isSuperAdmin"
          prepend-icon="mdi-folder-account-outline"
          title="Alt Gruplar"
          :to="{ name: 'SubGroups' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.isSuperAdmin"
          prepend-icon="mdi-store-outline"
          title="Bayiler"
          :to="{ name: 'Merchants' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.can('reports.view') || auth.isSuperAdmin"
          prepend-icon="mdi-chart-bar"
          title="Raporlar"
          :to="{ name: 'Reports' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.isSuperAdmin"
          prepend-icon="mdi-console-network"
          title="API Kayıtları"
          :to="{ name: 'ApiLogs' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.isSuperAdmin"
          prepend-icon="mdi-file-document-outline"
          title="Teklifler"
          :to="{ name: 'Proposals' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.isSuperAdmin || auth.user?.roles?.some(r => ['grup_yoneticisi', 'sub_group_manager'].includes(r.name))"
          prepend-icon="mdi-clock-check-outline"
          title="Mesai Takibi"
          :to="{ name: 'ClockTracking' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

        <v-list-item
          v-if="auth.isSuperAdmin"
          prepend-icon="mdi-cog-outline"
          title="Platform Ayarları"
          :to="{ name: 'PlatformSettings' }"
          rounded="lg"
          class="nav-item"
          active-class="nav-active"
        />

      </v-list>

      <template v-slot:append>
        <div class="sidebar-footer">
          <div class="sidebar-divider" />

          <!-- Rail expand button -->
          <v-btn
            v-if="rail"
            icon="mdi-chevron-right"
            variant="text"
            size="x-small"
            class="collapse-btn mb-2 mx-auto d-block"
            @click="rail = false"
          />

          <!-- User card -->
          <div v-if="!rail" class="user-card mb-2">
            <v-avatar size="32" class="user-avatar mr-2">
              <span class="text-caption font-weight-bold">{{ initials }}</span>
            </v-avatar>
            <div class="user-info">
              <div class="d-flex align-center">
                <div class="user-name">{{ auth.user?.name }}</div>
                <div v-if="auth.isClockedIn && !auth.isSuperAdmin" class="clock-dot-sm ml-2" />
              </div>
              <div class="user-role">{{ roleName(auth.user?.roles?.[0]?.name) }}</div>
            </div>
          </div>

          <!-- Clock + time row -->
          <div v-if="!rail" class="footer-info-row mb-2">
            <div class="footer-info-item">
              <v-icon size="12" class="mr-1" style="color: var(--sp-text-hint)">mdi-clock-outline</v-icon>
              <span>{{ currentTime }}</span>
            </div>
            <div v-if="auth.isClockedIn && !auth.isSuperAdmin" class="footer-info-item footer-info-active">
              <div class="clock-dot" style="width:6px;height:6px" />
              <span>{{ elapsedTime }}</span>
            </div>
          </div>

          <!-- Action buttons row -->
          <div class="footer-actions">
            <!-- Notifications -->
            <v-menu v-model="notifMenu" :close-on-content-click="false" :max-width="380" :min-width="340" offset="8" location="top">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" :icon="rail" variant="text" size="small" class="footer-action-btn">
                  <v-badge :content="notifStore.unreadCount" :model-value="notifStore.unreadCount > 0" color="error" overlap>
                    <v-icon size="18">mdi-bell-outline</v-icon>
                  </v-badge>
                </v-btn>
              </template>
              <div class="notif-dropdown">
                <div class="notif-header">
                  <div class="d-flex align-center">
                    <div class="notif-header-icon">
                      <v-icon size="16" color="#7C8FE4">mdi-bell</v-icon>
                    </div>
                    <span class="notif-header-title">Bildirimler</span>
                    <div v-if="notifStore.unreadCount > 0" class="notif-count-badge">{{ notifStore.unreadCount }}</div>
                  </div>
                  <v-spacer />
                  <div class="d-flex ga-1" v-if="notifStore.notifications.length">
                    <button class="notif-action-btn" @click="notifStore.markAllRead()">
                      <v-icon size="14">mdi-check-all</v-icon>
                      Okundu
                    </button>
                    <button class="notif-action-btn notif-action-clear" @click="notifStore.clearAll()">
                      <v-icon size="14">mdi-trash-can-outline</v-icon>
                      Temizle
                    </button>
                  </div>
                </div>
                <div class="notif-list">
                  <template v-if="notifStore.notifications.length">
                    <div
                      v-for="n in notifStore.notifications"
                      :key="n.id"
                      :class="['notif-item', { 'notif-unread': !n.read }]"
                      @click="handleNotifClick(n)"
                    >
                      <div class="notif-item-icon" :style="{ background: getNotifBg(n.color) }">
                        <v-icon :color="n.color" size="16">{{ n.icon }}</v-icon>
                      </div>
                      <div class="notif-item-content">
                        <div class="notif-item-title">{{ n.title }}</div>
                        <div class="notif-item-msg">{{ n.message }}</div>
                      </div>
                      <div class="notif-item-time">{{ timeAgo(n.timestamp) }}</div>
                      <div v-if="!n.read" class="notif-dot"></div>
                    </div>
                  </template>
                  <div v-else class="notif-empty">
                    <div class="notif-empty-icon">
                      <v-icon size="32" :style="{ color: 'var(--sp-text-ghost)' }">mdi-bell-check-outline</v-icon>
                    </div>
                    <div class="notif-empty-text">Bildirim bulunmuyor</div>
                    <div class="notif-empty-sub">Yeni bildirimler burada görünecek</div>
                  </div>
                </div>
              </div>
            </v-menu>

            <!-- Theme toggle -->
            <v-btn :icon="rail" variant="text" size="small" class="footer-action-btn" @click="toggleTheme()">
              <v-icon size="18">{{ themeStore.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </v-btn>

            <!-- Settings -->
            <v-btn :icon="rail" variant="text" size="small" class="footer-action-btn" :to="{ name: 'ProfileSettings' }">
              <v-icon size="18">mdi-cog-outline</v-icon>
            </v-btn>

            <!-- Logout -->
            <v-btn :icon="rail" variant="text" size="small" class="footer-action-btn footer-action-logout" @click="handleLogout">
              <v-icon size="18">mdi-logout</v-icon>
            </v-btn>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Mobile top bar -->
    <v-app-bar v-if="isMobile" flat class="topbar" height="48">
      <div class="topbar-inner">
        <v-btn icon variant="text" size="small" @click="drawer = !drawer">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
        <img src="/admin-logo.png" alt="Logo" class="mobile-logo" />
        <v-spacer />
        <v-menu v-model="mobileNotifMenu" :close-on-content-click="false" max-width="90vw" min-width="300" offset="8">
          <template v-slot:activator="{ props }">
            <v-btn icon variant="text" size="small" v-bind="props">
              <v-badge :content="notifStore.unreadCount" :model-value="notifStore.unreadCount > 0" color="error" overlap>
                <v-icon size="20">mdi-bell-outline</v-icon>
              </v-badge>
            </v-btn>
          </template>
          <div class="notif-dropdown">
            <div class="notif-header">
              <div class="d-flex align-center">
                <span class="notif-header-title">Bildirimler</span>
                <div v-if="notifStore.unreadCount > 0" class="notif-count-badge ml-2">{{ notifStore.unreadCount }}</div>
              </div>
              <v-spacer />
              <div class="d-flex ga-1" v-if="notifStore.notifications.length">
                <button class="notif-action-btn" @click="notifStore.markAllRead()">Okundu</button>
                <button class="notif-action-btn notif-action-clear" @click="notifStore.clearAll()">Temizle</button>
              </div>
            </div>
            <div class="notif-list" style="max-height: 350px">
              <template v-if="notifStore.notifications.length">
                <div
                  v-for="n in notifStore.notifications"
                  :key="n.id"
                  :class="['notif-item', { 'notif-unread': !n.read }]"
                  @click="handleNotifClick(n); mobileNotifMenu = false"
                >
                  <div class="notif-item-icon" :style="{ background: getNotifBg(n.color) }">
                    <v-icon :color="n.color" size="16">{{ n.icon }}</v-icon>
                  </div>
                  <div class="notif-item-content">
                    <div class="notif-item-title">{{ n.title }}</div>
                    <div class="notif-item-msg">{{ n.message }}</div>
                  </div>
                  <div class="notif-item-time">{{ timeAgo(n.timestamp) }}</div>
                </div>
              </template>
              <div v-else class="notif-empty">
                <div class="notif-empty-text">Bildirim yok</div>
              </div>
            </div>
          </div>
        </v-menu>
      </div>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="main-content">
      <div class="content-wrapper">
        <router-view v-if="!auth.needsClockIn || ['ProfileSettings', 'ClockTracking'].includes(route.name)" />

        <!-- Clock-In Overlay -->
        <div v-if="auth.needsClockIn && !['ProfileSettings', 'ClockTracking'].includes(route.name)" class="clock-overlay">
          <div class="clock-card">
            <div class="clock-icon-wrap mb-4">
              <v-icon size="48" color="primary">mdi-clock-check-outline</v-icon>
            </div>
            <h2 class="clock-title mb-2">Mesaiye Başlayın</h2>
            <p class="clock-sub mb-6">İşlemleri görüntülemek ve yönetmek için mesaiye giriş yapmanız gerekmektedir.</p>
            <v-btn
              color="primary"
              size="x-large"
              rounded="lg"
              class="clock-btn"
              @click="handleClockIn"
              :loading="clockingIn"
            >
              <v-icon start size="24">mdi-login</v-icon>
              Mesaiye Başla
            </v-btn>
            <div class="clock-time mt-4">
              <v-icon size="14" class="mr-1" style="color: var(--sp-text-dim)">mdi-calendar</v-icon>
              {{ currentDate }}
            </div>
          </div>
        </div>
      </div>
    </v-main>

    <!-- Notification Toast -->
    <teleport to="body">
      <transition name="notif-slide">
        <div
          v-if="notifStore.showToast && notifStore.toastData"
          :class="['notif-toast', { 'notif-toast--light': !themeStore.isDark }]"
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
  </v-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme, useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useNotificationStore } from '@/stores/notifications'
import { useThemeStore } from '@/stores/theme'
import api from '@/plugins/axios'

const auth = useAuthStore()
const txnStore = useTransactionStore()
const notifStore = useNotificationStore()
const themeStore = useThemeStore()
const theme = useTheme()
const { mobile: isMobile } = useDisplay()
const router = useRouter()
const route = useRoute()

// Apply saved theme on load
theme.change(themeStore.getStoredTheme())

function toggleTheme() {
  const newTheme = themeStore.isDark ? 'lightComfort' : 'darkComfort'
  theme.change(newTheme)
  themeStore.setTheme(newTheme)
}
const drawer = ref(true)
const rail = ref(false)
const notifMenu = ref(false)
const mobileNotifMenu = ref(false)
const clockingIn = ref(false)
let clockInterval = null

const pages = {
  Home:            { title: 'Ana Sayfa', sub: '' },
  Dashboard:       { title: 'Genel Bakış', sub: 'Genel bakış ve istatistikler' },
  Deposits:        { title: 'Yatırımlar', sub: 'Yatırım işlemlerini yönetin' },
  Withdrawals:     { title: 'Çekimler', sub: 'Çekim işlemlerini yönetin' },
  TxnDetail:       { title: 'İşlem Detayı', sub: '' },
  BankAccounts:    { title: 'Banka Hesapları', sub: 'Hesap yapılandırması' },
  Users:           { title: 'Kullanıcılar', sub: 'Kullanıcı ve yetki yönetimi' },
  SubGroups:       { title: 'Alt Gruplar', sub: 'Grup yapılandırması' },
  Merchants:       { title: 'Bayiler', sub: 'Bayi ve API yönetimi' },
  Settlements:     { title: 'Mutabakat', sub: 'Kripto mutabakat talepleri' },
  ApiLogs:         { title: 'API Kayıtları', sub: 'Tüm istek ve yanıt kayıtları' },
  Reports:         { title: 'Raporlar', sub: 'Finansal raporlar' },
  ProfileSettings: { title: 'Ayarlar', sub: 'Profil ve güvenlik' },
  ClockTracking:   { title: 'Mesai Takibi', sub: 'Personel mesai kayıtları ve canlı durum' },
  Proposals:       { title: 'Teklifler', sub: 'Bayi teklifleri yönetimi' },
  ProposalCreate:  { title: 'Yeni Teklif', sub: '' },
  ProposalDetail:  { title: 'Teklif Detay', sub: '' },
  ProposalEdit:    { title: 'Teklif Düzenle', sub: '' },
}

const pageTitle = computed(() => pages[route.name]?.title || route.name)
const pageSubtitle = computed(() => pages[route.name]?.sub || '')

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
})

function roleName(role) {
  const roles = {
    super_admin: 'Süper Yönetici', grup_yoneticisi: 'Grup Yöneticisi',
    yatirim_sorumlusu: 'Yatırım Sorumlusu', cekim_sorumlusu: 'Çekim Sorumlusu',
    muhasebe: 'Muhasebe', izleyici: 'İzleyici',
    sub_group_manager: 'Grup Yöneticisi', deposit_operator: 'Yatırım Operatörü',
    withdrawal_operator: 'Çekim Operatörü', bank_checker: 'Banka Kontrol', viewer: 'İzleyici',
  }
  return roles[role] || role
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins}dk`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}sa`
  return `${Math.floor(hrs / 24)}g`
}

// Map a notification's type to the right list page. The dedicated detail
// page for individual transactions is being phased out in favor of the
// list views (Deposits / Withdrawals) which now own the full action flow
// (üzerime al → onayla / reddet, dekont upload, etc.). Settlement and
// teslim notifications go to their own pages.
function routeForNotification(n) {
  if (!n) return null
  // For txn-bound notifications, pass ?highlight={txnId} so the list view
  // can scroll to + pulse the relevant row instead of leaving the operator
  // to hunt for it.
  const query = n.txnId ? { highlight: String(n.txnId) } : undefined
  switch (n.type) {
    case 'deposit':
    case 'payment_notified':  // payment-notified events are deposit-side
      return { name: 'Deposits', query }
    case 'withdrawal':
      return { name: 'Withdrawals', query }
    case 'settlement':
      return { name: 'Settlements' }
    case 'teslim':
      return { name: 'Teslimler' }
    default:
      // Fallback: if we have a txnId but unknown type, take a guess from
      // any extra info, otherwise drop the user on the deposits list.
      return { name: 'Deposits', query }
  }
}

function handleNotifClick(n) {
  notifStore.markRead(n.id)
  notifMenu.value = false
  const target = routeForNotification(n)
  if (target) router.push(target)
}

function goToTxn(_id) {
  // Kept for backward compat with older callers; routes via the toast data
  // so we know which list page to land on.
  const target = routeForNotification(notifStore.toastData)
  if (target) router.push(target)
}
function fmtNotifAmount(v) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(v || 0) }

// ── Notification Modal ──
let notifModalTimer = null

function dismissNotifModal() {
  notifStore.showToast = false
  if (notifModalTimer) { clearTimeout(notifModalTimer); notifModalTimer = null }
}

// Watch for new toast and auto-dismiss after 15s
watch(() => notifStore.showToast, (val) => {
  if (notifModalTimer) { clearTimeout(notifModalTimer); notifModalTimer = null }
  if (val) {
    notifModalTimer = setTimeout(() => { notifStore.showToast = false }, 15000)
  }
})

function getNotifBg(color) {
  const map = {
    success: 'rgba(76,175,80,0.1)',
    error: 'rgba(239,68,68,0.1)',
    warning: 'rgba(251,191,36,0.1)',
    info: 'rgba(var(--sp-primary-rgb),0.1)',
    primary: 'rgba(var(--sp-primary-rgb),0.1)',
  }
  return map[color] || 'rgba(var(--sp-primary-rgb),0.08)'
}

// ── Clock ──
const elapsedTime = ref('')
const currentTime = ref('')
const currentDate = computed(() => new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
let timeInterval = null

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' })
}

function updateElapsed() {
  if (!auth.clockInAt) { elapsedTime.value = ''; return }
  const diff = Date.now() - new Date(auth.clockInAt).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const m = mins % 60
  elapsedTime.value = hrs > 0 ? `${hrs}sa ${m}dk` : `${m}dk`
}

async function handleClockIn() {
  clockingIn.value = true
  try {
    await auth.clockIn()
    updateElapsed()
  } finally { clockingIn.value = false }
}

// Heartbeat: send ping every 60s so backend knows we're alive
let heartbeatInterval = null

function startHeartbeat() {
  if (heartbeatInterval) return
  // Send immediately on start
  sendHeartbeat()
  heartbeatInterval = setInterval(sendHeartbeat, 60000)
}

function stopHeartbeat() {
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null }
}

async function sendHeartbeat() {
  if (auth.isSuperAdmin) return
  try {
    await api.post('/portal/heartbeat')
  } catch {
    // silent
  }
}

onMounted(() => {
  startHeartbeat()
  txnStore.subscribeRealtime()
  txnStore.fetchPendingCounts()
  updateElapsed()
  updateTime()
  clockInterval = setInterval(updateElapsed, 60000) // update every minute
  timeInterval = setInterval(updateTime, 1000) // update every second
})

onUnmounted(() => {
  stopHeartbeat()
  if (clockInterval) clearInterval(clockInterval)
  if (timeInterval) clearInterval(timeInterval)
  if (notifModalTimer) clearTimeout(notifModalTimer)
})

async function handleLogout() { await auth.logout(); router.push('/login') }
</script>

<style scoped>
/* ── Sidebar ── */
.sidebar {
  background: var(--sp-sidebar) !important;
  border-right: 1px solid var(--sp-accent-border) !important;
}

.sidebar :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--sp-scrollbar) transparent;
}
.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-thumb { background: var(--sp-scrollbar); border-radius: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }

:deep(.v-navigation-drawer) {
  position: fixed !important;
  height: 100vh !important;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 12px 16px;
  min-height: 70px;
  position: relative;
}
.sidebar-logo {
  width: 160px;
  height: 60px;
  object-fit: contain;
}
.sidebar-logo-rail {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.sidebar-collapse-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--sp-badge-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--sp-text);
  letter-spacing: -0.3px;
}

.brand-sub {
  font-size: 11px;
  color: var(--sp-text-hint);
  font-weight: 500;
}

.sidebar-divider {
  height: 1px;
  background: var(--sp-divider);
  margin: 0 12px;
}

.collapse-btn {
  color: var(--sp-text-dim) !important;
}
.collapse-btn:hover {
  color: var(--sp-text-secondary) !important;
}

/* ── Nav Items ── */
.nav-section {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--sp-text-faint);
  padding: 12px 16px 2px;
  text-transform: uppercase;
}

.nav-item {
  color: var(--sp-text-muted) !important;
  margin-bottom: 1px;
  border-radius: 10px !important;
  transition: all 0.15s ease;
}
.nav-item :deep(.v-list-item__content) {
  padding: 0;
}
.nav-item :deep(.v-list-item-title) {
  font-size: 13px !important;
  font-weight: 500;
}
.nav-item:hover {
  color: var(--sp-text-secondary) !important;
  background: var(--sp-accent-bg) !important;
}
.nav-active {
  background: var(--sp-accent-bg-active) !important;
  color: var(--sp-primary) !important;
}
.nav-active :deep(.v-icon) {
  color: var(--sp-primary) !important;
}

.nav-badge {
  color: white;
  font-size: 11px;
  font-weight: 800;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  animation: badge-pulse 2s ease-in-out infinite;
}
.nav-badge--deposit {
  background: linear-gradient(135deg, #43A047, #66BB6A);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}
.nav-badge--withdrawal {
  background: linear-gradient(135deg, #E53935, #EF5350);
  box-shadow: 0 0 8px rgba(239, 83, 80, 0.4);
}
.nav-badge--settlement {
  background: linear-gradient(135deg, #7B1FA2, #AB47BC);
  box-shadow: 0 0 8px rgba(171, 71, 188, 0.4);
}
@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* ── Sidebar Footer ── */
.sidebar-footer {
  padding: 6px 10px 10px;
  flex-shrink: 0;
}

.footer-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}
.footer-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-hint);
}
.footer-info-active {
  color: #66BB6A;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  padding: 4px;
  background: var(--sp-accent-bg-subtle);
  border-radius: 10px;
  border: 1px solid var(--sp-accent-border);
}
.footer-action-btn {
  flex: 1;
  color: var(--sp-text-muted) !important;
  min-width: 0 !important;
  padding: 0 !important;
}
.footer-action-btn:hover {
  color: var(--sp-text) !important;
}
.footer-action-logout {
  color: var(--sp-error-text, #E06C6C) !important;
}
.footer-action-logout:hover {
  background: rgba(224, 108, 108, 0.1) !important;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--sp-accent-bg-subtle);
  border: 1px solid var(--sp-accent-border);
}

.user-avatar {
  background: var(--sp-user-avatar) !important;
  color: var(--sp-text-secondary) !important;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: var(--sp-text-hint);
}

.settings-btn {
  color: var(--sp-text-dimmer) !important;
}
.settings-btn:hover {
  color: var(--sp-text-secondary) !important;
}

.theme-toggle-btn:hover {
  color: var(--sp-primary) !important;
}

/* ── Top Bar ── */
/* ── Mobile-only top bar ── */
.topbar {
  background: var(--sp-sidebar) !important;
  border-bottom: 1px solid var(--sp-accent-border) !important;
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1006 !important;
}
.topbar-inner {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 12px;
  height: 100%;
  gap: 8px;
}
.mobile-logo {
  height: 32px;
  object-fit: contain;
}
.topbar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--sp-text);
  letter-spacing: -0.2px;
}

/* ── Main Content ── */
.main-content {
  background: var(--sp-bg) !important;
  min-height: 100vh;
}

.content-wrapper {
  padding: 20px 24px;
  max-width: 100%;
}

/* ── Clock Overlay ── */
.clock-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
  background: var(--sp-overlay);
}

.clock-card {
  text-align: center;
  padding: 48px;
  max-width: 420px;
}

.clock-icon-wrap {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--sp-badge-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: clock-pulse 2s ease-in-out infinite;
}

@keyframes clock-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--sp-primary-rgb), 0.2); }
  50% { box-shadow: 0 0 0 20px rgba(var(--sp-primary-rgb), 0); }
}

.clock-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--sp-text);
}

.clock-sub {
  font-size: 14px;
  color: var(--sp-text-dimmer);
  max-width: 320px;
  margin: 0 auto;
}

.clock-btn {
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 24px rgba(var(--sp-primary-rgb), 0.3);
}
.clock-btn:hover {
  box-shadow: 0 8px 32px rgba(var(--sp-primary-rgb), 0.45);
}

.clock-time {
  font-size: 12px;
  color: var(--sp-text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Live Clock ── */
.live-clock {
  text-align: center;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--sp-accent-bg-subtle);
  border: 1px solid var(--sp-accent-border-strong);
}
.live-clock-time {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--sp-text-secondary);
  letter-spacing: 1px;
}

/* ── Clock Widget (sidebar) ── */
.clock-widget {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--sp-success-bg);
  border: 1px solid var(--sp-success-border);
}

.clock-widget-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(76, 175, 80, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clock-widget-time {
  font-size: 13px;
  font-weight: 700;
  color: #4CAF50;
  font-family: 'JetBrains Mono', monospace;
}

.clock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4CAF50;
  margin-right: 8px;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
  animation: dot-blink 2s ease-in-out infinite;
}

.clock-dot-sm {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4CAF50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Notification Dropdown ── */
.notif-dropdown {
  background: var(--sp-dropdown-bg);
  border: 1px solid var(--sp-accent-border-strong);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px var(--sp-shadow), 0 0 0 1px var(--sp-accent-border);
}

.notif-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--sp-divider);
}

.notif-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--sp-badge-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.notif-header-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--sp-text);
  letter-spacing: -0.2px;
}

.notif-count-badge {
  margin-left: 8px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 800;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.notif-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  background: var(--sp-accent-bg);
  color: var(--sp-text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.notif-action-btn:hover {
  background: var(--sp-accent-bg-active);
  color: var(--sp-primary);
}
.notif-action-clear {
  color: var(--sp-text-dim);
  background: transparent;
}
.notif-action-clear:hover {
  color: rgba(239, 68, 68, 0.7);
  background: rgba(239, 68, 68, 0.06);
}

.notif-list {
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sp-scrollbar) transparent;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  border-bottom: 1px solid var(--sp-accent-bg-subtle);
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-item:hover {
  background: var(--sp-accent-bg-subtle);
}

.notif-unread {
  background: var(--sp-accent-bg);
}

.notif-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.notif-item-content {
  flex: 1;
  min-width: 0;
}

.notif-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
  line-height: 1.3;
  margin-bottom: 2px;
}

.notif-item-msg {
  font-size: 12px;
  color: var(--sp-text-hint);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-item-time {
  font-size: 11px;
  color: var(--sp-text-ghost);
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
  font-weight: 500;
}

.notif-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sp-primary);
  flex-shrink: 0;
  margin-top: 5px;
  box-shadow: 0 0 6px rgba(var(--sp-primary-rgb), 0.4);
}

/* Empty state */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.notif-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--sp-accent-bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.notif-empty-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--sp-text-dimmer);
  margin-bottom: 4px;
}

.notif-empty-sub {
  font-size: 12px;
  color: var(--sp-text-ghost);
}

/* ── Pending Alerts (sidebar) ── */
.pending-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 8px 4px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: pending-pulse 2s ease-in-out infinite;
}
.pending-alert--deposit {
  background: var(--sp-warning-bg);
  border: 1px solid var(--sp-warning-border);
}
.pending-alert--deposit:hover {
  background: rgba(228, 163, 79, 0.14);
}
.pending-alert--withdrawal {
  background: var(--sp-error-bg);
  border: 1px solid var(--sp-error-border);
}
.pending-alert--withdrawal:hover {
  background: rgba(224, 108, 108, 0.14);
}
.pending-alert--settlement {
  background: rgba(171, 71, 188, 0.08);
  border: 1px solid rgba(171, 71, 188, 0.2);
}
.pending-alert--settlement:hover {
  background: rgba(171, 71, 188, 0.14);
}
.pending-alert-icon {
  flex-shrink: 0;
}
.pending-alert-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-text-secondary);
}
.pending-alert-count {
  font-weight: 800;
  color: var(--sp-text);
}
@keyframes pending-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

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
  background: #1E2030;
  border-radius: 20px;
  padding: 0;
  overflow: hidden;
  animation: notif-pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.notif-toast-card--success { border: 2px solid rgba(76, 175, 80, 0.5); box-shadow: 0 0 40px rgba(76, 175, 80, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--error   { border: 2px solid rgba(239, 83, 80, 0.5); box-shadow: 0 0 40px rgba(239, 83, 80, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--warning { border: 2px solid rgba(255, 183, 77, 0.5); box-shadow: 0 0 40px rgba(255, 183, 77, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--info    { border: 2px solid rgba(79, 195, 247, 0.5); box-shadow: 0 0 40px rgba(79, 195, 247, 0.2), 0 12px 40px rgba(0,0,0,0.3); }
.notif-toast-card--primary { border: 2px solid rgba(var(--sp-primary-rgb), 0.5); box-shadow: 0 0 40px rgba(var(--sp-primary-rgb), 0.2), 0 12px 40px rgba(0,0,0,0.3); }

@keyframes notif-pop-in {
  0% { opacity: 0; transform: translateX(40px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}

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
  border-radius: 8px;
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
  border-radius: 6px;
}
.notif-toast-label--success { background: rgba(76, 175, 80, 0.12); color: #66BB6A; }
.notif-toast-label--error   { background: rgba(239, 83, 80, 0.12); color: #EF5350; }
.notif-toast-label--warning { background: rgba(255, 183, 77, 0.12); color: #FFB74D; }
.notif-toast-label--info    { background: rgba(79, 195, 247, 0.12); color: #4FC3F7; }
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
.notif-toast-amount--success { color: #66BB6A; }
.notif-toast-amount--info    { color: #4FC3F7; }
.notif-toast-amount--warning { color: #FFB74D; }
.notif-toast-amount--error   { color: #EF5350; }
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
.notif-toast-simple--success .notif-toast-simple-title { color: #66BB6A; }
.notif-toast-simple--info    .notif-toast-simple-title { color: #4FC3F7; }
.notif-toast-simple--warning .notif-toast-simple-title { color: #FFB74D; }
.notif-toast-simple--error   .notif-toast-simple-title { color: #EF5350; }
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
  border-radius: 8px;
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
  border-radius: 12px;
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
.notif-toast-btn--success { background: linear-gradient(135deg, #43A047, #66BB6A); }
.notif-toast-btn--error   { background: linear-gradient(135deg, #E53935, #EF5350); }
.notif-toast-btn--warning { background: linear-gradient(135deg, #F57C00, #FFB74D); }
.notif-toast-btn--info    { background: linear-gradient(135deg, #0288D1, #4FC3F7); }
.notif-toast-btn--primary { background: linear-gradient(135deg, #5C6BC0, #7C8FE4); }

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
.notif-toast-timer-bar--success { background: linear-gradient(90deg, #43A047, #A5D6A7); }
.notif-toast-timer-bar--error   { background: linear-gradient(90deg, #E53935, #EF9A9A); }
.notif-toast-timer-bar--warning { background: linear-gradient(90deg, #F57C00, #FFE082); }
.notif-toast-timer-bar--info    { background: linear-gradient(90deg, #0288D1, #80DEEA); }
.notif-toast-timer-bar--primary { background: linear-gradient(90deg, var(--sp-primary), #A78BFA); }

.notif-toast-timer-animate {
  animation: notif-timer-shrink 15s linear forwards;
}

@keyframes notif-timer-shrink {
  0% { width: 100%; }
  100% { width: 0%; }
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

/* ── Global table overrides ── */
:deep(.v-data-table) {
  background: transparent !important;
  border-radius: 12px;
}
:deep(.v-data-table th) {
  font-weight: 700 !important;
  text-transform: uppercase;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  color: var(--sp-text-hint) !important;
  background: var(--sp-card-bg) !important;
  border-bottom: 2px solid var(--sp-divider) !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}
:deep(.v-data-table td) {
  border-bottom: 1px solid var(--sp-accent-bg-subtle) !important;
  font-size: 13px !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  color: var(--sp-text) !important;
}
:deep(.v-data-table tbody tr) {
  transition: background 0.15s;
}
:deep(.v-data-table tbody tr:hover td) {
  background: var(--sp-accent-bg-subtle) !important;
}
:deep(.v-data-table .v-data-table-footer) {
  border-top: 1px solid var(--sp-divider) !important;
}

/* ── Card default styling ── */
:deep(.v-card) {
  background: var(--sp-card-bg) !important;
  border: 1px solid var(--sp-card-border) !important;
}

:deep(.v-card .v-card-title) {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.1px;
}

/* ── Dialog overlay ── */
:deep(.v-overlay__content .v-card) {
  background: var(--sp-modal-bg) !important;
  border: 1px solid var(--sp-accent-border-strong) !important;
}

/* ── User dropdown menu ── */
.user-menu-list {
  background: var(--sp-modal-bg) !important;
  border: 1px solid var(--sp-accent-border-hover) !important;
}

/* ── Light mode — solid white, clean ── */
:global(.v-theme--lightComfort .sidebar) {
  background: #FFFFFF !important;
  border-right: 1px solid #E3E5EE !important;
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.03) !important;
}

:global(.v-theme--lightComfort .topbar) {
  background: #FFFFFF !important;
  border-bottom: 1px solid #E3E5EE !important;
}

:global(.v-theme--lightComfort .notif-dropdown) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px #E3E5EE !important;
}

.notif-toast--light .notif-toast-card {
  background: #FFFFFF !important;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18) !important;
}
.notif-toast--light .notif-toast-header {
  border-bottom-color: #E3E5EE;
}
.notif-toast--light .notif-toast-amount { color: #1E2030; }
.notif-toast--light .notif-toast-amount--success { color: #2E7D32 !important; }
.notif-toast--light .notif-toast-amount--info    { color: #0277BD !important; }
.notif-toast--light .notif-toast-amount--warning { color: #E65100 !important; }
.notif-toast--light .notif-toast-amount--error   { color: #C62828 !important; }
.notif-toast--light .notif-toast-id { color: #6B7084; }
.notif-toast--light .notif-toast-currency { color: #9CA3AF; }
.notif-toast--light .notif-toast-label--success { background: rgba(76, 175, 80, 0.1); color: #2E7D32; }
.notif-toast--light .notif-toast-label--error   { background: rgba(239, 83, 80, 0.1); color: #C62828; }
.notif-toast--light .notif-toast-label--warning { background: rgba(255, 152, 0, 0.1); color: #E65100; }
.notif-toast--light .notif-toast-label--info    { background: rgba(3, 169, 244, 0.1); color: #0277BD; }
.notif-toast--light .notif-toast-detail-row { background: #F5F6FA; }
.notif-toast--light .notif-toast-detail-label { color: #6B7084; }
.notif-toast--light .notif-toast-detail-value { color: #1E2030; }
.notif-toast--light .notif-toast-close { background: #F0F1F5; color: #6B7084; }
.notif-toast--light .notif-toast-close:hover { background: #E3E5EE; color: #1E2030; }
.notif-toast--light .notif-toast-btn--dismiss { background: #F0F1F5; color: #6B7084; }
.notif-toast--light .notif-toast-btn--dismiss:hover { background: #E3E5EE; color: #1E2030; }
.notif-toast--light .notif-toast-timer { background: #E3E5EE; }
.notif-toast--light .notif-toast-card--success { border-color: rgba(76, 175, 80, 0.4); box-shadow: 0 12px 40px rgba(76, 175, 80, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--info    { border-color: rgba(79, 195, 247, 0.4); box-shadow: 0 12px 40px rgba(79, 195, 247, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--warning { border-color: rgba(255, 183, 77, 0.4); box-shadow: 0 12px 40px rgba(255, 183, 77, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }
.notif-toast--light .notif-toast-card--error   { border-color: rgba(239, 83, 80, 0.4); box-shadow: 0 12px 40px rgba(239, 83, 80, 0.12), 0 8px 30px rgba(0,0,0,0.1) !important; }

/* ── Light mode table/card overrides ── */
:global(.v-theme--lightComfort .v-data-table th) {
  background: #F0F1F8 !important;
  color: #5A5F7A !important;
  border-bottom: 2px solid #D8DBE8 !important;
}
:global(.v-theme--lightComfort .v-data-table td) {
  color: #1E2030 !important;
  border-bottom: 1px solid #E3E5EE !important;
}
:global(.v-theme--lightComfort .v-data-table tbody tr:hover td) {
  background: #F0F1F8 !important;
}
:global(.v-theme--lightComfort .v-data-table .v-data-table-footer) {
  border-top: 1px solid #D8DBE8 !important;
  background: #F9FAFB !important;
}
:global(.v-theme--lightComfort .v-card) {
  background: #FFFFFF !important;
  border-color: #D8DBE8 !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06) !important;
}
/* Selected row — strong indigo highlight */
:global(.v-theme--lightComfort .active-row) {
  background: #D6D9F0 !important;
  border-left: 4px solid #4F63B8 !important;
}
:global(.v-theme--lightComfort .active-row td) {
  background: #D6D9F0 !important;
}
/* Pending transaction rows in light mode — red glow */
:global(.v-theme--lightComfort .new-transaction-row:not(.active-row)) {
  background: #FEE2E2 !important;
  border-left: 4px solid #EF4444 !important;
  animation: light-row-glow 1.5s ease-in-out infinite !important;
  box-shadow: inset 0 0 20px rgba(239, 68, 68, 0.08) !important;
}
:global(.v-theme--lightComfort .new-transaction-row:not(.active-row) td) {
  background: inherit !important;
}
@keyframes light-row-glow {
  0%, 100% { background: #FEE2E2 !important; box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.06) !important; }
  50% { background: #FECACA !important; box-shadow: inset 0 0 30px rgba(239, 68, 68, 0.12) !important; }
}

:global(.v-theme--lightComfort .user-card) {
  background: #F7F8FB;
  border-color: #E3E5EE;
}

:global(.v-theme--lightComfort .live-clock) {
  background: #F7F8FB;
  border-color: #E3E5EE;
}

:global(.v-theme--lightComfort .nav-active) {
  background: #EEF0FA !important;
  color: #4F63B8 !important;
}

:global(.v-theme--lightComfort .nav-item:hover) {
  background: #F5F6FB !important;
}

:global(.v-theme--lightComfort .pending-alert--deposit) {
  background: #FFF8E1;
  border-color: #FFE0B2;
}

:global(.v-theme--lightComfort .pending-alert--withdrawal) {
  background: #FEECEC;
  border-color: #F5C6C6;
}

:global(.v-theme--lightComfort .pending-alert--settlement) {
  background: #F3E5F5;
  border-color: #CE93D8;
}

:global(.v-theme--lightComfort .clock-overlay) {
  background: rgba(241, 243, 249, 0.97);
}

/* Tablet */
@media (max-width: 960px) {
  .content-wrapper { padding: 16px; }
}

/* Mobile */
@media (max-width: 960px) {
  .sidebar-brand {
    padding-top: 56px;
    min-height: 110px;
  }
}
@media (max-width: 600px) {
  .content-wrapper { padding: 12px 8px; }
  .notif-toast { top: 12px; right: 12px; left: 12px; }
  .notif-toast-amount { font-size: 20px; padding: 12px 14px 4px; }
  .notif-toast-details { padding: 0 16px 12px; }
  .notif-toast-actions { padding: 0 16px 16px; }
  .notif-toast-btn { padding: 10px 16px; font-size: 13px; }
  .clock-card { padding: 28px 20px; max-width: 90vw; }
  .clock-icon-wrap { width: 72px; height: 72px; }
  .clock-title { font-size: 20px; }
}

/* ── Global responsive overrides ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 600px;
  }
}

@media (max-width: 600px) {
  :deep(.v-data-table td) {
    font-size: 12px !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }
  :deep(.v-data-table th) {
    font-size: 10px !important;
  }
  /* Dialogs fit mobile screens */
  :deep(.v-dialog > .v-overlay__content) {
    max-width: calc(100vw - 24px) !important;
    margin: 12px !important;
  }
  /* Cards reduce padding on mobile */
  :deep(.v-card-text) {
    padding: 12px !important;
  }
  :deep(.v-card-title) {
    padding: 12px !important;
    font-size: 14px !important;
  }
  :deep(.v-btn-toggle) {
    flex-wrap: wrap;
  }
}
</style>
