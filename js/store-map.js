(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth(['Merchant', 2, 'Admin', 4, 'Staff', 3]);
    document.getElementById('retry-map').addEventListener('click', loadMap);
    loadMap();
  });
  async function loadMap() {
    const status = document.getElementById('store-map-status');
    const retry = document.getElementById('retry-map');
    const frame = document.getElementById('store-map-frame');
    status.classList.remove('hidden'); retry.classList.add('hidden'); frame.classList.add('hidden');
    status.textContent = 'جارٍ تحميل منتجات المتجر…';
    try {
      const storeId = CONFIG.getActiveStoreId();
      if (!storeId) throw new Error('اختر متجرًا أولًا من صفحة المتاجر.');
      if (!Auth.hasRole(2) && !Auth.hasRole(4) && !Auth.hasPermission('Store.Manage')) throw new Error('ليس لديك صلاحية إدارة خريطة المتجر.');
      const products = await ApiClient.listAll(`/stores/${encodeURIComponent(storeId)}/products`);
      // The shared client loads every page; do not seed the merchant map with demo products.
      const list = products?.data ?? products;
      if (!Array.isArray(list)) throw new Error('تعذر قراءة منتجات المتجر.');
      window.DawwerMerchantMap = {
        storeId, storeName: Auth.getActiveStore()?.storeName || 'المتجر',
        products: list.map(p => ({ id: String(p.id), name: p.product_name || p.name || p.store_sku || 'منتج', shortName: p.product_name || p.name || 'منتج', sku: p.store_sku || p.sku || '', category: p.category || 'عام', searchTerms: p.barcode || '', color: '#1c5335', accent: '#edf5f0', initials: (p.product_name || p.name || 'م').slice(0, 2) }))
      };
      frame.src = 'assets/store-map/index.html';
      frame.onload = () => { status.classList.add('hidden'); frame.classList.remove('hidden'); };
    } catch (error) { status.textContent = error.message || 'تعذر تحميل الخريطة.'; retry.classList.remove('hidden'); }
  }
})();
