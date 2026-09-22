/**
 * Dawwer Platform - Layout, Navigation & UI Controller
 */
document.addEventListener("DOMContentLoaded", () => {
  initLayout();
  if (typeof Auth !== "undefined") {
    Auth.applyPermissionTrimming();
  }
});

function initLayout() {
  const user = typeof Auth !== "undefined" ? Auth.getUser() : null;
  const store = typeof Auth !== "undefined" ? Auth.getActiveStore() : null;

  if (user) {
    document.querySelectorAll("[data-user-name]").forEach(el => {
      el.innerText = user.fullName || "مستخدم دوّر";
    });

    document.querySelectorAll("[data-user-role]").forEach(el => {
      if (user.role === "Admin" || user.role === 4) {
        el.innerText = "مدير المنصة الرئيسي";
      } else if (store && store.roleName) {
        el.innerText = store.roleName;
      } else {
        el.innerText = "تاجر معتمد";
      }
    });
  }

  if (store) {
    document.querySelectorAll("[data-store-name]").forEach(el => {
      el.innerText = store.storeName || "المتجر الحالي";
    });
  }

  // Active Link Highlighting
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a, #sidebar-box a, .sidebar-nav a").forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href === currentPath || href.startsWith(currentPath.split("?")[0]))) {
      link.classList.add("bg-[#0f2d20]", "font-bold", "text-white", "shadow-xs");
      link.classList.remove("text-white/90", "text-white/80", "text-white/70", "hover:bg-white/10", "hover:bg-white/5");
    }
  });

  setupMobileDrawer();
}

function setupMobileDrawer() {
  const sidebar = document.getElementById("sidebar-box");
  const toggleBtn = document.getElementById("mobile-menu-btn");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (!sidebar) return;

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = sidebar.classList.contains("hidden");
      if (isHidden) {
        sidebar.classList.remove("hidden");
        sidebar.classList.add("fixed", "inset-y-0", "right-0", "z-50", "shadow-2xl", "w-72");
        if (backdrop) backdrop.classList.remove("hidden");
      } else {
        sidebar.classList.add("hidden");
        sidebar.classList.remove("fixed", "inset-y-0", "right-0", "z-50", "shadow-2xl", "w-72");
        if (backdrop) backdrop.classList.add("hidden");
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.add("hidden");
      sidebar.classList.remove("fixed", "inset-y-0", "right-0", "z-50", "shadow-2xl", "w-72");
      backdrop.classList.add("hidden");
    });
  }
}
