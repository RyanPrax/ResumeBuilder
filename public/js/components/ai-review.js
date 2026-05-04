// AI: Generated with Claude Code — AI review button + suggestion popover component.
// Attaches a "Review with AI" button next to prose textareas.
// POSTs to /api/ai/review and displays suggestions in a Bootstrap popover.
// If GEMINI_API_KEY is missing the server returns 400; we surface that gracefully.

import { postAiReview } from "/js/api.js";

// ============================================================
// Main exported function
// ============================================================

/**
 * Attach a "Review with AI" button immediately after the given textarea.
 * When clicked, sends the textarea's current value to /api/ai/review and
 * shows the suggestions in a dismissable popover anchored to the button.
 *
 * @param {HTMLTextAreaElement} elTextarea - the prose textarea to review
 * @param {string} strSectionType - e.g. "summary", "jobs" — passed to the API
 */
export function attachAiReview(elTextarea, strSectionType) {
    // Create the trigger button and insert it right after the textarea
    const elBtn = document.createElement("button");
    elBtn.type = "button";
    elBtn.className = "btn btn-sm btn-outline-primary mt-1";
    elBtn.textContent = "Review with AI";
    elBtn.setAttribute("aria-label", "Review this text with AI and show suggestions");

    // Insert after the textarea in the DOM
    elTextarea.insertAdjacentElement("afterend", elBtn);

    // --------------------------------------------------------
    // Click handler — calls API and shows popover
    // --------------------------------------------------------
    elBtn.addEventListener("click", async () => {
        const strText = elTextarea.value.trim();
        if (!strText) {
            // Nothing to review — show a brief inline note
            showPopover(elBtn, "Please enter some text first before requesting a review.", false);
            return;
        }

        // Show loading state on button while waiting for response
        elBtn.disabled = true;
        elBtn.setAttribute("aria-busy", "true");
        const strOrigText = elBtn.textContent;
        elBtn.textContent = "Reviewing…";

        try {
            const objResult = await postAiReview(strSectionType, strText);
            // The API returns { suggestions: string[] }
            const arrSuggestions = objResult.suggestions ?? [];
            if (arrSuggestions.length === 0) {
                showPopover(elBtn, "No suggestions returned. The text looks good!", false);
            } else {
                showPopover(elBtn, arrSuggestions, true);
            }
        } catch (err) {
            // Surface the server's error message (e.g. missing API key)
            showPopover(elBtn, err.message ?? "AI review failed. Please try again.", false);
        } finally {
            elBtn.disabled = false;
            elBtn.removeAttribute("aria-busy");
            elBtn.textContent = strOrigText;
        }
    });
}

// ============================================================
// Popover helper
// ============================================================

/**
 * Show a Bootstrap popover on the given element.
 * Destroys any previously open popover on the same element first.
 *
 * @param {HTMLElement} elAnchor - element to anchor the popover to
 * @param {string | string[]} content - plain text message, or array of suggestion strings
 * @param {boolean} blnIsList - true → render content as a bulleted list
 */
function showPopover(elAnchor, content, blnIsList) {
    // Destroy existing popover so clicks don't stack
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
        elSpan.textContent = typeof content === "string" ? content : content.join(" ");
        strHtmlContent = elSpan.outerHTML;
    }

    // Add a dismiss button at the bottom of the popover body
    strHtmlContent += `<div class="mt-2 text-end"><button type="button" class="btn btn-sm btn-secondary ai-popover-dismiss" aria-label="Dismiss AI suggestions">Dismiss</button></div>`;

    const objPopover = new bootstrap.Popover(elAnchor, {
        content: strHtmlContent,
        html: true,
        trigger: "manual",
        placement: "bottom",
        sanitize: false, // We built the HTML safely above using DOM APIs
        title: "AI Suggestions",
    });

    objPopover.show();

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

    // Also auto-dismiss when the user clicks outside the popover
    const fnClickOutside = (objEvent) => {
        if (!elAnchor.contains(objEvent.target) && !document.querySelector(".popover")?.contains(objEvent.target)) {
            objPopover.hide();
            document.removeEventListener("click", fnClickOutside);
        }
    };
    // Small delay so the current click that triggered the popover doesn't immediately close it
    setTimeout(() => document.addEventListener("click", fnClickOutside), 100);

    // Clean up the listener when the popover is hidden
    elAnchor.addEventListener("hidden.bs.popover", () => {
        document.removeEventListener("click", fnClickOutside);
    }, { once: true });
}
