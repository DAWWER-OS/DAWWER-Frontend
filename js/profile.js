document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth();
  }

  loadUserProfile();

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleUpdateProfile);
  }

  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handleChangePassword);
  }
});

async function loadUserProfile() {
  try {
    const res = await ApiClient.get('/Profile');
    const storeIdInput = document.getElementById('profile-store-id-input');
    const activeStoreId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId) ? ApiClient.getActiveStoreId() : null;
    if (storeIdInput) {
      storeIdInput.value = activeStoreId || res?.data?.storeId || '';
    }

    if (res && res.data) {
      const nameInput = document.getElementById('full-name-input');
      const emailInput = document.getElementById('profile-email-input');
      const phoneInput = document.getElementById('profile-phone-input');
      if (nameInput) nameInput.value = res.data.fullName || '';
      if (emailInput) emailInput.value = res.data.email || '';
      if (phoneInput) phoneInput.value = res.data.phoneNumber || '';
    }
  } catch (err) {
    console.error('Profile load error:', err);
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const alertBox = document.getElementById('profile-alert');
  const btn = document.getElementById('save-profile-btn');

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري الحفظ...';
    btn.disabled = true;
  }

  try {
    const rawStoreId = document.getElementById('profile-store-id-input')?.value.trim() || '';
    const cleanStoreId = (rawStoreId && rawStoreId !== '11111111-1111-1111-1111-111111111111') ? rawStoreId : null;

    const payload = {
      fullName: document.getElementById('full-name-input')?.value.trim() || '',
      email: document.getElementById('profile-email-input')?.value.trim() || '',
      phoneNumber: document.getElementById('profile-phone-input')?.value.trim() || '',
      storeId: cleanStoreId
    };

    if (typeof ApiClient !== 'undefined' && ApiClient.setActiveStoreId) {
      ApiClient.setActiveStoreId(cleanStoreId);
    }

    const res = await ApiClient.put('/Profile', payload);
    const successMsg = res?.message || 'تم تحديث الملف الشخصي وبيانات المتجر بنجاح.';

    if (alertBox) {
      alertBox.innerHTML = successMsg;
      alertBox.className = 'mb-6 p-4 rounded-2xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (window.showToast) {
      window.showToast({
        title: 'تم التحديث',
        message: successMsg,
        type: 'success'
      });
    }

    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    if (user) {
      user.fullName = payload.fullName;
      user.email = payload.email;
      user.phoneNumber = payload.phoneNumber;
      user.storeId = cleanStoreId;
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }
    if (typeof initLayout === 'function') {
      initLayout();
    }
  } catch (err) {
    const errMsg = err.message || 'حدث خطأ أثناء تحديث الملف الشخصي.';
    if (alertBox) {
      alertBox.innerHTML = errMsg;
      alertBox.className = 'mb-6 p-4 rounded-2xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = 'حفظ بيانات الملف الشخصي';
      btn.disabled = false;
    }
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const alertBox = document.getElementById('profile-alert');
  const btn = document.getElementById('save-pass-btn');

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري التحديث...';
    btn.disabled = true;
  }

  try {
    const payload = {
      currentPassword: document.getElementById('current-pass-input')?.value || '',
      newPassword: document.getElementById('new-pass-input')?.value || ''
    };

    const res = await ApiClient.post('/Profile/change-password', payload);
    const msg = res?.message || 'تم تغيير كلمة المرور بنجاح! يرجى إعادة تسجيل الدخول.';
    if (alertBox) {
      alertBox.innerHTML = msg;
      alertBox.className = 'mb-6 p-4 rounded-2xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (window.showToast) {
      window.showToast({
        title: 'تم تغيير كلمة المرور',
        message: msg,
        type: 'success'
      });
    }

    setTimeout(() => {
      if (typeof Auth !== 'undefined' && Auth.logout) {
        Auth.logout();
      }
    }, 2000);
  } catch (err) {
    const errMsg = err.message || 'فشل تغيير كلمة المرور.';
    if (alertBox) {
      alertBox.innerHTML = errMsg;
      alertBox.className = 'mb-6 p-4 rounded-2xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: errMsg,
        type: 'error'
      });
    }
    if (btn) {
      btn.innerText = 'تغيير كلمة المرور';
      btn.disabled = false;
    }
  }
}
