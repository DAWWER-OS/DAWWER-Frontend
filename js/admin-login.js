document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  if (form) {
    form.addEventListener('submit', handleAdminLogin);
  }
});

async function handleAdminLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('admin-email-input');
  const passwordInput = document.getElementById('admin-password-input');
  const errorBox = document.getElementById('admin-error-box');
  const btn = document.getElementById('admin-submit-btn');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (errorBox) errorBox.classList.add('hidden');
  if (btn) {
    btn.innerText = 'جاري التحقق...';
    btn.disabled = true;
  }

  try {
    const response = await ApiClient.post('/Auth/login', { email, password });

    if (response.success && response.data) {
      const role = response.data.role;
      if (role !== 'Admin' && role !== 4 && role !== CONFIG.ROLES.ADMIN) {
        throw new Error('هذا الحساب لا يملك صلاحيات وصول لوحة الإدارة.');
      }

      Auth.saveSession(response.data);

      if (typeof showToast === 'function') {
        showToast({ title: 'مرحباً بالمدير', message: 'تم التحقق بنجاح، جاري الدخول للوحة التحكم...', type: 'success' });
      }

      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 500);
    } else {
      throw new Error(response.message || 'بيانات الدخول غير صحيحة.');
    }
  } catch (err) {
    const errorMsg = err.message || 'حدث خطأ أثناء تسجيل الدخول.';
    if (errorBox) {
      errorBox.innerHTML = errorMsg;
      errorBox.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast({ title: 'فشل الدخول', message: errorMsg, type: 'error' });
    }
    if (btn) {
      btn.innerText = 'تسجيل دخول كمدير';
      btn.disabled = false;
    }
  }
}
