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

const AUTH_BASE = (typeof CONFIG !== 'undefined' && CONFIG.AUTH_BASE_URL)
  ? CONFIG.AUTH_BASE_URL
  : "https://dawwer.runasp.net/api";

const FASTAPI_BASE = (typeof CONFIG !== 'undefined' && CONFIG.PRODUCTS_BASE_URL)
  ? CONFIG.PRODUCTS_BASE_URL
  : "https://dawwer-backend-fastapi.onrender.com";

const AUTH_BASE_URL = AUTH_BASE;
const PRODUCTS_BASE_URL = FASTAPI_BASE;
const BASE_URL = FASTAPI_BASE;

const DEFAULT_TIMEOUT_MS = (typeof CONFIG !== 'undefined' && (CONFIG.REQUEST_TIMEOUT || CONFIG.TIMEOUT_MS))
  ? (CONFIG.REQUEST_TIMEOUT || CONFIG.TIMEOUT_MS)
  : 90000; // 90000ms (90 seconds) AbortController timeout threshold for Render cold-starts (updated from 15000ms)

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
  AUTH_BASE,
  FASTAPI_BASE,
  AUTH_BASE_URL,
  PRODUCTS_BASE_URL,
  BASE_URL,
  DEFAULT_TIMEOUT_MS,

  _storeVerificationPromptActive: false,

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
   * Verifies the store context against FastAPI Backend: GET /api/v1/stores/{store_id}
   * 
   * 1. Guard check before verifying store context:
   *    - If store_id is missing, null, undefined, or equal to the string "null" / "undefined",
   *      DO NOT make the HTTP request to /api/v1/stores/{store_id}.
   *    - Immediately redirect the user or prompt them to select a store via the store selection view
   *      instead of dispatching a GET request with an invalid/null ID.
   */
  async verifyStoreContext(storeId = null, options = {}) {
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
      const currentPath = (window.location.pathname || '').split('/').pop() || 'index.html';
      const exemptPages = ['login.html', 'register.html', 'verify-account.html', 'forgot-password.html', 'reset-password.html', 'admin-login.html', 'merchant-application.html', 'select-store.html'];

      if (!exemptPages.includes(currentPath)) {
        if (typeof window.DawwerLayout !== 'undefined' && typeof window.DawwerLayout.openStoreSwitcher === 'function') {
          window.DawwerLayout.openStoreSwitcher();
        } else if (!window.location.search.includes('selectStore=true')) {
          if (currentPath === 'index.html') {
            window.location.href = 'index.html?selectStore=true';
          } else {
            window.location.href = `index.html?selectStore=true&returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
    try {
      if (forStore) {
        const storeToken = localStorage.getItem('storeToken') ||
                           localStorage.getItem('store_token') ||
                           localStorage.getItem('dawwer_store_token') ||
                           (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.STORE_TOKEN_KEY) : null);
        if (storeToken && typeof storeToken === 'string') {
          const clean = storeToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
          if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) {
            return clean;
          }
        }
      }

      const token = localStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('access_token') ||
                    localStorage.getItem('dawwer_access_token') ||
                    (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.TOKEN_KEY) : null) ||
                    localStorage.getItem('dawwer_token') ||
                    localStorage.getItem('storeToken') ||
                    localStorage.getItem('store_token') ||
                    localStorage.getItem('dawwer_store_token') ||
                    (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.STORE_TOKEN_KEY) : null);

      if (token && typeof token === 'string') {
        const clean = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) {
          return clean;
        }
      }

      if (!forStore) {
        const storeToken = localStorage.getItem('storeToken') ||
                           localStorage.getItem('store_token') ||
                           localStorage.getItem('dawwer_store_token') ||
                           (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.STORE_TOKEN_KEY) : null);
        if (storeToken && typeof storeToken === 'string') {
          const clean = storeToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
          if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) {
            return clean;
          }
        }
      }

      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const st = userData?.storeToken;
        if (st && typeof st === 'string') {
          const clean = st.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
          if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) return clean;
        }
        const at = userData?.accessToken || userData?.token;
        if (at && typeof at === 'string') {
          const clean = at.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
          if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) return clean;
        }
      }
    } catch (e) {}

    return null;
  },

  /**
   * Retrieves a valid unexpired bearer authorization token for file uploads (AI & CSV/Excel).
   * Checks both 'storeToken' and 'accessToken' according to endpoint authentication rules:
   * Prioritizes valid unexpired storeToken for store-scoped uploads, falls back to valid unexpired accessToken.
   */
  getUploadAuthToken() {
    try {
      // 1. Check storeToken first (store-scoped operations)
      const storeToken = localStorage.getItem('storeToken') ||
                         localStorage.getItem('store_token') ||
                         localStorage.getItem('dawwer_store_token') ||
                         (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.STORE_TOKEN_KEY) : null);
      if (storeToken && typeof storeToken === 'string') {
        const clean = storeToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) {
          return clean;
        }
      }

      // 2. Check accessToken (user JWT bearer token)
      const accessToken = localStorage.getItem('accessToken') ||
                          localStorage.getItem('token') ||
                          localStorage.getItem('dawwer_access_token') ||
                          localStorage.getItem('access_token') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.TOKEN_KEY) : null);
      if (accessToken && typeof accessToken === 'string') {
        const clean = accessToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) {
          return clean;
        }
      }

      // 3. Check user data object in storage
      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        try {
          const userData = JSON.parse(userDataRaw);
          const st = userData?.storeToken;
          if (st && typeof st === 'string') {
            const clean = st.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
            if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) return clean;
          }
          const at = userData?.accessToken || userData?.token;
          if (at && typeof at === 'string') {
            const clean = at.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
            if (clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined' && !this.isTokenExpired(clean)) return clean;
          }
        } catch (e) {}
      }
    } catch (e) {}

    return null;
  },

  /**
   * Checks whether a JWT bearer token is missing or expired.
   * Returns true if token is missing, null, equal to "null"/"undefined", empty, or past exp timestamp.
   */
  isTokenExpired(token) {
    if (!token || typeof token !== 'string') return true;
    const clean = token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
    if (!clean || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') return true;
    try {
      const parts = clean.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
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
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          console.warn('[ApiClient] Silent refresh skipped: No refreshToken found in storage.');
          return null;
        }

        const accessToken = this.getRawAccessToken() || '';
        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.AUTH_BASE_URL)
          ? CONFIG.AUTH_BASE_URL
          : (this.AUTH_BASE_URL || 'https://dawwer.runasp.net/api');
        const refreshUrl = `${baseUrl.replace(/\/+$/, '')}/Auth/refresh-token`;

        console.info('[ApiClient] Attempting silent token refresh via POST /Auth/refresh-token...');
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            accessToken,
            refreshToken
          })
        });

        if (!response.ok) {
          console.warn(`[ApiClient] Silent refresh rejected with status HTTP ${response.status}`);
          return null;
        }

        const json = await response.json().catch(() => null);
        const data = json?.data || json;
        const newAccessToken = data?.accessToken || data?.token;
        const newRefreshToken = data?.refreshToken;
        let newStoreToken = data?.storeToken;

        if (newAccessToken) {
          this.setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            storeToken: newStoreToken
          });
          console.info('[ApiClient] Silent token refresh successful.');

          // If active store exists but storeToken was not returned in refresh, re-fetch storeToken
          const activeStoreId = this.getActiveStoreId();
          if (activeStoreId && this.isValidStoreId(activeStoreId) && !newStoreToken) {
            try {
              const selRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/Auth/select-store`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Authorization': `Bearer ${newAccessToken}`
                },
                body: JSON.stringify({ storeId: activeStoreId })
              });
              if (selRes.ok) {
                const selJson = await selRes.json().catch(() => null);
                const selData = selJson?.data || selJson;
                if (selData?.storeToken) {
                  this.setTokens({ storeToken: selData.storeToken });
                }
              }
            } catch (selErr) {
              console.warn('[ApiClient] Background store token renewal note:', selErr);
            }
          }

          return newAccessToken;
        }

        return null;
      } catch (err) {
        console.error('[ApiClient] Silent refresh error:', err);
        return null;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  _reauthPromptActive: false,

  /**
   * Cleanly prompts the user to re-authenticate without crashing with a 401 alert.
   * Debounced to avoid alert spam across concurrent requests.
   */
  promptReauthentication(customMessage = null) {
    if (this._reauthPromptActive) return;
    this._reauthPromptActive = true;

    const message = customMessage || "انتهت صلاحية جلسة العمل أو يلزم تسجيل الدخول مجدداً للمتابعة.";
    console.warn(`[ApiClient] Authentication required: ${message}`);

    if (typeof window !== 'undefined') {
      if (typeof window.showToast === 'function') {
        window.showToast({
          title: 'يلزم تسجيل الدخول',
          message: message,
          type: 'warning',
          duration: 7000
        });
      }

      try {
        window.dispatchEvent(new CustomEvent('dawwer:auth-required', {
          detail: { message }
        }));
      } catch (e) {}

      const alertBox = typeof document !== 'undefined' ? document.getElementById("alert-banner") : null;
      if (alertBox) {
        alertBox.innerHTML = `
          <div class="flex items-center justify-between">
            <span>${message}</span>
            <a href="login.html" class="underline font-bold text-amber-900 hover:text-black mr-2">تسجيل الدخول الآن</a>
          </div>
        `;
        alertBox.className = "mb-6 p-4 rounded-2xl text-sm font-bold bg-amber-50 border border-amber-200 text-amber-800 block";
      }
    }

    setTimeout(() => {
      this._reauthPromptActive = false;
    }, 3000);
  },

  /**
   * Pre-upload validation for Token & Store Context (Requirement 2).
   * Checks if valid token and active storeId exist before dispatching.
   * If token is expired but refresh token is available, performs silent refresh.
   * If token or storeId is missing, expired, or equals "null", prevents upload
   * and cleanly prompts the user.
   */
  async validateUploadContext(targetStoreId = null) {
    // 1. Check Store Context
    const storeId = targetStoreId || this.getActiveStoreId();
    if (!this.isValidStoreId(storeId)) {
      console.warn(`[ApiClient] Upload aborted: storeId is missing, null, or invalid ("${storeId}").`);
      this.handleStoreVerification404(storeId);
      return {
        valid: false,
        errorType: 'STORE_INVALID',
        message: 'معرّف المتجر غير متوفر أو غير صالح. يرجى اختيار المتجر أولاً.'
      };
    }

    // 2. Check Token (storeToken or accessToken)
    let token = this.getUploadAuthToken();

    // If token is missing or expired, attempt silent refresh if refreshToken is available
    if (!token && this.getRefreshToken()) {
      console.info('[ApiClient] Upload context: token expired or missing, attempting silent refresh before upload...');
      await this.refreshAuthToken();
      token = this.getUploadAuthToken();
    }

    if (!token || token === 'null' || token === 'undefined' || this.isTokenExpired(token)) {
      console.warn('[ApiClient] Upload aborted: No valid, unexpired token found.');
      this.promptReauthentication('انتهت صلاحية جلسة العمل أو يلزم تسجيل الدخول مجدداً لمتابعة رفع البيانات.');
      return {
        valid: false,
        errorType: 'AUTH_INVALID',
        message: 'جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول مجدداً للمتابعة.'
      };
    }

    return {
      valid: true,
      storeId,
      token
    };
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
   * Resolves target microservice ('fastapi' vs 'auth') based on endpoint routing rules.
   */
  resolveService(endpoint, options = {}) {
    if (options.service) {
      const s = String(options.service).toLowerCase();
      if (s === 'fastapi' || s === 'products') return 'fastapi';
      if (s === 'auth') return 'auth';
    }

    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const lower = clean.toLowerCase();

    // 1. Target AUTH_BASE for:
    // - Authentication & Sessions: /Auth/login, /Auth/register, /Auth/verify-code, /Auth/refresh-token, /Auth/logout
    // - Store Selection: /Auth/select-store
    // - Taxonomies: /categories, /categories/tree, /categories/{id}
    // - Merchant Applications & Documents: /merchant/stores, /merchant/stores/{id}/documents, /merchant/stores/{id}/submit
    // - Staff & Custom Roles: /stores/{storeId}/staff, /stores/{storeId}/roles
    // - Profile & Admin: /Profile, /admin/...
    if (
      lower.startsWith('/auth') ||
      lower.startsWith('/api/auth') ||
      lower.startsWith('/categories') ||
      lower.startsWith('/api/categories') ||
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

    // 2. Target FASTAPI_BASE for:
    // - System Health: /api/v1/health
    // - Store Context Verification: /api/v1/stores/{store_id}
    // - Product Management: /api/v1/stores/{store_id}/products...
    // - Bulk Catalog Import: /api/v1/stores/{store_id}/catalog/bulk-import
    // - AI Shelf Capture Jobs: /api/v1/stores/{store_id}/shelf-jobs...
    // - AI Draft Approvals & Review: /api/v1/stores/{store_id}/draft-products...
    if (
      lower.startsWith('/api/v1/') ||
      lower.includes('/shelf-jobs') ||
      lower.includes('/draft-products') ||
      lower.includes('/catalog/bulk-import') ||
      lower.includes('/products') ||
      lower === '/health' ||
      lower.startsWith('/health') ||
      (lower.startsWith('/stores/') && !lower.includes('/staff') && !lower.includes('/roles'))
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
  async request(endpoint, options = {}) {
    const url = this.resolveUrl(endpoint, options);
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const lower = cleanEndpoint.toLowerCase();
    const service = this.resolveService(cleanEndpoint, options);
    const isFastApi = (service === 'fastapi');
    const method = (options.method || 'GET').toUpperCase();

    const headers = { ...(options.headers || {}) };

    // Determine upload / multipart
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const isUploadEndpoint = lower.includes('/shelf-jobs') || lower.includes('/bulk-import') || lower.includes('/documents');
    const isFileUpload = isFormData || options.isUpload || (isUploadEndpoint && options.body && typeof options.body !== 'string');

    // Check if target is FastAPI backend (onrender.com) or /shelf-jobs
    const isFastApiTarget = isFastApi ||
                            url.includes('dawwer-backend-fastapi.onrender.com') ||
                            url.includes('onrender.com') ||
                            lower.includes('onrender.com') ||
                            lower.includes('/shelf-jobs') ||
                            cleanEndpoint.toLowerCase().includes('/shelf-jobs');

    // =========================================================================
    // Determine and strictly attach Authorization Bearer token (Requirement 1 & 2)
    // =========================================================================
    // Retrieve token from localStorage: storeToken prioritized, then accessToken
    const rawStoreToken = localStorage.getItem('storeToken') ||
                          localStorage.getItem('store_token') ||
                          localStorage.getItem('dawwer_store_token');
    const cleanStoreToken = rawStoreToken ? String(rawStoreToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

    const rawAccessToken = localStorage.getItem('accessToken') ||
                           localStorage.getItem('token') ||
                           localStorage.getItem('access_token') ||
                           localStorage.getItem('dawwer_access_token');
    const cleanAccessToken = rawAccessToken ? String(rawAccessToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

    // Endpoint classification
    const cleanLower = lower.startsWith('/api/') ? lower.slice(4) : lower;

    // Public authentication / health endpoints exempt from mandatory auth token
    const isPublicAuthEndpoint = cleanLower.startsWith('/auth/login') ||
                                 cleanLower.startsWith('/auth/register') ||
                                 cleanLower.startsWith('/auth/forgot-password') ||
                                 cleanLower.startsWith('/auth/reset-password') ||
                                 cleanLower.startsWith('/auth/verify-code') ||
                                 cleanLower.startsWith('/auth/refresh-token') ||
                                 cleanLower.includes('/health');

    const isAdminEndpoint = options.isAdmin === true ||
                            options.service === 'admin' ||
                            cleanLower.startsWith('/admin');

    const isMerchantEndpoint = options.isMerchant === true ||
                               options.service === 'merchant' ||
                               cleanLower.startsWith('/merchant');

    let token = null;

    if (isPublicAuthEndpoint) {
      token = null;
    } else if (isFastApiTarget) {
      token = (cleanStoreToken && cleanStoreToken.toLowerCase() !== 'null' && cleanStoreToken.toLowerCase() !== 'undefined')
        ? cleanStoreToken
        : ((cleanAccessToken && cleanAccessToken.toLowerCase() !== 'null' && cleanAccessToken.toLowerCase() !== 'undefined') ? cleanAccessToken : null);
    } else if (isAdminEndpoint) {
      token = this.getAdminToken() || cleanAccessToken || this.getAuthToken(false);
    } else if (isMerchantEndpoint) {
      token = this.getMerchantToken() || cleanAccessToken || cleanStoreToken || this.getAuthToken(false);
    } else {
      token = (cleanStoreToken && cleanStoreToken.toLowerCase() !== 'null' && cleanStoreToken.toLowerCase() !== 'undefined')
        ? cleanStoreToken
        : (cleanAccessToken || this.getAuthToken(true));
    }

    // Check if Authorization was explicitly provided in options.headers
    const existingAuthKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
    if (!token && existingAuthKey) {
      const explicitVal = String(headers[existingAuthKey] || '').replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
      if (explicitVal && explicitVal !== 'null' && explicitVal !== 'undefined') {
        token = explicitVal;
      }
    }

    // Pre-flight check: If token is missing, stop the request immediately and notify the user to log in
    if (!isPublicAuthEndpoint) {
      if ((!token || token === 'null' || token === 'undefined' || token.trim() === '') && this.getRefreshToken()) {
        const refreshedToken = await this.refreshAuthToken();
        if (refreshedToken) {
          token = this.getUploadAuthToken() || refreshedToken;
        }
      }

      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn(`[ApiClient] Token Attachment Check failed: Missing Authorization Bearer token for "${method} ${cleanEndpoint}". Stopping request immediately.`);
        const unauthMsg = "جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة.";
        if (!options.suppressAuthPrompt) {
          this.promptReauthentication(unauthMsg);
        }
        const unauthResult = {
          success: false,
          status: 401,
          error: "Unauthorized",
          message: unauthMsg
        };
        if (options.throwOnError) {
          const err = new Error(unauthMsg);
          err.status = 401;
          err.response = unauthResult;
          throw err;
        }
        return unauthResult;
      }
    }

    // Ensure the headers object strictly includes: 'Authorization': `Bearer ${token}`
    if (token) {
      const cleanTok = String(token).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
      if (cleanTok && cleanTok !== 'null' && cleanTok !== 'undefined') {
        Object.keys(headers).forEach(k => {
          if (k.toLowerCase() === 'authorization') delete headers[k];
        });
        headers['Authorization'] = `Bearer ${cleanTok}`;
      }
    }

    // Content-Type & FormData Header Injection Rules:
    // When uploading images via FormData, do NOT remove or omit the 'Authorization' header.
    // Keep 'Authorization': `Bearer ${token}` while leaving Content-Type unset so the browser sets the boundary automatically.
    if (isFileUpload) {
      Object.keys(headers).forEach(k => {
        if (k.toLowerCase() === 'content-type') {
          delete headers[k];
        }
      });
      // Verify Authorization header is strictly present on FormData
      if (token) {
        const cleanTok = String(token).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
        if (cleanTok && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${cleanTok}`;
        }
      }
    } else {
      const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
      if (!hasContentType) {
        headers["Content-Type"] = "application/json; charset=utf-8";
      }
    }

    // Format body
    let requestBody = options.body;
    if (!isFileUpload && requestBody !== undefined && requestBody !== null && typeof requestBody !== 'string') {
      requestBody = JSON.stringify(requestBody);
    }

    const config = {
      ...options,
      headers,
      body: requestBody
    };

    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    // Request Timeout: Set the AbortController timeout threshold to 90000ms (90 seconds).
    // This allows sufficient time for the FastAPI backend on Render to wake up from idle/sleep state without aborting.
    const timeoutMs = (options.timeout !== undefined && options.timeout !== null)
      ? Number(options.timeout)
      : DEFAULT_TIMEOUT_MS;

    // =========================================================================
    // Guard: Prevent 404 on Missing Store Context
    // Before dispatching requests targeting /api/v1/stores/{store_id}, verify that store_id is a valid non-null string.
    // If store_id is missing, null, or empty, halt the request and prompt the user to select an active store, avoiding broken GET requests.
    // =========================================================================
    const fastApiStoreMatch = cleanEndpoint.match(/^\/api\/v1\/stores(?:\/([^\/?#]*))?(?:[\/?#]|$)/i);
    if (fastApiStoreMatch) {
      const storeIdParam = fastApiStoreMatch[1];
      if (!this.isValidStoreId(storeIdParam)) {
        console.warn(`[ApiClient] Guard: Aborting request targeting "${cleanEndpoint}" because store_id is missing, null, or empty ("${storeIdParam}").`);
        this.handleStoreVerification404(storeIdParam);
        const missingStoreResult = {
          success: false,
          status: 404,
          error_code: "STORE_ID_MISSING",
          message: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.",
          error: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.",
          errors: ["معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."],
          data: null
        };
        if (options.throwOnError) {
          const err = new Error(missingStoreResult.message);
          err.status = 404;
          err.code = "STORE_ID_MISSING";
          throw err;
        }
        return missingStoreResult;
      }
    }

    const aspNetScopedMatch = cleanEndpoint.match(/^\/stores\/([^\/?#]+)\/(staff|roles)/i);
    if (aspNetScopedMatch) {
      const storeIdParam = aspNetScopedMatch[1];
      if (!this.isValidStoreId(storeIdParam)) {
        console.warn(`[ApiClient] Guard: Aborting request targeting "${cleanEndpoint}" because storeId is missing, null, or empty ("${storeIdParam}").`);
        this.handleStoreVerification404(storeIdParam);
        const missingStoreResult = {
          success: false,
          status: 404,
          error_code: "STORE_ID_MISSING",
          message: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.",
          error: "معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.",
          errors: ["معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."],
          data: null
        };
        if (options.throwOnError) {
          const err = new Error(missingStoreResult.message);
          err.status = 404;
          err.code = "STORE_ID_MISSING";
          throw err;
        }
        return missingStoreResult;
      }
    }

    let response = null;
    let networkError = null;

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timer = null;

      if (controller && timeoutMs > 0) {
        config.signal = controller.signal;
        timer = setTimeout(() => {
          console.warn(`[ApiClient Timeout] Reached ${timeoutMs}ms limit for ${method} ${url}. Aborting request.`);
          controller.abort();
        }, timeoutMs);
      }

      response = await fetch(url, config).finally(() => {
        if (timer) clearTimeout(timer);
      });
    } catch (err) {
      networkError = err;
    }

    // =========================================================================
    // 1. Safe 401 Unauthorized Handling & Silent Token Refresh (Requirement 3)
    // =========================================================================
    if (response && response.status === 401) {
      console.warn(`[ApiClient 401 Unauthorized] ${method} ${url}`);

      // 3. Verify Backend Secret Sync Diagnostic Alert:
      if (isFastApiTarget) {
        console.warn(`[Backend Secret Sync Diagnostic] Received 401 Unauthorized on FastAPI Render endpoint: ${method} ${url}.`);
        console.warn('[Backend Secret Sync Diagnostic] Alert: Verify that JWT_SECRET_KEY, Issuer, and Audience match exactly between the ASP.NET Core auth server and the FastAPI Render deployment.');
      }

      // Check if this request explicitly suppresses the global auth prompt/loop (e.g. background job history fetch)
      if (options.suppressAuthPrompt || options.silentAuthFailure) {
        console.warn(`[ApiClient] Suppressing global auth prompt/loop for background request: ${method} ${cleanEndpoint}`);
        const unauthResult = {
          success: false,
          status: 401,
          error: "Unauthorized",
          message: "Unauthorized on background request"
        };
        if (options.throwOnError) {
          const err = new Error("Unauthorized on background request");
          err.status = 401;
          err.statusCode = 401;
          err.response = unauthResult;
          throw err;
        }
        return unauthResult;
      }

      // Check if a silent refresh flow is available before terminating session immediately:
      const isAuthEndpoint = lower.includes('/auth/refresh-token') || lower.includes('/auth/login') || lower.includes('/auth/register');
      if (!options._isRetry && !isAuthEndpoint && this.getRefreshToken()) {
        console.info('[ApiClient] 401 intercepted. Attempting silent token refresh & request retry...');
        const newAccessToken = await this.refreshAuthToken();
        if (newAccessToken) {
          const isStoreScoped = isFastApi || (lower.includes('/stores/') && !lower.includes('/admin/stores') && !lower.includes('/merchant/stores'));
          const retryToken = isUploadEndpoint
            ? (this.getUploadAuthToken() || newAccessToken)
            : (this.getAuthToken(isStoreScoped) || newAccessToken);

          const retryHeaders = { ...(options.headers || {}) };
          retryHeaders["Authorization"] = `Bearer ${retryToken}`;
          if (isFileUpload) {
            Object.keys(retryHeaders).forEach(k => {
              if (k.toLowerCase() === 'content-type') delete retryHeaders[k];
            });
          }

          return await this.request(endpoint, {
            ...options,
            headers: retryHeaders,
            _isRetry: true
          });
        }
      }

      // If refresh not available, refresh failed, or retried request still returned 401:
      const isMerchantReq = lower.startsWith('/merchant') || lower.startsWith('/api/merchant');
      const unauthMsg = isMerchantReq
        ? "يرجى تسجيل الدخول بحساب تاجر مفعل للمتابعة."
        : "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً للمتابعة.";

      if (!options.suppressAuthPrompt) {
        this.promptReauthentication(unauthMsg);
      }

      const unauthResult = {
        success: false,
        status: 401,
        error: "Unauthorized",
        message: unauthMsg
      };

      if (options.throwOnError) {
        const err = new Error(unauthMsg);
        err.status = 401;
        err.response = unauthResult;
        throw err;
      }
      return unauthResult;
    }

    // =========================================================================
    // 2. Safe 404 Store Verification Handling
    // =========================================================================
    if (response && response.status === 404) {
      const isStoreVerify = (isFastApi || lower.startsWith('/stores/')) &&
        (cleanEndpoint.match(/^\/api\/v1\/stores\/([a-zA-Z0-9\-_]+)$/i) || cleanEndpoint.match(/^\/stores\/([a-zA-Z0-9\-_]+)$/i));

      if (method === 'GET' && isStoreVerify) {
        const invalidStoreId = isStoreVerify[1];
        this.handleStoreVerification404(invalidStoreId);
        return {
          success: false,
          error_code: "STORE_NOT_FOUND",
          message: "Store not found. Please re-select an active store from the store selector.",
          data: null
        };
      }
    }

    // =========================================================================
    // 3. Successful Response Handling (200-299)
    // =========================================================================
    if (response && response.ok) {
      let rawJson = null;
      try {
        rawJson = await response.json();
      } catch (parseErr) {
        rawJson = null;
      }

      // FASTAPI_BASE: Return the parsed JSON response directly
      if (isFastApi) {
        // Sync live products to local catalog cache if products array returned
        if (lower.includes('/products') && Array.isArray(rawJson) && rawJson.length > 0) {
          this._syncProductsToStorage(rawJson);
        }
        return rawJson;
      }

      // AUTH_BASE: Unwrap the ApiResponse wrapper ({ success, data, errors, message })
      if (rawJson && typeof rawJson === 'object' && ('success' in rawJson || 'data' in rawJson)) {
        if (rawJson.success === false) {
          const errMessage = (Array.isArray(rawJson.errors) && rawJson.errors.length > 0)
            ? rawJson.errors.join(' | ')
            : (rawJson.message || 'فشلت العملية في الخادم.');

          console.error(`[ApiClient Auth Error] ${method} ${url}:`, errMessage);

          const errObj = {
            success: false,
            data: rawJson.data || null,
            errors: rawJson.errors || [errMessage],
            message: errMessage
          };

          if (options.throwOnError) {
            const err = new Error(errMessage);
            err.status = response.status;
            err.response = errObj;
            throw err;
          }
          return errObj;
        }

        const unwrapped = {
          success: rawJson.success !== false,
          data: rawJson.data !== undefined ? rawJson.data : rawJson,
          errors: rawJson.errors || null,
          message: rawJson.message || ""
        };

        // If data payload is an array, attach elements for seamless array indexing and iteration
        if (Array.isArray(rawJson.data)) {
          rawJson.data.forEach((item, idx) => {
            unwrapped[idx] = item;
          });
          Object.defineProperty(unwrapped, 'length', {
            value: rawJson.data.length,
            writable: false,
            enumerable: false
          });
          unwrapped[Symbol.iterator] = function* () {
            yield* rawJson.data;
          };
        }

        return unwrapped;
      }

      return {
        success: true,
        data: rawJson,
        errors: null,
        message: ""
      };
    }

    // =========================================================================
    // 4. HTTP Error Handling (!response.ok)
    // =========================================================================
    if (response && !response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = { message: response.statusText || `HTTP ${response.status}` };
      }

      console.error(`[ApiClient Error ${response.status}] ${method} ${url}:`, errorBody);

      // 403 Forbidden handling
      if (response.status === 403) {
        const forbiddenMsg = "صلاحيات مدير النظام مطلوبة للوصول إلى هذا المورد (Admin privileges required).";
        console.warn(`[ApiClient 403 Forbidden] ${method} ${url}: Admin privileges required.`);
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast({
            title: 'صلاحيات غير كافية (403 Forbidden)',
            message: forbiddenMsg,
            type: 'error',
            duration: 6000
          });
        }
        try {
          window.dispatchEvent(new CustomEvent('dawwer:forbidden', { detail: { endpoint, status: 403 } }));
        } catch (e) {}
      }

      if (isFastApi) {
        if (options.throwOnError) {
          const msg = errorBody?.detail || errorBody?.message || `FastAPI error (${response.status})`;
          const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
          err.status = response.status;
          err.response = errorBody;
          throw err;
        }
        return errorBody;
      } else {
        const errMessage = (errorBody && Array.isArray(errorBody.errors) && errorBody.errors.length > 0)
          ? errorBody.errors.join(' | ')
          : (errorBody?.message || errorBody?.detail || `حدث خطأ في الخادم (${response.status})`);

        const errObj = {
          success: false,
          status: response.status,
          message: errMessage,
          data: errorBody?.data || null,
          errors: Array.isArray(errorBody?.errors) ? errorBody.errors : [errMessage]
        };

        if (options.throwOnError) {
          const err = new Error(errMessage);
          err.status = response.status;
          err.response = errObj;
          err.errors = errObj.errors;
          throw err;
        }
        return errObj;
      }
    }

    // =========================================================================
    // 5. Network / Timeout Failure Handling
    // =========================================================================
    if (networkError) {
      const isTimeout = networkError.name === 'AbortError' || networkError.isTimeout;
      const errMsg = isTimeout
        ? `انتهت مهلة الاتصال بالخادم (${Math.round(timeoutMs / 1000)} ثانية)، يرجى المحاولة مجدداً.`
        : 'تعذر الاتصال بالخادم الحي، يرجى التحقق من اتصال الإنترنت.';

      console.error(`[ApiClient Network Error] ${method} ${url}:`, networkError.message);

      const errorObj = {
        success: false,
        status: isTimeout ? 408 : 0,
        isTimeout,
        isNetworkError: true,
        message: errMsg,
        error: errMsg,
        errors: [errMsg],
        data: null
      };

      if (options.throwOnError) {
        const err = new Error(errMsg);
        err.status = isTimeout ? 408 : 0;
        err.isTimeout = isTimeout;
        err.isNetworkError = true;
        err.originalError = networkError;
        throw err;
      }

      return errorObj;
    }

    return {
      success: false,
      error: "Unknown error occurred",
      message: "Unknown error occurred"
    };
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
    const cleanHeaders = { ...(headers || {}) };
    Object.keys(cleanHeaders).forEach(k => {
      if (k.toLowerCase() === 'content-type') {
        delete cleanHeaders[k];
      }
    });

    // 1. Retrieve token from localStorage: storeToken prioritized, then accessToken
    const rawStoreToken = localStorage.getItem('storeToken') || localStorage.getItem('store_token') || localStorage.getItem('dawwer_store_token');
    const cleanStoreToken = rawStoreToken ? String(rawStoreToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

    const rawAccessToken = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('dawwer_access_token');
    const cleanAccessToken = rawAccessToken ? String(rawAccessToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

    const token = (cleanStoreToken && cleanStoreToken.toLowerCase() !== 'null' && cleanStoreToken.toLowerCase() !== 'undefined')
      ? cleanStoreToken
      : ((cleanAccessToken && cleanAccessToken.toLowerCase() !== 'null' && cleanAccessToken.toLowerCase() !== 'undefined') ? cleanAccessToken : null);

    // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify user to log in.
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      console.warn(`[ApiClient.upload] Stop upload immediately: Token is missing for "${endpoint}". Notifying user to log in.`);
      const unauthMsg = "جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة.";
      if (!options.suppressAuthPrompt) {
        this.promptReauthentication(unauthMsg);
      }
      const unauthResult = {
        success: false,
        status: 401,
        error: "Unauthorized",
        message: unauthMsg
      };
      if (options.throwOnError) {
        const err = new Error(unauthMsg);
        err.status = 401;
        err.response = unauthResult;
        throw err;
      }
      return Promise.resolve(unauthResult);
    }

    // Keep 'Authorization': `Bearer ${token}` while leaving Content-Type unset so the browser sets boundary automatically
    cleanHeaders['Authorization'] = `Bearer ${token}`;

    return this.request(endpoint, {
      method: "POST",
      headers: cleanHeaders,
      body: formData,
      isUpload: true,
      ...options
    });
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
    login(credentials) {
      return ApiClient.post('/Auth/login', credentials, {}, { service: 'auth', throwOnError: true });
    },
    register(payload) {
      return ApiClient.post('/Auth/register', payload, {}, { service: 'auth', throwOnError: true });
    },
    verifyCode(payload) {
      return ApiClient.post('/Auth/verify-code', payload, {}, { service: 'auth', throwOnError: true });
    },
    resendCode(payload) {
      return ApiClient.post('/Auth/resend-code', payload, {}, { service: 'auth', throwOnError: true });
    },
    refreshToken(payload) {
      return ApiClient.post('/Auth/refresh-token', payload, {}, { service: 'auth' });
    },
    forgotPassword(payload) {
      return ApiClient.post('/Auth/forgot-password', payload, {}, { service: 'auth', throwOnError: true });
    },
    resetPassword(payload) {
      return ApiClient.post('/Auth/reset-password', payload, {}, { service: 'auth', throwOnError: true });
    },
    me() {
      return ApiClient.get('/Auth/me', {}, { service: 'auth' });
    },
    async selectStore(storeId) {
      const res = await ApiClient.post('/Auth/select-store', { storeId }, {}, { service: 'auth', throwOnError: true });
      if (res && res.success && res.data) {
        const storeName = res.data.storeName;
        const storeToken = res.data.storeToken;
        const activeStoreId = res.data.storeId;
        const roleName = res.data.roleName;

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
        }

        const activeStoreData = {
          storeId: activeStoreId,
          storeName: storeName,
          roleName: roleName,
          permissions: res.data.permissions || []
        };
        localStorage.setItem('dawwer_active_store', JSON.stringify(activeStoreData));
        if (typeof CONFIG !== 'undefined' && CONFIG.ACTIVE_STORE_KEY) {
          localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, JSON.stringify(activeStoreData));
        }

        document.querySelectorAll('#current-store-name, [data-store-name], #store-name-text').forEach(el => {
          el.textContent = storeName || 'المتجر الحالي';
        });

        if (typeof DawwerLayout !== 'undefined' && DawwerLayout.updateStoreIdentity) {
          DawwerLayout.updateStoreIdentity(storeName, roleName);
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
      return ApiClient.get(`/categories${q}`, {}, { service: 'auth', ...options });
    },
    tree(options = {}) {
      return ApiClient.get('/categories/tree', {}, { service: 'auth', ...options });
    },
    get(id, options = {}) {
      return ApiClient.get(`/categories/${id}`, {}, { service: 'auth', ...options });
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
      return ApiClient.get(`/admin/categories${qs}`, {}, { service: 'auth' });
    },
    adminTree() {
      return ApiClient.get('/admin/categories/tree', {}, { service: 'auth' });
    },
    adminGet(id) {
      return ApiClient.get(`/admin/categories/${id}`, {}, { service: 'auth' });
    },
    create(payload) {
      return ApiClient.post('/admin/categories', payload, {}, { service: 'auth', throwOnError: true });
    },
    update(id, payload) {
      return ApiClient.put(`/admin/categories/${id}`, payload, {}, { service: 'auth', throwOnError: true });
    },
    delete(id) {
      return ApiClient.delete(`/admin/categories/${id}`, {}, { service: 'auth', throwOnError: true });
    },
    activate(id) {
      return ApiClient.patch(`/admin/categories/${id}/activate`, {}, {}, { service: 'auth', throwOnError: true });
    },
    deactivate(id) {
      return ApiClient.patch(`/admin/categories/${id}/deactivate`, {}, {}, { service: 'auth', throwOnError: true });
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
    async create(storeId = null, formData, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        const err = new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة.");
        err.status = 404;
        return Promise.reject(err);
      }

      // 1. Retrieve the token from localStorage:
      const rawToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const token = rawToken ? String(rawToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

      // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify user to log in.
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn(`[ApiClient.shelfJobs.create] Stop upload immediately: Token is missing. Notifying user to log in.`);
        const unauthMsg = "جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة.";
        if (!options.suppressAuthPrompt) {
          ApiClient.promptReauthentication(unauthMsg);
        }
        const err = new Error(unauthMsg);
        err.status = 401;
        return Promise.reject(err);
      }

      // Ensure headers object includes: ...existingHeaders, 'Authorization': `Bearer ${token}`
      // Keep 'Authorization': `Bearer ${token}` while leaving Content-Type unset
      const uploadHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
      };
      delete uploadHeaders['Content-Type'];
      delete uploadHeaders['content-type'];
      delete uploadHeaders['Content-type'];
      delete uploadHeaders['CONTENT-TYPE'];

      return ApiClient.upload(`/api/v1/stores/${encodeURIComponent(id)}/shelf-jobs`, formData, uploadHeaders, {
        service: 'fastapi',
        throwOnError: true,
        ...options
      });
    },

    list(storeId = null, { skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.resolve({ success: false, status: 404, message: "Missing store_id", data: [] });
      }

      // 1. Retrieve the token from localStorage:
      const rawToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const token = rawToken ? String(rawToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

      // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify user to log in.
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn(`[ApiClient.shelfJobs.list] Stop request immediately: Token is missing. Notifying user to log in.`);
        const unauthMsg = "جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة.";
        if (!options.suppressAuthPrompt) {
          ApiClient.promptReauthentication(unauthMsg);
        }
        return Promise.resolve({ success: false, status: 401, error: "Unauthorized", message: unauthMsg });
      }

      // Ensure headers includes: ...existingHeaders, 'Authorization': `Bearer ${token}`
      const reqHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
      };

      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/shelf-jobs?skip=${skip}&limit=${limit}`, {}, {
        service: 'fastapi',
        ...options,
        headers: reqHeaders
      });
    },

    get(storeId = null, jobId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!jobId) return Promise.reject(new Error("Missing job_id"));

      // 1. Retrieve the token from localStorage:
      const rawToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const token = rawToken ? String(rawToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

      // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify user to log in.
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn(`[ApiClient.shelfJobs.get] Stop request immediately: Token is missing. Notifying user to log in.`);
        const unauthMsg = "جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة.";
        if (!options.suppressAuthPrompt) {
          ApiClient.promptReauthentication(unauthMsg);
        }
        return Promise.reject(new Error(unauthMsg));
      }

      // Ensure headers includes: ...existingHeaders, 'Authorization': `Bearer ${token}`
      const reqHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
      };

      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/shelf-jobs/${encodeURIComponent(jobId)}`, {}, {
        service: 'fastapi',
        ...options,
        headers: reqHeaders
      });
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
      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/draft-products${query}`, {}, { service: 'fastapi', ...options });
    },

    get(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}`, {}, { service: 'fastapi', ...options });
    },

    update(storeId = null, draftId, draftData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.put(`/api/v1/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}`, draftData, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    approve(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}/approve`, {}, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    reject(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      if (!draftId) return Promise.reject(new Error("Missing draft_id"));
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/draft-products/${encodeURIComponent(draftId)}/reject`, {}, {}, { service: 'fastapi', throwOnError: true, ...options });
    },

    batchApprove(storeId = null, draftIds = [], options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/draft-products/batch-approve`, { draft_ids: draftIds }, {}, { service: 'fastapi', throwOnError: true, ...options });
    }
  },

  // =========================================================================
  // Orders Intake & Management (Sprint 3: Feature 3.1)
  // Target: AUTH_BASE /api/v1/stores/{store_id}/orders
  // =========================================================================
  orders: {
    list(storeId = null, params = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      const qs = new URLSearchParams(params).toString();
      const endpoint = `/api/v1/stores/${encodeURIComponent(id)}/orders${qs ? '?' + qs : ''}`;
      return ApiClient.get(endpoint, {}, { service: 'auth' });
    },
    get(storeId = null, orderId) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.get(`/api/v1/stores/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}`, {}, { service: 'auth' });
    },
    updateStatus(storeId = null, orderId, status, payload = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.put(`/api/v1/stores/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}/status`, { status, ...payload }, {}, { service: 'auth', throwOnError: true });
    },
    accept(storeId = null, orderId) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}/accept`, {}, {}, { service: 'auth', throwOnError: true });
    },
    reject(storeId = null, orderId, reason = '', notes = '') {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!ApiClient.isValidStoreId(id)) {
        ApiClient.handleStoreVerification404(id);
        return Promise.reject(new Error("معرّف المتجر غير صالح أو غير محدد. يرجى اختيار متجر نشط للمتابعة."));
      }
      return ApiClient.post(`/api/v1/stores/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}/reject`, { reason, notes }, {}, { service: 'auth', throwOnError: true });
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
    storeApplications(params = {}) {
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
      return ApiClient.get(`/admin/stores/applications${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
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
        return ApiClient.get('/admin/categories/tree', {}, { service: 'auth' });
      },
      list(params = {}) {
        let qs = '';
        if (typeof params === 'string') {
          qs = params ? (params.startsWith('?') ? params.slice(1) : params) : '';
        } else if (params && typeof params === 'object') {
          qs = new URLSearchParams(params).toString();
        }
        return ApiClient.get(`/admin/categories${qs ? '?' + qs : ''}`, {}, { service: 'auth' });
      },
      get(id) {
        return ApiClient.get(`/admin/categories/${encodeURIComponent(id)}`, {}, { service: 'auth' });
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
        return ApiClient.post('/admin/categories', payload, {}, { service: 'auth', throwOnError: true });
      },
      update(id, categoryData) {
        return ApiClient.put(`/admin/categories/${encodeURIComponent(id)}`, categoryData, {}, { service: 'auth', throwOnError: true });
      },
      delete(id) {
        return ApiClient.delete(`/admin/categories/${encodeURIComponent(id)}`, {}, { service: 'auth', throwOnError: true });
      },
      activate(id) {
        return ApiClient.patch(`/admin/categories/${encodeURIComponent(id)}/activate`, {}, {}, { service: 'auth', throwOnError: true });
      },
      deactivate(id) {
        return ApiClient.patch(`/admin/categories/${encodeURIComponent(id)}/deactivate`, {}, {}, { service: 'auth', throwOnError: true });
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
  }
};

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

if (typeof window !== 'undefined') {
  window.escapeHtml = window.escapeHtml || escapeHtml;
  window.ApiClient = ApiClient;
}

ApiClient.escapeHtml = escapeHtml;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
