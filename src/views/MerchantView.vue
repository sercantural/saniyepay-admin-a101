<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-store</v-icon>
        Bayiler
        <v-spacer />
        <v-btn v-if="can('merchants.manage')" color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon> Bayi Ekle
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="merchants" :loading="loading" density="compact" no-data-text="Bayi bulunamadı" loading-text="Yükleniyor...">
        <template v-slot:item.name="{ item }">
          <div>{{ item.name }}</div>
          <!-- Eksi limiti yalnizca tanimliysa gosteriliyor; 0 olan bayide rozet yok. -->
          <v-chip v-if="Number(item.overdraft_limit) > 0" size="x-small" variant="tonal" color="warning" class="mt-1">
            <v-icon start size="11">mdi-cash-minus</v-icon> Eksi limiti: {{ fmtLimit(item.overdraft_limit) }}
          </v-chip>
        </template>
        <template v-slot:item.total_deposits="{ item }">
          <span class="mc-deposit" style="font-weight: 600;">{{ fmtAmount(item.total_deposits) }}</span>
        </template>
        <template v-slot:item.total_withdrawals="{ item }">
          <span class="mc-withdrawal" style="font-weight: 600;">{{ fmtAmount(item.total_withdrawals) }}</span>
        </template>
        <template v-slot:item.total_commission="{ item }">
          <div class="mc-commission" style="font-weight: 600;">{{ fmtAmount(item.total_commission) }}</div>
          <div class="mc-sub-text" style="font-size: 10px;">
            Y: {{ fmtAmount(item.deposit_fees) }} · Ç: {{ fmtAmount(item.withdrawal_fees) }}
          </div>
        </template>
        <template v-slot:item.available_balance="{ item }">
          <span :class="item.available_balance >= 0 ? 'mc-deposit' : 'mc-negative'" style="font-weight: 700; font-size: 14px;">
            {{ fmtAmount(item.available_balance) }}
          </span>
          <div class="mc-sub-text" style="font-size: 10px;">{{ item.currency }}</div>
        </template>
        <template v-slot:item.fee_rates="{ item }">
          <div style="font-size: 12px;">
            <span class="mc-deposit">Y %{{ item.deposit_fee_percent }}</span>
            <span class="mc-separator"> · </span>
            <span class="mc-withdrawal">Ç %{{ item.withdrawal_fee_percent }}</span>
            <span class="mc-separator"> · </span>
            <span class="mc-settlement">M %{{ item.settlement_fee_percent }}</span>
          </div>
        </template>
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small">
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </v-chip>
        </template>
        <template v-slot:item.api_access="{ item }">
          <v-chip :color="item.api_access === 'live_enabled' ? 'success' : 'warning'" size="small">
            {{ item.api_access === 'live_enabled' ? 'Canlı' : 'Sadece Sandbox' }}
          </v-chip>
        </template>
        <template v-slot:item.users_count="{ item }">
          <v-chip size="small" variant="tonal" color="primary" @click="openUserManager(item)">
            {{ item.users_count || 0 }} kullanıcı
          </v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn v-if="can('merchants.manage')" size="small" variant="text" color="primary" @click="editMerchant(item)" title="Düzenle">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn v-if="can('merchants.users')" size="small" variant="text" color="info" @click="openUserManager(item)" title="Kullanıcılar">
            <v-icon>mdi-account-group</v-icon>
          </v-btn>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-if="can('merchants.regenerate_key')" size="small" variant="text" color="warning" v-bind="props" title="Anahtar Yönetimi">
                <v-icon>mdi-key-variant</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-subheader>Anahtar Oluştur / Yenile</v-list-subheader>
              <v-list-item prepend-icon="mdi-key" @click="regenerateKey(item.id, 'live_api_key')">
                <v-list-item-title>Canlı API Key</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-flask" @click="regenerateKey(item.id, 'sandbox_api_key')">
                <v-list-item-title>Sandbox API Key</v-list-item-title>
              </v-list-item>
              <v-divider class="my-1" />
              <v-list-item prepend-icon="mdi-shield-key" @click="regenerateKey(item.id, 'webhook_secret')">
                <v-list-item-title>Webhook Secret (Canlı)</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-shield-key-outline" @click="regenerateKey(item.id, 'sandbox_webhook_secret')">
                <v-list-item-title>Sandbox Webhook Secret</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn
            size="small"
            variant="text"
            :color="item.api_access === 'live_enabled' ? 'error' : 'success'"
            @click="toggleAccess(item)"
            :title="item.api_access === 'live_enabled' ? 'Canlı Erişimi Kapat' : 'Canlı Erişimi Aç'"
          >
            <v-icon>{{ item.api_access === 'live_enabled' ? 'mdi-shield-off' : 'mdi-shield-check' }}</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Oluştur/Düzenle Diyaloğu -->
    <v-dialog v-model="dialog" max-width="680" scrollable>
      <v-card class="merchant-dialog">
        <v-card-title class="d-flex align-center pa-4" style="border-bottom: 1px solid var(--sp-border)">
          <v-icon start color="primary" size="22">{{ editing ? 'mdi-pencil' : 'mdi-store-plus' }}</v-icon>
          <span class="font-weight-bold">{{ editing ? 'Bayiyi Düzenle' : 'Bayi Oluştur' }}</span>
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="dialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>

        <v-card-text class="pa-0" style="max-height: 75vh">
          <v-tabs v-model="dialogTab" bg-color="transparent" density="compact" class="px-4 pt-2">
            <v-tab value="general" size="small"><v-icon start size="16">mdi-store</v-icon> Genel</v-tab>
            <v-tab value="fees" size="small"><v-icon start size="16">mdi-percent</v-icon> Komisyon & Limitler</v-tab>
            <v-tab value="webhook" size="small"><v-icon start size="16">mdi-webhook</v-icon> Callback</v-tab>
            <v-tab v-if="editing" value="settings" size="small"><v-icon start size="16">mdi-cog</v-icon> Ayarlar</v-tab>
            <v-tab v-if="!editing" value="owner" size="small"><v-icon start size="16">mdi-account-key</v-icon> Sahip</v-tab>
          </v-tabs>

          <div class="pa-5">
            <!-- ── Genel ── -->
            <div v-show="dialogTab === 'general'">
              <v-text-field v-model="form.name" label="Bayi Adı" variant="outlined" density="compact" class="mb-3" />
              <v-text-field v-model="form.currency" label="Para Birimi" variant="outlined" density="compact" />
            </div>

            <!-- ── Komisyon & Limitler ── -->
            <div v-show="dialogTab === 'fees'">
              <div class="section-label"><v-icon size="14" class="mr-1">mdi-percent</v-icon> Komisyon Oranları</div>
              <v-row dense>
                <v-col cols="4"><v-text-field v-model.number="form.deposit_fee_percent" label="Yatırım %" type="number" step="0.01" min="0" max="100" variant="outlined" density="compact" /></v-col>
                <v-col cols="4"><v-text-field v-model.number="form.withdrawal_fee_percent" label="Çekim %" type="number" step="0.01" min="0" max="100" variant="outlined" density="compact" /></v-col>
                <v-col cols="4"><v-text-field v-model.number="form.settlement_fee_percent" label="Mutabakat %" type="number" step="0.01" min="0" max="100" variant="outlined" density="compact" /></v-col>
              </v-row>

              <div class="section-label mt-4"><v-icon size="14" class="mr-1">mdi-cash-minus</v-icon> Tutar Limitleri</div>
              <v-row dense>
                <v-col cols="6"><v-text-field v-model.number="form.min_deposit_amount" label="Min Yatırım" type="number" step="0.01" min="0" variant="outlined" density="compact" placeholder="Limitsiz" clearable /></v-col>
                <v-col cols="6"><v-text-field v-model.number="form.max_deposit_amount" label="Max Yatırım" type="number" step="0.01" min="0" variant="outlined" density="compact" placeholder="Limitsiz" clearable /></v-col>
                <v-col cols="6"><v-text-field v-model.number="form.min_withdrawal_amount" label="Min Çekim" type="number" step="0.01" min="0" variant="outlined" density="compact" placeholder="Limitsiz" clearable /></v-col>
                <v-col cols="6"><v-text-field v-model.number="form.max_withdrawal_amount" label="Max Çekim" type="number" step="0.01" min="0" variant="outlined" density="compact" placeholder="Limitsiz" clearable /></v-col>
              </v-row>

              <!-- Eksi limiti: bayi bakiyesinin sifirin altina inebilecegi
                   ust sinir. 0 = eksiye dusemez (varsayilan). -->
              <div class="section-label mt-4"><v-icon size="14" class="mr-1">mdi-bank-minus</v-icon> Eksi Limiti</div>
              <v-text-field
                v-model.number="form.overdraft_limit"
                label="Eksi Limiti (TRY)"
                type="number"
                step="0.01"
                min="0"
                variant="outlined"
                density="compact"
                hint="Bayi bu tutara kadar eksiye düşebilir. 0 = eksiye düşemez."
                persistent-hint
                @blur="normalizeOverdraft"
              />

              <div class="section-label mt-4"><v-icon size="14" class="mr-1">mdi-speedometer</v-icon> Hız Limitleri</div>
              <div class="limit-grid">
                <div class="limit-card">
                  <div class="limit-card-head">Oyuncu Limiti</div>
                  <div class="limit-card-desc">Bir oyuncunun belirli süre içinde oluşturabileceği maks işlem sayısı</div>
                  <v-row dense class="mt-2">
                    <v-col cols="6"><v-text-field v-model.number="form.player_rate_limit" label="İstek Sayısı" type="number" variant="outlined" density="compact" suffix="istek" /></v-col>
                    <v-col cols="6"><v-text-field v-model.number="form.player_rate_window" label="Süre" type="number" variant="outlined" density="compact" suffix="dakika" /></v-col>
                  </v-row>
                </div>
                <div class="limit-card">
                  <div class="limit-card-head">Eşzamanlı İşlemler</div>
                  <div class="limit-card-desc">Aynı anda aktif olabilecek maks işlem sayısı</div>
                  <v-row dense class="mt-2">
                    <v-col cols="6"><v-text-field v-model.number="form.max_concurrent_deposits" label="Yatırım" type="number" variant="outlined" density="compact" /></v-col>
                    <v-col cols="6"><v-text-field v-model.number="form.max_concurrent_withdrawals" label="Çekim" type="number" variant="outlined" density="compact" /></v-col>
                  </v-row>
                </div>
                <div class="limit-card">
                  <div class="limit-card-head">İşlem Oluşturma</div>
                  <div class="limit-card-desc">Dakikada oluşturulabilecek maks yeni işlem sayısı</div>
                  <v-text-field v-model.number="form.creation_rate_limit" label="Limit" type="number" variant="outlined" density="compact" suffix="/ dakika" class="mt-2" />
                </div>
                <div class="limit-card">
                  <div class="limit-card-head">Süre Dolumu</div>
                  <div class="limit-card-desc">İşlemlerin otomatik olarak süresi dolacağı süre</div>
                  <v-row dense class="mt-2">
                    <v-col cols="6"><v-text-field v-model.number="form.deposit_expiry_minutes" label="Yatırım" type="number" variant="outlined" density="compact" suffix="dk" /></v-col>
                    <v-col cols="6"><v-text-field v-model.number="form.withdrawal_expiry_minutes" label="Çekim" type="number" variant="outlined" density="compact" suffix="dk" /></v-col>
                  </v-row>
                </div>
              </div>
            </div>

            <!-- ── Callback ── -->
            <div v-show="dialogTab === 'webhook'">
              <div class="d-flex ga-2 mb-4">
                <v-btn :variant="form.callback_mode === 'single' ? 'flat' : 'tonal'" :color="form.callback_mode === 'single' ? 'primary' : 'default'" size="small" @click="form.callback_mode = 'single'" class="flex-grow-1">Tek URL</v-btn>
                <v-btn :variant="form.callback_mode === 'separate' ? 'flat' : 'tonal'" :color="form.callback_mode === 'separate' ? 'primary' : 'default'" size="small" @click="form.callback_mode = 'separate'" class="flex-grow-1">Ayrı URL</v-btn>
              </div>
              <template v-if="form.callback_mode === 'single'">
                <v-text-field v-model="form.webhook_url" label="Callback URL" placeholder="https://siteniz.com/callback" variant="outlined" density="compact" />
              </template>
              <template v-else>
                <v-text-field v-model="form.deposit_webhook_url" label="Yatırım Callback URL" placeholder="https://siteniz.com/deposit-callback" variant="outlined" density="compact" class="mb-3" />
                <v-text-field v-model="form.withdrawal_webhook_url" label="Çekim Callback URL" placeholder="https://siteniz.com/withdrawal-callback" variant="outlined" density="compact" />
              </template>

              <!-- Sandbox'in kendi adresi: test bildirimleri bayinin canli
                   ucuna gitmemeli. Bos birakilirsa sandbox bildirimi
                   gonderilmiyor (canli akis etkilenmiyor). -->
              <v-text-field
                v-model="form.sandbox_webhook_url"
                label="Sandbox Callback URL"
                placeholder="https://test.siteniz.com/callback"
                variant="outlined"
                density="compact"
                class="mt-3"
                hint="Test işlemlerinin bildirimleri buraya gider. Boşsa sandbox bildirimi gönderilmez."
                persistent-hint
              />
            </div>

            <!-- ── Ayarlar (sadece düzenlemede) ── -->
            <div v-if="editing" v-show="dialogTab === 'settings'">
              <v-select v-model="form.api_access" :items="accessOptions" item-title="text" item-value="value" label="API Erişimi" variant="outlined" density="compact" class="mb-3" />
              <div class="switch-group">
                <div class="switch-item">
                  <div><div class="switch-label">Aktif</div><div class="switch-desc">Bayinin tüm işlemlerini açıp kapatır</div></div>
                  <v-switch v-model="form.is_active" color="success" hide-details density="compact" />
                </div>
                <div class="switch-item">
                  <div><div class="switch-label">Test Modu</div><div class="switch-desc">Sadece sandbox erişimine izin verir</div></div>
                  <v-switch v-model="form.sandbox_mode" color="warning" hide-details density="compact" />
                </div>
                <div class="switch-item">
                  <div><div class="switch-label">İstek İmzalama</div><div class="switch-desc">API isteklerinde HMAC imza doğrulamasını zorunlu kılar</div></div>
                  <v-switch v-model="form.require_request_signature" color="secondary" hide-details density="compact" />
                </div>
                <div class="switch-item">
                  <div>
                    <div class="switch-label">Doğrudan API</div>
                    <div class="switch-desc">Banka IBAN'larını JSON olarak döndürür. Kapalıyken bayi yalnızca ödeme sayfasını (iframe) kullanabilir.</div>
                  </div>
                  <v-switch v-model="form.allow_direct_api" color="warning" hide-details density="compact" />
                </div>
              </div>

              <!-- IP Whitelist — empty means "allow any IP" (live mode only). -->
              <div class="mt-4 pt-3" style="border-top: 1px solid var(--sp-divider)">
                <div class="d-flex align-center justify-space-between mb-1">
                  <div class="switch-label">IP Beyaz Listesi</div>
                  <v-chip size="x-small" variant="tonal" color="primary">{{ form.allowed_ips.length }} / 20</v-chip>
                </div>
                <div class="switch-desc mb-3">
                  Boş bırakılırsa canlı API erişimi tüm IP'lerden izinlidir. IP eklenirse yalnızca bu IP'lerden gelen istekler kabul edilir.
                </div>
                <div class="d-flex ga-2 mb-2">
                  <v-text-field
                    v-model="newIpInput"
                    placeholder="Örn: 203.0.113.42"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @keyup.enter="addIp"
                  />
                  <v-btn color="primary" variant="tonal" @click="addIp" :disabled="form.allowed_ips.length >= 20" prepend-icon="mdi-plus">Ekle</v-btn>
                </div>
                <v-alert v-if="ipError" type="error" density="compact" variant="tonal" class="mb-2">{{ ipError }}</v-alert>
                <div v-if="form.allowed_ips.length === 0" class="text-caption" style="color: var(--sp-text-muted)">
                  Liste boş — tüm IP'lerden erişim açık.
                </div>
                <div v-else class="d-flex flex-wrap ga-1">
                  <v-chip
                    v-for="(ip, idx) in form.allowed_ips"
                    :key="ip"
                    size="small"
                    variant="tonal"
                    color="primary"
                    closable
                    style="font-family: 'JetBrains Mono', monospace"
                    @click:close="removeIp(idx)"
                  >{{ ip }}</v-chip>
                </div>
              </div>
            </div>

            <!-- ── Sahip (sadece oluştururken) ── -->
            <div v-if="!editing" v-show="dialogTab === 'owner'">
              <v-alert type="info" variant="tonal" density="compact" class="mb-4" rounded="lg">
                Bu bilgiler bayinin panele giriş yapması için kullanılacaktır.
              </v-alert>
              <v-text-field v-model="form.owner_name" label="Ad Soyad" variant="outlined" density="compact" class="mb-3" />
              <v-text-field v-model="form.owner_email" label="E-posta" type="email" variant="outlined" density="compact" class="mb-3" />
              <v-text-field v-model="form.owner_password" label="Şifre" :type="showOwnerPw ? 'text' : 'password'" :append-inner-icon="showOwnerPw ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showOwnerPw = !showOwnerPw" variant="outlined" density="compact" hint="En az 8 karakter" persistent-hint />
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4" style="border-top: 1px solid var(--sp-border)">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">İptal</v-btn>
          <v-btn color="primary" variant="elevated" @click="save" :loading="saving">
            <v-icon start size="16">mdi-content-save</v-icon> Kaydet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Kullanıcı Yönetimi Diyaloğu -->
    <v-dialog v-model="userDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-account-group</v-icon>
          {{ selectedMerchant?.name }} — Kullanıcılar
          <v-spacer />
          <v-btn v-if="can('merchants.users')" size="small" color="primary" variant="tonal" @click="openCreateUser">
            <v-icon start size="small">mdi-plus</v-icon> Kullanıcı Ekle
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="userHeaders"
            :items="merchantUsers"
            :loading="usersLoading"
            density="compact"
            no-data-text="Kullanıcı bulunamadı"
          >
            <template v-slot:item.role="{ item }">
              <v-chip size="small" variant="tonal">{{ userRoleName(item.role) }}</v-chip>
            </template>
            <template v-slot:item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'grey'" size="x-small">
                {{ item.is_active ? 'Aktif' : 'Pasif' }}
              </v-chip>
            </template>
            <template v-slot:item.last_login_at="{ item }">
              {{ item.last_login_at ? new Date(item.last_login_at).toLocaleString('tr-TR') : 'Hiç' }}
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn size="small" variant="text" color="primary" @click="openEditUser(item)" title="Düzenle">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn size="small" variant="text" color="warning" @click="openResetPassword(item)" title="Şifre Sıfırla">
                <v-icon>mdi-lock-reset</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="userDialog = false">Kapat</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Kullanıcı Oluştur/Düzenle Diyaloğu -->
    <v-dialog v-model="userFormDialog" max-width="450">
      <v-card>
        <v-card-title>{{ editingUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="userForm.name" label="Ad Soyad" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="userForm.email" label="E-posta" type="email" variant="outlined" density="compact" class="mb-2" />
          <v-text-field
            v-model="userForm.password"
            :label="editingUser ? 'Yeni Şifre (değiştirmemek için boş bırakın)' : 'Şifre'"
            :type="showUserPw ? 'text' : 'password'"
            :append-inner-icon="showUserPw ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showUserPw = !showUserPw"
            variant="outlined"
            density="compact"
            class="mb-2"
            :hint="editingUser ? '' : 'En az 8 karakter'"
          />
          <v-select
            v-model="userForm.role"
            :items="merchantRoleOptions"
            item-title="text"
            item-value="value"
            label="Rol"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-switch v-if="editingUser" v-model="userForm.is_active" label="Aktif" color="success" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="userFormDialog = false">İptal</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveUser" :loading="savingUser">
            {{ editingUser ? 'Güncelle' : 'Oluştur' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Şifre Sıfırlama Diyaloğu -->
    <v-dialog v-model="resetPwDialog" max-width="400">
      <v-card>
        <v-card-title>
          <v-icon start color="warning">mdi-lock-reset</v-icon>
          Şifre Sıfırla
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            <strong>{{ resetPwUser?.name }}</strong> ({{ resetPwUser?.email }}) kullanıcısının şifresi değiştirilecek.
          </v-alert>
          <v-text-field
            v-model="newPassword"
            label="Yeni Şifre"
            :type="showResetPw ? 'text' : 'password'"
            :append-inner-icon="showResetPw ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showResetPw = !showResetPw"
            variant="outlined"
            hint="En az 8 karakter"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="resetPwDialog = false">İptal</v-btn>
          <v-btn color="warning" variant="elevated" @click="resetPassword" :loading="resettingPw" :disabled="!newPassword || newPassword.length < 8">
            Şifreyi Değiştir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- API Anahtarları Diyaloğu -->
    <v-dialog v-model="keyDialog" max-width="600">
      <v-card>
        <v-card-title class="text-warning">
          <v-icon start>mdi-alert</v-icon> {{ keyDialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            Bu bilgileri şimdi kaydedin. Tekrar gösterilmeyecektir.
          </v-alert>

          <div v-if="newKeys.owner_email" class="mb-3">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">Sahip Giriş E-postası</div>
            <v-text-field :model-value="newKeys.owner_email" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.owner_email)" />
          </div>

          <div v-if="newKeys.live_api_key" class="mb-3">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">Canlı API Key</div>
            <v-text-field :model-value="newKeys.live_api_key" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.live_api_key)" />
          </div>

          <div v-if="newKeys.sandbox_api_key" class="mb-3">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">Sandbox API Key</div>
            <v-text-field :model-value="newKeys.sandbox_api_key" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.sandbox_api_key)" />
          </div>

          <div v-if="newKeys.webhook_secret" class="mb-3">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">Webhook Secret (Canlı)</div>
            <v-text-field :model-value="newKeys.webhook_secret" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.webhook_secret)" />
          </div>

          <div v-if="newKeys.sandbox_webhook_secret" class="mb-3">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">Sandbox Webhook Secret</div>
            <v-text-field :model-value="newKeys.sandbox_webhook_secret" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.sandbox_webhook_secret)" />
          </div>

          <div v-if="newKeys.single_key">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">{{ newKeys.single_label || 'API Key' }}</div>
            <v-text-field :model-value="newKeys.single_key" readonly variant="outlined" density="compact" append-inner-icon="mdi-content-copy" @click:append-inner="copyField(newKeys.single_key)" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="keyDialog = false">Kapat</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { ref, reactive, onMounted } from 'vue'
import api from '@/plugins/axios'


const auth = useAuthStore()
// Ekran ici eylemler de izne bagli: menuyu gormek ile islem
// yapabilmek ayni sey degil.
const can = (p) => auth.can(p) || auth.isSuperAdmin
const merchants = ref([])
const loading = ref(false)
const dialog = ref(false)
const dialogTab = ref('general')
const keyDialog = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref(null)
const newKeys = ref({})
const keyDialogTitle = ref('API Anahtarları')
const showOwnerPw = ref(false)
const form = reactive({
  name: '', callback_mode: 'single', webhook_url: '', deposit_webhook_url: '', withdrawal_webhook_url: '',
  sandbox_webhook_url: '',
  currency: 'TRY', deposit_fee_percent: 0, withdrawal_fee_percent: 0, settlement_fee_percent: 0,
  min_deposit_amount: null, max_deposit_amount: null,
  min_withdrawal_amount: null, max_withdrawal_amount: null,
  overdraft_limit: 0,
  api_access: 'sandbox_only', is_active: true, sandbox_mode: false, require_request_signature: false, allow_direct_api: false,
  player_rate_limit: 5, player_rate_window: 10, max_concurrent_deposits: 50, max_concurrent_withdrawals: 50, creation_rate_limit: 200, deposit_expiry_minutes: 60, withdrawal_expiry_minutes: 1440,
  allowed_ips: [],
  owner_name: '', owner_email: '', owner_password: '',
})

// Eksi limiti negatif veya bos gonderilmesin: alan temizlenince 0'a doner.
function normalizeOverdraft() {
  const v = Number(form.overdraft_limit)
  form.overdraft_limit = Number.isFinite(v) && v > 0 ? v : 0
}
// Rozet icin tam sayi bicimi (50.000); kurus gerekirse gosterilir.
function fmtLimit(val) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(val) || 0)
}

