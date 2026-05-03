// RESTful router for projects CRUD and nested bullet endpoints.
//
// Projects:
//   GET    /api/projects                  — list all projects
//   POST   /api/projects                  — create project
//   GET    /api/projects/:id              — get one project
//   PUT    /api/projects/:id              — update project
//   DELETE /api/projects/:id              — delete project
//
// Bullets (nested under project):
//   GET    /api/projects/:id/bullets      — list bullets for a project
//   POST   /api/projects/:id/bullets      — add bullet to a project
//   PUT    /api/projects/:id/bullets/:bid — update a bullet
//   DELETE /api/projects/:id/bullets/:bid — delete a bullet

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrProjects = db.prepare("SELECT * FROM projects ORDER BY sort_order").all();
        res.status(200).json(arrProjects);
    } catch (err) {
        console.error("GET /api/projects error:", err);
        res.status(500).json({ message: "Failed to retrieve projects" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrProjects = db
            .prepare("SELECT * FROM projects WHERE id = @id")
            .all({ id });
        res.status(200).json(arrProjects);
    } catch (err) {
        console.error("GET /api/projects/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve project" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const link = (req.body.link ?? "").trim();
    const description = (req.body.description ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    // Default to 0 (not current) if omitted — mirrors schema default
    let is_current = Number(req.body.is_current ?? 0);

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    if (is_current !== 0 && is_current !== 1) {
        return res.status(400).json({ message: "is_current must be 0 or 1" });
    }

    try {
        const result = db
            .prepare("INSERT INTO projects (name, link, description, start_date, end_date, is_current) VALUES (@name, @link, @description, @start_date, @end_date, @is_current)")
            .run({ name, link, description, start_date, end_date, is_current });
        res.status(201).json({ message: "Project created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/projects error:", err);
        res.status(500).json({ message: "Failed to create project" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const link = (req.body.link ?? "").trim();
    const description = (req.body.description ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    let is_current = Number(req.body.is_current ?? 0);
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    if (is_current !== 0 && is_current !== 1) {
        return res.status(400).json({ message: "is_current must be 0 or 1" });
    }

    try {
        const result = db
            .prepare("UPDATE projects SET name = @name, link = @link, description = @description, start_date = @start_date, end_date = @end_date, is_current = @is_current, sort_order = @sort_order WHERE id = @id")
            .run({ name, link, description, start_date, end_date, is_current, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json({ message: "Project updated successfully" });
    } catch (err) {
        console.error("PUT /api/projects/:id error:", err);
        res.status(500).json({ message: "Failed to update project" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the project delete are atomic.
        // resume_items and resume_bullets are polymorphic (no FK cascade from projects),
        // so orphaned selections must be removed manually.
        const deleteProject = db.transaction(() => {
            // Remove any resume bullet selections referencing bullets owned by this project
            db.prepare(`
                DELETE FROM resume_bullets
                WHERE bullet_type = 'project'
                AND bullet_id IN (SELECT id FROM project_bullets WHERE project_id = @id)
            `).run({ id });
            // Remove any resume item selections for this project
            db.prepare("DELETE FROM resume_items WHERE section_type = 'projects' AND item_id = @id").run({ id });
            // Delete the project (also cascades project_bullets via schema ON DELETE CASCADE)
            return db.prepare("DELETE FROM projects WHERE id = @id").run({ id });
        });
        const result = deleteProject();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json({ message: "Project deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/projects/:id error:", err);
        res.status(500).json({ message: "Failed to delete project" });
    }
});

// Bullets

router.get("/:id/bullets", (req, res) => {
    const project_id = req.params.id?.trim();
    if (!project_id) {
        return res.status(400).json({ message: "project id is required" });
    }
    try {
        const arrBullets = db
            .prepare("SELECT * FROM project_bullets WHERE project_id = @project_id ORDER BY sort_order")
            .all({ project_id });
        res.status(200).json(arrBullets);
    } catch (err) {
        console.error("GET /api/projects/:id/bullets error:", err);
        res.status(500).json({ message: "Failed to retrieve bullets" });
    }
});

router.post("/:id/bullets", (req, res) => {
    const project_id = req.params.id?.trim();
    const text = (req.body.text ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!project_id) {
        return res.status(400).json({ message: "project id is required" });
    }
    if (!text) {
        return res.status(400).json({ message: "text is required" });
    }
    try {
        const arrProject = db.prepare("SELECT id FROM projects WHERE id = @id").all({ id: project_id });
        if (arrProject.length === 0) {
            return res.status(404).json({ message: "Project not found" });
        }
        const result = db
            .prepare("INSERT INTO project_bullets (project_id, text, sort_order) VALUES (@project_id, @text, @sort_order)")
            .run({ project_id, text, sort_order });
        res.status(201).json({ message: "Bullet created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/projects/:id/bullets error:", err);
        res.status(500).json({ message: "Failed to create bullet" });
    }
});

router.put("/:id/bullets/:bid", (req, res) => {
    const project_id = req.params.id?.trim();
    const id = req.params.bid?.trim();
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const sort_order = req.body?.sort_order ?? 0;

    if (!project_id) {
        return res.status(400).json({ message: "project id is required" });
    }
    if (!id) {
        return res.status(400).json({ message: "bullet id is required" });
    }
    if (!text) {
        return res.status(400).json({ message: "text is required" });
    }
    try {
        const result = db
            .prepare("UPDATE project_bullets SET text = @text, sort_order = @sort_order WHERE id = @id AND project_id = @project_id")
            .run({ text, sort_order, id, project_id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Bullet not found" });
        }
        res.status(200).json({ message: "Bullet updated successfully" });
    } catch (err) {
        console.error("PUT /api/projects/:id/bullets/:bid error:", err);
        res.status(500).json({ message: "Failed to update bullet" });
    }
});

router.delete("/:id/bullets/:bid", (req, res) => {
    const project_id = req.params.id?.trim();
    const id = req.params.bid?.trim();

    if (!project_id) {
        return res.status(400).json({ message: "project id is required" });
    }
    if (!id) {
        return res.status(400).json({ message: "bullet id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the bullet delete are atomic.
        // resume_bullets is polymorphic and has no FK cascade from project_bullets.
        const deleteBullet = db.transaction(() => {
            const result = db.prepare("DELETE FROM project_bullets WHERE id = @id AND project_id = @project_id").run({ id, project_id });
            if (result.changes > 0) {
                db.prepare("DELETE FROM resume_bullets WHERE bullet_type = 'project' AND bullet_id = @id").run({ id });
            }
            return result;
        });
        const result = deleteBullet();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Bullet not found" });
        }
        res.status(200).json({ message: "Bullet deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/projects/:id/bullets/:bid error:", err);
        res.status(500).json({ message: "Failed to delete bullet" });
    }
});

export default router;
