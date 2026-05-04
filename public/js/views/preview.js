// AI: Generated with Claude Code — Preview view for Resume Frog.
// Loads saved resume selections and renders a digital resume layout.

import {
    getResume, getResumeSelections,
    getContact,
    getSummaries, getEducations,
    getJobs, getJobBullets,
    getProjects, getProjectBullets,
    getSkills, getSkillCategories,
    getCertifications, getAwards,
} from "/js/api.js";
import { showError } from "/js/components/form-helpers.js";

// ============================================================
// Main render function — called by app.js router
// ============================================================

/**
 * Render the preview view into #view-root.
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

    // Add print-preview class to body so print.css on-screen styles apply
    document.body.classList.add("print-preview");

    // Loading spinner
    const elSpinner = document.createElement("div");
    elSpinner.className = "d-flex justify-content-center py-5";
    elSpinner.innerHTML = `<div class="spinner-border text-primary" role="status" aria-label="Loading preview"><span class="visually-hidden">Loading…</span></div>`;
    elRoot.appendChild(elSpinner);

    try {
        // Load resume metadata first — bail early if not found
        const arrResume = await getResume(intId);
        if (!arrResume || arrResume.length === 0) {
            elRoot.innerHTML = "";
            showError(elRoot, "Resume not found.");
            return;
        }
        const objResume = arrResume[0];

        // Load selections — empty if resume has no saved selections yet
        let objSelections = { sections: [], items: [], bullets: [] };
        try {
            objSelections = await getResumeSelections(intId);
        } catch {
            // Fresh resume — no selections saved yet
        }

        // Determine which sections to show.
        // If no sections have been saved yet, show all sections.
        const blnHasSavedSections = objSelections.sections.length > 0;
        const setSectionIncluded = new Set(
            objSelections.sections.filter((s) => s.included === 1).map((s) => s.section_type)
        );

        // Helper: should a given section be shown in the preview?
        const isSectionShown = (strType) => !blnHasSavedSections || setSectionIncluded.has(strType);

        // Build a map of selected items per section: sectionType → Set<itemId>
        const mapSelectedItems = {};
        objSelections.items.forEach((i) => {
            if (!mapSelectedItems[i.section_type]) {
                mapSelectedItems[i.section_type] = new Set();
            }
            mapSelectedItems[i.section_type].add(i.item_id);
        });

        // Build a set of selected bullet keys: "bulletType:parentItemId:bulletId"
        const setSelectedBullets = new Set(
            objSelections.bullets.map((b) => `${b.bullet_type}:${b.parent_item_id}:${b.bullet_id}`)
        );

        // Helper: filter an items array to only the selected entries, in selection order.
        // If no items have been saved at all (empty selections), return all items.
        const blnHasItemSelections = objSelections.items.length > 0;

        const filterItems = (strSectionType, arrAllItems) => {
            if (!blnHasItemSelections) return arrAllItems;

            const setIds = mapSelectedItems[strSectionType];
            if (!setIds || setIds.size === 0) return [];

            // Preserve the sort_order recorded in selections
            const arrSelectionOrder = objSelections.items
                .filter((s) => s.section_type === strSectionType)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => s.item_id);

            // Filter to only selected IDs, then sort by selection order
            const arrSelected = arrAllItems.filter((item) => setIds.has(item.id));
            arrSelected.sort(
                (a, b) => arrSelectionOrder.indexOf(a.id) - arrSelectionOrder.indexOf(b.id)
            );
            return arrSelected;
        };

        // Load all library data in parallel (contact always needed; others only if shown)
        const [
            arrContact,
            arrSummaries,
            arrEducations,
            arrJobs,
            arrProjects,
            arrSkillCategories,
            arrSkills,
            arrCertifications,
            arrAwards,
        ] = await Promise.all([
            getContact(),
            isSectionShown("summary")        ? getSummaries()       : Promise.resolve([]),
            isSectionShown("education")      ? getEducations()      : Promise.resolve([]),
            isSectionShown("jobs")           ? getJobs()            : Promise.resolve([]),
            isSectionShown("projects")       ? getProjects()        : Promise.resolve([]),
            isSectionShown("skills")         ? getSkillCategories() : Promise.resolve([]),
            isSectionShown("skills")         ? getSkills()          : Promise.resolve([]),
            isSectionShown("certifications") ? getCertifications()  : Promise.resolve([]),
            isSectionShown("awards")         ? getAwards()          : Promise.resolve([]),
        ]);

        const objContact = arrContact[0] ?? {};

        // Filter each library list to only the selected items
        const arrFilteredSummaries  = filterItems("summary",        arrSummaries);
        const arrFilteredEducations = filterItems("education",      arrEducations);
        const arrFilteredSkills     = filterItems("skills",         arrSkills);
        const arrFilteredCerts      = filterItems("certifications", arrCertifications);
        const arrFilteredAwards     = filterItems("awards",         arrAwards);

        // For jobs and projects, also filter bullets per item
        const arrSelectedJobs     = filterItems("jobs",     arrJobs);
        const arrSelectedProjects = filterItems("projects", arrProjects);

        // Fetch and filter bullets only for the jobs/projects that are selected
        const arrJobsWithBullets = await Promise.all(
            arrSelectedJobs.map(async (objJob) => {
                const arrAllBullets = await getJobBullets(objJob.id);
                // Keep only the bullets the user selected in the builder
                const arrBullets = blnHasItemSelections
                    ? arrAllBullets.filter((b) =>
                        setSelectedBullets.has(`job:${objJob.id}:${b.id}`)
                    )
                    : arrAllBullets;
                return { ...objJob, bullets: arrBullets };
            })
        );

        const arrProjectsWithBullets = await Promise.all(
            arrSelectedProjects.map(async (objProject) => {
                const arrAllBullets = await getProjectBullets(objProject.id);
                const arrBullets = blnHasItemSelections
                    ? arrAllBullets.filter((b) =>
                        setSelectedBullets.has(`project:${objProject.id}:${b.id}`)
                    )
                    : arrAllBullets;
                return { ...objProject, bullets: arrBullets };
            })
        );

        // Clear spinner and render the preview
        elRoot.innerHTML = "";
        renderPreviewUI(
            elRoot, intId, objResume, objContact,
            isSectionShown,
            {
                summaries:       arrFilteredSummaries,
                educations:      arrFilteredEducations,
                jobs:            arrJobsWithBullets,
                projects:        arrProjectsWithBullets,
                skillCategories: arrSkillCategories,
                skills:          arrFilteredSkills,
                certifications:  arrFilteredCerts,
                awards:          arrFilteredAwards,
            }
        );
    } catch (err) {
        console.error("Preview render error:", err);
        elRoot.innerHTML = "";
        showError(elRoot, `Failed to load preview: ${err.message}`);
    }
}

// ============================================================
// Cleanup — remove print-preview body class on navigation away
// ============================================================

/**
 * Called by app.js router before switching to another view.
 */
