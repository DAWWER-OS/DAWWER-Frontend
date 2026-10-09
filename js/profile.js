/**
 * Profile & Store Settings Management - دوّر
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth();
  }

  // 1. Initialize Tabs & Controls
  initNavigationTabs();
  initCopyStoreId();
  initLogoUpload();
  initOperatingToggle();
  initPasswordStrengthCheck();

  if (typeof initPasswordToggles === 'function') {
    initPasswordToggles();
  }

  // 2. Pre-fill all fields with Instant Cache + Background Fetch
  loadProfileData();

  // 3. Form submission listeners
  const storeForm = document.getElementById('store-info-form');
  if (storeForm) {
    storeForm.addEventListener('submit', handleUpdateStoreInfo);
  }

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleUpdateProfile);
  }

  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handleChangePassword);
  }
});

/**
 * Universal Store & Token Context Helper
 */
function getStoreContext() {
  let storeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  let token = '';

  try {
    storeId = localStorage.getItem('activeStoreId') ||
              localStorage.getItem('storeId') ||
              localStorage.getItem('active_store_id') ||
              '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    token = localStorage.getItem('storeToken') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            '';
  } catch (e) {}

  return { storeId, token };
}

/**
 * Universal Notification Toast Helper
 */
function notify(message, title = 'إعدادات الحساب', type = 'success') {
  if (window.DawwerNotification && typeof window.DawwerNotification.show === 'function') {
    window.DawwerNotification.show({ title, message, type });
  } else if (typeof showToast === 'function') {
    showToast({ title, message, type });
  } else {
    const alertBox = document.getElementById('profile-alert');
    if (alertBox) {
      alertBox.textContent = message;
      alertBox.className = type === 'error'
        ? 'p-4 rounded-2xl text-sm font-bold bg-rose-50 border border-rose-200 text-rose-700 block'
        : 'p-4 rounded-2xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
      setTimeout(() => alertBox.classList.add('hidden'), 4000);
    }
  }
}

/**
 * 1. Initialize Tab Switching
 */
function initNavigationTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update button active states
      tabBtns.forEach(b => {
        b.className = 'tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-white/60 shrink-0';
        const icon = b.querySelector('svg');
        if (icon) icon.classList.remove('text-[#d6a950]');
      });

      btn.className = 'tab-btn flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer bg-[#153f2d] text-white shadow-sm shrink-0';
      const activeIcon = btn.querySelector('svg');
      if (activeIcon) activeIcon.classList.add('text-[#d6a950]');

      // Show target tab panel
      tabContents.forEach(content => content.classList.add('hidden'));
      const targetPanel = document.getElementById(`tab-${targetTab}-content`);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
      }
    });
  });
}

/**
 * 2. 1-Click Copy Store ID
 */
function initCopyStoreId() {
  const copyBtn = document.getElementById('copy-store-id-btn');
  const storeIdText = document.getElementById('hero-store-id-text');
  const copyText = document.getElementById('copy-btn-text');

  if (!copyBtn || !storeIdText) return;

  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const idToCopy = storeIdText.textContent.trim();
    if (!idToCopy || idToCopy === '...') return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(idToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = idToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (copyText) copyText.textContent = 'تم النسخ ✓';
      notify('تم نسخ معرّف المتجر إلى الحافظة بنجاح.', 'نسخ المعرّف', 'success');

      setTimeout(() => {
        if (copyText) copyText.textContent = 'نسخ المعرّف';
      }, 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
      notify('تعذر نسخ المعرّف تلقائياً.', 'تنبيه', 'warning');
    }
  });
}

/**
 * 3. Store Logo Upload & Preview
 */
