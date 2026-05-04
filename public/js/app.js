// AI: Generated with Claude Code — History API SPA router for Resume Frog.
// Intercepts data-spa link clicks, updates the URL with pushState, and dispatches
// to the correct view module. Also handles popstate (browser back/forward).

// ============================================================
// Route definitions
// Maps URL path patterns to view module import paths.
// Patterns may include named segments like :id or :tab.
// ============================================================

/** @type {Array<{pattern: RegExp, keys: string[], modulePath: string}>} */
const arrRoutes = [
    {
        // /dashboard — main landing page listing all resumes
        pattern: /^\/dashboard$/,
        keys: [],
        modulePath: "/js/views/dashboard.js",
    },
    {
        // /profile/:tab — tabbed profile editor
        pattern: /^\/profile\/([^/]+)$/,
        keys: ["tab"],
        modulePath: "/js/views/profile.js",
    },
    {
        // /builder/:id — resume builder checklist for a specific resume
        pattern: /^\/builder\/(\d+)$/,
        keys: ["id"],
        modulePath: "/js/views/builder.js",
    },
    {
        // /preview/:id — rendered resume preview + print
        pattern: /^\/preview\/(\d+)$/,
        keys: ["id"],
        modulePath: "/js/views/preview.js",
    },
    {
        // /settings — app settings (Gemini API key, etc.)
        pattern: /^\/settings$/,
        keys: [],
        modulePath: "/js/views/settings.js",
    },
];

// ============================================================
// Route matching helper
// ============================================================

/**
 * Match a URL pathname against the route table.
 * Returns { modulePath, params } or null if no match.
 *
 * @param {string} strPathname - e.g. "/profile/contact"
 * @returns {{ modulePath: string, params: Record<string,string> } | null}
 */
function matchRoute(strPathname) {
    for (const objRoute of arrRoutes) {
        const arrMatch = strPathname.match(objRoute.pattern);
        if (!arrMatch) continue;

        // Build a params object from the captured groups and the keys array
        const objParams = {};
        objRoute.keys.forEach((strKey, intIdx) => {
            objParams[strKey] = arrMatch[intIdx + 1];
        });

        return { modulePath: objRoute.modulePath, params: objParams };
    }
    return null;
}

// ============================================================
// View rendering
// ============================================================

// Keep a reference to the currently active view module so we can call its
// cleanup() function (if provided) before rendering a new view.
let objCurrentView = null;

// Let the SPA control scroll position on route changes so deep pages do not
// inherit a previous view's scroll offset and hide the header automatically.
if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

/**
 * Resolve and render the view for the given pathname.
 * Dynamically imports the view module, calls its render(params) function,
 * and swaps the content of #view-root.
 *
 * @param {string} strPathname
 * @param {boolean} blnMoveFocus - true for SPA navigation after the initial load
 */
