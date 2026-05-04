// AI: Generated with Claude Code — idempotent seed script for Resume Frog demo data.
// Inserts three sample resumes (beginner, mid-level, senior) into the local SQLite DB.
// Run with: npm run seed
// Safe to run multiple times — each resume is skipped if it already exists by name.

// Import the shared DB singleton — this runs the schema migration so all
// tables exist before the prepared statements below are compiled.
import db from "../lib/db.js";

// ============================================================
// Prepared statements
// ============================================================

const stmtResumeExists    = db.prepare("SELECT id FROM resumes WHERE name = ?");
const stmtInsertResume    = db.prepare("INSERT INTO resumes (name, target_role) VALUES (?, ?)");
const stmtInsertSection   = db.prepare("INSERT INTO resume_sections (resume_id, section_type, included, sort_order) VALUES (?, ?, 1, ?)");
const stmtInsertItem      = db.prepare("INSERT INTO resume_items (resume_id, section_type, item_id, sort_order) VALUES (?, ?, ?, ?)");
const stmtInsertBulletSel = db.prepare("INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (?, ?, ?, ?, ?)");
const stmtInsertSummary   = db.prepare("INSERT INTO summaries (label, content) VALUES (?, ?)");
const stmtInsertEdu       = db.prepare("INSERT INTO educations (institution, degree, field, end_date, gpa) VALUES (?, ?, ?, ?, ?)");
const stmtInsertJob       = db.prepare("INSERT INTO jobs (company, title, location, start_date, end_date, is_current, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
const stmtInsertJobBullet = db.prepare("INSERT INTO job_bullets (job_id, text, sort_order) VALUES (?, ?, ?)");
const stmtInsertProject   = db.prepare("INSERT INTO projects (name, description, start_date, end_date, is_current, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
const stmtInsertProjBullet = db.prepare("INSERT INTO project_bullets (project_id, text, sort_order) VALUES (?, ?, ?)");
const stmtInsertSkillCat  = db.prepare("INSERT INTO skill_categories (name, sort_order) VALUES (?, ?)");
const stmtInsertSkill     = db.prepare("INSERT INTO skills (category_id, name, sort_order) VALUES (?, ?, ?)");
const stmtInsertCert      = db.prepare("INSERT INTO certifications (name, issuer, issued_date) VALUES (?, ?, ?)");

// ============================================================
// Helper functions
// Each returns the inserted IDs so callers can wire resume_items
// and resume_bullets without extra SELECT queries.
// ============================================================

/**
 * Insert a job with its bullets.
 * @returns {{ jobId: number, bulletIds: number[] }}
 */
function insertJob(company, title, location, startDate, endDate, isCurrent, sortOrder, bullets) {
    const { lastInsertRowid: jobId } = stmtInsertJob.run(
        company, title, location, startDate, endDate, isCurrent, sortOrder
    );
    const bulletIds = bullets.map((text, i) => {
        const { lastInsertRowid } = stmtInsertJobBullet.run(jobId, text, i);
        return lastInsertRowid;
    });
    return { jobId, bulletIds };
}

/**
 * Insert a project with its bullets.
 * @returns {{ projectId: number, bulletIds: number[] }}
 */
function insertProject(name, description, startDate, endDate, isCurrent, sortOrder, bullets) {
    const { lastInsertRowid: projectId } = stmtInsertProject.run(
        name, description, startDate, endDate, isCurrent, sortOrder
    );
    const bulletIds = bullets.map((text, i) => {
        const { lastInsertRowid } = stmtInsertProjBullet.run(projectId, text, i);
        return lastInsertRowid;
    });
    return { projectId, bulletIds };
}

/**
 * Insert a skill category with its skills.
 * @returns {{ categoryId: number, skillIds: number[] }}
 */
function insertSkillCategory(name, sortOrder, skillNames) {
    const { lastInsertRowid: categoryId } = stmtInsertSkillCat.run(name, sortOrder);
    const skillIds = skillNames.map((skillName, i) => {
        const { lastInsertRowid } = stmtInsertSkill.run(categoryId, skillName, i);
        return lastInsertRowid;
    });
    return { categoryId, skillIds };
}

/**
 * Wire all bullets from a job into resume_bullets.
 * @param {number} resumeId
 * @param {{ jobId: number, bulletIds: number[] }} job
 * @param {number[]} [bulletIndexes] — which bullets to include (default: all)
 */
function selectJobBullets(resumeId, job, bulletIndexes) {
    const idxs = bulletIndexes ?? job.bulletIds.map((_, i) => i);
    idxs.forEach((i, sortOrder) => {
        stmtInsertBulletSel.run(resumeId, job.jobId, "job", job.bulletIds[i], sortOrder);
    });
}

/**
 * Wire all bullets from a project into resume_bullets.
 * @param {number} resumeId
 * @param {{ projectId: number, bulletIds: number[] }} project
 * @param {number[]} [bulletIndexes] — which bullets to include (default: all)
 */
function selectProjectBullets(resumeId, project, bulletIndexes) {
    const idxs = bulletIndexes ?? project.bulletIds.map((_, i) => i);
    idxs.forEach((i, sortOrder) => {
        stmtInsertBulletSel.run(resumeId, project.projectId, "project", project.bulletIds[i], sortOrder);
    });
}

/**
 * Insert resume_sections rows in order.
 * @param {number} resumeId
 * @param {string[]} sectionTypes — ordered list of section types to include
 */
function insertSections(resumeId, sectionTypes) {
    sectionTypes.forEach((type, i) => stmtInsertSection.run(resumeId, type, i));
}

/**
 * Insert resume_items for a flat list of { sectionType, itemId } pairs.
 * Items are inserted in array order; sort_order is per section_type.
 * @param {number} resumeId
 * @param {Array<{ sectionType: string, itemId: number }>} items
 */
function insertItems(resumeId, items) {
    // Track per-section sort_order counters
    const counters = {};
    items.forEach(({ sectionType, itemId }) => {
        counters[sectionType] = (counters[sectionType] ?? 0);
        stmtInsertItem.run(resumeId, sectionType, itemId, counters[sectionType]++);
    });
}

// ============================================================
// BEGINNER — Junior Software Engineer
// ~half page to sparse full page, includes a summary
// Section order: contact → summary → skills → jobs → projects → education
// ============================================================

const BEGINNER_NAME = "[SEED] Beginner — Junior Developer";

if (stmtResumeExists.get(BEGINNER_NAME)) {
    console.log(`Skip (already seeded): ${BEGINNER_NAME}`);
} else {
    db.transaction(() => {

        // Summary
        const { lastInsertRowid: summaryId } = stmtInsertSummary.run(
            "Junior Developer",
            "Computer Science graduate with hands-on experience building full-stack web applications through internships and personal projects. Proficient in Python and JavaScript with a strong foundation in software engineering fundamentals seeking a junior software engineering role."
        );

        // Education
        const { lastInsertRowid: eduId } = stmtInsertEdu.run(
            "State University", "BS", "Computer Science", "May 2024", "3.81"
        );

        // Jobs
        const jobIntern = insertJob(
            "TechStartup Inc", "Software Engineering Intern", "Austin, TX",
            "May 2023", "Aug 2023", 0, 0,
            [
                "Built a Node.js REST endpoint replacing a synchronous third-party call with an async queue, reducing average checkout latency by 18%",
                "Developed a React dashboard component consumed by 3 internal teams, eliminating 4 hours of manual weekly reporting",
                "Increased payments module test coverage from 42% to 78% by writing unit and integration tests with Jest",
            ]
        );

        // Projects
        const projBudget = insertProject(
            "Personal Budget Tracker", "",
            "Jan 2024", "", 1, 0,
            [
                "Built a full-stack budgeting app with React, Node.js, and SQLite tracking transactions across 5 categories with monthly trend charts",
                "Deployed to a VPS behind an NGINX reverse proxy with automated nightly SQLite backups via cron",
            ]
        );
        const projCapstone = insertProject(
            "Campus Event Aggregator — CS Capstone", "",
            "Aug 2023", "Dec 2023", 0, 1,
            [
                "Designed a Python scraper aggregating events from 12 campus sources into a unified PostgreSQL database, serving 200+ students in the pilot semester",
                "Implemented a cosine-similarity recommendation algorithm on event tags that improved click-through by 31% vs. a chronological feed in A/B testing",
            ]
        );

        // Skills
        const { skillIds: langIds } = insertSkillCategory("Languages", 0, ["Python", "JavaScript", "Java", "SQL"]);
        const { skillIds: webIds }  = insertSkillCategory("Web",       1, ["React", "Node.js", "Express", "HTML/CSS"]);
        const { skillIds: toolIds } = insertSkillCategory("Tools",     2, ["Git", "Linux", "PostgreSQL", "Docker"]);

        // Resume + wiring
        const { lastInsertRowid: resumeId } = stmtInsertResume.run(BEGINNER_NAME, "Junior Software Engineer");

        insertSections(resumeId, ["contact", "summary", "skills", "jobs", "projects", "education"]);

        insertItems(resumeId, [
            { sectionType: "summary",   itemId: summaryId },
            { sectionType: "education", itemId: eduId },
            { sectionType: "jobs",      itemId: jobIntern.jobId },
            { sectionType: "projects",  itemId: projBudget.projectId },
            { sectionType: "projects",  itemId: projCapstone.projectId },
            ...langIds.map((id) => ({ sectionType: "skills", itemId: id })),
            ...webIds.map((id)  => ({ sectionType: "skills", itemId: id })),
            ...toolIds.map((id) => ({ sectionType: "skills", itemId: id })),
        ]);

        selectJobBullets(resumeId, jobIntern);
        selectProjectBullets(resumeId, projBudget);
        selectProjectBullets(resumeId, projCapstone);

    })();
    console.log(`Seeded: ${BEGINNER_NAME}`);
}

// ============================================================
// MID-LEVEL — Software Engineer
// Dense full page, no summary
// Section order: contact → skills → jobs → projects → education
// ============================================================

const MID_NAME = "[SEED] Mid-Level — Software Engineer";

if (stmtResumeExists.get(MID_NAME)) {
    console.log(`Skip (already seeded): ${MID_NAME}`);
} else {
    db.transaction(() => {

        // Education
        const { lastInsertRowid: eduId } = stmtInsertEdu.run(
            "Tech University", "BS", "Software Engineering", "May 2019", "3.72"
        );

        // Jobs
        const jobSE2 = insertJob(
            "DataStream Corp", "Software Engineer II", "Seattle, WA",
            "Jan 2022", "", 1, 0,
            [
                "Architected a real-time event ingestion pipeline using Kafka and Go that processes 80,000 events per second with 99.95% uptime, replacing a polling-based system that maxed out at 12,000 events per second",
                "Led migration of 14 microservices from REST to gRPC, reducing inter-service latency by 43% and halving payload sizes via Protobuf serialization",
                "Designed and implemented a multi-tenant caching layer with Redis that cut database read load by 62%, enabling the team to defer a planned $120K infrastructure upgrade",
                "Mentored 2 junior engineers through weekly code reviews and pair programming, both of whom were promoted to SE I within 10 months",
            ]
        );
        const jobSE1 = insertJob(
            "BuildFast Inc", "Software Engineer I", "Remote",
            "Jun 2019", "Dec 2021", 0, 1,
            [
                "Built a React component library of 22 accessible, design-system-aligned UI components adopted across 4 product teams, reducing per-team front-end setup from 3 days to 2 hours",
                "Reduced CI pipeline runtime from 28 minutes to 9 minutes by parallelizing test shards and caching Docker layers in GitHub Actions",
                "Delivered a customer-facing analytics dashboard (TypeScript, D3.js) that surfaced 6 key business metrics, driving a 19% increase in premium plan upgrades in the first quarter post-launch",
            ]
        );

        // Projects
        const projCLI = insertProject(
            "gofmt-guard — Open Source CLI", "",
            "Mar 2022", "", 1, 0,
            [
                "Published a Go pre-commit hook enforcing gofmt, vet, and staticcheck across 40+ contributor repositories with 210 GitHub stars",
                "Reduced average CI lint failure rate by 74% across adopting teams by catching formatting errors locally before push",
            ]
        );
        const projML = insertProject(
            "Churn Prediction Pipeline", "",
            "Sep 2021", "Jan 2022", 0, 1,
            [
                "Trained an XGBoost classifier on 2 years of behavioral data (1.4M rows) achieving 0.88 AUC, deployed as a weekly batch job via Airflow",
                "Reduced false-positive churn alerts by 38% vs. the prior rule-based system, saving the retention team an estimated 15 hours of manual outreach per week",
            ]
        );

        // Skills
        const { skillIds: langIds }  = insertSkillCategory("Languages",  0, ["Go", "TypeScript", "Python", "SQL", "Java"]);
        const { skillIds: webIds }   = insertSkillCategory("Web & APIs", 1, ["React", "gRPC", "GraphQL", "REST"]);
        const { skillIds: dataIds }  = insertSkillCategory("Data",       2, ["PostgreSQL", "Redis", "Kafka", "Elasticsearch"]);
        const { skillIds: cloudIds } = insertSkillCategory("Cloud & DevOps", 3, ["AWS", "Docker", "Kubernetes", "GitHub Actions", "Terraform"]);

        // Resume + wiring
        const { lastInsertRowid: resumeId } = stmtInsertResume.run(MID_NAME, "Software Engineer II / Senior SWE");

        insertSections(resumeId, ["contact", "skills", "jobs", "projects", "education"]);

        insertItems(resumeId, [
            { sectionType: "education", itemId: eduId },
            { sectionType: "jobs",      itemId: jobSE2.jobId },
            { sectionType: "jobs",      itemId: jobSE1.jobId },
            { sectionType: "projects",  itemId: projCLI.projectId },
            { sectionType: "projects",  itemId: projML.projectId },
            ...langIds.map((id)  => ({ sectionType: "skills", itemId: id })),
            ...webIds.map((id)   => ({ sectionType: "skills", itemId: id })),
            ...dataIds.map((id)  => ({ sectionType: "skills", itemId: id })),
            ...cloudIds.map((id) => ({ sectionType: "skills", itemId: id })),
        ]);

        selectJobBullets(resumeId, jobSE2);
        selectJobBullets(resumeId, jobSE1);
        selectProjectBullets(resumeId, projCLI);
        selectProjectBullets(resumeId, projML);

    })();
    console.log(`Seeded: ${MID_NAME}`);
}

// ============================================================
// SENIOR — Principal Engineer
// ~2 pages, 12+ years experience, includes a brief summary
// Section order: contact → summary → skills → jobs → projects → certifications → education
// ============================================================

const SENIOR_NAME = "[SEED] Senior — Principal Engineer";

if (stmtResumeExists.get(SENIOR_NAME)) {
    console.log(`Skip (already seeded): ${SENIOR_NAME}`);
} else {
    db.transaction(() => {

        // Summary (allowed per wiki for senior/staff engineers)
        const { lastInsertRowid: summaryId } = stmtInsertSummary.run(
            "Principal Engineer",
            "Principal engineer with 12+ years designing distributed systems that scale to hundreds of millions of users across fintech, SaaS, and e-commerce domains. Track record of reducing infrastructure costs, leading platform migrations, and growing engineering teams from 4 to 40+."
        );

        // Education
        const { lastInsertRowid: msId } = stmtInsertEdu.run(
            "State Tech University", "MS", "Computer Science", "Dec 2016", ""
        );
        const { lastInsertRowid: bsId } = stmtInsertEdu.run(
            "State Tech University", "BS", "Computer Engineering", "May 2012", "3.90"
        );

        // Jobs
        const jobPrincipal = insertJob(
            "CloudScale Corp", "Principal Engineer", "San Francisco, CA",
            "Mar 2021", "", 1, 0,
            [
                "Designed a multi-region active-active architecture across 3 AWS regions that achieved 99.999% availability for 180M monthly active users, eliminating 14 hours of annual planned downtime",
                "Led a 22-engineer platform team that rebuilt the core payments ledger from a monolith to event-sourced microservices, reducing transaction processing latency from 340ms to 28ms (p99)",
                "Reduced cloud infrastructure spend by $2.4M annually by right-sizing EC2 fleets, migrating cold-path workloads to Spot, and introducing Terraform-enforced tagging policies",
                "Defined engineering-wide standards for API versioning, service mesh configuration, and on-call runbooks adopted by 7 product teams across 3 time zones",
                "Grew the platform org from 8 to 31 engineers in 18 months through structured interviewing, leveling calibration, and a quarterly mentorship program with 92% participant satisfaction",
            ]
        );
        const jobStaff = insertJob(
            "Unicorn Labs", "Staff Software Engineer", "New York, NY",
            "Feb 2018", "Feb 2021", 0, 1,
            [
                "Architected a real-time fraud detection system processing 4.2M transactions per day using Flink, Kafka, and a custom feature store, reducing fraudulent chargebacks by 67% within the first quarter",
                "Rebuilt the core checkout service (Java → Go) serving $1.8B in annual GMV, achieving a 3× throughput improvement and reducing P99 latency from 620ms to 95ms under peak Black Friday load",
                "Championed adoption of SLO-based alerting across 40 services, cutting noise from 800+ weekly alerts to 60 actionable ones and reducing MTTR from 47 minutes to 11 minutes",
                "Conducted 120+ technical interviews and authored the backend hiring rubric still in use across the organization",
            ]
        );
        const jobSenior = insertJob(
            "BigTech Inc", "Senior Software Engineer", "Seattle, WA",
            "Sep 2014", "Jan 2018", 0, 2,
            [
                "Delivered the search relevance ranking overhaul (Python, Elasticsearch) that increased successful search rate by 11 percentage points, attributed to $230M in incremental annual revenue",
                "Built and operated a feature flag service handling 50,000 flag evaluations per second with sub-millisecond P99 latency, enabling the org to safely run 200+ concurrent A/B experiments",
                "Reduced DynamoDB costs by 41% by redesigning hot-partition access patterns and introducing adaptive read-through caching on high-cardinality keys",
                "Led a 4-engineer team building the seller analytics dashboard (React, TypeScript, GraphQL) launched to 2.1M sellers in 14 markets",
            ]
        );
        const jobSWE = insertJob(
            "GrowthEngine", "Software Engineer", "Boston, MA",
            "Jun 2012", "Aug 2014", 0, 3,
            [
                "Built the customer segmentation engine (Python, PostgreSQL) from scratch, enabling the marketing team to target cohorts of up to 500K users and reducing campaign setup time from 3 days to 4 hours",
                "Automated nightly ETL pipelines for 12 data sources using Airflow, replacing manual export processes that consumed 6 hours of analyst time daily",
                "Migrated the production Rails application from a single EC2 instance to an auto-scaling group, eliminating 3 monthly outages attributed to traffic spikes during email campaigns",
            ]
        );

        // Projects
        const projRateLimiter = insertProject(
            "Distributed Rate Limiter", "",
            "Jan 2020", "Jun 2020", 0, 0,
            [
                "Implemented a sliding-window rate limiter in Go using Redis Lua scripts, supporting 500K requests per second across 16 nodes with clock-skew tolerance up to 200ms",
                "Published as open source with 1,400+ GitHub stars; adopted by 3 production companies processing over $50M in monthly transactions",
                "Presented at GopherCon 2021; talk video has 18K views",
            ]
        );
        const projDevPlatform = insertProject(
            "Internal Developer Platform", "",
            "Aug 2022", "Mar 2023", 0, 1,
            [
                "Designed and built a Backstage-based IDP that reduced new service scaffolding from 2 days to 15 minutes by providing golden-path templates, automated Terraform provisioning, and integrated runbook generation",
                "Onboarded 7 product teams (85 engineers) in 90 days with zero production incidents attributed to the new tooling",
            ]
        );
        const projAnalytics = insertProject(
            "Real-Time Analytics Dashboard", "",
            "Mar 2019", "Sep 2019", 0, 2,
            [
                "Built a WebSocket-driven dashboard (React, Go, ClickHouse) streaming live GMV, conversion rate, and inventory signals to 300 operations analysts with sub-2-second data freshness",
                "Replaced a nightly Redshift batch report that was 18 hours stale, enabling ops to identify and respond to inventory anomalies in real time",
            ]
        );

        // Skills
        const { skillIds: langIds }   = insertSkillCategory("Languages",     0, ["Go", "Python", "Java", "Rust", "TypeScript", "SQL"]);
        const { skillIds: webIds }    = insertSkillCategory("Web & APIs",    1, ["React", "gRPC", "GraphQL", "REST", "WebSockets"]);
        const { skillIds: dataIds }   = insertSkillCategory("Data",          2, ["PostgreSQL", "Cassandra", "Kafka", "Flink", "Redis", "ClickHouse", "Elasticsearch"]);
        const { skillIds: cloudIds }  = insertSkillCategory("Cloud & Infra", 3, ["AWS", "GCP", "Kubernetes", "Terraform", "Datadog", "Prometheus", "Grafana"]);

        // Certifications
        const { lastInsertRowid: certAwsId } = stmtInsertCert.run(
            "AWS Certified Solutions Architect – Professional", "Amazon Web Services", "2022"
        );
        const { lastInsertRowid: certGcpId } = stmtInsertCert.run(
            "Google Cloud Professional Data Engineer", "Google", "2021"
        );

        // Resume + wiring
        const { lastInsertRowid: resumeId } = stmtInsertResume.run(SENIOR_NAME, "Principal / Staff Engineer");

        insertSections(resumeId, ["contact", "summary", "skills", "jobs", "projects", "certifications", "education"]);

        insertItems(resumeId, [
            { sectionType: "summary",        itemId: summaryId },
            { sectionType: "education",      itemId: msId },
            { sectionType: "education",      itemId: bsId },
            { sectionType: "jobs",           itemId: jobPrincipal.jobId },
            { sectionType: "jobs",           itemId: jobStaff.jobId },
            { sectionType: "jobs",           itemId: jobSenior.jobId },
            { sectionType: "jobs",           itemId: jobSWE.jobId },
            { sectionType: "projects",       itemId: projRateLimiter.projectId },
            { sectionType: "projects",       itemId: projDevPlatform.projectId },
            { sectionType: "projects",       itemId: projAnalytics.projectId },
            { sectionType: "certifications", itemId: certAwsId },
            { sectionType: "certifications", itemId: certGcpId },
            ...langIds.map((id)  => ({ sectionType: "skills", itemId: id })),
            ...webIds.map((id)   => ({ sectionType: "skills", itemId: id })),
            ...dataIds.map((id)  => ({ sectionType: "skills", itemId: id })),
            ...cloudIds.map((id) => ({ sectionType: "skills", itemId: id })),
        ]);

        selectJobBullets(resumeId, jobPrincipal);
        selectJobBullets(resumeId, jobStaff);
        selectJobBullets(resumeId, jobSenior);
        selectJobBullets(resumeId, jobSWE);
        selectProjectBullets(resumeId, projRateLimiter);
        selectProjectBullets(resumeId, projDevPlatform);
        selectProjectBullets(resumeId, projAnalytics);

    })();
    console.log(`Seeded: ${SENIOR_NAME}`);
}

db.close();
console.log("Done.");