// IP whitelist UI state
const newIpInput = ref('')
const ipError = ref('')
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/

function addIp() {
  ipError.value = ''
  const v = (newIpInput.value || '').trim()
  if (!v) { ipError.value = 'IP girin.'; return }
  if (!IP_REGEX.test(v)) { ipError.value = 'Geçerli bir IPv4/IPv6 adresi girin.'; return }
  if (form.allowed_ips.includes(v)) { ipError.value = 'Bu IP zaten listede.'; return }
  if (form.allowed_ips.length >= 20) { ipError.value = 'En fazla 20 IP eklenebilir.'; return }
  form.allowed_ips.push(v)
  newIpInput.value = ''
}
function removeIp(idx) {
  form.allowed_ips.splice(idx, 1)
}

// User management
const userDialog = ref(false)
const userFormDialog = ref(false)
const resetPwDialog = ref(false)
const selectedMerchant = ref(null)
const merchantUsers = ref([])
const usersLoading = ref(false)
const editingUser = ref(false)
const editingUserId = ref(null)
const savingUser = ref(false)
const showUserPw = ref(false)
const showResetPw = ref(false)
const resetPwUser = ref(null)
const newPassword = ref('')
const resettingPw = ref(false)
const userForm = reactive({ name: '', email: '', password: '', role: 'owner', is_active: true })

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') { snackbarText.value = text; snackbarColor.value = color; snackbar.value = true }
function fmtAmount(val) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(val || 0) }

