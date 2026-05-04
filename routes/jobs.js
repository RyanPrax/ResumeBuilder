// RESTful router for jobs CRUD and nested bullet endpoints.
//
// Jobs:
//   GET    /api/jobs                  — list all jobs
//   POST   /api/jobs                  — create job
//   GET    /api/jobs/:id              — get one job
//   PUT    /api/jobs/:id              — update job
//   DELETE /api/jobs/:id              — delete job
//
// Bullets (nested under job):
//   GET    /api/jobs/:id/bullets      — list bullets for a job
//   POST   /api/jobs/:id/bullets      — add bullet to a job
//   PUT    /api/jobs/:id/bullets/:bid — update a bullet
//   DELETE /api/jobs/:id/bullets/:bid — delete a bullet

import db from "../lib/db.js";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    try {
        const arrJobs = db
            .prepare("SELECT * FROM jobs ORDER BY sort_order")
            .all();
        res.status(200).json(arrJobs);
    } catch (err) {
        console.error("GET /api/jobs error:", err);
        res.status(500).json({ message: "Failed to retrieve jobs" });
    }
});

router.get("/:id", (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    try {
        const arrJobs = db
            .prepare("SELECT * FROM jobs WHERE id = @id")
            .all({ id });
        res.status(200).json(arrJobs);
    } catch (err) {
        console.error("GET /api/jobs/:id error:", err);
        res.status(500).json({ message: "Failed to retrieve job" });
    }
});

