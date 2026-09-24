const DawwerNotification = {
  containerId: 'dawwer-toast-container',

  getOrCreateContainer() {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'fixed top-5 left-5 z-[9999] sm:left-6 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all';
      container.setAttribute('dir', 'rtl');
      document.body.appendChild(container);
    }
    return container;
  },

  getIcon(type) {
    switch (type) {
      case 'error':
      case 'danger':
        return `<div class="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>`;
      case 'warning':
        return `<div class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>`;
      case 'info':
        return `<div class="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>`;
      case 'success':
      default:
        return `<div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        </div>`;
    }
  },

  getStyles(type) {
    switch (type) {
      case 'error':
      case 'danger':
        return 'bg-white/95 border-rose-200 text-rose-950 shadow-rose-900/10';
      case 'warning':
        return 'bg-white/95 border-amber-200 text-amber-950 shadow-amber-900/10';
      case 'info':
        return 'bg-white/95 border-sky-200 text-sky-950 shadow-sky-900/10';
      case 'success':
      default:
        return 'bg-white/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10';
    }
  },

  show(optsOrTitle, message = '', type = 'success', duration = 4000) {
    let title = optsOrTitle;
    let msg = message;
    let toastType = type;
    let dur = duration;

    if (typeof optsOrTitle === 'object' && optsOrTitle !== null) {
      title = optsOrTitle.title || '';
      msg = optsOrTitle.message || optsOrTitle.msg || '';
      toastType = optsOrTitle.type || 'success';
      dur = typeof optsOrTitle.duration === 'number' ? optsOrTitle.duration : 4000;
    }

    if (!document.body) {
      window.addEventListener('DOMContentLoaded', () => this.show(optsOrTitle, message, type, duration));
      return;
    }

    const container = this.getOrCreateContainer();
    const toast = document.createElement('div');
    const toastId = 'toast-' + Math.random().toString(36).substring(2, 9);
    toast.id = toastId;

    const styleClasses = this.getStyles(toastType);
    const iconHtml = this.getIcon(toastType);

    toast.className = `pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md shadow-lg ${styleClasses} transition-all duration-300 transform opacity-0 -translate-y-3`;

    toast.innerHTML = `
      ${iconHtml}
      <div class="flex-1 min-w-0 pr-1">
        ${title ? `<div class="font-bold text-sm leading-tight mb-0.5">${title}</div>` : ''}
        ${msg ? `<div class="text-xs text-slate-600 leading-relaxed font-medium">${msg}</div>` : ''}
      </div>
      <button type="button" class="toast-close-btn p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition active:scale-95" aria-label="إغلاق">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.dismiss(toast);
    }

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', '-translate-y-3');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    if (dur > 0) {
      const timer = setTimeout(() => {
        this.dismiss(toast);
      }, dur);
      toast._dismissTimer = timer;
    }

    return toast;
  },

  dismiss(toast) {
    if (!toast || toast._isDismissing) return;
    toast._isDismissing = true;
    if (toast._dismissTimer) clearTimeout(toast._dismissTimer);

    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-2', 'scale-95');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
};

function showToast(optsOrTitle, message = '', type = 'success', duration = 4000) {
  return DawwerNotification.show(optsOrTitle, message, type, duration);
}

window.showToast = showToast;
window.DawwerNotification = DawwerNotification;
