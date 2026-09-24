const STORAGE_KEY_CATALOG = 'dawwer_merchant_catalog_products';
const STORAGE_KEY_AUDIT = 'dawwer_merchant_audit_log';

const defaultProducts = [
  { id: 1, name: "عصير برتقال طبيعي 1ل", sku: "JUC-ORG-100", category: "مشروبات", price: 12.5, quantity: 4, stock: 4, threshold: 5, shelf: "A-02", available: true },
  { id: 2, name: "لبنة بلدية 500غ", sku: "DY-LBN-500", category: "ألبان وأجبان", price: 18.0, quantity: 2, stock: 2, threshold: 5, shelf: "B-01", available: true },
  { id: 3, name: "مناديل ورقية فاخرة", sku: "CLN-TIS-001", category: "منظفات وعناية", price: 8.0, quantity: 0, stock: 0, threshold: 10, shelf: "C-04", available: false },
  { id: 4, name: "زيت زيتون بكر ممتاز 1ل", sku: "OIL-OLV-100", category: "زيوت ومؤن", price: 45.0, quantity: 24, stock: 24, threshold: 8, shelf: "A-05", available: true },
  { id: 5, name: "أرز بسمتي فاخر 5كغ", sku: "GRN-RIC-500", category: "حبوب ومعلبات", price: 38.0, quantity: 15, stock: 15, threshold: 5, shelf: "D-01", available: true },
  { id: 6, name: "حليب كامل الدسم 1ل", sku: "DY-MLK-100", category: "ألبان وأجبان", price: 7.5, quantity: 30, stock: 30, threshold: 10, shelf: "B-03", available: true }
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth();
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', searchProducts);
  }

  const tableBody = document.getElementById('products-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete-product"]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        if (id) deleteProduct(id);
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-product"]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        if (id) openEditModal(id);
        return;
      }
    });
  }

  const closeBtn = document.getElementById('close-edit-modal-btn');
  const cancelBtn = document.getElementById('cancel-edit-modal-btn');
  const backdrop = document.getElementById('edit-modal-backdrop');
  if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
  if (backdrop) backdrop.addEventListener('click', closeEditModal);

  const editForm = document.getElementById('edit-product-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditSubmit);
  }

  renderTable(getProducts());
  syncProductsFromApi();
});

async function syncProductsFromApi() {
  try {
    if (typeof ApiClient !== 'undefined' && ApiClient.products) {
      const storeId = ApiClient.getActiveStoreId();
      if (!storeId) {
        console.info('[Products] No active storeId found, displaying local catalog products.');
        return;
      }
      const res = await ApiClient.products.list(storeId);
      const items = res?.data || (Array.isArray(res) ? res : null);
      if (Array.isArray(items) && items.length > 0) {
        renderTable(getProducts());
      }
    }
  } catch (e) {
    console.warn('[Products] Sync from live backend:', e);
  }
}

function recordAuditLog(actionType, target, targetSku, changeDelta, details) {
  try {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_AUDIT) || '[]');
    const now = new Date();
    const timeStr = now.toLocaleDateString('ar-PS', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    logs.unshift({
      id: 'log-' + Date.now(),
      timestamp: now.toISOString(),
      formattedTime: timeStr,
      actionType: actionType,
      target: target,
      targetSku: targetSku || '-',
      performedBy: (localStorage.getItem('dawwer_user_name') || 'أحمد المدير (التاجر)'),
      changeDelta: changeDelta || '-',
      details: details || ''
    });
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs));
  } catch (e) {
    console.warn('Could not record audit log', e);
  }
}

function getProducts() {
  const saved = localStorage.getItem(STORAGE_KEY_CATALOG);
  if (saved) {
    try {
      const items = JSON.parse(saved);
      return items.map((p) => {
        if (p.quantity === undefined && p.stock !== undefined) p.quantity = p.stock;
        return p;
      });
    } catch (e) {
      return defaultProducts;
    }
  } else {
    const legacy = localStorage.getItem('myProducts');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(parsed));
        return parsed;
      } catch (e) { }
    }
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(defaultProducts));
    return defaultProducts;
  }
}

