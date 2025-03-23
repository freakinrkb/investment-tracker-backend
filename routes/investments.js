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
    return 83; // Fallback exchange rate
  }
};

// Reusable function to calculate investment metrics
const calculateInvestmentMetrics = async (investmentData) => {
  const exchangeRate = await getExchangeRate();
  const {
    team1, team2, date, odds1, odds2, sixTeam1 = false, sixTeam2 = false,
    winner, cashOutTeam = '', customCashOut = 0, currency, bettingId,
    customBaseAmount // New field for custom base amount
  } = investmentData;

  // Validate required fields
  if (!team1 || !team2 || !date || !odds1 || !odds2 || !winner || !currency || !bettingId) {
    throw new Error('Missing required fields');
  }
  if (odds1 <= 0 || odds2 <= 0) {
    throw new Error('Odds must be positive numbers');
  }
  if (!['team1', 'team2', 'none'].includes(winner)) {
    throw new Error('Winner must be "team1", "team2", or "none"');
  }

  // Use customBaseAmount if provided, otherwise default to 25
  const baseInvestmentUSD = customBaseAmount && customBaseAmount > 0 ? customBaseAmount : 25;

  // Calculate investments
  const investmentTeam1USD = baseInvestmentUSD / odds1;
  const investmentTeam2USD = baseInvestmentUSD / odds2;
  const investmentTeam1INR = investmentTeam1USD * exchangeRate;
  const investmentTeam2INR = investmentTeam2USD * exchangeRate;

  const totalInvestedUSD = investmentTeam1USD + investmentTeam2USD;
  const totalInvestedINR = totalInvestedUSD * exchangeRate;

  let totalWinningsUSD = 0;
  let totalWinningsINR = 0;

  // Define the bonus amount for when both teams hit sixes
  const bonusPerTeamUSD = 25; // $25 bonus per team as specified
  const bothTeamsSixesBonusUSD = sixTeam1 && sixTeam2 ? bonusPerTeamUSD * 2 : 0; // $50 if both hit sixes

  // Calculate winnings based on the winner and sixes conditions
  if (sixTeam1 && sixTeam2) {
    // Both teams hit sixes, total winnings is just the bonus amount
    totalWinningsUSD = bothTeamsSixesBonusUSD;
  } else if (sixTeam1 && !sixTeam2 && winner === 'team2') {
    // Team 1 hits a six, Team 2 wins, add $25 bonus to Team 2's winnings
    totalWinningsUSD = (investmentTeam2USD * odds2) + 25;
  } else if (sixTeam1 && !sixTeam2 && winner === 'team1' && cashOutTeam === 'team2') {
    // Team 1 hits a six and wins, Team 2 loses and cashes out
    totalWinningsUSD = (investmentTeam1USD * odds1) + (customCashOut ? customCashOut / exchangeRate : 0);
  } else if (sixTeam2 && !sixTeam1 && winner === 'team1') {
    // Team 2 hits a six, Team 1 wins, add $25 bonus to Team 1's winnings
    totalWinningsUSD = (investmentTeam1USD * odds1) + 25;
  } else if (sixTeam2 && !sixTeam1 && winner === 'team2' && cashOutTeam === 'team1') {
    // Team 2 hits a six and wins, Team 1 loses and cashes out
    totalWinningsUSD = (investmentTeam2USD * odds2) + (customCashOut ? customCashOut / exchangeRate : 0);
  } else if (winner === 'team1' && cashOutTeam === 'team2') {
    // Neither team hits a six, Team 1 wins, Team 2 cashes out
    totalWinningsUSD = (investmentTeam1USD * odds1) + (customCashOut ? customCashOut / exchangeRate : 0);
  } else if (winner === 'team2' && cashOutTeam === 'team1') {
    // Neither team hits a six, Team 2 wins, Team 1 cashes out
    totalWinningsUSD = (investmentTeam2USD * odds2) + (customCashOut ? customCashOut / exchangeRate : 0);
  } else if (winner === 'team1') {
    // Neither team hits a six, Team 1 wins, no cashout
    totalWinningsUSD = investmentTeam1USD * odds1;
  } else if (winner === 'team2') {
    // Neither team hits a six, Team 2 wins, no cashout
    totalWinningsUSD = investmentTeam2USD * odds2;
  }

  // Convert winnings to INR
  totalWinningsINR = totalWinningsUSD * exchangeRate;

  // Round the values to 2 decimal places
  totalWinningsUSD = parseFloat(totalWinningsUSD.toFixed(2));
  totalWinningsINR = parseFloat(totalWinningsINR.toFixed(2));

  const profitLossUSD = totalWinningsUSD - totalInvestedUSD;
  const profitLossINR = totalWinningsINR - totalInvestedINR;

  // Round profit/loss to 2 decimal places
  const roundedProfitLossUSD = parseFloat(profitLossUSD.toFixed(2));
  const roundedProfitLossINR = parseFloat(profitLossINR.toFixed(2));

  return {
    investmentTeam1USD,
    investmentTeam2USD,
    investmentTeam1INR,
    investmentTeam2INR,
    totalInvestedUSD,
    totalInvestedINR,
    totalWinningsUSD,
    totalWinningsINR,
    profitLossUSD: roundedProfitLossUSD,
    profitLossINR: roundedProfitLossINR,
  };
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
    const investmentData = {
      ...req.body,
      userId: req.user.userId,
      date: new Date(req.body.date), // Ensure date is a Date object
    };

    // Calculate financial metrics
    const metrics = await calculateInvestmentMetrics(investmentData);

    // Create new investment with calculated metrics
    const investment = new Investment({
      ...investmentData,
      ...metrics,
    });

    await investment.save();
    res.status(201).json(investment);
  } catch (err) {
    console.error('Error creating investment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    console.log('Received update data:', updatedData); // Log the incoming data

    // Validate that the investment belongs to the user
    const existingInvestment = await Investment.findOne({ _id: id, userId: req.user.userId });
    if (!existingInvestment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Convert date to a Date object if provided
    if (updatedData.date) {
      updatedData.date = new Date(updatedData.date);
    }

    // Calculate updated financial metrics based on the new data
    const metrics = await calculateInvestmentMetrics(updatedData);

    // Merge the updated data with the calculated metrics
    const investmentDataToUpdate = {
      ...updatedData,
      ...metrics,
      userId: req.user.userId, // Ensure userId remains unchanged
    };

    // Update the investment in the database
    const updatedInvestment = await Investment.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { $set: investmentDataToUpdate },
      { new: true, runValidators: true }
    );

    if (!updatedInvestment) {
      return res.status(404).json({ message: 'Investment not found after update' });
    }

    res.json(updatedInvestment);
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