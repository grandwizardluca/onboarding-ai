// Content script — injects the Tessra sidebar iframe into every page

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;
let sidebarContainer: HTMLDivElement | null = null;
let collapsed = false;

// ── Page context ───────────────────────────────────────────────────────────────

function getPageContext() {
  return {
    type: "PAGE_CONTEXT",
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
  };
}

function postPageContext() {
  const iframe = sidebarContainer?.querySelector("iframe") as HTMLIFrameElement | null;
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(getPageContext(), "*");
}

// Intercept SPA navigation so we detect URL changes in React/Next.js apps
const origPush = history.pushState.bind(history);
history.pushState = (...args) => {
  origPush(...args);
  postPageContext();
  checkOverlay();
};
const origReplace = history.replaceState.bind(history);
history.replaceState = (...args) => {
  origReplace(...args);
  postPageContext();
  checkOverlay();
};
window.addEventListener("popstate", () => {
  postPageContext();
  checkOverlay();
});

// ── In-page step overlay ───────────────────────────────────────────────────────

interface WorkflowStep {
  id: number;
  title: string;
  instructions: string;
  sites: string;
  completion_criteria: string;
}

interface WorkflowConfig {
  steps: WorkflowStep[];
}

let currentWorkflowConfig: WorkflowConfig | null = null;
let currentStepIndex = 0;
let overlayEl: HTMLDivElement | null = null;

function getStepForCurrentDomain(): WorkflowStep | null {
  if (!currentWorkflowConfig) return null;
  const step = currentWorkflowConfig.steps[currentStepIndex];
  if (!step || !step.sites) return null;
  const domain = window.location.hostname.replace(/^www\./, "");
  const sites = step.sites.split(",").map((s) => s.trim().replace(/^www\./, "").toLowerCase());
  return sites.some((s) => domain.includes(s)) ? step : null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectStepOverlay(step: WorkflowStep) {
  removeStepOverlay();

  const div = document.createElement("div");
  div.id = "tessra-step-overlay";
  div.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: ${collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH}px !important;
    width: 280px !important;
    background: #13132a !important;
    border: 1px solid #2e2e5a !important;
    border-radius: 12px !important;
    padding: 14px 16px !important;
    z-index: 2147483645 !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
    color: #e2e8f0 !important;
  `;

  div.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="color:#6366f1;font-size:14px;">✦</span>
        <span style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.05em;text-transform:uppercase;">Step ${currentStepIndex + 1}</span>
      </div>
      <button id="tessra-overlay-close" style="background:none;border:none;cursor:pointer;color:#475569;font-size:16px;line-height:1;padding:0;" title="Dismiss">×</button>
    </div>
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#e2e8f0;line-height:1.3;">${escapeHtml(step.title)}</p>
    <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;line-height:1.5;">${escapeHtml(step.instructions)}</p>
    <button id="tessra-overlay-complete" style="width:100%;padding:7px 12px;background:#6366f1;border:none;border-radius:7px;cursor:pointer;color:#fff;font-size:12px;font-weight:600;font-family:inherit;">Mark this step complete ✓</button>
  `;

  document.documentElement.appendChild(div);
  overlayEl = div;

  div.querySelector("#tessra-overlay-close")?.addEventListener("click", () => {
    removeStepOverlay();
  });

  div.querySelector("#tessra-overlay-complete")?.addEventListener("click", () => {
    // Post directly to the sidebar iframe — no need to go through background
    const iframe = sidebarContainer?.querySelector("iframe") as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage({ type: "STEP_COMPLETE" }, "*");
    removeStepOverlay();
  });
}

function removeStepOverlay() {
  overlayEl?.remove();
  overlayEl = null;
}

function checkOverlay() {
  const step = getStepForCurrentDomain();
  if (step && sidebarContainer) {
    injectStepOverlay(step);
  } else {
    removeStepOverlay();
  }
}

// ── Sidebar injection ──────────────────────────────────────────────────────────

function injectSidebar() {
  if (sidebarContainer) return; // already injected

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

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sidebar.html");
  iframe.style.cssText = `
    width: 100% !important;
    height: 100% !important;
    border: none !important;
    display: block !important;
  `;
  iframe.allow = "clipboard-write";

  iframe.addEventListener("load", () => {
    postPageContext();
    checkOverlay();
  });

  container.appendChild(iframe);
  document.documentElement.appendChild(container);
  sidebarContainer = container;
}

function removeSidebar() {
  sidebarContainer?.remove();
  sidebarContainer = null;
  removeStepOverlay();
}

function toggleSidebar() {
  if (!sidebarContainer) return;
  collapsed = !collapsed;
  sidebarContainer.style.width = collapsed
    ? `${COLLAPSED_WIDTH}px`
    : `${SIDEBAR_WIDTH}px`;
  // Keep overlay flush with sidebar edge
  if (overlayEl) {
    overlayEl.style.right = `${(collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH) + 8}px`;
  }
}

// On load: check auth and inject sidebar; load workflow config for overlay
chrome.storage.local.get(["apiKey", "workflowConfig"], ({ apiKey, workflowConfig }) => {
  if (apiKey) {
    if (workflowConfig) currentWorkflowConfig = workflowConfig as WorkflowConfig;
    injectSidebar();
  }
});

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTH_SUCCESS") injectSidebar();
  if (message.type === "AUTH_CLEARED") removeSidebar();
  if (message.type === "TOGGLE_SIDEBAR") toggleSidebar();

  if (message.type === "STEP_UPDATE") {
    // Sidebar advanced step → refresh overlay for new step
    currentStepIndex = message.currentStep ?? 0;
    checkOverlay();
  }

});
