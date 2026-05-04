// AI: Generated with Claude Code — Builder view for Resume Frog.
// Renders a checklist tree (sections → items → bullets) for assembling a resume
// from the user's profile library. Loads existing selections and saves them back
// via PUT /api/resumes/:id/selections.

import {
    getResume, putResume,
    getResumeSelections, putResumeSelections,
    getSummaries, getEducations,
    getJobs, getJobBullets,
    getProjects, getProjectBullets,
    getSkills, getSkillCategories,
    getCertifications, getAwards,
} from "/js/api.js";
import { navigate } from "/js/app.js";
import { showError, showSuccess } from "/js/components/form-helpers.js";

// Human-readable labels for each section type
const SECTION_LABELS = {
    contact:        "Contact Information",
    summary:        "Professional Summary",
    education:      "Education",
    jobs:           "Work Experience",
    projects:       "Projects",
    skills:         "Skills",
    certifications: "Certifications",
    awards:         "Awards & Honors",
};

// Fixed display order for sections — matches the profile tab order
const SECTION_ORDER = [
    "contact", "summary", "education", "jobs",
    "projects", "skills", "certifications", "awards",
];

// Maps section_type to the profile tab URL used in empty-state links
const SECTION_PROFILE_TAB = {
    summary:        "summary",
    education:      "education",
    jobs:           "jobs",
    projects:       "projects",
    skills:         "skills",
    certifications: "certs",
    awards:         "awards",
};

// ============================================================
// Main render function — called by app.js router
// ============================================================

/**
 * Render the builder view into #view-root.
 * @param {{ id: string }} objParams
 */
export async function render(objParams) {
    const intId = parseInt(objParams.id, 10);
    const elRoot = document.getElementById("view-root");
    elRoot.innerHTML = "";

    if (isNaN(intId)) {
        showError(elRoot, "Invalid resume ID.");
        return;
    }

    // Show a loading spinner while fetching all data
    const elSpinner = document.createElement("div");
    elSpinner.className = "d-flex justify-content-center py-5";
    elSpinner.innerHTML = `<div class="spinner-border text-primary" role="status" aria-label="Loading builder"><span class="visually-hidden">Loading…</span></div>`;
    elRoot.appendChild(elSpinner);

    try {
        // Load resume metadata first — bail out early if not found
        const arrResume = await getResume(intId);
        if (!arrResume || arrResume.length === 0) {
            elRoot.innerHTML = "";
            showError(elRoot, "Resume not found.");
            return;
        }
        const objResume = arrResume[0];

        // Load existing selections — defaults to empty arrays for a fresh resume
        let objSelections = { sections: [], items: [], bullets: [] };
        try {
            objSelections = await getResumeSelections(intId);
        } catch {
            // No selections saved yet — fresh resume, empty state is fine
        }

        // Load all profile library tables in parallel for speed
        const [
            arrSummaries,
            arrEducations,
            arrJobs,
            arrProjects,
            arrSkillCategories,
            arrSkills,
            arrCertifications,
            arrAwards,
        ] = await Promise.all([
            getSummaries(),
            getEducations(),
            getJobs(),
            getProjects(),
            getSkillCategories(),
            getSkills(),
            getCertifications(),
            getAwards(),
        ]);

        // Fetch all bullets for every job and project in parallel
        // Bullets are needed in the builder so users can select individual bullet points
        const arrJobsWithBullets = await Promise.all(
            arrJobs.map(async (objJob) => ({
                ...objJob,
                bullets: await getJobBullets(objJob.id),
            }))
        );
        const arrProjectsWithBullets = await Promise.all(
            arrProjects.map(async (objProject) => ({
                ...objProject,
                bullets: await getProjectBullets(objProject.id),
            }))
        );

        // Bundle library data for passing to the UI renderer
        const objLibrary = {
            summaries:      arrSummaries,
            educations:     arrEducations,
            jobs:           arrJobsWithBullets,
            projects:       arrProjectsWithBullets,
            skillCategories: arrSkillCategories,
            skills:         arrSkills,
            certifications: arrCertifications,
            awards:         arrAwards,
        };

        // Clear spinner and render the full builder UI
        elRoot.innerHTML = "";
        renderBuilderUI(elRoot, objResume, objLibrary, objSelections, intId);
    } catch (err) {
        console.error("Builder render error:", err);
        elRoot.innerHTML = "";
        showError(elRoot, `Failed to load builder: ${err.message}`);
    }
}