const accessOptions = [
  { text: 'Sadece Sandbox', value: 'sandbox_only' },
  { text: 'Canlı Erişim Açık', value: 'live_enabled' },
]

const merchantRoleOptions = [
  { text: 'Sahip', value: 'owner' },
  { text: 'Analist', value: 'analyst' },
  { text: 'Geliştirici', value: 'developer' },
]

function userRoleName(role) {
  return { owner: 'Sahip', analyst: 'Analist', developer: 'Geliştirici' }[role] || role
}

const headers = [
  { title: 'Bayi Adı', key: 'name' },
  { title: 'Yatırım', key: 'total_deposits' },
  { title: 'Çekim', key: 'total_withdrawals' },
  { title: 'Komisyon', key: 'total_commission' },
  { title: 'Bakiye', key: 'available_balance' },
  { title: 'Oran', key: 'fee_rates', sortable: false },
  { title: 'API Erişimi', key: 'api_access' },
  { title: 'Kullanıcılar', key: 'users_count' },
  { title: 'Durum', key: 'is_active' },
  { title: '', key: 'actions', sortable: false },
]

const userHeaders = [
  { title: 'Ad Soyad', key: 'name' },
  { title: 'E-posta', key: 'email' },
  { title: 'Rol', key: 'role' },
  { title: 'Durum', key: 'is_active' },
  { title: 'Son Giriş', key: 'last_login_at' },
  { title: '', key: 'actions', sortable: false },
]

