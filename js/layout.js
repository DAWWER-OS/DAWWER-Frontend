const DawwerLayout = {
  STORAGE_KEY_SIDEBAR: 'dawwer_sidebar_open',
  STORAGE_KEY_STORE_NAME: 'dawwer_store_name',
  STORAGE_KEY_STORE_STATUS: 'dawwer_store_status',

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.injectStyles();
    this.ensureSidebar();
    this.setupUserInfo();
    this.initStoreIdentity();
    this.setupActiveLinks();
    this.setupSidebarControls();
    this.setupKeyboardShortcuts();
    this.ensureThemeToggle();
    this.initInactiveButtonsHandling();
    this.applyInitialState();
    window.matchMedia('(max-width: 767.98px)').addEventListener('change', () => {
      document.body.classList.remove('sidebar-open');
      this.applyInitialState();
    });

    if (typeof Auth !== 'undefined' && typeof Auth.requireAuth === 'function') {
      const isAuthed = Auth.requireAuth();
      if (!isAuthed) return;
    }

    if (typeof Auth !== 'undefined') {
      Auth.applyPermissionTrimming();
    }
  },

  injectStyles() {
    if (document.getElementById('dawwer-layout-dynamic-styles')) return;

    const style = document.createElement('style');
    style.id = 'dawwer-layout-dynamic-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

      /* Universal Typography: IBM Plex Sans Arabic */
      *, *::before, *::after, body, button, input, select, textarea, table, th, td, h1, h2, h3, h4, h5, h6, span, p, a, div {
        font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      /* Numbers, Currency & Inventory Data Clarity */
      .tabular-nums, .price-display, table th, table td, [data-price], [data-sku], [data-stock], .stat-value, .font-mono {
        font-feature-settings: "tnum" 1, "ss01" 1;
        font-variant-numeric: tabular-nums;
      }

      /* Labeled merchant navigation: fixed on desktop, drawer on mobile. */
      :root { --merchant-sidebar-width: 15.5rem; }
      #main-sidebar, #sidebar-box, #sidebar-drawer {
        position: fixed !important; inset: 0 0 0 auto !important;
        width: var(--merchant-sidebar-width) !important; height: 100dvh !important;
        display: flex !important; flex-direction: column !important; align-items: stretch !important;
        padding: 0 !important; background: #153f2d !important; color: #d1fae5 !important;
        border-left: 1px solid #ffffff14 !important; box-shadow: -4px 0 24px #0f172a0a !important;
        overflow: hidden !important; z-index: 50;
        transition: transform .22s ease, opacity .22s ease !important;
      }
      html.dark #main-sidebar { background: #0e2c1f !important; }
      #main-sidebar .sidebar-brand { display: flex; align-items: center; gap: 12px; padding: 24px 20px 20px; color: white; text-decoration: none; }
      #main-sidebar .sidebar-logo-badge { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid #ffffff24; border-radius: 14px; background: #ffffff0a; flex-shrink: 0; }
      #main-sidebar .sidebar-logo-badge img { width: 30px; height: 30px; object-fit: contain; }
      #main-sidebar .sidebar-brand-copy { display: grid; gap: 3px; }
      #main-sidebar .sidebar-brand-copy strong { font-size: 22px; line-height: 1.25; }
      #main-sidebar .sidebar-brand-copy small { font-size: 11px; color: #a8c9b6; }
      #main-sidebar .sidebar-nav { flex: 1; min-height: 0; overflow: auto; padding: 0 12px 12px; scrollbar-width: thin; scrollbar-color: #436850 transparent; }
      #main-sidebar .sidebar-section-title { margin: 14px 12px 8px; font-size: 10px; font-weight: 600; color: #a8c9b6; }
      #main-sidebar .nav-item {
        display: flex !important; align-items: center !important; justify-content: flex-start !important;
        width: 100%; min-height: 44px; gap: 12px; margin: 3px 0; padding: 11px 13px;
        border: 1px solid transparent; border-radius: 12px; text-decoration: none;
        color: #c4dfcf !important; background: transparent; transition: background .15s, color .15s;
      }
      #main-sidebar .nav-icon { display: grid; place-items: center; width: 22px; height: 22px; flex: 0 0 22px; }
      #main-sidebar .nav-icon svg { width: 21px !important; height: 21px !important; stroke: currentColor !important; stroke-width: 1.7px !important; filter: none !important; }
      #main-sidebar .sidebar-label { display: inline-block !important; opacity: 1 !important; width: auto !important; font-size: 13px; font-weight: 500; white-space: nowrap; }
      #main-sidebar .nav-item:hover { background: #ffffff0d !important; color: white !important; }
      #main-sidebar .nav-item.active { background: #edf5f0 !important; border-color: #ffffff33 !important; color: #153f2d !important; box-shadow: none !important; }
      html.dark #main-sidebar .nav-item.active { background: #1c5335 !important; border-color: #436850 !important; color: #ecfdf5 !important; }
      #main-sidebar .nav-item.active svg { color: #153f2d !important; stroke: currentColor !important; }
      html.dark #main-sidebar .nav-item.active svg { color: #ecfdf5 !important; stroke: currentColor !important; }
      #main-sidebar .nav-item::before { display: none !important; }
      #main-sidebar .nav-item.active .sidebar-label { font-weight: 700; }
      #main-sidebar .active-indicator { display: none; width: 5px; height: 5px; margin-right: auto; background: #d6a950; border-radius: 50%; flex-shrink: 0; }
      #main-sidebar .nav-item.active .active-indicator { display: block; }
      #main-sidebar .sidebar-footer { padding: 10px 12px 14px; border-top: 1px solid #ffffff14; }
      #main-sidebar .sidebar-logout { color: #fecdd3 !important; cursor: pointer; text-align: right; }
      #main-sidebar .nav-item:focus-visible, #main-sidebar .sidebar-brand:focus-visible, #main-sidebar .sidebar-close-btn:focus-visible { outline: 2px solid #d6a950; outline-offset: 2px; }
      #main-sidebar .sidebar-close-btn { display: none; position: absolute; top: 22px; left: 12px; width: 32px; height: 32px; border-radius: 8px; color: #d1fae5; background: #ffffff0d; border: 1px solid #ffffff1a; }
      .backdrop-hidden { opacity: 0; pointer-events: none; }
      .backdrop-visible { opacity: 1; pointer-events: auto; }
      @media (min-width: 768px) {
        #main-sidebar { transform: none !important; opacity: 1 !important; pointer-events: auto !important; }
        body.has-slim-sidebar { margin-right: var(--merchant-sidebar-width) !important; }
        body.has-slim-sidebar > header, body.has-slim-sidebar > main, body.has-slim-sidebar > footer, body.has-slim-sidebar > div.main-content { max-width: calc(100vw - var(--merchant-sidebar-width)) !important; }
        #sidebar-backdrop, .sidebar-toggle-btn, #sidebar-toggle-btn { display: none !important; }
      }
      @media (max-width: 767.98px) {
        #main-sidebar { width: min(18rem, calc(100vw - 3rem)) !important; }
        #main-sidebar.drawer-closed { transform: translateX(100%) !important; opacity: 0 !important; pointer-events: none !important; }
        #main-sidebar.drawer-open { transform: none !important; opacity: 1 !important; pointer-events: auto !important; }
        #main-sidebar .sidebar-close-btn { display: grid; place-items: center; }
        body.has-slim-sidebar { margin-right: 0 !important; }
        body.sidebar-open { overflow: hidden !important; }
      }

      /* ============================================================
         MOBILE RESPONSIVENESS ENHANCEMENTS
         ============================================================ */

      /* Responsive table containers: horizontal scroll with touch support */
      .table-scroll-container {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-left: -1rem;
        margin-right: -1rem;
        padding-left: 1rem;
        padding-right: 1rem;
      }
      @media (min-width: 640px) {
        .table-scroll-container {
          margin-left: 0;
          margin-right: 0;
          padding-left: 0;
          padding-right: 0;
        }
      }
      .table-scroll-container table {
        min-width: 640px;
      }
      .table-scroll-container th {
        white-space: nowrap !important;
      }

      /* iOS / Safari: prevent auto-zoom on inputs (min 16px) */
      @media (max-width: 767.98px) {
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="number"],
        input[type="password"],
        input[type="search"],
        select,
        textarea {
          font-size: 16px !important;
        }
      }

      /* Hide tooltips on touch/mobile (no hover) */
      @media (max-width: 767.98px) {
        .sidebar-tooltip {
          display: none !important;
        }
      }

      /* Modal mobile: full-width bottom-sheet friendly */
      @media (max-width: 639.98px) {
        .modal-panel-responsive {
          width: 100% !important;
          max-width: 100% !important;
          margin: auto !important;
          border-radius: 1.25rem !important;
          padding: 1rem !important;
          max-height: 92vh !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .modal-actions-sticky {
          position: sticky !important;
          bottom: 0 !important;
          background: white !important;
          padding: 0.75rem 0 0.25rem !important;
          z-index: 10 !important;
          border-top: 1px solid #e2e8f0 !important;
        }
      }

      /* Pure Hover Tooltips (Floating adjacent dark badge to the left of the 64px rail) */
      .sidebar-tooltip {
        position: absolute !important;
        right: calc(100% + 12px) !important;
        top: 50% !important;
        transform: translateY(-50%) scale(0.95) !important;
        background-color: #111827 !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        z-index: 50 !important;
        transition: opacity 0.15s ease-out, transform 0.15s ease-out, visibility 0.15s ease-out !important;
      }

      .group:hover .sidebar-tooltip {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(-50%) scale(1) !important;
      }

      /* Active Navigation Tab Highlighting */
      .nav-item.active,
      .nav-item.active-tab {
        background-color: rgba(255, 255, 255, 0.15) !important;
        color: #ffffff !important;
        border: 1px solid rgba(52, 211, 153, 0.35) !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
        font-weight: 700 !important;
      }

      .nav-item.active svg,
      .nav-item.active-tab svg {
        stroke: #ffffff !important;
        color: #ffffff !important;
      }

      .nav-item.active::before,
      .nav-item.active-tab::before {
        content: "";
        position: absolute;
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 20px;
        background-color: #10b981 !important;
        border-radius: 4px 0 0 4px;
      }

      /* Subtle Scrollbar for icons list */
      .sidebar-nav::-webkit-scrollbar {
        width: 2px;
      }
      .sidebar-nav::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-nav::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }

      #sidebar-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background-color: rgba(15, 23, 42, 0.45) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        z-index: 40 !important;
        transition: opacity 0.3s ease !important;
      }

      #sidebar-backdrop.backdrop-hidden,
      #sidebar-backdrop:not(.backdrop-visible) {
        opacity: 0 !important;
        pointer-events: none !important;
        display: none !important;
      }

      #sidebar-backdrop.backdrop-visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        display: block !important;
      }

      @media (min-width: 768px) {
        #sidebar-backdrop {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      }

      /* Explicit Stacking Context & Pointer-Events for Catalog Controls */
      .catalog-toolbar,
      #btn-ai-shelf-scan,
      #btn-import-catalog,
      #btn-add-product,
      .tab-btn,
      .status-tab,
      .btn-edit-p,
      .btn-del-p,
      .toggle-availability,
      table button,
      table input {
        position: relative;
        z-index: 10;
        pointer-events: auto !important;
      }

      /* Prevent any hidden modal or backdrop from intercepting pointer interactions */
      .modal-backdrop:not(.active):not(.opacity-100),
      [id$="-modal"].hidden,
      [id$="-modal"].hidden * {
        pointer-events: none !important;
      }

      /* Global Dark Mode Surface & Text Adaptations (Slate / Emerald Theme) */
      html.dark {
        color-scheme: dark;
      }
      html.dark body {
        background-color: #020617 !important; /* slate-950 */
        color: #f1f5f9 !important; /* slate-100 */
      }
      html.dark header {
        background-color: rgba(15, 23, 42, 0.9) !important; /* slate-900/90 */
        border-color: #1e293b !important; /* slate-800 */
      }
      html.dark .bg-white:not(.nav-item):not(.sidebar-logo-badge):not(.sidebar-brand-badge),
      html.dark .card,
      html.dark .panel,
      html.dark [class*="bg-white"]:not(.nav-item):not(.sidebar-logo-badge):not(.sidebar-brand-badge) {
        background-color: #0f172a !important; /* slate-900 */
        border-color: #1e293b !important; /* slate-800 */
      }
      html.dark .bg-slate-50,
      html.dark .bg-slate-50\/50,
      html.dark .bg-slate-50\/70 {
        background-color: #020617 !important; /* slate-950 */
      }
      html.dark .bg-slate-100 {
        background-color: #1e293b !important; /* slate-800 */
        border-color: #334155 !important; /* slate-700 */
      }
      html.dark .bg-slate-200, html.dark .bg-slate-200\/70, html.dark .bg-slate-200\/60 {
        background-color: rgba(30, 41, 59, 0.7) !important;
        border-color: #334155 !important;
      }
      html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6,
      html.dark .text-slate-900, html.dark .text-slate-800, html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-black {
        color: #f1f5f9 !important; /* slate-100 */
      }
      html.dark .text-slate-700, html.dark .text-slate-600, html.dark .text-gray-700, html.dark .text-gray-600 {
        color: #cbd5e1 !important; /* slate-300 */
      }
      html.dark p.text-slate-500, html.dark span.text-slate-500, html.dark .text-slate-500, html.dark .text-slate-400, html.dark .text-gray-500, html.dark .text-gray-400 {
        color: #94a3b8 !important; /* slate-400 */
      }
      html.dark .border-slate-200, html.dark .border-slate-100, html.dark .border-slate-200\/80, html.dark .border-slate-200\/90, html.dark .border-gray-200 {
        border-color: #1e293b !important; /* slate-800 */
      }
      html.dark .border-slate-300, html.dark .border-gray-300 {
        border-color: #334155 !important; /* slate-700 */
      }
      html.dark input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), 
      html.dark select, 
      html.dark textarea {
        background-color: #1e293b !important; /* slate-800 */
        color: #f1f5f9 !important; /* slate-100 */
        border-color: #334155 !important; /* slate-700 */
      }
      html.dark input::placeholder,
      html.dark textarea::placeholder {
        color: #94a3b8 !important; /* slate-400 */
      }
      html.dark input:focus,
      html.dark select:focus,
      html.dark textarea:focus {
        border-color: #10b981 !important; /* emerald-500 */
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
      }
      html.dark .bg-emerald-50, html.dark .bg-green-50 {
        background-color: rgba(6, 78, 59, 0.4) !important; /* emerald-950/40 */
        border-color: #065f46 !important; /* emerald-800 */
        color: #34d399 !important; /* emerald-400 */
      }
      html.dark .text-emerald-700, html.dark .text-emerald-800, html.dark .text-emerald-600, html.dark .text-green-700, html.dark .text-[#1c5335], html.dark .text-[#153f2d] {
        color: #34d399 !important; /* emerald-400 */
      }
      html.dark table thead th, html.dark table thead tr {
        background-color: rgba(15, 23, 42, 0.8) !important; /* slate-900/80 */
        color: #cbd5e1 !important; /* slate-300 */
        border-color: #1e293b !important; /* slate-800 */
      }
      html.dark table tbody tr {
        border-color: #1e293b !important; /* slate-800 */
      }
      html.dark table tbody tr:hover {
        background-color: rgba(30, 41, 59, 0.5) !important; /* slate-800/50 */
      }
      html.dark .modal-content,
      html.dark [id$="-modal"] > div,
      html.dark [id*="modal"] > div:not(.bg-slate-900\/60):not(.backdrop-blur-xs):not(.backdrop-blur-sm) {
        background-color: #0f172a !important; /* slate-900 */
        border-color: #1e293b !important; /* slate-800 */
        color: #f1f5f9 !important;
      }
    `;
    document.head.appendChild(style);
  },

  getSlimSidebarHTML() {
    const icon = path => `<span class="nav-icon" aria-hidden="true"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg></span>`;
    const groups = [
      { title: 'المتجر', items: [
        ['dashboard.html', 'لوحة التحكم', 'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z'],
        ['catalog.html', 'المنتجات', 'M4 7h16l1 13H3L4 7z M8 7V5a4 4 0 018 0v2'],
        ['store-map.html', 'خريطة المتجر', 'M3 5l6 2 6-3 6 2v14l-6-2-6 3-6-2z M9 7v14 M15 4v14'],
        ['inventory-audit.html', 'المخزون والجرد', 'M9 5H5v16h14V5h-4 M9 3h6v4H9z M8 12h8 M8 16h5'],
        ['orders.html', 'الطلبات', 'M4 7h16v14H4z M8 7V5a4 4 0 018 0v2 M9 12h6'],
      ]},
      { title: 'إضافة ومراجعة', items: [
        ['ai-capture.html', 'تصوير الرفوف', 'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 11-8 0 4 4 0 018 0'],
        ['review-drafts.html', 'مراجعة المنتجات', 'M9 5H5v16h14V5h-4 M9 3h6v4H9z M8 14l3 3 5-6'],
      ]},
      { title: 'الإدارة', items: [
        ['store-staff.html', 'الموظفون والصلاحيات', 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M13 7a4 4 0 11-8 0 4 4 0 018 0 M17 3a4 4 0 010 8 M22 21v-2a4 4 0 00-3-3.87'],
        ['merchant-application.html', 'بيانات المتجر', 'M3 21h18 M5 21V4h14v17 M9 8h2 M13 8h2 M9 12h2 M13 12h2 M10 21v-5h4v5'],
        ['profile.html', 'حسابي', 'M16 7a4 4 0 11-8 0 4 4 0 018 0 M4 21a8 8 0 0116 0'],
      ]},
    ];
    if (typeof Auth !== 'undefined' && Auth.isAdmin?.()) groups[2].items.unshift(['admin-dashboard.html', 'الإدارة المركزية', 'M12 3l9 4c0 7-4 12-9 14-5-2-9-7-9-14z M8 12l3 3 5-6']);
    return `<a href="dashboard.html" class="sidebar-brand" aria-label="دوّر — الرئيسية">
      <span class="sidebar-logo-badge"><img src="assets/images/FrameLogo.png" alt=""/></span>
      <span class="sidebar-brand-copy"><strong>دوّر</strong><small>إدارة متجرك</small></span>
    </a>
    <button type="button" class="sidebar-close-btn" data-sidebar-close aria-label="إغلاق القائمة">${icon('M6 6l12 12 M6 18L18 6')}</button>
    <nav class="sidebar-nav" aria-label="التنقل الرئيسي">${groups.map(group => `<div class="sidebar-section"><p class="sidebar-section-title">${group.title}</p>${group.items.map(([href, label, path]) => `<a href="${href}" class="nav-item" aria-label="${label}">${icon(path)}<span class="sidebar-label">${label}</span><span class="active-indicator" aria-hidden="true"></span></a>`).join('')}</div>`).join('')}</nav>
    <div class="sidebar-footer"><button id="logout-btn" type="button" data-action="logout" class="nav-item sidebar-logout">${icon('M9 5H4v14h5 M13 8l4 4-4 4 M8 12h13')}<span class="sidebar-label">تسجيل الخروج</span></button></div>`;
  },

  ensureSidebar() {
    if (document.body.classList.contains('landing-page') || document.body.classList.contains('auth-page')) return;
    const isSpecialPage = /login|register|verify-account|forgot-password|reset-password|admin-login|admin-dashboard|select-store|landing/i.test(window.location.pathname);
    if (isSpecialPage) return;

    const lingeringDrawer = document.getElementById('sidebar-drawer');
    if (lingeringDrawer) {
      lingeringDrawer.remove();
    }

    let sidebar = document.getElementById('main-sidebar') || document.getElementById('sidebar-box');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'main-sidebar';
      document.body.prepend(sidebar);
    } else {
      sidebar.id = 'main-sidebar';
    }

    sidebar.className = 'merchant-sidebar';
    sidebar.innerHTML = this.getSlimSidebarHTML();

    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'backdrop-hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40';
      document.body.appendChild(backdrop);
    }

    document.body.classList.add('has-slim-sidebar');
  },

  getSidebar() {
    return document.getElementById('main-sidebar') || document.getElementById('sidebar-box') || document.getElementById('sidebar-drawer');
  },

  getBackdrop() {
    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop && typeof document !== 'undefined' && document.body) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'backdrop-hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300';
      backdrop.onclick = () => this.closeSidebar();
      document.body.appendChild(backdrop);
    }
    return backdrop;
  },

  isOpen() {
    const sidebar = this.getSidebar();
    return sidebar ? sidebar.classList.contains('drawer-open') : false;
  },

  applyInitialState() {
    const sidebar = this.getSidebar();
    const backdrop = this.getBackdrop();
    if (!sidebar) return;

    const mobile = window.innerWidth < 768;
    sidebar.inert = mobile;
    sidebar.setAttribute('aria-hidden', String(mobile));
    this.updateSidebarTriggers(!mobile);
    if (mobile) {
      sidebar.classList.remove('drawer-open');
      sidebar.classList.add('drawer-closed');
      if (backdrop) {
        backdrop.classList.remove('backdrop-visible');
        backdrop.classList.add('backdrop-hidden');
      }
    } else {
      sidebar.classList.remove('drawer-closed');
      sidebar.classList.add('drawer-open');
    }
  },

  openSidebar() {
    const sidebar = this.getSidebar();
    const backdrop = this.getBackdrop();
    if (!sidebar) return;

    sidebar.inert = false;
    sidebar.setAttribute('aria-hidden', 'false');
    this.updateSidebarTriggers(true);
    sidebar.classList.remove('drawer-closed');
    sidebar.classList.add('drawer-open');

    if (window.innerWidth < 768) {
      if (backdrop) {
        backdrop.classList.remove('backdrop-hidden');
        backdrop.classList.add('backdrop-visible');
      }
      document.body.classList.add('sidebar-open');
    }
  },

  closeSidebar() {
    const sidebar = this.getSidebar();
    const backdrop = this.getBackdrop();
    if (sidebar && window.innerWidth < 768) {
      sidebar.inert = true;
      sidebar.setAttribute('aria-hidden', 'true');
      this.updateSidebarTriggers(false);
      sidebar.classList.remove('drawer-open');
      sidebar.classList.add('drawer-closed');
    }

    if (backdrop) {
      backdrop.classList.remove('backdrop-visible');
      backdrop.classList.add('backdrop-hidden');
    }

    document.body.classList.remove('sidebar-open');
  },

  toggleSidebar() {
    const sidebar = this.getSidebar();
    if (!sidebar) return;

    if (sidebar.classList.contains('drawer-open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  },

  updateSidebarTriggers(open) {
    document.querySelectorAll('.sidebar-toggle-btn, #mobile-menu-btn, #sidebar-toggle-btn, [data-sidebar-toggle]').forEach(btn => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-controls', 'main-sidebar');
      btn.setAttribute('aria-label', 'القائمة الرئيسية');
    });
  },

  setupSidebarControls() {
    document.querySelectorAll('[data-sidebar-close]').forEach(btn => btn.addEventListener('click', () => this.closeSidebar()));
    document.querySelectorAll('.sidebar-toggle-btn, #mobile-menu-btn, #sidebar-toggle-btn, [data-sidebar-toggle]').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.toggleSidebar();
      };
      btn.setAttribute('title', 'القائمة الجانبية');
    });

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.onclick = () => this.closeSidebar();
    }

    document.querySelectorAll('#sidebar-box a, .sidebar-nav a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          this.closeSidebar();
        }
      });
    });

    document.addEventListener('click', function(e) {
      const logoutTrigger = e.target.closest('#logout-btn, #top-logout-btn, [data-action="logout"], a[href*="logout"], .logout-btn');
      if (logoutTrigger) {
        e.preventDefault();
        e.stopPropagation();

        // 1. Clear all session credentials immediately
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('storeToken');
        localStorage.removeItem('activeStoreId');
        localStorage.removeItem('dawwer_access_token');
        localStorage.removeItem('dawwer_refresh_token');
        localStorage.removeItem('dawwer_user_data');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('store_token');
        localStorage.removeItem('dawwer_store_token');
        sessionStorage.clear();

        // 2. Direct hard redirect to login page
        window.location.replace('login.html');
      }
    });
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault();
          if (window.innerWidth < 768) {
            this.toggleSidebar();
          }
        }
      }
      if (e.key === 'Escape' && window.innerWidth < 768) {
        this.closeSidebar();
      }
    });
  },

  setupUserInfo() {
    let ownerName = 'أحمد سليم';
    try {
      const storedOwner = localStorage.getItem('ownerName') || localStorage.getItem('merchant_name') || localStorage.getItem('user_name');
      if (storedOwner && storedOwner.trim()) {
        ownerName = storedOwner.trim();
      } else {
        const uRaw = localStorage.getItem('dawwer_user_data') || localStorage.getItem('userData');
        if (uRaw) {
          const u = JSON.parse(uRaw);
          if (u && (u.fullName || u.name || u.ownerName)) {
            ownerName = (u.fullName || u.name || u.ownerName).trim();
          }
        }
      }
    } catch (e) {}

    document.querySelectorAll('[data-owner-name], .owner-name-display').forEach(el => {
      el.textContent = ownerName;
    });
  },

  initInactiveButtonsHandling() {
    if (this._inactivityHandlerAttached) return;
    this._inactivityHandlerAttached = true;

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('a, button');
      if (!btn) return;

      // 1. Explicit coming soon indicators or known incomplete feature buttons
      if (btn.matches('[data-feature="coming-soon"], [data-status="upcoming"], .coming-soon-btn, .feature-coming-soon')) {
        e.preventDefault();
        e.stopPropagation();
        const featureName = btn.getAttribute('data-feature-name') || btn.textContent.trim().replace(/^[\+\s]+/, '') || 'الميزة';
        if (typeof DawwerNotification !== 'undefined' && typeof DawwerNotification.showComingSoon === 'function') {
          DawwerNotification.showComingSoon(featureName);
        } else if (typeof showToast === 'function') {
          showToast({ title: 'قريباً', message: 'هذه الميزة قيد التطوير وستكون متاحة في التحديث القادم 🚀', type: 'info' });
        }
        return;
      }

      // 2. Links to incomplete pages or dead navigation
      const href = btn.getAttribute('href');
      if (href && (
        href === 'payment-review.html' || 
        (href === '#' && !btn.getAttribute('data-close-modal') && !btn.getAttribute('data-action'))
      )) {
        e.preventDefault();
        e.stopPropagation();
        const featureName = btn.textContent.trim() || 'الصفحة';
        if (typeof DawwerNotification !== 'undefined' && typeof DawwerNotification.showComingSoon === 'function') {
          DawwerNotification.showComingSoon(featureName);
        } else if (typeof showToast === 'function') {
          showToast({ title: 'قريباً', message: 'هذه الميزة قيد التطوير وستكون متاحة في التحديث القادم 🚀', type: 'info' });
        }
      }
    });
  },

  STORAGE_KEY_STORE_NAME: 'dawwer_store_name',
  STORAGE_KEY_STORE_STATUS: 'dawwer_store_status',

  cleanStoreName(name) {
    if (!name || typeof name !== 'string') return '';
    let cleaned = name.trim();
    if (cleaned === 'null' || cleaned === 'undefined') return '';

    // Remove duplicate consecutive "سوبر ماركت" or "سوبرماركت"
    // e.g. "سوبر ماركت سوبرماركت النخبة" -> "سوبر ماركت النخبة"
    while (/(سوبر\s*ماركت|سوبرماركت)[\s\-_/]+(سوبر\s*ماركت|سوبرماركت)\b/i.test(cleaned)) {
      cleaned = cleaned.replace(/(سوبر\s*ماركت|سوبرماركت)[\s\-_/]+(سوبر\s*ماركت|سوبرماركت)\b/i, '$1');
    }

    // Clean old hardcoded mock references to clean fallback
    if (cleaned === 'سوبرماركت النخبة' || cleaned === 'سوبر ماركت النخبة' || cleaned === 'النخبة') {
      return 'المتجر';
    }

    return cleaned;
  },

  getStoredStoreName() {
    // 1. Check user profile object in localStorage (e.g. currentUser.store_name)
    const userKeys = ['currentUser', 'dawwer_user_data', 'userData', 'user', 'dawwer_user'];
    for (const uKey of userKeys) {
      try {
        const uRaw = localStorage.getItem(uKey) || (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY ? localStorage.getItem(CONFIG.USER_KEY) : null);
        if (uRaw) {
          const u = typeof uRaw === 'string' ? JSON.parse(uRaw) : uRaw;
          const candidate = u?.store_name || u?.storeName || u?.store?.name || u?.store?.storeName;
          if (candidate && typeof candidate === 'string') {
            const cleaned = this.cleanStoreName(candidate);
            if (cleaned) return cleaned;
          }
        }
      } catch (e) {}
    }

    // 2. Direct keys from localStorage
    const directKeys = ['storeName', 'store_name', 'activeStoreName', 'dawwer_store_name', this.STORAGE_KEY_STORE_NAME];
    for (const key of directKeys) {
      if (!key) continue;
      const val = localStorage.getItem(key);
      if (val && val.trim() && val !== 'null' && val !== 'undefined') {
        const cleaned = this.cleanStoreName(val);
        if (cleaned) return cleaned;
      }
    }

    // 3. Active store object from localStorage
    try {
      const activeStoreRaw = localStorage.getItem('dawwer_active_store') ||
                             (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.ACTIVE_STORE_KEY) : null);
      if (activeStoreRaw) {
        const activeStore = JSON.parse(activeStoreRaw);
        const candidate = activeStore?.storeName || activeStore?.name || activeStore?.commercialName;
        if (candidate && typeof candidate === 'string') {
          const cleaned = this.cleanStoreName(candidate);
          if (cleaned) return cleaned;
        }
      }
    } catch (e) {}

    // 4. Auth module helpers
    try {
      if (typeof Auth !== 'undefined') {
        if (typeof Auth.getActiveStore === 'function') {
          const s = Auth.getActiveStore();
          const candidate = s?.storeName || s?.name;
          if (candidate && typeof candidate === 'string') {
            const cleaned = this.cleanStoreName(candidate);
            if (cleaned) return cleaned;
          }
        }
        if (typeof Auth.getUser === 'function') {
          const u = Auth.getUser();
          const candidate = u?.store_name || u?.storeName;
          if (candidate && typeof candidate === 'string') {
            const cleaned = this.cleanStoreName(candidate);
            if (cleaned) return cleaned;
          }
        }
      }
    } catch (e) {}

    return null;
  },

  initStoreIdentity() {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    const fallbackName = isSuperAdmin ? "الإدارة العامة لمنظومة دوّر" : "المتجر";

    const currentStoreName = this.getStoredStoreName() || fallbackName;

    const cachedStatus = localStorage.getItem(this.STORAGE_KEY_STORE_STATUS) ||
      (typeof Auth !== 'undefined' && Auth.getActiveStore ? (Auth.getActiveStore() && Auth.getActiveStore().roleName) : null);

    this.updateStoreIdentity(currentStoreName, cachedStatus);

    // Listen to storage events and custom select-store events
    if (typeof window !== 'undefined' && !this._listenersAttached) {
      this._listenersAttached = true;

      window.addEventListener('storage', (e) => {
        if (e.key === 'storeName' || e.key === 'store_name' || e.key === this.STORAGE_KEY_STORE_NAME || e.key === 'dawwer_active_store' || e.key === 'currentUser' || e.key === 'dawwer_user_data') {
          const name = this.getStoredStoreName() || fallbackName;
          this.updateStoreIdentity(name);
        }
      });

      window.addEventListener('dawwer:store-selected', (e) => {
        if (e.detail && (e.detail.storeName || e.detail.name)) {
          this.updateStoreIdentity(e.detail.storeName || e.detail.name, e.detail.roleName);
        }
      });
    }

    if (!isSuperAdmin && typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
      this.fetchStoreProfile();
    }
  },

  updateStoreIdentity(storeName, status = null) {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    const fallbackName = isSuperAdmin ? "الإدارة العامة لمنظومة دوّر" : "المتجر";
    const cleaned = this.cleanStoreName(storeName);
    const finalName = cleaned || fallbackName;

    const nameEl = document.getElementById('current-store-name');
    if (nameEl) {
      nameEl.textContent = finalName;
    }

    document.querySelectorAll('[data-store-name], #store-name-text').forEach(el => {
      el.textContent = finalName;
    });



    if (finalName && finalName !== fallbackName) {
      try {
        localStorage.setItem('store_name', finalName);
        localStorage.setItem('storeName', finalName);
        localStorage.setItem(this.STORAGE_KEY_STORE_NAME, finalName);
      } catch (e) {}
    }

    if (status !== null && status !== undefined) {
      const statusEl = document.getElementById('current-store-status');
      if (statusEl) {
        let label = 'متجر معتمد ونشط';
        let badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        let dotColor = 'bg-emerald-400';

        const sStr = String(status).toLowerCase();
        if (sStr === '3' || sStr === 'underreview' || sStr.includes('review')) {
          label = 'قيد المراجعة والتدقيق';
          badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
          dotColor = 'bg-amber-400';
        } else if (sStr === '2' || sStr === 'submitted' || sStr.includes('submit')) {
          label = 'طلب بانتظار الاعتماد';
          badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30';
          dotColor = 'bg-blue-400';
        } else if (sStr === '4' || sStr === 'needsinformation' || sStr.includes('info')) {
          label = 'مطلوب استكمال البيانات';
          badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30';
          dotColor = 'bg-orange-400';
        } else if (sStr === '1' || sStr === 'draft' || sStr.includes('draft')) {
          label = 'مسودة طلب متجر';
          badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30';
          dotColor = 'bg-slate-400';
        } else if (sStr === 'admin' || isSuperAdmin) {
          label = 'مدير النظام (Super Admin)';
          badgeClasses = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          dotColor = 'bg-emerald-400';
        }

        statusEl.className = badgeClasses;
        statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse"></span><span>${label}</span>`;

        try {
          localStorage.setItem(this.STORAGE_KEY_STORE_STATUS, String(status));
        } catch (e) {}
      }
    }
  },

  async fetchStoreProfile(storeId = null) {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    if (isSuperAdmin) return null;

    try {
      const targetId = storeId || (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId ? ApiClient.getActiveStoreId() : null);
      if (!targetId) return null;

      let profile = null;

      if (typeof ApiClient !== 'undefined' && ApiClient.stores && targetId) {
        const res = await ApiClient.stores.getStore(targetId, { suppressAuthPrompt: true }).catch(() => null);
        if (res && res.success !== false && res.data) {
          profile = res.data;
        }
      }

      if (profile && (profile.name || profile.storeName)) {
        const storeName = profile.name || profile.storeName || profile.commercialName;
        const status = profile.status || profile.statusText || profile.verificationStatus || 'Approved';

        if (storeName) {
          this.updateStoreIdentity(storeName, status);
        }

        return profile;
      }
    } catch (err) {
      console.warn('[DawwerLayout] fetchStoreProfile background fetch error:', err);
    }
    return null;
  },

  async openStoreSwitcher() {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    if (isSuperAdmin) {
      console.info('[DawwerLayout] openStoreSwitcher suppressed for SuperAdmin');
      return;
    }

    let modal = document.getElementById('dawwer-store-selector-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'dawwer-store-selector-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6 bg-gradient-to-r from-[#153f2d] to-[#1c5335] text-white">
          <h3 class="text-lg font-bold">اختيار المتجر النشط</h3>
          <p class="text-xs text-white/80 mt-1">يرجى اختيار أحد المتاجر المسجلة للوصول إلى المنتجات وإدارة الرفوف.</p>
        </div>
        <div id="dawwer-store-selector-list" class="p-6 space-y-3 max-h-80 overflow-y-auto">
          <div class="flex items-center justify-center py-6 text-slate-400">
            <svg class="animate-spin h-6 w-6 text-[#1c5335] dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          </div>
        </div>
        <div class="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <a href="merchant-application.html" class="text-xs font-bold text-[#1c5335] dark:text-emerald-400 hover:underline">+ تسجيل متجر جديد</a>
          <button type="button" id="dawwer-store-selector-close-btn" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer">إغلاق</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('dawwer-store-selector-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => modal.remove();
    }

    try {
      const res = (typeof ApiClient !== 'undefined') ? await ApiClient.get('/merchant/stores').catch(() => null) : null;
      const listContainer = document.getElementById('dawwer-store-selector-list');
      if (listContainer) {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          listContainer.innerHTML = res.data.map(s => `
            <button type="button" data-store-select-id="${s.id}" class="w-full text-right p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-[#1c5335] dark:hover:border-emerald-500 hover:bg-[#1c5335]/5 dark:hover:bg-slate-800 transition flex items-center justify-between group cursor-pointer">
              <div>
                <div class="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-[#1c5335] dark:group-hover:text-emerald-400">${s.name || 'متجر غير معنون'}</div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">${s.id}</div>
              </div>
              <span class="text-xs text-[#1c5335] dark:text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition">اختيار ←</span>
            </button>
          `).join('');

          listContainer.querySelectorAll('[data-store-select-id]').forEach(btn => {
            btn.onclick = async () => {
              const sid = btn.getAttribute('data-store-select-id');
              if (sid && typeof Auth !== 'undefined' && Auth.selectStore) {
                await Auth.selectStore(sid);
                window.location.reload();
              } else if (sid && typeof ApiClient !== 'undefined') {
                ApiClient.setActiveStoreId(sid);
                window.location.reload();
              }
            };
          });
        } else {
          listContainer.innerHTML = `
            <div class="text-center py-6">
              <p class="text-sm text-slate-600 font-semibold mb-3">لا توجد متاجر نشطة مرتبطة بحسابك</p>
              <a href="merchant-application.html" class="inline-block px-4 py-2 bg-[#1c5335] text-white rounded-xl text-xs font-bold hover:bg-[#153f2d] transition">تقديم طلب اعتماد متجر جديد</a>
            </div>
          `;
        }
      }
    } catch (err) {
      console.warn('Failed to load stores into selector modal:', err);
    }
  },

  setupUserInfo() {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const store = typeof Auth !== 'undefined' ? Auth.getActiveStore() : null;

    if (user) {
      document.querySelectorAll('[data-user-name]').forEach(el => {
        el.innerText = user.fullName || 'مستخدم دوّر';
      });

      document.querySelectorAll('[data-user-role]').forEach(el => {
        if ((typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin(user)) || user.role === 'Admin' || user.role === 4 || /admin|superadmin/i.test(String(user.role))) {
          el.innerText = 'مدير المنصة الرئيسي';
        } else if (store && store.roleName) {
          el.innerText = store.roleName;
        } else {
          el.innerText = 'تاجر معتمد';
        }
      });
    }

    if (store && store.storeName) {
      this.updateStoreIdentity(store.storeName, store.roleName);
    }
  },

  setupActiveLinks() {
    const rawPath = window.location.pathname.split('/').pop() || 'index.html';
    const cleanPath = (rawPath.split('?')[0].split('#')[0] || 'index.html').toLowerCase();

    document.querySelectorAll('.nav-item, #sidebar-box a, .sidebar-nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const cleanHref = href.split('?')[0].split('#')[0].toLowerCase();

      const isCurrent = cleanHref === cleanPath ||
        (cleanPath === '' && (cleanHref === 'index.html' || cleanHref === 'dashboard.html')) ||
        (cleanPath === 'index.html' && (cleanHref === 'index.html' || cleanHref === 'dashboard.html')) ||
        (cleanPath === 'dashboard.html' && (cleanHref === 'dashboard.html' || cleanHref === 'index.html'));

      if (isCurrent) {
        link.classList.add('active', 'active-tab', 'text-white');
        link.setAttribute('aria-current', 'page');
        link.classList.remove('text-emerald-100/60', 'text-white/70');
      } else {
        link.classList.remove('active', 'active-tab', 'text-white');
        link.removeAttribute('aria-current');
        link.classList.add('text-emerald-100/60');
      }
    });
  },

  ensureThemeToggle() {
    let toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) {
      const header = document.querySelector('header');
      if (header) {
        const logoutBtn = header.querySelector('[data-action="logout"], #logout-btn');
        const btnContainer = document.createElement('div');
        btnContainer.innerHTML = `
          <button id="theme-toggle-btn" type="button" aria-label="تبديل الوضع الليلي" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm focus:outline-none cursor-pointer active:scale-95">
            <!-- Moon Icon (shown in Light Mode) -->
            <svg id="theme-moon-icon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <!-- Sun Icon (shown in Dark Mode) -->
            <svg id="theme-sun-icon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </button>
        `.trim();
        toggleBtn = btnContainer.firstElementChild;

        if (logoutBtn && logoutBtn.parentElement) {
          logoutBtn.parentElement.insertBefore(toggleBtn, logoutBtn);
        } else {
          const actionArea = header.querySelector('.flex.items-center:last-child') || header;
          actionArea.appendChild(toggleBtn);
        }
      }
    }

    if (typeof initThemeToggle === 'function') {
      initThemeToggle();
    } else if (typeof syncThemeToggleState === 'function') {
      syncThemeToggleState();
    } else {
      // Fallback synchronization if theme.js is not loaded yet
      const isDark = document.documentElement.classList.contains('dark');
      const moon = document.getElementById('theme-moon-icon');
      const sun = document.getElementById('theme-sun-icon');
      if (moon && sun) {
        moon.classList.toggle('hidden', isDark);
        sun.classList.toggle('hidden', !isDark);
      }
      if (toggleBtn && !toggleBtn.dataset.themeBound) {
        toggleBtn.dataset.themeBound = 'true';
        toggleBtn.onclick = (e) => {
          e.preventDefault();
          const nextDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('theme', nextDark ? 'dark' : 'light');
          if (moon && sun) {
            moon.classList.toggle('hidden', nextDark);
            sun.classList.toggle('hidden', !nextDark);
          }
        };
      }
    }
  }
};

function closeSidebar() {
  DawwerLayout.closeSidebar();
}

function openSidebar() {
  DawwerLayout.openSidebar();
}

function toggleSidebar() {
  DawwerLayout.toggleSidebar();
}

function fetchStoreProfile(storeId) {
  return DawwerLayout.fetchStoreProfile(storeId);
}

function updateStoreIdentity(name, status) {
  return DawwerLayout.updateStoreIdentity(name, status);
}

window.closeSidebar = closeSidebar;
window.openSidebar = openSidebar;
window.toggleSidebar = toggleSidebar;
window.fetchStoreProfile = fetchStoreProfile;
window.updateStoreIdentity = updateStoreIdentity;
window.DawwerLayout = DawwerLayout;

DawwerLayout.injectStyles();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    DawwerLayout.init();
  });
} else {
  DawwerLayout.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DawwerLayout;
}
