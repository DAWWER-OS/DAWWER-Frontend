(function () {
  'use strict';
  const context = window.parent !== window && window.parent.DawwerMerchantMap;
  if (!context?.storeId) { window.location.replace('../../store-map.html'); throw new Error('افتح الخريطة من صفحة التاجر.'); }
  const prefix = `dawwer-map:${context.storeId}:`;
  window.DawwerMapContext = {
    storageKey: prefix + 'layout', reportsKey: prefix + 'reports', journeyKey: prefix + 'journey',
    products: context.products,
    createStore() {
      const store = window.DawerData.createEmptyStore();
      return { ...store, id: context.storeId, name: context.storeName, products: context.products, locations: [] };
    }
  };
  // Start in the merchant editor; shopper preview remains available from its toolbar.
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('shopper').hidden = true;
    document.getElementById('appShell').hidden = false;
    window.DawerEditor.activate('build');
    document.getElementById('canvasStatus').textContent = context.storeName;
    document.querySelectorAll('.store-name').forEach(el => { el.textContent = context.storeName; });
  });
})();