function initLogoUpload() {
  const logoInput = document.getElementById('store-logo-input');
  const avatarImg = document.getElementById('store-avatar-img');

  if (!logoInput || !avatarImg) return;

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG).', 'تنسيق غير مدعوم', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      avatarImg.src = dataUrl;

      // Save locally
      localStorage.setItem('dawwer_store_logo', dataUrl);
      localStorage.setItem('storeLogo', dataUrl);

      // Also sync layout avatar if present
      const headerAvatar = document.querySelector('#user-menu-btn img, #user-avatar');
      if (headerAvatar) headerAvatar.src = dataUrl;

      notify('تم تحديث شعار المتجر بنجاح!', 'شعار المتجر', 'success');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 4. Operating Status Toggle Switch
 */
function updateStoreStatusUI(isOpen) {
  const statusLabel = document.getElementById('store-status-label') || document.getElementById('operating-status-text');
  const statusDesc = document.getElementById('store-status-desc');
  const statusIndicator = document.getElementById('store-status-indicator') || document.getElementById('operating-status-indicator');
  const topBadge = document.getElementById('top-store-status-badge') || document.getElementById('hero-operating-badge');

  if (isOpen) {
    if (statusLabel) statusLabel.textContent = 'استقبال الطلبات (مفتوح الآن)';
    if (statusDesc) statusDesc.textContent = 'المتجر متاح لاستقبال الطلبات ومعالجة المبيعات.';
    if (statusIndicator) statusIndicator.className = 'w-3 h-3 rounded-full bg-emerald-500 animate-pulse';
    if (topBadge) {
      topBadge.textContent = 'استقبال الطلبات نشط';
      topBadge.className = 'px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-full';
    }
  } else {
    if (statusLabel) statusLabel.textContent = 'المتجر مغلق مؤقتاً';
    if (statusDesc) statusDesc.textContent = 'المتجر معطل مؤقتاً ولن يستقبل أي طلبات جديدة حتى إعادة الفتح.';
    if (statusIndicator) statusIndicator.className = 'w-3 h-3 rounded-full bg-rose-500';
    if (topBadge) {
      topBadge.textContent = 'المتجر مغلق مؤقتاً';
      topBadge.className = 'px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 rounded-full';
    }
  }
}

function initOperatingToggle() {
  const toggleInput = document.getElementById('store-is-open-toggle') || document.getElementById('store-operating-toggle');
  if (!toggleInput) return;

  toggleInput.addEventListener('change', async (e) => {
    const isOpen = e.target.checked;
    updateStoreStatusUI(isOpen);
    localStorage.setItem('storeOperatingStatus', isOpen ? 'open' : 'closed');

    // Save to backend API & localStorage
    const { storeId, token } = getStoreContext();
    try {
      await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_open: isOpen })
      });
      notify(isOpen ? 'تم فتح المتجر لاستقبال الطلبات' : 'تم إغلاق المتجر مؤقتاً', 'حالة تشغيل المتجر', 'info');
    } catch (err) {
      console.error('Failed to update store open state:', err);
    }
  });
}

/**
 * 5. Password Strength Live Checklist
 */
function initPasswordStrengthCheck() {
  const newPassInput = document.getElementById('new-pass-input');
  if (!newPassInput) return;

  const reqLength = document.getElementById('req-length');
  const reqNumber = document.getElementById('req-number');
  const reqSpecial = document.getElementById('req-special');

  const updateRequirement = (el, valid) => {
    if (!el) return;
    const icon = el.querySelector('.req-icon');
    if (valid) {
      el.className = 'flex items-center gap-2 text-emerald-700 font-bold transition-colors';
      if (icon) {
        icon.className = 'req-icon w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold';
        icon.textContent = '✓';
      }
    } else {
      el.className = 'flex items-center gap-2 text-slate-500 font-normal transition-colors';
      if (icon) {
        icon.className = 'req-icon w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold';
        icon.textContent = '✕';
      }
    }
  };

  newPassInput.addEventListener('input', () => {
    const val = newPassInput.value || '';
    updateRequirement(reqLength, val.length >= 8);
    updateRequirement(reqNumber, /\d/.test(val));
    updateRequirement(reqSpecial, /[^A-Za-z0-9]/.test(val) || /[A-Z]/.test(val));
  });
}

