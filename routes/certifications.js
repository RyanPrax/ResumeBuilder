// RESTful router for GET/POST/PUT/DELETE /api/certifications.

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    const arrCertifications = db.prepare("SELECT * FROM certifications").all();
    res.status(200).json(arrCertifications);
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    const arrCertifications = db
        .prepare("SELECT * FROM certifications WHERE id = @id")
        .all({ id });
    res.status(200).json(arrCertifications);
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const issuer = req.body.issuer ?? "";
    const issued_date = req.body.issued_date ?? "";

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    const strQuery =
        "INSERT INTO certifications (name, issuer, issued_date) VALUES (@name, @issuer, @issued_date)";
    const result = db
        .prepare(strQuery)
        .run({ name, issuer, issued_date });
    res.status(201).json({
        message: "Certification created successfully",
        id: result.lastInsertRowid,
    });
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const issuer = req.body.issuer ?? "";
    const issued_date = req.body.issued_date ?? "";

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    const strQuery =
        "UPDATE certifications SET name = @name, issuer = @issuer, issued_date = @issued_date WHERE id = @id";
    const result = db
        .prepare(strQuery)
        .run({ name, issuer, issued_date, id });
    if (result.changes === 0) {
        return res.status(404).json({ message: "Certifications not found" });
    }
    res.status(200).json({
        message: "Certifications information updated successfully",
    });
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }

    const result = db.prepare("DELETE FROM certifications WHERE id = @id").run({ id });
    if (result.changes === 0) {
        return res.status(404).json({ message: "Certification not found" });
    }
    res.status(200).json({ message: "Certification deleted successfully" });
});

export default router;
