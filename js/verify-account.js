let currentEmail = '';
let currentPreviewCode = '';
let resendTimer = null;
let resendCountdown = 0;

function getEnteredCode() {
  const inputs = document.querySelectorAll('.code-input-digit, .code-digit');
  if (inputs && inputs.length === 6) {
    return Array.from(inputs).map(input => input.value.trim()).join('');
  }
  const singleInput = document.getElementById('code-input');
  if (singleInput) {
    return singleInput.value.trim().replace(/\D/g, '');
  }
  return '';
}

function setCodeInputs(codeStr) {
  if (!codeStr) return;
  const clean = String(codeStr).trim().replace(/\D/g, '');
  const inputs = document.querySelectorAll('.code-input-digit, .code-digit');
  if (inputs && inputs.length === 6) {
    clean.split('').forEach((digit, idx) => {
      if (inputs[idx]) inputs[idx].value = digit;
    });
  }
  const singleInput = document.getElementById('code-input');
  if (singleInput) {
    singleInput.value = clean;
  }
}

function autoFillCode() {
  if (currentPreviewCode) {
    setCodeInputs(currentPreviewCode);
    const input = document.getElementById('code-input');
    if (input) input.focus();
  }
}

function startResendCooldown(seconds = 60) {
  const resendBtn = document.getElementById('resend-btn');
  if (!resendBtn) return;

  resendCountdown = seconds;
  resendBtn.disabled = true;
  resendBtn.classList.add('opacity-50', 'cursor-not-allowed');

  if (resendTimer) clearInterval(resendTimer);

  resendBtn.innerText = `إعادة الإرسال بعد (${resendCountdown} ث)`;

  resendTimer = setInterval(() => {
    resendCountdown--;
    if (resendCountdown <= 0) {
      clearInterval(resendTimer);
      resendTimer = null;
      resendBtn.disabled = false;
      resendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      resendBtn.innerText = 'إعادة إرسال رمز جديد';
    } else {
      resendBtn.innerText = `إعادة الإرسال بعد (${resendCountdown} ث)`;
    }
  }, 1000);
}

async function handleVerifyCode(event) {
  if (event) event.preventDefault();

  const alertBox = document.getElementById('alert-message');
  const btn = document.getElementById('submit-btn');
  const enteredCode = getEnteredCode();

  if (!currentEmail) {
    const errorMsg = 'لم يتم العثور على بريد إلكتروني للتفعيل.';
    if (alertBox) {
      alertBox.innerText = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'خطأ في التحقق', message: errorMsg, type: 'error' });
    }
    return;
  }

  if (enteredCode.length !== 6 || !/^\d{6}$/.test(enteredCode)) {
    const errorMsg = 'يجب إدخال رمز التحقق كاملاً المكون من 6 أرقام';
    if (alertBox) {
      alertBox.innerText = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'رمز غير مكتمل', message: errorMsg, type: 'warning' });
    }
    return;
  }

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري التحقق من الرمز...';
    btn.disabled = true;
  }

  try {
    const payload = {
      email: currentEmail.trim(),
      code: enteredCode.trim(),
      codeType: 1
    };

    const res = await ApiClient.post('/Auth/verify-code', payload);
    sessionStorage.removeItem('dawwer_registered_email');

    if (res.data && (res.data.accessToken || res.data.token)) {
      Auth.saveSession(res.data);
      const successMsg = res.message || 'تم تفعيل الحساب بنجاح! جاري تحويلك للوحة التحكم...';
      if (alertBox) {
        alertBox.innerHTML = successMsg;
        alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
      }
      if (typeof showToast === 'function') {
        showToast({ title: 'تم تفعيل الحساب', message: successMsg, type: 'success' });
      }

      setTimeout(() => {
        if (res.data.role === 'Admin' || res.data.role === 4) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1200);
    } else {
      const successMsg = res.message || 'تم تأكيد حسابك بنجاح! جاري تحويلك لتسجيل الدخول...';
      if (alertBox) {
        alertBox.innerHTML = successMsg;
        alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
      }
      if (typeof showToast === 'function') {
        showToast({ title: 'تم التأكيد بنجاح', message: successMsg, type: 'success' });
      }

      setTimeout(() => {
        window.location.href = 'login.html?verified=true';
      }, 1400);
    }
  } catch (err) {
    const errorMsg = err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.';
    if (alertBox) {
      alertBox.innerHTML = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تعذر التحقق', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'تأكيد وتفعيل الحساب';
      btn.disabled = false;
    }
  }
}

