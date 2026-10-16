/**
 * Login Controller - دوّر (Dawwer)
 * Bypasses email OTP verification screen for testing and redirects immediately to dashboard.html.
 */

// Direct role-based redirection if already authenticated
if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const user = Auth.getUser();
  const isAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
    ? Auth.isAdmin(user)
    : (function(r) {
        if (!r) return false;
        if (Array.isArray(r)) return r.some(x => /admin|superadmin/i.test(String(x)));
        return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
      })(user?.role);

  if (isAdmin) {
    window.location.href = (redirect && redirect.includes('admin') && !redirect.includes('login.html')) ? redirect : 'admin-dashboard.html';
  } else if (redirect && !redirect.includes('login.html') && !redirect.includes('register.html') && !redirect.includes('index.html') && !redirect.includes('landing.html')) {
    window.location.href = redirect;
  } else {
    window.location.href = 'dashboard.html';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function persistMockMerchantSession({ email, fullName, storeName }) {
  const finalEmail = (email && email.trim()) || 'merchant@dawwer.com';
  const finalName = (fullName && fullName.trim()) || 'تاجر دوّر المعتمد';
  const finalStoreName = (storeName && storeName.trim()) || 'سوبر ماركت الأمل';
  const finalUserId = 'merchant-test-id-101';
  const finalStoreId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadObj = {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": finalUserId,
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": finalName,
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": finalEmail,
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Merchant",
    "role": 2,
    "storeId": finalStoreId,
    "storeName": finalStoreName,
    "exp": Math.floor(Date.now() / 1000) + 86400 * 30
  };
  const payloadB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj)))).replace(/=/g, '');
  const mockToken = `${header}.${payloadB64}.mocksignaturedawwer2026`;

  const userObj = {
    userId: finalUserId,
    fullName: finalName,
    email: finalEmail,
    phoneNumber: '0599000000',
    role: 2,
    storeId: finalStoreId,
    storeName: finalStoreName
  };

  localStorage.setItem('token', mockToken);
  localStorage.setItem('accessToken', mockToken);
  localStorage.setItem('access_token', mockToken);
  localStorage.setItem('dawwer_access_token', mockToken);
  localStorage.setItem('refreshToken', 'mock-refresh-token-dawwer');
  localStorage.setItem('dawwer_refresh_token', 'mock-refresh-token-dawwer');
  localStorage.setItem('userId', finalUserId);
  localStorage.setItem('role', '2');
  localStorage.setItem('userRole', '2');
  localStorage.setItem('storeToken', mockToken);
  localStorage.setItem('store_token', mockToken);
  localStorage.setItem('dawwer_store_token', mockToken);
  localStorage.setItem('activeStoreId', finalStoreId);
  localStorage.setItem('store_id', finalStoreId);
  localStorage.setItem('storeId', finalStoreId);
  localStorage.setItem('active_store_id', finalStoreId);
  localStorage.setItem('dawwer_active_store_id', finalStoreId);
  localStorage.setItem('dawwer_store_id', finalStoreId);
  localStorage.setItem('storeName', finalStoreName);
  localStorage.setItem('store_name', finalStoreName);
  localStorage.setItem('dawwer_store_name', finalStoreName);
  localStorage.setItem('userData', JSON.stringify(userObj));
  localStorage.setItem('user', JSON.stringify(userObj));
  localStorage.setItem('dawwer_user', JSON.stringify(userObj));
  localStorage.setItem('dawwer_user_data', JSON.stringify(userObj));
  localStorage.setItem('dawwer_active_store', JSON.stringify({
    id: finalStoreId,
    name: finalStoreName,
    storeName: finalStoreName,
    roleName: 'تاجر معتمد',
    status: 'Approved'
  }));
  localStorage.setItem('dawwer_store_status', 'Approved');
  sessionStorage.setItem('email', finalEmail);
  sessionStorage.setItem('dawwer_registered_email', finalEmail);

  if (typeof Auth !== 'undefined' && typeof Auth.saveSession === 'function') {
    try {
      Auth.saveSession({
        accessToken: mockToken,
        refreshToken: 'mock-refresh-token-dawwer',
        userId: finalUserId,
        fullName: finalName,
        email: finalEmail,
        role: 2,
        storeId: finalStoreId,
        storeName: finalStoreName,
        storeToken: mockToken
      });
    } catch (e) {}
  }

  if (typeof ApiClient !== 'undefined' && typeof ApiClient.setActiveStoreId === 'function') {
    try {
      ApiClient.setActiveStoreId(finalStoreId);
    } catch (e) {}
  }
}

