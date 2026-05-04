// RESTful router for awards CRUD.
//
// Routes:
//   GET    /api/awards     — list all awards
//   POST   /api/awards     — create award (name required)
//   GET    /api/awards/:id — get one award
//   PUT    /api/awards/:id — update award (name required)
//   DELETE /api/awards/:id — delete award

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrAwards = db.prepare("SELECT * FROM awards").all();
        res.status(200).json(arrAwards);
    } catch (err) {
        console.error("GET /api/awards error:", err);
        res.status(500).json({ message: "Failed to retrieve awards" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrAwards = db
            .prepare("SELECT * FROM awards WHERE id = @id")
            .all({ id });
        res.status(200).json(arrAwards);
    } catch (err) {
        console.error("GET /api/awards/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve award" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const issuer = (req.body.issuer ?? "").trim();
    const issued_date = (req.body.issued_date ?? "").trim();
    const description = (req.body.description ?? "").trim();

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const strQuery =
            "INSERT INTO awards (name, issuer, issued_date, description) VALUES (@name, @issuer, @issued_date, @description)";
        const result = db
            .prepare(strQuery)
            .run({ name, issuer, issued_date, description });
        res.status(201).json({
            message: "Award created successfully",
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("POST /api/awards error:", err);
        res.status(500).json({ message: "Failed to create award" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const issuer = (req.body.issuer ?? "").trim();
    const issued_date = (req.body.issued_date ?? "").trim();
    const description = (req.body.description ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const strQuery =
            "UPDATE awards SET name = @name, issuer = @issuer, issued_date = @issued_date, description = @description, sort_order = @sort_order WHERE id = @id";
        const result = db
            .prepare(strQuery)
            .run({ name, issuer, issued_date, description, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Award not found" });
        }
        res.status(200).json({
            message: "Award information updated successfully",
        });
    } catch (err) {
        console.error("PUT /api/awards/:id error:", err);
        res.status(500).json({ message: "Failed to update award" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }

    try {
        // Use a transaction so resume selection cleanup and the award delete are atomic.
        // resume_items is polymorphic and has no FK cascade from awards.
        const deleteAward = db.transaction(() => {
            db.prepare("DELETE FROM resume_items WHERE section_type = 'awards' AND item_id = @id").run({ id });
            return db.prepare("DELETE FROM awards WHERE id = @id").run({ id });
        });
        const result = deleteAward();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Award not found" });
        }
        res.status(200).json({ message: "Award deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/awards/:id error:", err);
        res.status(500).json({ message: "Failed to delete award" });
    }
});

export default router;