export function cleanup() {
    document.body.classList.remove("print-preview");
}

// ============================================================
// Main preview UI renderer
// ============================================================

/**
 * Build and insert the complete preview UI into elRoot.
 *
 * @param {HTMLElement} elRoot
 * @param {number} intId
 * @param {object} objResume
 * @param {object} objContact
 * @param {Function} isSectionShown - (strType) → boolean
 * @param {object} objData - filtered library data
 */
function renderPreviewUI(elRoot, intId, objResume, objContact, isSectionShown, objData) {

    // ---- Action bar (hidden when printing) ----
    const elActionBar = document.createElement("div");
    elActionBar.className = "resume-preview-actions d-flex justify-content-between align-items-center mb-3 no-print flex-wrap gap-2";

    const elResumeTitle = document.createElement("h1");
    elResumeTitle.className = "h3 mb-0";
    elResumeTitle.textContent = objResume.name || "Resume Preview";

    const elBackLink = document.createElement("a");
    elBackLink.href = `/builder/${intId}`;
    elBackLink.setAttribute("data-spa", "");
    elBackLink.className = "btn btn-outline-secondary";
    elBackLink.textContent = "← Edit in Builder";

    // Server-side PDF download — Puppeteer renders the preview and returns a PDF file.
    // Using an <a> so the browser handles the download without JS blob juggling.
    const elDownloadLink = document.createElement("a");
    elDownloadLink.href = `/api/pdf/${intId}`;
    // The `download` attribute signals to the browser to save rather than navigate,
    // and seeds the filename. Content-Disposition: attachment on the server is the
    // authoritative trigger — download attr is the friendly hint.
    elDownloadLink.download = `${objResume.name || "resume"}.pdf`;
    elDownloadLink.className = "btn btn-primary";
    elDownloadLink.textContent = "Download PDF";
    elDownloadLink.setAttribute("aria-label", "Download this resume as a PDF file (server-generated)");

    const elBtnGroup = document.createElement("div");
    elBtnGroup.className = "d-flex gap-2";
    elBtnGroup.appendChild(elBackLink);
    elBtnGroup.appendChild(elDownloadLink);

    elActionBar.appendChild(elResumeTitle);
    elActionBar.appendChild(elBtnGroup);
    elRoot.appendChild(elActionBar);

    // ---- Resume wrapper and first page ----
    // .resume-preview stacks page sheets; .resume-page is the paper-sized sheet.
    const elResume = document.createElement("div");
    elResume.className = "resume-preview";
    elResume.setAttribute("aria-label", `Resume: ${objResume.name}`);

    const elPage = document.createElement("article");
    elPage.className = "resume-page";
    elResume.appendChild(elPage);

    // Contact header — always rendered at the top of the resume
    if (isSectionShown("contact")) {
        elPage.appendChild(buildContactSection(objContact));
    }

    // Render each optional section in the resume order from the template:
    // Skills → Experience → Projects → Certs/Awards → Education (per r/EngineeringResumes)
    const arrSectionOrder = [
        "summary", "skills", "jobs", "projects",
        "certifications", "awards", "education",
    ];

    arrSectionOrder.forEach((strType) => {
        if (!isSectionShown(strType)) return;

        const elSection = buildSection(strType, objData);
        if (elSection) elPage.appendChild(elSection);
    });

    elRoot.appendChild(elResume);

    // After the resume renders, add on-screen page break overlays and the length warning.
    // Both run in one RAF so we read scrollHeight only once.
    requestAnimationFrame(() => {
        // 11in at 96 dpi = 1056 px — matches the repeating-linear-gradient period in print.css.
        const intOnePagePx = Math.round(11 * 96);
        const intContentPx = elPage.scrollHeight;
        const intNumPages  = Math.ceil(intContentPx / intOnePagePx);

        // ---- Page-length warning (above the resume) ----
        const elPrev = elRoot.querySelector(".resume-page-warning");
        if (elPrev) elPrev.remove();

        let strMessage = null;
        let strLevel   = null;

        if (intContentPx > intOnePagePx * 2) {
            strMessage = "Resume exceeds 2 pages — trim before printing. Resumes over 2 pages are rarely read.";
            strLevel   = "danger";
        } else if (intContentPx > intOnePagePx) {
            strMessage = "Resume spans 2 pages. Recommended only with 10+ years of experience.";
            strLevel   = "warning";
        }

        if (strMessage) {
            const elWarn = document.createElement("div");
            elWarn.className = `alert alert-${strLevel} no-print resume-page-warning mb-3`;
            elWarn.setAttribute("role", "alert");
            elWarn.textContent = strMessage;
            elRoot.insertBefore(elWarn, elResume);
        }

        // ---- Page break overlays (inside the resume article, hidden when printing) ----
        // Remove stale overlays from a previous render.
        elPage.querySelectorAll(".page-break-overlay").forEach((el) => el.remove());

        // For each page boundary (every 11in), insert an absolutely-positioned row that
        // labels "Page N ↑ / ↓ Page N+1" centred on the gradient line drawn by print.css.
        // These are aria-hidden and carry no-print so they never appear in the PDF.
        for (let i = 1; i < intNumPages; i++) {
            const intBreakY = i * intOnePagePx;

            const elOverlay = document.createElement("div");
            // no-print hides the overlay in @media print (and in the Puppeteer PDF).
            // position-absolute + w-100 stretches the row across the full paper width.
            elOverlay.className = "page-break-overlay no-print position-absolute start-0 w-100 d-flex align-items-center justify-content-between";
            // Inline top is unavoidable — the pixel position is computed at runtime and
            // cannot be expressed with Bootstrap utility classes. Subtract 12px to
            // vertically centre the badges on the 2px gradient line drawn at intBreakY.
            elOverlay.style.top = `${intBreakY - 12}px`;
            elOverlay.setAttribute("aria-hidden", "true");

            // "Page N ends" badge sits on the left edge of the paper.
            const elEndBadge = document.createElement("span");
            elEndBadge.className = "badge bg-secondary ms-1";
            elEndBadge.textContent = `↑ Page ${i}`;

            // "Page N+1 starts" badge sits on the right edge.
            const elStartBadge = document.createElement("span");
            elStartBadge.className = "badge bg-secondary me-1";
            elStartBadge.textContent = `Page ${i + 1} ↓`;

            elOverlay.appendChild(elEndBadge);
            elOverlay.appendChild(elStartBadge);
            elPage.appendChild(elOverlay);
        }
    });
}

