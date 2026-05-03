// RESTful router for resumes CRUD plus PUT /api/resumes/:id/selections for bulk upsert of sections/items/bullets.

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrResumes = db.prepare("SELECT * FROM resumes ORDER BY created_at DESC").all();
        res.status(200).json(arrResumes);
    } catch (err) {
        console.error("GET /api/resumes error:", err);
        res.status(500).json({ message: "Failed to retrieve resumes" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrResumes = db
            .prepare("SELECT * FROM resumes WHERE id = @id")
            .all({ id });
        res.status(200).json(arrResumes);
    } catch (err) {
        console.error("GET /api/resumes/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve resume" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const target_role = (req.body.target_role ?? "").trim();

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        const result = db
            .prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)")
            .run({ name, target_role });
        res.status(201).json({ message: "Resume created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/resumes error:", err);
        res.status(500).json({ message: "Failed to create resume" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const target_role = (req.body.target_role ?? "").trim();

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        const result = db
            .prepare("UPDATE resumes SET name = @name, target_role = @target_role WHERE id = @id")
            .run({ name, target_role, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Resume not found" });
        }
        res.status(200).json({ message: "Resume updated successfully" });
    } catch (err) {
        console.error("PUT /api/resumes/:id error:", err);
        res.status(500).json({ message: "Failed to update resume" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const result = db.prepare("DELETE FROM resumes WHERE id = @id").run({ id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Resume not found" });
        }
        res.status(200).json({ message: "Resume deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/resumes/:id error:", err);
        res.status(500).json({ message: "Failed to delete resume" });
    }
});

// Maps section_type values to their corresponding library table names.
// Used to validate item_id existence before saving selections.
const SECTION_ITEM_TABLES = {
    summary: "summaries",
    education: "educations",
    jobs: "jobs",
    projects: "projects",
    skills: "skills",
    certifications: "certifications",
    awards: "awards",
};

const SECTION_TYPES = new Set(["contact", ...Object.keys(SECTION_ITEM_TABLES)]);

// Bulk replace all sections, items, and bullets for a resume in a single transaction.
// The client sends the full desired state; existing selections are wiped and replaced.
router.put("/:id/selections", (req, res) => {
    const resume_id = req.params.id?.trim();
    const sections = req.body.sections ?? [];
    const items = req.body.items ?? [];
    const bullets = req.body.bullets ?? [];

    if (!resume_id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!Array.isArray(sections) || !Array.isArray(items) || !Array.isArray(bullets)) {
        return res.status(400).json({ message: "sections, items, and bullets must be arrays" });
    }

    try {
        // Verify resume exists before wiping any data
        const arrResume = db.prepare("SELECT id FROM resumes WHERE id = @id").all({ id: resume_id });
        if (arrResume.length === 0) {
            return res.status(404).json({ message: "Resume not found" });
        }

        for (const s of sections) {
            if (!s || typeof s !== "object") {
                return res.status(400).json({ message: "section entries must be objects" });
            }
            if (!SECTION_TYPES.has(s.section_type)) {
                return res.status(400).json({ message: `Invalid section_type: ${s.section_type}` });
            }
            if (![0, 1].includes(s.included ?? 1)) {
                return res.status(400).json({ message: `Invalid included value: ${s.included}` });
            }
        }

        // Validate each item_id exists in its correct library table.
        // Table name comes from a whitelist so template literal is safe here.
        for (const item of items) {
            const strTable = SECTION_ITEM_TABLES[item.section_type];
            if (!strTable) {
                return res.status(400).json({ message: `Invalid section_type: ${item.section_type}` });
            }
            const arrItem = db.prepare(`SELECT id FROM ${strTable} WHERE id = @id`).all({ id: item.item_id });
            if (arrItem.length === 0) {
                return res.status(404).json({ message: `Item ${item.item_id} not found in ${item.section_type}` });
            }
        }

        // Validate each bullet_id exists in its correct bullet table AND belongs to the declared parent.
        // strParentCol comes from a two-value whitelist so the template literal is safe.
        for (const b of bullets) {
            const strBulletTable = b.bullet_type === "job"
                ? "job_bullets"
                : b.bullet_type === "project"
                    ? "project_bullets"
                    : null;
            if (!strBulletTable) {
                return res.status(400).json({ message: `Invalid bullet_type: ${b.bullet_type}` });
            }
            const strParentCol = b.bullet_type === "job" ? "job_id" : "project_id";
            const arrBullet = db
                .prepare(`SELECT id FROM ${strBulletTable} WHERE id = @id AND ${strParentCol} = @parent_id`)
                .all({ id: b.bullet_id, parent_id: b.parent_item_id });
            if (arrBullet.length === 0) {
                return res.status(404).json({
                    message: `Bullet ${b.bullet_id} not found or does not belong to item ${b.parent_item_id}`,
                });
            }
        }

        const saveSelections = db.transaction(() => {
            // Wipe existing selections for this resume
            db.prepare("DELETE FROM resume_sections WHERE resume_id = @resume_id").run({ resume_id });
            db.prepare("DELETE FROM resume_items WHERE resume_id = @resume_id").run({ resume_id });
            db.prepare("DELETE FROM resume_bullets WHERE resume_id = @resume_id").run({ resume_id });

            // Re-insert sections
            const stmtSection = db.prepare(
                "INSERT INTO resume_sections (resume_id, section_type, included, sort_order) VALUES (@resume_id, @section_type, @included, @sort_order)"
            );
            for (const s of sections) {
                stmtSection.run({
                    resume_id,
                    section_type: s.section_type,
                    included: s.included ?? 1,
                    sort_order: s.sort_order ?? 0,
                });
            }

            // Re-insert items
            const stmtItem = db.prepare(
                "INSERT INTO resume_items (resume_id, section_type, item_id, sort_order) VALUES (@resume_id, @section_type, @item_id, @sort_order)"
            );
            for (const item of items) {
                stmtItem.run({
                    resume_id,
                    section_type: item.section_type,
                    item_id: item.item_id,
                    sort_order: item.sort_order ?? 0,
                });
            }

            // Re-insert bullets
            const stmtBullet = db.prepare(
                "INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (@resume_id, @parent_item_id, @bullet_type, @bullet_id, @sort_order)"
            );
            for (const b of bullets) {
                stmtBullet.run({
                    resume_id,
                    parent_item_id: b.parent_item_id,
                    bullet_type: b.bullet_type,
                    bullet_id: b.bullet_id,
                    sort_order: b.sort_order ?? 0,
                });
            }
        });

        saveSelections();
        res.status(200).json({ message: "Selections saved successfully" });
    } catch (err) {
        console.error("PUT /api/resumes/:id/selections error:", err);
        res.status(500).json({ message: "Failed to save selections" });
    }
});

export default router;
