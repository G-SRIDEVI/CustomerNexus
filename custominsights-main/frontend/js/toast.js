// Custom Notification System & Alert Override
(function() {
  function ensureToastContainer() {
    let container = document.getElementById("custom-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "custom-toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  window.showToast = function(message, type = "info", title = null) {
    if (!message) return;
    const container = ensureToastContainer();
    
    const lowerMsg = String(message).toLowerCase();
    if (type === "info" || !type) {
      if (lowerMsg.includes("success") || lowerMsg.includes("added") || lowerMsg.includes("saved") || lowerMsg.includes("updated") || lowerMsg.includes("created") || lowerMsg.includes("registered")) {
        type = "success";
      } else if (lowerMsg.includes("denied") || lowerMsg.includes("failed") || lowerMsg.includes("error") || lowerMsg.includes("invalid") || lowerMsg.includes("incorrect") || lowerMsg.includes("fill")) {
        type = "error";
      } else if (lowerMsg.includes("warning") || lowerMsg.includes("alert") || lowerMsg.includes("low stock") || lowerMsg.includes("no new")) {
        type = "warning";
      }
    }

    const toast = document.createElement("div");
    toast.className = `custom-toast toast-${type}`;

    let iconHtml = "ℹ️";
    let defaultTitle = "Notification";
    if (type === "success") { iconHtml = "✓"; defaultTitle = "Success"; }
    else if (type === "error") { iconHtml = "✕"; defaultTitle = "Alert"; }
    else if (type === "warning") { iconHtml = "⚠️"; defaultTitle = "Notice"; }

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitle}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hiding");
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  };

  // Global override for native browser alert()
  window.alert = function(msg) {
    window.showToast(msg);
  };
})();
