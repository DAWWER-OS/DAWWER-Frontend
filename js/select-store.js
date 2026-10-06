/**
 * DawwerOS - Select Store Workflow
 * Handles listing merchant stores, selection dispatch, and store-token session persistence.
 */

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getStoredAccessToken() {
  if (typeof ApiClient !== 'undefined' && typeof ApiClient.getRawAccessToken === 'function') {
    const raw = ApiClient.getRawAccessToken();
    if (raw) return raw;
  }
  return localStorage.getItem('accessToken') ||
         localStorage.getItem('token') ||
         localStorage.getItem('access_token') ||
         localStorage.getItem('dawwer_access_token') ||
         (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY ? localStorage.getItem(CONFIG.TOKEN_KEY) : null);
}

function getStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === '5' || s === 'approved' || s.includes('معتمد')) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">معتمد</span>`;
  }
  if (s === '2' || s === 'submitted' || s === '3' || s === 'underreview' || s.includes('مراجعة') || s.includes('تقديم')) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">قيد المراجعة</span>`;
  }
  if (s === '4' || s === 'needsinformation' || s.includes('معلومات')) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">بحاجة لمعلومات</span>`;
  }
  if (s === '6' || s === 'rejected' || s.includes('مرفوض')) {
    return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">مرفوض</span>`;
  }
  return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">مسودة</span>`;
}

