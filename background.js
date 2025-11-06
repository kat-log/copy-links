// Service worker for handling link collection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "collectLinks") {
    const { domain } = request;

    // Run content script to collect links
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ success: false, error: "No active tab" });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: (domain) => {
            // Helper to normalize URLs
            function normalizeUrl(url, base) {
              try {
                return new URL(url, base).href;
              } catch (e) {
                return null;
              }
            }

            // Get all links from the page that match the domain
            const links = Array.from(document.querySelectorAll("a"))
              .map((a) => normalizeUrl(a.href, window.location.href))
              .filter((url) => {
                if (!url) return false;
                try {
                  const parsed = new URL(url);
                  if (domain === "qiita") {
                    // Only include Qiita article links
                    return (
                      parsed.hostname === "qiita.com" &&
                      parsed.pathname.match(/^\/[^\/]+\/items\/[a-z0-9]+$/)
                    );
                  } else if (domain === "zenn") {
                    // Only include Zenn article links
                    return (
                      parsed.hostname === "zenn.dev" &&
                      parsed.pathname.match(/^\/[^\/]+\/articles\/[a-z0-9-]+$/)
                    );
                  }
                  return false;
                } catch (e) {
                  return false;
                }
              });

            return {
              success: true,
              links: [...new Set(links)], // Remove duplicates
            };
          },
          args: [domain],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }

          if (!results || !results[0] || !results[0].result) {
            sendResponse({
              success: false,
              error: "Unexpected script result",
            });
            return;
          }

          sendResponse(results[0].result);
        }
      );
    });

    // Keep message channel open for async response
    return true;
  }
});
