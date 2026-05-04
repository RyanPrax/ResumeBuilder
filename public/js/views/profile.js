// AI: Generated with Claude Code — Profile view for Resume Frog.
// Tabbed interface for all profile library tables:
// contact, summary, education, jobs, projects, skills, certifications, awards.
// Each tab renders a list of items with add/edit/delete forms.

import {
    getContact,
    putContact,
    getSummaries,
    postSummary,
    putSummary,
    deleteSummary,
    getEducations,
    postEducation,
    putEducation,
    deleteEducation,
    getJobs,
    postJob,
    putJob,
    deleteJob,
    getJobBullets,
    postJobBullet,
    putJobBullet,
    deleteJobBullet,
    getProjects,
    postProject,
    putProject,
    deleteProject,
    getProjectBullets,
    postProjectBullet,
    putProjectBullet,
    deleteProjectBullet,
    getSkillCategories,
    postSkillCategory,
    deleteSkillCategory,
    getSkills,
    postSkill,
    deleteSkill,
    getCertifications,
    postCertification,
    putCertification,
    deleteCertification,
    getAwards,
    postAward,
    putAward,
    deleteAward,
} from "/js/api.js";
// navigate imported but not used in this view — profile stays in-place after saves
import {
    showError,
    showSuccess,
    confirmDelete,
    disableSubmit,
} from "/js/components/form-helpers.js";
import {
    attachAiReview,
    createAiReviewButton,
} from "/js/components/ai-review.js";

// ============================================================
// Tab definitions — order matches the UI tab bar
// ============================================================

const ARR_TABS = [
    { key: "contact", label: "Contact" },
    { key: "summary", label: "Summary" },
    { key: "education", label: "Education" },
    { key: "jobs", label: "Jobs" },
    { key: "projects", label: "Projects" },
    { key: "skills", label: "Skills" },
    { key: "certs", label: "Certifications" },
    { key: "awards", label: "Awards" },
];

// ============================================================
// Main render function — called by app.js router
// ============================================================

/**
 * Render the profile view with the active tab determined by params.tab.
 * @param {{ tab: string }} objParams
 */
export async function render(objParams) {
    const strActiveTab = objParams.tab ?? "contact";
    const elRoot = document.getElementById("view-root");
    elRoot.innerHTML = "";

    // Page heading
    const elH1 = document.createElement("h1");
    elH1.className = "h3 mb-3";
    elH1.textContent = "Profile Data";
    elRoot.appendChild(elH1);

    // ---- Tab navigation ----
    const elNav = document.createElement("nav");
    elNav.setAttribute("aria-label", "Profile sections");
    const elTabList = document.createElement("ul");
    elTabList.className = "nav nav-tabs mb-4";
    elTabList.setAttribute("role", "tablist");

    ARR_TABS.forEach((objTab) => {
        const elLi = document.createElement("li");
        elLi.className = "nav-item";
        elLi.setAttribute("role", "presentation");

        const elLink = document.createElement("a");
        elLink.className =
            "nav-link" + (objTab.key === strActiveTab ? " active" : "");
        elLink.href = `/profile/${objTab.key}`;
        elLink.setAttribute("data-spa", "");
        elLink.setAttribute("role", "tab");
        elLink.setAttribute(
            "aria-selected",
            objTab.key === strActiveTab ? "true" : "false",
        );
        elLink.textContent = objTab.label;
        elLi.appendChild(elLink);
        elTabList.appendChild(elLi);
    });

    elNav.appendChild(elTabList);
    elRoot.appendChild(elNav);

    // ---- Tab content container ----
    const elContent = document.createElement("div");
    elContent.id = "tab-content";
    elRoot.appendChild(elContent);

    // Render the active tab's content
    await renderTab(strActiveTab, elContent);
}

// ============================================================
// Tab dispatcher
// ============================================================

/**
 * Call the correct tab render function based on the active tab key.
 * @param {string} strTab
 * @param {HTMLElement} elContainer
 */
async function renderTab(strTab, elContainer) {
    switch (strTab) {
        case "contact":
            await renderContactTab(elContainer);
            break;
        case "summary":
            await renderSummaryTab(elContainer);
            break;
        case "education":
            await renderEducationTab(elContainer);
            break;
        case "jobs":
            await renderJobsTab(elContainer);
            break;
        case "projects":
            await renderProjectsTab(elContainer);
            break;
        case "skills":
            await renderSkillsTab(elContainer);
            break;
        case "certs":
            await renderCertsTab(elContainer);
            break;
        case "awards":
            await renderAwardsTab(elContainer);
            break;
        default: {
            const elMsg = document.createElement("div");
            elMsg.className = "alert alert-warning";
            elMsg.textContent = `Unknown tab: ${strTab}`;
            elContainer.appendChild(elMsg);
        }
    }
}

// ============================================================
// CONTACT TAB
// ============================================================

async function renderContactTab(elContainer) {
    elContainer.innerHTML = "";

    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", "Contact information");

    const elHeading = document.createElement("h2");
    elHeading.className = "h5 mb-3";
    elHeading.textContent = "Contact Information";
    elSection.appendChild(elHeading);

    // Load current data
    let arrContact;
    try {
        arrContact = await getContact();
    } catch (err) {
        showError(elSection, `Failed to load contact: ${err.message}`);
        elContainer.appendChild(elSection);
        return;
    }
    const objContact = arrContact[0] ?? {};

    // Build the form
    const elForm = document.createElement("form");
    elForm.id = "contactForm";
    elForm.noValidate = true;
    elForm.setAttribute("aria-label", "Edit contact information");

    // Helper to build a form field row
    const addField = (strLabel, strName, strType, strValue, blnRequired) => {
        const elDiv = document.createElement("div");
        elDiv.className = "mb-3";
        const elLabel = document.createElement("label");
        elLabel.setAttribute("for", `contact_${strName}`);
        elLabel.className = "form-label";
        elLabel.textContent = strLabel + (blnRequired ? " *" : "");
        const elInput = document.createElement("input");
        elInput.type = strType;
        elInput.id = `contact_${strName}`;
        elInput.name = strName;
        elInput.className = "form-control";
        elInput.value = strValue ?? "";
        if (blnRequired) elInput.setAttribute("aria-required", "true");
        elDiv.appendChild(elLabel);
        elDiv.appendChild(elInput);
        elForm.appendChild(elDiv);
    };

    addField("Full Name", "full_name", "text", objContact.full_name, true);
    addField("Email", "email", "email", objContact.email, false);
    addField("Phone", "phone", "tel", objContact.phone, false);
    addField("Location", "location", "text", objContact.location, false);

    // Links section (dynamic add/remove)
    const elLinksDiv = document.createElement("div");
    elLinksDiv.className = "mb-3";
    const elLinksLabel = document.createElement("p");
    elLinksLabel.className = "form-label mb-1";
    elLinksLabel.textContent = "Links";
    elLinksDiv.appendChild(elLinksLabel);

    // Container for link rows
    const elLinksContainer = document.createElement("div");
    elLinksContainer.id = "linksContainer";
    elLinksDiv.appendChild(elLinksContainer);

    // Add Link button
    const elAddLinkBtn = document.createElement("button");
    elAddLinkBtn.type = "button";
    elAddLinkBtn.className = "btn btn-sm btn-outline-secondary mt-1";
    elAddLinkBtn.textContent = "Add Link";
    elAddLinkBtn.setAttribute("aria-label", "Add a new link");
    elLinksDiv.appendChild(elAddLinkBtn);

    elForm.appendChild(elLinksDiv);

    // Populate existing links
    const arrLinks = Array.isArray(objContact.links_json)
        ? objContact.links_json
        : [];
    arrLinks.forEach((objLink) =>
        addLinkRow(elLinksContainer, objLink.label, objLink.url),
    );

    elAddLinkBtn.addEventListener("click", () =>
        addLinkRow(elLinksContainer, "", ""),
    );

    // Submit button
    const elSubmit = document.createElement("button");
    elSubmit.type = "submit";
    elSubmit.className = "btn btn-primary";
    elSubmit.textContent = "Save Contact";
    elForm.appendChild(elSubmit);

    elForm.addEventListener("submit", async (objEvent) => {
        objEvent.preventDefault();
        clearFormErrors(elSection);

        const strFullName = elForm
            .querySelector("[name='full_name']")
            .value.trim();
        if (!strFullName) {
            showError(elSection, "Full name is required.");
            return;
        }

        // Collect link rows
        const arrLinkRows = [...elLinksContainer.querySelectorAll(".link-row")];
        const arrCollectedLinks = arrLinkRows
            .map((elRow) => ({
                label: elRow.querySelector(".link-label").value.trim(),
                url: elRow.querySelector(".link-url").value.trim(),
            }))
            .filter((objL) => objL.label && objL.url);

        const fnEnable = disableSubmit(elForm);
        try {
            await putContact({
                full_name: strFullName,
                email: elForm.querySelector("[name='email']").value.trim(),
                phone: elForm.querySelector("[name='phone']").value.trim(),
                location: elForm
                    .querySelector("[name='location']")
                    .value.trim(),
                links_json: arrCollectedLinks,
            });
            showSuccess("Contact saved.");
        } catch (err) {
            showError(elSection, err.message);
        } finally {
            fnEnable();
        }
    });

    elSection.appendChild(elForm);
    elContainer.appendChild(elSection);
}

