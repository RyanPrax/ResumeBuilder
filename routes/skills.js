// RESTful router for skills CRUD.
//
// Routes:
//   GET    /api/skills     — list all skills, ordered by sort_order
//   POST   /api/skills     — create skill (name required; category_id optional FK to skill_categories)
//   GET    /api/skills/:id — get one skill
//   PUT    /api/skills/:id — update skill (name required; category_id optional FK to skill_categories)
//   DELETE /api/skills/:id — delete skill

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrSkills = db.prepare("SELECT * FROM skills ORDER BY sort_order").all();
        res.status(200).json(arrSkills);
    } catch (err) {
        console.error("GET /api/skills error:", err);
        res.status(500).json({ message: "Failed to retrieve skills" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrSkills = db
            .prepare("SELECT * FROM skills WHERE id = @id")
            .all({ id });
        res.status(200).json(arrSkills);
    } catch (err) {
        console.error("GET /api/skills/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve skill" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    // category_id is nullable — null means uncategorized
    const category_id = req.body.category_id ?? null;

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        // Verify category_id exists before inserting — gives a friendlier 404 than a DB constraint error
        if (category_id !== null) {
            const arrCat = db.prepare("SELECT id FROM skill_categories WHERE id = @id").all({ id: category_id });
            if (arrCat.length === 0) {
                return res.status(404).json({ message: "Skill category not found" });
            }
        }
        const result = db
            .prepare("INSERT INTO skills (name, category_id) VALUES (@name, @category_id)")
            .run({ name, category_id });
        res.status(201).json({ message: "Skill created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/skills error:", err);
        res.status(500).json({ message: "Failed to create skill" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const category_id = req.body.category_id ?? null;
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        // Verify category_id exists before updating — gives a friendlier 404 than a DB constraint error
        if (category_id !== null) {
            const arrCat = db.prepare("SELECT id FROM skill_categories WHERE id = @id").all({ id: category_id });
            if (arrCat.length === 0) {
                return res.status(404).json({ message: "Skill category not found" });
            }
        }
        const result = db
            .prepare("UPDATE skills SET name = @name, category_id = @category_id, sort_order = @sort_order WHERE id = @id")
            .run({ name, category_id, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Skill not found" });
        }
        res.status(200).json({ message: "Skill updated successfully" });
    } catch (err) {
        console.error("PUT /api/skills/:id error:", err);
        res.status(500).json({ message: "Failed to update skill" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the skill delete are atomic.
        // resume_items is polymorphic and has no FK cascade from skills.
        const deleteSkill = db.transaction(() => {
            db.prepare("DELETE FROM resume_items WHERE section_type = 'skills' AND item_id = @id").run({ id });
            return db.prepare("DELETE FROM skills WHERE id = @id").run({ id });
        });
        const result = deleteSkill();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Skill not found" });
        }
        res.status(200).json({ message: "Skill deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/skills/:id error:", err);
        res.status(500).json({ message: "Failed to delete skill" });
    }
});

export default router;