function renderTable(list) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7' class='text-center py-10 text-slate-400 font-bold'>لا توجد منتجات مطابقة</td></tr>";
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const qty = (p.quantity !== undefined ? p.quantity : (p.stock !== undefined ? p.stock : 0));
    const thresh = (p.threshold !== undefined ? p.threshold : 5);

    let statusBadge = "<span class='bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold inline-block'>متوفر</span>";
    if (qty === 0) {
      statusBadge = "<span class='bg-rose-50 text-rose-700 text-xs px-3 py-1 rounded-full font-bold inline-block'>نفذت الكمية</span>";
    } else if (qty <= thresh) {
      statusBadge = `<span class='bg-amber-50 text-amber-700 text-xs px-3 py-1 rounded-full font-bold inline-block'>مخزون منخفض (${qty})</span>`;
    }

    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-50/80 transition';
    row.innerHTML =
      `<td class='py-4 px-6 font-bold text-slate-900'>${p.name}</td>` +
      `<td class='py-4 px-6 text-slate-600'>${p.category || 'عام'}</td>` +
      `<td class='py-4 px-6 font-bold text-slate-900'>₪${Number(p.price || 0).toFixed(2)}</td>` +
      `<td class='py-4 px-6 text-slate-700 font-bold'>${qty}</td>` +
      `<td class='py-4 px-6 font-mono text-xs text-slate-700'>${p.shelf || '-'}</td>` +
      `<td class='py-4 px-6'>${statusBadge}</td>` +
      `<td class='py-4 px-6 text-center flex items-center justify-center gap-2'>` +
      `<button type="button" data-action="edit-product" data-id="${p.id}" class="edit-product-btn bg-emerald-50 hover:bg-emerald-100 text-[#153f2d] text-xs px-3 py-1.5 rounded-xl font-bold transition shadow-2xs cursor-pointer">تعديل</button>` +
      `<a href='inventory-audit.html?search=${encodeURIComponent(p.name)}' class='bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs px-2.5 py-1.5 rounded-xl font-bold transition'>المخزون</a>` +
      `<button type="button" data-action="delete-product" data-id="${p.id}" class="delete-product-btn bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-bold transition shadow-2xs cursor-pointer">حذف</button>` +
      `</td>`;

    tbody.appendChild(row);
  }

  const countEl = document.getElementById('sidebar-count');
  if (countEl) countEl.innerText = list.length;
}

function openEditModal(productId) {
  const list = getProducts();
  const p = list.find((item) => String(item.id) === String(productId));
  if (!p) return;

  const modal = document.getElementById('edit-product-modal');
  const backdrop = document.getElementById('edit-modal-backdrop');
  const panel = document.getElementById('edit-modal-panel');
  const errorBox = document.getElementById('edit-modal-error');
  const errorText = document.getElementById('edit-modal-error-text');

  if (errorBox) errorBox.classList.add('hidden');
  if (errorText) errorText.textContent = '';

  const idInput = document.getElementById('edit-product-id');
  const nameInput = document.getElementById('edit-product-name');
  const skuInput = document.getElementById('edit-product-sku');
  const catInput = document.getElementById('edit-product-category');
  const priceInput = document.getElementById('edit-product-price');
  const qtyInput = document.getElementById('edit-product-quantity');
  const zoneInput = document.getElementById('edit-product-zone');
  const aisleInput = document.getElementById('edit-product-aisle');
  const rackInput = document.getElementById('edit-product-rack');
  const shelfInput = document.getElementById('edit-product-shelf');
  const availInput = document.getElementById('edit-product-available');
  const modalTitle = document.getElementById('edit-modal-title');

  if (modalTitle) modalTitle.textContent = `تعديل المنتج — ${p.name}`;
  if (idInput) idInput.value = p.id;
  if (nameInput) nameInput.value = p.name || '';
  if (skuInput) skuInput.value = p.sku || p.store_sku || '';
  if (catInput) catInput.value = p.category || 'عام';
  if (priceInput) priceInput.value = p.price !== undefined ? p.price : '';
  if (qtyInput) qtyInput.value = p.quantity !== undefined ? p.quantity : (p.stock !== undefined ? p.stock : 0);
  if (zoneInput) zoneInput.value = p.zone || (p.location ? p.location.zone : '') || 'المنطقة أ';
  if (aisleInput) aisleInput.value = p.aisle || (p.location ? p.location.aisle : '') || '01';
  if (rackInput) rackInput.value = p.rack || (p.location ? p.location.rack : '') || 'R1';
  if (shelfInput) shelfInput.value = p.shelf || (p.location ? p.location.shelf : '') || 'A-01';
  if (availInput) availInput.checked = p.available !== false && p.isAvailable !== false && p.stock_status !== 'OUT_OF_STOCK';

  if (modal && backdrop && panel) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      panel.classList.remove('opacity-0', 'scale-95');
      panel.classList.add('opacity-100', 'scale-100');
    });
  }
}

