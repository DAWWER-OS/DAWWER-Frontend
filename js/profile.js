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
    let userData;
    if (window.ApiClient && ApiClient.core) {
      userData = await ApiClient.core('/Profile', { method: 'GET' });
    } else {
      const res = await ApiClient.get('/Profile');
      userData = res?.data || res;
    }

    if (userData) {
      const nameInput = document.getElementById('full-name-input');
      const emailInput = document.getElementById('profile-email-input');
      const phoneInput = document.getElementById('profile-phone-input');
      if (nameInput) nameInput.value = userData.fullName || userData.name || '';
      if (emailInput) emailInput.value = userData.email || '';
      if (phoneInput) phoneInput.value = userData.phoneNumber || userData.phone || '';

      const storeIdInput = document.getElementById('profile-store-id-input');
      const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
        ? Auth.isAdmin()
        : (function() {
            const r = localStorage.getItem('userRole') || localStorage.getItem('role') || userData.role;
            return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
          })();

      if (storeIdInput) {
        if (isSuperAdmin) {
          storeIdInput.value = 'غير مطلوب (إدارة المنصة المركزية - Super Admin)';
          storeIdInput.readOnly = true;
          storeIdInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
        } else {
          const activeStoreId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId) ? ApiClient.getActiveStoreId() : null;
          storeIdInput.value = activeStoreId || userData.storeId || '';
        }
      }
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
    const payload = {
      fullName: document.getElementById('full-name-input')?.value.trim() || '',
      email: document.getElementById('profile-email-input')?.value.trim() || '',
      phoneNumber: document.getElementById('profile-phone-input')?.value.trim() || ''
    };

    let res;
    if (window.ApiClient && ApiClient.core) {
      res = await ApiClient.core('/Profile', {
        method: 'PUT',
        body: payload
      });
    } else {
      res = await ApiClient.put('/Profile', payload);
    }
    const successMsg = 'تم حفظ بيانات الملف الشخصي بنجاح.';

    if (alertBox) {
      alertBox.textContent = successMsg;
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
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      if (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
      }
    }
    if (typeof initLayout === 'function') {
      initLayout();
    }
  } catch (err) {
    const errMsg = (err && (err.message || (Array.isArray(err.errors) ? err.errors.join(' | ') : null))) || 'حدث خطأ أثناء تحديث الملف الشخصي.';
    if (alertBox) {
      alertBox.textContent = errMsg;
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
    const currentPassword = document.getElementById('current-pass-input')?.value || '';
    const newPassword = document.getElementById('new-pass-input')?.value || '';
    const confirmPassword = document.getElementById('confirm-pass-input')?.value || newPassword;

    if (newPassword !== confirmPassword) {
      throw new Error('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
    }

    const payload = {
      currentPassword,
      newPassword,
      confirmPassword
    };

    if (window.ApiClient && ApiClient.core) {
      await ApiClient.core('/Profile/change-password', {
        method: 'POST',
        body: payload
      });
    } else {
      await ApiClient.post('/Profile/change-password', payload);
    }

    // Reset fields upon 200 OK
    const currentPassEl = document.getElementById('current-pass-input');
    const newPassEl = document.getElementById('new-pass-input');
    const confirmPassEl = document.getElementById('confirm-pass-input');
    if (currentPassEl) currentPassEl.value = '';
    if (newPassEl) newPassEl.value = '';
    if (confirmPassEl) confirmPassEl.value = '';

    const msg = 'تم تغيير كلمة المرور بنجاح! تم إنهاء الجلسات النشطة لضمان الأمان.';
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.className = 'mb-6 p-4 rounded-2xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (window.showToast) {
      window.showToast({
        title: 'تم تغيير كلمة المرور',
        message: msg,
        type: 'success'
      });
    }
  } catch (err) {
    const errMsg = (err && (err.message || (Array.isArray(err.errors) ? err.errors.join(' | ') : null))) || 'فشل تغيير كلمة المرور.';
    if (alertBox) {
      alertBox.textContent = errMsg;
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
      btn.innerText = 'تغيير كلمة المرور';
      btn.disabled = false;
    }
  }
}
