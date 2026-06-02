(function () {
  "use strict";

  const SESSION_KEY = "ringRunnerSession";
  const USERS_KEY = "ringRunnerUsers";

  const viewOut = document.getElementById("auth-view-out");
  const viewIn = document.getElementById("auth-view-in");
  const loginToggle = document.getElementById("auth-login-toggle");
  const form = document.getElementById("auth-form");
  const usernameInput = document.getElementById("auth-username");
  const passwordInput = document.getElementById("auth-password");
  const errorEl = document.getElementById("auth-error");
  const displayNameEl = document.getElementById("auth-display-name");
  const logoutBtn = document.getElementById("auth-logout-btn");

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setSession(username) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username, loggedInAt: Date.now() })
    );
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function normalizeUsername(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase();
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function updateUI() {
    const session = getSession();
    const loggedIn = !!(session && session.username);

    if (viewOut) viewOut.classList.toggle("hidden", loggedIn);
    if (viewIn) viewIn.classList.toggle("hidden", !loggedIn);
    if (displayNameEl && loggedIn) {
      displayNameEl.textContent = session.username;
    }
    if (form) form.classList.add("hidden");
    if (loginToggle) loginToggle.classList.remove("hidden");
  }

  function login(username, password) {
    const name = normalizeUsername(username);
    if (!name || name.length < 2) {
      showError("Brukernavn må ha minst 2 tegn.");
      return false;
    }
    if (!password || password.length < 4) {
      showError("Passord må ha minst 4 tegn.");
      return false;
    }

    const users = loadUsers();
    if (users[name]) {
      if (users[name] !== password) {
        showError("Feil passord.");
        return false;
      }
    } else {
      users[name] = password;
      saveUsers(users);
    }

    setSession(name);
    clearError();
    if (passwordInput) passwordInput.value = "";
    updateUI();
    return true;
  }

  if (loginToggle && form) {
    loginToggle.addEventListener("click", () => {
      clearError();
      const open = form.classList.toggle("hidden");
      loginToggle.classList.toggle("hidden", !open);
      if (!open) {
        loginToggle.classList.remove("hidden");
      } else if (usernameInput) {
        usernameInput.focus();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      login(usernameInput ? usernameInput.value : "", passwordInput ? passwordInput.value : "");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      clearError();
      updateUI();
    });
  }

  updateUI();

  window.Auth = {
    isLoggedIn() {
      const s = getSession();
      return !!(s && s.username);
    },
    getUsername() {
      const s = getSession();
      return s && s.username ? s.username : null;
    },
    logout() {
      clearSession();
      updateUI();
    },
  };
})();
