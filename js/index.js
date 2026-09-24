

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
    if (!window.ApiClient) return;
    const res = await ApiClient.get('/merchant/stores');
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      const store = res.data[0];
      if (store.id && window.Auth && (!Auth.getActiveStore() || Auth.getActiveStore().storeId !== store.id)) {
        try {
          await Auth.selectStore(store.id);
        } catch (e) {
          console.warn('Auto select store error:', e);
        }
      }
      if (store.name) {
        document.querySelectorAll('[data-store-name], #store-name-text, #current-store-name').forEach(el => {
          el.innerText = store.name;
        });
      }
    }
  } catch (err) {
    console.warn('Dashboard stores fetch:', err);
  }
}
