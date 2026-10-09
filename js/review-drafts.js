function revealMainContent() {
  const skeleton = document.getElementById('review-skeleton-loader');
  const mainContent = document.getElementById('main-review-content');
  if (skeleton) {
    skeleton.classList.add('hidden');
  }
  if (mainContent) {
    mainContent.classList.remove('hidden');
    void mainContent.offsetHeight; // trigger browser reflow
    mainContent.classList.remove('opacity-0');
    mainContent.classList.add('opacity-100');
  }
}

// Storage Hygiene: Clear legacy test keys
try {
  localStorage.removeItem('shelf_jobs');
  localStorage.removeItem('mock_drafts');
} catch (e) {}

/**
 * Dawwer Merchant AI Shelf Capture - Split-Screen Review & Approval Engine
 * Two-Backend Architecture Integration:
 * - Direct REST integration to Render FastAPI Backend
 * - Resilient offline/cold-start fallback via localStorage & cached sessions
 */

// 1. Global Configuration & Variable Scope Guard
var FASTAPI_BASE_URL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.FASTAPI_BASE_URL)
  ? window.CONFIG.FASTAPI_BASE_URL.replace(/\/+$/, '')
  : 'https://dawwer-backend-fastapi.onrender.com';

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

function getStoreContext() {
  const urlParams = new URLSearchParams(typeof window !== 'undefined' && window.location ? window.location.search : '');
  let jobId = urlParams.get('job_id') || urlParams.get('jobId') || localStorage.getItem('dawwer_active_job_id') || '';
  if (!jobId) {
    try {
      const cur = JSON.parse(localStorage.getItem('dawwer_current_job') || '{}');
      jobId = cur.id || cur.job_id || '';
    } catch (e) {}
  }
  let storeId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  let token = '';

  try {
    storeId = localStorage.getItem('activeStoreId') ||
              localStorage.getItem('storeId') ||
              localStorage.getItem('active_store_id') ||
              '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    token = localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('storeToken') ||
            '';
  } catch (e) {}

  return { jobId, storeId, token };
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let availableCategories = [
  'الألبان والمبردات',
  'المخبوزات',
  'المعلبات',
  'المشروبات',
  'منتجات طازجة',
  'زيوت ومؤونة',
  'تسالي وحلويات',
  'لحوم ومأكولات بحرية',
  'عام'
];

async function loadAvailableCategories() {
  const { storeId } = getStoreContext();
  const headers = getApiHeaders();

  try {
    let res = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/categories`, { headers }).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`${FASTAPI_BASE_URL}/api/v1/categories`, { headers }).catch(() => null);
    }

    if (res && res.status === 401) {
      handleUnauthorizedResponse();
      return;
    }

    if (res && res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.categories || data?.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const names = list.map(c => typeof c === 'string' ? c : (c.name || c.category_name || c.title)).filter(Boolean);
        if (names.length > 0) {
          availableCategories = Array.from(new Set([...availableCategories, ...names]));
        }
      }
    } else {
      // Fallback: extract unique categories from products
      try {
        const pRes = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products?limit=100`, { headers }).catch(() => null);
        if (pRes && pRes.ok) {
          const pData = await pRes.json();
          const items = Array.isArray(pData) ? pData : (pData?.items || pData?.data || []);
          if (Array.isArray(items) && items.length > 0) {
            const pCats = items.map(p => p.category).filter(Boolean);
            if (pCats.length > 0) {
              availableCategories = Array.from(new Set([...availableCategories, ...pCats]));
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[review-drafts] Categories fetch fallback:', e);
  }

  // Populate modal select
  const manualCategorySelect = document.getElementById('manual-category');
  if (manualCategorySelect) {
    manualCategorySelect.innerHTML = availableCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }
}

const JOBS_STORAGE_KEY = 'dawwer_ai_extraction_jobs';
const CATALOG_STORAGE_KEY = 'dawwer_merchant_catalog_products';
const SAMPLE_SHELF_IMAGE = 'assets/images/sample_shelf.jpg';

function resolveShelfImageUrl(jobData) {
  if (!jobData) return '';
  let imgUrl = '';

  if (typeof jobData === 'string') {
    imgUrl = jobData.trim();
  } else if (typeof jobData === 'object') {
    // 1. Check all possible server response keys
    imgUrl = jobData.image_url || jobData.photo_url || jobData.shelf_image || jobData.image_path || jobData.image || jobData.shelf_image_url || jobData.imageDataUrl || jobData.thumbnail;
  }

  // Guard against job IDs (e.g. 'JOB-2026-9041') being used as image URLs
  if (imgUrl && (imgUrl.startsWith('JOB-') || /^JOB[-_]/i.test(imgUrl))) {
    imgUrl = '';
  }

  // 2. Fallback to cached upload preview if server didn't provide a public URL
  if (!imgUrl || imgUrl === 'null' || imgUrl === 'undefined') {
    imgUrl = sessionStorage.getItem('current_shelf_image') || 
             sessionStorage.getItem('dawwer_current_shelf_image') || 
             localStorage.getItem('dawwer_current_shelf_image') || 
             localStorage.getItem('current_shelf_image');
  }

  if (!imgUrl) return '';

  // 3. If it's a relative backend path (e.g. /uploads/...), prepend the API base URL
  if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('blob:')) {
    if (imgUrl.startsWith('assets/') || imgUrl.startsWith('./assets/') || imgUrl === 'assets/images/placeholder-shelf.jpg') {
      return imgUrl.startsWith('./') ? imgUrl.slice(2) : imgUrl;
    }
    const baseUrl = (typeof CONFIG !== 'undefined' && (CONFIG.API_BASE_URL || CONFIG.FASTAPI_BASE_URL)) 
      ? (CONFIG.API_BASE_URL || CONFIG.FASTAPI_BASE_URL).replace(/\/+$/, '') 
      : ((typeof FASTAPI_BASE_URL !== 'undefined' && FASTAPI_BASE_URL) ? FASTAPI_BASE_URL.replace(/\/+$/, '') : 'http://localhost:8000');
    imgUrl = `${baseUrl}/${imgUrl.replace(/^\/+/, '')}`;
  }

  return imgUrl;
}

let allJobs = [];
let activeJob = null;
let draftItems = [];
let selectedDraftIds = new Set();
let currentDraftFilter = 'all';
let draftSearchQuery = '';
let showBoundingBoxes = true;

// Zoom and Pan Viewport State
let zoomScale = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;

// Debounce timer for inline editing backend synchronization
let _syncDebounceTimers = {};

/**
 * Resilient Demo Fallback Data for JOB-8942 (Guarantees editor never breaks)
 */
const DEFAULT_DEMO_JOB = null;

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

function normalizeDraftProduct(item, index, jobContext) {
  const name = item.product_name || item.proposed_name || item.name || `صنف #${index + 1}`;
  const price = item.price !== undefined ? Number(item.price) : (item.estimated_price !== undefined ? Number(item.estimated_price) : 0);
  const sku = item.barcode_detected || item.store_sku || item.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
  const category = item.category_hint || item.category || 'عام';
  const size = item.pack_size || item.size || '';
  const confidence = item.confidence_score !== undefined
    ? (item.confidence_score <= 1.0 ? Math.round(item.confidence_score * 100) : Math.round(item.confidence_score))
    : (item.confidence || 98);

  const defaultBox = {
    x: 8 + (index % 4) * 22,
    y: 15 + Math.floor(index / 4) * 30,
    w: 18,
    h: 24
  };
  const box = item.bounding_box || item.box || defaultBox;

  const itemZone = item.zone || jobContext?.shelfLocation?.zone || 'المنطقة أ';
  const itemAisle = item.aisle || jobContext?.shelfLocation?.aisle || '01';
  const itemRack = item.rack || jobContext?.shelfLocation?.rack || 'R1';
  const itemShelf = item.shelf || item.shelf_tier || jobContext?.shelfLocation?.level || '1';
  const itemLabel = item.shelfLocation?.label || `${itemZone} > ممر ${itemAisle} > رف ${itemShelf}`;

  const rawStatus = String(item.status || '').toLowerCase();
  const isApproved = rawStatus === 'approved' || rawStatus === 'published' || rawStatus === 'معتمد';

  return {
    id: item.id || `DRF-${jobContext?.id || 'JOB'}-${index + 1}`,
    serverId: item.serverId || item.draft_id || item.id || null,
    name,
    brand: item.brand || '',
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
    status: isApproved ? 'Approved' : 'Draft',
    hasDuplicateMatch: !!item.has_duplicate_match || !!item.hasDuplicateMatch,
    duplicateMatch: item.duplicate_match || item.duplicateMatch || null
  };
}

function normalizeServerJob(job) {
  const zone = job.zone || job.shelfLocation?.zone || 'المنطقة أ';
  const aisle = job.aisle || job.shelfLocation?.aisle || '01';
  const rack = job.rack || job.shelfLocation?.rack || 'R1';
  const level = job.shelf || job.shelf_tier || job.shelfLocation?.level || '1';
  const label = job.shelfLocation?.label || `${zone} > ممر ${aisle} > رف ${level}`;

  let extracted = job.extracted_items || job.draft_products || job.extractedItems || job.items || [];
  if (!Array.isArray(extracted)) extracted = [];

  return {
    id: job.id || job.job_id || `JOB-${Date.now().toString().slice(-4)}`,
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
    image_url: (job.image_url && !String(job.image_url).startsWith('JOB-')) ? job.image_url : (job.imageDataUrl || 'assets/placeholder-product.png'),
    thumbnail: resolveShelfImageUrl(
      (job.shelf_image_url && !String(job.shelf_image_url).startsWith('JOB-'))
        ? job.shelf_image_url
        : ((job.image_url && !String(job.image_url).startsWith('JOB-'))
          ? job.image_url
          : ((job.thumbnail && !String(job.thumbnail).startsWith('JOB-')) ? job.thumbnail : 'assets/placeholder-product.png'))
    ),
    imagesCount: job.imagesCount || 1,
    status: (job.status === 'REVIEW_REQUIRED' || job.status === 'Review Required') ? 'Review Required' :
            (job.status === 'COMPLETED' || job.status === 'Completed') ? 'Completed' :
            (job.status === 'PROCESSING' || job.status === 'Processing') ? 'Processing' :
            (job.status === 'QUEUED' || job.status === 'Queued') ? 'Queued' :
            (job.status || 'Review Required'),
    detectedCount: job.extracted_drafts_count !== undefined ? job.extracted_drafts_count : (extracted.length || 0),
    confidence: job.confidence || 98.4,
    extractedItems: extracted
  };
}

function saveJobsData() {
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(allJobs));
  } catch (e) {
    console.warn('Error saving jobs data:', e);
  }
}