// ============================================================
// Main UI renderer — assembles all builder sections
// ============================================================

/**
 * Build and insert the complete builder UI into elRoot.
 *
 * @param {HTMLElement} elRoot
 * @param {object} objResume - resume row from DB (id, name, target_role)
 * @param {object} objLibrary - all library data keyed by section type
 * @param {object} objSelections - {sections, items, bullets} arrays from API
 * @param {number} intId - resume ID
 */
function renderBuilderUI(elRoot, objResume, objLibrary, objSelections, intId) {

    // ---- Page header row: title + navigation actions ----
    const elPageHeader = document.createElement("div");
    elPageHeader.className = "d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2";

    const elH1 = document.createElement("h1");
    elH1.className = "h3 mb-0";
    elH1.textContent = "Resume Builder";

    const elNavBtns = document.createElement("div");
    elNavBtns.className = "d-flex gap-2";

    const elDashLink = document.createElement("a");
    elDashLink.href = "/dashboard";
    elDashLink.setAttribute("data-spa", "");
    elDashLink.className = "btn btn-outline-secondary";
    elDashLink.textContent = "← Dashboard";

    const elPreviewLink = document.createElement("a");
    elPreviewLink.href = `/preview/${intId}`;
    elPreviewLink.setAttribute("data-spa", "");
    elPreviewLink.className = "btn btn-outline-primary";
    elPreviewLink.textContent = "Preview →";

    elNavBtns.appendChild(elDashLink);
    elNavBtns.appendChild(elPreviewLink);
    elPageHeader.appendChild(elH1);
    elPageHeader.appendChild(elNavBtns);
    elRoot.appendChild(elPageHeader);

    // ---- Resume metadata card: name + target role ----
    const elMetaCard = document.createElement("div");
    elMetaCard.className = "card mb-4";

    const elMetaBody = document.createElement("div");
    elMetaBody.className = "card-body";

    const elMetaTitle = document.createElement("h2");
    elMetaTitle.className = "card-title h5";
    elMetaTitle.textContent = "Resume Details";
    elMetaBody.appendChild(elMetaTitle);

    // Resume name field
    const elNameGroup = document.createElement("div");
    elNameGroup.className = "mb-3";
    const elNameLabel = document.createElement("label");
    elNameLabel.setAttribute("for", "builderResumeName");
    elNameLabel.className = "form-label";
    elNameLabel.textContent = "Resume Name";
    const elNameInput = document.createElement("input");
    elNameInput.type = "text";
    elNameInput.id = "builderResumeName";
    elNameInput.name = "name";
    elNameInput.className = "form-control";
    elNameInput.value = objResume.name;
    elNameInput.setAttribute("aria-required", "true");
    elNameInput.required = true;
    elNameGroup.appendChild(elNameLabel);
    elNameGroup.appendChild(elNameInput);

    // Target role field
    const elRoleGroup = document.createElement("div");
    elRoleGroup.className = "mb-3";
    const elRoleLabel = document.createElement("label");
    elRoleLabel.setAttribute("for", "builderTargetRole");
    elRoleLabel.className = "form-label";
    elRoleLabel.textContent = "Target Role";
    const elRoleInput = document.createElement("input");
    elRoleInput.type = "text";
    elRoleInput.id = "builderTargetRole";
    elRoleInput.name = "target_role";
    elRoleInput.className = "form-control";
    elRoleInput.value = objResume.target_role ?? "";
    elRoleInput.placeholder = "e.g. Software Engineer";
    elRoleGroup.appendChild(elRoleLabel);
    elRoleGroup.appendChild(elRoleInput);

    // Save details button — updates the resume row (name/target_role only)
    const elSaveMetaBtn = document.createElement("button");
    elSaveMetaBtn.type = "button";
    elSaveMetaBtn.className = "btn btn-secondary";
    elSaveMetaBtn.textContent = "Save Details";
    elSaveMetaBtn.setAttribute("aria-label", "Save resume name and target role");

    async function saveResumeDetails() {
        const strName = elNameInput.value.trim();
        const strRole = elRoleInput.value.trim();

        if (!strName) {
            showError(elMetaBody, "Resume name is required.");
            elNameInput.focus();
            return false;
        }

        await putResume(intId, { name: strName, target_role: strRole });
        return true;
    }

    elSaveMetaBtn.addEventListener("click", async () => {
        elSaveMetaBtn.disabled = true;
        elSaveMetaBtn.textContent = "Saving…";

        try {
            if (await saveResumeDetails()) {
                showSuccess("Resume details saved.");
            }
        } catch (err) {
            showError(elMetaBody, `Failed to save: ${err.message}`);
        } finally {
            elSaveMetaBtn.disabled = false;
            elSaveMetaBtn.textContent = "Save Details";
        }
    });

    elMetaBody.appendChild(elNameGroup);
    elMetaBody.appendChild(elRoleGroup);
    elMetaBody.appendChild(elSaveMetaBtn);
    elMetaCard.appendChild(elMetaBody);
    elRoot.appendChild(elMetaCard);

    // ---- Sections checklist card ----
    const elSectionsCard = document.createElement("div");
    elSectionsCard.className = "card mb-4";

    const elSectionsBody = document.createElement("div");
    elSectionsBody.className = "card-body";

    const elSectionsTitle = document.createElement("h2");
    elSectionsTitle.className = "card-title h5";
    elSectionsTitle.textContent = "Sections & Selections";

    const elSectionsHelp = document.createElement("p");
    elSectionsHelp.className = "text-muted small mb-3";
    elSectionsHelp.textContent = "Check sections to include them. For each section, choose which items to feature.";

    elSectionsBody.appendChild(elSectionsTitle);
    elSectionsBody.appendChild(elSectionsHelp);

    // Determine which sections are currently included.
    // If no sections have been saved yet (fresh resume), default all to included.
    const blnHasSavedSections = objSelections.sections.length > 0;
    const setSectionIncluded = new Set(
        blnHasSavedSections
            ? objSelections.sections.filter((s) => s.included === 1).map((s) => s.section_type)
            : SECTION_ORDER  // default: all sections on for a fresh resume
    );

    // Build quick-lookup sets for existing item and bullet selections
    const setSelectedItems = new Set(
        objSelections.items.map((i) => `${i.section_type}:${i.item_id}`)
    );
    const setSelectedBullets = new Set(
        objSelections.bullets.map((b) => `${b.bullet_type}:${b.parent_item_id}:${b.bullet_id}`)
    );

    // Build each section row and append to the checklist container
    const elSectionsList = document.createElement("div");
    elSectionsList.className = "d-flex flex-column gap-3";
    elSectionsList.id = "builderSectionsList";

    SECTION_ORDER.forEach((strSectionType) => {
        const elRow = buildSectionRow(
            strSectionType,
            setSectionIncluded.has(strSectionType),
            objLibrary,
            setSelectedItems,
            setSelectedBullets
        );
        elSectionsList.appendChild(elRow);
    });

    elSectionsBody.appendChild(elSectionsList);
    elSectionsCard.appendChild(elSectionsBody);
    elRoot.appendChild(elSectionsCard);

    // ---- Bottom action bar: Save Selections + Preview ----
    const elActionRow = document.createElement("div");
    elActionRow.className = "d-flex gap-2 justify-content-end mb-4";

    const elSaveBtn = document.createElement("button");
    elSaveBtn.type = "button";
    elSaveBtn.className = "btn btn-primary";
    elSaveBtn.textContent = "Save Selections";
    elSaveBtn.setAttribute("aria-label", "Save all section and item selections for this resume");

    elSaveBtn.addEventListener("click", async () => {
        elSaveBtn.disabled = true;
        elSaveBtn.textContent = "Saving…";
        try {
            await saveAllSelections(intId, elSectionsList);
            showSuccess("Selections saved.");
        } catch (err) {
            showError(elRoot, `Failed to save selections: ${err.message}`);
        } finally {
            elSaveBtn.disabled = false;
            elSaveBtn.textContent = "Save Selections";
        }
    });

    const elPreviewBtn = document.createElement("a");
    elPreviewBtn.href = `/preview/${intId}`;
    elPreviewBtn.setAttribute("data-spa", "");
    elPreviewBtn.className = "btn btn-success";
    elPreviewBtn.textContent = "Preview Resume →";

    async function saveBeforePreview(objEvent, elTrigger) {
        objEvent.preventDefault();
        objEvent.stopPropagation();

        const strOriginalText = elTrigger.textContent;
        elTrigger.classList.add("disabled");
        elTrigger.setAttribute("aria-disabled", "true");
        elTrigger.textContent = "Saving…";

        try {
            const blnDetailsSaved = await saveResumeDetails();
            if (!blnDetailsSaved) return;

            await saveAllSelections(intId, elSectionsList);
            navigate(`/preview/${intId}`);
        } catch (err) {
            showError(elRoot, `Failed to save before preview: ${err.message}`);
        } finally {
            elTrigger.classList.remove("disabled");
            elTrigger.removeAttribute("aria-disabled");
            elTrigger.textContent = strOriginalText;
        }
    }

    elPreviewLink.addEventListener("click", (objEvent) => saveBeforePreview(objEvent, elPreviewLink));
    elPreviewBtn.addEventListener("click", (objEvent) => saveBeforePreview(objEvent, elPreviewBtn));

    elActionRow.appendChild(elSaveBtn);
    elActionRow.appendChild(elPreviewBtn);
    elRoot.appendChild(elActionRow);
}

