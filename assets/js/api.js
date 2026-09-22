/**
 * Dawwer Platform - Universal API Client
 * Supports JSON, Multipart FormData, JWT Injection, 401 Auto-Refresh, and Error Aggregation
 */
const ApiClient = {
  /**
   * Main HTTP request handler
   * @param {string} endpoint - API path (e.g. '/Auth/login' or 'categories')
   * @param {object} options - Fetch configuration options
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const headers = options.headers || {};

    // Do NOT set Content-Type if uploading FormData (browser must generate boundary)
    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json; charset=utf-8";
    }

    // Attach active store-token if present, else fallback to standard access token
    const storeToken = localStorage.getItem(CONFIG.STORE_TOKEN_KEY);
    const accessToken = localStorage.getItem(CONFIG.TOKEN_KEY);
    const token = storeToken || accessToken;

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 Unauthorized: Attempt token refresh once
      if (response.status === 401 && !options._isRetry) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request with fresh token
          return this.request(endpoint, { ...options, _isRetry: true });
        } else {
          if (typeof Auth !== "undefined") {
            Auth.logout();
          } else {
            localStorage.clear();
            window.location.href = "login.html";
          }
          throw new Error("انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.");
        }
      }

      // Handle 403 Forbidden: Permission denied
      if (response.status === 403) {
        throw new Error("ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء (403 Forbidden).");
      }

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = `حدث خطأ (${response.status})`;
        if (responseData) {
          if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
            errorMsg = responseData.errors.join("<br>");
          } else if (responseData.message) {
            errorMsg = responseData.message;
          }
        }
        const err = new Error(errorMsg);
        err.status = response.status;
        err.response = responseData;
        err.data = responseData ? (responseData.data || responseData) : null;
        throw err;
      }

      return responseData; // Standard envelope: { success, message, data, errors }
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      throw error;
    }
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: "GET", headers });
  },

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body)
    });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: "DELETE", headers });
  },

  /**
   * Dedicated file/document upload helper (multipart/form-data)
   * @param {string} endpoint - API upload route
   * @param {FormData} formData - Populated FormData instance
   */
  upload(endpoint, formData, headers = {}) {
    return this.request(endpoint, {
      method: "POST",
      headers,
      body: formData
    });
  },

  /**
   * Executes token refresh using POST /api/Auth/refresh-token
   */
  async refreshToken() {
    const accessToken = localStorage.getItem(CONFIG.TOKEN_KEY);
    const refreshToken = localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) return false;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/Auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken })
      });

      if (response.ok) {
        const res = await response.json();
        if (res.success && res.data) {
          localStorage.setItem(CONFIG.TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, res.data.refreshToken);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
};
