let currentStore = null;
let uploadedDocs = [];

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
  try {
    const res = await ApiClient.get("/merchant/stores");
    if (res && res.success && res.data && res.data.length > 0) {
      currentStore = res.data[0];
      populateForm(currentStore);
      renderStatusCard(currentStore);
    }
  } catch (err) {
    console.warn("Could not load applications:", err);
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

  if (appId) appId.value = s.id || "";
  if (storeName) storeName.value = s.name || "";
  if (storeDesc) storeDesc.value = s.description || "";
  if (storeCr) storeCr.value = s.commercialRegistrationNumber || "";
  if (storeTax) storeTax.value = s.taxNumber || "";
  if (storePhone) storePhone.value = s.phoneNumber || "";
  if (storeEmail) storeEmail.value = s.email || "";
  if (storeCity) storeCity.value = s.city || "";
  if (storeAddress) storeAddress.value = s.address || "";

  if (s.documents && Array.isArray(s.documents)) {
    uploadedDocs = s.documents;
    renderDocsTable();
  }
}

function renderStatusCard(s) {
  const card = document.getElementById("status-card");
  const badge = document.getElementById("status-badge");
  const title = document.getElementById("store-title");
  const desc = document.getElementById("status-desc");
  if (!card || !badge || !title || !desc) return;

  card.classList.remove("hidden");
  title.innerText = s.name;

  const statusMap = {
    1: { text: "مسودة (Draft)", bg: "bg-slate-100 text-slate-700", border: "border-slate-200", desc: "طلبك محفوظ كمسودة. يمكنك تعديل البيانات وإرفاق المستندات ثم الضغط على إرسال الطلب." },
    2: { text: "تم التقديم (Submitted)", bg: "bg-blue-100 text-blue-800", border: "border-blue-200", desc: "تم إرسال الطلب بنجاح وهو بانتظار بدء مراجعة فريق الإدارة." },
    3: { text: "قيد المراجعة والتدقيق", bg: "bg-amber-100 text-amber-800", border: "border-amber-200", desc: "يقوم فريق إدارة دوّر حالياً بمراجعة بيانات المتجر والوثائق المرفقة." },
    4: { text: "مطلوب معلومات إضافية", bg: "bg-orange-100 text-orange-800", border: "border-orange-200", desc: s.adminNotes || "يرجى تعديل بعض البيانات أو إعادة رفع مستندات واضحة حسب ملاحظات الإدارة." },
    5: { text: "معتمد ونشط ✓", bg: "bg-emerald-100 text-emerald-800", border: "border-emerald-200", desc: "تهانينا! تم اعتماد متجرك بنجاح وأصبح جاهزاً لإضافة المنتجات واستقبال الطلبات." },
    6: { text: "تم رفض الطلب", bg: "bg-rose-100 text-rose-800", border: "border-rose-200", desc: s.rejectionReason || "نعتذر، لم يستوفِ الطلب شروط التسجيل المعتمدة." }
  };

  const info = statusMap[s.verificationStatus || 1] || statusMap[1];
  badge.className = `px-3.5 py-1 rounded-full text-xs font-bold ${info.bg}`;
  badge.innerText = info.text;
  card.className = `mb-8 p-6 rounded-3xl border ${info.border} bg-white shadow-sm`;
  desc.innerText = info.desc;
}

async function handleSaveStore(event) {
  event.preventDefault();
  const appId = document.getElementById("app-id")?.value;
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
    city: document.getElementById("store-city")?.value.trim() || '',
    address: document.getElementById("store-address")?.value.trim() || ''
  };

  try {
    let res;
    if (appId) {
      res = await ApiClient.put(`/merchant/stores/${appId}`, payload);
    } else {
      res = await ApiClient.post("/merchant/stores", payload);
      if (res && res.data && res.data.id) {
        const idInput = document.getElementById("app-id");
        if (idInput) idInput.value = res.data.id;
      }
    }

    const msg = res?.message || "تم حفظ بيانات المتجر بنجاح!";
    if (alertBox) {
      alertBox.innerHTML = msg;
      alertBox.className = "mb-6 p-4 rounded-2xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block";
    }
    if (window.showToast) {
      window.showToast({
        title: 'تم الحفظ',
        message: msg,
        type: 'success'
      });
    }
    loadApplications();
  } catch (err) {
    const errMsg = err.message || 'حدث خطأ أثناء حفظ المتجر.';
    if (alertBox) {
      alertBox.innerHTML = errMsg;
      alertBox.className = "mb-6 p-4 rounded-2xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block";
    }
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: errMsg,
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "حفظ كمسودة";
      btn.disabled = false;
    }
  }
}