// ============================================================
// Section row builder — one card per section
// ============================================================

/**
 * Build a Bootstrap card for a single section entry.
 * Header: toggle checkbox + section name.
 * Body (hidden when unchecked): item checkboxes (and nested bullet checkboxes).
 *
 * @param {string} strSectionType
 * @param {boolean} blnIncluded - initial checked state of the section toggle
 * @param {object} objLibrary - all library data
 * @param {Set<string>} setSelectedItems - "sectionType:itemId" keys
 * @param {Set<string>} setSelectedBullets - "bulletType:parentId:bulletId" keys
 * @returns {HTMLDivElement}
 */
function buildSectionRow(strSectionType, blnIncluded, objLibrary, setSelectedItems, setSelectedBullets) {
    const elCard = document.createElement("div");
    elCard.className = "card";
    elCard.dataset.sectionType = strSectionType;

    // ---- Card header: section toggle checkbox + label ----
    const elHeader = document.createElement("div");
    elHeader.className = "card-header d-flex align-items-center gap-2";

    // Unique IDs for aria association between label and checkbox
    const strCheckId = `section-toggle-${strSectionType}`;
    const strBodyId  = `section-body-${strSectionType}`;

    const elCheckbox = document.createElement("input");
    elCheckbox.type = "checkbox";
    elCheckbox.id = strCheckId;
    elCheckbox.className = "form-check-input js-section-toggle";
    elCheckbox.dataset.sectionType = strSectionType;
    elCheckbox.checked = blnIncluded;
    elCheckbox.setAttribute("aria-label", `Include ${SECTION_LABELS[strSectionType]} section`);

    const elLabel = document.createElement("label");
    elLabel.setAttribute("for", strCheckId);
    elLabel.className = "form-check-label fw-semibold mb-0";
    elLabel.textContent = SECTION_LABELS[strSectionType];

    elHeader.appendChild(elCheckbox);
    elHeader.appendChild(elLabel);
    elCard.appendChild(elHeader);

    // Contact section has no items to pick — just the on/off toggle
    if (strSectionType === "contact") {
        return elCard;
    }

    // ---- Card body: item checkboxes (shown only when section is included) ----
    const elBody = document.createElement("div");
    elBody.id = strBodyId;
    elBody.className = `card-body${blnIncluded ? "" : " d-none"}`;
    elBody.dataset.sectionBody = strSectionType;
    elCheckbox.setAttribute("aria-controls", strBodyId);

    // Get the library items that belong to this section
    const arrItems = getLibraryItemsForSection(strSectionType, objLibrary);

    if (arrItems.length === 0) {
        // Empty state — guide user to add profile data
        const elEmpty = document.createElement("p");
        elEmpty.className = "text-muted small mb-0";
        elEmpty.textContent = `No ${SECTION_LABELS[strSectionType].toLowerCase()} entries in your profile yet. `;
        const elLink = document.createElement("a");
        elLink.href = `/profile/${SECTION_PROFILE_TAB[strSectionType] ?? strSectionType}`;
        elLink.setAttribute("data-spa", "");
        elLink.textContent = "Add some →";
        elEmpty.appendChild(elLink);
        elBody.appendChild(elEmpty);
    } else {
        // Build item checkboxes (and nested bullets for jobs/projects)
        buildItemChecklist(elBody, strSectionType, arrItems, setSelectedItems, setSelectedBullets);
    }

    // Toggle body visibility when the section checkbox changes
    elCheckbox.addEventListener("change", () => {
        if (elCheckbox.checked) {
            elBody.classList.remove("d-none");
        } else {
            elBody.classList.add("d-none");
        }
    });

    elCard.appendChild(elBody);
    return elCard;
}

