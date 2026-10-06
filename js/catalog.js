(function () {
      'use strict';

      function createSampleBlueprintSvg() {
        const svgContent = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" width="900" height="560">
            <rect width="900" height="560" fill="#0f172a"/>
            <rect x="20" y="20" width="860" height="520" fill="#1e293b" stroke="#38bdf8" stroke-width="4" rx="10"/>
            <rect x="400" y="534" width="100" height="12" fill="#22c55e" rx="4"/>
            <text x="450" y="525" fill="#4ade80" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">المدخل الرئيسي / كاونتر الدفع</text>
            <g>
              <rect x="60" y="60" width="220" height="160" fill="#153f2d" stroke="#22c55e" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
              <text x="170" y="90" fill="#86efac" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">المنطقة أ - المخبوزات والطازج</text>
              <rect x="80" y="110" width="40" height="90" fill="#334155" rx="4"/>
              <text x="100" y="160" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">ممر 01</text>
              <rect x="150" y="110" width="40" height="90" fill="#334155" rx="4"/>
              <text x="170" y="160" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">ممر 02</text>
            </g>
            <g>
              <rect x="340" y="60" width="220" height="160" fill="#1e3a5f" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
              <text x="450" y="90" fill="#7dd3fc" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">المنطقة ب - الألبان والمبردات</text>
              <rect x="360" y="110" width="40" height="90" fill="#334155" rx="4"/>
              <text x="380" y="160" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">ممر 03</text>
              <rect x="430" y="110" width="40" height="90" fill="#334155" rx="4"/>
              <text x="450" y="160" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">ممر 04</text>
            </g>
            <g>
              <rect x="620" y="60" width="220" height="160" fill="#451a03" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
              <text x="730" y="90" fill="#fcd34d" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">المنطقة ج - التسالي والمشروبات</text>
              <rect x="640" y="110" width="40" height="90" fill="#334155" rx="4"/>
              <text x="660" y="160" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">ممر 07</text>
            </g>
          </svg>
        `;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent.trim());
      }

      const SAMPLE_CSV_RAW = `Item Name,Product SKU,Unit Price,Department,Store Zone,Aisle Name
أفوكادو هاس عضوي,GRO-BAN-001,1.99,منتجات طازجة,المنطقة أ,ممر 01
زبادي يوناني كامل الدسم 500غ,GRO-DAI-101,3.25,ألبان وأجبان,المنطقة ب,ممر 03
خبز باغيت فرنسي طازج,GRO-BAK-202,1.50,مخبوزات,المنطقة أ,ممر 01
مياه فوارة طبيعية 6 عبوات,GRO-BEV-303,4.80,مشروبات,المنطقة ج,ممر 07
معجون طماطم عضوي 400غ,GRO-PAN-404,1.10,زيوت ومؤونة,المنطقة أ,ممر 02
ستيك سلمون نرويجي طازج,GRO-SEA-505,12.90,لحوم ومأكولات بحرية,المنطقة د,ثلاجة 1
زبدة لوز طبيعية 350غ,GRO-SNK-606,6.75,تسالي وحلويات,المنطقة ج,ممر 07
حليب طازج كامل الدسم 2 لتر,GRO-DAI-102,1.85,ألبان وأجبان,المنطقة ب,ممر 03
جبنة شيدر قالب 200غ,GRO-DAI-103,4.20,ألبان وأجبان,المنطقة ب,ممر 04
رقائق بطاطس مقرمشة 150غ,GRO-SNK-607,2.10,تسالي وحلويات,المنطقة ج,ممر 07
طحين سميد فاخر 1 كغ,GRO-BAK-203,2.40,مخبوزات,المنطقة أ,ممر 02
أرز بسمتي درجة أولى 5 كغ,GRO-PAN-405,14.50,زيوت ومؤونة,المنطقة أ,ممر 02
فراولة طازجة عبوة 250غ,GRO-FRU-701,3.90,منتجات طازجة,المنطقة أ,ممر 01
,GRO-ERR-801,5.00,زيوت ومؤونة,المنطقة أ,ممر 02
صنف بسعر غير صالح,GRO-ERR-802,-3.50,تسالي وحلويات,المنطقة ج,ممر 07`;

      const FASTAPI_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.FASTAPI_BASE_URL)
        ? CONFIG.FASTAPI_BASE_URL
        : (typeof window !== 'undefined' && window.FASTAPI_BASE_URL ? window.FASTAPI_BASE_URL : 'https://dawwer-backend-fastapi.onrender.com');

      function getStoreId() {
        return localStorage.getItem('activeStoreId') ||
               localStorage.getItem('storeId') ||
               '3fa85f64-5717-4562-b3fc-2c963f66afa6';
      }

      function getAuthToken() {
        const storeToken = localStorage.getItem('storeToken') || localStorage.getItem('store_token');
        if (storeToken) return storeToken.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (accessToken) return accessToken.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
        return (typeof ApiClient !== 'undefined' && typeof ApiClient.getToken === 'function') ? ApiClient.getToken() : '';
      }

      const CATALOG_STORAGE_KEY = 'dawwer_merchant_catalog_products';

      function loadCatalogProducts() {
        try {
          const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map(p => ({
                ...p,
                quantity: (typeof p.quantity === 'number') ? p.quantity : (p.isAvailable ? 12 : 0)
              }));
            }
          }
        } catch (e) {
          console.error('Error loading products from localStorage:', e);
        }
        return [];
      }

      function saveCatalogProducts() {
        try {
          localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(state.products));
        } catch (e) {
          console.error('Error saving products to localStorage:', e);
        }
      }

      function recordAuditLog(actionType, target, targetSku, changeDelta, details) {
        try {
          const stored = localStorage.getItem('dawwer_merchant_audit_log');
          const logs = stored ? JSON.parse(stored) : [];
          const now = new Date();
          const formattedTime = 'اليوم، ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
          logs.unshift({
            id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
            timestamp: Date.now(),
            formattedTime,
            actionType,
            target,
            targetSku: targetSku || '—',
            performedBy: 'مدير المتجر (Dawwer Merchant)',
            changeDelta,
            details: details || 'تم تنفيذ العملية عبر لوحة تحكم الكتالوج'
          });
          localStorage.setItem('dawwer_merchant_audit_log', JSON.stringify(logs));
        } catch (e) {
          console.error('Error recording audit log in catalog:', e);
        }
      }

      const state = {
        currentTab: 'catalog',
        products: loadCatalogProducts(),
        selectedIds: new Set(),
        filters: { search: '', category: 'ALL', status: 'ALL' },
        pagination: { page: 1, pageSize: 10 },
        modal: { isOpen: false, mode: 'create', editingProductId: null },
        camera: {
          stream: null,
          facingMode: 'environment',
          isScanning: false
        },

        floorPlan: {
          imageUrl: createSampleBlueprintSvg(),
          zoom: 1,
          pins: [
            { id: 'pin-1', label: 'المنطقة أ - ركن المخبوزات', color: '#16a34a', xPercent: 19, yPercent: 28 },
            { id: 'pin-2', label: 'المنطقة ب - مبردات الحليب', color: '#2563eb', xPercent: 50, yPercent: 28 },
            { id: 'pin-3', label: 'المنطقة ج - رفوف المشروبات', color: '#d97706', xPercent: 81, yPercent: 28 }
          ],
          pendingPin: null,
          selectedColor: '#16a34a',
        },

        wizard: {
          isOpen: false,
          currentStep: 1,
          headers: [],
          rawRows: [],
          mappings: { name: '', sku: '', price: '', category: '', zone: '', aisle: '' },
          validRows: [],
          errorRows: [],
        }
      };

      const DOM = {
        tabBtnCatalog: document.getElementById('tab-btn-catalog'),
        tabBtnFloorplan: document.getElementById('tab-btn-floorplan'),
        tabContentCatalog: document.getElementById('tab-content-catalog'),
        tabContentFloorplan: document.getElementById('tab-content-floorplan'),
        tableBody: document.getElementById('table-body'),
        emptyState: document.getElementById('empty-state'),
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search'),
        categoryFilter: document.getElementById('category-filter'),
        statusTabs: document.querySelectorAll('.status-tab'),
        selectAllCheckbox: document.getElementById('select-all-checkbox'),
        bulkActionsBar: document.getElementById('bulk-actions-bar'),
        bulkSelectedCount: document.getElementById('bulk-selected-count'),
        bulkSetAvailable: document.getElementById('bulk-set-available'),
        bulkDelete: document.getElementById('bulk-delete'),
        bulkClear: document.getElementById('bulk-clear'),
        paginationControls: document.getElementById('pagination-controls'),
        paginationSummary: document.getElementById('pagination-summary'),
        itemsPerPageSelect: document.getElementById('items-per-page'),
        totalCountBadge: document.getElementById('total-count-badge'),
        countAll: document.getElementById('count-all'),
        countPublished: document.getElementById('count-published'),
        countDraft: document.getElementById('count-draft'),
        countInactive: document.getElementById('count-inactive'),
        btnResetFilters: document.getElementById('btn-reset-filters'),
        emptyResetBtn: document.getElementById('empty-reset-btn'),
        btnAddProduct: document.getElementById('btn-add-product'),
        btnImportCatalog: document.getElementById('btn-import-catalog'),
        toastContainer: document.getElementById('toast-container'),

        productModal: document.getElementById('product-modal'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        modalPanel: document.getElementById('modal-panel'),
        modalTitle: document.getElementById('modal-title'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        btnCancelModal: document.getElementById('btn-cancel-modal'),
        productForm: document.getElementById('product-form'),
        formProductId: document.getElementById('form-product-id'),
        formName: document.getElementById('form-name'),
        formSku: document.getElementById('form-sku'),
        formCategory: document.getElementById('form-category'),
        formPrice: document.getElementById('form-price'),
        formQuantity: document.getElementById('form-quantity'),
        formStatus: document.getElementById('form-status'),
        formAvailable: document.getElementById('form-available'),
        locZone: document.getElementById('loc-zone'),
        locAisle: document.getElementById('loc-aisle'),
        locRack: document.getElementById('loc-rack'),
        locShelf: document.getElementById('loc-shelf'),
        locationPreviewBadge: document.getElementById('location-preview-badge'),

        dropzoneContainer: document.getElementById('floorplan-dropzone-container'),
        fileInput: document.getElementById('floorplan-file-input'),
        uploadError: document.getElementById('upload-error'),
        uploadProgressContainer: document.getElementById('upload-progress-container'),
        uploadProgressBar: document.getElementById('upload-progress-bar'),
        uploadProgressText: document.getElementById('upload-progress-text'),
        workspace: document.getElementById('floorplan-workspace'),
        floorplanImage: document.getElementById('floorplan-image'),
        mapContainer: document.getElementById('map-container'),
        pinsLayer: document.getElementById('pins-layer'),
        pinPopover: document.getElementById('pin-popover'),
        popoverPinLabel: document.getElementById('popover-pin-label'),
        btnSavePopoverPin: document.getElementById('btn-save-popover-pin'),
        btnClosePopover: document.getElementById('btn-close-popover'),
        btnCancelPopover: document.getElementById('btn-cancel-popover'),
        colorPickerGroup: document.getElementById('color-picker-group'),
        pinsListContainer: document.getElementById('pins-list-container'),
        totalPinsBadge: document.getElementById('total-pins-badge'),
        sidebarPinsCount: document.getElementById('sidebar-pins-count'),
        btnZoomIn: document.getElementById('btn-zoom-in'),
        btnZoomOut: document.getElementById('btn-zoom-out'),
        btnZoomReset: document.getElementById('btn-zoom-reset'),
        zoomLevelLabel: document.getElementById('zoom-level-label'),
        btnReplaceMap: document.getElementById('btn-replace-map'),
        btnLoadSampleMap: document.getElementById('btn-load-sample-map'),
        btnClearAllPins: document.getElementById('btn-clear-all-pins'),
        currentCoordsDisplay: document.getElementById('current-coords-display'),

        importWizardModal: document.getElementById('import-wizard-modal'),
        wizardBackdrop: document.getElementById('wizard-backdrop'),
        wizardPanel: document.getElementById('wizard-panel'),
        btnCloseWizard: document.getElementById('btn-close-wizard'),
        btnWizardCancel: document.getElementById('btn-wizard-cancel'),
        btnWizardBack: document.getElementById('btn-wizard-back'),
        btnWizardNext: document.getElementById('btn-wizard-next'),
        btnWizardCommit: document.getElementById('btn-wizard-commit'),
        csvDropzone: document.getElementById('csv-dropzone'),
        csvFileInput: document.getElementById('csv-file-input'),
        csvUploadError: document.getElementById('csv-upload-error'),
        btnLoadSampleCsv: document.getElementById('btn-load-sample-csv'),
        detectedColumnsCount: document.getElementById('detected-columns-count'),
        mapName: document.getElementById('map-name'),
        mapSku: document.getElementById('map-sku'),
        mapPrice: document.getElementById('map-price'),
        mapCategory: document.getElementById('map-category'),
        mapZone: document.getElementById('map-zone'),
        mapAisle: document.getElementById('map-aisle'),
        mappingPreviewTbody: document.getElementById('mapping-preview-tbody'),
        metricTotalRows: document.getElementById('metric-total-rows'),
        metricValidRows: document.getElementById('metric-valid-rows'),
        metricErrorRows: document.getElementById('metric-error-rows'),
        errorDetailsTbody: document.getElementById('error-details-tbody'),
        btnDownloadErrorCsv: document.getElementById('btn-download-error-csv'),
        finalImportCount: document.getElementById('final-import-count'),
        mappingSkuWarning: document.getElementById('mapping-sku-warning'),
        mappingSkuWarningText: document.getElementById('mapping-sku-warning-text'),
        btnAutoCorrectMapping: document.getElementById('btn-auto-correct-mapping'),
        step3SkuWarning: document.getElementById('step3-sku-warning'),
        step3SkuWarningText: document.getElementById('step3-sku-warning-text'),
        btnFixStep3Mapping: document.getElementById('btn-fix-step3-mapping'),

        btnAiShelfScan: document.getElementById('btn-ai-shelf-scan'),
        aiCameraModal: document.getElementById('ai-camera-modal'),
        aiCameraBackdrop: document.getElementById('ai-camera-backdrop'),
        aiCameraPanel: document.getElementById('ai-camera-panel'),
        btnCloseAiCamera: document.getElementById('btn-close-ai-camera'),
        btnCancelAiCamera: document.getElementById('btn-cancel-ai-camera'),
        aiCameraVideo: document.getElementById('ai-camera-video'),
        aiCameraCanvas: document.getElementById('ai-camera-canvas'),
        aiCameraLoader: document.getElementById('ai-camera-loader'),
        aiCameraError: document.getElementById('ai-camera-error'),
        aiCameraErrorMsg: document.getElementById('ai-camera-error-msg'),
        aiCameraAnalyzing: document.getElementById('ai-camera-analyzing'),
        aiCameraFileFallback: document.getElementById('ai-camera-file-fallback'),
        btnToggleCamFacing: document.getElementById('btn-toggle-cam-facing'),
        btnSnapAiPhoto: document.getElementById('btn-snap-ai-photo'),
        camZoneSelect: document.getElementById('cam-zone-select'),
        camAisleSelect: document.getElementById('cam-aisle-select'),
        camShelfSelect: document.getElementById('cam-shelf-select'),
      };

      const formatCurrency = (val) => `${Number(val).toFixed(2)} ر.س`;

      function showToast(message, type = 'success') {
        if (window.showToast && typeof window.showToast === 'function') {
          window.showToast({
            title: type === 'success' ? 'الكتالوج والمخططات' : 'تنبيه الكتالوج',
            message: message,
            type: type === 'success' ? 'success' : 'error'
          });
          return;
        }
        if (!DOM.toastContainer) return;
        const toast = document.createElement('div');
        const bg = type === 'success' ? 'bg-[#153f2d] text-white border border-white/20' : 'bg-rose-600 text-white';
        toast.className = `${bg} pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
        const icon = type === 'success' 
          ? `<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
          : `<svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
        toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
        DOM.toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));
        setTimeout(() => {
          toast.classList.add('opacity-0', 'translate-y-2');
          setTimeout(() => toast.remove(), 300);
        }, 3200);
      }

      function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
      }

      function switchTab(tab) {
        state.currentTab = tab;
        if (tab === 'catalog') {
          DOM.tabBtnCatalog.className = "tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all bg-[#153f2d] text-white shadow-xs flex items-center gap-2";
          DOM.tabBtnFloorplan.className = "tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-slate-600 hover:text-[#153f2d] hover:bg-slate-50 flex items-center gap-2";
          DOM.tabContentCatalog.classList.remove('hidden');
          DOM.tabContentFloorplan.classList.add('hidden');
          renderCatalog();
        } else {
          DOM.tabBtnFloorplan.className = "tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all bg-[#153f2d] text-white shadow-xs flex items-center gap-2";
          DOM.tabBtnCatalog.className = "tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all text-slate-600 hover:text-[#153f2d] hover:bg-slate-50 flex items-center gap-2";
          DOM.tabContentFloorplan.classList.remove('hidden');
          DOM.tabContentCatalog.classList.add('hidden');
          renderFloorPlan();
          loadActiveFloorplanMap();
        }
      }

      function openImportWizard() {
        state.wizard.isOpen = true;
        setWizardStep(1);
        DOM.csvUploadError.classList.add('hidden');
        DOM.importWizardModal.classList.remove('hidden');
        requestAnimationFrame(() => {
          DOM.wizardBackdrop.classList.remove('opacity-0');
          DOM.wizardPanel.classList.remove('opacity-0', 'scale-95');
        });
      }

      function closeImportWizard() {
        DOM.wizardBackdrop.classList.add('opacity-0');
        DOM.wizardPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          DOM.importWizardModal.classList.add('hidden');
          state.wizard.isOpen = false;
        }, 200);
      }

      async function startCameraStream() {
        if (!DOM.aiCameraVideo) return;
        if (DOM.aiCameraLoader) DOM.aiCameraLoader.classList.remove('hidden');
        if (DOM.aiCameraError) DOM.aiCameraError.classList.add('hidden');
        if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');

        stopCameraStream();

        const constraints = {
          video: {
            facingMode: { ideal: state.camera.facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('المتصفح لا يدعم الوصول المباشر لكاميرا الويب.');
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          state.camera.stream = stream;
          DOM.aiCameraVideo.srcObject = stream;
          DOM.aiCameraVideo.onloadedmetadata = () => {
            DOM.aiCameraVideo.play().catch(e => console.warn('Video play warning:', e));
            if (DOM.aiCameraLoader) DOM.aiCameraLoader.classList.add('hidden');
          };
        } catch (err) {
          console.warn('[AI Camera Stream Error]', err);
          if (DOM.aiCameraLoader) DOM.aiCameraLoader.classList.add('hidden');
          if (DOM.aiCameraError) DOM.aiCameraError.classList.remove('hidden');
          if (DOM.aiCameraErrorMsg) {
            DOM.aiCameraErrorMsg.textContent = err.name === 'NotAllowedError' 
              ? 'تم رفض إذن الكاميرا. يرجى تفعيل الإذن من إعدادات المتصفح أو اختيار صورة.' 
              : (err.message || 'تعذر الوصول إلى الكاميرا. يمكنك رفع صورة الرف يدوياً.');
          }
        }
      }

      function stopCameraStream() {
        if (state.camera.stream) {
          state.camera.stream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
          });
          state.camera.stream = null;
        }
        if (DOM.aiCameraVideo) {
          DOM.aiCameraVideo.srcObject = null;
        }
      }

      function toggleCameraFacing() {
        state.camera.facingMode = (state.camera.facingMode === 'environment') ? 'user' : 'environment';
        startCameraStream();
      }

      function openAiCameraModal() {
        if (!DOM.aiCameraModal) return;
        DOM.aiCameraModal.classList.remove('hidden');
        requestAnimationFrame(() => {
          if (DOM.aiCameraBackdrop) DOM.aiCameraBackdrop.classList.remove('opacity-0');
          if (DOM.aiCameraPanel) DOM.aiCameraPanel.classList.remove('opacity-0', 'scale-95');
        });
        startCameraStream();
      }

      function closeAiCameraModal() {
        if (!DOM.aiCameraModal) return;
        stopCameraStream();
        if (DOM.aiCameraBackdrop) DOM.aiCameraBackdrop.classList.add('opacity-0');
        if (DOM.aiCameraPanel) DOM.aiCameraPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          DOM.aiCameraModal.classList.add('hidden');
          if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');
          if (DOM.aiCameraError) DOM.aiCameraError.classList.add('hidden');
        }, 200);
      }

      async function processShelfImage(imageBlobOrFile) {
        if (!imageBlobOrFile) return;

        // Validate file type if a File object was passed
        if (imageBlobOrFile.type && !['image/jpeg', 'image/png', 'image/webp'].includes(imageBlobOrFile.type.toLowerCase())) {
          showToast('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.', 'error');
          return;
        }

        if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.remove('hidden');

        const zone = DOM.camZoneSelect ? DOM.camZoneSelect.value : 'المنطقة أ';
        const aisle = DOM.camAisleSelect ? DOM.camAisleSelect.value : 'ممر 01';
        const shelf = DOM.camShelfSelect ? DOM.camShelfSelect.value : 'رف 1';

        const storeId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId()) ||
                        localStorage.getItem('store_id') ||
                        localStorage.getItem('dawwer_active_store_id') || '';

        // Validate Token & Store Context Before Upload (Requirement 2)
        let uploadToken = null;
        if (typeof ApiClient !== 'undefined' && typeof ApiClient.validateUploadContext === 'function') {
          const contextValidation = await ApiClient.validateUploadContext(storeId);
          if (!contextValidation.valid) {
            if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');
            return;
          }
          uploadToken = contextValidation.token;
        } else {
          const isStoreValid = typeof ApiClient !== 'undefined' ? ApiClient.isValidStoreId(storeId) : (storeId && storeId !== 'null' && storeId !== 'undefined');
          if (!isStoreValid) {
            if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');
            showToast('معرف المتجر غير متوفر أو غير صالح. يرجى اختيار المتجر أولاً.', 'error');
            if (typeof ApiClient !== 'undefined' && typeof ApiClient.handleStoreVerification404 === 'function') {
              ApiClient.handleStoreVerification404(storeId);
            }
            return;
          }

          uploadToken = (typeof ApiClient !== 'undefined' && ApiClient.getUploadAuthToken)
            ? ApiClient.getUploadAuthToken()
            : (localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '');
          if (!uploadToken || uploadToken === 'null' || uploadToken === 'undefined' || (typeof ApiClient !== 'undefined' && ApiClient.isTokenExpired(uploadToken))) {
            if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');
            if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
              ApiClient.promptReauthentication('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مجدداً لمعالجة صورة الرف.');
            } else {
              showToast('جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول مجدداً للمتابعة.', 'warning');
            }
            return;
          }
        }

        try {
          const formData = new FormData();
          formData.append('file', imageBlobOrFile, 'shelf_scan.jpg');
          formData.append('store_id', storeId);
          formData.append('storeId', storeId);
          formData.append('zone', zone);
          formData.append('aisle', aisle.replace(/[^0-9]/g, '') || '01');
          formData.append('rack', '1');
          formData.append('shelf', shelf.replace(/[^0-9]/g, '') || '1');

          let serverJob = null;
          if (typeof ApiClient !== 'undefined' && ApiClient.shelfJobs && ApiClient.shelfJobs.create) {
            const res = await ApiClient.shelfJobs.create(storeId, formData, {
              timeout: 150000,
              suppressToastOnError: true
            });
            serverJob = res?.data || res;
          } else {
            const res = await fetch(`https://dawwer-backend-fastapi.onrender.com/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${uploadToken}`
              },
              body: formData
            });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.detail || errBody.message || `HTTP ${res.status}`);
            }
            serverJob = await res.json();
          }

          if (!serverJob || (!serverJob.id && !serverJob.job_id)) {
            throw new Error('لم يرجع خادم الذكاء الاصطناعي بيانات صالحة لمعالجة صورة الرف.');
          }

          const resolvedJobId = serverJob.id || serverJob.job_id;
          const detectedDrafts = Array.isArray(serverJob.draft_products) ? serverJob.draft_products :
                                 Array.isArray(serverJob.extractedItems) ? serverJob.extractedItems :
                                 Array.isArray(serverJob.items) ? serverJob.items : [];

          const newJob = {
            id: resolvedJobId,
            serverId: resolvedJobId,
            createdAt: 'الآن',
            timestamp: Date.now(),
            shelfLocation: {
              zone,
              aisle,
              rack: 'R1',
              level: shelf,
              label: `${zone} > ${aisle} > R1 > ${shelf}`
            },
            thumbnail: '',
            imagesCount: 1,
            status: detectedDrafts.length > 0 ? 'Review Required' : (serverJob.status || 'Completed'),
            detectedCount: detectedDrafts.length,
            confidence: serverJob.confidence || 98.4,
            extractedItems: detectedDrafts
          };

          sessionStorage.setItem('dawwer_current_review_job', JSON.stringify(newJob));
          if (detectedDrafts.length > 0) {
            sessionStorage.setItem('dawwer_current_draft_products', JSON.stringify(detectedDrafts));
          }

          closeAiCameraModal();
          showToast('تم رفع الصورة وتحليل الرف بنجاح! جاري تحويلك لشاشة المراجعة...', 'success');

          setTimeout(() => {
            window.location.href = `review-drafts.html?jobId=${encodeURIComponent(resolvedJobId)}&store_id=${encodeURIComponent(storeId)}`;
          }, 1200);

        } catch (jobErr) {
          if (DOM.aiCameraAnalyzing) DOM.aiCameraAnalyzing.classList.add('hidden');
          const is401 = jobErr?.status === 401 || (jobErr?.message && (jobErr.message.includes('401') || jobErr.message.includes('Unauthorized')));
          if (is401) {
            if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
              ApiClient.promptReauthentication('انتهت صلاحية جلسة العمل أو غير مصرح. يرجى تسجيل الدخول مجدداً.');
            } else {
              showToast('جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول مجدداً للمتابعة.', 'warning');
            }
            return;
          }
          const isTimeout = jobErr?.isTimeout || (jobErr?.message && jobErr.message.toLowerCase().includes('timeout'));
          const isCORS = jobErr?.isCORS || (jobErr?.message && jobErr.message.includes('Failed to fetch'));
          let errMsg = jobErr?.message || 'فشلت معالجة صورة الرف عبر خادم الذكاء الاصطناعي.';
          if (isTimeout) {
            errMsg = 'انتهت مهلة معالجة صورة الرف (أكثر من دقيقتين). قد يكون السيرفر قيد التشغيل (Cold Start)، يرجى إعادة المحاولة.';
          } else if (isCORS) {
            errMsg = 'تعذر الاتصال بخادم الذكاء الاصطناعي على Render (خطأ اتصال أو CORS).';
          }
          console.error('[AI Shelf Scan Error]:', jobErr);
          showToast(errMsg, 'error');
        }
      }

      function snapCameraPhoto() {
        if (!DOM.aiCameraVideo || !DOM.aiCameraCanvas) return;
        const video = DOM.aiCameraVideo;
        const canvas = DOM.aiCameraCanvas;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);

        canvas.toBlob((blob) => {
          if (blob) {
            processShelfImage(blob);
          } else {
            showToast('تعذر التقاط الصورة من الكاميرا', 'error');
          }
        }, 'image/jpeg', 0.9);
      }

      function setWizardStep(step) {
        state.wizard.currentStep = step;
        for (let i = 1; i <= 4; i++) {
          const indicator = document.getElementById(`step-indicator-${i}`);
          const content = document.getElementById(`wizard-step-${i}`);
          if (!indicator || !content) continue;

          if (i === step) {
            indicator.className = "step-indicator flex items-center gap-2 p-2 rounded-2xl bg-[#edf5f0] text-[#153f2d] font-bold border border-[#153f2d]/20";
            indicator.querySelector('span').className = "w-5 h-5 rounded-full bg-[#153f2d] text-white flex items-center justify-center text-[10px]";
            content.classList.remove('hidden');
          } else if (i < step) {
            indicator.className = "step-indicator flex items-center gap-2 p-2 rounded-2xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200";
            indicator.querySelector('span').className = "w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]";
            content.classList.add('hidden');
          } else {
            indicator.className = "step-indicator flex items-center gap-2 p-2 rounded-2xl bg-slate-50 text-slate-400 font-medium border border-slate-200";
            indicator.querySelector('span').className = "w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px]";
            content.classList.add('hidden');
          }
        }

        DOM.btnWizardBack.classList.toggle('hidden', step === 1);
        DOM.btnWizardNext.classList.toggle('hidden', step === 4);
        DOM.btnWizardCommit.classList.toggle('hidden', step !== 4);

        if (step === 2) {
          DOM.btnWizardNext.textContent = 'الانتقال للتدقيق ←';
          renderStep2Mapping();
        } else if (step === 3) {
          DOM.btnWizardNext.textContent = 'المتابعة للاعتماد النهائي ←';
          runValidation();
        } else if (step === 4) {
          DOM.finalImportCount.textContent = state.wizard.validRows.length;
        } else {
          DOM.btnWizardNext.textContent = 'المتابعة للمطابقة ←';
        }
      }

      function parseCSVText(text) {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return { headers: [], rows: [] };

        function parseLine(line) {
          const values = [];
          let insideQuote = false;
          let entry = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              values.push(entry.trim());
              entry = '';
            } else {
              entry += char;
            }
          }
          values.push(entry.trim());
          return values;
        }

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map(l => parseLine(l));
        return { headers, rows };
      }

      function handleCSVFile(file) {
        state.wizard.currentFile = file;
        DOM.csvUploadError.classList.add('hidden');
        if (!file.name.match(/\.(csv|xlsx)$/i)) {
          DOM.csvUploadError.textContent = 'صيغة الملف غير مدعومة. يرجى اختيار ملف CSV أو Excel.';
          DOM.csvUploadError.classList.remove('hidden');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          DOM.csvUploadError.textContent = 'حجم الملف كبير جداً. الحد الأقصى المسموح هو 5 ميغابايت.';
          DOM.csvUploadError.classList.remove('hidden');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const { headers, rows } = parseCSVText(e.target.result);
          if (!headers.length || !rows.length) {
            DOM.csvUploadError.textContent = 'الملف المرفوع فارغ أو تعذر قراءة أعمدته.';
            DOM.csvUploadError.classList.remove('hidden');
            return;
          }
          processParsedData(headers, rows);
        };
        reader.readAsText(file);
      }

      // Category taxonomy terms for header matching
      const CATEGORY_TERMS = [
        'category', 'category_id', 'category_name', 'categoryid', 'categoryname', 'category_title',
        'cat_id', 'cat_name', 'cat', 'taxonomy', 'department', 'dept', 'dept_name', 'classification',
        'section', 'group', 'family', 'التصنيف', 'تصنيف', 'اسم التصنيف', 'معرف التصنيف', 'كود التصنيف',
        'رمز التصنيف', 'القسم', 'قسم', 'اسم القسم', 'الفئة', 'فئة', 'اسم الفئة', 'المجموعة', 'نوع الصنف',
        'نوع المنتج', 'تصنيف الصنف', 'تصنيف المنتج'
      ];

      // Known category values and descriptive taxonomy words
      const KNOWN_CATEGORY_VALUES = [
        'خضار وفواكه', 'خضار و فواكه', 'خضار', 'فواكه', 'خضروات', 'خضروات وفواكه',
        'ألبان وأجبان', 'ألبان و أجبان', 'ألبان', 'أجبان', 'حليب وألبان', 'حليب',
        'مخبوزات وحلويات', 'مخبوزات', 'حلويات', 'معجنات',
        'لحوم ودواجن', 'لحوم', 'دواجن', 'دجاج', 'أسماك', 'مأكولات بحرية',
        'مشروبات وعصائر', 'مشروبات', 'عصائر', 'مياه', 'مشروبات باردة', 'مشروبات ساخنة',
        'تسالي وحلويات', 'تسالي', 'سناكات', 'مقرمشات', 'شيبس', 'شوكولاتة',
        'زيوت ومؤونة', 'مواد غذائية', 'بقالة', 'تمور', 'عطارة', 'بهارات', 'مكسرات',
        'معلبات', 'مجمدات', 'أطعمة مجمدة', 'صلصات وتوابل',
        'عناية شخصية', 'منظفات منزلية', 'منظفات', 'إلكترونيات', 'أجهزة منزلية',
        'طازج', 'منتجات طازجة', 'أغذية طازجة',
        'vegetables & fruits', 'vegetables and fruits', 'vegetables', 'fruits', 'produce', 'fresh produce',
        'dairy & eggs', 'dairy and eggs', 'dairy', 'cheese', 'milk',
        'bakery & pastry', 'bakery and pastry', 'bakery', 'bread', 'pastry',
        'meat & poultry', 'meat and poultry', 'meat', 'poultry', 'chicken', 'seafood', 'fish',
        'beverages & juices', 'beverages and juices', 'beverages', 'drinks', 'juices', 'water',
        'snacks & sweets', 'snacks and sweets', 'snacks', 'sweets', 'candy', 'confectionery',
        'pantry & groceries', 'pantry', 'groceries', 'grocery', 'food', 'frozen food', 'frozen', 'canned goods',
        'personal care', 'household & cleaning', 'household', 'cleaning', 'electronics'
      ];

      // Strict SKU / Barcode keywords
      const STRICT_SKU_KEYWORDS = [
        'sku', 'product_sku', 'store_sku', 'item_sku', 'barcode', 'bar_code', 'upc', 'ean', 'ean13', 'gtin',
        'رمز الصنف', 'رمز المنتج', 'رمز الباركود', 'باركود الصنف', 'باركود المنتج', 'الباركود', 'باركود',
        'كود الصنف', 'كود المنتج', 'رمز_الصنف', 'كود_الصنف', 'الرمز', 'item_code', 'product_code'
      ];

      function isDescriptiveCategoryText(val) {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim().toLowerCase();
        if (!s) return false;

        // Check if value is a known category name
        for (const cat of KNOWN_CATEGORY_VALUES) {
          if (s === cat || s.includes(cat) || (cat.includes(s) && s.length >= 4)) return true;
        }

        // Check common Arabic category words
        const arabicWords = ['خضار', 'فواكه', 'ألبان', 'أجبان', 'مخبوزات', 'لحوم', 'دواجن', 'مشروبات', 'عصائر', 'تسالي', 'حلويات', 'معلبات', 'مجمدات', 'منظفات', 'عناية', 'طازج', 'تمور', 'بهارات', 'مكسرات', 'بقالة', 'مؤونة'];
        for (const w of arabicWords) {
          if (s.includes(w)) return true;
        }

        // Check English category words
        const englishWords = ['vegetable', 'fruit', 'dairy', 'bakery', 'meat', 'poultry', 'beverage', 'drink', 'snack', 'grocery', 'produce', 'frozen', 'cleaning', 'pantry'];
        for (const w of englishWords) {
          if (s.includes(w)) return true;
        }

        return false;
      }

      function showSkuWarning(message) {
        if (DOM.mappingSkuWarning) {
          DOM.mappingSkuWarning.classList.remove('hidden');
          if (DOM.mappingSkuWarningText && message) {
            DOM.mappingSkuWarningText.textContent = message;
          }
        }
      }

      function hideSkuWarning() {
        if (DOM.mappingSkuWarning) {
          DOM.mappingSkuWarning.classList.add('hidden');
        }
      }

      function showStep3SkuWarning(message) {
        if (DOM.step3SkuWarning) {
          DOM.step3SkuWarning.classList.remove('hidden');
          if (DOM.step3SkuWarningText && message) {
            DOM.step3SkuWarningText.textContent = message;
          }
        }
      }

      function hideStep3SkuWarning() {
        if (DOM.step3SkuWarning) {
          DOM.step3SkuWarning.classList.add('hidden');
        }
      }

      function autoCorrectColumnSelection(interactive = false) {
        const sampleRows = state.wizard.rawRows.slice(0, 50);

        // Find which column is the true category column
        let trueCatHeader = '';
        for (const h of state.wizard.headers) {
          const normH = h.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
          const isCatH = CATEGORY_TERMS.some(t => {
            const normT = t.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return normH === normT || normH.includes(normT);
          });
          const colIdx = state.wizard.headers.indexOf(h);
          const colVals = sampleRows.map(r => (r[colIdx] || '').trim()).filter(v => v);
          const catHits = colVals.filter(v => isDescriptiveCategoryText(v)).length;
          if (isCatH || (colVals.length > 0 && catHits / colVals.length >= 0.25)) {
            trueCatHeader = h;
            break;
          }
        }

        // Find which column is the true barcode/SKU column
        let trueBarcodeHeader = '';
        for (const h of state.wizard.headers) {
          if (h === trueCatHeader) continue;
          const normH = h.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
          const isCatH = CATEGORY_TERMS.some(t => {
            const normT = t.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return normH === normT || normH.includes(normT);
          });
          if (isCatH) continue;

          const colIdx = state.wizard.headers.indexOf(h);
          const colVals = sampleRows.map(r => (r[colIdx] || '').trim()).filter(v => v);
          if (colVals.some(v => isDescriptiveCategoryText(v))) continue;

          const strictH = STRICT_SKU_KEYWORDS.some(k => normH.includes(k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '')));
          const barcodeHits = colVals.filter(v => /^\d{6,18}$/.test(v.replace(/\s+/g, '')) || /^[A-Za-z0-9\-_]{3,30}$/.test(v)).length;
          if (strictH || (colVals.length > 0 && barcodeHits / colVals.length >= 0.4)) {
            trueBarcodeHeader = h;
            break;
          }
        }

        if (trueCatHeader) {
          state.wizard.mappings.category = trueCatHeader;
          if (DOM.mapCategory) DOM.mapCategory.value = trueCatHeader;
        }

        if (trueBarcodeHeader) {
          state.wizard.mappings.sku = trueBarcodeHeader;
          if (DOM.mapSku) DOM.mapSku.value = trueBarcodeHeader;
        }

        updateMappingPreviewTable();
        hideSkuWarning();
        hideStep3SkuWarning();

        if (interactive) {
          showToast(`تم تصحيح المطابقة: الرمز ➔ "${trueBarcodeHeader || 'غير محدد'}"، التصنيف ➔ "${trueCatHeader || 'غير محدد'}"`, 'success');
        }
        return true;
      }

      function checkAndAutoCorrectSkuMapping(interactive = false) {
        const selectedSku = DOM.mapSku ? DOM.mapSku.value : state.wizard.mappings.sku;
        if (!selectedSku) {
          hideSkuWarning();
          return false;
        }

        const skuIdx = state.wizard.headers.indexOf(selectedSku);
        if (skuIdx === -1) {
          hideSkuWarning();
          return false;
        }

        const sampleRows = state.wizard.rawRows.slice(0, 50);
        const categoryHits = sampleRows.filter(r => isDescriptiveCategoryText(r[skuIdx] || '')).length;
        const normSkuHeader = selectedSku.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
        const headerIsCategory = CATEGORY_TERMS.some(t => {
          const normT = t.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
          return normSkuHeader === normT || normSkuHeader.includes(normT);
        });
        const hasCategoryData = categoryHits > 0 && (categoryHits / sampleRows.length >= 0.15 || headerIsCategory);

        if (hasCategoryData) {
          console.warn(`[Catalog] Selected SKU column "${selectedSku}" contains descriptive category values! Auto-correcting column mapping.`);

          // Look for an actual barcode column
          let trueBarcodeHeader = '';
          for (let i = 0; i < state.wizard.headers.length; i++) {
            if (i === skuIdx) continue;
            const h = state.wizard.headers[i];
            const normH = h.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            const isCategoryHeader = CATEGORY_TERMS.some(t => {
              const normT = t.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
              return normH === normT || normH.includes(normT);
            });
            if (isCategoryHeader) continue;

            const vals = sampleRows.map(r => (r[i] || '').trim()).filter(v => v);
            const containsCatText = vals.some(v => isDescriptiveCategoryText(v));
            if (containsCatText) continue;

            const strictMatch = STRICT_SKU_KEYWORDS.some(k => normH.includes(k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '')));
            const barcodeCount = vals.filter(v => /^\d{6,18}$/.test(v.replace(/\s+/g, '')) || /^[A-Za-z0-9\-_]{3,30}$/.test(v)).length;
            if (strictMatch || (vals.length > 0 && barcodeCount / vals.length >= 0.5)) {
              trueBarcodeHeader = h;
              break;
            }
          }

          // Auto-route: Route taxonomy values to the Category field
          state.wizard.mappings.category = selectedSku;
          if (DOM.mapCategory) DOM.mapCategory.value = selectedSku;

          // Auto-correct SKU field to true barcode or clear it
          state.wizard.mappings.sku = trueBarcodeHeader;
          if (DOM.mapSku) DOM.mapSku.value = trueBarcodeHeader;

          showSkuWarning(
            `تم رصد قيم تصنيف نصية ('${escapeHtml(selectedSku)}') في حقل رمز الصنف (SKU). تم توجيه التصنيف تلقائياً إلى حقل "التصنيف"${trueBarcodeHeader ? ` واختيار '${escapeHtml(trueBarcodeHeader)}' كرمز باركود.` : '، يرجى اختيار عمود الباركود.'}`
          );

          if (interactive) {
            showToast('تم تصحيح مطابقة الأعمدة تلقائياً: توجيه التصنيف إلى حقل التصنيف', 'warning');
          }
          return true;
        } else {
          hideSkuWarning();
          return false;
        }
      }

      function processParsedData(headers, rows) {
        state.wizard.headers = headers;
        state.wizard.rawRows = rows;
        DOM.detectedColumnsCount.textContent = `تم التعرف على ${headers.length} أعمدة`;

        // 1. Analyze each column's header and sample values
        const sampleRows = rows.slice(0, 50);
        const colStats = headers.map((header, colIdx) => {
          const normHeader = header.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
          const values = sampleRows.map(r => (r[colIdx] || '').trim()).filter(v => v !== '');
          const totalVals = values.length || 1;

          // Check category traits
          const categoryHeaderMatch = CATEGORY_TERMS.some(t => {
            const normTerm = t.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return normHeader === normTerm || normHeader.includes(normTerm);
          });
          const categoryHits = values.filter(v => isDescriptiveCategoryText(v)).length;
          const categoryRatio = categoryHits / totalVals;

          // Check SKU / barcode traits
          const isCategoryCol = categoryHeaderMatch || categoryRatio > 0.2;
          const strictSkuHeaderMatch = !isCategoryCol && STRICT_SKU_KEYWORDS.some(k => {
            const normK = k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return normHeader === normK || normHeader.includes(normK);
          });

          const barcodeHits = values.filter(v => {
            const cleanVal = v.replace(/\s+/g, '');
            return /^\d{6,18}$/.test(cleanVal) || /^[A-Za-z0-9\-_]{3,30}$/.test(v);
          }).length;
          const barcodeRatio = barcodeHits / totalVals;

          // Check price traits
          const priceHeaderMatch = ['price', 'cost', 'unitprice', 'rate', 'سعر', 'السعر', 'سعر الوحدة', 'تكلفة'].some(p => {
            const normP = p.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return normHeader === normP || normHeader.includes(normP);
          });
          const numericHits = values.filter(v => {
            const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
            return !isNaN(n) && n > 0 && n < 100000;
          }).length;
          const numericRatio = numericHits / totalVals;

          return {
            header,
            colIdx,
            normHeader,
            isCategoryCol,
            categoryHeaderMatch,
            categoryRatio,
            strictSkuHeaderMatch,
            barcodeRatio,
            priceHeaderMatch,
            numericRatio
          };
        });

        // 2. Identify Category column (Route taxonomy values strictly to Category)
        let catCol = colStats.find(c => c.categoryHeaderMatch);
        if (!catCol) {
          catCol = colStats.find(c => c.categoryRatio > 0.3);
        }
        const categoryHeader = catCol ? catCol.header : '';

        // 3. Identify SKU column (Strictly maps to unique identifiers/barcodes, NEVER category)
        let skuCol = colStats.find(c => c.header !== categoryHeader && !c.isCategoryCol && c.strictSkuHeaderMatch);
        if (!skuCol) {
          // Find column with highest barcode ratio and 0 category matches
          skuCol = colStats
            .filter(c => c.header !== categoryHeader && !c.isCategoryCol && c.categoryRatio === 0)
            .sort((a, b) => b.barcodeRatio - a.barcodeRatio)[0];
        }
        const skuHeader = skuCol ? skuCol.header : '';

        // 4. Identify Name column
        let nameCol = colStats.find(c => {
          if (c.header === categoryHeader || c.header === skuHeader) return false;
          return ['name', 'title', 'item', 'product', 'اسم', 'اسم الصنف', 'اسم المنتج', 'منتج', 'صنف'].some(k => {
            const normK = k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');
            return c.normHeader === normK || c.normHeader.includes(normK);
          });
        });
        if (!nameCol) {
          nameCol = colStats.find(c => c.header !== categoryHeader && c.header !== skuHeader);
        }
        const nameHeader = nameCol ? nameCol.header : headers[0];

        // 5. Identify Price column
        let priceCol = colStats.find(c => c.header !== categoryHeader && c.header !== skuHeader && c.header !== nameHeader && c.priceHeaderMatch);
        if (!priceCol) {
          priceCol = colStats.find(c => c.header !== categoryHeader && c.header !== skuHeader && c.header !== nameHeader && c.numericRatio > 0.6);
        }
        const priceHeader = priceCol ? priceCol.header : '';

        // 6. Identify Zone and Aisle
        const zoneCol = colStats.find(c => {
          if ([categoryHeader, skuHeader, nameHeader, priceHeader].includes(c.header)) return false;
          return ['zone', 'section', 'area', 'منطقة', 'جناح'].some(k => c.normHeader.includes(k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '')));
        });
        const aisleCol = colStats.find(c => {
          if ([categoryHeader, skuHeader, nameHeader, priceHeader, zoneCol?.header].includes(c.header)) return false;
          return ['aisle', 'bay', 'corridor', 'ممر', 'رف', 'shelf', 'rack'].some(k => c.normHeader.includes(k.toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '')));
        });

        state.wizard.mappings.name = nameHeader || '';
        state.wizard.mappings.sku = skuHeader || '';
        state.wizard.mappings.price = priceHeader || '';
        state.wizard.mappings.category = categoryHeader || '';
        state.wizard.mappings.zone = zoneCol ? zoneCol.header : '';
        state.wizard.mappings.aisle = aisleCol ? aisleCol.header : '';

        setWizardStep(2);
        showToast(`تمت معالجة ${rows.length} سجلاً ومطابقة الحقول بدقة!`);
      }

      function renderStep2Mapping() {
        const populateSelect = (selectEl, currentVal) => {
          selectEl.innerHTML = '<option value="">-- بدون مطابقة --</option>';
          state.wizard.headers.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            if (h === currentVal) opt.selected = true;
            selectEl.appendChild(opt);
          });
        };

        populateSelect(DOM.mapName, state.wizard.mappings.name);
        populateSelect(DOM.mapSku, state.wizard.mappings.sku);
        populateSelect(DOM.mapPrice, state.wizard.mappings.price);
        populateSelect(DOM.mapCategory, state.wizard.mappings.category);
        populateSelect(DOM.mapZone, state.wizard.mappings.zone);
        populateSelect(DOM.mapAisle, state.wizard.mappings.aisle);

        // Run auto-correction and warning check
        checkAndAutoCorrectSkuMapping(false);

        updateMappingPreviewTable();
      }

      function updateMappingPreviewTable() {
        const nameIdx = state.wizard.headers.indexOf(DOM.mapName.value);
        const skuIdx = state.wizard.headers.indexOf(DOM.mapSku.value);
        const priceIdx = state.wizard.headers.indexOf(DOM.mapPrice.value);
        const catIdx = state.wizard.headers.indexOf(DOM.mapCategory.value);
        const zoneIdx = state.wizard.headers.indexOf(DOM.mapZone.value);
        const aisleIdx = state.wizard.headers.indexOf(DOM.mapAisle.value);

        const previewRows = state.wizard.rawRows.slice(0, 3);
        DOM.mappingPreviewTbody.innerHTML = previewRows.map(row => `
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-2.5 font-bold text-slate-800">${escapeHtml(nameIdx !== -1 ? row[nameIdx] : '—')}</td>
            <td class="px-4 py-2.5 font-mono text-slate-500" dir="ltr">${escapeHtml(skuIdx !== -1 ? row[skuIdx] : '—')}</td>
            <td class="px-4 py-2.5 font-bold text-slate-900">${priceIdx !== -1 ? formatCurrency(parseFloat(row[priceIdx]) || 0) : '—'}</td>
            <td class="px-4 py-2.5"><span class="px-2.5 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700">${escapeHtml(catIdx !== -1 ? row[catIdx] : 'عام')}</span></td>
            <td class="px-4 py-2.5 text-slate-600 font-bold">${escapeHtml(zoneIdx !== -1 ? row[zoneIdx] : 'المنطقة أ')} › ${escapeHtml(aisleIdx !== -1 ? row[aisleIdx] : 'ممر 01')}</td>
          </tr>
        `).join('');
      }

      function runValidation() {
        state.wizard.mappings.name = DOM.mapName.value;
        state.wizard.mappings.sku = DOM.mapSku.value;
        state.wizard.mappings.price = DOM.mapPrice.value;
        state.wizard.mappings.category = DOM.mapCategory.value;
        state.wizard.mappings.zone = DOM.mapZone.value;
        state.wizard.mappings.aisle = DOM.mapAisle.value;

        const nameIdx = state.wizard.headers.indexOf(state.wizard.mappings.name);
        const skuIdx = state.wizard.headers.indexOf(state.wizard.mappings.sku);
        const priceIdx = state.wizard.headers.indexOf(state.wizard.mappings.price);
        const catIdx = state.wizard.headers.indexOf(state.wizard.mappings.category);
        const zoneIdx = state.wizard.headers.indexOf(state.wizard.mappings.zone);
        const aisleIdx = state.wizard.headers.indexOf(state.wizard.mappings.aisle);

        state.wizard.validRows = [];
        state.wizard.errorRows = [];

        const existingSkus = new Set(state.products.map(p => (p.sku || '').toUpperCase()));
        const seenImportSkus = new Set();
        let categoryAsSkuCount = 0;

        state.wizard.rawRows.forEach((row, index) => {
          const rowNum = index + 2;
          const rawName = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
          const rawSku = skuIdx !== -1 ? (row[skuIdx] || '').trim() : '';
          const rawPrice = priceIdx !== -1 ? parseFloat(row[priceIdx]) : NaN;
          const rawCat = catIdx !== -1 ? (row[catIdx] || 'عام').trim() : 'عام';
          const rawZone = zoneIdx !== -1 ? (row[zoneIdx] || 'المنطقة أ').trim() : 'المنطقة أ';
          const rawAisle = aisleIdx !== -1 ? (row[aisleIdx] || 'ممر 01').trim() : 'ممر 01';

          let errors = [];

          if (!rawName) errors.push('اسم المنتج فارغ أو غير متوفر.');
          if (!rawSku) {
            errors.push('رمز الباركود / SKU غير متوفر.');
          } else {
            // Validate: SKU must not be descriptive category text!
            if (isDescriptiveCategoryText(rawSku)) {
              categoryAsSkuCount++;
              errors.push(`رمز الصنف '${rawSku}' غير صالح لأنه يمثل تصنيفاً للمنتج وليس باركود أو رمز فريد. يرجى توجيه عمود التصنيفات إلى حقل 'التصنيف' واختيار عمود الباركود لحقل SKU.`);
            } else {
              const skuUpper = rawSku.toUpperCase();
              if (existingSkus.has(skuUpper)) errors.push(`رمز الصنف '${rawSku}' مسجل مسبقاً في كتالوج المتجر.`);
              if (seenImportSkus.has(skuUpper)) errors.push(`تكرار رمز الصنف '${rawSku}' داخل نفس الملف.`);
            }
          }

          if (isNaN(rawPrice) || rawPrice <= 0) errors.push(`السعر يجب أن يكون قيمة رقمية موجبة.`);

          if (errors.length > 0) {
            state.wizard.errorRows.push({
              rowNum,
              rawRow: row,
              name: rawName || '[بدون اسم]',
              sku: rawSku || '[بدون رمز]',
              reason: errors.join(' ')
            });
          } else {
            seenImportSkus.add(rawSku.toUpperCase());
            state.wizard.validRows.push({
              id: `prod-imp-${Date.now()}-${index}`,
              name: rawName,
              sku: rawSku,
              category: rawCat || 'عام',
              price: rawPrice,
              isAvailable: true,
              location: { zone: rawZone, aisle: rawAisle, rack: 'R1', shelf: 'رف 1 - رئيسي' },
              status: 'Published',
              updatedAt: new Date().toISOString().slice(0, 16)
            });
          }
        });

        DOM.metricTotalRows.textContent = state.wizard.rawRows.length;
        DOM.metricValidRows.textContent = state.wizard.validRows.length;
        DOM.metricErrorRows.textContent = state.wizard.errorRows.length;

        // Step 3 warning banner if category was mapped to SKU
        if (categoryAsSkuCount > 0) {
          showStep3SkuWarning(`تم رصد ${categoryAsSkuCount} صنف يحتوي على تصنيف في حقل رمز الصنف (SKU). يرجى الرجوع لتصحيح اختيار عمود الرمز.`);
        } else {
          hideStep3SkuWarning();
        }

        const errorContainer = document.getElementById('error-details-container');
        if (state.wizard.errorRows.length === 0) {
          errorContainer.classList.add('hidden');
        } else {
          errorContainer.classList.remove('hidden');
          DOM.errorDetailsTbody.innerHTML = state.wizard.errorRows.map(err => `
            <tr class="hover:bg-rose-100/50">
              <td class="px-4 py-2.5 font-mono font-bold">${err.rowNum}</td>
              <td class="px-4 py-2.5 font-bold">${escapeHtml(err.name)}</td>
              <td class="px-4 py-2.5 font-mono" dir="ltr">${escapeHtml(err.sku)}</td>
              <td class="px-4 py-2.5 font-bold text-rose-700">${escapeHtml(err.reason)}</td>
            </tr>
          `).join('');
        }
      }

      function downloadErrorCSV() {
        if (!state.wizard.errorRows.length) return;

        const headers = [...state.wizard.headers, 'سبب الخطأ'];
        const rows = state.wizard.errorRows.map(err => {
          const rowData = [...err.rawRow];
          while (rowData.length < state.wizard.headers.length) rowData.push('');
          rowData.push(`"${err.reason.replace(/"/g, '""')}"`);
          return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `dawwer_catalog_errors_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('تم تحميل ملف تقرير الأخطاء (.csv)');
      }

      async function commitImport() {
        if (!state.wizard.validRows.length) {
          showToast('لا توجد أصناف صالحة للاستيراد', 'error');
          return;
        }

        // 1. Client-side validation: verify that no valid row has descriptive category text in SKU
        const categorySkuRows = state.wizard.validRows.filter(r => isDescriptiveCategoryText(r.sku));
        if (categorySkuRows.length > 0) {
          showToast(`تعذر الاستيراد: تم رصد ${categorySkuRows.length} صنف يحتوي على تصنيف في حقل SKU. يرجى تصحيح مطابقة الأعمدة.`, 'error');
          setWizardStep(2);
          checkAndAutoCorrectSkuMapping(true);
          return;
        }

        // 2. Validate Token & Store Context Before Upload (Requirement 2)
        const storeId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId()) ||
                        localStorage.getItem('store_id') ||
                        localStorage.getItem('dawwer_active_store_id') || '';

        if (typeof ApiClient !== 'undefined' && typeof ApiClient.validateUploadContext === 'function') {
          const contextValidation = await ApiClient.validateUploadContext(storeId);
          if (!contextValidation.valid) {
            return;
          }
        } else {
          if (!storeId || (typeof ApiClient !== 'undefined' && ApiClient.isInvalidStoreId(storeId))) {
            showToast('يلزم اختيار متجر نشط قبل استيراد الكتالوج', 'error');
            if (typeof ApiClient !== 'undefined' && ApiClient.handleStoreVerification404) {
              ApiClient.handleStoreVerification404(storeId);
            }
            return;
          }
          const token = (typeof ApiClient !== 'undefined' && ApiClient.getUploadAuthToken)
            ? ApiClient.getUploadAuthToken()
            : (localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || '');
          if (!token || token === 'null' || token === 'undefined' || (typeof ApiClient !== 'undefined' && ApiClient.isTokenExpired(token))) {
            if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
              ApiClient.promptReauthentication('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً لاستيراد الكتالوج.');
            } else {
              showToast('جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول مجدداً للمتابعة.', 'warning');
            }
            return;
          }
        }

        const count = state.wizard.validRows.length;
        if (state.wizard.currentFile) {
          try {
            // Construct normalized CSV content so backend parser receives clean standard columns
            const normalizedCsvLines = [
              'Product Name,Product SKU,Unit Price,Category,Store Zone,Aisle Name',
              ...state.wizard.validRows.map(p =>
                `"${(p.name || '').replace(/"/g, '""')}","${(p.sku || '').replace(/"/g, '""')}",${p.price},"${(p.category || '').replace(/"/g, '""')}","${(p.location?.zone || '').replace(/"/g, '""')}","${(p.location?.aisle || '').replace(/"/g, '""')}"`
              )
            ];
            const normalizedBlob = new Blob(["\uFEFF" + normalizedCsvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const uploadFileName = (state.wizard.currentFile.name || 'catalog_import.csv').replace(/\.[^/.]+$/, "") + "_mapped.csv";
            const uploadFile = new File([normalizedBlob], uploadFileName, { type: 'text/csv' });

            const formData = new FormData();
            formData.append('file', uploadFile);

            const uploadToken = getAuthToken();
            fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/catalog/bulk-import`, {
              method: 'POST',
              headers: {
                ...(uploadToken ? { 'Authorization': `Bearer ${uploadToken}` } : {})
              },
              body: formData
            }).then(res => {
              if (res.ok) {
                console.info('[Catalog] Bulk import synced to FastAPI backend.');
              }
            }).catch(e => {
              console.warn('[Catalog] Bulk import backend sync note:', e);
            });
          } catch (e) {
            console.warn('[Catalog] Bulk import dispatch error:', e);
          }
        }

        state.products.unshift(...state.wizard.validRows);
        saveCatalogProducts();
        recordAuditLog('Excel Bulk Import', 'استيراد كتالوج ملف', 'CSV-BATCH', `إدراج ${count} صنف جديد بالكتالوج`, 'تمت معالجة ومطابقة أعمدة الملف بنجاح');
        closeImportWizard();
        renderCatalog();
        showToast(`تم استيراد ${count} منتج بنجاح إلى كتالوج المتجر!`);
      }

      function renderFloorPlan() {
        if (!state.floorPlan.imageUrl) {
          DOM.dropzoneContainer.classList.remove('hidden');
          DOM.workspace.classList.add('hidden');
          return;
        }

        DOM.dropzoneContainer.classList.add('hidden');
        DOM.workspace.classList.remove('hidden');
        DOM.floorplanImage.src = state.floorPlan.imageUrl;

        DOM.mapContainer.style.transform = `scale(${state.floorPlan.zoom})`;
        DOM.zoomLevelLabel.textContent = `${Math.round(state.floorPlan.zoom * 100)}%`;

        renderPins();
        renderPinsSidebar();
      }

      function renderPins() {
        DOM.pinsLayer.innerHTML = '';
        state.floorPlan.pins.forEach((pin, index) => {
          const pinEl = document.createElement('div');
          pinEl.className = 'absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group z-20 transition-transform hover:scale-125';
          pinEl.style.left = `${pin.xPercent}%`;
          pinEl.style.top = `${pin.yPercent}%`;

          pinEl.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-xs shadow-xl border-2 border-white" style="background-color: ${pin.color || '#16a34a'}">
                ${index + 1}
              </div>
              <div class="w-2 h-2 -mt-1 rotate-45 border-r-2 border-b-2 border-white" style="background-color: ${pin.color || '#16a34a'}"></div>
              <div class="absolute bottom-full mb-1 hidden group-hover:flex px-2.5 py-1 bg-[#153f2d] text-white text-[11px] font-bold rounded-xl shadow-xl whitespace-nowrap z-30 pointer-events-none">
                ${escapeHtml(pin.label)}
              </div>
            </div>
          `;

          pinEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast(`نقطة التوجيه: ${pin.label}`);
          });

          DOM.pinsLayer.appendChild(pinEl);
        });

        const count = state.floorPlan.pins.length;
        DOM.totalPinsBadge.textContent = `${count} مناطق محددة`;
        DOM.sidebarPinsCount.textContent = count;
      }

      function renderPinsSidebar() {
        DOM.pinsListContainer.innerHTML = '';
        if (state.floorPlan.pins.length === 0) {
          DOM.pinsListContainer.innerHTML = `
            <div class="py-12 text-center text-slate-400">
              <div class="text-xs font-bold text-slate-600">لا توجد نقاط توجيه مسجلة بعد</div>
              <p class="text-[11px] text-slate-400 mt-1">انقر على أي نقطة داخل صورة المخطط لتعيين ممر أو رف.</p>
            </div>
          `;
          return;
        }

        state.floorPlan.pins.forEach((pin, index) => {
          const card = document.createElement('div');
          card.className = 'p-3.5 bg-slate-50 hover:bg-[#edf5f0]/50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 transition group';
          card.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs" style="background-color: ${pin.color || '#16a34a'}">
                ${index + 1}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-800 truncate">${escapeHtml(pin.label)}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5" dir="ltr">X: ${pin.xPercent.toFixed(1)}% | Y: ${pin.yPercent.toFixed(1)}%</div>
              </div>
            </div>
            <button class="btn-delete-pin p-1 text-slate-400 hover:text-rose-600 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          `;

          card.querySelector('.btn-delete-pin').addEventListener('click', () => {
            state.floorPlan.pins = state.floorPlan.pins.filter(p => p.id !== pin.id);
            renderPins();
            renderPinsSidebar();
            showToast(`تم حذف نقطة "${pin.label}"`, 'error');
            syncFloorplanPinsToBackend();
          });

          DOM.pinsListContainer.appendChild(card);
        });
      }

      async function loadActiveFloorplanMap() {
        if (state.floorPlan.hasLoadedRemote) return;
        try {
          if (window.ApiClient && ApiClient.floorplan && ApiClient.floorplan.getActiveMap) {
            const storeId = (window.CONFIG && CONFIG.getActiveStoreId) ? CONFIG.getActiveStoreId() : '1';
            const res = await ApiClient.floorplan.getActiveMap(storeId);
            const data = (res && res.data) ? res.data : res;
            if (data && (data.image_url || data.imageUrl) && !state.floorPlan.imageUrl) {
              state.floorPlan.imageUrl = data.image_url || data.imageUrl;
              if (Array.isArray(data.elements) && data.elements.length > 0 && state.floorPlan.pins.length === 0) {
                state.floorPlan.pins = data.elements.map(el => ({
                  id: el.id || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  label: el.label || el.name || 'ممر',
                  color: el.color || '#16a34a',
                  xPercent: Number(el.xPercent ?? el.x_percent ?? el.x ?? 50),
                  yPercent: Number(el.yPercent ?? el.y_percent ?? el.y ?? 50),
                }));
              }
              renderFloorPlan();
            }
            state.floorPlan.hasLoadedRemote = true;
          }
        } catch (err) {
          console.warn('[Catalog Floorplan] Could not load active map from FastAPI:', err);
        }
      }

      async function syncFloorplanPinsToBackend() {
        try {
          if (window.ApiClient && ApiClient.floorplan && ApiClient.floorplan.saveElementsBatch) {
            const storeId = (window.CONFIG && CONFIG.getActiveStoreId) ? CONFIG.getActiveStoreId() : '1';
            const payload = state.floorPlan.pins.map(pin => ({
              id: pin.id,
              label: pin.label,
              color: pin.color,
              x_percent: pin.xPercent,
              y_percent: pin.yPercent,
              element_type: 'shelf_pin'
            }));
            await ApiClient.floorplan.saveElementsBatch(storeId, 'active', payload);
          }
        } catch (err) {
          console.warn('[Catalog Floorplan] Could not sync pins batch to FastAPI:', err);
        }
      }

      function handleMapClick(e) {
        if (!DOM.pinPopover.classList.contains('hidden')) {
          hidePinPopover();
        }
        const rect = DOM.mapContainer.getBoundingClientRect();
        const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        state.floorPlan.pendingPin = { xPercent, yPercent };
        DOM.pinPopover.style.left = `${xPercent}%`;
        DOM.pinPopover.style.top = `${yPercent}%`;
        DOM.popoverPinLabel.value = `المنطقة ${String.fromCharCode(65 + state.floorPlan.pins.length)} - ممر`;
        DOM.pinPopover.classList.remove('hidden');
        DOM.popoverPinLabel.focus();
      }

      function hidePinPopover() {
        DOM.pinPopover.classList.add('hidden');
        state.floorPlan.pendingPin = null;
      }

      function handleSavePopoverPin() {
        const label = DOM.popoverPinLabel.value.trim();
        if (!label || !state.floorPlan.pendingPin) return;

        state.floorPlan.pins.push({
          id: `pin-${Date.now()}`,
          label,
          color: state.floorPlan.selectedColor,
          xPercent: state.floorPlan.pendingPin.xPercent,
          yPercent: state.floorPlan.pendingPin.yPercent,
        });

        hidePinPopover();
        renderPins();
        renderPinsSidebar();
        showToast(`تم تثبيت نقطة "${label}"!`);
        syncFloorplanPinsToBackend();
      }

      const SHELF_HIERARCHY = {
        'المنطقة أ': { label: 'المنطقة أ - المخبوزات والطازج', aisles: { 'ممر 01': { racks: ['R1', 'R2'], shelves: ['رف 1 - علوي', 'رف 2 - مستوى العين', 'رف 3 - سفلي'] }, 'ممر 02': { racks: ['R1', 'R2', 'R3'], shelves: ['رف 1 - علوي', 'رف 2 - مستوى العين', 'رف 3 - أوسط', 'رف 4 - سفلي'] } } },
        'المنطقة ب': { label: 'المنطقة ب - الألبان والمبردات', aisles: { 'ممر 03': { racks: ['R1', 'R2'], shelves: ['رف 1 - علوي', 'رف 2 - مستوى العين', 'رف 3 - سفلي'] }, 'ممر 04': { racks: ['R1', 'R2'], shelves: ['رف 1 - علوي', 'رف 2 - مستوى العين', 'رف 3 - سفلي'] } } },
        'المنطقة ج': { label: 'المنطقة ج - التسالي والمشروبات', aisles: { 'ممر 07': { racks: ['R1', 'R2', 'R3'], shelves: ['رف 1 - علوي', 'رف 2 - مستوى العين', 'رف 3 - أرضي'] } } },
        'المنطقة د': { label: 'المنطقة د - المجمدات واللحوم', aisles: { 'ثلاجة 1': { racks: ['R1', 'R2'], shelves: ['رف 1 - علوي', 'رف 2 - رئيسي', 'رف 3 - سفلي'] } } }
      };

      function initShelfZones() {
        DOM.locZone.innerHTML = '<option value="">اختر المنطقة</option>';
        Object.keys(SHELF_HIERARCHY).forEach(z => {
          const opt = document.createElement('option');
          opt.value = z;
          opt.textContent = SHELF_HIERARCHY[z].label;
          DOM.locZone.appendChild(opt);
        });
      }

      function populateAisles(zone, selAisle = '') {
        DOM.locAisle.innerHTML = '<option value="">اختر الممر</option>';
        DOM.locRack.innerHTML = '<option value="">اختر الوحدة</option>';
        DOM.locShelf.innerHTML = '<option value="">اختر الرف</option>';
        DOM.locAisle.disabled = !zone;
        DOM.locRack.disabled = true;
        DOM.locShelf.disabled = true;

        if (zone && SHELF_HIERARCHY[zone]) {
          Object.keys(SHELF_HIERARCHY[zone].aisles).forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            if (a === selAisle) opt.selected = true;
            DOM.locAisle.appendChild(opt);
          });
          if (selAisle) populateRacks(zone, selAisle);
        }
        updateLocBadge();
      }

      function populateRacks(zone, aisle, selRack = '') {
        DOM.locRack.innerHTML = '<option value="">اختر الوحدة</option>';
        DOM.locShelf.innerHTML = '<option value="">اختر الرف</option>';
        DOM.locRack.disabled = !aisle;
        DOM.locShelf.disabled = true;

        if (zone && aisle && SHELF_HIERARCHY[zone]?.aisles[aisle]) {
          SHELF_HIERARCHY[zone].aisles[aisle].racks.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = `الوحدة ${r}`;
            if (r === selRack) opt.selected = true;
            DOM.locRack.appendChild(opt);
          });
          if (selRack) populateShelves(zone, aisle, selRack);
        }
        updateLocBadge();
      }

      function populateShelves(zone, aisle, rack, selShelf = '') {
        DOM.locShelf.innerHTML = '<option value="">اختر الرف</option>';
        DOM.locShelf.disabled = !rack;

        if (zone && aisle && SHELF_HIERARCHY[zone]?.aisles[aisle]) {
          SHELF_HIERARCHY[zone].aisles[aisle].shelves.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            if (s === selShelf) opt.selected = true;
            DOM.locShelf.appendChild(opt);
          });
        }
        updateLocBadge();
      }

      function updateLocBadge() {
        const z = DOM.locZone.value, a = DOM.locAisle.value, r = DOM.locRack.value, s = DOM.locShelf.value;
        if (!z && !a && !r && !s) {
          DOM.locationPreviewBadge.innerHTML = '<span>لم يتم تحديد موقع الرف</span>';
          return;
        }
        DOM.locationPreviewBadge.innerHTML = `<span class="text-[#153f2d] font-bold">${z || '؟'} › ${a || '؟'} › ${r || '؟'} › ${s || '؟'}</span>`;
      }

      function getFilteredCatalog() {
        return state.products.filter(item => {
          if (state.filters.status !== 'ALL' && item.status !== state.filters.status) return false;
          if (state.filters.category !== 'ALL' && item.category !== state.filters.category) return false;
          if (state.filters.search.trim()) {
            const q = state.filters.search.toLowerCase().trim();
            if (!item.name.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) return false;
          }
          return true;
        });
      }

      function getPageNumbers(currentPage, totalPages) {
        if (totalPages <= 7) {
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
          return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (currentPage >= totalPages - 3) {
          return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }

      function scrollToTableTop() {
        const tableContainer = DOM.tableBody ? DOM.tableBody.closest('.overflow-y-auto') : null;
        if (tableContainer) {
          tableContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      function renderPaginationControls(maxPages) {
        if (!DOM.paginationControls) return;

        const currentPage = state.pagination.page;
        const isAll = state.pagination.pageSize === 'ALL';
        const canPrev = !isAll && currentPage > 1;
        const canNext = !isAll && currentPage < maxPages;
        const pageNumbers = isAll ? [1] : getPageNumbers(currentPage, maxPages);

        let html = '';

        // Previous button ("السابق")
        html += `
          <button type="button" class="btn-page-prev inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition select-none ${canPrev ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shadow-2xs' : 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed opacity-60'}" ${!canPrev ? 'disabled' : ''}>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            <span>السابق</span>
          </button>
        `;

        // Numbered page buttons
        pageNumbers.forEach(item => {
          if (item === '...') {
            html += `<span class="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400 select-none">...</span>`;
          } else {
            const isActive = item === currentPage;
            html += `
              <button type="button" class="btn-page-num w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition select-none ${isActive ? 'bg-[#153f2d] text-white shadow-2xs pointer-events-none' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs'}" data-page="${item}">
                ${item}
              </button>
            `;
          }
        });

        // Next button ("التالي")
        html += `
          <button type="button" class="btn-page-next inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition select-none ${canNext ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shadow-2xs' : 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed opacity-60'}" ${!canNext ? 'disabled' : ''}>
            <span>التالي</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
        `;

        DOM.paginationControls.innerHTML = html;
      }

      function renderCatalog() {
        const filtered = getFilteredCatalog();
        const total = filtered.length;
        const isAll = state.pagination.pageSize === 'ALL';
        const pageSize = isAll ? (total || 1) : (parseInt(state.pagination.pageSize, 10) || 10);
        const maxPages = isAll ? 1 : (Math.ceil(total / pageSize) || 1);

        if (state.pagination.page > maxPages) state.pagination.page = maxPages;
        if (state.pagination.page < 1) state.pagination.page = 1;

        const start = isAll ? 0 : (state.pagination.page - 1) * pageSize;
        const paginated = isAll ? filtered : filtered.slice(start, start + pageSize);

        if (DOM.clearSearchBtn) {
          DOM.clearSearchBtn.classList.toggle('hidden', state.filters.search === '');
        }

        if (total === 0) {
          DOM.tableBody.innerHTML = '';
          DOM.emptyState.classList.remove('hidden');
          DOM.emptyState.classList.add('flex');
        } else {
          DOM.emptyState.classList.add('hidden');
          DOM.emptyState.classList.remove('flex');

          DOM.tableBody.innerHTML = paginated.map(p => {
            const isSel = state.selectedIds.has(p.id);
            const statusBadge = p.status === 'Published' 
              ? `<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">منشور</span>`
              : (p.status === 'Draft' ? `<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">مسودة</span>` : `<span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">غير نشط</span>`);

            const qty = (typeof p.quantity === 'number') ? p.quantity : (p.isAvailable ? 12 : 0);
            let stockBadge = '';
            if (qty === 0) {
              stockBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>نفد (0)</span>`;
            } else if (qty <= 5) {
              stockBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>حرج (${qty})</span>`;
            } else {
              stockBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>متوفر (${qty})</span>`;
            }

            return `
              <tr class="hover:bg-slate-50/90 transition ${isSel ? 'bg-[#edf5f0]/60' : ''}">
                <td class="px-6 py-4">
                  <input type="checkbox" class="row-select-checkbox w-4 h-4 rounded text-[#153f2d] cursor-pointer accent-[#153f2d]" data-id="${p.id}" ${isSel ? 'checked' : ''}>
                </td>
                <td class="px-6 py-4 font-bold text-slate-900">
                  <div class="text-sm font-extrabold text-slate-900">${escapeHtml(p.name)}</div>
                  <div class="text-[11px] font-mono text-slate-400 font-normal" dir="ltr">${p.sku}</div>
                  <div class="text-[11px] text-slate-500 font-medium mt-0.5">المتوفر بالمخزون: <strong class="text-slate-800">${qty}</strong> قطعة</div>
                </td>
                <td class="px-6 py-4"><span class="px-3 py-1 rounded-xl text-xs font-bold bg-[#edf5f0] text-[#153f2d]">${escapeHtml(p.category)}</span></td>
                <td class="px-6 py-4 font-bold text-slate-900">${formatCurrency(p.price)}</td>
                <td class="px-6 py-4 text-xs font-bold text-slate-700">
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-xl">
                    <span>${p.location ? `${p.location.zone} › ${p.location.aisle}` : '—'}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  ${stockBadge}
                </td>
                <td class="px-6 py-4 text-center">
                  <input type="checkbox" class="toggle-availability w-4 h-4 rounded text-[#153f2d] accent-[#153f2d] cursor-pointer" data-id="${p.id}" ${p.isAvailable ? 'checked' : ''}>
                </td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-left">
                  <div class="flex items-center justify-end gap-1.5">
                    <button class="btn-edit-p p-2 text-slate-400 hover:text-[#153f2d] hover:bg-[#edf5f0] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" data-id="${p.id}" title="تعديل"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    <button class="btn-del-p p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" data-id="${p.id}" title="حذف"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }

        DOM.totalCountBadge.textContent = state.products.length;
        DOM.countAll.textContent = state.products.length;
        DOM.countPublished.textContent = state.products.filter(p => p.status === 'Published').length;
        DOM.countDraft.textContent = state.products.filter(p => p.status === 'Draft').length;
        DOM.countInactive.textContent = state.products.filter(p => p.status === 'Inactive').length;

        // Pagination summary
        const startItem = total === 0 ? 0 : start + 1;
        const endItem = isAll ? total : Math.min(start + pageSize, total);
        if (DOM.paginationSummary) {
          DOM.paginationSummary.textContent = `عرض ${startItem} إلى ${endItem} من أصل ${total} صنفاً`;
        }

        // Render dynamic pagination controls
        renderPaginationControls(maxPages);

        // Update select all checkbox state
        if (DOM.selectAllCheckbox) {
          const displayedIds = paginated.map(p => p.id);
          const allDisplayedSelected = displayedIds.length > 0 && displayedIds.every(id => state.selectedIds.has(id));
          DOM.selectAllCheckbox.checked = allDisplayedSelected;
        }

        const cats = Array.from(new Set(state.products.map(p => p.category))).sort();
        DOM.categoryFilter.innerHTML = '<option value="ALL">جميع التصنيفات</option>' + cats.map(c => `<option value="${c}" ${c === state.filters.category ? 'selected' : ''}>${c}</option>`).join('');

        DOM.bulkActionsBar.classList.toggle('hidden', state.selectedIds.size === 0);
        DOM.bulkSelectedCount.textContent = state.selectedIds.size;
      }

      function openModal(mode = 'create', productId = null) {
        state.modal.isOpen = true;
        DOM.productForm.reset();
        initShelfZones();

        if (mode === 'edit' && productId) {
          const p = state.products.find(x => x.id === productId);
          if (!p) return;
          DOM.modalTitle.textContent = `تعديل الصنف — ${p.name}`;
          DOM.formProductId.value = p.id;
          DOM.formName.value = p.name;
          DOM.formSku.value = p.sku;
          DOM.formCategory.value = p.category;
          DOM.formPrice.value = p.price;
          if (DOM.formQuantity) {
            DOM.formQuantity.value = typeof p.quantity === 'number' ? p.quantity : (p.isAvailable ? 10 : 0);
          }
          DOM.formStatus.value = p.status;
          DOM.formAvailable.checked = !!p.isAvailable;
          if (p.location) {
            DOM.locZone.value = p.location.zone;
            populateAisles(p.location.zone, p.location.aisle);
            populateRacks(p.location.zone, p.location.aisle, p.location.rack);
            populateShelves(p.location.zone, p.location.aisle, p.location.rack, p.location.shelf);
          }
        } else {
          DOM.modalTitle.textContent = 'إضافة صنف جديد';
          DOM.formProductId.value = '';
          if (DOM.formQuantity) DOM.formQuantity.value = 10;
          DOM.formAvailable.checked = true;
          populateAisles('');
        }

        DOM.productModal.classList.remove('hidden');
        requestAnimationFrame(() => {
          DOM.modalBackdrop.classList.remove('opacity-0');
          DOM.modalPanel.classList.remove('opacity-0', 'scale-95');
        });
      }

      function closeModal() {
        DOM.modalBackdrop.classList.add('opacity-0');
        DOM.modalPanel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => DOM.productModal.classList.add('hidden'), 200);
      }

      function initEvents() {
        DOM.tabBtnCatalog.addEventListener('click', () => switchTab('catalog'));
        DOM.tabBtnFloorplan.addEventListener('click', () => switchTab('floorplan'));

        DOM.btnImportCatalog.addEventListener('click', openImportWizard);
        DOM.btnCloseWizard.addEventListener('click', closeImportWizard);
        DOM.btnWizardCancel.addEventListener('click', closeImportWizard);
        DOM.wizardBackdrop.addEventListener('click', closeImportWizard);

        DOM.csvDropzone.addEventListener('click', () => DOM.csvFileInput.click());
        DOM.csvDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          DOM.csvDropzone.classList.add('border-[#153f2d]', 'bg-[#edf5f0]/40');
        });
        DOM.csvDropzone.addEventListener('dragleave', () => {
          DOM.csvDropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]/40');
        });
        DOM.csvDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          DOM.csvDropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]/40');
          if (e.dataTransfer.files.length) handleCSVFile(e.dataTransfer.files[0]);
        });
        DOM.csvFileInput.addEventListener('change', (e) => {
          if (e.target.files.length) handleCSVFile(e.target.files[0]);
        });

        DOM.btnLoadSampleCsv.addEventListener('click', () => {
          const { headers, rows } = parseCSVText(SAMPLE_CSV_RAW);
          processParsedData(headers, rows);
        });

        [DOM.mapName, DOM.mapPrice, DOM.mapZone, DOM.mapAisle].forEach(sel => {
          if (sel) sel.addEventListener('change', updateMappingPreviewTable);
        });

        if (DOM.mapSku) {
          DOM.mapSku.addEventListener('change', () => {
            checkAndAutoCorrectSkuMapping(true);
            updateMappingPreviewTable();
          });
        }

        if (DOM.mapCategory) {
          DOM.mapCategory.addEventListener('change', () => {
            if (DOM.mapSku && DOM.mapSku.value && DOM.mapSku.value === DOM.mapCategory.value) {
              showToast('تم اختيار نفس العمود لحقلي رمز الصنف والتصنيف. يرجى اختيار عمود منفصل لكل حقل.', 'warning');
            }
            updateMappingPreviewTable();
          });
        }

        if (DOM.btnAutoCorrectMapping) {
          DOM.btnAutoCorrectMapping.addEventListener('click', () => {
            autoCorrectColumnSelection(true);
          });
        }

        if (DOM.btnFixStep3Mapping) {
          DOM.btnFixStep3Mapping.addEventListener('click', () => {
            setWizardStep(2);
            autoCorrectColumnSelection(true);
          });
        }

        DOM.btnWizardNext.addEventListener('click', () => {
          if (state.wizard.currentStep === 1) {
            if (!state.wizard.rawRows.length) {
              showToast('يرجى رفع ملف أو تحميل البيانات النموذجية أولاً', 'error');
              return;
            }
            setWizardStep(2);
          } else if (state.wizard.currentStep === 2) {
            if (!DOM.mapName.value || !DOM.mapSku.value || !DOM.mapPrice.value) {
              showToast('يرجى مطابقة الحقول الأساسية المطلوبة (الاسم، الرمز، السعر)', 'error');
              return;
            }
            if (DOM.mapSku.value && DOM.mapCategory.value && DOM.mapSku.value === DOM.mapCategory.value) {
              showToast('لا يمكن ربط حقل رمز الصنف (SKU) وحقل التصنيف بنفس العمود', 'error');
              return;
            }
            // Auto-check if SKU column contains descriptive category text
            const corrected = checkAndAutoCorrectSkuMapping(true);
            if (corrected && (!DOM.mapSku.value || !state.wizard.mappings.sku)) {
              showToast('تم توجيه التصنيف إلى حقل التصنيف تلقائياً. يرجى اختيار عمود الباركود / SKU للمتابعة.', 'warning');
              return;
            }
            setWizardStep(3);
          } else if (state.wizard.currentStep === 3) {
            setWizardStep(4);
          }
        });

        DOM.btnWizardBack.addEventListener('click', () => {
          if (state.wizard.currentStep > 1) {
            setWizardStep(state.wizard.currentStep - 1);
          }
        });

        DOM.btnWizardCommit.addEventListener('click', commitImport);
        DOM.btnDownloadErrorCsv.addEventListener('click', downloadErrorCSV);

        DOM.dropzoneContainer.addEventListener('click', () => DOM.fileInput.click());
        DOM.fileInput.addEventListener('change', (e) => {
          if (e.target.files.length) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
              state.floorPlan.imageUrl = ev.target.result;
              state.floorPlan.pins = [];
              renderFloorPlan();
              showToast('تم تحميل المخطط بنجاح!');
            };
            reader.readAsDataURL(file);
          }
        });

        DOM.mapContainer.addEventListener('click', handleMapClick);
        DOM.btnSavePopoverPin.addEventListener('click', handleSavePopoverPin);
        DOM.btnClosePopover.addEventListener('click', hidePinPopover);
        DOM.btnCancelPopover.addEventListener('click', hidePinPopover);

        DOM.mapContainer.addEventListener('mousemove', (e) => {
          const rect = DOM.mapContainer.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)).toFixed(1);
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)).toFixed(1);
          DOM.currentCoordsDisplay.textContent = `X: ${x}% | Y: ${y}%`;
        });

        DOM.colorPickerGroup.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            DOM.colorPickerGroup.querySelectorAll('button').forEach(b => b.classList.remove('ring-2', 'ring-offset-1'));
            btn.classList.add('ring-2', 'ring-offset-1');
            state.floorPlan.selectedColor = btn.dataset.color;
          });
        });

        DOM.btnZoomIn.addEventListener('click', () => {
          if (state.floorPlan.zoom < 2) { state.floorPlan.zoom += 0.2; renderFloorPlan(); }
        });
        DOM.btnZoomOut.addEventListener('click', () => {
          if (state.floorPlan.zoom > 0.6) { state.floorPlan.zoom -= 0.2; renderFloorPlan(); }
        });
        DOM.btnZoomReset.addEventListener('click', () => {
          state.floorPlan.zoom = 1; renderFloorPlan();
        });
        DOM.btnReplaceMap.addEventListener('click', () => {
          state.floorPlan.imageUrl = ''; renderFloorPlan();
        });
        DOM.btnLoadSampleMap.addEventListener('click', () => {
          state.floorPlan.imageUrl = createSampleBlueprintSvg();
          renderFloorPlan();
          showToast('تم تحميل المخطط النموذجي!');
        });
        DOM.btnClearAllPins.addEventListener('click', () => {
          if (confirm('هل أنت متأكد من مسح جميع نقاط التوجيه؟')) {
            state.floorPlan.pins = [];
            renderPins();
            renderPinsSidebar();
            showToast('تم مسح كافة النقاط', 'error');
          }
        });

        DOM.searchInput.addEventListener('input', (e) => {
          state.filters.search = e.target.value;
          state.pagination.page = 1;
          renderCatalog();
        });
        DOM.categoryFilter.addEventListener('change', (e) => {
          state.filters.category = e.target.value;
          state.pagination.page = 1;
          renderCatalog();
        });
        DOM.statusTabs.forEach(t => {
          t.addEventListener('click', () => {
            DOM.statusTabs.forEach(tab => tab.classList.remove('bg-[#153f2d]', 'text-white'));
            t.classList.add('bg-[#153f2d]', 'text-white');
            state.filters.status = t.dataset.statusTab;
            state.pagination.page = 1;
            renderCatalog();
          });
        });

        // Items per page change listener
        if (DOM.itemsPerPageSelect) {
          DOM.itemsPerPageSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            state.pagination.pageSize = (val === 'ALL') ? 'ALL' : (parseInt(val, 10) || 10);
            state.pagination.page = 1;
            renderCatalog();
          });
        }

        // Functional pagination controls (Previous, Next, Numbered buttons)
        if (DOM.paginationControls) {
          DOM.paginationControls.addEventListener('click', (e) => {
            const prevBtn = e.target.closest('.btn-page-prev');
            if (prevBtn && !prevBtn.disabled) {
              if (state.pagination.page > 1) {
                state.pagination.page--;
                renderCatalog();
                scrollToTableTop();
              }
              return;
            }

            const nextBtn = e.target.closest('.btn-page-next');
            if (nextBtn && !nextBtn.disabled) {
              const total = getFilteredCatalog().length;
              const isAll = state.pagination.pageSize === 'ALL';
              const pageSize = isAll ? (total || 1) : (parseInt(state.pagination.pageSize, 10) || 10);
              const maxPages = isAll ? 1 : (Math.ceil(total / pageSize) || 1);
              if (state.pagination.page < maxPages) {
                state.pagination.page++;
                renderCatalog();
                scrollToTableTop();
              }
              return;
            }

            const numBtn = e.target.closest('.btn-page-num');
            if (numBtn && numBtn.dataset.page) {
              const targetPage = parseInt(numBtn.dataset.page, 10);
              if (!isNaN(targetPage) && targetPage !== state.pagination.page) {
                state.pagination.page = targetPage;
                renderCatalog();
                scrollToTableTop();
              }
            }
          });
        }

        if (DOM.clearSearchBtn) {
          DOM.clearSearchBtn.addEventListener('click', () => {
            state.filters.search = '';
            if (DOM.searchInput) DOM.searchInput.value = '';
            state.pagination.page = 1;
            renderCatalog();
          });
        }

        const handleResetFilters = () => {
          state.filters.search = '';
          state.filters.category = 'ALL';
          state.filters.status = 'ALL';
          if (DOM.searchInput) DOM.searchInput.value = '';
          if (DOM.categoryFilter) DOM.categoryFilter.value = 'ALL';
          DOM.statusTabs.forEach(tab => {
            if (tab.dataset.statusTab === 'ALL') {
              tab.classList.add('bg-[#153f2d]', 'text-white');
            } else {
              tab.classList.remove('bg-[#153f2d]', 'text-white');
            }
          });
          state.pagination.page = 1;
          renderCatalog();
        };

        if (DOM.emptyResetBtn) DOM.emptyResetBtn.addEventListener('click', handleResetFilters);
        if (DOM.btnResetFilters) DOM.btnResetFilters.addEventListener('click', handleResetFilters);

        if (DOM.selectAllCheckbox) {
          DOM.selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = DOM.tableBody.querySelectorAll('.row-select-checkbox');
            checkboxes.forEach(cb => {
              cb.checked = e.target.checked;
              const id = cb.dataset.id;
              if (e.target.checked) state.selectedIds.add(id);
              else state.selectedIds.delete(id);
            });
            DOM.bulkActionsBar.classList.toggle('hidden', state.selectedIds.size === 0);
            DOM.bulkSelectedCount.textContent = state.selectedIds.size;
          });
        }

        if (DOM.bulkClear) {
          DOM.bulkClear.addEventListener('click', () => {
            state.selectedIds.clear();
            renderCatalog();
          });
        }

        if (DOM.bulkSetAvailable) {
          DOM.bulkSetAvailable.addEventListener('click', () => {
            state.selectedIds.forEach(id => {
              const p = state.products.find(x => String(x.id) === String(id));
              if (p) p.isAvailable = true;
            });
            saveCatalogProducts();
            renderCatalog();
            showToast('تم تحديث حالة توفر الأصناف المحددة');
          });
        }

        if (DOM.bulkDelete) {
          DOM.bulkDelete.addEventListener('click', () => {
            if (confirm(`هل أنت متأكد من حذف ${state.selectedIds.size} من المنتجات المحددة؟`)) {
              state.products = state.products.filter(p => !state.selectedIds.has(String(p.id)));
              state.selectedIds.clear();
              saveCatalogProducts();
              renderCatalog();
              showToast('تم حذف المنتجات المحددة بنجاح');
            }
          });
        }

        if (DOM.btnAddProduct) DOM.btnAddProduct.addEventListener('click', () => openModal('create'));
        if (DOM.btnCloseModal) DOM.btnCloseModal.addEventListener('click', closeModal);
        if (DOM.btnCancelModal) DOM.btnCancelModal.addEventListener('click', closeModal);
        if (DOM.modalBackdrop) DOM.modalBackdrop.addEventListener('click', closeModal);

        if (DOM.btnAiShelfScan) {
          DOM.btnAiShelfScan.addEventListener('click', (e) => {
            e.preventDefault();
            const storeId = (typeof ApiClient !== 'undefined' && ApiClient.getActiveStoreId()) ||
                            localStorage.getItem('store_id') ||
                            localStorage.getItem('dawwer_active_store_id') || '';
            const targetUrl = storeId ? `ai-capture.html?store_id=${encodeURIComponent(storeId)}` : 'ai-capture.html';
            window.location.href = targetUrl;
          });
        }
        if (DOM.btnCloseAiCamera) DOM.btnCloseAiCamera.addEventListener('click', closeAiCameraModal);
        if (DOM.btnCancelAiCamera) DOM.btnCancelAiCamera.addEventListener('click', closeAiCameraModal);
        if (DOM.aiCameraBackdrop) DOM.aiCameraBackdrop.addEventListener('click', closeAiCameraModal);
        if (DOM.btnToggleCamFacing) DOM.btnToggleCamFacing.addEventListener('click', toggleCameraFacing);
        if (DOM.btnSnapAiPhoto) DOM.btnSnapAiPhoto.addEventListener('click', snapCameraPhoto);
        if (DOM.aiCameraFileFallback) {
          DOM.aiCameraFileFallback.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
              processShelfImage(e.target.files[0]);
            }
          });
        }

        async function deleteCatalogProduct(prodId, targetProduct) {
          const pName = targetProduct ? targetProduct.name : `منتج #${prodId}`;
          const storeId = getStoreId();
          const token = getAuthToken();

          // 1. Immediately delete from local state and re-render table
          state.products = state.products.filter(p => String(p.id) !== String(prodId));
          saveCatalogProducts();
          if (targetProduct) {
            recordAuditLog('Product Delete', targetProduct.name, targetProduct.sku, 'حذف المنتج نهائياً من الكتالوج', 'تم حذف الصنف من الجدول بنجاح');
          }
          renderCatalog();
          showToast(`تم حذف "${pName}" بنجاح.`);

          // 2. Dispatch DELETE to backend with errors suppressed to mute notifications on failure
          try {
            fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(prodId)}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            }).catch(err => {
              console.warn('[Catalog Delete Request Note]:', err.message || err);
            });
          } catch (err) {
            console.warn('[Catalog Delete Request Note]:', err.message || err);
          }
        }

        DOM.tableBody.addEventListener('click', (e) => {
          const editBtn = e.target.closest('.btn-edit-p');
          if (editBtn) return openModal('edit', editBtn.dataset.id);

          const delBtn = e.target.closest('.btn-del-p');
          if (delBtn) {
            const prodId = delBtn.dataset.id;
            const targetProduct = state.products.find(p => String(p.id) === String(prodId));
            const pName = targetProduct ? targetProduct.name : `منتج #${prodId}`;
            if (confirm(`هل أنت متأكد من حذف المنتج (${pName})؟`)) {
              deleteCatalogProduct(prodId, targetProduct);
            }
          }

          if (e.target.classList.contains('toggle-availability')) {
            const p = state.products.find(x => x.id === e.target.dataset.id);
            if (p) {
              p.isAvailable = e.target.checked;
              saveCatalogProducts();
              recordAuditLog('Stock Adjustment', p.name, p.sku, `تعديل حالة التوفر إلى: ${p.isAvailable ? 'متوفر' : 'غير متوفر'}`, 'تغيير حالة توفر الصنف للعملاء');
              showToast(`تم تحديث حالة توفر "${p.name}" إلى ${p.isAvailable ? 'متوفر' : 'غير متوفر'}`);
            }
          }
        });

        DOM.tableBody.addEventListener('change', (e) => {
          if (e.target.classList.contains('row-select-checkbox')) {
            const id = e.target.dataset.id;
            if (e.target.checked) {
              state.selectedIds.add(id);
            } else {
              state.selectedIds.delete(id);
            }
            DOM.bulkActionsBar.classList.toggle('hidden', state.selectedIds.size === 0);
            DOM.bulkSelectedCount.textContent = state.selectedIds.size;
            const checkboxes = Array.from(DOM.tableBody.querySelectorAll('.row-select-checkbox'));
            if (DOM.selectAllCheckbox) {
              DOM.selectAllCheckbox.checked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
            }
          }
        });

        DOM.locZone.addEventListener('change', (e) => populateAisles(e.target.value));
        DOM.locAisle.addEventListener('change', (e) => populateRacks(DOM.locZone.value, e.target.value));
        DOM.locRack.addEventListener('change', (e) => populateShelves(DOM.locZone.value, DOM.locAisle.value, e.target.value));
        DOM.locShelf.addEventListener('change', updateLocBadge);

        DOM.productForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = DOM.formName.value.trim();
          const sku = DOM.formSku.value.trim();
          if (!name || !sku) return showToast('يرجى تعبئة الحقول الإلزامية (اسم المنتج والرمز SKU)', 'error');

          const priceVal = parseFloat(DOM.formPrice.value);
          if (isNaN(priceVal) || priceVal <= 0) {
            return showToast('يرجى إدخال سعر صحيح أكبر من الصفر', 'error');
          }

          const rawQty = DOM.formQuantity ? parseInt(DOM.formQuantity.value, 10) : 10;
          const quantityVal = isNaN(rawQty) ? 10 : Math.max(0, rawQty);
          const isAvail = DOM.formAvailable.checked && quantityVal > 0;

          const payload = {
            name,
            sku: sku.toUpperCase(),
            category: DOM.formCategory.value || 'عام',
            price: priceVal,
            quantity: quantityVal,
            status: DOM.formStatus.value,
            isAvailable: isAvail,
            location: { zone: DOM.locZone.value || 'المنطقة أ', aisle: DOM.locAisle.value || 'ممر 01', rack: DOM.locRack.value || 'R1', shelf: DOM.locShelf.value || 'رف 1' },
            updatedAt: new Date().toISOString().slice(0, 16)
          };

          const id = DOM.formProductId.value;
          const storeId = getStoreId();
          const token = getAuthToken();

          const cleanZone = payload.location.zone || "المنطقة أ";
          const cleanAisle = payload.location.aisle.replace(/[^0-9]/g, '') || "01";
          const cleanRack = payload.location.rack.replace(/[^0-9]/g, '') || "1";
          const cleanShelf = payload.location.shelf.replace(/[^0-9]/g, '') || "1";
          const mapTarget = `${cleanZone} - ممر ${cleanAisle} - رف ${cleanShelf}`;

          const livePayload = {
            store_sku: payload.sku,
            product_name: payload.name,
            category: payload.category,
            price: payload.price,
            quantity: quantityVal,
            stock_status: isAvail ? "IN_STOCK" : "OUT_OF_STOCK",
            zone: cleanZone,
            aisle: cleanAisle,
            rack: cleanRack,
            shelf: cleanShelf,
            map_target: mapTarget
          };

          const reqHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          };

          if (id) {
            try {
              fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(livePayload)
              }).catch(err => {
                console.warn('[Catalog Edit Note - Backend Sync]:', err);
              });

              const idx = state.products.findIndex(p => String(p.id) === String(id));
              if (idx !== -1) {
                const oldPrice = state.products[idx].price;
                state.products[idx] = { ...state.products[idx], ...payload };
                recordAuditLog('Price/Stock Update', payload.name, payload.sku, `تعديل السعر: ${oldPrice} ➔ ${payload.price} ر.س | المخزون: ${quantityVal}`, 'تحديث بيانات المنتج وموقعه الهندسي بالسيرفر الحي');
              }
              saveCatalogProducts();
              closeModal();
              renderCatalog();
              showToast(`تم حفظ وتحديث "${payload.name}" بنجاح!`);
            } catch (err) {
              console.error('[Catalog Edit Error]', err);
              closeModal();
              renderCatalog();
              showToast(`تم حفظ التعديل محلياً`, 'warning');
            }
          } else {
            try {
              let newId = `prod-${Date.now()}`;
              try {
                const res = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
                  method: 'POST',
                  headers: reqHeaders,
                  body: JSON.stringify(livePayload)
                });
                if (res.ok) {
                  const created = await res.json().catch(() => null);
                  if (created && (created.id || created.data?.id)) {
                    newId = created.id || created.data.id;
                  }
                }
              } catch (createErr) {
                console.warn('[Catalog Create Note - Backend Sync]:', createErr);
              }

              state.products.unshift({ id: newId, ...payload });
              recordAuditLog('Manual Creation', payload.name, payload.sku, `إضافة منتج يدوي جديد بالسعر: ${payload.price} ر.س (المخزون: ${quantityVal})`, 'إنشاء الصنف يدوياً بالسيرفر والكتالوج');
              saveCatalogProducts();
              closeModal();
              renderCatalog();
              showToast(`تمت إضافة "${payload.name}" بنجاح إلى الكتالوج!`);
            } catch (err) {
              console.error('[Catalog Create Error]', err);
              closeModal();
              renderCatalog();
              showToast(`تمت الإضافة بنجاح`, 'success');
            }
          }
        });
      }

      async function loadServerCategories() {
        try {
          const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
            ? CONFIG.API_BASE_URL.replace(/\/+$/, '')
            : 'https://dawwer.runasp.net/api';

          let list = [];
          if (typeof ApiClient !== 'undefined' && ApiClient.categories && ApiClient.categories.list) {
            const res = await ApiClient.categories.list();
            list = Array.isArray(res) ? res : (res?.data || []);
          } else if (typeof ApiClient !== 'undefined' && ApiClient.core) {
            const res = await ApiClient.core('/categories/tree', { method: 'GET' }).catch(() => null);
            list = Array.isArray(res) ? res : (res?.data || []);
          } else {
            const res = await fetch(`${apiBase}/categories/tree`).then(r => r.json()).catch(() => null);
            list = Array.isArray(res) ? res : (res?.data || []);
          }

          if (!Array.isArray(list) || list.length === 0) {
            try {
              const flatRes = (typeof ApiClient !== 'undefined' && ApiClient.core)
                ? await ApiClient.core('/categories', { method: 'GET' })
                : await fetch(`${apiBase}/categories`).then(r => r.json());
              list = Array.isArray(flatRes) ? flatRes : (flatRes?.data || []);
            } catch (e) {}
          }

          const extractNames = (items) => {
            let names = [];
            if (!Array.isArray(items)) return names;
            items.forEach(item => {
              if (item && item.name) names.push(item.name);
              if (item && item.children && Array.isArray(item.children)) {
                names.push(...extractNames(item.children));
              }
            });
            return names;
          };

          if (Array.isArray(list) && list.length > 0) {
            const catNames = [...new Set(extractNames(list))].filter(Boolean);
            if (catNames.length > 0) {
              if (DOM.categoryFilter) {
                const currentFilter = state.filters.category;
                DOM.categoryFilter.innerHTML = '<option value="ALL">جميع التصنيفات</option>' +
                  catNames.map(name => `<option value="${escapeHtml(name)}" ${name === currentFilter ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
              }
              if (DOM.formCategory) {
                const currentFormVal = DOM.formCategory.value;
                DOM.formCategory.innerHTML = '<option value="">اختر التصنيف</option>' +
                  catNames.map(name => `<option value="${escapeHtml(name)}" ${name === currentFormVal ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
              }
            }
          }
        } catch (e) {
          console.warn('[Catalog Categories Fetch Note]: Gracefully falling back to default categories.', e);
        }
      }

      async function fetchLiveProducts() {
        const storeId = getStoreId();
        const token = getAuthToken();

        try {
          if (DOM.tableBody && state.products.length === 0) {
            DOM.tableBody.innerHTML = `
              <tr>
                <td colspan="9" class="py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <svg class="animate-spin h-7 w-7 text-[#153f2d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-xs font-bold text-slate-500">جاري تحميل كتالوج المنتجات من الخادم...</span>
                  </div>
                </td>
              </tr>
            `;
          }

          const headers = { 'Accept': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;

          const res = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
            method: 'GET',
            headers,
            signal: controller ? controller.signal : undefined
          }).finally(() => {
            if (timer) clearTimeout(timer);
          });

          if (!res.ok) {
            console.warn(`[Catalog] Products request returned HTTP ${res.status}. Preserving local items.`);
            renderCatalog();
            return;
          }

          let json = await res.json().catch(() => null);
          const liveItems = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : null);

          if (Array.isArray(liveItems) && liveItems.length > 0) {
            state.products = liveItems.map((p, idx) => ({
              id: p.id || ('prod-' + (idx + 1)),
              name: p.product_name || p.name || 'منتج بدون اسم',
              sku: p.store_sku || p.sku || 'SKU-000',
              category: p.category || 'عام',
              price: typeof p.price === 'number' ? p.price : parseFloat(p.price || 0),
              quantity: typeof p.quantity === 'number' ? p.quantity : (typeof p.stock_quantity === 'number' ? p.stock_quantity : (p.stock_status !== 'OUT_OF_STOCK' ? 12 : 0)),
              isAvailable: p.stock_status !== 'OUT_OF_STOCK' && (p.quantity === undefined || p.quantity > 0),
              location: {
                zone: p.zone || 'المنطقة أ',
                aisle: p.aisle ? (String(p.aisle).includes('ممر') ? p.aisle : `ممر ${p.aisle}`) : 'ممر 01',
                rack: p.rack ? (String(p.rack).startsWith('R') ? p.rack : `R${p.rack}`) : 'R1',
                shelf: p.shelf ? (String(p.shelf).includes('رف') ? p.shelf : `رف ${p.shelf}`) : 'رف 1'
              },
              status: p.stock_status === 'OUT_OF_STOCK' ? 'Draft' : (p.status || 'Published'),
              updatedAt: p.updated_at ? new Date(p.updated_at).toLocaleDateString('ar-SA') : 'اليوم'
            }));

            saveCatalogProducts();
          }
          renderCatalog();
        } catch (err) {
          console.warn('[Catalog] Render server is sleeping or returned an error. Displaying fallback mock items:', err.message || err);
          if (state.products.length === 0) {
            state.products = loadCatalogProducts();
          }
          renderCatalog();
        }
      }

      let _catalogInitialized = false;
      async function init() {
        if (_catalogInitialized) return;
        _catalogInitialized = true;

        initEvents();
        if (DOM.itemsPerPageSelect) {
          const val = DOM.itemsPerPageSelect.value;
          state.pagination.pageSize = (val === 'ALL') ? 'ALL' : (parseInt(val, 10) || 10);
        }
        renderCatalog();
        renderFloorPlan();
        await loadServerCategories();
        await fetchLiveProducts();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }

    })();