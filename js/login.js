if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const user = Auth.getUser();
  if (redirect && !redirect.includes('login.html')) {
    window.location.href = redirect;
  } else if (user && (user.role === 'Admin' || user.role === 4 || user.role === '4')) {
    const adminUrl = (window.location.protocol === 'file:') ? 'admin-dashboard.html' : '/admin-dashboard.html';
    window.location.href = adminUrl;
  } else if (user && (user.role === 'Merchant' || user.role === 2 || user.role === '2')) {
    const merchantUrl = (window.location.protocol === 'file:') ? 'index.html' : '/index.html';
    window.location.href = merchantUrl;
  } else {
    const defaultUrl = (window.location.protocol === 'file:') ? 'index.html' : '/index.html';
    window.location.href = defaultUrl;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // 1. Account verified query handler
  if (urlParams.get('verified') === 'true' || urlParams.get('verified') === '1') {
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.innerHTML = 'تم تأكيد حسابك بنجاح، يمكنك الآن تسجيل الدخول';
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم تأكيد الحساب', message: 'يمكنك الآن تسجيل الدخول بنجاح', type: 'success' });
    }
  }

  // 2. Role Route Guard: Unauthorized access redirect notification
  const isUnauthorized = urlParams.get('unauthorized') === 'true' || urlParams.get('unauthorized') === '1';
  let pendingToast = null;
  try {
    const rawToast = sessionStorage.getItem('dawwer_pending_toast');
    if (rawToast) {
      pendingToast = JSON.parse(rawToast);
      sessionStorage.removeItem('dawwer_pending_toast');
    }
  } catch (e) {}

  if (isUnauthorized || pendingToast) {
    const errorBox = document.getElementById('error-message');
    const warningMsg = (pendingToast && pendingToast.message)
      || 'غير مصرح: يرجى تسجيل الدخول بحساب مسؤول يملك صلاحيات الإدارة للوصول إلى لوحة التحكم.';
    const warningTitle = (pendingToast && pendingToast.title) || 'تنبيه أمني';
    const warningType = (pendingToast && pendingToast.type) || 'warning';

    if (errorBox) {
      errorBox.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>${warningMsg}</span>
        </div>
      `;
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
    }

    if (typeof showToast === 'function') {
      showToast({
        title: warningTitle,
        message: warningMsg,
        type: warningType,
        duration: 6000
      });
    }
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const errorBox = document.getElementById('error-message');
  const btn = document.getElementById('submit-btn');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (errorBox) errorBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري التحقق...';
    btn.disabled = true;
  }

  try {
    const response = await ApiClient.post('/Auth/login', { email, password });

    const isUnverified = 
      response.data?.isVerified === false ||
      response.data?.requiresVerification === true ||
      response.data?.status === 'PendingVerification' ||
      response.data?.status === 1 ||
      (response.message && (
        response.message.toLowerCase().includes('email verification required') ||
        response.message.toLowerCase().includes('verification required') ||
        response.message.toLowerCase().includes('verif') ||
        response.message.includes('تفعيل') ||
        response.message.includes('تأكيد')
      ));

    if (isUnverified) {
      const previewCode = response.data?.verificationCodePreview || response.data?.previewCode || '';
      if (errorBox) {
        errorBox.innerHTML = 'البريد الإلكتروني بحاجة إلى تأكيد، جاري تحويلك لصفحة التحقق...';
        errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      }
      if (typeof showToast === 'function') {
        showToast({ title: 'التحقق مطلوب', message: 'يرجى تأكيد بريدك الإلكتروني للمتابعة', type: 'warning' });
      }

      const redirectUrl = previewCode 
        ? `verify-account.html?email=${encodeURIComponent(email)}&previewCode=${encodeURIComponent(previewCode)}`
        : `verify-account.html?email=${encodeURIComponent(email)}`;

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
      return;
    }

    const activeToken = response.data?.accessToken || response.data?.token;
    if (response.success && response.data && activeToken) {
      const authPayload = response.data;
      if (!authPayload.accessToken && activeToken) authPayload.accessToken = activeToken;
      localStorage.setItem("token", activeToken);
      localStorage.setItem("accessToken", activeToken);
      localStorage.setItem("userId", authPayload.userId || authPayload.id || "");
      localStorage.setItem("dawwer_access_token", activeToken);
      if (authPayload.refreshToken) {
        localStorage.setItem("refreshToken", authPayload.refreshToken);
        localStorage.setItem("dawwer_refresh_token", authPayload.refreshToken);
      }
      if (authPayload.storeToken) {
        localStorage.setItem("storeToken", authPayload.storeToken);
        localStorage.setItem("store_token", authPayload.storeToken);
        localStorage.setItem("dawwer_store_token", authPayload.storeToken);
      }
      const rawStoreId = authPayload.storeId || authPayload.store_id;
      const storeId = (rawStoreId && String(rawStoreId).trim().toLowerCase() !== 'null' && String(rawStoreId).trim().toLowerCase() !== 'undefined')
        ? String(rawStoreId).trim()
        : null;
      if (storeId) {
        localStorage.setItem("activeStoreId", storeId);
        localStorage.setItem("store_id", storeId);
        localStorage.setItem("storeId", storeId);
        localStorage.setItem("active_store_id", storeId);
        localStorage.setItem("dawwer_active_store_id", storeId);
      } else {
        localStorage.removeItem("activeStoreId");
        localStorage.removeItem("store_id");
        localStorage.removeItem("storeId");
        localStorage.removeItem("active_store_id");
        localStorage.removeItem("dawwer_active_store_id");
      }
      if (authPayload.storeName) {
        localStorage.setItem("storeName", authPayload.storeName);
        localStorage.setItem("store_name", authPayload.storeName);
        localStorage.setItem("dawwer_store_name", authPayload.storeName);
      }
      Auth.saveSession(authPayload);

      // Inspect authenticated user's role (from response body user.role or decoded token claims)
      let role = authPayload.role ?? authPayload.user?.role;
      if (role === undefined || role === null || role === '') {
        try {
          const parts = activeToken.split('.');
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const tokenClaims = JSON.parse(decodeURIComponent(escape(atob(base64))));
            role = tokenClaims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || tokenClaims.role;
          }
        } catch (jwtErr) {}
      }

      const isAdmin = (
        role === 4 ||
        role === '4' ||
        role === 'Admin' ||
        (typeof CONFIG !== 'undefined' && CONFIG.ROLES && (role === CONFIG.ROLES.ADMIN || role === String(CONFIG.ROLES.ADMIN)))
      );

      const isMerchant = (
        role === 2 ||
        role === '2' ||
        role === 'Merchant' ||
        (typeof CONFIG !== 'undefined' && CONFIG.ROLES && (role === CONFIG.ROLES.MERCHANT || role === String(CONFIG.ROLES.MERCHANT)))
      );

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      // Requirement 1: Smart Role-Based Routing
      if (isAdmin) {
        // If role === 4 (or role name === "Admin"): Redirect immediately to "/admin-dashboard.html"
        const adminDashboardUrl = (window.location.protocol === 'file:') ? 'admin-dashboard.html' : '/admin-dashboard.html';
        if (typeof showToast === 'function') {
          showToast({ title: 'تسجيل دخول مسؤول', message: 'مرحباً بك! جاري نقلك إلى لوحة الإدارة المركزية...', type: 'success' });
        }
        window.location.href = adminDashboardUrl;
        return;
      }

      if (isMerchant) {
        if (typeof showToast === 'function') {
          showToast({ title: 'تسجيل دخول تاجر', message: 'جاري تهيئة مساحة عمل المتجر...', type: 'info' });
        }

        let storeSelected = false;
        try {
          // 1. Auto Store Selection on Login:
          // Immediately after successful login for role === 2 (Merchant):
          // Fetch the merchant's store list (GET /api/merchant/stores)
          let stores = [];
          if (typeof ApiClient !== 'undefined') {
            const storesRes = await ApiClient.get('/merchant/stores').catch(() => null);
            if (storesRes && storesRes.success && Array.isArray(storesRes.data)) {
              stores = storesRes.data;
            } else if (Array.isArray(storesRes)) {
              stores = storesRes;
            }
          }

          if (Array.isArray(stores) && stores.length > 0) {
            // Find an approved store (verificationStatus === 5) or first available store
            const selectedStore = stores.find(s => s.verificationStatus === 5 || s.verificationStatus === 'Approved' || s.isActive) || stores[0];
            const storeIdToSelect = selectedStore?.id || selectedStore?.storeId;

            if (storeIdToSelect) {
              // Automatically dispatch POST /api/Auth/select-store with the store's ID
              let selectRes = null;
              if (typeof Auth !== 'undefined' && typeof Auth.selectStore === 'function') {
                selectRes = await Auth.selectStore(storeIdToSelect).catch(() => null);
              } else if (typeof ApiClient !== 'undefined' && ApiClient.auth && typeof ApiClient.auth.selectStore === 'function') {
                selectRes = await ApiClient.auth.selectStore(storeIdToSelect).catch(() => null);
              } else if (typeof ApiClient !== 'undefined') {
                selectRes = await ApiClient.post('/Auth/select-store', { storeId: storeIdToSelect }).catch(() => null);
              }

              // Store the returned storeToken, active_store_id, and store profile data in localStorage
              const selData = selectRes?.data || selectRes || {};
              const resolvedStoreId = selData.storeId || storeIdToSelect;
              const resolvedStoreToken = selData.storeToken || selectedStore.storeToken || null;
              const resolvedStoreName = selData.storeName || selectedStore.name || 'المتجر الحالي';

              localStorage.setItem('active_store_id', resolvedStoreId);
              localStorage.setItem('activeStoreId', resolvedStoreId);
              localStorage.setItem('store_id', resolvedStoreId);
              localStorage.setItem('storeId', resolvedStoreId);
              localStorage.setItem('dawwer_active_store_id', resolvedStoreId);

              if (resolvedStoreToken) {
                localStorage.setItem('storeToken', resolvedStoreToken);
                localStorage.setItem('store_token', resolvedStoreToken);
                localStorage.setItem('dawwer_store_token', resolvedStoreToken);
              }

              if (resolvedStoreName) {
                localStorage.setItem('storeName', resolvedStoreName);
                localStorage.setItem('store_name', resolvedStoreName);
                localStorage.setItem('dawwer_store_name', resolvedStoreName);
              }

              const activeStoreProfile = {
                storeId: resolvedStoreId,
                storeName: resolvedStoreName,
                roleName: selData.roleName || selectedStore.roleName || 'Merchant',
                permissions: selData.permissions || selectedStore.permissions || []
              };
              localStorage.setItem('dawwer_active_store', JSON.stringify(activeStoreProfile));
              if (typeof CONFIG !== 'undefined' && CONFIG.ACTIVE_STORE_KEY) {
                localStorage.setItem(CONFIG.ACTIVE_STORE_KEY, JSON.stringify(activeStoreProfile));
              }

              storeSelected = true;
            }
          }
        } catch (storeErr) {
          console.warn('[Login] Auto store selection error:', storeErr);
        }

        if (storeSelected) {
          if (typeof showToast === 'function') {
            showToast({ title: 'مرحباً بك', message: 'تم تفعيل المتجر، جاري نقلك إلى لوحة التحكم...', type: 'success' });
          }
          // Redirect the merchant directly to the Merchant Dashboard (index.html) bypassing the select-store page entirely.
          const dashboardUrl = (redirect && !redirect.includes('select-store.html') && !redirect.includes('login.html'))
            ? redirect
            : ((window.location.protocol === 'file:') ? 'index.html' : '/index.html');
          window.location.href = dashboardUrl;
          return;
        } else {
          // If no store exists yet, redirect to the store registration page (merchant-application.html)
          if (typeof showToast === 'function') {
            showToast({ title: 'تسجيل المتجر مطلوب', message: 'لم يتم العثور على متجر مسجل. جاري نقلك لتقديم طلب انضمام متجر...', type: 'info' });
          }
          const regUrl = (window.location.protocol === 'file:') ? 'merchant-application.html' : '/merchant-application.html';
          window.location.href = regUrl;
          return;
        }
      }

      // For other roles (Customer): Redirect to the main customer view/marketplace
      const marketplaceUrl = (redirect && !redirect.includes('login.html'))
        ? redirect
        : ((window.location.protocol === 'file:') ? 'index.html' : '/index.html');
      if (typeof showToast === 'function') {
        showToast({ title: 'تسجيل دخول ناجح', message: 'مرحباً بك مجدداً في منصة دوّر', type: 'success' });
      }
      window.location.href = marketplaceUrl;
      return;
    } else {
      throw new Error(response.message || 'بيانات الدخول غير صحيحة.');
    }
  } catch (err) {
    const resData = err.data || (err.response ? err.response.data : null) || err.response;
    const msg = (err.message || '').toLowerCase();

    const isUnverifiedError = 
      (err.message && err.message.toLowerCase().includes('email verification required')) ||
      msg.includes('email verification required') ||
      msg.includes('verification required') ||
      msg.includes('unconfirmed') ||
      msg.includes('not verified') ||
      msg.includes('pendingverification') ||
      msg.includes('pending verification') ||
      msg.includes('غير مفعّل') ||
      msg.includes('تأكيد الحساب') ||
      msg.includes('تفعيل الحساب') ||
      msg.includes('رمز التحقق') ||
      (resData && (
        resData.isVerified === false ||
        resData.requiresVerification === true ||
        resData.status === 'PendingVerification' ||
        resData.status === 1
      ));

    if (isUnverifiedError) {
      const previewCode = (resData && (resData.verificationCodePreview || resData.previewCode)) || '';
      if (errorBox) {
        errorBox.innerHTML = 'البريد الإلكتروني بحاجة إلى تأكيد، جاري تحويلك لصفحة التحقق...';
        errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      }
      if (typeof showToast === 'function') {
        showToast({ title: 'التحقق مطلوب', message: 'يرجى تأكيد بريدك الإلكتروني', type: 'warning' });
      }

      const redirectUrl = previewCode 
        ? `verify-account.html?email=${encodeURIComponent(email)}&previewCode=${encodeURIComponent(previewCode)}`
        : `verify-account.html?email=${encodeURIComponent(email)}`;

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
      return;
    }

    const errorMsg = err.message || 'حدث خطأ أثناء تسجيل الدخول.';
    if (errorBox) {
      errorBox.innerHTML = errorMsg;
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تعذر الدخول', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'تسجيل الدخول';
      btn.disabled = false;
    }
  }
}
