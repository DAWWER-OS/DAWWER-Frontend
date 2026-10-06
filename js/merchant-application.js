let currentStore = null;
let uploadedDocs = [];

/**
 * Checks whether a string is a valid GUID.
 */
function isValidGuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Retrieves the merchant user Bearer token dynamically from localStorage.
 */
function getMerchantToken() {
  if (typeof ApiClient !== 'undefined' && typeof ApiClient.getMerchantToken === 'function') {
    const t = ApiClient.getMerchantToken();
    if (t) return t;
  }
  return localStorage.getItem('accessToken') ||
         localStorage.getItem('token') ||
         localStorage.getItem('access_token') ||
         localStorage.getItem('dawwer_access_token') ||
         null;
}

/**
 * Checks whether a JWT bearer token is missing or expired.
 */
function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  if (typeof ApiClient !== 'undefined' && typeof ApiClient.isTokenExpired === 'function') {
    return ApiClient.isTokenExpired(token);
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return (Date.now() / 1000) >= (payload.exp - 10);
  } catch (e) {
    return false;
  }
}

/**
 * Ensures the merchant user has a valid, non-expired accessToken session.
 */
function ensureValidMerchantSession() {
  const token = getMerchantToken();
  if (!token || isTokenExpired(token)) {
    const warningMsg = "يرجى تسجيل الدخول بحساب تاجر مفعل للمتابعة.";
    showAlert(`
      <div class="flex items-center justify-between">
        <span>${warningMsg}</span>
        <a href="login.html" class="underline font-bold text-amber-900 hover:text-black mr-2">تسجيل الدخول الآن</a>
      </div>
    `, 'warning');

    if (window.showToast) {
      window.showToast({
        title: 'تنبيه تسجيل الدخول',
        message: warningMsg,
        type: 'warning'
      });
    }
    return false;
  }
  return true;
}

/**
 * Displays an alert banner on top of the merchant application form.
 */