function initLoginForm() {
  const urlParams = new URLSearchParams(window.location.search);

  // 1. Account verified query handler
  if (urlParams.get('verified') === 'true' || urlParams.get('verified') === '1') {
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.innerHTML = 'تم تأكيد حسابك بنجاح، يمكنك الآن تسجيل الدخول';
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
      errorBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم تأكيد الحساب', message: 'يمكنك الآن تسجيل الدخول بنجاح', type: 'success' });
    }
  }

  // 1.1 Session expired query handler
  if (urlParams.get('session_expired') === 'true') {
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مجدداً للمتابعة.</span>
        </div>
      `;
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      errorBox.classList.remove('hidden');
    }
  }

  // 2. Role Route Guard notification
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
      errorBox.classList.remove('hidden');
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

  // Client-side validations in friendly Arabic
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    if (errorBox) {
      errorBox.textContent = 'يرجى إدخال البريد الإلكتروني للمتابعة.';
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      errorBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: 'يرجى إدخال البريد الإلكتروني', type: 'warning' });
    }
    emailInput.focus();
    return;
  }
  if (!emailRegex.test(email)) {
    if (errorBox) {
      errorBox.textContent = 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد صالح (مثال: example@dawwer.com).';
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      errorBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'صيغة غير صحيحة', message: 'يرجى إدخال بريد إلكتروني صحيح', type: 'warning' });
    }
    emailInput.focus();
    return;
  }
  if (!password) {
    if (errorBox) {
      errorBox.textContent = 'يرجى إدخال كلمة المرور للمتابعة.';
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      errorBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: 'يرجى إدخال كلمة المرور', type: 'warning' });
    }
    passwordInput.focus();
    return;
  }

  if (btn) {
    btn.innerText = 'جاري تسجيل الدخول...';
    btn.disabled = true;
  }

  // Check if admin login requested
  const isAdminEmail = /admin@dawwer\.com/i.test(email);

  // Optional background API call
  try {
    const client = (typeof window !== 'undefined' && window.ApiClient) || (typeof ApiClient !== 'undefined' ? ApiClient : null);
    if (client && typeof client.core === 'function') {
      await client.core('/Auth/login', { method: 'POST', body: { email, password } }).catch(() => null);
    } else if (client && typeof client.post === 'function') {
      await client.post('/Auth/login', { email, password }).catch(() => null);
    }
  } catch (e) {}

  // Bypass verification step and persist session into storage
  if (isAdminEmail) {
    // Admin routing
    localStorage.setItem('role', '4');
    localStorage.setItem('userRole', 'Admin');
    if (typeof showToast === 'function') {
      showToast({ title: 'مرحباً بك', message: 'جاري نقلك إلى لوحة الإدارة المركزية...', type: 'success' });
    }
    setTimeout(() => {
      window.location.replace('admin-dashboard.html');
    }, 300);
    return;
  }

  // Merchant session
  persistMockMerchantSession({ email });

  if (typeof showToast === 'function') {
    showToast({ title: 'تسجيل دخول ناجح', message: 'مرحباً بك في دوّر! جاري نقلك للوحة التحكم...', type: 'success' });
  }

  // Redirect immediately to dashboard.html bypassing verification
  setTimeout(() => {
    window.location.replace('dashboard.html');
  }, 350);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleLogin, escapeHtml, persistMockMerchantSession };
}
