// Background service worker: listen for requests from popup to collect links
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "collectLinks") return;
  const domain = message.domain; // expected: 'qiita' or 'zenn'
  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "No active tab" });
      return;
    }

    // Inject script into the page to collect links from table elements
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: (domainChoice) => {
          try {
            const domainMap = {
              qiita: "https://qiita.com",
              zenn: "https://zenn.dev",
            };
            const prefix = domainMap[domainChoice] || domainChoice;
            const seen = new Set();
            const links = [];

            if (domainChoice === "qiita") {
              // Only search inside <table> elements and include only article links
              // that contain "/items/". Normalize relative links that start with
              // "/" to absolute URLs using the qiita prefix.
              const tables = Array.from(document.getElementsByTagName("table"));
              tables.forEach((table) => {
                const anchors = table.getElementsByTagName("a");
                for (const a of anchors) {
                  const raw = a.getAttribute("href") || "";
                  const href = raw.trim();
                  // Skip empty
                  if (!href) continue;

                  let finalUrl = null;

                  // Absolute Qiita links: must start with the prefix and contain /items/
                  if (
                    href.startsWith(prefix) &&
                    href.indexOf("/items/") !== -1
                  ) {
                    finalUrl = href;
                  }

                  // Relative links like '/user/items/xxxxx' -> normalize
                  else if (
                    href.startsWith("/") &&
                    href.indexOf("/items/") !== -1
                  ) {
                    finalUrl = prefix + href;
                  }

                  if (finalUrl && !seen.has(finalUrl)) {
                    seen.add(finalUrl);
                    links.push(finalUrl);
                  }
                }
              });
            } else if (domainChoice === "zenn") {
              // For Zenn, collect links anywhere on the page but only include article/book URLs
              const anchors = Array.from(document.querySelectorAll("a[href]"));
              for (const a of anchors) {
                const raw = a.getAttribute("href") || "";
                const href = raw.trim();
                // Only accept links that are on zenn.dev and contain /articles/ or /books/
                if (
                  href.startsWith(prefix) &&
                  !seen.has(href) &&
                  (href.indexOf("/articles/") !== -1 ||
                    href.indexOf("/books/") !== -1)
                ) {
                  seen.add(href);
                  links.push(href);
                }
              }
            } else {
              // Fallback: search everywhere
              const anchors = Array.from(document.querySelectorAll("a[href]"));
              for (const a of anchors) {
                const raw = a.getAttribute("href") || "";
                const href = raw.trim();
                if (href.startsWith(prefix) && !seen.has(href)) {
                  seen.add(href);
                  links.push(href);
                }
              }
            }

            return { success: true, links };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        },
        args: [domain],
      },
      (results) => {
        if (!results || !results[0] || !results[0].result) {
          sendResponse({
            success: false,
            error: "No result from content script",
          });
          return;
        }
        sendResponse(results[0].result);
      }
    );
  });

  // Indicate we'll respond asynchronously
  return true;
});