/**
 * Helper: Populate All Form Fields & Hero UI from Data Object
 */
function populateForm(data) {
  if (!data) return;

  // 1. Store Title & Store Name Input
  const storeName = data.name || data.storeName || data.store_name || data.title;
  if (storeName) {
    const heroStoreTitle = document.getElementById('hero-store-title');
    if (heroStoreTitle) heroStoreTitle.textContent = storeName;
    const storeNameInput = document.getElementById('store-name-input');
    if (storeNameInput) {
      storeNameInput.value = storeName;
      storeNameInput.placeholder = 'اسم المتجر التجاري';
    }
  }

  // 2. Store ID
  const storeId = data.id || data.storeId || data.store_id;
  if (storeId) {
    const heroStoreIdText = document.getElementById('hero-store-id-text');
    if (heroStoreIdText) heroStoreIdText.textContent = storeId;
  }

  // 3. City
  const city = data.city || data.storeCity || '';
  const storeCityInput = document.getElementById('store-city-input');
  if (storeCityInput) {
    if (city) storeCityInput.value = city;
    storeCityInput.placeholder = 'مثال: الرياض';
  }

  // 4. District / Address
  const district = data.address || data.district || data.storeDistrict || data.storeAddress || '';
  const storeDistrictInput = document.getElementById('store-district-input');
  if (storeDistrictInput) {
    if (district) storeDistrictInput.value = district;
    storeDistrictInput.placeholder = 'مثال: حي النرجس، طريق أنس بن مالك';
  }

  // 5. Operating Status
  const toggleInput = document.getElementById('store-is-open-toggle') || document.getElementById('store-operating-toggle');
  let isOpen = true;
  if (data.is_open !== undefined) {
    isOpen = Boolean(data.is_open);
  } else if (data.is_active !== undefined) {
    isOpen = Boolean(data.is_active);
  } else if (data.operating_status !== undefined || data.storeOperatingStatus !== undefined) {
    isOpen = (data.operating_status === 'open' || data.storeOperatingStatus !== 'closed');
  } else {
    isOpen = (localStorage.getItem('storeOperatingStatus') !== 'closed');
  }

  if (toggleInput) {
    toggleInput.checked = isOpen;
  }
  updateStoreStatusUI(isOpen);

  // 6. Store Logo
  const logo = data.logo_url || data.logo || data.storeLogo || data.dawwer_store_logo;
  if (logo) {
    const avatarImg = document.getElementById('store-avatar-img');
    if (avatarImg) avatarImg.src = logo;
  }

  // 7. Manager Name
  const fullName = data.fullName || data.name || data.manager_name || data.managerName;
  if (fullName) {
    const heroManagerName = document.getElementById('hero-manager-name');
    if (heroManagerName) heroManagerName.textContent = fullName;
    const nameInput = document.getElementById('full-name-input');
    if (nameInput) {
      nameInput.value = fullName;
      nameInput.placeholder = 'مثال: أحمد علي';
    }
  }

  // 8. Official Email
  const email = data.email || data.official_email || data.manager_email;
  if (email) {
    const heroManagerEmail = document.getElementById('hero-manager-email');
    if (heroManagerEmail) heroManagerEmail.textContent = email;
    const emailInput = document.getElementById('profile-email-input');
    if (emailInput) {
      emailInput.value = email;
      emailInput.placeholder = 'name@example.com';
    }
  }

  // 9. Phone Number
  const phone = data.phoneNumber || data.phone || data.mobile;
  const phoneInput = document.getElementById('profile-phone-input');
  if (phoneInput) {
    if (phone) phoneInput.value = phone;
    phoneInput.placeholder = '+966500000000';
  }
}

/**
 * 6. Instant Cache Pre-fill + Background Fetch
 */
