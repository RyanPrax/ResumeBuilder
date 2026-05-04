// AI: Generated with Claude Code — thin fetch helpers wrapping all /api/* endpoints.
// All view modules import from here so HTTP details are centralized in one place.
// Every function returns the parsed JSON response body, or throws on error.

// ============================================================
// Internal helper — wraps fetch with JSON body support
// ============================================================

/**
 * Make an HTTP request and return the parsed JSON body.
 * Throws an Error (with the server's message string) if the response
 * is not in the 2xx range, so callers can catch with a single try/catch.
 *
 * @param {string} strUrl
 * @param {RequestInit} [objOptions]
 * @returns {Promise<any>}
 */
async function request(strUrl, objOptions = {}) {
    // Default Content-Type to application/json for POST/PUT requests that
    // send a body, unless the caller has already set different headers.
    const objHeaders = { "Content-Type": "application/json", ...(objOptions.headers ?? {}) };

    const objResponse = await fetch(strUrl, { ...objOptions, headers: objHeaders });

    // Try to parse the JSON body regardless of status code — the server sends
    // useful error messages in the body even for 4xx/5xx responses.
    let objBody;
    try {
        objBody = await objResponse.json();
    } catch {
        // Body is empty or not JSON — construct a minimal error object
        objBody = { message: `HTTP ${objResponse.status} ${objResponse.statusText}` };
    }

    if (!objResponse.ok) {
        // Surface the server's error message so the UI can display it
        throw new Error(objBody.message ?? `Request failed with status ${objResponse.status}`);
    }

    return objBody;
}

// ============================================================
// Contact  (singleton — no id needed)
// ============================================================

/** Retrieve the single contact record. Returns an array of one item. */
export async function getContact() {
    return request("/api/contact");
}

/** Replace all contact fields. links_json should be an array of {label, url}. */
export async function putContact(objData) {
    return request("/api/contact", {
        method: "PUT",
        body: JSON.stringify(objData),
    });
}

// ============================================================
// Summaries
// ============================================================

export async function getSummaries() {
    return request("/api/summary");
}

export async function postSummary(objData) {
    return request("/api/summary", { method: "POST", body: JSON.stringify(objData) });
}