// ============================================================
// Contact header section
// ============================================================

/**
 * Build the contact header block at the top of the resume.
 * Shows name, email, phone, location, and links on one line.
 *
 * @param {object} objContact
 * @returns {HTMLElement}
 */
function buildContactSection(objContact) {
    const elHeader = document.createElement("header");
    elHeader.className = "resume-section resume-contact text-center mb-3";

    // Full name — 24pt normal weight per template (fw-normal overrides Bootstrap default)
    const elName = document.createElement("h1");
    elName.className = "h2 fw-normal mb-1";
    elName.textContent = objContact.full_name || "Your Name";
    elHeader.appendChild(elName);

    // All contact details on one pipe-separated line: phone | email | location | URLs.
    const elContactLine = document.createElement("p");
    elContactLine.className = "mb-2";

    const arrLinks = Array.isArray(objContact.links_json) ? objContact.links_json : [];
    let blnFirst = true;

    // Helper appends " | " separator before each item after the first.
    const appendContactItem = (strText) => {
        if (!strText) return;
        if (!blnFirst) elContactLine.appendChild(document.createTextNode(" | "));
        blnFirst = false;
        elContactLine.appendChild(document.createTextNode(strText));
    };

    appendContactItem(objContact.phone);
    appendContactItem(objContact.email);
    appendContactItem(objContact.location);
    arrLinks.forEach((objLink) => {
        appendContactItem(objLink.url);
    });

    // Only append if there is at least one contact item
    if (!blnFirst) elHeader.appendChild(elContactLine);

    return elHeader;
}

