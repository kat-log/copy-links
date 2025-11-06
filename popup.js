document.addEventListener("DOMContentLoaded", () => {
  const copyTabsBtn = document.getElementById("copyTabs");
  const qiitaBtn = document.getElementById("qiita");
  const zennBtn = document.getElementById("zenn");
  const status = document.getElementById("status");
  const fallback = document.getElementById("fallback");
  const fallbackText = document.getElementById("fallbackText");

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
    setStatus("Collecting URLs from all tabs...");
    fallback.style.display = "none";
    fallbackText.value = "";

    let collected = [];
    const res = await collectAllTabUrls();

    if (res && res.success && res.links && res.links.length > 0) {
      collected = res.links;
    }

    if (!collected || collected.length === 0) {
      setStatus("No tabs found.", true);
      return;
    }

    const text = collected.join("\n");
    setStatus(`Found ${collected.length} tab(s). Copying...`);

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(`Copied ${collected.length} tab URL(s) to clipboard.`);
      fallback.style.display = "none";
      return;
    }

    // If copy to clipboard failed, show fallback textarea with content
    fallbackText.value = text;
    fallback.style.display = "block";
    setStatus(
      `Could not copy automatically (${
        copyResult.reason || ""
      }). Please copy manually below.`,
      true
    );
  }

  // Handler for copying Qiita/Zenn links from current page
  async function handleCopyLinks(domain) {
    setStatus("Collecting " + domain + " links...");
    fallback.style.display = "none";
    fallbackText.value = "";

    // Ask background to collect links from the active tab
    chrome.runtime.sendMessage(
      { type: "collectLinks", domain },
      async (response) => {
        if (!response) {
          setStatus("No response from background", true);
          return;
        }
        if (!response.success) {
          setStatus("Error: " + (response.error || "unknown"), true);
          return;
        }

        const links = response.links || [];
        if (links.length === 0) {
          setStatus(
            "No " + domain + " links found inside table elements on this page."
          );
          return;
        }

        const text = links.join("\n");
        const copyResult = await tryCopyText(text, links.length);

        if (copyResult.ok) {
          setStatus(`Copied ${links.length} ${domain} link(s) to clipboard.`);
          fallback.style.display = "none";
          return;
        }

        // If copy to clipboard failed, show fallback textarea with content
        fallbackText.value = text;
        fallback.style.display = "block";
        setStatus(
          `Could not copy automatically (${
            copyResult.reason || ""
          }). Please copy manually below.`,
          true
        );
      }
    );
  }

  copyTabsBtn.addEventListener("click", handleCopyTabs);
  qiitaBtn.addEventListener("click", () => handleCopyLinks("qiita"));
  zennBtn.addEventListener("click", () => handleCopyLinks("zenn"));
});
