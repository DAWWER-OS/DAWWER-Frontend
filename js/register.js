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
      role: 2
    };

    let data;
    if (window.ApiClient && ApiClient.core) {
      data = await ApiClient.core('/Auth/register', {
        method: 'POST',
        body: payload
      });
    } else {
      const response = await ApiClient.post('/Auth/register', payload, {}, { throwOnError: true });
      data = response?.data || response;
    }

    sessionStorage.setItem('email', email);
    sessionStorage.setItem('dawwer_registered_email', email);

    if (data && data.userId) {
      localStorage.setItem('userId', data.userId);
    }

    const successMsg = 'تم إنشاء الحساب بنجاح! جاري تحويلك لصفحة تفعيل الحساب...';
    if (msgBox) {
      msgBox.textContent = successMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم إنشاء الحساب', message: successMsg, type: 'success' });
    }

    setTimeout(() => {
      window.location.href = `verify-account.html?email=${encodeURIComponent(email)}`;
    }, 1000);
  } catch (err) {
    const errorMsg = (err && (err.message || (Array.isArray(err.errors) ? err.errors.join(' | ') : null))) || 'حدث خطأ أثناء إنشاء الحساب.';
    if (msgBox) {
      msgBox.textContent = errorMsg;
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
