/**
 * DawwerOS Web API Client - Two-Backend Architecture
 * 
 * 1. ASP.NET Backend (Auth, Accounts, Categories, Profile, Admin, Staff, Stores):
 *    AUTH_BASE_URL: "https://dawwer.runasp.net/api"
 * 
 * 2. FastAPI Backend (Products, Inventory, Shelf Jobs, AI Extraction):
 *    PRODUCTS_BASE_URL: "https://dawwer-backend-fastapi.onrender.com"
 * 
 * Compliant with DawwerOS Universal Envelope (ApiResponse<T>):
 * {
 *   "success": boolean,
 *   "message": string,
 *   "data": any,
 *   "errors": string[] | null
 * }
 */

const AUTH_BASE_URL = typeof CONFIG !== 'undefined' && CONFIG.AUTH_BASE_URL
  ? CONFIG.AUTH_BASE_URL
  : 'https://dawwer.runasp.net/api';

const PRODUCTS_BASE_URL = typeof CONFIG !== 'undefined' && CONFIG.PRODUCTS_BASE_URL
  ? CONFIG.PRODUCTS_BASE_URL
  : 'https://dawwer-backend-fastapi.onrender.com';

const AUTH_BASE = AUTH_BASE_URL;
const FASTAPI_BASE = PRODUCTS_BASE_URL;
const BASE_URL = PRODUCTS_BASE_URL;

const STORAGE_KEY_CATALOG = 'dawwer_merchant_catalog_products';
const STORAGE_KEY_LEGACY = 'myProducts';
const STORAGE_KEY_AUDIT = 'dawwer_merchant_audit_log';

/**
 * Normalizes any response into the standardized ApiResponse<T> envelope.
 * If data is an array or object containing array data, preserves array-like
 * properties for seamless access across the UI.
 */
function normalizeEnvelope(data, message = "Operation completed successfully.", success = true, errors = null) {
  if (data === null || data === undefined) {
    return { success, message, data: null, errors };
  }

  // If already an ApiResponse envelope
  if (typeof data === 'object' && !Array.isArray(data) && 'success' in data && 'data' in data) {
    // If the data payload is an array, attach array-like indexing for compatibility
    if (Array.isArray(data.data)) {
      const env = [...data.data];
      env.success = data.success;
      env.message = data.message || message;
      env.data = data.data;
      env.errors = data.errors || errors;
      return env;
    }
    return data;
  }

  // If data is directly an Array (e.g. from FastAPI endpoints)
  if (Array.isArray(data)) {
    const env = [...data];
    env.success = success;
    env.message = message;
    env.data = data;
    env.errors = errors;
    return env;
  }

  // Single entity object
  return {
    success,
    message,
    data,
    errors
  };
}

