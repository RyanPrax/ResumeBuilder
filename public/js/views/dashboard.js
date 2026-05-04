// AI: Generated with Claude Code — Dashboard view for ResumeBuilder.
// Renders the list of saved resumes with Open Builder / Preview / Delete actions.
// Includes a "New Resume" modal and an "Edit Profile Data" link.

import { getResumes, postResume, deleteResume } from "/js/api.js";
import { navigate } from "/js/app.js";
import { showError, showSuccess, confirmDelete } from "/js/components/form-helpers.js";

// ============================================================
// Main render function — called by app.js router
// ============================================================

/**
 * Render the dashboard view into #view-root.
 * @param {Record<string,string>} _objParams - no params for this route
 */
export async function render(_objParams) {
    const elRoot = document.getElementById("view-root");

    // Build the page skeleton
    elRoot.innerHTML = "";

    // Page heading + action bar
    const elHeader = document.createElement("div");
    elHeader.className = "d-flex justify-content-between align-items-center mb-4";

    const elH1 = document.createElement("h1");
    elH1.className = "h3 mb-0";
    elH1.textContent = "Dashboard";

    const elActions = document.createElement("div");
    elActions.className = "d-flex gap-2";

    // "Edit Profile Data" navigates to the contact tab
    const elProfileLink = document.createElement("a");
    elProfileLink.href = "/profile/contact";
    elProfileLink.setAttribute("data-spa", "");
    elProfileLink.className = "btn btn-outline-secondary";
    elProfileLink.textContent = "Edit Profile Data";

    // "New Resume" opens the creation modal
    const elNewBtn = document.createElement("button");
    elNewBtn.type = "button";
    elNewBtn.id = "btnNewResume";
    elNewBtn.className = "btn btn-primary";
    elNewBtn.textContent = "New Resume";
    elNewBtn.setAttribute("aria-label", "Create a new resume");

    elActions.appendChild(elProfileLink);
    elActions.appendChild(elNewBtn);
    elHeader.appendChild(elH1);
    elHeader.appendChild(elActions);
    elRoot.appendChild(elHeader);

    // Container for the resume list (or empty state)
    const elListSection = document.createElement("section");
    elListSection.setAttribute("aria-label", "Saved resumes");
    elRoot.appendChild(elListSection);

    // Load and render the resume list
    await loadResumeList(elListSection);

    // Wire up the New Resume button
    elNewBtn.addEventListener("click", () => openNewResumeModal(elListSection));
}

// ============================================================
// Resume list loader
// ============================================================

/**
 * Fetch the list of resumes and render them into the given section element.
 * Can be called again after mutations to refresh the list.
 *
 * @param {HTMLElement} elSection
 */
async function loadResumeList(elSection) {
    // Clear previous content
    elSection.innerHTML = "";

    // Show a loading indicator while fetching
    const elSpinner = document.createElement("div");
    elSpinner.className = "d-flex justify-content-center py-4";
    elSpinner.innerHTML = `<div class="spinner-border text-secondary" role="status" aria-label="Loading resumes"><span class="visually-hidden">Loading…</span></div>`;
    elSection.appendChild(elSpinner);

    let arrResumes;
    try {
        arrResumes = await getResumes();
    } catch (err) {
        elSection.innerHTML = "";
        showError(elSection, `Failed to load resumes: ${err.message}`);
        return;
    }

    elSection.innerHTML = "";

    if (arrResumes.length === 0) {
        // Empty state — guide the user to create their first resume
        const elEmpty = document.createElement("div");
        elEmpty.className = "text-center py-5 text-muted";
        const elIcon = document.createElement("p");
        elIcon.className = "fs-1";
        elIcon.setAttribute("aria-hidden", "true");
        elIcon.textContent = "📄";
        const elMsg = document.createElement("p");
        elMsg.textContent = "No resumes yet. Click “New Resume” to get started.";
        elEmpty.appendChild(elIcon);
        elEmpty.appendChild(elMsg);
        elSection.appendChild(elEmpty);
        return;
    }

    // Render each resume as a Bootstrap card
    const elGrid = document.createElement("div");
    elGrid.className = "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3";

    arrResumes.forEach((objResume) => {
        const elCol = document.createElement("div");
        elCol.className = "col";
        elCol.appendChild(buildResumeCard(objResume, elSection));
        elGrid.appendChild(elCol);
    });

    elSection.appendChild(elGrid);
}

