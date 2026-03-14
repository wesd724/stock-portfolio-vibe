import { Transaction, Holding } from '../types/portfolio'

export function computeHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  currentUSDKRW: number,
): Holding[] {
  const map = new Map<string, {
    shares: number; cost: number; name: string; rateWeight: number
  }>()

  for (const tx of transactions) {
    const entry = map.get(tx.symbol) ?? { shares: 0, cost: 0, name: tx.name, rateWeight: 0 }
    const rate = tx.exchangeRate || currentUSDKRW || 1300

    if (tx.type === 'BUY') {
      entry.cost += tx.amount
      entry.shares += tx.shares
      entry.rateWeight += tx.shares * rate
    } else {
      const ratio = entry.shares > 0 ? tx.shares / entry.shares : 0
      entry.rateWeight -= entry.rateWeight * ratio
      entry.cost -= entry.cost * ratio
      entry.shares -= tx.shares
    }

    map.set(tx.symbol, entry)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.shares > 0.0001)
    .map(([symbol, v]) => {
      const currentPrice = currentPrices[symbol] ?? 0
      const currentValue = currentPrice * v.shares
      const gainLoss = currentValue - v.cost
      const avgBuyRate = v.shares > 0 ? v.rateWeight / v.shares : (currentUSDKRW || 1300)

      const currentValueKrw = currentValue * currentUSDKRW
      const totalCostKrw = v.cost * avgBuyRate
      const gainLossKrw = currentValueKrw - totalCostKrw
      const fxGainLossKrw = v.shares > 0 ? (v.cost / v.shares) * v.shares * (currentUSDKRW - avgBuyRate) : 0
      const priceGainLossKrw = gainLoss * currentUSDKRW

      return {
        symbol,
        name: v.name,
        totalShares: v.shares,
        avgCostPerShare: v.shares > 0 ? v.cost / v.shares : 0,
        totalCost: v.cost,
        avgBuyRate,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent: v.cost > 0 ? (gainLoss / v.cost) * 100 : 0,
        currentValueKrw,
        totalCostKrw,
        gainLossKrw,
        gainLossPercentKrw: totalCostKrw > 0 ? (gainLossKrw / totalCostKrw) * 100 : 0,
        fxGainLossKrw,
        priceGainLossKrw,
      }
    })
}

export function computeSummary(holdings: Holding[], _currentUSDKRW?: number) {
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0)
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const gainLoss = totalValue - totalCost
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0
  const totalCostKrw = holdings.reduce((s, h) => s + h.totalCostKrw, 0)
  const totalValueKrw = holdings.reduce((s, h) => s + h.currentValueKrw, 0)
  const gainLossKrw = totalValueKrw - totalCostKrw
  const gainLossPercentKrw = totalCostKrw > 0 ? (gainLossKrw / totalCostKrw) * 100 : 0
  const fxGainLossKrw = holdings.reduce((s, h) => s + h.fxGainLossKrw, 0)
  const priceGainLossKrw = holdings.reduce((s, h) => s + h.priceGainLossKrw, 0)
  return {
    totalCost, totalValue, gainLoss, gainLossPercent,
    totalCostKrw, totalValueKrw, gainLossKrw, gainLossPercentKrw,
    fxGainLossKrw, priceGainLossKrw,
  }
}
