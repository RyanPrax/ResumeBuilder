// RESTful router for POST /api/ai/review; validates body, calls lib/gemini.js, returns suggestions array.

import db from '../lib/db.js';
import { Router } from 'express';

const router = Router();

export default router;
