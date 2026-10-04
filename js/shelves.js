const defaultAisles = [
  { id: 1, name: "الممر 1", category: "خضار وفواكه", count: 22, shelves: ["F1", "F2", "E1"] },
  { id: 2, name: "الممر 2", category: "الألبان والأجبان", count: 18, shelves: ["H1", "H2"] },
  { id: 3, name: "الممر 3", category: "المشروبات", count: 35, shelves: ["A1", "A2", "A3"] },
  { id: 4, name: "الممر 4", category: "المنظفات", count: 14, shelves: ["B1", "B2", "B3"] },
  { id: 5, name: "الممر 5", category: "حبوب ومؤن", count: 26, shelves: ["C4", "C3"] },
  { id: 6, name: "الممر 6", category: "خضار وفواكه", count: 22, shelves: ["F1", "F2", "E1"] },
  { id: 7, name: "الممر 9", category: "مخبوزات", count: 19, shelves: ["D1", "D2", "D3"] }
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth(["Merchant", 2, "Admin", 4]);
  }

  document.getElementById('open-add-aisle-btn')?.addEventListener('click', openAddAisleModal);
  document.getElementById('open-add-aisle-btn-empty')?.addEventListener('click', openAddAisleModal);

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      if (modalId) closeModal(modalId);
    });
  });

  const searchInput = document.getElementById('aisle-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterAisles);
  }

  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterAisles);
  }

  const aisleForm = document.getElementById('aisle-form');
  if (aisleForm) {
    aisleForm.addEventListener('submit', handleSaveAisle);
  }

  const assignForm = document.getElementById('assign-product-form');
  if (assignForm) {
    assignForm.addEventListener('submit', handleAssignProductToAisle);
  }

  const aislesGrid = document.getElementById('aisles-grid');
  if (aislesGrid) {
    aislesGrid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit-aisle"]');
      if (editBtn) {
        const id = parseInt(editBtn.getAttribute('data-id'), 10);
        if (id) editAisle(id);
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-aisle"]');
      if (delBtn) {
        const id = parseInt(delBtn.getAttribute('data-id'), 10);
        if (id) deleteAisle(id);
        return;
      }

      const addProdBtn = e.target.closest('[data-action="add-prod-to-aisle"]');
      if (addProdBtn) {
        const id = parseInt(addProdBtn.getAttribute('data-id'), 10);
        if (id) openAddProductModal(id);
      }
    });
  }

  renderAisles(getAisles());
  loadLiveCategories();
  loadLiveProducts();
});

async function loadLiveCategories() {
  try {
    if (typeof ApiClient === 'undefined') return;
    let categories = [];
    if (ApiClient.categories && ApiClient.categories.list) {
      try {
        const res = await ApiClient.categories.list();
        categories = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      } catch (e) {}
    }
    if (categories.length === 0) return;

    const filterSelect = document.getElementById('category-filter');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">جميع الأقسام والتصنيفات</option>';
      categories.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    }

    const modalCatSelect = document.getElementById('aisle-category');
    if (modalCatSelect) {
      modalCatSelect.innerHTML = '<option value="">اختر القسم التابع له...</option>';
      categories.forEach(cat => {
        modalCatSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    }
  } catch (err) {
    console.warn('Could not load live categories in shelves:', err);
  }
}

async function loadLiveProducts() {
  try {
    if (typeof ApiClient === 'undefined') return;
    let products = [];
    const storeId = ApiClient.getActiveStoreId();
    if (storeId && ApiClient.products) {
      try {
        const res = await ApiClient.products.list(storeId);
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          products = res.data;
        }
      } catch (e) {}
    }

    if (products.length === 0) {
      try {
        const stored = localStorage.getItem('dawwer_merchant_catalog_products') || localStorage.getItem('myProducts');
        if (stored) products = JSON.parse(stored);
      } catch (e) {}
    }

    const selectEl = document.getElementById('select-product');
    if (selectEl && products.length > 0) {
      selectEl.innerHTML = '<option value="">اختر منتجاً من قائمة المتجر...</option>';
      products.forEach(p => {
        const pName = p.product_name || p.name || 'منتج';
        const pCat = p.category || 'عام';
        const pPrice = typeof p.price === 'number' ? p.price.toFixed(2) : (p.price || '0.00');
        selectEl.innerHTML += `<option value="${pName}" data-id="${p.id || ''}">${pName} (${pCat} - ₪${pPrice})</option>`;
      });
    }
  } catch (err) {
    console.warn('Could not load live products in shelves:', err);
  }
}

function getAisles() {
  const saved = localStorage.getItem("dawwer_store_aisles");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultAisles;
    }
  }
  localStorage.setItem("dawwer_store_aisles", JSON.stringify(defaultAisles));
  return defaultAisles;
}

function saveAisles(list) {
  localStorage.setItem("dawwer_store_aisles", JSON.stringify(list));
}

