/**
 * Dawwer Merchant AI Shelf Capture - Split-Screen Review & Approval Engine
 * Two-Backend Architecture Integration:
 * - Direct REST integration to Render FastAPI Backend
 * - Resilient offline/cold-start fallback via localStorage & cached sessions
 */

// 1. Unified Safe Configuration & Context
var FASTAPI_BASE_URL = (window.CONFIG && window.CONFIG.FASTAPI_BASE_URL)
  ? window.CONFIG.FASTAPI_BASE_URL.replace(/\/+$/, '')
  : 'https://dawwer-backend-fastapi.onrender.com';

const getStoreContext = () => ({
  storeId: localStorage.getItem('activeStoreId') || localStorage.getItem('storeId') || '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  token: localStorage.getItem('storeToken') || localStorage.getItem('accessToken') || ''
});

const getJobIdFromUrl = () => {
  const urlParams = new URLSearchParams(typeof window !== 'undefined' && window.location ? window.location.search : '');
  return urlParams.get('jobId') || urlParams.get('job_id') || '';
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const JOBS_STORAGE_KEY = 'dawwer_ai_extraction_jobs';
const CURRENT_JOB_STORAGE_KEY = 'dawwer_current_job';
const CATALOG_STORAGE_KEY = 'dawwer_catalog_products';
const LEGACY_CATALOG_STORAGE_KEY = 'dawwer_merchant_catalog_products';
const DEFAULT_PLACEHOLDER_IMAGE = 'assets/placeholder-product.png';

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

function generateShelfPlaceholderSVG(zoneName, count) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520" fill="#0f172a">
    <rect width="800" height="520" fill="#1e293b"/>
    <line x1="30" y1="50" x2="770" y2="50" stroke="#334155" stroke-width="6"/>
    <line x1="30" y1="200" x2="770" y2="200" stroke="#334155" stroke-width="6"/>
    <line x1="30" y1="350" x2="770" y2="350" stroke="#334155" stroke-width="6"/>
    <line x1="30" y1="500" x2="770" y2="500" stroke="#334155" stroke-width="6"/>
    <circle cx="400" cy="240" r="48" fill="#153f2d" opacity="0.8"/>
    <path d="M380 230h40l8 12h12a6 6 0 016 6v32a6 6 0 01-6 6h-68a6 6 0 01-6-6v-32a6 6 0 016-6h8l8-12z" stroke="#d6a950" stroke-width="2.5" fill="none"/>
    <circle cx="400" cy="254" r="10" stroke="#d6a950" stroke-width="2.5" fill="none"/>
    <text x="400" y="325" fill="#f8fafc" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">
      معاينة الرف (${zoneName || 'الرف المحدد'})
    </text>
    <text x="400" y="348" fill="#94a3b8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="11" text-anchor="middle">
      ${count > 0 ? `تم استخراج ${count} صنفاً` : 'لا توجد صورة رف ملتقطة لهذه الجلسة'}
    </text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function normalizeDraftProduct(item, index, jobContext) {
  const name = item.product_name || item.proposed_name || item.name || item.label || `صنف #${index + 1}`;
  const price = item.price !== undefined ? Number(item.price) : (item.estimated_price !== undefined ? Number(item.estimated_price) : 0);
  const sku = item.barcode || item.barcode_detected || item.store_sku || item.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
  const category = item.category_hint || item.category || 'عام';
  const size = item.pack_size || item.size || '';
  const confidence = item.confidence_score !== undefined
    ? (item.confidence_score <= 1.0 ? Math.round(item.confidence_score * 100) : Math.round(item.confidence_score))
    : (item.confidence || 95);

  const defaultBox = {
    x: 8 + (index % 4) * 22,
    y: 15 + Math.floor(index / 4) * 30,
    w: 18,
    h: 24
  };
  const box = item.bounding_box || item.box || defaultBox;

  const itemZone = item.zone || jobContext?.shelfLocation?.zone || jobContext?.zone || 'A';
  const itemAisle = item.aisle || jobContext?.shelfLocation?.aisle || jobContext?.aisle || '1';
  const itemRack = item.rack || jobContext?.shelfLocation?.rack || jobContext?.rack || 'R1';
  const itemShelf = item.shelf_level || item.shelf || item.shelf_tier || jobContext?.shelfLocation?.level || jobContext?.shelf_level || '2';
  const itemShelfLocation = item.shelf_location || `${itemZone} - ${itemAisle} - ${itemShelf}`;
  const itemLabel = `${itemZone} > ممر ${itemAisle} > رف ${itemShelf}`;

  const rawStatus = String(item.status || '').toLowerCase();
  const isApproved = rawStatus === 'approved' || rawStatus === 'published' || rawStatus === 'معتمد';

  return {
    id: item.id || `DRF-${jobContext?.id || 'JOB'}-${index + 1}`,
    serverId: item.serverId || item.draft_id || item.id || null,
    name,
    brand: item.brand || '',
    size,
    sku,
    barcode: sku,
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
    shelf_location: itemShelfLocation,
    box,
    status: isApproved ? 'Approved' : 'Draft',
    hasDuplicateMatch: !!item.has_duplicate_match || !!item.hasDuplicateMatch,
    duplicateMatch: item.duplicate_match || item.duplicateMatch || null
  };
}

function normalizeServerJob(job) {
  if (!job) return null;
  const rawLocation = job.shelfLocation || job.shelf_location;
  let zone = job.zone;
  let aisle = job.aisle;
  let rack = job.rack;
  let level = job.shelf || job.shelf_tier || job.shelf_level;

  if (typeof rawLocation === 'object' && rawLocation !== null) {
    zone = zone || rawLocation.zone || 'A';
    aisle = aisle || rawLocation.aisle || '1';
    rack = rack || rawLocation.rack || 'R1';
    level = level || rawLocation.level || '2';
  } else if (typeof rawLocation === 'string' && rawLocation.includes('-')) {
    const parts = rawLocation.split('-').map(s => s.trim());
    zone = zone || parts[0] || 'A';
    aisle = aisle || parts[1] || '1';
    level = level || parts[2] || '2';
    rack = rack || 'R1';
  }

  zone = zone || 'A';
  aisle = aisle || '1';
  rack = rack || 'R1';
  level = level || '2';
  const label = `${zone} > ممر ${aisle} > رف ${level}`;

  let extracted = job.extracted_items || job.draft_products || job.extractedItems || job.items || job.products || [];
  if (!Array.isArray(extracted)) extracted = [];

  const storedLocalImage = (typeof localStorage !== 'undefined') ? localStorage.getItem('dawwer_current_shelf_image') : null;
  let rawImg = job.shelf_image_url || job.image_url || job.thumbnail || job.imageUrl || '';
  if (!rawImg || rawImg.includes('Gemini_Gene') || rawImg.includes('sample_shelf')) {
    rawImg = storedLocalImage || '';
  } else if (!rawImg.startsWith('http://') && !rawImg.startsWith('https://') && !rawImg.startsWith('data:') && !rawImg.startsWith('blob:') && !rawImg.startsWith('assets/')) {
    if (storedLocalImage) {
      rawImg = storedLocalImage;
    }
  }

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
    thumbnail: rawImg,
    imagesCount: job.imagesCount || 1,
    status: (job.status === 'REVIEW_REQUIRED' || job.status === 'Review Required') ? 'Review Required' :
            (job.status === 'COMPLETED' || job.status === 'Completed') ? 'Completed' :
            (job.status === 'PROCESSING' || job.status === 'Processing') ? 'Processing' :
            (job.status || 'Review Required'),
    detectedCount: job.extracted_drafts_count !== undefined ? job.extracted_drafts_count : (extracted.length || 0),
    confidence: job.confidence || 95,
    extractedItems: extracted
  };
}

