const CONFIG = {
  // Primary Platform Backend (ASP.NET Core 9 / Production)
  API_BASE_URL: "https://dawwer.runasp.net/api",
  // AI & In-Store Spatial Backend (FastAPI / Gemini Vision / Spatial Mapping)
  FASTAPI_BASE_URL: "https://dawwer-backend-fastapi.onrender.com",

  // Backward-compatibility aliases
  AUTH_BASE_URL: "https://dawwer.runasp.net/api",
  PRODUCTS_BASE_URL: "https://dawwer-backend-fastapi.onrender.com",

  REQUEST_TIMEOUT: 90000,
  TIMEOUT_MS: 90000,

  // Unified Storage Keys & Fallbacks
  TOKEN_KEY: "accessToken",
  TOKEN_FALLBACK_KEY: "dawwer_access_token",
  STORE_TOKEN_KEY: "storeToken",
  STORE_TOKEN_FALLBACK_KEY: "dawwer_store_token",
  ACTIVE_STORE_KEY: "activeStoreId",
  ACTIVE_STORE_FALLBACK_KEY: "storeId",
  REFRESH_TOKEN_KEY: "refreshToken",
  REFRESH_TOKEN_FALLBACK_KEY: "dawwer_refresh_token",
  USER_KEY: "userData",
  USER_FALLBACK_KEY: "dawwer_user_data",
  DEFAULT_STORE_ID: null,

  // Storage helper methods
  getToken() {
    try {
      return localStorage.getItem(this.TOKEN_KEY) ||
             localStorage.getItem(this.TOKEN_FALLBACK_KEY) ||
             localStorage.getItem('token') ||
             null;
    } catch (e) {
      return null;
    }
  },

  getStoreToken() {
    try {
      return localStorage.getItem(this.STORE_TOKEN_KEY) ||
             localStorage.getItem(this.STORE_TOKEN_FALLBACK_KEY) ||
             localStorage.getItem('store_token') ||
             null;
    } catch (e) {
      return null;
    }
  },

  getActiveStoreId() {
    try {
      const keys = [this.ACTIVE_STORE_KEY, this.ACTIVE_STORE_FALLBACK_KEY, 'active_store_id', 'dawwer_active_store_id'];
      for (const k of keys) {
        let val = localStorage.getItem(k);
        if (val) {
          if (typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const p = JSON.parse(val);
              val = p?.storeId || p?.id || p?.store_id;
            } catch (e) {}
          }
          if (val && typeof val === 'string' && val.trim() !== '' && val !== 'null' && val !== 'undefined') {
            return val.trim();
          }
        }
      }
      const rawStore = localStorage.getItem('dawwer_active_store');
      if (rawStore) {
        try {
          const parsed = JSON.parse(rawStore);
          const sid = parsed?.storeId || parsed?.id || parsed?.store_id;
          if (sid && typeof sid === 'string' && sid.trim() !== '') return sid.trim();
        } catch (e) {}
      }
      return this.DEFAULT_STORE_ID;
    } catch (e) {
      return this.DEFAULT_STORE_ID;
    }
  },

  ROLES: {
    CUSTOMER: 1,
    MERCHANT: 2,
    STAFF: 3,
    ADMIN: 4
  },

  USER_STATUS: {
    PENDING_VERIFICATION: 1,
    ACTIVE: 2,
    SUSPENDED: 3,
    INACTIVE: 4
  },

  STORE_STATUS: {
    DRAFT: 1,
    SUBMITTED: 2,
    UNDER_REVIEW: 3,
    NEEDS_INFORMATION: 4,
    APPROVED: 5,
    REJECTED: 6
  },

  DOCUMENT_TYPES: {
    COMMERCIAL_REGISTER: 1,
    TAX_CARD: 2,
    STORE_LICENSE: 3,
    IDENTITY_DOCUMENT: 4,
    OTHER: 5
  },

  VERIFICATION_CODE_TYPES: {
    EMAIL: 1,
    PHONE: 2,
    PASSWORD_RESET: 3
  },

  PERMISSIONS: {
    PRODUCTS_VIEW: "Products.View",
    PRODUCTS_MANAGE: "Products.Manage",
    INVENTORY_VIEW: "Inventory.View",
    INVENTORY_MANAGE: "Inventory.Manage",
    ORDERS_VIEW: "Orders.View",
    ORDERS_MANAGE: "Orders.Manage",
    STAFF_MANAGE: "Staff.Manage",
    STORE_MANAGE: "Store.Manage"
  },

  // Primary platform backend host (without trailing /api)
  BACKEND_BASE_URL: "https://dawwer.runasp.net",

  /**
   * Resolves the root host/domain of the primary platform backend
   */
  getBackendBaseUrl() {
    const base = this.BACKEND_BASE_URL || this.API_BASE_URL || "https://dawwer.runasp.net";
    try {
      const url = new URL(base, typeof window !== 'undefined' && window.location ? window.location.origin : 'https://dawwer.runasp.net');
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      return String(base).replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    }
  },

  /**
   * Formats any image URL ensuring relative backend paths (like /uploads/...)
   * prepend the backend host rather than assuming a local frontend path.
   */
  resolveImageUrl(url, service = 'auth') {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed.startsWith('JOB-') || /^JOB[-_]/i.test(trimmed)) {
      return '';
    }
    // Data URLs and blob URLs
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    // Absolute URLs
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Local frontend static assets
    if (trimmed.startsWith('assets/') || trimmed.startsWith('./assets/') || trimmed.startsWith('/assets/')) {
      return trimmed.startsWith('./') ? trimmed.slice(2) : (trimmed.startsWith('/') ? trimmed.slice(1) : trimmed);
    }
    // Relative backend upload or static paths
    const backendHost = service === 'fastapi' ? this.FASTAPI_BASE_URL.replace(/\/+$/, '') : this.getBackendBaseUrl();
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${backendHost}/${cleanPath}`;
  }
};

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

function createImagePlaceholderHTML(caption = 'لم يتم الاستخراج', extraClasses = '') {
  return `
    <div class="img-fallback-placeholder flex flex-col items-center justify-center text-center p-1 w-full h-full text-slate-400 select-none ${extraClasses}">
      <svg class="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-tight">${caption}</span>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.CONFIG = window.CONFIG || {};
  Object.assign(window.CONFIG, CONFIG);
  window.CONFIG.API_BASE_URL = window.CONFIG.API_BASE_URL || CONFIG.API_BASE_URL;
  window.CONFIG.BACKEND_BASE_URL = window.CONFIG.BACKEND_BASE_URL || CONFIG.BACKEND_BASE_URL;
  window.CONFIG.FASTAPI_BASE_URL = window.CONFIG.FASTAPI_BASE_URL || 'https://dawwer-backend-fastapi.onrender.com';
  window.API_BASE_URL = window.CONFIG.API_BASE_URL;
  window.FASTAPI_BASE_URL = window.CONFIG.FASTAPI_BASE_URL;
  window.BACKEND_BASE_URL = window.CONFIG.BACKEND_BASE_URL;
  window.resolveImageUrl = CONFIG.resolveImageUrl.bind(CONFIG);
  window.getBackendBaseUrl = CONFIG.getBackendBaseUrl.bind(CONFIG);
  window.handleImageError = handleImageError;
  window.createImagePlaceholderHTML = createImagePlaceholderHTML;
}

var API_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_BASE_URL)
  ? window.CONFIG.API_BASE_URL
  : (CONFIG.API_BASE_URL || 'https://dawwer.runasp.net/api');

var FASTAPI_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.FASTAPI_BASE_URL)
  ? window.CONFIG.FASTAPI_BASE_URL
  : (CONFIG.FASTAPI_BASE_URL || 'https://dawwer-backend-fastapi.onrender.com');

var BACKEND_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.BACKEND_BASE_URL)
  ? window.CONFIG.BACKEND_BASE_URL
  : (CONFIG.BACKEND_BASE_URL || 'https://dawwer.runasp.net');

var resolveImageUrl = (typeof window !== 'undefined' && window.resolveImageUrl)
  ? window.resolveImageUrl
  : CONFIG.resolveImageUrl.bind(CONFIG);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, API_BASE_URL, FASTAPI_BASE_URL, BACKEND_BASE_URL, resolveImageUrl, handleImageError, createImagePlaceholderHTML };
}

