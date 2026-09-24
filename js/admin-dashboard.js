let currentTab = 'stores';
let storesData = [];
let usersData = [];
let categoriesTree = [];

const defaultStores = [
  { id: "app-1", name: "هايبرماركت الأندلس", commercialRegistrationNumber: "1010123456", taxNumber: "3000123456", city: "رام الله", address: "شارع الإرسال", phoneNumber: "+970599000111", verificationStatus: 2, statusName: "Submitted" },
  { id: "app-2", name: "سوبرماركت المدينة", commercialRegistrationNumber: "1010998877", taxNumber: "3000998877", city: "رام الله", address: "مجمع النخيل", phoneNumber: "+970599222333", verificationStatus: 5, statusName: "Approved" },
  { id: "app-3", name: "مخبز وحلويات القدس", commercialRegistrationNumber: "1010554433", taxNumber: "3000554433", city: "القدس", address: "بيت حنينا", phoneNumber: "+972544111222", verificationStatus: 3, statusName: "UnderReview" }
];

const defaultUsers = [
  { id: "u-1", fullName: "مدير النظام الرئيسي", email: "admin@dawwer.com", role: "Admin", status: 2, statusName: "Active" },
  { id: "u-2", fullName: "أحمد سليم", email: "merchant@dawwer.com", role: "Merchant", status: 2, statusName: "Active" },
  { id: "u-3", fullName: "سارة الزبون", email: "customer@gmail.com", role: "Customer", status: 3, statusName: "Suspended" }
];

const defaultCategories = [
  { id: "c-1", name: "مشروبات ومياه", slug: "beverages", isActive: true, children: [
    { id: "c-11", name: "عصائر طبيعية", slug: "fresh-juices", isActive: true },
    { id: "c-12", name: "مياه غازية ومعدنية", slug: "mineral-water", isActive: true }
  ]},
  { id: "c-2", name: "ألبان وأجبان", slug: "dairy", isActive: true, children: [
    { id: "c-21", name: "أجبان بلدية", slug: "local-cheese", isActive: true }
  ]},
  { id: "c-3", name: "منظفات وعناية", slug: "cleaning", isActive: false, children: [] }
];

