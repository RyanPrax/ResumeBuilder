// AI: Generated with Claude Code — Settings view for Resume Frog.
// Renders app-level settings: Gemini API key management.

import { getApiKeyStatus, putApiKey, deleteApiKey } from "/js/api.js";

// ============================================================
// Main render function — called by app.js router
// ============================================================

/**
 * Render the settings view.
 * @param {object} _objParams - unused; settings has no URL params
 */
export async function render(_objParams) {
    const elRoot = document.getElementById("view-root");
    elRoot.innerHTML = "";

    const elH1 = document.createElement("h1");
    elH1.className = "h3 mb-4";
    elH1.textContent = "Settings";
    elRoot.appendChild(elH1);

    // ---- Gemini API Key section ----
    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", "Gemini API key settings");

    const elH2 = document.createElement("h2");
    elH2.className = "h5 mb-1";
    elH2.textContent = "Gemini API Key";
    elSection.appendChild(elH2);

    const elDesc = document.createElement("p");
    elDesc.className = "text-muted small mb-3";
    elDesc.textContent = "Paste your Gemini API key to enable AI-powered resume review. The stored key takes priority over any key set in the server .env file. The key is stored locally in the app database and never transmitted anywhere except directly to the Gemini API.";
    elSection.appendChild(elDesc);

    // Status badge row
    const elStatusRow = document.createElement("div");
    elStatusRow.className = "d-flex align-items-center gap-2 mb-3";
    const elStatusLabel = document.createElement("span");
    elStatusLabel.className = "fw-semibold";
    elStatusLabel.textContent = "Status:";
    const elBadge = document.createElement("span");
    elBadge.className = "badge bg-secondary";
    elBadge.textContent = "Checking…";
    elBadge.setAttribute("aria-live", "polite");
    elStatusRow.appendChild(elStatusLabel);
    elStatusRow.appendChild(elBadge);
    elSection.appendChild(elStatusRow);

    // Key input card
    const elCard = document.createElement("div");
    elCard.className = "card";
    const elCardBody = document.createElement("div");
    elCardBody.className = "card-body";

    // Input group
    const elFormGroup = document.createElement("div");
    elFormGroup.className = "mb-3";
    const elLabel = document.createElement("label");
    elLabel.setAttribute("for", "settingsApiKeyInput");
    elLabel.className = "form-label";
    elLabel.textContent = "API Key";
    const elInputGroup = document.createElement("div");
    elInputGroup.className = "input-group";
    const elInput = document.createElement("input");
    elInput.type = "password";
    elInput.id = "settingsApiKeyInput";
    elInput.className = "form-control";
    elInput.placeholder = "Paste your Gemini API key here…";
    elInput.setAttribute("aria-label", "Gemini API key");
    elInput.setAttribute("autocomplete", "off");
    elInput.setAttribute("aria-required", "true");
    const elSaveBtn = document.createElement("button");
    elSaveBtn.type = "button";
    elSaveBtn.className = "btn btn-primary";
    elSaveBtn.textContent = "Save Key";
    elSaveBtn.setAttribute("aria-label", "Save Gemini API key");
    elInputGroup.appendChild(elInput);
    elInputGroup.appendChild(elSaveBtn);
    elFormGroup.appendChild(elLabel);
    elFormGroup.appendChild(elInputGroup);
    elCardBody.appendChild(elFormGroup);

    // Feedback message
    const elMsg = document.createElement("div");
    elMsg.setAttribute("aria-live", "polite");
    elCardBody.appendChild(elMsg);

    // Clear key button — shown only when a key is stored
    const elClearBtn = document.createElement("button");
    elClearBtn.type = "button";
    elClearBtn.className = "btn btn-outline-danger btn-sm mt-2";
    elClearBtn.textContent = "Clear Stored Key";
    elClearBtn.setAttribute("aria-label", "Clear stored Gemini API key");
    elClearBtn.disabled = true;
    elCardBody.appendChild(elClearBtn);

    elCard.appendChild(elCardBody);
    elSection.appendChild(elCard);
    elRoot.appendChild(elSection);

    // ---- Helper: refresh badge + clear button state ----
    const fnRefreshStatus = async () => {
        try {
            const arrStatus = await getApiKeyStatus();
            const blnHasKey = arrStatus[0]?.has_key ?? false;
            elBadge.textContent = blnHasKey ? "Key configured" : "No key stored";
            elBadge.className = `badge ${blnHasKey ? "bg-success" : "bg-warning text-dark"}`;
            elClearBtn.disabled = !blnHasKey;
        } catch {
            elBadge.textContent = "Error checking status";
            elBadge.className = "badge bg-danger";
        }
    };

    // ---- Helper: show a temporary feedback message ----
    const fnShowMsg = (strText, strType) => {
        elMsg.innerHTML = "";
        const elAlert = document.createElement("div");
        elAlert.className = `alert alert-${strType} py-2 mb-0`;
        elAlert.setAttribute("role", "alert");
        elAlert.textContent = strText;
        elMsg.appendChild(elAlert);
        setTimeout(() => { elMsg.innerHTML = ""; }, 4000);
    };

    // ---- Save handler ----
    elSaveBtn.addEventListener("click", async () => {
        const strKey = elInput.value.trim();
        if (!strKey) {
            fnShowMsg("Please enter an API key before saving.", "warning");
            return;
        }
        elSaveBtn.disabled = true;
        try {
            await putApiKey(strKey);
            elInput.value = "";
            fnShowMsg("API key saved successfully.", "success");
            await fnRefreshStatus();
        } catch (err) {
            fnShowMsg(err.message, "danger");
        } finally {
            elSaveBtn.disabled = false;
        }
    });

    // Submit on Enter in the input
    elInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); elSaveBtn.click(); }
    });

    // ---- Clear handler ----
    elClearBtn.addEventListener("click", async () => {
        elClearBtn.disabled = true;
        try {
            await deleteApiKey();
            fnShowMsg("Stored key cleared. The server .env key will be used as fallback.", "secondary");
            await fnRefreshStatus();
        } catch (err) {
            fnShowMsg(err.message, "danger");
            elClearBtn.disabled = false;
        }
    });

    // Load initial status
    await fnRefreshStatus();
}
