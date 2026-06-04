/**
 * Butikk – penger, kjøp og utstyr (rakettfarger m.m.).
 */
(function () {
  const MONEY_KEY = "spaceDodgerMoney";
  const LEGACY_COINS_KEY = "spaceDodgerCoins";
  const OWNED_KEY = "spaceDodgerOwned";
  const EQUIPPED_ROCKET_KEY = "spaceDodgerEquippedRocket";
  const EQUIPPED_PILOT_KEY = "spaceDodgerEquippedPilot";
  const BONUS_LIFE_KEY = "spaceDodgerBonusLife";

  const ROCKET_ITEMS = [
    {
      id: "rocket-default",
      name: "Turkis (standard)",
      price: 0,
      body: "#5eead4",
      accent: "#38bdf8",
      default: true,
    },
    {
      id: "rocket-pink",
      name: "Rosa rakett",
      price: 40,
      body: "#f472b6",
      accent: "#ec4899",
    },
    {
      id: "rocket-gold",
      name: "Gullrakett",
      price: 80,
      body: "#fbbf24",
      accent: "#f59e0b",
    },
    {
      id: "rocket-purple",
      name: "Lilla rakett",
      price: 60,
      body: "#a78bfa",
      accent: "#8b5cf6",
    },
    {
      id: "rocket-lime",
      name: "Limegrønn rakett",
      price: 50,
      body: "#a3e635",
      accent: "#65a30d",
    },
    {
      id: "rocket-red",
      name: "Rød rakett",
      price: 70,
      body: "#f87171",
      accent: "#dc2626",
    },
    {
      id: "rocket-ice",
      name: "Isblå rakett",
      price: 55,
      body: "#bae6fd",
      accent: "#0ea5e9",
    },
  ];

  const UPGRADE_ITEMS = [
    {
      id: "pilot-astronaut",
      name: "Romfarer i cockpit",
      desc: "Fjes i vinduet + dobbelt poeng (+20) per sol du samler (kun deg i MP)",
      price: 25000,
    },
  ];

  const CONSUMABLE_ITEMS = [
    {
      id: "bonus-life",
      name: "Ekstra liv",
      desc: "Neste runde: 4 liv for deg (3 for andre i MP) – kun den som kjøpte",
      price: 120,
      type: "consumable",
    },
  ];

  const openBtn = document.getElementById("shop-open-btn");
  const swapBtn = document.getElementById("shop-swap-btn");
  const overlay = document.getElementById("shop-overlay");
  const closeBtn = document.getElementById("shop-close-btn");
  const coinsEl = document.getElementById("shop-coins");
  const listEl = document.getElementById("shop-items-list");
  const msgEl = document.getElementById("shop-message");

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

  function setMoney(n) {
    localStorage.setItem(MONEY_KEY, String(Math.max(0, Math.floor(n))));
    refreshMoney();
  }

  function refreshMoney() {
    if (coinsEl) coinsEl.textContent = String(getMoney());
  }

  function getOwnedSet() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(OWNED_KEY) || "[]");
    } catch (_) {
      list = [];
    }
    const set = new Set(Array.isArray(list) ? list : []);
    set.add("rocket-default");
    return set;
  }

  function saveOwned(set) {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...set]));
  }

  function owns(itemId) {
    return getOwnedSet().has(itemId);
  }

  function getEquippedRocketId() {
    const id = localStorage.getItem(EQUIPPED_ROCKET_KEY) || "rocket-default";
    const item = ROCKET_ITEMS.find((r) => r.id === id);
    if (item && owns(id)) return id;
    return "rocket-default";
  }

  function getRocketItem(id) {
    return ROCKET_ITEMS.find((r) => r.id === id) || ROCKET_ITEMS[0];
  }

  function getRocketColors() {
    const item = getRocketItem(getEquippedRocketId());
    return { body: item.body, accent: item.accent };
  }

  function hasBonusLifeQueued() {
    return localStorage.getItem(BONUS_LIFE_KEY) === "1";
  }

  function ownsPilot() {
    return owns("pilot-astronaut");
  }

  function getEquippedPilotId() {
    if (!ownsPilot()) return "";
    const id = localStorage.getItem(EQUIPPED_PILOT_KEY);
    return id === "pilot-astronaut" ? id : "";
  }

  function hasPilotEquipped() {
    return getEquippedPilotId() === "pilot-astronaut";
  }

  function equipPilot(on) {
    if (!ownsPilot()) return false;
    if (on) localStorage.setItem(EQUIPPED_PILOT_KEY, "pilot-astronaut");
    else localStorage.removeItem(EQUIPPED_PILOT_KEY);
    renderShop();
    return true;
  }

  function showMessage(text, isError) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.classList.toggle("shop-message-error", !!isError);
  }

  function equipRocket(id) {
    if (!owns(id)) return false;
    localStorage.setItem(EQUIPPED_ROCKET_KEY, id);
    renderShop();
    return true;
  }

  function getOwnedRockets() {
    return ROCKET_ITEMS.filter((item) => owns(item.id));
  }

  function cycleOwnedRocket() {
    const owned = getOwnedRockets();
    if (owned.length === 0) return false;
    if (owned.length === 1) {
      equipRocket(owned[0].id);
      return true;
    }
    const current = getEquippedRocketId();
    const idx = Math.max(0, owned.findIndex((item) => item.id === current));
    const next = owned[(idx + 1) % owned.length];
    equipRocket(next.id);
    return true;
  }

  function buyRocket(item) {
    if (owns(item.id)) {
      equipRocket(item.id);
      showMessage(item.name + " er utstyrt.");
      return true;
    }
    if (getMoney() < item.price) {
      showMessage("Du har ikke nok penger.", true);
      return false;
    }
    setMoney(getMoney() - item.price);
    const owned = getOwnedSet();
    owned.add(item.id);
    saveOwned(owned);
    equipRocket(item.id);
    showMessage("Kjøpt! " + item.name + " er utstyrt.");
    return true;
  }

  function buyUpgrade(item) {
    if (owns(item.id)) {
      equipPilot(true);
      showMessage(item.name + " er aktivert.");
      return true;
    }
    if (getMoney() < item.price) {
      showMessage("Du har ikke nok penger.", true);
      return false;
    }
    setMoney(getMoney() - item.price);
    const owned = getOwnedSet();
    owned.add(item.id);
    saveOwned(owned);
    equipPilot(true);
    showMessage("Kjøpt! " + item.name + " sitter nå i raketten din.");
    renderShop();
    return true;
  }

  function renderUpgradeRow(item) {
    const owned = owns(item.id);
    const equipped = item.id === "pilot-astronaut" && hasPilotEquipped();
    const li = document.createElement("li");
    li.className = "shop-item shop-item-upgrade" + (equipped ? " shop-item-equipped" : "");

    const swatch = document.createElement("div");
    swatch.className = "shop-swatch shop-swatch-pilot";
    swatch.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "shop-item-name";
    name.textContent = item.name;

    const price = document.createElement("span");
    price.className = "shop-item-price";
    price.textContent = owned ? "Eid" : item.price + " penger";

    const tag = document.createElement("span");
    tag.className = "shop-item-tag";
    tag.textContent = equipped
      ? "Aktiv – fjes i vinduet + dobbelt sol-poeng"
      : owned
        ? "Eid – aktiver for å vise romfarer"
        : item.desc;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mp-btn shop-item-btn";
    if (equipped) {
      btn.textContent = "Aktiv";
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = "Aktiver";
      btn.classList.add("mp-btn-primary");
      btn.addEventListener("click", () => {
        equipPilot(true);
        showMessage(item.name + " er aktivert.");
      });
    } else {
      btn.textContent = "Kjøp";
      btn.classList.add("mp-btn-primary");
      btn.addEventListener("click", () => buyUpgrade(item));
    }

    li.append(swatch, name, price, tag, btn);
    return li;
  }

  function buyConsumable(item) {
    if (item.id === "bonus-life" && hasBonusLifeQueued()) {
      showMessage("Du har allerede et ekstra liv i kø.", true);
      return false;
    }
    if (getMoney() < item.price) {
      showMessage("Du har ikke nok penger.", true);
      return false;
    }
    setMoney(getMoney() - item.price);
    if (item.id === "bonus-life") {
      localStorage.setItem(BONUS_LIFE_KEY, "1");
      showMessage(
        "Ekstra liv er kjøpt – neste runde starter du med 4 liv (maks én gang i kø)."
      );
    }
    renderShop();
    return true;
  }

  function renderRocketRow(item) {
    const owned = owns(item.id);
    const equipped = getEquippedRocketId() === item.id;
    const li = document.createElement("li");
    li.className = "shop-item" + (equipped ? " shop-item-equipped" : "");

    const swatch = document.createElement("div");
    swatch.className = "shop-swatch";
    swatch.style.background =
      "linear-gradient(135deg, " + item.body + " 0%, " + item.accent + " 100%)";
    swatch.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "shop-item-name";
    name.textContent = item.name;

    const price = document.createElement("span");
    price.className = "shop-item-price";
    price.textContent = item.price === 0 ? "Gratis" : item.price + " penger";

    const tag = document.createElement("span");
    tag.className = "shop-item-tag";
    if (equipped) tag.textContent = "Utstyrt nå";
    else if (owned) tag.textContent = "Eid – klikk Bytte for å utstyre";
    else tag.textContent = "Rakettfarge";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mp-btn shop-item-btn";
    if (equipped) {
      const ownedCount = getOwnedRockets().length;
      btn.textContent = "Bytte";
      btn.disabled = ownedCount <= 1;
      if (ownedCount > 1) {
        btn.addEventListener("click", () => {
          if (cycleOwnedRocket()) {
            showMessage("Byttet til neste rakettfarge du eier.");
          }
        });
      }
    } else if (owned) {
      btn.textContent = "Bytte";
      btn.addEventListener("click", () => {
        equipRocket(item.id);
        showMessage(item.name + " er utstyrt.");
      });
    } else if (item.price === 0) {
      btn.textContent = "Bytte";
      btn.addEventListener("click", () => {
        equipRocket(item.id);
        showMessage(item.name + " er utstyrt.");
      });
    } else {
      btn.textContent = "Kjøp";
      btn.classList.add("mp-btn-primary");
      btn.addEventListener("click", () => buyRocket(item));
    }

    li.append(swatch, name, price, tag, btn);
    return li;
  }

  function renderConsumableRow(item) {
    const li = document.createElement("li");
    li.className = "shop-item shop-item-consumable";

    const swatch = document.createElement("div");
    swatch.className = "shop-swatch shop-swatch-life";
    swatch.textContent = "♥";
    swatch.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "shop-item-name";
    name.textContent = item.name;

    const price = document.createElement("span");
    price.className = "shop-item-price";
    price.textContent = item.price + " penger";

    const tag = document.createElement("span");
    tag.className = "shop-item-tag";
    tag.textContent = hasBonusLifeQueued()
      ? "I kø til neste runde"
      : item.desc;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mp-btn shop-item-btn mp-btn-primary";
    btn.textContent = hasBonusLifeQueued() ? "I kø" : "Kjøp";
    btn.disabled = hasBonusLifeQueued();
    btn.addEventListener("click", () => buyConsumable(item));

    li.append(swatch, name, price, tag, btn);
    return li;
  }

  function renderShop() {
    if (!listEl) return;
    listEl.innerHTML = "";

    const h = document.createElement("li");
    h.className = "shop-section-label";
    h.textContent = "Rakettfarger";
    listEl.appendChild(h);

    ROCKET_ITEMS.forEach((item) => listEl.appendChild(renderRocketRow(item)));

    const hUp = document.createElement("li");
    hUp.className = "shop-section-label";
    hUp.textContent = "Oppgraderinger";
    listEl.appendChild(hUp);

    UPGRADE_ITEMS.forEach((item) => listEl.appendChild(renderUpgradeRow(item)));

    const h2 = document.createElement("li");
    h2.className = "shop-section-label";
    h2.textContent = "Forbruksvarer";
    listEl.appendChild(h2);

    CONSUMABLE_ITEMS.forEach((item) => listEl.appendChild(renderConsumableRow(item)));
    refreshMoney();
  }

  function openShop() {
    renderShop();
    showMessage("");
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeShop() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  function consumeBonusLife() {
    if (!hasBonusLifeQueued()) return 0;
    localStorage.removeItem(BONUS_LIFE_KEY);
    return 1;
  }

  function handleSwapClick() {
    const owned = getOwnedRockets();
    if (owned.length === 0) {
      openShop();
      showMessage("Åpne butikken og kjøp en rakettfarge først.", true);
      return;
    }
    if (owned.length === 1) {
      equipRocket(owned[0].id);
      openShop();
      showMessage("Du har bare én farge: " + owned[0].name + ".");
      return;
    }
    cycleOwnedRocket();
    const name = getRocketItem(getEquippedRocketId()).name;
    openShop();
    showMessage("Byttet til " + name + ".");
  }

  openBtn.addEventListener("click", openShop);
  if (swapBtn) swapBtn.addEventListener("click", handleSwapClick);
  if (closeBtn) closeBtn.addEventListener("click", closeShop);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeShop();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeShop();
  });

  migrateLegacyCoins();
  if (!localStorage.getItem(EQUIPPED_ROCKET_KEY)) {
    localStorage.setItem(EQUIPPED_ROCKET_KEY, "rocket-default");
  }
  refreshMoney();

  window.SpaceDodgerShop = {
    MONEY_KEY,
    getMoney,
    addCoins(amount) {
      const add = Math.max(0, Math.floor(Number(amount) || 0));
      if (!add) return getMoney();
      const next = getMoney() + add;
      setMoney(next);
      return next;
    },
    refreshMoney,
    getRocketColors,
    hasPilotEquipped,
    getOrbPoints() {
      return hasPilotEquipped() ? 20 : 10;
    },
    consumeBonusLife,
    hasBonusLifeQueued,
  };
})();
