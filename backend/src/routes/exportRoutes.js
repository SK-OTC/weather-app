import express from 'express';
import * as exportController from '../controllers/exportController.js';

const router = express.Router();

router.get('/', exportController.exportData);

export { router as exportRoutes };
