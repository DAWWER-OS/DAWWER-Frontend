// Direct role-based redirection if already authenticated
if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const user = Auth.getUser();
  if (redirect && !redirect.includes('login.html')) {
    window.location.href = redirect;
  } else if (user && (user.role === 'Admin' || user.role === 4 || user.role === '4')) {
    window.location.href = 'admin-dashboard.html';
  } else if (!localStorage.getItem('activeStoreId') && !localStorage.getItem('storeToken')) {
    window.location.href = 'select-store.html';
  } else if (user && (user.role === 'Merchant' || user.role === 2 || user.role === '2')) {
    window.location.href = 'dashboard.html';
  } else {
    window.location.href = 'index.html';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initLoginForm() {
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
          <span>${escapeHtml(warningMsg)}</span>
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginForm);
} else {
  initLoginForm();
}

async function handleLogin(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const errorBox = document.getElementById('error-message');
  const btn = document.getElementById('submit-btn');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.innerHTML = '';
  }
  if (btn) {
    btn.innerText = 'جاري التحقق...';
    btn.disabled = true;
  }

  try {
    // 1. Submit form to POST /api/Auth/login
    let authPayload;
    const client = (typeof window !== 'undefined' && window.ApiClient) || (typeof ApiClient !== 'undefined' ? ApiClient : null);

    if (client && typeof client.core === 'function') {
      authPayload = await client.core('/Auth/login', {
        method: 'POST',
        body: { email, password }
      });
    } else if (client && typeof client.post === 'function') {
      const response = await client.post('/Auth/login', { email, password }, {}, { throwOnError: true });
      authPayload = response.data || response;
    } else {
      // Failsafe direct native fetch fallback
      const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL
        : 'https://dawwer.runasp.net/api';
      const apiUrl = `${baseUrl.replace(/\/+$/, '')}/Auth/login`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ email, password })
      });

      const resJson = await response.json().catch(() => null);
      if (!response.ok || (resJson && resJson.success === false)) {
        const errorMsg = (resJson && Array.isArray(resJson.errors) && resJson.errors.length)
          ? resJson.errors.join(' | ')
          : (resJson?.message || 'بيانات الدخول غير صحيحة.');
        const err = new Error(errorMsg);
        err.data = resJson?.data || resJson;
        err.response = { data: resJson };
        throw err;
      }

      authPayload = resJson?.data || resJson;
    }

    const isUnverified = 
      authPayload?.isVerified === false ||
      authPayload?.requiresVerification === true ||
      authPayload?.status === 'PendingVerification' ||
      authPayload?.status === 1;

    if (isUnverified) {
      sessionStorage.setItem('email', email);
      sessionStorage.setItem('dawwer_registered_email', email);
      if (errorBox) {
        errorBox.textContent = 'البريد الإلكتروني بحاجة إلى تأكيد، جاري تحويلك لصفحة التحقق...';
        errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
        errorBox.classList.remove('hidden');
      }
      if (typeof showToast === 'function') {
        showToast({ title: 'التحقق مطلوب', message: 'يرجى تأكيد بريدك الإلكتروني للمتابعة', type: 'warning' });
      }

      setTimeout(() => {
        window.location.href = `verify-account.html?email=${encodeURIComponent(email)}`;
      }, 1000);
      return;
    }

    const activeToken = authPayload?.accessToken || authPayload?.token;

    if (authPayload && activeToken) {
      // 2. Save accessToken, refreshToken, and userData in localStorage
      localStorage.setItem('accessToken', activeToken);
      localStorage.setItem('token', activeToken);
      localStorage.setItem('dawwer_access_token', activeToken);
      if (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY) {
        localStorage.setItem(CONFIG.TOKEN_KEY, activeToken);
      }

      if (authPayload.refreshToken) {
        localStorage.setItem('refreshToken', authPayload.refreshToken);
        localStorage.setItem('refresh_token', authPayload.refreshToken);
        localStorage.setItem('dawwer_refresh_token', authPayload.refreshToken);
        if (typeof CONFIG !== 'undefined' && CONFIG.REFRESH_TOKEN_KEY) {
          localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, authPayload.refreshToken);
        }
      }

      // Safety rule: Do NOT call select-store automatically on login unless storeId is a verified valid GUID
      const rawStoreId = authPayload.storeId || authPayload.store_id;
      const isValidGuid = rawStoreId && typeof rawStoreId === 'string' &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawStoreId.trim()) &&
        rawStoreId.trim() !== '00000000-0000-0000-0000-000000000000';
      const storeId = isValidGuid ? rawStoreId.trim() : null;

      if (storeId) {
        localStorage.setItem('activeStoreId', storeId);
        localStorage.setItem('store_id', storeId);
        localStorage.setItem('storeId', storeId);
      } else {
        localStorage.removeItem('activeStoreId');
        localStorage.removeItem('store_id');
        localStorage.removeItem('storeId');
        localStorage.removeItem('storeToken');
      }

      if (authPayload.storeToken) {
        localStorage.setItem('storeToken', authPayload.storeToken);
        localStorage.setItem('store_token', authPayload.storeToken);
        localStorage.setItem('dawwer_store_token', authPayload.storeToken);
      }

      if (authPayload.storeName) {
        localStorage.setItem('storeName', authPayload.storeName);
        localStorage.setItem('store_name', authPayload.storeName);
        localStorage.setItem('dawwer_store_name', authPayload.storeName);
      }

      let role = authPayload.role ?? authPayload.user?.role ?? authPayload.roles?.[0];
      if (role === undefined || role === null || role === '') {
        try {
          const parts = activeToken.split('.');
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const tokenClaims = JSON.parse(decodeURIComponent(escape(atob(base64))));
            role = tokenClaims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                   tokenClaims['http://schemas.microsoft.com/ws/2008/06/identity/claims/roles'] ||
                   tokenClaims.role ||
                   tokenClaims.roles;
          }
        } catch (jwtErr) {
          console.warn('[Login] Error decoding JWT claims:', jwtErr);
        }
      }

      const userId = authPayload.userId || authPayload.user?.userId || authPayload.user?.id || authPayload.id || '';
      const fullName = authPayload.fullName || authPayload.user?.fullName || authPayload.user?.name || authPayload.name || 'مستخدم دوّر';
      const userObj = {
        userId,
        fullName,
        email: authPayload.email || authPayload.user?.email || email,
        phoneNumber: authPayload.phoneNumber || authPayload.user?.phoneNumber || '',
        role: role ?? 2,
        storeId,
        storeName: authPayload.storeName || authPayload.user?.storeName || null
      };

      if (userId) {
        localStorage.setItem('userId', userId);
      }
      localStorage.setItem('role', String(role ?? ''));
      localStorage.setItem('userRole', String(role ?? ''));
      localStorage.setItem('userData', JSON.stringify(userObj));
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('dawwer_user', JSON.stringify(userObj));
      localStorage.setItem('dawwer_user_data', JSON.stringify(userObj));
      if (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(userObj));
      }

      if (typeof Auth !== 'undefined' && typeof Auth.saveSession === 'function') {
        try {
          Auth.saveSession({ ...authPayload, role, user: userObj });
        } catch (sessionErr) {}
      }

      if (typeof showToast === 'function') {
        showToast({ title: 'تسجيل دخول ناجح', message: 'مرحباً بك في دوّر', type: 'success' });
      }

      // Redirect to select-store.html (or redirect URL if explicitly provided)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || urlParams.get('returnUrl');
      const targetUrl = (redirect && !redirect.includes('login.html') && !redirect.includes('register.html') && !redirect.includes('index.html'))
        ? redirect
        : 'select-store.html';

      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 350);
      return;
    } else {
      throw new Error('بيانات الدخول غير صحيحة.');
    }
  } catch (err) {
    // Catch errors cleanly without referencing undefined helper functions
    const resData = err?.data || (err?.response ? err.response.data : null) || err?.response;
    const msg = (err?.message || '').toLowerCase();

    const isUnverifiedError = 
      (err?.message && err.message.toLowerCase().includes('email verification required')) ||
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
        errorBox.classList.remove('hidden');
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

    const errorMsg = (err && err.message) || (typeof err === 'string' ? err : 'حدث خطأ أثناء تسجيل الدخول.');
    if (errorBox) {
      errorBox.textContent = errorMsg;
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
      errorBox.classList.remove('hidden');
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleLogin, escapeHtml };
}