/**
 * Add a link row (label + url inputs) to the links container.
 * @param {HTMLElement} elContainer
 * @param {string} strLabel
 * @param {string} strUrl
 */
function addLinkRow(elContainer, strLabel, strUrl) {
    const elRow = document.createElement("div");
    elRow.className = "d-flex gap-2 mb-2 align-items-center link-row";

    const elLabelInput = document.createElement("input");
    elLabelInput.type = "text";
    elLabelInput.className = "form-control form-control-sm link-label";
    elLabelInput.placeholder = "Label (e.g. LinkedIn)";
    elLabelInput.value = strLabel;
    elLabelInput.setAttribute("aria-label", "Link label");

    const elUrlInput = document.createElement("input");
    elUrlInput.type = "url";
    elUrlInput.className = "form-control form-control-sm link-url";
    elUrlInput.placeholder = "URL";
    elUrlInput.value = strUrl;
    elUrlInput.setAttribute("aria-label", "Link URL");

    const elRemoveBtn = document.createElement("button");
    elRemoveBtn.type = "button";
    elRemoveBtn.className = "btn btn-sm btn-outline-danger";
    elRemoveBtn.textContent = "Remove";
    elRemoveBtn.setAttribute("aria-label", "Remove this link");
    elRemoveBtn.addEventListener("click", () => elRow.remove());

    elRow.appendChild(elLabelInput);
    elRow.appendChild(elUrlInput);
    elRow.appendChild(elRemoveBtn);
    elContainer.appendChild(elRow);
}

// ============================================================
// SUMMARY TAB
// ============================================================

async function renderSummaryTab(elContainer) {
    await renderCrudTab(elContainer, {
        strHeading: "Summary Variants",
        strSectionLabel: "Summary variants",
        fnGetAll: getSummaries,
        fnPost: postSummary,
        fnPut: putSummary,
        fnDelete: deleteSummary,
        fnGetLabel: (obj) => obj.label || "(untitled)",
        arrFields: [
            {
                name: "label",
                label: "Label",
                type: "text",
                required: true,
                placeholder: "e.g. Software Engineer",
            },
            {
                name: "content",
                label: "Content",
                type: "textarea",
                required: true,
                rows: 5,
                aiReview: "summary",
            },
        ],
    });
}

// ============================================================
// EDUCATION TAB
// ============================================================

async function renderEducationTab(elContainer) {
    await renderCrudTab(elContainer, {
        strHeading: "Education",
        strSectionLabel: "Education entries",
        fnGetAll: getEducations,
        fnPost: postEducation,
        fnPut: putEducation,
        fnDelete: deleteEducation,
        fnGetLabel: (obj) =>
            `${obj.institution}${obj.degree ? " — " + obj.degree : ""}`,
        arrFields: [
            {
                name: "institution",
                label: "Institution",
                type: "text",
                required: true,
            },
            { name: "degree", label: "Degree", type: "text" },
            { name: "field", label: "Field of Study", type: "text" },
            {
                name: "start_date",
                label: "Start Date",
                type: "text",
                placeholder: "YYYY-MM",
            },
            {
                name: "end_date",
                label: "End Date",
                type: "text",
                placeholder: "YYYY-MM or leave blank",
            },
            { name: "gpa", label: "GPA", type: "text" },
            {
                name: "details",
                label: "Additional Details",
                type: "textarea",
                rows: 3,
                aiReview: "education",
            },
        ],
    });
}

// ============================================================
// JOBS TAB
// ============================================================

async function renderJobsTab(elContainer) {
    elContainer.innerHTML = "";

    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", "Jobs");

    const elHeading = document.createElement("h2");
    elHeading.className = "h5 mb-3";
    elHeading.textContent = "Work Experience";
    elSection.appendChild(elHeading);

    let arrJobs;
    try {
        arrJobs = await getJobs();
    } catch (err) {
        showError(elSection, `Failed to load jobs: ${err.message}`);
        elContainer.appendChild(elSection);
        return;
    }

    // "Add Job" form (collapsed by default)
    elSection.appendChild(
        buildJobForm(null, async () => {
            arrJobs = await getJobs();
            await renderJobsList(elSection, arrJobs);
        }),
    );

    const elListDiv = document.createElement("div");
    elListDiv.id = "jobsList";
    elSection.appendChild(elListDiv);

    await renderJobsList(elSection, arrJobs);
    elContainer.appendChild(elSection);
}

/**
 * Re-render the jobs list portion of the section.
 * @param {HTMLElement} elSection
 * @param {object[]} arrJobs
 */
async function renderJobsList(elSection, arrJobs) {
    // Replace the existing list div
    let elListDiv = elSection.querySelector("#jobsList");
    if (!elListDiv) {
        elListDiv = document.createElement("div");
        elListDiv.id = "jobsList";
        elSection.appendChild(elListDiv);
    }
    elListDiv.innerHTML = "";

    if (arrJobs.length === 0) {
        const elMsg = document.createElement("p");
        elMsg.className = "text-muted";
        elMsg.textContent = "No jobs added yet.";
        elListDiv.appendChild(elMsg);
        return;
    }

    const elList = document.createElement("div");
    elList.className = "list-group";

    for (const objJob of arrJobs) {
        const elItem = await buildJobListItem(objJob, async () => {
            const arrRefreshed = await getJobs();
            await renderJobsList(elSection, arrRefreshed);
        });
        elList.appendChild(elItem);
    }
    elListDiv.appendChild(elList);
}

/**
 * Build an expandable list item for a job including nested bullets.
 * @param {object} objJob
 * @param {Function} fnRefresh
 * @returns {Promise<HTMLElement>}
 */
