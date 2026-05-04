// AI: Generated with Claude Code — reusable form utility functions for Resume Frog views.
// These helpers reduce boilerplate across profile tabs: reading values, filling forms,
// showing validation errors, and building confirm-delete dialogs.

// ============================================================
// Form value extraction
// ============================================================

/**
 * Read all named inputs/textareas/selects inside a form element and
 * return a plain object keyed by element name.
 * Checkboxes return 0 or 1 (integers) to match the SQLite schema.
 *
 * @param {HTMLFormElement} elForm
 * @returns {Record<string, string|number>}
 */
export function readForm(elForm) {
    const objData = {};
    // querySelectorAll returns all form controls with a name attribute
    const arrInputs = elForm.querySelectorAll(
        "input[name], textarea[name], select[name]",
    );
    arrInputs.forEach((elInput) => {
        const strName = elInput.getAttribute("name");
        if (elInput.type === "checkbox") {
            // Convert boolean checked state to integer for SQLite compatibility
            objData[strName] = elInput.checked ? 1 : 0;
        } else {
            objData[strName] = elInput.value;
        }
    });
    return objData;
}

// ============================================================
// Form population
// ============================================================

/**
 * Fill a form's inputs with values from a data object.
 * Keys in objData should match the `name` attribute of each input.
 * Checkboxes are set via .checked based on truthy/falsy value.
 *
 * @param {HTMLFormElement} elForm
 * @param {Record<string, any>} objData
 */
export function fillForm(elForm, objData) {
    Object.entries(objData).forEach(([strKey, strValue]) => {
        // querySelector scoped to the form finds the matching input
        const elInput = elForm.querySelector(`[name="${strKey}"]`);
        if (!elInput) return;
        if (elInput.type === "checkbox") {
            elInput.checked = Boolean(strValue);
        } else {
            elInput.value = strValue ?? "";
        }
    });
}

// ============================================================
// Validation error display
// ============================================================

/**
 * Show an error alert inside a container element.
 * Uses Bootstrap alert styles. Clears any existing error first.
 *
 * @param {HTMLElement} elContainer - parent element to prepend the alert into
 * @param {string} strMessage
 */
export function showError(elContainer, strMessage) {
    // Remove any existing error alert inside the container
    const elExisting = elContainer.querySelector(".js-form-error");
    if (elExisting) elExisting.remove();

    const elAlert = document.createElement("div");
    elAlert.className =
        "alert alert-danger alert-dismissible fade show js-form-error";
    elAlert.setAttribute("role", "alert");

    // Use textContent so the message can't inject HTML (XSS prevention)
    const elText = document.createElement("span");
    elText.textContent = strMessage;
    elAlert.appendChild(elText);

    // Dismiss button
    const elBtn = document.createElement("button");
    elBtn.type = "button";
    elBtn.className = "btn-close";
    elBtn.setAttribute("data-bs-dismiss", "alert");
    elBtn.setAttribute("aria-label", "Dismiss error");
    elAlert.appendChild(elBtn);

    // Prepend so the error appears at the top of the container
    elContainer.prepend(elAlert);
}

/**
 * Clear all error alerts inside a container.
 *
 * @param {HTMLElement} elContainer
 */
export function clearErrors(elContainer) {
    elContainer.querySelectorAll(".js-form-error").forEach((el) => el.remove());
}

// ============================================================
// Success / info toasts
// ============================================================

/**
 * Show a transient success message that auto-dismisses after 3 seconds.
 * Appended to document.body so it floats above content.
 *
 * @param {string} strMessage
 */
export function showSuccess(strMessage) {
    // Build a Bootstrap toast container if one doesn't exist yet
    let elContainer = document.getElementById("toast-container");
    if (!elContainer) {
        elContainer = document.createElement("div");
        elContainer.id = "toast-container";
        elContainer.className =
            "toast-container position-fixed bottom-0 end-0 p-3";
        elContainer.setAttribute("aria-live", "polite");
        elContainer.setAttribute("aria-atomic", "true");
        document.body.appendChild(elContainer);
    }

    const elToast = document.createElement("div");
    elToast.className = "toast align-items-center text-bg-success border-0";
    elToast.setAttribute("role", "status");
    elToast.setAttribute("aria-live", "polite");

    const elBody = document.createElement("div");
    elBody.className = "d-flex";
    const elMsg = document.createElement("div");
    elMsg.className = "toast-body";
    elMsg.textContent = strMessage;
    const elClose = document.createElement("button");
    elClose.type = "button";
    elClose.className = "btn-close btn-close-white me-2 m-auto";
    elClose.setAttribute("data-bs-dismiss", "toast");
    elClose.setAttribute("aria-label", "Close");
    elBody.appendChild(elMsg);
    elBody.appendChild(elClose);
    elToast.appendChild(elBody);
    elContainer.appendChild(elToast);

    // Use Bootstrap's Toast API to show and auto-hide after 3 s
    // bootstrap is loaded globally from the vendored bundle
    const objToast = new bootstrap.Toast(elToast, { delay: 3000 });
    objToast.show();

    // Remove the DOM element after it hides to avoid accumulation
    elToast.addEventListener("hidden.bs.toast", () => elToast.remove());
}

// ============================================================
// Confirm-delete dialog
// ============================================================

/**
 * Show a Bootstrap modal asking the user to confirm a delete action.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * @param {string} strItemLabel - human-readable name of the item being deleted
 * @returns {Promise<boolean>}
 */
