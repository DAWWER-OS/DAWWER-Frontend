// Storage Hygiene: Clear legacy test keys
try {
  localStorage.removeItem('shelf_jobs');
  localStorage.removeItem('mock_drafts');
} catch (e) {}

var FASTAPI_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.FASTAPI_BASE_URL)
  ? window.CONFIG.FASTAPI_BASE_URL.replace(/\/+$/, '')
  : 'https://dawwer-backend-fastapi.onrender.com';
const STORAGE_KEY = 'dawwer_ai_extraction_jobs';

    const SAMPLE_SHELF_IMAGE = 'assets/images/sample_shelf.jpg';

    function resolveShelfImageUrl(rawUrl, zone = 'Zone A') {
      if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '' || rawUrl === 'null' || rawUrl === 'undefined') {
        return '';
      }
      const trimmed = rawUrl.trim();

      // Guard against job IDs (e.g. 'JOB-2026-9041') being used as image URLs
      if (trimmed.startsWith('JOB-') || /^JOB[-_]/i.test(trimmed)) {
        return '';
      }

      // 1. Data URLs (e.g. webcam captures or SVG fallbacks)
      if (trimmed.startsWith('data:image/')) {
        return trimmed;
      }

      // 2. Local valid asset paths
      if (trimmed.startsWith('assets/') || trimmed.startsWith('./assets/') || trimmed.startsWith('/assets/')) {
        return trimmed.startsWith('./') ? trimmed.slice(2) : (trimmed.startsWith('/') ? trimmed.slice(1) : trimmed);
      }
      if (trimmed === 'sample_shelf.jpg' || trimmed.endsWith('/sample_shelf.jpg')) {
        return SAMPLE_SHELF_IMAGE;
      }

      // 3. Dead blob URLs from previous browser sessions
      if (trimmed.startsWith('blob:')) {
        return '';
      }

      // 4. External or backend full URLs
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }

      return CONFIG.resolveImageUrl(trimmed, 'fastapi');
    }

    /**
     * Fallback handler for missing or failed product/shelf images
     */
    function handleImageError(imgEl, caption = 'لم يتم الاستخراج') {
      if (typeof window !== 'undefined' && window.handleImageError && window.handleImageError !== handleImageError) {
        return window.handleImageError(imgEl, caption);
      }
      if (!imgEl) return;
      imgEl.onerror = null;
      imgEl.style.display = 'none';

      const parent = imgEl.parentElement;
      if (!parent) return;

      let placeholder = parent.querySelector('.img-fallback-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'img-fallback-placeholder flex flex-col items-center justify-center text-center p-1 w-full h-full text-slate-400 select-none';
        placeholder.innerHTML = `
          <svg class="w-4 h-4 text-slate-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="text-[9px] font-medium leading-tight">${caption}</span>
        `;
        parent.appendChild(placeholder);
      } else {
        placeholder.style.display = 'flex';
      }
    }

    if (typeof window !== 'undefined') {
      window.handleImageError = window.handleImageError || handleImageError;
      window.resolveShelfImageUrl = resolveShelfImageUrl;
    }

    function getStoreContext() { return { storeId: ApiClient.getActiveStoreId(), token: ApiClient.getAuthToken(true) }; }
    const getActiveStoreContext = getStoreContext;

    function getApiHeaders() {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
      const cleanToken = token ? token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : '';
      return {
        'Authorization': cleanToken ? `Bearer ${cleanToken}` : '',
        'Accept': 'application/json'
      };
    }

    function handleUnauthorizedResponse() {
      if (typeof showToast === 'function') {
        showToast('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول لمتابعة العمليات', 'warning');
      } else {
        alert('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
      }
    }

    if (typeof window !== 'undefined') {
      window.getApiHeaders = getApiHeaders;
      window.handleUnauthorizedResponse = handleUnauthorizedResponse;
    }

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

    const DEFAULT_MOCK_JOBS = [];
    const DEFAULT_JOBS = [];

    let jobsList = [];
    let uploadedFiles = [];
    let captureBusy = false;
    let currentFilter = 'all';
    let currentModalJob = null;

    function resolveActiveStoreId() { return ApiClient.getActiveStoreId(); }
    function persistActiveStoreId(id) { ApiClient.setActiveStoreId(id); }

    function syncStoreContext() {
      resolveActiveStoreId();
    }

    function normalizeJob(job) {
      if (!job) return null;
      const zone = job.zone || job.shelfLocation?.zone || 'Zone A';
      const aisle = job.aisle || job.shelfLocation?.aisle || 'Aisle 1';
      const rack = job.rack || job.shelfLocation?.rack || 'Rack 1';
      const level = job.shelf || job.shelf_level || job.shelfLocation?.level || 'Shelf 1';
      const label = job.shelfLocation?.label || `${zone} > ${aisle} > ${rack} > ${level}`;

      const validImageSrc = (job.image_url && !String(job.image_url).startsWith('JOB-'))
        ? job.image_url
        : (job.imageDataUrl || ((job.thumbnail && !String(job.thumbnail).startsWith('JOB-')) ? job.thumbnail : 'assets/placeholder-product.png'));

      return {
        id: job.id || job.job_id || `JOB-${Date.now()}`,
        serverId: job.serverId || job.id || job.job_id,
        createdAt: job.created_at || job.createdAt || 'الآن',
        timestamp: job.timestamp || (job.created_at ? new Date(job.created_at).getTime() : Date.now()),
        shelfLocation: {
          zone,
          aisle,
          rack,
          level,
          label
        },
        image_url: validImageSrc,
        thumbnail: resolveShelfImageUrl(validImageSrc, zone),
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

    async function loadShelfJobs() {
      const { storeId, token } = getStoreContext();
      const tbody = document.getElementById('jobs-table-body');
      const emptyState = document.getElementById('jobs-empty-state');

      // Clear tbody and show clean skeleton/spinner immediately on page start
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-slate-400 font-medium"><div class="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mr-2"></div> جارٍ تحميل سجل العمليات...</td></tr>';
      }
      if (emptyState) {
        emptyState.classList.add('hidden');
      }

      const getDeletedBlacklist = () => {
        try {
          return new Set(JSON.parse(localStorage.getItem('dawwer_deleted_job_ids') || '[]'));
        } catch (e) {
          return new Set();
        }
      };

      // Fetch from GET /api/v1/stores/{store_id}/shelf-jobs
      try {
        const serverJobs = await ApiClient.listAll(`/stores/${encodeURIComponent(storeId)}/shelf-jobs`);
        {
          const blacklist = getDeletedBlacklist();
          jobsList = (Array.isArray(serverJobs) ? serverJobs : [])
            .map(normalizeJob)
            .filter(Boolean)
            .filter(j => !blacklist.has(j.id) && !blacklist.has(j.serverId) && !blacklist.has(j.job_id));
          saveJobs();
          renderJobsTable();
          updateKPIs();
          return;
        }
      } catch (err) {
        console.warn('[AI Capture] Fetch shelf-jobs error/note:', err);
      }

      // If backend fetch was not successful, only render real non-mock jobs from localStorage
      showToast('تعذر تحديث سجل التصوير. المعروض بيانات محفوظة سابقاً.', 'warning');
      let localJobs = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) localJobs = JSON.parse(stored);
      } catch (e) {}

      const blacklist = getDeletedBlacklist();
      localJobs = (Array.isArray(localJobs) ? localJobs : []).filter(j => 
        j && 
        !String(j.id).startsWith('JOB-2026-9041') && 
        !String(j.id).startsWith('JOB-2026-8910') && 
        !String(j.id).includes('1938')
      );

      jobsList = localJobs.map(normalizeJob).filter(Boolean).filter(j => !blacklist.has(j.id) && !blacklist.has(j.serverId) && !blacklist.has(j.job_id));
      renderJobsTable();
      updateKPIs();
    }

    const loadJobs = loadShelfJobs;

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
      if (window.currentCameraStream) {
        try {
          window.currentCameraStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
        window.currentCameraStream = null;
      }
      if (cameraStream) {
        try {
          cameraStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
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
      if (captureBusy) return;
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const entryId = 'IMG-' + Date.now() + '-' + i;
        const entry = {
          id: entryId,
          name: file.name,
          sizeFormatted: (file.size / 1024).toFixed(0) + ' KB',
          sizeBytes: file.size,
          dataUrl: SAMPLE_SHELF_IMAGE,
          file: file
        };
        uploadedFiles.push(entry);

        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.onload = (e) => {
            entry.dataUrl = e.target.result;
            renderUploadedThumbnails();
          };
          reader.readAsDataURL(file);
        }
      }
      renderUploadedThumbnails();
      validateInputs();
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      const mobileInput = document.getElementById('mobile-camera-input');
      if (mobileInput) mobileInput.value = '';
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

      if (uploadedFiles.length > 0) {
        container.classList.remove('hidden');
        if (countEl) countEl.textContent = uploadedFiles.length;
        grid.innerHTML = uploadedFiles.map((f, idx) => `
          <div class="relative group bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm">
            <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-2 flex items-center justify-center relative">
              <img src="${f.dataUrl}" alt="${ApiClient.escapeHtml(f.name)}" class="w-full h-full object-cover" onerror="window.handleImageError ? window.handleImageError(this, 'لم يتم الاستخراج') : (this.style.display='none');">
              <button type="button" onclick="removeUploadedImage(${idx})" class="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition cursor-pointer z-10" title="حذف الصورة">
                ✕
              </button>
            </div>
            <div class="text-[11px] font-bold text-slate-800 truncate">${ApiClient.escapeHtml(f.name)}</div>
            <div class="text-[10px] text-slate-400">${f.sizeFormatted}</div>
          </div>
        `).join('');
      } else {
        container.classList.add('hidden');
      }
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
      const isValid = Boolean(zone && hasImages && !captureBusy);

      if (btn) {
        btn.disabled = !isValid;
      }
    }

    function generateExtractedItemsForZone(jobId, zoneVal) {
      return [];
    }

    async function startAIExtraction() {
      const btn = document.getElementById('btn-start-extraction');
      if (captureBusy || btn?.disabled || !uploadedFiles.length) return;
      captureBusy = true;
      const original = btn?.innerHTML;
      if (btn) { btn.disabled = true; btn.textContent = 'جارٍ رفع وتحليل الصور...'; }
      const files = [...uploadedFiles];
      const completed = [], submitted = new Set();
      try {
        const { storeId } = getStoreContext();
        if (!ApiClient.isValidStoreId(storeId)) throw new Error('يرجى اختيار متجر أولاً.');
        const zone = document.getElementById('shelf-zone')?.value?.trim();
        const aisle = document.getElementById('shelf-aisle')?.value?.trim() || '';
        const rack = document.getElementById('shelf-rack')?.value?.trim() || '';
        const level = document.getElementById('shelf-level')?.value?.trim() || '';
        if (!zone) throw new Error('يرجى تحديد المنطقة أولاً.');
        for (let index = 0; index < files.length; index++) {
          const image = files[index];
          try {
            if (btn) btn.textContent = `جارٍ تحليل الصورة ${index + 1} من ${files.length}...`;
            const file = image.file;
            if (!(file instanceof Blob)) throw new Error('تعذر قراءة الصورة. يرجى اختيارها مجدداً.');
            const form = new FormData();
            form.append('file', file, image.name || 'shelf.jpg');
            form.append('zone', zone); form.append('aisle', aisle);
            form.append('rack', rack); form.append('shelf', level);
            const result = await ApiClient.shelfJobs.create(storeId, form);
            let job = result?.data || result;
            const jobId = job?.id || job?.job_id;
            if (!jobId) throw new Error('لم يُرجع الخادم معرّفاً لعملية التصوير.');
            submitted.add(image.id);
            const entry = { ...job, id: jobId, serverId: jobId, store_id: storeId,
              shelfLocation: { zone, aisle, rack, level, label: `${zone} > ${aisle} > ${rack} > ${level}` },
              thumbnail: job.image_url || image.dataUrl, timestamp: Date.now(), extractedItems: [] };
            jobsList.unshift(entry); saveJobs(); renderJobsTable(); updateKPIs();
            job = await ApiClient.shelfJobs.waitForReview(storeId, job);
            Object.assign(entry, job, { status: 'Review Required', detectedCount: job.extractedItems.length });
            saveJobs(); completed.push(entry);
          } catch (error) {

            showToast(error.message || 'تعذر تحليل الصورة.', error.pending ? 'info' : 'error');
            // A created job remains in history and must not be submitted again.
            if (error.pending || error.status === 408 || error.status === 0) break;
          }
        }
        if (completed.length === files.length) {
          clearUploadedImages();
          const latest = completed[0];
          try {
            sessionStorage.setItem('dawwer_current_review_job', JSON.stringify(latest));
            localStorage.setItem('dawwer_active_job_id', latest.id);
          } catch (e) { /* The server job remains available when browser storage is full. */ }
          showToast(`اكتمل تحليل ${completed.length} صورة. جارٍ فتح المراجعة...`, 'success');
          window.location.href = `review-drafts.html?job_id=${encodeURIComponent(latest.id)}`;
        } else if (completed.length) showToast(`اكتمل تحليل ${completed.length} من ${files.length} صور. راجع سجل العمليات قبل إعادة الرفع.`, 'warning');
      } catch (error) { showToast(error.message, 'error'); }
      finally {
        uploadedFiles = uploadedFiles.filter(image => !submitted.has(image.id));
        captureBusy = false;
        renderUploadedThumbnails(); renderJobsTable(); updateKPIs();
        if (btn) { btn.innerHTML = original; btn.disabled = false; }
        validateInputs();
      }
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
      const searchVal = (document.getElementById('search-jobs')?.value || '').trim().toLowerCase();

      let deletedIds = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('dawwer_deleted_job_ids') || '[]');
      } catch (e) {}
      const blacklist = new Set(deletedIds);

      let filtered = jobsList.filter(job => {
        if (!job) return false;
        if (blacklist.has(job.id) || blacklist.has(job.job_id) || blacklist.has(job.serverId)) {
          return false;
        }
        if (currentFilter !== 'all' && job.status !== currentFilter) {
          return false;
        }
        if (searchVal) {
          const matchId = (job.id || '').toLowerCase().includes(searchVal);
          const matchLoc = (job.shelfLocation?.label || '').toLowerCase().includes(searchVal);
          return matchId || matchLoc;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        const emptyTitle = emptyState.querySelector('h4');
        if (emptyTitle) emptyTitle.textContent = 'لا توجد عمليات مسح سابقة';
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
            <a href="review-drafts.html?job_id=${encodeURIComponent(job.id || job.job_id || '')}" class="inline-flex items-center gap-1.5 bg-[#153f2d] hover:bg-[#0f2d20] text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 text-xs">
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
            <a href="review-drafts.html?job_id=${encodeURIComponent(job.id || job.job_id || '')}" class="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition text-xs">
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

        const rawJobImg = (job.image_url && !String(job.image_url).startsWith('JOB-'))
          ? job.image_url
          : (job.imageDataUrl || ((job.thumbnail && !String(job.thumbnail).startsWith('JOB-')) ? job.thumbnail : ''));
        const validImageSrc = resolveShelfImageUrl(rawJobImg);

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-4 px-6">
              <div class="font-mono font-bold text-slate-900 text-xs">${job.id}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${job.createdAt}</div>
            </td>
            <td class="py-4 px-4">
              <div class="w-14 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group cursor-pointer flex items-center justify-center" data-action="review-job" data-id="${job.id}">
                ${validImageSrc ? `
                  <img src="${validImageSrc}" alt="رف" class="w-full h-full object-cover" onerror="window.handleImageError ? window.handleImageError(this, 'لم يتم الاستخراج') : (this.style.display='none');">
                ` : `
                  <div class="img-fallback-placeholder flex flex-col items-center justify-center text-center p-1 w-full h-full text-slate-400 select-none">
                    <svg class="w-4 h-4 text-slate-400 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span class="text-[9px] font-medium leading-tight">لم يتم الاستخراج</span>
                  </div>
                `}
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

    async function deleteShelfJob(jobId, rowElement = null) {
      if (!confirm('هل أنت متأكد من حذف هذه العملية من السجل؟')) return;

      const { storeId } = getStoreContext();
      const headers = getApiHeaders();

      // Guard: avoid sending unauthenticated DELETE request that is guaranteed to fail with 401
      if (!headers.Authorization) {
        handleUnauthorizedResponse();
        return;
      }

      try {
        const response = await ApiClient.fetchResponse(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          handleUnauthorizedResponse();
          return;
        }

        // Proceed to delete the job locally if response.ok OR response.status === 404
        if (response.ok || response.status === 404) {
          // 1. Remove from localStorage
          showToast('تعذر تحديث سجل التصوير. المعروض بيانات محفوظة سابقاً.', 'warning');
      let localJobs = [];
          try {
            localJobs = JSON.parse(localStorage.getItem('dawwer_ai_extraction_jobs') || localStorage.getItem(STORAGE_KEY) || '[]');
          } catch (e) {}
          localJobs = localJobs.filter(j => (j.id !== jobId && j.job_id !== jobId && j.serverId !== jobId));
          localStorage.setItem('dawwer_ai_extraction_jobs', JSON.stringify(localJobs));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localJobs));

          // 2. Maintain a local deleted IDs blacklist so it never reappears on reload
          let deletedIds = [];
          try {
            deletedIds = JSON.parse(localStorage.getItem('dawwer_deleted_job_ids') || '[]');
          } catch (e) {}
          if (!deletedIds.includes(jobId)) {
            deletedIds.push(jobId);
            localStorage.setItem('dawwer_deleted_job_ids', JSON.stringify(deletedIds));
          }

          // 3. Update in-memory list
          jobsList = jobsList.filter(j => (j.id !== jobId && j.job_id !== jobId && j.serverId !== jobId));
          saveJobs();

          // 4. Remove the row from the DOM table
          if (rowElement && typeof rowElement.remove === 'function') {
            rowElement.remove();
          } else {
            renderJobsTable();
          }
          updateKPIs();
          showToast('تم حذف العملية من السجل', 'success');
        } else {
          console.error('[AI Capture] Failed to delete shelf job, status:', response.status);
          showToast('فشل في حذف العملية: ' + response.status, 'error');
        }
      } catch (err) {
        console.error('Failed to delete shelf job:', err);
        showToast('تعذر الاتصال بالخادم لحذف العملية', 'error');
      }
    }

    const deleteJob = deleteShelfJob;

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
      if (!jobId) return;
      const job = jobsList.find(j => j.id === jobId || j.job_id === jobId || j.serverId === jobId);
      const targetJobId = job ? (job.id || job.job_id || jobId) : jobId;

      localStorage.setItem('dawwer_active_job_id', targetJobId);
      if (job) {
        const validImageSrc = (job.image_url && !String(job.image_url).startsWith('JOB-'))
          ? job.image_url
          : (job.imageDataUrl || ((job.thumbnail && !String(job.thumbnail).startsWith('JOB-')) ? job.thumbnail : ''));
        if (validImageSrc) {
          localStorage.setItem('dawwer_current_shelf_image', validImageSrc);
          sessionStorage.setItem('current_shelf_image', validImageSrc);
          localStorage.setItem('current_shelf_image', validImageSrc);
        }
        try {
          sessionStorage.setItem('dawwer_current_review_job', JSON.stringify(job));
          const items = job.extractedItems || job.detected_products || job.items || [];
          sessionStorage.setItem('dawwer_current_draft_products', JSON.stringify(items));
        } catch (e) {}
      }

      window.location.href = `review-drafts.html?job_id=${encodeURIComponent(targetJobId)}`;
    }

    function closeReviewModal() {
      const modal = document.getElementById('review-modal');
      if (modal) modal.classList.add('hidden');
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

    async function approveExtractedJob() {
      if (currentModalJob) openReviewModal(currentModalJob.serverId || currentModalJob.id);
    }

    function showToast(title, message, type = 'success') {
      if (arguments.length === 2 && (message === 'success' || message === 'error' || message === 'warning' || message === 'info')) {
        type = message;
        message = title;
        title = type === 'warning' ? 'تنبيه' : (type === 'error' ? 'خطأ' : 'التقاط الرفوف');
      } else if (arguments.length === 1) {
        message = title;
        title = 'التقاط الرفوف';
      }

      if (window.DawwerNotifications && typeof window.DawwerNotifications.show === 'function') {
        window.DawwerNotifications.show({
          title: title || 'التقاط الرفوف بالذكاء الاصطناعي',
          message: message || '',
          type: (type === 'error' || type === 'warning' || type === 'info') ? type : 'success'
        });
        return;
      }
      const toast = document.getElementById('toast');
      const toastTitle = document.getElementById('toast-title');
      const toastMsg = document.getElementById('toast-message');
      const toastIcon = document.getElementById('toast-icon');

      if (toastTitle) toastTitle.textContent = title;
      if (toastMsg) toastMsg.textContent = message;

      if (toastIcon) {
        if (type === 'error') {
          toastIcon.className = 'w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shrink-0';
          toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
        } else if (type === 'warning') {
          toastIcon.className = 'w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0';
          toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
        } else if (type === 'info') {
          toastIcon.className = 'w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0';
          toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        } else {
          toastIcon.className = 'w-8 h-8 rounded-xl bg-[#d6a950] text-[#153f2d] flex items-center justify-center font-bold shrink-0';
          toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
        }
      }

      if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 4000);
      }
    }

    function startCamera() {
      const camModal = document.getElementById('camera-modal');
      if (camModal) camModal.classList.remove('hidden');
      startCameraStream();
    }

    function initAiCapture() {
      // =========================================================================
      // Phase 1: INSTANT UI Binding (Runs synchronously on load - ZERO network calls)
      // =========================================================================

      // 1. Dropzone click & file selection
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('file-input');
      const mobileInput = document.getElementById('mobile-camera-input');

      if (dropzone && fileInput) {
        dropzone.onclick = (e) => {
          if (e.target.closest('button') || e.target === fileInput) return;
          fileInput.click();
        };
        fileInput.onchange = (e) => {
          if (e.target.files && e.target.files.length) {
            processSelectedFiles(e.target.files);
          }
        };
        dropzone.ondragenter = handleDragEnter;
        dropzone.ondragover = handleDragOver;
        dropzone.ondragleave = handleDragLeave;
        dropzone.ondrop = handleFileDrop;
      }

      if (mobileInput) {
        mobileInput.onchange = (e) => {
          handleMobileCameraSelect(e);
        };
      }

      // 2. Camera buttons
      const camBtn = document.getElementById('btn-camera-capture');
      const headerCamBtn = document.getElementById('btn-header-camera-capture');
      const camModal = document.getElementById('camera-modal');
      const video = document.getElementById('camera-video');

      if (camBtn && camModal) {
        camBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          camModal.classList.remove('hidden');

          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
              });
              window.currentCameraStream = stream;
              if (video) {
                video.srcObject = stream;
                video.play();
              }
            } catch (err) {
              console.warn('Camera stream error:', err);
              // Mobile fallback
              const mobileInput = document.getElementById('mobile-camera-input');
              if (mobileInput) mobileInput.click();
            }
          } else {
            const mobileInput = document.getElementById('mobile-camera-input');
            if (mobileInput) mobileInput.click();
          }
        };
      }

      if (headerCamBtn && camModal) {
        headerCamBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (camBtn) camBtn.click();
        };
      }

      // 3. Demo sample button
      const sampleBtn = document.getElementById('btn-sample-shelf');
      if (sampleBtn) {
        sampleBtn.onclick = (e) => {
          e.preventDefault();
          loadSampleShelfImage();
        };
      }

      // 4. Modal close buttons
      document.querySelectorAll('[data-action="close-camera-modal"], #btn-close-camera, #btn-cancel-camera').forEach(b => {
        b.onclick = (e) => { e.preventDefault(); closeCameraModal(); };
      });

      document.querySelectorAll('[data-action="close-review-modal"], #btn-close-review, #btn-cancel-review').forEach(b => {
        b.onclick = (e) => { e.preventDefault(); closeReviewModal(); };
      });

      // 5. Camera controls
      const snapBtn = document.getElementById('btn-snap-photo');
      if (snapBtn) {
        snapBtn.onclick = (e) => { e.preventDefault(); snapCameraPhoto(); };
      }

      const toggleCamBtn = document.getElementById('btn-toggle-camera-facing');
      if (toggleCamBtn) {
        toggleCamBtn.onclick = (e) => { e.preventDefault(); toggleCameraFacing(); };
      }

      const camFallbackBtn = document.getElementById('btn-camera-fallback-file');
      if (camFallbackBtn && fileInput) {
        camFallbackBtn.onclick = (e) => {
          e.preventDefault();
          closeCameraModal();
          fileInput.click();
        };
      }

      // 6. Extraction start & clear images buttons
      const clearBtn = document.getElementById('btn-clear-images');
      if (clearBtn) {
        clearBtn.onclick = (e) => { e.preventDefault(); clearUploadedImages(); };
      }

      const startBtn = document.getElementById('btn-start-extraction');
      if (startBtn) {
        startBtn.onclick = (e) => { e.preventDefault(); startAIExtraction(); };
      }

      // 7. Approve job in review modal
      const approveBtn = document.getElementById('btn-approve-extracted-job');
      if (approveBtn) {
        approveBtn.onclick = (e) => { e.preventDefault(); approveExtractedJob(); };
      }

      // 8. Shelf location dropdown listeners
      const shelfZone = document.getElementById('shelf-zone');
      if (shelfZone) shelfZone.onchange = handleZoneChange;

      const shelfAisle = document.getElementById('shelf-aisle');
      if (shelfAisle) shelfAisle.onchange = handleAisleChange;

      const shelfRack = document.getElementById('shelf-rack');
      if (shelfRack) shelfRack.onchange = updateShelfPreview;

      const shelfLevel = document.getElementById('shelf-level');
      if (shelfLevel) shelfLevel.onchange = updateShelfPreview;

      // 9. Job filter tabs & search input
      const tabAll = document.getElementById('tab-all');
      if (tabAll) tabAll.onclick = (e) => { e.preventDefault(); filterJobs('all'); };

      const tabProc = document.getElementById('tab-processing');
      if (tabProc) tabProc.onclick = (e) => { e.preventDefault(); filterJobs('Processing'); };

      const tabRev = document.getElementById('tab-review');
      if (tabRev) tabRev.onclick = (e) => { e.preventDefault(); filterJobs('Review Required'); };

      const tabComp = document.getElementById('tab-completed');
      if (tabComp) tabComp.onclick = (e) => { e.preventDefault(); filterJobs('Completed'); };

      const searchJobs = document.getElementById('search-jobs');
      if (searchJobs) searchJobs.oninput = handleSearchJobs;

      // 10. Table actions delegation
      const jobsTbody = document.getElementById('jobs-table-body');
      if (jobsTbody) {
        jobsTbody.onclick = (e) => {
          const revBtn = e.target.closest('[data-action="review-job"]');
          if (revBtn && revBtn.dataset.id) {
            e.preventDefault();
            openReviewModal(revBtn.dataset.id);
            return;
          }
          const retryBtn = e.target.closest('[data-action="retry-job"]');
          if (retryBtn && retryBtn.dataset.id) {
            e.preventDefault();
            retryJob(retryBtn.dataset.id);
            return;
          }
          const delBtn = e.target.closest('[data-action="delete-job"], .btn-delete-job');
          if (delBtn && (delBtn.dataset.id || delBtn.getAttribute('data-id'))) {
            e.preventDefault();
            const rowElement = delBtn.closest('tr');
            const jobId = delBtn.dataset.id || delBtn.getAttribute('data-id');
            deleteShelfJob(jobId, rowElement);
            return;
          }
        };
      }

      // 11. Thumbnails grid delegation
      const thumbsGrid = document.getElementById('thumbnails-grid');
      if (thumbsGrid) {
        thumbsGrid.onclick = (e) => {
          const btn = e.target.closest('[data-action="remove-thumb"]');
          if (btn && btn.dataset.idx !== undefined) {
            e.preventDefault();
            removeUploadedImage(parseInt(btn.dataset.idx, 10));
          }
        };
      }

      // 12. Modal hover / bounding boxes delegation
      const bboxesLayer = document.getElementById('bounding-boxes-layer');
      if (bboxesLayer) {
        bboxesLayer.onmouseover = (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) highlightItemRow(parseInt(box.dataset.itemIdx, 10));
        };
        bboxesLayer.onmouseout = (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) unhighlightItemRow(parseInt(box.dataset.itemIdx, 10));
        };
        bboxesLayer.onclick = (e) => {
          const box = e.target.closest('[data-item-idx]');
          if (box && box.dataset.itemIdx !== undefined) focusItemRow(parseInt(box.dataset.itemIdx, 10));
        };
      }

      const modalItemsList = document.getElementById('modal-items-list');
      if (modalItemsList) {
        modalItemsList.onmouseover = (e) => {
          const row = e.target.closest('[data-item-idx]');
          if (row && row.dataset.itemIdx !== undefined) highlightItemRow(parseInt(row.dataset.itemIdx, 10));
        };
        modalItemsList.onmouseout = (e) => {
          const row = e.target.closest('[data-item-idx]');
          if (row && row.dataset.itemIdx !== undefined) unhighlightItemRow(parseInt(row.dataset.itemIdx, 10));
        };
      }

      // Global drag prevention
      window.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); };
      window.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); };

      // =========================================================================
      // Phase 2: Show Initial Spinner & KPIs Synchronously
      try {
        const tbody = document.getElementById('jobs-table-body');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-slate-400 font-medium"><div class="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mr-2"></div> جارٍ تحميل سجل العمليات...</td></tr>';
        }
        updateKPIs();
        updateShelfPreview();
        validateInputs();
      } catch (err) {
        console.error('[AI Capture] Error during Phase 2 Initial Render:', err);
      }

      // Phase 3: Fetch Real Shelf Jobs from Server
      loadShelfJobs();
    }

    window.initAiCapture = initAiCapture;
    window.startCamera = startCamera;
    window.getActiveStoreContext = getActiveStoreContext;
    window.getStoreContext = getStoreContext;
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
    window.deleteShelfJob = deleteShelfJob;
    window.openReviewModal = openReviewModal;
    window.removeUploadedImage = removeUploadedImage;
    window.highlightItemRow = highlightItemRow;
    window.unhighlightItemRow = unhighlightItemRow;
    window.focusItemRow = focusItemRow;
    window.showToast = showToast;
    window.renderJobsTable = renderJobsTable;
    window.renderRecentJobs = renderJobsTable;
    window.escapeHtml = escapeHtml;
    window.validateInputs = validateInputs;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAiCapture);
    } else {
      initAiCapture();
    }