async function buildJobListItem(objJob, fnRefresh) {
    const elItem = document.createElement("div");
    elItem.className = "list-group-item list-group-item-action p-3 mb-2";

    // Job summary row
    const elSummary = document.createElement("div");
    elSummary.className = "d-flex justify-content-between align-items-start";

    const elInfo = document.createElement("div");
    const elTitle = document.createElement("strong");
    elTitle.textContent = objJob.title
        ? `${objJob.title} at ${objJob.company}`
        : objJob.company;
    const elDates = document.createElement("small");
    elDates.className = "text-muted d-block";
    const strEnd = objJob.is_current ? "Present" : objJob.end_date || "";
    elDates.textContent = `${objJob.start_date || ""}${strEnd ? " – " + strEnd : ""}${objJob.location ? " · " + objJob.location : ""}`;
    elInfo.appendChild(elTitle);
    elInfo.appendChild(elDates);

    const elBtns = document.createElement("div");
    elBtns.className = "d-flex gap-1 flex-shrink-0 ms-2";

    // Edit button — shows inline form
    const elEditBtn = document.createElement("button");
    elEditBtn.type = "button";
    elEditBtn.className = "btn btn-sm btn-outline-secondary";
    elEditBtn.textContent = "Edit";
    elEditBtn.setAttribute("aria-label", `Edit job ${objJob.company}`);

    // Delete button
    const elDelBtn = document.createElement("button");
    elDelBtn.type = "button";
    elDelBtn.className = "btn btn-sm btn-outline-danger";
    elDelBtn.textContent = "Delete";
    elDelBtn.setAttribute("aria-label", `Delete job ${objJob.company}`);
    elDelBtn.addEventListener("click", async () => {
        const blnConfirmed = await confirmDelete(
            `${objJob.title || objJob.company}`,
        );
        if (!blnConfirmed) return;
        try {
            await deleteJob(objJob.id);
            showSuccess("Job deleted.");
            await fnRefresh();
        } catch (err) {
            showError(elItem, err.message);
        }
    });

    elBtns.appendChild(elEditBtn);
    elBtns.appendChild(elDelBtn);
    elSummary.appendChild(elInfo);
    elSummary.appendChild(elBtns);
    elItem.appendChild(elSummary);

    // Edit form (hidden until Edit is clicked)
    const elEditArea = document.createElement("div");
    elEditArea.className = "mt-2 d-none";
    elItem.appendChild(elEditArea);

    elEditBtn.addEventListener("click", () => {
        if (!elEditArea.classList.contains("d-none")) {
            elEditArea.classList.add("d-none");
            elEditBtn.textContent = "Edit";
            return;
        }
        elEditArea.innerHTML = "";
        elEditArea.appendChild(
            buildJobForm(objJob, async () => {
                elEditArea.classList.add("d-none");
                await fnRefresh();
            }),
        );
        elEditArea.classList.remove("d-none");
        elEditBtn.textContent = "Cancel";
    });

    // Bullets sub-section
    const elBulletsDiv = document.createElement("div");
    elBulletsDiv.className = "mt-3";
    const elBulletsHeading = document.createElement("p");
    elBulletsHeading.className = "mb-1 fw-semibold small";
    elBulletsHeading.textContent = "Bullets";
    elBulletsDiv.appendChild(elBulletsHeading);

    let arrBullets;
    try {
        arrBullets = await getJobBullets(objJob.id);
    } catch {
        arrBullets = [];
    }

    const elBulletList = document.createElement("div");
    elBulletList.className = "mb-2";
    elBulletsDiv.appendChild(elBulletList);

    const fnRefreshBullets = async () => {
        arrBullets = await getJobBullets(objJob.id);
        renderBulletList(
            elBulletList,
            arrBullets,
            objJob.id,
            "job",
            fnRefreshBullets,
        );
    };
    renderBulletList(
        elBulletList,
        arrBullets,
        objJob.id,
        "job",
        fnRefreshBullets,
    );

    // Add bullet form
    elBulletsDiv.appendChild(
        buildBulletAddForm(objJob.id, "job", fnRefreshBullets),
    );
    elItem.appendChild(elBulletsDiv);

    return elItem;
}

/**
 * Build a job create/edit form.
 * @param {object|null} objJob - null for new job
 * @param {Function} fnOnSave
 * @returns {HTMLFormElement}
 */
function buildJobForm(objJob, fnOnSave) {
    const blnIsEdit = objJob !== null;
    const elWrapper = document.createElement("div");
    elWrapper.className = blnIsEdit
        ? "border rounded p-3 bg-light"
        : "card mb-3";

    const elInner = blnIsEdit ? elWrapper : document.createElement("div");
    if (!blnIsEdit) {
        elInner.className = "card-body";
        elWrapper.appendChild(elInner);
    }

    const elHeading = document.createElement("h3");
    elHeading.className = "h6 mb-3";
    elHeading.textContent = blnIsEdit ? "Edit Job" : "Add Job";
    elInner.appendChild(elHeading);

    const elForm = document.createElement("form");
    elForm.noValidate = true;

    const addInput = (
        strLabel,
        strName,
        strType,
        strValue,
        blnRequired,
        strPlaceholder,
    ) => {
        const elDiv = document.createElement("div");
        elDiv.className = "mb-2";
        const elLabel = document.createElement("label");
        elLabel.className = "form-label small";
        elLabel.textContent = strLabel + (blnRequired ? " *" : "");
        const elInput = document.createElement("input");
        elInput.type = strType;
        elInput.name = strName;
        elInput.className = "form-control form-control-sm";
        elInput.value = strValue ?? "";
        if (blnRequired) elInput.setAttribute("aria-required", "true");
        if (strPlaceholder) elInput.placeholder = strPlaceholder;
        elLabel.setAttribute("for", `job_${strName}_${objJob?.id ?? "new"}`);
        elInput.id = `job_${strName}_${objJob?.id ?? "new"}`;
        elDiv.appendChild(elLabel);
        elDiv.appendChild(elInput);
        elForm.appendChild(elDiv);
        return elInput;
    };

    addInput("Company *", "company", "text", objJob?.company, true);
    addInput("Title", "title", "text", objJob?.title);
    addInput("Location", "location", "text", objJob?.location);
    addInput(
        "Start Date",
        "start_date",
        "text",
        objJob?.start_date,
        false,
        "YYYY-MM",
    );
    addInput(
        "End Date",
        "end_date",
        "text",
        objJob?.end_date,
        false,
        "YYYY-MM or blank if current",
    );

    // Is Current checkbox
    const elCheckDiv = document.createElement("div");
    elCheckDiv.className = "form-check mb-2";
    const elCheck = document.createElement("input");
    elCheck.type = "checkbox";
    elCheck.id = `job_is_current_${objJob?.id ?? "new"}`;
    elCheck.name = "is_current";
    elCheck.className = "form-check-input";
    elCheck.checked = Boolean(objJob?.is_current);
    elCheck.setAttribute("aria-label", "Currently working here");
    const elCheckLabel = document.createElement("label");
    elCheckLabel.className = "form-check-label small";
    elCheckLabel.setAttribute("for", `job_is_current_${objJob?.id ?? "new"}`);
    elCheckLabel.textContent = "Currently working here";
    elCheckDiv.appendChild(elCheck);
    elCheckDiv.appendChild(elCheckLabel);
    elForm.appendChild(elCheckDiv);

    const elSubmit = document.createElement("button");
    elSubmit.type = "submit";
    elSubmit.className = "btn btn-sm btn-primary";
    elSubmit.textContent = blnIsEdit ? "Update Job" : "Add Job";
    elForm.appendChild(elSubmit);

    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const strCompany = elForm
            .querySelector("[name='company']")
            .value.trim();
        if (!strCompany) {
            showError(elInner, "Company is required.");
            return;
        }
        const objData = {
            company: strCompany,
            title: elForm.querySelector("[name='title']").value.trim(),
            location: elForm.querySelector("[name='location']").value.trim(),
            start_date: elForm
                .querySelector("[name='start_date']")
                .value.trim(),
            end_date: elForm.querySelector("[name='end_date']").value.trim(),
            is_current: elForm.querySelector("[name='is_current']").checked
                ? 1
                : 0,
        };
        const fnEnable = disableSubmit(elForm);
        try {
            if (blnIsEdit) {
                await putJob(objJob.id, objData);
                showSuccess("Job updated.");
            } else {
                await postJob(objData);
                elForm.reset();
                showSuccess("Job added.");
            }
            await fnOnSave();
        } catch (err) {
            showError(elInner, err.message);
        } finally {
            fnEnable();
        }
    });

    elInner.appendChild(elForm);
    return elWrapper;
}