async function renderView(strPathname, blnMoveFocus = false) {
    const elRoot = document.getElementById("view-root");

    // Special-case: redirect bare "/" to "/dashboard"
    if (strPathname === "/") {
        history.replaceState(null, "", "/dashboard");
        strPathname = "/dashboard";
    }

    const objMatch = matchRoute(strPathname);

    if (!objMatch) {
        // No matching route — show a friendly 404 message
        elRoot.innerHTML = "";
        const elMsg = document.createElement("div");
        elMsg.className = "alert alert-warning mt-4";
        elMsg.setAttribute("role", "alert");
        const elTitle = document.createElement("h2");
        elTitle.className = "h5";
        elTitle.textContent = "Page not found";
        const elBody = document.createElement("p");
        elBody.className = "mb-0";
        elBody.textContent = `No route matches "${strPathname}". `;
        const elLink = document.createElement("a");
        elLink.href = "/dashboard";
        elLink.setAttribute("data-spa", "");
        elLink.textContent = "Go to Dashboard";
        elBody.appendChild(elLink);
        elMsg.appendChild(elTitle);
        elMsg.appendChild(elBody);
        elRoot.appendChild(elMsg);
        return;
    }

    // Notify components (e.g. ai-review.js) that navigation is occurring so they
    // can close any open popovers and re-enable their trigger buttons.
    document.dispatchEvent(new CustomEvent("resume-frog:navigate"));

    // Run cleanup on the current view if it exported one
    if (objCurrentView && typeof objCurrentView.cleanup === "function") {
        objCurrentView.cleanup();
    }

    // Show a loading spinner while the module loads / renders
    elRoot.innerHTML = "";
    const elSpinner = document.createElement("div");
    elSpinner.className = "d-flex justify-content-center py-5";
    elSpinner.innerHTML = `<div class="spinner-border text-primary" role="status" aria-label="Loading view"><span class="visually-hidden">Loading…</span></div>`;
    elRoot.appendChild(elSpinner);

    try {
        // Dynamically import the view module — browser caches subsequent imports
        const objModule = await import(objMatch.modulePath);
        objCurrentView = objModule;

        // Clear the spinner and render the view
        elRoot.innerHTML = "";
        await objModule.render(objMatch.params);

        if (blnMoveFocus) {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }

        // Move focus after in-app navigation so screen readers announce the new view.
        // Do not do this on the initial page load: browsers can paint a visible
        // focus outline after refresh even though the user did not navigate inside
        // the SPA.
        if (blnMoveFocus) {
            const elMain = document.getElementById("main-content");
            if (elMain) {
                elMain.focus({ preventScroll: true });
            }
        }
    } catch (err) {
        console.error("Failed to load or render view:", err);
        elRoot.innerHTML = "";
        const elErr = document.createElement("div");
        elErr.className = "alert alert-danger mt-4";
        elErr.setAttribute("role", "alert");
        elErr.textContent =
            "An error occurred while loading this page. Please try again.";
        elRoot.appendChild(elErr);
    }
}

// ============================================================
// Programmatic navigation helper (exported for view modules)
// ============================================================

/**
 * Navigate to a new URL path within the SPA.
 * Updates browser history and renders the matching view.
 * Views use this after API calls (e.g. after creating a resume).
 *
 * @param {string} strPath - e.g. "/builder/5"
 */
export function navigate(strPath) {
    history.pushState(null, "", strPath);
    renderView(strPath, true);
}

// ============================================================
// Link click interception
// ============================================================

// Handle all clicks on the document. If the click is on (or inside) an
// element with [data-spa], intercept it and use the SPA router instead of
// a full page load. This allows regular <a href="/..." data-spa> links.
document.addEventListener("click", (objEvent) => {
    // Walk up the DOM tree from the click target to find an <a data-spa>
    let elTarget = objEvent.target;
    while (elTarget && elTarget !== document) {
        if (elTarget.tagName === "A" && elTarget.hasAttribute("data-spa")) {
            break;
        }
        elTarget = elTarget.parentElement;
    }

    if (!elTarget || elTarget === document) return; // Not a SPA link

    // Let modified clicks (Ctrl+click, middle-click, etc.) open in a new tab normally
    if (
        objEvent.metaKey ||
        objEvent.ctrlKey ||
        objEvent.shiftKey ||
        objEvent.altKey
    )
        return;
    if (objEvent.button !== 0) return; // Not a left click

    objEvent.preventDefault();

    const strHref = elTarget.getAttribute("href");
    if (!strHref) return;

    // Don't push state if already on that path
    if (window.location.pathname === strHref) return;

    navigate(strHref);
});

// ============================================================
// Browser back/forward (popstate)
// ============================================================

window.addEventListener("popstate", () => {
    renderView(window.location.pathname, true);
});

// ============================================================
// Initial render on page load
// ============================================================

// When the page first loads render the current URL path (handles deep links
// and refreshes thanks to the Express catch-all returning index.html).
renderView(window.location.pathname);
