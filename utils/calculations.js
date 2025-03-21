/**
 * Calculate the total outcome based on different match scenarios.
 * @param {Object} investment - The investment data including odds, winner, and sixes.
 * @param {number} exchangeRate - The current USD to INR exchange rate.
 * @param {string} currency - The currency context ("USD" or "INR").
 * @returns {Object} - Calculated financial outcomes.
 */
const calculateOutcome = (investment, exchangeRate, currency = "INR") => {
    if (!exchangeRate || !investment.odds1 || !investment.odds2) {
      return {
        amount1USD: 0,
        amount2USD: 0,
        totalInvestedUSD: 0,
        totalWinningsUSD: 0,
        profitLossUSD: 0,
        amount1INR: 0,
        amount2INR: 0,
        totalInvestedINR: 0,
        totalWinningsINR: 0,
        profitLossINR: 0,
      };
    }
  
    const amount1USD = calculateInvestment(investment.odds1);
    const amount2USD = calculateInvestment(investment.odds2);
    const totalInvestedUSD = amount1USD + amount2USD;
  
    let totalWinningsUSD = 0;
    let cashoutAmountUSD = 0;
  
    if (investment.winner === "team1") {
      totalWinningsUSD = amount1USD * investment.odds1;
    } else if (investment.winner === "team2") {
      totalWinningsUSD = amount2USD * investment.odds2;
    }
  
    if (investment.sixTeam1 && investment.winner !== "team1") {
      totalWinningsUSD += 25;
    }
    if (investment.sixTeam2 && investment.winner !== "team2") {
      totalWinningsUSD += 25;
    }
  
    if (investment.customCashOut && investment.cashOutTeam) {
      cashoutAmountUSD = parseFloat(investment.customCashOut || 0);
      if (currency === "INR") {
        cashoutAmountUSD = cashoutAmountUSD / exchangeRate;
      }
      if (investment.cashOutTeam === "team1" && investment.winner !== "team1") {
        totalWinningsUSD += cashoutAmountUSD;
      } else if (investment.cashOutTeam === "team2" && investment.winner !== "team2") {
        totalWinningsUSD += cashoutAmountUSD;
      }
      if (investment.cashOutTeam === "team1" && cashoutAmountUSD > amount1USD) {
        cashoutAmountUSD = amount1USD;
      } else if (investment.cashOutTeam === "team2" && cashoutAmountUSD > amount2USD) {
        cashoutAmountUSD = amount2USD;
      }
    } else if (investment.cashOutTeam) {
      cashoutAmountUSD =
        investment.cashOutTeam === "team1"
          ? amount1USD
          : investment.cashOutTeam === "team2"
          ? amount2USD
          : 0;
      if (investment.cashOutTeam === "team1" && investment.winner !== "team1") {
        totalWinningsUSD += cashoutAmountUSD;
      } else if (investment.cashOutTeam === "team2" && investment.winner !== "team2") {
        totalWinningsUSD += cashoutAmountUSD;
      }
    }
  
    const profitLossUSD = totalWinningsUSD - totalInvestedUSD;
  
    const amount1INR = amount1USD * exchangeRate;
    const amount2INR = amount2USD * exchangeRate;
    const totalInvestedINR = totalInvestedUSD * exchangeRate;
    const totalWinningsINR = totalWinningsUSD * exchangeRate;
    const profitLossINR = profitLossUSD * exchangeRate;
  
    return {
      amount1USD,
      amount2USD,
      totalInvestedUSD: parseFloat(totalInvestedUSD.toFixed(2)),
      totalWinningsUSD: parseFloat(totalWinningsUSD.toFixed(2)),
      profitLossUSD: parseFloat(profitLossUSD.toFixed(2)),
      amount1INR: parseFloat(amount1INR.toFixed(2)),
      amount2INR: parseFloat(amount2INR.toFixed(2)),
      totalInvestedINR: parseFloat(totalInvestedINR.toFixed(2)),
      totalWinningsINR: parseFloat(totalWinningsINR.toFixed(2)),
      profitLossINR: parseFloat(profitLossINR.toFixed(2)),
    };
  };
  
  /**
   * Calculate the investment amount for a given odds value.
   * @param {number} odds - The odds for a team.
   * @returns {number} - Investment amount in USD.
   */
  const calculateInvestment = (odds) => {
    return parseFloat((25 / parseFloat(odds)).toFixed(2));
  };
  
  module.exports = { calculateOutcome, calculateInvestment };