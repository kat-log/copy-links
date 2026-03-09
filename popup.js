document.addEventListener("DOMContentLoaded", async () => {
  const copyTabsBtn = document.getElementById("copyTabs");
  const copySelectedTabsBtn = document.getElementById("copySelectedTabs");
  const qiitaBtn = document.getElementById("qiita");
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
    settingsPanel.style.display =
      settingsPanel.style.display === "none" ? "block" : "none";
  });

  langSelect.addEventListener("change", async () => {
    currentLang = langSelect.value;
    await saveLanguage(currentLang);
    applyTranslations();
    status.textContent = "";
    fallback.style.display = "none";
  });

  function setStatus(text, isError) {
    status.textContent = text;
    status.style.color = isError ? "red" : "#333";
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
    fallback.style.display = "none";
    fallbackText.value = "";

    let collected = [];
    const res = await collectAllTabUrls();

    if (res && res.success && res.links && res.links.length > 0) {
      collected = res.links;
    }

    if (!collected || collected.length === 0) {
      setStatus(t(currentLang, "noTabsFound"), true);
      return;
    }

    const text = collected.join("\n");
    setStatus(t(currentLang, "foundTabsCopying", { count: collected.length }));

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(t(currentLang, "copiedTabs", { count: collected.length }));
      fallback.style.display = "none";
      return;
    }

    // If copy to clipboard failed, show fallback textarea with content
    fallbackText.value = text;
    fallback.style.display = "block";
    setStatus(
      t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
      true
    );
  }

  // Handler for copying selected (highlighted) tab URLs
  async function handleCopySelectedTabs() {
    setStatus(t(currentLang, "collectingSelected"));
    fallback.style.display = "none";
    fallbackText.value = "";

    let collected = [];
    const res = await collectSelectedTabUrls();

    if (res && res.success && res.links && res.links.length > 0) {
      collected = res.links;
    }

    if (!collected || collected.length === 0) {
      setStatus(t(currentLang, "noSelectedTabs"), true);
      return;
    }

    const text = collected.join("\n");
    setStatus(
      t(currentLang, "foundSelectedCopying", { count: collected.length })
    );

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(
        t(currentLang, "copiedSelected", { count: collected.length })
      );
      fallback.style.display = "none";
      return;
    }

    fallbackText.value = text;
    fallback.style.display = "block";
    setStatus(
      t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
      true
    );
  }

  // Handler for copying Qiita/Zenn links from current page
  async function handleCopyLinks(domain) {
    setStatus(t(currentLang, "collectingDomain", { domain }));
    fallback.style.display = "none";
    fallbackText.value = "";

    // Ask background to collect links from the active tab
    chrome.runtime.sendMessage(
      { type: "collectLinks", domain },
      async (response) => {
        if (!response) {
          setStatus(t(currentLang, "noResponse"), true);
          return;
        }
        if (!response.success) {
          setStatus(
            t(currentLang, "errorPrefix", {
              error: response.error || "unknown",
            }),
            true
          );
          return;
        }

        const links = response.links || [];
        if (links.length === 0) {
          setStatus(t(currentLang, "noLinksFound", { domain }));
          return;
        }

        const text = links.join("\n");
        const copyResult = await tryCopyText(text, links.length);

        if (copyResult.ok) {
          setStatus(
            t(currentLang, "copiedLinks", { count: links.length, domain })
          );
          fallback.style.display = "none";
          return;
        }

        // If copy to clipboard failed, show fallback textarea with content
        fallbackText.value = text;
        fallback.style.display = "block";
        setStatus(
          t(currentLang, "copyFailed", { reason: copyResult.reason || "" }),
          true
        );
      }
    );
  }

  copyTabsBtn.addEventListener("click", handleCopyTabs);
  copySelectedTabsBtn.addEventListener("click", handleCopySelectedTabs);
  qiitaBtn.addEventListener("click", () => handleCopyLinks("qiita"));
});