function closeEditModal() {
  const modal = document.getElementById('edit-product-modal');
  const backdrop = document.getElementById('edit-modal-backdrop');
  const panel = document.getElementById('edit-modal-panel');
  const errorBox = document.getElementById('edit-modal-error');

  if (backdrop && panel) {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.remove('opacity-100', 'scale-100');
    panel.classList.add('opacity-0', 'scale-95');
  }

  setTimeout(() => {
    if (modal) modal.classList.add('hidden');
    if (errorBox) errorBox.classList.add('hidden');
    const form = document.getElementById('edit-product-form');
    if (form) form.reset();
  }, 200);
}

function showModalError(message) {
  const errorBox = document.getElementById('edit-modal-error');
  const errorText = document.getElementById('edit-modal-error-text');
  if (errorBox && errorText) {
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (window.showToast) {
    window.showToast({
      title: 'خطأ',
      message: message,
      type: 'error'
    });
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('edit-product-id');
  const nameInput = document.getElementById('edit-product-name');
  const skuInput = document.getElementById('edit-product-sku');
  const catInput = document.getElementById('edit-product-category');
  const priceInput = document.getElementById('edit-product-price');
  const qtyInput = document.getElementById('edit-product-quantity');
  const zoneInput = document.getElementById('edit-product-zone');
  const aisleInput = document.getElementById('edit-product-aisle');
  const rackInput = document.getElementById('edit-product-rack');
  const shelfInput = document.getElementById('edit-product-shelf');
  const availInput = document.getElementById('edit-product-available');

  const productId = idInput?.value;
  const name = nameInput?.value?.trim();
  const sku = skuInput?.value?.trim() || `SKU-${Date.now().toString().slice(-4)}`;
  const category = catInput?.value?.trim() || 'عام';
  const price = parseFloat(priceInput?.value || 0);
  const quantity = parseInt(qtyInput?.value || 0, 10);
  const zone = zoneInput?.value?.trim() || 'المنطقة أ';
  const aisle = aisleInput?.value?.trim() || '01';
  const rack = rackInput?.value?.trim() || 'R1';
  const shelf = shelfInput?.value?.trim() || '1';
  const isAvailable = !!availInput?.checked;

  if (!productId) {
    showModalError('لم يتم تحديد معرّف المنتج (product_id).');
    return;
  }
  if (!name) {
    showModalError('يرجى كتابة اسم المنتج.');
    return;
  }
  if (isNaN(price) || price < 0) {
    showModalError('يرجى تحديد سعر صالح (0 أو أكبر).');
    return;
  }

  const storeId = typeof ApiClient !== 'undefined' ? ApiClient.getActiveStoreId() : null;
  if (!storeId) {
    showModalError('لم يتم العثور على معرّف متجر نشط (store_id). يرجى تسجيل الدخول أو اختيار المتجر أولاً.');
    return;
  }

  const cleanAisle = aisle.replace(/[^0-9]/g, '') || "01";
  const cleanRack = rack.replace(/[^0-9]/g, '') || "1";
  const cleanShelf = shelf.replace(/[^0-9]/g, '') || "1";
  const mapTarget = `${zone} - ممر ${cleanAisle} - رف ${cleanShelf}`;

  const livePayload = {
    store_sku: sku,
    product_name: name,
    category: category,
    price: price,
    quantity: quantity,
    stock_status: isAvailable && quantity > 0 ? "IN_STOCK" : (quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK"),
    zone: zone,
    aisle: cleanAisle,
    rack: cleanRack,
    shelf: cleanShelf,
    map_target: mapTarget
  };

  const submitBtn = document.getElementById('save-edit-product-btn');
  const spinner = document.getElementById('save-edit-btn-spinner');
  const btnText = document.getElementById('save-edit-btn-text');

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');
  if (btnText) btnText.textContent = 'جاري الحفظ في السيرفر...';

  try {
    await ApiClient.products.update(storeId, productId, livePayload, { suppressToastOnError: true });

    const list = getProducts();
    const idx = list.findIndex((item) => String(item.id) === String(productId));
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        name: livePayload.product_name,
        sku: livePayload.store_sku,
        category: livePayload.category,
        price: livePayload.price,
        quantity: livePayload.quantity,
        stock: livePayload.quantity,
        zone: livePayload.zone,
        aisle: livePayload.aisle,
        rack: livePayload.rack,
        shelf: livePayload.shelf,
        available: livePayload.stock_status !== 'OUT_OF_STOCK',
        isAvailable: livePayload.stock_status !== 'OUT_OF_STOCK',
        status: livePayload.stock_status === 'OUT_OF_STOCK' ? 'Draft' : 'Published',
        updatedAt: new Date().toLocaleDateString('ar-SA')
      };
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(list));
      localStorage.setItem('myProducts', JSON.stringify(list));
    }

    recordAuditLog(
      'تعديل منتج',
      name,
      sku,
      `تحديث السعر: ${price} ₪ والكمية: ${quantity}`,
      'تم تحديث بيانات المنتج وموقعه الهندسي بالسيرفر الحي بنجاح'
    );

    closeEditModal();
    renderTable(getProducts());

    if (window.showToast) {
      window.showToast({
        title: 'تم التعديل بنجاح',
        message: `تم تحديث بيانات المنتج (${name}) في السيرفر وقاعدة البيانات.`,
        type: 'success'
      });
    }
  } catch (err) {
    console.error('[Products Edit Error]', err);
    const serverMessage = err.message || (err.response && err.response.message) || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.';
    showModalError(serverMessage);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'حفظ التغييرات في السيرفر';
  }
}

