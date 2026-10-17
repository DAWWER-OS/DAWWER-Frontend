let activeStoreId = null;
let rolesList = [];
let staffList = [];
let editingRoleId = null;
let editingStaffId = null;
let scopeSupported = false;
let scopeZones = [];
let scopeMessage = 'جارٍ تحميل الزونات…';
let scopeLoadVersion = 0;
const permissionLabels = {
  'Products.View': 'عرض المنتجات', 'Products.Manage': 'إدارة المنتجات',
  'Inventory.View': 'عرض المخزون', 'Inventory.Manage': 'إدارة المخزون',
  'Orders.View': 'عرض الطلبات', 'Orders.Manage': 'إدارة الطلبات',
  'Staff.Manage': 'إدارة الموظفين', 'Store.Manage': 'إدارة المتجر'
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const listFrom = response => { const data = response?.data ?? response; if (!Array.isArray(data)) throw new Error('تعذر قراءة بيانات الفريق من الخادم.'); return data; };
const permissionsOf = role => (role.permissionCodes || role.permissions || []).map(p => typeof p === 'string' ? p : p.code || p.permissionCode).filter(Boolean);
function showError(id, message) { const el = document.getElementById(id); if (!el) return; el.classList.toggle('hidden', !message); (el.querySelector('span') || el).textContent = message; }
function canManageStaff() { return (Auth.hasRole(2) || Auth.hasRole(4)) || Auth.hasPermission('Staff.Manage'); }
function requireStaffContext() { if (!activeStoreId || !canManageStaff()) throw new Error('ليس لديك صلاحية إدارة فريق هذا المتجر.'); }

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth(['Merchant', 2, 'Admin', 4, 'Staff', 3]);
  document.getElementById('open-staff-modal-btn')?.addEventListener('click', openAddStaffModal);
  document.getElementById('open-role-modal-btn')?.addEventListener('click', () => openAddRoleModal());
  document.getElementById('retry-staff-btn')?.addEventListener('click', initStaffPage);
  document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  document.getElementById('add-staff-form')?.addEventListener('submit', handleCreateStaff);
  document.getElementById('create-role-form')?.addEventListener('submit', handleCreateRole);
  document.getElementById('staff-access-form')?.addEventListener('submit', handleUpdateStaffAccess);
  for (const prefix of ['staff', 'edit-staff']) document.getElementById(`${prefix}-access-scope`)?.addEventListener('change', () => updateScopeVisibility(prefix));
  document.querySelectorAll('[data-reload-scope]').forEach(btn => btn.addEventListener('click', loadScopeOptions));
  document.getElementById('staff-table-body')?.addEventListener('click', event => {
    const btn = event.target.closest('[data-action="remove-staff"]');
    if (btn) removeStaff(btn.dataset.id);
    const edit = event.target.closest('[data-edit-staff]');
    if (edit) openStaffAccessModal(edit.dataset.editStaff);
  });
  document.getElementById('roles-matrix-container')?.addEventListener('click', event => {
    const btn = event.target.closest('[data-edit-role]');
    if (btn) openAddRoleModal(btn.dataset.editRole);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') ['staff-modal', 'staff-access-modal', 'role-modal'].forEach(closeModal); });
  initStaffPage();
});

async function initStaffPage() {
  showError('staff-page-error', '');
  activeStoreId = CONFIG.getActiveStoreId() || Auth.getActiveStore()?.storeId;
  const allowed = Boolean(activeStoreId && canManageStaff());
  for (const id of ['open-staff-modal-btn', 'open-role-modal-btn']) document.getElementById(id).disabled = !allowed;
  if (!allowed) { showError('staff-page-error', activeStoreId ? 'ليس لديك صلاحية إدارة الفريق.' : 'اختر متجرًا أولًا من صفحة المتاجر.'); return; }
  const results = await Promise.allSettled([loadRoles(), loadStaff(), loadScopeOptions()]);
  const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
  if (results[1].status === 'fulfilled') renderStaffTable();
  if (errors.length) showError('staff-page-error', errors.join(' — '));
}
async function loadRoles() {
  try {
    rolesList = listFrom(await ApiClient.get(`/stores/${encodeURIComponent(activeStoreId)}/roles`));
    const select = document.getElementById('staff-role-select');
    select.innerHTML = '<option value="">اختر الدور...</option>' + rolesList.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    select.disabled = !rolesList.length;
    renderRolesMatrix();
  } catch (error) {
    rolesList = [];
    document.getElementById('staff-role-select').innerHTML = '<option value="">تعذر تحميل الأدوار</option>';
    document.getElementById('staff-role-select').disabled = true;
    document.getElementById('roles-matrix-container').textContent = 'تعذر تحميل الأدوار.';
    throw error;
  }
}
function renderRolesMatrix() {
  document.getElementById('roles-matrix-container').innerHTML = rolesList.length ? rolesList.map(r => `
    <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div class="flex items-center justify-between gap-2"><h3 class="font-bold text-sm">${esc(r.name)}</h3>${r.isSystemRole ? '<span class="text-xs text-slate-500">دور أساسي</span>' : `<button type="button" data-edit-role="${esc(r.id)}" class="text-xs underline text-[#1c5335]">تعديل</button>`}</div>
      ${r.description ? `<p class="text-xs text-slate-500 mt-2">${esc(r.description)}</p>` : ''}
      <div class="flex flex-wrap gap-2 mt-3">${permissionsOf(r).map(code => `<span class="text-xs px-2 py-1 rounded-lg bg-[#edf5f0] text-[#1c5335]">${esc(permissionLabels[code] || code)}</span>`).join('') || '<span class="text-xs text-slate-500">لا توجد صلاحيات</span>'}</div>
    </div>`).join('') : '<p class="text-sm text-slate-500">لا توجد أدوار. أنشئ دورًا لإضافة موظف.</p>';
}
async function loadStaff() {
  try {
    staffList = listFrom(await ApiClient.get(`/stores/${encodeURIComponent(activeStoreId)}/staff`));
    renderStaffTable();
  } catch (error) {
    staffList = [];
    document.getElementById('staff-count').textContent = '—';
    document.getElementById('staff-table-body').innerHTML = '<tr><td colspan="7" class="p-8 text-center text-rose-600">تعذر تحميل الموظفين.</td></tr>';
    throw error;
  }
}
function scopeLabel(member) {
  if (member.accessScope === 'Store') return 'المتجر كاملًا';
  if (member.accessScope === 'Zones') {
    return (member.zoneIds || []).map(id => scopeZones.find(zone => zone.id === id)?.name || 'زون غير متاح').join('، ') || 'لم تُحدد زونات';
  }
  return scopeSupported ? 'غير محدد' : 'المتجر كاملًا';
}
function renderStaffTable() {
  document.getElementById('staff-count').textContent = `${staffList.length} عضو`;
  const statuses = { Active: 'نشط', Inactive: 'غير نشط', Suspended: 'موقوف', Pending: 'قيد الانتظار', 1: 'نشط', 2: 'غير نشط', 3: 'موقوف' };
  document.getElementById('staff-table-body').innerHTML = staffList.map(m => `<tr class="border-b border-slate-100">
    <td class="p-4 font-bold">${esc(m.fullName || '—')}</td><td class="p-4 text-xs" dir="ltr">${esc(m.email)}</td>
    <td class="p-4 text-xs" dir="ltr">${esc(m.phoneNumber || '—')}</td><td class="p-4">${esc(m.roleName || rolesList.find(r => r.id === m.storeRoleId)?.name || '—')}</td>
    <td class="p-4 text-xs">${esc(scopeLabel(m))}</td><td class="p-4">${esc(statuses[m.status] || m.status || 'غير محدد')}</td>
    <td class="p-4"><div class="flex gap-3"><button type="button" data-edit-staff="${esc(m.id)}" class="text-[#1c5335] underline text-xs">تعديل الصلاحيات</button><button type="button" data-action="remove-staff" data-id="${esc(m.id)}" class="text-rose-600 underline text-xs">إزالة</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="p-8 text-center text-slate-500">لا يوجد موظفون. أضف أول موظف.</td></tr>';
}
async function loadScopeOptions() {
  if (!activeStoreId || !canManageStaff()) return;
  const version = ++scopeLoadVersion;
  const storeId = activeStoreId;
  scopeSupported = false; scopeMessage = 'جارٍ تحميل الزونات…';
  renderScopeOptions();
  try {
    const response = await ApiClient.get(`/stores/${encodeURIComponent(storeId)}/staff/scope-options`);
    const zones = StaffScope.options(response);
    if (version !== scopeLoadVersion || storeId !== activeStoreId) return;
    scopeZones = zones; scopeSupported = true;
    scopeMessage = zones.length ? 'اختر زونًا أو أكثر.' : 'لا توجد زونات متاحة في هذا المتجر.';
  } catch (error) {
    if (version !== scopeLoadVersion || storeId !== activeStoreId) return;
    scopeZones = []; scopeSupported = false;
    scopeMessage = [404, 405, 501].includes(error.status) ? 'تخصيص الزونات غير متاح حاليًا.' : 'تعذر تحميل الزونات. أعد المحاولة.';
  }
  renderScopeOptions();
}
function renderScopeOptions() {
  for (const prefix of ['staff', 'edit-staff']) {
    const container = document.getElementById(`${prefix}-zone-options`);
    const selected = new Set(Array.from(container.querySelectorAll('input:checked'), input => input.value));
    container.innerHTML = scopeZones.map(zone => `<label class="flex items-center gap-2 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm"><input type="checkbox" name="${prefix}-zone" value="${esc(zone.id)}" ${selected.has(zone.id) ? 'checked' : ''} ${scopeSupported ? '' : 'disabled'} class="accent-[#1c5335] w-4 h-4"><span>${esc(zone.name)}</span></label>`).join('');
    document.getElementById(`${prefix}-scope-status`).textContent = scopeMessage;
    updateScopeVisibility(prefix);
  }
}
function updateScopeVisibility(prefix) {
  const isZones = document.getElementById(`${prefix}-access-scope`).value === 'Zones';
  document.getElementById(`${prefix}-zones-panel`).classList.toggle('hidden', !isZones);
}
function setScopeForm(prefix, member = null) {
  document.getElementById(`${prefix}-access-scope`).value = member?.accessScope === 'Zones' ? 'Zones' : 'Store';
  document.querySelectorAll(`input[name="${prefix}-zone"]`).forEach(input => { input.checked = (member?.zoneIds || []).includes(input.value); });
  updateScopeVisibility(prefix);
}
function readScopeForm(prefix) {
  return StaffScope.payload(document.getElementById(`${prefix}-access-scope`).value,
    Array.from(document.querySelectorAll(`input[name="${prefix}-zone"]:checked`), input => input.value), scopeZones, scopeSupported);
}
function openStaffAccessModal(id) {
  if (!activeStoreId || !canManageStaff()) return;
  const member = staffList.find(m => m.id === id); if (!member) return;
  editingStaffId = id;
  document.getElementById('staff-access-name').textContent = member.fullName || member.email;
  document.getElementById('edit-staff-role').innerHTML = '<option value="">اختر الدور...</option>' + rolesList.map(role => `<option value="${esc(role.id)}">${esc(role.name)}</option>`).join('');
  document.getElementById('edit-staff-role').value = member.storeRoleId || '';
  setScopeForm('edit-staff', member);
  showError('staff-access-error', '');
  document.getElementById('staff-access-modal').classList.remove('hidden');
  document.getElementById('edit-staff-role').focus();
}
async function handleUpdateStaffAccess(event) {
  event.preventDefault();
  const btn = document.getElementById('save-staff-access-btn'); if (btn.disabled) return;
  showError('staff-access-error', '');
  try {
    requireStaffContext();
    if (!editingStaffId || !scopeSupported) throw new Error('تعديل نطاق العمل يحتاج تفعيل تخصيص الزونات من الخادم.');
    const storeRoleId = document.getElementById('edit-staff-role').value;
    if (!rolesList.some(role => role.id === storeRoleId)) throw new Error('اختر دورًا محفوظًا في المتجر.');
    const scope = readScopeForm('edit-staff');
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
    const result = await ApiClient.put(`/stores/${encodeURIComponent(activeStoreId)}/staff/${encodeURIComponent(editingStaffId)}`, { storeRoleId, ...scope });
    if (!StaffScope.confirmed(result, scope)) throw new Error('لم يؤكد الخادم حفظ نطاق العمل. حدّث بيانات الموظف وتحقق من التعيين.');
    closeModal('staff-access-modal'); await initStaffPage();
    window.showToast?.({title:'تم حفظ الصلاحيات', message:'تم تحديث الدور ونطاق العمل.', type:'success'});
  } catch (error) { showError('staff-access-error', error.message); }
  finally { btn.disabled = false; btn.textContent = 'حفظ التعديلات'; }
}
async function handleCreateStaff(event) {
  event.preventDefault(); const btn = document.getElementById('save-staff-btn'); if (btn.disabled) return;
  showError('staff-form-error', '');
  try {
    requireStaffContext();
    const payload = { fullName: document.getElementById('staff-name').value.trim(), email: document.getElementById('staff-email').value.trim(), phoneNumber: document.getElementById('staff-phone').value.trim() || null, storeRoleId: document.getElementById('staff-role-select').value, temporaryPassword: document.getElementById('staff-temp-pass').value };
    if (!rolesList.some(r => r.id === payload.storeRoleId)) throw new Error('اختر دورًا محفوظًا في المتجر أولًا.');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,100}$/.test(payload.temporaryPassword)) throw new Error('كلمة المرور: 8 خانات على الأقل، وحرف كبير وصغير ورقم ورمز.');
    const scope = readScopeForm('staff');
    Object.assign(payload, scope);
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ...';
    const result = await ApiClient.post(`/stores/${encodeURIComponent(activeStoreId)}/staff`, payload);
    const confirmed = StaffScope.confirmed(result, scope);
    closeModal('staff-modal'); document.getElementById('add-staff-form').reset();
    await initStaffPage();
    if (confirmed) window.showToast?.({title:'تمت إضافة الموظف',message:'تم حفظ حساب الموظف.',type:'success'});
    else showError('staff-page-error', 'تم إنشاء الحساب لكن الخادم لم يؤكد نطاق العمل. راجع صلاحيات الموظف قبل استخدام الحساب.');
  } catch (error) { showError('staff-form-error', error.message); }
  finally { btn.disabled = false; btn.textContent = 'إضافة الموظف'; }
}
async function handleCreateRole(event) {
  event.preventDefault(); const btn = document.getElementById('save-role-btn'); if (btn.disabled) return;
  showError('role-form-error', '');
  try {
    requireStaffContext();
    const permissionCodes = Array.from(document.querySelectorAll('input[name="role-perms"]:checked'), cb => cb.value);
    const existing = rolesList.find(role => role.id === editingRoleId);
    const visibleCodes = new Set(Array.from(document.querySelectorAll('input[name="role-perms"]'), cb => cb.value));
    const preservedCodes = existing ? permissionsOf(existing).filter(code => !visibleCodes.has(code)) : [];
    const payload = { name: document.getElementById('role-name').value.trim(), description: document.getElementById('role-desc').value.trim(), permissionCodes: [...new Set([...permissionCodes, ...preservedCodes])] };
    if (payload.name.length < 2 || !permissionCodes.length) throw new Error('أدخل اسم الدور واختر صلاحية واحدة على الأقل.');
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ...';
    const endpoint = `/stores/${encodeURIComponent(activeStoreId)}/roles`;
    if (editingRoleId) await ApiClient.put(`${endpoint}/${encodeURIComponent(editingRoleId)}`, payload);
    else await ApiClient.post(endpoint, payload);
    closeModal('role-modal'); await initStaffPage();
  } catch (error) { showError('role-form-error', error.message); }
  finally { btn.disabled = false; btn.textContent = editingRoleId ? 'حفظ التعديلات' : 'إنشاء الدور'; }
}
async function removeStaff(id) {
  try { requireStaffContext(); if (!confirm('إزالة هذا الموظف من المتجر؟')) return; await ApiClient.delete(`/stores/${encodeURIComponent(activeStoreId)}/staff/${encodeURIComponent(id)}`); await initStaffPage(); }
  catch (error) { showError('staff-page-error', error.message); }
}
function openAddStaffModal() { if (!activeStoreId || !canManageStaff()) return; showError('staff-form-error', ''); setScopeForm('staff'); document.getElementById('staff-modal').classList.remove('hidden'); document.getElementById('staff-name').focus(); }
function openAddRoleModal(id = null) {
  if (!activeStoreId || !canManageStaff()) return;
  const role = rolesList.find(r => r.id === id); if (id && (!role || role.isSystemRole)) return;
  editingRoleId = id; document.getElementById('create-role-form').reset();
  document.getElementById('role-name').value = role?.name || ''; document.getElementById('role-desc').value = role?.description || '';
  document.querySelectorAll('input[name="role-perms"]').forEach(cb => cb.checked = role ? permissionsOf(role).includes(cb.value) : false);
  document.getElementById('save-role-btn').textContent = role ? 'حفظ التعديلات' : 'إنشاء الدور';
  showError('role-form-error', ''); document.getElementById('role-modal').classList.remove('hidden'); document.getElementById('role-name').focus();
}
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
