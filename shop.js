/**
 * Butikk – åpne/lukke overlay og vise mynter fra localStorage.
 */
(function () {
  const COINS_KEY = "spaceDodgerCoins";
  const openBtn = document.getElementById("shop-open-btn");
  const overlay = document.getElementById("shop-overlay");
  const closeBtn = document.getElementById("shop-close-btn");
  const coinsEl = document.getElementById("shop-coins");

  if (!openBtn || !overlay) return;

  function getCoins() {
    const n = Number(localStorage.getItem(COINS_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function refreshCoins() {
    if (coinsEl) coinsEl.textContent = String(getCoins());
  }

  function openShop() {
    refreshCoins();
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

  window.SpaceDodgerShop = {
    COINS_KEY,
    getCoins,
    addCoins(amount) {
      const add = Math.max(0, Math.floor(Number(amount) || 0));
      if (!add) return getCoins();
      const next = getCoins() + add;
      localStorage.setItem(COINS_KEY, String(next));
      refreshCoins();
      return next;
    },
    refreshCoins,
  };
})();
