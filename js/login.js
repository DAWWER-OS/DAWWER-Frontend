if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const user = Auth.getUser();
  if (redirect && !redirect.includes('login.html')) {
    window.location.href = redirect;
  } else if (user && (user.role === 'Admin' || user.role === 4)) {
    window.location.href = 'admin-dashboard.html';
  } else {
    window.location.href = 'index.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
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
      const storeId = authPayload.storeId || authPayload.store_id;
      if (storeId) {
        localStorage.setItem("store_id", storeId);
        localStorage.setItem("storeId", storeId);
        localStorage.setItem("active_store_id", storeId);
        localStorage.setItem("dawwer_active_store_id", storeId);
      }
      if (authPayload.storeName) {
        localStorage.setItem("storeName", authPayload.storeName);
        localStorage.setItem("store_name", authPayload.storeName);
        localStorage.setItem("dawwer_store_name", authPayload.storeName);
      }
      Auth.saveSession(authPayload);

      if (typeof showToast === 'function') {
        showToast({ title: 'تسجيل دخول ناجح', message: 'مرحباً بك مجدداً في منصة دوّر', type: 'success' });
      }

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      setTimeout(() => {
        if (redirect) {
          window.location.href = redirect;
        } else if (response.data.role === 'Admin' || response.data.role === 4) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 500);
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