function initCatalogStorage() {
  try {
    if (!localStorage.getItem(CATALOG_STORAGE_KEY)) {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify([]));
    }
  } catch (e) {}
}

function populateJobSelector() {
  const selector = document.getElementById('job-selector');
  if (!selector) return;
  if (!Array.isArray(allJobs) || allJobs.length === 0) {
    selector.innerHTML = '<option value="">لا توجد عمليات مسجلة</option>';
    return;
  }
  selector.innerHTML = allJobs.map(job => `
    <option value="${job.id}" ${activeJob && activeJob.id === job.id ? 'selected' : ''}>
      ${job.id} (${job.shelfLocation?.zone || 'الرف'} - ${job.detectedCount || job.extractedItems?.length || 0} صنف) - ${job.status === 'Completed' ? '✓ مكتملة' : 'بانتظار المراجعة'}
    </option>
  `).join('');
}

function handleJobSwitch(jobId) {
  setActiveJob(jobId, true);
}

function updateEmptyJobUI() {
  const idEl = document.getElementById('active-job-id');
  const shelfEl = document.getElementById('active-job-shelf');
  const confEl = document.getElementById('active-job-confidence');
  const badge = document.getElementById('active-job-status-badge');
  const imgEl = document.getElementById('shelf-source-img') || document.getElementById('shelf-image') || document.getElementById('canvas-image');

  if (idEl) idEl.textContent = '-';
  if (shelfEl) shelfEl.textContent = 'لا توجد عملية نشطة';
  if (confEl) confEl.textContent = '-';
  if (badge) {
    badge.className = 'px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold';
    badge.textContent = 'لا توجد عمليات';
  }
  const storedImage = (typeof localStorage !== 'undefined') ? localStorage.getItem('dawwer_current_shelf_image') : '';
  if (imgEl && storedImage) {
    imgEl.src = storedImage;
  }
}

// =========================================================================
// 2. Load Job & Draft Products (Direct FastAPI on Render + Fallback)
// =========================================================================

async function fetchShelfJobAndDrafts(targetJobId) {
  const { storeId } = getStoreContext();
  const headers = getApiHeaders();

  try {
    const jobUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs/${encodeURIComponent(targetJobId)}`;
    const jobRes = await fetch(jobUrl, { headers });

    if (jobRes.status === 401) {
      handleUnauthorizedResponse();
      return null;
    }

    if (jobRes.ok) {
      const jobData = await jobRes.json();
      const serverJob = jobData?.data || jobData;
      if (serverJob) {
        // Dynamic Image Binding: update image source with server URL
        const shelfImgElement = document.getElementById('shelf-source-img') || document.getElementById('shelf-image') || document.getElementById('canvas-image');
        const imgPlaceholder = document.getElementById('image-loading-placeholder');
        const validServerImg = resolveShelfImageUrl(serverJob || jobData);
        if (shelfImgElement && validServerImg) {
          shelfImgElement.src = validServerImg;
          shelfImgElement.classList.remove('opacity-0');
          if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
        }

        let extracted = serverJob.extracted_items || serverJob.draft_products || serverJob.items || [];

        // If job object has no drafts array, query the drafts endpoint directly
        if (!Array.isArray(extracted) || extracted.length === 0) {
          try {
            const draftsUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products?shelf_job_id=${encodeURIComponent(targetJobId)}&limit=100`;
            const draftsRes = await fetch(draftsUrl, { headers });
            if (draftsRes.status === 401) {
              handleUnauthorizedResponse();
            } else if (draftsRes.ok) {
              const draftsData = await draftsRes.json();
              extracted = Array.isArray(draftsData) ? draftsData : (draftsData?.data || []);
            }
          } catch (e) {
            console.warn('[review-drafts] Secondary drafts fetch note:', e);
          }
        }

        if (!Array.isArray(extracted) || extracted.length === 0) {
          const localExisting = allJobs.find(j => String(j.id) === String(targetJobId));
          if (localExisting && Array.isArray(localExisting.extractedItems) && localExisting.extractedItems.length > 0) {
            extracted = localExisting.extractedItems;
          }
        }

        serverJob.extractedItems = extracted;
        const normalized = normalizeServerJob(serverJob);

        const idx = allJobs.findIndex(j => String(j.id) === String(targetJobId));
        if (idx !== -1) {
          allJobs[idx] = normalized;
        } else {
          allJobs.unshift(normalized);
        }
        saveJobsData();
        populateJobSelector();
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[review-drafts] Backend fetch shelf job fallback:', err);
  }

  // Fallback to local storage
  try {
    const curRaw = localStorage.getItem('dawwer_current_job');
    if (curRaw) {
      const cur = JSON.parse(curRaw);
      if (cur && (String(cur.id) === String(targetJobId) || String(cur.job_id) === String(targetJobId) || !targetJobId)) {
        const norm = normalizeServerJob(cur);
        const idx = allJobs.findIndex(j => String(j.id) === String(norm.id));
        if (idx !== -1) allJobs[idx] = norm;
        else allJobs.unshift(norm);
        saveJobsData();
        populateJobSelector();
        return norm;
      }
    }
  } catch (e) {}

  return allJobs.find(j => String(j.id) === String(targetJobId)) || null;
}

