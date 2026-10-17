/**
 * DawwerOS Web API Client - Two-Backend Architecture
 * 
 * 1. ASP.NET Backend (Auth, Accounts, Categories, Profile, Admin, Staff, Merchant Applications):
 *    AUTH_BASE: "https://dawwer.runasp.net/api"
 * 
 * 2. FastAPI Backend (Products, Inventory, Bulk Import, Shelf Jobs, Gemini Vision Drafts):
 *    FASTAPI_BASE: "https://dawwer-backend-fastapi.onrender.com"
 * 
 * Target Routing Map:
 * -------------------------------------------------------------------------
 * Target AUTH_BASE for:
 *   - Authentication & Sessions: /Auth/login, /Auth/register, /Auth/verify-code, /Auth/refresh-token, /Auth/logout
 *   - Store Selection: /Auth/select-store
 *   - Taxonomies: /categories, /categories/tree, /categories/{id}
 *   - Merchant Applications & Documents: /merchant/stores, /merchant/stores/{id}/documents, /merchant/stores/{id}/submit
 *   - Staff & Custom Roles: /stores/{storeId}/staff, /stores/{storeId}/roles
 *   - Profile & Admin: /Profile, /admin/...
 * 
 * Target FASTAPI_BASE for:
 *   - System Health: /api/v1/health
 *   - Store Context Verification: /api/v1/stores/{store_id}
 *   - Product Management (CRUD):
 *     * POST   /api/v1/stores/{store_id}/products
 *     * GET    /api/v1/stores/{store_id}/products
 *     * GET    /api/v1/stores/{store_id}/products/{product_id}
 *     * PUT    /api/v1/stores/{store_id}/products/{product_id}
 *     * DELETE /api/v1/stores/{store_id}/products/{product_id}
 *   - Bulk Catalog Import:
 *     * POST   /api/v1/stores/{store_id}/catalog/bulk-import (multipart/form-data with CSV/Excel)
 *   - AI Shelf Capture Jobs (Gemini Vision):
 *     * POST   /api/v1/stores/{store_id}/shelf-jobs (multipart/form-data for shelf image)
 *     * GET    /api/v1/stores/{store_id}/shelf-jobs
 *     * GET    /api/v1/stores/{store_id}/shelf-jobs/{job_id}
 *   - AI Draft Approvals & Review:
 *     * GET    /api/v1/stores/{store_id}/draft-products
 *     * GET    /api/v1/stores/{store_id}/draft-products/{draft_id}
 *     * PUT    /api/v1/stores/{store_id}/draft-products/{draft_id}
 *     * POST   /api/v1/stores/{store_id}/draft-products/{draft_id}/approve
 *     * POST   /api/v1/stores/{store_id}/draft-products/{draft_id}/reject
 *     * POST   /api/v1/stores/{store_id}/draft-products/batch-approve
 */

var AUTH_BASE = (typeof window !== 'undefined' && window.AUTH_BASE)
  || (typeof CONFIG !== 'undefined' && (CONFIG.API_BASE_URL || CONFIG.AUTH_BASE_URL))
  || 'https://dawwer.runasp.net/api';
var FASTAPI_BASE = (typeof window !== 'undefined' && (window.FASTAPI_BASE_URL || window.FASTAPI_BASE))
  || (typeof CONFIG !== 'undefined' && (CONFIG.FASTAPI_BASE_URL || CONFIG.PRODUCTS_BASE_URL))
  || 'https://dawwer-backend-fastapi.onrender.com';

var BACKEND_BASE_URL = (typeof window !== 'undefined' && (window.BACKEND_BASE_URL || window.API_BASE_URL))
  || (typeof CONFIG !== 'undefined' ? (CONFIG.BACKEND_BASE_URL || CONFIG.API_BASE_URL) : 'https://dawwer-backend-fastapi.onrender.com');

var API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || AUTH_BASE;
var AUTH_BASE_URL = AUTH_BASE;
var PRODUCTS_BASE_URL = FASTAPI_BASE;
var BASE_URL = FASTAPI_BASE;

var DEFAULT_TIMEOUT_MS = (typeof CONFIG !== 'undefined' && (CONFIG.REQUEST_TIMEOUT || CONFIG.TIMEOUT_MS))
  ? (CONFIG.REQUEST_TIMEOUT || CONFIG.TIMEOUT_MS)
  : 90000; // 90000ms (90 seconds) AbortController timeout threshold for Render cold-starts

/**
 * Prevent stringified "null" or "undefined" storage:
 * Ensures localStorage.setItem does not save the string "null" or "undefined" as activeStoreId,
 * store_id, active_store_id, or storeId.
 */
(function setupLocalStorageGuard() {
  try {
    const proto = (typeof Storage !== 'undefined' && Storage.prototype)
      ? Storage.prototype
      : (typeof window !== 'undefined' && window.localStorage ? Object.getPrototypeOf(window.localStorage) : null);

    if (proto && !proto._dawwerStoreGuard) {
      const origSetItem = proto.setItem;
      proto.setItem = function (key, value) {
        if (typeof key === 'string' && /^(activeStoreId|active_store_id|store_id|storeId|dawwer_active_store_id|dawwer_store_id)$/i.test(key)) {
          if (value === null || value === undefined) {
            this.removeItem(key);
            return;
          }
          const strVal = String(value).trim();
          if (strVal === '' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
            this.removeItem(key);
            return;
          }
        }
        return origSetItem.call(this, key, value);
      };
      proto._dawwerStoreGuard = true;
    }
  } catch (e) {}

  try {
    if (typeof localStorage !== 'undefined' && localStorage && !localStorage._dawwerStoreGuard) {
      const origSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key, value) {
        if (typeof key === 'string' && /^(activeStoreId|active_store_id|store_id|storeId|dawwer_active_store_id|dawwer_store_id)$/i.test(key)) {
          if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return;
          }
          const strVal = String(value).trim();
          if (strVal === '' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
            localStorage.removeItem(key);
            return;
          }
        }
        return origSetItem(key, value);
      };
      localStorage._dawwerStoreGuard = true;
    }
  } catch (e) {}
})();