// ============================================================
// Resume card builder
// ============================================================

/**
 * Build a Bootstrap card for a single resume row.
 *
 * @param {{ id: number, name: string, target_role: string, created_at: string }} objResume
 * @param {HTMLElement} elSection - passed so delete can refresh the list
 * @returns {HTMLDivElement}
 */
function buildResumeCard(objResume, elSection) {
    const elCard = document.createElement("div");
    elCard.className = "card h-100 shadow-sm";

    const elBody = document.createElement("div");
    elBody.className = "card-body";

    // Resume name — safe via textContent
    const elName = document.createElement("h2");
    elName.className = "card-title h5";
    elName.textContent = objResume.name;

    // Target role
    const elRole = document.createElement("p");
    elRole.className = "card-text text-muted mb-1";
    const elRoleLabel = document.createElement("small");
    elRoleLabel.textContent = objResume.target_role ? `Target: ${objResume.target_role}` : "No target role set";
    elRole.appendChild(elRoleLabel);

    // Created date
    const elDate = document.createElement("p");
    elDate.className = "card-text";
    const elDateSmall = document.createElement("small");
    elDateSmall.className = "text-muted";
    // Format the ISO timestamp into a readable date
    const dtCreated = new Date(objResume.created_at);
    elDateSmall.textContent = `Created: ${dtCreated.toLocaleDateString()}`;
    elDate.appendChild(elDateSmall);

    elBody.appendChild(elName);
    elBody.appendChild(elRole);
    elBody.appendChild(elDate);

    // Card footer with action buttons
    const elFooter = document.createElement("div");
    elFooter.className = "card-footer d-flex gap-2 flex-wrap";

    // Open Builder button
    const elBuilderBtn = document.createElement("a");
    elBuilderBtn.href = `/builder/${objResume.id}`;
    elBuilderBtn.setAttribute("data-spa", "");
    elBuilderBtn.className = "btn btn-sm btn-primary";
    elBuilderBtn.textContent = "Open Builder";
    elBuilderBtn.setAttribute("aria-label", `Open builder for ${objResume.name}`);

    // Preview button
    const elPreviewBtn = document.createElement("a");
    elPreviewBtn.href = `/preview/${objResume.id}`;
    elPreviewBtn.setAttribute("data-spa", "");
    elPreviewBtn.className = "btn btn-sm btn-outline-secondary";
    elPreviewBtn.textContent = "Preview";
    elPreviewBtn.setAttribute("aria-label", `Preview ${objResume.name}`);

    // Delete button
    const elDeleteBtn = document.createElement("button");
    elDeleteBtn.type = "button";
    elDeleteBtn.className = "btn btn-sm btn-outline-danger ms-auto";
    elDeleteBtn.textContent = "Delete";
    elDeleteBtn.setAttribute("aria-label", `Delete resume ${objResume.name}`);
    elDeleteBtn.addEventListener("click", async () => {
        // Ask user to confirm before deleting
        const blnConfirmed = await confirmDelete(objResume.name);
        if (!blnConfirmed) return;

        try {
            await deleteResume(objResume.id);
            showSuccess(`"${objResume.name}" deleted.`);
            // Refresh the list after successful deletion
            await loadResumeList(elSection);
        } catch (err) {
            showError(elSection, `Failed to delete resume: ${err.message}`);
        }
    });

    elFooter.appendChild(elBuilderBtn);
    elFooter.appendChild(elPreviewBtn);
    elFooter.appendChild(elDeleteBtn);

    elCard.appendChild(elBody);
    elCard.appendChild(elFooter);
    return elCard;
}