function saveJobsData() {
  try {
    const rawExisting = localStorage.getItem(JOBS_STORAGE_KEY);
    let isMap = false;
    try {
      const parsed = JSON.parse(rawExisting);
      if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') isMap = true;
    } catch (e) {}

    if (isMap) {
      const map = {};
      allJobs.forEach(j => { map[j.id] = j; });
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(map));
    } else {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(allJobs));
    }

    if (activeJob) {
      localStorage.setItem(CURRENT_JOB_STORAGE_KEY, JSON.stringify(activeJob));
    }
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
    selector.innerHTML = '<option value="">لا توجد مسودات مستخرجة</option>';
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
  const countEl = document.getElementById('active-job-items-count');
  const badge = document.getElementById('active-job-status-badge');
  const imgEl = document.getElementById('shelf-source-img');

  if (idEl) idEl.textContent = '—';
  if (shelfEl) shelfEl.textContent = 'لا توجد عملية نشطة';
  if (confEl) confEl.textContent = '—';
  if (countEl) countEl.textContent = '0 صنف';
  if (badge) {
    badge.className = 'px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold';
    badge.textContent = 'لا توجد مسودات';
  }
  const localStoredImage = (typeof localStorage !== 'undefined') ? (localStorage.getItem('dawwer_current_shelf_image') || '') : '';
  if (imgEl) imgEl.src = localStoredImage || DEFAULT_PLACEHOLDER_IMAGE;
}

