// Content script — injects the Tessra sidebar iframe into every page

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;
const BACKEND_URL = "https://tessrai.vercel.app";

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

// ── Workflow + API key state ───────────────────────────────────────────────────

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
let currentApiKey: string | null = null;
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

// ── Element extraction ─────────────────────────────────────────────────────────

const TESSRA_IDS = ["tessra-sidebar-root", "tessra-step-overlay", "tessra-highlight", "tessra-style"];

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "textarea",
  "select",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
].join(", ");

interface PageElement {
  index: number;
  type: string;
  text: string;
  id: string;
  ariaLabel: string;
  placeholder: string;
  nearbyLabel: string;
  visibleInViewport: boolean;
}

function isTessraElement(el: Element): boolean {
  return TESSRA_IDS.some((id) => el.closest(`#${id}`) !== null);
}

function getElementType(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "input") return "input";
  if (tag === "textarea") return "input";
  if (tag === "select") return "select";
  return el.getAttribute("role") || tag;
}

function getNearbyLabel(el: Element): string {
  const id = (el as HTMLElement).id;
  if (id) {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) return (label.textContent || "").trim().slice(0, 80);
    } catch { /* CSS.escape may not exist in all envs */ }
  }
  const parentLabel = el.closest("label");
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelector("input, textarea, select")?.remove();
    return (clone.textContent || "").trim().slice(0, 80);
  }
  const prev = el.previousElementSibling;
  if (prev?.tagName === "LABEL") return (prev.textContent || "").trim().slice(0, 80);
  return "";
}

function isHidden(el: Element): boolean {
  const s = window.getComputedStyle(el);
  return s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0;
}

function extractInteractiveElements(): PageElement[] {
  const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR));
  const elements: PageElement[] = [];
  let index = 0;

  for (const el of nodes) {
    if (elements.length >= 40) break;
    if (isTessraElement(el) || isHidden(el)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const tag = el.tagName.toLowerCase();
    let text = "";
    if (tag === "input") {
      text = (el as HTMLInputElement).value || (el as HTMLInputElement).defaultValue || "";
    } else if (tag === "select") {
      text = (el as HTMLSelectElement).selectedOptions[0]?.text || "";
    } else {
      text = (el.textContent || "").trim();
    }

    elements.push({
      index,
      type: getElementType(el),
      text: text.slice(0, 80),
      id: (el as HTMLElement).id || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      placeholder: (el as HTMLInputElement).placeholder || "",
      nearbyLabel: getNearbyLabel(el),
      visibleInViewport:
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0,
    });
    index++;
  }

  return elements;
}

// Find the actual DOM element by its snapshot index — must use identical filtering logic
function findElementByIndex(targetIndex: number): Element | null {
  const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR));
  let index = 0;

  for (const el of nodes) {
    if (index > 40) break;
    if (isTessraElement(el) || isHidden(el)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    if (index === targetIndex) return el;
    index++;
  }
  return null;
}

// ── Element highlight overlay ──────────────────────────────────────────────────

let highlightEl: HTMLDivElement | null = null;
let trackedEl: Element | null = null;
let scrollHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;

function injectHighlightStyles() {
  if (document.getElementById("tessra-style")) return;
  const style = document.createElement("style");
  style.id = "tessra-style";
  style.textContent = `
    @keyframes tessra-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
      50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
    }
    #tessra-highlight { animation: tessra-pulse 2s ease-in-out infinite; }
  `;
  document.documentElement.appendChild(style);
}

function highlightElement(index: number, tooltip: string) {
  const el = findElementByIndex(index);
  if (!el) return;

  removeHighlight();
  injectHighlightStyles();

  const PAD = 4;
  const overlay = document.createElement("div");
  overlay.id = "tessra-highlight";
  overlay.style.cssText = `
    position: fixed !important;
    pointer-events: none !important;
    z-index: 2147483644 !important;
    border: 3px solid #6366f1 !important;
    border-radius: 6px !important;
    background: rgba(99,102,241,0.08) !important;
  `;

  const tip = document.createElement("div");
  tip.style.cssText = `
    position: absolute !important;
    bottom: calc(100% + 8px) !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: #13132a !important;
    color: #e2e8f0 !important;
    font-size: 12px !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    font-weight: 500 !important;
    padding: 5px 10px !important;
    border-radius: 6px !important;
    border: 1px solid #2e2e5a !important;
    max-width: 220px !important;
    white-space: normal !important;
    text-align: center !important;
    pointer-events: none !important;
  `;
  tip.textContent = tooltip;
  overlay.appendChild(tip);
  document.documentElement.appendChild(overlay);

  highlightEl = overlay;
  trackedEl = el;

  function updatePos() {
    if (!highlightEl || !trackedEl) return;
    const r = trackedEl.getBoundingClientRect();
    highlightEl.style.top = `${r.top - PAD}px`;
    highlightEl.style.left = `${r.left - PAD}px`;
    highlightEl.style.width = `${r.width + PAD * 2}px`;
    highlightEl.style.height = `${r.height + PAD * 2}px`;
  }

  updatePos();
  scrollHandler = updatePos;
  resizeHandler = updatePos;
  window.addEventListener("scroll", scrollHandler, { passive: true });
  window.addEventListener("resize", resizeHandler);
}

