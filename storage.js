// Default custom button configuration
const DEFAULT_CUSTOM_BUTTONS = [
  {
    id: "qiita-articles",
    name: "Qiitaリンクをコピー",
    hostname: "qiita.com",
    pathnameRegex: "^\\/[^\\/]+\\/items\\/[a-z0-9]+$",
  },
];

// Load custom buttons from storage. Returns default if none saved.
async function loadCustomButtons() {
  return new Promise((resolve) => {
    chrome.storage.local.get("customButtons", (result) => {
      resolve(result.customButtons || DEFAULT_CUSTOM_BUTTONS);
    });
  });
}

// Save custom buttons array to storage.
async function saveCustomButtons(buttons) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ customButtons: buttons }, resolve);
  });
}

// Generate a simple unique ID for a new button
function generateButtonId() {
  return (
    "btn-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substr(2, 5)
  );
}

// Validate a button config object. Returns { valid: boolean, error?: string }
function validateButtonConfig(config) {
  if (!config.name || config.name.trim() === "") {
    return { valid: false, error: "nameRequired" };
  }
  if (!config.hostname || config.hostname.trim() === "") {
    return { valid: false, error: "hostnameRequired" };
  }
  if (config.pathnameRegex && config.pathnameRegex.trim() !== "") {
    try {
      new RegExp(config.pathnameRegex);
    } catch (e) {
      return { valid: false, error: "invalidRegex" };
    }
  }
  return { valid: true };
}

// Escape HTML to prevent XSS when inserting user-defined strings
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
