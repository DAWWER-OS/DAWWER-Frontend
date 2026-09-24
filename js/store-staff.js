let activeStoreId = null;
let rolesList = [];

const defaultStaff = [
  { id: "st-1", fullName: "أحمد سليم (المالك)", email: "owner@market.com", phoneNumber: "+966501112233", roleName: "مدير المتجر", isActive: true },
  { id: "st-2", fullName: "خالد عبد الرحيم", email: "khalid@market.com", phoneNumber: "+966552233445", roleName: "أمين الصندوق والطلبات", isActive: true }
];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth(["Merchant", 2, "Admin", 4, "Staff", 3]);
  }

  const openStaffBtn = document.getElementById('open-staff-modal-btn');
  if (openStaffBtn) {
    openStaffBtn.addEventListener('click', openAddStaffModal);
  }

  const openRoleBtn = document.getElementById('open-role-modal-btn');
  if (openRoleBtn) {
    openRoleBtn.addEventListener('click', openAddRoleModal);
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      if (modalId) closeModal(modalId);
    });
  });

  const staffForm = document.getElementById('add-staff-form');
  if (staffForm) {
    staffForm.addEventListener('submit', handleCreateStaff);
  }

  const roleForm = document.getElementById('create-role-form');
  if (roleForm) {
    roleForm.addEventListener('submit', handleCreateRole);
  }

  const staffTable = document.getElementById('staff-table-body');
  if (staffTable) {
    staffTable.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="remove-staff"]');
      if (delBtn) {
        const staffId = delBtn.getAttribute('data-id');
        if (staffId) removeStaff(staffId);
      }
    });
  }

  initStaffPage();
});

