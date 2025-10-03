document.addEventListener("DOMContentLoaded", () => {
  const qiitaBtn = document.getElementById("qiita");
  const zennBtn = document.getElementById("zenn");
  const status = document.getElementById("status");
  const fallback = document.getElementById("fallback");
  const fallbackText = document.getElementById("fallbackText");

  function setStatus(text, isError) {
    status.textContent = text;
    status.style.color = isError ? "red" : "#333";
  }

  async function handle(domain) {
    setStatus("Collecting " + domain + " links...");

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

        // Try to copy to clipboard by executing in page context (has better clipboard privileges)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs && tabs[0];
          if (!tab || !tab.id) {
            // fallback to showing in popup
            fallbackText.value = text;
            fallback.style.display = "block";
            setStatus(
              "Failed to access tab for clipboard write. Use manual copy below.",
              true
            );
            return;
          }

          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: (payload) => {
                const { text } = payload;
                // Try clipboard API in page
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
            (results) => {
              if (results && results[0] && results[0].result) {
                const res = results[0].result;
                if (res.success) {
                  setStatus(
                    "Copied " + links.length + " link(s) to clipboard."
                  );
                  fallback.style.display = "none";
                } else {
                  // fallback: show text in popup for manual copy
                  fallbackText.value = text;
                  fallback.style.display = "block";
                  setStatus(
                    "Could not write to clipboard in page: " +
                      (res.error || "") +
                      " — use manual copy below.",
                    true
                  );
                }
              } else {
                fallbackText.value = text;
                fallback.style.display = "block";
                setStatus(
                  "Unexpected result while trying to copy. Use manual copy below.",
                  true
                );
              }
            }
          );
        });
      }
    );
  }

  qiitaBtn.addEventListener("click", () => handle("qiita"));
  zennBtn.addEventListener("click", () => handle("zenn"));
});