async function fetchAllStoreJobs() {
  const { storeId } = getStoreContext();
  const headers = getApiHeaders();
  if (!headers.Authorization) return;

  try {
    const url = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs`;
    const res = await fetch(url, { headers });
    if (res.status === 401) {
      handleUnauthorizedResponse();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      const remoteJobs = Array.isArray(data) ? data : (data?.data || []);
      if (Array.isArray(remoteJobs) && remoteJobs.length > 0) {
        const idMap = new Map();
        remoteJobs.map(normalizeServerJob).forEach(j => idMap.set(String(j.id), j));
        allJobs.forEach(j => {
          if (!idMap.has(String(j.id))) idMap.set(String(j.id), j);
        });
        allJobs = Array.from(idMap.values());
        saveJobsData();
        populateJobSelector();
      }
    }
  } catch (e) {
    console.warn('[review-drafts] Background shelf jobs fetch note:', e);
  }
}

function setActiveJob(jobId, triggerBackendSync = false) {
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

  activeJob = allJobs.find(j => String(j.id) === String(jobId)) || allJobs[0];
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

  // Load drafts into memory
  draftItems = (activeJob.extractedItems || []).map((item, index) => normalizeDraftProduct(item, index, activeJob));
  selectedDraftIds = new Set(draftItems.map(d => d.id));

  resetZoomAndPan();

  // Shelf source image
  const imgEl = document.getElementById('shelf-source-img') || document.getElementById('shelf-image') || document.getElementById('canvas-image');
  const imgPlaceholder = document.getElementById('image-loading-placeholder');
  if (imgEl) {
    imgEl.crossOrigin = "anonymous";
    imgEl.onerror = function() {
      console.warn("Failed to load server image, checking session cache...");
      const cachedBase64 = sessionStorage.getItem('current_shelf_image') || 
                           sessionStorage.getItem('dawwer_current_shelf_image') || 
                           localStorage.getItem('dawwer_current_shelf_image') || 
                           localStorage.getItem('current_shelf_image');
      if (cachedBase64 && this.src !== cachedBase64) {
        this.src = cachedBase64;
      } else {
        this.src = 'assets/images/placeholder-shelf.jpg'; // safe fallback
      }
    };
    imgEl.onload = function() {
      imgEl.classList.remove('opacity-0');
      if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
      renderBoundingBoxes();
    };

    const resolved = resolveShelfImageUrl(activeJob);
    if (resolved) {
      if (imgEl.src !== resolved) {
        imgEl.src = resolved;
      } else if (imgEl.complete && imgEl.naturalWidth > 0) {
        imgEl.classList.remove('opacity-0');
        if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
      }
    }
  }

  // Remove loading state when job is activated
  const loadingEl = document.getElementById('drafts-loading-state');
  if (loadingEl) loadingEl.remove();

  if (!imgEl || (imgEl.complete && imgEl.naturalWidth > 0)) {
    renderBoundingBoxes();
  }
  renderDraftCards();
  updateSelectionSummary();

  // Optional background fetch to refresh from backend
  if (triggerBackendSync) {
    fetchShelfJobAndDrafts(activeJob.id).then(updated => {
      if (updated && updated.extractedItems && updated.extractedItems.length > 0) {
        draftItems = updated.extractedItems.map((item, index) => normalizeDraftProduct(item, index, updated));
        selectedDraftIds = new Set(draftItems.map(d => d.id));
        renderBoundingBoxes();
        renderDraftCards();
        updateSelectionSummary();
      }
    });
  }
}

// =========================================================================
// 3. Inline Product Editing & Real-time Bounding Box Sync
// =========================================================================

function updateDraftField(itemId, field, value) {
  const item = draftItems.find(d => d.id === itemId);
  if (!item) return;

  item[field] = value;

  // Sync to activeJob and save to local storage
  if (activeJob && activeJob.extractedItems) {
    const parentItem = activeJob.extractedItems.find(x => (x.id === itemId || x.sku === item.sku));
    if (parentItem) parentItem[field] = value;
    saveJobsData();
  }

  // Synchronize bounding box tag text dynamically without recreating canvas
  const bbox = document.getElementById(`bbox-${itemId}`);
  if (bbox) {
    const tag = bbox.querySelector('.bounding-tag');
    if (tag) {
      const idx = draftItems.findIndex(d => d.id === itemId);
      const shortName = (item.name || '').split(' ')[0] || 'صنف';
      const formattedPrice = Number(item.price || 0).toFixed(2);
      tag.textContent = `#${idx + 1} ${shortName} (${formattedPrice} ر.س)`;
    }
  }

  // Debounced live update to FastAPI backend
  clearTimeout(_syncDebounceTimers[itemId]);
  _syncDebounceTimers[itemId] = setTimeout(() => {
    syncDraftUpdateToBackend(itemId);
  }, 600);
}