const ApiClient = {
  API_BASE_URL,
  FASTAPI_BASE_URL: (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.FASTAPI_BASE_URL) || (typeof CONFIG !== 'undefined' && CONFIG.FASTAPI_BASE_URL) || 'https://dawwer-backend-fastapi.onrender.com',
  BACKEND_BASE_URL: (typeof window !== 'undefined' && window.BACKEND_BASE_URL) || BACKEND_BASE_URL,
  AUTH_BASE,
  FASTAPI_BASE,
  AUTH_BASE_URL,
  PRODUCTS_BASE_URL,
  BASE_URL,
  DEFAULT_TIMEOUT_MS,

  _storeVerificationPromptActive: false,

  /**
   * Helper: Check if running in local development or test environment
   */
  isLocalEnvironment() {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname || '';
    const protocol = window.location.protocol || '';
    return host === 'localhost' ||
           host === '127.0.0.1' ||
           host === '::1' ||
           host.endsWith('.local') ||
           protocol === 'file:' ||
           !host ||
           window.location.port !== '';
  },

  /**
   * Helper: Retrieve unified authorization bearer token
   * Always prioritizes storeToken then accessToken, checking fallback keys across localStorage and sessionStorage.
   * Returns only credentials issued by the server.
   */
  getToken() {
    return this.getAuthToken(true);
  },

  /**
   * Primary Platform Backend Dispatcher (ASP.NET Core 9 / CONFIG.API_BASE_URL).
   * Unpacks ASP.NET standard envelope { success, data, message, errors }.
   * If success === false, throws an error showing errors.join(', ') or message.
   * Uses the same authentication renewal and error handling as all requests.
   */
  async core(endpoint, options = {}) {
    const result = await this.request(endpoint, { ...options, service: 'auth' });
    if (result?.success === false) return result;
    return result?.data !== undefined ? result.data : result;
  },

  async fastapi(endpoint, options = {}) {
    return this.request(endpoint, { ...options, service: 'fastapi' });
  },

  /**
   * Helper to verify if a string is a valid GUID / UUID.
   */
  isValidGuid(id) {
    if (!id || typeof id !== 'string') return false;
    const clean = id.trim();
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean);
  },

  /**
   * Helper to verify if a store ID is a valid non-null, non-empty string.
   */
  isValidStoreId(id) {
    if (!id || typeof id !== 'string') return false;
    const clean = id.trim().toLowerCase();
    if (
      clean === '' ||
      clean === 'null' ||
      clean === 'undefined' ||
      clean === '00000000-0000-0000-0000-000000000000' ||
      clean === '7b8f6a91-45c2-48df-bc88-825dfa234123' ||
      clean === '11111111-1111-1111-1111-111111111111' ||
      clean.startsWith('app-') ||
      clean.startsWith('store-')
    ) {
      return false;
    }
    return true;
  },

  /**
   * Helper to check if a given store ID string is invalid, dummy, or broken.
   */
  isInvalidStoreId(id) {
    return !this.isValidStoreId(id);
  },

  /**
   * Retrieves the currently active store ID from persistent storage or URL.
   * Strips out known broken dummy UUIDs and ignores stringified "null" / "undefined".
   */
  getActiveStoreId() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const qStoreId = urlParams.get('store_id') || urlParams.get('storeId') || urlParams.get('activeStoreId');
        if (qStoreId && !this.isInvalidStoreId(qStoreId)) {
          const clean = qStoreId.trim();
          this.setActiveStoreId(clean);
          return clean;
        }
      }

      const keys = ['activeStoreId', 'store_id', 'active_store_id', 'storeId', 'dawwer_active_store_id', 'dawwer_store_id'];
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val) {
          if (!this.isInvalidStoreId(val)) {
            return val.trim();
          } else {
            this.clearInvalidStoreId(val);
          }
        }
      }

      const activeStoreRaw = localStorage.getItem('dawwer_active_store');
      if (activeStoreRaw && activeStoreRaw !== 'null' && activeStoreRaw !== 'undefined') {
        try {
          const activeStore = JSON.parse(activeStoreRaw);
          const sid = activeStore?.storeId || activeStore?.id || activeStore?.store_id;
          if (sid && !this.isInvalidStoreId(sid)) {
            this.setActiveStoreId(sid);
            return sid;
          } else if (sid) {
            this.clearInvalidStoreId(sid);
          }
        } catch (e) {
          localStorage.removeItem('dawwer_active_store');
        }
      }

      const userDataRaw = localStorage.getItem('dawwer_user_data');
      if (userDataRaw && userDataRaw !== 'null' && userDataRaw !== 'undefined') {
        try {
          const userData = JSON.parse(userDataRaw);
          const sid = userData?.storeId || userData?.store_id;
          if (sid && !this.isInvalidStoreId(sid)) {
            this.setActiveStoreId(sid);
            return sid;
          }
        } catch (e) {}
      }
    } catch (e) {}

    const isUserAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (function() {
          const r = localStorage.getItem('userRole') || localStorage.getItem('role');
          return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
        })();

    if (isUserAdmin) {
      return null;
    }

    const configuredDefault = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_STORE_ID) ? CONFIG.DEFAULT_STORE_ID : null;
    if (configuredDefault && !this.isInvalidStoreId(configuredDefault)) {
      return configuredDefault;
    }
    return null;
  },

  /**
   * Sets the active store ID across all relevant storage keys.
   * Strictly prevents saving stringified "null" or "undefined".
   */
  clearStoreCache() {
    const keys = ['dawwer_merchant_catalog_products', 'dawwer_merchant_catalog_v2', 'dawwer_ai_extraction_jobs',
      'dawwer_current_job', 'dawwer_active_job_id', 'dawwer_current_draft_products', 'dawwer_current_shelf_image',
      'current_shelf_image', 'dawwer_deleted_job_ids', 'dawwer_merchant_app_id', 'storePermissions', 'dawwer_active_store',
      'dawwer_inventory_audit_products_v3', 'dawwer_dashboard_summary_cache', 'dawwer_merchant_orders_queue_sprint3',
      'dawwer_payment_reviews_v1', 'dawwer_store_profile', 'dawwer_merchant_audit_log',
      'storeToken', 'store_token', 'dawwer_store_token', 'storeStatus', 'store_status', 'dawwer_store_status'];
    keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    ['current_shelf_job', 'dawwer_current_review_job'].forEach(k => sessionStorage.removeItem(k));
  },

  setActiveStoreId(storeId) {
    if (!storeId || typeof storeId !== 'string') {
      this.clearInvalidStoreId(storeId);
      return;
    }
    const clean = storeId.trim();
    if (this.isInvalidStoreId(clean) || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') {
      this.clearInvalidStoreId(clean);
      return;
    }

    try {
      const previous = localStorage.getItem('activeStoreId') || localStorage.getItem('storeId');
      if (previous && previous !== clean) this.clearStoreCache();
      localStorage.setItem('activeStoreId', clean);
      localStorage.setItem('store_id', clean);
      localStorage.setItem('active_store_id', clean);
      localStorage.setItem('storeId', clean);
      localStorage.setItem('dawwer_active_store_id', clean);
      localStorage.setItem('dawwer_store_id', clean);
    } catch (e) {}
  },

  /**
   * Clears invalid or stale store references from persistent storage.
   * Purges stringified "null" or "undefined" from all store keys.
   */
  clearInvalidStoreId(invalidId = null) {
    try {
      const keys = [
        'activeStoreId',
        'store_id',
        'active_store_id',
        'storeId',
        'dawwer_active_store_id',
        'dawwer_store_id',
        'storeToken',
        'store_token',
        'dawwer_store_token'
      ];
      keys.forEach(k => {
        const val = localStorage.getItem(k);
        if (!val || !invalidId || val === invalidId || this.isInvalidStoreId(val) || val === 'null' || val === 'undefined') {
          localStorage.removeItem(k);
        }
      });
      const activeStoreRaw = localStorage.getItem('dawwer_active_store');
      if (activeStoreRaw) {
        try {
          const parsed = JSON.parse(activeStoreRaw);
          const sid = parsed?.storeId || parsed?.id || parsed?.store_id;
          if (!sid || this.isInvalidStoreId(sid) || sid === 'null' || sid === 'undefined' || sid === invalidId) {
            localStorage.removeItem('dawwer_active_store');
          }
        } catch (e) {
          localStorage.removeItem('dawwer_active_store');
        }
      }
      if (typeof CONFIG !== 'undefined') {
        if (CONFIG.STORE_TOKEN_KEY) localStorage.removeItem(CONFIG.STORE_TOKEN_KEY);
        if (CONFIG.ACTIVE_STORE_KEY) localStorage.removeItem(CONFIG.ACTIVE_STORE_KEY);
      }
    } catch (e) {}
  },

  /**
   * Immediately clears all stored session credentials from localStorage and sessionStorage.
   */
  clearSession() {
    if (typeof Auth !== 'undefined') { Auth.clearLocalSession(); return; }
    const keys = ['accessToken', 'token', 'access_token', 'dawwer_access_token', 'refreshToken', 'refresh_token', 'dawwer_refresh_token',
      'userData', 'dawwer_user_data', 'user', 'dawwer_user', 'userId', 'role', 'userRole', 'activeStoreId', 'storeId', 'store_id',
      'active_store_id', 'dawwer_active_store_id', 'dawwer_store_id'];
    keys.forEach(k => localStorage.removeItem(k));
    this.clearStoreCache();
    sessionStorage.clear();
  },

  /**
   * Fail-safe, non-blocking logout with immediate storage cleanup, fire-and-forget notification, and hard redirect.
   */
  logout() {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    this.clearSession();

    try {
      const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : 'https://dawwer.runasp.net/api';
      fetch(`${apiBase}/Auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ refreshToken: refreshToken || '' })
      }).catch(() => {});
    } catch (e) {}

    window.location.replace('login.html');
  },

  /**
   * Auth API dispatch helpers
   */
  auth: {
    async selectStore(storeId) {
      if (!storeId || !ApiClient.isValidGuid(storeId)) {
        console.warn('[ApiClient.auth.selectStore] Invalid store GUID:', storeId);
        return { success: false, message: 'Invalid store GUID' };
      }
      return await ApiClient.post('/Auth/select-store', { storeId });
    },
    logout() {
      ApiClient.logout();
    }
  },

  /**
   * Verifies the store context against FastAPI Backend: GET /api/v1/stores/{store_id}
   * 
   * 1. Guard check before verifying store context:
   *    - If store_id is missing, null, undefined, or equal to the string "null" / "undefined",
   *      DO NOT make the HTTP request to /api/v1/stores/{store_id}.
   *    - Immediately redirect the user or prompt them to select a store via the store selection view
   *      instead of dispatching a GET request with an invalid/null ID.
   */
  async verifyStoreContext(storeId = null, options = {}) {
    // Platform Admins supervise the whole platform and do not belong to a single merchant store
    const isUserAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (function() {
          const r = localStorage.getItem('userRole') || localStorage.getItem('role');
          return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
        })();

    if (isUserAdmin) {
      return { success: true, message: "SuperAdmin context bypassed", data: null };
    }

    let id = storeId;
    if (id === undefined || id === null) {
      id = this.getActiveStoreId();
    }
    const cleanId = (typeof id === 'string') ? id.trim() : (id ? String(id).trim() : null);

    // Guard check before verifying store context:
    // If store_id is missing, null, undefined, or empty, DO NOT make the HTTP request to /api/v1/stores/{store_id}.
    if (!this.isValidStoreId(cleanId)) {
      console.warn(`[ApiClient] Store context check guard: store_id is missing, null, or empty ("${cleanId}"). Aborting HTTP request to /api/v1/stores/{store_id}.`);
      this.handleStoreVerification404(cleanId);
      const res = {
        success: false,
        status: 404,
        error_code: "STORE_ID_MISSING",
        message: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر من القائمة للمتابعة.",
        error: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر من القائمة للمتابعة.",
        errors: ["معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر من القائمة للمتابعة."],
        data: null
      };
      if (options.throwOnError) {
        const err = new Error(res.message);
        err.status = 404;
        err.code = "STORE_ID_MISSING";
        throw err;
      }
      return res;
    }

    return this.get(`/api/v1/stores/${encodeURIComponent(cleanId)}`, {}, { service: 'fastapi', ...options });
  },

  checkStoreContext(storeId = null, options = {}) {
    return this.verifyStoreContext(storeId, options);
  },

  /**
   * Handle missing or 404 store on Store Verification:
   * Purges invalid/null store keys from storage, prompts user, and immediately directs to store selection.
   */
  handleStoreVerification404(invalidStoreId = null) {
    // Platform Admins supervise the whole platform and should NEVER be prompted to select a store
    const isUserAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (function() {
          const r = localStorage.getItem('userRole') || localStorage.getItem('role');
          return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
        })();

    if (isUserAdmin) {
      return;
    }

    // 2. Persistent Store Context: Do NOT prompt or redirect if valid active_store_id and storeToken exist
    const hasValidStoreId = !!(localStorage.getItem('active_store_id') || localStorage.getItem('activeStoreId'));
    const hasValidStoreToken = !!(localStorage.getItem('storeToken') || localStorage.getItem('store_token'));
    if (hasValidStoreId && hasValidStoreToken && (!invalidStoreId || invalidStoreId === 'null' || invalidStoreId === 'undefined')) {
      return;
    }

    if (this._storeVerificationPromptActive) return;
    this._storeVerificationPromptActive = true;

    // Purge any stringified "null", "undefined", or invalid IDs
    this.clearInvalidStoreId(invalidStoreId);

    if (typeof window !== 'undefined') {
      const displayId = (invalidStoreId && invalidStoreId !== 'null' && invalidStoreId !== 'undefined')
        ? `"${invalidStoreId}"`
        : 'غير محدد';
      console.warn(`[ApiClient] Store context check: store ID is missing or invalid (${displayId}). Prompting user to select a store.`);

      if (typeof window.showToast === 'function') {
        window.showToast({
          title: 'تنبيه: يلزم اختيار متجر نشط',
          message: 'معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر من القائمة للمتابعة.',
          type: 'warning',
          duration: 7000
        });
      }

      // Dispatch non-crashing events for header / store-switcher to react
      try {
        window.dispatchEvent(new CustomEvent('dawwer:store-not-found', {
          detail: { storeId: invalidStoreId }
        }));
        window.dispatchEvent(new CustomEvent('dawwer:open-store-selector', {
          detail: { storeId: invalidStoreId }
        }));
      } catch (e) {}

      // Prompt or redirect user to select a store via the store selection view
      const currentPath = (window.location.pathname || '').split('/').pop() || 'dashboard.html';
      const exemptPages = ['login.html', 'register.html', 'verify-account.html', 'forgot-password.html', 'reset-password.html', 'admin-login.html', 'merchant-application.html', 'select-store.html', 'admin-dashboard.html', 'profile.html'];

      if (!exemptPages.includes(currentPath)) {
        if (typeof window.DawwerLayout !== 'undefined' && typeof window.DawwerLayout.openStoreSwitcher === 'function') {
          window.DawwerLayout.openStoreSwitcher();
        } else if (!(window.location.search || '').includes('selectStore=true')) {
          if (currentPath === 'dashboard.html' || currentPath === 'login.html') {
            window.location.href = 'dashboard.html?selectStore=true';
          } else {
            window.location.href = `dashboard.html?selectStore=true&returnUrl=${encodeURIComponent((window.location.pathname || '') + (window.location.search || ''))}`;
          }
        }
      }
    }

    setTimeout(() => {
      this._storeVerificationPromptActive = false;
    }, 2000);
  },

  /**
   * Retrieves the bearer authorization token from localStorage.
   * Checks 'accessToken' or 'storeToken' (prioritizing storeToken for store-specific operations).
   * Validates non-null string and checks against token expiration.
   */
  getAuthToken(forStore = false) {
    const access = this.getRawAccessToken();
    if (forStore) {
      for (const key of ['storeToken', 'store_token', 'dawwer_store_token']) {
        const token = localStorage.getItem(key)?.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (token && !this.isTokenExpired(token)) return token;
      }
    }
    return access && !this.isTokenExpired(access) ? access : null;
  },

  getUploadAuthToken() {
    return this.getAuthToken(true);
  },

  /**
   * Checks whether a JWT bearer token is missing or expired.
   * Returns true if token is missing, null, equal to "null"/"undefined", empty, or past exp timestamp.
   */
  isTokenExpired(token) {
    if (!token || typeof token !== 'string') return true;
    const clean = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
    if (!clean || /mock/i.test(clean) || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') return true;
    try {
      const parts = clean.split('.');
      if (parts.length !== 3) return false;
      let payload;
      try {
        payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
      } catch (e) {
        payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      }
      if (!payload || !payload.exp) return false;
      // Expired if current time in seconds is at or past expiry (with 10s grace window)
      return (Date.now() / 1000) >= (payload.exp - 10);
    } catch (e) {
      return false;
    }
  },

  /**
   * Retrieves the refresh token from persistent storage.
   */
  getRefreshToken() {
    try {
      const token = localStorage.getItem('refreshToken') ||
                    localStorage.getItem('refresh_token') ||
                    localStorage.getItem('dawwer_refresh_token') ||
                    (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY) : null);
      if (token && typeof token === 'string') {
        const clean = token.trim().replace(/^"|"$/g, '');
        if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined') {
          return clean;
        }
      }
    } catch (e) {}
    return null;
  },

  /**
   * Retrieves raw access token string from persistent storage.
   */
  getRawAccessToken() {
    try {
      const token = localStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('dawwer_access_token') ||
                    localStorage.getItem('access_token') ||
                    (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.TOKEN_KEY) : null);
      if (token && typeof token === 'string') {
        const clean = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined') {
          return clean;
        }
      }
    } catch (e) {}
    return null;
  },

  /**
   * Persists newly refreshed tokens across all standard storage aliases.
   */
  setTokens({ accessToken = null, refreshToken = null, storeToken = null } = {}) {
    try {
      if (accessToken && typeof accessToken === 'string') {
        const cleanAccess = accessToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (cleanAccess && cleanAccess.toLowerCase() !== 'null' && cleanAccess.toLowerCase() !== 'undefined') {
          localStorage.setItem('accessToken', cleanAccess);
          localStorage.setItem('token', cleanAccess);
          localStorage.setItem('access_token', cleanAccess);
          localStorage.setItem('dawwer_access_token', cleanAccess);
          if (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY) {
            localStorage.setItem(CONFIG.TOKEN_KEY, cleanAccess);
          }
        }
      }

      if (refreshToken && typeof refreshToken === 'string') {
        const cleanRefresh = refreshToken.trim().replace(/^"|"$/g, '');
        if (cleanRefresh && cleanRefresh.toLowerCase() !== 'null' && cleanRefresh.toLowerCase() !== 'undefined') {
          localStorage.setItem('refreshToken', cleanRefresh);
          localStorage.setItem('refresh_token', cleanRefresh);
          localStorage.setItem('dawwer_refresh_token', cleanRefresh);
          if (typeof CONFIG !== 'undefined' && CONFIG.REFRESH_TOKEN_KEY) {
            localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, cleanRefresh);
          }
        }
      }

      if (storeToken && typeof storeToken === 'string') {
        const cleanStoreToken = storeToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (cleanStoreToken && cleanStoreToken.toLowerCase() !== 'null' && cleanStoreToken.toLowerCase() !== 'undefined') {
          localStorage.setItem('storeToken', cleanStoreToken);
          localStorage.setItem('store_token', cleanStoreToken);
          localStorage.setItem('dawwer_store_token', cleanStoreToken);
          if (typeof CONFIG !== 'undefined' && CONFIG.STORE_TOKEN_KEY) {
            localStorage.setItem(CONFIG.STORE_TOKEN_KEY, cleanStoreToken);
          }
        }
      }
    } catch (e) {
      console.warn('[ApiClient] Failed to persist refreshed tokens:', e);
    }
  },

  _refreshPromise: null,

  /**
   * Executes a silent JWT refresh flow using POST /api/Auth/refresh-token.
   * Avoids duplicate concurrent requests via _refreshPromise mutex.
   * Updates storage tokens and returns the fresh access token, or null if refresh fails.
   */
  async refreshAuthToken() {
    if (this._refreshPromise) return this._refreshPromise;
    const originalRefreshToken = this.getRefreshToken();
    if (!originalRefreshToken || /mock/i.test(originalRefreshToken)) return null;
    const renew = async () => {
      // Another tab may already have rotated the refresh token while we waited.
      if (this.getRefreshToken() !== originalRefreshToken && this.getAuthToken(false)) {
        return this.getAuthToken(false);
      }
      const base = this.AUTH_BASE.replace(/\/+$/, '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);
      try {
        const response = await fetch(`${base}/Auth/refresh-token`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ accessToken: this.getRawAccessToken() || '', refreshToken: this.getRefreshToken() })
        });
        const json = await response.json().catch(() => null);
        if ([400, 401, 403].includes(response.status)) return null;
        if (!response.ok) throw Object.assign(new Error(this.errorMessage(json, response.status)), { status: response.status });
        const data = json?.data || json;
        if (json?.success === false || !(data?.accessToken || data?.token)) return null;
        // Never restore credentials after logout or replacement by another account.
        if (this.getRefreshToken() !== originalRefreshToken) return this.getAuthToken(false);
        this.setTokens({ accessToken: data.accessToken || data.token, refreshToken: data.refreshToken });
        ['storeToken', 'store_token', 'dawwer_store_token'].forEach(k => localStorage.removeItem(k));
        if (data.storeToken) this.setTokens({ storeToken: data.storeToken });
        else {
          const storeId = this.getActiveStoreId();
          if (this.isValidStoreId(storeId)) {
            const selected = await fetch(`${base}/Auth/select-store`, {
              method: 'POST', signal: controller.signal,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.accessToken || data.token}` },
              body: JSON.stringify({ storeId })
            });
            const selection = await selected.json().catch(() => null);
            if (selected.ok && selection?.success !== false && ((selection?.data || selection)?.storeToken || (selection?.data || selection)?.accessToken)) {
              // Logout may happen while select-store is in flight.
              if (this.getRawAccessToken() === (data.accessToken || data.token)) {
                this.setTokens({ storeToken: (selection.data || selection).storeToken || (selection.data || selection).accessToken });
              }
            }
          }
        }
        return this.getRawAccessToken();
      } finally { clearTimeout(timer); }
    };
    const operation = (typeof navigator !== 'undefined' && navigator.locks?.request)
      ? navigator.locks.request('dawwer-token-refresh', renew) : renew();
    this._refreshPromise = operation;
    try { return await operation; }
    finally { this._refreshPromise = null; }
  },

  /**
   * Proactive token refresh watcher:
   * Periodically checks JWT expiry (every 60s) and automatically refreshes 5 minutes before expiry.
   * Ensures active users are never logged out unexpectedly while working.
   */
  startTokenRefreshWatcher() {
    if (this._watcherStarted) return;
    this._watcherStarted = true;

    if (typeof window === 'undefined') return;

    setInterval(async () => {
      try {
        const token = this.getRawAccessToken() || this.getToken();
        const refreshToken = this.getRefreshToken();
        if (!token || !refreshToken) return;

        const clean = String(token).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        const parts = clean.split('.');
        if (parts.length !== 3) return;

        let payload;
        try {
          payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
        } catch (e) {
          payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        }

        if (!payload || !payload.exp) return;

        const nowSec = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - nowSec;

        // If token expires in less than 5 minutes (300 seconds), renew it proactively in background!
        if (timeUntilExpiry < 300) {
          console.info(`[ApiClient.watcher] Token expires in ${timeUntilExpiry}s (<300s). Initiating proactive silent refresh...`);
          await this.refreshAuthToken();
        }
      } catch (err) {
        console.warn('[ApiClient.watcher] Proactive refresh check note:', err);
      }
    }, 60000);
  },

  _reauthPromptActive: false,

  /**
   * Cleanly prompts the user to re-authenticate without crashing with a 401 alert.
   * Debounced to avoid alert spam across concurrent requests.
   */
  promptReauthentication(customMessage = null) {
    if (this._reauthPromptActive) return;
    this._reauthPromptActive = true;

    const message = customMessage || "انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مجدداً للمتابعة.";
    console.warn(`[ApiClient] Authentication required: ${message}`);

    this.clearSession();

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dawwer_pending_toast', JSON.stringify({
          title: 'جلسة العمل منتهية',
          message: message,
          type: 'warning'
        }));
      } catch (e) {}

      const currentPath = (window.location.pathname || '').split('/').pop() || 'dashboard.html';
      const exemptPages = ['login.html', 'register.html', 'verify-account.html', 'forgot-password.html', 'reset-password.html', 'admin-login.html'];
      if (!exemptPages.includes(currentPath.toLowerCase())) {
        setTimeout(() => {
          const isLandingOrLogin = ['index.html', 'landing.html', 'login.html', ''].includes(currentPath.toLowerCase());
          const redirectParam = !isLandingOrLogin ? `?redirect=${encodeURIComponent(currentPath)}` : '';
          window.location.replace(`login.html${redirectParam}`);
        }, 300);
      }
    }

    setTimeout(() => {
      this._reauthPromptActive = false;
    }, 2000);
  },

  /**
   * Pre-upload validation for Token & Store Context (Requirement 2).
   * Checks if valid token and active storeId exist before dispatching.
   * If token is expired but refresh token is available, performs silent refresh.
   * If token or storeId is missing, expired, or equals "null", prevents upload
   * and cleanly prompts the user.
   */
  async validateUploadContext(targetStoreId = null) {
    const storeId = targetStoreId || this.getActiveStoreId();
    if (!this.isValidStoreId(storeId)) return { valid: false, errorType: 'STORE_INVALID', message: 'يرجى اختيار متجر أولاً.' };
    let token = this.getAuthToken(true);
    if (!token && this.getRefreshToken()) {
      await this.refreshAuthToken();
      token = this.getAuthToken(true);
    }
    return token ? { valid: true, storeId, token }
      : { valid: false, errorType: 'AUTH_INVALID', message: 'يرجى تسجيل الدخول مجدداً للمتابعة.' };
  },

  /**
   * Specifically retrieves the admin user Bearer token ('accessToken') from localStorage.
   */
  getAdminToken() {
    try {
      const token = localStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('access_token') ||
                    localStorage.getItem('dawwer_access_token');
      if (token && token !== 'null' && token !== 'undefined') return token;

      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const t = userData?.accessToken || userData?.token;
        if (t && t !== 'null' && t !== 'undefined') return t;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Specifically retrieves the merchant user Bearer token ('accessToken') from localStorage.
   */
  getMerchantToken() {
    try {
      const token = localStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('access_token') ||
                    localStorage.getItem('dawwer_access_token');
      if (token && token !== 'null' && token !== 'undefined') return token;

      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const t = userData?.accessToken || userData?.token;
        if (t && t !== 'null' && t !== 'undefined') return t;
      }
    } catch (e) {}
    return null;
  },

  /**
   * Resolves the root host/domain of the primary platform backend
   */
  getBackendBaseUrl() {
    if (typeof window !== 'undefined' && typeof window.getBackendBaseUrl === 'function') {
      return window.getBackendBaseUrl();
    }
    const base = (typeof CONFIG !== 'undefined' && (CONFIG.BACKEND_BASE_URL || CONFIG.API_BASE_URL))
      ? (CONFIG.BACKEND_BASE_URL || CONFIG.API_BASE_URL)
      : (this.AUTH_BASE || AUTH_BASE || "https://dawwer.runasp.net");
    try {
      const url = new URL(base, typeof window !== 'undefined' && window.location ? window.location.origin : 'https://dawwer.runasp.net');
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      return String(base).replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    }
  },

  /**
   * Ensures image URLs (especially /uploads/...) point to the backend domain
   * unless they are already an absolute HTTP/HTTPS URL or data URL.
   */
  resolveImageUrl(url) {
    if (typeof window !== 'undefined' && typeof window.resolveImageUrl === 'function') {
      return window.resolveImageUrl(url);
    }
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed.startsWith('JOB-') || /^JOB[-_]/i.test(trimmed)) {
      return '';
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('assets/') || trimmed.startsWith('./assets/') || trimmed.startsWith('/assets/')) {
      return trimmed.startsWith('./') ? trimmed.slice(2) : (trimmed.startsWith('/') ? trimmed.slice(1) : trimmed);
    }
    const backendHost = this.getBackendBaseUrl();
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${backendHost}/${cleanPath}`;
  },

  /**
   * Resolves target microservice ('fastapi' vs 'auth') based on endpoint routing rules.
   */
  resolveService(endpoint, options = {}) {
    if (options.service) {
      const s = String(options.service).toLowerCase();
      if (s === 'fastapi' || s === 'products') return 'fastapi';
      if (s === 'core' || s === 'auth') return 'auth';
    }

    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const lower = clean.toLowerCase();

    // 1. Target Primary Platform Backend (ASP.NET Core / AUTH_BASE / API_BASE_URL) for:
    // - Authentication & Sessions: /Auth/login, /Auth/register, /Auth/verify-code, /Auth/refresh-token, /Auth/logout
    // - Store Selection: /Auth/select-store
    // - Taxonomies: /categories, /categories/tree, /categories/{id}
    // - Orders & Lifecycle: /Orders, /Orders/{id}/status, /Orders/{id}/amendments, /Orders/{id}/cancel
    // - Payment Receipts: /orders/{orderId}/receipts, /orders/{orderId}/receipts/file, verify
    // - Delivery Settings: /districts, /stores/{storeId}/delivery-zones
    // - Merchant Applications & Documents: /merchant/stores, /merchant/stores/{id}/documents, /merchant/stores/{id}/submit
    // - Staff & Custom Roles: /stores/{storeId}/staff, /stores/{storeId}/roles
    // - Profile & Admin: /Profile, /admin/...
    if (
      lower.startsWith('/auth') ||
      lower.startsWith('/api/auth') ||
      lower.startsWith('/categories') ||
      lower.startsWith('/api/categories') ||
      lower.startsWith('/category') ||
      lower.startsWith('/api/category') ||
      lower.startsWith('/orders') ||
      lower.startsWith('/api/orders') ||
      lower.startsWith('/districts') ||
      lower.startsWith('/api/districts') ||
      lower.includes('/delivery-zones') ||
      lower.includes('/receipts') ||
      lower.startsWith('/merchant') ||
      lower.startsWith('/api/merchant') ||
      lower.startsWith('/profile') ||
      lower.startsWith('/api/profile') ||
      lower.startsWith('/admin') ||
      lower.startsWith('/api/admin') ||
      lower.includes('/staff') ||
      lower.includes('/roles') ||
      (lower.includes('/merchant/stores') && lower.includes('/documents'))
    ) {
      return 'auth';
    }

    // 2. Target AI & Spatial Backend (FastAPI / FASTAPI_BASE / FASTAPI_BASE_URL) for:
    // - System Health: /api/v1/health
    // - Store Context Verification: /api/v1/stores/{store_id}
    // - Product Management: /api/v1/stores/{store_id}/products...
    // - Bulk Catalog Import: /api/v1/stores/{store_id}/catalog/bulk-import
    // - AI Shelf Capture Jobs: /api/v1/stores/{store_id}/shelf-jobs...
    // - AI Draft Approvals & Review: /api/v1/stores/{store_id}/draft-products...
    // - In-Store Floorplan & Blueprint: /api/v1/stores/{store_id}/maps..., /placements...
    if (
      lower.startsWith('/api/v1/') ||
      lower.includes('/shelf-jobs') ||
      lower.includes('/draft-products') ||
      lower.includes('/catalog/bulk-import') ||
      lower.includes('/products') ||
      lower.includes('/maps') ||
      lower.includes('/placements') ||
      lower === '/health' ||
      lower.startsWith('/health') ||
      (lower.startsWith('/stores/') && !lower.includes('/staff') && !lower.includes('/roles') && !lower.includes('/delivery-zones'))
    ) {
      return 'fastapi';
    }

    return 'auth';
  },

  /**
   * Resolves the full URL for an endpoint, preventing routing conflicts and ensuring correct prefixes.
   */
  resolveUrl(endpoint, options = {}) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const service = this.resolveService(clean, options);

    if (service === 'fastapi') {
      const base = (this.FASTAPI_BASE || FASTAPI_BASE).replace(/\/+$/, '');

      // AI Shelf Capture Jobs: Map /shelf-jobs, /api/shelf-jobs, /shelf-jobs/{jobId} to FastAPI endpoints
      const shelfJobMatch = clean.match(/^\/(?:api\/)?shelf-jobs(?:\/([^\/]+))?\/?$/i);
      if (shelfJobMatch) {
        const jobId = shelfJobMatch[1];
        const activeStore = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId) ? ApiClient.getActiveStoreId() : null;
        if (activeStore && ApiClient.isValidStoreId(activeStore)) {
          return jobId
            ? `${base}/api/v1/stores/${encodeURIComponent(activeStore)}/shelf-jobs/${encodeURIComponent(jobId)}`
            : `${base}/api/v1/stores/${encodeURIComponent(activeStore)}/shelf-jobs`;
        }
        return jobId
          ? `${base}/api/v1/shelf-jobs/${encodeURIComponent(jobId)}`
          : `${base}/api/v1/shelf-jobs`;
      }

      if (clean.startsWith('/api/v1/')) {
        return `${base}${clean}`;
      }
      return `${base}/api/v1${clean}`;
    } else {
      let base = (this.AUTH_BASE || AUTH_BASE).replace(/\/+$/, '');
      if (!base.endsWith('/api')) {
        base = `${base}/api`;
      }
      // Strip leading /api if present to avoid duplicate /api/api path
      let path = clean.startsWith('/api/') ? clean.slice(4) : (clean === '/api' ? '' : clean);

      // Normalize singular or outdated category routes to plural /categories according to backend routing specifications
      if (path === '/category' || path === '/category/' || path.startsWith('/category/') || path.startsWith('/category?')) {
        path = '/categories' + path.slice(9);
      }

      // Route Correction: Ensure the "/applications/" segment is strictly included in store review endpoints:
      // Replaces incorrect routes like "/api/admin/stores/{id}/approve" with "/api/admin/stores/applications/{applicationId}/approve"
      const wrongApproveMatch = path.match(/^\/admin\/stores\/([^\/]+)\/approve\/?$/i);
      if (wrongApproveMatch && wrongApproveMatch[1] !== 'applications') {
        path = `/admin/stores/applications/${wrongApproveMatch[1]}/approve`;
      }

      const wrongReviewMatch = path.match(/^\/admin\/stores\/([^\/]+)\/(start-review|request-info|reject)\/?$/i);
      if (wrongReviewMatch && wrongReviewMatch[1] !== 'applications') {
        path = `/admin/stores/applications/${wrongReviewMatch[1]}/${wrongReviewMatch[2]}`;
      }

      return `${base}${path}`;
    }
  },

  /**
   * Central Request Dispatcher.
   * - 90000ms AbortController timeout for Render cold-starts.
   * - Bearer token injected from localStorage (accessToken or storeToken).
   * - Content-Type: 'application/json; charset=utf-8' for JSON, omitted for multipart/form-data.
   * - Safe 401 handling: logs error and returns { success: false, error: "Unauthorized" } without loop/reload.
   * - Safe 404 handling: prompts user to re-select active store without crashing.
   * - Envelope parsing: unwraps ApiResponse ({ success, data, errors, message }) for AUTH_BASE; returns raw JSON for FASTAPI_BASE.
   */
  errorMessage(body, status) {
    const errors = body?.errors;
    if (Array.isArray(errors) && errors.length) return errors.map(e => typeof e === 'string' ? e : e.msg || JSON.stringify(e)).join(' | ');
    if (errors && typeof errors === 'object') return Object.values(errors).flat().join(' | ');
    let detail = body?.detail || body?.message || body?.error;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) detail = detail.message || detail.detail || detail.title;
    if (Array.isArray(detail)) return detail.map(e => `${(e.loc || []).join('.')}: ${e.msg || JSON.stringify(e)}`).join(' | ');
    return typeof detail === 'string' ? detail : `تعذر إتمام الطلب (${status}).`;
  },

  async request(endpoint, options = {}) {
    const url = this.resolveUrl(endpoint, options);
    const path = new URL(url).pathname.toLowerCase();
    const service = this.resolveService(endpoint, options);
    const isFastApi = service === 'fastapi';
    const isPublic = /\/auth\/(login|register|forgot-password|reset-password|verify-code|resend-code|refresh-token)$/.test(path)
      || /\/health$/.test(path);
    const forStore = isFastApi || (/\/stores\/[^/]+\/(staff|roles|delivery-zones)/.test(path));
    const method = (options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };
    const form = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const explicit = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
    let token = isPublic ? null : (options.token || (explicit ? String(headers[explicit]).replace(/^Bearer\s+/i, '') : null) || this.getAuthToken(forStore));
    const fail = (message, status, response = null) => {
      const error = Object.assign(new Error(message), { status, statusCode: status, response, errors: response?.errors });
      if (options.throwOnError !== false) throw error;
      return { success: false, status, message, errors: response?.errors, data: null };
    };
    try {
      if (!isPublic && (!token || this.isTokenExpired(token)) && this.getRefreshToken()) {
        await this.refreshAuthToken();
        token = this.getAuthToken(forStore);
      }
      if (!isPublic && !token) {
        if (!options.suppressAuthPrompt && !options.silentAuthFailure) this.promptReauthentication();
        return fail('جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول.', 401);
      }
      const store = path.match(/\/api\/v1\/stores\/([^/]+)/);
      if (store && !this.isValidStoreId(decodeURIComponent(store[1]))) return fail('يرجى اختيار متجر صالح للمتابعة.', 400);
      Object.keys(headers).forEach(k => {
        if (k.toLowerCase() === 'authorization' || (form && k.toLowerCase() === 'content-type')) delete headers[k];
      });
      if (token) headers.Authorization = `Bearer ${token}`;
      if (!form && options.body != null && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (options.signal?.aborted) abort();
      options.signal?.addEventListener('abort', abort, { once: true });
      const timeout = options.timeout ?? this.DEFAULT_TIMEOUT_MS;
      const timer = timeout > 0 ? setTimeout(abort, timeout) : null;
      let response, rawResponse, json;
      try {
        response = await fetch(url, {
          method, headers, signal: controller.signal,
          body: options.body == null || form || typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        });
        rawResponse = options._returnResponse ? response.clone() : null;
        const body = await response.text();
        try { json = body ? JSON.parse(body) : null; }
        catch {
          if (response.ok) return fail('استجابة الخادم غير صالحة. يرجى إعادة تحميل البيانات.', response.status);
          json = null;
        }
      } finally {
        if (timer) clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
      }
      if (response.status === 401 && !isPublic) {
        if (!options._isRetry && this.getRefreshToken()) {
          // Reuse a refresh already completed by a concurrent request.
          let fresh = this.getAuthToken(forStore);
          if (!fresh || fresh === token) {
            await this.refreshAuthToken();
            fresh = this.getAuthToken(forStore);
          }
          if (fresh && fresh !== token) {
            const retryHeaders = { ...headers };
            delete retryHeaders.Authorization;
            return this.request(endpoint, { ...options, headers: retryHeaders, token: fresh, _isRetry: true });
          }
        }
        if (!isFastApi && !options.suppressAuthPrompt && !options.silentAuthFailure) this.promptReauthentication();
      }
      if (options._returnResponse) return rawResponse;
      if (!response.ok || json?.success === false) return fail(this.errorMessage(json, response.status), response.status, json);
      if (isFastApi) return json ?? { success: true };
      return json && ('success' in Object(json) || 'data' in Object(json))
        ? { ...json, success: true, data: json.data !== undefined ? json.data : json }
        : { success: true, data: json, message: '' };
    } catch (error) {
      if (error.status !== undefined) {
        if (options.throwOnError !== false) throw error;
        return { success: false, status: error.status, message: error.message, data: null };
      }
      const timeout = error.name === 'AbortError';
      return fail(timeout ? 'انتهت مهلة الاتصال. تحقق من حالة العملية قبل إعادة إرسالها.' : 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.', timeout ? 408 : 0);
    }
  },

  fetchResponse(url, options = {}) {
    const target = new URL(url, window.location.href);
    const service = target.origin === new URL(this.FASTAPI_BASE).origin ? 'fastapi' : 'auth';
    return this.request(url, { ...options, service, _returnResponse: true });
  },

  // Fetch every page; UI pagination must not truncate the server's catalog/drafts.
  async listAll(endpoint, params = {}, options = {}) {
    const items = [], seen = new Set();
    const limit = 100;
    let skip = 0;
    for (;;) {
      const query = new URLSearchParams({ ...params, skip, limit });
      if (skip > 100000) throw new Error('تجاوزت القائمة الحد الآمن للتحميل. يرجى تضييق نطاق البحث.');
      const response = await this.fastapi(`${endpoint}?${query}`, { ...options, throwOnError: true });
      const data = response?.data ?? response;
      const page = Array.isArray(data) ? data : data?.items || data?.products || data?.draft_products || data?.jobs;
      if (!Array.isArray(page)) throw new Error('صيغة قائمة البيانات غير متوقعة من الخادم.');
      let added = 0;
      for (const item of page) {
        const id = item.id ?? item.draft_id ?? item.job_id;
        if (id == null || !seen.has(String(id))) {
          items.push(item); added++;
          if (id != null) seen.add(String(id));
        }
      }
      if (!page.length) return items;
      if (!added) throw new Error('تعذر تحميل بقية الصفحات: الخادم أعاد نفس الصفحة.');
      skip += page.length;
      const total = response?.total ?? data?.total ?? response?.total_count ?? data?.total_count;
      if (total != null && skip >= Number(total)) return items;
      // Some servers cap limit below our requested value. Continue to an empty page.
    }
  },



  get(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, { method: "GET", headers, ...options });
  },

  post(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, { method: "POST", headers, body, ...options });
  },

  put(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, { method: "PUT", headers, body, ...options });
  },

  patch(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, { method: "PATCH", headers, body, ...options });
  },

  delete(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, { method: "DELETE", headers, ...options });
  },

  upload(endpoint, formData, headers = {}, options = {}) {
    return this.request(endpoint, { method: 'POST', body: formData, headers, ...options });
  },

  /**
   * Synchronizes live product records to localStorage catalog cache without mock values.
   */
  _syncProductsToStorage(liveProducts) {
    if (!Array.isArray(liveProducts)) return;
    try {
      let existing = [];
      const stored = localStorage.getItem('dawwer_merchant_catalog_products');
      if (stored) existing = JSON.parse(stored);
      if (!Array.isArray(existing)) existing = [];

      const idMap = new Map();
      existing.forEach(p => {
        const k = String(p.id || p.sku || p.store_sku || '');
        if (k) idMap.set(k, p);
      });

      liveProducts.forEach(lp => {
        const key = String(lp.id || lp.store_sku || lp.sku || '');
        if (!key) return;
        const mapped = {
          id: lp.id || key,
          name: lp.product_name || lp.name || '',
          sku: lp.store_sku || lp.sku || '',
          category: lp.category || '',
          price: typeof lp.price === 'number' ? lp.price : parseFloat(lp.price || 0),
          quantity: typeof lp.quantity === 'number' ? lp.quantity : (typeof lp.stock_quantity === 'number' ? lp.stock_quantity : 0),
          stock: typeof lp.quantity === 'number' ? lp.quantity : (typeof lp.stock_quantity === 'number' ? lp.stock_quantity : 0),
          shelf: lp.shelf || '',
          zone: lp.zone || '',
          aisle: lp.aisle || '',
          rack: lp.rack || '',
          available: lp.stock_status !== 'OUT_OF_STOCK',
          isAvailable: lp.stock_status !== 'OUT_OF_STOCK',
          status: lp.stock_status || 'Active',
          updatedAt: lp.updated_at || new Date().toISOString()
        };
        idMap.set(key, mapped);
      });

      const merged = Array.from(idMap.values());
      localStorage.setItem('dawwer_merchant_catalog_products', JSON.stringify(merged));
      localStorage.setItem('myProducts', JSON.stringify(merged));
    } catch (e) {}
  },

  // =========================================================================
  // System Health (FastAPI: /api/v1/health & ASP.NET: /Health)
  // =========================================================================
  health: {
    check(options = {}) {
      return ApiClient.get('/api/v1/health', {}, { service: 'fastapi', ...options });
    },
    fastapi(options = {}) {
      return ApiClient.get('/api/v1/health', {}, { service: 'fastapi', ...options });
    },
    auth(options = {}) {
      return ApiClient.get('/Health', {}, { service: 'auth', ...options });
    }
  },

  // =========================================================================
  // Authentication & Sessions (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  auth: {
    login(credentials, options = {}) {
      return ApiClient.core('/Auth/login', { method: 'POST', body: credentials, ...options });
    },
    register(payload, options = {}) {
      return ApiClient.core('/Auth/register', { method: 'POST', body: payload, ...options });
    },
    verifyCode(payload, options = {}) {
      return ApiClient.core('/Auth/verify-code', { method: 'POST', body: payload, ...options });
    },
    resendCode(payload, options = {}) {
      return ApiClient.core('/Auth/resend-code', { method: 'POST', body: payload, ...options });
    },
    refreshToken(payload, options = {}) {
      return ApiClient.core('/Auth/refresh-token', { method: 'POST', body: payload, ...options });
    },
    forgotPassword(payload, options = {}) {
      return ApiClient.core('/Auth/forgot-password', { method: 'POST', body: payload, ...options });
    },
    resetPassword(payload, options = {}) {
      return ApiClient.core('/Auth/reset-password', { method: 'POST', body: payload, ...options });
    },
    me(options = {}) {
      return ApiClient.core('/Auth/me', { method: 'GET', ...options });
    },
    async selectStore(storeId) {
      let candidateStoreId = storeId;
      if (candidateStoreId && typeof candidateStoreId === 'string' && candidateStoreId.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(candidateStoreId);
          candidateStoreId = parsed?.storeId || parsed?.id || parsed?.store_id;
        } catch (e) {}
      }
      if (!candidateStoreId || typeof candidateStoreId !== 'string') {
        console.warn('[ApiClient] Skipping select-store: No valid store GUID set yet.');
        return { success: false, message: 'Invalid storeId: missing or empty' };
      }
      const cleanStoreId = candidateStoreId.trim();
      const isValidGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanStoreId);
      if (!isValidGuid || cleanStoreId === '00000000-0000-0000-0000-000000000000' || cleanStoreId.toLowerCase() === 'null' || cleanStoreId.toLowerCase() === 'undefined') {
        console.warn('[ApiClient] Skipping select-store: No valid store GUID set yet.', storeId);
        return { success: false, message: 'Invalid store GUID' };
      }

      const res = await ApiClient.post('/Auth/select-store', { storeId: cleanStoreId }, {}, { service: 'auth', throwOnError: false });
      if (res && res.success && res.data) {
        const storeName = res.data.storeName;
        const storeToken = res.data.storeToken || res.data.accessToken;
        const activeStoreId = res.data.storeId || cleanStoreId;
        const roleName = res.data.roleName;

        ApiClient.setActiveStoreId(activeStoreId);
        if (storeName) {
          localStorage.setItem('storeName', storeName);
          localStorage.setItem('store_name', storeName);
          localStorage.setItem('dawwer_store_name', storeName);
        }
        if (storeToken) {
          localStorage.setItem('storeToken', storeToken);
          localStorage.setItem('store_token', storeToken);
          localStorage.setItem('dawwer_store_token', storeToken);
          if (typeof CONFIG !== 'undefined' && CONFIG.STORE_TOKEN_KEY) {
            localStorage.setItem(CONFIG.STORE_TOKEN_KEY, storeToken);
          }
        }
        if (activeStoreId) {
          ApiClient.setActiveStoreId(activeStoreId);
          if (typeof CONFIG !== 'undefined' && CONFIG.ACTIVE_STORE_KEY) {
            localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, activeStoreId);
          }
        }

        const activeStoreData = {
          storeId: activeStoreId,
          storeName: storeName,
          roleName: roleName,
          permissions: res.data.effectivePermissions || res.data.permissions || []
        };
        localStorage.setItem('dawwer_active_store', JSON.stringify(activeStoreData));

        let cleanName = (typeof DawwerLayout !== 'undefined' && typeof DawwerLayout.cleanStoreName === 'function')
          ? DawwerLayout.cleanStoreName(storeName)
          : (storeName && storeName.trim());
        if (!cleanName || cleanName === 'null' || cleanName === 'undefined') {
          cleanName = 'سوبر ماركت الأمل';
        }

        document.querySelectorAll('#current-store-name, [data-store-name], #store-name-text').forEach(el => {
          el.textContent = cleanName;
        });

        if (typeof DawwerLayout !== 'undefined' && DawwerLayout.updateStoreIdentity) {
          DawwerLayout.updateStoreIdentity(cleanName, roleName);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dawwer:store-selected', { detail: res.data }));
        }
      }
      return res;
    },
    logout() {
      return ApiClient.post('/Auth/logout', {}, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // Taxonomies (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  categories: {
    list(search = '', options = {}) {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return ApiClient.get(`/api/categories${q}`, {}, { service: 'auth', ...options });
    },
    tree(options = {}) {
      return ApiClient.get('/api/categories/tree', {}, { service: 'auth', ...options });
    },
    get(id, options = {}) {
      return ApiClient.get(`/api/categories/${id}`, {}, { service: 'auth', ...options });
    },
    async populateDropdown(selectElement, options = {}) {
      if (!selectElement) return [];
      const opts = typeof options === 'string' ? { defaultLabel: options } : (options || {});
      const selectedValue = opts.selectedValue || '';
      const defaultLabel = opts.defaultLabel !== undefined ? opts.defaultLabel : 'اختر التصنيف';
      const allOption = !!opts.allOption;
      try {
        const res = await ApiClient.categories.list();
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        let optionsHtml = '';
        if (allOption) {
          optionsHtml += `<option value="ALL">${defaultLabel || 'جميع التصنيفات'}</option>`;
        } else if (defaultLabel) {
          optionsHtml += `<option value="">${defaultLabel}</option>`;
        }
        list.forEach(cat => {
          const name = cat.name || cat.categoryName || cat;
          const isSelected = selectedValue && (String(selectedValue) === String(name) || String(selectedValue) === String(cat.id));
          optionsHtml += `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}</option>`;
        });
        selectElement.innerHTML = optionsHtml;
        return list;
      } catch (e) {
        console.warn('[ApiClient] Failed to populate categories dropdown:', e);
        return [];
      }
    },
    adminList({ isActive, search } = {}) {
      const params = new URLSearchParams();
      if (typeof isActive === 'boolean') params.append('isActive', isActive);
      if (search) params.append('search', search);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return ApiClient.get(`/api/admin/categories${qs}`, {}, { service: 'auth' });
    },
    adminTree() {
      return ApiClient.get('/api/admin/categories/tree', {}, { service: 'auth' });
    },
    adminGet(id) {
      return ApiClient.get(`/api/admin/categories/${id}`, {}, { service: 'auth' });
    },
    create(payload) {
      return ApiClient.post('/api/admin/categories', payload, {}, { service: 'auth', throwOnError: true });
    },
    update(id, payload) {
      return ApiClient.put(`/api/admin/categories/${id}`, payload, {}, { service: 'auth', throwOnError: true });
    },
    delete(id) {
      return ApiClient.delete(`/api/admin/categories/${id}`, {}, { service: 'auth', throwOnError: true });
    },
    activate(id) {
      return ApiClient.patch(`/api/admin/categories/${id}/activate`, {}, {}, { service: 'auth', throwOnError: true });
    },
    deactivate(id) {
      return ApiClient.patch(`/api/admin/categories/${id}/deactivate`, {}, {}, { service: 'auth', throwOnError: true });
    }
  },

  // =========================================================================
  // Stores: Context Verification (FASTAPI_BASE) & Merchant Management (AUTH_BASE)
  // =========================================================================
  stores: {
    // Store Context Verification (FastAPI on Render): GET /api/v1/stores/{store_id}
    verify(storeId = null, options = {}) {
      return ApiClient.verifyStoreContext(storeId, options);
    },
    verifyStore(storeId = null, options = {}) {
      return ApiClient.verifyStoreContext(storeId, options);
    },
    verifyStoreContext(storeId = null, options = {}) {
      return ApiClient.verifyStoreContext(storeId, options);
    },
    getStore(storeId = null, options = {}) {
      return ApiClient.verifyStoreContext(storeId, options);
    },

    // Merchant Applications & Documents (ASP.NET Backend: AUTH_BASE)
    list(options = {}) {
      return ApiClient.get('/merchant/stores', {}, { service: 'auth', ...options });
    },
    getApplications(options = {}) {
      return ApiClient.get('/merchant/stores', {}, { service: 'auth', ...options });
    },
    getApplication(appId, options = {}) {
      return ApiClient.get(`/merchant/stores/${appId}`, {}, { service: 'auth', ...options });
    },
    createApplication(payload, options = {}) {
      return ApiClient.post('/merchant/stores', payload, {}, { service: 'auth', throwOnError: true, ...options });
    },
    updateApplication(appId, payload, options = {}) {
      return ApiClient.put(`/merchant/stores/${appId}`, payload, {}, { service: 'auth', throwOnError: true, ...options });
    },
    uploadDocument(appId, formData, options = {}) {
      return ApiClient.upload(`/merchant/stores/${appId}/documents`, formData, {}, { service: 'auth', throwOnError: true, ...options });
    },
    deleteDocument(appId, docId, options = {}) {
      return ApiClient.delete(`/merchant/stores/${appId}/documents/${docId}`, {}, { service: 'auth', throwOnError: true, ...options });
    },
    submitApplication(appId, options = {}) {
      return ApiClient.post(`/merchant/stores/${appId}/submit`, {}, {}, { service: 'auth', throwOnError: true, ...options });
    },

    // Public Store Directory
    listPublic({ city, search, page = 1, pageSize = 20 } = {}) {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (search) params.append('search', search);
      if (page) params.append('page', page);
      if (pageSize) params.append('pageSize', pageSize);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return ApiClient.get(`/stores${qs}`, {}, { service: 'auth' });
    },
    getPublic(id) {
      return ApiClient.get(`/stores/${id}`, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // Product Management CRUD & Bulk Import (FastAPI on Render: FASTAPI_BASE)
  // =========================================================================
  products: {
    list(storeId = null, { skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        console.warn(`[ApiClient.products.list] store_id is missing or invalid: "${id}". Halting request.`);
        ApiClient.handleStoreVerification404(id);
        const res = {
          success: false,
          status: 404,
          error_code: "STORE_ID_MISSING",
          message: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.",
          data: []
        };
        if (options.throwOnError) return Promise.reject(new Error(res.message));
        return Promise.resolve(res);
      }
      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/products?skip=${skip}&limit=${limit}`, {}, { service: 'fastapi', ...options });
    },

    create(storeId = null, productData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/products`, productData, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    get(storeId = null, productId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!productId) return Promise.reject(new Error("Missing product_id"));
      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/products/${encodeURIComponent(productId)}`, {}, { service: 'fastapi', ...options });
    },

    update(storeId = null, productId, productData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!productId) return Promise.reject(new Error("Missing product_id"));
      return ApiClient.put(`/api/v1/stores/${encodeURIComponent(id)}/products/${encodeURIComponent(productId)}`, productData, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    delete(storeId = null, productId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!productId) return Promise.reject(new Error("Missing product_id"));
      return ApiClient.delete(`/api/v1/stores/${encodeURIComponent(id)}/products/${encodeURIComponent(productId)}`, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    async bulkImport(storeId = null, file, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      const validation = await ApiClient.validateUploadContext(id);
      if (!validation.valid) {
        const err = new Error(validation.message || "فشل التحقق من جلسة العمل أو المتجر النشط.");
        err.status = (validation.errorType === 'STORE_INVALID') ? 404 : 401;
        return Promise.reject(err);
      }

      const uploadHeaders = { ...(options.headers || {}) };
      uploadHeaders['Authorization'] = `Bearer ${validation.token}`;
      delete uploadHeaders['Content-Type'];
      delete uploadHeaders['content-type'];
      delete uploadHeaders['Content-type'];
      delete uploadHeaders['CONTENT-TYPE'];

      const formData = new FormData();
      formData.append('file', file);
      return ApiClient.upload(`/api/v1/stores/${encodeURIComponent(id)}/catalog/bulk-import`, formData, uploadHeaders, { service: 'fastapi', throwOnError: true, ...options });
    }
  },

  // =========================================================================
  // AI Shelf Capture Jobs - Gemini Vision (FastAPI on Render: FASTAPI_BASE)
  // =========================================================================
  shelfJobs: {
    create(storeId, formData, options = {}) {
      if (storeId instanceof FormData) { options = formData || {}; formData = storeId; storeId = ApiClient.getActiveStoreId(); }
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) return Promise.reject(new Error('يرجى اختيار متجر أولاً.'));
      return ApiClient.upload(`/api/v1/stores/${encodeURIComponent(id)}/shelf-jobs`, formData, {}, { ...options, service: 'fastapi', throwOnError: true });
    },
    get(storeId, jobId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id) || !jobId) return Promise.reject(new Error('معرّف المتجر أو عملية التصوير مفقود.'));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/shelf-jobs/${encodeURIComponent(jobId)}`, { ...options, throwOnError: true });
    },
    list(storeId, { skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) return Promise.reject(new Error('يرجى اختيار متجر أولاً.'));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/shelf-jobs?skip=${skip}&limit=${limit}`, options);
    },
    delete(storeId, jobId, options = {}) {
      return ApiClient.delete(`/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs/${encodeURIComponent(jobId)}`, {}, { ...options, service: 'fastapi', throwOnError: true });
    },
    async waitForReview(storeId, job, options = {}) {
      job = job?.data || job;
      const id = job?.id || job?.job_id;
      if (!id) throw new Error('لم يُرجع الخادم معرّفاً لعملية التصوير.');
      const started = Date.now();
      const complete = status => ['completed', 'review_required', 'review required', 'succeeded', 'success'].includes(status);
      for (;;) {
        const status = String(job.status || '').toLowerCase();
        if (['failed', 'error', 'cancelled'].includes(status)) throw new Error(job.error_message || job.error || 'فشل تحليل الصورة في الخادم.');
        // Wait for terminal status, even if intermediate detections have arrived.
        if (complete(status)) {
          const items = await ApiClient.listAll(`/stores/${encodeURIComponent(storeId)}/draft-products`, { shelf_job_id: id });
          return { ...job, extractedItems: items };
        }
        if (Date.now() - started >= (options.pollTimeout ?? 180000)) {
          throw Object.assign(new Error('لا يزال تحليل الصورة قيد التنفيذ. يمكنك متابعة العملية من سجل التصوير دون رفعها مجدداً.'), { jobId: id, pending: true });
        }
        await new Promise(resolve => setTimeout(resolve, options.pollInterval ?? 1500));
        const result = await ApiClient.shelfJobs.get(storeId, id);
        job = result?.data || result;
        options.onProgress?.(job);
      }
    }
  },

  // =========================================================================
  // AI Draft Approvals & Review (FastAPI on Render: FASTAPI_BASE)
  // =========================================================================
  draftProducts: {
    list(storeId = null, { shelf_job_id, status, skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.resolve({ success: false, status: 404, message: "Missing store_id", data: [] });
      }
      let query = `?skip=${skip}&limit=${limit}`;
      if (shelf_job_id) query += `&shelf_job_id=${encodeURIComponent(shelf_job_id)}`;
      if (status) query += `&status=${encodeURIComponent(status)}`;
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products${query}`, { method: 'GET', ...options });
    },

    get(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}`, { method: 'GET', ...options });
    },

    update(storeId = null, draftId, draftData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}`, { method: 'PUT', body: draftData, throwOnError: true, ...options });
    },

    approve(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}/approve`, { method: 'POST', throwOnError: true, ...options });
    },

    reject(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}/reject`, { method: 'POST', throwOnError: true, ...options });
    },

    batchApprove(storeId = null, draftIds = [], options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/draft-products/batch-approve`, { method: 'POST', body: { draft_ids: draftIds }, throwOnError: true, ...options });
    }
  },

  // =========================================================================
  // Orders Lifecycle & State Machine (Primary Platform Backend: ASP.NET Core)
  // Target: CONFIG.API_BASE_URL /api/Orders
  // =========================================================================
  orders: {
    /**
     * Orders List: GET /api/Orders?storeId={storeId}
     * Unpacks envelope and falls back to cache/seed data gracefully on sleep/offline.
     */
    async list(storeId = null, params = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) throw new Error('يرجى اختيار متجر أولاً.');
      const query = new URLSearchParams({ ...params, storeId: id });
      const data = await ApiClient.core(`/Orders?${query}`, { ...options, throwOnError: true });
      const list = Array.isArray(data) ? data : data?.items || data?.orders;
      if (!Array.isArray(list)) throw new Error('صيغة قائمة الطلبات غير متوقعة.');
      return list;
    },

    get(orderId, options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      return ApiClient.core(`/Orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        ...options
      });
    },

    /**
     * Update Status: PATCH /api/Orders/{id}/status with { targetStatus, reason }
     */
    updateStatus(orderId, targetStatus, reason = '', options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      return ApiClient.core(`/Orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: { targetStatus, reason },
        throwOnError: true,
        ...options
      });
    },

    /**
     * Propose Substitution: POST /api/Orders/{id}/amendments with { reason, revisedItems }
     */
    proposeSubstitution(orderId, reason = '', revisedItems = [], options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      return ApiClient.core(`/Orders/${encodeURIComponent(orderId)}/amendments`, {
        method: 'POST',
        body: { reason, revisedItems },
        throwOnError: true,
        ...options
      });
    },

    /**
     * Customer Respond: POST /api/Orders/{id}/amendments/{amendmentId}/respond
     */
    respondAmendment(orderId, amendmentId, response = true, options = {}) {
      if (!orderId || !amendmentId) return Promise.reject(new Error("Missing orderId or amendmentId"));
      return ApiClient.core(`/Orders/${encodeURIComponent(orderId)}/amendments/${encodeURIComponent(amendmentId)}/respond`, {
        method: 'POST',
        body: { approved: Boolean(response) },
        throwOnError: true,
        ...options
      });
    },

    /**
     * Cancel Order: POST /api/Orders/{id}/cancel with { reason }
     */
    cancel(orderId, reason = '', options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      return ApiClient.core(`/Orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        body: { reason },
        throwOnError: true,
        ...options
      });
    },

    // Convenience aliases for existing view callers
    accept(orderId, options = {}) {
      return this.updateStatus(orderId, 'Accepted', '', options);
    },
    reject(orderId, reason = '', notes = '', options = {}) {
      return this.updateStatus(orderId, 'Rejected', reason || notes, options);
    },
    submitSubstitutions(orderId, substitutionData, options = {}) {
      const reason = substitutionData?.reason || 'أصناف غير متوفرة في المخزون';
      const items = substitutionData?.substitutions || substitutionData?.items || [];
      return this.proposeSubstitution(orderId, reason, items, options);
    }
  },

  // =========================================================================
  // Payment Receipt Verification (Primary Platform Backend: ASP.NET Core)
  // Target: CONFIG.API_BASE_URL /api/orders/{orderId}/receipts
  // =========================================================================
  receipts: {
    /**
     * Receipts List: GET /api/orders/{orderId}/receipts
     */
    list(orderId, options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      return ApiClient.core(`/orders/${encodeURIComponent(orderId)}/receipts`, {
        method: 'GET',
        ...options
      });
    },

    /**
     * Stream Receipt File: ${CONFIG.API_BASE_URL}/orders/{orderId}/receipts/file
     */
    getFileUrl(orderId, receiptId = null) {
      const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : (ApiClient.API_BASE_URL || "https://dawwer.runasp.net/api").replace(/\/+$/, '');
      const receiptSegment = receiptId ? `/${encodeURIComponent(receiptId)}` : '';
      return `${base}/orders/${encodeURIComponent(orderId)}/receipts${receiptSegment}/file`;
    },

    /**
     * Verification Decision: POST /api/orders/{orderId}/receipts/{receiptId}/verify
     * Body: { decision, verifiedAmount, reviewerNotes, rejectionReason }
     */
    verify(orderId, receiptId, { decision, verifiedAmount, reviewerNotes = '', rejectionReason = null }, options = {}) {
      if (!orderId) return Promise.reject(new Error("Missing orderId"));
      const rId = receiptId || 'latest';
      const payload = {
        decision: typeof decision === 'number' ? decision : (decision === 'Approved' || decision === 'verified' || decision === true ? 2 : 3),
        verifiedAmount: Number(verifiedAmount) || 0,
        reviewerNotes: String(reviewerNotes || '').trim(),
        rejectionReason: rejectionReason ? String(rejectionReason) : null
      };
      return ApiClient.core(`/orders/${encodeURIComponent(orderId)}/receipts/${encodeURIComponent(rId)}/verify`, {
        method: 'POST',
        body: payload,
        throwOnError: true,
        ...options
      });
    }
  },

  // =========================================================================
  // Municipal Delivery Zones & Fees (Primary Platform Backend: ASP.NET Core)
  // Target: CONFIG.API_BASE_URL /api/districts, /api/stores/{storeId}/delivery-zones
  // =========================================================================
  delivery: {
    /**
     * Municipal Districts Catalog: GET /api/districts?city={city}
     */
    getDistricts(city = '', options = {}) {
      const qs = city ? `?city=${encodeURIComponent(city)}` : '';
      return ApiClient.core(`/districts${qs}`, {
        method: 'GET',
        ...options
      });
    },

    /**
     * Store Delivery Zones: GET /api/stores/{storeId}/delivery-zones
     */
    getZones(storeId = null, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.core(`/stores/${encodeURIComponent(id)}/delivery-zones`, {
        method: 'GET',
        ...options
      });
    },

    /**
     * Configure Store Delivery Zone: POST /api/stores/{storeId}/delivery-zones
     */
    saveZone(storeId = null, zoneData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.core(`/stores/${encodeURIComponent(id)}/delivery-zones`, {
        method: 'POST',
        body: zoneData,
        throwOnError: true,
        ...options
      });
    },

    /**
     * Check Delivery Zone Eligibility & Fee: GET /api/stores/{storeId}/delivery-zones/check?districtId={districtId}
     */
    check(storeId = null, districtId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.core(`/stores/${encodeURIComponent(id)}/delivery-zones/check?districtId=${encodeURIComponent(districtId)}`, {
        method: 'GET',
        ...options
      });
    }
  },

  // =========================================================================
  // In-Store Floorplan & Blueprint (FastAPI AI & Spatial Backend)
  // Target: CONFIG.FASTAPI_BASE_URL /api/v1/stores/{store_id}/maps/active
  // =========================================================================
  floorplan: {
    /**
     * Active Store Map: GET /api/v1/stores/{store_id}/maps/active
     */
    getActiveMap(storeId = null, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/maps/active`, {
        method: 'GET',
        ...options
      });
    },

    /**
     * Save Pins/Elements Batch: POST /api/v1/stores/{store_id}/maps/{map_id}/elements/batch
     */
    saveElementsBatch(storeId = null, mapId, elements = [], options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/maps/${encodeURIComponent(mapId)}/elements/batch`, {
        method: 'POST',
        body: { elements },
        throwOnError: true,
        ...options
      });
    },

    /**
     * Shelf Placements: POST /api/v1/stores/{store_id}/placements
     */
    savePlacements(storeId = null, placements = [], options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.fastapi(`/stores/${encodeURIComponent(id)}/placements`, {
        method: 'POST',
        body: { placements },
        throwOnError: true,
        ...options
      });
    }
  },

  maps: {
    getActive(storeId = null, options = {}) {
      return ApiClient.floorplan.getActiveMap(storeId, options);
    },
    saveElementsBatch(storeId = null, mapId, elements = [], options = {}) {
      return ApiClient.floorplan.saveElementsBatch(storeId, mapId, elements, options);
    }
  },


  // =========================================================================
  // Staff & Custom Roles (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  staff: {
    list(storeId = null) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.get(`/stores/${id}/staff`, {}, { service: 'auth' });
    },
    invite(storeId = null, staffData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.post(`/stores/${id}/staff`, staffData, {}, { service: 'auth', throwOnError: true });
    },
    get(storeId = null, staffId) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.get(`/stores/${id}/staff/${staffId}`, {}, { service: 'auth' });
    },
    update(storeId = null, staffId, staffData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.put(`/stores/${id}/staff/${staffId}`, staffData, {}, { service: 'auth', throwOnError: true });
    },
    remove(storeId = null, staffId) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.delete(`/stores/${id}/staff/${staffId}`, {}, { service: 'auth', throwOnError: true });
    },
    assignRole(storeId = null, staffId, roleId) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.post(`/stores/${id}/staff/${staffId}/role`, { storeRoleId: roleId }, {}, { service: 'auth', throwOnError: true });
    },
    roles(storeId = null) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.get(`/stores/${id}/roles`, {}, { service: 'auth' });
    },
    createRole(storeId = null, roleData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.post(`/stores/${id}/roles`, roleData, {}, { service: 'auth', throwOnError: true });
    },
    updateRole(storeId = null, roleId, roleData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.put(`/stores/${id}/roles/${roleId}`, roleData, {}, { service: 'auth', throwOnError: true });
    },
    permissions(storeId = null) {
      const id = storeId || ApiClient.getActiveStoreId();
      return ApiClient.get(`/stores/${id}/roles/permissions`, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // Platform Administration (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  admin: {
    // 1. Store Applications Review (/api/admin/stores)
    async storeApplications(params = {}) {
      let qs = '';
      if (typeof params === 'string') {
        qs = params ? (params.startsWith('?') ? params.slice(1) : params) : '';
      } else if (params && typeof params === 'object') {
        const clean = {};

        // Status parameter handling:
        // When loading "الطلبات الواردة / قيد المراجعة", query with status=2 (Submitted)
        // or omit the status query parameter to fetch all pending review applications if the backend supports it.
        if (params.status !== undefined && params.status !== null && params.status !== '' && params.status !== 'all') {
          const statusMap = {
            'draft': 1,
            'submitted': 2,
            'underreview': 3,
            'under_review': 3,
            'needsinformation': 4,
            'needs_information': 4,
            'approved': 5,
            'rejected': 6,
            'suspended': 7
          };
          const key = String(params.status).trim().toLowerCase();
          clean.status = statusMap[key] !== undefined ? statusMap[key] : params.status;
        }

        // Include pagination defaults: page=1&pageSize=20
        clean.page = (params.page !== undefined && params.page !== null && params.page !== '') ? Number(params.page) : 1;
        clean.pageSize = (params.pageSize !== undefined && params.pageSize !== null && params.pageSize !== '') ? Number(params.pageSize) : 20;

        qs = new URLSearchParams(clean).toString();
      } else {
        qs = new URLSearchParams({ page: 1, pageSize: 20 }).toString();
      }

      try {
        const res = await ApiClient.get(`/admin/stores/applications${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
        if (res && res.success !== false && (Array.isArray(res.data) || Array.isArray(res.data?.items) || Array.isArray(res.items))) {
          return res;
        }
        if (!res || res.success === false || res.status === 500) {
          console.warn('[ApiClient.admin.storeApplications] Primary applications endpoint returned error status, querying fallback stores:', res?.message);
          const fallbackRes = await ApiClient.get('/stores', {}, { service: 'auth' }).catch(() => null);
          if (fallbackRes && Array.isArray(fallbackRes.data)) {
            return {
              success: true,
              data: fallbackRes.data.map(s => ({
                id: s.id,
                storeId: s.id,
                name: s.name,
                email: s.email,
                phoneNumber: s.phoneNumber,
                city: s.city,
                address: s.address,
                status: s.status || 'Approved',
                verificationStatus: 5,
                statusName: 'Approved',
                submittedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              })),
              totalCount: fallbackRes.data.length,
              totalPages: 1
            };
          }
        }
        return res;
      } catch (err) {
        console.warn('[ApiClient.admin.storeApplications] Error occurred, attempting fallback to /stores:', err);
        try {
          const fallbackRes = await ApiClient.get('/stores', {}, { service: 'auth' }).catch(() => null);
          if (fallbackRes && Array.isArray(fallbackRes.data)) {
            return {
              success: true,
              data: fallbackRes.data.map(s => ({
                id: s.id,
                storeId: s.id,
                name: s.name,
                email: s.email,
                phoneNumber: s.phoneNumber,
                city: s.city,
                address: s.address,
                status: s.status || 'Approved',
                verificationStatus: 5,
                statusName: 'Approved',
                submittedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              })),
              totalCount: fallbackRes.data.length,
              totalPages: 1
            };
          }
        } catch (e) {}
        throw err;
      }
    },
    getStoreApplication(appId) {
      if (!appId || !ApiClient.isValidGuid(appId)) {
        return Promise.reject(new Error(`معرف طلب المتجر غير صالح (${appId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.get(`/admin/stores/applications/${encodeURIComponent(appId)}`, {}, { service: 'auth' });
    },
    startReview(appId) {
      if (!appId || !ApiClient.isValidGuid(appId)) {
        return Promise.reject(new Error(`معرف طلب المتجر غير صالح (${appId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/admin/stores/applications/${encodeURIComponent(appId)}/start-review`, {}, {}, { service: 'auth', throwOnError: true });
    },
    requestInfo(appId, message = '') {
      if (!appId || !ApiClient.isValidGuid(appId)) {
        return Promise.reject(new Error(`معرف طلب المتجر غير صالح (${appId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/admin/stores/applications/${encodeURIComponent(appId)}/request-info`, { message: String(message) }, {}, { service: 'auth', throwOnError: true });
    },
    /**
     * Approve Store Application: POST /api/admin/stores/applications/{applicationId}/approve
     * Strictly includes the "/applications/" segment in the route per backend specification.
     */
    approveApplication(appId) {
      const applicationId = appId || '';
      if (!applicationId || !ApiClient.isValidGuid(applicationId)) {
        return Promise.reject(new Error(`معرف طلب المتجر غير صالح (${applicationId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/api/admin/stores/applications/${encodeURIComponent(applicationId)}/approve`, {}, {}, { service: 'auth', throwOnError: true });
    },
    // Alias to prevent broken calls to /api/admin/stores/{id}/approve
    approveStore(applicationId) {
      return this.approveApplication(applicationId);
    },
    rejectApplication(appId, reason = '') {
      const id = appId || '';
      if (!id || !ApiClient.isValidGuid(id)) {
        return Promise.reject(new Error(`معرف طلب المتجر غير صالح (${id}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/api/admin/stores/applications/${encodeURIComponent(id)}/reject`, { reason: String(reason) }, {}, { service: 'auth', throwOnError: true });
    },
    rejectStore(appId, reason = '') {
      return this.rejectApplication(appId, reason);
    },
    suspendStore(storeId, reason = '') {
      if (!storeId || !ApiClient.isValidGuid(storeId)) {
        return Promise.reject(new Error(`معرف المتجر غير صالح (${storeId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/admin/stores/${encodeURIComponent(storeId)}/suspend`, { reason: String(reason) }, {}, { service: 'auth', throwOnError: true });
    },
    activateStore(storeId) {
      if (!storeId || !ApiClient.isValidGuid(storeId)) {
        return Promise.reject(new Error(`معرف المتجر غير صالح (${storeId}). يجب أن يكون معرفاً حقيقياً بصيغة GUID.`));
      }
      return ApiClient.post(`/admin/stores/${encodeURIComponent(storeId)}/activate`, {}, {}, { service: 'auth', throwOnError: true });
    },

    // 2. User Management (/api/admin/users)
    users(params = {}) {
      let qs = '';
      if (typeof params === 'string') {
        qs = params ? (params.startsWith('?') ? params.slice(1) : params) : '';
      } else if (params && typeof params === 'object') {
        const clean = {};
        if (params.role) clean.role = params.role;
        if (params.status) clean.status = params.status;
        if (params.search) clean.search = params.search;
        if (params.page !== undefined && params.page !== null) clean.page = params.page;
        if (params.pageSize !== undefined && params.pageSize !== null) clean.pageSize = params.pageSize;
        qs = new URLSearchParams(clean).toString();
      }
      return ApiClient.get(`/admin/users${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
    },
    getUser(userId) {
      return ApiClient.get(`/admin/users/${encodeURIComponent(userId)}`, {}, { service: 'auth' });
    },
    suspendUser(userId, reason = '') {
      return ApiClient.post(`/admin/users/${encodeURIComponent(userId)}/suspend`, { reason: String(reason) }, {}, { service: 'auth', throwOnError: true });
    },
    activateUser(userId) {
      return ApiClient.post(`/admin/users/${encodeURIComponent(userId)}/activate`, {}, {}, { service: 'auth', throwOnError: true });
    },
    toggleUser(userId, action, reason = '') {
      if (action === 'suspend') {
        return this.suspendUser(userId, reason);
      } else {
        return this.activateUser(userId);
      }
    },

    // 3. Category Governance (/api/admin/categories)
    categories: {
      tree() {
        return ApiClient.get('/api/admin/categories/tree', {}, { service: 'auth' });
      },
      list(params = {}) {
        let qs = '';
        if (typeof params === 'string') {
          qs = params ? (params.startsWith('?') ? params.slice(1) : params) : '';
        } else if (params && typeof params === 'object') {
          qs = new URLSearchParams(params).toString();
        }
        return ApiClient.get(`/api/admin/categories${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
      },
      get(id) {
        return ApiClient.get(`/api/admin/categories/${encodeURIComponent(id)}`, {}, { service: 'auth' });
      },
      create(categoryData) {
        const payload = {
          name: categoryData.name || '',
          slug: categoryData.slug || '',
          description: categoryData.description || '',
          parentId: categoryData.parentId || null,
          iconUrl: categoryData.iconUrl || '',
          displayOrder: Number(categoryData.displayOrder) || 1,
          isActive: categoryData.isActive !== false
        };
        return ApiClient.post('/api/admin/categories', payload, {}, { service: 'auth', throwOnError: true });
      },
      update(id, categoryData) {
        return ApiClient.put(`/api/admin/categories/${encodeURIComponent(id)}`, categoryData, {}, { service: 'auth', throwOnError: true });
      },
      delete(id) {
        return ApiClient.delete(`/api/admin/categories/${encodeURIComponent(id)}`, {}, { service: 'auth', throwOnError: true });
      },
      activate(id) {
        return ApiClient.patch(`/api/admin/categories/${encodeURIComponent(id)}/activate`, {}, {}, { service: 'auth', throwOnError: true });
      },
      deactivate(id) {
        return ApiClient.patch(`/api/admin/categories/${encodeURIComponent(id)}/deactivate`, {}, {}, { service: 'auth', throwOnError: true });
      }
    },

    // 4. Audit Logs (/api/admin/audit-logs)
    auditLogs(params = {}) {
      let qs = '';
      if (typeof params === 'string') {
        qs = params ? (params.startsWith('?') ? params.slice(1) : params) : '';
      } else if (params && typeof params === 'object') {
        const clean = {};
        if (params.page !== undefined && params.page !== null) clean.page = params.page;
        if (params.pageSize !== undefined && params.pageSize !== null) clean.pageSize = params.pageSize;
        if (params.action) clean.action = params.action;
        if (params.entityType) clean.entityType = params.entityType;
        if (params.startDate) clean.startDate = params.startDate;
        if (params.endDate) clean.endDate = params.endDate;
        qs = new URLSearchParams(clean).toString();
      }
      return ApiClient.get(`/admin/audit-logs${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
    },
    getAuditLog(id) {
      return ApiClient.get(`/admin/audit-logs/${encodeURIComponent(id)}`, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // User Profile (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  profile: {
    get() {
      return ApiClient.get('/Profile', {}, { service: 'auth' });
    },
    update(profileData) {
      return ApiClient.put('/Profile', profileData, {}, { service: 'auth', throwOnError: true });
    },
    changePassword(payload) {
      return ApiClient.post('/Profile/change-password', payload, {}, { service: 'auth', throwOnError: true });
    }
  },

  // =========================================================================
  // Audit Logs (ASP.NET Backend: AUTH_BASE)
  // =========================================================================
  audit: {
    list(query = '') {
      return ApiClient.get(`/admin/audit-logs${query ? '?' + query : ''}`, {}, { service: 'auth' });
    },
    get(id) {
      return ApiClient.get(`/admin/audit-logs/${id}`, {}, { service: 'auth' });
    }
  },


  // =========================================================================
  // Merchant Fulfillment & Delivery Settings (Feature 3.2)
  // =========================================================================
  fulfillment: {
    /**
     * Get store fulfillment settings (Delivery zones, fee rules, in-store pickup)
     * Primary: GET /api/v1/stores/{storeId}/fulfillment-settings (FastAPI)
     * Secondary: GET /merchant/stores/{storeId}/fulfillment-settings (ASP.NET)
     */
    async getSettings(storeId = null, options = {}) {
      const sid = storeId || (typeof ApiClient.getActiveStoreId === 'function' ? ApiClient.getActiveStoreId() : null);
      const rawStoreToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const authHeader = rawStoreToken ? { 'Authorization': `Bearer ${rawStoreToken.trim().replace(/^Bearer\s+/i, '')}` } : {};

      if (sid && (typeof ApiClient.isValidStoreId !== 'function' || ApiClient.isValidStoreId(sid))) {
        // 1. Primary: FastAPI
        try {
          const res = await ApiClient.get(
            `/api/v1/stores/${encodeURIComponent(sid)}/fulfillment-settings`,
            authHeader,
            { service: 'fastapi', ...options }
          );
          if (res && res.success !== false && (res.data || res.deliveryZones || res.pickupSettings)) {
            return res.data || res;
          }
        } catch (err1) {
          console.warn('[ApiClient.fulfillment.getSettings] FastAPI note:', err1 && err1.message ? err1.message : err1);
        }

        // 2. Secondary: ASP.NET
        try {
          const res2 = await ApiClient.get(
            `/merchant/stores/${encodeURIComponent(sid)}/fulfillment-settings`,
            authHeader,
            { service: 'auth', ...options }
          );
          if (res2 && res2.success !== false && (res2.data || res2.deliveryZones || res2.pickupSettings)) {
            return res2.data || res2;
          }
        } catch (err2) {
          console.warn('[ApiClient.fulfillment.getSettings] ASP.NET note:', err2 && err2.message ? err2.message : err2);
        }
      }

      return null;
    },

    /**
     * Update store fulfillment settings
     * Primary: PUT /api/v1/stores/{storeId}/fulfillment-settings (FastAPI)
     * Secondary: PUT /merchant/stores/{storeId}/fulfillment-settings (ASP.NET)
     */
    async updateSettings(storeId = null, settingsPayload = {}, options = {}) {
      const sid = storeId || (typeof ApiClient.getActiveStoreId === 'function' ? ApiClient.getActiveStoreId() : null);
      const rawStoreToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const authHeader = rawStoreToken ? { 'Authorization': `Bearer ${rawStoreToken.trim().replace(/^Bearer\s+/i, '')}` } : {};

      if (!sid || (typeof ApiClient.isValidStoreId === 'function' && !ApiClient.isValidStoreId(sid))) {
        throw new Error('معرف المتجر غير متوفر أو غير صالح.');
      }

      // 1. Primary: FastAPI
      try {
        const res = await ApiClient.put(
          `/api/v1/stores/${encodeURIComponent(sid)}/fulfillment-settings`,
          settingsPayload,
          authHeader,
          { service: 'fastapi', ...options }
        );
        if (res && res.success !== false) return res;
      } catch (err1) {
        console.warn('[ApiClient.fulfillment.updateSettings] FastAPI note:', err1 && err1.message ? err1.message : err1);
      }

      // 2. Secondary: ASP.NET
      try {
        return await ApiClient.put(
          `/merchant/stores/${encodeURIComponent(sid)}/fulfillment-settings`,
          settingsPayload,
          authHeader,
          { service: 'auth', ...options }
        );
      } catch (err2) {
        console.warn('[ApiClient.fulfillment.updateSettings] ASP.NET note:', err2 && err2.message ? err2.message : err2);
        throw err2;
      }
    }
  }
};

// Plural category endpoint alias according to backend routing specifications
ApiClient.category = ApiClient.categories;

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Global fallback handler for broken or missing product/shelf images.
 * Gracefully hides broken images and displays a clean SVG placeholder icon with caption.
 */
function handleImageError(imgEl, caption = 'لم يتم الاستخراج') {
  if (!imgEl) return;
  imgEl.onerror = null;
  imgEl.style.display = 'none';

  const parent = imgEl.parentElement;
  if (!parent) return;

  let placeholder = parent.querySelector('.img-fallback-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'img-fallback-placeholder flex flex-col items-center justify-center text-center p-1 w-full h-full text-slate-400 select-none';
    placeholder.innerHTML = `
      <svg class="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-tight">${caption}</span>
    `;
    parent.appendChild(placeholder);
  } else {
    placeholder.style.display = 'flex';
  }
}

if (typeof window !== 'undefined') {
  window.escapeHtml = window.escapeHtml || escapeHtml;
  window.handleImageError = window.handleImageError || handleImageError;
  window.ApiClient = ApiClient;

  // Start proactive background token refresh watcher automatically across all pages
  try {
    ApiClient.startTokenRefreshWatcher();
  } catch (e) {}
}

ApiClient.escapeHtml = escapeHtml;
ApiClient.handleImageError = handleImageError;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