export function confirmDelete(strItemLabel) {
    return new Promise((resolve) => {
        // Check if a modal already exists and remove it to avoid duplicate IDs
        const elOld = document.getElementById("confirmDeleteModal");
        if (elOld) elOld.remove();

        // Build the modal HTML using DOM construction (no innerHTML with user data)
        const elModal = document.createElement("div");
        elModal.id = "confirmDeleteModal";
        elModal.className = "modal fade";
        elModal.setAttribute("tabindex", "-1");
        elModal.setAttribute("aria-modal", "true");
        elModal.setAttribute("role", "dialog");
        elModal.setAttribute("aria-labelledby", "confirmDeleteModalLabel");

        const elDialog = document.createElement("div");
        elDialog.className = "modal-dialog modal-dialog-centered";

        const elContent = document.createElement("div");
        elContent.className = "modal-content";

        // Header
        const elHeader = document.createElement("div");
        elHeader.className = "modal-header";
        const elTitle = document.createElement("h2");
        elTitle.className = "modal-title h5";
        elTitle.id = "confirmDeleteModalLabel";
        elTitle.textContent = "Confirm Delete";
        const elCloseBtn = document.createElement("button");
        elCloseBtn.type = "button";
        elCloseBtn.className = "btn-close";
        elCloseBtn.setAttribute("data-bs-dismiss", "modal");
        elCloseBtn.setAttribute("aria-label", "Cancel delete");
        elHeader.appendChild(elTitle);
        elHeader.appendChild(elCloseBtn);

        // Body
        const elBody = document.createElement("div");
        elBody.className = "modal-body";
        const elPara = document.createElement("p");
        elPara.textContent = "Are you sure you want to delete ";
        const elStrong = document.createElement("strong");
        elStrong.textContent = strItemLabel; // textContent is safe — no XSS risk
        elPara.appendChild(elStrong);
        elPara.append("? This cannot be undone.");
        elBody.appendChild(elPara);

        // Footer
        const elFooter = document.createElement("div");
        elFooter.className = "modal-footer";
        const elCancelBtn = document.createElement("button");
        elCancelBtn.type = "button";
        elCancelBtn.className = "btn btn-secondary";
        elCancelBtn.setAttribute("data-bs-dismiss", "modal");
        elCancelBtn.textContent = "Cancel";
        const elDeleteBtn = document.createElement("button");
        elDeleteBtn.type = "button";
        elDeleteBtn.className = "btn btn-danger";
        elDeleteBtn.id = "confirmDeleteBtn";
        elDeleteBtn.textContent = "Delete";
        elFooter.appendChild(elCancelBtn);
        elFooter.appendChild(elDeleteBtn);

        // Assemble
        elContent.appendChild(elHeader);
        elContent.appendChild(elBody);
        elContent.appendChild(elFooter);
        elDialog.appendChild(elContent);
        elModal.appendChild(elDialog);
        document.body.appendChild(elModal);

        // Show via Bootstrap Modal API
        const objModal = new bootstrap.Modal(elModal, { backdrop: "static" });
        objModal.show();

        // Move focus to Delete button when modal opens (accessibility)
        elModal.addEventListener("shown.bs.modal", () => {
            elDeleteBtn.focus();
        });

        // Track whether the delete button was actually clicked
        let blnConfirmed = false;

        elDeleteBtn.addEventListener("click", () => {
            blnConfirmed = true;
            objModal.hide();
        });

        elModal.addEventListener(
            "hidden.bs.modal",
            () => {
                elModal.remove();
                resolve(blnConfirmed);
            },
            { once: true },
        );
    });
}

// ============================================================
// List item builder
// ============================================================

/**
 * Build a Bootstrap list-group item with label text and Edit/Delete buttons.
 * The caller provides callback functions for edit and delete actions.
 *
 * @param {string} strLabel - text to display
 * @param {Function} fnOnEdit - called when Edit is clicked
 * @param {Function} fnOnDelete - called when Delete is clicked
 * @returns {HTMLLIElement}
 */
export function buildListItem(strLabel, fnOnEdit, fnOnDelete) {
    const elLi = document.createElement("li");
    elLi.className =
        "list-group-item d-flex justify-content-between align-items-center";

    // Text node for the label — safe, uses textContent via DOM
    const elSpan = document.createElement("span");
    elSpan.textContent = strLabel;

    // Action buttons grouped together
    const elBtns = document.createElement("div");
    elBtns.className = "btn-group btn-group-sm";
    elBtns.setAttribute("role", "group");
    elBtns.setAttribute("aria-label", `Actions for ${strLabel}`);

    const elEditBtn = document.createElement("button");
    elEditBtn.type = "button";
    elEditBtn.className = "btn btn-outline-secondary";
    elEditBtn.textContent = "Edit";
    elEditBtn.setAttribute("aria-label", `Edit ${strLabel}`);
    elEditBtn.addEventListener("click", fnOnEdit);

    const elDelBtn = document.createElement("button");
    elDelBtn.type = "button";
    elDelBtn.className = "btn btn-outline-danger";
    elDelBtn.textContent = "Delete";
    elDelBtn.setAttribute("aria-label", `Delete ${strLabel}`);
    elDelBtn.addEventListener("click", fnOnDelete);

    elBtns.appendChild(elEditBtn);
    elBtns.appendChild(elDelBtn);
    elLi.appendChild(elSpan);
    elLi.appendChild(elBtns);
    return elLi;
}

/**
 * Disable all submit buttons inside a form during async submission
 * to prevent double-submits. Returns a function to re-enable them.
 *
 * @param {HTMLFormElement} elForm
 * @returns {Function} - call to restore buttons
 */
export function disableSubmit(elForm) {
    const arrBtns = [...elForm.querySelectorAll("button[type='submit']")];
    arrBtns.forEach((el) => {
        el.disabled = true;
        el.setAttribute("aria-busy", "true");
    });
    return () => {
        arrBtns.forEach((el) => {
            el.disabled = false;
            el.removeAttribute("aria-busy");
        });
    };
}