function showAlert(messageHtml, type = 'info') {
  const alertBox = document.getElementById("alert-banner");
  if (!alertBox) return;

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  alertBox.className = `mb-6 p-4 rounded-2xl text-sm font-bold border ${styles[type] || styles.info} block`;
  alertBox.innerHTML = messageHtml;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Dynamically resolves the current store application ID from inputs, memory, or local storage.
 */
function getApplicationId() {
  const inputEl = document.getElementById("app-id");
  const inputVal = inputEl?.value?.trim();
  if (inputVal && isValidGuid(inputVal)) return inputVal;
  if (currentStore?.id && isValidGuid(currentStore.id)) return currentStore.id;
  const stored = localStorage.getItem('dawwer_merchant_app_id');
  if (stored && isValidGuid(stored)) return stored;
  return null;
}

/**
 * Sets and synchronizes the active store application ID across inputs, memory, and local storage.
 */
function setApplicationId(id) {
  if (!id) return;
  const cleanId = String(id).trim();
  const inputEl = document.getElementById("app-id");
  if (inputEl) inputEl.value = cleanId;

  if (!currentStore) currentStore = {};
  currentStore.id = cleanId;

  localStorage.setItem('dawwer_merchant_app_id', cleanId);
  updateSubmitButtonState();
}

/**
 * Retrieves the current list of verified uploaded documents.
 */
function getUploadedDocuments() {
  if (Array.isArray(uploadedDocs) && uploadedDocs.length > 0) {
    return uploadedDocs;
  }
  if (currentStore && Array.isArray(currentStore.documents) && currentStore.documents.length > 0) {
    return currentStore.documents;
  }
  return [];
}

/**
 * Checks whether the application is already submitted (2) or under review (3).
 */
function isApplicationSubmittedOrUnderReview(store = currentStore) {
  if (!store) return false;
  const rawStatus = store.verificationStatus ?? store.VerificationStatus ?? store.status ?? store.Status ?? store.statusName;
  if (rawStatus === 2 || rawStatus === 3 || rawStatus === '2' || rawStatus === '3') {
    return true;
  }
  if (typeof rawStatus === 'string') {
    const lower = rawStatus.trim().toLowerCase();
    if (lower === 'submitted' || lower === 'underreview' || lower === 'under_review' || lower === 'under review') {
      return true;
    }
  }
  return false;
}

/**
 * Displays the success status banner: "تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة"
 */
function showSubmittedBanner() {
  showAlert(`
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <div>
        <div class="font-bold text-sm text-emerald-900">تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة</div>
        <div class="text-xs text-emerald-700 font-normal mt-0.5">طلب اعتماد المتجر قيد التدقيق لدى مسؤولي المنصة، وسيتم إشعارك فور تغيير حالة الطلب.</div>
      </div>
    </div>
  `, 'success');
}

/**
 * Checks if an error or response indicates that the store application is already submitted.
 */
function isAlreadySubmittedError(errOrRes, errMsg = '') {
  const status = errOrRes?.status || errOrRes?.response?.status || (String(errOrRes?.message || '').includes('400') ? 400 : 0);
  const text = (String(errMsg) + ' ' + String(errOrRes?.message || '') + ' ' + JSON.stringify(errOrRes?.response || '')).toLowerCase();

  // If status is 400 (Bad Request)
  if (status === 400) {
    // Specifically exclude missing document errors
    const isDocError = text.includes('document') || text.includes('وثيقة') || text.includes('مستند');
    if (isDocError) return false;

    // Check for explicit already submitted / review indicators
    const hasSubmittedKeywords = 
      text.includes('already submitted') ||
      text.includes('already') ||
      text.includes('submitted') ||
      text.includes('under review') ||
      text.includes('underreview') ||
      text.includes('مرسل') ||
      text.includes('قيد المراجعة') ||
      text.includes('تم التقديم') ||
      text.includes('invalid status') ||
      text.includes('cannot submit') ||
      text.includes('state') ||
      text.includes('status');

    if (hasSubmittedKeywords) return true;
  }

  // Also check if current application status is already 2 or 3
  if (isApplicationSubmittedOrUnderReview(currentStore)) {
    return true;
  }

  return false;
}

/**
 * Updates the view to reflect the pending review state, suppressing failure toasts.
 */
function handleAlreadySubmittedState() {
  if (currentStore) {
    currentStore.verificationStatus = 2; // Submitted
    currentStore.status = 'Submitted';
  } else {
    currentStore = { verificationStatus: 2, status: 'Submitted' };
  }

  // 1. Display success status banner: "تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة"
  showSubmittedBanner();

  // 2. Render status card
  renderStatusCard(currentStore);

  // 3. Hide or disable "إرسال الطلب للاعتماد الرسمي" and "حفظ كمسودة" buttons
  updateSubmitButtonState();
}

/**
 * Sets form fields and document actions to read-only during review.
 */
function lockFormForReview(isLocked) {
  const fieldIds = [
    "store-name", "store-desc", "store-cr", "store-tax",
    "store-phone", "store-email", "store-city", "store-address"
  ];
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = isLocked;
      if (isLocked) {
        el.classList.add('bg-slate-50', 'text-slate-600', 'cursor-not-allowed');
      } else {
        el.classList.remove('bg-slate-50', 'text-slate-600', 'cursor-not-allowed');
      }
    }
  });

  const uploadBtn = document.getElementById("upload-doc-btn");
  const docFile = document.getElementById("doc-file");
  const docType = document.getElementById("doc-type");
  if (uploadBtn) uploadBtn.disabled = isLocked;
  if (docFile) docFile.disabled = isLocked;
  if (docType) docType.disabled = isLocked;

  document.querySelectorAll('[data-action="delete-doc"]').forEach(b => {
    if (isLocked) {
      b.classList.add('hidden');
    } else {
      b.classList.remove('hidden');
    }
  });
}

/**
 * Synchronizes the submit application button state with application ID and document availability.
 * Only enables the button when at least one verification document is present.
 * Hides or disables buttons when application has a status of Submitted (2) or UnderReview (3).
 */
