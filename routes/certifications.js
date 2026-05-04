// RESTful router for certifications CRUD.
//
// Routes:
//   GET    /api/certifications     — list all certifications
//   POST   /api/certifications     — create certification (name required)
//   GET    /api/certifications/:id — get one certification
//   PUT    /api/certifications/:id — update certification (name required)
//   DELETE /api/certifications/:id — delete certification

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrCertifications = db
            .prepare("SELECT * FROM certifications")
            .all();
        res.status(200).json(arrCertifications);
    } catch (err) {
        console.error("GET /api/certifications error:", err);
        res.status(500).json({ message: "Failed to retrieve certifications" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrCertifications = db
            .prepare("SELECT * FROM certifications WHERE id = @id")
            .all({ id });
        res.status(200).json(arrCertifications);
    } catch (err) {
        console.error("GET /api/certifications/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve certification" });
    }
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const issuer = (req.body.issuer ?? "").trim();
    const issued_date = (req.body.issued_date ?? "").trim();

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const strQuery =
            "INSERT INTO certifications (name, issuer, issued_date) VALUES (@name, @issuer, @issued_date)";
        const result = db.prepare(strQuery).run({ name, issuer, issued_date });
        res.status(201).json({
            message: "Certification created successfully",
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("POST /api/certifications error:", err);
        res.status(500).json({ message: "Failed to create certification" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const issuer = (req.body.issuer ?? "").trim();
    const issued_date = (req.body.issued_date ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const strQuery =
            "UPDATE certifications SET name = @name, issuer = @issuer, issued_date = @issued_date, sort_order = @sort_order WHERE id = @id";
        const result = db
            .prepare(strQuery)
            .run({ name, issuer, issued_date, sort_order, id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Certification not found" });
        }
        res.status(200).json({
            message: "Certification updated successfully",
        });
    } catch (err) {
        console.error("PUT /api/certifications/:id error:", err);
        res.status(500).json({ message: "Failed to update certification" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }

    try {
        // Use a transaction so resume selection cleanup and the certification delete are atomic.
        // resume_items is polymorphic and has no FK cascade from certifications.
        const deleteCertification = db.transaction(() => {
            db.prepare(
                "DELETE FROM resume_items WHERE section_type = 'certifications' AND item_id = @id",
            ).run({ id });
            return db
                .prepare("DELETE FROM certifications WHERE id = @id")
                .run({ id });
        });
        const result = deleteCertification();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Certification not found" });
        }
        res.status(200).json({ message: "Certification deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/certifications/:id error:", err);
        res.status(500).json({ message: "Failed to delete certification" });
    }
});

export default router;