const defaultAuditLogs = [
  { id: "aud-1", timestamp: "2026-09-17 09:30:14", userName: "admin@dawwer.com", action: "ApproveStore", entityType: "StoreApplication", oldValues: '{"status": 2}', newValues: '{"status": 5}' },
  { id: "aud-2", timestamp: "2026-09-17 08:15:02", userName: "admin@dawwer.com", action: "SuspendUser", entityType: "UserAccount", oldValues: '{"status": "Active"}', newValues: '{"status": "Suspended", "reason": "Policy Violation"}' },
  { id: "aud-3", timestamp: "2026-09-16 14:22:40", userName: "admin@dawwer.com", action: "CreateCategory", entityType: "Category", oldValues: 'null', newValues: '{"name": "Smartphones", "slug": "smartphones"}' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth(["Admin", 4, (typeof CONFIG !== 'undefined' && CONFIG.ROLES) ? CONFIG.ROLES.ADMIN : 4]);
  }

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      if (modalId) closeModal(modalId);
    });
  });

  document.querySelectorAll('[data-store-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-store-filter');
      filterStores(status, btn);
    });
  });

  const storeTbody = document.getElementById('admin-stores-body');
  if (storeTbody) {
    storeTbody.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('[data-action="view-store"]');
      if (viewBtn) {
        const id = viewBtn.getAttribute('data-id');
        if (id) openStoreDetails(id);
        return;
      }
      const suspBtn = e.target.closest('[data-action="suspend-store"]');
      if (suspBtn) {
        const id = suspBtn.getAttribute('data-id');
        if (id) suspendStore(id);
      }
    });
  }

  document.getElementById('user-search')?.addEventListener('input', searchUsers);
  document.getElementById('user-role-filter')?.addEventListener('change', loadUsers);

  const userTbody = document.getElementById('admin-users-body');
  if (userTbody) {
    userTbody.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-action="toggle-user"]');
      if (toggleBtn) {
        const userId = toggleBtn.getAttribute('data-id');
        const action = toggleBtn.getAttribute('data-user-action');
        if (userId && action) toggleUserStatus(userId, action);
      }
    });
  }

  document.getElementById('open-category-modal-btn')?.addEventListener('click', openCategoryModal);
  document.getElementById('category-form')?.addEventListener('submit', handleSaveCategory);

  const categoriesContainer = document.getElementById('categories-tree-container');
  if (categoriesContainer) {
    categoriesContainer.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-action="toggle-category"]');
      if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-id');
        const active = toggleBtn.getAttribute('data-active') === 'true';
        if (id) toggleCategoryStatus(id, active);
        return;
      }
      const delBtn = e.target.closest('[data-action="delete-category"]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        if (id) deleteCategory(id);
      }
    });
  }

  document.getElementById('audit-action-filter')?.addEventListener('change', loadAuditLogs);
  document.getElementById('audit-entity-filter')?.addEventListener('change', loadAuditLogs);
  document.getElementById('audit-start-date')?.addEventListener('change', loadAuditLogs);

  const auditTbody = document.getElementById('admin-audit-body');
  if (auditTbody) {
    auditTbody.addEventListener('click', (e) => {
      const diffBtn = e.target.closest('[data-action="view-diff"]');
      if (diffBtn) {
        const oldVal = diffBtn.getAttribute('data-old') || 'null';
        const newVal = diffBtn.getAttribute('data-new') || 'null';
        viewAuditDiff(oldVal, newVal);
      }
    });
  }

  switchTab('stores');
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.sidebar-nav button[data-tab]').forEach(b => {
    b.classList.remove('active', 'active-tab');
    b.classList.add('text-white/70');
  });

  const activeBtn = document.getElementById(`tab-btn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'active-tab');
    activeBtn.classList.remove('text-white/70');
  }

  const activeContent = document.getElementById(`tab-${tab}`);
  if (activeContent) activeContent.classList.remove('hidden');

  const titleMap = {
    stores: { title: "طلبات انضمام المتاجر", subtitle: "مراجعة واعتماد طلبات المتاجر المسجلة" },
    users: { title: "المستخدمين والحسابات", subtitle: "إدارة الحسابات وصلاحيات التعليق والتفعيل" },
    categories: { title: "شجرة التصنيفات المركزية", subtitle: "حوكمة التصنيفات والأقسام على المنصة" },
    audit: { title: "سجلات التدقيق والأمان (Audit Logs)", subtitle: "تتبع جميع العمليات والتغييرات الحساسة" }
  };

  const titleEl = document.getElementById("page-title");
  const subEl = document.getElementById("page-subtitle");
  if (titleEl && titleMap[tab]) titleEl.innerText = titleMap[tab].title;
  if (subEl && titleMap[tab]) subEl.innerText = titleMap[tab].subtitle;

  if (tab === 'stores') loadStores();
  if (tab === 'users') loadUsers();
  if (tab === 'categories') loadCategories();
  if (tab === 'audit') loadAuditLogs();
}

async function loadStores() {
  try {
    const res = await ApiClient.get("/admin/stores/applications");
    storesData = (res && res.success && Array.isArray(res.data) && res.data.length > 0) ? res.data : defaultStores;
    renderStoresTable(storesData);
  } catch (err) {
    console.warn("Stores API error, loaded fallback stores:", err);
    storesData = defaultStores;
    renderStoresTable(storesData);
  }
}

function renderStoresTable(list) {
  const tbody = document.getElementById("admin-stores-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-bold">لا توجد طلبات متاجر مطابقة</td></tr>`;
    return;
  }

  const statusBadges = {
    1: "<span class='bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold'>مسودة</span>",
    2: "<span class='bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold'>بانتظار المراجعة</span>",
    3: "<span class='bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold'>قيد المراجعة</span>",
    4: "<span class='bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full text-xs font-bold'>مطلوب معلومات</span>",
    5: "<span class='bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold'>معتمد ونشط ✓</span>",
    6: "<span class='bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold'>مرفوض</span>"
  };

  list.forEach(s => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-4 font-bold text-slate-900">${s.name}</td>
      <td class="p-4 font-mono text-xs text-slate-600">CR: ${s.commercialRegistrationNumber || '-'}<br>TAX: ${s.taxNumber || '-'}</td>
      <td class="p-4 text-slate-700">${s.city || ''} - ${s.address || ''}</td>
      <td class="p-4 font-mono text-xs text-slate-600">${s.phoneNumber || '-'}</td>
      <td class="p-4">${statusBadges[s.verificationStatus] || statusBadges[2]}</td>
      <td class="p-4 flex gap-1.5">
        <button type="button" data-action="view-store" data-id="${s.id}" class="bg-[#184336] text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-[#0f2b23] transition cursor-pointer">معاينة</button>
        ${s.verificationStatus === 5 ? `
          <button type="button" data-action="suspend-store" data-id="${s.id}" class="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-rose-100 cursor-pointer">تعليق</button>
        ` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterStores(status, targetBtn) {
  document.querySelectorAll('.filter-store-btn').forEach(b => {
    b.className = "filter-store-btn bg-white border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer";
  });
  if (targetBtn) {
    targetBtn.className = "filter-store-btn bg-[#184336] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer";
  }

  if (status === 'all') {
    renderStoresTable(storesData);
  } else {
    const statusMap = { Submitted: 2, UnderReview: 3, Approved: 5, NeedsInformation: 4 };
    const filtered = storesData.filter(s => s.verificationStatus === statusMap[status]);
    renderStoresTable(filtered);
  }
}

async function openStoreDetails(storeId) {
  const store = storesData.find(s => String(s.id) === String(storeId)) || storesData[0];
  const titleEl = document.getElementById("modal-store-name");
  if (titleEl) titleEl.innerText = store.name;

  const content = document.getElementById("modal-store-content");
  if (content) {
    content.innerHTML = `
      <div class="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
        <div><strong>المدينة:</strong> ${store.city || '-'}</div>
        <div><strong>العنوان:</strong> ${store.address || '-'}</div>
        <div><strong>السجل التجاري:</strong> ${store.commercialRegistrationNumber || '-'}</div>
        <div><strong>الرقم الضريبي:</strong> ${store.taxNumber || '-'}</div>
        <div><strong>الهاتف:</strong> ${store.phoneNumber || '-'}</div>
        <div><strong>البريد:</strong> ${store.email || '-'}</div>
      </div>
      <div>
        <h4 class="font-bold text-xs text-slate-700 mb-2">المستندات المرفقة:</h4>
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <span>📄 وثيقة السجل التجاري (Commercial_Register.pdf)</span>
          <span class="text-emerald-700 font-bold">جاهز للمعاينة</span>
        </div>
      </div>
    `;
  }

  const actions = document.getElementById("modal-store-actions");
  if (actions) {
    actions.innerHTML = `
      <button type="button" id="btn-start-review" class="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-700 transition cursor-pointer">بدء المراجعة (Start Review)</button>
      <button type="button" id="btn-request-info" class="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer">طلب معلومات إضافية</button>
      <button type="button" id="btn-approve-store" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-700 transition cursor-pointer">اعتماد وتفعيل المتجر ✓</button>
      <button type="button" id="btn-reject-store" class="bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer">رفض الطلب ✕</button>
    `;

    document.getElementById('btn-start-review')?.addEventListener('click', () => startReview(store.id));
    document.getElementById('btn-request-info')?.addEventListener('click', () => promptRequestInfo(store.id));
    document.getElementById('btn-approve-store')?.addEventListener('click', () => approveApplication(store.id));
    document.getElementById('btn-reject-store')?.addEventListener('click', () => promptReject(store.id));
  }

  document.getElementById("store-modal")?.classList.remove("hidden");
}

async function startReview(id) {
  try {
    await ApiClient.post(`/admin/stores/applications/${id}/start-review`, {});
    if (window.showToast) {
      window.showToast({
        title: 'قيد المراجعة',
        message: 'تم تغيير حالة الطلب إلى (قيد المراجعة).',
        type: 'info'
      });
    }
    closeModal("store-modal");
    loadStores();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'حدث خطأ أثناء بدء المراجعة.',
        type: 'error'
      });
    }
  }
}