// ============================================================
// PROJECTS TAB
// ============================================================

async function renderProjectsTab(elContainer) {
    elContainer.innerHTML = "";

    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", "Projects");

    const elHeading = document.createElement("h2");
    elHeading.className = "h5 mb-3";
    elHeading.textContent = "Projects";
    elSection.appendChild(elHeading);

    let arrProjects;
    try {
        arrProjects = await getProjects();
    } catch (err) {
        showError(elSection, `Failed to load projects: ${err.message}`);
        elContainer.appendChild(elSection);
        return;
    }

    elSection.appendChild(
        buildProjectForm(null, async () => {
            arrProjects = await getProjects();
            await renderProjectsList(elSection, arrProjects);
        }),
    );

    const elListDiv = document.createElement("div");
    elListDiv.id = "projectsList";
    elSection.appendChild(elListDiv);

    await renderProjectsList(elSection, arrProjects);
    elContainer.appendChild(elSection);
}

async function renderProjectsList(elSection, arrProjects) {
    let elListDiv = elSection.querySelector("#projectsList");
    if (!elListDiv) {
        elListDiv = document.createElement("div");
        elListDiv.id = "projectsList";
        elSection.appendChild(elListDiv);
    }
    elListDiv.innerHTML = "";

    if (arrProjects.length === 0) {
        const elMsg = document.createElement("p");
        elMsg.className = "text-muted";
        elMsg.textContent = "No projects added yet.";
        elListDiv.appendChild(elMsg);
        return;
    }

    const elList = document.createElement("div");
    elList.className = "list-group";
    for (const objProject of arrProjects) {
        const elItem = await buildProjectListItem(objProject, async () => {
            const arrRefreshed = await getProjects();
            await renderProjectsList(elSection, arrRefreshed);
        });
        elList.appendChild(elItem);
    }
    elListDiv.appendChild(elList);
}

async function buildProjectListItem(objProject, fnRefresh) {
    const elItem = document.createElement("div");
    elItem.className = "list-group-item list-group-item-action p-3 mb-2";

    const elSummary = document.createElement("div");
    elSummary.className = "d-flex justify-content-between align-items-start";

    const elInfo = document.createElement("div");
    const elTitle = document.createElement("strong");
    elTitle.textContent = objProject.name;
    const elDates = document.createElement("small");
    elDates.className = "text-muted d-block";
    const strEnd = objProject.is_current
        ? "Present"
        : objProject.end_date || "";
    elDates.textContent = `${objProject.start_date || ""}${strEnd ? " – " + strEnd : ""}`;
    elInfo.appendChild(elTitle);
    elInfo.appendChild(elDates);

    const elBtns = document.createElement("div");
    elBtns.className = "d-flex gap-1 flex-shrink-0 ms-2";

    const elEditBtn = document.createElement("button");
    elEditBtn.type = "button";
    elEditBtn.className = "btn btn-sm btn-outline-secondary";
    elEditBtn.textContent = "Edit";
    elEditBtn.setAttribute("aria-label", `Edit project ${objProject.name}`);

    const elDelBtn = document.createElement("button");
    elDelBtn.type = "button";
    elDelBtn.className = "btn btn-sm btn-outline-danger";
    elDelBtn.textContent = "Delete";
    elDelBtn.setAttribute("aria-label", `Delete project ${objProject.name}`);
    elDelBtn.addEventListener("click", async () => {
        const blnConfirmed = await confirmDelete(objProject.name);
        if (!blnConfirmed) return;
        try {
            await deleteProject(objProject.id);
            showSuccess("Project deleted.");
            await fnRefresh();
        } catch (err) {
            showError(elItem, err.message);
        }
    });

    elBtns.appendChild(elEditBtn);
    elBtns.appendChild(elDelBtn);
    elSummary.appendChild(elInfo);
    elSummary.appendChild(elBtns);
    elItem.appendChild(elSummary);

    const elEditArea = document.createElement("div");
    elEditArea.className = "mt-2 d-none";
    elItem.appendChild(elEditArea);

    elEditBtn.addEventListener("click", () => {
        if (!elEditArea.classList.contains("d-none")) {
            elEditArea.classList.add("d-none");
            elEditBtn.textContent = "Edit";
            return;
        }
        elEditArea.innerHTML = "";
        elEditArea.appendChild(
            buildProjectForm(objProject, async () => {
                elEditArea.classList.add("d-none");
                await fnRefresh();
            }),
        );
        elEditArea.classList.remove("d-none");
        elEditBtn.textContent = "Cancel";
    });

    // Bullets sub-section
    const elBulletsDiv = document.createElement("div");
    elBulletsDiv.className = "mt-3";
    const elBulletsHeading = document.createElement("p");
    elBulletsHeading.className = "mb-1 fw-semibold small";
    elBulletsHeading.textContent = "Bullets";
    elBulletsDiv.appendChild(elBulletsHeading);

    let arrBullets;
    try {
        arrBullets = await getProjectBullets(objProject.id);
    } catch {
        arrBullets = [];
    }

    const elBulletList = document.createElement("div");
    elBulletList.className = "mb-2";
    elBulletsDiv.appendChild(elBulletList);

    const fnRefreshBullets = async () => {
        arrBullets = await getProjectBullets(objProject.id);
        renderBulletList(
            elBulletList,
            arrBullets,
            objProject.id,
            "project",
            fnRefreshBullets,
        );
    };
    renderBulletList(
        elBulletList,
        arrBullets,
        objProject.id,
        "project",
        fnRefreshBullets,
    );
    elBulletsDiv.appendChild(
        buildBulletAddForm(objProject.id, "project", fnRefreshBullets),
    );
    elItem.appendChild(elBulletsDiv);

    return elItem;
}