async function syncDraftUpdateToBackend(itemId) {
  const item = draftItems.find(d => d.id === itemId);
  if (!item) return;

  const { storeId, token } = getStoreContext();
  const draftId = item.serverId || item.id;

  const payload = {
    product_name: item.name,
    price: Number(item.price) || 0,
    barcode_detected: item.sku || '',
    category_hint: item.category || 'عام',
    shelf_tier: item.shelfLocation?.level || '1',
    aisle_code: item.shelfLocation?.aisle || '01'
  };

  try {
    const url = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}`;
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('[review-drafts] Background inline update note:', err);
  }
}

// =========================================================================
// 4. Approve Single / Bulk Draft Products & Catalog Insertion
// =========================================================================

function formatProductPayload(item) {
  const cleanZone = item.shelfLocation?.zone || activeJob?.shelfLocation?.zone || "المنطقة أ";
  const rawAisle = item.shelfLocation?.aisle || activeJob?.shelfLocation?.aisle || "01";
  const cleanAisle = String(rawAisle).replace(/[^0-9]/g, '') || "01";
  const rawRack = item.shelfLocation?.rack || activeJob?.shelfLocation?.rack || "1";
  const cleanRack = String(rawRack).replace(/[^0-9]/g, '') || "1";
  const rawShelf = item.shelfLocation?.level || activeJob?.shelfLocation?.level || "1";
  const cleanShelf = String(rawShelf).replace(/[^0-9]/g, '') || "1";
  const shelfLocLabel = item.shelfLocation?.label || `${cleanZone} > ممر ${cleanAisle} > رف ${cleanShelf}`;

  const cleanName = (item.name || '').trim();
  const cleanBarcode = item.barcode ? String(item.barcode).trim() : (item.sku ? String(item.sku).trim() : null);
  const cleanCategory = (item.category || "عام").trim();
  const cleanPrice = parseFloat(item.price) || 0.0;

  return {
    name: cleanName,
    product_name: cleanName,
    category_id: item.category_id || null,
    category: cleanCategory,
    price: cleanPrice,
    barcode: cleanBarcode,
    store_sku: cleanBarcode || `SKU-${Date.now().toString().slice(-6)}`,
    shelf_location: item.shelf_location || shelfLocLabel,
    zone: cleanZone,
    aisle: cleanAisle,
    rack: cleanRack,
    shelf: cleanShelf,
    map_target: `${cleanZone} - ممر ${cleanAisle} - رف ${cleanShelf}`,
    quantity: 10,
    stock_status: "IN_STOCK"
  };
}

async function approveSingleDraft(itemId) {
  const item = draftItems.find(d => d.id === itemId);
  if (!item || item.status === 'Approved') return;

  const btn = document.querySelector(`[data-action="approve-single"][data-id="${itemId}"]`) ||
              document.querySelector(`[data-action="approve-draft"][data-id="${itemId}"]`) ||
              document.querySelector(`button[data-id="${itemId}"]`);
  let originalBtnHtml = '';
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    originalBtnHtml = btn.innerHTML;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    btn.innerHTML = `
      <span class="inline-flex items-center gap-1">
        <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>جاري الاعتماد...</span>
      </span>
    `;
  }

  try {
    const { storeId } = getStoreContext();
    const headers = getApiHeaders();
    const draftId = item.serverId || item.id;

    // 1. Call Backend Approve Endpoint
    try {
      const approveUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}/approve`;
      const appRes = await fetch(approveUrl, {
        method: 'POST',
        headers
      });
      if (appRes.status === 401) {
        handleUnauthorizedResponse();
        return;
      }
    } catch (err) {
      console.warn('[review-drafts] Backend single approve note:', err);
    }

    // 2. Register into products catalog on backend
    try {
      const prodRes = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formatProductPayload(item))
      });
      if (prodRes.status === 401) {
        handleUnauthorizedResponse();
        return;
      }
    } catch (e) {}

    // 3. Mark Approved locally and commit to catalog storage
    item.status = 'Approved';
    if (activeJob && activeJob.extractedItems) {
      const parentItem = activeJob.extractedItems.find(x => (x.id === itemId || x.sku === item.sku));
      if (parentItem) parentItem.status = 'Approved';
      saveJobsData();
    }

    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      const catalog = stored ? JSON.parse(stored) : [];
      catalog.unshift(createCatalogEntryFromDraft(item, new Date().toISOString()));
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
      localStorage.setItem('dawwer_merchant_catalog_v2', JSON.stringify(catalog));
    } catch (e) {}

    renderBoundingBoxes();
    renderDraftCards();
    updateSelectionSummary();
    showToast('تم اعتماد الصنف وإضافته للكتالوج بنجاح', 'success');
  } finally {
    if (btn && item.status !== 'Approved') {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
      if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
    }
  }
}

async function approveAllDrafts() {
  const pendingItems = draftItems.filter(d => (selectedDraftIds.has(d.id) || selectedDraftIds.size === 0) && d.status !== 'Approved');
  if (pendingItems.length === 0) {
    if (draftItems.length > 0 && draftItems.every(d => d.status === 'Approved')) {
      showToast('جميع الأصناف معتمدة بالفعل في الكتالوج', 'info');
      setTimeout(() => { window.location.href = 'catalog.html'; }, 500);
      return;
    }
    showToast('يرجى تحديد صنف واحد على الأقل للاعتماد', 'warning');
    return;
  }

  // Prevent double submissions: disable button immediately and display loading state
  const btn = document.getElementById('btn-approve-all-drafts') || document.querySelector('[data-alias="btn-publish-catalog"]');
  let originalBtnHtml = '';
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    originalBtnHtml = btn.innerHTML;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    btn.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <svg class="animate-spin h-4 w-4 text-[#d6a950]" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>جاري اعتماد وإضافة الأصناف للكتالوج...</span>
      </span>
    `;
  }

  try {
    const { storeId } = getStoreContext();
    const headers = getApiHeaders();

    // 1. Batch approve on backend
    try {
      const draftIds = pendingItems.map(d => d.serverId || d.id);
      const batchApproveUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/batch-approve`;
      const baRes = await fetch(batchApproveUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ draft_ids: draftIds })
      });
      if (baRes.status === 401) {
        handleUnauthorizedResponse();
        return;
      }
    } catch (e) {
      console.warn('[review-drafts] Backend draft batch approve note:', e);
    }

    // 2. Batch catalog creation / insertion
    let batchCreated = false;
    try {
      const batchUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products/batch`;
      const bRes = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: pendingItems.map(formatProductPayload)
        })
      });
      if (bRes.status === 401) {
        handleUnauthorizedResponse();
        return;
      }
      if (bRes.ok) batchCreated = true;
    } catch (e) {}

    // Fallback: iterate individual product creation if batch endpoint is not present
    if (!batchCreated) {
      for (const item of pendingItems) {
        try {
          const pRes = await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formatProductPayload(item))
          });
          if (pRes.status === 401) {
            handleUnauthorizedResponse();
            return;
          }
        } catch (e) {}
      }
    }

    // 3. Mark all items as Approved locally
    pendingItems.forEach(item => {
      item.status = 'Approved';
    });

    if (activeJob) {
      activeJob.status = 'Completed';
      if (activeJob.extractedItems) {
        activeJob.extractedItems.forEach(xi => {
          xi.status = 'Approved';
        });
      }
      saveJobsData();
    }

    // 4. Save to catalog cache (both legacy and v2 keys)
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      const catalog = stored ? JSON.parse(stored) : [];
      pendingItems.forEach(item => {
        catalog.unshift(createCatalogEntryFromDraft(item, new Date().toISOString()));
      });
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
      localStorage.setItem('dawwer_merchant_catalog_v2', JSON.stringify(catalog));
    } catch (e) {}

    // 5. Clear draft cache
    try {
      localStorage.removeItem('dawwer_current_job');
      localStorage.removeItem('dawwer_current_draft_products');
      sessionStorage.removeItem('dawwer_current_review_job');
      sessionStorage.removeItem('dawwer_current_draft_products');
    } catch (e) {}

    renderBoundingBoxes();
    renderDraftCards();
    updateSelectionSummary();

    // 6. Show success toast and redirect to catalog.html
    showToast('تم اعتماد وإضافة الأصناف للكتالوج بنجاح!', 'success');
    setTimeout(() => {
      window.location.href = 'catalog.html';
    }, 700);

  } catch (err) {
    console.error('[review-drafts] Bulk approval error:', err);
    showToast('حدث خطأ أثناء اعتماد الأصناف، يرجى المحاولة مرة أخرى', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
      if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
    }
  }
}

// =========================================================================
// 5. Delete / Reject Draft
// =========================================================================

async function discardSingleDraft(itemId) {
  const item = draftItems.find(d => d.id === itemId);
  if (!item) return;

  const card = document.getElementById(`card-${itemId}`);
  const bbox = document.getElementById(`bbox-${itemId}`);

  if (card) {
    card.style.transition = 'all 0.25s ease-out';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
  }
  if (bbox) {
    bbox.style.transition = 'all 0.25s ease-out';
    bbox.style.opacity = '0';
  }

  const { storeId, token } = getStoreContext();
  const draftId = item.serverId || item.id;

  try {
    const delUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}`;
    fetch(delUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }).catch(e => console.warn('[review-drafts] Backend delete note:', e));
  } catch (e) {}

  setTimeout(() => {
    draftItems = draftItems.filter(d => d.id !== itemId);
    selectedDraftIds.delete(itemId);

    if (activeJob && activeJob.extractedItems) {
      activeJob.extractedItems = activeJob.extractedItems.filter(x => x.id !== itemId && x.sku !== item.sku);
      activeJob.detectedCount = draftItems.length;
      saveJobsData();
    }

    renderBoundingBoxes();
    renderDraftCards();
    updateSelectionSummary();
    showToast('تم استبعاد الصنف', 'تمت إزالة الصنف من قائمة المسودات', 'info');
  }, 220);
}

