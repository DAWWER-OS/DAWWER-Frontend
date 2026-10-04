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
  DEFAULT_STORE_ID: "a0000000-0000-0000-0000-000000000001",

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
  }
};

if (typeof window !== 'undefined') {
  window.CONFIG = window.CONFIG || {};
  Object.assign(window.CONFIG, CONFIG);
  window.CONFIG.FASTAPI_BASE_URL = window.CONFIG.FASTAPI_BASE_URL || 'https://dawwer-backend-fastapi.onrender.com';
  window.FASTAPI_BASE_URL = window.CONFIG.FASTAPI_BASE_URL;
}

var FASTAPI_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.FASTAPI_BASE_URL)
  ? window.CONFIG.FASTAPI_BASE_URL
  : (CONFIG.FASTAPI_BASE_URL || 'https://dawwer-backend-fastapi.onrender.com');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, FASTAPI_BASE_URL };
}
