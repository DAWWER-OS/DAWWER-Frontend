document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  if (form) {
    form.addEventListener('submit', handleForgotPassword);
  }
});

async function handleForgotPassword(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email-input');
  const alertBox = document.getElementById('alert-message');
  const btn = document.getElementById('submit-btn');

  if (!emailInput) return;

  const email = emailInput.value.trim();

  if (alertBox) alertBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري الإرسال...';
    btn.disabled = true;
  }

  try {
    const response = await ApiClient.post('/Auth/forgot-password', { email });

    const successMsg = response.message || 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.';
    if (alertBox) {
      alertBox.innerHTML = successMsg;
      alertBox.className = 'mb-4 p-3.5 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'تم إرسال الرمز', message: successMsg, type: 'success' });
    }

    setTimeout(() => {
      window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
    }, 1500);
  } catch (err) {
    const errorMsg = err.message || 'حدث خطأ أثناء إرسال رمز الاستعادة.';
    if (alertBox) {
      alertBox.innerHTML = errorMsg;
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
