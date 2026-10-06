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
    this.applyInitialState();

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

      /* Strictly Static Slim Desktop Sidebar (64px fixed rail on right in RTL) */
      #sidebar-box, #sidebar-drawer {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        height: 100vh !important;
        width: 64px !important;
        min-width: 64px !important;
        max-width: 64px !important;
        background: #153f2d !important;
        color: #f1f5f9 !important;
        z-index: 50 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 12px 0 !important;
        box-shadow: -3px 0 20px rgba(0, 0, 0, 0.22) !important;
        border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
        user-select: none !important;
        overflow: visible !important;
        transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease !important;
        will-change: transform !important;
      }

      .sidebar-nav {
        overflow: visible !important;
      }

      /* Desktop Layout: Fixed 64px rail, never expands or pushes page content */
      @media (min-width: 768px) {
        #sidebar-box, #sidebar-drawer {
          transform: translateX(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        body:not(.auth-page) {
          margin-right: 64px !important;
        }

        body:not(.auth-page) > header,
        body:not(.auth-page) > main,
        body:not(.auth-page) > footer,
        body:not(.auth-page) > div.main-content {
          max-width: calc(100vw - 64px) !important;
        }

        #sidebar-backdrop {
          display: none !important;
        }

        .sidebar-toggle-btn, #sidebar-toggle-btn {
          display: none !important;
        }
      }

      /* Mobile Behavior (< 768px): Off-canvas drawer sliding from right */
      @media (max-width: 767.98px) {
        #sidebar-box.drawer-closed, #sidebar-drawer.drawer-closed {
          transform: translateX(100%) !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        #sidebar-box.drawer-open, #sidebar-drawer.drawer-open {
          transform: translateX(0) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        body:not(.auth-page) {
          margin-right: 0 !important;
        }

        /* Lock body scroll when mobile drawer is open */
        body.sidebar-open {
          overflow: hidden !important;
        }
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
        background-color: #d6a950 !important;
        color: #153f2d !important;
        box-shadow: 0 4px 14px rgba(214, 169, 80, 0.35) !important;
        font-weight: 700 !important;
      }

      .nav-item.active svg,
      .nav-item.active-tab svg {
        stroke: #153f2d !important;
        color: #153f2d !important;
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
        background-color: #d6a950;
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
    `;
    document.head.appendChild(style);
  },

  getSlimSidebarHTML() {
    return `
      <!-- TOP: Minimal Brand Icon/Logo Only -->
      <div class="flex flex-col items-center w-full pt-1 px-1.5 shrink-0 overflow-visible">
        <div class="relative group flex items-center justify-center">
          <a href="index.html" class="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors shadow-xs" aria-label="دوّر - الرئيسية">
            <img src="assets/images/FrameLogo.png" alt="دوّر" class="h-6 w-auto object-contain">
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            دوّر - الرئيسية
          </div>
        </div>
      </div>

      <!-- CENTER: Clean Icon-Only Navigation Buttons -->
      <nav class="flex flex-col items-center gap-2 my-auto w-full py-2 sidebar-nav overflow-visible">
        ${(typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function' && Auth.isAdmin()) ? `
        <!-- 0. الإدارة المركزية (للمسؤولين) -->
        <div class="relative group flex items-center justify-center">
          <a href="admin-dashboard.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors shrink-0" aria-label="الإدارة المركزية">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            لوحة الإدارة المركزية
          </div>
        </div>` : ''}
        <!-- 1. لوحة التحكم -->
        <div class="relative group flex items-center justify-center">
          <a href="index.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="لوحة التحكم">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            لوحة التحكم الرئيسية
          </div>
        </div>

        <!-- 2. الكتالوج والمخططات -->
        <div class="relative group flex items-center justify-center">
          <a href="catalog.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="الكتالوج والمخططات">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            إدارة الكتالوج والمخطط
          </div>
        </div>

        <!-- 3. مسح الرفوف بالذكاء الاصطناعي (AI) -->
        <div class="relative group flex items-center justify-center">
          <a href="ai-capture.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="مسح الرفوف بالذكاء">
            <svg class="w-5 h-5 text-[#d6a950] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.01.01"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            مسح الرفوف بالذكاء الاصطناعي
          </div>
        </div>

        <!-- 4. مراجعة المسودات المستخرجة -->
        <div class="relative group flex items-center justify-center">
          <a href="review-drafts.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="مراجعة المسودات">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            مراجعة واعتماد المسودات
          </div>
        </div>

        <!-- 5. المخزون وسجل التدقيق -->
        <div class="relative group flex items-center justify-center">
          <a href="inventory-audit.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="المخزون والتدقيق">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            المخزون وسجل التدقيق
          </div>
        </div>

        <!-- 6. الطلبات والمبيعات -->
        <div class="relative group flex items-center justify-center">
          <a href="orders.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="الطلبات والمبيعات">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            الطلبات والمبيعات
          </div>
        </div>

        <!-- 7. الممرات والرفوف -->
        <div class="relative group flex items-center justify-center">
          <a href="shelves.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="الممرات والرفوف">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            مواقع الممرات والرفوف
          </div>
        </div>

        <!-- 8. فريق العمل والصلاحيات -->
        <div class="relative group flex items-center justify-center">
          <a href="store-staff.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="فريق العمل">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            فريق العمل والأدوار
          </div>
        </div>

        <!-- 9. تسجيل واعتماد المتجر -->
        <div class="relative group flex items-center justify-center">
          <a href="merchant-application.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="بيانات المتجر">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            تسجيل واعتماد المتجر
          </div>
        </div>

        <!-- 10. الملف الشخصي والإعدادات -->
        <div class="relative group flex items-center justify-center">
          <a href="profile.html" class="nav-item flex items-center justify-center w-11 h-11 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="الملف الشخصي">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </a>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            الملف الشخصي والإعدادات
          </div>
        </div>
      </nav>

      <!-- BOTTOM: Single Logout Button Only -->
      <div class="flex flex-col items-center w-full pt-2 pb-1 border-t border-white/10 px-1.5 shrink-0 overflow-visible">
        <div class="relative group flex items-center justify-center">
          <button id="logout-btn" data-action="logout" class="flex items-center justify-center w-11 h-11 rounded-xl text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer active:scale-95" aria-label="تسجيل الخروج">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
          <div class="sidebar-tooltip pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 z-50 bg-gray-900 text-rose-200 border border-rose-900/60 text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
            تسجيل الخروج
          </div>
        </div>
      </div>
    `;
  },

  ensureSidebar() {
    const isSpecialPage = /login|register|verify-account|forgot-password|reset-password|admin-login|admin-dashboard|select-store/i.test(window.location.pathname);
    if (isSpecialPage) return;

    const lingeringDrawer = document.getElementById('sidebar-drawer');
    if (lingeringDrawer) {
      lingeringDrawer.remove();
    }

    let sidebar = document.getElementById('sidebar-box');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'sidebar-box';
      document.body.prepend(sidebar);
    }
    sidebar.className = 'fixed top-0 right-0 h-screen w-16 bg-[#153f2d] text-white flex flex-col justify-between items-center py-3 z-50 shadow-xl border-l border-white/10 select-none overflow-visible';
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
    return document.getElementById('sidebar-box') || document.getElementById('sidebar-drawer');
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

    if (window.innerWidth < 768) {
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

  setupSidebarControls() {
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

  getStoredStoreName() {
    // 1. Direct key 'storeName' or 'store_name' from localStorage
    const direct = localStorage.getItem('storeName') || localStorage.getItem('store_name') || localStorage.getItem(this.STORAGE_KEY_STORE_NAME);
    if (direct && direct.trim() && direct !== 'null' && direct !== 'undefined') {
      return direct.trim();
    }

    // 2. Active store object from localStorage
    try {
      const activeStoreRaw = localStorage.getItem('dawwer_active_store') ||
                             (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.ACTIVE_STORE_KEY) : null);
      if (activeStoreRaw) {
        const activeStore = JSON.parse(activeStoreRaw);
        if (activeStore && (activeStore.storeName || activeStore.name)) {
          return (activeStore.storeName || activeStore.name).trim();
        }
      }
    } catch (e) {}

    // 3. Current user data object from localStorage
    try {
      const userDataRaw = localStorage.getItem('dawwer_user_data') ||
                          (typeof CONFIG !== 'undefined' ? localStorage.getItem(CONFIG.USER_KEY) : null);
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        if (userData && (userData.storeName || userData.store_name)) {
          return (userData.storeName || userData.store_name).trim();
        }
      }
    } catch (e) {}

    return null;
  },

  initStoreIdentity() {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    const fallbackName = isSuperAdmin ? "الإدارة العامة لمنظومة دوّر" : "المتجر الحالي";

    const currentStoreName = this.getStoredStoreName() || fallbackName;

    const cachedStatus = localStorage.getItem(this.STORAGE_KEY_STORE_STATUS) ||
      (typeof Auth !== 'undefined' && Auth.getActiveStore ? (Auth.getActiveStore() && Auth.getActiveStore().roleName) : null);

    this.updateStoreIdentity(currentStoreName, cachedStatus);

    // Listen to storage events and custom select-store events
    if (typeof window !== 'undefined' && !this._listenersAttached) {
      this._listenersAttached = true;

      window.addEventListener('storage', (e) => {
        if (e.key === 'storeName' || e.key === 'store_name' || e.key === this.STORAGE_KEY_STORE_NAME || e.key === 'dawwer_active_store') {
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

    if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
      this.fetchStoreProfile();
    }
  },

  updateStoreIdentity(storeName, status = null) {
    const isSuperAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function')
      ? Auth.isAdmin()
      : (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser() && (Auth.getUser().role === 'Admin' || Auth.getUser().role === 4 || /admin|superadmin/i.test(String(Auth.getUser().role))));
    const fallbackName = isSuperAdmin ? "الإدارة العامة لمنظومة دوّر" : "المتجر الحالي";
    const finalName = (storeName && String(storeName).trim() && String(storeName).trim() !== 'null' && String(storeName).trim() !== 'undefined')
      ? String(storeName).trim()
      : fallbackName;

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
    try {
      const targetId = storeId || (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId ? ApiClient.getActiveStoreId() : null);
      if (!targetId) return null;

      let profile = null;

      if (typeof ApiClient !== 'undefined' && ApiClient.stores && targetId) {
        const res = await ApiClient.stores.getStore(targetId).catch(() => null);
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
    let modal = document.getElementById('dawwer-store-selector-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'dawwer-store-selector-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6 bg-gradient-to-r from-[#153f2d] to-[#1c5335] text-white">
          <h3 class="text-lg font-bold">اختيار المتجر النشط</h3>
          <p class="text-xs text-white/80 mt-1">يرجى اختيار أحد المتاجر المسجلة للوصول إلى المنتجات وإدارة الرفوف.</p>
        </div>
        <div id="dawwer-store-selector-list" class="p-6 space-y-3 max-h-80 overflow-y-auto">
          <div class="flex items-center justify-center py-6 text-slate-400">
            <svg class="animate-spin h-6 w-6 text-[#1c5335]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          </div>
        </div>
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a href="merchant-application.html" class="text-xs font-bold text-[#1c5335] hover:underline">+ تسجيل متجر جديد</a>
          <button type="button" id="dawwer-store-selector-close-btn" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer">إغلاق</button>
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
            <button type="button" data-store-select-id="${s.id}" class="w-full text-right p-3.5 rounded-xl border border-slate-200 hover:border-[#1c5335] hover:bg-[#1c5335]/5 transition flex items-center justify-between group cursor-pointer">
              <div>
                <div class="font-bold text-sm text-slate-800 group-hover:text-[#1c5335]">${s.name || 'متجر غير معنون'}</div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">${s.id}</div>
              </div>
              <span class="text-xs text-[#1c5335] font-bold opacity-0 group-hover:opacity-100 transition">اختيار ←</span>
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
        (cleanPath === '' && cleanHref === 'index.html') ||
        (cleanPath === 'index.html' && cleanHref === 'index.html');

      if (isCurrent) {
        link.classList.add('active', 'active-tab');
        link.classList.remove('text-white/70');
      } else {
        link.classList.remove('active', 'active-tab');
        link.classList.add('text-white/70');
      }
    });
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
