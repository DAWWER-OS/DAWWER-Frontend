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
    const cleanStoreId = (storeId && typeof storeId === 'string' && storeId.trim() !== 'null' && storeId.trim() !== 'undefined' && storeId !== '11111111-1111-1111-1111-111111111111')
      ? storeId.trim()
      : null;
    const user = {
      userId: authData.userId,
      fullName: authData.fullName,
      email: authData.email,
      phoneNumber: authData.phoneNumber || "",
      role: authData.role,
      storeId: cleanStoreId,
      storeName: storeName
    };
    if (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) {
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }
    localStorage.setItem("dawwer_user_data", JSON.stringify(user));

    if (cleanStoreId) {
      localStorage.setItem('activeStoreId', cleanStoreId);
      localStorage.setItem('store_id', cleanStoreId);
      localStorage.setItem('storeId', cleanStoreId);
      localStorage.setItem('active_store_id', cleanStoreId);
      localStorage.setItem('dawwer_active_store_id', cleanStoreId);
      localStorage.setItem('dawwer_store_id', cleanStoreId);
      if (typeof ApiClient !== 'undefined' && ApiClient.setActiveStoreId) {
        ApiClient.setActiveStoreId(cleanStoreId);
      }
    } else {
      localStorage.removeItem('activeStoreId');
      localStorage.removeItem('store_id');
      localStorage.removeItem('storeId');
      localStorage.removeItem('active_store_id');
      localStorage.removeItem('dawwer_active_store_id');
      localStorage.removeItem('dawwer_store_id');
      if (typeof ApiClient !== 'undefined' && ApiClient.clearInvalidStoreId) {
        ApiClient.clearInvalidStoreId();
      }
    }
  },

  getUser() {
    try {
      const userKey = (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) ? CONFIG.USER_KEY : "dawwer_user_data";
      const raw = localStorage.getItem(userKey) ||
                  localStorage.getItem("dawwer_user_data") ||
                  localStorage.getItem("user") ||
                  localStorage.getItem("userData");
      if (raw) return JSON.parse(raw);

      // If user object not found directly, check if we have token or userId in storage
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token") || (typeof CONFIG !== 'undefined' && localStorage.getItem(CONFIG.TOKEN_KEY));
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const role = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role || 2;
            const email = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || payload.email || "";
            const userId = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || payload.nameid || payload.sub || localStorage.getItem("userId") || "";
            const fullName = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || payload.unique_name || payload.name || "مستخدم دوّر";
            return {
              userId,
              fullName,
              email,
              role,
              storeId: localStorage.getItem("store_id") || localStorage.getItem("storeId") || null,
              storeName: localStorage.getItem("storeName") || localStorage.getItem("store_name") || null
            };
          }
        } catch (jwtErr) {}
        return {
          userId: localStorage.getItem("userId") || "user-default",
          fullName: "مستخدم دوّر",
          email: "",
          role: 2,
          storeId: localStorage.getItem("store_id") || localStorage.getItem("storeId") || null,
          storeName: localStorage.getItem("storeName") || localStorage.getItem("store_name") || null
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!(
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("storeToken") ||
      localStorage.getItem("dawwer_access_token") ||
      (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY && localStorage.getItem(CONFIG.TOKEN_KEY))
    );
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
            localStorage.setItem('activeStoreId', res.data.storeId);
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

        if (typeof CONFIG !== 'undefined' && CONFIG.ACTIVE_STORE_KEY) {
          localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, JSON.stringify(activeData));
        }
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
      const activeStoreKey = (typeof CONFIG !== 'undefined' && CONFIG.ACTIVE_STORE_KEY) ? CONFIG.ACTIVE_STORE_KEY : "dawwer_active_store";
      const raw = localStorage.getItem(activeStoreKey) || localStorage.getItem("dawwer_active_store");
      let activeObj = null;
      if (raw) {
        try {
          activeObj = JSON.parse(raw);
        } catch (e) {}
      }

      // Read active_store_id and storeToken directly from localStorage
      const activeStoreId = localStorage.getItem('active_store_id') ||
                            localStorage.getItem('activeStoreId') ||
                            localStorage.getItem('store_id') ||
                            localStorage.getItem('storeId') ||
                            activeObj?.storeId || activeObj?.id;

      const storeToken = localStorage.getItem('storeToken') ||
                         localStorage.getItem('store_token') ||
                         localStorage.getItem('dawwer_store_token') ||
                         activeObj?.storeToken;

      const storeName = localStorage.getItem('storeName') ||
                        localStorage.getItem('store_name') ||
                        activeObj?.storeName || activeObj?.name || 'المتجر الحالي';

      if (activeStoreId && activeStoreId !== 'null' && activeStoreId !== 'undefined') {
        return {
          storeId: activeStoreId,
          id: activeStoreId,
          storeName: storeName,
          name: storeName,
          storeToken: storeToken || null,
          roleName: activeObj?.roleName || 'Merchant',
          permissions: activeObj?.permissions || []
        };
      }
      return activeObj;
    } catch {
      return null;
    }
  },

  hasRole(role) {
    const user = this.getUser();
    if (!user) return false;
    if (typeof role === "number") {
      const roles = (typeof CONFIG !== 'undefined' && CONFIG.ROLES) ? CONFIG.ROLES : { ADMIN: 4, MERCHANT: 2, STAFF: 3, CUSTOMER: 1 };
      if (role === roles.ADMIN && (user.role === "Admin" || user.role === 4)) return true;
      if (role === roles.MERCHANT && (user.role === "Merchant" || user.role === 2)) return true;
      if (role === roles.STAFF && (user.role === "Staff" || user.role === 3)) return true;
      if (role === roles.CUSTOMER && (user.role === "Customer" || user.role === 1)) return true;
    }
    return (user.role || "").toString().toLowerCase() === role.toString().toLowerCase();
  },

  hasPermission(permissionCode) {
    const adminRole = (typeof CONFIG !== 'undefined' && CONFIG.ROLES) ? CONFIG.ROLES.ADMIN : 4;
    if (this.hasRole(adminRole)) return true;
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
    // Run authentication check once per page mount to prevent circular re-checks
    if (this._authChecked) return true;
    this._authChecked = true;

    const currentPath = window.location.pathname.split("/").pop() || 'index.html';
    const loginTarget = (window.location.protocol === 'file:') ? 'login.html' : '/login.html';

    if (!this.isAuthenticated()) {
      const authPages = ['login.html', 'register.html', 'verify-account.html', 'forgot-password.html', 'reset-password.html', 'admin-login.html', 'select-store.html'];
      if (!authPages.includes(currentPath)) {
        if (currentPath === 'admin-dashboard.html') {
          try {
            sessionStorage.setItem('dawwer_pending_toast', JSON.stringify({
              title: 'تنبيه أمني',
              message: 'يرجى تسجيل الدخول بحساب مسؤول للوصول إلى لوحة الإدارة.',
              type: 'warning'
            }));
          } catch (e) {}
          window.location.replace(`${loginTarget}?unauthorized=true`);
        } else {
          window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      return false;
    }

    const user = this.getUser();
    if (!user) {
      console.warn('[Auth.requireAuth] User object pending, but session token is present. Preserving session.');
      return true;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const roleMatches = allowedRoles.some(r => this.hasRole(r));
      if (!roleMatches) {
        console.warn(`[Auth.requireAuth] User role (${user.role}) does not match required roles:`, allowedRoles);
        if (currentPath === 'admin-dashboard.html' || allowedRoles.includes(4) || allowedRoles.includes("Admin")) {
          try {
            sessionStorage.setItem('dawwer_pending_toast', JSON.stringify({
              title: 'تنبيه الصلاحيات',
              message: 'غير مصرح: هذا الحساب لا يملك صلاحيات مسؤول للوصول إلى لوحة الإدارة.',
              type: 'warning'
            }));
          } catch (e) {}
          window.location.replace(`${loginTarget}?unauthorized=true`);
        }
        return false;
      }
    }
    return true;
  }
};