// ============================================================
// Section dispatcher
// ============================================================

/**
 * Dispatch to the correct section builder for a given section type.
 * Returns null if the section has no content to show.
 *
 * @param {string} strType
 * @param {object} objData
 * @returns {HTMLElement|null}
 */
function buildSection(strType, objData) {
    switch (strType) {
        case "summary":        return buildSummarySection(objData.summaries);
        case "education":      return buildEducationSection(objData.educations);
        case "jobs":           return buildJobsSection(objData.jobs);
        case "projects":       return buildProjectsSection(objData.projects);
        case "skills":         return buildSkillsSection(objData.skills, objData.skillCategories);
        case "certifications": return buildCertificationsSection(objData.certifications);
        case "awards":         return buildAwardsSection(objData.awards);
        default:               return null;
    }
}

// ============================================================
// Section heading helper
// ============================================================

/**
 * Create a section container with an underlined section heading.
 * The caller appends content into the returned element.
 *
 * @param {string} strTitle
 * @returns {HTMLElement}
 */
function buildSectionHeading(strTitle) {
    const elSection = document.createElement("section");
    elSection.className = "resume-section mb-3";

    const elH2 = document.createElement("h2");
    // Normal weight, title case — matching the template (no bold, no all-caps)
    elH2.className = "h5 fw-normal border-bottom pb-1 mb-2";
    elH2.textContent = strTitle;
    elSection.appendChild(elH2);

    return elSection;
}

