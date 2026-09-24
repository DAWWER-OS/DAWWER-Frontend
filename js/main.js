const EYE_SVG = `<svg class="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;

const EYE_SLASH_SVG = `<svg class="w-5 h-5 text-emerald-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`;

function togglePasswordVisibility(inputId, btn) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    btn.innerHTML = isPassword ? EYE_SLASH_SVG : EYE_SVG;
    btn.setAttribute('aria-label', isPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    btn.setAttribute('title', isPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  }
}

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password], .password-toggle-btn').forEach(btn => {
    btn.type = 'button';
    const targetId = btn.getAttribute('data-toggle-password') || btn.getAttribute('data-target');
    const input = targetId ? document.getElementById(targetId) : btn.parentElement.querySelector('input');

    if (input) {
      btn.innerHTML = input.type === 'password' ? EYE_SVG : EYE_SLASH_SVG;
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(input, btn);
      };
    }
  });
}

function showAlert(message, title = 'تنبيه', type = 'warning') {
  if (typeof showToast === 'function') {
    showToast({ title, message, type });
  } else {
    alert(message);
  }
}

window.togglePasswordVisibility = togglePasswordVisibility;
window.initPasswordToggles = initPasswordToggles;
window.showAlert = showAlert;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPasswordToggles);
} else {
  initPasswordToggles();
}
