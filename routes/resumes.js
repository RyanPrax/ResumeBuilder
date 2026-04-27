// RESTful router for resumes CRUD plus PUT /api/resumes/:id/selections for bulk upsert of sections/items/bullets.

import db from '../lib/db.js';
import { Router } from 'express';

const router = Router();

export default router;
