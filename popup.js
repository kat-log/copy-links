document.addEventListener("DOMContentLoaded", async () => {
  const copyTabsBtn = document.getElementById("copyTabs");
  const copySelectedTabsBtn = document.getElementById("copySelectedTabs");
  const customButtonsContainer = document.getElementById(
    "customButtonsContainer"
  );
  const status = document.getElementById("status");
  const fallback = document.getElementById("fallback");
  const fallbackText = document.getElementById("fallbackText");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const langSelect = document.getElementById("langSelect");

  let currentLang = await loadLanguage();
  langSelect.value = currentLang;
  applyTranslations();

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(currentLang, el.getAttribute("data-i18n"));
    });
    settingsBtn.title = t(currentLang, "settingsTooltip");
  }

  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("open");
  });

  langSelect.addEventListener("change", async () => {
    currentLang = langSelect.value;
    await saveLanguage(currentLang);
    applyTranslations();
    status.textContent = "";
    status.classList.remove("success", "error");
    fallback.classList.remove("visible");
  });

  document
    .getElementById("manageCustomButtons")
    .addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

  function setStatus(text, type) {
    status.textContent = text;
    status.classList.remove("success", "error");
    if (type === "error") status.classList.add("error");
    else if (type === "success") status.classList.add("success");
  }

  function flashCopySuccess(buttonEl) {
    buttonEl.classList.add("copy-success");
    setTimeout(() => buttonEl.classList.remove("copy-success"), 1500);
  }

  // Collect URLs from all open tabs in the current window
  async function collectAllTabUrls() {
    return new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const urls = tabs.map((tab) => tab.url);
        resolve({ success: true, links: urls });
      });
    });
  }

  // Collect URLs from highlighted (selected) tabs in the current window
  async function collectSelectedTabUrls() {
    return new Promise((resolve) => {
      chrome.tabs.query({ highlighted: true, currentWindow: true }, (tabs) => {
        const urls = tabs.map((tab) => tab.url);
        resolve({ success: true, links: urls });
      });
    });
  }

  // Try to copy text using popup clipboard API or fallbacks. Returns a promise
  // that resolves to an object { ok: boolean, reason?: string }
  async function tryCopyText(text, count) {
    // Primary: navigator.clipboard in popup
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return { ok: true };
      }
    } catch (err) {
      console.warn("Popup clipboard.writeText failed:", err);
    }

    // Secondary: execCommand copy from temporary textarea in popup
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return { ok: true };
    } catch (err) {
      console.warn("execCommand fallback failed:", err);
    }

    // Final: try clipboard write in page context
    try {
      const tabs = await new Promise((resolve) =>
        chrome.tabs.query({ active: true, currentWindow: true }, resolve)
      );
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        return { ok: false, reason: "no active tab" };
      }

      const results = await new Promise((resolve) =>
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: (payload) => {
              const { text } = payload;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard
                  .writeText(text)
                  .then(() => ({ success: true }))
                  .catch((err) => ({ success: false, error: String(err) }));
              }
              return { success: false, error: "clipboard API not available" };
            },
            args: [{ text }],
          },
          (r) => resolve(r)
        )
      );

      if (results && results[0] && results[0].result) {
        const r = results[0].result;
        if (r.success) return { ok: true };
        return { ok: false, reason: r.error || "page clipboard failed" };
      }
      return { ok: false, reason: "unexpected script result" };
    } catch (err) {
      return { ok: false, reason: String(err) };
    }
  }

  // Handler for copying all tab URLs
  async function handleCopyTabs() {
    setStatus(t(currentLang, "collectingAll"));
    fallback.classList.remove("visible");
    fallbackText.value = "";

    let collected = [];
    const res = await collectAllTabUrls();

    if (res && res.success && res.links && res.links.length > 0) {
      collected = res.links;
    }

    if (!collected || collected.length === 0) {
      setStatus(t(currentLang, "noTabsFound"), "error");
      return;
    }

    const text = collected.join("\n");
    setStatus(t(currentLang, "foundTabsCopying", { count: collected.length }));

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(t(currentLang, "copiedTabs", { count: collected.length }), "success");
      flashCopySuccess(copyTabsBtn);
      fallback.classList.remove("visible");
      return;
    }

    // If copy to clipboard failed, show fallback textarea with content
    fallbackText.value = text;
    fallback.classList.add("visible");
    setStatus(
      t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
      "error"
    );
  }

  // Handler for copying selected (highlighted) tab URLs
  async function handleCopySelectedTabs() {
    setStatus(t(currentLang, "collectingSelected"));
    fallback.classList.remove("visible");
    fallbackText.value = "";

    let collected = [];
    const res = await collectSelectedTabUrls();

    if (res && res.success && res.links && res.links.length > 0) {
      collected = res.links;
    }

    if (!collected || collected.length === 0) {
      setStatus(t(currentLang, "noSelectedTabs"), "error");
      return;
    }

    const text = collected.join("\n");
    setStatus(
      t(currentLang, "foundSelectedCopying", { count: collected.length })
    );

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(
        t(currentLang, "copiedSelected", { count: collected.length }),
        "success"
      );
      flashCopySuccess(copySelectedTabsBtn);
      fallback.classList.remove("visible");
      return;
    }

    fallbackText.value = text;
    fallback.classList.add("visible");
    setStatus(
      t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
      "error"
    );
  }

  // Handler for copying links using a custom button config
  async function handleCopyCustomLinks(config, buttonEl) {
    setStatus(t(currentLang, "collectingCustom", { name: config.name }));
    fallback.classList.remove("visible");
    fallbackText.value = "";

    chrome.runtime.sendMessage(
      {
        type: "collectLinks",
        hostname: config.hostname,
        pathnameRegex: config.pathnameRegex,
      },
      async (response) => {
        if (!response) {
          setStatus(t(currentLang, "noResponse"), "error");
          return;
        }
        if (!response.success) {
          setStatus(
            t(currentLang, "errorPrefix", {
              error: response.error || "unknown",
            }),
            "error"
          );
          return;
        }

        const links = response.links || [];
        if (links.length === 0) {
          setStatus(
            t(currentLang, "noCustomLinksFound", { name: config.name })
          );
          return;
        }

        const text = links.join("\n");
        const copyResult = await tryCopyText(text, links.length);

        if (copyResult.ok) {
          setStatus(
            t(currentLang, "copiedCustomLinks", {
              count: links.length,
              name: config.name,
            }),
            "success"
          );
          flashCopySuccess(buttonEl);
          fallback.classList.remove("visible");
          return;
        }

        // If copy to clipboard failed, show fallback textarea with content
        fallbackText.value = text;
        fallback.classList.add("visible");
        setStatus(
          t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
          "error"
        );
      }
    );
  }

  // Render custom buttons from storage
  async function renderCustomButtons() {
    customButtonsContainer.innerHTML = "";
    const buttons = await loadCustomButtons();

    buttons.forEach((config) => {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' +
        '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>' +
        "</svg>" +
        "<span>" +
        escapeHtml(config.name) +
        "</span>";
      btn.addEventListener("click", () =>
        handleCopyCustomLinks(config, btn)
      );
      customButtonsContainer.appendChild(btn);
    });
  }

  // Refresh custom buttons when storage changes (e.g. from options page)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.customButtons) {
      renderCustomButtons();
    }
  });

  copyTabsBtn.addEventListener("click", handleCopyTabs);
  copySelectedTabsBtn.addEventListener("click", handleCopySelectedTabs);
  renderCustomButtons();
});