async function loadProfileData() {
  const formContainer = document.getElementById('profile-form-container');

  // Step A: Immediate fill from cache if available
  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem('dawwer_store_profile') || 'null');
  } catch (e) {}

  // Fallback to individual cache keys if dawwer_store_profile is not set yet
  if (!cached) {
    const storeName = localStorage.getItem('storeName') ||
                      localStorage.getItem('store_name') ||
                      localStorage.getItem('dawwer_store_name') ||
                      (typeof DawwerLayout !== 'undefined' && typeof DawwerLayout.getStoredStoreName === 'function' ? DawwerLayout.getStoredStoreName() : null);
    const storeId = localStorage.getItem('activeStoreId') || localStorage.getItem('storeId');
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('user') || 'null');
    } catch (e) {}

    if (storeName || storeId || user) {
      cached = {
        name: storeName,
        id: storeId,
        city: localStorage.getItem('storeCity'),
        district: localStorage.getItem('storeDistrict') || localStorage.getItem('storeAddress'),
        is_active: localStorage.getItem('storeOperatingStatus') !== 'closed',
        logo: localStorage.getItem('dawwer_store_logo') || localStorage.getItem('storeLogo'),
        fullName: user?.fullName || user?.name,
        email: user?.email,
        phone: user?.phoneNumber || user?.phone
      };
    }
  }

  if (cached && (cached.name || cached.fullName || cached.email || cached.id)) {
    populateForm(cached);
    if (formContainer) {
      formContainer.classList.remove('animate-pulse', 'pointer-events-none', 'opacity-60');
      formContainer.classList.add('opacity-100');
    }
  } else {
    if (formContainer) {
      formContainer.classList.add('animate-pulse', 'pointer-events-none', 'opacity-60');
    }
  }

  // Step B: Fetch latest from API
  try {
    const { storeId, token } = getStoreContext();
    const headers = {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // 1. Fetch store info from FastAPI
    let freshStore = null;
    if (storeId && typeof FASTAPI_BASE_URL !== 'undefined') {
      try {
        const res = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          freshStore = data?.data || data;
        }
      } catch (e) {
        console.warn('[Profile] FastAPI store fetch note:', e);
      }
    }

    // 2. Fetch user / manager info from Core/Auth API
    let freshUser = null;
    try {
      if (window.ApiClient && ApiClient.core) {
        freshUser = await ApiClient.core('/Profile', { method: 'GET' });
      } else if (window.ApiClient && ApiClient.get) {
        const uRes = await ApiClient.get('/Profile');
        freshUser = uRes?.data || uRes;
      }
    } catch (e) {}

    if (freshStore || freshUser) {
      const mergedData = {
        ...(cached || {}),
        ...(freshStore || {}),
        name: freshStore?.name || cached?.name,
        id: freshStore?.id || cached?.id || storeId,
        city: freshStore?.city || cached?.city,
        address: freshStore?.address || cached?.address,
        district: freshStore?.address || cached?.district,
        is_active: freshStore?.is_active !== undefined ? freshStore.is_active : cached?.is_active,
        fullName: freshUser?.fullName || freshUser?.name || freshStore?.manager_name || cached?.fullName,
        email: freshUser?.email || freshStore?.email || cached?.email,
        phone: freshUser?.phoneNumber || freshUser?.phone || freshStore?.phone || cached?.phone
      };

      localStorage.setItem('dawwer_store_profile', JSON.stringify(mergedData));
      if (mergedData.name) {
        localStorage.setItem('storeName', mergedData.name);
        localStorage.setItem('store_name', mergedData.name);
      }
      if (freshUser) {
        localStorage.setItem('userData', JSON.stringify(freshUser));
        localStorage.setItem('user', JSON.stringify(freshUser));
      }

      populateForm(mergedData);
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
  } finally {
    if (formContainer) {
      formContainer.classList.remove('animate-pulse', 'pointer-events-none', 'opacity-60');
      formContainer.classList.add('opacity-100');
    }
  }
}

