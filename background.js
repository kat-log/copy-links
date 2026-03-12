// Service worker for handling link collection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "collectLinks") {
    const { hostname, pathnameRegex } = request;

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
          func: (hostname, pathnameRegex) => {
            // Helper to normalize URLs
            function normalizeUrl(url, base) {
              try {
                return new URL(url, base).href;
              } catch (e) {
                return null;
              }
            }

            // Get all links from the page that match the hostname and pathname pattern
            const regex = pathnameRegex ? new RegExp(pathnameRegex) : null;
            const links = Array.from(document.querySelectorAll("a"))
              .map((a) => normalizeUrl(a.href, window.location.href))
              .filter((url) => {
                if (!url) return false;
                try {
                  const parsed = new URL(url);
                  if (parsed.hostname !== hostname) return false;
                  return regex ? regex.test(parsed.pathname) : true;
                } catch (e) {
                  return false;
                }
              });

            return {
              success: true,
              links: [...new Set(links)], // Remove duplicates
            };
          },
          args: [hostname, pathnameRegex],
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