async function approveApplication(id) {
  if (!confirm("هل أنت متأكد من اعتماد هذا المتجر وتفعيله على المنصة؟")) return;
  try {
    await ApiClient.post(`/admin/stores/applications/${id}/approve`, {});
    if (window.showToast) {
      window.showToast({
        title: 'تم الاعتماد',
        message: 'تم اعتماد المتجر بنجاح وتفعيله على المنصة!',
        type: 'success'
      });
    }
    closeModal("store-modal");
    loadStores();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'حدث خطأ أثناء الاعتماد.',
        type: 'error'
      });
    }
  }
}

function promptRequestInfo(id) {
  const title = document.getElementById("prompt-title");
  const desc = document.getElementById("prompt-desc");
  const submitBtn = document.getElementById("prompt-submit-btn");
  const textArea = document.getElementById("prompt-text");

  if (title) title.innerText = "طلب معلومات إضافية من التاجر";
  if (desc) desc.innerText = "أدخل رسالة التوضيح للتاجر حول النواقص أو المستندات المطلوبة:";
  if (textArea) textArea.value = "";

  if (submitBtn) {
    submitBtn.onclick = async () => {
      const message = textArea ? textArea.value.trim() : '';
      if (!message) {
        if (window.showToast) {
          window.showToast({
            title: 'تنبيه',
            message: 'يرجى إدخال رسالة التوضيح.',
            type: 'warning'
          });
        }
        return;
      }
      try {
        await ApiClient.post(`/admin/stores/applications/${id}/request-info`, { message });
        if (window.showToast) {
          window.showToast({
            title: 'تم الإرسال',
            message: 'تم إرسال طلب المعلومات للتاجر.',
            type: 'success'
          });
        }
        closeModal("prompt-modal");
        closeModal("store-modal");
        loadStores();
      } catch (err) {
        if (window.showToast) {
          window.showToast({
            title: 'خطأ',
            message: err.message || 'فشل إرسال الطلب.',
            type: 'error'
          });
        }
      }
    };
  }
  document.getElementById("prompt-modal")?.classList.remove("hidden");
}

