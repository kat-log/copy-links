// When the user clicks the extension icon, inject code into the active tab
chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  // Inject a script that runs in the page context to access DOM and navigator.clipboard
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        // Collect all <table> elements and search for <a> tags with href starting with https://qiita.com
        const tables = Array.from(document.getElementsByTagName("table"));
        const seen = new Set();
        const links = [];
        tables.forEach((table) => {
          const anchors = table.getElementsByTagName("a");
          for (const a of anchors) {
            const raw = a.getAttribute("href") || "";
            const href = raw.trim();
            if (href.startsWith("https://qiita.com") && !seen.has(href)) {
              seen.add(href);
              links.push(href);
            }
          }
        });

        if (links.length === 0) {
          alert("No Qiita links found inside table elements on this page.");
          return;
        }

        const text = links.join("\n");

        // Try to write to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(text)
            .then(() => {
              alert("Copied " + links.length + " Qiita link(s) to clipboard.");
            })
            .catch((err) => {
              // Fallback: prompt with the text so user can copy manually
              console.error("writeText failed", err);
              prompt("Copy the following Qiita links:", text);
            });
        } else {
          // Older fallback
          prompt("Copy the following Qiita links:", text);
        }
      } catch (e) {
        console.error(e);
        alert("An error occurred while collecting Qiita links: " + e);
      }
    },
  });
});
