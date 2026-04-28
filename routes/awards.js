// RESTful router for GET/POST/PUT/DELETE /api/awards.

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    const arrAwards = db.prepare("SELECT * FROM awards").all();
    res.status(200).json(arrAwards);
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    const arrAwards = db
        .prepare("SELECT * FROM awards WHERE id = @id")
        .all({ id });
    res.status(200).json(arrAwards);
});

router.post("/", (req, res) => {
    const name = req.body.name?.trim();
    const issuer = req.body.issuer ?? "";
    const issued_date = req.body.issued_date ?? "";
    const description = req.body.description ?? "";

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    const strQuery =
        "INSERT INTO awards (name, issuer, issued_date, description) VALUES (@name, @issuer, @issued_date, @description)";
    const result = db
        .prepare(strQuery)
        .run({ name, issuer, issued_date, description });
    res.status(201).json({
        message: "Award created successfully",
        id: result.lastInsertRowid,
    });
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const name = req.body.name?.trim();
    const issuer = req.body.issuer ?? "";
    const issued_date = req.body.issued_date ?? "";
    const description = req.body.description ?? "";

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    const strQuery =
        "UPDATE awards SET name = @name, issuer = @issuer, issued_date = @issued_date, description = @description WHERE id = @id";
    const result = db
        .prepare(strQuery)
        .run({ name, issuer, issued_date, description, id });
    if (result.changes === 0) {
        return res.status(404).json({ message: "Award not found" });
    }
    res.status(200).json({
        message: "Award information updated successfully",
    });
});

export default router;