// ============================================================
// Item checklist builder
// ============================================================

/**
 * Render item checkboxes (and nested bullet checkboxes) inside elBody.
 *
 * @param {HTMLElement} elBody - card-body to append into
 * @param {string} strSectionType
 * @param {object[]} arrItems - library items for this section
 * @param {Set<string>} setSelectedItems
 * @param {Set<string>} setSelectedBullets
 */
function buildItemChecklist(elBody, strSectionType, arrItems, setSelectedItems, setSelectedBullets) {
    if (strSectionType === "skills") {
        buildSkillChecklist(elBody, arrItems, setSelectedItems);
        return;
    }

    arrItems.forEach((objItem) => {
        const strItemKey  = `${strSectionType}:${objItem.id}`;
        const blnSelected = setSelectedItems.has(strItemKey);

        const elItemRow = document.createElement("div");
        elItemRow.className = "mb-2";

        // Item checkbox
        const elItemCheck = document.createElement("div");
        elItemCheck.className = "form-check";

        const strItemId = `item-${strSectionType}-${objItem.id}`;

        const elCheckbox = document.createElement("input");
        elCheckbox.type = "checkbox";
        elCheckbox.id = strItemId;
        elCheckbox.className = "form-check-input js-item-checkbox";
        elCheckbox.dataset.sectionType = strSectionType;
        elCheckbox.dataset.itemId = String(objItem.id);
        elCheckbox.checked = blnSelected;

        const strItemLabel = getItemLabel(strSectionType, objItem);
        elCheckbox.setAttribute("aria-label", `Include: ${strItemLabel}`);

        const elLabel = document.createElement("label");
        elLabel.setAttribute("for", strItemId);
        elLabel.className = "form-check-label";
        elLabel.textContent = strItemLabel;

        elItemCheck.appendChild(elCheckbox);
        elItemCheck.appendChild(elLabel);
        elItemRow.appendChild(elItemCheck);

        // For jobs and projects, add nested bullet checkboxes indented below the item
        if ((strSectionType === "jobs" || strSectionType === "projects") &&
            objItem.bullets && objItem.bullets.length > 0) {

            const strBulletType = strSectionType === "jobs" ? "job" : "project";

            // Bullet container — hidden when parent item is unchecked
            const elBulletContainer = document.createElement("div");
            elBulletContainer.className = `ms-4 mt-1${blnSelected ? "" : " d-none"}`;
            elBulletContainer.dataset.bulletContainer = `${strSectionType}-${objItem.id}`;

            objItem.bullets.forEach((objBullet) => {
                const strBulletKey = `${strBulletType}:${objItem.id}:${objBullet.id}`;
                const blnBulletSelected = setSelectedBullets.has(strBulletKey);

                const elBulletCheck = document.createElement("div");
                elBulletCheck.className = "form-check";

                const strBulletId = `bullet-${strBulletType}-${objItem.id}-${objBullet.id}`;

                const elBulletCb = document.createElement("input");
                elBulletCb.type = "checkbox";
                elBulletCb.id = strBulletId;
                elBulletCb.className = "form-check-input js-bullet-checkbox";
                elBulletCb.dataset.parentItemId = String(objItem.id);
                elBulletCb.dataset.bulletType = strBulletType;
                elBulletCb.dataset.bulletId = String(objBullet.id);
                elBulletCb.checked = blnBulletSelected;

                // Truncate very long bullet text in the aria-label to keep it manageable
                const strShort = objBullet.text.length > 70
                    ? objBullet.text.slice(0, 70) + "…"
                    : objBullet.text;
                elBulletCb.setAttribute("aria-label", `Include bullet: ${strShort}`);

                const elBulletLabel = document.createElement("label");
                elBulletLabel.setAttribute("for", strBulletId);
                elBulletLabel.className = "form-check-label small";
                elBulletLabel.textContent = objBullet.text;

                elBulletCheck.appendChild(elBulletCb);
                elBulletCheck.appendChild(elBulletLabel);
                elBulletContainer.appendChild(elBulletCheck);
            });

            // Show/hide bullet checkboxes based on the parent item's checked state
            elCheckbox.addEventListener("change", () => {
                if (elCheckbox.checked) {
                    elBulletContainer.classList.remove("d-none");
                } else {
                    elBulletContainer.classList.add("d-none");
                    // Uncheck all bullets so they're not included when parent is off
                    elBulletContainer.querySelectorAll(".js-bullet-checkbox").forEach((el) => {
                        el.checked = false;
                    });
                }
            });

            elItemRow.appendChild(elBulletContainer);
        }

        elBody.appendChild(elItemRow);
    });
}