function buildProjectForm(objProject, fnOnSave) {
    const blnIsEdit = objProject !== null;
    const elWrapper = document.createElement("div");
    elWrapper.className = blnIsEdit
        ? "border rounded p-3 bg-light"
        : "card mb-3";

    const elInner = blnIsEdit ? elWrapper : document.createElement("div");
    if (!blnIsEdit) {
        elInner.className = "card-body";
        elWrapper.appendChild(elInner);
    }

    const elHeading = document.createElement("h3");
    elHeading.className = "h6 mb-3";
    elHeading.textContent = blnIsEdit ? "Edit Project" : "Add Project";
    elInner.appendChild(elHeading);

    const elForm = document.createElement("form");
    elForm.noValidate = true;

    const addInput = (
        strLabel,
        strName,
        strType,
        strValue,
        blnRequired,
        strPlaceholder,
    ) => {
        const elDiv = document.createElement("div");
        elDiv.className = "mb-2";
        const elLabel = document.createElement("label");
        elLabel.className = "form-label small";
        elLabel.textContent = strLabel;
        const elInput = document.createElement("input");
        elInput.type = strType;
        elInput.name = strName;
        elInput.className = "form-control form-control-sm";
        elInput.value = strValue ?? "";
        if (blnRequired) elInput.setAttribute("aria-required", "true");
        if (strPlaceholder) elInput.placeholder = strPlaceholder;
        const strId = `proj_${strName}_${objProject?.id ?? "new"}`;
        elLabel.setAttribute("for", strId);
        elInput.id = strId;
        elDiv.appendChild(elLabel);
        elDiv.appendChild(elInput);
        elForm.appendChild(elDiv);
    };

    addInput("Name *", "name", "text", objProject?.name, true);
    addInput("Link", "link", "url", objProject?.link);
    addInput("Description", "description", "text", objProject?.description);
    addInput(
        "Start Date",
        "start_date",
        "text",
        objProject?.start_date,
        false,
        "YYYY-MM",
    );
    addInput(
        "End Date",
        "end_date",
        "text",
        objProject?.end_date,
        false,
        "YYYY-MM or blank",
    );

    const elCheckDiv = document.createElement("div");
    elCheckDiv.className = "form-check mb-2";
    const elCheck = document.createElement("input");
    elCheck.type = "checkbox";
    elCheck.id = `proj_is_current_${objProject?.id ?? "new"}`;
    elCheck.name = "is_current";
    elCheck.className = "form-check-input";
    elCheck.checked = Boolean(objProject?.is_current);
    const elCheckLabel = document.createElement("label");
    elCheckLabel.className = "form-check-label small";
    elCheckLabel.setAttribute(
        "for",
        `proj_is_current_${objProject?.id ?? "new"}`,
    );
    elCheckLabel.textContent = "Currently working on this";
    elCheckDiv.appendChild(elCheck);
    elCheckDiv.appendChild(elCheckLabel);
    elForm.appendChild(elCheckDiv);

    const elSubmit = document.createElement("button");
    elSubmit.type = "submit";
    elSubmit.className = "btn btn-sm btn-primary";
    elSubmit.textContent = blnIsEdit ? "Update Project" : "Add Project";
    elForm.appendChild(elSubmit);

    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const strName = elForm.querySelector("[name='name']").value.trim();
        if (!strName) {
            showError(elInner, "Name is required.");
            return;
        }
        const objData = {
            name: strName,
            link: elForm.querySelector("[name='link']").value.trim(),
            description: elForm
                .querySelector("[name='description']")
                .value.trim(),
            start_date: elForm
                .querySelector("[name='start_date']")
                .value.trim(),
            end_date: elForm.querySelector("[name='end_date']").value.trim(),
            is_current: elForm.querySelector("[name='is_current']").checked
                ? 1
                : 0,
        };
        const fnEnable = disableSubmit(elForm);
        try {
            if (blnIsEdit) {
                await putProject(objProject.id, objData);
                showSuccess("Project updated.");
            } else {
                await postProject(objData);
                elForm.reset();
                showSuccess("Project added.");
            }
            await fnOnSave();
        } catch (err) {
            showError(elInner, err.message);
        } finally {
            fnEnable();
        }
    });

    elInner.appendChild(elForm);
    return elWrapper;
}

// ============================================================
// Shared bullet helpers (used by jobs and projects)
// ============================================================

/**
 * Render a list of bullet items with inline edit/delete.
 * @param {HTMLElement} elContainer
 * @param {object[]} arrBullets
 * @param {number} intParentId
 * @param {"job"|"project"} strType
 * @param {Function} fnRefresh
 */
function renderBulletList(
    elContainer,
    arrBullets,
    intParentId,
    strType,
    fnRefresh,
) {
    elContainer.innerHTML = "";
    if (arrBullets.length === 0) {
        const elMsg = document.createElement("p");
        elMsg.className = "text-muted small";
        elMsg.textContent = "No bullets yet.";
        elContainer.appendChild(elMsg);
        return;
    }
    const elUl = document.createElement("ul");
    elUl.className = "list-group list-group-flush";
    arrBullets.forEach((objBullet) => {
        const elLi = document.createElement("li");
        elLi.className =
            "list-group-item px-0 py-1 d-flex justify-content-between align-items-start gap-2";

        const elText = document.createElement("span");
        elText.className = "flex-grow-1 small";
        elText.textContent = objBullet.text;

        const elBtns = document.createElement("div");
        elBtns.className = "d-flex gap-1 flex-shrink-0";

        const elEditBtn = document.createElement("button");
        elEditBtn.type = "button";
        elEditBtn.className = "btn btn-sm btn-outline-secondary py-0 px-1";
        elEditBtn.textContent = "Edit";
        elEditBtn.setAttribute("aria-label", "Edit bullet");

        const elDelBtn = document.createElement("button");
        elDelBtn.type = "button";
        elDelBtn.className = "btn btn-sm btn-outline-danger py-0 px-1";
        elDelBtn.textContent = "Delete";
        elDelBtn.setAttribute("aria-label", "Delete bullet");
        elDelBtn.addEventListener("click", async () => {
            const blnConfirmed = await confirmDelete("this bullet");
            if (!blnConfirmed) return;
            try {
                if (strType === "job") {
                    await deleteJobBullet(intParentId, objBullet.id);
                } else {
                    await deleteProjectBullet(intParentId, objBullet.id);
                }
                await fnRefresh();
            } catch (err) {
                showError(elContainer, err.message);
            }
        });

        // Inline edit — replace text with input
        elEditBtn.addEventListener("click", () => {
            if (elEditBtn.textContent === "Cancel") {
                elEditBtn.textContent = "Edit";
                elText.textContent = objBullet.text;
                // Remove the edit input and any buttons added for edit mode
                elLi.querySelector(".bullet-edit-input")?.remove();
                elLi.querySelector(".bullet-save-btn")?.remove();
                elLi.querySelector(".bullet-ai-btn")?.remove();
                return;
            }
            elText.textContent = "";
            // Textarea allows long bullet text to wrap across multiple lines
            const elInput = document.createElement("textarea");
            elInput.rows = 2;
            // Match the size of other text inputs in the app (no form-control-sm)
            elInput.className = "form-control flex-grow-1 bullet-edit-input";
            elInput.value = objBullet.text;
            elInput.setAttribute("aria-label", "Edit bullet text");
            elText.appendChild(elInput);
            elEditBtn.textContent = "Cancel";

            const elSaveBtn = document.createElement("button");
            elSaveBtn.type = "button";
            elSaveBtn.className =
                "btn btn-sm btn-primary py-0 px-1 bullet-save-btn";
            elSaveBtn.textContent = "Save";
            elSaveBtn.setAttribute("aria-label", "Save bullet edit");

            // AI review button for the inline edit field
            const strSectionType = strType === "job" ? "jobs" : "projects";
            const elAiBtn = createAiReviewButton(elInput, strSectionType);
            elAiBtn.classList.add("py-0", "px-1", "bullet-ai-btn");

            // Prepend in reverse order so final layout is: [AI] [Save] [Cancel] [Delete]
            elBtns.prepend(elSaveBtn);
            elBtns.prepend(elAiBtn);

            elSaveBtn.addEventListener("click", async () => {
                const strNewText = elInput.value.trim();
                if (!strNewText) return;
                try {
                    if (strType === "job") {
                        await putJobBullet(intParentId, objBullet.id, {
                            text: strNewText,
                        });
                    } else {
                        await putProjectBullet(intParentId, objBullet.id, {
                            text: strNewText,
                        });
                    }
                    await fnRefresh();
                } catch (err) {
                    showError(elContainer, err.message);
                }
            });
        });

        elBtns.appendChild(elEditBtn);
        elBtns.appendChild(elDelBtn);
        elLi.appendChild(elText);
        elLi.appendChild(elBtns);
        elUl.appendChild(elLi);
    });
    elContainer.appendChild(elUl);
}