// =========================================================================
// 2. Load Job & Draft Products (Direct FastAPI on Render + Fallback)
// =========================================================================

async function fetchShelfJobAndDrafts(targetJobId) {
  const { storeId, token } = getStoreContext();
  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const jobUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs/${encodeURIComponent(targetJobId)}`;
    const jobRes = await fetch(jobUrl, { headers });

    if (jobRes.ok) {
      const jobData = await jobRes.json();
      const serverJob = jobData?.data || jobData;
      if (serverJob) {
        let extracted = serverJob.extracted_items || serverJob.draft_products || serverJob.items || [];

        // If job object has no drafts array, query the drafts endpoint directly
        if (!Array.isArray(extracted) || extracted.length === 0) {
          try {
            const draftsUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products?shelf_job_id=${encodeURIComponent(targetJobId)}&limit=100`;
            const draftsRes = await fetch(draftsUrl, { headers });
            if (draftsRes.ok) {
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

  return null;
}

async function fetchAllStoreJobs() {
  const { storeId, token } = getStoreContext();
  try {
    const url = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/shelf-jobs`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
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

  activeJob = (jobId ? allJobs.find(j => String(j.id) === String(jobId) || String(j.serverId) === String(jobId)) : null) || allJobs[0];
  if (!activeJob) {
    updateEmptyJobUI();
    renderBoundingBoxes();
    renderDraftCards();
    updateSelectionSummary();
    return;
  }

  const selector = document.getElementById('job-selector');
  if (selector) selector.value = activeJob.id;
  const idEl = document.getElementById('active-job-id');
  const shelfEl = document.getElementById('active-job-shelf');
  const confEl = document.getElementById('active-job-confidence');
  const countEl = document.getElementById('active-job-items-count');
  const badge = document.getElementById('active-job-status-badge');

  if (idEl) idEl.textContent = activeJob.id;
  if (shelfEl) shelfEl.textContent = activeJob.shelfLocation?.label || activeJob.shelfLocation || 'الرف المحدد';
  if (confEl) confEl.textContent = (activeJob.confidence ? activeJob.confidence + '%' : '95%');
  if (countEl) countEl.textContent = `${activeJob.extractedItems?.length || 0} صنف`;

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

  // Shelf source image - Split-screen viewer
  const imgEl = document.getElementById('shelf-source-img');
  if (imgEl) {
    const localStoredImage = (typeof localStorage !== 'undefined') ? (localStorage.getItem('dawwer_current_shelf_image') || '') : '';

    imgEl.onerror = function() {
      this.onerror = null;
      this.src = localStoredImage || DEFAULT_PLACEHOLDER_IMAGE;
    };

    const rawSrc = activeJob.thumbnail || activeJob.shelf_image_url || activeJob.image_url || activeJob.imageUrl || '';

    // NEVER request non-existent images or Gemini_Gene paths that return 404
    if (rawSrc && !rawSrc.includes('Gemini_Gene') && !rawSrc.includes('sample_shelf')) {
      if (rawSrc.startsWith('data:') || rawSrc.startsWith('blob:') || rawSrc.startsWith('assets/')) {
        imgEl.src = rawSrc;
      } else if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
        imgEl.src = rawSrc;
      } else if (localStoredImage) {
        imgEl.src = localStoredImage;
      } else {
        imgEl.src = DEFAULT_PLACEHOLDER_IMAGE;
      }
    } else if (localStoredImage) {
      imgEl.src = localStoredImage;
    } else {
      imgEl.src = DEFAULT_PLACEHOLDER_IMAGE;
    }
  }

  renderBoundingBoxes();
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
  if (field === 'barcode' || field === 'sku') {
    item.barcode = value;
    item.sku = value;
  }
  if (field === 'aisle') {
    item.aisle = value;
    if (item.shelfLocation) item.shelfLocation.aisle = value;
  }
  if (field === 'shelf_level') {
    item.shelf_level = value;
    if (item.shelfLocation) item.shelfLocation.level = value;
  }

  const zoneStr = item.shelfLocation?.zone || (activeJob && activeJob.shelfLocation?.zone) || 'A';
  const aisleStr = item.aisle || item.shelfLocation?.aisle || (activeJob && activeJob.shelfLocation?.aisle) || '1';
  const levelStr = item.shelf_level || item.shelfLocation?.level || (activeJob && activeJob.shelfLocation?.level) || '2';
  item.shelf_location = `${zoneStr} - ${aisleStr} - ${levelStr}`;
  if (item.shelfLocation) {
    item.shelfLocation.label = `${zoneStr} > ممر ${aisleStr} > رف ${levelStr}`;
  }

  // Sync to activeJob and save to local storage
  if (activeJob && activeJob.extractedItems) {
    const parentItem = activeJob.extractedItems.find(x => (x.id === itemId || x.sku === item.sku));
    if (parentItem) {
      parentItem[field] = value;
      if (field === 'barcode' || field === 'sku') {
        parentItem.barcode = value;
        parentItem.sku = value;
      }
      if (field === 'aisle') {
        parentItem.aisle = value;
        if (parentItem.shelfLocation) parentItem.shelfLocation.aisle = value;
      }
      if (field === 'shelf_level') {
        parentItem.shelf_level = value;
        if (parentItem.shelfLocation) parentItem.shelfLocation.level = value;
      }
      parentItem.shelf_location = item.shelf_location;
    }
    saveJobsData();
  }

  // Update shelf location badge in the card dynamically if present
  const card = document.getElementById(`card-${itemId}`);
  if (card) {
    const locBadge = card.querySelector('[data-loc-display]');
    if (locBadge) locBadge.textContent = item.shelf_location;
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
// 4. Approve Single / Bulk Draft Products
// =========================================================================

async function approveSingleDraft(itemId) {
  const item = draftItems.find(d => d.id === itemId);
  if (!item || item.status === 'Approved') return;

  const { storeId, token } = getStoreContext();
  const draftId = item.serverId || item.id;
  const defaultShelfLoc = activeJob && activeJob.shelfLocation
    ? `${activeJob.shelfLocation.zone || 'A'} - ${activeJob.shelfLocation.aisle || '1'} - ${activeJob.shelfLocation.level || '2'}`
    : 'A - 1 - 2';
  const itemShelfLoc = item.shelf_location || defaultShelfLoc;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // 1. Send POST request to add directly to store catalog
  try {
    const payload = {
      name: item.name,
      price: Number(item.price),
      barcode: item.barcode || item.sku || null,
      category: item.category || "عام",
      shelf_location: itemShelfLoc,
      stock_quantity: 10
    };

    await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('[review-drafts] Backend single product create note:', err);
  }

  // 2. Draft approval endpoint
  if (draftId && !String(draftId).startsWith('DRF-') && !String(draftId).startsWith('ITEM-') && !String(draftId).startsWith('MOCK-')) {
    try {
      const approveUrl = `${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}/approve`;
      await fetch(approveUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (err) {}
  }

  // 3. Mark Approved locally and commit to catalog cache
  item.status = 'Approved';
  if (activeJob && activeJob.extractedItems) {
    const parentItem = activeJob.extractedItems.find(x => (x.id === itemId || x.sku === item.sku));
    if (parentItem) parentItem.status = 'Approved';
    saveJobsData();
  }

  try {
    const catalogEntry = {
      id: item.id || `prod-ai-${Date.now()}`,
      name: item.name,
      price: Number(item.price),
      barcode: item.barcode || item.sku || null,
      sku: item.barcode || item.sku || `SKU-${Date.now().toString().slice(-6)}`,
      category: item.category || "عام",
      shelf_location: itemShelfLoc,
      stock_quantity: 10,
      quantity: 10,
      isAvailable: true,
      status: 'Published',
      location: {
        zone: (activeJob && activeJob.shelfLocation?.zone) || 'A',
        aisle: item.aisle || (activeJob && activeJob.shelfLocation?.aisle) || '1',
        rack: (activeJob && activeJob.shelfLocation?.rack) || '1',
        shelf: item.shelf_level || (activeJob && activeJob.shelfLocation?.level) || '2'
      },
      updatedAt: new Date().toISOString()
    };

    const stored = localStorage.getItem('dawwer_catalog_products');
    const catalog = stored ? JSON.parse(stored) : [];
    catalog.unshift(catalogEntry);
    localStorage.setItem('dawwer_catalog_products', JSON.stringify(catalog));

    const legacyStored = localStorage.getItem(CATALOG_STORAGE_KEY);
    const legacyCatalog = legacyStored ? JSON.parse(legacyStored) : [];
    legacyCatalog.unshift(catalogEntry);
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(legacyCatalog));
  } catch (e) {}

  renderBoundingBoxes();
  renderDraftCards();
  updateSelectionSummary();
  showToast('تم اعتماد الصنف بنجاح', `تمت إضافة "${item.name}" إلى كتالوج المتجر بنجاح`, 'success');
}

async function approveAllDrafts() {
  const pendingItems = draftItems.filter(d => d.status !== 'Approved');
  const targetItems = pendingItems.length > 0 ? pendingItems : draftItems;
  if (targetItems.length === 0) {
    showToast('لا توجد أصناف للاعتماد', 'العملية الحالية لا تحتوي على مسودات أصناف.', 'info');
    return;
  }

  const btnApproveAll = document.getElementById('btn-approve-all-drafts') || document.getElementById('btn-publish-catalog');
  const originalBtnHTML = btnApproveAll ? btnApproveAll.innerHTML : '';
  if (btnApproveAll) {
    btnApproveAll.disabled = true;
    btnApproveAll.innerHTML = `
      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span>جاري الاعتماد والإضافة إلى الكتالوج...</span>
    `;
  }

  const { storeId, token } = getStoreContext();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const defaultShelfLoc = activeJob && activeJob.shelfLocation
    ? `${activeJob.shelfLocation.zone || 'A'} - ${activeJob.shelfLocation.aisle || '1'} - ${activeJob.shelfLocation.level || '2'}`
    : 'A - 1 - 2';

  // 1. For each approved draft item, send POST request to add directly to store catalog
  for (const item of targetItems) {
    const itemShelfLoc = item.shelf_location || defaultShelfLoc;
    const payload = {
      name: item.name,
      price: Number(item.price),
      barcode: item.barcode || item.sku || null,
      category: item.category || "عام",
      shelf_location: itemShelfLoc,
      stock_quantity: 10
    };

    try {
      await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[review-drafts] Product create note:', e);
    }

    const draftId = item.serverId || item.id;
    if (draftId && !String(draftId).startsWith('DRF-') && !String(draftId).startsWith('ITEM-') && !String(draftId).startsWith('MOCK-')) {
      try {
        await fetch(`${FASTAPI_BASE_URL}/api/v1/stores/${encodeURIComponent(storeId)}/draft-products/${encodeURIComponent(draftId)}/approve`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
      } catch (e) {}
    }
  }

  // 2. Also push these newly approved items into localStorage.dawwer_catalog_products as an immediate local cache update
  try {
    const stored = localStorage.getItem('dawwer_catalog_products');
    const catalog = stored ? JSON.parse(stored) : [];
    const legacyStored = localStorage.getItem(CATALOG_STORAGE_KEY);
    const legacyCatalog = legacyStored ? JSON.parse(legacyStored) : [];

    targetItems.forEach((item, idx) => {
      const itemShelfLoc = item.shelf_location || defaultShelfLoc;
      const entry = {
        id: item.id || `prod-ai-${Date.now()}-${idx}`,
        name: item.name,
        price: Number(item.price),
        barcode: item.barcode || item.sku || null,
        sku: item.barcode || item.sku || `SKU-${Date.now().toString().slice(-6)}`,
        category: item.category || "عام",
        shelf_location: itemShelfLoc,
        stock_quantity: 10,
        quantity: 10,
        isAvailable: true,
        status: 'Published',
        location: {
          zone: (activeJob && activeJob.shelfLocation?.zone) || 'A',
          aisle: item.aisle || (activeJob && activeJob.shelfLocation?.aisle) || '1',
          rack: (activeJob && activeJob.shelfLocation?.rack) || '1',
          shelf: item.shelf_level || (activeJob && activeJob.shelfLocation?.level) || '2'
        },
        updatedAt: new Date().toISOString()
      };
      catalog.unshift(entry);
      legacyCatalog.unshift(entry);
    });

    localStorage.setItem('dawwer_catalog_products', JSON.stringify(catalog));
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(legacyCatalog));
  } catch (e) {}

  // 3. Mark the shelf job as completed in localStorage
  targetItems.forEach(item => { item.status = 'Approved'; });
  if (activeJob) {
    activeJob.status = 'Completed';
    if (activeJob.extractedItems) {
      activeJob.extractedItems.forEach(xi => { xi.status = 'Approved'; });
    }
    saveJobsData();

    try {
      let allExtractionJobs = JSON.parse(localStorage.getItem(JOBS_STORAGE_KEY) || '[]');
      if (Array.isArray(allExtractionJobs)) {
        const idx = allExtractionJobs.findIndex(j => String(j.id) === String(activeJob.id));
        if (idx !== -1) {
          allExtractionJobs[idx].status = 'Completed';
          localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(allExtractionJobs));
        }
      }
    } catch (e) {}
  }

  renderBoundingBoxes();
  renderDraftCards();
  updateSelectionSummary();

  // 4. Trigger success toast
  showToast('تم بنجاح!', 'تم اعتماد جميع الأصناف وإضافتها إلى كتالوج المتجر بنجاح!', 'success');

  // 5. Redirect directly to catalog.html after 1.5 seconds
  setTimeout(() => {
    window.location.href = 'catalog.html';
  }, 1500);
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

function renderBoundingBoxes() {
  const layer = document.getElementById('image-boxes-layer');
  if (!layer) return;

  layer.innerHTML = draftItems.map((item, index) => {
    const box = item.box || { x: 10, y: 10, w: 20, h: 20 };
    const isDuplicate = item.hasDuplicateMatch;
    const isApproved = item.status === 'Approved';

    return `
      <div 
        class="bounding-box ${isDuplicate ? 'duplicate-box' : ''} ${isApproved ? 'approved-box' : ''}" 
        id="bbox-${item.id}"
        style="left: ${box.x}%; top: ${box.y}%; width: ${box.w}%; height: ${box.h}%;"
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
  const container = document.getElementById('draft-cards-container') || document.getElementById('drafts-list');
  if (!container) return;

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
        <div class="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <div class="w-16 h-16 rounded-2xl bg-[#edf5f0] text-[#153f2d] flex items-center justify-center mx-auto mb-4 border border-[#153f2d]/20">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <h4 class="text-base font-bold text-slate-800 mb-1.5">لا توجد مسودات مستخرجة لهذه الجلسة، يرجى التقاط صورة رف أولاً من صفحة استخراج المنتجات</h4>
          <p class="text-xs text-slate-500 max-w-md mx-auto mb-6">لم يتم العثور على مسودات أصناف للعملية الحالية. التقط صورة واضحة للرف من صفحة التحليل ليتم استخراج الأصناف وتحديد مواقعها تلقائياً.</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="ai-capture.html" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#153f2d] text-white text-xs font-bold hover:bg-[#0f2d20] shadow-sm transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>الذهاب إلى صفحة استخراج المنتجات</span>
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
          <div class="sm:col-span-6">
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
          <div class="sm:col-span-3">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">السعر (ر.س) <span class="text-red-500">*</span></label>
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

          <!-- Barcode Input -->
          <div class="sm:col-span-3">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">الباركود</label>
            <input 
              type="text" 
              value="${item.barcode || item.sku || ''}" 
              data-field="barcode" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-700 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-mono font-bold outline-none"
            >
          </div>

          <!-- Aisle Input -->
          <div class="sm:col-span-4">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">الممر (Aisle)</label>
            <input 
              type="text" 
              value="${item.aisle || item.shelfLocation?.aisle || (activeJob && activeJob.shelfLocation?.aisle) || '1'}" 
              data-field="aisle" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-bold outline-none"
            >
          </div>

          <!-- Shelf Level Input -->
          <div class="sm:col-span-4">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">مستوى الرف (Shelf Level)</label>
            <input 
              type="text" 
              value="${item.shelf_level || item.shelfLocation?.level || (activeJob && activeJob.shelfLocation?.level) || '2'}" 
              data-field="shelf_level" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-bold outline-none"
            >
          </div>

          <!-- Category Dropdown -->
          <div class="sm:col-span-4">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">التصنيف</label>
            <select 
              data-field="category" data-id="${item.id}"
              ${isApproved ? 'disabled' : ''}
              class="w-full p-2 rounded-xl border border-slate-200 ${isApproved ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 text-slate-800 focus:bg-white focus:border-[#153f2d] focus:ring-1 focus:ring-[#153f2d]'} text-xs font-bold outline-none"
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

          <!-- Shelf Location Info -->
          <div class="sm:col-span-12 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-[#153f2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span class="text-[11px] text-slate-500 font-medium">الموقع الهندسي للرف:</span>
              <span class="text-xs font-bold text-[#153f2d]" data-loc-display="true">${item.shelf_location || item.shelfLocation?.label || activeJob?.shelfLocation?.label || 'الرف الرئيسي'}</span>
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

  const fallbackShelfLoc = {
    zone: 'المنطقة أ',
    aisle: '01',
    rack: 'R1',
    level: '1',
    label: 'المنطقة أ > ممر 01 > رف 1'
  };
  const activeShelfLoc = activeJob?.shelfLocation || fallbackShelfLoc;
  const zoneStr = activeShelfLoc.zone || 'المنطقة أ';
  const aisleStr = activeShelfLoc.aisle || '01';
  const levelStr = activeShelfLoc.level || '1';

  const newDraft = {
    id: `DRF-MAN-${Date.now()}`,
    name,
    brand: name.split(' ')[0] || 'عام',
    size,
    sku,
    barcode: sku,
    price,
    originalPrice: price,
    confidence: 100,
    category,
    shelfLocation: { ...activeShelfLoc },
    shelf_location: `${zoneStr} - ${aisleStr} - ${levelStr}`,
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

  if (toastTitle) toastTitle.textContent = title;
  if (toastMsg) toastMsg.textContent = message;

  if (toastIcon) {
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

function showLoadingJobUI(jobId) {
  const idEl = document.getElementById('active-job-id');
  const shelfEl = document.getElementById('active-job-shelf');
  const confEl = document.getElementById('active-job-confidence');
  const countEl = document.getElementById('active-job-items-count');
  const badge = document.getElementById('active-job-status-badge');
  const container = document.getElementById('draft-cards-container');

  if (idEl) idEl.textContent = jobId || '...';
  if (shelfEl) shelfEl.textContent = 'جاري جلب بيانات الرف من الخادم...';
  if (confEl) confEl.textContent = '...';
  if (countEl) countEl.textContent = '...';
  if (badge) {
    badge.className = 'px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold';
    badge.textContent = 'جاري التحميل...';
  }
  if (container) {
    container.innerHTML = `
      <div class="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div class="inline-block animate-spin w-8 h-8 border-4 border-[#153f2d] border-t-transparent rounded-full mb-3"></div>
        <h4 class="text-sm font-bold text-slate-700">جاري تحميل مسودات العملية #${escapeHtml(jobId)}...</h4>
      </div>
    `;
  }
}

let _reviewInitialized = false;
async function bootstrapReview() {
  if (_reviewInitialized) return;
  _reviewInitialized = true;

  initCatalogStorage();
  initReviewEvents();

  // 1. Context & Job ID Detection
  const urlParams = new URLSearchParams(typeof window !== 'undefined' && window.location ? window.location.search : '');
  const currentJobId = urlParams.get('jobId') || urlParams.get('job_id') || '';
  const { storeId, token } = getStoreContext();

  // 2. Load Real Extraction Data (Priority Order):
  // Step A: Priority 1 - First look into localStorage.getItem('dawwer_ai_extraction_jobs') or localStorage.getItem('dawwer_current_job')
  let allStoredJobs = [];
  try {
    const rawJobs = localStorage.getItem(JOBS_STORAGE_KEY);
    if (rawJobs) {
      const parsed = JSON.parse(rawJobs);
      if (Array.isArray(parsed)) {
        allStoredJobs = parsed;
      } else if (parsed && typeof parsed === 'object') {
        allStoredJobs = Object.values(parsed);
      }
    }
  } catch (e) {}

  let currentJobStorage = null;
  try {
    const rawCurrent = localStorage.getItem(CURRENT_JOB_STORAGE_KEY);
    if (rawCurrent) {
      currentJobStorage = JSON.parse(rawCurrent);
    }
  } catch (e) {}

  if (currentJobStorage && !allStoredJobs.some(j => String(j.id) === String(currentJobStorage.id))) {
    allStoredJobs.unshift(currentJobStorage);
  }

  allJobs = allStoredJobs.map(normalizeServerJob).filter(Boolean);

  let matchedJob = null;
  if (currentJobId) {
    matchedJob = allJobs.find(j => String(j.id) === String(currentJobId) || String(j.serverId) === String(currentJobId));
  } else if (currentJobStorage) {
    matchedJob = allJobs.find(j => String(j.id) === String(currentJobStorage.id)) || normalizeServerJob(currentJobStorage);
  } else if (allJobs.length > 0) {
    matchedJob = allJobs[0];
  }

  // Step B: If not in localStorage and currentJobId is present, fetch it from backend
  if (!matchedJob && currentJobId) {
    showLoadingJobUI(currentJobId);
    matchedJob = await fetchShelfJobAndDrafts(currentJobId);
  }

  // Step C: PURGE ALL HARDCODED DATA (NO FALLBACK DUMMY PRODUCTS)
  if (matchedJob) {
    populateJobSelector();
    setActiveJob(matchedJob.id, false);
  } else {
    // If no data exists or no job was selected, display clean empty state
    activeJob = null;
    draftItems = [];
    selectedDraftIds.clear();
    populateJobSelector();
    updateEmptyJobUI();
    renderBoundingBoxes();
    renderDraftCards();
    updateSelectionSummary();
  }

  // Fetch remaining store jobs in background
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

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapReview);
  } else {
    bootstrapReview();
  }
}
