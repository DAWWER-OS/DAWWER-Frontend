/**
 * Dawwer Live Orders Center - Sprint 3
 * Pure Vanilla JavaScript implementation with self-contained interactive mock data.
 * Features:
 *  - Feature 3.3: Order Lifecycle & Status Progression (جديد -> قيد التجهيز -> جاهز للتسليم -> تم التسليم -> ملغي)
 *  - Feature 3.3 (Part 2): Out-of-Stock Substitution Flow (اقتراح بديل للأصناف الناقصة مع احتساب فرق السعر)
 *  - Feature 3.4: Payment Slip Verification & Bank Transfer Audit (تدقيق إيصالات الدفع والتحويل البنكي)
 */

(function () {
  'use strict';

  const STORAGE_KEY_ORDERS = 'dawwer_merchant_orders_queue_sprint3';
  const STORAGE_KEY_LAST_SYNC = 'dawwer_merchant_orders_last_sync';

  // =========================================================================
  // 1. Rich Realistic Mock Orders (5 Diverse Scenarios)
  // =========================================================================
  const SEED_ORDERS = [
    {
      id: 'ORD-2048',
      orderNumber: '2048',
      customerName: 'سارة عبد الله الشمري',
      customerPhone: '+966 54 812 3456',
      createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // 6 mins ago
      status: 'pending', // جديد
      fulfillmentType: 'delivery', // توصيل منزلي
      fulfillmentAddress: 'الرياض - حي النرجس - شارع التخصصي - عمارة 12 شقة 4',
      fulfillmentTiming: 'توصيل فوري خلال 30 دقيقة',
      paymentMethod: 'تحويل بنكي / محفظة إلكترونية',
      paymentStatus: 'verification_pending', // بانتظار تدقيق الإشعار
      paymentSlip: {
        senderName: 'سارة عبد الله الشمري',
        bankName: 'مصرف الراجحي (حساب رقم ...8492)',
        referenceNumber: 'TXN-98421094',
        amountSent: 145.00,
        requiredAmount: 145.00,
        uploadTime: 'منذ 6 دقائق',
        verified: false,
        rejectionReason: null,
        rejectionNotes: ''
      },
      customerNotes: 'يرجى التأكد من صلاحية المنتجات وسلامة التغليف قبل الإرسال.',
      subtotal: 113.04,
      vat: 16.96,
      deliveryFee: 15.00,
      total: 145.00,
      items: [
        {
          id: 'item-2048-1',
          name: 'زيت زيتون بكر ممتاز الجوف 500 مل',
          sku: 'SKU-OIL-006',
          barcode: '628100678901',
          category: 'تموين ومؤن',
          shelfLocation: 'المنطقة د › ممر 04 › رف 3',
          zone: 'د',
          aisle: '04',
          shelf: '3',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 34.00,
          totalPrice: 68.00,
          image: ''
        },
        {
          id: 'item-2048-2',
          name: 'أرز باب الهند بسمتي عنبر 5 كجم',
          sku: 'SKU-RIC-IND',
          barcode: '628100111010',
          category: 'أغذية جافة',
          shelfLocation: 'المنطقة د › ممر 02 › رف 1',
          zone: 'د',
          aisle: '02',
          shelf: '1',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 1,
          unitPrice: 48.00,
          totalPrice: 48.00,
          image: ''
        },
        {
          id: 'item-2048-3',
          name: 'حليب كامل الدسم المراعي 2 لتر',
          sku: 'SKU-MLK-004',
          barcode: '628100456789',
          category: 'ألبان',
          shelfLocation: 'المنطقة ب › ممر 02 › ثلاجة 3',
          zone: 'ب',
          aisle: '02',
          shelf: 'ثلاجة 3',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 1,
          unitPrice: 14.00,
          totalPrice: 14.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2047',
      orderNumber: '2047',
      customerName: 'عبد العزيز بن فهد التميمي',
      customerPhone: '+966 50 443 2190',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
      status: 'preparing', // قيد التجهيز
      fulfillmentType: 'pickup', // استلام من الفرع
      fulfillmentAddress: 'استلام ذاتي من فرع المتجر الرئيسي (كاونتر الاستلام السريع)',
      fulfillmentTiming: 'نافذة الاستلام: اليوم بين 4:30 - 5:30 مساءً',
      paymentMethod: 'مدى (مدفوع إلكترونياً)',
      paymentStatus: 'paid',
      customerNotes: 'سأمر بالسيارة بعد نصف ساعة لاستلام الطلب جاهزاً.',
      subtotal: 93.91,
      vat: 14.09,
      deliveryFee: 0.00,
      total: 108.00,
      items: [
        {
          id: 'item-2047-1',
          name: 'قهوة عربي خولاني فاخرة بالهيل 500 جم',
          sku: 'SKU-COF-009',
          barcode: '628100901234',
          category: 'قهوة وشاي',
          shelfLocation: 'المنطقة أ › ممر 04 › رف 1',
          zone: 'أ',
          aisle: '04',
          shelf: '1',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 1,
          unitPrice: 42.00,
          totalPrice: 42.00,
          image: ''
        },
        {
          id: 'item-2047-2',
          name: 'أرز الشعلان عنبر كلاسيك 5 كجم',
          sku: 'SKU-RIC-SHA',
          barcode: '628100111009',
          category: 'أغذية جافة',
          shelfLocation: 'المنطقة د › ممر 02 › رف 2',
          zone: 'د',
          aisle: '02',
          shelf: '2',
          stockAllocated: false,
          stockStatus: 'insufficient', // عجز مخزون لاختبار البديل
          quantity: 1,
          unitPrice: 44.00,
          totalPrice: 44.00,
          image: ''
        },
        {
          id: 'item-2047-3',
          name: 'حليب كامل الدسم المراعي 2 لتر',
          sku: 'SKU-MLK-004',
          barcode: '628100456789',
          category: 'ألبان',
          shelfLocation: 'المنطقة ب › ممر 02 › ثلاجة 3',
          zone: 'ب',
          aisle: '02',
          shelf: 'ثلاجة 3',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 11.00,
          totalPrice: 22.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2046',
      orderNumber: '2046',
      customerName: 'نورة بنت فيصل السديري',
      customerPhone: '+966 56 778 9012',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      status: 'awaiting_approval', // بانتظار موافقة العميل
      fulfillmentType: 'delivery',
      fulfillmentAddress: 'الرياض - حي الملقا - شارع وادي حنيفة - فيلا 18',
      fulfillmentTiming: 'توصيل مبرمج: اليوم 6:00 م',
      paymentMethod: 'أبل باي (مدفوع)',
      paymentStatus: 'paid',
      customerNotes: 'يرجى ترك الطلب عند الباب والاتصال بي.',
      subtotal: 60.43,
      vat: 9.07,
      deliveryFee: 15.00,
      total: 84.50,
      originalTotal: 87.50,
      priceDifference: -3.00,
      hasSubstitutions: true,
      substitutions: [
        {
          originalItemId: 'item-2046-1',
          originalItemName: 'أفوكادو هاس مكسيكي طازج',
          originalQuantity: 2,
          originalUnitPrice: 14.50,
          substituteProductId: 'prod-004',
          substituteProductName: 'أفوكادو هاس كيني طازج (درجة أولى)',
          substituteQuantity: 2,
          substituteUnitPrice: 13.00,
          substituteTotalPrice: 26.00,
          priceDifference: -3.00
        }
      ],
      revisedTotal: 84.50,
      items: [
        {
          id: 'item-2046-1',
          name: 'أفوكادو هاس مكسيكي طازج',
          sku: 'SKU-AVO-001',
          barcode: '628100123456',
          category: 'خضار وفواكه',
          shelfLocation: 'المنطقة أ › ممر 01 › رف 2',
          zone: 'أ',
          aisle: '01',
          shelf: '2',
          stockAllocated: false,
          stockStatus: 'insufficient',
          quantity: 2,
          unitPrice: 14.50,
          totalPrice: 29.00,
          image: '',
          substitutedBy: {
            productId: 'prod-004',
            name: 'أفوكادو هاس كيني طازج (درجة أولى)',
            sku: 'SKU-AVO-KEN',
            category: 'خضار وفواكه',
            quantity: 2,
            unitPrice: 13.00,
            totalPrice: 26.00,
            stock: 24,
            priceDiff: -3.00,
            merchantNote: 'نفد الأفوكادو المكسيكي، نقترح كيني درجة أولى ممتاز وبسعر أوفر.'
          }
        },
        {
          id: 'item-2046-2',
          name: 'جبنة فيتا يونانية أصلية 200جم',
          sku: 'SKU-CH-FET',
          barcode: '628100111007',
          category: 'ألبان وأجبان',
          shelfLocation: 'المنطقة ب › ممر 03 › ثلاجة 1',
          zone: 'ب',
          aisle: '03',
          shelf: 'ثلاجة 1',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 11.50,
          totalPrice: 23.00,
          image: ''
        },
        {
          id: 'item-2046-3',
          name: 'خبز لوزين توست أبيض فاخر 600جم',
          sku: 'SKU-BRD-LUZ',
          barcode: '628100111008',
          category: 'مخبوزات',
          shelfLocation: 'المنطقة ج › ممر 02 › رف 1',
          zone: 'ج',
          aisle: '02',
          shelf: '1',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 10.25,
          totalPrice: 20.50,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2043',
      orderNumber: '2043',
      customerName: 'خالد إبراهيم المنصور',
      customerPhone: '+966 55 123 7890',
      createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(), // 48 mins ago
      status: 'ready', // جاهز للاستلام / خرج للتوصيل
      fulfillmentType: 'delivery',
      fulfillmentAddress: 'الرياض - حي الياسمين - شارع القادسية - عمارة الروضة',
      fulfillmentTiming: 'مع مندوب التوصيل حالياً في الطريق للعميل',
      paymentMethod: 'دفع عند الاستلام (كاش)',
      paymentStatus: 'cash_on_delivery',
      customerNotes: 'يرجى إحضار فكة 100 ₪.',
      subtotal: 64.78,
      vat: 9.72,
      deliveryFee: 15.00,
      total: 89.50,
      items: [
        {
          id: 'item-2043-1',
          name: 'منظف ديتول متعدد الاستعمالات 1 لتر',
          sku: 'SKU-CLN-011',
          barcode: '628100112233',
          category: 'عناية ومنظفات',
          shelfLocation: 'المنطقة و › ممر 06 › رف 2',
          zone: 'و',
          aisle: '06',
          shelf: '2',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 1,
          unitPrice: 26.50,
          totalPrice: 26.50,
          image: ''
        },
        {
          id: 'item-2043-2',
          name: 'مناديل فاين كلاسيك معقمة 10 علب',
          sku: 'SKU-TIS-012',
          barcode: '628100223344',
          category: 'عناية ومنظفات',
          shelfLocation: 'المنطقة و › ممر 06 › رف 4',
          zone: 'و',
          aisle: '06',
          shelf: '4',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 1,
          unitPrice: 48.00,
          totalPrice: 48.00,
          image: ''
        }
      ]
    },
    {
      id: 'ORD-2038',
      orderNumber: '2038',
      customerName: 'محمد سلطان القحطاني',
      customerPhone: '+966 53 321 4567',
      createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(), // 95 mins ago
      status: 'completed', // تم التسليم (مكتمل)
      fulfillmentType: 'pickup',
      fulfillmentAddress: 'استلام ذاتي من كاونتر المتجر الرئيسي',
      fulfillmentTiming: 'تم التسليم اليوم 2:15 م',
      paymentMethod: 'فيزا (مدفوع)',
      paymentStatus: 'paid',
      customerNotes: 'تم الاستلام بنجاح.',
      subtotal: 133.91,
      vat: 20.09,
      deliveryFee: 0.00,
      total: 154.00,
      items: [
        {
          id: 'item-2038-1',
          name: 'تمور سكري مفتل فاخر كرتون 1 كجم',
          sku: 'SKU-DAT-010',
          barcode: '628100012345',
          category: 'تمور ومكسرات',
          shelfLocation: 'المنطقة أ › ممر 04 › رف 3',
          zone: 'أ',
          aisle: '04',
          shelf: '3',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 35.00,
          totalPrice: 70.00,
          image: ''
        },
        {
          id: 'item-2038-2',
          name: 'شاي ربيع أوراق كاملة كرتون 400 جم',
          sku: 'SKU-TEA-008',
          barcode: '628100890123',
          category: 'مشروبات ساخنة',
          shelfLocation: 'المنطقة أ › ممر 03 › رف 2',
          zone: 'أ',
          aisle: '03',
          shelf: '2',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 21.00,
          totalPrice: 42.00,
          image: ''
        },
        {
          id: 'item-2038-3',
          name: 'مياه صفا مكة كرتون 40×330مل',
          sku: 'SKU-WAT-007',
          barcode: '628100789012',
          category: 'مشروبات ومياه',
          shelfLocation: 'المنطقة هـ › ممر 05 › منصة 1',
          zone: 'هـ',
          aisle: '05',
          shelf: 'منصة 1',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 21.00,
          totalPrice: 42.00,
          image: ''
        }
      ]
    }
  ];

  // =========================================================================
  // 2. Catalog Products for Substitution Selector
  // =========================================================================
  const CATALOG_PRODUCTS = [
    { id: 'prod-001', name: 'أرز باب الهند بسمتي عنبر 5 كجم', sku: 'SKU-RIC-IND', category: 'أغذية جافة', price: 48.00, stock: 18, barcode: '628100111010' },
    { id: 'prod-002', name: 'أرز الشعلان عنبر كلاسيك 5 كجم', sku: 'SKU-RIC-SHA', category: 'أغذية جافة', price: 44.00, stock: 25, barcode: '628100111009' },
    { id: 'prod-003', name: 'أرز أبو كاس مزة بسمتي 5 كجم', sku: 'SKU-RIC-KAS', category: 'أغذية جافة', price: 42.50, stock: 30, barcode: '628100111099' },
    { id: 'prod-004', name: 'أفوكادو هاس كيني طازج (درجة أولى)', sku: 'SKU-AVO-KEN', category: 'خضار وفواكه', price: 13.00, stock: 24, barcode: '628100111004' },
    { id: 'prod-005', name: 'أفوكادو هاس مكسيكي عضوي', sku: 'SKU-AVO-MEX', category: 'خضار وفواكه', price: 16.50, stock: 15, barcode: '628100111005' },
    { id: 'prod-006', name: 'زيت ذرة عافية 1.5 لتر', sku: 'SKU-OIL-AFI', category: 'تموين ومؤن', price: 22.50, stock: 35, barcode: '628100111011' },
    { id: 'prod-007', name: 'زيت دوار الشمس نور 1.5 لتر', sku: 'SKU-OIL-NOO', category: 'تموين ومؤن', price: 19.50, stock: 22, barcode: '628100111012' },
    { id: 'prod-008', name: 'زيت زيتون بكر ممتاز الجوف 500 مل', sku: 'SKU-OIL-006', category: 'تموين ومؤن', price: 34.00, stock: 20, barcode: '628100678901' },
    { id: 'prod-009', name: 'حليب نادك طازج كامل الدسم 2 لتر', sku: 'SKU-MLK-NAD', category: 'ألبان', price: 11.50, stock: 40, barcode: '628100111001' },
    { id: 'prod-010', name: 'حليب المراعي كامل الدسم 2 لتر', sku: 'SKU-MLK-004', category: 'ألبان', price: 11.00, stock: 32, barcode: '628100456789' },
    { id: 'prod-011', name: 'جبنة قريش المراعي قليلة الدسم 400جم', sku: 'SKU-CH-QAR', category: 'ألبان وأجبان', price: 12.00, stock: 20, barcode: '628100111006' },
    { id: 'prod-012', name: 'جبنة فيتا يونانية أصلية 200جم', sku: 'SKU-CH-FET', category: 'ألبان وأجبان', price: 11.50, stock: 28, barcode: '628100111007' },
    { id: 'prod-013', name: 'خبز لوزين توست أبيض فاخر 600جم', sku: 'SKU-BRD-LUZ', category: 'مخبوزات', price: 5.50, stock: 50, barcode: '628100111008' },
    { id: 'prod-014', name: 'بيض الوطنية طازج طبق 30 بيضة', sku: 'SKU-EGG-WAT', category: 'ألبان وبيض', price: 19.50, stock: 26, barcode: '628100111014' }
  ];

  // =========================================================================
  // 3. Application State
  // =========================================================================
  const state = {
    orders: [],
    activeFilterStatus: 'all', // all | pending | preparing | ready | awaiting_approval | completed | cancelled
    activeFulfillment: 'all',  // all | pickup | delivery
    activeSort: 'newest',      // newest | oldest | highest_amount
    searchQuery: '',
    selectedOrder: null,
    expandedOrderIds: new Set(),
    catalogProducts: [...CATALOG_PRODUCTS],
    
    // Substitution state
    substitutionState: {
      orderId: null,
      itemId: null,
      order: null,
      item: null,
      selectedProduct: null,
      substituteQty: 1,
      substitutePrice: 0,
      merchantNote: ''
    },

    // Lightbox state
    lightbox: {
      orderId: null,
      order: null,
      zoom: 1,
      rotation: 0
    }
  };

  // =========================================================================
  // 4. Initialisation & Storage
  // =========================================================================
  function init() {
    setupEventListeners();
    setupLightboxZoomControls();

    const storeId = localStorage.getItem('activeStoreId') || localStorage.getItem('storeId');
    if (!storeId) {
      loadOrdersFromCache();
      renderAll();
    } else {
      const container = document.getElementById('orders-feed-container');
      const emptyState = document.getElementById('orders-empty-state');
      if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="text-xs font-bold text-slate-500">جاري تحميل الطلبات...</p>
          </div>
        `;
      }
      if (emptyState) emptyState.classList.add('hidden');
    }

    fetchLiveOrders();
  }

  async function fetchLiveOrders() {
    const storeId = localStorage.getItem('activeStoreId') || localStorage.getItem('storeId');
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
    const guardBanner = document.getElementById('store-guard-banner');

    if (!storeId) {
      if (guardBanner) guardBanner.classList.remove('hidden');
      console.warn('[Orders] Store ID is missing. Rendering default mock orders so UI remains active.');
      if (!state.orders || state.orders.length === 0) {
        state.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
      }
      renderAll();
      return;
    } else {
      if (guardBanner) guardBanner.classList.add('hidden');
    }

    try {
      const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
        : 'https://dawwer.runasp.net/api';
      const endpoint = `${baseUrl}/Orders?storeId=${encodeURIComponent(storeId)}`;

      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || (json && json.success === false)) {
        throw new Error(json?.message || `HTTP ${response.status}`);
      }

      // Unpack standard envelope { success, data, errors }
      const payload = json?.data !== undefined ? json.data : json;
      const orderList = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload?.orders) ? payload.orders : []));

      if (Array.isArray(orderList) && orderList.length > 0) {
        const normalized = orderList.map(normalizeRemoteOrder).filter(Boolean);
        state.orders = normalized;
        saveOrdersToCache();
      } else {
        // Successful response (200 / success: true) with empty list (data.length === 0):
        // DO NOT render mock/demo orders.
        // Clear all mock cards from #orders-feed-container and reset all KPI badge counters to 0.
        console.info('[Orders] Store has 0 orders returned from API. Displaying empty state.');
        state.orders = [];
        saveOrdersToCache();
      }
    } catch (e) {
      // Restrict fallback mock orders strictly to actual HTTP errors (e.g. 500 / Network Failure / Offline)
      console.warn('[Orders] Backend unavailable or failed to fetch live orders, using default fallback data:', e && e.message ? e.message : e);
      if (!state.orders || state.orders.length === 0) {
        state.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
      }
    } finally {
      // ALWAYS update KPI cards and populate orders feed container
      renderAll();
    }
  }

  function normalizeRemoteOrder(o) {
    if (!o) return null;
    const rawItems = Array.isArray(o.items) ? o.items : (Array.isArray(o.orderItems) ? o.orderItems : []);
    const rawReceiptId = o.receiptId || o.paymentSlip?.receiptId || o.receipt?.id || (o.receipts && o.receipts[0] ? o.receipts[0].id : 'latest');

    return {
      id: o.id || o.orderNumber || ('ORD-' + Math.floor(1000 + Math.random() * 9000)),
      orderNumber: o.orderNumber || String(o.id || ''),
      customerName: o.customerName || (o.customer ? o.customer.fullName : 'عميل دوّر'),
      customerPhone: o.customerPhone || (o.customer ? o.customer.phoneNumber : '—'),
      createdAt: o.createdAt || o.createdAtUtc || new Date().toISOString(),
      status: normalizeStatus(o.status !== undefined ? o.status : o.orderStatus),
      fulfillmentType: (o.fulfillmentType === 1 || o.fulfillmentType === 'pickup') ? 'pickup' : 'delivery',
      fulfillmentAddress: typeof o.deliveryAddress === 'object' && o.deliveryAddress ? `${o.deliveryAddress.city || ''} ${o.deliveryAddress.streetAddress || ''}`.trim() : (o.deliveryAddress || 'الاستلام من الفرع'),
      fulfillmentTiming: o.fulfillmentTiming || 'توصيل قياسي',
      paymentMethod: o.paymentMethod || 'تحويل بنكي / محفظة إلكترونية',
      paymentStatus: (o.paymentStatus === 4 || o.paymentStatus === 'paid' || o.paymentStatus === 'Paid') ? 'paid' : (o.paymentStatus === 2 ? 'verification_pending' : 'pending'),
      paymentSlip: o.paymentSlip || {
        receiptId: rawReceiptId,
        senderName: o.customerName || 'عميل دوّر',
        bankName: 'مصرف الراجحي',
        referenceNumber: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
        amountSent: Number(o.totalAmount || o.total || 0),
        requiredAmount: Number(o.totalAmount || o.total || 0),
        uploadTime: 'الآن',
        verified: (o.paymentStatus === 4 || o.paymentStatus === 'paid' || o.paymentStatus === 'Paid'),
        rejectionReason: null,
        rejectionNotes: ''
      },
      customerNotes: o.customerNotes || o.notes || '',
      subtotal: Number(o.subtotal || o.subtotalAmount || 0),
      vat: Number(o.vat || o.taxAmount || 0),
      deliveryFee: Number(o.deliveryFee || 0),
      total: Number(o.total || o.totalAmount || 0),
      items: rawItems.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        productId: it.productId || it.id || `prod-${idx + 1}`,
        name: it.productName || it.name || it.product?.name || 'منتج',
        sku: it.sku || `SKU-${idx + 1}`,
        barcode: it.barcode || '',
        category: it.category || 'عام',
        shelfLocation: it.shelfLocation || 'رف أ-1',
        zone: it.zone || 'أ',
        aisle: it.aisle || '01',
        shelf: it.shelf || '1',
        stockAllocated: true,
        stockStatus: 'reserved',
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || it.price || 0),
        totalPrice: Number(it.totalPrice || ((it.quantity || 1) * (it.unitPrice || it.price || 0))),
        image: it.imageUrl || it.image || ''
      }))
    };
  }

  function loadOrdersFromCache() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          state.orders = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Could not parse cached orders, resetting to seed data:', e);
    }
    state.orders = JSON.parse(JSON.stringify(SEED_ORDERS));
    saveOrdersToCache();
  }

  function saveOrdersToCache() {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders));
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.error('Failed to save orders to localStorage:', e);
    }
  }

  // =========================================================================
  // 5. Normalization & Helper Functions
  // =========================================================================
  function normalizeStatus(st) {
    if (st === undefined || st === null) return 'pending';
    const s = String(st).toLowerCase().trim();
    if (s === '1' || s === 'submitted' || s === 'new' || s === 'pending') return 'pending';
    if (s === '2' || s === 'accepted') return 'accepted';
    if (s === '3' || s === 'preparing' || s === 'processing' || s === 'picking') return 'preparing';
    if (s === '4' || s === 'ready' || s === 'out_for_delivery') return 'ready';
    if (s === '5' || s === 'completed' || s === 'delivered') return 'completed';
    if (s === '7' || s === '6' || s === 'rejected' || s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'awaiting_approval' || s === 'awaiting_customer_confirmation' || s === 'awaiting_customer_approval') return 'awaiting_approval';
    return s;
  }

  function getStatusLabel(status) {
    const s = normalizeStatus(status);
    if (s === 'pending') return 'جديد';
    if (s === 'accepted') return 'مقبول';
    if (s === 'preparing') return 'قيد التجهيز';
    if (s === 'ready') return 'جاهز للتسليم';
    if (s === 'awaiting_approval') return 'بانتظار موافقة العميل';
    if (s === 'completed') return 'مكتمل';
    if (s === 'cancelled') return 'ملغي';
    return s;
  }

  function getStatusBadgeHTML(status) {
    const s = normalizeStatus(status);
    if (s === 'pending') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>طلب جديد</span>
        </span>
      `;
    }
    if (s === 'preparing') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
          <svg class="w-3.5 h-3.5 text-emerald-700 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>قيد التجهيز</span>
        </span>
      `;
    }
    if (s === 'ready') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
          <svg class="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>جاهز / للتوصيل</span>
        </span>
      `;
    }
    if (s === 'awaiting_approval') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>بانتظار موافقة العميل</span>
        </span>
      `;
    }
    if (s === 'completed') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
          <svg class="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>تم التسليم</span>
        </span>
      `;
    }
    if (s === 'cancelled') {
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
          <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>ملغي</span>
        </span>
      `;
    }
    return `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">${escapeHtml(status)}</span>`;
  }

  function getPaymentStatusBadgeHTML(order) {
    const isBank = (order.paymentMethod && (order.paymentMethod.includes('تحويل') || order.paymentMethod.includes('محفظة'))) || order.paymentSlip;
    const pStatus = order.paymentStatus || (isBank ? 'verification_pending' : 'paid');

    if (pStatus === 'verification_pending') {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          <span>بانتظار تدقيق الإشعار</span>
        </span>
      `;
    }
    if (pStatus === 'paid') {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>مدفوع (معتمد)</span>
        </span>
      `;
    }
    if (pStatus === 'rejected') {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
          <svg class="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>إشعار مرفوض</span>
        </span>
      `;
    }
    if (pStatus === 'cash_on_delivery') {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
          <span>دفع نقدي عند الاستلام</span>
        </span>
      `;
    }
    return '';
  }

  function renderStockAllocationBadge(item) {
    const isAllocated = item.stockAllocated !== false && item.stockStatus !== 'insufficient';
    if (isAllocated) {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shadow-2xs">
          <svg class="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>مخزون محجوز مؤقتاً</span>
        </span>
      `;
    } else {
      return `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap animate-pulse shadow-2xs">
          <svg class="w-3 h-3 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>تنبيه: عجز مخزون</span>
        </span>
      `;
    }
  }

  // =========================================================================
  // 6. Stepper Component (Feature 3.3)
  // Stepper: جديد -> قيد التجهيز -> جاهز للاستلام / خرج للتوصيل -> تم التسليم -> ملغي
  // =========================================================================
  function renderOrderStepperHTML(currentStatus) {
    const norm = normalizeStatus(currentStatus);

    if (norm === 'cancelled') {
      return `
        <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-2 text-rose-800 text-xs font-bold">
          <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>هذا الطلب ملغي ومغلق</span>
        </div>
      `;
    }

    const stages = [
      { key: 'pending', label: 'جديد', num: 1 },
      { key: 'preparing', label: 'قيد التجهيز', num: 2 },
      { key: 'ready', label: 'جاهز / للتوصيل', num: 3 },
      { key: 'completed', label: 'تم التسليم', num: 4 }
    ];

    const stageKeys = ['pending', 'preparing', 'ready', 'completed'];
    let activeIdx = stageKeys.indexOf(norm);
    if (activeIdx === -1) {
      if (norm === 'awaiting_approval') activeIdx = 1;
    }

    return `
      <div class="flex items-center justify-between gap-1 w-full max-w-xl mx-auto py-1 px-2 select-none">
        ${stages.map((st, idx) => {
          const isDone = activeIdx > idx || norm === 'completed';
          const isCurrent = activeIdx === idx && norm !== 'completed';
          let circleBg = 'bg-slate-100 text-slate-400 border-slate-200';
          let textColor = 'text-slate-400';
          let lineBg = 'bg-slate-200';

          if (isDone) {
            circleBg = 'bg-[#1c5335] text-white border-[#1c5335] shadow-xs';
            textColor = 'text-[#1c5335] font-bold';
            lineBg = 'bg-[#1c5335]';
          } else if (isCurrent) {
            circleBg = 'bg-[#1c5335] text-white border-[#1c5335] ring-4 ring-[#1c5335]/20 shadow-xs';
            textColor = 'text-[#1c5335] font-black';
          }

          return `
            <div class="flex items-center ${idx < stages.length - 1 ? 'flex-1' : ''}">
              <div class="flex flex-col items-center">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${circleBg} transition-all duration-300">
                  ${isDone ? '✓' : st.num}
                </div>
                <span class="text-[10px] mt-1 whitespace-nowrap ${textColor}">${st.label}</span>
              </div>
              ${idx < stages.length - 1 ? `
                <div class="flex-1 h-0.5 mx-1.5 -mt-3.5 ${isDone ? 'bg-[#1c5335]' : 'bg-slate-200'} transition-colors"></div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // =========================================================================
  // 7. Instant Status Action Button
  // =========================================================================
  function renderQuickTransitionButton(order) {
    const norm = normalizeStatus(order.status);

    if (norm === 'pending') {
      return `
        <button type="button" data-action="quick-advance" data-order-id="${order.id}"
          class="px-4 py-2 bg-[#1c5335] hover:bg-[#143e27] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          title="الانتقال إلى مرحلة التجهيز">
          <svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
          <span>بدء التجهيز ➔</span>
        </button>
      `;
    }
    if (norm === 'preparing') {
      const isPickup = order.fulfillmentType === 'pickup';
      const label = isPickup ? 'جاهز للاستلام ➔' : 'خرج للتوصيل ➔';
      return `
        <button type="button" data-action="quick-advance" data-order-id="${order.id}"
          class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          title="تحديد الجاهزية للعميل أو السائق">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>${label}</span>
        </button>
      `;
    }
    if (norm === 'ready') {
      return `
        <button type="button" data-action="quick-advance" data-order-id="${order.id}"
          class="px-4 py-2 bg-[#1c5335] hover:bg-[#143e27] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          title="تأكيد تسليم الطلب النهائي">
          <svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>تأكيد التسليم بنجاح ✓</span>
        </button>
      `;
    }
    if (norm === 'awaiting_approval') {
      return `
        <button type="button" data-action="quick-advance" data-order-id="${order.id}"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
          title="اعتماد العميل ومتابعة التجهيز">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>اعتماد العميل ومتابعة التجهيز</span>
        </button>
      `;
    }
    return '';
  }

  // =========================================================================
  // 8. Order Item Substitution Cell & Banner (Feature 3.3 Part 2)
  // =========================================================================
  function renderItemSubstitutionCell(order, item) {
    if (item.substitutedBy) {
      const s = item.substitutedBy;
      const diff = s.priceDiff || 0;
      const diffFormatted = diff > 0 ? `+${diff.toFixed(2)} ₪` : (diff < 0 ? `-${Math.abs(diff).toFixed(2)} ₪` : '0.00 ₪');
      return `
        <div class="flex flex-col items-center gap-1">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <svg class="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>بديل: ${escapeHtml(s.name)} (${s.quantity}×)</span>
          </span>
          <div class="text-[10px] font-bold ${diff >= 0 ? 'text-amber-800' : 'text-emerald-700'} tabular-nums">
            فرق: ${diffFormatted}
          </div>
          <button type="button" data-action="open-substitution" data-order-id="${order.id}" data-item-id="${item.id}"
            class="text-[10px] font-bold text-[#1c5335] hover:underline cursor-pointer">
            تعديل البديل
          </button>
        </div>
      `;
    }

    const isInsufficient = item.stockAllocated === false || item.stockStatus === 'insufficient';
    return `
      <button type="button" data-action="open-substitution" data-order-id="${order.id}" data-item-id="${item.id}"
        class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
          isInsufficient
            ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-2xs ring-2 ring-amber-300/40'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
        }"
        title="اقتراح صنف بديل من الكتالوج">
        <svg class="w-3.5 h-3.5 ${isInsufficient ? 'text-amber-700' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
        <span>صنف غير متوفر / اقتراح بديل</span>
      </button>
    `;
  }

  function renderSubstitutionBannerHTML(order) {
    if (!order.hasSubstitutions || !order.substitutions || order.substitutions.length === 0) {
      return '';
    }

    const diff = order.priceDifference || 0;
    const diffFormatted = diff > 0 ? `+${diff.toFixed(2)} ₪` : (diff < 0 ? `-${Math.abs(diff).toFixed(2)} ₪` : '0.00 ₪');
    const isAwaiting = normalizeStatus(order.status) === 'awaiting_approval';
    const revisedTotal = order.revisedTotal !== undefined ? order.revisedTotal : order.total;

    return `
      <div class="p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <div class="text-xs sm:text-sm font-black text-amber-950 flex flex-wrap items-center gap-2">
              <span>تم اقتراح بدائل - الإجمالي الجديد: <strong class="text-[#1c5335] font-black tabular-nums">${revisedTotal.toFixed(2)} ₪</strong></span>
              <span class="text-[11px] px-2 py-0.5 rounded-md ${diff >= 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-900'} font-bold tabular-nums">
                فرق السعر: ${diffFormatted}
              </span>
            </div>
            <p class="text-[11px] text-amber-800 mt-0.5">
              ${isAwaiting ? 'تم إرسال الاقتراح للزبون وبانتظار موافقته للاعتماد وبدء التجهيز.' : 'تم تعديل الأصناف، يرجى إرسال الاقتراح للزبون للموافقة.'}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          ${isAwaiting ? `
            <button type="button" data-action="preview-customer-notif" data-order-id="${order.id}"
              class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
              <svg class="w-3.5 h-3.5 text-[#1c5335]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>معاينة إشعار العميل</span>
            </button>
          ` : `
            <button type="button" data-action="submit-substitutions" data-id="${order.id}"
              class="px-4 py-2 bg-[#1c5335] hover:bg-[#143e27] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap">
              <svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              <span>إرسال الاقتراح للزبون</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 9. Order Feed Card HTML
  // =========================================================================
  function createOrderCardHTML(order) {
    const timeAgo = formatRelativeTime(order.createdAt);
    const displayTotal = (order.hasSubstitutions && order.revisedTotal !== undefined) ? order.revisedTotal : (order.total || 0);
    const totalFormatted = `${displayTotal.toFixed(2)} ₪`;
    const isExpanded = state.expandedOrderIds && state.expandedOrderIds.has(order.id);
    const isDelivery = order.fulfillmentType === 'delivery';

    // Status & Payment badges
    const statusBadgeHTML = getStatusBadgeHTML(order.status);
    const paymentStatusBadgeHTML = getPaymentStatusBadgeHTML(order);
    const quickActionButtonHTML = renderQuickTransitionButton(order);
    const substitutionBannerHTML = renderSubstitutionBannerHTML(order);
    const miniStepperHTML = renderOrderStepperHTML(order.status);

    const hasSlip = (order.paymentMethod && (order.paymentMethod.includes('تحويل') || order.paymentMethod.includes('محفظة'))) || order.paymentSlip;

    // Delivery Badge
    const fulfillmentBadgeHTML = isDelivery
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-100">
          <svg class="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
          <span>توصيل منزلي</span>
        </span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-100">
          <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          <span>استلام من الفرع</span>
        </span>`;

    const items = order.items || [];
    const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const uniqueShelves = Array.from(new Set(items.map(item => item.shelfLocation).filter(Boolean)));

    return `
      <div class="bg-white rounded-2xl border border-slate-200 hover:border-[#1c5335]/40 shadow-xs hover:shadow-soft transition-all duration-200 overflow-hidden" data-order-id="${order.id}">
        
        <!-- Order Header Summary (Always Visible) -->
        <div class="order-accordion-header flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none">
          
          <!-- Right side in RTL: Order ID + Status Badge + Delivery Badge + Elapsed Time -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
            <span class="text-sm sm:text-base font-black text-[#1c5335] tracking-tight tabular-nums">#${escapeHtml(order.id)}</span>
            ${statusBadgeHTML}
            ${fulfillmentBadgeHTML}
            <span class="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${timeAgo}</span>
            </span>
          </div>

          <!-- Customer details -->
          <div class="hidden md:flex items-center gap-2 text-xs text-slate-600 truncate px-2">
            <span class="font-bold text-slate-900">${escapeHtml(order.customerName)}</span>
            <span class="text-slate-300">•</span>
            <span class="text-slate-500 font-medium tabular-nums" dir="ltr">${escapeHtml(order.customerPhone || '')}</span>
          </div>

          <!-- Left side in RTL: Payment Status + Quick Status Action + Price + Chevron -->
          <div class="flex items-center gap-2 sm:gap-3 shrink-0 mr-auto">
            ${hasSlip ? `
              <button type="button" data-action="inspect-payment" data-order-id="${order.id}"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#EAF1ED] hover:bg-[#1c5335] text-[#1c5335] hover:text-white border border-[#436850]/20 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="معاينة وتدقيق إشعار التحويل البنكي">
                <svg class="w-3.5 h-3.5 text-[#D4A373]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span>معاينة إشعار الدفع</span>
              </button>
            ` : ''}

            ${paymentStatusBadgeHTML}
            ${quickActionButtonHTML}

            <span class="text-xs sm:text-sm font-black text-[#1c5335] tabular-nums">${totalFormatted}</span>

            <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <svg class="w-4 h-4 transition-transform duration-200 chevron-icon ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

        </div>

        <!-- Mini Stepper Line inside the card -->
        <div class="border-t border-slate-100 bg-slate-50/50 py-2 px-4">
          ${miniStepperHTML}
        </div>

        <!-- Expandable Details Drawer (Accordion Body) -->
        <div class="order-accordion-body ${isExpanded ? '' : 'hidden'} border-t border-slate-100 bg-[#FBFADA]/15 p-4 sm:p-5 space-y-4">
          
          <!-- Row 1: Customer Details + Timing & Address -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs shadow-2xs">
            <div class="space-y-1">
              <span class="text-slate-400 font-bold block text-[11px]">بيانات العميل وطريقة الدفع:</span>
              <div class="flex items-center gap-2">
                <span class="font-black text-slate-900 text-sm">${escapeHtml(order.customerName)}</span>
                <span class="text-slate-500 tabular-nums font-medium" dir="ltr">${escapeHtml(order.customerPhone || '')}</span>
              </div>
              <div class="text-[11px] text-slate-600 flex items-center gap-2">
                <span>طريقة الدفع: <strong class="text-slate-900">${escapeHtml(order.paymentMethod || 'مدفوع')}</strong></span>
                ${paymentStatusBadgeHTML}
              </div>
              ${order.customerNotes ? `<div class="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1"><strong>ملاحظة العميل:</strong> ${escapeHtml(order.customerNotes)}</div>` : ''}
            </div>

            <div class="space-y-1">
              <span class="text-slate-400 font-bold block text-[11px]">وجهة وتوقيت الطلب:</span>
              <div class="flex items-start gap-1.5 text-slate-700">
                <svg class="w-4 h-4 text-[#436850] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span class="font-medium text-slate-900">${escapeHtml(order.fulfillmentAddress)}</span>
              </div>
              <div class="text-[11px] text-slate-500 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${escapeHtml(order.fulfillmentTiming || 'فوري')}</span>
              </div>
            </div>
          </div>

          <!-- Shelf locations -->
          ${uniqueShelves.length > 0 ? `
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <span class="font-bold text-slate-500 flex items-center gap-1 text-[11px]">
                <svg class="w-3.5 h-3.5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                مواقع التجهيز في المتجر:
              </span>
              ${uniqueShelves.map(shelf => `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FBFADA] text-[#1c5335] border border-[#D4A373]/30">
                  📍 ${escapeHtml(shelf)}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <!-- Substitutions Summary Banner -->
          ${substitutionBannerHTML ? `<div>${substitutionBannerHTML}</div>` : ''}

          <!-- Reserved Items Table -->
          <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table class="w-full text-right text-xs">
              <thead>
                <tr class="bg-[#EAF1ED] text-[#1c5335] font-bold border-b border-[#436850]/20">
                  <th class="py-2.5 px-3">الصنف المطلوب</th>
                  <th class="py-2.5 px-3">موقع الرف في المتجر</th>
                  <th class="py-2.5 px-3 text-center">حالة حجز المخزون</th>
                  <th class="py-2.5 px-3 text-center">الكمية</th>
                  <th class="py-2.5 px-3 text-left">الإجمالي</th>
                  <th class="py-2.5 px-3 text-center">الإجراء / البديل</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                ${items.map(item => `
                  <tr class="hover:bg-slate-50/60">
                    <td class="py-2.5 px-3 font-semibold text-slate-800">
                      <div>${escapeHtml(item.name)}</div>
                      <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.sku || '')}</div>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="inline-flex items-center gap-1 text-[11px] font-bold bg-[#FBFADA]/80 px-2 py-1 rounded-lg border border-[#D4A373]/30 whitespace-nowrap">
                        <span class="text-slate-600">المنطقة <strong class="text-[#1c5335]">${escapeHtml(item.zone || 'أ')}</strong></span>
                        <span class="text-slate-300">•</span>
                        <span class="text-slate-600">ممر <strong class="text-[#1c5335]">${escapeHtml(item.aisle || '01')}</strong></span>
                        <span class="text-slate-300">•</span>
                        <span class="text-slate-600">رف <strong class="text-[#1c5335]">${escapeHtml(item.shelf || '1')}</strong></span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      ${renderStockAllocationBadge(item)}
                    </td>
                    <td class="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                      <span class="px-2 py-0.5 bg-[#EAF1ED] rounded-md text-[#1c5335]">${item.quantity}×</span>
                    </td>
                    <td class="py-2.5 px-3 text-left font-black text-[#1c5335] tabular-nums">
                      ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)} ₪
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      ${renderItemSubstitutionCell(order, item)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Action Buttons inside Drawer -->
          <div class="pt-2 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              ${quickActionButtonHTML}

              <button type="button" data-action="details" data-id="${order.id}"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>تفاصيل الطلب والتحضير</span>
              </button>

              <button type="button" data-action="print-pick" data-id="${order.id}"
                class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                <span>طباعة قائمة الجمع</span>
              </button>
            </div>

            ${normalizeStatus(order.status) !== 'completed' && normalizeStatus(order.status) !== 'cancelled' ? `
              <button type="button" data-action="reject" data-id="${order.id}"
                class="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1 mr-auto"
                title="إلغاء الطلب مع ذكر السبب">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>إلغاء الطلب</span>
              </button>
            ` : ''}
          </div>

        </div>

      </div>
    `;
  }

  // =========================================================================
  // 10. Feed & KPI Rendering
  // =========================================================================
  function renderAll() {
    renderKPIs();
    renderTabBadges();
    renderFeed();
  }

  function renderKPIs() {
    const newCount = state.orders.filter(o => normalizeStatus(o.status) === 'pending').length;
    const awaitingCount = state.orders.filter(o => {
      const s = normalizeStatus(o.status);
      return s === 'pending' || s === 'awaiting_approval';
    }).length;
    const prepCount = state.orders.filter(o => normalizeStatus(o.status) === 'preparing').length;

    const elNew = document.getElementById('kpi-new-count');
    const elAwaiting = document.getElementById('kpi-awaiting-count');
    const elPrep = document.getElementById('kpi-prep-count');

    if (elNew) elNew.textContent = newCount;
    if (elAwaiting) elAwaiting.textContent = awaitingCount;
    if (elPrep) elPrep.textContent = prepCount;
  }

  function renderTabBadges() {
    const totalCount = state.orders.length;
    const pendingCount = state.orders.filter(o => normalizeStatus(o.status) === 'pending').length;
    const prepCount = state.orders.filter(o => normalizeStatus(o.status) === 'preparing').length;
    const readyCount = state.orders.filter(o => normalizeStatus(o.status) === 'ready').length;
    const awaitingCount = state.orders.filter(o => normalizeStatus(o.status) === 'awaiting_approval').length;
    const completedCount = state.orders.filter(o => normalizeStatus(o.status) === 'completed').length;
    const cancelledCount = state.orders.filter(o => normalizeStatus(o.status) === 'cancelled').length;

    updateTabBadge('all', totalCount);
    updateTabBadge('pending', pendingCount);
    updateTabBadge('preparing', prepCount);
    updateTabBadge('ready', readyCount);
    updateTabBadge('awaiting_approval', awaitingCount);
    updateTabBadge('completed', completedCount);
    updateTabBadge('cancelled', cancelledCount);
  }

  function updateTabBadge(status, count) {
    const tab = document.querySelector(`.status-tab-btn[data-status="${status}"] .count-badge`);
    if (tab) {
      tab.textContent = count;
    }
  }

  function getFilteredOrders() {
    return state.orders.filter(o => {
      const normStatus = normalizeStatus(o.status);

      // Status filter
      if (state.activeFilterStatus !== 'all') {
        if (normStatus !== state.activeFilterStatus) {
          return false;
        }
      }

      // Fulfillment filter
      if (state.activeFulfillment !== 'all') {
        if (o.fulfillmentType !== state.activeFulfillment) {
          return false;
        }
      }

      // Search query
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const idMatch = (o.id || '').toLowerCase().includes(q);
        const nameMatch = (o.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (o.customerPhone || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) {
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
        const totalA = a.hasSubstitutions && a.revisedTotal !== undefined ? a.revisedTotal : (a.total || 0);
        const totalB = b.hasSubstitutions && b.revisedTotal !== undefined ? b.revisedTotal : (b.total || 0);
        return totalB - totalA;
      }
      return 0;
    });
  }

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
      container.innerHTML = '';
      container.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        const emptyTitle = document.getElementById('empty-state-title');
        const emptyDesc = document.getElementById('empty-state-desc');
        if (state.orders.length === 0) {
          if (emptyTitle) emptyTitle.textContent = 'لا توجد طلبات جديدة حالياً';
          if (emptyDesc) emptyDesc.textContent = 'مركز استقبال الطلبات فارغ حالياً. ستظهر الطلبات الواردة فور قيام العملاء بالشراء من متجرك.';
        } else {
          if (emptyTitle) emptyTitle.textContent = 'لا توجد طلبات في هذا التصنيف';
          if (emptyDesc) emptyDesc.textContent = 'لم يتم العثور على أي طلبات تطابق الفلتر أو البحث المحدد.';
        }
      }
      return;
    }

    container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = filtered.map(order => createOrderCardHTML(order)).join('');
  }

  // =========================================================================
  // 11. Event Listeners & Delegation
  // =========================================================================
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('filter-search');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
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

    // Refresh Orders Button
    const refreshBtn = document.getElementById('btn-refresh-queue');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const icon = document.getElementById('refresh-icon');
        if (icon) icon.classList.add('animate-spin');
        setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin');
          renderAll();
          showAppToast('تحديث القائمة', 'تمت مزامنة الطلبات وتحديث الحالة الفورية بنجاح.', 'success');
        }, 350);
      });
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

    // Simulate New Incoming Order Buttons
    const simulateBtn = document.getElementById('btn-simulate-order');
    if (simulateBtn) simulateBtn.addEventListener('click', simulateIncomingOrder);
    const emptySimulateBtn = document.getElementById('btn-empty-simulate');
    if (emptySimulateBtn) emptySimulateBtn.addEventListener('click', simulateIncomingOrder);

    // Feed Event Delegation
    const feedContainer = document.getElementById('orders-feed-container');
    if (feedContainer) {
      feedContainer.addEventListener('click', handleCardActionClick);
    }

    // Details Modal Event Delegation & Listeners
    const detailsModal = document.getElementById('order-details-modal');
    if (detailsModal) {
      detailsModal.addEventListener('click', handleCardActionClick);
    }

    const closeDetailsBtn = document.getElementById('btn-close-details-modal');
    const detailsBackdrop = document.getElementById('details-modal-backdrop');
    const secondaryDetailsBtn = document.getElementById('btn-modal-secondary-action');
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeDetailsModal);
    if (detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetailsModal);
    if (secondaryDetailsBtn) secondaryDetailsBtn.addEventListener('click', closeDetailsModal);

    const printPickListBtn = document.getElementById('btn-print-picklist');
    if (printPickListBtn) {
      printPickListBtn.addEventListener('click', () => window.print());
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
        openRejectModal(state.selectedOrder);
      });
    }

    const modalInspectSlipBtn = document.getElementById('btn-modal-inspect-slip');
    if (modalInspectSlipBtn) {
      modalInspectSlipBtn.addEventListener('click', () => {
        if (!state.selectedOrder) return;
        openPaymentLightbox(state.selectedOrder.id);
      });
    }

    // Order Rejection Form
    const closeRejectBtn = document.getElementById('btn-close-reject-modal');
    const cancelRejectBtn = document.getElementById('btn-cancel-reject');
    const rejectBackdrop = document.getElementById('reject-modal-backdrop');
    const rejectForm = document.getElementById('reject-order-form');
    if (closeRejectBtn) closeRejectBtn.addEventListener('click', closeRejectModal);
    if (cancelRejectBtn) cancelRejectBtn.addEventListener('click', closeRejectModal);
    if (rejectBackdrop) rejectBackdrop.addEventListener('click', closeRejectModal);
    if (rejectForm) rejectForm.addEventListener('submit', handleRejectFormSubmit);

    // Substitution Modal Listeners
    const subSearchInput = document.getElementById('substitute-search-input');
    if (subSearchInput) {
      subSearchInput.addEventListener('input', (e) => {
        renderSubstituteResults(e.target.value);
      });
    }

    const subResultsContainer = document.getElementById('substitute-results-container');
    if (subResultsContainer) {
      subResultsContainer.addEventListener('click', (e) => {
        const itemRow = e.target.closest('.substitute-result-item');
        if (!itemRow) return;
        const productId = itemRow.getAttribute('data-product-id');
        const prod = state.catalogProducts.find(p => p.id === productId);
        if (prod) selectSubstituteProduct(prod);
      });
    }

    const btnSubMinus = document.getElementById('btn-sub-qty-minus');
    const btnSubPlus = document.getElementById('btn-sub-qty-plus');
    const subQtyInput = document.getElementById('sub-qty-input');
    if (btnSubMinus) btnSubMinus.addEventListener('click', () => changeSubstituteQty(-1));
    if (btnSubPlus) btnSubPlus.addEventListener('click', () => changeSubstituteQty(1));
    if (subQtyInput) {
      subQtyInput.addEventListener('input', (e) => setSubstituteQty(e.target.value));
      subQtyInput.addEventListener('change', (e) => setSubstituteQty(e.target.value));
    }

    const subPriceInput = document.getElementById('sub-price-input');
    if (subPriceInput) {
      subPriceInput.addEventListener('input', (e) => setSubstitutePrice(e.target.value));
      subPriceInput.addEventListener('change', (e) => setSubstitutePrice(e.target.value));
    }

    const btnConfirmSubstitute = document.getElementById('btn-confirm-substitute');
    if (btnConfirmSubstitute) {
      btnConfirmSubstitute.addEventListener('click', confirmSubstitution);
    }

    const btnCloseSubModal = document.getElementById('btn-close-substitute-modal');
    const btnCancelSub = document.getElementById('btn-cancel-substitute');
    const subBackdrop = document.getElementById('substitute-modal-backdrop');
    if (btnCloseSubModal) btnCloseSubModal.addEventListener('click', closeSubstitutionModal);
    if (btnCancelSub) btnCancelSub.addEventListener('click', closeSubstitutionModal);
    if (subBackdrop) subBackdrop.addEventListener('click', closeSubstitutionModal);

    // Lightbox Modal Listeners (Payment Audit)
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const lbBackdrop = document.getElementById('receipt-lightbox-backdrop');
    if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closePaymentLightbox);
    if (lbBackdrop) lbBackdrop.addEventListener('click', closePaymentLightbox);

    const btnLbApprove = document.getElementById('btn-lb-approve');
    if (btnLbApprove) {
      btnLbApprove.addEventListener('click', () => {
        const orderId = btnLbApprove.getAttribute('data-order-id');
        approvePayment(orderId);
      });
    }

    const btnLbReject = document.getElementById('btn-lb-reject');
    if (btnLbReject) {
      btnLbReject.addEventListener('click', () => {
        const orderId = btnLbReject.getAttribute('data-order-id');
        openReceiptRejectionModal(orderId);
      });
    }

    const btnLbCashOpt = document.getElementById('btn-lb-cash-opt');
    if (btnLbCashOpt) {
      btnLbCashOpt.addEventListener('click', () => {
        const orderId = btnLbCashOpt.getAttribute('data-order-id');
        openCashModal(orderId);
      });
    }

    // Receipt Rejection Form Listeners
    const btnCloseReceiptReject = document.getElementById('btn-close-receipt-reject');
    const btnCancelReceiptReject = document.getElementById('btn-cancel-receipt-reject');
    const receiptRejectBackdrop = document.getElementById('receipt-reject-backdrop');
    const receiptRejectForm = document.getElementById('receipt-reject-form');
    if (btnCloseReceiptReject) btnCloseReceiptReject.addEventListener('click', closeReceiptRejectionModal);
    if (btnCancelReceiptReject) btnCancelReceiptReject.addEventListener('click', closeReceiptRejectionModal);
    if (receiptRejectBackdrop) receiptRejectBackdrop.addEventListener('click', closeReceiptRejectionModal);
    if (receiptRejectForm) receiptRejectForm.addEventListener('submit', handleReceiptRejectSubmit);

    // Cash Log Form Listeners
    const btnCloseCashModal = document.getElementById('btn-close-cash-modal');
    const btnCancelCashLog = document.getElementById('btn-cancel-cash-log');
    const cashBackdrop = document.getElementById('cash-modal-backdrop');
    const cashForm = document.getElementById('cash-log-form');
    if (btnCloseCashModal) btnCloseCashModal.addEventListener('click', closeCashModal);
    if (btnCancelCashLog) btnCancelCashLog.addEventListener('click', closeCashModal);
    if (cashBackdrop) cashBackdrop.addEventListener('click', closeCashModal);
    if (cashForm) cashForm.addEventListener('submit', handleCashFormSubmit);

    // Customer Notification Modal Listeners
    const btnCloseCustomerNotif = document.getElementById('btn-close-customer-notif');
    const btnDismissCustomerNotif = document.getElementById('btn-dismiss-customer-notif');
    const customerNotifBackdrop = document.getElementById('customer-notif-backdrop');
    const btnSimulateCustomerApproval = document.getElementById('btn-simulate-customer-approval');
    if (btnCloseCustomerNotif) btnCloseCustomerNotif.addEventListener('click', closeCustomerNotifModal);
    if (btnDismissCustomerNotif) btnDismissCustomerNotif.addEventListener('click', closeCustomerNotifModal);
    if (customerNotifBackdrop) customerNotifBackdrop.addEventListener('click', closeCustomerNotifModal);
    if (btnSimulateCustomerApproval) {
      btnSimulateCustomerApproval.addEventListener('click', simulateCustomerApproval);
    }
  }

  function updateStatusTabActiveStyles(activeBtn) {
    const allTabs = document.querySelectorAll('.status-tab-btn');
    allTabs.forEach(tab => {
      tab.classList.remove('active', 'bg-[#1c5335]', 'text-white', 'shadow-xs');
      tab.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
    });
    activeBtn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
    activeBtn.classList.add('active', 'bg-[#1c5335]', 'text-white', 'shadow-xs');
  }

  // =========================================================================
  // 12. Card Click Delegation & Status Transitions
  // =========================================================================
  function handleCardActionClick(e) {
    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) {
      const header = e.target.closest('.order-accordion-header');
      if (header) toggleAccordion(header);
      return;
    }

    e.stopPropagation();

    const action = actionBtn.getAttribute('data-action');
    const orderId = actionBtn.getAttribute('data-order-id') || actionBtn.getAttribute('data-id');
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (action === 'quick-advance') {
      advanceOrderStatus(orderId);
    } else if (action === 'inspect-payment') {
      openPaymentLightbox(orderId);
    } else if (action === 'open-substitution') {
      const itemId = actionBtn.getAttribute('data-item-id');
      openSubstitutionModal(orderId, itemId);
    } else if (action === 'preview-customer-notif') {
      openCustomerNotifModal(order);
    } else if (action === 'submit-substitutions') {
      submitSubstitutions(orderId);
    } else if (action === 'details') {
      openDetailsModal(order);
    } else if (action === 'reject') {
      openRejectModal(order);
    } else if (action === 'print-pick') {
      openDetailsModal(order);
      setTimeout(() => window.print(), 150);
    }
  }

  function toggleAccordion(header) {
    const card = header.closest('[data-order-id]');
    if (!card) return;
    const orderId = card.getAttribute('data-order-id');
    const body = card.querySelector('.order-accordion-body');
    const chevron = header.querySelector('.chevron-icon');
    if (!body) return;

    const isHidden = body.classList.contains('hidden');
    if (isHidden) {
      body.classList.remove('hidden');
      if (chevron) chevron.classList.add('rotate-180');
      state.expandedOrderIds.add(orderId);
    } else {
      body.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
      state.expandedOrderIds.delete(orderId);
    }
  }

  function advanceOrderStatus(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const norm = normalizeStatus(order.status);
    let nextStatus = '';
    let targetStatusNum = 3;
    let patchReason = "Merchant started preparing order items";
    let toastMessage = '';

    if (norm === 'pending' || norm === 'accepted') {
      nextStatus = 'preparing';
      targetStatusNum = 3;
      patchReason = "Merchant started preparing order items";
      toastMessage = `تم نقل الطلب #${order.id} إلى مرحلة "قيد التجهيز" بنجاح.`;
    } else if (norm === 'preparing') {
      nextStatus = 'ready';
      targetStatusNum = 4;
      patchReason = order.fulfillmentType === 'pickup' ? 'جاهز للاستلام من الفرع' : 'Order ready for delivery';
      const label = order.fulfillmentType === 'pickup' ? 'جاهز للاستلام من الفرع' : 'خرج للتوصيل مع المندوب';
      toastMessage = `أصبح الطلب #${order.id} الآن: ${label}.`;
    } else if (norm === 'ready') {
      nextStatus = 'completed';
      targetStatusNum = 5;
      patchReason = 'Order delivered and completed';
      toastMessage = `تم تسليم الطلب #${order.id} بنجاح واكتماله.`;
    } else if (norm === 'awaiting_approval') {
      nextStatus = 'preparing';
      targetStatusNum = 3;
      patchReason = 'Customer approved amendment, preparing order items';
      toastMessage = `تم اعتماد التعديل للطلب #${order.id} ونقله للتجهيز.`;
    } else {
      return;
    }

    order.status = nextStatus;
    saveOrdersToCache();
    renderAll();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(`تحديث الطلب #${order.id}`, toastMessage, 'success');

    // Dual-Backend sync: Dispatch PATCH /api/Orders/{id}/status to ASP.NET Core
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '';
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';

    const patchPayload = {
      targetStatus: targetStatusNum,
      reason: "Updated by merchant"
    };

    fetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(patchPayload)
    }).then(async res => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`[Orders] PATCH /Orders/${orderId}/status returned HTTP ${res.status}:`, data);
      }
      renderAll();
      if (state.selectedOrder && state.selectedOrder.id === orderId) openDetailsModal(order);
    }).catch(e => {
      console.warn(`[Orders] Backend PATCH /Orders/${orderId}/status note:`, e && e.message ? e.message : e);
    });
  }

  // =========================================================================
  // 13. Substitution Flow Functions (Feature 3.3 Part 2)
  // =========================================================================
  function openSubstitutionModal(orderId, itemId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    const item = (order.items || []).find(it => it.id === itemId);
    if (!item) return;

    state.substitutionState = {
      orderId,
      itemId,
      order,
      item,
      selectedProduct: item.substitutedBy ? {
        id: item.substitutedBy.productId,
        name: item.substitutedBy.name,
        price: item.substitutedBy.unitPrice,
        stock: item.substitutedBy.stock || 20,
        sku: item.substitutedBy.sku || ''
      } : null,
      substituteQty: item.substitutedBy ? item.substitutedBy.quantity : (item.quantity || 1),
      substitutePrice: item.substitutedBy ? item.substitutedBy.unitPrice : 0,
      merchantNote: (item.substitutedBy && item.substitutedBy.merchantNote) || ''
    };

    const modal = document.getElementById('item-substitution-modal');
    if (!modal) return;

    // Fill original item info
    const elOrigName = document.getElementById('sub-orig-name');
    const elOrigSku = document.getElementById('sub-orig-sku');
    const elOrigQty = document.getElementById('sub-orig-qty');
    const elOrigPrice = document.getElementById('sub-orig-price');
    const elOrigTotal = document.getElementById('sub-orig-total');
    const elOrigStockBadge = document.getElementById('sub-orig-stock-badge');

    if (elOrigName) elOrigName.textContent = item.name || '';
    if (elOrigSku) elOrigSku.textContent = item.sku || item.barcode || 'N/A';
    if (elOrigQty) elOrigQty.textContent = item.quantity || 1;
    if (elOrigPrice) elOrigPrice.textContent = `${(item.unitPrice || 0).toFixed(2)} ₪`;
    if (elOrigTotal) {
      const origTotal = (item.unitPrice || 0) * (item.quantity || 1);
      elOrigTotal.textContent = `${origTotal.toFixed(2)} ₪`;
    }

    if (elOrigStockBadge) {
      const isInsufficient = item.stockAllocated === false || item.stockStatus === 'insufficient';
      if (isInsufficient) {
        elOrigStockBadge.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200';
        elOrigStockBadge.textContent = 'تنبيه: عجز مخزون في الرف';
      } else {
        elOrigStockBadge.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200';
        elOrigStockBadge.textContent = 'اقتراح بديل للمنتج';
      }
    }

    // Reset search & render list
    const searchInput = document.getElementById('substitute-search-input');
    if (searchInput) searchInput.value = '';
    renderSubstituteResults('');

    if (state.substitutionState.selectedProduct) {
      renderSelectedSubstituteSection();
    } else {
      const selectedSection = document.getElementById('sub-selected-section');
      if (selectedSection) selectedSection.classList.add('hidden');
      const confirmBtn = document.getElementById('btn-confirm-substitute');
      if (confirmBtn) confirmBtn.disabled = true;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (searchInput) setTimeout(() => searchInput.focus(), 100);
  }

  function closeSubstitutionModal() {
    const modal = document.getElementById('item-substitution-modal');
    if (modal) modal.classList.add('hidden');
    state.substitutionState = {
      orderId: null,
      itemId: null,
      order: null,
      item: null,
      selectedProduct: null,
      substituteQty: 1,
      substitutePrice: 0,
      merchantNote: ''
    };
    if (!state.selectedOrder) {
      document.body.style.overflow = '';
    }
  }

  function renderSubstituteResults(query = '') {
    const container = document.getElementById('substitute-results-container');
    if (!container) return;

    const origItem = state.substitutionState ? state.substitutionState.item : null;
    const cleanQuery = (query || '').trim().toLowerCase();

    let list = state.catalogProducts.filter(p => {
      if (origItem && (p.sku === origItem.sku || p.barcode === origItem.barcode)) {
        return false;
      }
      if (!cleanQuery) return true;
      return (
        (p.name && p.name.toLowerCase().includes(cleanQuery)) ||
        (p.sku && p.sku.toLowerCase().includes(cleanQuery)) ||
        (p.category && p.category.toLowerCase().includes(cleanQuery))
      );
    });

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs">
          <div class="font-bold text-slate-700">لم يتم العثور على بدائل مطابقة</div>
          <p class="text-[11px] text-slate-400 mt-0.5">جرّب البحث باسم الصنف أو الفئة لاختيار بديل متوفر في المتجر</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(prod => {
      const isSelected = state.substitutionState && state.substitutionState.selectedProduct && state.substitutionState.selectedProduct.id === prod.id;
      return `
        <div class="substitute-result-item flex items-center justify-between p-3 hover:bg-slate-50 transition cursor-pointer ${isSelected ? 'bg-emerald-50/80 border-r-4 border-r-[#1c5335]' : ''}" data-product-id="${escapeHtml(prod.id)}">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1c5335] font-bold shrink-0 text-xs">
              <svg class="w-5 h-5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <div>
              <div class="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span>${escapeHtml(prod.name)}</span>
                ${isSelected ? '<span class="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">تم الاختيار ✓</span>' : ''}
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                <span>${escapeHtml(prod.sku || '')}</span> • <span class="font-sans text-slate-500">${escapeHtml(prod.category || '')}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="text-left">
              <div class="font-black text-[#1c5335] text-xs tabular-nums">${(prod.price || 0).toFixed(2)} ₪</div>
              <span class="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                متوفر: ${prod.stock || 0}
              </span>
            </div>

            <button type="button" class="btn-select-substitute px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              isSelected ? 'bg-[#1c5335] text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }">
              ${isSelected ? 'المحدد حالياً' : 'اختيار البديل'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectSubstituteProduct(product) {
    if (!state.substitutionState) return;
    state.substitutionState.selectedProduct = product;
    state.substitutionState.substitutePrice = product.price || 0;

    if (!state.substitutionState.merchantNote) {
      const origName = state.substitutionState.item ? state.substitutionState.item.name : 'الصنف الأصلي';
      state.substitutionState.merchantNote = `نفد ${origName}، نقترح الصنف البديل الممتاز (${product.name}) بنفس الجودة وبسعر ₪${product.price.toFixed(2)}.`;
    }
    const noteEl = document.getElementById('sub-merchant-note');
    if (noteEl) noteEl.value = state.substitutionState.merchantNote;

    renderSelectedSubstituteSection();
    renderSubstituteResults(document.getElementById('substitute-search-input')?.value || '');
  }

  function renderSelectedSubstituteSection() {
    const selectedSection = document.getElementById('sub-selected-section');
    if (!selectedSection || !state.substitutionState || !state.substitutionState.selectedProduct) return;

    const origItem = state.substitutionState.item;
    const subProd = state.substitutionState.selectedProduct;
    const qty = state.substitutionState.substituteQty || 1;
    const unitPrice = Number(state.substitutionState.substitutePrice || subProd.price || 0);

    selectedSection.classList.remove('hidden');

    const elName = document.getElementById('sub-selected-name');
    const elSku = document.getElementById('sub-selected-sku');
    const elStock = document.getElementById('sub-selected-stock');
    const elQtyInput = document.getElementById('sub-qty-input');
    const elPriceInput = document.getElementById('sub-price-input');
    const elUnitPrice = document.getElementById('sub-selected-unit-price');
    const elTotalPrice = document.getElementById('sub-selected-total-price');
    const elDiffBadge = document.getElementById('sub-price-diff-badge');
    const elNewTotal = document.getElementById('sub-new-order-total');
    const confirmBtn = document.getElementById('btn-confirm-substitute');

    if (elName) elName.textContent = subProd.name;
    if (elSku) elSku.textContent = subProd.sku || '';
    if (elStock) elStock.textContent = `${subProd.stock || 0} قطعة متوفرة في المخزون`;
    if (elQtyInput) elQtyInput.value = qty;
    if (elPriceInput && document.activeElement !== elPriceInput) {
      elPriceInput.value = unitPrice.toFixed(2);
    }

    const subTotal = unitPrice * qty;
    const origTotal = ((origItem ? origItem.unitPrice : 0) || 0) * ((origItem ? origItem.quantity : 1) || 1);
    const diff = subTotal - origTotal;

    const order = state.substitutionState.order;
    const baseTotal = order ? (order.originalTotal !== undefined ? order.originalTotal : (order.total || 0)) : 0;
    const newOrderTotal = Math.max(0, baseTotal + diff);

    if (elUnitPrice) elUnitPrice.textContent = `${unitPrice.toFixed(2)} ₪`;
    if (elTotalPrice) elTotalPrice.textContent = `${subTotal.toFixed(2)} ₪`;

    if (elDiffBadge) {
      if (diff > 0) {
        elDiffBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 tabular-nums';
        elDiffBadge.textContent = `+${diff.toFixed(2)} ₪ (زيادة)`;
      } else if (diff < 0) {
        elDiffBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 tabular-nums';
        elDiffBadge.textContent = `-${Math.abs(diff).toFixed(2)} ₪ (تخفيض للزبون)`;
      } else {
        elDiffBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200 tabular-nums';
        elDiffBadge.textContent = `0.00 ₪ (نفس السعر)`;
      }
    }

    if (elNewTotal) {
      elNewTotal.textContent = `${newOrderTotal.toFixed(2)} ₪`;
    }

    if (confirmBtn) confirmBtn.disabled = false;
  }

  function changeSubstituteQty(delta) {
    if (!state.substitutionState || !state.substitutionState.selectedProduct) return;
    const cur = state.substitutionState.substituteQty || 1;
    const next = Math.max(1, Math.min(99, cur + delta));
    state.substitutionState.substituteQty = next;
    renderSelectedSubstituteSection();
  }

  function setSubstituteQty(qty) {
    if (!state.substitutionState || !state.substitutionState.selectedProduct) return;
    const val = isNaN(qty) ? 1 : Math.max(1, Math.min(99, parseInt(qty, 10)));
    state.substitutionState.substituteQty = val;
    renderSelectedSubstituteSection();
  }

  function setSubstitutePrice(price) {
    if (!state.substitutionState || !state.substitutionState.selectedProduct) return;
    const val = isNaN(parseFloat(price)) ? 0 : Math.max(0, parseFloat(price));
    state.substitutionState.substitutePrice = val;
    renderSelectedSubstituteSection();
  }

  function confirmSubstitution() {
    if (!state.substitutionState || !state.substitutionState.selectedProduct) {
      showAppToast('تنبيه', 'يرجى اختيار صنف بديل من نتائج البحث أولاً', 'warning');
      return;
    }

    const { order, item, selectedProduct, substituteQty, substitutePrice } = state.substitutionState;
    if (!order || !item) return;

    const unitPrice = Number(substitutePrice || selectedProduct.price || 0);
    const qty = Number(substituteQty || 1);
    const merchantNote = (document.getElementById('sub-merchant-note')?.value || state.substitutionState.merchantNote || '').trim();

    const subTotal = unitPrice * qty;
    const origTotal = (item.unitPrice || 0) * (item.quantity || 1);
    const priceDiff = subTotal - origTotal;

    // Apply substitution to item
    item.substitutedBy = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku || '',
      category: selectedProduct.category || '',
      unitPrice: unitPrice,
      quantity: qty,
      totalPrice: subTotal,
      stock: selectedProduct.stock,
      priceDiff: priceDiff,
      merchantNote: merchantNote
    };

    if (order.originalTotal === undefined) {
      order.originalTotal = order.total;
    }

    // Recalculate order substitutions
    recalculateOrder(order);

    // Update order status to awaiting_approval
    order.status = 'awaiting_approval';
    saveOrdersToCache();

    closeSubstitutionModal();

    showAppToast(
      'تم إعداد اقتراح البديل',
      `تم ربط "${selectedProduct.name}" كبديل لـ "${item.name}". حالة الطلب الآن: بانتظار موافقة العميل.`,
      'success'
    );

    renderAll();

    // Dual-Backend sync: Propose Substitution via POST /api/Orders/{id}/amendments
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '';
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';

    const origId = item.productId || item.id;
    const subId = selectedProduct.id;
    const noteText = merchantNote || "Merchant proposed in-store alternative";

    const amendmentPayload = {
      reason: noteText,
      revisedItems: [
        {
          originalProductId: origId,
          substituteProductId: subId,
          newQuantity: qty,
          newUnitPrice: unitPrice
        }
      ]
    };

    fetch(`${baseUrl}/Orders/${encodeURIComponent(order.id)}/amendments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(amendmentPayload)
    }).then(async res => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`[Orders] POST /Orders/${order.id}/amendments returned HTTP ${res.status}:`, data);
      }
    }).catch(e => {
      console.warn('[Orders] Backend proposeSubstitution note:', e && e.message ? e.message : e);
    });

    // Show simulated Customer Notification preview modal
    openCustomerNotifModal(order, item, selectedProduct, qty, unitPrice, priceDiff);
  }

  function recalculateOrder(order) {
    if (!order || !order.items) return;
    let totalDiff = 0;
    const subs = [];

    order.items.forEach(it => {
      if (it.substitutedBy) {
        subs.push({
          originalItemId: it.id,
          originalProductId: it.productId || it.id,
          originalItemName: it.name,
          originalQuantity: it.quantity,
          originalUnitPrice: it.unitPrice,
          substituteProductId: it.substitutedBy.productId,
          substituteProductName: it.substitutedBy.name,
          substituteQuantity: it.substitutedBy.quantity,
          substituteUnitPrice: it.substitutedBy.unitPrice,
          substituteTotalPrice: it.substitutedBy.totalPrice,
          priceDifference: it.substitutedBy.priceDiff
        });
        totalDiff += it.substitutedBy.priceDiff;
      }
    });

    order.substitutions = subs;
    order.hasSubstitutions = subs.length > 0;
    order.priceDifference = totalDiff;
    const baseTotal = order.originalTotal !== undefined ? order.originalTotal : (order.total || 0);
    order.revisedTotal = Math.max(0, baseTotal + totalDiff);
  }

  function submitSubstitutions(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = 'awaiting_approval';
    saveOrdersToCache();
    renderAll();

    openCustomerNotifModal(order);
    showAppToast(
      `إرسال التعديل للزبون #${order.id}`,
      `تم إرسال الأصناف المقترحة والإجمالي المعدل (${order.revisedTotal.toFixed(2)} ₪) للزبون بنجاح.`,
      'success'
    );

    // Dual-Backend sync: Propose Substitution via POST /api/Orders/{id}/amendments
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';

    const revisedItems = (order.substitutions || []).map(s => ({
      originalProductId: s.originalProductId || s.originalItemId,
      substituteProductId: s.substituteProductId,
      newQuantity: s.substituteQuantity,
      newUnitPrice: s.substituteUnitPrice
    }));

    const amendmentPayload = {
      reason: "Merchant proposed in-store alternative",
      revisedItems: revisedItems
    };

    if (typeof ApiClient !== 'undefined' && ApiClient.orders && ApiClient.orders.proposeSubstitution) {
      ApiClient.orders.proposeSubstitution(orderId, amendmentPayload.reason, amendmentPayload.revisedItems).catch(e => {
        console.warn('[Orders] Backend proposeSubstitution note:', e && e.message ? e.message : e);
      });
    } else {
      fetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}/amendments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(amendmentPayload)
      }).catch(e => {
        console.warn('[Orders] Backend proposeSubstitution note:', e && e.message ? e.message : e);
      });
    }
  }

  // =========================================================================
  // 14. Customer Notification Preview Modal (WhatsApp / SMS Simulation)
  // =========================================================================
  function openCustomerNotifModal(order, origItem = null, subProd = null, qty = 1, unitPrice = 0, priceDiff = 0) {
    const modal = document.getElementById('customer-notification-modal');
    if (!modal) return;

    modal.setAttribute('data-target-order-id', order.id);

    const elOrderNum = document.getElementById('notif-order-id');
    const elSubName = document.getElementById('notif-substitute-name');
    const elSubQty = document.getElementById('notif-substitute-qty');
    const elSubPrice = document.getElementById('notif-substitute-price');
    const elDiffText = document.getElementById('notif-diff-text');
    const elNewTotal = document.getElementById('notif-new-total');

    if (elOrderNum) elOrderNum.textContent = `#${order.id}`;

    // Pick first substituted item if not passed
    let sItem = null;
    let sSub = null;
    if (origItem && subProd) {
      sItem = origItem;
      sSub = {
        name: subProd.name,
        quantity: qty,
        unitPrice: unitPrice,
        priceDiff: priceDiff
      };
    } else {
      const found = (order.items || []).find(it => it.substitutedBy);
      if (found) {
        sItem = found;
        sSub = found.substitutedBy;
      }
    }

    if (sSub) {
      if (elSubName) elSubName.textContent = sSub.name;
      if (elSubQty) elSubQty.textContent = sSub.quantity;
      if (elSubPrice) elSubPrice.textContent = `${sSub.unitPrice.toFixed(2)} ₪`;
      if (elDiffText) {
        const d = sSub.priceDiff || 0;
        elDiffText.textContent = `فارق السعر: ${d > 0 ? '+' : ''}${d.toFixed(2)} ₪`;
      }
    }

    const revTotal = order.revisedTotal !== undefined ? order.revisedTotal : order.total;
    if (elNewTotal) elNewTotal.textContent = `${revTotal.toFixed(2)} ₪`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeCustomerNotifModal() {
    const modal = document.getElementById('customer-notification-modal');
    if (modal) modal.classList.add('hidden');
    if (!state.selectedOrder) document.body.style.overflow = '';
  }

  function simulateCustomerApproval() {
    const modal = document.getElementById('customer-notification-modal');
    const orderId = modal ? modal.getAttribute('data-target-order-id') : null;
    if (!orderId) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    // Simulate customer approves substitution: moves order to 'preparing'
    order.status = 'preparing';
    saveOrdersToCache();
    renderAll();
    closeCustomerNotifModal();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(
      'موافقة العميل الفورية! ✓',
      `وافق العميل (${order.customerName}) على البديل المقترح. تم نقل الطلب #${order.id} إلى "قيد التجهيز" فوراً.`,
      'success'
    );

    // Dual-Backend sync: Respond to Amendment via POST /api/Orders/{id}/amendments/{aid}/respond
    if (typeof ApiClient !== 'undefined' && ApiClient.orders && ApiClient.orders.respondAmendment) {
      ApiClient.orders.respondAmendment(orderId, order.amendmentId || 'latest', true).catch(e => {
        console.warn('[Orders] Backend respondAmendment note:', e && e.message ? e.message : e);
      });
    }
  }

  // =========================================================================
  // 15. Feature 3.4: Payment Slip Verification & Lightbox
  // =========================================================================
  function openPaymentLightbox(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    state.lightbox.orderId = orderId;
    state.lightbox.order = order;
    state.lightbox.zoom = 1;
    state.lightbox.rotation = 0;
    applyLightboxTransform();

    const modal = document.getElementById('receipt-lightbox-modal');
    if (!modal) return;

    const slip = order.paymentSlip || {
      senderName: order.customerName,
      bankName: 'مصرف الراجحي',
      referenceNumber: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
      amountSent: order.total,
      requiredAmount: order.total,
      uploadTime: 'منذ دقائق',
      verified: order.paymentStatus === 'paid'
    };

    // Header info
    setText('lb-order-id-badge', `#${order.id}`);
    setText('lb-order-num', order.id);
    setText('lb-customer-name', order.customerName);
    setText('lb-customer-phone', order.customerPhone || '—');
    setText('lb-bank-name', slip.bankName || '—');
    setText('lb-ref-num', slip.referenceNumber || '—');
    setText('lb-sent-amount', `${Number(slip.amountSent || order.total).toFixed(2)} ₪`);
    setText('lb-expected-amount', `${Number(order.total).toFixed(2)} ₪`);
    setText('lb-upload-time', slip.uploadTime || 'الآن');

    // Voucher simulation details
    setText('lb-sim-bank-title', `${slip.bankName || 'البنك'} - إشعار تحويل`);
    setText('lb-sim-amount', `${Number(slip.amountSent || order.total).toFixed(2)} ₪`);
    setText('lb-sim-sender', slip.senderName || order.customerName);
    setText('lb-sim-ref', slip.referenceNumber || 'TXN-98421094');
    setText('lb-sim-date', slip.uploadTime || 'الآن');

    // Amount match calculation
    const diff = Math.abs(Number(slip.amountSent || order.total) - Number(order.total));
    const matchContainer = document.getElementById('lb-match-status-badge');
    if (matchContainer) {
      if (diff < 0.05) {
        matchContainer.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>المبلغ مطابق تماماً (100%)</span>
          </span>
        `;
      } else {
        matchContainer.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span>تنبيه: فارق مبلغ (${diff.toFixed(2)} ₪)</span>
          </span>
        `;
      }
    }

    // Current payment status badge
    const curBadge = document.getElementById('lb-current-status-badge');
    if (curBadge) {
      curBadge.innerHTML = getPaymentStatusBadgeHTML(order);
    }

    // Set buttons data attribute
    const btnApprove = document.getElementById('btn-lb-approve');
    const btnReject = document.getElementById('btn-lb-reject');
    const btnCash = document.getElementById('btn-lb-cash-opt');
    if (btnApprove) btnApprove.setAttribute('data-order-id', order.id);
    if (btnReject) btnReject.setAttribute('data-order-id', order.id);
    if (btnCash) btnCash.setAttribute('data-order-id', order.id);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePaymentLightbox() {
    const modal = document.getElementById('receipt-lightbox-modal');
    if (modal) modal.classList.add('hidden');
    if (!state.selectedOrder) document.body.style.overflow = '';
  }

  function setupLightboxZoomControls() {
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-zoom-reset');
    const btnRotL = document.getElementById('btn-rotate-left');
    const btnRotR = document.getElementById('btn-rotate-right');

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        state.lightbox.zoom = Math.min(3, state.lightbox.zoom + 0.25);
        applyLightboxTransform();
      });
    }
    if (btnOut) {
      btnOut.addEventListener('click', () => {
        state.lightbox.zoom = Math.max(0.6, state.lightbox.zoom - 0.25);
        applyLightboxTransform();
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.lightbox.zoom = 1;
        state.lightbox.rotation = 0;
        applyLightboxTransform();
      });
    }
    if (btnRotL) {
      btnRotL.addEventListener('click', () => {
        state.lightbox.rotation = (state.lightbox.rotation - 90) % 360;
        applyLightboxTransform();
      });
    }
    if (btnRotR) {
      btnRotR.addEventListener('click', () => {
        state.lightbox.rotation = (state.lightbox.rotation + 90) % 360;
        applyLightboxTransform();
      });
    }
  }

  function applyLightboxTransform() {
    const card = document.getElementById('receipt-sim-card');
    const img = document.getElementById('receipt-img-canvas');
    const target = (img && !img.classList.contains('hidden')) ? img : card;

    if (target) {
      target.style.transform = `scale(${state.lightbox.zoom}) rotate(${state.lightbox.rotation}deg)`;
      target.style.transition = 'transform 0.15s ease-out';
    }

    const zoomLabel = document.getElementById('lb-zoom-level');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(state.lightbox.zoom * 100)}%`;
    }
  }

  function approvePayment(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    order.paymentStatus = 'paid';
    if (order.paymentSlip) {
      order.paymentSlip.verified = true;
      order.paymentSlip.rejectionReason = null;
    }

    saveOrdersToCache();
    renderAll();
    closePaymentLightbox();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(
      'تم اعتماد إشعار الدفع',
      `تم اعتماد إيصال السداد للطلب #${order.id} بنجاح، وتحديث حالة الدفع إلى "مدفوع".`,
      'success'
    );

    // Dual-Backend sync: Verify Receipt via POST /api/orders/{orderId}/receipts/{receiptId}/verify
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '';
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';

    const receiptId = order.paymentSlip?.receiptId || order.receiptId || 'latest';
    const totalAmount = Number(order.paymentSlip?.amountSent || order.total || 0);

    const approvePayload = {
      decision: 2,
      verifiedAmount: totalAmount,
      reviewerNotes: "Approved"
    };

    fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/receipts/${encodeURIComponent(receiptId)}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(approvePayload)
    }).then(async res => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`[Orders] POST verify receipt approve returned HTTP ${res.status}:`, data);
      }
    }).catch(e => {
      console.warn('[Orders] Backend receipt approve note:', e && e.message ? e.message : e);
    });
  }

  function openReceiptRejectionModal(orderId) {
    const modal = document.getElementById('receipt-rejection-modal');
    const targetInput = document.getElementById('receipt-reject-target-order-id');
    const notesInput = document.getElementById('receipt-reject-notes');

    if (targetInput) targetInput.value = orderId;
    if (notesInput) notesInput.value = '';

    const firstRadio = document.querySelector('input[name="receipt_reject_reason"]');
    if (firstRadio) firstRadio.checked = true;

    if (modal) modal.classList.remove('hidden');
  }

  function closeReceiptRejectionModal() {
    const modal = document.getElementById('receipt-rejection-modal');
    if (modal) modal.classList.add('hidden');
  }

  function handleReceiptRejectSubmit(e) {
    e.preventDefault();
    const targetInput = document.getElementById('receipt-reject-target-order-id');
    const notesInput = document.getElementById('receipt-reject-notes');
    const checkedReason = document.querySelector('input[name="receipt_reject_reason"]:checked');

    const orderId = targetInput ? targetInput.value : null;
    if (!orderId) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const rejectionReasonText = checkedReason ? checkedReason.value : 'unclear';
    const notes = notesInput ? notesInput.value.trim() : '';
    const reasonText = notes ? `${rejectionReasonText} - ${notes}` : (rejectionReasonText || 'Receipt verification rejected');

    order.paymentStatus = 'rejected';
    if (order.paymentSlip) {
      order.paymentSlip.verified = false;
      order.paymentSlip.rejectionReason = rejectionReasonText;
      order.paymentSlip.rejectionNotes = notes;
    }

    saveOrdersToCache();
    renderAll();
    closeReceiptRejectionModal();
    closePaymentLightbox();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(
      'تم رفض إشعار الدفع',
      `تم رفض إيصال الطلب #${order.id} وإرسال تنبيه للعميل لإعادة رفع إشعار صحيح.`,
      'warning'
    );

    // Dual-Backend sync: Verify Receipt (Reject) via POST /api/orders/{orderId}/receipts/{receiptId}/verify
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '';
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';

    const receiptId = order.paymentSlip?.receiptId || order.receiptId || 'latest';

    const rejectPayload = {
      decision: 3,
      rejectionReason: reasonText
    };

    fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/receipts/${encodeURIComponent(receiptId)}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(rejectPayload)
    }).then(async res => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`[Orders] POST verify receipt reject returned HTTP ${res.status}:`, data);
      }
    }).catch(e => {
      console.warn('[Orders] Backend receipt reject note:', e && e.message ? e.message : e);
    });
  }

  function openCashModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('cash-log-modal');
    const targetIdInput = document.getElementById('cash-log-order-id');
    const expectedAmount = document.getElementById('cash-expected-amount');
    const collectedInput = document.getElementById('cash-collected-amount');
    const custInfo = document.getElementById('cash-customer-info');
    const orderRef = document.getElementById('cash-modal-order-ref');

    if (targetIdInput) targetIdInput.value = orderId;
    if (orderRef) orderRef.textContent = `طلب رقم #${order.id}`;
    if (expectedAmount) expectedAmount.textContent = `${order.total.toFixed(2)} ₪`;
    if (collectedInput) collectedInput.value = order.total.toFixed(2);
    if (custInfo) custInfo.textContent = `العميل: ${order.customerName} (${order.customerPhone || ''})`;

    if (modal) modal.classList.remove('hidden');
  }

  function closeCashModal() {
    const modal = document.getElementById('cash-log-modal');
    if (modal) modal.classList.add('hidden');
  }

  function handleCashFormSubmit(e) {
    e.preventDefault();
    const targetIdInput = document.getElementById('cash-log-order-id');
    const orderId = targetIdInput ? targetIdInput.value : null;
    if (!orderId) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    order.paymentMethod = 'دفع نقدي عند الاستلام';
    order.paymentStatus = 'cash_on_delivery';
    if (order.paymentSlip) {
      order.paymentSlip.verified = true;
    }

    saveOrdersToCache();
    renderAll();
    closeCashModal();
    closePaymentLightbox();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(
      'تحويل الدفع إلى نقدي',
      `تم تسجيل طريقة السداد للطلب #${order.id} كـ "دفع نقدي عند الاستلام".`,
      'info'
    );
  }

  // =========================================================================
  // 16. Order Details & Rejection Modals
  // =========================================================================
  function openDetailsModal(order) {
    state.selectedOrder = order;
    const modal = document.getElementById('order-details-modal');
    if (!modal) return;

    // Header info
    setText('modal-order-id', `#${order.id}`);
    setText('modal-order-time', formatRelativeTime(order.createdAt));
    const elFulfillmentBadge = document.getElementById('modal-order-fulfillment-badge');
    if (elFulfillmentBadge) {
      elFulfillmentBadge.textContent = order.fulfillmentType === 'delivery' ? 'توصيل منزلي' : 'استلام من الفرع';
    }

    // Customer & destination
    setText('modal-customer-name', order.customerName || 'عميل');
    setText('modal-customer-phone', order.customerPhone || '');
    setText('modal-fulfillment-destination', order.fulfillmentAddress || '');
    setText('modal-fulfillment-timing', order.fulfillmentTiming || '');

    // Stepper in details modal
    const timelineContainer = document.getElementById('order-timeline-steps');
    if (timelineContainer) {
      timelineContainer.innerHTML = renderOrderStepperHTML(order.status);
    }

    // Items table
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
              <div class="w-10 h-10 rounded-xl bg-[#EAF1ED] border border-[#436850]/20 flex items-center justify-center font-bold text-[#1c5335] shrink-0 text-sm">
                <svg class="w-5 h-5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <div>
                <div class="font-bold text-slate-900 text-xs">${escapeHtml(item.name)}</div>
                <div class="text-[11px] text-slate-400 font-mono" dir="ltr">باركود: ${escapeHtml(item.barcode || item.sku || 'N/A')}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4">
            <div class="inline-flex items-center gap-1 text-[11px] font-bold bg-[#FBFADA]/80 px-2 py-1 rounded-lg border border-[#D4A373]/30 whitespace-nowrap">
              <span class="text-slate-600">المنطقة <strong class="text-[#1c5335]">${escapeHtml(item.zone || 'أ')}</strong></span>
              <span class="text-slate-300">•</span>
              <span class="text-slate-600">ممر <strong class="text-[#1c5335]">${escapeHtml(item.aisle || '01')}</strong></span>
              <span class="text-slate-300">•</span>
              <span class="text-slate-600">رف <strong class="text-[#1c5335]">${escapeHtml(item.shelf || '1')}</strong></span>
            </div>
          </td>
          <td class="py-3 px-3 text-center">
            ${renderStockAllocationBadge(item)}
          </td>
          <td class="py-3 px-3 text-center font-black text-slate-900 tabular-nums">
            ${item.quantity}
          </td>
          <td class="py-3 px-3 text-center font-medium text-slate-600 tabular-nums">
            ${(item.unitPrice || 0).toFixed(2)} ₪
          </td>
          <td class="py-3 px-4 text-left font-black text-[#1c5335] tabular-nums">
            ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)} ₪
          </td>
          <td class="py-3 px-3 text-center">
            ${renderItemSubstitutionCell(order, item)}
          </td>
        </tr>
      `).join('');
    }

    // Substitution Banner
    const modalSubBanner = document.getElementById('modal-substitution-banner');
    if (modalSubBanner) {
      if (order.hasSubstitutions && order.substitutions && order.substitutions.length > 0) {
        modalSubBanner.innerHTML = renderSubstitutionBannerHTML(order);
        modalSubBanner.classList.remove('hidden');
      } else {
        modalSubBanner.innerHTML = '';
        modalSubBanner.classList.add('hidden');
      }
    }

    // Financial breakdown
    const displayTotal = (order.hasSubstitutions && order.revisedTotal !== undefined) ? order.revisedTotal : (order.total || 0);
    setText('modal-subtotal', `${(order.subtotal || 0).toFixed(2)} ₪`);
    setText('modal-vat', `${(order.vat || 0).toFixed(2)} ₪`);
    setText('modal-delivery-fee', `${(order.deliveryFee || 0).toFixed(2)} ₪`);
    const elTotal = document.getElementById('modal-total-amount');
    if (elTotal) {
      elTotal.innerHTML = (order.hasSubstitutions && order.revisedTotal !== undefined)
        ? `<span class="text-base font-black text-[#1c5335]">${displayTotal.toFixed(2)} ₪</span> <span class="text-xs text-amber-700 font-bold">(معدل: ₪${displayTotal.toFixed(2)})</span>`
        : `${displayTotal.toFixed(2)} ₪`;
    }

    setText('modal-payment-method', order.paymentMethod || 'مدفوع إلكترونياً');
    setText('modal-customer-notes', order.customerNotes || 'لا توجد ملاحظات إضافية من العميل.');

    // Payment slip button in details modal
    const btnInspectSlip = document.getElementById('btn-modal-inspect-slip');
    const pBadge = document.getElementById('modal-payment-status-badge');
    const hasSlip = (order.paymentMethod && (order.paymentMethod.includes('تحويل') || order.paymentMethod.includes('محفظة'))) || order.paymentSlip;

    if (btnInspectSlip) {
      btnInspectSlip.classList.toggle('hidden', !hasSlip);
    }
    if (pBadge) {
      pBadge.innerHTML = getPaymentStatusBadgeHTML(order);
    }

    // Actions footer
    const primaryBtn = document.getElementById('btn-modal-primary-action');
    const primaryText = document.getElementById('btn-modal-primary-text');
    const rejectBtn = document.getElementById('btn-modal-reject');
    const norm = normalizeStatus(order.status);

    if (primaryBtn && primaryText) {
      if (norm === 'pending') {
        primaryText.textContent = 'بدء التجهيز';
        primaryBtn.classList.remove('hidden');
      } else if (norm === 'preparing') {
        primaryText.textContent = order.fulfillmentType === 'pickup' ? 'جاهز للاستلام من الفرع' : 'خرج للتوصيل للزبون';
        primaryBtn.classList.remove('hidden');
      } else if (norm === 'ready') {
        primaryText.textContent = 'تأكيد التسليم بنجاح ✓';
        primaryBtn.classList.remove('hidden');
      } else if (norm === 'awaiting_approval') {
        primaryText.textContent = 'اعتماد العميل ومتابعة التجهيز';
        primaryBtn.classList.remove('hidden');
      } else {
        primaryBtn.classList.add('hidden');
      }
    }

    if (rejectBtn) {
      if (norm !== 'completed' && norm !== 'cancelled') {
        rejectBtn.classList.remove('hidden');
      } else {
        rejectBtn.classList.add('hidden');
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

  function openRejectModal(order) {
    state.selectedOrder = order;
    const modal = document.getElementById('order-reject-modal');
    const title = document.getElementById('reject-modal-title');
    const targetInput = document.getElementById('reject-target-order-id');
    const notesInput = document.getElementById('reject-notes');

    if (title) title.textContent = `إلغاء الطلب رقم #${order.id}`;
    if (targetInput) targetInput.value = order.id;
    if (notesInput) notesInput.value = '';

    const firstRadio = document.querySelector('input[name="reject_reason"]');
    if (firstRadio) firstRadio.checked = true;

    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeRejectModal() {
    const modal = document.getElementById('order-reject-modal');
    if (modal) modal.classList.add('hidden');
    if (!state.selectedOrder) document.body.style.overflow = '';
  }

  function handleRejectFormSubmit(e) {
    e.preventDefault();
    const targetInput = document.getElementById('reject-target-order-id');
    const notesInput = document.getElementById('reject-notes');
    const checkedReason = document.querySelector('input[name="reject_reason"]:checked');

    const orderId = targetInput ? targetInput.value : null;
    if (!orderId) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = 'cancelled';
    order.rejectionReason = checkedReason ? checkedReason.value : 'other';
    order.rejectionNotes = notesInput ? notesInput.value.trim() : '';

    saveOrdersToCache();
    renderAll();
    closeRejectModal();

    if (state.selectedOrder && state.selectedOrder.id === orderId) {
      openDetailsModal(order);
    }

    showAppToast(`إلغاء الطلب #${order.id}`, 'تم إلغاء الطلب وإشعار الزبون بسبب الإلغاء.', 'warning');

    // Dual-Backend sync: Cancel Order via POST /api/Orders/{id}/cancel
    const token = localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '';
    const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';
    const selectedReason = [order.rejectionReason, order.rejectionNotes].filter(Boolean).join(' - ') || 'Cancelled by merchant';

    fetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason: selectedReason })
    }).then(async res => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`[Orders] POST /Orders/${orderId}/cancel returned HTTP ${res.status}:`, data);
      }
      order.status = 'cancelled';
      renderAll();
    }).catch(e => {
      console.warn('[Orders] Backend cancel order note:', e && e.message ? e.message : e);
    });
  }

  // =========================================================================
  // 17. Simulate Incoming Order
  // =========================================================================
  function simulateIncomingOrder() {
    const sampleNames = ['عبد الله بن سلطان المري', 'نوف بنت راشد العتيبي', 'تركي محمد الدوسري', 'ريم بنت خالد الشهري'];
    const sampleAddresses = [
      'الرياض - حي حطين - شارع الأمير تركي الأول',
      'الرياض - حي الصحافة - شارع العليا',
      'استلام ذاتي من فرع المتجر الرئيسي'
    ];

    const pickName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const pickAddr = sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)];
    const newNumber = Math.floor(2050 + Math.random() * 500).toString();
    const newId = `ORD-${newNumber}`;

    const newOrder = {
      id: newId,
      orderNumber: newNumber,
      customerName: pickName,
      customerPhone: '+966 5' + Math.floor(10000000 + Math.random() * 90000000),
      createdAt: new Date().toISOString(),
      status: 'pending',
      fulfillmentType: pickAddr.includes('استلام') ? 'pickup' : 'delivery',
      fulfillmentAddress: pickAddr,
      fulfillmentTiming: 'طلب فوري جديد',
      paymentMethod: 'مدى (مدفوع إلكترونياً)',
      paymentStatus: 'paid',
      customerNotes: 'الطلب عاجل من فضلكم.',
      subtotal: 58.00,
      vat: 8.70,
      deliveryFee: pickAddr.includes('استلام') ? 0 : 15.00,
      total: pickAddr.includes('استلام') ? 66.70 : 81.70,
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
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 13.50,
          totalPrice: 27.00
        },
        {
          id: 'item-sim2-' + Date.now(),
          name: 'معمول بالتمر الفاخر حلواني إخوان 300 جم',
          sku: 'SKU-MAM-020',
          barcode: '628100887766',
          category: 'حلويات',
          shelfLocation: 'المنطقة ج › ممر 03 › رف 2',
          zone: 'ج',
          aisle: '03',
          shelf: '2',
          stockAllocated: true,
          stockStatus: 'reserved',
          quantity: 2,
          unitPrice: 15.50,
          totalPrice: 31.00
        }
      ]
    };

    state.orders.unshift(newOrder);
    saveOrdersToCache();
    renderAll();
    playAlertTone();

    showAppToast(
      `طلب شراء جديد! #${newOrder.id}`,
      `ورد طلب جديد من ${newOrder.customerName} بقيمة ${newOrder.total.toFixed(2)} ₪`,
      'info'
    );
  }

  function playAlertTone() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // =========================================================================
  // 18. Utilities & Toast Notifications
  // =========================================================================
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

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showAppToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `app-toast pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 text-right max-w-sm w-full transition-all ${
      type === 'success' ? 'bg-[#1c5335] text-white border-emerald-400/30' :
      type === 'warning' ? 'bg-amber-600 text-white border-amber-300/30' :
      type === 'error' ? 'bg-rose-700 text-white border-rose-400/30' :
      'bg-slate-900 text-white border-slate-700'
    }`;

    toast.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
        ${type === 'success' ? '<svg class="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' :
          type === 'warning' ? '<svg class="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' :
          '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-black">${escapeHtml(title)}</div>
        <div class="text-[11px] text-white/80 mt-0.5 leading-snug">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="text-white/60 hover:text-white cursor-pointer -mr-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    toast.querySelector('button').addEventListener('click', () => removeToast(toast));
    container.appendChild(toast);

    setTimeout(() => removeToast(toast), 4500);
  }

  function removeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 280);
  }

  let isOrdersInitialized = false;

  function safeInit() {
    if (isOrdersInitialized) return;
    isOrdersInitialized = true;
    try {
      init();
    } catch (err) {
      console.error('[Orders] Critical initialization error caught:', err);
    }
  }

  // Run on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    try {
      safeInit();
    } catch (err) {
      console.error('[Orders] DOMContentLoaded initialization error:', err);
    }
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try {
      safeInit();
    } catch (err) {
      console.error('[Orders] ReadyState initialization error:', err);
    }
  }

})();