// Merchant CRUD
function openCreate() {
  editing.value = false
  dialogTab.value = 'general'
  Object.assign(form, {
    name: '', callback_mode: 'single', webhook_url: '', deposit_webhook_url: '', withdrawal_webhook_url: '',
  sandbox_webhook_url: '',
    currency: 'TRY', deposit_fee_percent: 0, withdrawal_fee_percent: 0, settlement_fee_percent: 0,
    min_deposit_amount: null, max_deposit_amount: null,
    min_withdrawal_amount: null, max_withdrawal_amount: null,
    overdraft_limit: 0,
    api_access: 'sandbox_only', is_active: true, sandbox_mode: false, require_request_signature: false, allow_direct_api: false,
  player_rate_limit: 5, player_rate_window: 10, max_concurrent_deposits: 50, max_concurrent_withdrawals: 50, creation_rate_limit: 200, deposit_expiry_minutes: 60, withdrawal_expiry_minutes: 1440,
    allowed_ips: [],
    owner_name: '', owner_email: '', owner_password: '',
  })
  newIpInput.value = ''
  ipError.value = ''
  showOwnerPw.value = false
  dialog.value = true
}

function editMerchant(m) {
  editing.value = true
  editingId.value = m.id
  dialogTab.value = 'general'
  Object.assign(form, {
    name: m.name, callback_mode: m.callback_mode || 'single',
    webhook_url: m.webhook_url || '', deposit_webhook_url: m.deposit_webhook_url || '',
    withdrawal_webhook_url: m.withdrawal_webhook_url || '',
    sandbox_webhook_url: m.sandbox_webhook_url || '',
    currency: m.currency, deposit_fee_percent: m.deposit_fee_percent || 0,
    withdrawal_fee_percent: m.withdrawal_fee_percent || 0,
    settlement_fee_percent: m.settlement_fee_percent || 0,
    min_deposit_amount: m.min_deposit_amount || null,
    max_deposit_amount: m.max_deposit_amount || null,
    min_withdrawal_amount: m.min_withdrawal_amount || null,
    max_withdrawal_amount: m.max_withdrawal_amount || null,
    overdraft_limit: Number(m.overdraft_limit) > 0 ? Number(m.overdraft_limit) : 0,
    api_access: m.api_access, is_active: m.is_active, sandbox_mode: m.sandbox_mode, require_request_signature: m.require_request_signature || false, allow_direct_api: m.allow_direct_api || false,
    player_rate_limit: m.player_rate_limit ?? 5, player_rate_window: m.player_rate_window ?? 10,
    max_concurrent_deposits: m.max_concurrent_deposits ?? 50, max_concurrent_withdrawals: m.max_concurrent_withdrawals ?? 50,
    creation_rate_limit: m.creation_rate_limit ?? 200,
    deposit_expiry_minutes: m.deposit_expiry_minutes ?? 60, withdrawal_expiry_minutes: m.withdrawal_expiry_minutes ?? 1440,
    allowed_ips: Array.isArray(m.allowed_ips) ? [...m.allowed_ips] : [],
  })
  newIpInput.value = ''
  ipError.value = ''
  dialog.value = true
}

