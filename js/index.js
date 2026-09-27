let _indexInitialized = false;
document.addEventListener('DOMContentLoaded', async () => {
  if (_indexInitialized) return;
  _indexInitialized = true;

  if (window.Auth && typeof Auth.requireAuth === 'function') {
    Auth.requireAuth();
  }

  await loadDashboard();
});

async function loadDashboard() {
  try {
    // 2. Persistent Store Context: read active_store_id and storeToken from localStorage directly
    const existingStoreId = localStorage.getItem('active_store_id') || localStorage.getItem('activeStoreId') || localStorage.getItem('storeId');
    const existingStoreName = localStorage.getItem('storeName') || localStorage.getItem('store_name');
    if (existingStoreName) {
      document.querySelectorAll('[data-store-name], #store-name-text, #current-store-name').forEach(el => {
        el.innerText = existingStoreName;
      });
    }

    if (!window.ApiClient) return;
    const res = await ApiClient.get('/merchant/stores').catch(() => null);
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      // If no store is currently active in localStorage, auto-select an approved store
      if (!existingStoreId || existingStoreId === 'null' || existingStoreId === 'undefined') {
        const store = res.data.find(s => s.verificationStatus === 5 || s.verificationStatus === 'Approved') || res.data[0];
        if (store && store.id && window.Auth && typeof Auth.selectStore === 'function') {
          try {
            await Auth.selectStore(store.id);
          } catch (e) {
            console.warn('Auto select store error:', e);
          }
        }
      } else {
        // Store context is already persistent; refresh UI store name if updated on server
        const currentStore = res.data.find(s => String(s.id) === String(existingStoreId));
        if (currentStore && currentStore.name) {
          localStorage.setItem('storeName', currentStore.name);
          localStorage.setItem('store_name', currentStore.name);
          document.querySelectorAll('[data-store-name], #store-name-text, #current-store-name').forEach(el => {
            el.innerText = currentStore.name;
          });
        }
      }
    }
  } catch (err) {
    console.warn('Dashboard stores fetch:', err);
  }
}
