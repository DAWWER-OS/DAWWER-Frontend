document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const emailInput = document.getElementById('email-input');
  if (emailParam && emailInput) {
    emailInput.value = emailParam;
  }

  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', handleResetPassword);
  }
});

async function handleResetPassword(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email-input');
  const tokenInput = document.getElementById('token-input');
  const newPassInput = document.getElementById('new-pass-input');
  const confirmPassInput = document.getElementById('confirm-pass-input');
  const alertBox = document.getElementById('alert-message');
  const btn = document.getElementById('submit-btn');

  if (!emailInput || !tokenInput || !newPassInput || !confirmPassInput) return;

  const email = emailInput.value.trim();
  const token = tokenInput.value.trim();
  const newPassword = newPassInput.value;
  const confirmPassword = confirmPassInput.value;

  if (newPassword !== confirmPassword) {
    const errorMsg = 'كلمتا المرور غير متطابقتين.';
    if (alertBox) {
      alertBox.innerText = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'خطأ في التطابق', message: errorMsg, type: 'error' });
    }
    return;
  }

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري التحديث...';
    btn.disabled = true;
  }

  try {
    const response = await ApiClient.post('/Auth/reset-password', {
      email,
      token,
      newPassword
    });

    const successMsg = response.message || 'تم تغيير كلمة المرور بنجاح! جاري تحويلك لتسجيل الدخول...';
    if (alertBox) {
      alertBox.innerHTML = successMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم تغيير كلمة المرور', message: successMsg, type: 'success' });
    }

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  } catch (err) {
    const errorMsg = err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور.';
    if (alertBox) {
      alertBox.innerHTML = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تعذر التحديث', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'حفظ كلمة المرور الجديدة';
      btn.disabled = false;
    }
  }
}