async function initStaffPage() {
  const store = (typeof Auth !== 'undefined' && Auth.getActiveStore) ? Auth.getActiveStore() : null;
  if (store && store.storeId) {
    activeStoreId = store.storeId;
  } else {
    try {
      const res = await ApiClient.get("/merchant/stores");
      if (res && res.data && res.data.length > 0) {
        activeStoreId = res.data[0].id;
      }
    } catch(e) {}
  }

  if (!activeStoreId) {
    const tbody = document.getElementById("staff-table-body");
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="6" class="p-8 text-center text-slate-500">
          يرجى <a href="merchant-application.html" class="text-[#1c5335] font-bold underline">تسجيل متجرك أولاً</a> لتتمكن من إدارة فريق العمل.
        </td></tr>
      `;
    }
    return;
  }

  await loadRoles();
  await loadStaff();
}

async function loadRoles() {
  try {
    const res = await ApiClient.get(`/stores/${activeStoreId}/roles`);
    rolesList = (res && res.success && res.data) ? res.data : [
      { id: "1", name: "مدير المتجر (Store Manager)", permissions: ["Products.Manage", "Orders.Manage", "Inventory.Manage", "Staff.Manage"] },
      { id: "2", name: "أمين الصندوق والطلبات (Order Dispatcher)", permissions: ["Orders.View", "Orders.Manage", "Inventory.View"] },
      { id: "3", name: "مسؤول المخزون والرفوف", permissions: ["Products.View", "Inventory.View", "Inventory.Manage"] }
    ];

    const select = document.getElementById("staff-role-select");
    if (select) {
      select.innerHTML = '<option value="">اختر الدور...</option>';
      rolesList.forEach(r => {
        select.innerHTML += `<option value="${r.id}">${r.name}</option>`;
      });
    }

    renderRolesMatrix();
  } catch (err) {
    console.warn("Failed to load roles from API:", err);
  }
}

function renderRolesMatrix() {
  const container = document.getElementById("roles-matrix-container");
  if (!container) return;
  container.innerHTML = "";

  rolesList.forEach(r => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <h4 class="font-bold text-slate-800 text-sm mb-1">${r.name}</h4>
        <p class="text-xs text-slate-500 mb-3">${r.description || "صلاحيات مخصصة للعمليات"}</p>
        <div class="flex flex-wrap gap-1.5">
          ${(r.permissions || []).map(p => `<span class="bg-[#edf5f0] text-[#1c5335] border border-[#1c5335]/15 text-[10px] font-bold px-2 py-0.5 rounded">${p}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function loadStaff() {
  let list = defaultStaff;
  try {
    const res = await ApiClient.get(`/stores/${activeStoreId}/staff`);
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      list = res.data;
    }
  } catch (err) {
    console.warn("Staff API error, loaded fallback staff:", err);
  }

  const countEl = document.getElementById("staff-count");
  if (countEl) countEl.innerText = `${list.length} عضو`;

  const tbody = document.getElementById("staff-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  list.forEach(m => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-4 font-bold text-slate-900">${m.fullName}</td>
      <td class="p-4 text-slate-600 font-mono text-xs">${m.email}</td>
      <td class="p-4 text-slate-600">${m.phoneNumber || "-"}</td>
      <td class="p-4"><span class="bg-[#d6a950]/15 text-[#916b1f] text-xs px-2.5 py-1 rounded-full font-bold">${m.roleName || "موظف"}</span></td>
      <td class="p-4"><span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">نشط</span></td>
      <td class="p-4">
        <button type="button" data-action="remove-staff" data-id="${m.id}" class="text-rose-600 hover:text-rose-800 text-xs font-bold border border-rose-200 px-2.5 py-1 rounded-lg transition hover:bg-rose-50 cursor-pointer">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleCreateStaff(event) {
  event.preventDefault();
  const btn = document.getElementById("save-staff-btn");
  if (btn) {
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;
  }

  const payload = {
    fullName: document.getElementById("staff-name")?.value.trim() || '',
    email: document.getElementById("staff-email")?.value.trim() || '',
    phoneNumber: document.getElementById("staff-phone")?.value.trim() || '',
    storeRoleId: document.getElementById("staff-role-select")?.value || '',
    temporaryPassword: document.getElementById("staff-temp-pass")?.value || ''
  };

  try {
    await ApiClient.post(`/stores/${activeStoreId}/staff`, payload);
    if (window.showToast) {
      window.showToast({
        title: 'تمت إضافة الموظف',
        message: 'تمت إضافة الموظف وإرسال بيانات الدخول بنجاح.',
        type: 'success'
      });
    }
    closeModal("staff-modal");
    document.getElementById("add-staff-form")?.reset();
    loadStaff();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'فشل إضافة الموظف',
        message: err.message || 'حدث خطأ أثناء إضافة الموظف.',
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "حفظ وإرسال الدعوة";
      btn.disabled = false;
    }
  }
}

async function handleCreateRole(event) {
  event.preventDefault();
  const btn = document.getElementById("save-role-btn");
  if (btn) {
    btn.innerText = "جاري الإنشاء...";
    btn.disabled = true;
  }

  const checkedBoxes = document.querySelectorAll('input[name="role-perms"]:checked');
  const permissionCodes = Array.from(checkedBoxes).map(cb => cb.value);

  const payload = {
    name: document.getElementById("role-name")?.value.trim() || '',
    description: document.getElementById("role-desc")?.value.trim() || '',
    permissionCodes
  };

  try {
    await ApiClient.post(`/stores/${activeStoreId}/roles`, payload);
    if (window.showToast) {
      window.showToast({
        title: 'تم إنشاء الدور',
        message: 'تم إنشاء الدور الوظيفي بنجاح.',
        type: 'success'
      });
    }
    closeModal("role-modal");
    document.getElementById("create-role-form")?.reset();
    loadRoles();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'فشل إنشاء الدور',
        message: err.message || 'حدث خطأ أثناء إنشاء الدور.',
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "إنشاء الدور";
      btn.disabled = false;
    }
  }
}

async function removeStaff(staffId) {
  if (!confirm("هل أنت متأكد من رغبتك في إزالة هذا الموظف من المتجر؟")) return;
  try {
    await ApiClient.delete(`/stores/${activeStoreId}/staff/${staffId}`);
    if (window.showToast) {
      window.showToast({
        title: 'تم الحذف',
        message: 'تم حذف الموظف من المتجر بنجاح.',
        type: 'info'
      });
    }
    loadStaff();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'حدث خطأ أثناء حذف الموظف.',
        type: 'error'
      });
    }
  }
}

function openAddStaffModal() {
  document.getElementById("staff-modal")?.classList.remove("hidden");
}

function openAddRoleModal() {
  document.getElementById("role-modal")?.classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

window.openAddStaffModal = openAddStaffModal;
window.openAddRoleModal = openAddRoleModal;
window.closeModal = closeModal;