router.post("/", (req, res) => {
    const company = req.body.company?.trim();
    const title = (req.body.title ?? "").trim();
    const location = (req.body.location ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    // Default to 0 (not current) if omitted — mirrors schema default
    let is_current = Number(req.body.is_current ?? 0);

    if (!company) {
        return res.status(400).json({ message: "company is required" });
    }
    if (is_current !== 0 && is_current !== 1) {
        return res.status(400).json({ message: "is_current must be 0 or 1" });
    }

    try {
        const result = db
            .prepare(
                "INSERT INTO jobs (company, title, location, start_date, end_date, is_current) VALUES (@company, @title, @location, @start_date, @end_date, @is_current)",
            )
            .run({
                company,
                title,
                location,
                start_date,
                end_date,
                is_current,
            });
        res.status(201).json({
            message: "Job created successfully",
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("POST /api/jobs error:", err);
        res.status(500).json({ message: "Failed to create job" });
    }
});

router.put("/:id", (req, res) => {
    const id = req.params.id?.trim();
    const company = req.body.company?.trim();
    const title = (req.body.title ?? "").trim();
    const location = (req.body.location ?? "").trim();
    const start_date = (req.body.start_date ?? "").trim();
    const end_date = (req.body.end_date ?? "").trim();
    let is_current = Number(req.body.is_current ?? 0);
    const sort_order = req.body.sort_order ?? 0;

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }
    if (!company) {
        return res.status(400).json({ message: "company is required" });
    }
    if (is_current !== 0 && is_current !== 1) {
        return res.status(400).json({ message: "is_current must be 0 or 1" });
    }

    try {
        const result = db
            .prepare(
                "UPDATE jobs SET company = @company, title = @title, location = @location, start_date = @start_date, end_date = @end_date, is_current = @is_current, sort_order = @sort_order WHERE id = @id",
            )
            .run({
                company,
                title,
                location,
                start_date,
                end_date,
                is_current,
                sort_order,
                id,
            });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Job not found" });
        }
        res.status(200).json({ message: "Job updated successfully" });
    } catch (err) {
        console.error("PUT /api/jobs/:id error:", err);
        res.status(500).json({ message: "Failed to update job" });
    }
});

router.delete("/:id", (req, res) => {
    const id = req.params.id?.trim();

    if (!id) {
        return res.status(400).json({ message: "id is required" });
    }

    try {
        // Use a transaction so resume selection cleanup and the job delete are atomic.
        // resume_items and resume_bullets are polymorphic (no FK cascade from jobs),
        // so orphaned selections must be removed manually.
        const deleteJob = db.transaction(() => {
            // Remove any resume bullet selections referencing bullets owned by this job
            db.prepare(
                `
                DELETE FROM resume_bullets
                WHERE bullet_type = 'job'
                AND bullet_id IN (SELECT id FROM job_bullets WHERE job_id = @id)
            `,
            ).run({ id });
            // Remove any resume item selections for this job
            db.prepare(
                "DELETE FROM resume_items WHERE section_type = 'jobs' AND item_id = @id",
            ).run({ id });
            // Delete the job (also cascades job_bullets via schema ON DELETE CASCADE)
            return db.prepare("DELETE FROM jobs WHERE id = @id").run({ id });
        });
        const result = deleteJob();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Job not found" });
        }
        res.status(200).json({ message: "Job deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/jobs/:id error:", err);
        res.status(500).json({ message: "Failed to delete job" });
    }
});

// Bullets

router.get("/:id/bullets", (req, res) => {
    const job_id = req.params.id?.trim();
    if (!job_id) {
        return res.status(400).json({ message: "job id is required" });
    }
    try {
        const arrBullets = db
            .prepare(
                "SELECT * FROM job_bullets WHERE job_id = @job_id ORDER BY sort_order",
            )
            .all({ job_id });
        res.status(200).json(arrBullets);
    } catch (err) {
        console.error("GET /api/jobs/:id/bullets error:", err);
        res.status(500).json({ message: "Failed to retrieve bullets" });
    }
});

router.post("/:id/bullets", (req, res) => {
    const job_id = req.params.id?.trim();
    const text = (req.body.text ?? "").trim();
    const sort_order = req.body.sort_order ?? 0;

    if (!job_id) {
        return res.status(400).json({ message: "job id is required" });
    }
    if (!text) {
        return res.status(400).json({ message: "text is required" });
    }
    try {
        const arrJob = db
            .prepare("SELECT id FROM jobs WHERE id = @id")
            .all({ id: job_id });
        if (arrJob.length === 0) {
            return res.status(404).json({ message: "Job not found" });
        }
        const result = db
            .prepare(
                "INSERT INTO job_bullets (job_id, text, sort_order) VALUES (@job_id, @text, @sort_order)",
            )
            .run({ job_id, text, sort_order });
        res.status(201).json({
            message: "Bullet created successfully",
            id: result.lastInsertRowid,
        });
    } catch (err) {
        console.error("POST /api/jobs/:id/bullets error:", err);
        res.status(500).json({ message: "Failed to create bullet" });
    }
});

router.put("/:id/bullets/:bid", (req, res) => {
    const job_id = req.params.id?.trim();
    const id = req.params.bid?.trim();
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const sort_order = req.body?.sort_order ?? 0;

    if (!job_id) {
        return res.status(400).json({ message: "job id is required" });
    }
    if (!id) {
        return res.status(400).json({ message: "bullet id is required" });
    }
    if (!text) {
        return res.status(400).json({ message: "text is required" });
    }
    try {
        const result = db
            .prepare(
                "UPDATE job_bullets SET text = @text, sort_order = @sort_order WHERE id = @id AND job_id = @job_id",
            )
            .run({ text, sort_order, id, job_id });
        if (result.changes === 0) {
            return res.status(404).json({ message: "Bullet not found" });
        }
        res.status(200).json({ message: "Bullet updated successfully" });
    } catch (err) {
        console.error("PUT /api/jobs/:id/bullets/:bid error:", err);
        res.status(500).json({ message: "Failed to update bullet" });
    }
});

router.delete("/:id/bullets/:bid", (req, res) => {
    const job_id = req.params.id?.trim();
    const id = req.params.bid?.trim();

    if (!job_id) {
        return res.status(400).json({ message: "job id is required" });
    }
    if (!id) {
        return res.status(400).json({ message: "bullet id is required" });
    }
    try {
        // Use a transaction so resume selection cleanup and the bullet delete are atomic.
        // resume_bullets is polymorphic and has no FK cascade from job_bullets.
        const deleteBullet = db.transaction(() => {
            const result = db
                .prepare(
                    "DELETE FROM job_bullets WHERE id = @id AND job_id = @job_id",
                )
                .run({ id, job_id });
            if (result.changes > 0) {
                db.prepare(
                    "DELETE FROM resume_bullets WHERE bullet_type = 'job' AND bullet_id = @id",
                ).run({ id });
            }
            return result;
        });
        const result = deleteBullet();
        if (result.changes === 0) {
            return res.status(404).json({ message: "Bullet not found" });
        }
        res.status(200).json({ message: "Bullet deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/jobs/:id/bullets/:bid error:", err);
        res.status(500).json({ message: "Failed to delete bullet" });
    }
});

export default router;