async function toggleAccess(merchant) {
  const newAccess = merchant.api_access === 'live_enabled' ? 'sandbox_only' : 'live_enabled'
  const label = newAccess === 'live_enabled' ? 'canlı erişim açılacak' : 'sadece sandbox erişimine düşürülecek'
  if (!confirm(`${merchant.name} için ${label}. Onaylıyor musunuz?`)) return
  await api.put(`/portal/merchants/${merchant.id}`, { api_access: newAccess })
  showSnack(newAccess === 'live_enabled' ? 'Canlı erişim açıldı' : 'Sandbox moduna alındı')
  await loadMerchants()
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/portal/merchants/${editingId.value}`, form)
      showSnack('Bayi güncellendi')
    } else {
      const { data } = await api.post('/portal/merchants', form)
      keyDialogTitle.value = 'Yeni Bayi — Anahtarlar & Giriş Bilgileri'
      newKeys.value = {
        owner_email: data.owner_email,
        live_api_key: data.live_api_key,
        sandbox_api_key: data.sandbox_api_key,
        webhook_secret: data.webhook_secret,
        sandbox_webhook_secret: data.sandbox_webhook_secret,
      }
      keyDialog.value = true
      showSnack('Bayi oluşturuldu')
    }
    dialog.value = false
    await loadMerchants()
  } catch (e) {
    showSnack(e.response?.data?.message || 'İşlem başarısız', 'error')
  } finally { saving.value = false }
}

async function regenerateKey(merchantId, keyType) {
  const labels = {
    live_api_key: 'Canlı API Key', sandbox_api_key: 'Sandbox API Key',
    webhook_secret: 'Webhook Secret (Canlı)', sandbox_webhook_secret: 'Sandbox Webhook Secret',
  }
  if (!confirm(`${labels[keyType]} yeniden oluşturulacak. Mevcut anahtar geçersiz olacak. Onaylıyor musunuz?`)) return
  const { data } = await api.post(`/portal/merchants/${merchantId}/regenerate-key`, { key_type: keyType })
  keyDialogTitle.value = data.key_label
  newKeys.value = { single_key: data.key_value, single_label: data.key_label }
  keyDialog.value = true
  showSnack(`${data.key_label} oluşturuldu`)
}

// User management
async function openUserManager(merchant) {
  selectedMerchant.value = merchant
  usersLoading.value = true
  userDialog.value = true
  const { data } = await api.get(`/portal/merchants/${merchant.id}/users`)
  merchantUsers.value = data
  usersLoading.value = false
}

function openCreateUser() {
  editingUser.value = false
  Object.assign(userForm, { name: '', email: '', password: '', role: 'owner', is_active: true })
  showUserPw.value = false
  userFormDialog.value = true
}

function openEditUser(user) {
  editingUser.value = true
  editingUserId.value = user.id
  Object.assign(userForm, { name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active })
  showUserPw.value = false
  userFormDialog.value = true
}

function openResetPassword(user) {
  resetPwUser.value = user
  newPassword.value = ''
  showResetPw.value = false
  resetPwDialog.value = true
}

async function saveUser() {
  savingUser.value = true
  try {
    if (editingUser.value) {
      const data = { ...userForm }
      if (!data.password) delete data.password
      await api.put(`/portal/merchants/${selectedMerchant.value.id}/users/${editingUserId.value}`, data)
      showSnack('Kullanıcı güncellendi')
    } else {
      await api.post(`/portal/merchants/${selectedMerchant.value.id}/users`, userForm)
      showSnack('Kullanıcı oluşturuldu')
    }
    userFormDialog.value = false
    // Reload users
    const { data } = await api.get(`/portal/merchants/${selectedMerchant.value.id}/users`)
    merchantUsers.value = data
    await loadMerchants() // refresh user counts
  } catch (e) {
    showSnack(e.response?.data?.message || 'İşlem başarısız', 'error')
  } finally { savingUser.value = false }
}

async function resetPassword() {
  resettingPw.value = true
  try {
    await api.put(`/portal/merchants/${selectedMerchant.value.id}/users/${resetPwUser.value.id}`, { password: newPassword.value })
    showSnack(`${resetPwUser.value.name} şifresi değiştirildi`)
    resetPwDialog.value = false
  } catch (e) {
    showSnack(e.response?.data?.message || 'Şifre sıfırlama başarısız', 'error')
  } finally { resettingPw.value = false }
}

function copyField(text) { navigator.clipboard.writeText(text); showSnack('Panoya kopyalandı') }
async function loadMerchants() { loading.value = true; const { data } = await api.get('/portal/merchants'); merchants.value = data; loading.value = false }
onMounted(() => loadMerchants())
</script>

<style scoped>
.mc-deposit { color: var(--sp-accent-success); }
.mc-withdrawal { color: var(--sp-accent-cyan); }
.mc-settlement { color: var(--sp-accent-purple); }
.mc-commission { color: var(--sp-accent-amber); }
.mc-negative { color: var(--sp-accent-error); }
.mc-sub-text { color: var(--sp-text-hint); }
.mc-separator { color: var(--sp-text-ghost); }

:global(.v-theme--lightComfort .mc-deposit) { color: var(--sp-accent-success); }
:global(.v-theme--lightComfort .mc-withdrawal) { color: var(--sp-accent-info); }
:global(.v-theme--lightComfort .mc-commission) { color: var(--sp-accent-amber); }
:global(.v-theme--lightComfort .mc-negative) { color: var(--sp-accent-error); }

/* ── Merchant Dialog ── */
.merchant-dialog { overflow: hidden; }

.section-label {
  display: flex; align-items: center;
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--sp-text-muted);
  margin-bottom: 8px;
}

.limit-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.limit-card {
  padding: 14px; border-radius: 0;
  background: var(--sp-surface-1, rgba(102,241,189,0.03));
  border: 1px solid var(--sp-border);
}
.limit-card-head {
  font-size: 12px; font-weight: 700; color: var(--sp-text);
  margin-bottom: 2px;
}
.limit-card-desc {
  font-size: 10px; color: var(--sp-text-dim);
  line-height: 1.4;
}

.switch-group { display: flex; flex-direction: column; gap: 4px; }
.switch-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-radius: 0;
  background: var(--sp-surface-1, rgba(102,241,189,0.03));
  border: 1px solid var(--sp-border);
}
.switch-label { font-size: 13px; font-weight: 600; color: var(--sp-text); }
.switch-desc { font-size: 10px; color: var(--sp-text-dim); margin-top: 1px; }

/* ── Responsive ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 800px;
  }
}
</style>
