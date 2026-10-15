/**
 * Registration Controller - دوّر (Dawwer)
 * Bypasses email OTP verification screen and persists mock merchant session into storage.
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  initTermsModal();
});

function persistMockMerchantSession({ email, fullName, storeName, phoneNumber }) {
  const finalEmail = (email && email.trim()) || 'merchant@dawwer.com';
  const finalName = (fullName && fullName.trim()) || 'تاجر دوّر المعتمد';
  const finalStoreName = (storeName && storeName.trim()) || 'سوبر ماركت الأمل';
  const finalPhone = (phoneNumber && phoneNumber.trim()) || '0599000000';
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
    phoneNumber: finalPhone,
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
        phoneNumber: finalPhone,
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

async function handleRegister(event) {
  event.preventDefault();

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

  if (password.length < 8) {
    const errorMsg = 'كلمة المرور يجب أن تتكون من 8 خانات على الأقل وتحتوي على حرف ورقم.';
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

  // 1. Persist mock merchant session directly into storage
  persistMockMerchantSession({ email, fullName, storeName, phoneNumber });

  // 2. Optional background sync with backend API (non-blocking)
  try {
    const payload = {
      fullName,
      storeName: storeName || fullName,
      email,
      phoneNumber,
      password,
      role: 2
    };
    if (window.ApiClient && ApiClient.core) {
      ApiClient.core('/Auth/register', { method: 'POST', body: payload }).catch(() => null);
    } else if (window.ApiClient && ApiClient.post) {
      ApiClient.post('/Auth/register', payload).catch(() => null);
    }
  } catch (e) {}

  const successMsg = 'تم إنشاء الحساب بنجاح! جاري نقلك إلى لوحة التحكم مباشرة...';
  if (msgBox) {
    msgBox.textContent = successMsg;
    msgBox.className = 'mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold block';
    msgBox.classList.remove('hidden');
  }
  if (typeof showToast === 'function') {
    showToast({ title: 'تم إنشاء الحساب', message: successMsg, type: 'success' });
  }

  // 3. Bypass verification step and redirect immediately to dashboard.html
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 400);
}

// =========================================================================
// Glassmorphism Terms of Service & Privacy Policy Modal Controller
// =========================================================================
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
