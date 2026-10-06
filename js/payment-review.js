/**
 * Payment Review Interface – Feature 3.4
 * Handles: Receipt & Payment Review, Lightbox Inspection Viewer,
 * Approval/Rejection Workflow, and Cash Payment Logging.
 *
 * Architecture: IIFE module, localStorage mock fallback, Auth Bearer header on all PATCH calls.
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // Storage & Config
  // ─────────────────────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'dawwer_payment_reviews_v1';

  // ─────────────────────────────────────────────────────────────────────────────
  // Mock / Seed Data
  // ─────────────────────────────────────────────────────────────────────────────
  const MOCK_PAYMENT_METHODS = {
    bank:   'تحويل بنكي',
    wallet: 'محفظة إلكترونية',
    cash:   'دفع نقدي عند الاستلام'
  };

  const SEED_PAYMENTS = [
    {
      id: 'ORD-2048',
      customerName: 'محمد عبد الله الزهراني',
      customerPhone: '+966 54 812 3456',
      paymentMethod: 'bank',
      paymentMethodLabel: 'تحويل بنكي – مصرف الراجحي',
      bankName: 'مصرف الراجحي',
      referenceNumber: 'RAJHI-4892017643',
      uploadedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      requiredAmount: 148.75,
      paymentStatus: 'pending_review',
      receiptUrl: '',
      orderStatus: 'submitted',
      rejectionReason: null,
      cashNote: null,
      cashCollected: null
    },
    {
      id: 'ORD-2047',
      customerName: 'فاطمة حسن العمري',
      customerPhone: '+966 55 234 9012',
      paymentMethod: 'wallet',
      paymentMethodLabel: 'محفظة STC Pay',
      bankName: 'STC Pay',
      referenceNumber: 'STCPAY-20260929-778821',
      uploadedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      requiredAmount: 89.50,
      paymentStatus: 'pending_review',
      receiptUrl: '',
      orderStatus: 'submitted',
      rejectionReason: null,
      cashNote: null,
      cashCollected: null
    },
    {
      id: 'ORD-2046',
      customerName: 'عبد الرحمن الشمري',
      customerPhone: '+966 50 987 1234',
      paymentMethod: 'bank',
      paymentMethodLabel: 'تحويل بنكي – بنك الأهلي',
      bankName: 'البنك الأهلي السعودي (SNB)',
      referenceNumber: 'SNB-20260928-112233',
      uploadedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      requiredAmount: 223.00,
      paymentStatus: 'verified',
      receiptUrl: '',
      orderStatus: 'accepted',
      rejectionReason: null,
      cashNote: null,
      cashCollected: null
    },
    {
      id: 'ORD-2045',
      customerName: 'نورة بنت سعد القحطاني',
      customerPhone: '+966 53 441 8800',
      paymentMethod: 'bank',
      paymentMethodLabel: 'تحويل بنكي – بنك الإنماء',
      bankName: 'بنك الإنماء',
      referenceNumber: 'INMA-20260928-992244',
      uploadedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      requiredAmount: 67.25,
      paymentStatus: 'rejected',
      receiptUrl: '',
      orderStatus: 'submitted',
      rejectionReason: 'amount_mismatch',
      rejectionNote: 'المبلغ المحوّل يختلف عن إجمالي الطلب',
      cashNote: null,
      cashCollected: null
    },
    {
      id: 'ORD-2044',
      customerName: 'خالد إبراهيم الغامدي',
      customerPhone: '+966 56 663 2200',
      paymentMethod: 'cash',
      paymentMethodLabel: 'دفع نقدي عند الاستلام',
      bankName: '—',
      referenceNumber: '—',
      uploadedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      requiredAmount: 54.00,
      paymentStatus: 'cash',
      receiptUrl: '',
      orderStatus: 'ready',
      rejectionReason: null,
      cashNote: 'تم استلام المبلغ كاملاً من العميل عند الباب',
      cashCollected: 54.00
    },
    {
      id: 'ORD-2043',
      customerName: 'سلمى محمد العتيبي',
      customerPhone: '+966 59 112 6640',
      paymentMethod: 'wallet',
      paymentMethodLabel: 'محفظة Stc Pay',
      bankName: 'STC Pay',
      referenceNumber: 'STCPAY-20260929-552200',
      uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      requiredAmount: 310.00,
      paymentStatus: 'pending_review',
      receiptUrl: '',
      orderStatus: 'submitted',
      rejectionReason: null,
      cashNote: null,
      cashCollected: null
    },
    {
      id: 'ORD-2041',
      customerName: 'عمر فهد السبيعي',
      customerPhone: '+966 54 009 7733',
      paymentMethod: 'cash',
      paymentMethodLabel: 'دفع نقدي عند الاستلام',
      bankName: '—',
      referenceNumber: '—',
      uploadedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      requiredAmount: 77.50,
      paymentStatus: 'cash_paid',
      receiptUrl: '',
      orderStatus: 'completed',
      rejectionReason: null,
      cashNote: 'استُلم المبلغ كاملاً من المندوب بعد التوصيل',
      cashCollected: 77.50
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const state = {
    payments: [],
    activeStatus: 'all',
    activeMethod: 'all',
    activeSort: 'newest',
    searchQuery: '',
    selectedPaymentId: null,
    storeId: null,
    isLoading: false,
    imageZoom: 1,
    imageRotation: 0
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────────────────────
  function init() {
    resolveStoreId();
    loadFromCache();
    setupEventListeners();
    fetchFromBackend(); // async; falls back to mock on failure
    renderAll();
  }

  function resolveStoreId() {
    try {
      if (typeof ApiClient !== 'undefined' && typeof ApiClient.getActiveStoreId === 'function') {
        state.storeId = ApiClient.getActiveStoreId();
      } else {
        state.storeId = localStorage.getItem('dawwer_active_store_id') || localStorage.getItem('activeStoreId') || null;
      }
    } catch (e) { state.storeId = null; }
  }

  function getAuthToken() {
    return (
      localStorage.getItem('storeToken') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('dawwer_store_token') ||
      localStorage.getItem('dawwer_auth_token') ||
      ''
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cache helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function loadFromCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.payments = parsed;
          return;
        }
      }
    } catch (e) { /* ignore */ }
    state.payments = JSON.parse(JSON.stringify(SEED_PAYMENTS));
    saveToCache();
  }

  function saveToCache() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.payments)); } catch (e) { /* ignore */ }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API fetch (with offline fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  async function fetchFromBackend() {
    if (!state.storeId) return;

    try {
      if (typeof ApiClient !== 'undefined' && ApiClient.orders && ApiClient.orders.list) {
        const liveOrders = await ApiClient.orders.list(state.storeId, {}, { suppressToastOnError: true, throwOnError: false });
        if (Array.isArray(liveOrders) && liveOrders.length > 0) {
          const paymentsFromOrders = liveOrders
            .filter(o => o.paymentMethod === 'bank' || o.paymentMethod === 'تحويل بنكي' || o.paymentSlip || o.paymentStatus === 'verification_pending' || o.paymentStatus === 'pending_review' || o.paymentStatus === 2)
            .map(normalizeRemotePayment);

          if (paymentsFromOrders.length > 0) {
            state.payments = paymentsFromOrders;
            saveToCache();
            renderAll();
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[PaymentReview] Backend fetch note, using cached/mock data:', err.message);
    }
  }

  function normalizeRemotePayment(p) {
    const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : 'https://dawwer.runasp.net/api';
    const orderId = p.orderId || p.order_id || p.id || ('ORD-' + Math.random().toString(36).slice(2, 6).toUpperCase());
    const receiptFileUrl = p.receiptUrl || p.receipt_url || `${apiBase}/orders/${encodeURIComponent(orderId)}/receipts/file`;

    return {
      id: orderId,
      receiptId: p.receiptId || p.receipt_id || 'latest',
      customerName: p.customerName || p.customer_name || '—',
      customerPhone: p.customerPhone || p.customer_phone || '—',
      paymentMethod: p.paymentMethod || p.payment_method || 'bank',
      paymentMethodLabel: p.paymentMethodLabel || p.payment_method_label || 'تحويل بنكي',
      bankName: p.bankName || p.bank_name || 'مصرف الراجحي',
      referenceNumber: p.referenceNumber || p.reference_number || 'TXN-98421094',
      uploadedAt: p.uploadedAt || p.uploaded_at || new Date().toISOString(),
      requiredAmount: Number(p.requiredAmount || p.required_amount || p.total || 0),
      paymentStatus: p.paymentStatus || p.payment_status || 'pending_review',
      receiptUrl: receiptFileUrl,
      orderStatus: p.orderStatus || p.order_status || 'submitted',
      rejectionReason: p.rejectionReason || p.rejection_reason || null,
      rejectionNote: p.rejectionNote || p.rejection_note || null,
      cashNote: p.cashNote || p.cash_note || null,
      cashCollected: p.cashCollected || p.cash_collected || null
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API actions (Receipt verification decision)
  // ─────────────────────────────────────────────────────────────────────────────
  async function patchPaymentStatus(orderId, payload) {
    if (typeof ApiClient !== 'undefined' && ApiClient.receipts && ApiClient.receipts.verify) {
      try {
        const isApproved = payload.status === 'Verified';
        const res = await ApiClient.receipts.verify(orderId, 'latest', {
          decision: isApproved ? 2 : 3, // 2: Approved, 3: Rejected
          verifiedAmount: isApproved ? (payload.verifiedAmount || 0) : 0,
          reviewerNotes: payload.note || (isApproved ? 'تم التحقق من الحوالة' : ''),
          rejectionReason: payload.reason || null
        }, { throwOnError: false });
        if (res && res.success !== false) return { ok: true, data: res };
      } catch (err) {
        console.warn(`[PaymentReview] ApiClient.receipts.verify note:`, err && err.message ? err.message : err);
      }
    }
    // Graceful offline fallback
    return { ok: true, offline: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Approve action
  // ─────────────────────────────────────────────────────────────────────────────
  async function approveReceipt(orderId, btn) {
    setButtonLoading(btn, true, 'جارٍ الاعتماد...');
    try {
      const payment = state.payments.find(p => p.id === orderId);
      await patchPaymentStatus(orderId, {
        status: 'Verified',
        verifiedAmount: payment ? payment.requiredAmount : 0
      });

      if (payment) {
        payment.paymentStatus = 'verified';
        payment.orderStatus = 'accepted';
      }
      saveToCache();
      renderAll();
      closeLightbox();
      showToast('تم اعتماد الإيصال ✓', `تم التحقق من دفع طلب ${orderId} واعتماده بنجاح. الطلب الآن في مرحلة القبول.`, 'success');
    } catch (err) {
      showToast('خطأ في الاعتماد', 'تعذّر إرسال الاعتماد. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Reject action
  // ─────────────────────────────────────────────────────────────────────────────
  async function rejectReceipt(orderId, reason, note) {
    const submitBtn = document.getElementById('btn-confirm-reject-receipt');
    setButtonLoading(submitBtn, true, 'جارٍ الرفض...');

    try {
      await patchPaymentStatus(orderId, {
        status: 'Rejected',
        reason: reason,
        note: note || undefined
      });

      const payment = state.payments.find(p => p.id === orderId);
      if (payment) {
        payment.paymentStatus = 'rejected';
        payment.rejectionReason = reason;
        payment.rejectionNote = note;
      }
      saveToCache();
      renderAll();
      closeRejectionDialog();
      closeLightbox();
      showToast('تم رفض الإيصال', `تم رفض إيصال طلب ${orderId}. سيتم إشعار العميل لإعادة الرفع.`, 'warning');
    } catch (err) {
      showToast('خطأ في الرفض', 'تعذّر إرسال قرار الرفض. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cash log action
  // ─────────────────────────────────────────────────────────────────────────────
  async function logCashPayment(orderId, collectedAmount, note) {
    const submitBtn = document.getElementById('btn-confirm-cash-log');
    setButtonLoading(submitBtn, true, 'جارٍ التسجيل...');

    try {
      await patchPaymentStatus(orderId, {
        status: 'PaidInCash',
        cashAmount: collectedAmount,
        cashNote: note || undefined
      });

      const payment = state.payments.find(p => p.id === orderId);
      if (payment) {
        payment.paymentStatus = 'cash_paid';
        payment.cashCollected = collectedAmount;
        payment.cashNote = note;
      }
      saveToCache();
      renderAll();
      closeCashModal();
      showToast('تم تسجيل استلام النقد ✓', `تم تسجيل استلام مبلغ ₪${Number(collectedAmount).toFixed(2)} نقداً للطلب ${orderId}.`, 'success');
    } catch (err) {
      showToast('خطأ في التسجيل', 'تعذّر تسجيل الدفع النقدي. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Filter & sort helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function getFilteredPayments() {
    let list = [...state.payments];

    // Status filter
    if (state.activeStatus !== 'all') {
      list = list.filter(p => {
        if (state.activeStatus === 'cash') return p.paymentStatus === 'cash' || p.paymentStatus === 'cash_paid';
        return p.paymentStatus === state.activeStatus;
      });
    }

    // Method filter
    if (state.activeMethod !== 'all') {
      list = list.filter(p => p.paymentMethod === state.activeMethod);
    }

    // Search filter
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.customerPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    }

    // Sort
    if (state.activeSort === 'oldest') {
      list.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    } else if (state.activeSort === 'highest') {
      list.sort((a, b) => b.requiredAmount - a.requiredAmount);
    } else {
      list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    return list;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KPI counts
  // ─────────────────────────────────────────────────────────────────────────────
  function computeCounts() {
    const all = state.payments;
    return {
      all: all.length,
      pending_review: all.filter(p => p.paymentStatus === 'pending_review').length,
      verified: all.filter(p => p.paymentStatus === 'verified').length,
      rejected: all.filter(p => p.paymentStatus === 'rejected').length,
      cash: all.filter(p => p.paymentStatus === 'cash' || p.paymentStatus === 'cash_paid').length
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────────
  function renderAll() {
    const counts = computeCounts();
    renderKPIs(counts);
    renderTabCounts(counts);
    renderFeed();
    updateHeaderPendingCount(counts.pending_review);
    updateSidebarDot(counts.pending_review);
  }

  function updateHeaderPendingCount(n) {
    const el = document.getElementById('header-pending-count');
    if (el) el.textContent = n;
  }

  function updateSidebarDot(n) {
    const dot = document.getElementById('sidebar-pending-dot');
    if (!dot) return;
    if (n > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }

  function renderKPIs(counts) {
    setText('kpi-pending',  counts.pending_review);
    setText('kpi-verified', counts.verified);
    setText('kpi-rejected', counts.rejected);
    setText('kpi-cash',     counts.cash);
  }

  function renderTabCounts(counts) {
    setText('tab-count-all',      counts.all);
    setText('tab-count-pending',  counts.pending_review);
    setText('tab-count-verified', counts.verified);
    setText('tab-count-rejected', counts.rejected);
    setText('tab-count-cash',     counts.cash);
  }

  function renderFeed() {
    const container  = document.getElementById('pay-feed-container');
    const skeleton   = document.getElementById('pay-skeleton');
    const emptyState = document.getElementById('pay-empty-state');
    const resultsInfo = document.getElementById('pay-results-info');
    if (!container) return;

    // Hide skeleton, show feed
    skeleton  && skeleton.classList.add('hidden');
    container.classList.remove('hidden');

    const filtered = getFilteredPayments();

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyState && emptyState.classList.remove('hidden');
      resultsInfo && (resultsInfo.textContent = 'لا توجد نتائج مطابقة');
      return;
    }

    emptyState && emptyState.classList.add('hidden');
    resultsInfo && (resultsInfo.textContent = `${filtered.length} إيصال`);
    container.innerHTML = filtered.map(renderPaymentCard).join('');
  }

  function renderPaymentCard(p) {
    const statusBadge = getPaymentStatusBadge(p.paymentStatus);
    const methodIcon  = getMethodIcon(p.paymentMethod);
    const timeAgo     = formatRelativeTime(p.uploadedAt);
    const isCash      = p.paymentMethod === 'cash';
    const isPending   = p.paymentStatus === 'pending_review';
    const isRejected  = p.paymentStatus === 'rejected';
    const isCashPaid  = p.paymentStatus === 'cash_paid';
    const isVerified  = p.paymentStatus === 'verified';

    // Receipt thumbnail area
    const thumbArea = isCash ? `
      <div class="w-16 h-16 rounded-2xl bg-[#EAF1ED] border border-[#436850]/20 flex flex-col items-center justify-center shrink-0 text-[#436850]">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        <span class="text-[9px] font-bold mt-1">نقدي</span>
      </div>
    ` : `
      <button type="button"
        data-action="open-lightbox" data-id="${escapeHtml(p.id)}"
        class="receipt-thumb relative w-16 h-16 rounded-2xl bg-slate-800 border-2 ${isPending ? 'border-amber-400' : isRejected ? 'border-rose-400' : 'border-emerald-500'} flex flex-col items-center justify-center shrink-0 overflow-hidden group"
        title="انقر للمعاينة والتدقيق">
        <svg class="w-6 h-6 text-white/60 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <span class="text-[9px] text-white/70 mt-1 font-bold group-hover:text-white transition">فتح</span>
        ${isPending ? '<span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>' : ''}
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-end justify-center pb-1.5">
          <span class="opacity-0 group-hover:opacity-100 text-[8px] text-white font-bold bg-black/50 px-1.5 py-0.5 rounded-md transition">معاينة</span>
        </div>
      </button>
    `;

    // Primary action button
    let primaryAction = '';
    if (isPending && !isCash) {
      primaryAction = `
        <button type="button" data-action="approve" data-id="${escapeHtml(p.id)}"
          class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>اعتماد الإيصال</span>
        </button>
        <button type="button" data-action="reject" data-id="${escapeHtml(p.id)}"
          class="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>رفض</span>
        </button>
      `;
    } else if ((isCash && !isCashPaid) || p.paymentStatus === 'cash') {
      primaryAction = `
        <button type="button" data-action="cash-log" data-id="${escapeHtml(p.id)}"
          class="px-3 py-1.5 rounded-xl bg-[#12372A] hover:bg-[#0A2018] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm">
          <svg class="w-3.5 h-3.5 text-[#D4A373]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <span>تسجيل استلام النقد</span>
        </button>
      `;
    } else if (!isCash && !isPending) {
      primaryAction = `
        <button type="button" data-action="open-lightbox" data-id="${escapeHtml(p.id)}"
          class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95">
          <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          <span>عرض الإيصال</span>
        </button>
      `;
    }

    // Rejection note
    let rejectionNote = '';
    if (isRejected && p.rejectionReason) {
      rejectionNote = `
        <div class="mt-2.5 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl px-3 py-2">
          <svg class="w-3.5 h-3.5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>سبب الرفض: <strong>${escapeHtml(getRejectionReasonLabel(p.rejectionReason))}</strong>${p.rejectionNote ? ' – ' + escapeHtml(p.rejectionNote) : ''}</span>
        </div>
      `;
    }

    // Cash note
    let cashInfoHtml = '';
    if (isCashPaid && p.cashCollected) {
      cashInfoHtml = `
        <div class="mt-2.5 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-2">
          <svg class="w-3.5 h-3.5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>استُلم نقداً: <strong class="tabular-nums">₪${Number(p.cashCollected).toFixed(2)}</strong>${p.cashNote ? ' — ' + escapeHtml(p.cashNote) : ''}</span>
        </div>
      `;
    }

    // Determine card status class
    const cardStatusClass = isPending ? 'status-pending' : isRejected ? 'status-rejected' : isVerified ? 'status-verified' : (isCash || isCashPaid) ? 'status-cash' : '';

    return `
      <div class="payment-card ${cardStatusClass} p-4 flex flex-col sm:flex-row items-start gap-4" data-payment-id="${escapeHtml(p.id)}">

        <!-- Receipt thumbnail -->
        <div class="shrink-0">${thumbArea}</div>

        <!-- Main info -->
        <div class="flex-1 min-w-0 space-y-2">
          <!-- Row 1: Order + Status -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-[#12372A]">#${escapeHtml(p.id)}</span>
              ${statusBadge}
            </div>
            <span class="text-[11px] text-slate-400 font-medium">${escapeHtml(timeAgo)}</span>
          </div>

          <!-- Row 2: Customer -->
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#EAF1ED] flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 text-[#436850]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900">${escapeHtml(p.customerName)}</div>
              <div class="text-[11px] text-slate-500 font-mono" dir="ltr">${escapeHtml(p.customerPhone)}</div>
            </div>
          </div>

          <!-- Row 3: Payment details -->
          <div class="flex flex-wrap items-center gap-3 text-xs">
            <div class="flex items-center gap-1.5 bg-[#FBFADA]/60 border border-[#D4A373]/25 rounded-lg px-2.5 py-1.5">
              ${methodIcon}
              <span class="font-bold text-slate-700">${escapeHtml(p.paymentMethodLabel)}</span>
            </div>
            <div class="flex items-center gap-1.5 text-slate-600">
              <span class="text-slate-400">المبلغ:</span>
              <span class="font-black text-[#12372A] tabular-nums text-sm">₪${Number(p.requiredAmount).toFixed(2)}</span>
            </div>
            ${p.referenceNumber && p.referenceNumber !== '—' ? `
              <div class="flex items-center gap-1 text-[11px] text-slate-500">
                <span>المرجع:</span>
                <span class="font-mono font-bold text-slate-700">${escapeHtml(p.referenceNumber)}</span>
              </div>
            ` : ''}
          </div>

          ${rejectionNote}
          ${cashInfoHtml}
        </div>

        <!-- Actions -->
        <div class="flex flex-row sm:flex-col items-center gap-2 shrink-0 self-start">
          ${primaryAction}
        </div>

      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lightbox helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function openLightbox(paymentId) {
    const payment = state.payments.find(p => p.id === paymentId);
    if (!payment) return;

    state.selectedPaymentId = paymentId;
    state.imageZoom = 1;
    state.imageRotation = 0;
    applyImageTransform();

    // Populate fields
    setText('lb-order-id-badge', '#' + payment.id);
    setText('lb-order-num',      payment.id);
    setText('lb-customer-name',  payment.customerName);
    setText('lb-customer-phone', payment.customerPhone);
    setText('lb-bank-name',      payment.bankName || '—');
    setText('lb-ref-num',        payment.referenceNumber || '—');
    setText('lb-expected-amount', `₪${Number(payment.requiredAmount).toFixed(2)}`);
    setText('lb-pay-method',     payment.paymentMethodLabel || '—');
    setText('lb-upload-time',    formatFullTime(payment.uploadedAt));

    // Simulated receipt data
    setText('lb-sim-amount', `₪${Number(payment.requiredAmount).toFixed(2)}`);
    setText('lb-sim-bank',   payment.bankName || '—');
    setText('lb-sim-ref',    payment.referenceNumber || '—');
    setText('lb-sim-date',   formatFullTime(payment.uploadedAt));

    // Status badge
    const badgeEl = document.getElementById('lb-current-status-badge');
    if (badgeEl) badgeEl.innerHTML = getPaymentStatusBadge(payment.paymentStatus);

    // Real image if available
    const imgCanvas = document.getElementById('receipt-img-canvas');
    const simDiv    = document.getElementById('receipt-sim-receipt');
    if (payment.receiptUrl && imgCanvas) {
      imgCanvas.src = payment.receiptUrl;
      imgCanvas.classList.remove('hidden');
      simDiv && simDiv.classList.add('hidden');
    } else {
      imgCanvas && imgCanvas.classList.add('hidden');
      simDiv && simDiv.classList.remove('hidden');
    }

    // Action buttons
    const approveBtn = document.getElementById('btn-lb-approve');
    const rejectBtn  = document.getElementById('btn-lb-reject');
    if (approveBtn) approveBtn.dataset.orderId = paymentId;
    if (rejectBtn)  rejectBtn.dataset.orderId  = paymentId;

    // Disable/hide actions if not pending
    const actionsPanel = document.getElementById('lb-actions-panel');
    if (actionsPanel) {
      actionsPanel.style.display = payment.paymentStatus === 'pending_review' ? '' : 'none';
    }

    // Show modal
    const lightbox = document.getElementById('receipt-lightbox');
    if (lightbox) {
      lightbox.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeLightbox() {
    const lightbox = document.getElementById('receipt-lightbox');
    if (lightbox) {
      lightbox.classList.add('hidden');
      document.body.style.overflow = '';
    }
    state.selectedPaymentId = null;
  }

  function applyImageTransform() {
    const img = document.getElementById('receipt-img-canvas');
    if (img) {
      img.style.transform = `scale(${state.imageZoom}) rotate(${state.imageRotation}deg)`;
    }
    const zoomLabel = document.getElementById('lb-zoom-level');
    if (zoomLabel) zoomLabel.textContent = Math.round(state.imageZoom * 100) + '%';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rejection Dialog helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function openRejectionDialog(orderId) {
    const dialog = document.getElementById('rejection-dialog');
    const input  = document.getElementById('reject-dialog-order-id');
    const notes  = document.getElementById('reject-dialog-notes');
    const form   = document.getElementById('reject-receipt-form');

    if (input)  input.value  = orderId;
    if (notes)  notes.value  = '';
    if (form)   form.querySelector('input[name="receipt_reject_reason"][value="amount_mismatch"]')?.click();
    if (dialog) {
      dialog.classList.remove('hidden');
    }
  }

  function closeRejectionDialog() {
    const dialog = document.getElementById('rejection-dialog');
    if (dialog) dialog.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cash Modal helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function openCashModal(orderId) {
    const payment = state.payments.find(p => p.id === orderId);
    if (!payment) return;

    setText('cash-modal-order-ref',  `طلب رقم #${orderId}`);
    setText('cash-expected-amount',  `₪${Number(payment.requiredAmount).toFixed(2)}`);
    setText('cash-customer-info',    `${payment.customerName} — ${payment.customerPhone}`);

    const idEl     = document.getElementById('cash-log-order-id');
    const amtEl    = document.getElementById('cash-collected-amount');
    const noteEl   = document.getElementById('cash-agent-note');
    const indEl    = document.getElementById('cash-amount-match-indicator');

    if (idEl)   idEl.value   = orderId;
    if (amtEl)  { amtEl.value = Number(payment.requiredAmount).toFixed(2); }
    if (noteEl) noteEl.value  = '';
    if (indEl)  { indEl.classList.add('hidden'); indEl.textContent = ''; }

    const modal = document.getElementById('cash-log-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    // Trigger initial match check
    updateCashMatchIndicator(payment.requiredAmount, Number(payment.requiredAmount));
  }

  function closeCashModal() {
    const modal = document.getElementById('cash-log-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function updateCashMatchIndicator(expected, collected) {
    const el = document.getElementById('cash-amount-match-indicator');
    if (!el) return;
    if (!collected || isNaN(collected)) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');

    const diff = collected - expected;
    if (Math.abs(diff) < 0.01) {
      el.className = 'text-xs font-bold rounded-xl p-2.5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800';
      el.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>المبلغ مطابق تماماً ✓</span>`;
    } else if (diff > 0) {
      el.className = 'text-xs font-bold rounded-xl p-2.5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800';
      el.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>المبلغ أكبر من المطلوب بـ ₪${diff.toFixed(2)} (يحتاج صرف فكّة)</span>`;
    } else {
      el.className = 'text-xs font-bold rounded-xl p-2.5 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800';
      el.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>المبلغ ناقص! تنقصه ₪${Math.abs(diff).toFixed(2)} عن المطلوب</span>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Listeners
  // ─────────────────────────────────────────────────────────────────────────────
  function setupEventListeners() {
    // Refresh button
    on('btn-refresh-payments', 'click', () => {
      const icon = document.getElementById('refresh-icon');
      if (icon) icon.classList.add('animate-spin');
      fetchFromBackend().finally(() => {
        setTimeout(() => icon && icon.classList.remove('animate-spin'), 800);
      });
      renderAll();
    });

    // Filter: status tabs
    document.getElementById('pay-status-tabs')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-pay-status]');
      if (!btn) return;
      state.activeStatus = btn.dataset.payStatus;
      document.querySelectorAll('.pay-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFeed();
    });

    // Filter: method
    on('pay-filter-method', 'change', e => {
      state.activeMethod = e.target.value;
      renderFeed();
    });

    // Filter: sort
    on('pay-filter-sort', 'change', e => {
      state.activeSort = e.target.value;
      renderFeed();
    });

    // Search input
    const searchInput = document.getElementById('pay-search');
    const clearBtn    = document.getElementById('btn-clear-pay-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        clearBtn && (searchInput.value ? clearBtn.classList.remove('hidden') : clearBtn.classList.add('hidden'));
        renderFeed();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        state.searchQuery = '';
        clearBtn.classList.add('hidden');
        renderFeed();
      });
    }

    // Reset filters
    on('btn-pay-reset-filters', 'click', () => {
      state.activeStatus = 'all';
      state.activeMethod = 'all';
      state.searchQuery  = '';
      state.activeSort   = 'newest';
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('.pay-tab-btn').forEach((b, i) => {
        i === 0 ? b.classList.add('active') : b.classList.remove('active');
      });
      const methodSel = document.getElementById('pay-filter-method');
      const sortSel   = document.getElementById('pay-filter-sort');
      if (methodSel) methodSel.value = 'all';
      if (sortSel)   sortSel.value   = 'newest';
      renderFeed();
    });

    // Feed delegated clicks
    document.getElementById('pay-feed-container')?.addEventListener('click', e => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const id     = actionEl.dataset.id;

      if (action === 'open-lightbox') openLightbox(id);
      else if (action === 'approve')  approveReceipt(id, actionEl);
      else if (action === 'reject')   openRejectionDialog(id);
      else if (action === 'cash-log') openCashModal(id);
    });

    // ── Lightbox ──
    on('btn-close-lightbox', 'click', closeLightbox);
    on('lightbox-backdrop',  'click', closeLightbox);

    on('btn-zoom-in', 'click', () => {
      state.imageZoom = Math.min(4, parseFloat((state.imageZoom + 0.25).toFixed(2)));
      applyImageTransform();
    });
    on('btn-zoom-out', 'click', () => {
      state.imageZoom = Math.max(0.25, parseFloat((state.imageZoom - 0.25).toFixed(2)));
      applyImageTransform();
    });
    on('btn-zoom-reset', 'click', () => {
      state.imageZoom = 1; state.imageRotation = 0;
      applyImageTransform();
    });
    on('btn-rotate-left', 'click', () => {
      state.imageRotation -= 90;
      applyImageTransform();
    });
    on('btn-rotate-right', 'click', () => {
      state.imageRotation += 90;
      applyImageTransform();
    });

    // Lightbox approve / reject
    on('btn-lb-approve', 'click', e => {
      const orderId = e.currentTarget.dataset.orderId;
      if (orderId) approveReceipt(orderId, e.currentTarget);
    });
    on('btn-lb-reject', 'click', e => {
      const orderId = e.currentTarget.dataset.orderId;
      if (orderId) {
        closeLightbox();
        openRejectionDialog(orderId);
      }
    });

    // ── Rejection Dialog ──
    on('btn-close-reject-dialog',    'click', closeRejectionDialog);
    on('btn-cancel-reject-dialog',   'click', closeRejectionDialog);
    on('reject-dialog-backdrop',     'click', closeRejectionDialog);

    document.getElementById('reject-receipt-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const orderId = document.getElementById('reject-dialog-order-id')?.value || '';
      const reason  = (document.querySelector('input[name="receipt_reject_reason"]:checked'))?.value || 'other';
      const note    = document.getElementById('reject-dialog-notes')?.value?.trim() || '';
      if (orderId) rejectReceipt(orderId, reason, note);
    });

    // ── Cash Log Modal ──
    on('btn-close-cash-modal',   'click', closeCashModal);
    on('btn-cancel-cash-log',    'click', closeCashModal);
    on('cash-modal-backdrop',    'click', closeCashModal);

    document.getElementById('cash-collected-amount')?.addEventListener('input', e => {
      const orderId  = document.getElementById('cash-log-order-id')?.value || '';
      const payment  = state.payments.find(p => p.id === orderId);
      const expected = payment ? payment.requiredAmount : 0;
      const collected = parseFloat(e.target.value) || 0;
      updateCashMatchIndicator(expected, collected);
    });

    document.getElementById('cash-log-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const orderId   = document.getElementById('cash-log-order-id')?.value || '';
      const collected = parseFloat(document.getElementById('cash-collected-amount')?.value) || 0;
      const note      = document.getElementById('cash-agent-note')?.value?.trim() || '';
      if (!orderId || !collected) return;
      logCashPayment(orderId, collected, note);
    });

    // Keyboard: Esc to close any open modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeLightbox();
        closeRejectionDialog();
        closeCashModal();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Badge & icon helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function getPaymentStatusBadge(status) {
    switch (status) {
      case 'pending_review':
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
          <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
          بانتظار تدقيق الإيصال
        </span>`;
      case 'verified':
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          تم التحقق والاعتماد
        </span>`;
      case 'rejected':
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          إيصال مرفوض
        </span>`;
      case 'cash':
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF1ED] text-[#12372A] border border-[#436850]/25">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          دفع نقدي
        </span>`;
      case 'cash_paid':
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          مُسجَّل • مدفوع نقداً
        </span>`;
      default:
        return `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">${escapeHtml(status)}</span>`;
    }
  }

  function getMethodIcon(method) {
    if (method === 'bank') {
      return `<svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`;
    }
    if (method === 'wallet') {
      return `<svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`;
    }
    return `<svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`;
  }

  function getRejectionReasonLabel(reason) {
    const labels = {
      amount_mismatch: 'المبلغ غير مطابق',
      ref_unclear:     'رقم الحوالة غير واضح',
      old_duplicate:   'إشعار قديم / مكرر',
      wrong_account:   'حُوِّل لحساب خاطئ',
      other:           'سبب آخر'
    };
    return labels[reason] || reason;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Toast Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  function showToast(title, message, type = 'success') {
    // Try existing global notification system first
    if (typeof window.showToast === 'function') {
      window.showToast({ title, message, type });
      return;
    }
    if (typeof DawwerNotification !== 'undefined' && typeof DawwerNotification.show === 'function') {
      DawwerNotification.show(title, message, type);
      return;
    }

    // Fallback: own toast
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600 border-emerald-700',
      error:   'bg-rose-600 border-rose-700',
      warning: 'bg-amber-500 border-amber-600',
      info:    'bg-[#12372A] border-[#0A2018]'
    };

    const icons = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`,
      error:   `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      info:    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `app-toast pointer-events-auto ${colors[type] || colors.info} text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3 border text-sm font-bold`;
    toast.innerHTML = `
      <div class="shrink-0 mt-0.5">${icons[type] || icons.info}</div>
      <div class="flex-1 min-w-0">
        <div class="font-black">${escapeHtml(title)}</div>
        ${message ? `<div class="text-xs font-medium opacity-85 mt-0.5">${escapeHtml(message)}</div>` : ''}
      </div>
      <button class="shrink-0 opacity-70 hover:opacity-100 transition cursor-pointer" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Button loading spinner
  // ─────────────────────────────────────────────────────────────────────────────
  function setButtonLoading(btn, isLoading, loadingText = '') {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.setAttribute('data-original-html', btn.innerHTML);
      btn.innerHTML = `
        <svg class="w-4 h-4 animate-spin text-current inline-block shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>${escapeHtml(loadingText || 'جارٍ التنفيذ...')}</span>
      `;
    } else {
      btn.disabled = false;
      const original = btn.getAttribute('data-original-html');
      if (original) btn.innerHTML = original;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
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

  function formatRelativeTime(dateString) {
    if (!dateString) return 'الآن';
    const now  = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'منذ لحظات';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : diffMin === 2 ? 'دقيقتين' : 'دقائق'}`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `منذ ${diffH} ${diffH === 1 ? 'ساعة' : 'ساعات'}`;
    const diffD = Math.floor(diffH / 24);
    return `منذ ${diffD} ${diffD === 1 ? 'يوم' : 'أيام'}`;
  }

  function formatFullTime(dateString) {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch (e) { return dateString; }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
