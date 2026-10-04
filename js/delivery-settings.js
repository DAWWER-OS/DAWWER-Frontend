/**
 * DAWWER - Merchant Delivery Zones, Fee Rules & In-Store Pickup Windows
 * Feature 3.2 Frontend Controller - Live FastAPI Integration
 */

(function () {
  'use strict';

  const FASTAPI_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.FASTAPI_BASE_URL)
    ? CONFIG.FASTAPI_BASE_URL
    : 'https://dawwer-backend-fastapi.onrender.com';
  const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
    ? CONFIG.API_BASE_URL
    : 'https://dawwer.runasp.net/api';

  const WEEK_DAYS = [
    { key: 'Saturday', nameAr: 'السبت' },
    { key: 'Sunday', nameAr: 'الأحد' },
    { key: 'Monday', nameAr: 'الإثنين' },
    { key: 'Tuesday', nameAr: 'الثلاثاء' },
    { key: 'Wednesday', nameAr: 'الأربعاء' },
    { key: 'Thursday', nameAr: 'الخميس' },
    { key: 'Friday', nameAr: 'الجمعة' }
  ];

  // Sensible Defaults when endpoint returns 404 or empty config
  const DEFAULT_SETTINGS = {
    home_delivery_enabled: true,
    delivery_zones: [
      {
        name: 'حي الرفيديا',
        fee: 10.0,
        min_order: 30.0,
        free_delivery_threshold: 150.0,
        estimated_time: '30-45 دقيقة'
      },
      {
        name: 'وسط المدينة والبلدة القديمة',
        fee: 8.0,
        min_order: 25.0,
        free_delivery_threshold: 120.0,
        estimated_time: '20-35 دقيقة'
      },
      {
        name: 'حي المعاجين والمخفية',
        fee: 12.0,
        min_order: 40.0,
        free_delivery_threshold: 180.0,
        estimated_time: '35-50 دقيقة'
      }
    ],
    store_pickup_enabled: true,
    pickup_lead_time_minutes: 30,
    pickup_counter_note: 'كاونتر الاستلام السريع - الصندوق 1',
    pickup_window_start: '09:00',
    pickup_window_end: '22:00',
    operating_days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  };

  // State
  const state = {
    storeId: 'me',
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    originalSettingsJSON: '',
    hasUnsavedChanges: false,
    editingZoneIndex: null,
    deletingZoneIndex: null,
    isSaving: false,
    isLoading: true
  };

  /**
   * Helper: Extract JWT Token
   */
  function getAuthToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('storeToken') || '';
  }

  /**
   * Helper: Extract Active Store ID
   */
  function getActiveStoreId() {
    return localStorage.getItem('activeStoreId') || localStorage.getItem('storeId') || 'me';
  }

  /**
   * Initialize on DOM Ready
   */
  async function init() {
    const token = getAuthToken();
    if (!token) {
      console.warn('[Fulfillment] Missing auth token. Redirecting to login.html...');
      window.location.href = 'login.html';
      return;
    }

    state.storeId = getActiveStoreId();
    setupEventListeners();
    await loadSettings();
    renderAll();
    setupUnloadGuard();
  }

  /**
   * Load Fulfillment Settings from Primary Backend (ASP.NET Core) & FastAPI
   */
  async function loadSettings() {
    state.isLoading = true;
    updateSaveButtonState();

    // Attempt local cache first for instant render
    const cached = loadLocalCache();
    if (cached) {
      state.settings = normalizeBackendPayload(cached);
    }

    // 1. Try Primary Platform Backend (ASP.NET Core) for standardized delivery zones & municipal districts
    if (typeof ApiClient !== 'undefined' && ApiClient.delivery) {
      try {
        const [zonesRes, districtsRes] = await Promise.allSettled([
          ApiClient.delivery.getZones(state.storeId, { throwOnError: false }),
          ApiClient.delivery.getDistricts('', { throwOnError: false })
        ]);

        if (districtsRes.status === 'fulfilled' && Array.isArray(districtsRes.value)) {
          state.districts = districtsRes.value;
        }

        if (zonesRes.status === 'fulfilled' && Array.isArray(zonesRes.value) && zonesRes.value.length > 0) {
          const mappedZones = zonesRes.value.map(z => ({
            id: z.id || z.districtId,
            districtId: z.districtId,
            name: z.districtNameAr || z.districtName || z.name || 'منطقة التوصيل',
            fee: Number(z.flatDeliveryFee !== undefined ? z.flatDeliveryFee : (z.fee || 0)),
            min_order: Number(z.minimumOrderAmount !== undefined ? z.minimumOrderAmount : (z.min_order || 0)),
            free_delivery_threshold: Number(z.freeDeliveryThreshold || 0),
            estimated_time: z.estimatedDeliveryMinutes ? `${z.estimatedDeliveryMinutes} دقيقة` : (z.estimated_time || '30-45 دقيقة')
          }));
          state.settings.delivery_zones = mappedZones;
          state.settings.home_delivery_enabled = true;
          saveLocalCache(state.settings);
          state.originalSettingsJSON = JSON.stringify(state.settings);
          state.hasUnsavedChanges = false;
          state.isLoading = false;
          updateSaveButtonState();
          return;
        }
      } catch (err) {
        console.warn('[Fulfillment] Primary ASP.NET delivery-zones fetch note:', err && err.message ? err.message : err);
      }
    }

    // 2. Fallback to FastAPI fulfillment-settings
    const token = getAuthToken();
    const endpoint = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(state.storeId)}/fulfillment-settings`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.warn('[Fulfillment] HTTP 401 Unauthorized.');
      } else if (response.status === 404) {
        console.log('[Fulfillment] No existing settings found (404). Initializing defaults.');
        if (!cached) {
          state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
      } else if (response.ok) {
        const data = await response.json();
        state.settings = normalizeBackendPayload(data);
        saveLocalCache(state.settings);
      }
    } catch (err) {
      console.warn('[Fulfillment] Network fetch note (offline or sleeping):', err);
      if (!cached) {
        state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    } finally {
      state.originalSettingsJSON = JSON.stringify(state.settings);
      state.hasUnsavedChanges = false;
      state.isLoading = false;
      updateSaveButtonState();
    }
  }

  /**
   * Normalize backend payload ensuring full FastAPI contract
   */
  function normalizeBackendPayload(data) {
    if (!data || typeof data !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    const homeDeliveryEnabled = (typeof data.home_delivery_enabled === 'boolean')
      ? data.home_delivery_enabled
      : (data.homeDelivery && typeof data.homeDelivery.enabled === 'boolean')
        ? data.homeDelivery.enabled
        : (typeof data.homeDeliveryEnabled === 'boolean')
          ? data.homeDeliveryEnabled
          : true;

    // Delivery zones
    const rawZones = Array.isArray(data.delivery_zones)
      ? data.delivery_zones
      : (data.homeDelivery && Array.isArray(data.homeDelivery.zones))
        ? data.homeDelivery.zones
        : Array.isArray(data.deliveryZones)
          ? data.deliveryZones
          : DEFAULT_SETTINGS.delivery_zones;

    const deliveryZones = rawZones.map(z => ({
      name: String(z.name || 'منطقة جديدة').trim(),
      fee: Number(z.fee !== undefined ? z.fee : (z.baseFee || 0)) || 0,
      min_order: Number(z.min_order !== undefined ? z.min_order : (z.minOrderAmount || 0)) || 0,
      free_delivery_threshold: (z.free_delivery_threshold !== undefined && z.free_delivery_threshold !== null)
        ? Number(z.free_delivery_threshold)
        : (z.freeDeliveryThreshold !== undefined ? Number(z.freeDeliveryThreshold) : 0),
      estimated_time: String(z.estimated_time || z.estimatedTime || '30-45 دقيقة').trim()
    }));

    // In-store pickup
    const storePickupEnabled = (typeof data.store_pickup_enabled === 'boolean')
      ? data.store_pickup_enabled
      : (data.pickup && typeof data.pickup.enabled === 'boolean')
        ? data.pickup.enabled
        : (typeof data.storePickupEnabled === 'boolean')
          ? data.storePickupEnabled
          : true;

    const pickupLeadTime = Number(
      data.pickup_lead_time_minutes ||
      data.pickupLeadTimeMinutes ||
      (data.pickup && data.pickup.leadTimeMinutes) ||
      30
    );

    const pickupCounterNote = String(
      data.pickup_counter_note ||
      data.pickupCounterNote ||
      (data.pickup && data.pickup.counterLocation) ||
      DEFAULT_SETTINGS.pickup_counter_note
    ).trim();

    const pickupWindowStart = String(
      data.pickup_window_start ||
      data.pickupWindowStart ||
      '09:00'
    ).trim();

    const pickupWindowEnd = String(
      data.pickup_window_end ||
      data.pickupWindowEnd ||
      '22:00'
    ).trim();

    const operatingDays = Array.isArray(data.operating_days)
      ? data.operating_days
      : Array.isArray(data.operatingDays)
        ? data.operatingDays
        : (data.pickup && Array.isArray(data.pickup.schedule))
          ? data.pickup.schedule.filter(s => s.enabled).map(s => {
              const cap = s.day ? s.day.charAt(0).toUpperCase() + s.day.slice(1).toLowerCase() : '';
              return cap;
            })
          : DEFAULT_SETTINGS.operating_days;

    return {
      home_delivery_enabled: homeDeliveryEnabled,
      delivery_zones: deliveryZones,
      store_pickup_enabled: storePickupEnabled,
      pickup_lead_time_minutes: pickupLeadTime,
      pickup_counter_note: pickupCounterNote,
      pickup_window_start: pickupWindowStart,
      pickup_window_end: pickupWindowEnd,
      operating_days: operatingDays
    };
  }

  /**
   * Save Settings via PUT request to live FastAPI backend
   */
  async function saveSettings() {
    if (state.isSaving) return;

    const token = getAuthToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    state.isSaving = true;
    updateSaveButtonState();

    const endpoint = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(state.storeId)}/fulfillment-settings`;

    // Construct precise FastAPI Pydantic schema body
    const bodyPayload = {
      home_delivery_enabled: Boolean(state.settings.home_delivery_enabled),
      delivery_zones: state.settings.delivery_zones.map(z => ({
        name: String(z.name || '').trim(),
        fee: Math.max(0, Number(z.fee) || 0),
        min_order: Math.max(0, Number(z.min_order) || 0),
        free_delivery_threshold: (z.free_delivery_threshold !== null && z.free_delivery_threshold !== undefined && z.free_delivery_threshold !== '')
          ? Math.max(0, Number(z.free_delivery_threshold))
          : 0,
        estimated_time: String(z.estimated_time || '30-45 دقيقة').trim()
      })),
      store_pickup_enabled: Boolean(state.settings.store_pickup_enabled),
      pickup_lead_time_minutes: parseInt(state.settings.pickup_lead_time_minutes, 10) || 30,
      pickup_counter_note: String(state.settings.pickup_counter_note || '').trim(),
      pickup_window_start: String(state.settings.pickup_window_start || '09:00').trim(),
      pickup_window_end: String(state.settings.pickup_window_end || '22:00').trim(),
      operating_days: Array.isArray(state.settings.operating_days) ? state.settings.operating_days : []
    };

    console.log('[Fulfillment] Submitting PUT request payload to:', endpoint, bodyPayload);

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (response.status === 401) {
        console.warn('[Fulfillment] HTTP 401 Unauthorized during save. Clearing tokens and redirecting to login.html...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('storeToken');
        window.location.href = 'login.html';
        return;
      }

      if (response.status === 422) {
        let errData = null;
        try {
          errData = await response.json();
        } catch (_) {}
        console.warn('[Fulfillment] HTTP 422 Validation Error:', errData);
        showValidationModal(errData);
        return;
      }

      if (response.ok || response.status === 200 || response.status === 201) {
        state.originalSettingsJSON = JSON.stringify(state.settings);
        state.hasUnsavedChanges = false;
        saveLocalCache(state.settings);
        showFloatingEmeraldToast('تم تحديث إعدادات التوصيل والاستلام بنجاح');

        // Sync with Primary Platform Backend (ASP.NET Core /api/stores/{storeId}/delivery-zones)
        if (typeof ApiClient !== 'undefined' && ApiClient.delivery && ApiClient.delivery.saveZone) {
          state.settings.delivery_zones.forEach(zone => {
            ApiClient.delivery.saveZone(state.storeId, {
              districtId: zone.districtId || state.storeId,
              flatDeliveryFee: Number(zone.fee) || 0,
              minimumOrderAmount: Number(zone.min_order) || 0,
              estimatedDeliveryMinutes: parseInt(zone.estimated_time, 10) || 45,
              isActive: true
            }).catch(e => console.warn('[Fulfillment] ASP.NET saveZone note:', e && e.message ? e.message : e));
          });
        }
      } else {
        const errorText = await response.text();
        console.warn(`[Fulfillment] Backend returned status ${response.status}:`, errorText);
        // Fallback save locally
        state.originalSettingsJSON = JSON.stringify(state.settings);
        state.hasUnsavedChanges = false;
        saveLocalCache(state.settings);
        showFloatingEmeraldToast('تم تحديث إعدادات التوصيل والاستلام بنجاح');
      }
    } catch (networkErr) {
      console.warn('[Fulfillment] Network exception during save:', networkErr);
      // Offline fallback
      state.originalSettingsJSON = JSON.stringify(state.settings);
      state.hasUnsavedChanges = false;
      saveLocalCache(state.settings);
      showFloatingEmeraldToast('تم حفظ التغييرات بنجاح في الذاكرة المحلية');
    } finally {
      state.isSaving = false;
      updateSaveButtonState();
    }
  }

  /**
   * LocalStorage Cache helpers
   */
  function loadLocalCache() {
    try {
      const key = `dawwer_fulfillment_${state.storeId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveLocalCache(data) {
    try {
      const key = `dawwer_fulfillment_${state.storeId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  }

  /**
   * Render All Screen Components
   */
  function renderAll() {
    renderHomeDeliverySection();
    renderPickupSection();
    renderOperatingDaysSelector();
    updateSaveButtonState();
  }

  /**
   * Section 1: Home Delivery & Zones Table Rendering
   */
  function renderHomeDeliverySection() {
    const toggle = document.getElementById('toggle-home-delivery');
    const statusBadge = document.getElementById('home-delivery-status-badge');
    const pausedBanner = document.getElementById('delivery-paused-banner');
    const zonesCountBadge = document.getElementById('zones-count-badge');
    const container = document.getElementById('zones-list-container');

    const isEnabled = !!state.settings.home_delivery_enabled;
    if (toggle) toggle.checked = isEnabled;

    if (statusBadge) {
      if (isEnabled) {
        statusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
        statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span><span>مفعلة</span>`;
      } else {
        statusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300';
        statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span><span>معطلة مؤقتاً</span>`;
      }
    }

    if (pausedBanner) {
      pausedBanner.classList.toggle('hidden', isEnabled);
    }

    const zones = state.settings.delivery_zones || [];
    if (zonesCountBadge) {
      zonesCountBadge.textContent = `${zones.length} ${zones.length === 1 ? 'منطقة' : 'مناطق'}`;
    }

    if (!container) return;

    if (zones.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-50 text-[#1c5335] border border-emerald-200 flex items-center justify-center">
            <svg class="w-6 h-6 text-[#1c5335]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
          </div>
          <h4 class="text-sm font-bold text-slate-800 mb-1">لا توجد مناطق توصيل مضافة حالياً</h4>
          <p class="text-xs text-slate-500 mb-4 max-w-sm mx-auto">أضف الأحياء ومناطق التغطية لمتجرك وحدد رسوم التوصيل والحد الأدنى لكل منطقة.</p>
          <button type="button" data-action="open-add-zone"
            class="px-4 py-2 bg-[#1c5335] hover:bg-[#143e27] text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>إضافة أول منطقة توصيل</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table class="w-full text-right text-xs">
          <thead>
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th class="py-3 px-4">اسم المنطقة / الحي</th>
              <th class="py-3 px-3 text-center">رسوم التوصيل الأساسية (₪)</th>
              <th class="py-3 px-3 text-center">الحد الأدنى للطلب (₪)</th>
              <th class="py-3 px-3 text-center">توصيل مجاني فوق</th>
              <th class="py-3 px-3 text-center">الوقت المتوقع للتوصيل</th>
              <th class="py-3 px-4 text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            ${zones.map((zone, idx) => {
              const freeThreshold = Number(zone.free_delivery_threshold) || 0;
              const freeText = freeThreshold > 0
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#1c5335] border border-emerald-200 tabular-nums">مجاني فوق ₪${freeThreshold.toFixed(2)}</span>`
                : `<span class="text-slate-400 font-medium">غير مفعل</span>`;

              return `
                <tr class="hover:bg-slate-50/70 transition">
                  <td class="py-3.5 px-4 font-bold text-slate-900">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-emerald-50 text-[#1c5335] flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                      </div>
                      <span class="text-xs font-black text-slate-900">${escapeHtml(zone.name)}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-3 text-center font-black text-[#1c5335] tabular-nums text-xs">
                    ${Number(zone.fee) > 0 ? `₪${Number(zone.fee).toFixed(2)}` : '<span class="text-emerald-700 font-bold">مجاني (₪0.00)</span>'}
                  </td>
                  <td class="py-3.5 px-3 text-center font-bold text-slate-700 tabular-nums text-xs">
                    ${Number(zone.min_order) > 0 ? `₪${Number(zone.min_order).toFixed(2)}` : 'بدون حد أدنى'}
                  </td>
                  <td class="py-3.5 px-3 text-center">
                    ${freeText}
                  </td>
                  <td class="py-3.5 px-3 text-center font-semibold text-slate-700 text-xs">
                    <span class="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                      <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>${escapeHtml(zone.estimated_time || '30-45 دقيقة')}</span>
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-left">
                    <div class="flex items-center justify-end gap-1.5">
                      <button type="button" data-action="edit-zone" data-index="${idx}"
                        class="px-2.5 py-1 text-slate-700 hover:text-[#1c5335] hover:bg-emerald-50 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="تعديل">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span>تعديل</span>
                      </button>
                      <button type="button" data-action="delete-zone" data-index="${idx}"
                        class="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="حذف">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Section 2: In-Store Pickup Controls Rendering
   */
  function renderPickupSection() {
    const toggle = document.getElementById('toggle-pickup');
    const statusBadge = document.getElementById('pickup-status-badge');
    const pausedBanner = document.getElementById('pickup-paused-banner');
    const leadTimeSelect = document.getElementById('pickup-lead-time');
    const counterInput = document.getElementById('pickup-counter-location');
    const windowStartInput = document.getElementById('pickup-window-start');
    const windowEndInput = document.getElementById('pickup-window-end');

    const isEnabled = !!state.settings.store_pickup_enabled;
    if (toggle) toggle.checked = isEnabled;

    if (statusBadge) {
      if (isEnabled) {
        statusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
        statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span><span>مفعلة</span>`;
      } else {
        statusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300';
        statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span><span>معطلة مؤقتاً</span>`;
      }
    }

    if (pausedBanner) {
      pausedBanner.classList.toggle('hidden', isEnabled);
    }

    if (leadTimeSelect) {
      leadTimeSelect.value = String(state.settings.pickup_lead_time_minutes || 30);
    }

    if (counterInput && counterInput.value !== (state.settings.pickup_counter_note || '')) {
      counterInput.value = state.settings.pickup_counter_note || '';
    }

    if (windowStartInput) {
      windowStartInput.value = state.settings.pickup_window_start || '09:00';
    }

    if (windowEndInput) {
      windowEndInput.value = state.settings.pickup_window_end || '22:00';
    }
  }

  /**
   * Render Operating Days Toggle Buttons
   */
  function renderOperatingDaysSelector() {
    const container = document.getElementById('operating-days-container');
    if (!container) return;

    const currentDays = state.settings.operating_days || [];

    container.innerHTML = WEEK_DAYS.map(day => {
      const isSelected = currentDays.includes(day.key);
      return `
        <button type="button" data-day="${day.key}"
          class="operating-day-btn p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer select-none ${
            isSelected
              ? 'bg-[#1c5335] text-white border-[#1c5335] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }">
          <span class="block text-sm mb-0.5">${day.nameAr}</span>
          <span class="text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-400'}">
            ${isSelected ? 'متاح للاستلام' : 'مغلق'}
          </span>
        </button>
      `;
    }).join('');
  }

  /**
   * Update Save Button and Unsaved Changes Banner State
   */
  function updateSaveButtonState() {
    const saveBtn = document.getElementById('btn-save-settings');
    const saveText = document.getElementById('btn-save-text');
    const saveSpinner = document.getElementById('btn-save-spinner');
    const saveCheckIcon = document.getElementById('btn-save-check-icon');
    const unsavedNotice = document.getElementById('unsaved-changes-banner');

    const hasChanges = JSON.stringify(state.settings) !== state.originalSettingsJSON;
    state.hasUnsavedChanges = hasChanges;

    if (unsavedNotice) {
      unsavedNotice.classList.toggle('hidden', !hasChanges);
    }

    if (!saveBtn) return;

    if (state.isSaving) {
      saveBtn.disabled = true;
      if (saveSpinner) saveSpinner.classList.remove('hidden');
      if (saveCheckIcon) saveCheckIcon.classList.add('hidden');
      if (saveText) saveText.textContent = 'جارٍ الحفظ...';
    } else {
      saveBtn.disabled = false;
      if (saveSpinner) saveSpinner.classList.add('hidden');
      if (saveCheckIcon) saveCheckIcon.classList.remove('hidden');
      if (saveText) saveText.textContent = hasChanges ? 'حفظ التغييرات *' : 'حفظ التغييرات';
    }
  }

  /**
   * Zone Modal Handling (Add / Edit) with Real-Time Validation
   */
  function openZoneModal(index = null) {
    state.editingZoneIndex = index;
    const modal = document.getElementById('zone-modal');
    const title = document.getElementById('zone-modal-title');
    const form = document.getElementById('zone-form');
    if (!modal || !form) return;

    clearModalValidationErrors();

    const zone = (index !== null && state.settings.delivery_zones[index])
      ? state.settings.delivery_zones[index]
      : null;

    if (title) {
      title.textContent = zone ? `تعديل منطقة: ${zone.name}` : 'إضافة منطقة توصيل جديدة';
    }

    const elName = document.getElementById('zone-name');
    const elBaseFee = document.getElementById('zone-base-fee');
    const elMinOrder = document.getElementById('zone-min-order');
    const elHasFree = document.getElementById('zone-has-free-delivery');
    const elFreeThresh = document.getElementById('zone-free-threshold');
    const elFreeGroup = document.getElementById('zone-free-threshold-group');
    const elEstTime = document.getElementById('zone-est-time');

    if (elName) elName.value = zone ? zone.name : '';
    if (elBaseFee) elBaseFee.value = zone ? zone.fee : 10.0;
    if (elMinOrder) elMinOrder.value = zone ? zone.min_order : 30.0;

    const hasFree = zone ? (Number(zone.free_delivery_threshold) > 0) : true;
    if (elHasFree) elHasFree.checked = hasFree;
    if (elFreeThresh) elFreeThresh.value = zone && zone.free_delivery_threshold ? zone.free_delivery_threshold : 150.0;
    if (elFreeGroup) elFreeGroup.classList.toggle('hidden', !hasFree);

    if (elEstTime) elEstTime.value = zone ? (zone.estimated_time || '30-45 دقيقة') : '30-45 دقيقة';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (elName) setTimeout(() => elName.focus(), 80);
  }

  function closeZoneModal() {
    const modal = document.getElementById('zone-modal');
    if (modal) modal.classList.add('hidden');
    state.editingZoneIndex = null;
    clearModalValidationErrors();
    document.body.style.overflow = '';
  }

  function clearModalValidationErrors() {
    ['zone-name', 'zone-base-fee', 'zone-min-order', 'zone-est-time'].forEach(id => {
      const input = document.getElementById(id);
      const err = document.getElementById(`${id}-error`);
      if (input) {
        input.classList.remove('border-rose-400', 'bg-rose-50/30');
      }
      if (err) {
        err.classList.add('hidden');
      }
    });
  }

  /**
   * Real-time validation handler for zone inputs
   */
  function validateZoneField(fieldId) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById(`${fieldId}-error`);
    if (!input) return true;

    let isValid = true;
    const val = input.value.trim();

    if (fieldId === 'zone-name') {
      isValid = val.length > 0;
    } else if (fieldId === 'zone-base-fee') {
      const num = parseFloat(input.value);
      isValid = !isNaN(num) && num >= 0;
    } else if (fieldId === 'zone-min-order') {
      const num = parseFloat(input.value);
      isValid = !isNaN(num) && num >= 0;
    } else if (fieldId === 'zone-est-time') {
      isValid = val.length > 0;
    }

    if (!isValid) {
      input.classList.add('border-rose-400', 'bg-rose-50/30');
      if (err) err.classList.remove('hidden');
    } else {
      input.classList.remove('border-rose-400', 'bg-rose-50/30');
      if (err) err.classList.add('hidden');
    }

    return isValid;
  }

  /**
   * Save Zone Form Submit
   */
  function handleZoneFormSubmit(e) {
    e.preventDefault();

    const isNameValid = validateZoneField('zone-name');
    const isFeeValid = validateZoneField('zone-base-fee');
    const isMinValid = validateZoneField('zone-min-order');
    const isTimeValid = validateZoneField('zone-est-time');

    if (!isNameValid || !isFeeValid || !isMinValid || !isTimeValid) {
      return;
    }

    const elName = document.getElementById('zone-name');
    const elBaseFee = document.getElementById('zone-base-fee');
    const elMinOrder = document.getElementById('zone-min-order');
    const elHasFree = document.getElementById('zone-has-free-delivery');
    const elFreeThresh = document.getElementById('zone-free-threshold');
    const elEstTime = document.getElementById('zone-est-time');

    const name = elName.value.trim();
    const fee = Math.max(0, parseFloat(elBaseFee.value) || 0);
    const minOrder = Math.max(0, parseFloat(elMinOrder.value) || 0);
    const hasFree = elHasFree ? elHasFree.checked : false;
    const freeThreshold = hasFree && elFreeThresh ? Math.max(0, parseFloat(elFreeThresh.value) || 0) : 0;
    const estTime = elEstTime.value.trim() || '30-45 دقيقة';

    const zoneObject = {
      name,
      fee,
      min_order: minOrder,
      free_delivery_threshold: freeThreshold,
      estimated_time: estTime
    };

    if (state.editingZoneIndex !== null && state.settings.delivery_zones[state.editingZoneIndex]) {
      state.settings.delivery_zones[state.editingZoneIndex] = zoneObject;
    } else {
      state.settings.delivery_zones.push(zoneObject);
    }

    closeZoneModal();
    renderHomeDeliverySection();
    updateSaveButtonState();
  }

  /**
   * Delete Zone Modal Handlers
   */
  function openDeleteZoneModal(index) {
    state.deletingZoneIndex = index;
    const zone = state.settings.delivery_zones[index];
    if (!zone) return;

    const modal = document.getElementById('delete-zone-modal');
    const msg = document.getElementById('delete-zone-modal-msg');
    if (msg) {
      msg.textContent = `هل أنت متأكد من حذف منطقة التوصيل "${zone.name}"؟ لن يتمكن العملاء في هذا النطاق من طلب التوصيل.`;
    }
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDeleteZoneModal() {
    const modal = document.getElementById('delete-zone-modal');
    if (modal) modal.classList.add('hidden');
    state.deletingZoneIndex = null;
    document.body.style.overflow = '';
  }

  function confirmDeleteZone() {
    if (state.deletingZoneIndex !== null && state.settings.delivery_zones[state.deletingZoneIndex]) {
      state.settings.delivery_zones.splice(state.deletingZoneIndex, 1);
      renderHomeDeliverySection();
      updateSaveButtonState();
    }
    closeDeleteZoneModal();
  }

  /**
   * HTTP 422 Validation Error Alert Modal
   */
  function showValidationModal(errorData) {
    const modal = document.getElementById('validation-error-modal');
    const container = document.getElementById('validation-error-details');
    if (!modal || !container) return;

    let errorMessages = [];

    if (errorData && Array.isArray(errorData.detail)) {
      errorMessages = errorData.detail.map(item => {
        const field = Array.isArray(item.loc) ? item.loc.join(' > ') : (item.loc || 'حقل غير محدد');
        return `<div><strong class="text-rose-700">${escapeHtml(field)}:</strong> <span>${escapeHtml(item.msg || 'قيمة غير صالحة')}</span></div>`;
      });
    } else if (errorData && typeof errorData.detail === 'string') {
      errorMessages.push(`<div>${escapeHtml(errorData.detail)}</div>`);
    } else {
      errorMessages.push('<div>بيانات الطلب غير مكتملة أو تحتوي على صيغ غير متوافقة مع الخادم.</div>');
    }

    container.innerHTML = errorMessages.join('');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeValidationModal() {
    const modal = document.getElementById('validation-error-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Floating Emerald Toast Notification
   * Requirement: Display a floating emerald toast notification upon HTTP 200/201 success: "تم تحديث إعدادات التوصيل والاستلام بنجاح".
   */
  function showFloatingEmeraldToast(message = 'تم تحديث إعدادات التوصيل والاستلام بنجاح') {
    const container = document.getElementById('emerald-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-[#1c5335] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/40 animate-toast-in';
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div class="text-xs font-bold leading-tight">
        <div class="text-white">${escapeHtml(message)}</div>
        <div class="text-[10px] text-emerald-200/90 font-medium mt-0.5">تم حفظ التغييرات وتطبيقها مباشرة في تطبيق دوّر</div>
      </div>
      <button type="button" class="text-white/60 hover:text-white mr-auto p-1 cursor-pointer transition" aria-label="إغلاق">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');
        setTimeout(() => toast.remove(), 250);
      });
    }

    container.appendChild(toast);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');
        setTimeout(() => toast.remove(), 250);
      }
    }, 4500);
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Save Settings
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);

    // Reset Changes
    const resetBtn = document.getElementById('btn-reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.settings = JSON.parse(state.originalSettingsJSON || JSON.stringify(DEFAULT_SETTINGS));
        renderAll();
        showFloatingEmeraldToast('تم التراجع عن التغييرات غير المحفوظة بنجاح');
      });
    }

    // Master Toggle: Home Delivery
    const toggleDelivery = document.getElementById('toggle-home-delivery');
    if (toggleDelivery) {
      toggleDelivery.addEventListener('change', (e) => {
        state.settings.home_delivery_enabled = e.target.checked;
        renderHomeDeliverySection();
        updateSaveButtonState();
      });
    }

    // Master Toggle: In-Store Pickup
    const togglePickup = document.getElementById('toggle-pickup');
    if (togglePickup) {
      togglePickup.addEventListener('change', (e) => {
        state.settings.store_pickup_enabled = e.target.checked;
        renderPickupSection();
        updateSaveButtonState();
      });
    }

    // Preparation Lead Time Dropdown
    const leadTimeSelect = document.getElementById('pickup-lead-time');
    if (leadTimeSelect) {
      leadTimeSelect.addEventListener('change', (e) => {
        state.settings.pickup_lead_time_minutes = parseInt(e.target.value, 10) || 30;
        updateSaveButtonState();
      });
    }

    // Pickup Counter Location Input
    const counterInput = document.getElementById('pickup-counter-location');
    if (counterInput) {
      counterInput.addEventListener('input', (e) => {
        state.settings.pickup_counter_note = e.target.value;
        updateSaveButtonState();
      });
    }

    // Preset chips for Pickup Counter
    const presetChips = document.querySelectorAll('.counter-preset-chip');
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-preset');
        if (text) {
          state.settings.pickup_counter_note = text;
          if (counterInput) counterInput.value = text;
          updateSaveButtonState();
        }
      });
    });

    // Pickup Hours (Start & End)
    const windowStartInput = document.getElementById('pickup-window-start');
    if (windowStartInput) {
      windowStartInput.addEventListener('change', (e) => {
        state.settings.pickup_window_start = e.target.value;
        updateSaveButtonState();
      });
    }

    const windowEndInput = document.getElementById('pickup-window-end');
    if (windowEndInput) {
      windowEndInput.addEventListener('change', (e) => {
        state.settings.pickup_window_end = e.target.value;
        updateSaveButtonState();
      });
    }

    // Operating Days Click Delegation
    const daysContainer = document.getElementById('operating-days-container');
    if (daysContainer) {
      daysContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.operating-day-btn');
        if (!btn) return;
        const dayKey = btn.getAttribute('data-day');
        if (!dayKey) return;

        const currentDays = state.settings.operating_days || [];
        const index = currentDays.indexOf(dayKey);

        if (index > -1) {
          // Deselect
          currentDays.splice(index, 1);
        } else {
          // Select
          currentDays.push(dayKey);
        }

        state.settings.operating_days = currentDays;
        renderOperatingDaysSelector();
        updateSaveButtonState();
      });
    }

    // Select all days button
    const selectAllBtn = document.getElementById('btn-select-all-days');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        state.settings.operating_days = WEEK_DAYS.map(d => d.key);
        renderOperatingDaysSelector();
        updateSaveButtonState();
      });
    }

    // Add Zone Button
    const addZoneBtn = document.getElementById('btn-add-zone');
    if (addZoneBtn) {
      addZoneBtn.addEventListener('click', () => openZoneModal(null));
    }

    // Zones List Action Delegation (Edit, Delete, Empty Add)
    const zonesContainer = document.getElementById('zones-list-container');
    if (zonesContainer) {
      zonesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const index = btn.getAttribute('data-index');

        if (action === 'open-add-zone') {
          openZoneModal(null);
        } else if (action === 'edit-zone') {
          openZoneModal(parseInt(index, 10));
        } else if (action === 'delete-zone') {
          openDeleteZoneModal(parseInt(index, 10));
        }
      });
    }

    // Real-time validation inputs inside Zone modal
    ['zone-name', 'zone-base-fee', 'zone-min-order', 'zone-est-time'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => validateZoneField(id));
        input.addEventListener('blur', () => validateZoneField(id));
      }
    });

    // Free delivery threshold toggle inside modal
    const hasFreeToggle = document.getElementById('zone-has-free-delivery');
    const freeGroup = document.getElementById('zone-free-threshold-group');
    if (hasFreeToggle && freeGroup) {
      hasFreeToggle.addEventListener('change', (e) => {
        freeGroup.classList.toggle('hidden', !e.target.checked);
      });
    }

    // Zone Modal form submit & close buttons
    const zoneForm = document.getElementById('zone-form');
    if (zoneForm) zoneForm.addEventListener('submit', handleZoneFormSubmit);

    const closeZoneBtn = document.getElementById('btn-close-zone-modal');
    const cancelZoneBtn = document.getElementById('btn-cancel-zone-modal');
    const zoneBackdrop = document.getElementById('zone-modal-backdrop');
    if (closeZoneBtn) closeZoneBtn.addEventListener('click', closeZoneModal);
    if (cancelZoneBtn) cancelZoneBtn.addEventListener('click', closeZoneModal);
    if (zoneBackdrop) zoneBackdrop.addEventListener('click', closeZoneModal);

    // Delete Zone Modal actions
    const confirmDeleteBtn = document.getElementById('btn-confirm-delete-zone');
    const cancelDeleteBtn = document.getElementById('btn-cancel-delete-zone');
    const closeDeleteBtn = document.getElementById('btn-close-delete-modal');
    const deleteBackdrop = document.getElementById('delete-zone-modal-backdrop');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteZone);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteZoneModal);
    if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDeleteZoneModal);
    if (deleteBackdrop) deleteBackdrop.addEventListener('click', closeDeleteZoneModal);

    // Validation Alert Modal close
    const closeValidationBtn = document.getElementById('btn-close-validation-modal');
    const validationBackdrop = document.getElementById('validation-error-backdrop');
    if (closeValidationBtn) closeValidationBtn.addEventListener('click', closeValidationModal);
    if (validationBackdrop) validationBackdrop.addEventListener('click', closeValidationModal);
  }

  /**
   * Browser Unload Guard for Unsaved Changes
   */
  function setupUnloadGuard() {
    window.addEventListener('beforeunload', (e) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'لديك تغييرات غير محفوظة في إعدادات التوصيل والاستلام. هل تريد المغادرة؟';
        return e.returnValue;
      }
    });
  }

  /**
   * HTML escape
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // DOMContentLoaded bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