// ============================================================
// New Resume modal
// ============================================================

/**
 * Open a Bootstrap modal with a form to create a new resume.
 * On submit, POSTs to the API and navigates to the builder.
 *
 * @param {HTMLElement} elSection - passed so we can refresh on success
 */
function openNewResumeModal(_elSection) {
    // Remove any existing modal to prevent duplicates
    const elOld = document.getElementById("newResumeModal");
    if (elOld) elOld.remove();

    // Build modal structure with DOM methods
    const elModal = document.createElement("div");
    elModal.id = "newResumeModal";
    elModal.className = "modal fade";
    elModal.setAttribute("tabindex", "-1");
    elModal.setAttribute("aria-modal", "true");
    elModal.setAttribute("role", "dialog");
    elModal.setAttribute("aria-labelledby", "newResumeModalLabel");

    elModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title h5" id="newResumeModalLabel">New Resume</h2>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="newResumeForm" novalidate>
                        <div class="mb-3">
                            <label for="resumeName" class="form-label">Resume Name <span aria-hidden="true" class="text-danger">*</span></label>
                            <input
                                type="text"
                                id="resumeName"
                                name="name"
                                class="form-control"
                                required
                                aria-required="true"
                                placeholder="e.g. Software Engineer Resume"
                                autocomplete="off"
                            />
                        </div>
                        <div class="mb-3">
                            <label for="resumeTargetRole" class="form-label">Target Role</label>
                            <input
                                type="text"
                                id="resumeTargetRole"
                                name="target_role"
                                class="form-control"
                                placeholder="e.g. Senior Frontend Developer"
                                autocomplete="off"
                            />
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" form="newResumeForm" class="btn btn-primary">Create Resume</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(elModal);

    const objModal = new bootstrap.Modal(elModal, { backdrop: "static" });
    objModal.show();

    // Focus the name field when modal opens for immediate keyboard entry
    elModal.addEventListener("shown.bs.modal", () => {
        document.getElementById("resumeName").focus();
    });

    // Handle form submission
    const elForm = document.getElementById("newResumeForm");
    elForm.addEventListener("submit", async (objEvent) => {
        objEvent.preventDefault();
        clearModalError(elModal);

        const strName = document.getElementById("resumeName").value.trim();
        const strTargetRole = document.getElementById("resumeTargetRole").value.trim();

        if (!strName) {
            showModalError(elModal, "Resume name is required.");
            document.getElementById("resumeName").focus();
            return;
        }

        // Disable the submit button during the API call
        const elSubmitBtn = elModal.querySelector("button[type='submit']");
        elSubmitBtn.disabled = true;
        elSubmitBtn.textContent = "Creating…";

        try {
            const objResult = await postResume({ name: strName, target_role: strTargetRole });
            objModal.hide();
            // Navigate to the builder for the newly created resume
            navigate(`/builder/${objResult.id}`);
        } catch (err) {
            showModalError(elModal, err.message);
            elSubmitBtn.disabled = false;
            elSubmitBtn.textContent = "Create Resume";
        }
    });

    // Clean up modal DOM after it fully hides
    elModal.addEventListener("hidden.bs.modal", () => elModal.remove(), { once: true });
}

/**
 * Show an error message inside the modal body.
 * @param {HTMLElement} elModal
 * @param {string} strMsg
 */
function showModalError(elModal, strMsg) {
    clearModalError(elModal);
    const elAlert = document.createElement("div");
    elAlert.className = "alert alert-danger mt-2 modal-error";
    elAlert.setAttribute("role", "alert");
    elAlert.textContent = strMsg;
    elModal.querySelector(".modal-body").appendChild(elAlert);
}

/**
 * Remove any previously displayed modal error.
 * @param {HTMLElement} elModal
 */
function clearModalError(elModal) {
    const elErr = elModal.querySelector(".modal-error");
    if (elErr) elErr.remove();
}
