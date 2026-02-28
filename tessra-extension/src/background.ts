// Background service worker — routes messages between popup, sidebar, and content scripts

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[Tessra] Extension installed — opening popup for setup");
    // On fresh install, open the popup so the user sees the API key form
    chrome.action.openPopup().catch(() => {
      // openPopup can fail in some browser versions; that's OK
    });
  }
});

// Route messages from popup/sidebar to content scripts (and vice versa)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === "AUTH_SUCCESS") {
    // Popup authenticated → tell all tabs to inject the sidebar
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: "AUTH_SUCCESS" }).catch(() => {
            // Tab may not have content script loaded yet — that's fine,
            // it will read storage on next load
          });
        }
      });
    });
  }

  if (message.type === "AUTH_CLEARED") {
    // Popup disconnected → tell all tabs to remove the sidebar
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: "AUTH_CLEARED" }).catch(() => {});
        }
      });
    });
  }

  if (message.type === "TOGGLE_SIDEBAR") {
    // Sidebar collapse button → forward to the sender's tab
    const tabId = _sender.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: "TOGGLE_SIDEBAR" }).catch(() => {});
    }
  }

  if (message.type === "STEP_UPDATE") {
    // Sidebar marked a step complete → forward to the sender's tab content script
    // so it can refresh the in-page overlay
    const tabId = _sender.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: "STEP_UPDATE",
        currentStep: message.currentStep,
      }).catch(() => {});
    }
  }
});