const ApiClient = {
  AUTH_BASE_URL,
  PRODUCTS_BASE_URL,
  AUTH_BASE,
  FASTAPI_BASE,
  BASE_URL,

  /**
   * Resolves the target URL based on backend responsibility:
   * - Authentication, Accounts, Profile, Categories, Admin, Staff, Stores -> AUTH_BASE (ASP.NET)
   * - Products, Inventory, Shelf Jobs, AI Extraction -> FASTAPI_BASE (FastAPI on Render)
   */
  resolveUrl(endpoint, options = {}) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const lower = clean.toLowerCase();

    // Determine target service: 'products' (FastAPI Render) or 'auth' (ASP.NET)
    let service = options.service;
    if (!service) {
      if (
        lower.startsWith('/api/v1/') ||
        lower.includes('/shelf-jobs') ||
        lower.includes('/draft-products') ||
        (lower.includes('/stores/') && lower.includes('/products')) ||
        (lower.includes('/stores/') && lower.includes('/catalog/bulk-import'))
      ) {
        service = 'products';
      } else {
        service = 'auth';
      }
    }

    if (service === 'products') {
      const base = (this.FASTAPI_BASE || this.PRODUCTS_BASE_URL || FASTAPI_BASE).replace(/\/+$/, '');
      if (clean.startsWith('/api/v1/')) {
        return `${base}${clean}`;
      }
      return `${base}/api/v1${clean}`;
    } else {
      let base = (this.AUTH_BASE || this.AUTH_BASE_URL || AUTH_BASE).replace(/\/+$/, '');
      if (!base.endsWith('/api')) {
        base = `${base}/api`;
      }
      // Strip leading /api if present to prevent duplicated base paths
      const path = clean.startsWith('/api/') ? clean.slice(4) : (clean === '/api' ? '' : clean);
      return `${base}${path}`;
    }
  },

  /**
   * Retrieves the currently active store ID from persistent storage.
   * If none is found, provisions a valid default active store ID to prevent UI actions from halting.
   */
  /**
   * Helper to check if a given store ID string is invalid, dummy, or broken.
   */
  isInvalidStoreId(id) {
    if (!id || typeof id !== 'string') return true;
    const clean = id.trim().toLowerCase();
    return (
      clean === '' ||
      clean === 'null' ||
      clean === 'undefined' ||
      clean === '7b8f6a91-45c2-48df-bc88-825dfa234123' ||
      clean === '11111111-1111-1111-1111-111111111111'
    );
  },

  /**
   * Retrieves the currently active store ID from persistent storage.
   * Never returns a broken dummy UUID.
   */
  getActiveStoreId() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const qStoreId = urlParams.get('store_id') || urlParams.get('storeId');
        if (qStoreId && !this.isInvalidStoreId(qStoreId)) {
          const clean = qStoreId.trim();
          this.setActiveStoreId(clean);
          return clean;
        }
      }

      const direct = localStorage.getItem('store_id') ||
                     localStorage.getItem('active_store_id') ||
                     localStorage.getItem('storeId') ||
                     localStorage.getItem('dawwer_active_store_id') ||
                     localStorage.getItem('dawwer_store_id');
      if (direct) {
        if (!this.isInvalidStoreId(direct)) {
          return direct;
        } else {
          this.clearInvalidStoreId(direct);
        }
      }

      const activeStoreRaw = localStorage.getItem('dawwer_active_store');
      if (activeStoreRaw) {
        const activeStore = JSON.parse(activeStoreRaw);
        const sid = activeStore?.storeId || activeStore?.id || activeStore?.store_id;
        if (sid && !this.isInvalidStoreId(sid)) {
          this.setActiveStoreId(sid);
          return sid;
        }
      }

      const userDataRaw = localStorage.getItem('dawwer_user_data');
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const sid = userData?.storeId || userData?.store_id;
        if (sid && !this.isInvalidStoreId(sid)) {
          this.setActiveStoreId(sid);
          return sid;
        }
      }
    } catch (e) {}

    const configuredDefault = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_STORE_ID) ? CONFIG.DEFAULT_STORE_ID : null;
    if (configuredDefault && !this.isInvalidStoreId(configuredDefault)) {
      return configuredDefault;
    }
    return null;
  },

  /**
   * Clears invalid or stale store references from persistent storage.
   */
  clearInvalidStoreId(invalidId = null) {
    try {
      const keys = [
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
        if (!invalidId || val === invalidId || this.isInvalidStoreId(val)) {
          localStorage.removeItem(k);
        }
      });
      localStorage.removeItem('dawwer_active_store');
      if (typeof CONFIG !== 'undefined') {
        if (CONFIG.STORE_TOKEN_KEY) localStorage.removeItem(CONFIG.STORE_TOKEN_KEY);
        if (CONFIG.ACTIVE_STORE_KEY) localStorage.removeItem(CONFIG.ACTIVE_STORE_KEY);
      }
    } catch (e) {}
  },

  /**
   * Prompts or routes the user to re-select an active store when the current store ID is missing or returned 404.
   */
  async handleInvalidStoreId(invalidId = null) {
    if (this._storeResolutionActive) return;
    this._storeResolutionActive = true;

    try {
      if (invalidId) {
        this.clearInvalidStoreId(invalidId);
      }

      // 1. Try to fetch available stores for the authenticated merchant to auto-recover
      if (typeof window !== 'undefined' && this.auth) {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (token) {
          const res = await this.get('/merchant/stores', {}, { service: 'auth', throwOnError: false }).catch(() => null);
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            const validStores = res.data.filter(s => s.id && !this.isInvalidStoreId(s.id));
            if (validStores.length > 0) {
              const targetStore = validStores[0];
              console.info(`[ApiClient] Auto-recovering store context to "${targetStore.name || targetStore.id}"...`);
              if (typeof window.Auth !== 'undefined' && window.Auth.selectStore) {
                await window.Auth.selectStore(targetStore.id).catch(() => {});
              } else {
                this.setActiveStoreId(targetStore.id);
              }
              if (typeof window.showToast === 'function') {
                window.showToast({
                  title: 'تم تحديث المتجر النشط',
                  message: `تم التبديل تلقائياً إلى متجر "${targetStore.name || 'المتجر المتاح'}".`,
                  type: 'info'
                });
              }
              this._storeResolutionActive = false;
              return;
            }
          }
        }
      }

      // 2. If no valid store exists or auto-recovery not possible:
      // Show user-friendly interactive prompt or route to store selection
      if (typeof window !== 'undefined') {
        const currentPath = (window.location.pathname || '').split('/').pop() || 'index.html';
        const isAuthPage = ['login.html', 'register.html', 'verify-account.html', 'forgot-password.html', 'reset-password.html'].includes(currentPath);

        if (!isAuthPage) {
          if (typeof window.showToast === 'function') {
            window.showToast({
              title: 'تنبيه: يلزم اختيار متجر نشط',
              message: 'معرّف المتجر غير صالح أو غير موجود (404). يرجى اختيار متجر من القائمة.',
              type: 'warning',
              duration: 8000
            });
          }

          // If on a store-dependent view and not on index/merchant-application, route smoothly to index for store selection
          if (!['index.html', 'merchant-application.html', ''].includes(currentPath)) {
            setTimeout(() => {
              window.location.href = 'index.html?selectStore=true';
            }, 1800);
          }
        }
      }
    } catch (err) {
      console.warn('[ApiClient] handleInvalidStoreId resolution note:', err);
    } finally {
      setTimeout(() => {
        this._storeResolutionActive = false;
      }, 5000);
    }
  },

  /**
   * Sets the active store ID across all relevant storage keys.
   */
  setActiveStoreId(storeId) {
    if (storeId && !this.isInvalidStoreId(storeId)) {
      try {
        localStorage.setItem('store_id', storeId);
        localStorage.setItem('active_store_id', storeId);
        localStorage.setItem('storeId', storeId);
        localStorage.setItem('dawwer_active_store_id', storeId);
        localStorage.setItem('dawwer_store_id', storeId);
      } catch (e) {}
    } else {
      this.clearInvalidStoreId(storeId);
    }
  },

  /**
   * Automatically clears invalid session keys from localStorage and sessionStorage.
   */
  clearSession() {
    try {
      const keys = [
        'accessToken',
        'token',
        'storeToken',
        'refreshToken',
        'access_token',
        'refresh_token',
        'store_token',
        'userId',
        'storeId',
        'store_id',
        'active_store_id',
        'storeName',
        'store_name',
        'dawwer_access_token',
        'dawwer_refresh_token',
        'dawwer_user_data',
        'dawwer_store_token',
        'dawwer_active_store',
        'dawwer_active_store_id',
        'dawwer_store_id',
        'dawwer_store_name'
      ];
      if (typeof CONFIG !== 'undefined') {
        if (CONFIG.TOKEN_KEY) keys.push(CONFIG.TOKEN_KEY);
        if (CONFIG.REFRESH_TOKEN_KEY) keys.push(CONFIG.REFRESH_TOKEN_KEY);
        if (CONFIG.USER_KEY) keys.push(CONFIG.USER_KEY);
        if (CONFIG.STORE_TOKEN_KEY) keys.push(CONFIG.STORE_TOKEN_KEY);
        if (CONFIG.ACTIVE_STORE_KEY) keys.push(CONFIG.ACTIVE_STORE_KEY);
      }
      keys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      try {
        sessionStorage.removeItem('dawwer_active_store');
        sessionStorage.removeItem('storeToken');
      } catch (e) {}
    } catch (e) {
      console.warn('[ApiClient] Error clearing session keys:', e);
    }
  },

  /**
   * Retrieves the active bearer authorization token reliably from localStorage.
   * Checks 'accessToken', 'token', or 'storeToken' (prioritizing storeToken for store endpoints).
   */
  getAuthToken(forStore = false) {
    try {
      if (forStore) {
        const storeToken = localStorage.getItem('storeToken') ||
                           localStorage.getItem('store_token') ||
                           localStorage.getItem('dawwer_store_token') ||
                           (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.STORE_TOKEN_KEY) : null);
        if (storeToken && storeToken !== 'null' && storeToken !== 'undefined') {
          return storeToken;
        }
      }

      const token = localStorage.getItem('accessToken') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('storeToken') ||
                    localStorage.getItem('access_token') ||
                    localStorage.getItem('dawwer_access_token') ||
                    (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.TOKEN_KEY) : null) ||
                    localStorage.getItem('dawwer_token') ||
                    localStorage.getItem('store_token') ||
                    localStorage.getItem('dawwer_store_token');

      if (token && token !== 'null' && token !== 'undefined') return token;

      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        const t = userData?.accessToken || userData?.token || userData?.storeToken;
        if (t && t !== 'null' && t !== 'undefined') return t;
      }
    } catch (e) {}

    return null;
  },

  /**
   * Executes token refresh using POST /api/Auth/refresh-token.
   */
  async refreshToken() {
    try {
      const accessToken = this.getAuthToken(false);
      const refreshToken = (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY) : null) ||
                            localStorage.getItem('dawwer_refresh_token') ||
                            localStorage.getItem('refresh_token');

      if (!accessToken || !refreshToken) {
        return null;
      }

      const refreshUrl = `${this.AUTH_BASE_URL.replace(/\/+$/, '')}/Auth/refresh-token`;
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ accessToken, refreshToken })
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (json && json.success && json.data && json.data.accessToken) {
        const newAccess = json.data.accessToken;
        const newRefresh = json.data.refreshToken || refreshToken;

        if (typeof CONFIG !== 'undefined') {
          localStorage.setItem(CONFIG.TOKEN_KEY, newAccess);
          if (newRefresh) localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, newRefresh);
        }
        localStorage.setItem('dawwer_access_token', newAccess);
        localStorage.setItem('access_token', newAccess);
        if (newRefresh) {
          localStorage.setItem('dawwer_refresh_token', newRefresh);
          localStorage.setItem('refresh_token', newRefresh);
        }

        return newAccess;
      }
      return null;
    } catch (e) {
      console.warn('[ApiClient] Token refresh attempt failed:', e);
      return null;
    }
  },

  /**
   * Central network dispatcher. Enforces HTTPS, Bearer authentication,
   * ApiResponse<T> error parsing, and automatic token refresh on 401.
   * Completely avoids fake mock fallbacks to guarantee authentic server states.
   */
  async request(endpoint, options = {}) {
    const url = this.resolveUrl(endpoint, options);
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const lower = cleanEndpoint.toLowerCase();

    const headers = { ...(options.headers || {}) };
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const isStoreOrProducts = (options.service === 'products') || lower.includes('/stores/') || lower.includes('/api/v1/');
    const token = this.getAuthToken(isStoreOrProducts);

    if (isFormData) {
      // For multipart/form-data requests (such as AI Shelf Image Upload), inject ONLY:
      // headers: { "Authorization": `Bearer ${token}` }
      // DO NOT set "Content-Type" manually so the browser correctly computes the multipart boundary.
      delete headers["Content-Type"];
      delete headers["content-type"];
      delete headers["Content-type"];
      delete headers["CONTENT-TYPE"];
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } else {
      // For all authenticated JSON requests, automatically include:
      // headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      if (!headers["Content-Type"] && !headers["content-type"] && !headers["Content-type"] && !headers["CONTENT-TYPE"]) {
        headers["Content-Type"] = "application/json";
      }
      if (token && !headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const config = {
      ...options,
      headers
    };

    const method = (config.method || 'GET').toUpperCase();
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    let response = null;
    let networkError = null;

    // Default timeout: 150,000ms (2.5 minutes >= 2 minutes) for FormData / AI extractions, 90,000ms (90 seconds) for JSON requests (allows Render cold-starts)
    const defaultTimeout = isFormData ? 150000 : 90000;
    const timeoutMs = options.timeout !== undefined ? options.timeout : defaultTimeout;

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timer = null;

      if (controller && timeoutMs > 0) {
        config.signal = controller.signal;
        timer = setTimeout(() => {
          console.warn(`[ApiClient] Request timeout reached (${timeoutMs}ms) for ${method} ${url}. Aborting...`);
          controller.abort();
        }, timeoutMs);
      }

      response = await fetch(url, config).finally(() => {
        if (timer) clearTimeout(timer);
      });
    } catch (err) {
      networkError = err;
      if (err.name === 'AbortError') {
        err.isTimeout = true;
        err.timeoutMs = timeoutMs;
      }
    }

    // 1. Handle Successful HTTP Response (200-299)
    if (response && response.ok) {
      try {
        const rawJson = await response.json();

        // Check if ASP.NET returned an ApiResponse envelope with explicit success: false
        if (rawJson && typeof rawJson === 'object' && rawJson.success === false) {
          const errMessage = (Array.isArray(rawJson.errors) && rawJson.errors.length > 0)
            ? rawJson.errors.join(' | ')
            : (rawJson.message || 'فشلت العملية في الخادم.');

          console.group(`[ApiClient Error Envelope Diagnostic] ${method} ${url}`);
          console.error(`Status Code:`, response.status);
          console.error(`Error Message:`, errMessage);
          console.error(`Endpoint URL:`, url);
          console.error(`Envelope Response Body:`, rawJson);
          console.error(`Headers Sent:`, headers);
          console.groupEnd();

          if (typeof window !== 'undefined' && typeof window.showToast === 'function' && !options.suppressToastOnError && (options.showToastOnError || isMutation)) {
            window.showToast({
              title: 'تنبيه من الخادم',
              message: errMessage,
              type: 'error'
            });
          }

          const errorObj = {
            success: false,
            status: response.status,
            statusCode: response.status,
            message: errMessage,
            data: null,
            errors: Array.isArray(rawJson.errors) ? rawJson.errors : [errMessage]
          };

          if (isMutation || options.throwOnError) {
            const err = new Error(errMessage);
            err.status = response.status;
            err.statusCode = response.status;
            err.response = rawJson;
            err.data = rawJson;
            throw err;
          }

          return errorObj;
        }

        const normalized = normalizeEnvelope(rawJson);

        // Sync live products to local catalog cache for instant shelf visualization
        if (lower.includes('/products') && Array.isArray(normalized.data) && normalized.data.length > 0) {
          this._syncProductsToStorage(normalized.data);
        }

        return normalized;
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.status) throw parseErr;
        return normalizeEnvelope(null, "تمت العملية بنجاح.");
      }
    }

    // 2. Handle HTTP 401 Unauthorized (Auto-Logout and session wiping disabled)
    if (response && response.status === 401) {
      console.error(`[ApiClient 401 Unauthorized] ${method} ${url}`);

      if (!options._isRetry) {
        try {
          const newToken = await this.refreshToken();
          if (newToken) {
            console.info('[ApiClient] Token renewed successfully. Retrying request...');
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            return await this.request(endpoint, {
              ...options,
              headers: retryHeaders,
              _isRetry: true
            });
          }
        } catch (refreshErr) {
          console.warn('[ApiClient] Token refresh attempt skipped or failed:', refreshErr);
        }
      }

      // NOTE: Auto-logout and session wiping are explicitly DISABLED.
      // Retain tokens in localStorage, log error to console, and do not reload/redirect.
      console.error(`[ApiClient 401 Unauthorized] Session retained. No redirect or storage purge performed for ${url}`);

      const errorObj = {
        success: false,
        status: 401,
        statusCode: 401,
        isUnauthorized: true,
        message: 'غير مصرح به (401 Unauthorized). تم الحفاظ على الجلسة.',
        data: null,
        errors: ['Unauthorized - 401']
      };

      if (isMutation || options.throwOnError) {
        const err = new Error(errorObj.message);
        err.status = 401;
        err.statusCode = 401;
        err.isUnauthorized = true;
        throw err;
      }

      return errorObj;
    }

    // 3. Handle HTTP Error Response (!response.ok)
    if (response && !response.ok) {
      // Handle 404 Store Not Found: Stop retrying with stale/broken store ID and prompt user
      if (response.status === 404) {
        const storeMatch = url.match(/\/stores\/([a-zA-Z0-9\-_]+)/i);
        if (storeMatch && storeMatch[1]) {
          const failedStoreId = storeMatch[1];
          if (!['products', 'documents', 'shelf-jobs', 'draft-products'].includes(failedStoreId.toLowerCase())) {
            console.warn(`[ApiClient] Store ID "${failedStoreId}" returned 404 Not Found. Purging stale store ID from storage.`);
            this.clearInvalidStoreId(failedStoreId);
            this.handleInvalidStoreId(failedStoreId);
          }
        }
      }

      let errorMsg = `حدث خطأ في الخادم (${response.status})`;
      let responseData = null;

      try {
        responseData = await response.json();
        if (responseData) {
          if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
            errorMsg = responseData.errors.join(' | ');
          } else if (responseData.message) {
            errorMsg = responseData.message;
          } else if (responseData.detail) {
            errorMsg = typeof responseData.detail === 'string' ? responseData.detail : JSON.stringify(responseData.detail);
          } else if (responseData.error_code) {
            errorMsg = `${responseData.error_code}: ${responseData.message || response.statusText}`;
          }
        }
      } catch (e) {
        errorMsg = response.statusText || `HTTP ${response.status}`;
      }

      console.group(`[ApiClient Server Rejection Diagnostic] ${method} ${url}`);
      console.error(`Status Code:`, response.status, `(${response.statusText})`);
      console.error(`Error Message:`, errorMsg);
      console.error(`Endpoint URL:`, url);
      console.error(`Response Payload:`, responseData);
      console.error(`Headers Sent:`, headers);
      console.groupEnd();

      if (typeof window !== 'undefined' && typeof window.showToast === 'function' && !options.suppressToastOnError && (options.showToastOnError || isMutation)) {
        window.showToast({
          title: `خطأ من الخادم (${response.status})`,
          message: errorMsg,
          type: 'error'
        });
      }

      const errorObj = {
        success: false,
        status: response.status,
        statusCode: response.status,
        isServerRejection: true,
        message: errorMsg,
        data: responseData,
        response: responseData,
        errors: Array.isArray(responseData?.errors) ? responseData.errors : [errorMsg]
      };

      if (isMutation || options.throwOnError) {
        const err = new Error(errorMsg);
        err.status = response.status;
        err.statusCode = response.status;
        err.isServerRejection = true;
        err.response = responseData;
        err.data = responseData;
        throw err;
      }

      return errorObj;
    }

    // 4. Handle Network / Connection Errors
    if (networkError) {
      const isAbort = networkError.name === 'AbortError' || networkError.isTimeout;
      const isTypeError = networkError instanceof TypeError;
      const errMsg = isAbort
        ? `انتهت مهلة الاتصال بالخادم (${Math.round(timeoutMs / 1000)} ثانية)، يرجى المحاولة مجدداً.`
        : 'تعذر الاتصال بالخادم الحي، يرجى التحقق من اتصال الإنترنت وخادم الاستضافة.';

      console.group(`[ApiClient Network/Connection Error Diagnostic] ${method} ${url}`);
      console.error(`Failure Classification:`, isAbort ? 'TIMEOUT (AbortController triggered)' : (isTypeError ? 'CORS_OR_CONNECTION_REFUSED (Failed to fetch)' : networkError.name));
      console.error(`Status Code:`, 0, '(No response received from remote server)');
      console.error(`Timeout Limit:`, `${timeoutMs}ms`);
      console.error(`Endpoint URL:`, url);
      console.error(`Error Details:`, networkError.message);
      console.error(`Raw Error Object:`, networkError);
      console.groupEnd();

      if (typeof window !== 'undefined' && typeof window.showToast === 'function' && !options.suppressToastOnError && (options.showToastOnError || isMutation)) {
        window.showToast({
          title: isAbort ? 'انتهت مهلة الاتصال بالخادم' : 'فشل الاتصال بالخادم',
          message: errMsg,
          type: 'error'
        });
      }

      const errorObj = {
        success: false,
        status: isAbort ? 408 : 0,
        statusCode: isAbort ? 408 : 0,
        isTimeout: isAbort,
        isCORS: !isAbort && isTypeError,
        isNetworkError: true,
        message: errMsg,
        data: null,
        errors: [errMsg]
      };

      if (isMutation || options.throwOnError) {
        const err = new Error(errMsg);
        err.status = isAbort ? 408 : 0;
        err.statusCode = isAbort ? 408 : 0;
        err.isTimeout = isAbort;
        err.isCORS = !isAbort && isTypeError;
        err.isNetworkError = true;
        err.originalError = networkError;
        err.url = url;
        throw err;
      }

      return errorObj;
    }

    return {
      success: false,
      status: 0,
      message: 'Unknown error occurred',
      data: null,
      errors: ['Unknown error']
    };
  },

  get(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, { method: "GET", headers, ...options });
  },

  post(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, {
      method: "POST",
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options
    });
  },

  put(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, {
      method: "PUT",
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options
    });
  },

  patch(endpoint, body = {}, headers = {}, options = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options
    });
  },

  delete(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, { method: "DELETE", headers, ...options });
  },

  upload(endpoint, formData, headers = {}, options = {}) {
    const cleanHeaders = { ...(headers || {}) };
    delete cleanHeaders['Content-Type'];
    delete cleanHeaders['content-type'];
    delete cleanHeaders['Content-type'];
    delete cleanHeaders['CONTENT-TYPE'];

    return this.request(endpoint, {
      method: "POST",
      headers: cleanHeaders,
      body: formData,
      timeout: options.timeout || 150000,
      ...options
    });
  },

  /**
   * Synchronizes fetched live products into localStorage for fast shelf mapping.
   */
  _syncProductsToStorage(liveProducts) {
    if (!Array.isArray(liveProducts)) return;
    try {
      let existing = [];
      const stored = localStorage.getItem(STORAGE_KEY_CATALOG);
      if (stored) existing = JSON.parse(stored);
      if (!Array.isArray(existing)) existing = [];

      const idMap = new Map();
      existing.forEach(p => idMap.set(String(p.id || p.sku || p.store_sku), p));

      liveProducts.forEach(lp => {
        const key = String(lp.id || lp.store_sku || lp.sku);
        const mapped = {
          id: lp.id || key,
          name: lp.product_name || lp.name || 'منتج',
          sku: lp.store_sku || lp.sku || 'SKU-000',
          category: lp.category || 'عام',
          price: typeof lp.price === 'number' ? lp.price : parseFloat(lp.price || 0),
          quantity: typeof lp.quantity === 'number' ? lp.quantity : 10,
          stock: typeof lp.quantity === 'number' ? lp.quantity : 10,
          threshold: 5,
          lowStockThreshold: 5,
          shelf: lp.shelf || (lp.aisle ? `ممر ${lp.aisle}` : 'A-01'),
          zone: lp.zone || 'المنطقة أ',
          aisle: lp.aisle || 'ممر 01',
          rack: lp.rack || 'R1',
          available: lp.stock_status !== 'OUT_OF_STOCK',
          isAvailable: lp.stock_status !== 'OUT_OF_STOCK',
          status: lp.stock_status === 'OUT_OF_STOCK' ? 'Draft' : 'Published',
          updatedAt: lp.updated_at ? new Date(lp.updated_at).toLocaleDateString('ar-SA') : 'اليوم'
        };
        idMap.set(key, mapped);
      });

      const merged = Array.from(idMap.values());
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(merged));
    } catch (e) {}
  },

  // =========================================================================
  // Health Check Endpoint (ASP.NET Backend)
  // =========================================================================
  health: {
    check() {
      return ApiClient.get('/Health', {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // 1. Authentication Endpoints (ASP.NET Backend)
  // =========================================================================
  auth: {
    login(credentials) {
      return ApiClient.post('/Auth/login', credentials, {}, { service: 'auth', throwOnError: true });
    },
    register(payload) {
      return ApiClient.post('/Auth/register', payload, {}, { service: 'auth', throwOnError: true });
    },
    verifyCode(payload) {
      // Expects { email, code, codeType: 1 }
      return ApiClient.post('/Auth/verify-code', payload, {}, { service: 'auth', throwOnError: true });
    },
    resendCode(payload) {
      // Expects { email, codeType: 1 }
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

        // Direct DOM update across all store name placeholders
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
  // 2. Categories & Taxonomy (ASP.NET Backend)
  // =========================================================================
  categories: {
    list(search = '') {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return ApiClient.get(`/categories${q}`, {}, { service: 'auth' });
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
    tree() {
      return ApiClient.get('/categories/tree', {}, { service: 'auth' });
    },
    get(id) {
      return ApiClient.get(`/categories/${id}`, {}, { service: 'auth' });
    },
    // Admin Taxonomy Governance
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
  // 3. Store Applications & Merchant Management (ASP.NET Backend)
  // =========================================================================
  stores: {
    list() {
      return ApiClient.get('/merchant/stores', {}, { service: 'auth' });
    },
    getApplications() {
      return ApiClient.get('/merchant/stores', {}, { service: 'auth' });
    },
    getApplication(appId) {
      return ApiClient.get(`/merchant/stores/${appId}`, {}, { service: 'auth' });
    },
    createApplication(payload) {
      return ApiClient.post('/merchant/stores', payload, {}, { service: 'auth', throwOnError: true });
    },
    updateApplication(appId, payload) {
      return ApiClient.put(`/merchant/stores/${appId}`, payload, {}, { service: 'auth', throwOnError: true });
    },
    uploadDocument(appId, formData) {
      return ApiClient.upload(`/merchant/stores/${appId}/documents`, formData, {}, { service: 'auth', throwOnError: true });
    },
    deleteDocument(appId, docId) {
      return ApiClient.delete(`/merchant/stores/${appId}/documents/${docId}`, {}, { service: 'auth', throwOnError: true });
    },
    submitApplication(appId) {
      return ApiClient.post(`/merchant/stores/${appId}/submit`, {}, {}, { service: 'auth', throwOnError: true });
    },
    // Public store exploration
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
    },
    getStore(storeId = null) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) {
        ApiClient.handleInvalidStoreId();
        return Promise.resolve({
          success: false,
          status: 404,
          message: "لم يتم تحديد معرّف متجر نشط (store_id).",
          data: null,
          errors: ["Missing store_id"]
        });
      }
      return ApiClient.get(`/stores/${id}`, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // 4. Products & Inventory Management (FastAPI on Render)
  // =========================================================================
  products: {
    list(storeId = null, { skip = 0, limit = 50 } = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) {
        return Promise.resolve({
          success: false,
          status: 400,
          message: "لم يتم العثور على معرّف متجر صالح (store_id). يرجى اختيار المتجر أولاً.",
          data: null,
          errors: ["Missing store_id"]
        });
      }
      return ApiClient.get(`/api/v1/stores/${id}/products?skip=${skip}&limit=${limit}`, {}, { service: 'products' });
    },

    create(storeId = null, productData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) {
        const errMsg = "لم يتم تحديد معرّف متجر نشط (store_id). يرجى التأكد من اختيار المتجر قبل إضافة المنتجات.";
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast({ title: 'تنبيه', message: errMsg, type: 'warning' });
        }
        return Promise.reject(new Error(errMsg));
      }
      return ApiClient.post(`/api/v1/stores/${id}/products`, productData, {}, { service: 'products', throwOnError: true });
    },

    get(storeId = null, productId) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      if (!productId) return Promise.reject(new Error("Missing product_id"));
      return ApiClient.get(`/api/v1/stores/${id}/products/${productId}`, {}, { service: 'products' });
    },

    update(storeId = null, productId, productData = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("لم يتم تحديد معرّف متجر صالح (store_id). يرجى تسجيل الدخول أو اختيار المتجر أولاً."));
      if (!productId) return Promise.reject(new Error("لم يتم تحديد معرّف المنتج (product_id) المراد تعديله."));
      return ApiClient.put(`/api/v1/stores/${id}/products/${productId}`, productData, {}, { service: 'products', throwOnError: true, ...options });
    },

    delete(storeId = null, productId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("لم يتم تحديد معرّف متجر صالح (store_id). يرجى تسجيل الدخول أو اختيار المتجر أولاً."));
      if (!productId) return Promise.reject(new Error("لم يتم تحديد معرّف المنتج (product_id) المراد حذفه."));
      return ApiClient.delete(`/api/v1/stores/${id}/products/${productId}`, {}, { service: 'products', throwOnError: true, ...options });
    },

    bulkImport(storeId = null, file) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      const formData = new FormData();
      formData.append('file', file);
      return ApiClient.upload(`/api/v1/stores/${id}/catalog/bulk-import`, formData, {}, { service: 'products', throwOnError: true });
    }
  },

  // =========================================================================
  // 5. AI Shelf Capture & Extraction Jobs (FastAPI on Render)
  // =========================================================================
  shelfJobs: {
    create(storeId = null, formData, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));

      const customHeaders = { ...(options.headers || {}) };
      delete customHeaders['Content-Type'];
      delete customHeaders['content-type'];
      delete customHeaders['Content-type'];
      delete customHeaders['CONTENT-TYPE'];

      return ApiClient.upload(
        `/api/v1/stores/${id}/shelf-jobs`,
        formData,
        customHeaders,
        {
          service: 'products',
          throwOnError: true,
          timeout: options.timeout || 150000, // 2.5 minutes (>= 2 minutes)
          ...options
        }
      );
    },
    list(storeId = null, { skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) {
        return Promise.resolve({ success: false, status: 400, message: "Missing store_id", data: null });
      }
      return ApiClient.get(`/api/v1/stores/${id}/shelf-jobs?skip=${skip}&limit=${limit}`, {}, { service: 'products', timeout: 60000, ...options });
    },
    get(storeId = null, jobId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.get(`/api/v1/stores/${id}/shelf-jobs/${jobId}`, {}, { service: 'products', timeout: 60000, ...options });
    }
  },

  draftProducts: {
    list(storeId = null, { shelf_job_id, status, skip = 0, limit = 50 } = {}, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) {
        return Promise.resolve({ success: false, status: 400, message: "Missing store_id", data: null });
      }
      let query = `?skip=${skip}&limit=${limit}`;
      if (shelf_job_id) query += `&shelf_job_id=${encodeURIComponent(shelf_job_id)}`;
      if (status) query += `&status=${encodeURIComponent(status)}`;
      return ApiClient.get(`/api/v1/stores/${id}/draft-products${query}`, {}, { service: 'products', timeout: 30000, ...options });
    },
    get(storeId = null, draftId, options = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.get(`/api/v1/stores/${id}/draft-products/${draftId}`, {}, { service: 'products', timeout: 30000, ...options });
    },
    update(storeId = null, draftId, draftData = {}) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.put(`/api/v1/stores/${id}/draft-products/${draftId}`, draftData, {}, { service: 'products', throwOnError: true });
    },
    approve(storeId = null, draftId) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.post(`/api/v1/stores/${id}/draft-products/${draftId}/approve`, {}, {}, { service: 'products', throwOnError: true });
    },
    reject(storeId = null, draftId) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.post(`/api/v1/stores/${id}/draft-products/${draftId}/reject`, {}, {}, { service: 'products', throwOnError: true });
    },
    batchApprove(storeId = null, draftIds = []) {
      const id = storeId || ApiClient.getActiveStoreId();
      if (!id) return Promise.reject(new Error("Missing store_id"));
      return ApiClient.post(`/api/v1/stores/${id}/draft-products/batch-approve`, { draft_ids: draftIds }, {}, { service: 'products', throwOnError: true });
    }
  },

  // =========================================================================
  // 6. Store Staff & Access Control (ASP.NET Backend)
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
  // 7. Platform Administration (ASP.NET Backend)
  // =========================================================================
  admin: {
    users(query = '') {
      return ApiClient.get(`/admin/users${query ? '?' + query : ''}`, {}, { service: 'auth' });
    },
    getUser(userId) {
      return ApiClient.get(`/admin/users/${userId}`, {}, { service: 'auth' });
    },
    toggleUser(userId, action, reason = '') {
      return ApiClient.post(`/admin/users/${userId}/${action}`, action === 'suspend' ? { reason } : {}, {}, { service: 'auth', throwOnError: true });
    },
    storeApplications(status = '') {
      return ApiClient.get(`/admin/stores/applications${status ? '?status=' + status : ''}`, {}, { service: 'auth' });
    },
    getStoreApplication(appId) {
      return ApiClient.get(`/admin/stores/applications/${appId}`, {}, { service: 'auth' });
    },
    startReview(appId) {
      return ApiClient.post(`/admin/stores/applications/${appId}/start-review`, {}, {}, { service: 'auth', throwOnError: true });
    },
    approveApplication(appId) {
      return ApiClient.post(`/admin/stores/applications/${appId}/approve`, {}, {}, { service: 'auth', throwOnError: true });
    },
    rejectApplication(appId, reason = '') {
      return ApiClient.post(`/admin/stores/applications/${appId}/reject`, { reason }, {}, { service: 'auth', throwOnError: true });
    },
    requestInfo(appId, message = '') {
      return ApiClient.post(`/admin/stores/applications/${appId}/request-info`, { message }, {}, { service: 'auth', throwOnError: true });
    },
    suspendStore(storeId, reason = '') {
      return ApiClient.post(`/admin/stores/${storeId}/suspend`, { reason }, {}, { service: 'auth', throwOnError: true });
    },
    activateStore(storeId) {
      return ApiClient.post(`/admin/stores/${storeId}/activate`, {}, {}, { service: 'auth', throwOnError: true });
    },
    auditLogs(query = '') {
      return ApiClient.get(`/admin/audit-logs${query ? '?' + query : ''}`, {}, { service: 'auth' });
    },
    getAuditLog(id) {
      return ApiClient.get(`/admin/audit-logs/${id}`, {}, { service: 'auth' });
    }
  },

  // =========================================================================
  // 8. User Profile (ASP.NET Backend)
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
  // 9. Audit Logging (ASP.NET Backend with local ledger storage)
  // =========================================================================
  audit: {
    list(query = '') {
      return ApiClient.get(`/admin/audit-logs${query ? '?' + query : ''}`, {}, { service: 'auth' });
    },
    log(entry = {}) {
      try {
        let logs = [];
        const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
        if (raw) logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];

        const newLog = {
          id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
          timestamp: new Date().toISOString(),
          formattedTime: 'اليوم، ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          performedBy: localStorage.getItem('dawwer_user_name') || 'مدير المتجر',
          ...entry
        };
        logs.unshift(newLog);
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs));
        return normalizeEnvelope(newLog, "تم تسجيل العملية في سجل التدقيق بنجاح.");
      } catch (e) {
        return normalizeEnvelope(null, "تعذر تسجيل العملية.", false);
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