function removeHighlight() {
  highlightEl?.remove();
  highlightEl = null;
  trackedEl = null;
  if (scrollHandler) { window.removeEventListener("scroll", scrollHandler); scrollHandler = null; }
  if (resizeHandler) { window.removeEventListener("resize", resizeHandler); resizeHandler = null; }
}

// ── MutationObserver + AI analysis ────────────────────────────────────────────

let mutationObserver: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isAnalyzing = false;

function startObserver() {
  if (mutationObserver) return; // already running
  mutationObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analyzeAndHighlight, 2000);
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  mutationObserver?.disconnect();
  mutationObserver = null;
}

async function analyzeAndHighlight() {
  const step = getStepForCurrentDomain();
  if (!step || !currentApiKey || isAnalyzing) return;

  isAnalyzing = true;
  try {
    const elements = extractInteractiveElements();
    if (elements.length === 0) return;

    const res = await fetch(`${BACKEND_URL}/api/widget/analyze-page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": currentApiKey,
      },
      body: JSON.stringify({
        snapshot: { url: window.location.href, elements },
        step: { title: step.title, instructions: step.instructions },
      }),
    });

    if (!res.ok) return;
    const result = await res.json();

    if (
      result.elementType !== null &&
      result.elementIndex !== null &&
      typeof result.confidence === "number" &&
      result.confidence >= 0.7
    ) {
      highlightElement(result.elementIndex, result.tooltip);
    } else {
      removeHighlight();
    }
  } catch {
    // Network or parse error — fail silently, don't break the page
  } finally {
    isAnalyzing = false;
  }
}

// ── In-page step overlay ───────────────────────────────────────────────────────

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
      <button type="button" id="tessra-overlay-close" style="background:none;border:none;cursor:pointer;color:#475569;font-size:16px;line-height:1;padding:0;" title="Dismiss">×</button>
    </div>
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#e2e8f0;line-height:1.3;">${escapeHtml(step.title)}</p>
    <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;line-height:1.5;">${escapeHtml(step.instructions)}</p>
    <button type="button" id="tessra-overlay-complete" style="width:100%;padding:7px 12px;background:#6366f1;border:none;border-radius:7px;cursor:pointer;color:#fff;font-size:12px;font-weight:600;font-family:inherit;">Mark this step complete ✓</button>
  `;

  document.documentElement.appendChild(div);
  overlayEl = div;

  div.addEventListener("click", (e) => e.stopPropagation());

  div.querySelector("#tessra-overlay-close")?.addEventListener("click", () => {
    removeStepOverlay();
  });

  div.querySelector("#tessra-overlay-complete")?.addEventListener("click", () => {
    const iframe = sidebarContainer?.querySelector("iframe") as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage({ type: "STEP_COMPLETE" }, "*");
    removeStepOverlay();
  });

  // Start continuous DOM monitoring + run first analysis immediately
  startObserver();
  analyzeAndHighlight();
}

function removeStepOverlay() {
  overlayEl?.remove();
  overlayEl = null;
  stopObserver();
  removeHighlight();
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
  if (sidebarContainer) return;
  if (document.getElementById("tessra-sidebar-root")) return;

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
  sidebarContainer.style.width = collapsed ? `${COLLAPSED_WIDTH}px` : `${SIDEBAR_WIDTH}px`;
  if (overlayEl) {
    overlayEl.style.right = `${(collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH) + 8}px`;
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

try {
  chrome.storage.local.get(["apiKey", "workflowConfig"], ({ apiKey, workflowConfig }) => {
    if (apiKey) {
      currentApiKey = apiKey as string;
      if (workflowConfig) currentWorkflowConfig = workflowConfig as WorkflowConfig;
      injectSidebar();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "AUTH_SUCCESS") injectSidebar();
    if (message.type === "AUTH_CLEARED") removeSidebar();
    if (message.type === "TOGGLE_SIDEBAR") toggleSidebar();

    if (message.type === "STEP_UPDATE") {
      // Step advanced — reset highlight and re-check overlay for new step
      currentStepIndex = message.currentStep ?? 0;
      stopObserver();
      removeHighlight();
      checkOverlay();
    }
  });
} catch {
  // Extension context invalidated (e.g. reloaded while tab was open) — do nothing
}
