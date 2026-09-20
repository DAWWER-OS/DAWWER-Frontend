/**
 * Dawwer Platform - Authentication, RBAC & Route Guard Module
 */
const Auth = {
  saveSession(authData) {
    if (authData.accessToken) localStorage.setItem(CONFIG.TOKEN_KEY, authData.accessToken);
    if (authData.refreshToken) localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, authData.refreshToken);
    
    const user = {
      userId: authData.userId,
      fullName: authData.fullName,
      email: authData.email,
      phoneNumber: authData.phoneNumber || "",
      role: authData.role
    };
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
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
    return !!localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  /**
   * Switches store context and saves store-scoped JWT + permissions
   * @param {string} storeId - Target store GUID
   */
  async selectStore(storeId) {
    try {
      const res = await ApiClient.post("/Auth/select-store", { storeId });
      if (res.success && res.data) {
        localStorage.setItem(CONFIG.STORE_TOKEN_KEY, res.data.storeToken);
        localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, JSON.stringify({
          storeId: res.data.storeId,
          storeName: res.data.storeName,
          roleName: res.data.roleName,
          permissions: res.data.permissions || []
        }));
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
    // Admins implicitly have all store permissions
    if (this.hasRole(CONFIG.ROLES.ADMIN)) return true;
    const store = this.getActiveStore();
    if (!store || !Array.isArray(store.permissions)) return false;
    return store.permissions.includes(permissionCode);
  },

  /**
   * Scans DOM for data-require-role and data-require-perm and trims unauthorized UI
   */
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
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_KEY);
      localStorage.removeItem(CONFIG.STORE_TOKEN_KEY);
      localStorage.removeItem(CONFIG.ACTIVE_STORE_KEY);
      window.location.href = "login.html";
    }
  },

  /**
   * Route Guard: Call synchronously in page <head>
   */
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