/**
 * Build a small inline form for adding a new bullet.
 * @param {number} intParentId
 * @param {"job"|"project"} strType
 * @param {Function} fnRefresh
 * @returns {HTMLElement}
 */
function buildBulletAddForm(intParentId, strType, fnRefresh) {
    const strSectionType = strType === "job" ? "jobs" : "projects";

    const elDiv = document.createElement("div");
    elDiv.className = "mt-1";

    // Textarea allows long bullet text to wrap across multiple lines
    const elInput = document.createElement("textarea");
    elInput.rows = 2;
    elInput.className = "form-control mb-2";
    elInput.placeholder = "Add a bullet point…";
    elInput.setAttribute("aria-label", "New bullet text");

    const elBtnRow = document.createElement("div");
    elBtnRow.className = "d-flex gap-2";

    const elAddBtn = document.createElement("button");
    elAddBtn.type = "button";
    elAddBtn.className = "btn btn-sm btn-outline-primary flex-shrink-0";
    elAddBtn.textContent = "Add";
    elAddBtn.setAttribute("aria-label", "Add bullet");

    const fnAdd = async () => {
        const strText = elInput.value.trim();
        if (!strText) return;
        try {
            if (strType === "job") {
                await postJobBullet(intParentId, { text: strText });
            } else {
                await postProjectBullet(intParentId, { text: strText });
            }
            elInput.value = "";
            await fnRefresh();
        } catch (err) {
            showError(elDiv, err.message);
        }
    };

    elAddBtn.addEventListener("click", fnAdd);
    elInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            fnAdd();
        }
    });

    // AI review button placed alongside the Add button below the input
    const elAiBtn = createAiReviewButton(elInput, strSectionType);

    elDiv.appendChild(elInput);
    elBtnRow.appendChild(elAiBtn);
    elBtnRow.appendChild(elAddBtn);
    elDiv.appendChild(elBtnRow);

    return elDiv;
}

// ============================================================
// SKILLS TAB
// ============================================================

async function renderSkillsTab(elContainer) {
    elContainer.innerHTML = "";

    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", "Skills");

    const elHeading = document.createElement("h2");
    elHeading.className = "h5 mb-3";
    elHeading.textContent = "Skills";
    elSection.appendChild(elHeading);

    let arrCategories, arrSkills;
    try {
        [arrCategories, arrSkills] = await Promise.all([
            getSkillCategories(),
            getSkills(),
        ]);
    } catch (err) {
        showError(elSection, `Failed to load skills: ${err.message}`);
        elContainer.appendChild(elSection);
        return;
    }

    // Render skill categories with skills nested under each
    const fnRefreshAll = async () => {
        arrCategories = await getSkillCategories();
        arrSkills = await getSkills();
        renderSkillsContent(elSection, arrCategories, arrSkills, fnRefreshAll);
    };

    renderSkillsContent(elSection, arrCategories, arrSkills, fnRefreshAll);
    elContainer.appendChild(elSection);
}

function renderSkillsContent(
    elSection,
    arrCategories,
    arrSkills,
    fnRefreshAll,
) {
    // Remove all dynamic content (preserve the heading)
    const elHeading = elSection.querySelector("h2");
    elSection.innerHTML = "";
    if (elHeading) elSection.appendChild(elHeading);

    // Add Category form
    const elCatFormDiv = document.createElement("div");
    elCatFormDiv.className = "card mb-3";
    const elCatFormBody = document.createElement("div");
    elCatFormBody.className = "card-body";
    const elCatH3 = document.createElement("h3");
    elCatH3.className = "h6 mb-2";
    elCatH3.textContent = "Add Category";
    elCatFormBody.appendChild(elCatH3);
    const elCatForm = document.createElement("form");
    elCatForm.noValidate = true;
    const elCatDiv = document.createElement("div");
    elCatDiv.className = "d-flex gap-2";
    const elCatInput = document.createElement("input");
    elCatInput.type = "text";
    elCatInput.name = "name";
    elCatInput.className = "form-control form-control-sm";
    elCatInput.placeholder = "Category name";
    elCatInput.setAttribute("aria-label", "Skill category name");
    elCatInput.setAttribute("aria-required", "true");
    const elCatBtn = document.createElement("button");
    elCatBtn.type = "submit";
    elCatBtn.className = "btn btn-sm btn-outline-primary flex-shrink-0";
    elCatBtn.textContent = "Add Category";
    elCatDiv.appendChild(elCatInput);
    elCatDiv.appendChild(elCatBtn);
    elCatForm.appendChild(elCatDiv);
    elCatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const strName = elCatInput.value.trim();
        if (!strName) return;
        try {
            await postSkillCategory({ name: strName });
            elCatInput.value = "";
            showSuccess("Category added.");
            await fnRefreshAll();
        } catch (err) {
            showError(elCatFormBody, err.message);
        }
    });
    elCatFormBody.appendChild(elCatForm);
    elCatFormDiv.appendChild(elCatFormBody);
    elSection.appendChild(elCatFormDiv);

    // Add Skill (no category) form
    const elSkillFormDiv = document.createElement("div");
    elSkillFormDiv.className = "card mb-3";
    const elSkillFormBody = document.createElement("div");
    elSkillFormBody.className = "card-body";
    const elSkillH3 = document.createElement("h3");
    elSkillH3.className = "h6 mb-2";
    elSkillH3.textContent = "Add Uncategorized Skill";
    elSkillFormBody.appendChild(elSkillH3);
    const elSkillForm = document.createElement("form");
    elSkillForm.noValidate = true;
    const elSkillDiv = document.createElement("div");
    elSkillDiv.className = "d-flex gap-2";
    const elSkillInput = document.createElement("input");
    elSkillInput.type = "text";
    elSkillInput.name = "name";
    elSkillInput.className = "form-control form-control-sm";
    elSkillInput.placeholder = "Skill name";
    elSkillInput.setAttribute("aria-label", "Skill name");
    elSkillInput.setAttribute("aria-required", "true");
    const elSkillBtn = document.createElement("button");
    elSkillBtn.type = "submit";
    elSkillBtn.className = "btn btn-sm btn-outline-primary flex-shrink-0";
    elSkillBtn.textContent = "Add Skill";
    elSkillDiv.appendChild(elSkillInput);
    elSkillDiv.appendChild(elSkillBtn);
    elSkillForm.appendChild(elSkillDiv);
    elSkillForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const strName = elSkillInput.value.trim();
        if (!strName) return;
        try {
            await postSkill({ name: strName, category_id: null });
            elSkillInput.value = "";
            showSuccess("Skill added.");
            await fnRefreshAll();
        } catch (err) {
            showError(elSkillFormBody, err.message);
        }
    });
    elSkillFormBody.appendChild(elSkillForm);
    elSkillFormDiv.appendChild(elSkillFormBody);
    elSection.appendChild(elSkillFormDiv);

    // Uncategorized skills
    const arrUncategorized = arrSkills.filter((s) => s.category_id === null);
    if (arrUncategorized.length > 0) {
        const elDiv = document.createElement("div");
        elDiv.className = "mb-3";
        const elTitle = document.createElement("h3");
        elTitle.className = "h6";
        elTitle.textContent = "Uncategorized";
        elDiv.appendChild(elTitle);
        elDiv.appendChild(
            buildSkillList(arrUncategorized, arrCategories, fnRefreshAll),
        );
        elSection.appendChild(elDiv);
    }

    // Skills per category
    arrCategories.forEach((objCat) => {
        const arrCatSkills = arrSkills.filter(
            (s) => s.category_id === objCat.id,
        );
        const elCard = document.createElement("div");
        elCard.className = "card mb-3";
        const elCardBody = document.createElement("div");
        elCardBody.className = "card-body";

        const elCatHeader = document.createElement("div");
        elCatHeader.className =
            "d-flex justify-content-between align-items-center mb-2";
        const elCatTitle = document.createElement("h3");
        elCatTitle.className = "h6 mb-0";
        elCatTitle.textContent = objCat.name;

        // Category edit/delete
        const elCatBtns = document.createElement("div");
        elCatBtns.className = "d-flex gap-1";
        const elCatDelBtn = document.createElement("button");
        elCatDelBtn.type = "button";
        elCatDelBtn.className = "btn btn-sm btn-outline-danger";
        elCatDelBtn.textContent = "Delete Category";
        elCatDelBtn.setAttribute(
            "aria-label",
            `Delete category ${objCat.name}`,
        );
        elCatDelBtn.addEventListener("click", async () => {
            const blnOk = await confirmDelete(objCat.name);
            if (!blnOk) return;
            try {
                await deleteSkillCategory(objCat.id);
                showSuccess("Category deleted.");
                await fnRefreshAll();
            } catch (err) {
                showError(elCardBody, err.message);
            }
        });
        elCatBtns.appendChild(elCatDelBtn);
        elCatHeader.appendChild(elCatTitle);
        elCatHeader.appendChild(elCatBtns);
        elCardBody.appendChild(elCatHeader);

        // Skills in this category
        elCardBody.appendChild(
            buildSkillList(arrCatSkills, arrCategories, fnRefreshAll),
        );

        // Add skill to this category
        const elAddSkillForm = document.createElement("form");
        elAddSkillForm.noValidate = true;
        elAddSkillForm.className = "d-flex gap-2 mt-2";
        const elAddInput = document.createElement("input");
        elAddInput.type = "text";
        elAddInput.className = "form-control form-control-sm";
        elAddInput.placeholder = `Add skill to ${objCat.name}`;
        elAddInput.setAttribute("aria-label", `Add skill to ${objCat.name}`);
        const elAddBtn = document.createElement("button");
        elAddBtn.type = "submit";
        elAddBtn.className = "btn btn-sm btn-outline-primary flex-shrink-0";
        elAddBtn.textContent = "Add";
        elAddSkillForm.appendChild(elAddInput);
        elAddSkillForm.appendChild(elAddBtn);
        elAddSkillForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const strName = elAddInput.value.trim();
            if (!strName) return;
            try {
                await postSkill({ name: strName, category_id: objCat.id });
                elAddInput.value = "";
                showSuccess("Skill added.");
                await fnRefreshAll();
            } catch (err) {
                showError(elCardBody, err.message);
            }
        });
        elCardBody.appendChild(elAddSkillForm);
        elCard.appendChild(elCardBody);
        elSection.appendChild(elCard);
    });
}

