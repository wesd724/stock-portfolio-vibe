import { Transaction, Holding } from '../types/portfolio'

export function computeHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
): Holding[] {
  const map = new Map<string, { shares: number; cost: number; name: string }>()

  for (const tx of transactions) {
    const entry = map.get(tx.symbol) ?? { shares: 0, cost: 0, name: tx.name }

    if (tx.type === 'BUY') {
      entry.cost += tx.amount
      entry.shares += tx.shares
    } else {
      // 매도: 평균 원가 비율만큼 차감
      const ratio = entry.shares > 0 ? tx.shares / entry.shares : 0
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
      return {
        symbol,
        name: v.name,
        totalShares: v.shares,
        avgCostPerShare: v.shares > 0 ? v.cost / v.shares : 0,
        totalCost: v.cost,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent: v.cost > 0 ? (gainLoss / v.cost) * 100 : 0,
      }
    })
}

export function computeSummary(holdings: Holding[]) {
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0)
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const gainLoss = totalValue - totalCost
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0
  return { totalCost, totalValue, gainLoss, gainLossPercent }
}