// ============================================================
// Summary section
// ============================================================

/**
 * @param {object[]} arrSummaries
 * @returns {HTMLElement|null}
 */
function buildSummarySection(arrSummaries) {
    if (!arrSummaries || arrSummaries.length === 0) return null;

    // Show the first selected summary variant
    const objSummary = arrSummaries[0];
    if (!objSummary.content) return null;

    const elSection = buildSectionHeading("Professional Summary");
    const elP = document.createElement("p");
    elP.className = "mb-0";
    elP.textContent = objSummary.content;
    elSection.appendChild(elP);
    return elSection;
}

// ============================================================
// Education section
// ============================================================

/**
 * @param {object[]} arrEducations
 * @returns {HTMLElement|null}
 */
function buildEducationSection(arrEducations) {
    if (!arrEducations || arrEducations.length === 0) return null;

    const elSection = buildSectionHeading("Education");

    arrEducations.forEach((objEdu) => {
        const elItem = document.createElement("div");
        elItem.className = "mb-2";

        // One row: "Institution – Degree in Field" on left, graduation date on right.
        // Matches template format: "School – MS in Aerospace Engineering   June 2006"
        const elRow1 = document.createElement("div");
        elRow1.className = "d-flex justify-content-between align-items-baseline";

        // Build left label: institution, then " – degree in field" if present
        let strEduLeft = objEdu.institution ?? "";
        if (objEdu.degree) {
            strEduLeft += " – " + objEdu.degree;
            if (objEdu.field) strEduLeft += " in " + objEdu.field;
        } else if (objEdu.field) {
            strEduLeft += " – " + objEdu.field;
        }

        const elLabel = document.createElement("strong");
        elLabel.textContent = strEduLeft;

        // Per r/EngineeringResumes wiki: show graduation date only, no start date range
        const elDate = document.createElement("span");
        elDate.textContent = objEdu.end_date ?? "";

        elRow1.appendChild(elLabel);
        elRow1.appendChild(elDate);
        elItem.appendChild(elRow1);

        // GPA shown below if present
        if (objEdu.gpa) {
            const elGpa = document.createElement("p");
            elGpa.className = "mb-0";
            elGpa.textContent = `GPA: ${objEdu.gpa}`;
            elItem.appendChild(elGpa);
        }

        // Additional details if present
        if (objEdu.details) {
            const elDetails = document.createElement("p");
            elDetails.className = "mb-0 fst-italic";
            elDetails.textContent = objEdu.details;
            elItem.appendChild(elDetails);
        }

        elSection.appendChild(elItem);
    });

    return elSection;
}

// ============================================================
// Work Experience section
// ============================================================

/**
 * @param {object[]} arrJobs - each job has a .bullets array already filtered
 * @returns {HTMLElement|null}
 */