/**
 * Render skills with unchecked items tucked into a collapsed list by default.
 *
 * @param {HTMLElement} elBody
 * @param {object[]} arrSkills
 * @param {Set<string>} setSelectedItems
 */
function buildSkillChecklist(elBody, arrSkills, setSelectedItems) {
    const arrSelected = [];
    const arrUnselected = [];

    arrSkills.forEach((objSkill) => {
        const strItemKey = `skills:${objSkill.id}`;
        if (setSelectedItems.has(strItemKey)) {
            arrSelected.push(objSkill);
        } else {
            arrUnselected.push(objSkill);
        }
    });

    if (arrSelected.length > 0) {
        const elSelectedGroup = document.createElement("div");
        elSelectedGroup.className = "mb-3";

        const elSelectedTitle = document.createElement("h3");
        elSelectedTitle.className = "h6 mb-2";
        elSelectedTitle.textContent = "Selected skills";
        elSelectedGroup.appendChild(elSelectedTitle);

        arrSelected.forEach((objSkill) => {
            elSelectedGroup.appendChild(buildSkillCheckbox(objSkill, true));
        });

        elBody.appendChild(elSelectedGroup);
    }

    if (arrUnselected.length > 0) {
        const elDetails = document.createElement("details");
        elDetails.className = "mt-2";

        const elSummary = document.createElement("summary");
        elSummary.className = "fw-semibold small";
        elSummary.textContent = `Unselected skills (${arrUnselected.length})`;
        elDetails.appendChild(elSummary);

        const elUnselectedGroup = document.createElement("div");
        elUnselectedGroup.className = "mt-2";

        arrUnselected.forEach((objSkill) => {
            elUnselectedGroup.appendChild(buildSkillCheckbox(objSkill, false));
        });

        elDetails.appendChild(elUnselectedGroup);
        elBody.appendChild(elDetails);
    }
}