async function handleResendCode() {
  const resendBtn = document.getElementById('resend-btn');
  const alertBox = document.getElementById('alert-message');

  if (resendCountdown > 0) return;

  if (!currentEmail) {
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: 'لم يتم العثور على بريد إلكتروني لإعادة الإرسال.', type: 'warning' });
    }
    return;
  }

  if (resendBtn) {
    resendBtn.innerText = 'جاري الإرسال...';
    resendBtn.disabled = true;
  }

  try {
    let res = null;
    try {
      res = await ApiClient.post('/Auth/resend-code', { email: currentEmail.trim(), codeType: 1 });
    } catch (e) {
      res = await ApiClient.post('/Auth/resend-verification-code', { email: currentEmail.trim(), codeType: 1 });
    }

    const preview = res?.data?.verificationCodePreview || res?.verificationCodePreview || res?.data?.previewCode || res?.data?.code || res?.code || '';

    if (preview) {
      currentPreviewCode = String(preview).trim().replace(/\D/g, '');
      const previewText = document.getElementById('preview-code-text');
      if (previewText) previewText.innerText = currentPreviewCode;

      const badgeContainer = document.getElementById('preview-badge-container');
      if (badgeContainer) badgeContainer.classList.remove('hidden');

      setCodeInputs(currentPreviewCode);
    }

    const successMsg = 'تم إعادة إرسال رمز التحقق بنجاح';
    if (alertBox) {
      alertBox.innerHTML = successMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم إعادة الإرسال', message: successMsg, type: 'success' });
    }

    startResendCooldown(60);
  } catch (err) {
    const errorMsg = err.message || 'فشل إعادة إرسال رمز التحقق.';
    if (alertBox) {
      alertBox.innerHTML = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'فشل الإرسال', message: errorMsg, type: 'error' });
    }
    if (resendBtn) {
      resendBtn.innerText = 'إعادة إرسال رمز جديد';
      resendBtn.disabled = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentEmail = urlParams.get('email') || sessionStorage.getItem('dawwer_registered_email');
  const previewCode = urlParams.get('previewCode') || urlParams.get('code');

  if (!currentEmail) {
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: 'لم يتم العثور على بريد إلكتروني للتفعيل. يرجى إنشاء حساب أولاً.', type: 'warning' });
    }
    setTimeout(() => {
      window.location.href = 'register.html';
    }, 1500);
    return;
  }

  const emailDisplay = document.getElementById('display-email-text');
  if (emailDisplay) emailDisplay.innerText = currentEmail;

  if (previewCode) {
    currentPreviewCode = String(previewCode).trim().replace(/\D/g, '');
    const previewText = document.getElementById('preview-code-text');
    if (previewText) previewText.innerText = currentPreviewCode;
    const badgeContainer = document.getElementById('preview-badge-container');
    if (badgeContainer) badgeContainer.classList.remove('hidden');
    setCodeInputs(currentPreviewCode);
  }

  const autoFillBtn = document.getElementById('autofill-btn');
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', autoFillCode);
  }

  const verifyForm = document.getElementById('verify-form');
  if (verifyForm) {
    verifyForm.addEventListener('submit', handleVerifyCode);
  }

  const codeInput = document.getElementById('code-input');
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  const resendBtn = document.getElementById('resend-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', handleResendCode);
  }
});

window.autoFillCode = autoFillCode;
window.handleVerifyCode = handleVerifyCode;
window.handleResendCode = handleResendCode;