function buildJobsSection(arrJobs) {
    if (!arrJobs || arrJobs.length === 0) return null;

    const elSection = buildSectionHeading("Work Experience");

    arrJobs.forEach((objJob) => {
        const elItem = document.createElement("div");
        elItem.className = "mb-3";

        // Template format: "**Job Title,** Company – City, ST [right-aligned date]"
        // Only the job title is bold; company and location are normal weight.
        const elRow1 = document.createElement("div");
        elRow1.className = "d-flex justify-content-between align-items-baseline";

        // Build the title line with mixed bold/normal content
        const elTitleLine = document.createElement("span");
        const elBoldTitle = document.createElement("strong");
        // Append comma after title only when company follows it
        elBoldTitle.textContent = objJob.title
            ? objJob.title + (objJob.company ? "," : "")
            : "";
        elTitleLine.appendChild(elBoldTitle);

        // " Company – Location" appended as normal-weight text
        let strRest = "";
        if (objJob.company) strRest += " " + objJob.company;
        if (objJob.location) strRest += " – " + objJob.location;
        if (strRest) elTitleLine.appendChild(document.createTextNode(strRest));

        const elDates = document.createElement("span");
        elDates.textContent = formatDateRange(objJob.start_date, objJob.end_date, objJob.is_current === 1);
        elRow1.appendChild(elTitleLine);
        elRow1.appendChild(elDates);
        elItem.appendChild(elRow1);

        // Bullet points
        if (objJob.bullets && objJob.bullets.length > 0) {
            const elUl = document.createElement("ul");
            elUl.className = "mb-0 ps-3";
            objJob.bullets.forEach((objBullet) => {
                const elLi = document.createElement("li");
                elLi.textContent = objBullet.text;
                elUl.appendChild(elLi);
            });
            elItem.appendChild(elUl);
        }

        elSection.appendChild(elItem);
    });

    return elSection;
}

// ============================================================
// Projects section
// ============================================================

/**
 * @param {object[]} arrProjects - each project has a .bullets array already filtered
 * @returns {HTMLElement|null}
 */
function buildProjectsSection(arrProjects) {
    if (!arrProjects || arrProjects.length === 0) return null;

    const elSection = buildSectionHeading("Projects");

    arrProjects.forEach((objProject) => {
        const elItem = document.createElement("div");
        elItem.className = "mb-3";

        // Project name (linked if a URL is stored) + date range
        const elRow1 = document.createElement("div");
        elRow1.className = "d-flex justify-content-between align-items-baseline";

        const elNameEl = document.createElement("strong");
        if (objProject.link) {
            // Wrap the name in a link — href is the stored project URL
            const elA = document.createElement("a");
            elA.href = objProject.link;
            elA.target = "_blank";
            elA.rel = "noopener noreferrer";
            elA.textContent = objProject.name;
            elNameEl.appendChild(elA);
        } else {
            elNameEl.textContent = objProject.name;
        }

        const elDates = document.createElement("span");
        elDates.textContent = formatDateRange(
            objProject.start_date, objProject.end_date, objProject.is_current === 1
        );

        elRow1.appendChild(elNameEl);
        elRow1.appendChild(elDates);
        elItem.appendChild(elRow1);

        if (objProject.description) {
            const elDesc = document.createElement("p");
            elDesc.className = "mb-1";
            elDesc.textContent = objProject.description;
            elItem.appendChild(elDesc);
        }

        if (objProject.bullets && objProject.bullets.length > 0) {
            const elUl = document.createElement("ul");
            elUl.className = "mb-0 ps-3";
            objProject.bullets.forEach((objBullet) => {
                const elLi = document.createElement("li");
                elLi.textContent = objBullet.text;
                elUl.appendChild(elLi);
            });
            elItem.appendChild(elUl);
        }

        elSection.appendChild(elItem);
    });

    return elSection;
}

// ============================================================
// Skills section
// ============================================================

/**
 * Groups skills by their category and renders one line per category.
 * Uncategorized skills are shown at the end.
 *
 * @param {object[]} arrSkills
 * @param {object[]} arrCategories
 * @returns {HTMLElement|null}
 */
