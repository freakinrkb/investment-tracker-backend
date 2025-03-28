const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const investmentRoutes = require('./routes/investments');
require('dotenv').config();

const app = express();

// Enable CORS for specific origins
const allowedOrigins = [
  'http://localhost:3000', // Allow local development
  'https://investment-tracker-frontend-neon.vercel.app', // Allow deployed frontend (no trailing slash)
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('Request Origin:', origin); // Log the incoming origin
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    } else {
      console.log('Origin not allowed:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or authorization headers (if needed)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
}));

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));