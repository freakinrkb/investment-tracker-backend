const express = require('express');
const jwt = require('jsonwebtoken');
const Investment = require('../models/Investment');
const axios = require('axios');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const getExchangeRate = async () => {
  try {
    const response = await axios.get(
      `https://open.er-api.com/v6/latest?base=USD&symbols=INR&apikey=${process.env.EXCHANGE_RATE_API_KEY}`
    );
    return response.data.rates.INR;
  } catch (err) {
    console.error('Error fetching exchange rate:', err.message);
    return 83;
  }
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.userId });
    res.json(investments);
  } catch (err) {
    console.error('Error fetching investments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const exchangeRate = await getExchangeRate();
    const {
      team1, team2, date, odds1, odds2, sixTeam1 = false, sixTeam2 = false,
      winner, cashOutTeam = '', customCashOut = 0, currency, bettingId
    } = req.body;

    if (!team1 || !team2 || !date || !odds1 || !odds2 || !winner || !currency || !bettingId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (odds1 <= 0 || odds2 <= 0) {
      return res.status(400).json({ message: 'Odds must be positive numbers' });
    }
    if (!['team1', 'team2'].includes(winner)) {
      return res.status(400).json({ message: 'Winner must be "team1" or "team2"' });
    }

    const baseInvestmentUSD = 25;
    const investmentTeam1USD = baseInvestmentUSD / odds1;
    const investmentTeam2USD = baseInvestmentUSD / odds2;
    const investmentTeam1INR = investmentTeam1USD * exchangeRate;
    const investmentTeam2INR = investmentTeam2USD * exchangeRate;

    const totalInvestedUSD = investmentTeam1USD + investmentTeam2USD;
    const totalInvestedINR = totalInvestedUSD * exchangeRate;

    let totalWinningsUSD = 0;
    let totalWinningsINR = 0;

    if (sixTeam1 && winner === 'team2') {
      totalWinningsUSD = (investmentTeam2USD * odds2) + 25;
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    } else if (sixTeam1 && winner === 'team1') {
      totalWinningsUSD = (investmentTeam1USD * odds1) + (customCashOut / exchangeRate);
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    } else if (sixTeam2 && winner === 'team1') { // Added this condition
      totalWinningsUSD = (investmentTeam1USD * odds1) + 25;
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    } else if (sixTeam2 && winner === 'team2') { // Added this condition for completeness
      totalWinningsUSD = (investmentTeam2USD * odds2) + (customCashOut / exchangeRate);
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    } else if (winner === 'team1') {
      totalWinningsUSD = investmentTeam1USD * odds1;
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    } else if (winner === 'team2') {
      totalWinningsUSD = investmentTeam2USD * odds2;
      totalWinningsINR = totalWinningsUSD * exchangeRate;
    }

    // Round the values to 2 decimal places
    totalWinningsUSD = parseFloat(totalWinningsUSD.toFixed(2));
    totalWinningsINR = parseFloat(totalWinningsINR.toFixed(2));

    const profitLossUSD = totalWinningsUSD - totalInvestedUSD;
    const profitLossINR = totalWinningsINR - totalInvestedINR;

    // Round profit/loss to 2 decimal places
    const roundedProfitLossUSD = parseFloat(profitLossUSD.toFixed(2));
    const roundedProfitLossINR = parseFloat(profitLossINR.toFixed(2));

    const investment = new Investment({
      userId: req.user.userId,
      team1, team2, date, odds1, odds2, sixTeam1, sixTeam2, winner,
      cashOutTeam, customCashOut, investmentTeam1USD, investmentTeam2USD,
      investmentTeam1INR, investmentTeam2INR, totalInvestedUSD, totalInvestedINR,
      totalWinningsUSD, totalWinningsINR, profitLossUSD: roundedProfitLossUSD, profitLossINR: roundedProfitLossINR, currency,
      bettingId
    });

    await investment.save();
    res.status(201).json(investment);
  } catch (err) {
    console.error('Error creating investment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT and DELETE routes (unchanged)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!investment) return res.status(404).json({ message: 'Investment not found' });
    res.json(investment);
  } catch (err) {
    console.error('Error updating investment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Deleting investment with ID:', req.params.id, 'for user:', req.user.userId);
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!investment) {
      console.log('Investment not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Investment not found' });
    }
    console.log('Investment deleted:', investment);
    res.json({ message: 'Investment deleted' });
  } catch (err) {
    console.error('Error deleting investment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;