function buildSkillsSection(arrSkills, arrCategories) {
    if (!arrSkills || arrSkills.length === 0) return null;

    const elSection = buildSectionHeading("Skills");

    // Group skill names by category_id
    const mapCategorySkills = {};
    const arrUncategorized  = [];

    arrSkills.forEach((objSkill) => {
        if (objSkill.category_id) {
            if (!mapCategorySkills[objSkill.category_id]) {
                mapCategorySkills[objSkill.category_id] = [];
            }
            mapCategorySkills[objSkill.category_id].push(objSkill.name);
        } else {
            arrUncategorized.push(objSkill.name);
        }
    });

    // Render skills grouped under their category labels
    (arrCategories ?? []).forEach((objCat) => {
        const arrCatSkills = mapCategorySkills[objCat.id];
        if (!arrCatSkills || arrCatSkills.length === 0) return;

        const elRow = document.createElement("p");
        elRow.className = "mb-1";

        const elLabel = document.createElement("strong");
        elLabel.textContent = `${objCat.name}: `;
        elRow.appendChild(elLabel);
        // Skill names are appended as a text node — safe from XSS
        elRow.appendChild(document.createTextNode(arrCatSkills.join(", ")));
        elSection.appendChild(elRow);
    });

    // Render any skills with no category
    if (arrUncategorized.length > 0) {
        const elRow = document.createElement("p");
        elRow.className = "mb-1";
        elRow.textContent = arrUncategorized.join(", ");
        elSection.appendChild(elRow);
    }

    return elSection;
}

// ============================================================
// Certifications section
// ============================================================

/**
 * @param {object[]} arrCerts
 * @returns {HTMLElement|null}
 */
function buildCertificationsSection(arrCerts) {
    if (!arrCerts || arrCerts.length === 0) return null;

    const elSection = buildSectionHeading("Certifications");
    const elUl = document.createElement("ul");
    elUl.className = "mb-0 ps-3";

    arrCerts.forEach((objCert) => {
        const elLi = document.createElement("li");
        // Build the display string: "Name — Issuer — Date"
        const arrParts = [objCert.name];
        if (objCert.issuer)      arrParts.push(objCert.issuer);
        if (objCert.issued_date) arrParts.push(objCert.issued_date);
        elLi.textContent = arrParts.join(" — ");
        elUl.appendChild(elLi);
    });

    elSection.appendChild(elUl);
    return elSection;
}

// ============================================================
// Awards section
// ============================================================

/**
 * @param {object[]} arrAwards
 * @returns {HTMLElement|null}
 */
function buildAwardsSection(arrAwards) {
    if (!arrAwards || arrAwards.length === 0) return null;

    const elSection = buildSectionHeading("Awards & Honors");
    const elUl = document.createElement("ul");
    elUl.className = "mb-0 ps-3";

    arrAwards.forEach((objAward) => {
        const elLi = document.createElement("li");
        const arrParts = [objAward.name];
        if (objAward.issuer)      arrParts.push(objAward.issuer);
        if (objAward.issued_date) arrParts.push(objAward.issued_date);
        elLi.textContent = arrParts.join(" — ");

        // If there's a description, show it as a sub-text below the title
        if (objAward.description) {
            const elDesc = document.createElement("p");
            elDesc.className = "mb-0 fst-italic";
            elDesc.textContent = objAward.description;
            elLi.appendChild(elDesc);
        }

        elUl.appendChild(elLi);
    });

    elSection.appendChild(elUl);
    return elSection;
}

// ============================================================
// Date range formatter
// ============================================================

/**
 * Format a start/end date pair into a readable range string.
 * @param {string} strStart - e.g. "2021-06"
 * @param {string} strEnd   - e.g. "2023-08"
 * @param {boolean} blnIsCurrent - true → replace end with "Present"
 * @returns {string}
 */
function formatDateRange(strStart, strEnd, blnIsCurrent) {
    const strS = strStart ?? "";
    const strE = blnIsCurrent ? "Present" : (strEnd ?? "");
    if (!strS && !strE) return "";
    if (!strS) return strE;
    if (!strE) return strS;
    return `${strS} – ${strE}`;
}
