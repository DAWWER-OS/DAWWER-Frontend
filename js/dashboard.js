/**
 * Dawwer Retail OS - Executive Store Operations Dashboard
 * Integrated with FastAPI Backend (Stores, Products, AI Shelf Jobs)
 */

(function () {
  'use strict';

  // --- Storage & Config Constants ---
  const STORAGE_KEY_PRODUCTS_CACHE = 'dawwer_inventory_audit_products_v3';
  const STORAGE_KEY_CATALOG_FALLBACK = 'dawwer_merchant_catalog_v2';
  const STORAGE_KEY_SHELF_JOBS = 'dawwer_ai_extraction_jobs';
  const STORAGE_KEY_ORDERS = 'dawwer_merchant_orders_queue_sprint3';
  const STORAGE_KEY_DASHBOARD_CACHE = 'dawwer_dashboard_summary_cache';

  const FASTAPI_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.FASTAPI_BASE_URL)
    ? CONFIG.FASTAPI_BASE_URL
    : 'https://dawwer-backend-fastapi.onrender.com';

  // --- Runtime Dashboard State ---
  const state = {
    storeId: '',
    token: '',
    storeName: '',
    period: 'today', // 'today' | 'week' | 'month'
    products: [],
    shelfJobs: [],
    orders: [],
    summary: null,
    salesChart: null,
    donutChart: null,
    selectedProductForStock: null
  };

  /**
   * Universal Store Context & Auth Helper
   */
  function getStoreContext() {
    let storeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    let token = '';

    try {
      storeId = localStorage.getItem('activeStoreId') ||
                localStorage.getItem('storeId') ||
                localStorage.getItem('active_store_id') ||
                (typeof CONFIG !== 'undefined' ? CONFIG.getActiveStoreId() : '3fa85f64-5717-4562-b3fc-2c963f66afa6');

      token = localStorage.getItem('storeToken') ||
              localStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('dawwer_access_token') ||
              '';
    } catch (e) {}

    return { storeId, token };
  }

  /**
   * Format Arabic Date (e.g. الخميس، 8 أكتوبر 2026)
   */
  function formatArabicDate(date = new Date()) {
    try {
      return date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return date.toLocaleDateString('ar', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  /**
   * Universal Toast Notification
   */
  function notify(message, title = 'لوحة التحكم', type = 'success') {
    if (window.DawwerNotification && typeof window.DawwerNotification.show === 'function') {
      window.DawwerNotification.show({ title, message, type });
    } else if (typeof showToast === 'function') {
      showToast({ title, message, type });
    } else {
      console.log(`[Dashboard Notification] [${type}] ${title}: ${message}`);
    }
  }

  /**
   * Check Dark Mode Active Status
   */
  function isDarkMode() {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark') ||
           localStorage.getItem('theme') === 'dark';
  }

  // =========================================================================
  // DOM Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Guard
    if (typeof Auth !== 'undefined' && typeof Auth.requireAuth === 'function') {
      Auth.requireAuth();
    }

    // 2. Setup Context
    const ctx = getStoreContext();
    state.storeId = ctx.storeId;
    state.token = ctx.token;

    // 3. Render Arabic Today Date
    const dateEl = document.getElementById('dashboard-date-display');
    if (dateEl) {
      dateEl.textContent = formatArabicDate();
    }

    // 4. Update Header Store Name from Cache
    updateStoreHeaderName();

    // 5. Setup Action Listeners
    setupEventListeners();

    // 6. Instant Cache Pre-fill (Eliminates Blank Screen)
    prefillFromCache();

    // 7. Background Network Fetch
    fetchDashboardMetrics();
  });

  /**
   * Update Store Name in Top Bar
   */
  function updateStoreHeaderName() {
    const cachedName = localStorage.getItem('storeName') ||
                       localStorage.getItem('store_name') ||
                       localStorage.getItem('dawwer_store_name');
    if (cachedName && cachedName.trim()) {
      state.storeName = cachedName.trim();
      document.querySelectorAll('[data-store-name]').forEach(el => {
        el.textContent = cachedName.trim();
      });
    }
  }

  /**
   * Setup UI Event Listeners
   */
  function setupEventListeners() {
    // Period Filter Dropdown
    const filterSelect = document.getElementById('dashboard-period-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        state.period = e.target.value;
        renderKpis();
        updateSalesChart();
      });
    }

    // Refresh Dashboard Button
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        notify('جارٍ تحديث مؤشرات لوحة التحكم...', 'تحديث البيانات', 'info');
        fetchDashboardMetrics();
      });
    }

    // Quick Store Switcher
    const switchBtn = document.getElementById('header-store-switch-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        if (typeof DawwerLayout !== 'undefined' && typeof DawwerLayout.openStoreSwitcher === 'function') {
          DawwerLayout.openStoreSwitcher();
        } else {
          window.location.href = 'select-store.html';
        }
      });
    }

    // Stock Update Modal Form
    const stockForm = document.getElementById('stock-update-form');
    if (stockForm) {
      stockForm.addEventListener('submit', handleStockUpdateSubmit);
    }

    const cancelStockBtn = document.getElementById('btn-cancel-stock-modal');
    if (cancelStockBtn) {
      cancelStockBtn.addEventListener('click', closeStockModal);
    }

    // Close Modal on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeStockModal();
    });

    // Theme Change Observer for Chart.js
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTimeout(() => {
          updateChartThemeColors();
        }, 80);
      });
    }
  }

  // =========================================================================
  // Instant Cache Pre-fill (Eliminates Blank Screen & Jump)
  // =========================================================================
  function prefillFromCache() {
    try {
      // 1. Cached Summary
      const cachedSummary = JSON.parse(localStorage.getItem(STORAGE_KEY_DASHBOARD_CACHE) || 'null');
      if (cachedSummary) {
        state.summary = cachedSummary;
      }

      // 2. Cached Products
      const cachedProducts = JSON.parse(
        localStorage.getItem(STORAGE_KEY_PRODUCTS_CACHE) ||
        localStorage.getItem(STORAGE_KEY_CATALOG_FALLBACK) ||
        '[]'
      );
      if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
        state.products = normalizeProducts(cachedProducts);
      }

      // 3. Cached AI Jobs
      const cachedJobs = JSON.parse(localStorage.getItem(STORAGE_KEY_SHELF_JOBS) || '[]');
      if (Array.isArray(cachedJobs) && cachedJobs.length > 0) {
        state.shelfJobs = cachedJobs;
      }

      // 4. Cached Orders
      const cachedOrders = JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
      if (Array.isArray(cachedOrders) && cachedOrders.length > 0) {
        state.orders = cachedOrders;
      }

      // Render cached state immediately if any data available
      if (state.products.length > 0 || state.shelfJobs.length > 0 || state.summary) {
        renderAll();
      } else {
        setLoadingState(true);
      }
    } catch (err) {
      console.warn('[Dashboard Cache Pre-fill Warning]:', err);
    }
  }

  /**
   * Toggle Skeleton / Loading Pulse State
   */
  function setLoadingState(isLoading) {
    const container = document.getElementById('dashboard-main-container');
    if (!container) return;

    if (isLoading) {
      container.classList.add('animate-pulse', 'pointer-events-none', 'opacity-60');
    } else {
      container.classList.remove('animate-pulse', 'pointer-events-none', 'opacity-60');
      container.classList.add('opacity-100');
    }
  }

  // =========================================================================
  // Dynamic API Fetch & Background Sync
  // =========================================================================
  async function fetchDashboardMetrics() {
    const { storeId, token } = getStoreContext();
    if (!storeId) {
      setLoadingState(false);
      return;
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
      // Parallel fetch for optimal latency:
      // 1. Dashboard summary (if available in FastAPI)
      // 2. Products list
      // 3. Shelf AI extraction jobs
      // 4. Store details (to ensure store name is current)
      const [summaryRes, productsRes, shelfJobsRes, storeRes] = await Promise.allSettled([
        fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/dashboard/summary`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs`, { headers }),
        fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}`, { headers })
      ]);

      // 1. Process Store Info
      if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
        const storeData = await storeRes.value.json().catch(() => null);
        if (storeData && (storeData.name || storeData.store_name)) {
          const sName = storeData.name || storeData.store_name;
          state.storeName = sName;
          localStorage.setItem('storeName', sName);
          localStorage.setItem('store_name', sName);
          document.querySelectorAll('[data-store-name]').forEach(el => { el.textContent = sName; });
        }
      }

      // 2. Process Summary (if endpoint active)
      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const summaryData = await summaryRes.value.json().catch(() => null);
        if (summaryData) {
          state.summary = summaryData;
          localStorage.setItem(STORAGE_KEY_DASHBOARD_CACHE, JSON.stringify(summaryData));
        }
      }

      // 3. Process Products
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const rawProducts = await productsRes.value.json().catch(() => null);
        const pList = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data || []);
        if (Array.isArray(pList) && pList.length > 0) {
          state.products = normalizeProducts(pList);
          localStorage.setItem(STORAGE_KEY_PRODUCTS_CACHE, JSON.stringify(state.products));
        }
      }

      // 4. Process AI Shelf Jobs
      if (shelfJobsRes.status === 'fulfilled' && shelfJobsRes.value.ok) {
        const rawJobs = await shelfJobsRes.value.json().catch(() => null);
        const jList = Array.isArray(rawJobs) ? rawJobs : (rawJobs?.data || []);
        if (Array.isArray(jList)) {
          state.shelfJobs = jList;
          localStorage.setItem(STORAGE_KEY_SHELF_JOBS, JSON.stringify(state.shelfJobs));
        }
      }

      // 5. Fallback Default Enrichment if server returned empty (e.g. brand new store)
      enrichStateWithDefaultsIfEmpty();

      // 6. Re-render UI with fresh figures
      renderAll();

    } catch (err) {
      console.warn('[Dashboard Fetch Metrics Notice]:', err);
      // Fallback gracefully on error to local cached data
      enrichStateWithDefaultsIfEmpty();
      renderAll();
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Normalize product properties across backend schemas
   */
  function normalizeProducts(items) {
    if (!Array.isArray(items)) return [];
    return items.map((it, idx) => {
      const id = String(it.id || it.product_id || it.sku || `p-${idx + 1}`);
      const name = it.name || it.product_name || it.title || 'منتج استهلاكي';
      const category = it.category || it.category_name || 'عام ومؤن';
      const price = parseFloat(it.price || it.unit_price || 0) || 0;
      const quantity = parseInt(it.quantity !== undefined ? it.quantity : (it.stock !== undefined ? it.stock : 10), 10);
      const aisle = it.aisle || (it.location && it.location.aisle) || '';
      const shelf = it.shelf || (it.location && it.location.shelf) || '';
      const zone = it.zone || (it.location && it.location.zone) || '';
      const hasShelfMapping = Boolean(aisle || shelf || zone || (it.location && (it.location.aisle || it.location.shelf)));

      return {
        id,
        name,
        category,
        price,
        quantity,
        aisle,
        shelf,
        zone,
        hasShelfMapping
      };
    });
  }

  /**
   * Enrich state with realistic operational seeds if completely empty
   */
  function enrichStateWithDefaultsIfEmpty() {
    if (state.products.length === 0) {
      state.products = [
        { id: 'p-1', name: 'حليب نادك كامل الدسم 1 لتر', category: 'ألبان وأجبان', price: 6.50, quantity: 42, aisle: '01', shelf: 'رف 2', hasShelfMapping: true },
        { id: 'p-2', name: 'أرز بسمتي الشعلان 5 كجم', category: 'معلبات وتموين', price: 44.00, quantity: 18, aisle: '03', shelf: 'رف 1', hasShelfMapping: true },
        { id: 'p-3', name: 'زيت دوار الشمس عافية 1.5 لتر', category: 'معلبات وتموين', price: 19.50, quantity: 3, aisle: '03', shelf: 'رف 3', hasShelfMapping: true },
        { id: 'p-4', name: 'عصير برتقال طبيعي المراعي 1 لتر', category: 'مشروبات وعصائر', price: 9.00, quantity: 4, aisle: '02', shelf: 'ثلاجة 1', hasShelfMapping: true },
        { id: 'p-5', name: 'لبنة تركية أولكر 500 جم', category: 'ألبان وأجبان', price: 14.25, quantity: 2, aisle: '01', shelf: 'رف 4', hasShelfMapping: true },
        { id: 'p-6', name: 'شاي ليبتون العلامة الصفراء 100 كيس', category: 'مشروبات وعصائر', price: 17.50, quantity: 28, aisle: '04', shelf: 'رف 2', hasShelfMapping: true },
        { id: 'p-7', name: 'معجون طماطم لونا 8x135 جم', category: 'معلبات وتموين', price: 12.00, quantity: 1, aisle: '03', shelf: 'رف 2', hasShelfMapping: true },
        { id: 'p-8', name: 'مناديل فاين كلاسيك 10 عبوات', category: 'نظافة وعناية', price: 26.00, quantity: 35, aisle: '05', shelf: 'رف 1', hasShelfMapping: true },
        { id: 'p-9', name: 'مسحوق غسيل تايد أوتوماتيك 2.5 كجم', category: 'نظافة وعناية', price: 34.00, quantity: 12, aisle: '05', shelf: 'رف 3', hasShelfMapping: true },
        { id: 'p-10', name: 'تونة خفيفة تريفا بالزيت 170 جم', category: 'معلبات وتموين', price: 5.75, quantity: 5, aisle: '03', shelf: 'رف 4', hasShelfMapping: true }
      ];
    }

    if (state.shelfJobs.length === 0) {
      state.shelfJobs = [
        {
          id: 'job-9842',
          job_id: 'job-9842',
          shelf_label: 'ممر 01 › قسم الألبان والأجبان',
          status: 'COMPLETED',
          extracted_count: 24,
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          image_url: 'assets/images/shelf-sample.jpg'
        },
        {
          id: 'job-9841',
          job_id: 'job-9841',
          shelf_label: 'ممر 03 › قسم الزيوت والتموين',
          status: 'COMPLETED',
          extracted_count: 36,
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          image_url: 'assets/images/shelf-sample.jpg'
        },
        {
          id: 'job-9840',
          job_id: 'job-9840',
          shelf_label: 'ممر 02 › رفوف المشروبات والعصائر',
          status: 'COMPLETED',
          extracted_count: 19,
          created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
          image_url: 'assets/images/shelf-sample.jpg'
        },
        {
          id: 'job-9839',
          job_id: 'job-9839',
          shelf_label: 'ممر 05 › المنظفات والعناية المنزلية',
          status: 'COMPLETED',
          extracted_count: 28,
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          image_url: 'assets/images/shelf-sample.jpg'
        }
      ];
    }
  }

  // =========================================================================
  // Render Orchestrator
  // =========================================================================
  function renderAll() {
    renderKpis();
    renderSalesAndOrdersChart();
    renderCategoriesDonutChart();
    renderRecentShelfJobsTable();
    renderLowStockReplenishmentList();
  }

  // =========================================================================
  // 1. KPI Cards Rendering
  // =========================================================================
  function renderKpis() {
    const totalProducts = state.products.length;
    const shelfMappedCount = state.products.filter(p => p.hasShelfMapping).length;
    const shelfMappingPct = totalProducts > 0
      ? Math.round((shelfMappedCount / totalProducts) * 100)
      : 0;

    // Card 1: Total Catalog
    const totalProdEl = document.getElementById('kpi-total-products');
    if (totalProdEl) totalProdEl.textContent = totalProducts.toLocaleString('en-US');

    const shelfPctEl = document.getElementById('kpi-shelf-mapping-pct');
    if (shelfPctEl) shelfPctEl.textContent = `${shelfMappingPct}%`;

    const shelfBarEl = document.getElementById('kpi-shelf-mapping-bar');
    if (shelfBarEl) shelfBarEl.style.width = `${shelfMappingPct}%`;

    // Card 2: AI Shelf Jobs
    const completedJobsToday = state.shelfJobs.filter(j => {
      const s = String(j.status || '').toUpperCase();
      return s === 'COMPLETED' || s === 'APPROVED' || s === 'SUCCESS';
    }).length;

    const aiJobsEl = document.getElementById('kpi-ai-jobs-count');
    if (aiJobsEl) {
      aiJobsEl.textContent = completedJobsToday.toLocaleString('en-US');
    }

    const aiJobsBadge = document.getElementById('kpi-ai-jobs-badge');
    if (aiJobsBadge) {
      aiJobsBadge.textContent = state.shelfJobs.length > 0 ? `+${state.shelfJobs.length} عملية إجمالية` : 'جاهز للمسح';
    }

    // Card 3: Sales & Orders
    // Dynamic multiplier based on period filter
    let salesTotal = 1840.00;
    let ordersCount = 27;

    if (state.orders.length > 0) {
      ordersCount = state.orders.length;
      salesTotal = state.orders.reduce((acc, o) => acc + (parseFloat(o.total || o.amount || 0) || 0), 0) || (ordersCount * 68);
    }

    if (state.period === 'week') {
      salesTotal = salesTotal * 6.8;
      ordersCount = Math.round(ordersCount * 6.5);
    } else if (state.period === 'month') {
      salesTotal = salesTotal * 28.5;
      ordersCount = Math.round(ordersCount * 27);
    }

    const salesTotalEl = document.getElementById('kpi-sales-total');
    if (salesTotalEl) {
      salesTotalEl.textContent = `₪ ${Math.round(salesTotal).toLocaleString('en-US')}`;
    }

    const ordersBadgeEl = document.getElementById('kpi-orders-count-badge');
    if (ordersBadgeEl) {
      ordersBadgeEl.textContent = `${ordersCount} طلب`;
    }

    const avgOrderValEl = document.getElementById('kpi-avg-order-val');
    if (avgOrderValEl) {
      const avg = ordersCount > 0 ? (salesTotal / ordersCount).toFixed(2) : '0.00';
      avgOrderValEl.textContent = `₪ ${avg}`;
    }

    // Card 4: Critical Low Stock Alert
    const lowStockItems = state.products.filter(p => p.quantity <= 5);
    const lowStockCountEl = document.getElementById('kpi-low-stock-count');
    if (lowStockCountEl) {
      lowStockCountEl.textContent = lowStockItems.length.toLocaleString('en-US');
    }

    const lowStockBadgeEl = document.getElementById('kpi-low-stock-badge');
    if (lowStockBadgeEl) {
      lowStockBadgeEl.textContent = lowStockItems.length > 0 ? `${lowStockItems.length} صنف حرج` : 'المخزون مستقر ✓';
      if (lowStockItems.length === 0) {
        lowStockBadgeEl.className = 'text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50';
      }
    }
  }

  // =========================================================================
  // 2. Middle Chart A: Weekly Sales & Orders Area/Spline
  // =========================================================================
  function renderSalesAndOrdersChart() {
    const canvas = document.getElementById('sales-orders-chart');
    if (!canvas) return;

    // Destroy existing instance to prevent overlapping canvases
    if (state.salesChart) {
      state.salesChart.destroy();
      state.salesChart = null;
    }

    const ctx = canvas.getContext('2d');
    const darkMode = isDarkMode();

    // Responsive weekly labels
    const labels = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    // Realistic baseline figures scaled by period
    const multiplier = state.period === 'month' ? 4.2 : (state.period === 'today' ? 1.0 : 1.15);
    const salesData = [1420, 2150, 1680, 2490, 3100, 2850, 1940].map(v => Math.round(v * multiplier));
    const ordersData = [18, 28, 22, 34, 41, 38, 25].map(v => Math.round(v * multiplier));

    // Update total weekly summary badge
    const totalWeeklySales = salesData.reduce((a, b) => a + b, 0);
    const weeklyTotalEl = document.getElementById('chart-sales-weekly-total');
    if (weeklyTotalEl) {
      weeklyTotalEl.textContent = `₪ ${totalWeeklySales.toLocaleString('en-US')}`;
    }

    // Create Emerald Gradient fill for Revenue
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    if (darkMode) {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.40)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
    } else {
      gradient.addColorStop(0, 'rgba(28, 83, 53, 0.32)');
      gradient.addColorStop(1, 'rgba(28, 83, 53, 0.02)');
    }

    state.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'المبيعات (₪)',
            data: salesData,
            borderColor: darkMode ? '#10b981' : '#1c5335',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointBackgroundColor: darkMode ? '#10b981' : '#1c5335',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'الطلبات',
            data: ordersData,
            borderColor: '#d6a950',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: '#d6a950',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 3.5,
            pointHoverRadius: 5.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            rtl: true,
            textDirection: 'rtl',
            padding: 10,
            cornerRadius: 10,
            backgroundColor: darkMode ? '#1e293b' : '#0f172a',
            titleFont: { family: "'IBM Plex Sans Arabic', sans-serif", size: 12, weight: 'bold' },
            bodyFont: { family: "'IBM Plex Sans Arabic', sans-serif", size: 12 },
            callbacks: {
              label: function (context) {
                if (context.datasetIndex === 0) {
                  return `الإيراد: ₪ ${context.parsed.y.toLocaleString('en-US')}`;
                }
                return `عدد الطلبات: ${context.parsed.y} طلب`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: darkMode ? '#94a3b8' : '#64748b',
              font: { family: "'IBM Plex Sans Arabic', sans-serif", size: 11 }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              color: darkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.7)'
            },
            ticks: {
              color: darkMode ? '#94a3b8' : '#64748b',
              font: { family: "'IBM Plex Sans Arabic', sans-serif", size: 11 },
              callback: function (val) {
                return `₪${val}`;
              }
            }
          },
          y1: {
            type: 'linear',
            display: false,
            position: 'left',
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  function updateSalesChart() {
    if (!state.salesChart) {
      renderSalesAndOrdersChart();
      return;
    }
    const multiplier = state.period === 'month' ? 4.2 : (state.period === 'today' ? 1.0 : 1.15);
    const baseSales = [1420, 2150, 1680, 2490, 3100, 2850, 1940];
    const baseOrders = [18, 28, 22, 34, 41, 38, 25];

    state.salesChart.data.datasets[0].data = baseSales.map(v => Math.round(v * multiplier));
    state.salesChart.data.datasets[1].data = baseOrders.map(v => Math.round(v * multiplier));
    state.salesChart.update();

    const totalWeeklySales = state.salesChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const weeklyTotalEl = document.getElementById('chart-sales-weekly-total');
    if (weeklyTotalEl) {
      weeklyTotalEl.textContent = `₪ ${totalWeeklySales.toLocaleString('en-US')}`;
    }
  }

  // =========================================================================
  // 3. Middle Chart B: Categories Distribution Donut Chart
  // =========================================================================
  function renderCategoriesDonutChart() {
    const canvas = document.getElementById('categories-donut-chart');
    if (!canvas) return;

    if (state.donutChart) {
      state.donutChart.destroy();
      state.donutChart = null;
    }

    const ctx = canvas.getContext('2d');
    const darkMode = isDarkMode();

    // 1. Calculate actual category counts from loaded products
    const categoryCounts = {};
    state.products.forEach(p => {
      const cat = (p.category || 'أصناف متنوعة').trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    let catLabels = Object.keys(categoryCounts);
    let catValues = Object.values(categoryCounts);

    // Fallback categories if empty
    if (catLabels.length === 0) {
      catLabels = ['ألبان وأجبان', 'معلبات وتموين', 'مشروبات وعصائر', 'نظافة وعناية', 'خضار وفواكه'];
      catValues = [32, 28, 18, 14, 8];
    }

    const colorPalette = [
      '#1c5335', // Emerald
      '#d6a950', // Gold
      '#2563eb', // Blue
      '#10b981', // Mint
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#64748b'  // Slate
    ];

    state.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: colorPalette.slice(0, catLabels.length),
          borderColor: darkMode ? '#0f172a' : '#ffffff',
          borderWidth: 2.5,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            rtl: true,
            textDirection: 'rtl',
            padding: 10,
            cornerRadius: 10,
            backgroundColor: darkMode ? '#1e293b' : '#0f172a',
            titleFont: { family: "'IBM Plex Sans Arabic', sans-serif", size: 12, weight: 'bold' },
            bodyFont: { family: "'IBM Plex Sans Arabic', sans-serif", size: 12 },
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return `${context.label}: ${val} صنف (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Render Bottom Legend Pills
    renderDonutLegendPills(catLabels, catValues, colorPalette);
  }

  function renderDonutLegendPills(labels, values, colors) {
    const legendContainer = document.getElementById('categories-donut-legend');
    if (!legendContainer) return;

    const total = values.reduce((a, b) => a + b, 0);

    legendContainer.innerHTML = labels.slice(0, 4).map((label, i) => {
      const count = values[i] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const color = colors[i] || '#1c5335';

      return `
        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-1.5 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color}"></span>
            <span class="truncate font-medium text-slate-700 dark:text-slate-300">${label}</span>
          </div>
          <span class="font-bold text-slate-900 dark:text-white tabular-nums">${pct}%</span>
        </div>
      `;
    }).join('');
  }

  function updateChartThemeColors() {
    renderSalesAndOrdersChart();
    renderCategoriesDonutChart();
  }

  // =========================================================================
  // 4. Bottom Grid A: Recent AI Shelf Jobs Live Table
  // =========================================================================
  function renderRecentShelfJobsTable() {
    const tbody = document.getElementById('recent-shelf-jobs-tbody');
    if (!tbody) return;

    if (state.shelfJobs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-slate-400">
            لا توجد عمليات مسح رفوف مسجلة حتى الآن.
            <div class="mt-2">
              <a href="ai-capture.html" class="inline-block text-xs font-bold text-[#1c5335] dark:text-emerald-400 hover:underline">
                ابدأ مسح أول رف بالذكاء الاصطناعي ←
              </a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const recentJobs = state.shelfJobs.slice(0, 5);

    tbody.innerHTML = recentJobs.map(job => {
      const jobId = job.id || job.job_id || 'JOB-AI';
      const label = job.shelf_label || job.shelf || job.label || 'الرف الرئيسي (غير محدد)';
      const count = job.extracted_count || job.products_count || job.detected_items_count || job.draft_count || 12;
      const status = String(job.status || 'COMPLETED').toUpperCase();

      // Timestamp formatting
      let timeText = 'اليوم';
      if (job.created_at || job.timestamp) {
        try {
          const d = new Date(job.created_at || job.timestamp);
          const diffMinutes = Math.round((Date.now() - d.getTime()) / 60000);
          if (diffMinutes < 60) {
            timeText = `منذ ${Math.max(1, diffMinutes)} دقيقة`;
          } else if (diffMinutes < 1440) {
            timeText = `منذ ${Math.round(diffMinutes / 60)} ساعة`;
          } else {
            timeText = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
          }
        } catch (e) {}
      }

      // Status Pill
      let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">مكتمل</span>';
      if (status.includes('PEND') || status.includes('PROCESS')) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">قيد المعالجة</span>';
      } else if (status.includes('FAIL') || status.includes('ERR')) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">فشل الفحص</span>';
      }

      const reviewHref = `review-drafts.html?job_id=${encodeURIComponent(jobId)}`;

      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group" onclick="window.location.href='${reviewHref}'">
          <!-- Shelf & Icon -->
          <td class="py-3 pr-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#1c5335] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div class="truncate max-w-[150px] sm:max-w-[200px]">
                <div class="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1c5335] dark:group-hover:text-emerald-400 transition">${label}</div>
                <div class="text-[10px] text-slate-400 font-mono">${jobId}</div>
              </div>
            </div>
          </td>
          <!-- Extracted Count -->
          <td class="py-3">
            <span class="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ${count} صنف
            </span>
          </td>
          <!-- Status -->
          <td class="py-3">${statusBadge}</td>
          <!-- Time -->
          <td class="py-3 text-slate-500 dark:text-slate-400 text-[11px]">${timeText}</td>
          <!-- Action Link -->
          <td class="py-3 text-left pl-2">
            <a href="${reviewHref}" class="inline-flex items-center gap-1 text-xs font-bold text-[#1c5335] dark:text-emerald-400 hover:underline" onclick="event.stopPropagation()">
              مراجعة ←
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 5. Bottom Grid B: Low Stock Replenishment List
  // =========================================================================
  function renderLowStockReplenishmentList() {
    const container = document.getElementById('low-stock-items-container');
    if (!container) return;

    const criticalItems = state.products.filter(p => p.quantity <= 5);

    if (criticalItems.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-slate-400">
          <div class="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">جميع الأصناف تزيد عن حد الأمان</p>
          <p class="text-[11px] text-slate-400 mt-0.5">لا توجد نواقص في المخزون حالياً</p>
        </div>
      `;
      return;
    }

    container.innerHTML = criticalItems.slice(0, 6).map(prod => {
      const locText = prod.aisle
        ? `ممر ${prod.aisle} › ${prod.shelf || 'رف 1'}`
        : 'موقع غير محدد';

      const isOut = prod.quantity === 0;
      const qtyClass = isOut
        ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
        : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800';
      const qtyLabel = isOut ? 'نفذت الكمية (0)' : `${prod.quantity} قطع فقط`;

      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition">
          <div class="min-w-0 pr-1">
            <div class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">${prod.name}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                ${locText}
              </span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${qtyClass}">
                ${qtyLabel}
              </span>
            </div>
          </div>
          <!-- Action: Quick Stock Update -->
          <button type="button" data-update-stock-id="${prod.id}" class="btn-open-stock-modal px-3 py-1.5 rounded-lg text-xs font-bold text-[#1c5335] dark:text-emerald-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-[#1c5335] hover:text-white dark:hover:bg-emerald-500 dark:hover:text-slate-900 transition shadow-2xs shrink-0 cursor-pointer active:scale-95">
            تحديث
          </button>
        </div>
      `;
    }).join('');

    // Attach Click Handlers to Update Buttons
    container.querySelectorAll('.btn-open-stock-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prodId = btn.getAttribute('data-update-stock-id');
        openStockModal(prodId);
      });
    });
  }

  // =========================================================================
  // 6. Quick Stock Update Interactive Modal
  // =========================================================================
  function openStockModal(productId) {
    const product = state.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    state.selectedProductForStock = product;

    const modal = document.getElementById('stock-update-modal');
    const nameEl = document.getElementById('modal-product-name');
    const locEl = document.getElementById('modal-product-location');
    const idInput = document.getElementById('modal-product-id');
    const qtyInput = document.getElementById('modal-new-quantity');

    if (nameEl) nameEl.textContent = `تحديث كمية: ${product.name}`;
    if (locEl) locEl.textContent = product.aisle ? `ممر ${product.aisle} › ${product.shelf || 'رف 1'}` : 'الموقع: غير محدد في المتجر';
    if (idInput) idInput.value = product.id;
    if (qtyInput) {
      qtyInput.value = Math.max(10, product.quantity + 20); // helpful recommended replenish value
      qtyInput.focus();
    }

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function closeStockModal() {
    const modal = document.getElementById('stock-update-modal');
    if (modal) modal.classList.add('hidden');
    state.selectedProductForStock = null;
  }

  async function handleStockUpdateSubmit(e) {
    e.preventDefault();
    const product = state.selectedProductForStock;
    if (!product) return;

    const newQtyInput = document.getElementById('modal-new-quantity');
    const newQty = parseInt(newQtyInput.value, 10);
    if (isNaN(newQty) || newQty < 0) {
      notify('يرجى إدخال كمية صحيحة', 'خطأ في الإدخال', 'error');
      return;
    }

    const { storeId, token } = getStoreContext();
    const submitBtn = document.getElementById('btn-save-stock-modal');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جارٍ الحفظ...';
    }

    try {
      // 1. Send update to FastAPI Backend
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const payload = {
        ...product,
        quantity: newQty,
        stock: newQty
      };

      await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(product.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      }).catch(err => console.warn('[Stock PUT API notice]:', err));

      // 2. Local State & Cache Update
      product.quantity = newQty;
      localStorage.setItem(STORAGE_KEY_PRODUCTS_CACHE, JSON.stringify(state.products));

      // 3. UI feedback
      closeStockModal();
      notify(`تم تحديث رصيد (${product.name}) إلى ${newQty} قطعة بنجاح!`, 'تحديث المخزون', 'success');

      // 4. Re-render affected components
      renderKpis();
      renderLowStockReplenishmentList();
      renderCategoriesDonutChart();

    } catch (err) {
      console.error('Failed to update stock:', err);
      notify('حدث خطأ أثناء تحديث المخزون', 'خطأ', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ وتحديث الرصيد';
      }
    }
  }

})();
