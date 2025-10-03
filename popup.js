document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copy");
  const status = document.getElementById("status");
  const fallback = document.getElementById("fallback");
  const fallbackText = document.getElementById("fallbackText");

  function setStatus(text, isError) {
    status.textContent = text;
    status.style.color = isError ? "red" : "#333";
  }

  // Ask background to collect links from the active tab for a given domain key
  function collectFor(domain) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "collectLinks", domain }, (res) => {
        resolve(res || { success: false, links: [], error: "no response" });
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

  // Main handler for the single button
  async function handleUnified() {
    setStatus("Detecting site and collecting links...");
    fallback.style.display = "none";
    fallbackText.value = "";

    // Inspect active tab host first to pick best domain
    const tabs = await new Promise((resolve) =>
      chrome.tabs.query({ active: true, currentWindow: true }, resolve)
    );
    const tab = tabs && tabs[0];
    let host = "";
    if (tab && tab.url) {
      try {
        const u = new URL(tab.url);
        host = u.hostname || "";
      } catch (e) {
        host = "";
      }
    }

    // Choose domain key based on host
    let primary = null;
    if (host.includes("qiita.com")) primary = "qiita";
    else if (host.includes("zenn.dev")) primary = "zenn";

    const tried = [];
    let collected = [];

    if (primary) {
      setStatus(`Collecting ${primary} links...`);
      tried.push(primary);
      const res = await collectFor(primary);
      if (res && res.success && res.links && res.links.length > 0) {
        collected = res.links;
      } else {
        // Try the other domain as a fallback (helps if page layout differs)
        const other = primary === "qiita" ? "zenn" : "qiita";
        setStatus(`No ${primary} links found, trying ${other} heuristics...`);
        tried.push(other);
        const res2 = await collectFor(other);
        if (res2 && res2.success && res2.links && res2.links.length > 0) {
          collected = res2.links;
        }
      }
    } else {
      // If host unknown, try qiita then zenn heuristics to maximize chance
      setStatus("Host not recognized. Trying Qiita heuristics...");
      tried.push("qiita");
      const r1 = await collectFor("qiita");
      if (r1 && r1.success && r1.links && r1.links.length > 0) {
        collected = r1.links;
      } else {
        setStatus("No Qiita links found, trying Zenn heuristics...");
        tried.push("zenn");
        const r2 = await collectFor("zenn");
        if (r2 && r2.success && r2.links && r2.links.length > 0) {
          collected = r2.links;
        }
      }
    }

    if (!collected || collected.length === 0) {
      setStatus(
        `No links found using: ${tried.join(
          ", "
        )}. Try opening a Qiita or Zenn listing page.`,
        true
      );
      return;
    }

    const text = collected.join("\n");
    setStatus(`Found ${collected.length} link(s). Copying...`);

    const copyResult = await tryCopyText(text, collected.length);
    if (copyResult.ok) {
      setStatus(`Copied ${collected.length} link(s) to clipboard.`);
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

  copyBtn.addEventListener("click", handleUnified);
});