function renderAisles(list) {
  const container = document.getElementById("aisles-grid");
  const emptyState = document.getElementById("empty-state");
  if (!container) return;
  container.innerHTML = "";

  if (!list || list.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  let totalShelves = 0;

  list.forEach(a => {
    totalShelves += (a.shelves || []).length;

    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-2xl border border-black/[0.18] shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[190px]";

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="text-lg font-bold text-[#1c5335] mb-0.5">${a.name}</h3>
            <p class="text-xs text-[#686464] font-medium">${a.category} — <span class="font-bold text-slate-800">${a.count} منتج معروض</span></p>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" data-action="edit-aisle" data-id="${a.id}" class="text-slate-400 hover:text-[#1c5335] p-1 text-xs cursor-pointer" title="تعديل الممر">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>
            <button type="button" data-action="delete-aisle" data-id="${a.id}" class="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer" title="حذف الممر">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 py-3 border-t border-slate-100 mt-2">
          ${(a.shelves || []).map(code => `
            <span class="w-8 h-8 rounded-md bg-[#edf5f0] text-[#1c5335] border border-[#1c5335]/20 font-bold font-mono text-xs flex items-center justify-center shadow-xs" title="الرف ${code.trim()}">
              ${code.trim()}
            </span>
          `).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 mt-1">
        <button 
          type="button"
          data-action="add-prod-to-aisle"
          data-id="${a.id}" 
          class="w-full flex items-center justify-center gap-2 bg-[#edf5f0] hover:bg-[#dfeee5] text-[#1c5335] border border-[#1c5335]/20 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>+ إضافة منتج لهذا الممر</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  const totalAislesEl = document.getElementById("total-aisles-count");
  if (totalAislesEl) totalAislesEl.innerText = `${list.length} ممرات نشطة`;

  const totalShelvesEl = document.getElementById("total-shelves-count");
  if (totalShelvesEl) totalShelvesEl.innerText = `${totalShelves} رف مسجل`;
}

function filterAisles() {
  const q = (document.getElementById("aisle-search-input")?.value || '').toLowerCase().trim();
  const cat = document.getElementById("category-filter")?.value || '';
  const list = getAisles();

  const filtered = list.filter(a => {
    const matchesQuery = !q || 
      a.name.toLowerCase().includes(q) || 
      a.category.toLowerCase().includes(q) || 
      (a.shelves || []).some(s => s.toLowerCase().includes(q));

    const matchesCategory = !cat || a.category === cat;

    return matchesQuery && matchesCategory;
  });

  renderAisles(filtered);
}

function openAddAisleModal() {
  const title = document.getElementById("modal-title");
  const idInput = document.getElementById("aisle-id");
  const form = document.getElementById("aisle-form");
  const countInput = document.getElementById("aisle-items-count");
  if (title) title.innerText = "إضافة ممر جديد";
  if (idInput) idInput.value = "";
  if (form) form.reset();
  if (countInput) countInput.value = "22";
  document.getElementById("aisle-modal")?.classList.remove("hidden");
}

function editAisle(id) {
  const list = getAisles();
  const a = list.find(item => item.id === id);
  if (!a) return;

  const title = document.getElementById("modal-title");
  const idInput = document.getElementById("aisle-id");
  const nameInput = document.getElementById("aisle-name");
  const catInput = document.getElementById("aisle-category");
  const countInput = document.getElementById("aisle-items-count");
  const shelvesInput = document.getElementById("aisle-shelves");

  if (title) title.innerText = "تعديل بيانات الممر";
  if (idInput) idInput.value = a.id;
  if (nameInput) nameInput.value = a.name;
  if (catInput) catInput.value = a.category;
  if (countInput) countInput.value = a.count || 0;
  if (shelvesInput) shelvesInput.value = (a.shelves || []).join(", ");
  document.getElementById("aisle-modal")?.classList.remove("hidden");
}

function deleteAisle(id) {
  if (!confirm("هل أنت متأكد من حذف هذا الممر؟")) return;
  const list = getAisles().filter(item => item.id !== id);
  saveAisles(list);
  filterAisles();
  if (window.showToast) {
    window.showToast({
      title: 'تم الحذف',
      message: 'تم حذف الممر بنجاح.',
      type: 'info'
    });
  }
}

function handleSaveAisle(event) {
  event.preventDefault();
  const id = document.getElementById("aisle-id")?.value;
  const name = document.getElementById("aisle-name")?.value.trim() || '';
  const category = document.getElementById("aisle-category")?.value || '';
  const count = parseInt(document.getElementById("aisle-items-count")?.value, 10) || 0;
  const shelvesRaw = document.getElementById("aisle-shelves")?.value || '';
  const shelves = shelvesRaw.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  let list = getAisles();

  if (id) {
    list = list.map(item => String(item.id) === String(id) ? { ...item, name, category, count, shelves } : item);
    if (window.showToast) {
      window.showToast({
        title: 'تم التحديث',
        message: 'تم تحديث بيانات الممر بنجاح!',
        type: 'success'
      });
    }
  } else {
    const newAisle = {
      id: Date.now(),
      name,
      category,
      count,
      shelves
    };
    list.push(newAisle);
    if (window.showToast) {
      window.showToast({
        title: 'تمت الإضافة',
        message: 'تمت إضافة الممر الجديد بنجاح!',
        type: 'success'
      });
    }
  }

  saveAisles(list);
  closeModal("aisle-modal");
  filterAisles();
}

function openAddProductModal(aisleId) {
  const list = getAisles();
  const aisle = list.find(item => item.id === aisleId);
  if (!aisle) return;

  const targetAisleInput = document.getElementById("target-aisle-id");
  const title = document.getElementById("add-prod-modal-title");
  const subtitle = document.getElementById("add-prod-modal-subtitle");
  if (targetAisleInput) targetAisleInput.value = aisle.id;
  if (title) title.innerText = `إضافة منتج إلى (${aisle.name})`;
  if (subtitle) subtitle.innerText = `القسم: ${aisle.category} — الرفوف المتاحة: ${(aisle.shelves || []).join(", ")}`;

  const shelfSelect = document.getElementById("select-target-shelf");
  if (shelfSelect) {
    shelfSelect.innerHTML = "";
    if (aisle.shelves && aisle.shelves.length > 0) {
      aisle.shelves.forEach(s => {
        shelfSelect.innerHTML += `<option value="${s}">الرف ${s}</option>`;
      });
    } else {
      shelfSelect.innerHTML = `<option value="A-01">الرف الافتراضي (A-01)</option>`;
    }
  }

  loadLiveProducts();
  document.getElementById("assign-product-form")?.reset();
  if (targetAisleInput) targetAisleInput.value = aisle.id;
  const qtyInput = document.getElementById("shelf-stock-qty");
  if (qtyInput) qtyInput.value = "10";
  document.getElementById("add-product-modal")?.classList.remove("hidden");
}

function handleAssignProductToAisle(event) {
  event.preventDefault();
  const aisleId = parseInt(document.getElementById("target-aisle-id")?.value, 10);
  const selectEl = document.getElementById("select-product");
  const productName = selectEl?.value;
  const prodOption = selectEl?.selectedOptions ? selectEl.selectedOptions[0] : null;
  const prodId = prodOption ? prodOption.getAttribute("data-id") : null;
  const targetShelf = document.getElementById("select-target-shelf")?.value;
  const qty = parseInt(document.getElementById("shelf-stock-qty")?.value, 10) || 1;

  if (!productName) {
    if (window.showToast) {
      window.showToast({
        title: 'تنبيه',
        message: 'يرجى اختيار المنتج المراد إضافته.',
        type: 'warning'
      });
    }
    return;
  }

  let list = getAisles();
  const aisleIndex = list.findIndex(item => item.id === aisleId);

  if (aisleIndex > -1) {
    list[aisleIndex].count = (list[aisleIndex].count || 0) + 1;
    saveAisles(list);
    filterAisles();

    let products = [];
    try {
      products = JSON.parse(localStorage.getItem("myProducts")) || [];
    } catch(e) { products = []; }

    const existingProdIndex = products.findIndex(p => p.name === productName || (prodId && p.id === prodId));
    if (existingProdIndex > -1) {
      products[existingProdIndex].shelf = targetShelf;
      products[existingProdIndex].aisle = list[aisleIndex].name;
    } else {
      products.unshift({
        id: prodId || Date.now(),
        name: productName,
        category: list[aisleIndex].category,
        shelf: targetShelf,
        aisle: list[aisleIndex].name,
        price: 15.0,
        quantity: qty
      });
    }
    localStorage.setItem("myProducts", JSON.stringify(products));
    localStorage.setItem("dawwer_merchant_catalog_products", JSON.stringify(products));

    // Sync live product shelf position to products & spatial placement service if active
    const storeId = (typeof ApiClient !== 'undefined') ? ApiClient.getActiveStoreId() : null;
    if (storeId && typeof ApiClient !== 'undefined') {
      if (prodId && ApiClient.products) {
        ApiClient.products.update(storeId, prodId, {
          shelf: targetShelf,
          aisle: list[aisleIndex].name
        }, { suppressToastOnError: true }).catch(err => {
          console.warn('Live API product shelf update failed:', err);
        });
      }
      if (ApiClient.floorplan && ApiClient.floorplan.savePlacements) {
        ApiClient.floorplan.savePlacements(storeId, [{
          product_id: prodId,
          product_name: productName,
          shelf_code: targetShelf,
          aisle_name: list[aisleIndex].name
        }]).catch(err => {
          console.warn('Live API spatial placement sync failed:', err);
        });
      }
    }

    closeModal("add-product-modal");
    if (window.showToast) {
      window.showToast({
        title: 'تم ربط المنتج بالرف',
        message: `تمت إضافة "${productName}" بنجاح إلى ${list[aisleIndex].name} على الرف [${targetShelf}]!`,
        type: 'success'
      });
    }
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

window.openAddAisleModal = openAddAisleModal;
window.editAisle = editAisle;
window.deleteAisle = deleteAisle;
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;
