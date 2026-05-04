// AI: Generated with Claude Code — AI review button + suggestion popover component.
// Attaches a "Review with AI" button next to prose textareas.
// POSTs to /api/ai/review and displays suggestions in a Bootstrap popover.
// If GEMINI_API_KEY is missing the server returns 400; we surface that gracefully.

import { postAiReview } from "/js/api.js";

// ============================================================
// Navigation cleanup
// ============================================================

// Close all open AI popovers (and re-enable their buttons) whenever the SPA
// navigates to a new view. app.js dispatches this event inside renderView.
document.addEventListener("resume-frog:navigate", () => {
    closeAllAiPopovers();
});

// ============================================================
// Main exported functions
// ============================================================

/**
 * Create a "Review with AI" button wired to the given input/textarea.
 * Does NOT insert the button into the DOM — the caller decides placement.
 * The button is disabled while its popover is visible and re-enabled when dismissed.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} elInput - the field whose text will be reviewed
 * @param {string} strSectionType - e.g. "summary", "jobs" — passed to the API
 * @returns {HTMLButtonElement}
 */
export function createAiReviewButton(elInput, strSectionType) {
    const elBtn = document.createElement("button");
    elBtn.type = "button";
    elBtn.className = "btn btn-sm btn-outline-primary";
    elBtn.textContent = "Review with AI";
    elBtn.setAttribute(
        "aria-label",
        "Review this text with AI and show suggestions",
    );

    elBtn.addEventListener("click", async () => {
        const strText = elInput.value.trim();

        // Disable for all paths that show a popover (re-enabled on hidden.bs.popover)
        elBtn.disabled = true;

        if (!strText) {
            showPopover(
                elBtn,
                "Please enter some text first before requesting a review.",
                false,
            );
            elBtn.addEventListener(
                "hidden.bs.popover",
                () => {
                    elBtn.disabled = false;
                },
                { once: true },
            );
            return;
        }

        elBtn.setAttribute("aria-busy", "true");
        const strOrigText = elBtn.textContent;
        elBtn.textContent = "Reviewing…";

        try {
            const objResult = await postAiReview(strSectionType, strText);
            // The API returns { suggestions: string[] }
            const arrSuggestions = objResult.suggestions ?? [];
            if (arrSuggestions.length === 0) {
                showPopover(
                    elBtn,
                    "No suggestions returned. The text looks good!",
                    false,
                );
            } else {
                showPopover(elBtn, arrSuggestions, true);
            }
        } catch (err) {
            // Surface the server's error message (e.g. missing API key)
            showPopover(
                elBtn,
                err.message ?? "AI review failed. Please try again.",
                false,
            );
        } finally {
            elBtn.removeAttribute("aria-busy");
            elBtn.textContent = strOrigText;
            // Re-enable once the popover is dismissed (or on navigation via closeAllAiPopovers)
            elBtn.addEventListener(
                "hidden.bs.popover",
                () => {
                    elBtn.disabled = false;
                },
                { once: true },
            );
        }
    });

    return elBtn;
}

/**
 * Attach a "Review with AI" button immediately after the given textarea.
 * Uses createAiReviewButton internally; adds mt-1 for block-level placement.
 *
 * @param {HTMLTextAreaElement} elTextarea - the prose textarea to review
 * @param {string} strSectionType - e.g. "summary", "jobs"
 */
export function attachAiReview(elTextarea, strSectionType) {
    const elBtn = createAiReviewButton(elTextarea, strSectionType);
    elBtn.classList.add("mt-1");
    elTextarea.insertAdjacentElement("afterend", elBtn);
}

// ============================================================
// Popover helper
// ============================================================

// Tracks all currently visible AI popovers so we can close stale ones
// when a new review is triggered on a different field, or on navigation.
const arrActivePopovers = [];

/**
 * Hide and clean up all currently open AI review popovers.
 * Calling hide() fires hidden.bs.popover on each anchor, which re-enables
 * the corresponding button via the once listener added in createAiReviewButton.
 */
function closeAllAiPopovers() {
    // Iterate a copy since hiding may trigger splice inside hidden.bs.popover listener
    [...arrActivePopovers].forEach((objPop) => {
        try {
            objPop.hide();
        } catch {
            /* already disposed — ignore */
        }
    });
    // Clear immediately in case hidden.bs.popover doesn't fire (e.g. anchor removed from DOM)
    arrActivePopovers.length = 0;
}

/**
 * Show a Bootstrap popover on the given element.
 * Closes any other open AI popovers first so only one is visible at a time.
 * Persists until the user clicks the Dismiss button — no click-outside dismissal.
 *
 * @param {HTMLElement} elAnchor - element to anchor the popover to
 * @param {string | string[]} content - plain text message, or array of suggestion strings
 * @param {boolean} blnIsList - true → render content as a bulleted list
 */
function showPopover(elAnchor, content, blnIsList) {
    // Close any other open AI review popovers
    closeAllAiPopovers();

    // Destroy any existing popover on this same anchor so we start fresh
    const elExisting = bootstrap.Popover.getInstance(elAnchor);
    if (elExisting) elExisting.dispose();

    // Build safe HTML content using DOM methods (no user content in innerHTML)
    let strHtmlContent;
    if (blnIsList && Array.isArray(content)) {
        // Build a <ul> of suggestion items — safe because we use textContent
        const elUl = document.createElement("ul");
        elUl.className = "ps-3 mb-0";
        content.forEach((strSuggestion) => {
            const elLi = document.createElement("li");
            elLi.textContent = strSuggestion;
            elUl.appendChild(elLi);
        });
        // outerHTML is safe here — content was set with textContent, not user-injected HTML
        strHtmlContent = elUl.outerHTML;
    } else {
        // Plain text — escape via a temporary text node
        const elSpan = document.createElement("span");
        elSpan.textContent =
            typeof content === "string" ? content : content.join(" ");
        strHtmlContent = elSpan.outerHTML;
    }

    // Add a dismiss button at the bottom of the popover body
    strHtmlContent += `<div class="mt-2 text-end"><button type="button" class="btn btn-sm btn-secondary ai-popover-dismiss" aria-label="Dismiss AI suggestions">Dismiss</button></div>`;

    const objPopover = new bootstrap.Popover(elAnchor, {
        content: strHtmlContent,
        html: true,
        trigger: "manual",
        // Always place below the button (which sits after the textarea) so the
        // popover never overlaps the text being reviewed. Flip disabled to
        // prevent Bootstrap from reversing direction when near the viewport bottom.
        placement: "bottom",
        sanitize: false, // We built the HTML safely above using DOM APIs
        title: "AI Suggestions",
        popperConfig: {
            modifiers: [{ name: "flip", enabled: false }],
        },
    });

    objPopover.show();
    arrActivePopovers.push(objPopover);

    // Wire the dismiss button inside the popover (it's added to the DOM by Bootstrap)
    // Use a brief timeout to wait for the popover DOM to be ready
    setTimeout(() => {
        const elTip = document.querySelector(".popover");
        if (!elTip) return;
        const elDismiss = elTip.querySelector(".ai-popover-dismiss");
        if (elDismiss) {
            elDismiss.addEventListener("click", () => {
                objPopover.hide();
            });
        }
    }, 50);

    // Remove from tracking array when hidden so memory doesn't accumulate
    elAnchor.addEventListener(
        "hidden.bs.popover",
        () => {
            const intIdx = arrActivePopovers.indexOf(objPopover);
            if (intIdx !== -1) arrActivePopovers.splice(intIdx, 1);
        },
        { once: true },
    );
}
