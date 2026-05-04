// RESTful router for educations CRUD.
//
// Routes:
//   GET    /api/educations     — list all educations, ordered by sort_order
//   POST   /api/educations     — create education (institution required)
//   GET    /api/educations/:id — get one education
//   PUT    /api/educations/:id — update education (institution required)
//   DELETE /api/educations/:id — delete education

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrEducations = db
            .prepare("SELECT * FROM educations ORDER BY sort_order")
            .all();
        res.status(200).json(arrEducations);
    } catch (err) {
        console.error("GET /api/educations error:", err);
        res.status(500).json({ message: "Failed to retrieve educations" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrEducations = db
            .prepare("SELECT * FROM educations WHERE id = @id")
            .all({ id });
        res.status(200).json(arrEducations);
    } catch (err) {
        console.error("GET /api/educations/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve education" });
    }
});

router.post("/", (req, res) => {
    const institution = req.body.institution?.trim();
    const degree = (req.body.degree ?? "").trim();
    const field = (req.body.field ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    const gpa = (req.body.gpa ?? "").trim();
    const details = (req.body.details ?? "").trim();

    if (!institution) {
        return res.status(400).json({ message: "institution is required" });
    }
    try {
        const result = db
            .prepare(
                "INSERT INTO educations (institution, degree, field, start_date, end_date, gpa, details) VALUES (@institution, @degree, @field, @start_date, @end_date, @gpa, @details)",
            )
            .run({
                institution,
                degree,
                field,
                start_date,
                end_date,
                gpa,
                details,
            });
        res.status(201).json({
            message: "Education created successfully",
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("POST /api/educations error:", err);
        res.status(500).json({ message: "Failed to create education" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const institution = req.body.institution?.trim();
    const degree = (req.body.degree ?? "").trim();
    const field = (req.body.field ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    const gpa = (req.body.gpa ?? "").trim();
    const details = (req.body.details ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!institution) {
        return res.status(400).json({ message: "institution is required" });
    }
    try {
        const result = db
            .prepare(
                "UPDATE educations SET institution = @institution, degree = @degree, field = @field, start_date = @start_date, end_date = @end_date, gpa = @gpa, details = @details, sort_order = @sort_order WHERE id = @id",
            )
            .run({
                institution,
                degree,
                field,
                start_date,
                end_date,
                gpa,
                details,
                sort_order,
                id,
            });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Education not found" });
        }
        res.status(200).json({ message: "Education updated successfully" });
    } catch (err) {
        console.error("PUT /api/educations/:id error:", err);
        res.status(500).json({ message: "Failed to update education" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the education delete are atomic.
        // resume_items is polymorphic and has no FK cascade from educations.
        const deleteEducation = db.transaction(() => {
            db.prepare(
                "DELETE FROM resume_items WHERE section_type = 'education' AND item_id = @id",
            ).run({ id });
            return db
                .prepare("DELETE FROM educations WHERE id = @id")
                .run({ id });
        });
        const result = deleteEducation();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Education not found" });
        }
        res.status(200).json({ message: "Education deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/educations/:id error:", err);
        res.status(500).json({ message: "Failed to delete education" });
    }
});

export default router;
