const CATALOG_STORAGE_KEY = 'dawwer_merchant_catalog_products';
    const AUDIT_STORAGE_KEY = 'dawwer_merchant_audit_log';

    let productsList = [];
    let auditLogsList = [];
    let currentMainView = 'inventory'; 
    let currentStockFilter = 'ALL';
    let inventorySearchQuery = '';
    let auditActionFilter = 'ALL';
    let auditPeriodFilter = 'ALL';
    let auditSearchQuery = '';

    const DEFAULT_PRODUCTS = [
      { id: 'prod-001', name: 'أفوكادو هاس عضوي (عبوة 4 حبات)', sku: 'GRO-AVO-001', category: 'منتجات طازجة', price: 4.99, quantity: 4, lowStockThreshold: 5, isAvailable: true, location: { zone: 'المنطقة أ', aisle: 'ممر 02', rack: 'R1', shelf: 'رف 2 - مستوى العين' }, status: 'Published', updatedAt: '2026-09-22 10:30' },
      { id: 'prod-002', name: 'حليب المراعي طازج كامل الدسم (2 لتر)', sku: 'GRO-DAI-042', category: 'ألبان وأجبان', price: 2.75, quantity: 28, lowStockThreshold: 10, isAvailable: true, location: { zone: 'المنطقة ب', aisle: 'ممر 04', rack: 'R1', shelf: 'رف 1 - علوي' }, status: 'Published', updatedAt: '2026-09-22 08:15' },
      { id: 'prod-003', name: 'رغيف ساوردو حرفي بالخميرة الطبيعية', sku: 'GRO-BAK-109', category: 'مخبوزات', price: 3.50, quantity: 0, lowStockThreshold: 6, isAvailable: false, location: { zone: 'المنطقة أ', aisle: 'ممر 01', rack: 'R2', shelf: 'رف 2 - مستوى العين' }, status: 'Draft', updatedAt: '2026-09-20 16:45' },
      { id: 'prod-004', name: 'زيت زيتون بكر ممتاز يوناني (750 مل)', sku: 'GRO-PAN-881', category: 'زيوت ومؤونة', price: 11.20, quantity: 18, lowStockThreshold: 5, isAvailable: true, location: { zone: 'المنطقة أ', aisle: 'ممر 02', rack: 'R2', shelf: 'رف 3 - أوسط' }, status: 'Published', updatedAt: '2026-09-19 14:20' },
      { id: 'prod-005', name: 'قهوة كولد برو بريميوم منقوعة (330 مل)', sku: 'GRO-BEV-312', category: 'مشروبات', price: 3.85, quantity: 3, lowStockThreshold: 8, isAvailable: true, location: { zone: 'المنطقة ج', aisle: 'ممر 07', rack: 'R2', shelf: 'رف 2 - مستوى العين' }, status: 'Published', updatedAt: '2026-09-22 09:00' },
      { id: 'prod-006', name: 'فيليه سلمون أطلسي طازج (400 غرام)', sku: 'GRO-SEA-554', category: 'لحوم ومأكولات بحرية', price: 14.50, quantity: 1, lowStockThreshold: 5, isAvailable: false, location: { zone: 'المنطقة د', aisle: 'ثلاجة 1', rack: 'R1', shelf: 'رف 2 - رئيسي' }, status: 'Inactive', updatedAt: '2026-09-18 11:10' }
    ];

    const DEFAULT_AUDIT_LOGS = [
      {
        id: 'LOG-1094',
        timestamp: Date.now() - 1800000,
        formattedTime: 'اليوم، 04:30 م',
        actionType: 'Stock Adjustment',
        target: 'حليب المراعي طازج كامل الدسم (2 لتر)',
        targetSku: 'GRO-DAI-042',
        performedBy: 'أحمد الشمري (مدير المتجر)',
        changeDelta: 'المخزون: 8 ➔ 28 (+20 وحدة)',
        details: 'استلام شحنة بضاعة جديدة (Restock) وتحديث المخزون الفعلي بالرف'
      },
      {
        id: 'LOG-1090',
        timestamp: Date.now() - 7200000,
        formattedTime: 'اليوم، 03:00 م',
        actionType: 'Catalog Publication',
        target: 'رف A-02 استخراج (11 صنف)',
        targetSku: 'JOB-8942',
        performedBy: 'نظام الذكاء الاصطناعي (Dawwer Vision)',
        changeDelta: 'نشر 11 منتج جديد وتسكينها بالرف',
        details: 'اعتماد نتائج الفحص البصري ونقل الأصناف من مسودة إلى منشورة بالكتالوج'
      },
      {
        id: 'LOG-1085',
        timestamp: Date.now() - 86400000,
        formattedTime: 'أمس، 02:15 م',
        actionType: 'Price Update',
        target: 'زيت زيتون بكر ممتاز يوناني (750 مل)',
        targetSku: 'GRO-PAN-881',
        performedBy: 'سارة العتيبي (مسؤول المخزون)',
        changeDelta: 'السعر: 12.50 ➔ 11.20 ر.س (-1.30 ر.س)',
        details: 'تحديث العرض الترويجي للزيوت والمؤونة'
      },
      {
        id: 'LOG-1080',
        timestamp: Date.now() - 172800000,
        formattedTime: 'قبل يومين، 11:00 ص',
        actionType: 'Excel Bulk Import',
        target: 'استيراد كتالوج ملف (dawwer_products.csv)',
        targetSku: 'BATCH-CSV-01',
        performedBy: 'أحمد الشمري (مدير المتجر)',
        changeDelta: 'إدراج 24 صنفاً دفعة واحدة',
        details: 'معالجة ومطابقة أعمدة ملف الإكسل وإدراج الأصناف بنجاح'
      }
    ];

    function loadData() {
      try {
        const storedProducts = localStorage.getItem(CATALOG_STORAGE_KEY);
        if (storedProducts) {
          productsList = JSON.parse(storedProducts);
          productsList = productsList.map(p => ({
            ...p,
            quantity: typeof p.quantity === 'number' ? p.quantity : 10,
            lowStockThreshold: typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5
          }));
        } else {
          productsList = [...DEFAULT_PRODUCTS];
          saveProducts();
        }
      } catch (e) {
        productsList = [...DEFAULT_PRODUCTS];
      }

      try {
        const storedLogs = localStorage.getItem(AUDIT_STORAGE_KEY);
        if (storedLogs) {
          auditLogsList = JSON.parse(storedLogs);
        } else {
          auditLogsList = [...DEFAULT_AUDIT_LOGS];
          saveAuditLogs();
        }
      } catch (e) {
        auditLogsList = [...DEFAULT_AUDIT_LOGS];
      }

      if (typeof ApiClient !== 'undefined' && ApiClient.products) {
        ApiClient.products.list().then(res => {
          const items = res?.data || (Array.isArray(res) ? res : null);
          if (Array.isArray(items) && items.length > 0) {
            const idMap = new Map();
            productsList.forEach(p => idMap.set(String(p.id), p));
            let hasNew = false;
            items.forEach(it => {
              const k = String(it.id || it.store_sku || it.sku);
              if (!idMap.has(k)) {
                idMap.set(k, {
                  id: k,
                  name: it.product_name || it.name,
                  sku: it.store_sku || it.sku,
                  category: it.category || 'عام',
                  price: it.price || 0,
                  quantity: it.quantity || 10,
                  lowStockThreshold: 5,
                  isAvailable: it.quantity > 0,
                  location: { zone: it.zone || 'المنطقة أ', aisle: it.aisle || 'ممر 01', rack: it.rack || 'R1', shelf: it.shelf || 'رف 1' }
                });
                hasNew = true;
              }
            });
            if (hasNew) {
              productsList = Array.from(idMap.values());
              saveProducts();
              renderAll();
            }
          }
        }).catch(() => {});
      }
    }

    function saveProducts() {
      try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(productsList));
      } catch (e) {
        console.error('Error saving products:', e);
      }
    }

    function saveAuditLogs() {
      try {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogsList));
      } catch (e) {
        console.error('Error saving audit logs:', e);
      }
    }

    function logAuditEvent(actionType, target, targetSku, changeDelta, details, performedBy = 'مدير المتجر') {
      const now = new Date();
      const formattedTime = 'اليوم، ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      const logEntry = {
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: Date.now(),
        formattedTime,
        actionType,
        target,
        targetSku,
        performedBy,
        changeDelta,
        details
      };

      auditLogsList.unshift(logEntry);
      saveAuditLogs();
      renderAuditTable();
      updateKPIs();

      if (typeof ApiClient !== 'undefined' && ApiClient.audit && ApiClient.audit.log) {
        ApiClient.audit.log(logEntry);
      }
    }

    function renderAll() {
      renderInventoryTable();
      renderAuditTable();
      updateKPIs();
      updateAlertBanner();
    }

    function switchMainView(view) {
      currentMainView = view;
      const invView = document.getElementById('view-inventory');
      const auditView = document.getElementById('view-audit');
      const tabInvBtn = document.getElementById('tab-inventory-btn');
      const tabAuditBtn = document.getElementById('tab-audit-btn');

      if (view === 'inventory') {
        invView.classList.remove('hidden');
        auditView.classList.add('hidden');
        tabInvBtn.className = 'px-4 py-2 rounded-xl bg-[#153f2d] text-white shadow-xs transition flex items-center gap-2 font-bold';
        tabAuditBtn.className = 'px-4 py-2 rounded-xl text-slate-600 hover:text-[#153f2d] transition flex items-center gap-2 font-bold';
      } else {
        invView.classList.add('hidden');
        auditView.classList.remove('hidden');
        tabAuditBtn.className = 'px-4 py-2 rounded-xl bg-[#153f2d] text-white shadow-xs transition flex items-center gap-2 font-bold';
        tabInvBtn.className = 'px-4 py-2 rounded-xl text-slate-600 hover:text-[#153f2d] transition flex items-center gap-2 font-bold';
      }
    }

    function filterByLowStockTab() {
      switchMainView('inventory');
      filterStockStatus('LOW');
    }

    function filterStockStatus(status) {
      currentStockFilter = status;
      ['all', 'low', 'out', 'in'].forEach(f => {
        const btn = document.getElementById('stock-filter-' + f);
        if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition';
      });

      const activeId = status === 'ALL' ? 'stock-filter-all' : status === 'LOW' ? 'stock-filter-low' : status === 'OUT' ? 'stock-filter-out' : 'stock-filter-in';
      const activeBtn = document.getElementById(activeId);
      if (activeBtn) {
        activeBtn.className = 'px-3 py-1.5 rounded-xl bg-[#153f2d] text-white shadow-2xs font-bold transition';
      }

      renderInventoryTable();
    }

    function handleSearchInventory() {
      inventorySearchQuery = (document.getElementById('search-inventory').value || '').trim().toLowerCase();
      renderInventoryTable();
    }

    function getFilteredProducts() {
      return productsList.filter(p => {
        const qty = Number(p.quantity) || 0;
        const threshold = Number(p.lowStockThreshold) || 5;

        if (currentStockFilter === 'LOW' && (qty === 0 || qty > threshold)) return false;
        if (currentStockFilter === 'OUT' && qty !== 0) return false;
        if (currentStockFilter === 'IN_STOCK' && qty <= threshold) return false;

        if (inventorySearchQuery) {
          const matchName = (p.name || '').toLowerCase().includes(inventorySearchQuery);
          const matchSku = (p.sku || '').toLowerCase().includes(inventorySearchQuery);
          const matchZone = (p.location?.zone || '').toLowerCase().includes(inventorySearchQuery);
          const matchAisle = (p.location?.aisle || '').toLowerCase().includes(inventorySearchQuery);
          return matchName || matchSku || matchZone || matchAisle;
        }

        return true;
      });
    }

    function renderInventoryTable() {
      const tbody = document.getElementById('inventory-table-body');
      const emptyState = document.getElementById('inventory-empty-state');
      const filtered = getFilteredProducts();

      const countAll = productsList.length;
      const countLow = productsList.filter(p => (p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 5))).length;
      const countOut = productsList.filter(p => p.quantity === 0).length;

      document.getElementById('count-stock-all').textContent = countAll;
      document.getElementById('count-stock-low').textContent = countLow;
      document.getElementById('count-stock-out').textContent = countOut;

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      tbody.innerHTML = filtered.map(p => {
        const qty = Number(p.quantity) || 0;
        const threshold = Number(p.lowStockThreshold) || 5;

        let statusBadge = '';
        if (qty === 0) {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>نفد المخزون</span>
            </span>
          `;
        } else if (qty <= threshold) {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] animate-pulse-subtle">
              <svg class="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>مخزون منخفض (${qty} باقي)</span>
            </span>
          `;
        } else {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>متوفر (${qty})</span>
            </span>
          `;
        }

        const locationLabel = p.location ? `${p.location.zone} › ${p.location.aisle}` : 'الرف الرئيسي';

        return `
          <tr class="hover:bg-slate-50/90 transition ${qty <= threshold ? 'bg-amber-50/30' : ''}">
            <td class="py-4 px-6">
              <div class="font-extrabold text-slate-900 text-xs">${p.name}</div>
              <div class="text-[11px] font-mono text-slate-400 mt-0.5" dir="ltr">${p.sku}</div>
            </td>
            <td class="py-4 px-4">
              <span class="px-2.5 py-1 rounded-lg bg-[#edf5f0] text-[#153f2d] font-bold text-[11px]">
                ${p.category || 'عام'}
              </span>
            </td>
            <td class="py-4 px-4 font-bold text-slate-900">
              ${Number(p.price).toFixed(2)} ر.س
            </td>
            <td class="py-4 px-4 text-slate-600 text-xs">
              <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-bold">
                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                <span>${locationLabel}</span>
              </div>
            </td>
            <td class="py-4 px-6 text-center">
              <!-- Inline Fast Stock Adjuster (+ / - and Input) -->
              <div class="inline-flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                <button 
                  type="button" 
                  data-action="adjust-stock" data-delta="-1" data-id="${p.id}" 
                  class="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition active:scale-95 disabled:opacity-30"
                  ${qty === 0 ? 'disabled' : ''}
                  title="إنقاص (-1)"
                >-</button>

                <input 
                  type="number" 
                  min="0" 
                  value="${qty}" 
                  data-action="set-stock" data-id="${p.id}"
                  class="w-14 text-center font-black text-xs text-slate-900 bg-transparent border-0 focus:ring-0 outline-none p-0"
                >

                <button 
                  type="button" 
                  data-action="adjust-stock" data-delta="1" data-id="${p.id}" 
                  class="w-7 h-7 rounded-xl bg-[#edf5f0] hover:bg-[#d9ede1] text-[#153f2d] font-black text-sm flex items-center justify-center transition active:scale-95"
                  title="زيادة (+1)"
                >+</button>

                <button 
                  type="button" 
                  data-action="adjust-stock" data-delta="10" data-id="${p.id}" 
                  class="px-2 py-1 rounded-xl bg-slate-50 hover:bg-[#edf5f0] text-[#153f2d] font-bold text-[10px] border border-slate-200 transition"
                  title="إضافة 10 وحدات فوراً"
                >+10</button>
              </div>
            </td>
            <td class="py-4 px-4 text-center font-bold text-slate-600">
              <input 
                type="number" 
                min="1" 
                value="${threshold}" 
                data-action="set-threshold" data-id="${p.id}"
                class="w-12 text-center p-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:border-[#153f2d] outline-none"
              >
            </td>
            <td class="py-4 px-4">
              ${statusBadge}
            </td>
            <td class="py-4 px-6 text-left">
              <button 
                type="button" 
                data-action="open-stock-modal" data-id="${p.id}" 
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-[#edf5f0] hover:text-[#153f2d] font-bold text-xs transition shadow-2xs"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                <span>تعديل مفصل</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function inlineAdjustStock(productId, delta) {
      const p = productsList.find(x => x.id === productId);
      if (!p) return;

      const oldQty = Number(p.quantity) || 0;
      const newQty = Math.max(0, oldQty + delta);
      if (oldQty === newQty) return;

      p.quantity = newQty;
      p.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      saveProducts();

      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      logAuditEvent(
        'Stock Adjustment',
        p.name,
        p.sku,
        `الكمية: ${oldQty} ➔ ${newQty} (${sign} وحدة)`,
        `تعديل كمية سريع من جدول المخزون المباشر`
      );

      renderAll();
      showToast('تم تحديث المخزون', `الكمية الجديدة لـ "${p.name}": ${newQty} وحدة`, 'success');
    }

    function inlineSetStock(productId, value) {
      const p = productsList.find(x => x.id === productId);
      if (!p) return;

      const oldQty = Number(p.quantity) || 0;
      const newQty = Math.max(0, parseInt(value) || 0);
      if (oldQty === newQty) return;

      p.quantity = newQty;
      p.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      saveProducts();

      const diff = newQty - oldQty;
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      logAuditEvent(
        'Stock Adjustment',
        p.name,
        p.sku,
        `الكمية: ${oldQty} ➔ ${newQty} (${sign} وحدة)`,
        `إدخال كمية مباشرة من جدول إدارة المخزون`
      );

      renderAll();
      showToast('تم تحديث المخزون', `الكمية الجديدة لـ "${p.name}": ${newQty} وحدة`, 'success');
    }

    function inlineSetThreshold(productId, value) {
      const p = productsList.find(x => x.id === productId);
      if (!p) return;

      const newThreshold = Math.max(1, parseInt(value) || 5);
      p.lowStockThreshold = newThreshold;
      saveProducts();

      logAuditEvent(
        'Stock Adjustment',
        p.name,
        p.sku,
        `تعديل حد التنبيه إلى ${newThreshold} وحدات`,
        `تحديث حد التنبيه الأدنى لانخفاض المخزون`
      );

      renderAll();
      showToast('تم تحديث حد التنبيه', `حد التنبيه لـ "${p.name}": ${newThreshold} وحدات`, 'info');
    }

    function openStockModal(productId) {
      const p = productsList.find(x => x.id === productId);
      if (!p) return;

      document.getElementById('modal-product-id').value = p.id;
      document.getElementById('modal-product-sku').textContent = p.sku;
      document.getElementById('modal-product-name').textContent = p.name;
      document.getElementById('modal-current-qty').textContent = p.quantity || 0;
      document.getElementById('modal-new-qty').value = p.quantity || 0;
      document.getElementById('modal-threshold-qty').value = p.lowStockThreshold || 5;

      document.getElementById('stock-modal').classList.remove('hidden');
    }

    function openBulkAdjustModal() {
      if (productsList.length > 0) {
        openStockModal(productsList[0].id);
      }
    }

    function closeStockModal() {
      document.getElementById('stock-modal').classList.add('hidden');
    }

    function applyQtyPreset(addAmount) {
      const input = document.getElementById('modal-new-qty');
      const currentVal = parseInt(input.value) || 0;
      input.value = currentVal + addAmount;
    }

    function handleStockModalSubmit(e) {
      e.preventDefault();
      const productId = document.getElementById('modal-product-id').value;
      const newQty = parseInt(document.getElementById('modal-new-qty').value) || 0;
      const threshold = parseInt(document.getElementById('modal-threshold-qty').value) || 5;
      const reason = document.getElementById('modal-adjust-reason').value;

      const p = productsList.find(x => x.id === productId);
      if (!p) return;

      const oldQty = p.quantity || 0;
      p.quantity = newQty;
      p.lowStockThreshold = threshold;
      p.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      saveProducts();

      const diff = newQty - oldQty;
      const sign = diff >= 0 ? `+${diff}` : `${diff}`;
      logAuditEvent(
        'Stock Adjustment',
        p.name,
        p.sku,
        `المخزون: ${oldQty} ➔ ${newQty} (${sign} وحدة)`,
        `سبب التعديل: ${reason}`
      );

      if (typeof ApiClient !== 'undefined' && ApiClient.products && ApiClient.products.update) {
        const storeId = ApiClient.getActiveStoreId();
        if (storeId && p.id && !String(p.id).startsWith('prod-')) {
          ApiClient.products.update(storeId, p.id, {
            quantity: newQty,
            stock_status: newQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
          }, { suppressToastOnError: true, throwOnError: false }).catch(err => {
            console.warn('[Inventory Live Sync Warning]:', err);
          });
        }
      }

      closeStockModal();
      renderAll();
      showToast('تم حفظ تعديل المخزون بنجاح', `تم توثيق العملية في سجل التدقيق وتحديث كمية ${p.name}`, 'success');
    }

    function handleFilterAudit() {
      auditActionFilter = document.getElementById('audit-filter-action').value;
      auditPeriodFilter = document.getElementById('audit-filter-period').value;
      renderAuditTable();
    }

    function handleSearchAudit() {
      auditSearchQuery = (document.getElementById('search-audit').value || '').trim().toLowerCase();
      renderAuditTable();
    }

    function getFilteredAuditLogs() {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      return auditLogsList.filter(log => {
        if (auditActionFilter !== 'ALL' && log.actionType !== auditActionFilter) return false;

        if (auditPeriodFilter === 'TODAY' && (now - log.timestamp > oneDay)) return false;
        if (auditPeriodFilter === 'WEEK' && (now - log.timestamp > oneWeek)) return false;
        if (auditPeriodFilter === 'MONTH' && (now - log.timestamp > oneMonth)) return false;

        if (auditSearchQuery) {
          const matchTarget = (log.target || '').toLowerCase().includes(auditSearchQuery);
          const matchSku = (log.targetSku || '').toLowerCase().includes(auditSearchQuery);
          const matchUser = (log.performedBy || '').toLowerCase().includes(auditSearchQuery);
          const matchDelta = (log.changeDelta || '').toLowerCase().includes(auditSearchQuery);
          return matchTarget || matchSku || matchUser || matchDelta;
        }

        return true;
      });
    }

    function renderAuditTable() {
      const tbody = document.getElementById('audit-table-body');
      const emptyState = document.getElementById('audit-empty-state');
      const filtered = getFilteredAuditLogs();

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      tbody.innerHTML = filtered.map(log => {
        let typeBadge = '';
        if (log.actionType === 'Stock Adjustment') {
          typeBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">تعديل المخزون</span>`;
        } else if (log.actionType === 'Price Update') {
          typeBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">تحديث السعر</span>`;
        } else if (log.actionType === 'AI Ingestion' || log.actionType === 'Catalog Publication') {
          typeBadge = `<span class="px-2.5 py-1 rounded-full bg-[#edf5f0] text-[#153f2d] border border-[#153f2d]/20 font-bold text-[11px]">استخراج ذكي (AI)</span>`;
        } else if (log.actionType === 'Excel Bulk Import') {
          typeBadge = `<span class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">استيراد إكسل</span>`;
        } else {
          typeBadge = `<span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]">${log.actionType}</span>`;
        }

        return `
          <tr class="hover:bg-slate-50/90 transition">
            <td class="py-4 px-6">
              <div class="font-mono font-bold text-slate-900 text-xs">${log.id}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${log.formattedTime}</div>
            </td>
            <td class="py-4 px-4">
              ${typeBadge}
            </td>
            <td class="py-4 px-6">
              <div class="font-extrabold text-slate-900 text-xs">${log.target}</div>
              <div class="text-[11px] font-mono text-slate-400 mt-0.5" dir="ltr">${log.targetSku || '—'}</div>
            </td>
            <td class="py-4 px-4">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                  ${log.performedBy.charAt(0)}
                </div>
                <span class="text-xs font-bold text-slate-700">${log.performedBy}</span>
              </div>
            </td>
            <td class="py-4 px-6">
              <div class="font-bold text-slate-900 text-xs">${log.changeDelta}</div>
              <div class="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs" title="${log.details || ''}">${log.details || '—'}</div>
            </td>
            <td class="py-4 px-4 text-left">
              <button 
                type="button" 
                data-action="open-audit-details" data-id="${log.id}" 
                class="p-1.5 text-slate-400 hover:text-[#153f2d] rounded-lg hover:bg-slate-100 transition"
                title="عرض التفاصيل"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function openAuditDetailsModal(logId) {
      const log = auditLogsList.find(l => l.id === logId);
      if (!log) return;

      const body = document.getElementById('audit-details-body');
      body.innerHTML = `
        <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-500">رقم السجل:</span>
            <span class="font-mono font-bold text-slate-800">${log.id}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">الوقت والتاريخ:</span>
            <span class="font-bold text-slate-800">${log.formattedTime}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">نوع العملية:</span>
            <span class="font-bold text-[#153f2d]">${log.actionType}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">القائم بالعملية:</span>
            <span class="font-bold text-slate-800">${log.performedBy}</span>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">الهدف المستهدف:</label>
          <div class="p-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900">
            ${log.target} (${log.targetSku || '—'})
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">فارق وتفاصيل التغيير:</label>
          <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
            ${log.changeDelta}
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">ملاحظات وسبب العملية:</label>
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            ${log.details || 'تم تنفيذ العملية وتوثيقها آلياً بواسطة النظام.'}
          </div>
        </div>
      `;

      document.getElementById('audit-details-modal').classList.remove('hidden');
    }

    function closeAuditDetailsModal() {
      document.getElementById('audit-details-modal').classList.add('hidden');
    }

    function exportAuditLogCSV() {
      if (auditLogsList.length === 0) {
        showToast('لا توجد سجلات لتصديرها', '', 'info');
        return;
      }

      const headers = ['رقم السجل', 'الوقت', 'نوع العملية', 'الهدف المستهدف', 'الباركود', 'القائم بالعملية', 'فارق التغيير', 'التفاصيل'];
      const rows = auditLogsList.map(l => [
        `"${l.id}"`,
        `"${l.formattedTime}"`,
        `"${l.actionType}"`,
        `"${(l.target || '').replace(/"/g, '""')}"`,
        `"${l.targetSku || ''}"`,
        `"${l.performedBy}"`,
        `"${(l.changeDelta || '').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dawwer_audit_log_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('تم تصدير سجل التدقيق بنجاح (.csv)', '', 'success');
    }

    function updateKPIs() {
      const totalItems = productsList.length;
      let totalUnits = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      productsList.forEach(p => {
        const qty = Number(p.quantity) || 0;
        const threshold = Number(p.lowStockThreshold) || 5;
        totalUnits += qty;

        if (qty === 0) {
          outOfStockCount++;
        } else if (qty <= threshold) {
          lowStockCount++;
        }
      });

      document.getElementById('kpi-total-items').textContent = totalItems;
      document.getElementById('kpi-total-units').textContent = `${totalUnits} وحدة متوفرة`;
      document.getElementById('kpi-low-stock').textContent = lowStockCount;
      document.getElementById('kpi-out-of-stock').textContent = outOfStockCount;
      document.getElementById('kpi-total-logs').textContent = auditLogsList.length;
    }

    function updateAlertBanner() {
      const criticalItems = productsList.filter(p => (Number(p.quantity) || 0) <= (Number(p.lowStockThreshold) || 5));
      const banner = document.getElementById('low-stock-alert-banner');
      const badge = document.getElementById('alert-items-badge');
      const desc = document.getElementById('alert-items-desc');

      if (criticalItems.length === 0) {
        banner.classList.add('hidden');
      } else {
        banner.classList.remove('hidden');
        badge.textContent = `${criticalItems.length} أصناف حرجة`;
        const names = criticalItems.slice(0, 3).map(p => `"${p.name}" (${p.quantity} متبقي)`).join('، ');
        desc.textContent = `الأصناف التي تتطلب تزويداً عاجلاً: ${names} ${criticalItems.length > 3 ? `و ${criticalItems.length - 3} أصناف أخرى.` : '.'}`;
      }
    }

    function showToast(title, message, type = 'success') {
      if (window.DawwerNotifications && typeof window.DawwerNotifications.show === 'function') {
        window.DawwerNotifications.show({
          title: title || 'المخزون وسجل التدقيق',
          message: message || '',
          type: type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success')
        });
        return;
      }
      const toast = document.getElementById('toast');
      const toastTitle = document.getElementById('toast-title');
      const toastMsg = document.getElementById('toast-message');
      const toastIcon = document.getElementById('toast-icon');

      if (!toast) return;

      toastTitle.textContent = title;
      toastMsg.textContent = message;

      if (type === 'error') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shrink-0';
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      } else if (type === 'info') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shrink-0';
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      } else {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-[#d6a950] text-[#153f2d] flex items-center justify-center font-bold shrink-0';
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
      }

      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 4000);
    }

    function initAuditEvents() {
      const btnExport = document.getElementById('btn-export-audit-csv');
      if (btnExport) btnExport.addEventListener('click', exportAuditLogCSV);

      const btnLowStock = document.getElementById('btn-filter-low-stock');
      if (btnLowStock) btnLowStock.addEventListener('click', filterByLowStockTab);

      const tabInv = document.getElementById('tab-btn-inventory') || document.getElementById('tab-inventory-btn');
      if (tabInv) tabInv.addEventListener('click', () => switchMainView('inventory'));

      const tabAud = document.getElementById('tab-btn-audit') || document.getElementById('tab-audit-btn');
      if (tabAud) tabAud.addEventListener('click', () => switchMainView('audit'));

      const btnBulkAdjust = document.getElementById('btn-bulk-adjust');
      if (btnBulkAdjust) btnBulkAdjust.addEventListener('click', openBulkAdjustModal);

      // Stock status filters
      const filterAll = document.getElementById('filter-all');
      if (filterAll) filterAll.addEventListener('click', () => filterStockStatus('ALL'));
      const filterLow = document.getElementById('filter-low');
      if (filterLow) filterLow.addEventListener('click', () => filterStockStatus('LOW'));
      const filterOut = document.getElementById('filter-out');
      if (filterOut) filterOut.addEventListener('click', () => filterStockStatus('OUT'));
      const filterIn = document.getElementById('filter-in');
      if (filterIn) filterIn.addEventListener('click', () => filterStockStatus('IN_STOCK'));

      document.querySelectorAll('[data-stock-filter]').forEach(btn => {
        btn.addEventListener('click', () => filterStockStatus(btn.dataset.stockFilter));
      });

      const searchInv = document.getElementById('search-inventory-input') || document.getElementById('search-inventory');
      if (searchInv) searchInv.addEventListener('input', handleSearchInventory);

      const filterAction = document.getElementById('audit-action-filter') || document.getElementById('audit-filter-action');
      if (filterAction) filterAction.addEventListener('change', handleFilterAudit);

      const filterDate = document.getElementById('audit-date-filter') || document.getElementById('audit-filter-period');
      if (filterDate) filterDate.addEventListener('change', handleFilterAudit);

      const searchAud = document.getElementById('search-audit-input') || document.getElementById('search-audit');
      if (searchAud) searchAud.addEventListener('input', handleSearchAudit);

      // Modal controls
      document.querySelectorAll('[data-action="close-stock-modal"]').forEach(btn => {
        btn.addEventListener('click', closeStockModal);
      });
      const btnCloseStock = document.getElementById('btn-close-stock-modal');
      if (btnCloseStock) btnCloseStock.addEventListener('click', closeStockModal);
      const btnCancelStock = document.getElementById('btn-cancel-stock-modal');
      if (btnCancelStock) btnCancelStock.addEventListener('click', closeStockModal);

      const formStock = document.getElementById('stock-modal-form') || document.getElementById('stock-adjust-form') || document.getElementById('form-stock-modal');
      if (formStock) formStock.addEventListener('submit', handleStockModalSubmit);

      document.querySelectorAll('[data-action="qty-preset"]').forEach(btn => {
        btn.addEventListener('click', () => applyQtyPreset(parseInt(btn.dataset.preset, 10)));
      });

      document.querySelectorAll('[data-action="close-audit-details-modal"]').forEach(btn => {
        btn.addEventListener('click', closeAuditDetailsModal);
      });
      const btnCloseAuditDet = document.getElementById('btn-close-audit-details-modal');
      if (btnCloseAuditDet) btnCloseAuditDet.addEventListener('click', closeAuditDetailsModal);

      // Delegated events for inventory table body
      const invTbody = document.getElementById('inventory-table-body');
      if (invTbody) {
        invTbody.addEventListener('click', (e) => {
          const adjBtn = e.target.closest('[data-action="adjust-stock"]');
          if (adjBtn && adjBtn.dataset.id && adjBtn.dataset.delta) {
            inlineAdjustStock(adjBtn.dataset.id, parseInt(adjBtn.dataset.delta, 10));
            return;
          }
          const openModalBtn = e.target.closest('[data-action="open-stock-modal"]');
          if (openModalBtn && openModalBtn.dataset.id) {
            openStockModal(openModalBtn.dataset.id);
            return;
          }
        });

        invTbody.addEventListener('change', (e) => {
          const target = e.target;
          if (target.dataset.action === 'set-stock' && target.dataset.id) {
            inlineSetStock(target.dataset.id, target.value);
            return;
          }
          if (target.dataset.action === 'set-threshold' && target.dataset.id) {
            inlineSetThreshold(target.dataset.id, target.value);
            return;
          }
        });
      }

      // Delegated events for audit table body
      const audTbody = document.getElementById('audit-table-body');
      if (audTbody) {
        audTbody.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="open-audit-details"]');
          if (btn && btn.dataset.id) {
            openAuditDetailsModal(btn.dataset.id);
            return;
          }
        });
      }
    }

    // Window exports
    window.switchMainView = switchMainView;
    window.filterByLowStockTab = filterByLowStockTab;
    window.filterStockStatus = filterStockStatus;
    window.handleSearchInventory = handleSearchInventory;
    window.inlineAdjustStock = inlineAdjustStock;
    window.inlineSetStock = inlineSetStock;
    window.inlineSetThreshold = inlineSetThreshold;
    window.openStockModal = openStockModal;
    window.openBulkAdjustModal = openBulkAdjustModal;
    window.closeStockModal = closeStockModal;
    window.applyQtyPreset = applyQtyPreset;
    window.handleStockModalSubmit = handleStockModalSubmit;
    window.handleFilterAudit = handleFilterAudit;
    window.handleSearchAudit = handleSearchAudit;
    window.openAuditDetailsModal = openAuditDetailsModal;
    window.closeAuditDetailsModal = closeAuditDetailsModal;
    window.exportAuditLogCSV = exportAuditLogCSV;
    window.showToast = showToast;

    let _auditInitialized = false;
    function bootstrapInventoryAudit() {
      if (_auditInitialized) return;
      _auditInitialized = true;

      loadData();

      const urlParams = new URLSearchParams(window.location.search);
      const requestedTab = urlParams.get('tab');
      const searchQuery = urlParams.get('search');

      if (requestedTab === 'audit') {
        switchMainView('audit');
      }

      if (searchQuery) {
        const searchInput = document.getElementById('search-inventory');
        if (searchInput) {
          searchInput.value = searchQuery;
          inventorySearchQuery = searchQuery.toLowerCase();
        }
      }

      renderAll();
      initAuditEvents();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrapInventoryAudit);
    } else {
      bootstrapInventoryAudit();
    }
