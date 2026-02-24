import express from 'express';
import * as weatherController from '../controllers/weatherController.js';

const router = express.Router();

router.post('/', weatherController.create);
router.get('/', weatherController.list);
router.get('/:id', weatherController.getById);
router.put('/:id', weatherController.update);
router.delete('/:id', weatherController.remove);

export { router as weatherRoutes };