export async function putSummary(intId, objData) {
    return request(`/api/summary/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteSummary(intId) {
    return request(`/api/summary/${intId}`, { method: "DELETE" });
}

// ============================================================
// Educations
// ============================================================

export async function getEducations() {
    return request("/api/educations");
}

export async function postEducation(objData) {
    return request("/api/educations", { method: "POST", body: JSON.stringify(objData) });
}

export async function putEducation(intId, objData) {
    return request(`/api/educations/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteEducation(intId) {
    return request(`/api/educations/${intId}`, { method: "DELETE" });
}

// ============================================================
// Jobs
// ============================================================

export async function getJobs() {
    return request("/api/jobs");
}

export async function postJob(objData) {
    return request("/api/jobs", { method: "POST", body: JSON.stringify(objData) });
}

export async function putJob(intId, objData) {
    return request(`/api/jobs/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteJob(intId) {
    return request(`/api/jobs/${intId}`, { method: "DELETE" });
}

// Job bullets

export async function getJobBullets(intJobId) {
    return request(`/api/jobs/${intJobId}/bullets`);
}

export async function postJobBullet(intJobId, objData) {
    return request(`/api/jobs/${intJobId}/bullets`, { method: "POST", body: JSON.stringify(objData) });
}

export async function putJobBullet(intJobId, intBulletId, objData) {
    return request(`/api/jobs/${intJobId}/bullets/${intBulletId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteJobBullet(intJobId, intBulletId) {
    return request(`/api/jobs/${intJobId}/bullets/${intBulletId}`, { method: "DELETE" });
}

// ============================================================
// Projects
// ============================================================

export async function getProjects() {
    return request("/api/projects");
}

export async function postProject(objData) {
    return request("/api/projects", { method: "POST", body: JSON.stringify(objData) });
}

export async function putProject(intId, objData) {
    return request(`/api/projects/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteProject(intId) {
    return request(`/api/projects/${intId}`, { method: "DELETE" });
}

// Project bullets

export async function getProjectBullets(intProjectId) {
    return request(`/api/projects/${intProjectId}/bullets`);
}

export async function postProjectBullet(intProjectId, objData) {
    return request(`/api/projects/${intProjectId}/bullets`, { method: "POST", body: JSON.stringify(objData) });
}

export async function putProjectBullet(intProjectId, intBulletId, objData) {
    return request(`/api/projects/${intProjectId}/bullets/${intBulletId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteProjectBullet(intProjectId, intBulletId) {
    return request(`/api/projects/${intProjectId}/bullets/${intBulletId}`, { method: "DELETE" });
}

// ============================================================
// Skill categories
// ============================================================

export async function getSkillCategories() {
    return request("/api/skill-categories");
}

export async function postSkillCategory(objData) {
    return request("/api/skill-categories", { method: "POST", body: JSON.stringify(objData) });
}

export async function putSkillCategory(intId, objData) {
    return request(`/api/skill-categories/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteSkillCategory(intId) {
    return request(`/api/skill-categories/${intId}`, { method: "DELETE" });
}

// ============================================================
// Skills
// ============================================================

export async function getSkills() {
    return request("/api/skills");
}

export async function postSkill(objData) {
    return request("/api/skills", { method: "POST", body: JSON.stringify(objData) });
}

export async function putSkill(intId, objData) {
    return request(`/api/skills/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteSkill(intId) {
    return request(`/api/skills/${intId}`, { method: "DELETE" });
}

// ============================================================
// Certifications
// ============================================================

export async function getCertifications() {
    return request("/api/certifications");
}

export async function postCertification(objData) {
    return request("/api/certifications", { method: "POST", body: JSON.stringify(objData) });
}

export async function putCertification(intId, objData) {
    return request(`/api/certifications/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteCertification(intId) {
    return request(`/api/certifications/${intId}`, { method: "DELETE" });
}

// ============================================================
// Awards
// ============================================================

export async function getAwards() {
    return request("/api/awards");
}

export async function postAward(objData) {
    return request("/api/awards", { method: "POST", body: JSON.stringify(objData) });
}

export async function putAward(intId, objData) {
    return request(`/api/awards/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteAward(intId) {
    return request(`/api/awards/${intId}`, { method: "DELETE" });
}

// ============================================================
// Resumes
// ============================================================

export async function getResumes() {
    return request("/api/resumes");
}

export async function getResume(intId) {
    return request(`/api/resumes/${intId}`);
}

export async function postResume(objData) {
    return request("/api/resumes", { method: "POST", body: JSON.stringify(objData) });
}

export async function putResume(intId, objData) {
    return request(`/api/resumes/${intId}`, { method: "PUT", body: JSON.stringify(objData) });
}

export async function deleteResume(intId) {
    return request(`/api/resumes/${intId}`, { method: "DELETE" });
}

/**
 * Load the saved selections for a resume.
 * Returns { sections: [...], items: [...], bullets: [...] }
 */
export async function getResumeSelections(intId) {
    return request(`/api/resumes/${intId}/selections`);
}

/**
 * Save all selections for a resume (full replacement).
 * @param {number} intId
 * @param {{ sections: object[], items: object[], bullets: object[] }} objSelections
 */
export async function putResumeSelections(intId, objSelections) {
    return request(`/api/resumes/${intId}/selections`, {
        method: "PUT",
        body: JSON.stringify(objSelections),
    });
}

// ============================================================
// AI review
// ============================================================

/**
 * Request an AI review for a section of text.
 * @param {string} strSectionType - e.g. "summary", "jobs"
 * @param {string} strText - the prose to review
 * @returns {Promise<{ suggestions: string[] }>}
 */
export async function postAiReview(strSectionType, strText) {
    return request("/api/ai/review", {
        method: "POST",
        body: JSON.stringify({ sectionType: strSectionType, text: strText }),
    });
}
