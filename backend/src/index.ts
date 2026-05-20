import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pufferRoutes from './routes/puffer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];

const localhostPattern = /^http:\/\/localhost:\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || localhostPattern.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Puffer backend running. Use /api/* endpoints.' });
});
app.use('/api', pufferRoutes);

app.listen(PORT, () => {
  console.log(`🟢 Puffer proxy server running at http://localhost:${PORT}`);
});