function discardSelectedDrafts() {
  if (selectedDraftIds.size === 0) return;
  if (!confirm(`هل أنت متأكد من استبعاد ${selectedDraftIds.size} أصناف محددة؟`)) return;

  const { storeId, token } = getStoreContext();
  const discardedIds = Array.from(selectedDraftIds);

  discardedIds.forEach(id => {
    const it = draftItems.find(d => d.id === id);
    if (it) {
      const draftId = it.serverId || it.id;
      try {
        fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }).catch(() => {});
      } catch (e) {}
    }
  });

  draftItems = draftItems.filter(d => !selectedDraftIds.has(d.id));
  selectedDraftIds.clear();

  if (activeJob) {
    activeJob.extractedItems = draftItems;
    activeJob.detectedCount = draftItems.length;
    saveJobsData();
  }

  renderBoundingBoxes();
  renderDraftCards();
  updateSelectionSummary();
  showToast('تم استبعاد الأصناف المحددة', `تمت إزالة ${discardedIds.length} أصناف من المسودة`, 'info');
}

// =========================================================================
// UI Rendering: Bounding Boxes & Draft Cards
// =========================================================================

function calculateNormalizedBox(boxData, naturalWidth, naturalHeight) {
  if (!boxData) {
    return { x: 10, y: 10, w: 20, h: 20 };
  }

  // Handle [ymin, xmin, ymax, xmax] array format (e.g., Gemini Vision)
  if (Array.isArray(boxData) && boxData.length >= 4) {
    let [ymin, xmin, ymax, xmax] = boxData.map(Number);
    if (ymin > 1 || xmin > 1 || ymax > 1 || xmax > 1) {
      if (ymin > 100 || xmin > 100 || ymax > 100 || xmax > 100) {
        if (naturalWidth > 0 && naturalHeight > 0 && (xmax > 1000 || ymax > 1000)) {
          xmin = (xmin / naturalWidth) * 100;
          ymin = (ymin / naturalHeight) * 100;
          xmax = (xmax / naturalWidth) * 100;
          ymax = (ymax / naturalHeight) * 100;
          return {
            x: Math.max(0, Math.min(95, xmin)),
            y: Math.max(0, Math.min(95, ymin)),
            w: Math.max(2, Math.min(100 - xmin, xmax - xmin)),
            h: Math.max(2, Math.min(100 - ymin, ymax - ymin))
          };
        } else {
          ymin = ymin / 10;
          xmin = xmin / 10;
          ymax = ymax / 10;
          xmax = xmax / 10;
        }
      }
    } else {
      ymin = ymin * 100;
      xmin = xmin * 100;
      ymax = ymax * 100;
      xmax = xmax * 100;
    }
    const x = Math.max(0, Math.min(95, xmin));
    const y = Math.max(0, Math.min(95, ymin));
    const w = Math.max(2, Math.min(100 - x, xmax - xmin));
    const h = Math.max(2, Math.min(100 - y, ymax - ymin));
    return { x, y, w, h };
  }

  // Handle object formats
  if (typeof boxData === 'object') {
    if (boxData.xmin !== undefined && boxData.xmax !== undefined) {
      let xmin = Number(boxData.xmin);
      let ymin = Number(boxData.ymin);
      let xmax = Number(boxData.xmax);
      let ymax = Number(boxData.ymax);
      if (xmin <= 1 && ymin <= 1 && xmax <= 1 && ymax <= 1) {
        xmin *= 100; ymin *= 100; xmax *= 100; ymax *= 100;
      } else if (naturalWidth > 0 && naturalHeight > 0 && (xmax > 100 || ymax > 100)) {
        xmin = (xmin / naturalWidth) * 100;
        ymin = (ymin / naturalHeight) * 100;
        xmax = (xmax / naturalWidth) * 100;
        ymax = (ymax / naturalHeight) * 100;
      }
      return {
        x: Math.max(0, Math.min(95, xmin)),
        y: Math.max(0, Math.min(95, ymin)),
        w: Math.max(2, Math.min(100 - xmin, xmax - xmin)),
        h: Math.max(2, Math.min(100 - ymin, ymax - ymin))
      };
    }

    let bx = Number(boxData.x !== undefined ? boxData.x : (boxData.left !== undefined ? boxData.left : 10));
    let by = Number(boxData.y !== undefined ? boxData.y : (boxData.top !== undefined ? boxData.top : 10));
    let bw = Number(boxData.w !== undefined ? boxData.w : (boxData.width !== undefined ? boxData.width : 20));
    let bh = Number(boxData.h !== undefined ? boxData.h : (boxData.height !== undefined ? boxData.height : 20));

    if (bx <= 1 && by <= 1 && bw <= 1 && bh <= 1 && (bx > 0 || by > 0 || bw > 0 || bh > 0)) {
      bx *= 100;
      by *= 100;
      bw *= 100;
      bh *= 100;
    } else if (naturalWidth > 0 && naturalHeight > 0 && (bx > 100 || by > 100 || bw > 100 || bh > 100)) {
      bx = (bx / naturalWidth) * 100;
      by = (by / naturalHeight) * 100;
      bw = (bw / naturalWidth) * 100;
      bh = (bh / naturalHeight) * 100;
    }

    return {
      x: Math.max(0, Math.min(95, bx)),
      y: Math.max(0, Math.min(95, by)),
      w: Math.max(2, Math.min(100 - bx, bw)),
      h: Math.max(2, Math.min(100 - by, bh))
    };
  }

  return { x: 10, y: 10, w: 20, h: 20 };
}

