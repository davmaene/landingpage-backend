require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const { seedDatabase } = require('./utils/seed');
const { Response } = require('./utils/Response');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/contents');
const miscRoutes = require('./routes/misc');
const cloudinaryRoutes = require('./routes/cloudinary');
const scheduleRoutes = require('./routes/schedules');
const centerRoutes = require('./routes/centers');

const app = express();

app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health
app.get('/api', (req, res) => Response(res, 200, { service: 'ulpgl-api', version: '1.0' }));
app.get('/api/health', (req, res) => Response(res, 200, { healthy: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api', miscRoutes);

// 404
app.use('/api', (req, res) => Response(res, 404, { path: req.originalUrl }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  return Response(res, 500, { reason: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 4499;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[ SEED ] Database connected');
    // await sequelize.sync({ alter: true });
    // await seedDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port :`, PORT);
    });
  } catch (e) {
    console.error('[ SEED ] Startup error:', e);
    process.exit(1);
  }
}

start();
