/**
 * Merchant Order Intake Queue (Feature 3.1 - Sprint 3)
 * Handles real-time order intake, KPI stat calculation, status transitions (Accept, Prepare, Ready, Reject),
 * shelf location mapping, filters, search, and details/rejection modals.
 */

(function () {
  'use strict';

  // Local storage cache keys
  const STORAGE_KEY_ORDERS = 'dawwer_merchant_orders_queue_v1';
  const STORAGE_KEY_LAST_SYNC = 'dawwer_merchant_orders_last_sync';

  // Seed / Initial realistic Saudi retail orders (with shelf locations)
  const SEED_ORDERS = [
    {
      id: 'ORD-2045',
      orderNumber: '2045',
      customerName: 'عبد الرحمن السعيد',
      customerPhone: '+966 54 812 3456',
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 mins ago
      status: 'submitted', // submitted | accepted | preparing | ready | rejected
      fulfillmentType: 'delivery', // delivery | pickup
      fulfillmentAddress: 'الرياض - حي الملقا - شارع وادي حنيفة - فيلا 14',
      fulfillmentTiming: 'توصيل فوري خلال 35 دقيقة',
      paymentMethod: 'مدى (مدفوع إلكترونياً)',
      customerNotes: 'يرجى اختيار حبات أفوكادو ناضجة ومتوسطة الحجم. شكراً لكم.',
      subtotal: 51.50,
      vat: 7.73,
      deliveryFee: 15.00,
      total: 74.23,
      items: [
        {
          id: 'item-101',
          name: 'أفوكادو هاس مكسيكي طازج',
          sku: 'SKU-AVO-001',
          barcode: '628100123456',
          category: 'خضار وفواكه',
          shelfLocation: 'المنطقة أ › ممر 01 › رف 2',
          zone: 'أ',
          aisle: '01',
          shelf: '2',
          quantity: 2,
          unitPrice: 14.50,
          totalPrice: 29.00,
          image: ''
        },
        {
          id: 'item-102',
          name: 'جبنة حلوم قبرصية فاخرة 250جم',
          sku: 'SKU-CH-002',
          barcode: '628100234567',
          category: 'ألبان وأجبان',
          shelfLocation: 'المنطقة ب › ممر 03 › ثلاجة 1',
          zone: 'ب',
          aisle: '03',
          shelf: 'ثلاجة 1',
          quantity: 1,
          unitPrice: 16.00,
          totalPrice: 16.00,
          image: ''
        },
        {
          id: 'item-103',
          name: 'خبز توست بر أسمر مخابز اليوم',
          sku: 'SKU-BRD-003',
          barcode: '628100345678',
          category: 'مخبوزات',
          shelfLocation: 'المنطقة ج › ممر 02 › رف 1',
          zone: 'ج',
          aisle: '02',
          shelf: '1',
          quantity: 1,
          unitPrice: 6.50,
          totalPrice: 6.50,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2044',
      orderNumber: '2044',
      customerName: 'نورة بنت فيصل',
      customerPhone: '+966 50 987 6543',
      createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(), // 9 mins ago
      status: 'submitted',
      fulfillmentType: 'pickup',
      fulfillmentAddress: 'استلام ذاتي من فرع المتجر الرئيسي (كاونتر الاستلام السريع)',
      fulfillmentTiming: 'نافذة الاستلام: اليوم بين 4:30 - 5:30 مساءً',
      paymentMethod: 'دفع عند الاستلام (كاش / مدى)',
      customerNotes: 'سأمر بالسيارة بعد نصف ساعة لاستلام الطلب جاهزاً.',
      subtotal: 68.26,
      vat: 10.24,
      deliveryFee: 0.00,
      total: 78.50,
      items: [
        {
          id: 'item-104',
          name: 'حليب كامل الدسم المراعي 2 لتر',
          sku: 'SKU-MLK-004',
          barcode: '628100456789',
          category: 'ألبان',
          shelfLocation: 'المنطقة ب › ممر 02 › ثلاجة 3',
          zone: 'ب',
          aisle: '02',
          shelf: 'ثلاجة 3',
          quantity: 2,
          unitPrice: 11.00,
          totalPrice: 22.00,
          image: ''
        },
        {
          id: 'item-105',
          name: 'طبق بيض طازج فاخر 30 حبة',
          sku: 'SKU-EGG-005',
          barcode: '628100567890',
          category: 'ألبان وبيض',
          shelfLocation: 'المنطقة ب › ممر 01 › رف 4',
          zone: 'ب',
          aisle: '01',
          shelf: '4',
          quantity: 1,
          unitPrice: 22.50,
          totalPrice: 22.50,
          image: ''
        },
        {
          id: 'item-106',
          name: 'زيت زيتون بكر ممتاز الجوف 500 مل',
          sku: 'SKU-OIL-006',
          barcode: '628100678901',
          category: 'تموين ومؤن',
          shelfLocation: 'المنطقة د › ممر 04 › رف 3',
          zone: 'د',
          aisle: '04',
          shelf: '3',
          quantity: 1,
          unitPrice: 34.00,
          totalPrice: 34.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2042',
      orderNumber: '2042',
      customerName: 'خالد بن عبد الله العتيبي',
      customerPhone: '+966 55 432 1098',
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 mins ago
      status: 'accepted',
      fulfillmentType: 'delivery',
      fulfillmentAddress: 'الرياض - حي النرجس - شارع التخصصي - عمارة الأندلس شقة 8',
      fulfillmentTiming: 'توصيل مبرمج: اليوم 5:00 م',
      paymentMethod: 'أبل باي (مدفوع)',
      customerNotes: 'يرجى وضع الكرتون أمام باب الشقة وترك رسالة.',
      subtotal: 87.39,
      vat: 13.11,
      deliveryFee: 15.00,
      total: 115.50,
      items: [
        {
          id: 'item-107',
          name: 'مياه صفا مكة كرتون 40×330مل',
          sku: 'SKU-WAT-007',
          barcode: '628100789012',
          category: 'مشروبات ومياه',
          shelfLocation: 'المنطقة هـ › ممر 05 › منصة أرضية 1',
          zone: 'هـ',
          aisle: '05',
          shelf: 'منصة 1',
          quantity: 3,
          unitPrice: 19.50,
          totalPrice: 58.50,
          image: ''
        },
        {
          id: 'item-108',
          name: 'شاي ربيع أوراق كاملة كرتون 400 جم',
          sku: 'SKU-TEA-008',
          barcode: '628100890123',
          category: 'مشروبات ساخنة',
          shelfLocation: 'المنطقة أ › ممر 03 › رف 2',
          zone: 'أ',
          aisle: '03',
          shelf: '2',
          quantity: 2,
          unitPrice: 21.00,
          totalPrice: 42.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2039',
      orderNumber: '2039',
      customerName: 'فهد إبراهيم التميمي',
      customerPhone: '+966 56 112 2334',
      createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 mins ago
      status: 'preparing',
      fulfillmentType: 'pickup',
      fulfillmentAddress: 'استلام من المتجر - الفرع الشرقي',
      fulfillmentTiming: 'جاهز للاستلام الفوري فور اكتمال التغليف',
      paymentMethod: 'فيزا / ماستركارد (مدفوع)',
      customerNotes: 'تغليف الهدايا إن أمكن.',
      subtotal: 133.91,
      vat: 20.09,
      deliveryFee: 0.00,
      total: 154.00,
      items: [
        {
          id: 'item-109',
          name: 'قهوة عربي خولاني فاخرة مطحونة بالهيل 500 جم',
          sku: 'SKU-COF-009',
          barcode: '628100901234',
          category: 'قهوة وشاي',
          shelfLocation: 'المنطقة أ › ممر 04 › رف 1',
          zone: 'أ',
          aisle: '04',
          shelf: '1',
          quantity: 2,
          unitPrice: 42.00,
          totalPrice: 84.00,
          image: ''
        },
        {
          id: 'item-110',
          name: 'تمور سكري مفتل فاخر كرتون 1 كجم',
          sku: 'SKU-DAT-010',
          barcode: '628100012345',
          category: 'تمور ومكسرات',
          shelfLocation: 'المنطقة أ › ممر 04 › رف 3',
          zone: 'أ',
          aisle: '04',
          shelf: '3',
          quantity: 2,
          unitPrice: 35.00,
          totalPrice: 70.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2035',
      orderNumber: '2035',
      customerName: 'سارة عبد العزيز القحطاني',
      customerPhone: '+966 53 776 5432',
      createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 mins ago
      status: 'ready',
      fulfillmentType: 'delivery',
      fulfillmentAddress: 'الرياض - حي العارض - طريق الملك فهد - مجمع ريماس',
      fulfillmentTiming: 'جاهز مع المندوب وفي طريق التوصيل',
      paymentMethod: 'مدى (مدفوع)',
      customerNotes: '',
      subtotal: 64.78,
      vat: 9.72,
      deliveryFee: 15.00,
      total: 89.50,
      items: [
        {
          id: 'item-111',
          name: 'منظف ديتول متعدد الاستعمالات برائحة الصنوبر 1 لتر',
          sku: 'SKU-CLN-011',
          barcode: '628100112233',
          category: 'عناية ومنظفات',
          shelfLocation: 'المنطقة و › ممر 06 › رف 2',
          zone: 'و',
          aisle: '06',
          shelf: '2',
          quantity: 1,
          unitPrice: 26.50,
          totalPrice: 26.50,
          image: ''
        },
        {
          id: 'item-112',
          name: 'مناديل فاين كلاسيك معقمة كرتون 10 علب',
          sku: 'SKU-TIS-012',
          barcode: '628100223344',
          category: 'عناية ومنظفات',
          shelfLocation: 'المنطقة و › ممر 06 › رف 4',
          zone: 'و',
          aisle: '06',
          shelf: '4',
          quantity: 1,
          unitPrice: 48.00,
          totalPrice: 48.00,
          image: ''
        }
      ]
    }
  ];

  // Application State
  const state = {
    orders: [],
    activeFilterStatus: 'all', // all | submitted | accepted | preparing | ready
    activeFulfillment: 'all',  // all | pickup | delivery
    activeSort: 'newest',      // newest | oldest | highest_amount
    searchQuery: '',
    selectedOrder: null,
    storeId: null,
    pollingTimer: null,
    isLoading: false
  };

  /**
   * Initialize Order Intake Queue
   */
  async function init() {
    checkStoreContext();
    loadOrdersFromCache();
    setupEventListeners();
    await fetchOrdersFromBackend();
    renderAll();
    startAutoPolling();
  }

  /**
   * Validate store ID context using ApiClient
   */
  function checkStoreContext() {
    let storeId = null;
    if (typeof ApiClient !== 'undefined' && typeof ApiClient.getActiveStoreId === 'function') {
      storeId = ApiClient.getActiveStoreId();
    } else {
      storeId = localStorage.getItem('dawwer_active_store_id') || localStorage.getItem('activeStoreId');
    }

    const isValid = (typeof ApiClient !== 'undefined' && typeof ApiClient.isValidStoreId === 'function')
      ? ApiClient.isValidStoreId(storeId)
      : (storeId && storeId !== 'null' && storeId !== 'undefined' && storeId.trim() !== '');

    state.storeId = isValid ? storeId : null;

    const banner = document.getElementById('store-guard-banner');
    if (banner) {
      if (!isValid) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  /**
   * Load local orders from storage or fallback to SEED_ORDERS
   */
  function loadOrdersFromCache() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.orders = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached orders, using seed data:', e);
    }
    state.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
    saveOrdersToCache();
  }

  /**
   * Save orders list to persistent local storage
   */
  function saveOrdersToCache() {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders));
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.error('Failed to save orders to localStorage:', e);
    }
  }

  /**
   * Fetch orders from ASP.NET Backend API: GET /api/v1/stores/{store_id}/orders
   */
  async function fetchOrdersFromBackend() {
    if (!state.storeId) return;

    state.isLoading = true;
    updateRefreshButton(true);

    try {
      if (typeof ApiClient !== 'undefined' && ApiClient.orders && typeof ApiClient.orders.list === 'function') {
        const res = await ApiClient.orders.list(state.storeId);
        const data = (res && res.data) ? res.data : res;
        if (Array.isArray(data) && data.length > 0) {
          // Normalize server order objects if returned
          state.orders = data.map(item => normalizeBackendOrder(item));
          saveOrdersToCache();
        }
      }
    } catch (err) {
      // Backend not yet ready or offline -> fallback gracefully to cached seed orders
      console.log('Orders API sync note (using cached queue):', err && err.message ? err.message : err);
    } finally {
      state.isLoading = false;
      updateRefreshButton(false);
    }
  }

  /**
   * Normalizes backend order payload to the expected frontend schema
   */
  function normalizeBackendOrder(o) {
    return {
      id: o.id || o.orderId || `ORD-${o.orderNumber || Math.floor(1000 + Math.random() * 9000)}`,
      orderNumber: o.orderNumber || (o.id ? o.id.replace('ORD-', '') : '0000'),
      customerName: o.customerName || (o.customer && o.customer.name) || 'عميل غير مسجل',
      customerPhone: o.customerPhone || (o.customer && o.customer.phone) || '+966 50 000 0000',
      createdAt: o.createdAt || o.date || new Date().toISOString(),
      status: (o.status || 'submitted').toLowerCase(),
      fulfillmentType: (o.fulfillmentType || o.deliveryType || 'delivery').toLowerCase(),
      fulfillmentAddress: o.fulfillmentAddress || o.address || 'العنوان غير محدد',
      fulfillmentTiming: o.fulfillmentTiming || o.deliveryWindow || 'توصيل فوري',
      paymentMethod: o.paymentMethod || 'مدفوع إلكترونياً',
      customerNotes: o.customerNotes || o.notes || '',
      subtotal: parseFloat(o.subtotal || o.total || 0),
      vat: parseFloat(o.vat || 0),
      deliveryFee: parseFloat(o.deliveryFee || 0),
      total: parseFloat(o.total || 0),
      items: Array.isArray(o.items) ? o.items.map(it => ({
        id: it.id || it.productId || 'item-' + Math.random().toString(36).substr(2, 5),
        name: it.name || it.productName || 'صنف غير مسمى',
        sku: it.sku || it.barcode || 'SKU-000',
        barcode: it.barcode || it.sku || '',
        category: it.category || 'عام',
        shelfLocation: it.shelfLocation || formatShelfBreadcrumb(it.zone, it.aisle, it.shelf),
        zone: it.zone || 'أ',
        aisle: it.aisle || '01',
        shelf: it.shelf || '1',
        quantity: it.quantity || 1,
        unitPrice: parseFloat(it.unitPrice || it.price || 0),
        totalPrice: parseFloat(it.totalPrice || (it.unitPrice || it.price || 0) * (it.quantity || 1)),
        image: it.image || it.imageUrl || ''
      })) : []
    };
  }

  function formatShelfBreadcrumb(zone, aisle, shelf) {
    if (!zone && !aisle && !shelf) return 'المنطقة أ › ممر 01 › رف 1';
    return `المنطقة ${zone || 'أ'} › ممر ${aisle || '01'} › رف ${shelf || '1'}`;
  }

  /**
   * Set up all DOM event listeners
   */
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('filter-search');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
        }
        renderFeed();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          state.searchQuery = '';
          clearSearchBtn.classList.add('hidden');
          searchInput.focus();
          renderFeed();
        }
      });
    }

    // Fulfillment Filter
    const fulfillmentSelect = document.getElementById('filter-fulfillment');
    if (fulfillmentSelect) {
      fulfillmentSelect.addEventListener('change', (e) => {
        state.activeFulfillment = e.target.value;
        renderFeed();
      });
    }

    // Sort Filter
    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.activeSort = e.target.value;
        renderFeed();
      });
    }

    // Status Filter Tabs
    const statusTabs = document.getElementById('status-filter-tabs');
    if (statusTabs) {
      statusTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.status-tab-btn');
        if (!btn) return;
        const targetStatus = btn.getAttribute('data-status');
        if (targetStatus) {
          state.activeFilterStatus = targetStatus;
          updateStatusTabActiveStyles(btn);
          renderFeed();
        }
      });
    }

    // Refresh Queue Button
    const refreshBtn = document.getElementById('btn-refresh-queue');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await fetchOrdersFromBackend();
        renderAll();
        showAppToast('تم تحديث طابور الطلبات', 'تمت مزامنة الطلبات الواردة في الوقت الفعلي بنجاح.', 'success');
      });
    }

    // Simulate New Incoming Order Button (Header & Empty state)
    const simulateBtn = document.getElementById('btn-simulate-order');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', simulateIncomingOrder);
    }
    const emptySimulateBtn = document.getElementById('btn-empty-simulate');
    if (emptySimulateBtn) {
      emptySimulateBtn.addEventListener('click', simulateIncomingOrder);
    }

    // Reset Filters Button
    const resetFiltersBtn = document.getElementById('btn-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        state.activeFilterStatus = 'all';
        state.activeFulfillment = 'all';
        state.activeSort = 'newest';
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (fulfillmentSelect) fulfillmentSelect.value = 'all';
        if (sortSelect) sortSelect.value = 'newest';

        const allTab = document.querySelector('.status-tab-btn[data-status="all"]');
        if (allTab) updateStatusTabActiveStyles(allTab);

        renderFeed();
      });
    }

    // Order Feed Container Event Delegation (Accept, Details, Reject)
    const feedContainer = document.getElementById('orders-feed-container');
    if (feedContainer) {
      feedContainer.addEventListener('click', handleCardActionClick);
    }

    // Order Details Modal Actions
    const closeDetailsBtn = document.getElementById('btn-close-details-modal');
    const detailsBackdrop = document.getElementById('details-modal-backdrop');
    const secondaryDetailsBtn = document.getElementById('btn-modal-secondary-action');
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeDetailsModal);
    if (detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetailsModal);
    if (secondaryDetailsBtn) secondaryDetailsBtn.addEventListener('click', closeDetailsModal);

    const printPickListBtn = document.getElementById('btn-print-picklist');
    if (printPickListBtn) {
      printPickListBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const modalPrimaryActionBtn = document.getElementById('btn-modal-primary-action');
    if (modalPrimaryActionBtn) {
      modalPrimaryActionBtn.addEventListener('click', () => {
        if (!state.selectedOrder) return;
        advanceOrderStatus(state.selectedOrder.id);
      });
    }

    const modalRejectBtn = document.getElementById('btn-modal-reject');
    if (modalRejectBtn) {
      modalRejectBtn.addEventListener('click', () => {
        if (!state.selectedOrder) return;
        const ord = state.selectedOrder;
        closeDetailsModal();
        openRejectModal(ord);
      });
    }

    // Reject Modal Actions
    const closeRejectBtn = document.getElementById('btn-close-reject-modal');
    const cancelRejectBtn = document.getElementById('btn-cancel-reject');
    const rejectBackdrop = document.getElementById('reject-modal-backdrop');
    const rejectForm = document.getElementById('reject-order-form');
    if (closeRejectBtn) closeRejectBtn.addEventListener('click', closeRejectModal);
    if (cancelRejectBtn) cancelRejectBtn.addEventListener('click', closeRejectModal);
    if (rejectBackdrop) rejectBackdrop.addEventListener('click', closeRejectModal);
    if (rejectForm) {
      rejectForm.addEventListener('submit', handleRejectFormSubmit);
    }
  }

  /**
   * Update active tab styles
   */
  function updateStatusTabActiveStyles(activeBtn) {
    const allTabs = document.querySelectorAll('.status-tab-btn');
    allTabs.forEach(tab => {
      tab.classList.remove('active', 'bg-[#436850]', 'text-white', 'shadow-xs');
      tab.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
    });
    activeBtn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
    activeBtn.classList.add('active', 'bg-[#436850]', 'text-white', 'shadow-xs');
  }

  /**
   * Render KPIs, Tabs badges, and Feed
   */
  function renderAll() {
    renderKPIs();
    renderTabBadges();
    renderFeed();
  }

  /**
   * Render 3 Key Metrics (KPIs):
   * 1. الطلبات الجديدة (submitted)
   * 2. بانتظار التأكيد (submitted/pending review)
   * 3. قيد التجهيز (preparing)
   */
  function renderKPIs() {
    const newIncomingCount = state.orders.filter(o => o.status === 'submitted').length;
    const awaitingAcceptanceCount = state.orders.filter(o => o.status === 'submitted' || o.status === 'accepted').length;
    const preparingCount = state.orders.filter(o => o.status === 'preparing').length;

    const elNew = document.getElementById('kpi-new-count');
    const elAwaiting = document.getElementById('kpi-awaiting-count');
    const elPrep = document.getElementById('kpi-prep-count');

    if (elNew) elNew.textContent = newIncomingCount;
    if (elAwaiting) elAwaiting.textContent = awaitingAcceptanceCount;
    if (elPrep) elPrep.textContent = preparingCount;
  }

  /**
   * Update badge counts on filter tabs
   */
  function renderTabBadges() {
    const totalCount = state.orders.length;
    const submittedCount = state.orders.filter(o => o.status === 'submitted').length;
    const acceptedCount = state.orders.filter(o => o.status === 'accepted').length;
    const preparingCount = state.orders.filter(o => o.status === 'preparing').length;
    const readyCount = state.orders.filter(o => o.status === 'ready').length;

    updateTabBadge('all', totalCount);
    updateTabBadge('submitted', submittedCount);
    updateTabBadge('accepted', acceptedCount);
    updateTabBadge('preparing', preparingCount);
    updateTabBadge('ready', readyCount);
  }

  function updateTabBadge(status, count) {
    const tab = document.querySelector(`.status-tab-btn[data-status="${status}"] .count-badge`);
    if (tab) {
      tab.textContent = count;
    }
  }

  /**
   * Filter and sort orders
   */
  function getFilteredOrders() {
    return state.orders.filter(o => {
      // Status filter
      if (state.activeFilterStatus !== 'all' && o.status !== state.activeFilterStatus) {
        return false;
      }
      // Fulfillment filter
      if (state.activeFulfillment !== 'all' && o.fulfillmentType !== state.activeFulfillment) {
        return false;
      }
      // Search Query filter (Order Number, Customer Name, Phone)
      if (state.searchQuery) {
        const query = state.searchQuery;
        const idMatch = (o.id || '').toLowerCase().includes(query);
        const numMatch = (o.orderNumber || '').toLowerCase().includes(query);
        const nameMatch = (o.customerName || '').toLowerCase().includes(query);
        const phoneMatch = (o.customerPhone || '').toLowerCase().includes(query);
        if (!idMatch && !numMatch && !nameMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (state.activeSort === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (state.activeSort === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (state.activeSort === 'highest_amount') {
        return b.total - a.total;
      }
      return 0;
    });
  }

  /**
   * Render Order Cards Feed Grid
   */
  function renderFeed() {
    const container = document.getElementById('orders-feed-container');
    const emptyState = document.getElementById('orders-empty-state');
    const resultsInfo = document.getElementById('filter-results-info');
    if (!container) return;

    const filtered = getFilteredOrders();

    if (resultsInfo) {
      resultsInfo.textContent = `عرض ${filtered.length} طلب من إجمالي ${state.orders.length}`;
    }

    if (filtered.length === 0) {
      container.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = filtered.map(order => createOrderCardHTML(order)).join('');
  }

  /**
   * Generate Order Card HTML with strict adherence to DAWER visual tokens:
   * #12372A (Primary), #436850 (Secondary), #FBFADA (Canvas), #D4A373 (Amber Accent)
   */
  function createOrderCardHTML(order) {
    const timeAgo = formatRelativeTime(order.createdAt);
    const totalFormatted = (order.total || 0).toFixed(2) + ' ر.س';

    // Status Badge
    let statusBadgeHTML = '';
    if (order.status === 'submitted') {
      statusBadgeHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#D4A373]/20 text-[#8C5E31] border border-[#D4A373]/40">
          <span class="w-2 h-2 rounded-full bg-[#D4A373] animate-ping"></span>
          بانتظار الموافقة
        </span>`;
    } else if (order.status === 'accepted') {
      statusBadgeHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#436850]/15 text-[#12372A] border border-[#436850]/30">
          <svg class="w-3.5 h-3.5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          تم القبول
        </span>`;
    } else if (order.status === 'preparing') {
      statusBadgeHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <svg class="w-3.5 h-3.5 text-amber-700 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          قيد التجهيز
        </span>`;
    } else if (order.status === 'ready') {
      statusBadgeHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <svg class="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          جاهز للتسليم
        </span>`;
    } else if (order.status === 'rejected') {
      statusBadgeHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          مرفوض
        </span>`;
    }

    // Fulfillment Badge
    const isDelivery = order.fulfillmentType === 'delivery';
    const fulfillmentBadgeHTML = isDelivery
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
          <svg class="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
          توصيل سريع
        </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
          <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          استلام من المتجر
        </span>`;

    // Items preview list (first 2 items)
    const itemsPreview = (order.items || []).slice(0, 2).map(item => `
      <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
        <div class="flex items-center gap-2 overflow-hidden">
          <div class="w-6 h-6 rounded-lg bg-[#EAF1ED] text-[#12372A] flex items-center justify-center font-bold shrink-0 text-[11px]">
            ${item.quantity}×
          </div>
          <span class="font-bold text-slate-800 truncate" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        </div>
        <div class="shrink-0 text-left mr-2">
          <span class="text-[11px] font-semibold text-[#436850] bg-[#FBFADA] px-2 py-0.5 rounded-md border border-[#D4A373]/30 whitespace-nowrap">
            📍 ${escapeHtml(item.shelfLocation || 'الرف 1')}
          </span>
        </div>
      </div>
    `).join('');

    const moreItemsCount = (order.items || []).length > 2 ? (order.items.length - 2) : 0;
    const moreItemsBadge = moreItemsCount > 0
      ? `<div class="text-[11px] font-bold text-slate-500 pt-1 text-center bg-slate-50 rounded-lg py-1 mt-1">+ ${moreItemsCount} أصناف أخرى في قائمة الطلب</div>`
      : '';

    // Action Buttons logic
    let primaryActionBtn = '';
    if (order.status === 'submitted') {
      primaryActionBtn = `
        <button type="button" data-action="accept" data-id="${order.id}"
          class="flex-1 py-2 px-3 bg-[#12372A] hover:bg-[#0A2018] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>قبول الطلب</span>
        </button>`;
    } else if (order.status === 'accepted') {
      primaryActionBtn = `
        <button type="button" data-action="prepare" data-id="${order.id}"
          class="flex-1 py-2 px-3 bg-[#436850] hover:bg-[#34523e] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          <span>بدء التجهيز</span>
        </button>`;
    } else if (order.status === 'preparing') {
      primaryActionBtn = `
        <button type="button" data-action="ready" data-id="${order.id}"
          class="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>جاهز للتسليم</span>
        </button>`;
    } else {
      primaryActionBtn = `
        <div class="flex-1 py-2 px-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold text-center">
          مكتمل / مغلق
        </div>`;
    }

    const rejectBtnHTML = (order.status !== 'rejected' && order.status !== 'ready')
      ? `<button type="button" data-action="reject" data-id="${order.id}"
          class="py-2 px-3 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
          title="رفض الطلب مع ذكر السبب">
          رفض الطلب
        </button>`
      : '';

    return `
      <div class="bg-white rounded-2xl border border-[#436850]/20 shadow-soft hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col justify-between group" data-order-id="${order.id}">
        
        <!-- Card Top Section -->
        <div class="p-5 space-y-3.5">
          <!-- Header: Order ID, Time, Badges -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-base font-black text-[#12372A] tracking-tight">#${order.id}</span>
                ${fulfillmentBadgeHTML}
              </div>
              <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${timeAgo}</span>
              </div>
            </div>
            <div>
              ${statusBadgeHTML}
            </div>
          </div>

          <!-- Customer & Address Summary -->
          <div class="bg-slate-50/90 rounded-xl p-3 border border-slate-100 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-800 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                ${escapeHtml(order.customerName)}
              </span>
              <span class="text-slate-500" dir="ltr">${escapeHtml(order.customerPhone || '')}</span>
            </div>
            <div class="text-[11px] text-slate-500 truncate" title="${escapeHtml(order.fulfillmentAddress)}">
              ${escapeHtml(order.fulfillmentAddress)}
            </div>
          </div>

          <!-- Items Breakdown Preview (Thumbnails & Shelf Locations) -->
          <div class="space-y-1">
            <div class="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span>الأصناف ومواقع الرفوف:</span>
              <span class="text-[11px] text-[#436850] font-semibold">${(order.items || []).length} صنف</span>
            </div>
            <div class="rounded-xl border border-slate-200/80 p-2.5 bg-[#FBFADA]/20">
              ${itemsPreview}
              ${moreItemsBadge}
            </div>
          </div>

          <!-- Total Amount and Payment Method -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <span class="text-xs text-slate-500 block">إجمالي الطلب:</span>
              <span class="text-lg font-black text-[#12372A] tabular-nums">${totalFormatted}</span>
            </div>
            <div class="text-left text-xs text-slate-500">
              <span class="block">${order.paymentMethod || 'مدفوع'}</span>
              <span class="text-[11px] text-emerald-700 font-semibold">مضمون بالكامل ✓</span>
            </div>
          </div>
        </div>

        <!-- Card Action Buttons -->
        <div class="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
          ${primaryActionBtn}

          <button type="button" data-action="details" data-id="${order.id}"
            class="py-2 px-3.5 bg-white hover:bg-slate-100 text-[#12372A] border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer">
            <svg class="w-4 h-4 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>عرض التفاصيل</span>
          </button>

          ${rejectBtnHTML}
        </div>

      </div>
    `;
  }

  /**
   * Handle Card Action Click Delegation
   */
  async function handleCardActionClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const orderId = btn.getAttribute('data-id');
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (action === 'accept') {
      await updateOrderStatus(orderId, 'accepted');
    } else if (action === 'prepare') {
      await updateOrderStatus(orderId, 'preparing');
    } else if (action === 'ready') {
      await updateOrderStatus(orderId, 'ready');
    } else if (action === 'details') {
      openDetailsModal(order);
    } else if (action === 'reject') {
      openRejectModal(order);
    }
  }

  /**
   * Advance order status to the next step
   */
  async function advanceOrderStatus(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status === 'submitted') {
      await updateOrderStatus(orderId, 'accepted');
    } else if (order.status === 'accepted') {
      await updateOrderStatus(orderId, 'preparing');
    } else if (order.status === 'preparing') {
      await updateOrderStatus(orderId, 'ready');
    }
    // Re-render modal if open
    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(state.selectedOrder);
    }
  }

  /**
   * Update order status with API synchronization and local state management
   */
  async function updateOrderStatus(orderId, newStatus, payload = {}) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const prevStatus = order.status;
    order.status = newStatus;
    if (payload.rejectReason) order.rejectReason = payload.rejectReason;
    if (payload.rejectNotes) order.rejectNotes = payload.rejectNotes;

    saveOrdersToCache();
    renderAll();

    // Feedback notification
    let statusText = '';
    if (newStatus === 'accepted') statusText = 'تم قبول الطلب وتأكيد الحجز بنجاح';
    else if (newStatus === 'preparing') statusText = 'تم تحويل الطلب إلى مرحلة التجهيز والجمع من الرفوف';
    else if (newStatus === 'ready') statusText = 'أصبح الطلب جاهزاً للتسليم للعميل أو المندوب';
    else if (newStatus === 'rejected') statusText = 'تم رفض الطلب وإشعار العميل بسبب الإلغاء';

    showAppToast(
      `تحديث الطلب #${order.id}`,
      statusText,
      newStatus === 'rejected' ? 'warning' : 'success'
    );

    // Call Backend API in background
    if (state.storeId && typeof ApiClient !== 'undefined' && ApiClient.orders) {
      try {
        if (newStatus === 'accepted' && typeof ApiClient.orders.accept === 'function') {
          await ApiClient.orders.accept(state.storeId, orderId);
        } else if (newStatus === 'rejected' && typeof ApiClient.orders.reject === 'function') {
          await ApiClient.orders.reject(state.storeId, orderId, payload.rejectReason || '', payload.rejectNotes || '');
        } else if (typeof ApiClient.orders.updateStatus === 'function') {
          await ApiClient.orders.updateStatus(state.storeId, orderId, newStatus, payload);
        }
      } catch (err) {
        console.warn('Backend order status update note:', err && err.message ? err.message : err);
      }
    }
  }

  /**
   * Open Order Details Modal (with Shelf Locations Table and Timeline Tracker)
   */
  function openDetailsModal(order) {
    state.selectedOrder = order;
    const modal = document.getElementById('order-details-modal');
    if (!modal) return;

    // Header info
    const elId = document.getElementById('modal-order-id');
    const elTime = document.getElementById('modal-order-time');
    const elBadge = document.getElementById('modal-order-fulfillment-badge');
    if (elId) elId.textContent = `#${order.id}`;
    if (elTime) elTime.textContent = formatRelativeTime(order.createdAt);
    if (elBadge) {
      elBadge.textContent = order.fulfillmentType === 'delivery' ? 'توصيل سريع للعميل' : 'استلام ذاتي من المتجر';
    }

    // Customer & Fulfillment Box
    const elCustName = document.getElementById('modal-customer-name');
    const elCustPhone = document.getElementById('modal-customer-phone');
    const elDest = document.getElementById('modal-fulfillment-destination');
    const elTiming = document.getElementById('modal-fulfillment-timing');
    if (elCustName) elCustName.textContent = order.customerName || 'عميل';
    if (elCustPhone) elCustPhone.textContent = order.customerPhone || '';
    if (elDest) elDest.textContent = order.fulfillmentAddress || '';
    if (elTiming) elTiming.textContent = order.fulfillmentTiming || '';

    // Timeline Tracker
    renderOrderTimeline(order.status);

    // Items Table with Shelf Locations
    const tbody = document.getElementById('modal-items-tbody');
    const itemsCountBadge = document.getElementById('modal-items-count-badge');
    if (itemsCountBadge) {
      itemsCountBadge.textContent = `${(order.items || []).length} أصناف`;
    }

    if (tbody) {
      tbody.innerHTML = (order.items || []).map(item => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#EAF1ED] border border-[#436850]/20 flex items-center justify-center font-bold text-[#12372A] shrink-0 text-sm">
                ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" class="w-full h-full object-cover rounded-xl">` : getCategoryIcon(item.category)}
              </div>
              <div>
                <div class="font-bold text-slate-900 text-xs">${escapeHtml(item.name)}</div>
                <div class="text-[11px] text-slate-400 font-mono" dir="ltr">باركود: ${escapeHtml(item.barcode || item.sku || 'N/A')}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#FBFADA] text-[#12372A] border border-[#D4A373]/40">
              <svg class="w-3.5 h-3.5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              <span>${escapeHtml(item.shelfLocation || 'المنطقة أ › ممر 01 › رف 1')}</span>
            </span>
          </td>
          <td class="py-3 px-3 text-center font-black text-slate-900 tabular-nums">
            ${item.quantity}
          </td>
          <td class="py-3 px-3 text-center font-medium text-slate-600 tabular-nums">
            ${(item.unitPrice || 0).toFixed(2)} ر.س
          </td>
          <td class="py-3 px-4 text-left font-black text-[#12372A] tabular-nums">
            ${(item.totalPrice || (item.unitPrice * item.quantity) || 0).toFixed(2)} ر.س
          </td>
        </tr>
      `).join('');
    }

    // Financial Breakdown
    const elSub = document.getElementById('modal-subtotal');
    const elVat = document.getElementById('modal-vat');
    const elDelivery = document.getElementById('modal-delivery-fee');
    const elTotal = document.getElementById('modal-total-amount');
    const elPay = document.getElementById('modal-payment-method');
    const elNotes = document.getElementById('modal-customer-notes');

    if (elSub) elSub.textContent = (order.subtotal || 0).toFixed(2) + ' ر.س';
    if (elVat) elVat.textContent = (order.vat || 0).toFixed(2) + ' ر.س';
    if (elDelivery) elDelivery.textContent = (order.deliveryFee || 0).toFixed(2) + ' ر.س';
    if (elTotal) elTotal.textContent = (order.total || 0).toFixed(2) + ' ر.س';
    if (elPay) elPay.textContent = order.paymentMethod || 'مدفوع إلكترونياً';
    if (elNotes) elNotes.textContent = order.customerNotes || 'لا توجد ملاحظات إضافية من العميل.';

    // Bottom Action button text
    const primaryBtnText = document.getElementById('btn-modal-primary-text');
    const primaryBtn = document.getElementById('btn-modal-primary-action');
    if (primaryBtnText && primaryBtn) {
      if (order.status === 'submitted') {
        primaryBtnText.textContent = 'قبول وتأكيد الطلب';
        primaryBtn.classList.remove('hidden');
      } else if (order.status === 'accepted') {
        primaryBtnText.textContent = 'بدء التجهيز وجمع الأصناف';
        primaryBtn.classList.remove('hidden');
      } else if (order.status === 'preparing') {
        primaryBtnText.textContent = 'اكتمال التجهيز وجاهز للتسليم';
        primaryBtn.classList.remove('hidden');
      } else {
        primaryBtn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Render order timeline steps in details modal
   */
  function renderOrderTimeline(currentStatus) {
    const container = document.getElementById('order-timeline-steps');
    if (!container) return;

    const steps = [
      { key: 'submitted', title: 'تم استلام الطلب', subtitle: 'الطلب في الطابور' },
      { key: 'accepted', title: 'تم القبول والتأكيد', subtitle: 'تم حجز الأصناف' },
      { key: 'preparing', title: 'قيد التجهيز', subtitle: 'جمع من الرفوف' },
      { key: 'ready', title: 'جاهز للتسليم', subtitle: 'للمندوب أو العميل' }
    ];

    const orderStages = ['submitted', 'accepted', 'preparing', 'ready'];
    const currentIndex = orderStages.indexOf(currentStatus);

    container.innerHTML = steps.map((step, idx) => {
      const isPast = currentIndex > idx;
      const isCurrent = currentIndex === idx;
      const isFuture = currentIndex < idx;

      let circleClass = 'bg-slate-200 text-slate-500 border-slate-300';
      if (isPast) {
        circleClass = 'bg-[#12372A] text-white border-[#12372A]';
      } else if (isCurrent) {
        circleClass = 'bg-[#436850] text-white border-[#436850] ring-4 ring-[#436850]/20';
      }

      return `
        <div class="flex flex-col items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${circleClass} mb-1.5 transition-all">
            ${isPast ? '✓' : (idx + 1)}
          </div>
          <span class="text-xs font-bold ${isCurrent ? 'text-[#12372A]' : 'text-slate-700'}">${step.title}</span>
          <span class="text-[10px] text-slate-500 hidden sm:block">${step.subtitle}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Open Rejection Reasons Modal
   */
  function openRejectModal(order) {
    state.selectedOrder = order;
    const modal = document.getElementById('order-reject-modal');
    const title = document.getElementById('reject-modal-title');
    const targetIdInput = document.getElementById('reject-target-order-id');
    const notesInput = document.getElementById('reject-notes');

    if (title) title.textContent = `رفض الطلب رقم #${order.id}`;
    if (targetIdInput) targetIdInput.value = order.id;
    if (notesInput) notesInput.value = '';

    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeRejectModal() {
    const modal = document.getElementById('order-reject-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Handle Rejection Form Submit
   */
  async function handleRejectFormSubmit(e) {
    e.preventDefault();
    const targetIdInput = document.getElementById('reject-target-order-id');
    const notesInput = document.getElementById('reject-notes');
    const checkedReason = document.querySelector('input[name="reject_reason"]:checked');

    const orderId = targetIdInput ? targetIdInput.value : null;
    if (!orderId) return;

    const reason = checkedReason ? checkedReason.value : 'other';
    const notes = notesInput ? notesInput.value.trim() : '';

    closeRejectModal();
    await updateOrderStatus(orderId, 'rejected', { rejectReason: reason, rejectNotes: notes });
  }

  /**
   * Simulate a realistic incoming customer order in real-time
   */
  function simulateIncomingOrder() {
    const sampleCustomers = [
      { name: 'محمد بن سلطان الشمري', phone: '+966 50 223 8899', address: 'الرياض - حي حطين - شارع الأمير تركي الأول' },
      { name: 'لمى بنت فهد الدوسري', phone: '+966 55 901 4433', address: 'الرياض - حي الصحافة - شارع العليا' },
      { name: 'عمر ياسين الزهراني', phone: '+966 54 332 1100', address: 'استلام ذاتي من فرع المتجر الرئيسي' }
    ];

    const pick = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
    const newNumber = Math.floor(2050 + Math.random() * 500).toString();
    const newId = `ORD-${newNumber}`;

    const newOrder = {
      id: newId,
      orderNumber: newNumber,
      customerName: pick.name,
      customerPhone: pick.phone,
      createdAt: new Date().toISOString(),
      status: 'submitted',
      fulfillmentType: pick.address.includes('استلام') ? 'pickup' : 'delivery',
      fulfillmentAddress: pick.address,
      fulfillmentTiming: 'طلب فوري جديد',
      paymentMethod: 'مدى (مدفوع إلكترونياً)',
      customerNotes: 'الطلب عاجل من فضلكم.',
      subtotal: 58.00,
      vat: 8.70,
      deliveryFee: pick.address.includes('استلام') ? 0 : 15.00,
      total: pick.address.includes('استلام') ? 66.70 : 81.70,
      items: [
        {
          id: 'item-sim-' + Date.now(),
          name: 'عصير برتقال طبيعي المراعي 1.4 لتر',
          sku: 'SKU-JUC-019',
          barcode: '628100998877',
          category: 'مشروبات',
          shelfLocation: 'المنطقة ب › ممر 02 › ثلاجة 2',
          zone: 'ب',
          aisle: '02',
          shelf: 'ثلاجة 2',
          quantity: 2,
          unitPrice: 13.50,
          totalPrice: 27.00,
          image: ''
        },
        {
          id: 'item-sim2-' + Date.now(),
          name: 'معمول بالتمر الفاخر حلواني إخوان 300 جم',
          sku: 'SKU-MAM-020',
          barcode: '628100887766',
          category: 'حلويات وبسكويت',
          shelfLocation: 'المنطقة ج › ممر 03 › رف 2',
          zone: 'ج',
          aisle: '03',
          shelf: '2',
          quantity: 2,
          unitPrice: 15.50,
          totalPrice: 31.00,
          image: ''
        }
      ]
    };

    // Prepend to orders list
    state.orders.unshift(newOrder);
    saveOrdersToCache();
    renderAll();

    // Play subtle audio alert if possible
    playAlertTone();

    showAppToast(
      `طلب جديد وارد! #${newOrder.id}`,
      `ورد طلب شراء جديد من ${newOrder.customerName} بقيمة ${newOrder.total.toFixed(2)} ر.س`,
      'info'
    );
  }

  /**
   * Web Audio API subtle chime
   */
  function playAlertTone() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  /**
   * Auto Polling every 15 seconds
   */
  function startAutoPolling() {
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    state.pollingTimer = setInterval(async () => {
      await fetchOrdersFromBackend();
      renderAll();
    }, 15000);
  }

  /**
   * Format relative time in Arabic (e.g. "منذ 3 دقائق")
   */
  function formatRelativeTime(dateString) {
    if (!dateString) return 'الآن';
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'منذ لحظات';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : diffMin === 2 ? 'دقيقتين' : 'دقائق'}`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `منذ ${diffHours} ${diffHours === 1 ? 'ساعة' : 'ساعات'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`;
  }

  /**
   * Visual refresh icon spin
   */
  function updateRefreshButton(isSpinning) {
    const icon = document.getElementById('refresh-icon');
    if (!icon) return;
    if (isSpinning) {
      icon.classList.add('animate-spin');
    } else {
      icon.classList.remove('animate-spin');
    }
  }

  /**
   * Notification / Toast helper
   */
  function showAppToast(title, message, type = 'success') {
    if (typeof window.showToast === 'function') {
      window.showToast({ title, message, type });
    } else if (typeof DawwerNotification !== 'undefined' && typeof DawwerNotification.show === 'function') {
      DawwerNotification.show(title, message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }

  /**
   * HTML escape
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * SVG Category Icon placeholder
   */
  function getCategoryIcon(cat) {
    return `<svg class="w-5 h-5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`;
  }

  // DOMContentLoaded bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