function updateSubmitButtonState() {
  const appId = getApplicationId();
  const docs = getUploadedDocuments();
  const hasDocuments = docs && docs.length > 0;
  const submitBtn = document.getElementById("submit-app-btn");
  const saveDraftBtn = document.getElementById("save-draft-btn");
  const submittedNotice = document.getElementById("submitted-status-notice");

  // Check if store application has a status of "Submitted" (2) or "UnderReview" (3)
  const isSubmittedOrReview = isApplicationSubmittedOrUnderReview(currentStore);

  if (isSubmittedOrReview) {
    // Hide or disable the "إرسال الطلب للاعتماد الرسمي" and "حفظ كمسودة" buttons
    if (saveDraftBtn) {
      saveDraftBtn.disabled = true;
      saveDraftBtn.setAttribute('data-disabled', 'true');
      saveDraftBtn.classList.add('hidden');
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('data-disabled', 'true');
      submitBtn.classList.add('hidden');
    }
    if (submittedNotice) {
      submittedNotice.classList.remove('hidden');
    }

    lockFormForReview(true);
    return;
  }

  // Not submitted or under review (Draft = 1 or NeedsInformation = 4)
  if (saveDraftBtn) {
    saveDraftBtn.disabled = false;
    saveDraftBtn.removeAttribute('data-disabled');
    saveDraftBtn.classList.remove('hidden');
  }
  if (submittedNotice) {
    submittedNotice.classList.add('hidden');
  }
  lockFormForReview(false);

  if (!submitBtn) return;
  submitBtn.classList.remove('hidden');

  if (appId && hasDocuments) {
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.removeAttribute('disabled');
    submitBtn.removeAttribute('data-disabled');
    submitBtn.title = "إرسال الطلب للاعتماد الرسمي من إدارة دوّر";
  } else if (!appId) {
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.setAttribute('data-disabled', 'true');
    submitBtn.title = "يرجى حفظ البيانات أولاً كمسودة بالضغط على 'حفظ كمسودة'";
  } else {
    // Has appId, but no documents uploaded yet
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.setAttribute('data-disabled', 'true');
    submitBtn.title = "يرجى رفع وثيقة رسمية واحدة على الأقل (السجل التجاري، رخصة المحل، أو البطاقة الضريبية) قبل إرسال الطلب للاعتماد";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth(["Merchant", 2, "Admin", 4]);
  }

  const createDraftBtn = document.getElementById('create-draft-btn');
  if (createDraftBtn) {
    createDraftBtn.addEventListener('click', createNewDraft);
  }

  const storeForm = document.getElementById('store-app-form');
  if (storeForm) {
    storeForm.addEventListener('submit', handleSaveStore);
  }

  const uploadBtn = document.getElementById('upload-doc-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadDocument);
  }

  const submitAppBtn = document.getElementById('submit-app-btn');
  if (submitAppBtn) {
    submitAppBtn.addEventListener('click', submitApplication);
  }

  const docsList = document.getElementById('docs-list');
  if (docsList) {
    docsList.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete-doc"]');
      if (delBtn) {
        const docId = delBtn.getAttribute('data-id');
        if (docId) deleteDoc(docId);
      }
    });
  }

  loadApplications();
});

async function loadApplications() {
  const token = getMerchantToken();
  if (!token || isTokenExpired(token)) {
    showAlert(`
      <div class="flex items-center justify-between">
        <span>يرجى تسجيل الدخول بحساب تاجر مفعل للمتابعة.</span>
        <a href="login.html" class="underline font-bold text-amber-900 hover:text-black mr-2">تسجيل الدخول الآن</a>
      </div>
    `, 'warning');
    updateSubmitButtonState();
    return;
  }

  try {
    let storesData;
    let res;
    if (window.ApiClient && ApiClient.core) {
      storesData = await ApiClient.core("/merchant/stores", { method: 'GET' });
    } else {
      res = await ApiClient.get("/merchant/stores");
      storesData = res?.data || res;
    }

    if (storesData) {
      const stores = Array.isArray(storesData) ? storesData : [storesData];
      if (stores.length > 0) {
        currentStore = stores[0];
        populateForm(currentStore);
        renderStatusCard(currentStore);
        if (currentStore.id) {
          setApplicationId(currentStore.id);
          if (isValidGuid(currentStore.id)) {
            localStorage.setItem('activeStoreId', currentStore.id);
            localStorage.setItem('storeId', currentStore.id);
            localStorage.setItem('store_id', currentStore.id);
          }

          // Safe store context switching if approved (StoreVerificationStatus.Approved = 5)
          const isApproved = currentStore.verificationStatus === 5 ||
                             currentStore.verificationStatus === 'Approved' ||
                             currentStore.status === 5 ||
                             currentStore.status === 'Approved';
          if (isApproved && isValidGuid(currentStore.id)) {
            try {
              if (typeof ApiClient !== 'undefined' && ApiClient.auth && ApiClient.auth.selectStore) {
                await ApiClient.auth.selectStore(currentStore.id);
              }
            } catch (selErr) {
              console.warn('[MerchantApp] Safe store context select note:', selErr);
            }
          }

          // If currentStore.documents is not provided by list endpoint, fetch detailed entity
          if (!currentStore.documents || currentStore.documents.length === 0) {
            try {
              let detailRes;
              if (window.ApiClient && ApiClient.core) {
                detailRes = await ApiClient.core(`/merchant/stores/${currentStore.id}`, { method: 'GET' });
              } else {
                const raw = await ApiClient.get(`/merchant/stores/${currentStore.id}`);
                detailRes = raw?.data || raw;
              }
              if (detailRes && Array.isArray(detailRes.documents)) {
                currentStore.documents = detailRes.documents;
                uploadedDocs = detailRes.documents;
                renderDocsTable();
              }
            } catch (dErr) {
              console.warn("Could not fetch application document details:", dErr);
            }
          }
        }

        if (isApplicationSubmittedOrUnderReview(currentStore)) {
          showSubmittedBanner();
        }
      }
    } else if (res && res.status === 401) {
      showAlert(`
        <div class="flex items-center justify-between">
          <span>انتهت صلاحية الجلسة. يرجى تسجيل الدخول بحساب تاجر مفعل للمتابعة.</span>
          <a href="login.html" class="underline font-bold text-red-900 hover:text-black mr-2">تسجيل الدخول الآن</a>
        </div>
      `, 'error');
    }
  } catch (err) {
    console.warn("Could not load applications:", err);
    if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
      showAlert(`
        <div class="flex items-center justify-between">
          <span>انتهت صلاحية الجلسة. يرجى تسجيل الدخول بحساب تاجر مفعل للمتابعة.</span>
          <a href="login.html" class="underline font-bold text-red-900 hover:text-black mr-2">تسجيل الدخول الآن</a>
        </div>
      `, 'error');
    }
  } finally {
    updateSubmitButtonState();
  }
}

