const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  team1: {
    type: String,
    required: true,
  },
  team2: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  odds1: {
    type: Number,
    required: true,
  },
  odds2: {
    type: Number,
    required: true,
  },
  sixTeam1: {
    type: Boolean,
    default: false,
  },
  sixTeam2: {
    type: Boolean,
    default: false,
  },
  winner: {
    type: String,
    required: true,
    enum: ['team1', 'team2', 'none'],
  },
  cashOutTeam: {
    type: String,
    default: '',
    enum: ['team1', 'team2', ''], // Allow empty string for no cashout
  },
  customCashOut: {
    type: Number,
    default: 0,
  },
  customBaseAmount: { // New field for custom base amount
    type: Number,
    default: 25, // Default to 25 if not provided
  },
  currency: {
    type: String,
    required: true,
  },
  bettingId: {
    type: String,
    required: true,
  },
  investmentTeam1USD: Number,
  investmentTeam2USD: Number,
  investmentTeam1INR: Number,
  investmentTeam2INR: Number,
  totalInvestedUSD: Number,
  totalInvestedINR: Number,
  totalWinningsUSD: Number,
  totalWinningsINR: Number,
  profitLossUSD: Number,
  profitLossINR: Number,
});

module.exports = mongoose.model('Investment', investmentSchema);