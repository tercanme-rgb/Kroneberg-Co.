// dashboard-auth-open.js
// Drop-in script to make the dashboard readable without requiring auth.
// Auth is only enforced for protected actions like save, billing, and profile.

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

// IMPORTANT:
// Replace any old auth guard like:
//   if (!user) window.location.href = "index.html#signin";
// with the logic below.
function initDashboardWithoutAuthLock(firebaseAuthInstance, loadDashboard) {
  if (!firebaseAuthInstance || typeof firebaseAuthInstance.onAuthStateChanged !== "function") {
    window.currentUser = null;
    if (typeof loadDashboard === "function") loadDashboard();
    wireProtectedDashboardActions();
    updateAuthUI(null);
    return;
  }

  firebaseAuthInstance.onAuthStateChanged((user) => {
    window.currentUser = user || null;
    if (typeof loadDashboard === "function") loadDashboard();
    wireProtectedDashboardActions();
    updateAuthUI(user || null);
  });
}
