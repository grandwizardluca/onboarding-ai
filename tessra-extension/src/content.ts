// Content script — injects the Tessra sidebar iframe into every page

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;
let sidebarContainer: HTMLDivElement | null = null;
let collapsed = false;

function injectSidebar() {
  if (sidebarContainer) return; // already injected

  // Container div — position:fixed so it floats over the page
  const container = document.createElement("div");
  container.id = "tessra-sidebar-root";
  container.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: ${SIDEBAR_WIDTH}px !important;
    height: 100vh !important;
    z-index: 2147483646 !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    pointer-events: auto !important;
    transition: width 0.2s ease !important;
  `;

  // iframe loads the React sidebar app from the extension
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sidebar.html");
  iframe.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    display: block !important;
  `;
  iframe.allow = "clipboard-write";

  container.appendChild(iframe);
  document.documentElement.appendChild(container);
  sidebarContainer = container;
}

function removeSidebar() {
  sidebarContainer?.remove();
  sidebarContainer = null;
}

function toggleSidebar() {
  if (!sidebarContainer) return;
  collapsed = !collapsed;
  sidebarContainer.style.width = collapsed
    ? `${COLLAPSED_WIDTH}px`
    : `${SIDEBAR_WIDTH}px`;
}

// On load: check if already authenticated and inject sidebar
chrome.storage.local.get(["apiKey"], ({ apiKey }) => {
  if (apiKey) injectSidebar();
});

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTH_SUCCESS") injectSidebar();
  if (message.type === "AUTH_CLEARED") removeSidebar();
  if (message.type === "TOGGLE_SIDEBAR") toggleSidebar();
});
