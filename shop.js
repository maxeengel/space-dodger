/**
 * Butikk – åpne/lukke overlay og vise penger fra localStorage.
 * Penger tjenes ved game over (poeng → penger via game.js).
 */
(function () {
  const MONEY_KEY = "spaceDodgerMoney";
  const LEGACY_COINS_KEY = "spaceDodgerCoins";
  const openBtn = document.getElementById("shop-open-btn");
  const overlay = document.getElementById("shop-overlay");
  const closeBtn = document.getElementById("shop-close-btn");
  const coinsEl = document.getElementById("shop-coins");

  if (!openBtn || !overlay) return;

  function migrateLegacyCoins() {
    const legacy = localStorage.getItem(LEGACY_COINS_KEY);
    if (legacy == null) return;
    const cur = localStorage.getItem(MONEY_KEY);
    const legacyN = Math.max(0, Math.floor(Number(legacy) || 0));
    const curN = cur != null ? Math.max(0, Math.floor(Number(cur) || 0)) : 0;
    localStorage.setItem(MONEY_KEY, String(curN + legacyN));
    localStorage.removeItem(LEGACY_COINS_KEY);
  }

  function getMoney() {
    migrateLegacyCoins();
    const n = Number(localStorage.getItem(MONEY_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function refreshMoney() {
    if (coinsEl) coinsEl.textContent = String(getMoney());
  }

  function openShop() {
    refreshMoney();
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeShop() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  openBtn.addEventListener("click", openShop);
  if (closeBtn) closeBtn.addEventListener("click", closeShop);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeShop();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeShop();
  });

  migrateLegacyCoins();
  refreshMoney();

  window.SpaceDodgerShop = {
    MONEY_KEY,
    getMoney,
    addCoins(amount) {
      const add = Math.max(0, Math.floor(Number(amount) || 0));
      if (!add) return getMoney();
      const next = getMoney() + add;
      localStorage.setItem(MONEY_KEY, String(next));
      refreshMoney();
      return next;
    },
    refreshMoney,
  };
})();
