const JOBS_STORAGE_KEY = 'dawwer_ai_extraction_jobs';
    const CATALOG_STORAGE_KEY = 'dawwer_merchant_catalog_products';

    let allJobs = [];
    let activeJob = null;
    let draftItems = [];
    let selectedDraftIds = new Set();
    let currentDraftFilter = 'all';
    let draftSearchQuery = '';
    let showBoundingBoxes = true;

    let zoomScale = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startDragX = 0;
    let startDragY = 0;

    const DEFAULT_CATALOG_PRODUCTS = [];

    function generateShelfPlaceholderSVG(zoneName, count) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520" fill="#0f172a">
        <rect width="800" height="520" fill="#1e293b"/>
        <!-- Physical Shelf Framework Grid -->
        <line x1="30" y1="50" x2="770" y2="50" stroke="#334155" stroke-width="6"/>
        <line x1="30" y1="200" x2="770" y2="200" stroke="#334155" stroke-width="6"/>
        <line x1="30" y1="350" x2="770" y2="350" stroke="#334155" stroke-width="6"/>
        <line x1="30" y1="500" x2="770" y2="500" stroke="#334155" stroke-width="6"/>
        
        <!-- Uprights -->
        <line x1="30" y1="40" x2="30" y2="510" stroke="#475569" stroke-width="8"/>
        <line x1="770" y1="40" x2="770" y2="510" stroke="#475569" stroke-width="8"/>

        <!-- Camera / Vision HUD Icon -->
        <circle cx="400" cy="240" r="48" fill="#153f2d" opacity="0.8"/>
        <path d="M380 230h40l8 12h12a6 6 0 016 6v32a6 6 0 01-6 6h-68a6 6 0 01-6-6v-32a6 6 0 016-6h8l8-12z" stroke="#d6a950" stroke-width="2.5" fill="none"/>
        <circle cx="400" cy="254" r="10" stroke="#d6a950" stroke-width="2.5" fill="none"/>

        <text x="400" y="325" fill="#f8fafc" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">
          عرض الرف المسكن بالرؤية الحاسوبية (${zoneName || 'الرف المحدد'})
        </text>
        <text x="400" y="348" fill="#94a3b8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11" text-anchor="middle">
          ${count > 0 ? `تم تحديد ${count} صنفاً حقيقياً في هذه المعاينة` : 'بانتظار التقاط صورة جديدة للرف أو معالجة التحليل'}
        </text>
      </svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    const DEFAULT_JOBS_DATA = [];

    function isMockJob(job) {
      if (!job) return true;
      const mockIds = ['JOB-8942', 'JOB-8939', 'JOB-8935'];
      if (mockIds.includes(job.id)) return true;
      if (job.isMock) return true;
      if (Array.isArray(job.extractedItems)) {
        const hasMockBrand = job.extractedItems.some(it => {
          const name = (it.name || '').toLowerCase();
          return name.includes('نادك') || name.includes('كيري') || name.includes('nadec') || name.includes('kiri');
        });
        if (hasMockBrand) return true;
      }
      return false;
    }

    function cleanMockData() {
      try {
        ['dawwer_current_review_job', 'dawwer_current_draft_products', 'dawwer_latest_extraction_result'].forEach(k => {
          const raw = sessionStorage.getItem(k);
          if (raw && (raw.includes('نادك') || raw.includes('كيري') || raw.includes('JOB-8942') || raw.includes('JOB-8939'))) {
            sessionStorage.removeItem(k);
          }
        });

        const raw = localStorage.getItem(JOBS_STORAGE_KEY);
        if (raw && (raw.includes('نادك') || raw.includes('كيري') || raw.includes('JOB-8942') || raw.includes('JOB-8939'))) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(j => !isMockJob(j));
              localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(filtered));
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    function normalizeDraftProduct(item, index, jobContext) {
      const name = item.proposed_name || item.product_name || item.name || `صنف #${index + 1}`;
      const price = item.estimated_price !== undefined ? Number(item.estimated_price) : (Number(item.price) || 0);
      const sku = item.barcode_detected || item.sku || item.store_sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
      const category = item.category_hint || item.category || 'عام';
      const size = item.pack_size || item.size || '';
      const confidence = item.confidence_score !== undefined
        ? (item.confidence_score <= 1.0 ? Math.round(item.confidence_score * 100) : Math.round(item.confidence_score))
        : (item.confidence || 98);
      const box = item.bounding_box || item.box || {
        x: 10 + (index % 3) * 28,
        y: 15 + Math.floor(index / 3) * 30,
        w: 22,
        h: 25
      };

      const itemZone = item.zone || jobContext?.shelfLocation?.zone || 'Zone A';
      const itemAisle = item.aisle || jobContext?.shelfLocation?.aisle || 'Aisle 1';
      const itemRack = item.rack || jobContext?.shelfLocation?.rack || 'R1';
      const itemShelf = item.shelf || jobContext?.shelfLocation?.level || 'رف 1';
      const itemLabel = item.shelfLocation?.label || `${itemZone} > ${itemAisle} > ${itemRack} > ${itemShelf}`;

      return {
        id: item.id || `DRF-${jobContext?.id || 'JOB'}-${index + 1}`,
        serverId: item.id || null,
        name: name,
        brand: item.brand || '',
        size: size,
        sku: sku,
        price: price,
        originalPrice: price,
        confidence: confidence,
        category: category,
        shelfLocation: {
          zone: itemZone,
          aisle: itemAisle,
          rack: itemRack,
          level: itemShelf,
          label: itemLabel
        },
        box: box,
        status: item.status || 'Draft',
        hasDuplicateMatch: !!item.has_duplicate_match || !!item.hasDuplicateMatch,
        duplicateMatch: item.duplicate_match || item.duplicateMatch || null
      };
    }

    function normalizeServerJob(job) {
      const zone = job.zone || job.shelfLocation?.zone || 'Zone A';
      const aisle = job.aisle || job.shelfLocation?.aisle || 'Aisle 1';
      const rack = job.rack || job.shelfLocation?.rack || 'Rack 1';
      const level = job.shelf || job.shelf_level || job.shelfLocation?.level || 'Shelf 1';
      const label = job.shelfLocation?.label || `${zone} > ${aisle} > ${rack} > ${level}`;

      return {
        id: job.id,
        serverId: job.serverId || job.id,
        createdAt: job.created_at || job.createdAt || 'الآن',
        timestamp: job.timestamp || (job.created_at ? new Date(job.created_at).getTime() : Date.now()),
        shelfLocation: {
          zone,
          aisle,
          rack,
          level,
          label
        },
        thumbnail: job.image_url || job.thumbnail || '',
        imagesCount: job.imagesCount || 1,
        status: (job.status === 'REVIEW_REQUIRED' || job.status === 'Review Required') ? 'Review Required' :
                (job.status === 'COMPLETED' || job.status === 'Completed') ? 'Completed' :
                (job.status === 'PROCESSING' || job.status === 'Processing') ? 'Processing' :
                (job.status === 'QUEUED' || job.status === 'Queued') ? 'Queued' :
                (job.status || 'Review Required'),
        detectedCount: job.extracted_drafts_count !== undefined ? job.extracted_drafts_count : (job.detectedCount || job.extractedItems?.length || 0),
        confidence: job.confidence || 98.4,
        extractedItems: Array.isArray(job.extractedItems) ? job.extractedItems : []
      };
    }

    function initCatalogStorage() {
      try {
        if (!localStorage.getItem(CATALOG_STORAGE_KEY)) {
          localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(DEFAULT_CATALOG_PRODUCTS));
        }

        // Try syncing real products from server catalog if available
        if (typeof ApiClient !== 'undefined' && ApiClient.products && ApiClient.products.list) {
          const storeId = ApiClient.getActiveStoreId();
          ApiClient.products.list(storeId, { limit: 100 }).then(res => {
            const list = res?.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(list) && list.length > 0) {
              const mapped = list.map(p => ({
                id: p.id || p.store_sku,
                name: p.product_name || p.name,
                sku: p.store_sku || p.sku,
                category: p.category || 'عام',
                price: Number(p.price) || 0,
                isAvailable: p.stock_status !== 'OUT_OF_STOCK',
                location: {
                  zone: p.zone || 'المنطقة أ',
                  aisle: p.aisle || 'ممر 01',
                  rack: p.rack || 'R1',
                  shelf: p.shelf || 'رف 1'
                },
                status: 'Published'
              }));
              localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(mapped));
            }
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Error initializing catalog storage:', e);
      }
    }

    function loadJobsData() {
      // 1. Purge ANY mock data from sessionStorage and localStorage
      cleanMockData();

      // 2. Try reading from sessionStorage (current review job just passed from ai-capture)
      let sessionJob = null;
      try {
        const s = sessionStorage.getItem('dawwer_current_review_job');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed && parsed.id && !isMockJob(parsed)) {
            sessionJob = parsed;
          }
        }
      } catch (e) {}

      // 3. Read all jobs from localStorage
      try {
        const stored = localStorage.getItem(JOBS_STORAGE_KEY);
        if (stored) {
          allJobs = JSON.parse(stored);
        } else {
          allJobs = [];
        }
      } catch (e) {
        allJobs = [];
      }

      // Purge any legacy mock jobs completely and normalize
      if (Array.isArray(allJobs)) {
        allJobs = allJobs.filter(j => !isMockJob(j)).map(normalizeServerJob);
      } else {
        allJobs = [];
      }

      // If sessionJob exists, prepend or update it in allJobs
      if (sessionJob && sessionJob.id) {
        const idx = allJobs.findIndex(j => j.id === sessionJob.id);
        if (idx !== -1) {
          allJobs[idx] = sessionJob;
        } else {
          allJobs.unshift(sessionJob);
        }
      }

      saveJobsData();
      populateJobSelector();

      if (typeof ApiClient !== 'undefined' && ApiClient.shelfJobs) {
        const storeId = ApiClient.getActiveStoreId();
        ApiClient.shelfJobs.list(storeId).then(res => {
          const sJobs = res?.data || (Array.isArray(res) ? res : null);
          if (Array.isArray(sJobs) && sJobs.length > 0) {
            const existingIds = new Set(allJobs.map(j => String(j.id)));
            let updated = false;
            sJobs.forEach(sj => {
              if (!existingIds.has(String(sj.id))) {
                allJobs.unshift(normalizeServerJob(sj));
                updated = true;
              }
            });
            if (updated) {
              saveJobsData();
              populateJobSelector();
            }
          }
        }).catch(() => {});
      }
    }

    function saveJobsData() {
      try {
        localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(allJobs));
      } catch (e) {
        console.error('Error saving jobs data:', e);
      }
    }

    function populateJobSelector() {
      const selector = document.getElementById('job-selector');
      if (!selector) return;
      if (!Array.isArray(allJobs) || allJobs.length === 0) {
        selector.innerHTML = '<option value="">لا توجد عمليات مسجلة</option>';
        return;
      }
      selector.innerHTML = allJobs.map(job => `
        <option value="${job.id}">
          ${job.id} (${job.shelfLocation?.zone || 'الرف'} - ${job.detectedCount || job.extractedItems?.length || 0} صنف) - ${job.status === 'Completed' ? '✓ مكتملة' : 'بانتظار المراجعة'}
        </option>
      `).join('');
    }

    function handleJobSwitch(jobId) {
      setActiveJob(jobId);
    }

    function updateEmptyJobUI() {
      const idEl = document.getElementById('active-job-id');
      const shelfEl = document.getElementById('active-job-shelf');
      const confEl = document.getElementById('active-job-confidence');
      const badge = document.getElementById('active-job-status-badge');
      const imgEl = document.getElementById('shelf-source-img');

      if (idEl) idEl.textContent = '-';
      if (shelfEl) shelfEl.textContent = 'لا توجد عملية نشطة';
      if (confEl) confEl.textContent = '-';
      if (badge) {
        badge.className = 'px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold';
        badge.textContent = 'لا توجد عمليات';
      }
      if (imgEl) imgEl.src = generateShelfPlaceholderSVG('لا توجد عملية', 0);
    }

    function setActiveJob(jobId) {
      if (!Array.isArray(allJobs) || allJobs.length === 0) {
        activeJob = null;
        draftItems = [];
        selectedDraftIds.clear();
        updateEmptyJobUI();
        renderBoundingBoxes();
        renderDraftCards();
        updateSelectionSummary();
        return;
      }

      activeJob = allJobs.find(j => j.id === jobId) || allJobs[0];
      if (!activeJob) {
        updateEmptyJobUI();
        return;
      }

      const selector = document.getElementById('job-selector');
      if (selector) selector.value = activeJob.id;
      const idEl = document.getElementById('active-job-id');
      const shelfEl = document.getElementById('active-job-shelf');
      const confEl = document.getElementById('active-job-confidence');
      const badge = document.getElementById('active-job-status-badge');

      if (idEl) idEl.textContent = activeJob.id;
      if (shelfEl) shelfEl.textContent = activeJob.shelfLocation ? activeJob.shelfLocation.label : 'الرف المحدد';
      if (confEl) confEl.textContent = (activeJob.confidence ? activeJob.confidence + '%' : '98.4%');

      if (badge) {
        if (activeJob.status === 'Completed') {
          badge.className = 'px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30';
          badge.textContent = '✓ مكتملة ومعتمدة في الكتالوج';
        } else {
          badge.className = 'px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30';
          badge.textContent = 'بانتظار المراجعة والاعتماد';
        }
      }

      // Check if activeJob.extractedItems is missing or empty, check sessionStorage
      if (!Array.isArray(activeJob.extractedItems) || activeJob.extractedItems.length === 0) {
        try {
          const sDrafts = sessionStorage.getItem('dawwer_current_draft_products');
          if (sDrafts) {
            const parsed = JSON.parse(sDrafts);
            if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(p => (p.name && (p.name.includes('نادك') || p.name.includes('كيري'))))) {
              activeJob.extractedItems = parsed;
            }
          }
        } catch (e) {}
      }

      // If activeJob still has no extracted items, and has a server ID, fetch live from API
      if ((!Array.isArray(activeJob.extractedItems) || activeJob.extractedItems.length === 0) && typeof ApiClient !== 'undefined' && ApiClient.draftProducts) {
        const storeId = ApiClient.getActiveStoreId();
        const targetJobId = activeJob.serverId || activeJob.id;
        if (storeId && targetJobId) {
          ApiClient.draftProducts.list(storeId, { shelf_job_id: targetJobId, limit: 100 }).then(res => {
            const liveDrafts = res?.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(liveDrafts) && liveDrafts.length > 0) {
              activeJob.extractedItems = liveDrafts.map((item, idx) => normalizeDraftProduct(item, idx, activeJob));
              saveJobsData();
              setActiveJob(activeJob.id);
            }
          }).catch(err => console.warn('[Failed to fetch live drafts for activeJob]', err));
        }
      }

      draftItems = (activeJob.extractedItems || []).map((item, index) => normalizeDraftProduct(item, index, activeJob));
      selectedDraftIds = new Set(draftItems.map(d => d.id));

      resetZoomAndPan();

      const imgEl = document.getElementById('shelf-source-img');
      if (imgEl) {
        imgEl.src = activeJob.thumbnail || generateShelfPlaceholderSVG(activeJob.shelfLocation?.zone || 'Zone A', draftItems.length);
      }

      renderBoundingBoxes();
      renderDraftCards();
      updateSelectionSummary();
    }

    function handleZoom(delta) {
      const newScale = Math.min(Math.max(0.6, zoomScale + delta), 3.0);
      zoomScale = +(newScale.toFixed(2));
      applyTransform();
    }

    function resetZoomAndPan() {
      zoomScale = 1.0;
      panX = 0;
      panY = 0;
      applyTransform();
    }

    function applyTransform() {
      const content = document.getElementById('zoom-content');
      const badge = document.getElementById('zoom-badge');
      if (content) {
        content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
      }
      if (badge) {
        badge.textContent = Math.round(zoomScale * 100) + '%';
      }
    }

    function handleWheelZoom(e) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      handleZoom(delta);
    }

    function handleMouseDown(e) {
      if (e.target.closest('.bounding-box')) return; 
      isDragging = true;
      startDragX = e.clientX - panX;
      startDragY = e.clientY - panY;
      document.getElementById('zoom-viewport').classList.add('is-dragging');
    }

    function handleMouseMove(e) {
      const rect = document.getElementById('zoom-viewport').getBoundingClientRect();
      const hud = document.getElementById('image-coords-hud');
      if (hud) {
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        hud.textContent = `X: ${x}px | Y: ${y}px`;
      }

      if (!isDragging) return;
      panX = e.clientX - startDragX;
      panY = e.clientY - startDragY;
      applyTransform();
    }

    function handleMouseUp() {
      isDragging = false;
      const vp = document.getElementById('zoom-viewport');
      if (vp) vp.classList.remove('is-dragging');
    }

    function toggleBoundingBoxes() {
      showBoundingBoxes = !showBoundingBoxes;
      const layer = document.getElementById('image-boxes-layer');
      const btnText = document.getElementById('btn-toggle-boxes-text');
      const btn = document.getElementById('btn-toggle-boxes');

      if (showBoundingBoxes) {
        layer.classList.remove('hidden');
        btnText.textContent = 'المربعات: مفعّلة';
        btn.className = 'px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1';
      } else {
        layer.classList.add('hidden');
        btnText.textContent = 'المربعات: مخفية';
        btn.className = 'px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 text-[11px] font-bold transition flex items-center gap-1';
      }
    }

    function renderBoundingBoxes() {
      const layer = document.getElementById('image-boxes-layer');
      if (!layer) return;

      layer.innerHTML = draftItems.map((item, index) => {
        const box = item.box || { x: 10, y: 10, w: 20, h: 20 };
        const isDuplicate = item.hasDuplicateMatch;
        return `
          <div 
            class="bounding-box ${isDuplicate ? 'duplicate-box' : ''}" 
            id="bbox-${item.id}"
            style="left: ${box.x}%; top: ${box.y}%; width: ${box.w}%; height: ${box.h}%;"
            data-box-id="${item.id}"
          >
            <div class="bounding-tag">
              #${index + 1} ${item.name.split(' ')[0]} (${item.price.toFixed(2)} ر.س)
            </div>
          </div>
        `;
      }).join('');
    }

    function handleBoxHover(itemId, isHovering) {
      const bbox = document.getElementById(`bbox-${itemId}`);
      const card = document.getElementById(`card-${itemId}`);

      if (bbox) {
        if (isHovering) bbox.classList.add('active');
        else bbox.classList.remove('active');
      }
      if (card) {
        if (isHovering) card.classList.add('card-focused');
        else card.classList.remove('card-focused');
      }
    }

    function handleBoxClick(itemId) {
      const card = document.getElementById(`card-${itemId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        handleBoxHover(itemId, true);
        setTimeout(() => handleBoxHover(itemId, false), 1500);
      }
    }

    function filterDrafts(filter) {
      currentDraftFilter = filter;
      ['all', 'duplicates', 'high'].forEach(f => {
        const btn = document.getElementById(`filter-${f}`);
        if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      });
      const activeBtn = document.getElementById(`filter-${filter === 'duplicates' ? 'duplicates' : filter === 'high_conf' ? 'high' : 'all'}`);
      if (activeBtn) activeBtn.className = 'px-3 py-1.5 rounded-xl bg-[#153f2d] text-white transition shadow-2xs font-bold';

      renderDraftCards();
    }

    function handleDraftSearch() {
      draftSearchQuery = (document.getElementById('draft-search-input').value || '').trim().toLowerCase();
      renderDraftCards();
    }

    function getFilteredDrafts() {
      return draftItems.filter(item => {
        if (currentDraftFilter === 'duplicates' && !item.hasDuplicateMatch) return false;
        if (currentDraftFilter === 'high_conf' && item.confidence < 95) return false;
        if (draftSearchQuery) {
          const matchName = item.name.toLowerCase().includes(draftSearchQuery);
          const matchSku = item.sku.toLowerCase().includes(draftSearchQuery);
          const matchPrice = item.price.toString().includes(draftSearchQuery);
          return matchName || matchSku || matchPrice;
        }
        return true;
      });
    }

    function renderDraftCards() {
      const container = document.getElementById('draft-cards-container');
      const filtered = getFilteredDrafts();

      const countAllEl = document.getElementById('draft-count-all');
      const countDupEl = document.getElementById('draft-count-dup');
      const totalCountEl = document.getElementById('active-job-items-count');

      if (countAllEl) countAllEl.textContent = draftItems.length;
      if (countDupEl) countDupEl.textContent = draftItems.filter(d => d.hasDuplicateMatch).length;
      if (totalCountEl) totalCountEl.textContent = `${draftItems.length} صنف`;

      if (filtered.length === 0) {
        if (draftItems.length === 0) {
          container.innerHTML = `
            <div class="p-8 sm:p-12 text-center bg-white rounded-3xl border border-amber-200 shadow-2xs">
              <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h4 class="text-base font-bold text-slate-800 mb-1.5">لم يتم استخراج أي منتجات لهذه العملية</h4>
              <p class="text-xs text-slate-500 max-w-md mx-auto mb-6">لم يرجع خادم الذكاء الاصطناعي أية منتجات مقروءة من هذه الصورة، أو لم يتم تحليل الرف بعد. يمكنك التقاط صورة جديدة بإضاءة واضحة أو إضافة الأصناف يدوياً.</p>
              <div class="flex flex-wrap items-center justify-center gap-3">
                <a href="ai-capture.html" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#153f2d] text-white text-xs font-bold hover:bg-[#0f2d20] transition shadow-xs">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span>التقاط صورة جديدة للرف</span>
                </a>
                <button type="button" onclick="document.getElementById('btn-add-manual-draft')?.click()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  <span>إضافة صنف يدوياً</span>
                </button>
              </div>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div class="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <h4 class="text-sm font-bold text-slate-700">لا توجد أصناف مطابقة للبحث أو التصفية</h4>
              <p class="text-xs text-slate-400 mt-1">جرب تغيير معايير البحث أو اختيار تبويب تصفية آخر</p>
            </div>
          `;
        }
        return;
      }

      container.innerHTML = filtered.map((item, index) => {
        const isSelected = selectedDraftIds.has(item.id);
        const hasDup = item.hasDuplicateMatch && item.duplicateMatch;
        const resolution = hasDup ? item.duplicateMatch.resolution : null;

        let duplicateBannerHTML = '';
        if (hasDup) {
          if (!resolution) {
            duplicateBannerHTML = `
              <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 mb-3.5">
                <div class="flex items-start gap-2.5">
                  <div class="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-black text-amber-900">تنبيه مطابقة ذكية (Potential Catalog Match Found)</span>
                      <span class="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md">يتطلب قرارك</span>
                    </div>
                    <p class="text-[11px] text-amber-800 mt-1">
                      تم العثور على صنف مطابق مسبقاً في الكتالوج: <strong class="font-bold">"${item.duplicateMatch.catalogName}"</strong> (${item.duplicateMatch.catalogSku}).
                    </p>

                    <div class="grid grid-cols-2 gap-2 my-2 bg-white/80 p-2 rounded-xl border border-amber-200 text-[11px]">
                      <div>
                        <span class="text-slate-500">سعر الكتالوج الحالي:</span>
                        <span class="font-bold text-slate-800 mr-1">${item.duplicateMatch.catalogPrice.toFixed(2)} ر.س</span>
                      </div>
                      <div>
                        <span class="text-slate-500">السعر المقروء من الرف:</span>
                        <span class="font-bold text-amber-900 mr-1">${item.price.toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mt-2.5">
                      <button 
                        type="button" 
                        data-action="resolve-dup" data-mode="merged" data-id="${item.id}" 
                        class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                        <span>دمج وتحديث الصنف الحالي بالكتالوج</span>
                      </button>

                      <button 
                        type="button" 
                        data-action="resolve-dup" data-mode="created_new" data-id="${item.id}" 
                        class="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] transition active:scale-95"
                      >
                        <span>إنشاء كمنتج جديد مستقل</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          } else if (resolution === 'merged') {
            duplicateBannerHTML = `
              <div class="bg-emerald-50 border border-emerald-300 rounded-2xl p-2.5 mb-3 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-emerald-800 font-bold text-[11px]">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>تم تعيين القرار: دمج وتحديث الصنف الحالي (${item.duplicateMatch.catalogSku})</span>
                </div>
                <button type="button" data-action="resolve-dup" data-mode="null" data-id="${item.id}" class="text-[10px] text-slate-500 hover:text-slate-800 underline">تغيير القرار</button>
              </div>
            `;
          } else {
            duplicateBannerHTML = `
              <div class="bg-sky-50 border border-sky-300 rounded-2xl p-2.5 mb-3 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-sky-800 font-bold text-[11px]">
                  <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  <span>تم تعيين القرار: اعتماد كصنف جديد مستقل</span>
                </div>
                <button type="button" data-action="resolve-dup" data-mode="null" data-id="${item.id}" class="text-[10px] text-slate-500 hover:text-slate-800 underline">تغيير القرار</button>
              </div>
            `;
          }
        }

        return `
          <div 
            id="card-${item.id}"
            class="bg-white rounded-3xl border ${hasDup && !resolution ? 'border-amber-300' : 'border-slate-200/90'} shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-4"
            data-card-id="${item.id}"
          >
            <!-- Card Header Bar -->
            <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">

              <div class="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  ${isSelected ? 'checked' : ''} 
                  data-action="toggle-draft-select" data-id="${item.id}"
                  class="w-4 h-4 rounded text-[#153f2d] focus:ring-[#153f2d] accent-[#153f2d] cursor-pointer"
                >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-[#edf5f0] text-[#153f2d] font-black text-xs flex items-center justify-center">
                    #${index + 1}
                  </span>
                  <span class="text-xs font-mono font-bold text-slate-400">${item.id}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- AI Confidence Badge -->
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${item.confidence >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} text-[11px] font-bold">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  <span>دقة ${item.confidence}%</span>
                </span>

                <!-- Draft State Invariant Badge -->
                <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                  مسودة AI
                </span>

                <!-- Quick Discard Action -->
                <button 
                  type="button" 
                  data-action="discard-single" data-id="${item.id}" 
                  class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"
                  title="استبعاد هذا الصنف"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>

            </div>

            <!-- Duplicate Alert Banner -->
            ${duplicateBannerHTML}

            <!-- Editable Fields Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">

              <!-- Product Name Input (Span 7) -->
              <div class="sm:col-span-7">
                <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم المنتج المستخرج <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value="${item.name}" 
                  data-field="name" data-id="${item.id}"
                  class="w-full p-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d] outline-none"
                >
              </div>

              <!-- Read Price Input (Span 5) -->
              <div class="sm:col-span-5">
                <label class="block text-[11px] font-bold text-slate-600 mb-1">السعر المقروء (OCR Price) <span class="text-red-500">*</span></label>
                <div class="relative">
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value="${item.price.toFixed(2)}" 
                    data-field="price" data-id="${item.id}"
                    class="w-full p-2 pl-12 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-black text-[#153f2d] focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d] outline-none"
                  >
                  <span class="absolute left-2.5 top-2 text-[11px] font-bold text-[#d6a950]">ر.س</span>
                </div>
              </div>

              <!-- Barcode / SKU Input (Span 6) -->
              <div class="sm:col-span-6">
                <label class="block text-[11px] font-bold text-slate-600 mb-1">الباركود المكتشف / SKU</label>
                <div class="relative">
                  <input 
                    type="text" 
                    value="${item.sku}" 
                    data-field="sku" data-id="${item.id}"
                    class="w-full p-2 pr-7 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono font-bold text-slate-700 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d] outline-none"
                  >
                  <svg class="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                </div>
              </div>

              <!-- Category Dropdown (Span 6) -->
              <div class="sm:col-span-6">
                <label class="block text-[11px] font-bold text-slate-600 mb-1">التصنيف</label>
                <select 
                  data-field="category" data-id="${item.id}"
                  class="w-full p-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d] outline-none"
                >
                  <option value="الألبان والمبردات" ${item.category === 'الألبان والمبردات' ? 'selected' : ''}>الألبان والمبردات</option>
                  <option value="المخبوزات" ${item.category === 'المخبوزات' ? 'selected' : ''}>المخبوزات</option>
                  <option value="المعلبات" ${item.category === 'المعلبات' ? 'selected' : ''}>المعلبات</option>
                  <option value="المشروبات" ${item.category === 'المشروبات' ? 'selected' : ''}>المشروبات</option>
                  <option value="منتجات طازجة" ${item.category === 'منتجات طازجة' ? 'selected' : ''}>منتجات طازجة</option>
                  <option value="زيوت ومؤونة" ${item.category === 'زيوت ومؤونة' ? 'selected' : ''}>زيوت ومؤونة</option>
                  <option value="عام" ${item.category === 'عام' ? 'selected' : ''}>عام</option>
                </select>
              </div>

              <!-- Assigned Shelf Location Context (Span 12) -->
              <div class="sm:col-span-12 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#153f2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span class="text-[11px] text-slate-500 font-medium">الرف الهندسي المسكن:</span>
                  <span class="text-xs font-bold text-[#153f2d]">${item.shelfLocation?.label || activeJob.shelfLocation?.label || 'الرف الرئيسي'}</span>
                </div>
                <span class="text-[10px] text-emerald-700 bg-emerald-100/70 font-bold px-2 py-0.5 rounded-md">مُعين آلياً من سياق الصورة</span>
              </div>

            </div>

          </div>
        `;
      }).join('');
    }

    function updateDraftField(itemId, field, value) {
      const item = draftItems.find(d => d.id === itemId);
      if (item) {
        item[field] = value;
        if (activeJob && activeJob.extractedItems) {
          const parentItem = activeJob.extractedItems.find(x => (x.id === itemId || x.sku === item.sku));
          if (parentItem) parentItem[field] = value;
          saveJobsData();
        }
        renderBoundingBoxes();
      }
    }

    function resolveDuplicate(itemId, resolution) {
      const item = draftItems.find(d => d.id === itemId);
      if (item && item.duplicateMatch) {
        item.duplicateMatch.resolution = resolution;
        renderDraftCards();
        showToast(
          resolution === 'merged' ? 'تم اختيار الدمج' : resolution === 'created_new' ? 'تم اختيار صنف جديد' : 'تمت إعادة تعيين القرار',
          resolution === 'merged' ? 'سيتم تحديث سعر وموقع الصنف المسجل بالكتالوج عند النشر' : 'سيتم إنشاء باركود جديد منفصل بالكتالوج'
        );
      }
    }

    function toggleDraftSelection(itemId, isChecked) {
      if (isChecked) selectedDraftIds.add(itemId);
      else selectedDraftIds.delete(itemId);
      updateSelectionSummary();
    }

    function toggleSelectAllDrafts(isChecked) {
      if (isChecked) {
        draftItems.forEach(d => selectedDraftIds.add(d.id));
      } else {
        selectedDraftIds.clear();
      }
      renderDraftCards();
      updateSelectionSummary();
    }

    function updateSelectionSummary() {
      const total = draftItems.length;
      const count = selectedDraftIds.size;
      const badgeText = document.getElementById('selected-badge-text');
      const selectAllCb = document.getElementById('select-all-drafts');
      const publishBtn = document.getElementById('btn-publish-catalog');
      const discardBtn = document.getElementById('btn-discard-selected');

      if (badgeText) badgeText.textContent = `${count} من أصل ${total} أصناف محددة للنشر`;
      if (selectAllCb) {
        selectAllCb.checked = (count === total && total > 0);
        selectAllCb.indeterminate = (count > 0 && count < total);
      }
      if (publishBtn) publishBtn.disabled = (count === 0);
      if (discardBtn) discardBtn.disabled = (count === 0);
    }

    function discardSingleDraft(itemId) {
      if (!confirm('هل أنت متأكد من استبعاد هذا الصنف؟')) return;
      draftItems = draftItems.filter(d => d.id !== itemId);
      selectedDraftIds.delete(itemId);
      renderBoundingBoxes();
      renderDraftCards();
      updateSelectionSummary();
      showToast('تم استبعاد الصنف', 'تمت إزالة الصنف من قائمة المسودات المستخرجة', 'info');
    }

    function discardSelectedDrafts() {
      if (selectedDraftIds.size === 0) return;
      if (!confirm(`هل أنت متأكد من استبعاد ${selectedDraftIds.size} أصناف محددة؟`)) return;

      const discardedCount = selectedDraftIds.size;
      draftItems = draftItems.filter(d => !selectedDraftIds.has(d.id));
      selectedDraftIds.clear();

      renderBoundingBoxes();
      renderDraftCards();
      updateSelectionSummary();
      showToast('تم استبعاد الأصناف المحددة', `تمت إزالة ${discardedCount} أصناف من المسودة`, 'info');
    }

    function openAddManualDraftModal() {
      document.getElementById('add-manual-form').reset();
      document.getElementById('manual-sku').value = `MAN-${Math.floor(100000 + Math.random() * 900000)}`;
      document.getElementById('add-manual-modal').classList.remove('hidden');
    }

    function closeAddManualModal() {
      document.getElementById('add-manual-modal').classList.add('hidden');
    }

    function handleManualDraftSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('manual-name').value.trim();
      const sku = (document.getElementById('manual-sku').value || `MAN-${Date.now()}`).trim().toUpperCase();
      const price = parseFloat(document.getElementById('manual-price').value) || 0;
      const category = document.getElementById('manual-category').value;
      const size = document.getElementById('manual-size').value.trim();

      const newDraft = {
        id: `DRF-MAN-${Date.now()}`,
        name,
        brand: name.split(' ')[0] || 'عام',
        size,
        sku,
        price,
        originalPrice: price,
        confidence: 100,
        category,
        shelfLocation: { ...activeJob.shelfLocation },
        box: { x: 45, y: 45, w: 15, h: 20 },
        status: 'Draft',
        hasDuplicateMatch: false
      };

      draftItems.unshift(newDraft);
      selectedDraftIds.add(newDraft.id);
      closeAddManualModal();

      renderBoundingBoxes();
      renderDraftCards();
      updateSelectionSummary();
      showToast('تمت إضافة الصنف بنجاح', `تم إدراج "${name}" كمسودة جاهزة للنشر`, 'success');
    }

    async function publishSelectedToCatalog() {
      if (selectedDraftIds.size === 0) {
        showToast('يرجى تحديد صنف واحد على الأقل للنشر', '', 'error');
        return;
      }

      const storeId = typeof ApiClient !== 'undefined' ? ApiClient.getActiveStoreId() : null;
      const itemsToPublish = draftItems.filter(d => selectedDraftIds.has(d.id));
      const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');

      let catalog = [];
      try {
        const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
        catalog = stored ? JSON.parse(stored) : [];
      } catch (e) {
        catalog = [];
      }

      let newlyCreatedCount = 0;
      let mergedCount = 0;

      // 1. Commit each item to the live FastAPI backend & local catalog storage
      for (const item of itemsToPublish) {
        const cleanZone = item.shelfLocation?.zone || activeJob?.shelfLocation?.zone || "المنطقة أ";
        const rawAisle = item.shelfLocation?.aisle || activeJob?.shelfLocation?.aisle || "01";
        const cleanAisle = String(rawAisle).replace(/[^0-9]/g, '') || "01";
        const rawRack = item.shelfLocation?.rack || activeJob?.shelfLocation?.rack || "1";
        const cleanRack = String(rawRack).replace(/[^0-9]/g, '') || "1";
        const rawShelf = item.shelfLocation?.level || activeJob?.shelfLocation?.level || "1";
        const cleanShelf = String(rawShelf).replace(/[^0-9]/g, '') || "1";
        const mapTarget = `${cleanZone} - ممر ${cleanAisle} - رف ${cleanShelf}`;

        const livePayload = {
          store_sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
          product_name: item.name,
          category: item.category || 'عام',
          price: Number(item.price) || 0,
          quantity: 10,
          stock_status: "IN_STOCK",
          zone: cleanZone,
          aisle: cleanAisle,
          rack: cleanRack,
          shelf: cleanShelf,
          map_target: mapTarget
        };

        // Live API call to FastAPI backend
        if (typeof ApiClient !== 'undefined' && ApiClient.products && ApiClient.products.create) {
          try {
            await ApiClient.products.create(storeId, livePayload, { suppressToastOnError: true, throwOnError: false });
          } catch (e) {
            console.warn('Live API product create note:', e.message || e);
          }
        }

        // Live draft approve call if draft product has serverId
        if (item.serverId && typeof ApiClient !== 'undefined' && ApiClient.draftProducts && ApiClient.draftProducts.approve) {
          try {
            await ApiClient.draftProducts.approve(storeId, item.serverId).catch(() => {});
          } catch (e) {}
        }

        if (item.hasDuplicateMatch && item.duplicateMatch?.resolution === 'merged') {
          const matchId = item.duplicateMatch.catalogId;
          const matchSku = item.duplicateMatch.catalogSku;
          const existingIdx = catalog.findIndex(p => p.id === matchId || p.sku === matchSku);

          if (existingIdx !== -1) {
            catalog[existingIdx] = {
              ...catalog[existingIdx],
              price: item.price,
              status: 'Published',
              isAvailable: true,
              location: {
                zone: cleanZone,
                aisle: `ممر ${cleanAisle}`,
                rack: `R${cleanRack}`,
                shelf: `رف ${cleanShelf}`
              },
              updatedAt: nowFormatted
            };
            mergedCount++;
          } else {
            catalog.unshift(createCatalogEntryFromDraft(item, nowFormatted));
            newlyCreatedCount++;
          }
        } else {
          catalog.unshift(createCatalogEntryFromDraft(item, nowFormatted));
          newlyCreatedCount++;
        }

        item.status = 'Published';
      }

      try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
      } catch (e) {
        console.error('Error saving catalog:', e);
      }

      if (activeJob) {
        activeJob.status = 'Completed';
        if (activeJob.extractedItems) {
          activeJob.extractedItems.forEach(xi => {
            if (selectedDraftIds.has(xi.id)) {
              xi.status = 'Published';
            }
          });
        }
        saveJobsData();
      }

      // Batch approve draft products in backend
      if (typeof ApiClient !== 'undefined' && ApiClient.draftProducts && selectedDraftIds.size > 0) {
        ApiClient.draftProducts.batchApprove(storeId, Array.from(selectedDraftIds)).catch(e => console.warn('Live API draft batchApprove:', e));
      }

      try {
        const storedLogs = localStorage.getItem('dawwer_merchant_audit_log');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        const now = new Date();
        const formattedTime = 'اليوم، ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        logs.unshift({
          id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
          timestamp: Date.now(),
          formattedTime,
          actionType: 'Catalog Publication',
          target: `${activeJob ? activeJob.id : 'الرف'} (${newlyCreatedCount + mergedCount} صنف)`,
          targetSku: activeJob ? activeJob.id : 'BATCH',
          performedBy: 'مدير المتجر (Dawwer Merchant)',
          changeDelta: `نشر ${newlyCreatedCount + mergedCount} صنف (${newlyCreatedCount} جديد + ${mergedCount} مدمج)`,
          details: `اعتماد نتائج الفحص والمطابقة البصرية وتسكين الأصناف بالرف ${activeJob?.shelfLocation?.label || 'المحدد'}`
        });
        localStorage.setItem('dawwer_merchant_audit_log', JSON.stringify(logs));
      } catch (e) {
        console.error('Error writing audit log:', e);
      }

      const totalPublished = newlyCreatedCount + mergedCount;
      const countEl = document.getElementById('success-count');
      const shelfEl = document.getElementById('success-shelf');
      if (countEl) countEl.textContent = `${totalPublished} صنف (${newlyCreatedCount} جديد + ${mergedCount} مدمج)`;
      if (shelfEl) shelfEl.textContent = activeJob?.shelfLocation?.label || 'الرف المحدد';
      
      const successModal = document.getElementById('publish-success-modal');
      if (successModal) successModal.classList.remove('hidden');

      const badge = document.getElementById('active-job-status-badge');
      if (badge) {
        badge.className = 'px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30';
        badge.textContent = '✓ مكتملة ومعتمدة في الكتالوج';
      }

      renderDraftCards();
      renderBoundingBoxes();
      updateSelectionSummary();

      showToast('تم النشر في الكتالوج بنجاح!', `تم نشر ${totalPublished} صنفاً في كتالوج المتجر وتسكين مواقعها بنجاح`, 'success');
    }

    function createCatalogEntryFromDraft(item, timestamp) {
      return {
        id: `prod-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: item.name,
        sku: item.sku,
        category: item.category || 'الألبان والمبردات',
        price: item.price,
        isAvailable: true,
        status: 'Published',
        location: {
          zone: item.shelfLocation?.zone || activeJob.shelfLocation?.zone || 'Zone A',
          aisle: item.shelfLocation?.aisle || activeJob.shelfLocation?.aisle || 'Aisle 1',
          rack: item.shelfLocation?.rack || activeJob.shelfLocation?.rack || 'R1',
          shelf: item.shelfLocation?.level || activeJob.shelfLocation?.level || 'رف 1'
        },
        updatedAt: timestamp
      };
    }

    function showToast(title, message, type = 'success') {
      if (window.DawwerNotifications && typeof window.DawwerNotifications.show === 'function') {
        window.DawwerNotifications.show({
          title: title || 'مراجعة واعتماد المسودات',
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

    function initReviewEvents() {
      const jobSelector = document.getElementById('job-selector');
      if (jobSelector) {
        jobSelector.addEventListener('change', (e) => handleJobSwitch(e.target.value));
      }

      const btnAddManual = document.getElementById('btn-add-manual-draft');
      if (btnAddManual) btnAddManual.addEventListener('click', openAddManualDraftModal);
      const btnAddManualHeader = document.getElementById('btn-add-manual-draft-header');
      if (btnAddManualHeader) btnAddManualHeader.addEventListener('click', openAddManualDraftModal);

      const btnToggleBoxes = document.getElementById('btn-toggle-boxes');
      if (btnToggleBoxes) btnToggleBoxes.addEventListener('click', toggleBoundingBoxes);

      const btnZoomOut = document.getElementById('btn-zoom-out');
      if (btnZoomOut) btnZoomOut.addEventListener('click', () => handleZoom(-0.25));

      const btnZoomIn = document.getElementById('btn-zoom-in');
      if (btnZoomIn) btnZoomIn.addEventListener('click', () => handleZoom(0.25));

      const btnZoomReset = document.getElementById('btn-zoom-reset');
      if (btnZoomReset) btnZoomReset.addEventListener('click', resetZoomAndPan);

      const canvasContainer = document.getElementById('canvas-container');
      if (canvasContainer) {
        canvasContainer.addEventListener('mousedown', handleMouseDown);
        canvasContainer.addEventListener('mousemove', handleMouseMove);
        canvasContainer.addEventListener('mouseup', handleMouseUp);
        canvasContainer.addEventListener('mouseleave', handleMouseUp);
        canvasContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
      }

      const filterAll = document.getElementById('filter-all');
      if (filterAll) filterAll.addEventListener('click', () => filterDrafts('all'));
      const filterDups = document.getElementById('filter-duplicates');
      if (filterDups) filterDups.addEventListener('click', () => filterDrafts('duplicates'));
      const filterHighConf = document.getElementById('filter-high-conf') || document.getElementById('filter-high');
      if (filterHighConf) filterHighConf.addEventListener('click', () => filterDrafts('high_conf'));

      const searchDrafts = document.getElementById('draft-search-input') || document.getElementById('search-drafts-input');
      if (searchDrafts) searchDrafts.addEventListener('input', handleDraftSearch);

      const selectAllDrafts = document.getElementById('select-all-drafts');
      if (selectAllDrafts) {
        selectAllDrafts.addEventListener('change', (e) => toggleSelectAllDrafts(e.target.checked));
      }

      const btnDiscardSel = document.getElementById('btn-discard-selected');
      if (btnDiscardSel) btnDiscardSel.addEventListener('click', discardSelectedDrafts);

      const btnPublishSel = document.getElementById('btn-publish-selected') || document.getElementById('btn-publish-catalog');
      if (btnPublishSel) btnPublishSel.addEventListener('click', publishSelectedToCatalog);

      document.querySelectorAll('[data-action="close-manual-modal"]').forEach(btn => {
        btn.addEventListener('click', closeAddManualModal);
      });
      const btnCloseModal = document.getElementById('btn-close-manual-modal');
      if (btnCloseModal) btnCloseModal.addEventListener('click', closeAddManualModal);
      const btnCancelModal = document.getElementById('btn-cancel-manual-modal');
      if (btnCancelModal) btnCancelModal.addEventListener('click', closeAddManualModal);

      const formManual = document.getElementById('add-manual-form') || document.getElementById('form-manual-draft');
      if (formManual) formManual.addEventListener('submit', handleManualDraftSubmit);

      const boxesContainer = document.getElementById('boxes-container');
      if (boxesContainer) {
        boxesContainer.addEventListener('mouseover', (e) => {
          const box = e.target.closest('[data-box-id]');
          if (box && box.dataset.boxId) handleBoxHover(box.dataset.boxId, true);
        });
        boxesContainer.addEventListener('mouseout', (e) => {
          const box = e.target.closest('[data-box-id]');
          if (box && box.dataset.boxId) handleBoxHover(box.dataset.boxId, false);
        });
        boxesContainer.addEventListener('click', (e) => {
          const box = e.target.closest('[data-box-id]');
          if (box && box.dataset.boxId) handleBoxClick(box.dataset.boxId);
        });
      }

      const draftsList = document.getElementById('drafts-list');
      if (draftsList) {
        draftsList.addEventListener('mouseover', (e) => {
          const card = e.target.closest('[data-card-id]');
          if (card && card.dataset.cardId) handleBoxHover(card.dataset.cardId, true);
        });
        draftsList.addEventListener('mouseout', (e) => {
          const card = e.target.closest('[data-card-id]');
          if (card && card.dataset.cardId) handleBoxHover(card.dataset.cardId, false);
        });
        draftsList.addEventListener('change', (e) => {
          const target = e.target;
          if (target.dataset.action === 'toggle-draft-select') {
            toggleDraftSelection(target.dataset.id, target.checked);
            return;
          }
          if (target.dataset.field) {
            const field = target.dataset.field;
            let val = target.value;
            if (field === 'price') val = parseFloat(val) || 0;
            if (field === 'sku') val = val.toUpperCase();
            updateDraftField(target.dataset.id, field, val);
            return;
          }
        });
        draftsList.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          if (btn.dataset.action === 'resolve-dup') {
            const mode = btn.dataset.mode === 'null' ? null : btn.dataset.mode;
            resolveDuplicate(btn.dataset.id, mode);
            return;
          }
          if (btn.dataset.action === 'discard-single') {
            discardSingleDraft(btn.dataset.id);
            return;
          }
        });
      }
    }

    window.handleJobSwitch = handleJobSwitch;
    window.handleZoom = handleZoom;
    window.resetZoomAndPan = resetZoomAndPan;
    window.handleWheelZoom = handleWheelZoom;
    window.handleMouseDown = handleMouseDown;
    window.handleMouseMove = handleMouseMove;
    window.handleMouseUp = handleMouseUp;
    window.toggleBoundingBoxes = toggleBoundingBoxes;
    window.handleBoxHover = handleBoxHover;
    window.handleBoxClick = handleBoxClick;
    window.filterDrafts = filterDrafts;
    window.handleDraftSearch = handleDraftSearch;
    window.updateDraftField = updateDraftField;
    window.resolveDuplicate = resolveDuplicate;
    window.toggleDraftSelection = toggleDraftSelection;
    window.toggleSelectAllDrafts = toggleSelectAllDrafts;
    window.discardSingleDraft = discardSingleDraft;
    window.discardSelectedDrafts = discardSelectedDrafts;
    window.openAddManualDraftModal = openAddManualDraftModal;
    window.closeAddManualModal = closeAddManualModal;
    window.handleManualDraftSubmit = handleManualDraftSubmit;
    window.publishSelectedToCatalog = publishSelectedToCatalog;
    window.showToast = showToast;

    let _reviewInitialized = false;
    function bootstrapReview() {
      if (_reviewInitialized) return;
      _reviewInitialized = true;

      initCatalogStorage();
      loadJobsData();
      initReviewEvents();

      const manualCategorySelect = document.getElementById('manual-category');
      if (manualCategorySelect && typeof ApiClient !== 'undefined' && ApiClient.categories && typeof ApiClient.categories.populateDropdown === 'function') {
        ApiClient.categories.populateDropdown(manualCategorySelect, 'اختر التصنيف').catch(() => {});
      }

      const urlParams = new URLSearchParams(window.location.search);
      const requestedJobId = urlParams.get('jobId');

      if (requestedJobId) {
        setActiveJob(requestedJobId);
      } else if (allJobs.length > 0) {
        setActiveJob(allJobs[0].id);
      } else {
        setActiveJob(null);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrapReview);
    } else {
      bootstrapReview();
    }
