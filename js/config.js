const CONFIG = {
  AUTH_BASE_URL: "https://dawwer.runasp.net/api",
  PRODUCTS_BASE_URL: "https://dawwer-backend-fastapi.onrender.com",
  API_BASE_URL: "https://dawwer.runasp.net/api",

  TOKEN_KEY: "dawwer_access_token",
  REFRESH_TOKEN_KEY: "dawwer_refresh_token",
  USER_KEY: "dawwer_user_data",
  STORE_TOKEN_KEY: "dawwer_store_token",
  ACTIVE_STORE_KEY: "dawwer_active_store",
  DEFAULT_STORE_ID: null,

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
