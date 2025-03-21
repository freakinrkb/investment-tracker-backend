// backend/models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  date: { type: Date, required: true },
  odds1: { type: Number, required: true },
  odds2: { type: Number, required: true },
  sixTeam1: { type: Boolean, default: false },
  sixTeam2: { type: Boolean, default: false },
  winner: { type: String, enum: ['team1', 'team2'], required: true },
  cashOutTeam: { type: String, default: '' },
  customCashOut: { type: Number, default: 0 },
  investmentTeam1USD: { type: Number, required: true },
  investmentTeam2USD: { type: Number, required: true },
  investmentTeam1INR: { type: Number, required: true },
  investmentTeam2INR: { type: Number, required: true },
  totalInvestedUSD: { type: Number, required: true },
  totalInvestedINR: { type: Number, required: true },
  totalWinningsUSD: { type: Number, required: true },
  totalWinningsINR: { type: Number, required: true },
  profitLossUSD: { type: Number, required: true },
  profitLossINR: { type: Number, required: true },
  currency: { type: String, required: true },
  bettingId: { type: String, required: true }, // New field for betting ID
});

module.exports = mongoose.model('Investment', investmentSchema);