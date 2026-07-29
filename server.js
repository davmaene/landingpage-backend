require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  sequelize
} = require('./models');
const {
  seedDatabase
} = require('./utils/seed');
const {
  cleanupIndexes
} = require('./utils/cleanupIndexes');
const {
  Response
} = require('./utils/Response');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/contents');
const miscRoutes = require('./routes/misc');
const cloudinaryRoutes = require('./routes/cloudinary');
const scheduleRoutes = require('./routes/schedules');
const centerRoutes = require('./routes/centers');
const faqRoutes = require('./routes/faqs');
const loginHistoryRoutes = require('./routes/loginHistory');
const visitRoutes = require('./routes/visits');
const coursEvaluationRoutes = require('./routes/coursEvaluation');
const {
  sendMail
} = require('./utils/mailer');

const app = express();

const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000', 'https://ulpgl.vercel.app', 'https://ulpgl.net', 'https://ulpgl.ac.cd'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par la politique CORS de l\'API'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.options('*', cors());
app.use(express.json({
  limit: '10mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Health
app.get('/api', (req, res) => Response(res, 200, {
  service: 'ulpgl-api',
  version: '1.0'
}));
app.get('/api/health', (req, res) => Response(res, 200, {
  healthy: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/history', loginHistoryRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/cours-evaluation', coursEvaluationRoutes);
app.use('/api', miscRoutes);

// 404
app.use('/api', (req, res) => Response(res, 404, {
  path: req.originalUrl
}));

// Error handler
app.use((err, req, res, next) => {
  return Response(res, 500, {
    reason: err.message || 'Erreur serveur'
  });
});

const PORT = process.env.PORT || 4499;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[ SYNC ] Database connected');
    await cleanupIndexes(sequelize);
    await sequelize.sync({
      alter: true
    });
    await seedDatabase();

    // ── Purge automatique de l'historique toutes les heures (rétention 24h) ──
    // const { LoginHistory } = require('./models');
    // const { Op } = require('sequelize');
    // const RETENTION_MS = 24 * 60 * 60 * 1000;
    // setInterval(async () => {
    //   try {
    //     const cutoff  = new Date(Date.now() - RETENTION_MS);
    //     const deleted = await LoginHistory.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
    //     if (deleted > 0) console.log(`[ PURGE ] ${deleted} entrée(s) login_history supprimée(s)`);
    //   } catch (err) {
    //     console.warn('[ PURGE ] Erreur purge login_history:', err.message);
    //   }
    // }, 60 * 60 * 1000); // toutes les heures
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port :`, PORT);
    });
  } catch (e) {
    console.error('[ SYNC ] Startup error:', e);
    // process.exit(1);
  }
}

start();