/**
 * Build one skill checkbox row for the builder checklist.
 *
 * @param {object} objSkill
 * @param {boolean} blnSelected
 * @returns {HTMLDivElement}
 */
function buildSkillCheckbox(objSkill, blnSelected) {
    const elItemRow = document.createElement("div");
    elItemRow.className = "mb-2";

    const elItemCheck = document.createElement("div");
    elItemCheck.className = "form-check";

    const strItemId = `item-skills-${objSkill.id}`;

    const elCheckbox = document.createElement("input");
    elCheckbox.type = "checkbox";
    elCheckbox.id = strItemId;
    elCheckbox.className = "form-check-input js-item-checkbox";
    elCheckbox.dataset.sectionType = "skills";
    elCheckbox.dataset.itemId = String(objSkill.id);
    elCheckbox.checked = blnSelected;
    elCheckbox.setAttribute("aria-label", `Include: ${objSkill.name}`);

    const elLabel = document.createElement("label");
    elLabel.setAttribute("for", strItemId);
    elLabel.className = "form-check-label";
    elLabel.textContent = objSkill.name;

    elItemCheck.appendChild(elCheckbox);
    elItemCheck.appendChild(elLabel);
    elItemRow.appendChild(elItemCheck);

    return elItemRow;
}

// ============================================================
// Helper: get the library items array for a section type
// ============================================================