function showError(message) {
  const errorBox = document.getElementById('error-message');
  if (errorBox) {
    errorBox.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>${escapeHtml(message)}</span>
        </div>
        <button onclick="loadStores()" class="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer">
          إعادة المحاولة
        </button>
      </div>
    `;
    errorBox.classList.remove('hidden');
  }
  if (typeof showToast === 'function') {
    showToast({ title: 'تنبيه', message, type: 'error' });
  }
}

function hideError() {
  const errorBox = document.getElementById('error-message');
  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.innerHTML = '';
  }
}

async function loadStores() {
  hideError();

  // Guard: SuperAdmin / Platform Admin belongs in admin-dashboard.html and has no merchant stores
  const isAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
    ? Auth.isAdmin()
    : (function() {
        const u = (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') ? Auth.getUser() : null;
        const r = u?.role || localStorage.getItem('userRole') || localStorage.getItem('role');
        return r === 4 || r === '4' || /admin|superadmin/i.test(String(r));
      })();

  if (isAdmin) {
    console.info('[SelectStore] Admin/SuperAdmin detected. Redirecting to admin-dashboard.html');
    window.location.replace('admin-dashboard.html');
    return;
  }

  const token = getStoredAccessToken();
  if (!token) {
    console.warn('[SelectStore] No accessToken found in storage. Redirecting to login.html');
    window.location.replace('login.html');
    return;
  }

  // Display user greeting if available
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    try {
      const rawUser = localStorage.getItem('userData') || localStorage.getItem('user') || localStorage.getItem('dawwer_user_data');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const name = u.fullName || u.email || '';
        if (name) {
          greetingEl.textContent = `مرحباً، ${name}`;
        }
      }
    } catch (e) {}
  }

  const grid = document.getElementById('stores-grid');

  try {
    let stores = [];
    const client = (typeof window !== 'undefined' && window.ApiClient) || (typeof ApiClient !== 'undefined' ? ApiClient : null);

    if (client && typeof client.core === 'function') {
      const data = await client.core('/merchant/stores', { method: 'GET' });
      stores = Array.isArray(data) ? data : (data?.items || data?.data || []);
    } else if (client && typeof client.get === 'function') {
      const res = await client.get('/merchant/stores');
      const data = res?.data !== undefined ? res.data : res;
      stores = Array.isArray(data) ? data : (data?.items || []);
    } else {
      const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : 'https://dawwer.runasp.net/api';
      const response = await fetch(`${baseUrl}/merchant/stores`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || (json && json.success === false)) {
        throw new Error(json?.message || `HTTP ${response.status}`);
      }
      const data = json?.data !== undefined ? json.data : json;
      stores = Array.isArray(data) ? data : (data?.items || []);
    }

    // If merchant has 0 stores, redirect immediately to merchant-application.html
    if (!stores || stores.length === 0) {
      console.info('[SelectStore] User has 0 registered stores. Redirecting to merchant-application.html');
      window.location.replace('merchant-application.html');
      return;
    }

    renderStoresList(stores);

  } catch (err) {
    console.error('[SelectStore] Error fetching stores:', err);
    if (grid) {
      grid.innerHTML = '';
    }
    const msg = err && err.message ? err.message : 'تعذر تحميل قائمة المتاجر، يرجى المحاولة مجدداً.';
    showError(msg);
  }
}

function renderStoresList(stores) {
  const grid = document.getElementById('stores-grid');
  if (!grid) return;

  grid.innerHTML = '';

  stores.forEach(store => {
    const storeId = store.id || store.storeId;
    const storeName = store.name || store.storeName || 'متجر غير معنون';
    const city = store.city || '';
    const address = store.address || '';
    const location = [city, address].filter(Boolean).join(' - ') || 'الموقع غير محدد';
    const statusBadge = getStatusBadge(store.verificationStatus ?? store.status);

    const card = document.createElement('div');
    card.className = 'p-5 rounded-2xl border border-slate-200/90 hover:border-[#1c5335] bg-white hover:bg-emerald-50/20 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group active:scale-[0.99] select-none';
    card.setAttribute('data-store-id', storeId);
    card.setAttribute('data-store-name', storeName);

    card.innerHTML = `
      <div class="mb-4">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#edf5f0] text-[#1c5335] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs group-hover:bg-[#1c5335] group-hover:text-white transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 group-hover:text-[#1c5335] transition leading-snug">${escapeHtml(storeName)}</h3>
              <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>${escapeHtml(location)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <div>
          ${statusBadge}
        </div>
        <div class="card-action-icon w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#1c5335] text-slate-400 group-hover:text-white flex items-center justify-center transition">
          <svg class="w-4 h-4 transform group-hover:-translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      </div>
    `;

    card.addEventListener('click', () => handleSelectStore(storeId, storeName, card));
    grid.appendChild(card);
  });
}

async function handleSelectStore(storeId, storeName, cardElement) {
  if (!storeId) return;

  hideError();

  // Disable all cards to prevent multiple clicks
  const allCards = document.querySelectorAll('#stores-grid > div');
  allCards.forEach(c => c.classList.add('pointer-events-none', 'opacity-70'));

  // Show spinner inside card's action icon
  const iconContainer = cardElement.querySelector('.card-action-icon');
  if (iconContainer) {
    iconContainer.classList.add('bg-[#1c5335]', 'text-white');
    iconContainer.innerHTML = `
      <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `;
  }

  try {
    const token = getStoredAccessToken();
    let resData = null;
    const client = (typeof window !== 'undefined' && window.ApiClient) || (typeof ApiClient !== 'undefined' ? ApiClient : null);

    if (client && typeof client.core === 'function') {
      resData = await client.core('/Auth/select-store', {
        method: 'POST',
        body: { storeId }
      });
    } else if (client && typeof client.post === 'function') {
      const res = await client.post('/Auth/select-store', { storeId }, {}, { throwOnError: true });
      resData = res?.data !== undefined ? res.data : res;
    } else {
      const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : 'https://dawwer.runasp.net/api';
      const response = await fetch(`${baseUrl}/Auth/select-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ storeId })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || (json && json.success === false)) {
        throw new Error(json?.message || `HTTP ${response.status}`);
      }
      resData = json?.data !== undefined ? json.data : json;
    }

    // Extract storeToken and permissions
    const selectedStoreId = resData?.storeId || storeId;
    const selectedStoreName = resData?.storeName || storeName;
    const storeToken = resData?.storeToken || resData?.accessToken || resData?.token;
    const permissions = resData?.permissions || [];

    // Save tokens and selected store identity in localStorage
    if (storeToken) {
      localStorage.setItem('storeToken', storeToken);
      localStorage.setItem('store_token', storeToken);
      localStorage.setItem('dawwer_store_token', storeToken);
      if (typeof CONFIG !== 'undefined' && CONFIG.STORE_TOKEN_KEY) {
        localStorage.setItem(CONFIG.STORE_TOKEN_KEY, storeToken);
      }
    }

    if (selectedStoreId) {
      localStorage.setItem('activeStoreId', selectedStoreId);
      localStorage.setItem('storeId', selectedStoreId);
      localStorage.setItem('store_id', selectedStoreId);
      localStorage.setItem('active_store_id', selectedStoreId);
      localStorage.setItem('dawwer_active_store_id', selectedStoreId);
      localStorage.setItem('dawwer_store_id', selectedStoreId);
    }

    if (selectedStoreName) {
      localStorage.setItem('activeStoreName', selectedStoreName);
      localStorage.setItem('storeName', selectedStoreName);
      localStorage.setItem('store_name', selectedStoreName);
      localStorage.setItem('dawwer_store_name', selectedStoreName);
    }

    if (permissions && Array.isArray(permissions)) {
      localStorage.setItem('storePermissions', JSON.stringify(permissions));
    }

    // Update user object in storage with active store context
    try {
      const rawUser = localStorage.getItem('userData') || localStorage.getItem('user') || localStorage.getItem('dawwer_user_data');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        u.storeId = selectedStoreId;
        u.storeName = selectedStoreName;
        localStorage.setItem('userData', JSON.stringify(u));
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('dawwer_user_data', JSON.stringify(u));
      }
    } catch (e) {}

    // Synchronize with ApiClient and Auth if active
    if (client && typeof client.setActiveStoreId === 'function') {
      client.setActiveStoreId(selectedStoreId);
    }

    if (typeof showToast === 'function') {
      showToast({ title: 'تم اختيار المتجر', message: `تم تفعيل ${selectedStoreName} بنجاح`, type: 'success' });
    }

    // Redirect to index.html
    setTimeout(() => {
      window.location.replace('index.html');
    }, 350);

  } catch (err) {
    console.error('[SelectStore] Error in select-store:', err);
    // Restore card states
    allCards.forEach(c => c.classList.remove('pointer-events-none', 'opacity-70'));
    if (iconContainer) {
      iconContainer.classList.remove('bg-[#1c5335]', 'text-white');
      iconContainer.innerHTML = `
        <svg class="w-4 h-4 transform group-hover:-translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      `;
    }
    const msg = err && err.message ? err.message : 'فشل في اختيار المتجر، يرجى المحاولة مجدداً.';
    showError(msg);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadStores);
} else {
  loadStores();
}
