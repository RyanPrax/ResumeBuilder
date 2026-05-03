// RESTful router for summaries CRUD (multiple summary variants library).
// Users store several tailored summary blurbs and pick one per resume in the builder.
//
// Routes:
//   GET    /api/summary     — list all summaries, ordered by sort_order
//   POST   /api/summary     — create summary (label and content optional — blanks allowed)
//   GET    /api/summary/:id — get one summary
//   PUT    /api/summary/:id — update summary
//   DELETE /api/summary/:id — delete summary

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrSummaries = db.prepare("SELECT * FROM summaries ORDER BY sort_order").all();
        res.status(200).json(arrSummaries);
    } catch (err) {
        console.error("GET /api/summary error:", err);
        res.status(500).json({ message: "Failed to retrieve summaries" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrSummaries = db
            .prepare("SELECT * FROM summaries WHERE id = @id")
            .all({ id });
        res.status(200).json(arrSummaries);
    } catch (err) {
        console.error("GET /api/summary/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve summary" });
    }
});

router.post("/", (req, res) => {
    const label = (req.body.label ?? "").trim();
    const content = (req.body.content ?? "").trim();
    try {
        const result = db
            .prepare("INSERT INTO summaries (label, content) VALUES (@label, @content)")
            .run({ label, content });
        res.status(201).json({ message: "Summary created successfully", id: result.lastInsertRowid });
    } catch (err) {
        console.error("POST /api/summary error:", err);
        res.status(500).json({ message: "Failed to create summary" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const label = (req.body.label ?? "").trim();
    const content = (req.body.content ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const result = db
            .prepare("UPDATE summaries SET label = @label, content = @content, sort_order = @sort_order WHERE id = @id")
            .run({ label, content, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Summary not found" });
        }
        res.status(200).json({ message: "Summary updated successfully" });
    } catch (err) {
        console.error("PUT /api/summary/:id error:", err);
        res.status(500).json({ message: "Failed to update summary" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the summary delete are atomic.
        // resume_items is polymorphic and has no FK cascade from summaries.
        const deleteSummary = db.transaction(() => {
            db.prepare("DELETE FROM resume_items WHERE section_type = 'summary' AND item_id = @id").run({ id });
            return db.prepare("DELETE FROM summaries WHERE id = @id").run({ id });
        });
        const result = deleteSummary();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Summary not found" });
        }
        res.status(200).json({ message: "Summary deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/summary/:id error:", err);
        res.status(500).json({ message: "Failed to delete summary" });
    }
});

export default router;
