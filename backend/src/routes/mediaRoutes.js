import express from 'express';
import * as mediaController from '../controllers/mediaController.js';

const router = express.Router();

router.get('/:id/media', mediaController.getMedia);

export { router as mediaRoutes };
