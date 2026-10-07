/**
 * DawwerOS Admin Dashboard
 * Strictly connected to DawwerOS Backend API (https://dawwer.runasp.net/api)
 * Features:
 * 1. Admin Authentication & Headers (Bearer token from localStorage['accessToken'], 403 Forbidden notification)
 * 2. Store Applications Review (/api/admin/stores)
 * 3. User Management (/api/admin/users)
 * 4. Category Governance (/api/admin/categories)
 * 5. Audit Logs (/api/admin/audit-logs)
 * 6. Standard ApiResponse wrapper ({ success, data, errors, message }) handling & 400 Bad Request error array displays
 */

(function () {
  'use strict';

  // Top of Lifecycle Guard: Immediate Admin Verification before any state initialization or data fetching
  if (!verifyAdminAuthentication()) {
    return;
  }

  // Application State
  const state = {
    currentTab: 'stores',

    // Stores Review State
    stores: {
      data: [],
      filterStatus: 'all',
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 1,
      selectedApp: null
    },

    // Users State
    users: {
      data: [],
      role: '',
      status: '',
      search: '',
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 1
    },

    // Categories State
    categories: {
      tree: [],
      list: [],
      editingCategory: null
    },

    // Audit Logs State
    audit: {
      data: [],
      action: '',
      entityType: '',
      startDate: '',
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 1
    }
  };

  // Store applications will strictly be loaded dynamically from GET /api/admin/stores/applications
  const fallbackStores = [];

  const fallbackUsers = [
    { id: "u-101", fullName: "مدير النظام العام", email: "admin@dawwer.com", role: "Admin", status: 2, statusName: "Active" },
    { id: "u-102", fullName: "عبدالله التاجر", email: "merchant@dawwer.com", role: "Merchant", status: 2, statusName: "Active" },
    { id: "u-103", fullName: "سارة الزبون", email: "sarah.customer@gmail.com", role: "Customer", status: 3, statusName: "Suspended" }
  ];

  const fallbackCategories = [
    { id: "cat-1", name: "خضار وفواكه طازجة", slug: "fresh-produce", description: "أصناف الخضار والفاكهة اليومية", isActive: true, displayOrder: 1, children: [
      { id: "cat-11", name: "فواكه موسمية", slug: "seasonal-fruits", parentId: "cat-1", isActive: true, displayOrder: 1 },
      { id: "cat-12", name: "ورقيات وأعشاب", slug: "fresh-herbs", parentId: "cat-1", isActive: true, displayOrder: 2 }
    ]},
    { id: "cat-2", name: "ألبان وأجبان وبيض", slug: "dairy-and-eggs", description: "منتجات الحليب والأجبان والبيض", isActive: true, displayOrder: 2, children: [
      { id: "cat-21", name: "حليب طازج وطويل الأجل", slug: "fresh-milk", parentId: "cat-2", isActive: true, displayOrder: 1 }
    ]},
    { id: "cat-3", name: "مخبوزات وحلويات", slug: "bakery", description: "الخبز والمعجنات اليومية", isActive: true, displayOrder: 3, children: [] }
  ];

  const fallbackAudit = [
    { id: "aud-1", timestamp: "2026-09-27 08:30:14", userName: "admin@dawwer.com", action: "ApproveStore", entityType: "StoreApplication", oldValues: '{"verificationStatus": 2}', newValues: '{"verificationStatus": 5}' },
    { id: "aud-2", timestamp: "2026-09-27 07:15:02", userName: "admin@dawwer.com", action: "SuspendUser", entityType: "UserAccount", oldValues: '{"status": "Active"}', newValues: '{"status": "Suspended", "reason": "مخالفة الشروط"}' }
  ];

  // =========================================================================
  // Initialization & Authentication Verification
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify Admin Token & Role before initializing UI or fetching data
    if (!verifyAdminAuthentication()) return;

    // 2. Setup Navigation Controls
    setupTabControls();

    // 3. Setup Stores Review Controls
    setupStoresControls();

    // 4. Setup User Management Controls
    setupUsersControls();

    // 5. Setup Category Governance Controls
    setupCategoriesControls();

    // 6. Setup Audit Logs Controls
    setupAuditControls();

    // 7. Setup Modal Backdrop Controls
    setupModals();

    // 8. Load initial tab
    switchTab('stores');
  });

  /**
   * Verifies that the user has a valid accessToken and strictly role === 4 (or "Admin").
   * If missing, invalid, or not an Admin, immediately redirects: window.location.replace('/admin-login.html')
   * @returns {boolean} True if authenticated admin, false otherwise
   */
  function verifyAdminAuthentication() {
    const loginTarget = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:')
      ? 'login.html?unauthorized=true'
      : '/login.html?unauthorized=true';

    function failAndRedirect(msg) {
      console.warn('[Admin Dashboard] Auth check failed:', msg);
      try {
        sessionStorage.setItem('dawwer_pending_toast', JSON.stringify({
          title: 'تنبيه أمني',
          message: msg,
          type: 'warning'
        }));
      } catch (e) {}
      window.location.replace(loginTarget);
      return false;
    }

    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('dawwer_access_token');
    if (!token || token === 'null' || token === 'undefined' || typeof token !== 'string' || token.trim() === '') {
      return failAndRedirect('يرجى تسجيل الدخول بحساب مسؤول للوصول إلى لوحة الإدارة.');
    }

    // Check token expiration if JWT
    let tokenRole = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
        if (payload.exp && (payload.exp * 1000) < Date.now()) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('dawwer_access_token');
          return failAndRedirect('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.');
        }
        tokenRole = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
      }
    } catch (e) {
      console.warn('[Admin Dashboard] Could not parse JWT payload:', e);
    }

    // Check user role from Auth helper or localStorage
    let userRole = null;
    if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
      const authUser = Auth.getUser();
      if (authUser && authUser.role !== undefined && authUser.role !== null) {
        userRole = authUser.role;
      }
    }

    if (userRole === null || userRole === undefined) {
      try {
        const raw = localStorage.getItem('dawwer_user_data') || localStorage.getItem('user') || localStorage.getItem('userData');
        if (raw) {
          const user = JSON.parse(raw);
          userRole = user ? (user.role ?? user.Role) : null;
        }
      } catch (e) {
        console.warn('[Admin Dashboard] Could not parse stored user profile:', e);
      }
    }

    if (userRole === null || userRole === undefined) {
      userRole = tokenRole;
    }

    const roleStr = Array.isArray(userRole) ? userRole.join(',') : String(userRole ?? '');
    const isAdmin = (
      userRole === 4 ||
      userRole === '4' ||
      /admin|superadmin|administrator/i.test(roleStr) ||
      (typeof CONFIG !== 'undefined' && CONFIG.ROLES && (userRole === CONFIG.ROLES.ADMIN || userRole === String(CONFIG.ROLES.ADMIN)))
    );

    if (!isAdmin) {
      return failAndRedirect('غير مصرح: هذا الحساب لا يملك صلاحيات مسؤول للوصول إلى لوحة الإدارة.');
    }

    return true;
  }

  // =========================================================================
  // Tab Switching & Header Coordination
  // =========================================================================
  function setupTabControls() {
    // Slim Sidebar buttons ([data-tab])
    document.querySelectorAll('#sidebar-box [data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Top Header Pill tabs (.header-tab-btn)
    document.querySelectorAll('.header-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });
  }

  function switchTab(tab) {
    state.currentTab = tab;

    // Toggle Content Panels
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const targetPanel = document.getElementById(`tab-${tab}`);
    if (targetPanel) targetPanel.classList.remove('hidden');

    // Update Slim Sidebar Buttons
    document.querySelectorAll('#sidebar-box [data-tab]').forEach(b => {
      b.classList.remove('active', 'active-tab', 'text-white', 'bg-white/20');
      b.classList.add('text-white/70');
    });
    const sidebarBtn = document.getElementById(`tab-btn-${tab}`);
    if (sidebarBtn) {
      sidebarBtn.classList.add('active', 'active-tab', 'text-white', 'bg-white/20');
      sidebarBtn.classList.remove('text-white/70');
    }

    // Update Header Pill Buttons
    document.querySelectorAll('.header-tab-btn').forEach(b => {
      b.classList.remove('active-admin-tab');
      b.classList.add('text-slate-600');
    });
    const headerPill = document.getElementById(`header-tab-${tab}`);
    if (headerPill) {
      headerPill.classList.add('active-admin-tab');
      headerPill.classList.remove('text-slate-600');
    }

    // Update Page Header Titles
    const titleMap = {
      stores: { title: "طلبات انضمام المتاجر", subtitle: "مراجعة واعتماد طلبات المتاجر المسجلة في منصة دوّر" },
      users: { title: "إدارة المستخدمين والحسابات", subtitle: "إدارة الحسابات وصلاحيات التعليق والتفعيل (/api/admin/users)" },
      categories: { title: "شجرة التصنيفات المركزية", subtitle: "حوكمة التصنيفات والأقسام على المنصة (/api/admin/categories)" },
      audit: { title: "سجلات التدقيق والأمان", subtitle: "تتبع جميع العمليات والتغييرات الحساسة (/api/admin/audit-logs)" }
    };

    const titleEl = document.getElementById("page-title");
    const subEl = document.getElementById("page-subtitle");
    if (titleEl && titleMap[tab]) titleEl.innerText = titleMap[tab].title;
    if (subEl && titleMap[tab]) subEl.innerText = titleMap[tab].subtitle;

    // Trigger data fetching for current tab
    if (tab === 'stores') loadStores();
    if (tab === 'users') loadUsers();
    if (tab === 'categories') loadCategories();
    if (tab === 'audit') loadAuditLogs();
  }

  // =========================================================================
  // 1. Store Applications Review (/api/admin/stores)
  // Endpoints:
  // - GET  /api/admin/stores/applications?status={status}&page={page}&pageSize={pageSize}
  // - GET  /api/admin/stores/applications/{id}
  // - POST /api/admin/stores/applications/{id}/start-review
  // - POST /api/admin/stores/applications/{id}/request-info (body: { "message": string })
  // - POST /api/admin/stores/applications/{id}/approve
  // - POST /api/admin/stores/applications/{id}/reject (body: { "reason": string })
  // - POST /api/admin/stores/{id}/suspend (body: { "reason": string })
  // - POST /api/admin/stores/{id}/activate
  // =========================================================================
  const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  /**
   * Helper to verify if an ID string is a valid GUID.
   * Strictly prevents sending mock IDs ("app-102", "store-102") to backend endpoints.
   */
  function isValidGuid(id) {
    if (!id || typeof id !== 'string') return false;
    const clean = id.trim();
    return GUID_REGEX.test(clean);
  }

  /**
   * Normalizes store application data dynamically from GET /api/admin/stores/applications response.
   * Extracts the actual GUIDs:
   *  - id: application GUID
   *  - storeId: store GUID (falls back to application GUID if unified)
   */
  function normalizeStoreApplication(app) {
    if (!app || typeof app !== 'object') return null;

    // 1. Dynamic GUID binding:
    // Extract actual dynamic application ID / store ID GUIDs from the backend response
    const id = app.id || app.Id || app.applicationId || app.ApplicationId || app.storeApplicationId || app.storeId || app.StoreId || '';
    const storeId = app.storeId || app.StoreId || app.store_id || (app.store && (app.store.id || app.store.storeId)) || id;

    // 2. Map verification status & status names
    let verificationStatus = 2; // Default: Submitted
    let statusName = 'Submitted';

    const rawStatus = app.verificationStatus !== undefined ? app.verificationStatus : (app.VerificationStatus !== undefined ? app.VerificationStatus : (app.status || app.Status));

    if (typeof rawStatus === 'number') {
      verificationStatus = rawStatus;
      const statusMap = {
        1: 'Draft',
        2: 'Submitted',
        3: 'UnderReview',
        4: 'NeedsInformation',
        5: 'Approved',
        6: 'Rejected',
        7: 'Suspended'
      };
      statusName = statusMap[verificationStatus] || 'Submitted';
    } else if (typeof rawStatus === 'string') {
      const lower = rawStatus.trim().toLowerCase();
      if (lower === 'draft' || lower === '1') {
        verificationStatus = 1; statusName = 'Draft';
      } else if (lower === 'submitted' || lower === '2') {
        verificationStatus = 2; statusName = 'Submitted';
      } else if (lower === 'underreview' || lower === 'under_review' || lower === '3') {
        verificationStatus = 3; statusName = 'UnderReview';
      } else if (lower === 'needsinformation' || lower === 'needs_information' || lower === '4') {
        verificationStatus = 4; statusName = 'NeedsInformation';
      } else if (lower === 'approved' || lower === 'active' || lower === '5') {
        verificationStatus = 5; statusName = 'Approved';
      } else if (lower === 'rejected' || lower === '6') {
        verificationStatus = 6; statusName = 'Rejected';
      } else if (lower === 'suspended' || lower === '7') {
        verificationStatus = 7; statusName = 'Suspended';
      }
    }

    if (app.status && String(app.status).toLowerCase() === 'suspended') {
      verificationStatus = 7;
      statusName = 'Suspended';
    }

    return {
      id: String(id).trim(),
      storeId: String(storeId).trim(),
      ownerId: app.ownerId || app.OwnerId || '',
      ownerName: app.ownerName || app.OwnerName || '',
      ownerEmail: app.ownerEmail || app.OwnerEmail || '',
      name: app.name || app.Name || app.storeName || app.StoreName || 'متجر',
      description: app.description || app.Description || '',
      commercialRegistrationNumber: app.commercialRegistrationNumber || app.CommercialRegistrationNumber || app.crNumber || app.cr || '',
      taxNumber: app.taxNumber || app.TaxNumber || app.vatNumber || app.tax || '',
      city: app.city || app.City || '',
      address: app.address || app.Address || '',
      phoneNumber: app.phoneNumber || app.PhoneNumber || app.phone || '',
      email: app.email || app.Email || '',
      verificationStatus,
      statusName,
      status: app.status || app.Status || statusName,
      informationRequestMessage: app.informationRequestMessage || app.InformationRequestMessage || '',
      rejectionReason: app.rejectionReason || app.RejectionReason || '',
      suspensionReason: app.suspensionReason || app.SuspensionReason || '',
      submittedAt: app.submittedAt || app.SubmittedAt || app.createdAt || app.CreatedAt || '',
      reviewedAt: app.reviewedAt || app.ReviewedAt || '',
      approvedAt: app.approvedAt || app.ApprovedAt || '',
      suspendedAt: app.suspendedAt || app.SuspendedAt || '',
      createdAt: app.createdAt || app.CreatedAt || app.submittedAt || app.SubmittedAt || '',
      documents: Array.isArray(app.documents) ? app.documents : (Array.isArray(app.Documents) ? app.Documents : [])
    };
  }

  function setupStoresControls() {
    // Status Filter buttons
    document.querySelectorAll('[data-store-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.getAttribute('data-store-filter');
        setStoreStatusFilter(status, btn);
      });
    });

    // Refresh Button ("تحديث القائمة")
    document.getElementById('btn-refresh-stores')?.addEventListener('click', () => {
      loadStores();
    });

    // Pagination buttons
    document.getElementById('stores-prev-btn')?.addEventListener('click', () => {
      if (state.stores.page > 1) {
        state.stores.page--;
        loadStores();
      }
    });

    document.getElementById('stores-next-btn')?.addEventListener('click', () => {
      if (state.stores.page < state.stores.totalPages) {
        state.stores.page++;
        loadStores();
      }
    });

    // Table Action Delegation
    const storeTbody = document.getElementById('admin-stores-body');
    if (storeTbody) {
      storeTbody.addEventListener('click', (e) => {
        const refreshBtn = e.target.closest('[data-action="refresh-stores"]');
        if (refreshBtn) {
          loadStores();
          return;
        }

        const viewBtn = e.target.closest('[data-action="view-store"]');
        if (viewBtn) {
          const id = viewBtn.getAttribute('data-id');
          if (id) openStoreDetails(id);
          return;
        }

        const reviewBtn = e.target.closest('[data-action="start-review"]');
        if (reviewBtn) {
          const id = reviewBtn.getAttribute('data-id');
          if (id) startReview(id);
          return;
        }

        const approveBtn = e.target.closest('[data-action="approve-store"]');
        if (approveBtn) {
          const id = approveBtn.getAttribute('data-id');
          if (id) approveApplication(id);
          return;
        }

        const suspBtn = e.target.closest('[data-action="suspend-store"]');
        if (suspBtn) {
          const storeId = suspBtn.getAttribute('data-store-id') || suspBtn.getAttribute('data-id');
          if (storeId) promptSuspendStore(storeId);
          return;
        }

        const actBtn = e.target.closest('[data-action="activate-store"]');
        if (actBtn) {
          const storeId = actBtn.getAttribute('data-store-id') || actBtn.getAttribute('data-id');
          if (storeId) activateStore(storeId);
          return;
        }
      });
    }
  }

  function setStoreStatusFilter(status, activeBtn) {
    state.stores.filterStatus = status;
    state.stores.page = 1;

    document.querySelectorAll('.filter-store-btn').forEach(b => {
      b.className = "filter-store-btn bg-white border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer";
    });
    if (activeBtn) {
      activeBtn.className = "filter-store-btn bg-[#184336] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer";
    }

    loadStores();
  }

  async function loadStores() {
    const tbody = document.getElementById("admin-stores-body");
    const refreshBtn = document.getElementById('btn-refresh-stores');

    if (refreshBtn) {
      refreshBtn.classList.add('opacity-75', 'pointer-events-none');
      const icon = refreshBtn.querySelector('svg');
      if (icon) icon.classList.add('animate-spin');
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-12 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center gap-3">
              <svg class="w-8 h-8 text-[#184336] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-bold text-slate-600">جاري تحميل طلبات انضمام المتاجر...</span>
            </div>
          </td>
        </tr>`;
    }

    try {
      // 2. Query Parameters & Tabs:
      // Clicking "الكل" tab either omits status param completely or sends valid status filtering as supported by backend.
      // For "الطلبات الواردة (Submitted)", explicitly pass status=2.
      // For "قيد المراجعة (Under Review)", explicitly pass status=3.
      const params = {
        page: state.stores.page || 1,
        pageSize: state.stores.pageSize || 20
      };

      const filter = state.stores.filterStatus;
      if (!filter || filter === 'all' || filter === '') {
        // "الكل" tab: omit the status param completely
      } else if (filter === '2' || filter === 2 || String(filter).toLowerCase() === 'submitted') {
        params.status = 2;
      } else if (filter === '3' || filter === 3 || String(filter).toLowerCase() === 'underreview' || String(filter).toLowerCase() === 'under_review') {
        params.status = 3;
      } else if (filter === '5' || filter === 5 || String(filter).toLowerCase() === 'approved') {
        params.status = 5;
      } else if (filter === '4' || filter === 4 || String(filter).toLowerCase() === 'needsinformation' || String(filter).toLowerCase() === 'needs_information') {
        params.status = 4;
      } else if (filter === '6' || filter === 6 || String(filter).toLowerCase() === 'rejected') {
        params.status = 6;
      } else {
        params.status = filter;
      }

      const res = await ApiClient.admin.storeApplications(params);

      // 1. Flexible Data Extraction:
      // Handle different response structures gracefully:
      const list = Array.isArray(res?.data) 
        ? res.data 
        : (res?.data?.items || res?.items || []);

      // Ensure totalCount displays list.length or res.data.totalCount
      const totalCount = (res?.data && res.data.totalCount !== undefined && res.data.totalCount !== null)
        ? Number(res.data.totalCount)
        : (res?.totalCount !== undefined && res.totalCount !== null ? Number(res.totalCount) : list.length);

      const totalPages = Number(res?.data?.totalPages || res?.totalPages) || Math.ceil(totalCount / (state.stores.pageSize || 20)) || 1;

      state.stores.totalCount = totalCount;
      state.stores.totalPages = Math.max(1, totalPages);

      // Render the table rows using `list`
      state.stores.data = (list && list.length > 0)
        ? list.map(normalizeStoreApplication).filter(Boolean)
        : [];

      // Dismiss loading spinner and re-render rows dynamically
      renderStoresTable(state.stores.data);
      updateStoresPagination();

      // Update badge count
      const badge = document.getElementById('stores-badge');
      if (badge) {
        const pendingCount = state.stores.data.filter(s => s.verificationStatus === 2 || s.statusName === 'Submitted').length;
        badge.innerText = pendingCount;
      }
    } catch (err) {
      console.warn("[Admin Dashboard] Store applications load failed:", err);
      showErrorNotification(err, "فشل جلب طلبات المتاجر");
      state.stores.data = [];
      renderStoresTable([]);
      updateStoresPagination();
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('opacity-75', 'pointer-events-none');
        const icon = refreshBtn.querySelector('svg');
        if (icon) icon.classList.remove('animate-spin');
      }
    }
  }

  function renderStoresTable(list) {
    const tbody = document.getElementById("admin-stores-body");
    if (!tbody) return;
    tbody.innerHTML = ""; // Dismiss loading spinner

    // Render empty state if list is empty
    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-12 text-center">
            <div class="max-w-md mx-auto flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">لا توجد طلبات متاجر في هذه القائمة</h4>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">لم يتم العثور على أي طلبات متاجر مطابقة للتصفية الحالية في الخادم.</p>
              <button type="button" data-action="refresh-stores" class="inline-flex items-center gap-2 bg-[#184336] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0f2b23] transition shadow-sm cursor-pointer" title="تحديث القائمة">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>تحديث القائمة</span>
              </button>
            </div>
          </td>
        </tr>`;
      return;
    }

    const statusBadges = {
      1: "<span class='bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold'>مسودة (Draft)</span>",
      2: "<span class='bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200'>بانتظار المراجعة (Submitted)</span>",
      3: "<span class='bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200'>قيد المراجعة (Under Review)</span>",
      4: "<span class='bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-200'>مطلوب معلومات (Needs Info)</span>",
      5: "<span class='bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200'>معتمد ونشط ✓ (Approved)</span>",
      6: "<span class='bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-200'>مرفوض ✕ (Rejected)</span>",
      7: "<span class='bg-rose-200 text-rose-900 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300'>معلق (Suspended)</span>"
    };

    list.forEach(s => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";
      const statusKey = s.verificationStatus || 2;
      const appId = s.id;
      const storeId = s.storeId || s.id;

      tr.innerHTML = `
        <td class="p-4 font-bold text-slate-900">
          <div>${escapeHtml(s.name || 'متجر')}</div>
          <div class="text-[11px] text-slate-400 font-mono tracking-tight" title="معرف الطلب: ${escapeHtml(appId)}">GUID: ${escapeHtml(appId)}</div>
        </td>
        <td class="p-4 font-mono text-xs text-slate-600">
          <div>CR: ${escapeHtml(s.commercialRegistrationNumber || '-')}</div>
          <div>TAX: ${escapeHtml(s.taxNumber || '-')}</div>
        </td>
        <td class="p-4 text-slate-700 text-xs">
          ${escapeHtml(s.city || '')} ${s.address ? ' - ' + escapeHtml(s.address) : ''}
        </td>
        <td class="p-4 font-mono text-xs text-slate-600">${escapeHtml(s.phoneNumber || '-')}</td>
        <td class="p-4">${statusBadges[statusKey] || statusBadges[2]}</td>
        <td class="p-4">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" data-action="view-store" data-id="${escapeHtml(appId)}" class="bg-[#184336] text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-[#0f2b23] transition cursor-pointer">
              معاينة
            </button>
            ${statusKey === 2 ? `
              <button type="button" data-action="start-review" data-id="${escapeHtml(appId)}" class="bg-amber-50 text-amber-800 border border-amber-300 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-amber-100 cursor-pointer">
                مراجعة
              </button>
            ` : ''}
            ${statusKey === 3 ? `
              <button type="button" data-action="approve-store" data-id="${escapeHtml(appId)}" class="bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-emerald-700 cursor-pointer">
                اعتماد ✓
              </button>
            ` : ''}
            ${statusKey === 5 ? `
              <button type="button" data-action="suspend-store" data-store-id="${escapeHtml(storeId)}" data-id="${escapeHtml(appId)}" class="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-rose-100 cursor-pointer">
                تعليق
              </button>
            ` : ''}
            ${statusKey === 7 ? `
              <button type="button" data-action="activate-store" data-store-id="${escapeHtml(storeId)}" data-id="${escapeHtml(appId)}" class="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-emerald-100 cursor-pointer">
                تفعيل
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updateStoresPagination() {
    const info = document.getElementById("stores-page-info");
    const prevBtn = document.getElementById("stores-prev-btn");
    const nextBtn = document.getElementById("stores-next-btn");

    if (info) {
      info.innerText = `الصفحة ${state.stores.page} من ${state.stores.totalPages || 1} (إجمالي ${state.stores.totalCount} طلب)`;
    }
    if (prevBtn) prevBtn.disabled = (state.stores.page <= 1);
    if (nextBtn) nextBtn.disabled = (state.stores.page >= state.stores.totalPages);
  }

  /**
   * Fetch Single Application Details: GET /api/admin/stores/applications/{id}
   */
  async function openStoreDetails(appId) {
    if (!appId || !isValidGuid(appId)) {
      showErrorNotification({ message: 'معرف طلب المتجر غير صالح أو غير محدد.' }, 'معرف غير صالح');
      return;
    }

    let app = state.stores.data.find(s => String(s.id).toLowerCase() === String(appId).toLowerCase());

    try {
      const res = await ApiClient.admin.getStoreApplication(appId);
      const fetched = extractResponseData(res);
      if (fetched && typeof fetched === 'object') {
        const normalized = normalizeStoreApplication(fetched);
        app = { ...(app || {}), ...normalized };
      }
    } catch (e) {
      console.log("[Admin Dashboard] Details fetch note:", e.message);
    }

    if (!app) {
      showErrorNotification({ message: 'تعذر العثور على بيانات هذا الطلب.' }, 'الطلب غير موجود');
      return;
    }
    state.stores.selectedApp = app;

    const titleEl = document.getElementById("modal-store-name");
    const statusBadgeEl = document.getElementById("modal-store-status-badge");
    if (titleEl) titleEl.innerText = app.name || "تفاصيل المتجر";
    if (statusBadgeEl) statusBadgeEl.innerText = `الحالة: ${app.statusName || 'Submitted'}`;

    const content = document.getElementById("modal-store-content");
    if (content) {
      content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div><strong>معرف الطلب (Application GUID):</strong> <span class="font-mono text-emerald-800 select-all">${escapeHtml(app.id)}</span></div>
          <div><strong>معرف المتجر (Store GUID):</strong> <span class="font-mono text-emerald-800 select-all">${escapeHtml(app.storeId || app.id)}</span></div>
          <div><strong>اسم المتجر:</strong> ${escapeHtml(app.name || '-')}</div>
          <div><strong>المدينة:</strong> ${escapeHtml(app.city || '-')}</div>
          <div><strong>العنوان الوطني / الشارع:</strong> ${escapeHtml(app.address || '-')}</div>
          <div><strong>السجل التجاري (CR):</strong> <span class="font-mono">${escapeHtml(app.commercialRegistrationNumber || '-')}</span></div>
          <div><strong>الرقم الضريبي (TAX):</strong> <span class="font-mono">${escapeHtml(app.taxNumber || '-')}</span></div>
          <div><strong>هاتف التواصل:</strong> <span class="font-mono" dir="ltr">${escapeHtml(app.phoneNumber || '-')}</span></div>
          <div><strong>البريد الإلكتروني:</strong> <span class="font-mono">${escapeHtml(app.email || '-')}</span></div>
          <div><strong>تاريخ التقديم:</strong> ${app.createdAt ? new Date(app.createdAt).toLocaleDateString('ar-SA') : '-'}</div>
          ${app.informationRequestMessage ? `<div class="sm:col-span-2 bg-orange-50 text-orange-900 p-2.5 rounded-xl border border-orange-200"><strong>رسالة طلب المعلومات:</strong> ${escapeHtml(app.informationRequestMessage)}</div>` : ''}
          ${app.rejectionReason ? `<div class="sm:col-span-2 bg-rose-50 text-rose-900 p-2.5 rounded-xl border border-rose-200"><strong>سبب الرفض:</strong> ${escapeHtml(app.rejectionReason)}</div>` : ''}
          ${app.suspensionReason ? `<div class="sm:col-span-2 bg-red-50 text-red-900 p-2.5 rounded-xl border border-red-200"><strong>سبب التعليق:</strong> ${escapeHtml(app.suspensionReason)}</div>` : ''}
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-700 mb-2">المستندات والوثائق المرفقة:</h4>
          ${renderApplicationDocuments(app.documents)}
        </div>
      `;
    }

    const actions = document.getElementById("modal-store-actions");
    if (actions) {
      const applicationId = app.id;
      const storeId = app.storeId || app.id;

      actions.innerHTML = `
        <button type="button" id="btn-start-review" class="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-700 transition cursor-pointer">
          بدء المراجعة (Start Review)
        </button>
        <button type="button" id="btn-request-info" class="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer">
          طلب معلومات (Request Info)
        </button>
        <button type="button" id="btn-approve-store" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-700 transition cursor-pointer">
          اعتماد المتجر (Approve) ✓
        </button>
        <button type="button" id="btn-reject-store" class="bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer">
          رفض الطلب (Reject) ✕
        </button>
        <button type="button" id="btn-suspend-store-modal" class="border border-rose-300 text-rose-700 font-bold px-4 py-2 rounded-xl text-xs hover:bg-rose-50 transition cursor-pointer">
          تعليق المتجر (Suspend)
        </button>
        <button type="button" id="btn-activate-store-modal" class="border border-emerald-300 text-emerald-800 font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-50 transition cursor-pointer">
          تفعيل المتجر (Activate)
        </button>
      `;

      document.getElementById('btn-start-review')?.addEventListener('click', () => startReview(applicationId));
      document.getElementById('btn-request-info')?.addEventListener('click', () => promptRequestInfo(applicationId));
      document.getElementById('btn-approve-store')?.addEventListener('click', () => approveApplication(applicationId));
      document.getElementById('btn-reject-store')?.addEventListener('click', () => promptRejectApplication(applicationId));
      document.getElementById('btn-suspend-store-modal')?.addEventListener('click', () => promptSuspendStore(storeId));
      document.getElementById('btn-activate-store-modal')?.addEventListener('click', () => activateStore(storeId));
    }

    openModal("store-modal");
  }

  function renderApplicationDocuments(docs) {
    if (Array.isArray(docs) && docs.length > 0) {
      return docs.map(d => {
        const docName = d.documentType || d.DocumentType || d.name || d.Name || d.fileName || d.FileName || 'وثيقة تجارية';
        const fileUrl = d.fileUrl || d.FileUrl || d.url || d.Url || '';
        const fileName = d.fileName || d.FileName || '';
        return `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between mb-2">
          <span>📄 <strong>${escapeHtml(docName)}</strong> ${fileName ? `(${escapeHtml(fileName)})` : ''}</span>
          ${fileUrl ? `<a href="${escapeHtml(fileUrl)}" target="_blank" class="text-blue-600 font-bold hover:underline">تحميل / معاينة</a>` : `<span class="text-emerald-700 font-bold">جاهز للمراجعة</span>`}
        </div>
      `;
      }).join('');
    }
    return `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
        لا توجد مستندات مرفقة مع هذا الطلب.
      </div>
    `;
  }

  /**
   * Review Action: POST /api/admin/stores/applications/{id}/start-review
   */
  async function startReview(appId) {
    if (!appId || !isValidGuid(appId)) {
      showErrorNotification({ message: 'معرف الطلب غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    try {
      await ApiClient.admin.startReview(appId);
      showSuccessNotification('تم بدء المراجعة', 'تم تغيير حالة الطلب إلى (قيد المراجعة) بنجاح.');
      closeModal("store-modal");
      loadStores();
    } catch (err) {
      showErrorNotification(err, "فشل بدء المراجعة");
    }
  }

  /**
   * Review Action: POST /api/admin/stores/applications/{id}/request-info (body: { "message": string })
   */
  function promptRequestInfo(appId) {
    if (!appId || !isValidGuid(appId)) {
      showErrorNotification({ message: 'معرف الطلب غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    showPromptModal({
      title: "طلب معلومات إضافية من التاجر",
      desc: "يرجى كتابة رسالة توضيحية تحدد النواقص أو المستندات المطلوبة من التاجر:",
      placeholder: "اكتب رسالة التوضيح للتاجر هنا...",
      onSubmit: async (message) => {
        try {
          await ApiClient.admin.requestInfo(appId, message);
          showSuccessNotification('تم إرسال الطلب', 'تم إشعار التاجر بطلب المعلومات الإضافية بنجاح.');
          closeModal("store-modal");
          loadStores();
        } catch (err) {
          showErrorNotification(err, "فشل إرسال طلب المعلومات");
        }
      }
    });
  }

  /**
   * Review Action: POST /api/admin/stores/applications/{applicationId}/approve
   * Strictly includes the "/applications/" segment in the URL path per backend specification.
   */
  async function approveApplication(applicationId) {
    if (!applicationId || !isValidGuid(applicationId)) {
      showErrorNotification({ message: 'معرف الطلب غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    if (!confirm("هل أنت متأكد من اعتماد هذا المتجر وتفعيله على منصة دوّر؟")) return;
    try {
      await ApiClient.admin.approveApplication(applicationId);
      showSuccessNotification('تم الاعتماد', 'تم اعتماد المتجر وتفعيله رسمياً على المنصة!');
      closeModal("store-modal");
      loadStores();
    } catch (err) {
      showErrorNotification(err, "فشل اعتماد المتجر");
    }
  }

  /**
   * Review Action: POST /api/admin/stores/applications/{id}/reject (body: { "reason": string })
   */
  function promptRejectApplication(appId) {
    if (!appId || !isValidGuid(appId)) {
      showErrorNotification({ message: 'معرف الطلب غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    showPromptModal({
      title: "رفض طلب انضمام المتجر",
      desc: "يرجى توضيح سبب رفض الطلب بشكل واضح لإشعار التاجر:",
      placeholder: "سبب الرفض (مثال: عدم مطابقة السجل التجاري للنشاط المطلوب)...",
      onSubmit: async (reason) => {
        try {
          await ApiClient.admin.rejectApplication(appId, reason);
          showSuccessNotification('تم رفض الطلب', 'تم رفض طلب انضمام المتجر وتسجيل السبب.');
          closeModal("store-modal");
          loadStores();
        } catch (err) {
          showErrorNotification(err, "فشل تنفيذ الرفض");
        }
      }
    });
  }

  /**
   * Store Action: POST /api/admin/stores/{id}/suspend (body: { "reason": string })
   */
  function promptSuspendStore(storeId) {
    if (!storeId || !isValidGuid(storeId)) {
      showErrorNotification({ message: 'معرف المتجر غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    showPromptModal({
      title: "تعليق حساب المتجر",
      desc: "أدخل سبب تعليق المتجر لإشعار صاحب المتجر وتوثيق الإجراء في سجل التدقيق:",
      placeholder: "سبب التعليق...",
      onSubmit: async (reason) => {
        try {
          await ApiClient.admin.suspendStore(storeId, reason);
          showSuccessNotification('تم التعليق', 'تم تعليق المتجر وإيقاف نشاطه مؤقتاً.');
          closeModal("store-modal");
          loadStores();
        } catch (err) {
          showErrorNotification(err, "فشل تعليق المتجر");
        }
      }
    });
  }

  /**
   * Store Action: POST /api/admin/stores/{id}/activate
   */
  async function activateStore(storeId) {
    if (!storeId || !isValidGuid(storeId)) {
      showErrorNotification({ message: 'معرف المتجر غير صالح. يجب أن يكون معرفاً حقيقياً بصيغة GUID.' }, 'معرف غير صالح');
      return;
    }
    if (!confirm("هل تريد تفعيل هذا المتجر وإعادة تنشيطه على المنصة؟")) return;
    try {
      await ApiClient.admin.activateStore(storeId);
      showSuccessNotification('تم التفعيل', 'تم تفعيل المتجر بنجاح وهو الآن نشط.');
      closeModal("store-modal");
      loadStores();
    } catch (err) {
      showErrorNotification(err, "فشل تفعيل المتجر");
    }
  }

  // =========================================================================
  // 2. User Management (/api/admin/users)
  // Endpoints:
  // - GET  /api/admin/users?role={role}&status={status}&search={query}&page={page}&pageSize={pageSize}
  // - GET  /api/admin/users/{id}
  // - POST /api/admin/users/{id}/suspend (body: { "reason": string })
  // - POST /api/admin/users/{id}/activate
  // =========================================================================
  function setupUsersControls() {
    let searchDebounce = null;
    const searchInput = document.getElementById("user-search");
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          state.users.search = e.target.value.trim();
          state.users.page = 1;
          loadUsers();
        }, 350);
      });
    }

    document.getElementById("user-role-filter")?.addEventListener('change', (e) => {
      state.users.role = e.target.value;
      state.users.page = 1;
      loadUsers();
    });

    document.getElementById("user-status-filter")?.addEventListener('change', (e) => {
      state.users.status = e.target.value;
      state.users.page = 1;
      loadUsers();
    });

    document.getElementById("btn-refresh-users")?.addEventListener('click', () => {
      loadUsers();
    });

    document.getElementById("users-prev-btn")?.addEventListener('click', () => {
      if (state.users.page > 1) {
        state.users.page--;
        loadUsers();
      }
    });

    document.getElementById("users-next-btn")?.addEventListener('click', () => {
      if (state.users.page < state.users.totalPages) {
        state.users.page++;
        loadUsers();
      }
    });

    // Table Actions
    const userTbody = document.getElementById('admin-users-body');
    if (userTbody) {
      userTbody.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-action="toggle-user"]');
        if (toggleBtn) {
          const userId = toggleBtn.getAttribute('data-id');
          const userAction = toggleBtn.getAttribute('data-user-action');
          if (userId && userAction) {
            handleUserToggle(userId, userAction);
          }
        }
      });
    }
  }

  async function loadUsers() {
    const tbody = document.getElementById("admin-users-body");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-bold">جاري تحميل المستخدمين...</td></tr>`;
    }

    try {
      const params = {
        page: state.users.page,
        pageSize: state.users.pageSize
      };
      if (state.users.role) params.role = state.users.role;
      if (state.users.status) params.status = state.users.status;
      if (state.users.search) params.search = state.users.search;

      const res = await ApiClient.admin.users(params);
      const rawData = extractResponseData(res);

      let items = [];
      if (Array.isArray(rawData)) {
        items = rawData;
        state.users.totalCount = items.length;
        state.users.totalPages = 1;
      } else if (rawData && typeof rawData === 'object') {
        items = Array.isArray(rawData.items) ? rawData.items : (Array.isArray(rawData.data) ? rawData.data : []);
        state.users.totalCount = rawData.totalCount || rawData.total || items.length;
        state.users.totalPages = rawData.totalPages || Math.ceil(state.users.totalCount / state.users.pageSize) || 1;
      }

      state.users.data = (items && items.length > 0) ? items : (state.users.search === '' && state.users.page === 1 ? fallbackUsers : []);
      renderUsersTable(state.users.data);
      updateUsersPagination();
    } catch (err) {
      console.warn("[Admin Dashboard] Users load failed, using fallback:", err);
      showErrorNotification(err, "فشل جلب المستخدمين");
      state.users.data = fallbackUsers;
      renderUsersTable(state.users.data);
      updateUsersPagination();
    }
  }

  function renderUsersTable(list) {
    const tbody = document.getElementById("admin-users-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-bold">لا يوجد مستخدمون مطابقون لمعايير البحث.</td></tr>`;
      return;
    }

    list.forEach(u => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";
      const isActive = (u.status === 2 || u.statusName === "Active" || u.isActive === true);

      tr.innerHTML = `
        <td class="p-4 font-bold text-slate-900">
          <div>${escapeHtml(u.fullName || u.name || 'مستخدم')}</div>
          <div class="text-[11px] text-slate-400 font-mono">ID: ${escapeHtml(u.id || '')}</div>
        </td>
        <td class="p-4 text-slate-600 font-mono text-xs">${escapeHtml(u.email || '-')}</td>
        <td class="p-4">
          <span class="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">
            ${escapeHtml(u.role || 'User')}
          </span>
        </td>
        <td class="p-4">
          ${isActive
            ? "<span class='bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-200'>نشط (Active)</span>"
            : "<span class='bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold border border-rose-200'>معلق (Suspended)</span>"}
        </td>
        <td class="p-4">
          ${isActive ? `
            <button type="button" data-action="toggle-user" data-user-action="suspend" data-id="${u.id}" class="text-rose-600 border border-rose-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-50 transition cursor-pointer">
              تعليق الحساب
            </button>
          ` : `
            <button type="button" data-action="toggle-user" data-user-action="activate" data-id="${u.id}" class="text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-50 transition cursor-pointer">
              تفعيل الحساب
            </button>
          `}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updateUsersPagination() {
    const info = document.getElementById("users-page-info");
    const prevBtn = document.getElementById("users-prev-btn");
    const nextBtn = document.getElementById("users-next-btn");

    if (info) {
      info.innerText = `الصفحة ${state.users.page} من ${state.users.totalPages || 1} (إجمالي ${state.users.totalCount} مستخدم)`;
    }
    if (prevBtn) prevBtn.disabled = (state.users.page <= 1);
    if (nextBtn) nextBtn.disabled = (state.users.page >= state.users.totalPages);
  }

  /**
   * Suspend or Activate User
   * - Suspend: POST /api/admin/users/{id}/suspend (body: { "reason": string })
   * - Activate: POST /api/admin/users/{id}/activate
   */
  async function handleUserToggle(userId, action) {
    if (action === 'suspend') {
      showPromptModal({
        title: "تعليق حساب المستخدم",
        desc: "أدخل سبب تعليق الحساب لإشعار المستخدم:",
        placeholder: "سبب التعليق...",
        onSubmit: async (reason) => {
          try {
            await ApiClient.admin.suspendUser(userId, reason);
            showSuccessNotification('تم التعليق', 'تم تعليق حساب المستخدم بنجاح.');
            loadUsers();
          } catch (err) {
            showErrorNotification(err, "فشل تعليق الحساب");
          }
        }
      });
    } else {
      if (!confirm("هل تريد بالتأكيد إعادة تفعيل حساب هذا المستخدم؟")) return;
      try {
        await ApiClient.admin.activateUser(userId);
        showSuccessNotification('تم التفعيل', 'تم تفعيل حساب المستخدم بنجاح.');
        loadUsers();
      } catch (err) {
        showErrorNotification(err, "فشل تفعيل الحساب");
      }
    }
  }

  // =========================================================================
  // 3. Category Governance (/api/admin/categories)
  // Endpoints:
  // - GET    /api/admin/categories/tree and GET /api/admin/categories
  // - POST   /api/admin/categories (body: { name, slug, description, parentId, iconUrl, displayOrder, isActive })
  // - PUT    /api/admin/categories/{id}
  // - DELETE /api/admin/categories/{id}
  // - PATCH  /api/admin/categories/{id}/activate and PATCH /api/admin/categories/{id}/deactivate
  // =========================================================================
  function setupCategoriesControls() {
    document.getElementById('open-category-modal-btn')?.addEventListener('click', openCategoryModal);
    document.getElementById('btn-refresh-categories')?.addEventListener('click', loadCategories);
    document.getElementById('category-form')?.addEventListener('submit', handleSaveCategory);

    const categoriesContainer = document.getElementById('categories-tree-container');
    if (categoriesContainer) {
      categoriesContainer.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-action="toggle-category"]');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-id');
          const activate = toggleBtn.getAttribute('data-activate') === 'true';
          if (id) toggleCategoryStatus(id, activate);
          return;
        }

        const editBtn = e.target.closest('[data-action="edit-category"]');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          if (id) editCategory(id);
          return;
        }

        const delBtn = e.target.closest('[data-action="delete-category"]');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          if (id) deleteCategory(id);
          return;
        }
      });
    }
  }

  async function loadCategories() {
    const container = document.getElementById("categories-tree-container");
    if (container) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 font-bold">جاري تحميل شجرة التصنيفات من /api/admin/categories/tree...</div>`;
    }

    try {
      // 1. First attempt to fetch the tree structure
      const res = await ApiClient.admin.categories.tree();
      const rawTree = extractResponseData(res);

      if (Array.isArray(rawTree) && rawTree.length > 0) {
        state.categories.tree = rawTree;
      } else {
        // Fallback to flat list and build hierarchy if tree is not returned
        const listRes = await ApiClient.admin.categories.list();
        const rawList = extractResponseData(listRes);
        if (Array.isArray(rawList) && rawList.length > 0) {
          state.categories.list = rawList;
          state.categories.tree = buildTreeFromFlatList(rawList);
        } else {
          state.categories.tree = fallbackCategories;
        }
      }

      renderCategoriesTree(state.categories.tree);
    } catch (err) {
      console.warn("[Admin Dashboard] Categories fetch failed, using fallback:", err);
      showErrorNotification(err, "فشل جلب شجرة التصنيفات");
      state.categories.tree = fallbackCategories;
      renderCategoriesTree(state.categories.tree);
    }
  }

  function buildTreeFromFlatList(list) {
    const map = {};
    const roots = [];

    list.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    list.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  }

  function renderCategoriesTree(tree) {
    const container = document.getElementById("categories-tree-container");
    if (!container) return;
    container.innerHTML = "";

    const parentSelect = document.getElementById("cat-parent");
    if (parentSelect) {
      parentSelect.innerHTML = '<option value="">تصنيف رئيسي (Root Category)</option>';
    }

    if (!tree || tree.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 font-bold">لا توجد تصنيفات معرفة حالياً. اضغط على "إضافة تصنيف" للبدء.</div>`;
      return;
    }

    tree.forEach(cat => {
      if (parentSelect) {
        parentSelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
      }

      const node = document.createElement("div");
      node.className = "p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col gap-2 transition hover:border-[#1c5335]/30";
      
      node.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              📁 ${escapeHtml(cat.name)}
            </span>
            <span class="text-xs font-mono text-slate-400">(${escapeHtml(cat.slug || '')})</span>
            ${cat.isActive !== false
              ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">نشط</span>'
              : '<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">غير نشط</span>'}
            ${cat.description ? `<span class="text-xs text-slate-500 hidden sm:inline">- ${escapeHtml(cat.description)}</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" data-action="toggle-category" data-id="${cat.id}" data-activate="${cat.isActive === false}"
              class="text-xs px-2.5 py-1 rounded-lg border font-bold ${cat.isActive !== false ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'} cursor-pointer">
              ${cat.isActive !== false ? 'تعطيل' : 'تفعيل'}
            </button>
            <button type="button" data-action="edit-category" data-id="${cat.id}" class="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-white cursor-pointer">
              تعديل
            </button>
            <button type="button" data-action="delete-category" data-id="${cat.id}" class="text-xs px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 cursor-pointer">
              حذف
            </button>
          </div>
        </div>

        ${cat.children && cat.children.length > 0 ? `
          <div class="pr-6 space-y-1.5 pt-2 border-t border-slate-200">
            ${cat.children.map(sub => `
              <div class="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-100">
                <div class="flex items-center gap-2">
                  <span>↳ <strong>${escapeHtml(sub.name)}</strong> <span class="text-slate-400 font-mono">(${escapeHtml(sub.slug || '')})</span></span>
                  ${sub.isActive !== false ? '<span class="text-emerald-700 text-[10px] font-bold">● نشط</span>' : '<span class="text-rose-600 text-[10px] font-bold">● معطل</span>'}
                </div>
                <div class="flex items-center gap-1.5">
                  <button type="button" data-action="toggle-category" data-id="${sub.id}" data-activate="${sub.isActive === false}" class="text-[11px] text-slate-600 hover:text-slate-900 font-bold cursor-pointer">
                    ${sub.isActive !== false ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button type="button" data-action="edit-category" data-id="${sub.id}" class="text-[11px] text-slate-600 hover:text-slate-900 font-bold cursor-pointer">
                    تعديل
                  </button>
                  <button type="button" data-action="delete-category" data-id="${sub.id}" class="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer">
                    حذف
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
      container.appendChild(node);
    });
  }

  function openCategoryModal(isEdit = false) {
    const modal = document.getElementById("category-modal");
    const title = document.getElementById("category-modal-title");
    const form = document.getElementById("category-form");

    if (!isEdit) {
      form?.reset();
      document.getElementById("category-id").value = "";
      if (title) title.innerText = "إضافة تصنيف جديد";
    }

    openModal("category-modal");
  }

  function editCategory(id) {
    let cat = findCategoryInTree(state.categories.tree, id);
    if (!cat) return;

    state.categories.editingCategory = cat;
    openCategoryModal(true);

    const title = document.getElementById("category-modal-title");
    if (title) title.innerText = `تعديل التصنيف: ${cat.name}`;

    document.getElementById("category-id").value = cat.id || "";
    document.getElementById("cat-name").value = cat.name || "";
    document.getElementById("cat-slug").value = cat.slug || "";
    document.getElementById("cat-desc").value = cat.description || "";
    document.getElementById("cat-parent").value = cat.parentId || "";
    document.getElementById("cat-order").value = cat.displayOrder || 1;
    document.getElementById("cat-icon").value = cat.iconUrl || "";
    document.getElementById("cat-active").checked = (cat.isActive !== false);
  }

  function findCategoryInTree(nodes, id) {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (String(node.id) === String(id)) return node;
      if (node.children && node.children.length > 0) {
        const found = findCategoryInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Save Category:
   * Create: POST /api/admin/categories
   * Update: PUT /api/admin/categories/{id}
   */
  async function handleSaveCategory(event) {
    event.preventDefault();
    const id = document.getElementById("category-id")?.value;
    const isEdit = Boolean(id);

    const payload = {
      name: document.getElementById("cat-name")?.value.trim() || '',
      slug: document.getElementById("cat-slug")?.value.trim() || '',
      description: document.getElementById("cat-desc")?.value.trim() || '',
      parentId: document.getElementById("cat-parent")?.value || null,
      iconUrl: document.getElementById("cat-icon")?.value.trim() || '',
      displayOrder: parseInt(document.getElementById("cat-order")?.value, 10) || 1,
      isActive: document.getElementById("cat-active")?.checked !== false
    };

    try {
      if (isEdit) {
        await ApiClient.admin.categories.update(id, payload);
        showSuccessNotification('تم التحديث', 'تم تحديث التصنيف بنجاح في قاعدة البيانات.');
      } else {
        await ApiClient.admin.categories.create(payload);
        showSuccessNotification('تم الإنشاء', 'تم إنشاء التصنيف المركزي الجديد بنجاح!');
      }

      closeModal("category-modal");
      document.getElementById("category-form")?.reset();
      loadCategories();
    } catch (err) {
      showErrorNotification(err, "فشل حفظ التصنيف");
    }
  }

  /**
   * Toggle Category Status:
   * Activate:   PATCH /api/admin/categories/{id}/activate
   * Deactivate: PATCH /api/admin/categories/{id}/deactivate
   */
  async function toggleCategoryStatus(id, activate) {
    try {
      if (activate) {
        await ApiClient.admin.categories.activate(id);
      } else {
        await ApiClient.admin.categories.deactivate(id);
      }
      showSuccessNotification('تم التحديث', `تم ${activate ? 'تفعيل' : 'تعطيل'} التصنيف بنجاح.`);
      loadCategories();
    } catch (err) {
      showErrorNotification(err, "فشل تحديث حالة التصنيف");
    }
  }

  /**
   * Delete Category: DELETE /api/admin/categories/{id}
   */
  async function deleteCategory(id) {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟ لا يمكن حذف التصنيفات التي ترتبط بمنتجات أو تصنيفات فرعية.")) return;
    try {
      await ApiClient.admin.categories.delete(id);
      showSuccessNotification('تم الحذف', 'تم حذف التصنيف بنجاح.');
      loadCategories();
    } catch (err) {
      showErrorNotification(err, "فشل حذف التصنيف");
    }
  }

  // =========================================================================
  // 4. Audit Logs (/api/admin/audit-logs)
  // Endpoints:
  // - GET /api/admin/audit-logs?page={page}&pageSize={pageSize}
  // - GET /api/admin/audit-logs/{id}
  // =========================================================================
  function setupAuditControls() {
    document.getElementById("filter-audit-btn")?.addEventListener('click', () => {
      state.audit.action = document.getElementById("audit-action-filter")?.value.trim() || '';
      state.audit.entityType = document.getElementById("audit-entity-filter")?.value.trim() || '';
      state.audit.startDate = document.getElementById("audit-start-date")?.value || '';
      state.audit.page = 1;
      loadAuditLogs();
    });

    document.getElementById("audit-prev-btn")?.addEventListener('click', () => {
      if (state.audit.page > 1) {
        state.audit.page--;
        loadAuditLogs();
      }
    });

    document.getElementById("audit-next-btn")?.addEventListener('click', () => {
      if (state.audit.page < state.audit.totalPages) {
        state.audit.page++;
        loadAuditLogs();
      }
    });

    const auditTbody = document.getElementById('admin-audit-body');
    if (auditTbody) {
      auditTbody.addEventListener('click', (e) => {
        const diffBtn = e.target.closest('[data-action="view-diff"]');
        if (diffBtn) {
          const logId = diffBtn.getAttribute('data-id');
          const oldVal = diffBtn.getAttribute('data-old') || 'null';
          const newVal = diffBtn.getAttribute('data-new') || 'null';
          viewAuditDiff(logId, oldVal, newVal);
        }
      });
    }
  }

  async function loadAuditLogs() {
    const tbody = document.getElementById("admin-audit-body");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-sans font-bold">جاري تحميل سجلات التدقيق...</td></tr>`;
    }

    try {
      const params = {
        page: state.audit.page,
        pageSize: state.audit.pageSize
      };
      if (state.audit.action) params.action = state.audit.action;
      if (state.audit.entityType) params.entityType = state.audit.entityType;
      if (state.audit.startDate) params.startDate = state.audit.startDate;

      const res = await ApiClient.admin.auditLogs(params);
      const rawData = extractResponseData(res);

      let items = [];
      if (Array.isArray(rawData)) {
        items = rawData;
        state.audit.totalCount = items.length;
        state.audit.totalPages = 1;
      } else if (rawData && typeof rawData === 'object') {
        items = Array.isArray(rawData.items) ? rawData.items : (Array.isArray(rawData.data) ? rawData.data : []);
        state.audit.totalCount = rawData.totalCount || rawData.total || items.length;
        state.audit.totalPages = rawData.totalPages || Math.ceil(state.audit.totalCount / state.audit.pageSize) || 1;
      }

      state.audit.data = (items && items.length > 0) ? items : (state.audit.page === 1 ? fallbackAudit : []);
      renderAuditLogs(state.audit.data);
      updateAuditPagination();
    } catch (err) {
      console.warn("[Admin Dashboard] Audit logs load failed, using fallback:", err);
      showErrorNotification(err, "فشل جلب سجلات التدقيق");
      state.audit.data = fallbackAudit;
      renderAuditLogs(state.audit.data);
      updateAuditPagination();
    }
  }

  function renderAuditLogs(list) {
    const tbody = document.getElementById("admin-audit-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-sans font-bold">لا توجد سجلات تدقيق مطابقة.</td></tr>`;
      return;
    }

    list.forEach(a => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";
      const formattedTime = a.timestamp ? new Date(a.timestamp).toLocaleString('ar-SA') : '-';

      tr.innerHTML = `
        <td class="p-3.5 text-slate-500 text-xs">${escapeHtml(formattedTime)}</td>
        <td class="p-3.5 text-slate-800 font-bold font-sans text-xs">${escapeHtml(a.userName || a.userEmail || a.userId || 'System')}</td>
        <td class="p-3.5 text-blue-700 font-bold text-xs">${escapeHtml(a.action || '')}</td>
        <td class="p-3.5 text-slate-600 text-xs">${escapeHtml(a.entityType || '')}</td>
        <td class="p-3.5 font-sans">
          <button type="button" data-action="view-diff" data-id="${a.id || ''}" data-old='${escapeJsonAttr(a.oldValues)}' data-new='${escapeJsonAttr(a.newValues)}' class="bg-[#e9f2ef] text-[#184336] border border-[#184336]/20 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-[#d8e8e3] transition cursor-pointer">
            عرض الفروقات (Diff)
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updateAuditPagination() {
    const info = document.getElementById("audit-page-info");
    const prevBtn = document.getElementById("audit-prev-btn");
    const nextBtn = document.getElementById("audit-next-btn");

    if (info) {
      info.innerText = `الصفحة ${state.audit.page} من ${state.audit.totalPages || 1} (إجمالي ${state.audit.totalCount} سجل)`;
    }
    if (prevBtn) prevBtn.disabled = (state.audit.page <= 1);
    if (nextBtn) nextBtn.disabled = (state.audit.page >= state.audit.totalPages);
  }

  /**
   * Log Details: GET /api/admin/audit-logs/{id}
   */
  async function viewAuditDiff(logId, oldVal, newVal) {
    if (logId) {
      try {
        const res = await ApiClient.admin.getAuditLog(logId);
        const detailed = extractResponseData(res);
        if (detailed) {
          if (detailed.oldValues) oldVal = detailed.oldValues;
          if (detailed.newValues) newVal = detailed.newValues;
        }
      } catch (e) {
        console.log("[Admin Dashboard] Single audit log fetch note:", e.message);
      }
    }

    const oldEl = document.getElementById("audit-old-val");
    const newEl = document.getElementById("audit-new-val");
    if (oldEl) oldEl.innerText = formatJsonDisplay(oldVal);
    if (newEl) newEl.innerText = formatJsonDisplay(newVal);

    openModal("audit-modal");
  }

  function formatJsonDisplay(val) {
    if (!val || val === 'null') return 'لا توجد بيانات سابقة (null)';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(val);
    }
  }

  // =========================================================================
  // Modal Utilities & Prompt Dialog
  // =========================================================================
  function setupModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        if (modalId) closeModal(modalId);
      });
    });
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  let promptCallback = null;
  function showPromptModal({ title, desc, placeholder = '', onSubmit }) {
    const titleEl = document.getElementById("prompt-title");
    const descEl = document.getElementById("prompt-desc");
    const textEl = document.getElementById("prompt-text");
    const submitBtn = document.getElementById("prompt-submit-btn");

    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = desc;
    if (textEl) {
      textEl.value = "";
      textEl.placeholder = placeholder;
    }

    promptCallback = onSubmit;

    if (submitBtn) {
      submitBtn.onclick = () => {
        const val = textEl ? textEl.value.trim() : '';
        if (!val) {
          showErrorNotification({ message: 'يرجى إدخال النص المطلوب للمتابعة.' }, 'حقل مطلوب');
          return;
        }
        closeModal("prompt-modal");
        if (typeof promptCallback === 'function') {
          promptCallback(val);
        }
      };
    }

    openModal("prompt-modal");
  }

  // =========================================================================
  // Standard ApiResponse Wrapper Parsing & Notification Helpers
  // =========================================================================
  function extractResponseData(res) {
    if (!res) return null;
    if (res.data !== undefined) return res.data;
    return res;
  }

  /**
   * Displays error notifications including full response.errors array on 400 Bad Request
   */
  function showErrorNotification(err, defaultTitle = 'حدث خطأ') {
    let errorList = [];
    let is403 = false;

    if (err) {
      if (err.status === 403 || (err.response && err.response.status === 403)) {
        is403 = true;
      }
      // Extract from response.errors array (Standard 400 Bad Request envelope)
      if (err.response && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
        errorList = err.response.errors;
      } else if (Array.isArray(err.errors) && err.errors.length > 0) {
        errorList = err.errors;
      } else if (err.message) {
        errorList = [err.message];
      }
    }

    if (errorList.length === 0) {
      errorList = ['فشلت العملية أثناء معالجة الطلب في الخادم.'];
    }

    const title = is403 ? 'صلاحيات غير كافية (403 Forbidden)' : defaultTitle;
    const message = is403
      ? 'يلزم توفر صلاحيات مدير النظام للقيام بهذا الإجراء (Admin privileges required).'
      : (errorList.length > 1 ? errorList.map(e => `• ${e}`).join('\n') : errorList[0]);

    if (window.showToast) {
      window.showToast({
        title,
        message,
        type: is403 ? 'warning' : 'error',
        duration: is403 ? 7000 : 5000
      });
    } else {
      alert(`${title}\n${message}`);
    }
  }

  function showSuccessNotification(title, message) {
    if (window.showToast) {
      window.showToast({ title, message, type: 'success' });
    } else {
      console.log(`[SUCCESS] ${title}: ${message}`);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeJsonAttr(val) {
    if (!val) return 'null';
    try {
      const str = typeof val === 'string' ? val : JSON.stringify(val);
      return str.replace(/'/g, '&apos;');
    } catch (e) {
      return 'null';
    }
  }

  // Global Exports for testing / layout interaction
  window.switchTab = switchTab;
  window.loadStores = loadStores;
  window.refreshStoreApplications = loadStores;
  window.loadUsers = loadUsers;
  window.loadCategories = loadCategories;
  window.loadAuditLogs = loadAuditLogs;
  window.openStoreDetails = openStoreDetails;
  window.openCategoryModal = openCategoryModal;
  window.closeModal = closeModal;
  window.startReview = startReview;
  window.promptRequestInfo = promptRequestInfo;
  window.approveApplication = approveApplication;
  window.approveStore = approveApplication;
  window.promptRejectApplication = promptRejectApplication;
  window.promptSuspendStore = promptSuspendStore;
  window.activateStore = activateStore;
  window.isValidGuid = isValidGuid;
  window.normalizeStoreApplication = normalizeStoreApplication;

})();
