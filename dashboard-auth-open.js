window.currentUser = null;

function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "flex";
  else alert("Please sign in to use this feature.");
}

function requireAuth(actionName = "protected action") {
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
  document.querySelectorAll(".cta-save-idea,[data-requires-auth='save']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!requireAuth("save")) e.preventDefault();
    });
  });

  const billingBtn = document.getElementById("manage-billing");
  if (billingBtn) {
    billingBtn.addEventListener("click", (e) => {
      if (!requireAuth("billing")) e.preventDefault();
    });
  }

  const profileBtn = document.getElementById("update-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      if (!requireAuth("profile")) e.preventDefault();
    });
  }
}

function initDashboardWithoutAuthLock(auth, loadDashboard) {
  if (!auth || typeof auth.onAuthStateChanged !== "function") {
    window.currentUser = null;
    if (typeof loadDashboard === "function") loadDashboard();
    wireProtectedDashboardActions();
    updateAuthUI(null);
    return;
  }

  auth.onAuthStateChanged((user) => {
    window.currentUser = user || null;
    if (typeof loadDashboard === "function") loadDashboard();
    wireProtectedDashboardActions();
    updateAuthUI(user || null);
  });
}