const loadUserProfile = loadProfileData;

/**
 * 7. Form Handler: Update Store Info
 */
async function handleUpdateStoreInfo(event) {
  event.preventDefault();

  const btn = document.getElementById('save-store-btn');
  const spinner = document.getElementById('save-store-spinner');
  const btnText = document.getElementById('save-store-text');

  const storeName = document.getElementById('store-name-input')?.value.trim() || '';
  const city = document.getElementById('store-city-input')?.value.trim() || '';
  const district = document.getElementById('store-district-input')?.value.trim() || '';
  const isOpen = document.getElementById('store-operating-toggle')?.checked !== false;

  if (!storeName) {
    notify('يرجى كتابة اسم المتجر التجاري.', 'حقل مطلوب', 'warning');
    return;
  }

  if (btn) btn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');
  if (btnText) btnText.textContent = 'جاري الحفظ...';

  try {
    // 1. Save locally
    localStorage.setItem('storeName', storeName);
    localStorage.setItem('store_name', storeName);
    localStorage.setItem('dawwer_store_name', storeName);
    localStorage.setItem('storeCity', city);
    localStorage.setItem('storeDistrict', district);
    localStorage.setItem('storeAddress', `${city} - ${district}`.trim());
    localStorage.setItem('storeOperatingStatus', isOpen ? 'open' : 'closed');

    // Update merged profile cache
    try {
      const p = JSON.parse(localStorage.getItem('dawwer_store_profile') || '{}');
      p.name = storeName;
      p.city = city;
      p.address = district;
      p.district = district;
      p.is_active = isOpen;
      localStorage.setItem('dawwer_store_profile', JSON.stringify(p));
    } catch (e) {}

    // 2. Update Hero and Layout titles
    const heroStoreTitle = document.getElementById('hero-store-title');
    if (heroStoreTitle) heroStoreTitle.textContent = storeName;

    if (typeof DawwerLayout !== 'undefined' && typeof DawwerLayout.updateStoreIdentity === 'function') {
      DawwerLayout.updateStoreIdentity(storeName);
    }

    // 3. Backend Call to sync store data
    const { storeId, token } = getStoreContext();
    if (storeId && typeof FASTAPI_BASE_URL !== 'undefined') {
      try {
        await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: storeName,
            city,
            address: district,
            is_active: isOpen
          })
        });
      } catch (backendErr) {
        console.warn('[Profile] Backend store patch note:', backendErr);
      }
    }

    notify('تم حفظ وتحديث بيانات المتجر بنجاح!', 'تم الحفظ', 'success');
  } catch (err) {
    console.error('Save store info error:', err);
    notify('حدث خطأ أثناء حفظ بيانات المتجر.', 'خطأ', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'حفظ بيانات المتجر';
  }
}

/**
 * 8. Form Handler: Update Profile / Contact Info
 */