/**
 * Build a list-group of skills with edit/delete.
 * @param {object[]} arrSkillItems
 * @param {object[]} arrCategories
 * @param {Function} fnRefreshAll
 * @returns {HTMLElement}
 */
function buildSkillList(arrSkillItems, arrCategories, fnRefreshAll) {
    if (arrSkillItems.length === 0) {
        const elMsg = document.createElement("p");
        elMsg.className = "text-muted small mb-1";
        elMsg.textContent = "No skills yet.";
        return elMsg;
    }
    const elUl = document.createElement("ul");
    elUl.className = "list-group list-group-flush";
    arrSkillItems.forEach((objSkill) => {
        const elLi = document.createElement("li");
        elLi.className =
            "list-group-item d-flex justify-content-between align-items-center px-0 py-1";
        const elName = document.createElement("span");
        elName.className = "small";
        elName.textContent = objSkill.name;
        const elBtns = document.createElement("div");
        elBtns.className = "d-flex gap-1";
        const elDelBtn = document.createElement("button");
        elDelBtn.type = "button";
        elDelBtn.className = "btn btn-sm btn-outline-danger py-0 px-1";
        elDelBtn.textContent = "Delete";
        elDelBtn.setAttribute("aria-label", `Delete skill ${objSkill.name}`);
        elDelBtn.addEventListener("click", async () => {
            const blnOk = await confirmDelete(objSkill.name);
            if (!blnOk) return;
            try {
                await deleteSkill(objSkill.id);
                showSuccess("Skill deleted.");
                await fnRefreshAll();
            } catch (err) {
                showError(elLi, err.message);
            }
        });
        elBtns.appendChild(elDelBtn);
        elLi.appendChild(elName);
        elLi.appendChild(elBtns);
        elUl.appendChild(elLi);
    });
    return elUl;
}

// ============================================================
// CERTS TAB
// ============================================================

async function renderCertsTab(elContainer) {
    await renderCrudTab(elContainer, {
        strHeading: "Certifications",
        strSectionLabel: "Certifications",
        fnGetAll: getCertifications,
        fnPost: postCertification,
        fnPut: putCertification,
        fnDelete: deleteCertification,
        fnGetLabel: (obj) =>
            `${obj.name}${obj.issuer ? " — " + obj.issuer : ""}`,
        arrFields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "issuer", label: "Issuer", type: "text" },
            {
                name: "issued_date",
                label: "Issue Date",
                type: "text",
                placeholder: "YYYY-MM",
            },
        ],
    });
}

// ============================================================
// AWARDS TAB
// ============================================================

async function renderAwardsTab(elContainer) {
    await renderCrudTab(elContainer, {
        strHeading: "Awards",
        strSectionLabel: "Awards",
        fnGetAll: getAwards,
        fnPost: postAward,
        fnPut: putAward,
        fnDelete: deleteAward,
        fnGetLabel: (obj) =>
            `${obj.name}${obj.issuer ? " — " + obj.issuer : ""}`,
        arrFields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "issuer", label: "Issuer", type: "text" },
            {
                name: "issued_date",
                label: "Date",
                type: "text",
                placeholder: "YYYY-MM",
            },
            {
                name: "description",
                label: "Description",
                type: "textarea",
                rows: 3,
                aiReview: "awards",
            },
        ],
    });
}

// ============================================================
// Generic CRUD tab renderer
// Used by summary, education, certs, awards — any flat list with no sub-entities
// ============================================================

/**
 * Generic renderer for a tab that manages a flat list of items.
 * @param {HTMLElement} elContainer
 * @param {object} objConfig
 */