/**
 * Returns the correct items array from the library bundle.
 * @param {string} strSectionType
 * @param {object} objLibrary
 * @returns {object[]}
 */
function getLibraryItemsForSection(strSectionType, objLibrary) {
    switch (strSectionType) {
        case "summary":        return objLibrary.summaries;
        case "education":      return objLibrary.educations;
        case "jobs":           return objLibrary.jobs;
        case "projects":       return objLibrary.projects;
        case "skills":         return objLibrary.skills;
        case "certifications": return objLibrary.certifications;
        case "awards":         return objLibrary.awards;
        default:               return [];
    }
}

// ============================================================
// Helper: build a human-readable label for an item row
// ============================================================

/**
 * Returns a short descriptive label shown next to the item's checkbox.
 * @param {string} strSectionType
 * @param {object} objItem
 * @returns {string}
 */
function getItemLabel(strSectionType, objItem) {
    switch (strSectionType) {
        case "summary":
            // Use the label field if set, otherwise truncate the content
            return objItem.label || (objItem.content ? objItem.content.slice(0, 60) + "…" : `Summary #${objItem.id}`);
        case "education":
            return `${objItem.degree || "Degree"} — ${objItem.institution}`;
        case "jobs":
            return `${objItem.title || "Role"} at ${objItem.company}${objItem.is_current ? " (Current)" : ""}`;
        case "projects":
            return objItem.name;
        case "skills":
            return objItem.name;
        case "certifications":
            return objItem.issuer ? `${objItem.name} — ${objItem.issuer}` : objItem.name;
        case "awards":
            return objItem.issuer ? `${objItem.name} — ${objItem.issuer}` : objItem.name;
        default:
            return String(objItem.id);
    }
}

// ============================================================
// Save selections — reads DOM state and calls API
// ============================================================

/**
 * Walk the builder checklist DOM, collect all checkbox states,
 * and send a full replacement PUT to /api/resumes/:id/selections.
 *
 * @param {number} intId - resume ID
 * @param {HTMLElement} elSectionsList - the container holding all section rows
 */
async function saveAllSelections(intId, elSectionsList) {
    const arrSections = [];
    const arrItems    = [];
    const arrBullets  = [];

    let intSectionOrder = 0;

    // Collect section toggles
    const arrSectionToggles = elSectionsList.querySelectorAll(".js-section-toggle");
    arrSectionToggles.forEach((elCb) => {
        arrSections.push({
            section_type: elCb.dataset.sectionType,
            included:     elCb.checked ? 1 : 0,
            sort_order:   intSectionOrder++,
        });
    });

    // Collect selected items — only checked boxes contribute
    let intItemOrder = 0;
    const arrItemCheckboxes = elSectionsList.querySelectorAll(".js-item-checkbox");
    arrItemCheckboxes.forEach((elCb) => {
        if (elCb.checked) {
            arrItems.push({
                section_type: elCb.dataset.sectionType,
                item_id:      parseInt(elCb.dataset.itemId, 10),
                sort_order:   intItemOrder++,
            });
        }
    });

    // Collect selected bullets — only checked boxes where the parent item is also checked
    // (The bullet container is hidden and bullets unchecked when parent item is unchecked,
    //  so this loop will naturally produce no orphaned bullets.)
    let intBulletOrder = 0;
    const arrBulletCheckboxes = elSectionsList.querySelectorAll(".js-bullet-checkbox");
    arrBulletCheckboxes.forEach((elCb) => {
        if (elCb.checked) {
            arrBullets.push({
                parent_item_id: parseInt(elCb.dataset.parentItemId, 10),
                bullet_type:    elCb.dataset.bulletType,
                bullet_id:      parseInt(elCb.dataset.bulletId, 10),
                sort_order:     intBulletOrder++,
            });
        }
    });

    // Send the full selection state to the API — this replaces any existing selections
    await putResumeSelections(intId, {
        sections: arrSections,
        items:    arrItems,
        bullets:  arrBullets,
    });
}
