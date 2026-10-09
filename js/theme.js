/**
 * Dawwer Theme & Dark Mode Management
 * Complete, flicker-free dark mode synchronizer
 */

// 1. Immediate Theme Initialization (prevents FOUC / light flash)
(function applyInitialTheme() {
  try {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    console.warn('Initial theme detection error:', e);
  }
})();

/**
 * Synchronize theme toggle icons immediately to reflect active dark mode state
 */
function syncThemeToggleState() {
  const isDark = document.documentElement.classList.contains('dark');
  
  // Moon icons (visible in light mode, hidden in dark mode)
  const moonIcons = document.querySelectorAll('#theme-moon-icon, [data-theme-moon-icon], .theme-moon-icon');
  moonIcons.forEach(icon => {
    icon.classList.toggle('hidden', isDark);
  });

  // Sun icons (visible in dark mode, hidden in light mode)
  const sunIcons = document.querySelectorAll('#theme-sun-icon, [data-theme-sun-icon], .theme-sun-icon');
  sunIcons.forEach(icon => {
    icon.classList.toggle('hidden', !isDark);
  });

  // Update button titles and aria-labels
  const toggleButtons = document.querySelectorAll('#theme-toggle-btn, [data-theme-toggle], .theme-toggle-btn');
  toggleButtons.forEach(btn => {
    const label = isDark ? 'تبديل إلى الوضع النهاري' : 'تبديل إلى الوضع الليلي';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  });
}

/**
 * Toggle platform theme and persist choice
 */
function toggleTheme(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  const isDark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch (err) {
    console.warn('Failed to save theme in localStorage:', err);
  }
  syncThemeToggleState();
  
  try {
    window.dispatchEvent(new CustomEvent('dawwer:theme-changed', { detail: { isDark } }));
  } catch (err) {}
  
  return isDark;
}

/**
 * Initialize theme toggle buttons and attach events
 */
function initThemeToggle() {
  const toggleButtons = document.querySelectorAll('#theme-toggle-btn, [data-theme-toggle], .theme-toggle-btn');
  toggleButtons.forEach(btn => {
    if (!btn.dataset.themeBound) {
      btn.dataset.themeBound = 'true';
      btn.addEventListener('click', toggleTheme);
    }
  });

  // Immediate state synchronization on page load
  syncThemeToggleState();
}

// 2. MutationObserver to keep theme toggle icon synchronized with any html.dark mutations
if (typeof MutationObserver !== 'undefined' && document.documentElement) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        syncThemeToggleState();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// 3. Cross-tab synchronization via storage event
window.addEventListener('storage', (e) => {
  if (e.key === 'theme') {
    if (e.newValue === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    syncThemeToggleState();
  }
});

// 4. System theme changes when user has no explicit preference saved
if (window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (e) => {
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      syncThemeToggleState();
    }
  };
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleSystemThemeChange);
  }
}

// 5. Run immediately and on DOM readiness
syncThemeToggleState();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
  window.addEventListener('load', syncThemeToggleState);
} else {
  initThemeToggle();
}

// Expose globals for external components & DawwerLayout
window.syncThemeToggleState = syncThemeToggleState;
window.toggleTheme = toggleTheme;
window.initThemeToggle = initThemeToggle;