async function renderCrudTab(
    elContainer,
    {
        strHeading,
        strSectionLabel,
        fnGetAll,
        fnPost,
        fnPut,
        fnDelete,
        fnGetLabel,
        arrFields,
    },
) {
    elContainer.innerHTML = "";

    const elSection = document.createElement("section");
    elSection.setAttribute("aria-label", strSectionLabel);

    const elHeading = document.createElement("h2");
    elHeading.className = "h5 mb-3";
    elHeading.textContent = strHeading;
    elSection.appendChild(elHeading);

    let arrItems;
    try {
        arrItems = await fnGetAll();
    } catch (err) {
        showError(
            elSection,
            `Failed to load ${strHeading.toLowerCase()}: ${err.message}`,
        );
        elContainer.appendChild(elSection);
        return;
    }

    // State: which item (if any) is currently being edited
    let intEditingId = null;

    const fnRefresh = async () => {
        arrItems = await fnGetAll();
        intEditingId = null;
        renderList();
    };

    // ---- Add form ----
    const elAddCard = document.createElement("div");
    elAddCard.className = "card mb-4";
    const elAddBody = document.createElement("div");
    elAddBody.className = "card-body";
    const elAddHeading = document.createElement("h3");
    elAddHeading.className = "h6 mb-2";
    elAddHeading.textContent = `Add ${strHeading}`;
    elAddBody.appendChild(elAddHeading);

    const elAddForm = buildCrudForm(
        arrFields,
        null,
        async (objData) => {
            await fnPost(objData);
            showSuccess(`${strHeading} added.`);
            await fnRefresh();
        },
        elAddBody,
    );

    elAddBody.appendChild(elAddForm);
    elAddCard.appendChild(elAddBody);
    elSection.appendChild(elAddCard);

    // ---- List container ----
    const elListDiv = document.createElement("div");
    elSection.appendChild(elListDiv);

    function renderList() {
        elListDiv.innerHTML = "";
        if (arrItems.length === 0) {
            const elMsg = document.createElement("p");
            elMsg.className = "text-muted";
            elMsg.textContent = `No ${strHeading.toLowerCase()} added yet.`;
            elListDiv.appendChild(elMsg);
            return;
        }

        const elUl = document.createElement("ul");
        elUl.className = "list-group";

        arrItems.forEach((objItem) => {
            const elLi = document.createElement("li");
            elLi.className = "list-group-item";

            if (intEditingId === objItem.id) {
                // Show inline edit form
                const elEditForm = buildCrudForm(
                    arrFields,
                    objItem,
                    async (objData) => {
                        await fnPut(objItem.id, objData);
                        showSuccess(`${strHeading} updated.`);
                        await fnRefresh();
                    },
                    elLi,
                );
                const elCancelBtn = document.createElement("button");
                elCancelBtn.type = "button";
                elCancelBtn.className = "btn btn-sm btn-secondary mt-2";
                elCancelBtn.textContent = "Cancel";
                elCancelBtn.addEventListener("click", () => {
                    intEditingId = null;
                    renderList();
                });
                elLi.appendChild(elEditForm);
                elLi.appendChild(elCancelBtn);
            } else {
                // Show display row
                const elRow = document.createElement("div");
                elRow.className =
                    "d-flex justify-content-between align-items-center";

                const elLabel = document.createElement("span");
                elLabel.textContent = fnGetLabel(objItem);

                const elBtns = document.createElement("div");
                elBtns.className = "d-flex gap-1";

                const elEditBtn = document.createElement("button");
                elEditBtn.type = "button";
                elEditBtn.className = "btn btn-sm btn-outline-secondary";
                elEditBtn.textContent = "Edit";
                elEditBtn.setAttribute(
                    "aria-label",
                    `Edit ${fnGetLabel(objItem)}`,
                );
                elEditBtn.addEventListener("click", () => {
                    intEditingId = objItem.id;
                    renderList();
                });

                const elDelBtn = document.createElement("button");
                elDelBtn.type = "button";
                elDelBtn.className = "btn btn-sm btn-outline-danger";
                elDelBtn.textContent = "Delete";
                elDelBtn.setAttribute(
                    "aria-label",
                    `Delete ${fnGetLabel(objItem)}`,
                );
                elDelBtn.addEventListener("click", async () => {
                    const blnOk = await confirmDelete(fnGetLabel(objItem));
                    if (!blnOk) return;
                    try {
                        await fnDelete(objItem.id);
                        showSuccess(`${strHeading} deleted.`);
                        await fnRefresh();
                    } catch (err) {
                        showError(elSection, err.message);
                    }
                });

                elBtns.appendChild(elEditBtn);
                elBtns.appendChild(elDelBtn);
                elRow.appendChild(elLabel);
                elRow.appendChild(elBtns);
                elLi.appendChild(elRow);
            }

            elUl.appendChild(elLi);
        });

        elListDiv.appendChild(elUl);
    }

    renderList();
    elContainer.appendChild(elSection);
}

/**
 * Build a generic CRUD form from a field spec array.
 * If objInitial is non-null, pre-fills the form with existing values.
 *
 * @param {object[]} arrFields
 * @param {object|null} objInitial
 * @param {Function} fnOnSubmit - called with the form data object
 * @param {HTMLElement} elParent - container to show errors in
 * @returns {HTMLFormElement}
 */
function buildCrudForm(arrFields, objInitial, fnOnSubmit, elParent) {
    const elForm = document.createElement("form");
    elForm.noValidate = true;

    arrFields.forEach((objField) => {
        const elDiv = document.createElement("div");
        elDiv.className = "mb-2";

        const strId = `field_${objField.name}_${objInitial?.id ?? "new"}`;
        const elLabel = document.createElement("label");
        elLabel.setAttribute("for", strId);
        elLabel.className = "form-label small";
        elLabel.textContent = objField.label + (objField.required ? " *" : "");

        let elInput;
        if (objField.type === "textarea") {
            elInput = document.createElement("textarea");
            elInput.rows = objField.rows ?? 3;
            elInput.className = "form-control form-control-sm";
            elInput.value = objInitial?.[objField.name] ?? "";
        } else {
            elInput = document.createElement("input");
            elInput.type = objField.type ?? "text";
            elInput.className = "form-control form-control-sm";
            elInput.value = objInitial?.[objField.name] ?? "";
            if (objField.placeholder)
                elInput.placeholder = objField.placeholder;
        }

        elInput.id = strId;
        elInput.name = objField.name;
        if (objField.required) elInput.setAttribute("aria-required", "true");

        elDiv.appendChild(elLabel);
        elDiv.appendChild(elInput);
        elForm.appendChild(elDiv);

        // Attach AI review button if flagged for this field
        if (objField.aiReview && elInput.tagName === "TEXTAREA") {
            attachAiReview(elInput, objField.aiReview);
        }
    });

    const elSubmit = document.createElement("button");
    elSubmit.type = "submit";
    elSubmit.className = "btn btn-sm btn-primary mt-1";
    elSubmit.textContent = objInitial ? "Update" : "Add";
    elForm.appendChild(elSubmit);

    elForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormErrors(elParent);

        // Collect form values
        const objData = {};
        arrFields.forEach((objField) => {
            const elFld = elForm.querySelector(`[name="${objField.name}"]`);
            if (!elFld) return;
            objData[objField.name] = elFld.value.trim();
        });

        // Check required fields
        const strMissingField = arrFields.find(
            (f) => f.required && !objData[f.name],
        );
        if (strMissingField) {
            showError(elParent, `${strMissingField.label} is required.`);
            return;
        }

        const fnEnable = disableSubmit(elForm);
        try {
            await fnOnSubmit(objData);
            if (!objInitial) elForm.reset();
        } catch (err) {
            showError(elParent, err.message);
        } finally {
            fnEnable();
        }
    });

    return elForm;
}

// ============================================================
// Internal helpers
// ============================================================

/** Clear any form errors within a container (avoids importing clearErrors to keep this self-contained). */
function clearFormErrors(elContainer) {
    elContainer.querySelectorAll(".js-form-error").forEach((el) => el.remove());
}
