import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { weatherRoutes } from './routes/weatherRoutes.js';
import { exportRoutes } from './routes/exportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/weather-requests', weatherRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res, next) => {
  next(Object.assign(new Error('Not found'), { status: 404, code: 'NOT_FOUND' }));
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