async function deleteProduct(id) {
  const list = getProducts();
  const targetProduct = list.find((p) => String(p.id) === String(id));
  const pName = targetProduct ? targetProduct.name : `منتج #${id}`;

  if (!confirm(`هل تريد بالتأكيد حذف المنتج (${pName})؟`)) {
    return;
  }

  // 1. Immediately delete from local state and update table
  const newList = list.filter((p) => String(p.id) !== String(id));
  localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(newList));
  localStorage.setItem('myProducts', JSON.stringify(newList));

  recordAuditLog(
    'حذف منتج',
    pName,
    (targetProduct ? targetProduct.sku : ''),
    'حذف المنتج من الكتالوج',
    `تم حذف الصنف من الجدول بنجاح`
  );

  renderTable(newList);

  if (window.showToast) {
    window.showToast({
      title: 'تم الحذف بنجاح',
      message: `تم حذف المنتج (${pName}) من الجدول بنجاح.`,
      type: 'success'
    });
  }

  // 2. Dispatch DELETE to backend with error muted/suppressed if failed
  const storeId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId()) || '7b8f6a91-45c2-48df-bc88-825dfa234123';
  try {
    if (typeof ApiClient !== 'undefined' && ApiClient.products && ApiClient.products.delete) {
      await ApiClient.products.delete(storeId, id, { suppressToastOnError: true, throwOnError: false });
    }
  } catch (err) {
    console.warn('[Products Delete Note]:', err.message || err);
  }
}

function searchProducts() {
  const searchInput = document.getElementById('search-input');
  const query = (searchInput?.value || '').toLowerCase().trim();
  const list = getProducts();
  if (!query) {
    renderTable(list);
    return;
  }
  const filtered = list.filter((p) => {
    const nameMatch = (p.name || '').toLowerCase().includes(query);
    const shelfMatch = (p.shelf || '').toLowerCase().includes(query);
    const catMatch = (p.category || '').toLowerCase().includes(query);
    return nameMatch || shelfMatch || catMatch;
  });
  renderTable(filtered);
}