function promptReject(id) {
  const title = document.getElementById("prompt-title");
  const desc = document.getElementById("prompt-desc");
  const submitBtn = document.getElementById("prompt-submit-btn");
  const textArea = document.getElementById("prompt-text");

  if (title) title.innerText = "رفض طلب انضمام المتجر";
  if (desc) desc.innerText = "أدخل سبب رفض الطلب:";
  if (textArea) textArea.value = "";

  if (submitBtn) {
    submitBtn.onclick = async () => {
      const reason = textArea ? textArea.value.trim() : '';
      if (!reason) {
        if (window.showToast) {
          window.showToast({
            title: 'تنبيه',
            message: 'يرجى كتابة سبب الرفض.',
            type: 'warning'
          });
        }
        return;
      }
      try {
        await ApiClient.post(`/admin/stores/applications/${id}/reject`, { reason });
        if (window.showToast) {
          window.showToast({
            title: 'تم الرفض',
            message: 'تم رفض طلب الانضمام.',
            type: 'info'
          });
        }
        closeModal("prompt-modal");
        closeModal("store-modal");
        loadStores();
      } catch (err) {
        if (window.showToast) {
          window.showToast({
            title: 'خطأ',
            message: err.message || 'فشل تنفيذ الرفض.',
            type: 'error'
          });
        }
      }
    };
  }
  document.getElementById("prompt-modal")?.classList.remove("hidden");
}

async function suspendStore(id) {
  const reason = prompt("يرجى كتابة سبب تعليق المتجر:");
  if (!reason) return;
  try {
    await ApiClient.post(`/admin/stores/${id}/suspend`, { reason });
    if (window.showToast) {
      window.showToast({
        title: 'تم التعليق',
        message: 'تم تعليق المتجر بنجاح.',
        type: 'warning'
      });
    }
    loadStores();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'فشل تعليق المتجر.',
        type: 'error'
      });
    }
  }
}

async function loadUsers() {
  const roleSelect = document.getElementById("user-role-filter");
  const role = roleSelect ? roleSelect.value : '';
  try {
    const res = await ApiClient.get(`/admin/users${role ? '?role=' + role : ''}`);
    usersData = (res && res.success && Array.isArray(res.data) && res.data.length > 0) ? res.data : defaultUsers;
    renderUsersTable(usersData);
  } catch (err) {
    console.warn("Users API error, loaded fallback users:", err);
    usersData = defaultUsers;
    renderUsersTable(usersData);
  }
}

