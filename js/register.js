document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

async function handleRegister(event) {
  event.preventDefault();

  const nameInput = document.getElementById('store-name-input');
  const emailInput = document.getElementById('register-email-input');
  const phoneInput = document.getElementById('register-phone-input');
  const passInput = document.getElementById('register-pass-input');
  const confirmInput = document.getElementById('register-confirm-input');
  const msgBox = document.getElementById('register-msg-box');
  const btn = document.getElementById('register-btn');

  if (!nameInput || !emailInput || !phoneInput || !passInput || !confirmInput) return;

  const fullName = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phoneNumber = phoneInput.value.trim();
  const password = passInput.value;
  const confirmPass = confirmInput.value;

  if (password !== confirmPass) {
    const errorMsg = 'كلمتا المرور غير متطابقتين.';
    if (msgBox) {
      msgBox.innerText = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'خطأ في التطابق', message: errorMsg, type: 'error' });
    }
    return;
  }

  if (msgBox) msgBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري إنشاء الحساب...';
    btn.disabled = true;
  }

  try {
    const payload = {
      fullName,
      email,
      phoneNumber,
      password,
      role: CONFIG.ROLES.MERCHANT
    };

    const response = await ApiClient.post('/Auth/register', payload, {}, { throwOnError: false });

    // Unpack ApiResponse envelope
    if (!response || response.success === false) {
      const errList = Array.isArray(response?.errors) && response.errors.length > 0
        ? response.errors
        : (response?.data?.errors || (response?.message ? [response.message] : ['حدث خطأ أثناء إنشاء الحساب.']));
      const errorMsg = Array.isArray(errList) ? errList.join(' | ') : String(errList);
      throw new Error(errorMsg);
    }

    const data = response.data || {};
    const preview = data.verificationCodePreview || data.previewCode || data.code || response.verificationCodePreview || '';

    sessionStorage.setItem('dawwer_registered_email', email);
    if (data.userId) {
      localStorage.setItem('userId', data.userId);
    }
    const regToken = data.accessToken || data.token;
    if (regToken) {
      localStorage.setItem('token', regToken);
      localStorage.setItem('accessToken', regToken);
      localStorage.setItem('dawwer_access_token', regToken);
    }

    const successMsg = response.message || 'تم إنشاء الحساب بنجاح! جاري تحويلك لصفحة تفعيل الحساب...';
    if (msgBox) {
      msgBox.innerHTML = successMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم إنشاء الحساب', message: successMsg, type: 'success' });
    }

    setTimeout(() => {
      if (preview) {
        window.location.href = `verify-account.html?email=${encodeURIComponent(email)}&previewCode=${encodeURIComponent(preview)}`;
      } else {
        window.location.href = `verify-account.html?email=${encodeURIComponent(email)}`;
      }
    }, 1200);
  } catch (err) {
    const errorMsg = err.message || 'حدث خطأ أثناء إنشاء الحساب.';
    if (msgBox) {
      msgBox.innerHTML = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تعذر إنشاء الحساب', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'إنشاء حساب المتجر';
      btn.disabled = false;
    }
  }
}