function populateForm(s) {
  if (!s) return;
  const appId = document.getElementById("app-id");
  const storeName = document.getElementById("store-name");
  const storeDesc = document.getElementById("store-desc");
  const storeCr = document.getElementById("store-cr");
  const storeTax = document.getElementById("store-tax");
  const storePhone = document.getElementById("store-phone");
  const storeEmail = document.getElementById("store-email");
  const storeCity = document.getElementById("store-city");
  const storeAddress = document.getElementById("store-address");

  if (s.id) {
    setApplicationId(s.id);
  }
  if (storeName && s.name) storeName.value = s.name;
  if (storeDesc && s.description !== undefined) storeDesc.value = s.description;
  if (storeCr && s.commercialRegistrationNumber) storeCr.value = s.commercialRegistrationNumber;
  if (storeTax && s.taxNumber) storeTax.value = s.taxNumber;
  if (storePhone && s.phoneNumber) storePhone.value = s.phoneNumber;
  if (storeEmail && s.email) storeEmail.value = s.email;
  if (storeCity && s.city) storeCity.value = s.city;
  if (storeAddress && s.address) storeAddress.value = s.address;

  if (s.documents && Array.isArray(s.documents)) {
    uploadedDocs = s.documents;
    renderDocsTable();
  }
  updateSubmitButtonState();
}

function renderStatusCard(s) {
  const card = document.getElementById("status-card");
  const badge = document.getElementById("status-badge");
  const title = document.getElementById("store-title");
  const desc = document.getElementById("status-desc");
  if (!card || !badge || !title || !desc) return;

  card.classList.remove("hidden");
  title.innerText = s.name || "طلب اعتماد المتجر";

  const statusMap = {
    1: { text: "مسودة (Draft)", bg: "bg-slate-100 text-slate-700", border: "border-slate-200", desc: "طلبك محفوظ كمسودة. يمكنك تعديل البيانات وإرفاق المستندات ثم الضغط على إرسال الطلب للاعتماد." },
    2: { text: "تم التقديم (Submitted)", bg: "bg-blue-100 text-blue-800", border: "border-blue-200", desc: "تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة." },
    3: { text: "قيد المراجعة والتدقيق", bg: "bg-amber-100 text-amber-800", border: "border-amber-200", desc: "تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة." },
    4: { text: "مطلوب معلومات إضافية", bg: "bg-orange-100 text-orange-800", border: "border-orange-200", desc: s.adminNotes || "يرجى تعديل بعض البيانات أو إعادة رفع مستندات واضحة حسب ملاحظات الإدارة." },
    5: { text: "معتمد ونشط ✓", bg: "bg-emerald-100 text-emerald-800", border: "border-emerald-200", desc: "تهانينا! تم اعتماد متجرك بنجاح وأصبح جاهزاً لإضافة المنتجات واستقبال الطلبات." },
    6: { text: "تم رفض الطلب", bg: "bg-rose-100 text-rose-800", border: "border-rose-200", desc: s.rejectionReason || "نعتذر، لم يستوفِ الطلب شروط التسجيل المعتمدة." }
  };

  const info = statusMap[s.verificationStatus || 1] || statusMap[1];
  badge.className = `px-3.5 py-1 rounded-full text-xs font-bold ${info.bg}`;
  badge.innerText = info.text;
  card.className = `mb-8 p-6 rounded-3xl border ${info.border} bg-white shadow-sm`;
  desc.innerText = info.desc;

  if (isApplicationSubmittedOrUnderReview(s)) {
    showSubmittedBanner();
  }
}

/**
 * Handles saving the store application as a draft.
 * Dispatches POST /api/merchant/stores (or PUT if updating existing draft).
 * On 200/201 success, extracts data.id and updates application state so submit is enabled.
 */
