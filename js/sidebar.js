/**
 * dawwer Platform - Expandable Sidebar Controller
 * Provides smooth expandable sidebar mechanism with transition-all duration-300 ease-in-out
 * Collapsed width: w-20 (5rem / 80px)
 * Expanded width: w-64 (16rem / 256px)
 */

function initExpandableSidebar() {
  const sidebar = document.getElementById('main-sidebar') || document.getElementById('sidebar-box');
  if (!sidebar) return;
  if (sidebar._expandableInit) return;
  sidebar._expandableInit = true;

  // Standardize element ID to main-sidebar
  if (sidebar.id !== 'main-sidebar') {
    sidebar.id = 'main-sidebar';
  }

  const isExpandedStored = localStorage.getItem('sidebar_expanded') === 'true';
  setSidebarState(isExpandedStored);

  function setSidebarState(expand) {
    sidebar.classList.toggle('w-64', expand);
    sidebar.classList.toggle('w-20', !expand);

    sidebar.querySelectorAll('.sidebar-label, .nav-label').forEach(el => {
      if (expand) {
        el.classList.remove('hidden', 'opacity-0', 'pointer-events-none', 'w-0', 'overflow-hidden');
        el.classList.add('opacity-100', 'w-auto', 'inline-block', 'whitespace-nowrap');
      } else {
        el.classList.add('hidden', 'opacity-0', 'pointer-events-none', 'w-0', 'overflow-hidden');
        el.classList.remove('opacity-100', 'w-auto', 'inline-block', 'whitespace-nowrap');
      }
    });

    const collapseBtn = sidebar.querySelector('#sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.classList.toggle('hidden', !expand);
    }

    localStorage.setItem('sidebar_expanded', expand);
  }

  // Expand on clicking sidebar empty space / container / logo / padding
  sidebar.addEventListener('click', (e) => {
    // If clicking on the subtle collapse button:
    if (e.target.closest('#sidebar-collapse-btn')) {
      e.preventDefault();
      e.stopPropagation();
      setSidebarState(false);
      return;
    }

    // If clicking directly on a navigation link item or action button, do not hijack navigation
    if (
      e.target.closest('a.nav-item') ||
      e.target.closest('button.nav-item') ||
      e.target.closest('button.action-btn') ||
      e.target.closest('#logout-btn') ||
      e.target.closest('[data-action="logout"]') ||
      e.target.closest('button[data-tab]')
    ) {
      return;
    }

    const isExpanded = sidebar.classList.contains('w-64');
    setSidebarState(!isExpanded);
  });

  // Clicking outside the expanded sidebar on mobile/tablet/desktop collapses it back
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && sidebar.classList.contains('w-64')) {
      setSidebarState(false);
    }
  });

  // Pressing Escape collapses it back
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('w-64')) {
      setSidebarState(false);
    }
  });

  // Attach controls to window/sidebar for programmatic access
  sidebar.setSidebarState = setSidebarState;
  if (typeof window !== 'undefined') {
    window.setSidebarState = setSidebarState;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExpandableSidebar);
  } else {
    initExpandableSidebar();
  }
}

if (typeof window !== 'undefined') {
  window.initExpandableSidebar = initExpandableSidebar;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initExpandableSidebar };
}
