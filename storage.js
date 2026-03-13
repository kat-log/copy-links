// Default custom button configuration
const DEFAULT_CUSTOM_BUTTONS = [
  {
    id: "qiita-articles",
    name: "Qiitaリンクをコピー",
    nameEn: "Copy Qiita links",
    hostname: "qiita.com",
    pathnameRegex: "^\\/[^\\/]+\\/items\\/[a-z0-9]+$",
  },
];

// Get the display name for a button based on the current language
function getButtonDisplayName(config, lang) {
  if (lang === "en" && config.nameEn) {
    return config.nameEn;
  }
  return config.name;
}

// Load custom buttons from storage. Returns default if none saved.
// Merges nameEn from defaults for buttons that match by ID (migration support).
async function loadCustomButtons() {
  return new Promise((resolve) => {
    chrome.storage.local.get("customButtons", (result) => {
      const buttons = result.customButtons || DEFAULT_CUSTOM_BUTTONS;
      for (const btn of buttons) {
        const def = DEFAULT_CUSTOM_BUTTONS.find((d) => d.id === btn.id);
        if (def && def.nameEn && !btn.nameEn) {
          btn.nameEn = def.nameEn;
        }
      }
      resolve(buttons);
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
