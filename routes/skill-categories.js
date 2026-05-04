// RESTful router for skill categories CRUD.
//
// Routes:
//   GET    /api/skill-categories     — list all skill categories, ordered by sort_order
//   POST   /api/skill-categories     — create skill category (name required)
//   GET    /api/skill-categories/:id — get one skill category
//   PUT    /api/skill-categories/:id — update skill category (name required)
//   DELETE /api/skill-categories/:id — delete skill category

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrCategories = db.prepare("SELECT * FROM skill_categories ORDER BY sort_order").all();
        res.status(200).json(arrCategories);
    } catch (err) {
        console.error("GET /api/skill-categories error:", err);
        res.status(500).json({ message: "Failed to retrieve skill categories" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrCategories = db
            .prepare("SELECT * FROM skill_categories WHERE id = @id")
            .all({ id });
        res.status(200).json(arrCategories);
    } catch (err) {
        console.error("GET /api/skill-categories/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve skill category" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        const result = db
            .prepare("INSERT INTO skill_categories (name) VALUES (@name)")
            .run({ name });
        res.status(201).json({ message: "Skill category created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/skill-categories error:", err);
        res.status(500).json({ message: "Failed to create skill category" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        const result = db
            .prepare("UPDATE skill_categories SET name = @name, sort_order = @sort_order WHERE id = @id")
            .run({ name, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Skill category not found" });
        }
        res.status(200).json({ message: "Skill category updated successfully" });
    } catch (err) {
        console.error("PUT /api/skill-categories/:id error:", err);
        res.status(500).json({ message: "Failed to update skill category" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const result = db.prepare("DELETE FROM skill_categories WHERE id = @id").run({ id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Skill category not found" });
        }
        res.status(200).json({ message: "Skill category deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/skill-categories/:id error:", err);
        res.status(500).json({ message: "Failed to delete skill category" });
    }
});

export default router;