function renderUsersTable(list) {
  const tbody = document.getElementById("admin-users-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  list.forEach(u => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    const isActive = (u.status === 2 || u.statusName === "Active");
    tr.innerHTML = `
      <td class="p-4 font-bold text-slate-900">${u.fullName}</td>
      <td class="p-4 text-slate-600 font-mono text-xs">${u.email}</td>
      <td class="p-4"><span class="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">${u.role}</span></td>
      <td class="p-4">
        ${isActive ? "<span class='bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold'>نشط</span>" : "<span class='bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold'>معلق</span>"}
      </td>
      <td class="p-4">
        ${isActive ? `
          <button type="button" data-action="toggle-user" data-user-action="suspend" data-id="${u.id}" class="text-rose-600 border border-rose-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-50 transition cursor-pointer">تعليق الحساب</button>
        ` : `
          <button type="button" data-action="toggle-user" data-user-action="activate" data-id="${u.id}" class="text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-50 transition cursor-pointer">تفعيل الحساب</button>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function toggleUserStatus(userId, action) {
  if (!confirm(`هل تريد بالتأكيد ${action === 'suspend' ? 'تعليق' : 'تفعيل'} هذا الحساب؟`)) return;
  try {
    await ApiClient.post(`/admin/users/${userId}/${action}`, action === 'suspend' ? { reason: "Admin moderation action" } : {});
    if (window.showToast) {
      window.showToast({
        title: 'تم تحديث الحساب',
        message: `تم ${action === 'suspend' ? 'تعليق' : 'تفعيل'} الحساب بنجاح.`,
        type: 'info'
      });
    }
    loadUsers();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'فشل تحديث حالة الحساب.',
        type: 'error'
      });
    }
  }
}

function searchUsers() {
  const searchInput = document.getElementById("user-search");
  const q = (searchInput?.value || '').toLowerCase().trim();
  const filtered = usersData.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  renderUsersTable(filtered);
}

async function loadCategories() {
  try {
    const res = await ApiClient.categories.tree();
    categoriesTree = (res && res.success && Array.isArray(res.data) && res.data.length > 0) ? res.data : defaultCategories;
    renderCategoriesTree(categoriesTree);
  } catch (err) {
    console.warn("Categories API error, loaded fallback categories:", err);
    categoriesTree = defaultCategories;
    renderCategoriesTree(categoriesTree);
  }
}

function renderCategoriesTree(tree) {
  const container = document.getElementById("categories-tree-container");
  if (!container) return;
  container.innerHTML = "";

  const parentSelect = document.getElementById("cat-parent");
  if (parentSelect) {
    parentSelect.innerHTML = '<option value="">تصنيف رئيسي (Root Category)</option>';
  }

  tree.forEach(cat => {
    if (parentSelect) {
      parentSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    }

    const node = document.createElement("div");
    node.className = "p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2";
    node.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-sm">📁 ${cat.name}</span>
          <span class="text-xs font-mono text-slate-400">(${cat.slug})</span>
          ${cat.isActive ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">نشط</span>' : '<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">غير نشط</span>'}
        </div>
        <div class="flex gap-1.5">
          <button type="button" data-action="toggle-category" data-id="${cat.id}" data-active="${!cat.isActive}" class="text-xs px-2.5 py-1 rounded-lg border font-bold ${cat.isActive ? 'border-amber-300 text-amber-800' : 'border-emerald-300 text-emerald-800'} cursor-pointer">
            ${cat.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button type="button" data-action="delete-category" data-id="${cat.id}" class="text-xs px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 cursor-pointer">حذف</button>
        </div>
      </div>
      ${cat.children && cat.children.length > 0 ? `
        <div class="pr-6 space-y-1.5 pt-2 border-t border-slate-200">
          ${cat.children.map(sub => `
            <div class="flex items-center justify-between text-xs p-2 bg-white rounded-xl border border-slate-100">
              <span>↳ <strong>${sub.name}</strong> <span class="text-slate-400 font-mono">(${sub.slug})</span></span>
              <button type="button" data-action="delete-category" data-id="${sub.id}" class="text-red-500 font-bold cursor-pointer">حذف</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    container.appendChild(node);
  });
}

async function handleSaveCategory(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById("cat-name")?.value.trim() || '',
    slug: document.getElementById("cat-slug")?.value.trim() || '',
    parentId: document.getElementById("cat-parent")?.value || null,
    displayOrder: parseInt(document.getElementById("cat-order")?.value, 10) || 1,
    isActive: true
  };

  try {
    await ApiClient.categories.create(payload);
    if (window.showToast) {
      window.showToast({
        title: 'تم الإنشاء',
        message: 'تم إنشاء التصنيف بنجاح!',
        type: 'success'
      });
    }
    closeModal("category-modal");
    document.getElementById("category-form")?.reset();
    loadCategories();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'فشل الحفظ',
        message: err.message || 'حدث خطأ أثناء حفظ التصنيف.',
        type: 'error'
      });
    }
  }
}

