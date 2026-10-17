/**
 * Registration Controller - دوّر (Dawwer)
 * Registers the account and continues to server email verification.
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  initTermsModal();
});


async function handleRegister(event) {
  event.preventDefault();
  if (document.getElementById('submit-btn')?.disabled) return;

  const storeInput = document.getElementById('store-name-input');
  const ownerInput = document.getElementById('owner-name-input');
  const emailInput = document.getElementById('email-input') || document.getElementById('register-email-input');
  const phoneInput = document.getElementById('phone-input') || document.getElementById('register-phone-input');
  const passInput = document.getElementById('password-input') || document.getElementById('register-pass-input');
  const confirmInput = document.getElementById('confirm-password-input') || document.getElementById('register-confirm-input');
  const msgBox = document.getElementById('register-msg-box') || document.getElementById('error-message');
  const btn = document.getElementById('register-btn') || document.getElementById('submit-btn');

  if (!emailInput || !phoneInput || !passInput || !confirmInput) return;

  const storeName = storeInput ? storeInput.value.trim() : '';
  const ownerName = ownerInput ? ownerInput.value.trim() : '';
  const fullName = ownerName || storeName || 'تاجر دوّر';
  const email = emailInput.value.trim();
  const phoneNumber = phoneInput.value.trim();
  const password = passInput.value;
  const confirmPass = confirmInput.value;

  const termsCheckbox = document.getElementById('terms-checkbox') || document.getElementById('terms-box');
  if (termsCheckbox && !termsCheckbox.checked) {
    const errorMsg = 'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.';
    if (msgBox) {
      msgBox.textContent = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      msgBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: errorMsg, type: 'warning' });
    }
    termsCheckbox.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    const errorMsg = 'يرجى إدخال بريد إلكتروني صحيح (مثال: example@dawwer.com).';
    if (msgBox) {
      msgBox.textContent = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      msgBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'صيغة غير صحيحة', message: errorMsg, type: 'warning' });
    }
    emailInput.focus();
    return;
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
    const errorMsg = 'كلمة المرور يجب أن تتكون من 8 خانات على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز.';
    if (msgBox) {
      msgBox.textContent = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold block';
      msgBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'كلمة مرور ضعيفة', message: errorMsg, type: 'warning' });
    }
    passInput.focus();
    return;
  }

  if (password !== confirmPass) {
    const errorMsg = 'كلمتا المرور غير متطابقتين.';
    if (msgBox) {
      msgBox.innerText = errorMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold block';
      msgBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'خطأ في التطابق', message: errorMsg, type: 'error' });
    }
    confirmInput.focus();
    return;
  }

  if (msgBox) msgBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري إعداد حساب المتجر...';
    btn.disabled = true;
  }

  try {
    const payload = {
      fullName,
      storeName: storeName || fullName,
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
    } else if (window.ApiClient && ApiClient.post) {
      const response = await ApiClient.post('/Auth/register', payload, {}, { throwOnError: true });
      data = response?.data || response;
    } else {
      const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : 'https://dawwer.runasp.net/api';
      const response = await fetch(`${baseUrl}/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const resJson = await response.json().catch(() => null);
      if (!response.ok || (resJson && resJson.success === false)) {
        const errorMsg = (resJson && Array.isArray(resJson.errors) && resJson.errors.length)
          ? resJson.errors.join(' | ')
          : (resJson?.message || 'حدث خطأ أثناء إنشاء الحساب.');
        throw new Error(errorMsg);
      }
      data = resJson?.data || resJson;
    }

    sessionStorage.setItem('email', email);
    sessionStorage.setItem('dawwer_registered_email', email);

    if (storeName) {
      localStorage.setItem('storeName', storeName);
      localStorage.setItem('store_name', storeName);
      localStorage.setItem('dawwer_store_name', storeName);
      sessionStorage.setItem('storeName', storeName);
      sessionStorage.setItem('dawwer_store_name', storeName);
    }

    if (phoneNumber) {
      localStorage.setItem('storePhone', phoneNumber);
      localStorage.setItem('store_phone', phoneNumber);
      sessionStorage.setItem('storePhone', phoneNumber);
    }

    if (ownerName) {
      localStorage.setItem('ownerName', ownerName);
      sessionStorage.setItem('ownerName', ownerName);
    }

    if (data && data.userId) {
      localStorage.setItem('userId', data.userId);
    }

    const successMsg = 'تم إنشاء الحساب بنجاح! جاري تحويلك لصفحة تفعيل الحساب...';
    if (msgBox) {
      msgBox.textContent = successMsg;
      msgBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
      msgBox.classList.remove('hidden');
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
      msgBox.classList.remove('hidden');
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

function initTermsModal() {
  const modal = document.getElementById('terms-modal');
  const modalCard = document.getElementById('terms-modal-card');
  const openBtn = document.getElementById('open-terms-modal-btn');
  const closeBtn = document.getElementById('close-terms-modal-btn');
  const acceptBtn = document.getElementById('accept-terms-btn');
  const checkbox = document.getElementById('terms-checkbox') || document.getElementById('terms-box');

  if (!modal) return;
  if (modal._termsModalInit) return;
  modal._termsModalInit = true;

  function openModal() {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    if (modalCard) {
      modalCard.classList.remove('scale-95');
      modalCard.classList.add('scale-100');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
    if (modalCard) {
      modalCard.classList.remove('scale-100');
      modalCard.classList.add('scale-95');
    }
    document.body.style.overflow = '';
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeModal();
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) {
      closeModal();
    }
  });

  window.openTermsModal = openModal;
  window.closeTermsModal = closeModal;
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initTermsModal();
}
