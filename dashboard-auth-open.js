window.currentUser = null;
let dashboardActionsWired = false;
let dashboardLoadedOnce = false;

function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "flex";
  else alert("Please sign in to use this feature.");
}

function requireAuth() {
  if (!window.currentUser) {
    openAuthModal();
    return false;
  }
  return true;
}

function updateAuthUI(user) {
  const signOutBtn = document.getElementById("sign-out");
  const signInBtn = document.getElementById("sign-in");
  if (signOutBtn) signOutBtn.style.display = user ? "inline-flex" : "none";
  if (signInBtn) signInBtn.style.display = user ? "none" : "inline-flex";
}

function wireProtectedDashboardActions() {
  if (dashboardActionsWired) return;
  dashboardActionsWired = true;

  document.querySelectorAll(".cta-save-idea,[data-requires-auth='save']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!requireAuth()) e.preventDefault();
    });
  });

  const billingBtn = document.getElementById("manage-billing");
  if (billingBtn) {
    billingBtn.addEventListener("click", (e) => {
      if (!requireAuth()) e.preventDefault();
    });
  }

  const profileBtn = document.getElementById("update-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      if (!requireAuth()) e.preventDefault();
    });
  }
}

function loadDashboardOnce(loadDashboard) {
  if (dashboardLoadedOnce) return;
  dashboardLoadedOnce = true;
  if (typeof loadDashboard === "function") loadDashboard();
}

function initDashboardWithoutAuthLock(auth, loadDashboard) {
  wireProtectedDashboardActions();

  if (!auth || typeof auth.onAuthStateChanged !== "function") {
    window.currentUser = null;
    updateAuthUI(null);
    loadDashboardOnce(loadDashboard);
    return;
  }

  auth.onAuthStateChanged((user) => {
    window.currentUser = user || null;
    updateAuthUI(user || null);
    loadDashboardOnce(loadDashboard);
  });
}