async function toggleCategoryStatus(id, activate) {
  try {
    if (activate) {
      await ApiClient.categories.activate(id);
    } else {
      await ApiClient.categories.deactivate(id);
    }
    if (window.showToast) {
      window.showToast({
        title: 'تم التحديث',
        message: `تم ${activate ? 'تفعيل' : 'تعطيل'} التصنيف بنجاح.`,
        type: 'info'
      });
    }
    loadCategories();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'فشل تحديث حالة التصنيف.',
        type: 'error'
      });
    }
  }
}

async function deleteCategory(id) {
  if (!confirm("هل تريد حذف هذا التصنيف؟ لن يتم الحذف إذا كان يحتوي على تصنيفات فرعية أو منتجات مرتبطة.")) return;
  try {
    await ApiClient.categories.delete(id);
    if (window.showToast) {
      window.showToast({
        title: 'تم الحذف',
        message: 'تم حذف التصنيف بنجاح.',
        type: 'info'
      });
    }
    loadCategories();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'فشل حذف التصنيف.',
        type: 'error'
      });
    }
  }
}

function openCategoryModal() {
  document.getElementById("category-form")?.reset();
  document.getElementById("category-modal")?.classList.remove("hidden");
}

async function loadAuditLogs() {
  const action = document.getElementById("audit-action-filter")?.value || '';
  const entity = document.getElementById("audit-entity-filter")?.value || '';
  const startDate = document.getElementById("audit-start-date")?.value || '';

  try {
    let qs = [];
    if (action) qs.push(`action=${encodeURIComponent(action)}`);
    if (entity) qs.push(`entityType=${encodeURIComponent(entity)}`);
    if (startDate) qs.push(`startDate=${encodeURIComponent(startDate)}`);

    const res = await ApiClient.get(`/admin/audit-logs${qs.length ? '?' + qs.join('&') : ''}`);
    const list = (res && res.success && Array.isArray(res.data) && res.data.length > 0) ? res.data : defaultAuditLogs;
    renderAuditLogs(list);
  } catch (err) {
    console.warn("Audit logs API error, loaded fallback audit logs:", err);
    renderAuditLogs(defaultAuditLogs);
  }
}

function renderAuditLogs(list) {
  const tbody = document.getElementById("admin-audit-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach(a => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-3.5 text-slate-500">${a.timestamp}</td>
      <td class="p-3.5 text-slate-800 font-bold font-sans">${a.userName}</td>
      <td class="p-3.5 text-blue-700 font-bold">${a.action}</td>
      <td class="p-3.5 text-slate-600">${a.entityType}</td>
      <td class="p-3.5 font-sans">
        <button type="button" data-action="view-diff" data-old='${JSON.stringify(a.oldValues || "null")}' data-new='${JSON.stringify(a.newValues || "null")}' class="bg-[#e9f2ef] text-[#184336] border border-[#184336]/20 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-[#d8e8e3] transition cursor-pointer">
          عرض الفروقات (Diff)
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function viewAuditDiff(oldVal, newVal) {
  const oldEl = document.getElementById("audit-old-val");
  const newEl = document.getElementById("audit-new-val");
  if (oldEl) oldEl.innerText = typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal, null, 2);
  if (newEl) newEl.innerText = typeof newVal === 'string' ? newVal : JSON.stringify(newVal, null, 2);
  document.getElementById("audit-modal")?.classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

window.switchTab = switchTab;
window.filterStores = filterStores;
window.openStoreDetails = openStoreDetails;
window.openCategoryModal = openCategoryModal;
window.closeModal = closeModal;