function renderBoundingBoxes() {
  const layer = document.getElementById('image-boxes-layer');
  if (!layer) return;

  if (!Array.isArray(draftItems) || draftItems.length === 0) {
    layer.innerHTML = '';
    return;
  }

  const shelfImg = document.getElementById('shelf-source-img') || document.getElementById('shelf-image') || document.getElementById('canvas-image');

  // Align Bounding Boxes after Image Loads:
  // Ensure bounding boxes are drawn ONLY after shelfImg.onload triggers,
  // guaranteeing that the bounding boxes calculate their positions against the true rendered dimensions of the picture,
  // rather than drawing over an empty canvas.
  if (shelfImg && shelfImg.src && (!shelfImg.complete || shelfImg.naturalWidth === 0)) {
    shelfImg.onload = function() {
      const imgPlaceholder = document.getElementById('image-loading-placeholder');
      if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
      shelfImg.classList.remove('opacity-0');
      renderBoundingBoxes();
    };
    return;
  }
  const naturalWidth = (shelfImg && shelfImg.naturalWidth) ? shelfImg.naturalWidth : (shelfImg ? shelfImg.clientWidth : 0);
  const naturalHeight = (shelfImg && shelfImg.naturalHeight) ? shelfImg.naturalHeight : (shelfImg ? shelfImg.clientHeight : 0);

  layer.innerHTML = draftItems.map((item, index) => {
    const rawBox = item.bounding_box || item.box;
    const box = calculateNormalizedBox(rawBox, naturalWidth, naturalHeight);
    const isDuplicate = item.hasDuplicateMatch;
    const isApproved = item.status === 'Approved';

    return `
      <div 
        class="bounding-box ${isDuplicate ? 'duplicate-box' : ''} ${isApproved ? 'approved-box' : ''}" 
        id="bbox-${item.id}"
        style="left: ${box.x.toFixed(2)}%; top: ${box.y.toFixed(2)}%; width: ${box.w.toFixed(2)}%; height: ${box.h.toFixed(2)}%;"
        data-box-id="${item.id}"
      >
        <div class="bounding-tag">
          #${index + 1} ${(item.name || '').split(' ')[0]} (${Number(item.price || 0).toFixed(2)} ر.س)
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
    if (isHovering) card.classList.add('ring-2', 'ring-[#153f2d]', 'shadow-lg');
    else card.classList.remove('ring-2', 'ring-[#153f2d]', 'shadow-lg');
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

function toggleBoundingBoxes() {
  showBoundingBoxes = !showBoundingBoxes;
  const layer = document.getElementById('image-boxes-layer');
  const btnText = document.getElementById('btn-toggle-boxes-text');
  const btn = document.getElementById('btn-toggle-boxes');

  if (showBoundingBoxes) {
    if (layer) layer.classList.remove('hidden');
    if (btnText) btnText.textContent = 'المربعات: مفعّلة';
    if (btn) btn.className = 'px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1';
  } else {
    if (layer) layer.classList.add('hidden');
    if (btnText) btnText.textContent = 'المربعات: مخفية';
    if (btn) btn.className = 'px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 text-[11px] font-bold transition flex items-center gap-1';
  }
}

function getFilteredDrafts() {
  return draftItems.filter(item => {
    if (currentDraftFilter === 'duplicates' && !item.hasDuplicateMatch) return false;
    if (currentDraftFilter === 'high_conf' && item.confidence < 95) return false;
    if (draftSearchQuery) {
      const matchName = (item.name || '').toLowerCase().includes(draftSearchQuery);
      const matchSku = (item.sku || '').toLowerCase().includes(draftSearchQuery);
      const matchPrice = (item.price || '').toString().includes(draftSearchQuery);
      return matchName || matchSku || matchPrice;
    }
    return true;
  });
}

function renderDraftCards() {
  const container = document.getElementById('draft-cards-container') || document.getElementById('draft-items-list') || document.getElementById('items-container') || document.getElementById('drafts-list');
  if (!container) return;

  // Remove loading state when data is ready to be rendered
  const loadingEl = document.getElementById('drafts-loading-state');
  if (loadingEl) loadingEl.remove();

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
        <div id="drafts-empty-state" class="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-2xs">
          <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/60">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">لم يتم التعرف على منتجات في هذه الصورة</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">يمكنك التقاط صورة جديدة بإضاءة واضحة أو إضافة الأصناف يدوياً بالزر أدناه.</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="ai-capture.html" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#153f2d] text-white text-xs font-bold hover:bg-[#0f2d20] transition shadow-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>التقاط صورة جديدة للرف</span>
            </a>
            <button type="button" onclick="document.getElementById('btn-add-manual-draft')?.click()" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>إضافة صنف يدوياً</span>
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">لا توجد أصناف مطابقة للبحث أو التصفية</h4>
          <p class="text-xs text-slate-400 mt-1">جرب تغيير معايير البحث أو اختيار تبويب تصفية آخر</p>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = filtered.map((item, index) => {
    const isSelected = selectedDraftIds.has(item.id);
    const hasDup = item.hasDuplicateMatch && item.duplicateMatch;
    const isApproved = item.status === 'Approved';

    return `
      <div 
        id="card-${item.id}"
        class="bg-white rounded-3xl border ${isApproved ? 'border-emerald-300 bg-emerald-50/20' : (hasDup ? 'border-amber-300' : 'border-slate-200/90')} shadow-2xs hover:shadow-md transition p-4 sm:p-5 space-y-4"
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
              <span class="w-6 h-6 rounded-lg ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-[#edf5f0] text-[#153f2d]'} font-black text-xs flex items-center justify-center">
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

            <!-- Status Badge -->
            ${isApproved ? `
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 flex items-center gap-1">
                <svg class="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span>معتمد / Approved</span>
              </span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                مسودة AI
              </span>
            `}

            <!-- Single Approve Button -->
            <button 
              type="button" 
              data-action="approve-single" data-id="${item.id}"
              class="px-2.5 py-1 rounded-xl ${isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default' : 'bg-[#153f2d] hover:bg-[#0f2d20] text-white shadow-xs cursor-pointer'} text-[11px] font-bold transition flex items-center gap-1 active:scale-95"
              ${isApproved ? 'disabled' : ''}
              title="${isApproved ? 'الصنف معتمد في الكتالوج' : 'اعتماد ونشر هذا الصنف منفصلاً'}"
            >
              <svg class="w-3.5 h-3.5 ${isApproved ? 'text-emerald-600' : 'text-[#d6a950]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>${isApproved ? 'معتمد' : 'اعتماد'}</span>
            </button>

            <!-- Quick Discard Action -->
            <button 
              type="button" 
              data-action="discard-single" data-id="${item.id}" 
              class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
              title="استبعاد هذا الصنف"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>

        </div>

        <!-- Editable Fields Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">

          <!-- Product Name Input -->
          <div class="sm:col-span-7">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم المنتج المستخرج <span class="text-red-500">*</span></label>
            <input 
              type="text" 
              value="${item.name || ''}" 
              data-field="name" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-bold outline-none"
            >
          </div>

          <!-- Price Input -->
          <div class="sm:col-span-5">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">السعر المقروء (OCR Price) <span class="text-red-500">*</span></label>
            <div class="relative">
              <input 
                type="number" 
                step="0.01" 
                min="0"
                value="${Number(item.price || 0).toFixed(2)}" 
                data-field="price" data-id="${item.id}"
                ${isApproved ? 'disabled' : ''}
                class="w-full p-2 pl-12 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-[#153f2d] focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-black outline-none"
              >
              <span class="absolute left-2.5 top-2 text-[11px] font-bold text-[#d6a950]">ر.س</span>
            </div>
          </div>

          <!-- Barcode / SKU Input -->
          <div class="sm:col-span-6">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">الباركود المكتشف / SKU <span class="text-slate-400 font-normal">(اختياري)</span></label>
            <div class="relative">
              <input 
                type="text" 
                value="${item.sku || ''}" 
                data-field="sku" data-id="${item.id}"
                ${isApproved ? 'disabled' : ''}
                class="w-full p-2 pr-7 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-700 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-mono font-bold outline-none"
              >
              <svg class="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </div>
          </div>

          <!-- Category Dropdown -->
          <div class="sm:col-span-6">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">التصنيف</label>
            <select 
              data-field="category" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-bold outline-none"
            >
              ${availableCategories.map(cat => `
                <option value="${escapeHtml(cat)}" ${item.category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>
              `).join('')}
            </select>
          </div>

          <!-- Shelf Location Info -->
          <div class="sm:col-span-12 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-[#153f2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span class="text-[11px] text-slate-500 font-medium">الرف الهندسي المسكن:</span>
              <span class="text-xs font-bold text-[#153f2d]">${item.shelfLocation?.label || activeJob?.shelfLocation?.label || 'الرف الرئيسي'}</span>
            </div>
            <span class="text-[10px] text-emerald-700 bg-emerald-100/70 font-bold px-2 py-0.5 rounded-md">مُعين آلياً من سياق الصورة</span>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function updateSelectionSummary() {
  const total = draftItems.length;
  const count = selectedDraftIds.size;
  const badgeText = document.getElementById('selected-badge-text');
  const selectAllCb = document.getElementById('select-all-drafts');
  const approveAllBtn = document.getElementById('btn-approve-all-drafts') || document.getElementById('btn-publish-catalog');
  const discardBtn = document.getElementById('btn-discard-selected');

  if (badgeText) badgeText.textContent = `${count} من أصل ${total} أصناف محددة للنشر`;
  if (selectAllCb) {
    selectAllCb.checked = (count === total && total > 0);
    selectAllCb.indeterminate = (count > 0 && count < total);
  }
  if (approveAllBtn) approveAllBtn.disabled = (total === 0);
  if (discardBtn) discardBtn.disabled = (count === 0);
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
  draftSearchQuery = (document.getElementById('draft-search-input')?.value || '').trim().toLowerCase();
  renderDraftCards();
}

// =========================================================================
// Viewport Zoom & Pan
// =========================================================================

function applyTransform() {
  const content = document.getElementById('zoom-content');
  const badge = document.getElementById('zoom-badge');
  if (content) {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
  }
  if (badge) {
    badge.textContent = `${Math.round(zoomScale * 100)}%`;
  }
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
  const vp = document.getElementById('zoom-viewport');
  if (vp) vp.classList.add('is-dragging');
}

function handleMouseMove(e) {
  const hud = document.getElementById('image-coords-hud');
  const vp = document.getElementById('zoom-viewport');
  if (hud && vp) {
    const rect = vp.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - rect.left));
    const y = Math.max(0, Math.round(e.clientY - rect.top));
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

// =========================================================================
// Manual Add Draft Modal
// =========================================================================

function openAddManualDraftModal() {
  const form = document.getElementById('add-manual-form');
  if (form) form.reset();
  const skuEl = document.getElementById('manual-sku');
  if (skuEl) skuEl.value = `MAN-${Math.floor(100000 + Math.random() * 900000)}`;
  const modal = document.getElementById('add-manual-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddManualModal() {
  const modal = document.getElementById('add-manual-modal');
  if (modal) modal.classList.add('hidden');
}

function handleManualDraftSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById('manual-name')?.value || '').trim();
  const sku = (document.getElementById('manual-sku')?.value || `MAN-${Date.now()}`).trim().toUpperCase();
  const price = parseFloat(document.getElementById('manual-price')?.value) || 0;
  const category = document.getElementById('manual-category')?.value || 'عام';
  const size = (document.getElementById('manual-size')?.value || '').trim();

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
    shelfLocation: { ...(activeJob?.shelfLocation || { zone: 'Zone A', aisle: 'Aisle 1', rack: 'Rack 1', level: 'Shelf 1', label: 'المتجر > رف رئيسي' }) },
    box: { x: 42, y: 40, w: 18, h: 22 },
    status: 'Draft',
    hasDuplicateMatch: false
  };

  draftItems.unshift(newDraft);
  selectedDraftIds.add(newDraft.id);
  closeAddManualModal();

  if (activeJob) {
    if (!Array.isArray(activeJob.extractedItems)) activeJob.extractedItems = [];
    activeJob.extractedItems.unshift(newDraft);
    activeJob.detectedCount = draftItems.length;
    saveJobsData();
  }

  renderBoundingBoxes();
  renderDraftCards();
  updateSelectionSummary();
  showToast('تمت إضافة الصنف بنجاح', `تم إدراج "${name}" كمسودة جاهزة للمراجعة`, 'success');
}

function openPublishSuccessModal(count) {
  const modal = document.getElementById('publish-success-modal');
  const countEl = document.getElementById('success-count');
  const shelfEl = document.getElementById('success-shelf');
  if (countEl) countEl.textContent = `${count} صنف`;
  if (shelfEl && activeJob) shelfEl.textContent = activeJob.shelfLocation?.label || 'الرف المحدد';
  if (modal) modal.classList.remove('hidden');
}

function createCatalogEntryFromDraft(item, timestamp) {
  return {
    id: `prod-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: item.name,
    sku: item.sku,
    category: item.category || 'عام',
    price: Number(item.price) || 0,
    isAvailable: true,
    status: 'Published',
    location: {
      zone: item.shelfLocation?.zone || activeJob?.shelfLocation?.zone || 'المنطقة أ',
      aisle: item.shelfLocation?.aisle || activeJob?.shelfLocation?.aisle || 'ممر 01',
      rack: item.shelfLocation?.rack || activeJob?.shelfLocation?.rack || 'R1',
      shelf: item.shelfLocation?.level || activeJob?.shelfLocation?.level || 'رف 1'
    },
    updatedAt: timestamp
  };
}

function showToast(titleOrMsg, messageOrType = '', type = 'success') {
  let title = titleOrMsg;
  let message = messageOrType;
  let finalType = type;

  if (arguments.length === 2 && ['success', 'error', 'warning', 'info'].includes(messageOrType)) {
    title = 'مراجعة واعتماد المسودات';
    message = titleOrMsg;
    finalType = messageOrType;
  } else if (arguments.length === 1) {
    title = 'مراجعة واعتماد المسودات';
    message = titleOrMsg;
    finalType = 'info';
  }

  if (window.DawwerNotifications && typeof window.DawwerNotifications.show === 'function') {
    window.DawwerNotifications.show({
      title: title || 'مراجعة واعتماد المسودات',
      message: message || '',
      type: finalType === 'error' ? 'error' : (finalType === 'warning' ? 'warning' : (finalType === 'info' ? 'info' : 'success'))
    });
    return;
  }

  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast) return;

  if (toastTitle) toastTitle.textContent = title;
  if (toastMsg) toastMsg.textContent = message;

  if (toastIcon) {
    if (finalType === 'error') {
      toastIcon.className = 'w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold shrink-0';
      toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (finalType === 'warning') {
      toastIcon.className = 'w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0';
      toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else if (finalType === 'info') {
      toastIcon.className = 'w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shrink-0';
      toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    } else {
      toastIcon.className = 'w-8 h-8 rounded-xl bg-[#d6a950] text-[#153f2d] flex items-center justify-center font-bold shrink-0';
      toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    }
  }

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// =========================================================================
// Event Listeners Binding
// =========================================================================

function initReviewEvents() {
  const jobSelector = document.getElementById('job-selector');
  if (jobSelector) {
    jobSelector.onchange = (e) => handleJobSwitch(e.target.value);
  }

  const btnAddManual = document.getElementById('btn-add-manual-draft');
  if (btnAddManual) btnAddManual.onclick = openAddManualDraftModal;
  const btnAddManualHeader = document.getElementById('btn-add-manual-draft-header');
  if (btnAddManualHeader) btnAddManualHeader.onclick = openAddManualDraftModal;

  const btnToggleBoxes = document.getElementById('btn-toggle-boxes');
  if (btnToggleBoxes) btnToggleBoxes.onclick = toggleBoundingBoxes;

  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) btnZoomOut.onclick = () => handleZoom(-0.25);

  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) btnZoomIn.onclick = () => handleZoom(0.25);

  const btnZoomReset = document.getElementById('btn-zoom-reset');
  if (btnZoomReset) btnZoomReset.onclick = resetZoomAndPan;

  const vp = document.getElementById('zoom-viewport');
  if (vp) {
    vp.onmousedown = handleMouseDown;
    vp.onmousemove = handleMouseMove;
    vp.onmouseup = handleMouseUp;
    vp.onmouseleave = handleMouseUp;
    vp.onwheel = handleWheelZoom;
  }

  const filterAll = document.getElementById('filter-all');
  if (filterAll) filterAll.onclick = () => filterDrafts('all');
  const filterDups = document.getElementById('filter-duplicates');
  if (filterDups) filterDups.onclick = () => filterDrafts('duplicates');
  const filterHighConf = document.getElementById('filter-high') || document.getElementById('filter-high-conf');
  if (filterHighConf) filterHighConf.onclick = () => filterDrafts('high_conf');

  const searchInput = document.getElementById('draft-search-input');
  if (searchInput) searchInput.oninput = handleDraftSearch;

  const selectAllCb = document.getElementById('select-all-drafts');
  if (selectAllCb) selectAllCb.onchange = (e) => toggleSelectAllDrafts(e.target.checked);

  const btnDiscardSel = document.getElementById('btn-discard-selected');
  if (btnDiscardSel) btnDiscardSel.onclick = discardSelectedDrafts;

  // Bulk Approve Button (support both IDs)
  const btnApproveAll = document.getElementById('btn-approve-all-drafts') || document.getElementById('btn-publish-catalog');
  if (btnApproveAll) btnApproveAll.onclick = approveAllDrafts;

  document.querySelectorAll('[data-action="close-manual-modal"]').forEach(btn => {
    btn.onclick = closeAddManualModal;
  });
  const btnCloseModal = document.getElementById('btn-close-manual-modal');
  if (btnCloseModal) btnCloseModal.onclick = closeAddManualModal;
  const btnCancelModal = document.getElementById('btn-cancel-manual-modal');
  if (btnCancelModal) btnCancelModal.onclick = closeAddManualModal;

  const formManual = document.getElementById('add-manual-form');
  if (formManual) formManual.onsubmit = handleManualDraftSubmit;

  // Bounding boxes layer event delegation
  const boxesLayer = document.getElementById('image-boxes-layer');
  if (boxesLayer) {
    boxesLayer.onmouseover = (e) => {
      const box = e.target.closest('[data-box-id]');
      if (box && box.dataset.boxId) handleBoxHover(box.dataset.boxId, true);
    };
    boxesLayer.onmouseout = (e) => {
      const box = e.target.closest('[data-box-id]');
      if (box && box.dataset.boxId) handleBoxHover(box.dataset.boxId, false);
    };
    boxesLayer.onclick = (e) => {
      const box = e.target.closest('[data-box-id]');
      if (box && box.dataset.boxId) handleBoxClick(box.dataset.boxId);
    };
  }

  // Draft cards container event delegation
  const cardsContainer = document.getElementById('draft-cards-container') || document.getElementById('drafts-list');
  if (cardsContainer) {
    cardsContainer.onmouseover = (e) => {
      const card = e.target.closest('[data-card-id]');
      if (card && card.dataset.cardId) handleBoxHover(card.dataset.cardId, true);
    };
    cardsContainer.onmouseout = (e) => {
      const card = e.target.closest('[data-card-id]');
      if (card && card.dataset.cardId) handleBoxHover(card.dataset.cardId, false);
    };

    cardsContainer.onchange = (e) => {
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
      }
    };

    cardsContainer.oninput = (e) => {
      const target = e.target;
      if (target.dataset.field) {
        const field = target.dataset.field;
        let val = target.value;
        if (field === 'price') val = parseFloat(val) || 0;
        updateDraftField(target.dataset.id, field, val);
      }
    };

    cardsContainer.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.action === 'approve-single') {
        e.preventDefault();
        approveSingleDraft(btn.dataset.id);
        return;
      }
      if (btn.dataset.action === 'discard-single') {
        e.preventDefault();
        discardSingleDraft(btn.dataset.id);
        return;
      }
    };
  }
}

// =========================================================================
// Initialization Entry Point
// =========================================================================

let _reviewInitialized = false;
function bootstrapReview() {
  loadJobsData();

  // 1. First priority: Check immediate session cache 'current_shelf_job'
  let sessionJob = null;
  try {
    const raw = sessionStorage.getItem('current_shelf_job') || sessionStorage.getItem('dawwer_current_review_job');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.job_id)) {
        sessionJob = normalizeServerJob(parsed);
        const exIdx = allJobs.findIndex(j => String(j.id) === String(sessionJob.id));
        if (exIdx !== -1) allJobs[exIdx] = sessionJob;
        else allJobs.unshift(sessionJob);
      }
    }
  } catch (e) {}

  // Also check localStorage
  try {
    const curRaw = localStorage.getItem('dawwer_current_job');
    if (curRaw) {
      const cur = JSON.parse(curRaw);
      if (cur && (cur.id || cur.job_id) && !String(cur.id).includes('8942') && !String(cur.id).includes('9041') && !String(cur.id).includes('8910') && !String(cur.id).includes('1938')) {
        const norm = normalizeServerJob(cur);
        const exIdx = allJobs.findIndex(j => String(j.id) === String(norm.id));
        if (exIdx !== -1) allJobs[exIdx] = norm;
        else allJobs.unshift(norm);
      }
    }
  } catch (e) {}

  populateJobSelector();
  initReviewEvents();

  const urlParams = new URLSearchParams(window.location.search);
  const requestedJobId = urlParams.get('job_id') || urlParams.get('id');

  // Match requested job or fallback to session cache / most recent job
  const matchingCachedJob = requestedJobId
    ? allJobs.find(j => String(j.id) === String(requestedJobId))
    : (sessionJob || (allJobs.length > 0 ? allJobs[0] : null));

  const hasImmediateValidItems = matchingCachedJob && Array.isArray(matchingCachedJob.extractedItems) && matchingCachedJob.extractedItems.length > 0;

  if (hasImmediateValidItems) {
    // Immediate instant cache render: zero delay, no empty flash
    setActiveJob(matchingCachedJob.id, false);
    revealMainContent();
  }

  const targetFetchId = requestedJobId || (matchingCachedJob ? matchingCachedJob.id : null);
  if (targetFetchId) {
    fetchShelfJobAndDrafts(targetFetchId).then(remoteJob => {
      if (remoteJob) {
        setActiveJob(remoteJob.id, false);
        revealMainContent();
      } else if (!hasImmediateValidItems) {
        // If fetch returns null and cache had no items, reveal and show empty state
        draftItems = [];
        renderDraftCards();
        renderBoundingBoxes();
        updateSelectionSummary();
        revealMainContent();
      }
    }).catch(err => {
      console.warn('[review-drafts] Backend fetch shelf job note:', err);
      if (!hasImmediateValidItems) {
        draftItems = [];
        renderDraftCards();
        renderBoundingBoxes();
        updateSelectionSummary();
        revealMainContent();
      }
    });
  } else if (!hasImmediateValidItems) {
    draftItems = [];
    renderDraftCards();
    renderBoundingBoxes();
    updateSelectionSummary();
    revealMainContent();
  }

  fetchAllStoreJobs();
}

// Global exposure for event callbacks
if (typeof window !== 'undefined') {
  window.handleJobSwitch = handleJobSwitch;
  window.handleZoom = handleZoom;
  window.resetZoomAndPan = resetZoomAndPan;
  window.toggleBoundingBoxes = toggleBoundingBoxes;
  window.filterDrafts = filterDrafts;
  window.handleDraftSearch = handleDraftSearch;
  window.updateDraftField = updateDraftField;
  window.approveSingleDraft = approveSingleDraft;
  window.approveAllDrafts = approveAllDrafts;
  window.discardSingleDraft = discardSingleDraft;
  window.discardSelectedDrafts = discardSelectedDrafts;
  window.openAddManualDraftModal = openAddManualDraftModal;
  window.closeAddManualModal = closeAddManualModal;
  window.handleManualDraftSubmit = handleManualDraftSubmit;
  window.showToast = showToast;
  window.getStoreContext = getStoreContext;
  window.bootstrapReview = bootstrapReview;
}

// Immediate dynamic image binding check on script evaluation / DOM ready
(function bindImmediateShelfImage() {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  const stored = localStorage.getItem('dawwer_current_shelf_image');
  if (!stored) return;
  const setSrc = () => {
    const img = document.getElementById('shelf-source-img') || document.getElementById('shelf-image') || document.getElementById('canvas-image');
    if (img && (!img.src || img.src === window.location.href)) {
      img.src = stored;
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setSrc);
  } else {
    setSrc();
  }
})();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapReview);
  } else {
    bootstrapReview();
  }
}