async function uploadDocument() {
  const appId = document.getElementById("app-id")?.value;
  if (!appId) {
    if (window.showToast) {
      window.showToast({
        title: 'تنبيه',
        message: 'يرجى حفظ بيانات المتجر أولاً قبل رفع المستندات.',
        type: 'warning'
      });
    }
    return;
  }

  const fileInput = document.getElementById("doc-file");
  const docType = document.getElementById("doc-type")?.value || '1';
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
  formData.append("documentType", docType);

  if (btn) {
    btn.innerText = "جاري الرفع...";
    btn.disabled = true;
  }

  try {
    await ApiClient.upload(`/merchant/stores/${appId}/documents`, formData);
    if (window.showToast) {
      window.showToast({
        title: 'تم الرفع',
        message: 'تم رفع المستند بنجاح!',
        type: 'success'
      });
    }
    fileInput.value = "";
    loadApplications();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'فشل الرفع',
        message: err.message || 'فشل رفع المستند.',
        type: 'error'
      });
    }
  } finally {
    if (btn) {
      btn.innerText = "+ رفع المستند";
      btn.disabled = false;
    }
  }
}

async function deleteDoc(docId) {
  const appId = document.getElementById("app-id")?.value;
  if (!confirm("هل تريد حذف هذا المستند؟")) return;

  try {
    await ApiClient.delete(`/merchant/stores/${appId}/documents/${docId}`);
    if (window.showToast) {
      window.showToast({
        title: 'تم الحذف',
        message: 'تم حذف المستند بنجاح.',
        type: 'info'
      });
    }
    loadApplications();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'خطأ',
        message: err.message || 'حدث خطأ أثناء حذف المستند.',
        type: 'error'
      });
    }
  }
}

function renderDocsTable() {
  const tbody = document.getElementById("docs-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (uploadedDocs.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' class='p-4 text-center text-slate-400'>لم يتم رفع أي مستندات بعد</td></tr>";
    return;
  }

  const typeNames = { 1: "السجل التجاري", 2: "البطاقة الضريبية", 3: "رخصة المتجر", 4: "إثبات الهوية", 5: "أخرى" };

  uploadedDocs.forEach(d => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-800">${typeNames[d.documentType] || "مستند"}</td>
      <td class="p-3 text-slate-600 font-mono">${d.fileName || "document.pdf"}</td>
      <td class="p-3 text-slate-500">${d.fileSize ? (d.fileSize / 1024).toFixed(1) + " KB" : "-"}</td>
      <td class="p-3">
        <button type="button" data-action="delete-doc" data-id="${d.id}" class="text-red-600 hover:text-red-800 font-bold cursor-pointer">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function submitApplication() {
  const appId = document.getElementById("app-id")?.value;
  if (!appId) {
    if (window.showToast) {
      window.showToast({
        title: 'تنبيه',
        message: 'يرجى حفظ بيانات المتجر أولاً قبل الإرسال.',
        type: 'warning'
      });
    }
    return;
  }

  if (!confirm("هل أنت متأكد من إرسال الطلب للاعتماد الرسمي؟ لن تتمكن من تعديل البيانات أثناء فترة المراجعة.")) {
    return;
  }

  try {
    const res = await ApiClient.post(`/merchant/stores/${appId}/submit`, {});
    const msg = res?.message || "تم إرسال الطلب للاعتماد بنجاح!";
    if (window.showToast) {
      window.showToast({
        title: 'تم الإرسال',
        message: msg,
        type: 'success'
      });
    }
    loadApplications();
  } catch (err) {
    if (window.showToast) {
      window.showToast({
        title: 'فشل الإرسال',
        message: err.message || 'حدث خطأ أثناء إرسال الطلب.',
        type: 'error'
      });
    }
  }
}

function createNewDraft() {
  const appId = document.getElementById("app-id");
  const form = document.getElementById("store-app-form");
  const card = document.getElementById("status-card");
  if (appId) appId.value = "";
  if (form) form.reset();
  if (card) card.classList.add("hidden");
  uploadedDocs = [];
  renderDocsTable();
  if (window.showToast) {
    window.showToast({
      title: 'طلب جديد',
      message: 'تم تفريغ الحقول لبدء مسودة طلب جديد.',
      type: 'info'
    });
  }
}

window.createNewDraft = createNewDraft;
window.submitApplication = submitApplication;
window.uploadDocument = uploadDocument;
window.deleteDoc = deleteDoc;