async function handleUpdateProfile(event) {
  event.preventDefault();

  const btn = document.getElementById('save-profile-btn');
  const spinner = document.getElementById('save-profile-spinner');
  const btnText = document.getElementById('save-profile-text');

  const fullName = document.getElementById('full-name-input')?.value.trim() || '';
  const email = document.getElementById('profile-email-input')?.value.trim() || '';
  const phoneNumber = document.getElementById('profile-phone-input')?.value.trim() || '';

  if (!fullName || !email) {
    notify('الاسم الكامل والبريد الإلكتروني حقول مطلوبة.', 'تنبيه', 'warning');
    return;
  }

  if (btn) btn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');
  if (btnText) btnText.textContent = 'جاري التحديث...';

  try {
    const payload = { fullName, email, phoneNumber };

    if (window.ApiClient && ApiClient.core) {
      await ApiClient.core('/Profile', {
        method: 'PUT',
        body: payload
      });
    } else if (window.ApiClient && ApiClient.put) {
      await ApiClient.put('/Profile', payload);
    }

    // Sync localStorage user object
    let user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : {};
    user.fullName = fullName;
    user.name = fullName;
    user.email = email;
    user.phoneNumber = phoneNumber;
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    // Update merged profile cache
    try {
      const p = JSON.parse(localStorage.getItem('dawwer_store_profile') || '{}');
      p.fullName = fullName;
      p.email = email;
      p.phone = phoneNumber;
      localStorage.setItem('dawwer_store_profile', JSON.stringify(p));
    } catch (e) {}

    // Update Hero subtitle
    const heroManagerName = document.getElementById('hero-manager-name');
    const heroManagerEmail = document.getElementById('hero-manager-email');
    if (heroManagerName) heroManagerName.textContent = fullName;
    if (heroManagerEmail) heroManagerEmail.textContent = email;

    if (typeof initLayout === 'function') {
      initLayout();
    }

    notify('تم تحديث بيانات التواصل والملف الشخصي بنجاح!', 'تم التحديث', 'success');
  } catch (err) {
    console.error('Profile update error:', err);
    const msg = (err && (err.message || (Array.isArray(err.errors) ? err.errors.join(' | ') : null))) || 'حدث خطأ أثناء تحديث الملف الشخصي.';
    notify(msg, 'خطأ', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'تحديث بيانات التواصل';
  }
}

/**
 * 9. Form Handler: Change Password
 */
async function handleChangePassword(event) {
  event.preventDefault();

  const btn = document.getElementById('save-pass-btn');
  const spinner = document.getElementById('save-pass-spinner');
  const btnText = document.getElementById('save-pass-text');

  const currentPassword = document.getElementById('current-pass-input')?.value || '';
  const newPassword = document.getElementById('new-pass-input')?.value || '';
  const confirmPassword = document.getElementById('confirm-pass-input')?.value || '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    notify('يرجى ملء جميع حقول كلمات المرور.', 'تنبيه', 'warning');
    return;
  }

  if (newPassword.length < 8) {
    notify('يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.', 'كلمة مرور ضعيفة', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    notify('كلمة المرور الجديدة وتأكيدها غير متطابقين.', 'عدم تطابق', 'warning');
    return;
  }

  if (btn) btn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');
  if (btnText) btnText.textContent = 'جاري التحديث...';

  try {
    const payload = { currentPassword, newPassword, confirmPassword };

    if (window.ApiClient && ApiClient.core) {
      await ApiClient.core('/Profile/change-password', {
        method: 'POST',
        body: payload
      });
    } else if (window.ApiClient && ApiClient.post) {
      await ApiClient.post('/Profile/change-password', payload);
    }

    // Reset fields on success
    const currentPassEl = document.getElementById('current-pass-input');
    const newPassEl = document.getElementById('new-pass-input');
    const confirmPassEl = document.getElementById('confirm-pass-input');
    if (currentPassEl) currentPassEl.value = '';
    if (newPassEl) newPassEl.value = '';
    if (confirmPassEl) confirmPassEl.value = '';

    // Reset strength icons
    const reqLength = document.getElementById('req-length');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    [reqLength, reqNumber, reqSpecial].forEach(el => {
      if (el) {
        el.className = 'flex items-center gap-2 text-slate-500 font-normal transition-colors';
        const icon = el.querySelector('.req-icon');
        if (icon) {
          icon.className = 'req-icon w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold';
          icon.textContent = '✕';
        }
      }
    });

    notify('تم تغيير كلمة المرور بنجاح! تم تأمين الحساب.', 'تم تغيير كلمة المرور', 'success');
  } catch (err) {
    console.error('Password change error:', err);
    const msg = (err && (err.message || (Array.isArray(err.errors) ? err.errors.join(' | ') : null))) || 'فشل تغيير كلمة المرور.';
    notify(msg, 'خطأ', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'تحديث كلمة المرور';
  }
}

window.loadProfileData = loadProfileData;
window.populateForm = populateForm;
window.getStoreContext = getStoreContext;
