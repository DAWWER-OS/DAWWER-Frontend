document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form') || document.getElementById('forgot-password-form');
  if (form) {
    form.addEventListener('submit', handleForgotPassword);
  }
});

async function handleForgotPassword(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email-input');
  const alertBox = document.getElementById('alert-message') || document.getElementById('error-message');
  const btn = document.getElementById('submit-btn');

  if (!emailInput || btn?.disabled) return;

  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    const errorMsg = 'يرجى إدخال بريد إلكتروني صحيح (مثال: example@dawwer.com).';
    if (alertBox) {
      alertBox.textContent = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-amber-50 border border-amber-200 text-amber-800 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تنبيه', message: errorMsg, type: 'warning' });
    }
    emailInput.focus();
    return;
  }

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري الإرسال...';
    btn.disabled = true;
  }

  try {
    const response = await ApiClient.post('/Auth/forgot-password', { email });

    const result = response?.data ?? response;
    if (result?.success === false) throw new Error(result.message || 'تعذر إرسال رمز الاستعادة.');
    const successMsg = result?.message || response?.message || 'إذا كان البريد مسجلًا، ستصلك رسالة الاستعادة. تحقق من البريد غير المرغوب فيه أيضًا.';
    if (alertBox) {
      alertBox.textContent = successMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'طلب استعادة كلمة المرور', message: successMsg, type: 'success' });
    }

    setTimeout(() => {
      window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
    }, 1500);
  } catch (err) {
    const errorMsg = err.message || 'حدث خطأ أثناء إرسال رمز الاستعادة.';
    if (alertBox) {
      alertBox.textContent = errorMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-red-50 border border-red-200 text-red-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تعذر الإرسال', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'إرسال رمز الاستعادة';
      btn.disabled = false;
    }
  }
}
