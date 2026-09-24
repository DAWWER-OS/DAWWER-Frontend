const Auth = {
  saveSession(authData) {
    if (authData.accessToken) {
      localStorage.setItem("token", authData.accessToken);
      localStorage.setItem("accessToken", authData.accessToken);
      localStorage.setItem("dawwer_access_token", authData.accessToken);
      localStorage.setItem("access_token", authData.accessToken);
      if (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY) {
        localStorage.setItem(CONFIG.TOKEN_KEY, authData.accessToken);
      }
    }
    if (authData.refreshToken) {
      localStorage.setItem("refreshToken", authData.refreshToken);
      localStorage.setItem("refresh_token", authData.refreshToken);
      localStorage.setItem("dawwer_refresh_token", authData.refreshToken);
      if (typeof CONFIG !== 'undefined' && CONFIG.REFRESH_TOKEN_KEY) {
        localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, authData.refreshToken);
      }
    }
    if (authData.userId) {
      localStorage.setItem("userId", authData.userId);
    }

    const storeToken = authData.storeToken || authData.store_token || null;
    if (storeToken) {
      localStorage.setItem("storeToken", storeToken);
      localStorage.setItem("store_token", storeToken);
      localStorage.setItem("dawwer_store_token", storeToken);
      if (typeof CONFIG !== 'undefined' && CONFIG.STORE_TOKEN_KEY) {
        localStorage.setItem(CONFIG.STORE_TOKEN_KEY, storeToken);
      }
    }

    const storeName = authData.storeName || authData.store_name || null;
    if (storeName) {
      localStorage.setItem("storeName", storeName);
      localStorage.setItem("store_name", storeName);
      localStorage.setItem("dawwer_store_name", storeName);
    }

    const storeId = authData.storeId || authData.store_id || null;
    const user = {
      userId: authData.userId,
      fullName: authData.fullName,
      email: authData.email,
      phoneNumber: authData.phoneNumber || "",
      role: authData.role,
      storeId: (storeId && storeId !== '11111111-1111-1111-1111-111111111111') ? storeId : null,
      storeName: storeName
    };
    if (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) {
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }
    localStorage.setItem("dawwer_user_data", JSON.stringify(user));

    if (user.storeId) {
      localStorage.setItem('store_id', user.storeId);
      localStorage.setItem('storeId', user.storeId);
      localStorage.setItem('active_store_id', user.storeId);
      localStorage.setItem('dawwer_active_store_id', user.storeId);
      localStorage.setItem('dawwer_store_id', user.storeId);
      if (typeof ApiClient !== 'undefined' && ApiClient.setActiveStoreId) {
        ApiClient.setActiveStoreId(user.storeId);
      }
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem(CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!(localStorage.getItem("token") || (typeof CONFIG !== 'undefined' && localStorage.getItem(CONFIG.TOKEN_KEY)));
  },

  async selectStore(storeId) {
    try {
      const res = (typeof ApiClient !== 'undefined' && ApiClient.auth && ApiClient.auth.selectStore)
        ? await ApiClient.auth.selectStore(storeId)
        : await ApiClient.post("/Auth/select-store", { storeId });

      if (res && res.success && res.data) {
        if (res.data.storeName) {
          localStorage.setItem('storeName', res.data.storeName);
          localStorage.setItem('store_name', res.data.storeName);
          localStorage.setItem('dawwer_store_name', res.data.storeName);
        }
        if (res.data.storeToken) {
          localStorage.setItem('storeToken', res.data.storeToken);
          localStorage.setItem('store_token', res.data.storeToken);
          localStorage.setItem('dawwer_store_token', res.data.storeToken);
          if (typeof CONFIG !== 'undefined' && CONFIG.STORE_TOKEN_KEY) {
            localStorage.setItem(CONFIG.STORE_TOKEN_KEY, res.data.storeToken);
          }
        }
        if (res.data.storeId) {
          if (typeof ApiClient !== 'undefined' && ApiClient.setActiveStoreId) {
            ApiClient.setActiveStoreId(res.data.storeId);
          } else {
            localStorage.setItem('store_id', res.data.storeId);
            localStorage.setItem('active_store_id', res.data.storeId);
          }
        }

        const activeData = {
          storeId: res.data.storeId,
          storeName: res.data.storeName,
          roleName: res.data.roleName,
          permissions: res.data.permissions || []
        };

        localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, JSON.stringify(activeData));
        localStorage.setItem('dawwer_active_store', JSON.stringify(activeData));

        document.querySelectorAll('#current-store-name, [data-store-name], #store-name-text').forEach(el => {
          el.textContent = res.data.storeName || 'المتجر الحالي';
        });

        if (typeof DawwerLayout !== 'undefined' && DawwerLayout.updateStoreIdentity) {
          DawwerLayout.updateStoreIdentity(res.data.storeName, res.data.roleName);
        }

        return res.data;
      }
      return null;
    } catch (err) {
      console.error("Select store failed:", err);
      throw err;
    }
  },

  getActiveStore() {
    try {
      const raw = localStorage.getItem(CONFIG.ACTIVE_STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  hasRole(role) {
    const user = this.getUser();
    if (!user) return false;
    if (typeof role === "number") {
      if (role === CONFIG.ROLES.ADMIN && (user.role === "Admin" || user.role === 4)) return true;
      if (role === CONFIG.ROLES.MERCHANT && (user.role === "Merchant" || user.role === 2)) return true;
      if (role === CONFIG.ROLES.STAFF && (user.role === "Staff" || user.role === 3)) return true;
      if (role === CONFIG.ROLES.CUSTOMER && (user.role === "Customer" || user.role === 1)) return true;
    }
    return (user.role || "").toString().toLowerCase() === role.toString().toLowerCase();
  },

  hasPermission(permissionCode) {
    if (this.hasRole(CONFIG.ROLES.ADMIN)) return true;
    const store = this.getActiveStore();
    if (!store || !Array.isArray(store.permissions)) return false;
    return store.permissions.includes(permissionCode);
  },

  applyPermissionTrimming() {
    document.querySelectorAll("[data-require-role]").forEach(el => {
      const requiredRole = el.getAttribute("data-require-role");
      if (!this.hasRole(requiredRole)) {
        el.style.display = "none";
      }
    });

    document.querySelectorAll("[data-require-perm]").forEach(el => {
      const requiredPerm = el.getAttribute("data-require-perm");
      if (!this.hasPermission(requiredPerm)) {
        el.style.display = "none";
      }
    });
  },

  async logout() {
    try {
      if (this.isAuthenticated()) {
        await ApiClient.post("/Auth/logout", {});
      }
    } catch (e) {
      console.warn("Server logout notification skipped:", e);
    } finally {
      if (typeof ApiClient !== 'undefined' && typeof ApiClient.clearSession === 'function') {
        ApiClient.clearSession();
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("storeToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("storeId");
        localStorage.removeItem("store_id");
        localStorage.removeItem("storeName");
        if (typeof CONFIG !== 'undefined') {
          if (CONFIG.TOKEN_KEY) localStorage.removeItem(CONFIG.TOKEN_KEY);
          if (CONFIG.REFRESH_TOKEN_KEY) localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);
          if (CONFIG.USER_KEY) localStorage.removeItem(CONFIG.USER_KEY);
          if (CONFIG.STORE_TOKEN_KEY) localStorage.removeItem(CONFIG.STORE_TOKEN_KEY);
          if (CONFIG.ACTIVE_STORE_KEY) localStorage.removeItem(CONFIG.ACTIVE_STORE_KEY);
        }
      }
      window.location.href = "login.html";
    }
  },

  requireAuth(allowedRoles = []) {
    if (!this.isAuthenticated()) {
      const currentPath = window.location.pathname.split("/").pop();
      window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
      return false;
    }

    const user = this.getUser();
    if (!user) {
      this.logout();
      return false;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const roleMatches = allowedRoles.some(r => this.hasRole(r));
      if (!roleMatches) {
        alert("غير مصرح لك بالوصول إلى هذه الصفحة.");
        window.location.href = (user.role === "Admin" || user.role === 4) ? "admin-dashboard.html" : "index.html";
        return false;
      }
    }
    return true;
  }
};
