const STORAGE_KEY = 'dawwer_ai_extraction_jobs';

    const SAMPLE_SHELF_IMAGE = 'assets/images/sample_shelf.jpg';

    function escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    if (typeof window !== 'undefined') {
      window.escapeHtml = escapeHtml;
    }

    function generateMockShelfSVG(zoneName, count) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="#f8fafc">
        <rect width="600" height="400" fill="#1e293b"/>
        <!-- Shelves Metal Racks -->
        <rect x="20" y="40" width="560" height="15" fill="#64748b" rx="4"/>
        <rect x="20" y="160" width="560" height="15" fill="#64748b" rx="4"/>
        <rect x="20" y="280" width="560" height="15" fill="#64748b" rx="4"/>

        <!-- Shelf Level 1 Items -->
        <rect x="40" y="60" width="60" height="90" fill="#0284c7" rx="6"/>
        <rect x="110" y="60" width="60" height="90" fill="#0369a1" rx="6"/>
        <rect x="180" y="70" width="50" height="80" fill="#10b981" rx="6"/>
        <rect x="240" y="70" width="50" height="80" fill="#059669" rx="6"/>
        <rect x="300" y="55" width="70" height="95" fill="#f59e0b" rx="6"/>
        <rect x="380" y="55" width="70" height="95" fill="#d97706" rx="6"/>
        <rect x="460" y="65" width="55" height="85" fill="#ec4899" rx="6"/>

        <!-- Shelf Level 2 Items -->
        <rect x="40" y="185" width="75" height="85" fill="#8b5cf6" rx="6"/>
        <rect x="125" y="185" width="75" height="85" fill="#7c3aed" rx="6"/>
        <rect x="210" y="195" width="65" height="75" fill="#14b8a6" rx="6"/>
        <rect x="285" y="195" width="65" height="75" fill="#0d9488" rx="6"/>
        <rect x="360" y="180" width="80" height="90" fill="#ef4444" rx="6"/>
        <rect x="450" y="180" width="80" height="90" fill="#dc2626" rx="6"/>

        <!-- Shelf Level 3 Items -->
        <rect x="50" y="305" width="90" height="80" fill="#e2e8f0" rx="6"/>
        <rect x="150" y="305" width="90" height="80" fill="#cbd5e1" rx="6"/>
        <rect x="250" y="305" width="90" height="80" fill="#94a3b8" rx="6"/>
        <rect x="350" y="305" width="90" height="80" fill="#64748b" rx="6"/>
        <rect x="450" y="305" width="90" height="80" fill="#475569" rx="6"/>

        <!-- HUD Overlay / Watermark -->
        <rect x="30" y="350" width="220" height="30" fill="rgba(0,0,0,0.7)" rx="6"/>
        <text x="40" y="370" fill="#38bdf8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="12" font-weight="bold">AI Live Feed: ${zoneName}</text>
      </svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    const DEFAULT_JOBS = [];


    let jobsList = [];
    let uploadedFiles = [];
    let currentFilter = 'all';
    let currentModalJob = null;

    function resolveActiveStoreId() {
      const isInvalid = (id) => !id || id === 'null' || id === 'undefined' || id === '7b8f6a91-45c2-48df-bc88-825dfa234123' || id === '11111111-1111-1111-1111-111111111111';

      // 1. Search first in URL Query Params (?store_id=... or ?storeId=...)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const qStoreId = urlParams.get('store_id') || urlParams.get('storeId');
        if (qStoreId && !isInvalid(qStoreId.trim())) {
          const clean = qStoreId.trim();
          persistActiveStoreId(clean);
          return clean;
        }
      } catch (e) {}

      // 2. Search second in localStorage under store_id or active_store_id
      try {
        const direct = localStorage.getItem('store_id') ||
                       localStorage.getItem('active_store_id') ||
                       localStorage.getItem('storeId') ||
                       localStorage.getItem('dawwer_active_store_id') ||
                       localStorage.getItem('dawwer_store_id');
        if (direct && !isInvalid(direct.trim())) {
          const clean = direct.trim();
          persistActiveStoreId(clean);
          return clean;
        } else if (direct && isInvalid(direct.trim())) {
          localStorage.removeItem('store_id');
          localStorage.removeItem('active_store_id');
          localStorage.removeItem('storeId');
        }

        const activeStoreRaw = localStorage.getItem('dawwer_active_store');
        if (activeStoreRaw) {
          const parsed = JSON.parse(activeStoreRaw);
          const sid = parsed?.storeId || parsed?.id || parsed?.store_id;
          if (sid && !isInvalid(sid.trim())) {
            const clean = sid.trim();
            persistActiveStoreId(clean);
            return clean;
          }
        }

        const userDataRaw = localStorage.getItem('dawwer_user_data') || localStorage.getItem('currentUser');
        if (userDataRaw) {
          const parsed = JSON.parse(userDataRaw);
          const sid = parsed?.storeId || parsed?.store_id || parsed?.store?.id;
          if (sid && !isInvalid(sid.trim())) {
            const clean = sid.trim();
            persistActiveStoreId(clean);
            return clean;
          }
        }

        if (typeof ApiClient !== 'undefined' && typeof ApiClient.getActiveStoreId === 'function') {
          const clientSid = ApiClient.getActiveStoreId();
          if (clientSid && !isInvalid(clientSid.trim())) {
            persistActiveStoreId(clientSid.trim());
            return clientSid.trim();
          }
        }
      } catch (e) {}

      // 3. Fallback: Only use configured default if valid
      const fallbackId = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_STORE_ID) ? CONFIG.DEFAULT_STORE_ID : null;
      if (fallbackId && !isInvalid(fallbackId)) {
        persistActiveStoreId(fallbackId);
        return fallbackId;
      }
      return null;
    }

    function persistActiveStoreId(id) {
      if (!id) return;
      try {
        localStorage.setItem('store_id', id);
        localStorage.setItem('active_store_id', id);
        localStorage.setItem('dawwer_active_store_id', id);
        localStorage.setItem('dawwer_store_id', id);

        if (typeof ApiClient !== 'undefined' && typeof ApiClient.setActiveStoreId === 'function') {
          ApiClient.setActiveStoreId(id);
        }

        const backBtn = document.getElementById('btn-back-to-catalog');
        if (backBtn) {
          backBtn.href = `catalog.html?store_id=${encodeURIComponent(id)}`;
        }
      } catch (e) {}
    }

    function syncStoreContext() {
      resolveActiveStoreId();
    }

    document.addEventListener('DOMContentLoaded', () => {
      syncStoreContext();
      loadJobs();
      updateShelfPreview();
      renderJobsTable();
      updateKPIs();
    });

    function isMockJob(job) {
      if (!job) return true;
      const mockIds = ['JOB-8942', 'JOB-8939', 'JOB-8935'];
      if (mockIds.includes(job.id)) return true;
      if (job.isMock) return true;
      if (Array.isArray(job.extractedItems)) {
        const hasMock = job.extractedItems.some(it => {
          const name = (it.name || '').toLowerCase();
          return name.includes('نادك') || name.includes('كيري') || name.includes('nadec') || name.includes('kiri');
        });
        if (hasMock) return true;
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

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && (raw.includes('نادك') || raw.includes('كيري') || raw.includes('JOB-8942') || raw.includes('JOB-8939'))) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(j => !isMockJob(j));
              localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    function normalizeJob(job) {
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

    function loadJobs() {
      cleanMockData();

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          jobsList = JSON.parse(stored);
        } else {
          jobsList = [];
        }
      } catch (e) {
        jobsList = [];
      }

      // Purge any legacy mock jobs from previous sessions and normalize
      if (Array.isArray(jobsList)) {
        jobsList = jobsList.filter(j => !isMockJob(j)).map(normalizeJob);
        saveJobs();
      } else {
        jobsList = [];
      }

      // Requirement 2: Graceful Fallback for Background Job Fetch:
      // Wrap initial job history fetch (GET ...?skip=0&limit=50) in a try/catch block.
      // If it returns 401, DO NOT trigger the global session logout/refresh loop immediately.
      // Instead, allow the user to proceed with uploading images, logging a localized warning in the jobs list container rather than blocking the whole view.
      (async function fetchInitialJobHistory() {
        if (typeof ApiClient === 'undefined' || !ApiClient.shelfJobs) return;
        const storeId = resolveActiveStoreId();
        if (!storeId || storeId === 'null' || storeId === 'undefined') return;

        // 1. Retrieve the token from localStorage:
        const rawToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
        const token = rawToken ? String(rawToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

        // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify user to log in.
        if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
          console.warn('[AI Capture] fetchInitialJobHistory aborted: Missing Authorization Bearer token. Prompting user to log in.');
          showJobsWarningBanner('يرجى تسجيل الدخول لعرض ومزامنة سجل عمليات الرفوف السابقة.');
          if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
            ApiClient.promptReauthentication('يرجى تسجيل الدخول للمتابعة.');
          }
          validateInputs();
          return;
        }

        try {
          // Ensure the headers object includes: 'Authorization': `Bearer ${token}`
          const reqHeaders = {
            'Authorization': `Bearer ${token}`
          };

          // Initial job history fetch: GET /api/v1/stores/{id}/shelf-jobs?skip=0&limit=50
          const res = await ApiClient.shelfJobs.list(storeId, { skip: 0, limit: 50 }, {
            headers: reqHeaders,
            suppressAuthPrompt: true // Prevent global session logout/refresh loop on background job fetch
          });

          if (res && (res.status === 401 || res.error === 'Unauthorized' || (res.success === false && res.status === 401))) {
            console.warn('[AI Capture] Background job history returned 401 Unauthorized.');
            console.warn('[Backend Secret Sync Diagnostic] Alert: Verify that JWT_SECRET_KEY, Issuer, and Audience match exactly between the ASP.NET Core auth server and the FastAPI Render deployment.');
            showJobsWarningBanner('تنبيه المزامنة: تعذر مزامنة سجل العمليات السابقة من خادم الذكاء الاصطناعي (401 Unauthorized). يمكنك الاستمرار في رفع صور الرفوف واستخراج الأصناف مباشرة دون انقطاع.');
            // Non-blocking UI: ensure extraction upload button & controls remain active
            validateInputs();
            return;
          }

          const serverJobs = res?.data || (Array.isArray(res) ? res : null);
          if (Array.isArray(serverJobs) && serverJobs.length > 0) {
            const existingIds = new Set(jobsList.map(j => String(j.id)));
            let added = false;
            serverJobs.forEach(sj => {
              if (!existingIds.has(String(sj.id))) {
                jobsList.unshift(normalizeJob(sj));
                added = true;
              }
            });
            if (added) {
              saveJobs();
              renderJobsTable();
              updateKPIs();
            }
          }
        } catch (err) {
          console.warn('[AI Capture] Initial job history fetch encountered error:', err);
          if (err?.status === 401 || err?.statusCode === 401 || (err?.message && (err.message.includes('401') || err.message.includes('Unauthorized')))) {
            console.warn('[Backend Secret Sync Diagnostic] Alert: Verify that JWT_SECRET_KEY, Issuer, and Audience match between ASP.NET Core auth server and FastAPI Render deployment.');
            showJobsWarningBanner('تنبيه المزامنة: تعذر مزامنة سجل العمليات السابقة من خادم الذكاء الاصطناعي (401 Unauthorized). يمكنك الاستمرار في رفع صور الرفوف واستخراج الأصناف مباشرة دون انقطاع.');
          }
          // Non-blocking UI: ensure manual extraction upload button is not broken or disabled
          validateInputs();
        }
      })();
    }

    function showJobsWarningBanner(message) {
      let banner = document.getElementById('jobs-warning-banner');
      if (!banner) {
        const tableContainer = document.querySelector('.overflow-x-auto') || document.getElementById('jobs-table-body')?.parentElement;
        if (tableContainer && tableContainer.parentElement) {
          banner = document.createElement('div');
          banner.id = 'jobs-warning-banner';
          tableContainer.parentElement.insertBefore(banner, tableContainer);
        }
      }
      if (banner) {
        banner.className = 'mb-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs font-bold flex items-center justify-between gap-3 shadow-xs';
        banner.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>${escapeHtml(message)}</span>
          </div>
          <span class="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg shrink-0">جاهز لرفع الصور</span>
        `;
        banner.classList.remove('hidden');
      }
    }

    function saveJobs() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobsList));
      } catch (e) {
        console.error('Error saving jobs:', e);
      }
    }

    function handleZoneChange() {
      const zone = document.getElementById('shelf-zone').value;
      const aisleSelect = document.getElementById('shelf-aisle');

      if (zone === 'Zone A') {
        aisleSelect.innerHTML = `
          <option value="Aisle 1">ممر 1 (Aisle 1 - حليب وأجبان)</option>
          <option value="Aisle 2">ممر 2 (Aisle 2 - زبادي وعصائر)</option>
          <option value="Aisle 3">ممر 3 (Aisle 3 - أجبان مستوردة)</option>
        `;
      } else if (zone === 'Zone B') {
        aisleSelect.innerHTML = `
          <option value="Aisle 1">ممر 1 (Aisle 1 - خبز يومي وتوست)</option>
          <option value="Aisle 2">ممر 2 (Aisle 2 - كرواسون ومعجنات)</option>
        `;
      } else if (zone === 'Zone C') {
        aisleSelect.innerHTML = `
          <option value="Aisle 1">ممر 1 (Aisle 1 - معلبات وزيوت)</option>
          <option value="Aisle 2">ممر 2 (Aisle 2 - أرز وسكر وحبوب)</option>
        `;
      } else if (zone === 'Zone D') {
        aisleSelect.innerHTML = `
          <option value="Aisle 1">ممر 1 (Aisle 1 - مياه معدنية)</option>
          <option value="Aisle 2">ممر 2 (Aisle 2 - مشروبات غازية وعصائر)</option>
        `;
      } else {
        aisleSelect.innerHTML = `
          <option value="Aisle 1">ممر 1 (Aisle 1 - المنظفات الكيميائية)</option>
          <option value="Aisle 2">ممر 2 (Aisle 2 - الورقيات والصابون)</option>
        `;
      }
      updateShelfPreview();
    }

    function handleAisleChange() {
      updateShelfPreview();
    }

    function updateShelfPreview() {
      const zone = document.getElementById('shelf-zone').value;
      const aisle = document.getElementById('shelf-aisle').value;
      const rack = document.getElementById('shelf-rack').value;
      const level = document.getElementById('shelf-level').value;

      const previewBox = document.getElementById('shelf-badge-preview');
      const previewText = document.getElementById('shelf-badge-text');

      if (zone && aisle && rack && level) {
        previewBox.classList.remove('hidden');
        previewText.textContent = `${zone} > ${aisle} > ${rack} > ${level}`;
      } else {
        previewBox.classList.add('hidden');
      }
      validateInputs();
    }

    function getShelfLocationObject() {
      const zone = document.getElementById('shelf-zone').value || 'Zone A';
      const aisle = document.getElementById('shelf-aisle').value || 'Aisle 1';
      const rack = document.getElementById('shelf-rack').value || 'Rack 2';
      const level = document.getElementById('shelf-level').value || 'Shelf 2';
      return {
        zone,
        aisle,
        rack,
        level,
        label: `${zone} > ${aisle} > ${rack} > ${level}`
      };
    }

    let dropzoneDragCounter = 0;

    function handleDragEnter(e) {
      e.preventDefault();
      e.stopPropagation();
      dropzoneDragCounter++;
      const dropzone = document.getElementById('dropzone');
      if (dropzone) {
        dropzone.classList.add('border-[#153f2d]', 'bg-[#edf5f0]', 'ring-2', 'ring-[#153f2d]/20');
      }
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      const dropzone = document.getElementById('dropzone');
      if (dropzone) {
        dropzone.classList.add('border-[#153f2d]', 'bg-[#edf5f0]', 'ring-2', 'ring-[#153f2d]/20');
      }
    }

    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      dropzoneDragCounter--;
      if (dropzoneDragCounter <= 0) {
        dropzoneDragCounter = 0;
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
          dropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]', 'ring-2', 'ring-[#153f2d]/20');
        }
      }
    }

    function handleFileDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      dropzoneDragCounter = 0;
      const dropzone = document.getElementById('dropzone');
      if (dropzone) {
        dropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]', 'ring-2', 'ring-[#153f2d]/20');
      }
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processSelectedFiles(e.dataTransfer.files);
      }
    }

    function handleFileSelect(e) {
      if (e.target && e.target.files && e.target.files.length > 0) {
        processSelectedFiles(e.target.files);
      }
    }

    let cameraStream = null;
    let currentFacingMode = 'environment';

    function isMobileOrTablet() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/i.test(navigator.userAgent));
    }

    function triggerCameraCapture(e) {
      if (e) e.stopPropagation();

      if (isMobileOrTablet()) {
        const mobileInput = document.getElementById('mobile-camera-input');
        if (mobileInput) {
          mobileInput.click();
          return;
        }
      }

      openCameraModal();
    }

    function handleMobileCameraSelect(e) {
      if (e.target.files && e.target.files.length > 0) {
        processSelectedFiles(e.target.files);
        e.target.value = '';
        showToast('تم التقاط الصورة بالكاميرا', 'تمت إضافة لقطة الكاميرا بنجاح لقائمة التحليل', 'success');
      }
    }

    async function openCameraModal() {
      const modal = document.getElementById('camera-modal');
      const loader = document.getElementById('camera-loader');
      const errorBox = document.getElementById('camera-error');
      const video = document.getElementById('camera-video');

      if (!modal) return;
      modal.classList.remove('hidden');
      if (errorBox) errorBox.classList.add('hidden');
      if (loader) loader.classList.remove('hidden');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (loader) loader.classList.add('hidden');
        if (errorBox) {
          errorBox.classList.remove('hidden');
          const errMsg = document.getElementById('camera-error-msg');
          if (errMsg) errMsg.textContent = 'المتصفح الحالي لا يدعم الوصول المباشر للكاميرا';
        }
        return;
      }

      await startCameraStream();
    }

    async function startCameraStream() {
      const loader = document.getElementById('camera-loader');
      const errorBox = document.getElementById('camera-error');
      const video = document.getElementById('camera-video');

      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }

      try {
        const constraints = {
          video: {
            facingMode: { ideal: currentFacingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStream = stream;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        if (loader) loader.classList.add('hidden');
      } catch (err) {
        console.warn('Camera stream error:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          cameraStream = fallbackStream;
          if (video) {
            video.srcObject = fallbackStream;
            await video.play().catch(() => {});
          }
          if (loader) loader.classList.add('hidden');
        } catch (fallbackErr) {
          if (loader) loader.classList.add('hidden');
          if (errorBox) {
            errorBox.classList.remove('hidden');
            const errMsg = document.getElementById('camera-error-msg');
            if (errMsg) errMsg.textContent = 'تعذر تشغيل الكاميرا (تأكد من منح الإذن للمتصفح)';
          }
        }
      }
    }

    async function toggleCameraFacing() {
      currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
      const loader = document.getElementById('camera-loader');
      if (loader) loader.classList.remove('hidden');
      await startCameraStream();
    }

    function stopCameraStream() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      const video = document.getElementById('camera-video');
      if (video) video.srcObject = null;
    }

    function closeCameraModal() {
      const modal = document.getElementById('camera-modal');
      if (modal) modal.classList.add('hidden');
      stopCameraStream();
    }

    function snapCameraPhoto() {
      const video = document.getElementById('camera-video');
      const canvas = document.getElementById('camera-canvas');
      if (!video || !canvas) return;

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const fileName = `shelf-cam-${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        uploadedFiles.push({
          id: 'CAM-' + Math.random().toString(36).substr(2, 9),
          name: fileName,
          sizeFormatted: (blob.size / 1024).toFixed(0) + ' KB',
          dataUrl: dataUrl,
          file: file
        });

        renderUploadedThumbnails();
        validateInputs();
        showToast('تم التقاط الصورة بنجاح', 'تمت إضافة لقطة الكاميرا الحية إلى قائمة صور الرف', 'success');
        closeCameraModal();
      }, 'image/jpeg', 0.92);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const cameraModal = document.getElementById('camera-modal');
        if (cameraModal && !cameraModal.classList.contains('hidden')) {
          closeCameraModal();
        }
      }
    });

    function formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

    function isValidImage(file) {
      if (!file) return false;
      if (file.type && ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
        return true;
      }
      const lowerName = (file.name || '').toLowerCase();
      return ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    }

    function processSelectedFiles(files) {
      if (!files || files.length === 0) return;

      let addedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isValidImage(file)) {
          showToast('نوع الملف غير مدعوم', `الملف "${file.name}" غير مدعوم. يرجى اختيار صور بصيغة JPG أو PNG أو WEBP فقط.`, 'error');
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          showToast('حجم الملف كبير جداً', `حجم الصورة "${file.name}" (${formatFileSize(file.size)}) يتجاوز الحد الأقصى المسموح (10MB).`, 'error');
          continue;
        }

        let previewUrl = '';
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (e) {
          previewUrl = '';
        }

        uploadedFiles.push({
          id: 'IMG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7),
          name: file.name,
          sizeFormatted: formatFileSize(file.size),
          sizeBytes: file.size,
          dataUrl: previewUrl,
          file: file
        });
        addedCount++;
      }

      if (addedCount > 0) {
        renderUploadedThumbnails();
        validateInputs();
        if (addedCount === 1) {
          showToast('تمت إضافة الصورة بنجاح', 'تمت إضافة الصورة لقائمة المعاينة والتحليل.', 'success');
        } else {
          showToast('تمت إضافة الصور بنجاح', `تمت إضافة ${addedCount} صور لقائمة المعاينة والتحليل.`, 'success');
        }
      }

      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      const mobileInput = document.getElementById('mobile-camera-input');
      if (mobileInput) mobileInput.value = '';
    }

    function handleDragEnter(e) {
      e.preventDefault();
      e.stopPropagation();
      const dropzone = document.getElementById('dropzone');
      if (dropzone) dropzone.classList.add('border-[#153f2d]', 'bg-[#edf5f0]/80');
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const dropzone = document.getElementById('dropzone');
      if (dropzone) dropzone.classList.add('border-[#153f2d]', 'bg-[#edf5f0]/80');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      const dropzone = document.getElementById('dropzone');
      if (dropzone) dropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]/80');
    }

    function handleFileDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      const dropzone = document.getElementById('dropzone');
      if (dropzone) dropzone.classList.remove('border-[#153f2d]', 'bg-[#edf5f0]/80');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processSelectedFiles(e.dataTransfer.files);
      }
    }

    function handleFileSelect(e) {
      if (e.target && e.target.files && e.target.files.length > 0) {
        processSelectedFiles(e.target.files);
      }
    }

    function handleMobileCameraSelect(e) {
      if (e.target && e.target.files && e.target.files.length > 0) {
        processSelectedFiles(e.target.files);
      }
    }

    async function loadSampleShelfImage() {
      const zone = document.getElementById('shelf-zone')?.value || 'Zone A';
      const sampleImgUrl = generateMockShelfSVG(zone + ' - Supermarket Bay', 12);

      try {
        const img = new Image();
        const imgLoaded = new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        img.src = sampleImgUrl;
        await imgLoaded;

        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        const sampleFile1 = new File([jpegBlob], 'shelf_angle_front_hd.jpg', { type: 'image/jpeg' });
        const sampleFile2 = new File([jpegBlob], 'shelf_angle_closeup_barcodes.jpg', { type: 'image/jpeg' });
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);

        uploadedFiles = [
          {
            id: 'IMG-SAMPLE-1',
            name: 'shelf_angle_front_hd.jpg',
            sizeFormatted: formatFileSize(jpegBlob.size),
            sizeBytes: jpegBlob.size,
            dataUrl: jpegDataUrl,
            file: sampleFile1
          },
          {
            id: 'IMG-SAMPLE-2',
            name: 'shelf_angle_closeup_barcodes.jpg',
            sizeFormatted: formatFileSize(jpegBlob.size),
            sizeBytes: jpegBlob.size,
            dataUrl: jpegDataUrl,
            file: sampleFile2
          }
        ];
      } catch (e) {
        uploadedFiles = [
          {
            id: 'IMG-SAMPLE-1',
            name: 'shelf_angle_front_hd.jpg',
            sizeFormatted: '1.8 MB',
            sizeBytes: 1800000,
            dataUrl: sampleImgUrl
          }
        ];
      }

      renderUploadedThumbnails();
      validateInputs();
      showToast('تم تحميل الصور النموذجية', 'تم تجهيز صورتين نموذجيتين بدقة عالية للرف المحدد', 'success');
    }

    function renderUploadedThumbnails() {
      const container = document.getElementById('thumbnails-container');
      const grid = document.getElementById('thumbnails-grid');
      const countEl = document.getElementById('uploaded-count');

      if (!container || !grid) return;

      if (uploadedFiles.length === 0) {
        container.classList.add('hidden');
        if (countEl) countEl.textContent = '0';
        return;
      }

      container.classList.remove('hidden');
      if (countEl) countEl.textContent = uploadedFiles.length;

      grid.innerHTML = uploadedFiles.map((f, idx) => `
        <div class="relative group bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition overflow-hidden">
          <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-2 flex items-center justify-center relative">
            <img src="${f.dataUrl}" alt="${f.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <button 
              type="button" 
              data-action="remove-thumb" data-idx="${idx}" 
              class="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition active:scale-90 cursor-pointer z-10"
              title="حذف الصورة"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="text-[11px] font-bold text-slate-800 truncate" title="${f.name}">${f.name}</div>
          <div class="text-[10px] text-slate-400 font-medium mt-0.5">${f.sizeFormatted}</div>
        </div>
      `).join('');
    }

    function removeUploadedImage(idx) {
      if (uploadedFiles[idx]) {
        const item = uploadedFiles[idx];
        if (item.dataUrl && item.dataUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(item.dataUrl); } catch (e) {}
        }
        uploadedFiles.splice(idx, 1);
        renderUploadedThumbnails();
        validateInputs();
      }
    }

    function clearUploadedImages() {
      uploadedFiles.forEach(item => {
        if (item.dataUrl && item.dataUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(item.dataUrl); } catch (e) {}
        }
      });
      uploadedFiles = [];
      renderUploadedThumbnails();
      validateInputs();
    }

    function validateInputs() {
      const zone = document.getElementById('shelf-zone')?.value?.trim();
      const btn = document.getElementById('btn-start-extraction');
      const hasImages = uploadedFiles && uploadedFiles.length > 0;
      const isValid = Boolean(zone && hasImages);

      if (btn) {
        btn.disabled = !isValid;
      }
    }

    async function startAIExtraction() {
      // 1. Resolve and verify active storeId exists
      const storeId = resolveActiveStoreId();
      if (!storeId || (typeof ApiClient !== 'undefined' && !ApiClient.isValidStoreId(storeId))) {
        const storeErrMsg = 'معرّف المتجر غير متوفر أو غير صالح. يرجى اختيار المتجر النشط أولاً.';
        if (typeof showToast === 'function') {
          showToast('المتجر مطلوب', storeErrMsg, 'warning');
        }
        if (typeof ApiClient !== 'undefined' && typeof ApiClient.handleStoreVerification404 === 'function') {
          ApiClient.handleStoreVerification404(storeId || null);
        }
        return;
      }

      // 2. Token Attachment Check & Pre-flight verification (Requirement 1):
      // Retrieve the token from localStorage:
      const rawToken = localStorage.getItem('storeToken') || localStorage.getItem('accessToken');
      const token = rawToken ? String(rawToken).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : null;

      // Verify before sending that token is non-empty. If token is missing, stop the request immediately and notify the user to log in.
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn(`[AI Capture] Extraction stopped immediately: Missing Authorization Bearer token for store "${storeId}". Prompting user to log in.`);
        const unauthMsg = 'جلسة العمل منتهية أو غير مسجلة. يرجى تسجيل الدخول للمتابعة ورفع صور الرفوف.';
        if (typeof showToast === 'function') {
          showToast('تسجيل الدخول مطلوب', unauthMsg, 'warning');
        } else if (typeof showAlert === 'function') {
          showAlert(unauthMsg, 'تنبيه تسجيل الدخول', 'warning');
        }
        if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
          ApiClient.promptReauthentication(unauthMsg);
        }
        return;
      }

      // 3. Ensure files are attached (including Image.jpg)
      const fileInput = document.getElementById('file-input');
      if ((!uploadedFiles || uploadedFiles.length === 0) && fileInput && fileInput.files && fileInput.files.length > 0) {
        processSelectedFiles(fileInput.files);
      }

      if (!uploadedFiles || uploadedFiles.length === 0) {
        showToast('صورة الرف مطلوبة', 'يرجى رفع أو سحب صورة الرف (مثل Image.jpg) قبل بدء الاستخراج.', 'error');
        if (fileInput) fileInput.click();
        return;
      }

      // 4. Collect shelf location dropdown values
      const zoneEl = document.getElementById('shelf-zone');
      const aisleEl = document.getElementById('shelf-aisle');
      const rackEl = document.getElementById('shelf-rack');
      const levelEl = document.getElementById('shelf-level');

      const zone = zoneEl?.value?.trim() || 'Zone A';
      const aisle = aisleEl?.value?.trim() || 'Aisle 1';
      const rack = rackEl?.value?.trim() || 'Rack 1';
      const level = levelEl?.value?.trim() || 'Shelf 1';
      const shelfLocationLabel = `${zone} > ${aisle} > ${rack} > ${level}`;

      // 5. Convert any dataUrls or blobUrls into valid File instances
      const preparedFiles = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        const item = uploadedFiles[i];
        let fileObj = item.file;
        const fileName = item.name || (i === 0 ? 'Image.jpg' : `Image_${i + 1}.jpg`);

        if (!(fileObj instanceof File || fileObj instanceof Blob)) {
          if (item.dataUrl) {
            try {
              const res = await fetch(item.dataUrl);
              const blob = await res.blob();
              fileObj = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
              item.file = fileObj;
            } catch (convErr) {
              console.warn('Failed converting image dataUrl to File:', convErr);
            }
          }
        }
        if (fileObj) {
          preparedFiles.push({ file: fileObj, name: fileName });
        }
      }

      if (preparedFiles.length === 0) {
        showToast('صورة الرف مطلوبة', 'يرجى التأكد من اختيار أو رفع صورة صالحة للرف (Image.jpg).', 'error');
        return;
      }

      // 6. Setup Button Loading State & Progress Bar
      const btnStart = document.getElementById('btn-start-extraction');
      const progressContainer = document.getElementById('extraction-progress-container');
      const progressBar = document.getElementById('extraction-progress-bar');
      const progressPercent = document.getElementById('extraction-percent-badge');
      const progressTitle = document.getElementById('extraction-status-title');
      const progressSubtitle = document.getElementById('extraction-status-subtitle');

      const originalBtnHTML = btnStart ? btnStart.innerHTML : '';
      if (btnStart) {
        btnStart.disabled = true;
        btnStart.style.pointerEvents = 'none';
        btnStart.classList.add('opacity-90', 'cursor-wait');
        btnStart.innerHTML = `
          <svg class="animate-spin w-5 h-5 text-[#d6a950] shrink-0" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span id="btn-extraction-status">جاري رفع الصور والتحليل بالذكاء الاصطناعي...</span>
        `;
      }

      function setProgressState(percent, title, subtitle) {
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressTitle && title) progressTitle.textContent = title;
        if (progressSubtitle && subtitle) progressSubtitle.textContent = subtitle;
        const statusSpan = document.getElementById('btn-extraction-status');
        if (statusSpan && title) statusSpan.textContent = title;
      }

      const storePreview = (storeId || '').slice(0, 8) ? `${(storeId || '').slice(0, 8)}...` : 'غير محدد';
      setProgressState(15, 'جاري رفع صور الرف إلى الخادم...', `يتم إرسال ${(preparedFiles || []).length} صورة (معرف المتجر: ${storePreview})...`);

      // 7. Construct FormData with primary and multiple image fields
      const formData = new FormData();
      const primaryFile = (preparedFiles && preparedFiles[0]) || {};
      const primaryFileName = primaryFile?.name || 'shelf_scan.jpg';

      // 1. Attach file with the expected field name 'file'
      if (primaryFile?.file) {
        formData.append('file', primaryFile.file, primaryFileName);
        // Keep 'image' as backwards-compatible alias
        formData.append('image', primaryFile.file, primaryFileName);
      }

      (preparedFiles || []).forEach((pf, idx) => {
        if (pf?.file) {
          const pfName = pf?.name || `shelf_image_${idx + 1}.jpg`;
          formData.append('files', pf.file, pfName);
          formData.append('images', pf.file, pfName);
        }
      });

      // 2. Attach store_id required with request
      formData.append('store_id', storeId || '');
      formData.append('storeId', storeId || '');

      formData.append('zone', zone);
      formData.append('aisle', aisle);
      formData.append('rack', rack);
      formData.append('shelf_level', level);
      formData.append('shelf', level);
      formData.append('shelf_location', shelfLocationLabel);
      formData.append('ocr_enabled', document.getElementById('opt-ocr')?.checked ? 'true' : 'false');
      formData.append('auto_match', document.getElementById('opt-auto-match')?.checked ? 'true' : 'false');

      // Ensure the headers object includes:
      // headers: { ...existingHeaders, 'Authorization': `Bearer ${token}` }
      // When uploading images via FormData, do NOT remove or omit the 'Authorization' header.
      // Keep 'Authorization': `Bearer ${token}` while leaving Content-Type unset so the browser sets the boundary automatically.
      const uploadHeaders = {
        'Authorization': `Bearer ${token}`
      };
      delete uploadHeaders['Content-Type'];
      delete uploadHeaders['content-type'];
      delete uploadHeaders['Content-type'];
      delete uploadHeaders['CONTENT-TYPE'];

      // Multi-stage animated progress
      const progressTimer = setInterval(() => {
        const cur = parseInt(progressBar?.style.width || '15', 10);
        if (cur < 85) {
          const next = cur + 15;
          if (next >= 40 && next < 65) {
            setProgressState(next, 'كشف المنتجات وقراءة بطاقات الأسعار OCR...', 'تحليل الرؤية الحاسوبية لاكتشاف العبوات والباركود...');
          } else if (next >= 65) {
            setProgressState(next, 'مطابقة المنتجات والأسعار مع الكتالوج...', 'إنشاء مسودات الأصناف وربطها بموقع الرف...');
          } else {
            setProgressState(next);
          }
        }
      }, 750);

      try {
        let serverJob = null;
        if (typeof ApiClient !== 'undefined' && ApiClient.shelfJobs && ApiClient.shelfJobs.create) {
          const res = await ApiClient.shelfJobs.create(storeId, formData, {
            headers: uploadHeaders,
            timeout: 150000 // 2.5 minutes (150s >= 2 minutes) for Render + Gemini AI inference
          });
          serverJob = res?.data || res;
        } else {
          // Direct fetch fallback if ApiClient is not available
          const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.PRODUCTS_BASE_URL)
            ? CONFIG.PRODUCTS_BASE_URL
            : 'https://dawwer-backend-fastapi.onrender.com';
          const endpointUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs`;

          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timer = controller ? setTimeout(() => controller.abort(), 150000) : null;

          const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData,
            signal: controller ? controller.signal : undefined
          }).finally(() => {
            if (timer) clearTimeout(timer);
          });

          if (!response.ok) {
            let detail = response.statusText;
            try {
              const errBody = await response.json();
              detail = errBody.detail || errBody.message || JSON.stringify(errBody);
            } catch (e) {}
            const err = new Error(`Server returned HTTP ${response.status}: ${detail}`);
            err.status = response.status;
            err.statusCode = response.status;
            throw err;
          }

          const resJson = await response.json();
          serverJob = resJson?.data || resJson;
        }

        if (!serverJob || (!serverJob.id && !serverJob.job_id)) {
          throw new Error('لم يرجع خادم الذكاء الاصطناعي بيانات عملية صالحة لمعالجة الصورة.');
        }

        const resolvedJobId = serverJob.id || serverJob.job_id;
        const mainThumbnail = uploadedFiles[0]?.dataUrl || serverJob?.image_url || '';

        // If the job is queued or processing in the backend (Gemini AI Vision inference), poll until completed
        let currentJobStatus = (serverJob.status || '').toUpperCase();
        let currentDraftsCount = serverJob.extracted_drafts_count || 0;
        let pollAttempts = 0;
        const maxPollAttempts = 50; // up to ~125s polling window (>= 2 minutes)

        while (
          (currentJobStatus === 'QUEUED' || currentJobStatus === 'PROCESSING') &&
          currentDraftsCount === 0 &&
          pollAttempts < maxPollAttempts
        ) {
          pollAttempts++;
          const pct = Math.min(82, 20 + pollAttempts * 2);
          setProgressState(
            pct,
            'تشغيل نموذج الرؤية الحاسوبية Gemini AI وقراءة بطاقات الأسعار OCR...',
            `معالجة خادم الذكاء الاصطناعي (خطوة ${pollAttempts}/${maxPollAttempts}) - جاري كشف مواقع العبوات والأسعار...`
          );
          await new Promise(r => setTimeout(r, 2500));

          try {
            const pollRes = await ApiClient.shelfJobs.get(storeId, resolvedJobId, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              timeout: 60000
            });
            const updatedJob = pollRes?.data || pollRes;
            if (updatedJob) {
              serverJob = updatedJob;
              currentJobStatus = (updatedJob.status || '').toUpperCase();
              currentDraftsCount = updatedJob.extracted_drafts_count || 0;

              if (currentJobStatus === 'FAILED') {
                throw new Error('أبلغ خادم الذكاء الاصطناعي عن فشل تحليل الصورة (Status: FAILED).');
              }
            }
          } catch (pollErr) {
            if (pollErr.message && pollErr.message.includes('Status: FAILED')) throw pollErr;
            console.warn('[Polling shelf job check warn]', pollErr);
          }
        }

        setProgressState(88, 'جاري استلام بيانات الأصناف المقروءة بالذكاء الاصطناعي...', 'معالجة بطاقات الأسعار والمسودات المستخرجة...');

        // Query draft products created by this shelf job
        let extractedDrafts = [];
        if (typeof ApiClient !== 'undefined' && ApiClient.draftProducts && ApiClient.draftProducts.list) {
          try {
            const draftsRes = await ApiClient.draftProducts.list(storeId, { shelf_job_id: resolvedJobId, limit: 100 }, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              timeout: 60000
            });
            const rawDrafts = draftsRes?.data || (Array.isArray(draftsRes) ? draftsRes : []);
            if (Array.isArray(rawDrafts) && rawDrafts.length > 0) {
              extractedDrafts = rawDrafts;
            }
          } catch (draftErr) {
            console.warn('[Fetch draft products failed]', draftErr);
          }
        }

        // Also check if serverJob itself contained drafts or items
        if (!extractedDrafts.length) {
          if (Array.isArray(serverJob?.draft_products) && serverJob.draft_products.length > 0) extractedDrafts = serverJob.draft_products;
          else if (Array.isArray(serverJob?.extractedItems) && serverJob.extractedItems.length > 0) extractedDrafts = serverJob.extractedItems;
          else if (Array.isArray(serverJob?.items) && serverJob.items.length > 0) extractedDrafts = serverJob.items;
          else if (Array.isArray(serverJob?.products) && serverJob.products.length > 0) extractedDrafts = serverJob.products;
        }

        clearInterval(progressTimer);

        // Normalize extracted items from API response fields
        const normalizedItems = extractedDrafts.map((p, idx) => {
          const name = p.proposed_name || p.product_name || p.name || `صنف مستخرج #${idx + 1}`;
          const price = p.estimated_price !== undefined ? Number(p.estimated_price) : (Number(p.price) || 0);
          const sku = p.barcode_detected || p.sku || p.store_sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
          const category = p.category_hint || p.category || 'عام';
          const size = p.pack_size || p.size || '';
          const confidence = p.confidence_score !== undefined
            ? (p.confidence_score <= 1.0 ? Math.round(p.confidence_score * 100) : Math.round(p.confidence_score))
            : (p.confidence || 96);
          const box = p.bounding_box || p.box || {
            x: 8 + (idx % 4) * 22,
            y: 12 + Math.floor(idx / 4) * 26,
            w: 18,
            h: 22
          };
          const itemZone = p.zone || zone;
          const itemAisle = p.aisle || aisle;
          const itemRack = p.rack || rack;
          const itemShelf = p.shelf || level;
          const itemLabel = `${itemZone} > ${itemAisle} > ${itemRack} > ${itemShelf}`;

          return {
            id: p.id || `DRF-${resolvedJobId}-${idx + 1}`,
            serverId: p.id || null,
            name,
            brand: p.brand || '',
            size,
            sku,
            price,
            originalPrice: price,
            confidence,
            category,
            shelfLocation: {
              zone: itemZone,
              aisle: itemAisle,
              rack: itemRack,
              level: itemShelf,
              label: itemLabel
            },
            box,
            status: p.status || 'Draft',
            hasDuplicateMatch: !!p.has_duplicate_match || !!p.hasDuplicateMatch,
            duplicateMatch: p.duplicate_match || p.duplicateMatch || null
          };
        });

        const newJob = {
          id: resolvedJobId,
          serverId: serverJob?.id || resolvedJobId,
          createdAt: 'الآن',
          timestamp: Date.now(),
          shelfLocation: {
            zone: zone,
            aisle: aisle,
            rack: rack,
            level: level,
            label: shelfLocationLabel
          },
          thumbnail: mainThumbnail,
          imagesCount: preparedFiles.length,
          status: normalizedItems.length > 0 ? 'Review Required' : (serverJob?.status || 'Completed'),
          detectedCount: normalizedItems.length,
          confidence: serverJob?.confidence || (normalizedItems.length > 0 ? 98.4 : 0),
          extractedItems: normalizedItems
        };

        // Pass real data to review page via sessionStorage and state
        sessionStorage.setItem('dawwer_current_review_job', JSON.stringify(newJob));
        sessionStorage.setItem('dawwer_current_draft_products', JSON.stringify(normalizedItems));
        sessionStorage.setItem('dawwer_latest_extraction_result', JSON.stringify({
          job: newJob,
          drafts: normalizedItems,
          timestamp: Date.now()
        }));

        jobsList.unshift(newJob);
        saveJobs();
        renderJobsTable();
        updateKPIs();

        clearUploadedImages();

        if (normalizedItems.length === 0) {
          setProgressState(100, 'اكتمل الفحص - لم يتم العثور على منتجات', 'لم يتعرف نموذج الذكاء الاصطناعي على أي أصناف أو بطاقات أسعار في الصورة.');
          showToast(
            'لم يتم استخراج منتجات',
            'لم يتعرف نموذج الذكاء الاصطناعي على أية منتجات في الصورة المرفوعة. يرجى تجربة التقاط صورة بإضاءة أفضل وأقرب للمنتجات والأسعار.',
            'warning'
          );
        } else {
          setProgressState(100, 'اكتملت المعالجة بنجاح!', `تم استخراج ${normalizedItems.length} صنفاً حقيقياً بنجاح، جاري تحويلك للمراجعة والاعتماد...`);
          showToast(
            'اكتمل استخراج المنتجات بنجاح!',
            `تم استخراج ${normalizedItems.length} صنفاً حقيقياً. جاري تحويلك لشاشة المراجعة والمطابقة...`,
            'success'
          );

          setTimeout(() => {
            window.location.href = `review-drafts.html?jobId=${encodeURIComponent(resolvedJobId)}&store_id=${encodeURIComponent(storeId)}`;
          }, 1500);
        }

        const tableEl = document.querySelector('table');
        if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => {
          if (progressContainer) progressContainer.classList.add('hidden');
          if (progressBar) progressBar.style.width = '0%';
          if (btnStart) {
            btnStart.disabled = false;
            btnStart.style.pointerEvents = '';
            btnStart.classList.remove('opacity-90', 'cursor-wait');
            btnStart.innerHTML = originalBtnHTML;
          }
        }, 2500);

      } catch (err) {
        clearInterval(progressTimer);

        // Precise error diagnosis: CORS vs Timeout vs Server Rejection
        const statusCode = err?.status || err?.statusCode || (err?.response ? err.response.status : null) || 0;
        const isTimeout = Boolean(
          err?.isTimeout ||
          err?.name === 'AbortError' ||
          (err?.message && (
            err.message.includes('مهلة') ||
            err.message.toLowerCase().includes('timeout') ||
            err.message.toLowerCase().includes('aborted')
          ))
        );
        const isCORS = Boolean(
          !statusCode &&
          !isTimeout &&
          (err?.isCORS ||
           err instanceof TypeError ||
           (err?.message && (
             err.message.includes('Failed to fetch') ||
             err.message.includes('NetworkError') ||
             err.message.includes('CORS')
           )))
        );
        const isServerRejection = Boolean(statusCode && statusCode >= 400);

        let errorCategory = 'UNKNOWN_FAILURE';
        let userTitle = 'فشل استخراج المنتجات';
        let userMessage = err?.message || 'حدث خطأ أثناء التواصل مع خادم الذكاء الاصطناعي أو معالجة الصورة.';

        if (isTimeout) {
          errorCategory = 'TIMEOUT (انتهت مهلة الانتظار)';
          userTitle = 'انتهت مهلة الانتظار (Timeout)';
          userMessage = 'استغرقت معالجة صورة الرف وقتاً أطول من المتوقع (أكثر من دقيقتين). قد يكون سيرفر Render قيد الاستيقاظ (Cold Start)، يرجى إعادة المحاولة.';
        } else if (isCORS) {
          errorCategory = 'CORS_OR_CONNECTION_REFUSED (خطأ CORS أو تعذر الوصول للخادم)';
          userTitle = 'تعذر الاتصال بالخادم (CORS/Network)';
          userMessage = 'تعذر الاتصال بخادم الذكاء الاصطناعي على Render بسبب سياسة مشاركة الموارد (CORS) أو توقف السيرفر. يرجى التحقق من الخادم.';
        } else if (statusCode === 401 || (err?.message && (err.message.includes('401') || err.message.includes('Unauthorized')))) {
          errorCategory = 'UNAUTHORIZED (401 Unauthorized)';
          userTitle = 'انتهت صلاحية الجلسة';
          userMessage = 'انتهت صلاحية جلسة العمل أو غير مصرح. يرجى تسجيل الدخول مجدداً للمتابعة.';
          if (typeof ApiClient !== 'undefined' && ApiClient.promptReauthentication) {
            ApiClient.promptReauthentication(userMessage);
          }
        } else if (isServerRejection) {
          errorCategory = `SERVER_REJECTION (رفض من السيرفر - HTTP ${statusCode})`;
          userTitle = `رفض من الخادم (HTTP ${statusCode})`;
          userMessage = err?.message || `رفض الخادم معالجة الصورة برمز الحالة (${statusCode}). تحقق من صلاحيات المتجر وصيغة البيانات المرسلة.`;
        }

        // Print exhaustive, structured diagnostics in the browser console
        console.group('%c[Dawwer AI Shelf Extraction Error Diagnostic]', 'color: #ef4444; font-weight: bold; font-size: 13px;');
        console.error('Error Category / Type:', errorCategory);
        console.error('HTTP Status Code:', statusCode);
        console.error('Is Timeout?:', isTimeout);
        console.error('Is CORS / Network Failure?:', isCORS);
        console.error('Is Server Rejection?:', isServerRejection);
        console.error('Store ID used:', storeId);
        console.error('Target Endpoint:', `${(typeof ApiClient !== 'undefined' && ApiClient.PRODUCTS_BASE_URL) || 'https://dawwer-backend-fastapi.onrender.com'}/api/v1/stores/${storeId}/shelf-jobs`);
        console.error('Configured Timeout:', '150000ms (2.5 minutes)');
        console.error('Files Uploaded:', preparedFiles.map(f => f.name));
        console.error('Error Message:', err?.message || 'No explicit message');
        console.error('Raw Error Object:', err);
        if (err?.response || err?.data) {
          console.error('Server Response Data:', err.response || err.data);
        }
        if (err?.stack) {
          console.error('Stack Trace:', err.stack);
        }
        console.groupEnd();

        showToast(userTitle, userMessage, 'error');

        if (progressContainer) progressContainer.classList.add('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (btnStart) {
          btnStart.disabled = false;
          btnStart.style.pointerEvents = '';
          btnStart.classList.remove('opacity-90', 'cursor-wait');
          btnStart.innerHTML = originalBtnHTML;
        }
      }
    }

    function generateExtractedItemsForZone() {
      return [];
    }

    function filterJobs(filter) {
      currentFilter = filter;

      ['all', 'processing', 'review', 'completed'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (btn) {
          btn.className = 'px-3 py-1.5 rounded-lg hover:text-[#153f2d] transition';
        }
      });
      const activeTab = document.getElementById('tab-' + (filter === 'all' ? 'all' : filter === 'Processing' ? 'processing' : filter === 'Review Required' ? 'review' : 'completed'));
      if (activeTab) {
        activeTab.className = 'px-3 py-1.5 rounded-lg bg-white text-[#153f2d] shadow-2xs font-bold transition';
      }

      renderJobsTable();
    }

    function handleSearchJobs() {
      renderJobsTable();
    }

    function renderJobsTable() {
      const tbody = document.getElementById('jobs-table-body');
      const emptyState = document.getElementById('jobs-empty-state');
      const searchVal = (document.getElementById('search-jobs').value || '').trim().toLowerCase();

      let filtered = jobsList.filter(job => {
        if (currentFilter !== 'all' && job.status !== currentFilter) {
          return false;
        }
        if (searchVal) {
          const matchId = job.id.toLowerCase().includes(searchVal);
          const matchLoc = job.shelfLocation.label.toLowerCase().includes(searchVal);
          return matchId || matchLoc;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      tbody.innerHTML = filtered.map(job => {
        let statusBadge = '';
        let actionBtn = '';

        if (job.status === 'Queued') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              <span class="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>قيد الانتظار</span>
            </span>
          `;
          actionBtn = `<span class="text-xs text-slate-400">جاري الإرسال...</span>`;
        } else if (job.status === 'Processing') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold animate-pulse">
              <svg class="animate-spin w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>جاري التحليل واستخراج الأصناف</span>
            </span>
          `;
          actionBtn = `<span class="text-xs text-indigo-600 font-bold">معالجة فورية</span>`;
        } else if (job.status === 'Review Required') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>بانتظار المراجعة (${job.detectedCount} صنف)</span>
            </span>
          `;
          actionBtn = `
            <a href="review-drafts.html?jobId=${job.id}" class="inline-flex items-center gap-1.5 bg-[#153f2d] hover:bg-[#0f2d20] text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 text-xs">
              <svg class="w-3.5 h-3.5 text-[#d6a950]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>مراجعة واعتماد الأصناف</span>
            </a>
          `;
        } else if (job.status === 'Completed') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>مكتملة ومعتمدة (${job.detectedCount} صنف)</span>
            </span>
          `;
          actionBtn = `
            <a href="review-drafts.html?jobId=${job.id}" class="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition text-xs">
              <span>عرض النتائج</span>
            </a>
          `;
        } else { 
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold">
              <span>فشلت العملية</span>
            </span>
          `;
          actionBtn = `
            <button data-action="retry-job" data-id="${job.id}" class="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition text-xs">
              <span>إعادة المحاولة</span>
            </button>
          `;
        }

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-4 px-6">
              <div class="font-mono font-bold text-slate-900 text-xs">${job.id}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${job.createdAt}</div>
            </td>
            <td class="py-4 px-4">
              <div class="w-14 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-pointer" data-action="review-job" data-id="${job.id}">
                <img src="${job.thumbnail}" alt="رف" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
              </div>
            </td>
            <td class="py-4 px-4">
              <div class="font-bold text-slate-800 text-xs">${job.shelfLocation.zone} - ${job.shelfLocation.aisle}</div>
              <div class="text-[11px] text-slate-500 mt-0.5">${job.shelfLocation.rack} > ${job.shelfLocation.level}</div>
            </td>
            <td class="py-4 px-4 text-center">
              <span class="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-xs">
                ${job.detectedCount || '-'}
              </span>
            </td>
            <td class="py-4 px-4">
              ${statusBadge}
            </td>
            <td class="py-4 px-6 text-left">
              <div class="flex items-center justify-end gap-2">
                ${actionBtn}
                <button data-action="delete-job" data-id="${job.id}" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" title="حذف العملية">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function retryJob(jobId) {
      const job = jobsList.find(j => j.id === jobId);
      if (!job) return;

      job.status = 'Processing';
      saveJobs();
      renderJobsTable();
      updateKPIs();
      showToast('جاري إعادة المحاولة', `تمت إعادة تشغيل العملية ${jobId}`, 'info');

      if (typeof ApiClient !== 'undefined' && ApiClient.draftProducts && (job.serverId || job.id)) {
        const storeId = resolveActiveStoreId();
        ApiClient.draftProducts.list(storeId, { shelf_job_id: job.serverId || job.id, limit: 100 }).then(res => {
          const live = res?.data || (Array.isArray(res) ? res : []);
          job.status = 'Review Required';
          job.detectedCount = Array.isArray(live) ? live.length : 0;
          job.extractedItems = Array.isArray(live) ? live : [];
          saveJobs();
          renderJobsTable();
          updateKPIs();
          showToast('اكتملت إعادة المحاولة', `تم تحديث العملية ${jobId}`, 'success');
        }).catch(() => {
          job.status = 'Review Required';
          saveJobs();
          renderJobsTable();
          updateKPIs();
        });
      } else {
        setTimeout(() => {
          job.status = 'Review Required';
          saveJobs();
          renderJobsTable();
          updateKPIs();
        }, 1500);
      }
    }

    function deleteJob(jobId) {
      if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return;
      jobsList = jobsList.filter(j => j.id !== jobId);
      saveJobs();
      renderJobsTable();
      updateKPIs();
      showToast('تم حذف العملية', `تم حذف ${jobId} من السجل`, 'info');
    }

    function updateKPIs() {
      const totalEl = document.getElementById('kpi-total-jobs');
      const reviewEl = document.getElementById('kpi-review-jobs');
      const itemsEl = document.getElementById('kpi-extracted-items');

      const countAll = document.getElementById('count-all');
      const countProcessing = document.getElementById('count-processing');
      const countReview = document.getElementById('count-review');
      const countCompleted = document.getElementById('count-completed');

      const total = jobsList.length;
      const review = jobsList.filter(j => j.status === 'Review Required').length;
      const processing = jobsList.filter(j => j.status === 'Processing').length;
      const completed = jobsList.filter(j => j.status === 'Completed').length;

      let totalItems = 0;
      jobsList.forEach(j => {
        if (j.status === 'Completed' || j.status === 'Review Required') {
          totalItems += (j.detectedCount || 0);
        }
      });

      if (totalEl) totalEl.textContent = total;
      if (reviewEl) reviewEl.textContent = review;
      if (itemsEl) itemsEl.textContent = totalItems;

      if (countAll) countAll.textContent = total;
      if (countProcessing) countProcessing.textContent = processing;
      if (countReview) countReview.textContent = review;
      if (countCompleted) countCompleted.textContent = completed;
    }

    function openReviewModal(jobId) {
      const job = jobsList.find(j => j.id === jobId);
      if (!job) return;

      currentModalJob = job;

      document.getElementById('modal-job-id').textContent = job.id;
      document.getElementById('modal-shelf-location').textContent = 'موقع الرف: ' + (job.shelfLocation ? job.shelfLocation.label : 'الرف المحدد');
      document.getElementById('modal-shelf-img').src = job.thumbnail || '';
      document.getElementById('modal-items-count').textContent = (job.extractedItems ? job.extractedItems.length : 0);

      const splitLink = document.getElementById('modal-split-screen-link');
      if (splitLink) splitLink.href = `review-drafts.html?jobId=${encodeURIComponent(job.id)}`;

      const layer = document.getElementById('bounding-boxes-layer');
      const listContainer = document.getElementById('modal-items-list');

      if (!job.extractedItems || job.extractedItems.length === 0) {
        layer.innerHTML = '';
        listContainer.innerHTML = `
          <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <div class="text-amber-700 font-bold text-xs mb-1">لا توجد أصناف مستخرجة لهذه العملية</div>
            <p class="text-[11px] text-slate-500">لم يرجع خادم الذكاء الاصطناعي بيانات منتجات مقروءة من هذه الصورة.</p>
          </div>
        `;
        document.getElementById('review-modal').classList.remove('hidden');
        return;
      }

      layer.innerHTML = job.extractedItems.map((item, idx) => {
        const box = item.box || { x: 10, y: 10, w: 20, h: 20 };
        const name = item.proposed_name || item.name || `صنف #${idx + 1}`;
        return `
          <div 
            class="bounding-box" 
            id="bbox-${idx}"
            style="top: ${box.y}%; left: ${box.x}%; width: ${box.w}%; height: ${box.h}%;"
            data-item-idx="${idx}"
          >
            <div class="bounding-tag">#${idx + 1} ${name.split(' ')[0]}</div>
          </div>
        `;
      }).join('');

      listContainer.innerHTML = job.extractedItems.map((item, idx) => {
        const name = item.proposed_name || item.name || `صنف #${idx + 1}`;
        const price = item.estimated_price !== undefined ? Number(item.estimated_price) : (Number(item.price) || 0);
        const sku = item.barcode_detected || item.sku || '-';
        const category = item.category_hint || item.category || 'عام';
        const confidence = item.confidence_score !== undefined
          ? (item.confidence_score <= 1.0 ? Math.round(item.confidence_score * 100) : Math.round(item.confidence_score))
          : (item.confidence || 98);
        return `
          <div id="item-row-${idx}" class="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-[#153f2d] shadow-2xs transition flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-lg bg-[#edf5f0] text-[#153f2d] font-bold flex items-center justify-center text-xs shrink-0">${idx + 1}</span>
              <div>
                <div class="font-bold text-slate-800 text-xs">${name}</div>
                <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span class="font-mono text-slate-600 font-bold">${sku}</span>
                  <span>•</span>
                  <span class="text-emerald-700 font-bold">${category}</span>
                  <span>•</span>
                  <span class="text-[#d6a950] font-black">${price.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                ${confidence}% دقة
              </span>
            </div>
          </div>
        `;
      }).join('');

      document.getElementById('review-modal').classList.remove('hidden');
    }

    function closeReviewModal() {
      document.getElementById('review-modal').classList.add('hidden');
      currentModalJob = null;
    }

    function highlightItemRow(idx) {
      const row = document.getElementById('item-row-' + idx);
      const bbox = document.getElementById('bbox-' + idx);
      if (row) row.classList.add('bg-[#edf5f0]', 'border-[#153f2d]');
      if (bbox) bbox.classList.add('active');
    }

    function unhighlightItemRow(idx) {
      const row = document.getElementById('item-row-' + idx);
      const bbox = document.getElementById('bbox-' + idx);
      if (row) row.classList.remove('bg-[#edf5f0]', 'border-[#153f2d]');
      if (bbox) bbox.classList.remove('active');
    }

    function focusItemRow(idx) {
      const row = document.getElementById('item-row-' + idx);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightItemRow(idx);
      }
    }

    function approveExtractedJob() {
      if (!currentModalJob) return;

      currentModalJob.status = 'Completed';
      saveJobs();
      renderJobsTable();
      updateKPIs();
      closeReviewModal();

      showToast('تم اعتماد الأصناف بنجاح!', `تم إدراج ${currentModalJob.detectedCount} صنفاً في كتالوج المتجر وتسكينها على الرف ${currentModalJob.shelfLocation.level}.`, 'success');
    }

    function showToast(title, message, type = 'success') {
      if (window.DawwerNotifications && typeof window.DawwerNotifications.show === 'function') {
        window.DawwerNotifications.show({
          title: title || 'التقاط الرفوف بالذكاء الاصطناعي',
          message: message || '',
          type: type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success')
        });
        return;
      }
      const toast = document.getElementById('toast');
      const toastTitle = document.getElementById('toast-title');
      const toastMsg = document.getElementById('toast-message');
      const toastIcon = document.getElementById('toast-icon');

      toastTitle.textContent = title;
      toastMsg.textContent = message;

      if (type === 'error') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shrink-0';
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      } else if (type === 'info') {
        toastIcon.className = 'w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0';
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

    function initCaptureEvents() {

      const btnHeaderCam = document.getElementById('btn-header-camera-capture');
      if (btnHeaderCam) btnHeaderCam.addEventListener('click', triggerCameraCapture);

      const btnSampleShelf = document.getElementById('btn-sample-shelf');
      if (btnSampleShelf) btnSampleShelf.addEventListener('click', loadSampleShelfImage);

      const shelfZone = document.getElementById('shelf-zone');
      if (shelfZone) shelfZone.addEventListener('change', handleZoneChange);

      const shelfAisle = document.getElementById('shelf-aisle');
      if (shelfAisle) shelfAisle.addEventListener('change', handleAisleChange);

      const shelfRack = document.getElementById('shelf-rack');
      if (shelfRack) shelfRack.addEventListener('change', updateShelfPreview);

      const shelfLevel = document.getElementById('shelf-level');
      if (shelfLevel) shelfLevel.addEventListener('change', updateShelfPreview);

      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('file-input');
      const mobileInput = document.getElementById('mobile-camera-input');

      // Global protection to prevent browser from navigating to dropped file
      window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
      window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);

      if (dropzone && fileInput) {
        dropzone.addEventListener('dragenter', handleDragEnter);
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('dragleave', handleDragLeave);
        dropzone.addEventListener('drop', handleFileDrop);
        dropzone.addEventListener('click', (e) => {
          if (!e.target.closest('button') && !e.target.closest('input')) {
            fileInput.click();
          }
        });
      }

      if (fileInput) fileInput.addEventListener('change', handleFileSelect);
      if (mobileInput) mobileInput.addEventListener('change', handleMobileCameraSelect);

      const btnCamCapture = document.getElementById('btn-camera-capture');
      if (btnCamCapture) btnCamCapture.addEventListener('click', triggerCameraCapture);

      const btnClearImages = document.getElementById('btn-clear-images');
      if (btnClearImages) btnClearImages.addEventListener('click', clearUploadedImages);

      const btnStartExt = document.getElementById('btn-start-extraction');
      if (btnStartExt) btnStartExt.addEventListener('click', startAIExtraction);

      const tabAll = document.getElementById('tab-all');
      if (tabAll) tabAll.addEventListener('click', () => filterJobs('all'));

      const tabProc = document.getElementById('tab-processing');
      if (tabProc) tabProc.addEventListener('click', () => filterJobs('Processing'));

      const tabRev = document.getElementById('tab-review');
      if (tabRev) tabRev.addEventListener('click', () => filterJobs('Review Required'));

      const tabComp = document.getElementById('tab-completed');
      if (tabComp) tabComp.addEventListener('click', () => filterJobs('Completed'));

      const searchJobs = document.getElementById('search-jobs');
      if (searchJobs) searchJobs.addEventListener('input', handleSearchJobs);

      document.querySelectorAll('[data-action="close-camera-modal"]').forEach(btn => {
        btn.addEventListener('click', closeCameraModal);
      });
      const btnCloseCam = document.getElementById('btn-close-camera');
      if (btnCloseCam) btnCloseCam.addEventListener('click', closeCameraModal);
      const btnCancelCam = document.getElementById('btn-cancel-camera');
      if (btnCancelCam) btnCancelCam.addEventListener('click', closeCameraModal);

      const btnCamFallback = document.getElementById('btn-camera-fallback-file');
      if (btnCamFallback) {
        btnCamFallback.addEventListener('click', () => {
          closeCameraModal();
          if (fileInput) fileInput.click();
        });
      }

      const btnSnap = document.getElementById('btn-snap-photo');
      if (btnSnap) btnSnap.addEventListener('click', snapCameraPhoto);

      const btnToggleCam = document.getElementById('btn-toggle-camera-facing');
      if (btnToggleCam) btnToggleCam.addEventListener('click', toggleCameraFacing);

      document.querySelectorAll('[data-action="close-review-modal"]').forEach(btn => {
        btn.addEventListener('click', closeReviewModal);
      });
      const btnCloseRev = document.getElementById('btn-close-review');
      if (btnCloseRev) btnCloseRev.addEventListener('click', closeReviewModal);
      const btnCancelRev = document.getElementById('btn-cancel-review');
      if (btnCancelRev) btnCancelRev.addEventListener('click', closeReviewModal);

      const btnApproveJob = document.getElementById('btn-approve-extracted-job');
      if (btnApproveJob) btnApproveJob.addEventListener('click', approveExtractedJob);

      const thumbsGrid = document.getElementById('thumbnails-grid');
      if (thumbsGrid) {
        thumbsGrid.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="remove-thumb"]');
          if (btn && btn.dataset.idx !== undefined) {
            removeUploadedImage(parseInt(btn.dataset.idx, 10));
          }
        });
      }

      const jobsTbody = document.getElementById('jobs-table-body');
      if (jobsTbody) {
        jobsTbody.addEventListener('click', (e) => {
          const revBtn = e.target.closest('[data-action="review-job"]');
          if (revBtn && revBtn.dataset.id) {
            openReviewModal(revBtn.dataset.id);
            return;
          }
          const retryBtn = e.target.closest('[data-action="retry-job"]');
          if (retryBtn && retryBtn.dataset.id) {
            retryJob(retryBtn.dataset.id);
            return;
          }
          const delBtn = e.target.closest('[data-action="delete-job"]');
          if (delBtn && delBtn.dataset.id) {
            deleteJob(delBtn.dataset.id);
            return;
          }
        });
      }

      const bboxesLayer = document.getElementById('bounding-boxes-layer');
      if (bboxesLayer) {
        bboxesLayer.addEventListener('mouseover', (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) {
            highlightItemRow(parseInt(box.dataset.itemIdx, 10));
          }
        });
        bboxesLayer.addEventListener('mouseout', (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) {
            unhighlightItemRow(parseInt(box.dataset.itemIdx, 10));
          }
        });
        bboxesLayer.addEventListener('click', (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) {
            focusItemRow(parseInt(box.dataset.itemIdx, 10));
          }
        });
      }

      const modalItemsList = document.getElementById('modal-items-list');
      if (modalItemsList) {
        modalItemsList.addEventListener('mouseover', (e) => {
          const row = e.target.closest('[data-item-idx]');
          if (row && row.dataset.itemIdx !== undefined) {
            highlightItemRow(parseInt(row.dataset.itemIdx, 10));
          }
        });
        modalItemsList.addEventListener('mouseout', (e) => {
          const row = e.target.closest('[data-item-idx]');
          if (row && row.dataset.itemIdx !== undefined) {
            unhighlightItemRow(parseInt(row.dataset.itemIdx, 10));
          }
        });
      }
    }

    window.triggerCameraCapture = triggerCameraCapture;
    window.startCameraStream = startCameraStream;
    window.startDesktopWebcam = startCameraStream;
    window.isMobileOrTablet = isMobileOrTablet;
    window.isMobileDevice = isMobileOrTablet;
    window.stopCameraStream = stopCameraStream;
    window.closeCameraModal = closeCameraModal;
    window.snapCameraPhoto = snapCameraPhoto;
    window.toggleCameraFacing = toggleCameraFacing;
    window.handleMobileCameraSelect = handleMobileCameraSelect;
    window.handleFileSelect = handleFileSelect;
    window.handleFileDrop = handleFileDrop;
    window.handleDragEnter = handleDragEnter;
    window.handleDragOver = handleDragOver;
    window.handleDragLeave = handleDragLeave;
    window.syncStoreContext = syncStoreContext;
    window.loadSampleShelfImage = loadSampleShelfImage;
    window.handleZoneChange = handleZoneChange;
    window.handleAisleChange = handleAisleChange;
    window.updateShelfPreview = updateShelfPreview;
    window.clearUploadedImages = clearUploadedImages;
    window.startAIExtraction = startAIExtraction;
    window.filterJobs = filterJobs;
    window.handleSearchJobs = handleSearchJobs;
    window.closeReviewModal = closeReviewModal;
    window.approveExtractedJob = approveExtractedJob;
    window.retryJob = retryJob;
    window.deleteJob = deleteJob;
    window.openReviewModal = openReviewModal;
    window.removeUploadedImage = removeUploadedImage;
    window.highlightItemRow = highlightItemRow;
    window.unhighlightItemRow = unhighlightItemRow;
    window.focusItemRow = focusItemRow;
    window.showToast = showToast;
    window.escapeHtml = escapeHtml;
    window.validateInputs = validateInputs;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCaptureEvents);
    } else {
      initCaptureEvents();
    }
