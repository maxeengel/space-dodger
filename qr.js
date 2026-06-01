(function () {
  "use strict";

  const PUBLIC_URL = "https://maxeengel.github.io/space-dodger/";

  function getGameUrl() {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return PUBLIC_URL;
    }
    const path = window.location.pathname.replace(/\/[^/]*$/, "/");
    return window.location.origin + path;
  }

  function showImgQr(url) {
    const canvas = document.getElementById("qr-canvas");
    const img = document.getElementById("qr-img");
    if (!img) return;
    img.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=" +
      encodeURIComponent(url);
    img.classList.remove("hidden");
    if (canvas) canvas.classList.add("hidden");
  }

  function initQr() {
    const canvas = document.getElementById("qr-canvas");
    const link = document.getElementById("game-url");
    if (!canvas) return;

    const url = getGameUrl();
    if (link) {
      link.href = url;
      link.textContent = url.replace(/^https?:\/\//, "");
    }

    if (typeof QRCode === "undefined") {
      showImgQr(url);
      return;
    }

    QRCode.toCanvas(
      canvas,
      url,
      {
        width: 128,
        margin: 1,
        color: { dark: "#e2e8f0", light: "#12182b" },
      },
      function (err) {
        if (err) {
          showImgQr(url);
          return;
        }
        canvas.classList.remove("hidden");
        const img = document.getElementById("qr-img");
        if (img) img.classList.add("hidden");
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initQr);
  } else {
    initQr();
  }
})();
