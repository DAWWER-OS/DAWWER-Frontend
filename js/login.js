/**
 * Login Controller - دوّر (Dawwer)
 * Uses the server session and server verification status.
 */

// An existing session may need a refresh before choosing a destination.
(async () => {
  if (!Auth.isAuthenticated()) return;
  try {
    if (!ApiClient.getAuthToken(false) && !await ApiClient.refreshAuthToken()) return;
    window.location.replace(Auth.getLoginDestination(new URLSearchParams(window.location.search).get('redirect')));
  } catch (err) { /* Keep login available when the authentication service is unavailable. */ }
})();

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

  if (!emailInput || !passwordInput || btn?.disabled) return;

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

  try {
    const data = await ApiClient.auth.login({ email, password });
    if (data?.requiresVerification) {
      sessionStorage.setItem('dawwer_registered_email', email);
      window.location.replace(`verify-account.html?email=${encodeURIComponent(email)}`);
      return;
    }
    if (!data?.accessToken) throw new Error('لم يُرجع الخادم جلسة دخول صالحة.');
    Auth.clearLocalSession();
    Auth.saveSession(data);
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.replace(Auth.getLoginDestination(redirect));
  } catch (err) {
    const message = err.message || 'تعذر تسجيل الدخول. يرجى المحاولة مجدداً.';
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') showToast({ title: 'تعذر تسجيل الدخول', message, type: 'error' });
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'تسجيل الدخول'; }
  }
}
