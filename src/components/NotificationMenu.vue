<template>
  <div class="notif-dropdown">
    <div class="notif-header">
      <div class="d-flex align-center">
        <div class="notif-header-icon">
          <v-icon size="16" color="var(--sp-primary)">mdi-bell</v-icon>
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
    <div class="notif-list" :style="{ maxHeight }">
      <template v-if="notifStore.notifications.length">
        <div
          v-for="n in notifStore.notifications"
          :key="n.id"
          :class="['notif-item', { 'notif-unread': !n.read }]"
          @click="onSelect(n)"
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
</template>

<script setup>
import { useNotificationStore } from '@/stores/notifications'

/**
 * Bildirim listesi (ust cubuktaki zil ikonunun acilir icerigi).
 *
 * Masaustu ve mobil ayni bileseni kullaniyor; onceden iki ayri kopya
 * vardi ve biri guncellenince digeri geride kaliyordu.
 */
defineProps({
  maxHeight: { type: String, default: '380px' },
})
const emit = defineEmits(['select'])
const notifStore = useNotificationStore()

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins}dk`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}sa`
  return `${Math.floor(hrs / 24)}g`
}

function getNotifBg(color) {
  return {
    success: 'rgba(102,241,189,0.1)',
    error: 'rgba(255,142,130,0.1)',
    warning: 'rgba(255,190,91,0.1)',
    info: 'rgba(112,169,255,0.1)',
    primary: 'rgba(var(--sp-primary-rgb),0.1)',
  }[color] || 'rgba(var(--sp-primary-rgb),0.08)'
}

function onSelect(n) {
  notifStore.markRead(n.id)
  emit('select', n)
}
</script>

<style scoped>
/* ── Notification Dropdown ── */
.notif-dropdown {
  background: var(--sp-dropdown-bg);
  border: 1px solid var(--sp-accent-border-strong);
  border-radius: 0;
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
  border-radius: 0;
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
  background: var(--sp-accent-error);
  color: white;
  font-size: 10px;
  font-weight: 800;
  min-width: 20px;
  height: 20px;
  border-radius: 0;
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
  border-radius: 0;
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
  color: rgba(255,142,130, 0.7);
  background: rgba(255,142,130, 0.06);
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
  border-radius: 0;
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
  border-radius: 0;
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
@keyframes notif-pop-in {
  0% { opacity: 0; transform: translateX(40px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes notif-timer-shrink {
  0% { width: 100%; }
  100% { width: 0%; }
}
:global(.v-theme--lightComfort .notif-dropdown) {
  background: #FFFFFF;
  border-color: #E3E5EE;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px #E3E5EE !important;
}
</style>