async function handleSaveStore(event) {
  if (event && event.preventDefault) event.preventDefault();

  if (!ensureValidMerchantSession()) return;

  // Prevent saving if already submitted or under review
  if (isApplicationSubmittedOrUnderReview(currentStore)) {
    showSubmittedBanner();
    updateSubmitButtonState();
    return;
  }

  const alertBox = document.getElementById("alert-banner");
  const btn = document.getElementById("save-draft-btn");

  if (alertBox) alertBox.classList.add("hidden");
  if (btn) {
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;
  }

  const payload = {
    name: document.getElementById("store-name")?.value.trim() || '',
    description: document.getElementById("store-desc")?.value.trim() || '',
    commercialRegistrationNumber: document.getElementById("store-cr")?.value.trim() || '',
    taxNumber: document.getElementById("store-tax")?.value.trim() || '',
    phoneNumber: document.getElementById("store-phone")?.value.trim() || '',
    email: document.getElementById("store-email")?.value.trim() || '',
    address: document.getElementById("store-address")?.value.trim() || '',
    city: document.getElementById("store-city")?.value.trim() || '',
    latitude: 24.7136,
    longitude: 46.6753
  };

  const existingAppId = getApplicationId();

  try {
    let resData;
    if (existingAppId) {
      if (window.ApiClient && ApiClient.core) {
        resData = await ApiClient.core(`/merchant/stores/${existingAppId}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        const raw = await ApiClient.put(`/merchant/stores/${existingAppId}`, payload);
        resData = raw?.data || raw;
      }
    } else {
      if (window.ApiClient && ApiClient.core) {
        resData = await ApiClient.core("/merchant/stores", {
          method: 'POST',
          body: payload
        });
      } else {
        const raw = await ApiClient.post("/merchant/stores", payload);
        resData = raw?.data || raw;
      }
    }

    // Extract application ID from backend response
    const returnedId = resData?.id || resData?.applicationId || resData?.storeId || existingAppId;
    if (returnedId) {
      setApplicationId(returnedId);
      if (isValidGuid(returnedId)) {
        localStorage.setItem('activeStoreId', returnedId);
        localStorage.setItem('storeId', returnedId);
        localStorage.setItem('store_id', returnedId);
      }
    }

    if (resData && typeof resData === 'object') {
      currentStore = { ...currentStore, ...resData };
      if (returnedId) currentStore.id = returnedId;
    } else if (returnedId) {
      currentStore = { ...(currentStore || {}), ...payload, id: returnedId };
    }

    renderStatusCard(currentStore || { name: payload.name, verificationStatus: 1 });

    const msg = res?.message || "تم حفظ بيانات المتجر كمسودة بنجاح! يمكنك الآن إرفاق المستندات أو إرسال الطلب للاعتماد الرسمي.";
    showAlert(msg, 'success');

    if (window.showToast) {
      window.showToast({
        title: 'تم الحفظ بنجاح',
        message: msg,
        type: 'success'
      });
    }

    // Refresh application list from server to ensure synchronization
    await loadApplications();
  } catch (err) {
    console.error("Save store draft failed:", err);
    let errMsg = err?.message || 'حدث خطأ أثناء حفظ المتجر.';
    if (err?.response?.errors && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
      errMsg = err.response.errors.join(' | ');
    }
    showAlert(errMsg, 'error');
    if (window.showToast) {
      window.showToast({
        title: 'خطأ أثناء الحفظ',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "حفظ كمسودة";
      btn.disabled = false;
    }
    updateSubmitButtonState();
  }
}

/**
 * Handles submitting the store application for official review.
 * Strictly requires:
 * 1. Valid application ID from backend draft.
 * 2. At least one uploaded verification document (CR, Tax Card, Store License, etc.)
 */
async function submitApplication() {
  if (!ensureValidMerchantSession()) return;

  const appId = getApplicationId();
  if (!appId) {
    const warningMsg = 'يرجى حفظ بيانات المتجر أولاً بالضغط على "حفظ كمسودة" لاستخراج معرّف الطلب قبل الإرسال للاعتماد.';
    showAlert(warningMsg, 'warning');
    if (window.showToast) {
      window.showToast({
        title: 'حفظ المسودة مطلوب أولاً',
        message: warningMsg,
        type: 'warning'
      });
    }

    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (saveDraftBtn) {
      saveDraftBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      saveDraftBtn.classList.add('ring-2', 'ring-emerald-600', 'ring-offset-2');
      setTimeout(() => {
        saveDraftBtn.classList.remove('ring-2', 'ring-emerald-600', 'ring-offset-2');
      }, 2500);
    }
    return;
  }

  // Guard: Inspect the uploaded documents array before triggering POST /api/merchant/stores/{applicationId}/submit
  const docs = getUploadedDocuments();
  if (!docs || docs.length === 0) {
    const docWarningMsg = "يرجى رفع وثيقة رسمية واحدة على الأقل (السجل التجاري، رخصة المحل، أو البطاقة الضريبية) قبل إرسال الطلب للاعتماد";
    showAlert(docWarningMsg, 'warning');
    if (window.showToast) {
      window.showToast({
        title: 'مستندات الاعتماد مطلوبة',
        message: docWarningMsg,
        type: 'warning'
      });
    }

    const docsSection = document.getElementById('docs-section') || document.getElementById('doc-file');
    if (docsSection) {
      docsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      docsSection.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
      setTimeout(() => {
        docsSection.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
      }, 3000);
    }
    return;
  }

  const confirmFn = (typeof window !== 'undefined' && window.confirm) ? window.confirm : (typeof confirm !== 'undefined' ? confirm : null);
  if (confirmFn && !confirmFn("هل أنت متأكد من إرسال الطلب للاعتماد الرسمي؟ لن تتمكن من تعديل البيانات أثناء فترة المراجعة.")) {
    return;
  }

  // Prevent triggering POST /api/merchant/stores/{id}/submit once already submitted
  if (isApplicationSubmittedOrUnderReview(currentStore)) {
    showSubmittedBanner();
    updateSubmitButtonState();
    return;
  }

  const submitBtn = document.getElementById("submit-app-btn");
  if (submitBtn) {
    submitBtn.innerText = "جاري إرسال الطلب...";
    submitBtn.disabled = true;
  }

  try {
    let res;
    if (window.ApiClient && ApiClient.core) {
      res = await ApiClient.core(`/merchant/stores/${appId}/submit`, { method: 'POST' });
    } else {
      res = await ApiClient.post(`/merchant/stores/${appId}/submit`, {});
      if (!res || res.success === false) {
        const errMsg = (Array.isArray(res?.errors) && res.errors.length > 0)
          ? res.errors.join(' | ')
          : (res?.message || res?.error || 'حدث خطأ أثناء إرسال الطلب للاعتماد.');

        // Catch 400 Bad Request error if status is already submitted
        if (isAlreadySubmittedError(res, errMsg)) {
          handleAlreadySubmittedState();
          return;
        }
        throw new Error(errMsg);
      }
    }

    // Success state
    if (currentStore) {
      currentStore.verificationStatus = 2; // Submitted
      currentStore.status = 'Submitted';
    } else {
      currentStore = { verificationStatus: 2, status: 'Submitted' };
    }

    showSubmittedBanner();
    lockFormForReview(true);
    const submittedNotice = document.getElementById("submitted-status-notice");
    if (submittedNotice) {
      submittedNotice.classList.remove('hidden');
    }

    if (window.showToast) {
      window.showToast({
        title: 'تم إرسال الطلب بنجاح',
        message: 'تم استلام طلبك وهو قيد المراجعة حالياً من قبل الإدارة',
        type: 'success'
      });
    }

    renderStatusCard(currentStore);
    updateSubmitButtonState();
    await loadApplications();
  } catch (err) {
    console.error("Submit application failed:", err);
    let errMsg = err?.message || 'حدث خطأ أثناء إرسال الطلب.';
    if (err?.response?.errors && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
      errMsg = err.response.errors.join(' | ');
    } else if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      errMsg = err.errors.join(' | ');
    }

    // Error Message Suppression:
    // Catch the 400 Bad Request error if the status is already submitted,
    // and update the view to reflect the pending review state instead of showing a failure toast.
    if (isAlreadySubmittedError(err, errMsg)) {
      handleAlreadySubmittedState();
      return;
    }

    showAlert(errMsg, 'error');
    if (window.showToast) {
      window.showToast({
        title: 'فشل إرسال الطلب',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    if (submitBtn && !isApplicationSubmittedOrUnderReview(currentStore)) {
      submitBtn.innerText = "إرسال الطلب للاعتماد الرسمي ➔";
      submitBtn.disabled = false;
    }
    updateSubmitButtonState();
  }
}

/**
 * Handles uploading a verification document via multipart/form-data.
 * Fields: 'file' (binary) and 'documentType' (integer).
 * Upon successful upload (200/201), refreshes document state and table.
 */
async function uploadDocument() {
  if (!ensureValidMerchantSession()) return;

  const appId = getApplicationId();
  if (!appId) {
    const msg = 'يرجى حفظ بيانات المتجر أولاً بالضغط على "حفظ كمسودة" قبل رفع المستندات.';
    showAlert(msg, 'warning');
    if (window.showToast) {
      window.showToast({
        title: 'تنبيه',
        message: msg,
        type: 'warning'
      });
    }
    return;
  }

  const fileInput = document.getElementById("doc-file");
  const docTypeVal = document.getElementById("doc-type")?.value || '1';
  const parsedDocType = parseInt(docTypeVal, 10) || 1;
  const btn = document.getElementById("upload-doc-btn");

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (window.showToast) {
      window.showToast({
        title: 'تنبيه',
        message: 'يرجى اختيار ملف لرفعه.',
        type: 'warning'
      });
    }
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 10 * 1024 * 1024) {
    if (window.showToast) {
      window.showToast({
        title: 'الملف كبير جداً',
        message: 'حجم الملف يتجاوز الحد المسموح به (10MB).',
        type: 'warning'
      });
    }
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", parsedDocType);

  if (btn) {
    btn.innerText = "جاري الرفع...";
    btn.disabled = true;
  }

  try {
    let docData;
    let successMsg = 'تم رفع المستند بنجاح!';
    if (window.ApiClient && ApiClient.core) {
      docData = await ApiClient.core(`/merchant/stores/${appId}/documents`, {
        method: 'POST',
        body: formData
      });
    } else {
      const res = await ApiClient.upload(`/merchant/stores/${appId}/documents`, formData);
      if (!res || res.success === false) {
        const errMsg = (Array.isArray(res?.errors) && res.errors.length > 0)
          ? res.errors.join(' | ')
          : (res?.message || res?.error || 'فشل رفع المستند.');
        throw new Error(errMsg);
      }
      docData = res.data;
      if (res.message) successMsg = res.message;
    }

    // Refresh uploaded documents list state from response acknowledgement
    if (Array.isArray(docData)) {
      uploadedDocs = docData;
    } else if (docData && typeof docData === 'object' && (docData.id || docData.fileName || docData.documentType)) {
      const newDoc = {
        id: docData.id || `doc-${Date.now()}`,
        fileName: docData.fileName || file.name,
        fileSize: docData.fileSize || file.size,
        documentType: docData.documentType || parsedDocType,
        fileUrl: docData.fileUrl || '',
        createdAt: docData.createdAt || new Date().toISOString()
      };
      const existingIdx = uploadedDocs.findIndex(d => d.id === newDoc.id);
      if (existingIdx >= 0) {
        uploadedDocs[existingIdx] = newDoc;
      } else {
        uploadedDocs.push(newDoc);
      }
    } else {
      uploadedDocs.push({
        id: `doc-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        documentType: parsedDocType,
        createdAt: new Date().toISOString()
      });
    }

    if (currentStore) {
      currentStore.documents = uploadedDocs;
    }

    // Attempt to sync detailed state from backend
    try {
      let detailRes;
      if (window.ApiClient && ApiClient.core) {
        detailRes = await ApiClient.core(`/merchant/stores/${appId}`, { method: 'GET' });
      } else {
        const raw = await ApiClient.get(`/merchant/stores/${appId}`);
        detailRes = raw?.data || raw;
      }
      if (detailRes && Array.isArray(detailRes.documents)) {
        uploadedDocs = detailRes.documents;
        if (currentStore) currentStore.documents = detailRes.documents;
      }
    } catch (syncErr) {
      console.warn("Could not sync documents from store details:", syncErr);
    }

    // Update UI table and submit button state
    renderDocsTable();
    updateSubmitButtonState();

    showAlert(successMsg, 'success');
    if (window.showToast) {
      window.showToast({
        title: 'تم الرفع بنجاح',
        message: successMsg,
        type: 'success'
      });
    }

    fileInput.value = "";
  } catch (err) {
    console.error("Upload document failed:", err);
    let errMsg = err?.message || 'فشل رفع المستند.';
    if (err?.response?.errors && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
      errMsg = err.response.errors.join(' | ');
    }
    showAlert(errMsg, 'error');
    if (window.showToast) {
      window.showToast({
        title: 'فشل الرفع',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "+ رفع المستند";
      btn.disabled = false;
    }
    updateSubmitButtonState();
  }
}

/**
 * Handles deleting an uploaded document.
 */
async function deleteDoc(docId) {
  if (!ensureValidMerchantSession()) return;

  const appId = getApplicationId();
  if (!appId) return;

  const confirmFn = (typeof window !== 'undefined' && window.confirm) ? window.confirm : (typeof confirm !== 'undefined' ? confirm : null);
  if (confirmFn && !confirmFn("هل تريد حذف هذا المستند؟")) return;

  try {
    const res = await ApiClient.delete(`/merchant/stores/${appId}/documents/${docId}`);
    if (!res || res.success === false) {
      const errMsg = (Array.isArray(res?.errors) && res.errors.length > 0)
        ? res.errors.join(' | ')
        : (res?.message || res?.error || 'حدث خطأ أثناء حذف المستند.');
      throw new Error(errMsg);
    }

    uploadedDocs = uploadedDocs.filter(d => d.id !== docId);
    if (currentStore && Array.isArray(currentStore.documents)) {
      currentStore.documents = currentStore.documents.filter(d => d.id !== docId);
    }

    renderDocsTable();
    updateSubmitButtonState();

    if (window.showToast) {
      window.showToast({
        title: 'تم الحذف',
        message: 'تم حذف المستند بنجاح.',
        type: 'info'
      });
    }
  } catch (err) {
    console.error("Delete document failed:", err);
    let errMsg = err?.message || 'حدث خطأ أثناء حذف المستند.';
    if (err?.response?.errors && Array.isArray(err.response.errors) && err.response.errors.length > 0) {
      errMsg = err.response.errors.join(' | ');
    }
    showAlert(errMsg, 'error');
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    updateSubmitButtonState();
  }
}

/**
 * Renders the uploaded documents table.
 */
function renderDocsTable() {
  const tbody = document.getElementById("docs-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  const docs = getUploadedDocuments();

  if (!docs || docs.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' class='p-4 text-center text-slate-400'>لم يتم رفع أي مستندات بعد (مطلوب مستند واحد على الأقل للاعتماد)</td></tr>";
    return;
  }

  const typeNames = {
    1: "السجل التجاري (Commercial Register)",
    2: "البطاقة الضريبية (Tax Card)",
    3: "رخصة المتجر (Store License)",
    4: "إثبات الهوية (Identity Document)",
    5: "أخرى (Other Document)"
  };

  docs.forEach(d => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 border-b border-slate-100 last:border-0";
    const typeLabel = typeNames[Number(d.documentType)] || "مستند رسمي";
    const fileName = d.fileName || "document.pdf";
    const fileSize = d.fileSize ? (d.fileSize / 1024).toFixed(1) + " KB" : "-";

    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-800 flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>${typeLabel}</span>
      </td>
      <td class="p-3 text-slate-600 font-mono">${fileName}</td>
      <td class="p-3 text-slate-500">${fileSize}</td>
      <td class="p-3">
        ${isApplicationSubmittedOrUnderReview(currentStore)
          ? '<span class="text-slate-400 font-bold">تم الرفع ✓</span>'
          : `<button type="button" data-action="delete-doc" data-id="${d.id}" class="text-rose-600 hover:text-rose-800 font-bold cursor-pointer transition">حذف</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Resets the draft state and prepares form for a brand new application.
 */
function createNewDraft() {
  const appId = document.getElementById("app-id");
  const form = document.getElementById("store-app-form");
  const card = document.getElementById("status-card");
  const alertBox = document.getElementById("alert-banner");

  if (appId) appId.value = "";
  currentStore = null;
  localStorage.removeItem('dawwer_merchant_app_id');

  if (form) form.reset();
  if (card) card.classList.add("hidden");
  if (alertBox) alertBox.classList.add("hidden");

  uploadedDocs = [];
  renderDocsTable();
  updateSubmitButtonState();

  if (window.showToast) {
    window.showToast({
      title: 'طلب جديد',
      message: 'تم تفريغ الحقول لبدء مسودة طلب جديد.',
      type: 'info'
    });
  }
}

if (typeof window !== 'undefined') {
  window.createNewDraft = createNewDraft;
  window.submitApplication = submitApplication;
  window.uploadDocument = uploadDocument;
  window.deleteDoc = deleteDoc;
  window.handleSaveStore = handleSaveStore;
  window.getApplicationId = getApplicationId;
  window.setApplicationId = setApplicationId;
  window.loadApplications = loadApplications;
  window.getUploadedDocuments = getUploadedDocuments;
  window.renderDocsTable = renderDocsTable;
  window.updateSubmitButtonState = updateSubmitButtonState;
  window.isApplicationSubmittedOrUnderReview = isApplicationSubmittedOrUnderReview;
  window.isAlreadySubmittedError = isAlreadySubmittedError;
  window.handleAlreadySubmittedState = handleAlreadySubmittedState;
  window.showSubmittedBanner = showSubmittedBanner;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createNewDraft,
    submitApplication,
    uploadDocument,
    deleteDoc,
    handleSaveStore,
    getApplicationId,
    setApplicationId,
    loadApplications,
    ensureValidMerchantSession,
    isValidGuid,
    getUploadedDocuments,
    renderDocsTable,
    updateSubmitButtonState,
    isApplicationSubmittedOrUnderReview,
    isAlreadySubmittedError,
    handleAlreadySubmittedState,
    showSubmittedBanner,
    get uploadedDocs() { return uploadedDocs; },
    set uploadedDocs(val) { uploadedDocs = val; },
    get currentStore() { return currentStore; },
    set currentStore(val) { currentStore = val; }
  };
}
