import { useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { useTheme } from '../../context/ThemeContext'

function formatKRW(amount: number): string {
  return '₩' + Math.round(amount).toLocaleString('ko-KR')
}

function formatUSD(amount: number): string {
  return '$' + amount.toFixed(2)
}

function parseInput(v: string): number {
  return parseFloat(v.replace(/,/g, '')) || 0
}

function fmtInput(v: string): string {
  const stripped = v.replace(/,/g, '')
  const num = parseFloat(stripped)
  if (isNaN(num)) return v
  const parts = stripped.split('.')
  parts[0] = parseInt(parts[0] || '0').toLocaleString('en-US')
  return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0]
}

export default function UserInfo() {
  const { getSummary, holdings, displayCurrency, toggleDisplayCurrency, accountBalance, setAccountBalance, currentUSDKRW } = usePortfolio()
  const { theme } = useTheme()
  const summary = getSummary()
  const hasData = holdings.length > 0

  const [editing, setEditing] = useState(false)
  const [inputRaw, setInputRaw] = useState('')

  const isKRW = displayCurrency === 'KRW'
  const isPositive = isKRW ? summary.gainLossKrw >= 0 : summary.gainLoss >= 0

  const totalCostDisplay = hasData
    ? (isKRW ? formatKRW(summary.totalCostKrw) : formatUSD(summary.totalCost))
    : (isKRW ? '₩0' : '$0.00')

  const totalValueDisplay = hasData
    ? (isKRW ? formatKRW(summary.totalValueKrw) : formatUSD(summary.totalValue))
    : (isKRW ? '₩0' : '$0.00')

  const gainLossPercent = hasData
    ? (isKRW ? summary.gainLossPercentKrw : summary.gainLossPercent)
    : 0

  // 계좌 잔액 표시 (USD 기준 저장, 통화 토글에 따라 표시)
  const balanceDisplay = isKRW
    ? formatKRW(accountBalance * currentUSDKRW)
    : formatUSD(accountBalance)
  const balanceRate = isKRW ? currentUSDKRW : null

  function startEdit() {
    const initVal = isKRW
      ? Math.round(accountBalance * currentUSDKRW).toString()
      : accountBalance.toFixed(2)
    setInputRaw(fmtInput(initVal))
    setEditing(true)
  }

  function confirmEdit() {
    const raw = parseInput(inputRaw)
    const usd = isKRW ? raw / currentUSDKRW : raw
    setAccountBalance(usd)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div style={{ padding: '16px 16px', borderBottom: `1px solid ${theme.bg.card}` }}>
      {/* 계좌 잔액 */}
      <div style={{
        padding: '12px', background: theme.bg.card, borderRadius: '8px',
        marginBottom: '12px', fontSize: '13px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>계좌 잔액</span>
          {!editing && (
            <button
              onClick={startEdit}
              style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', color: theme.text.muted, fontSize: '11px', padding: '1px 6px' }}
            >
              수정
            </button>
          )}
        </div>
        {!editing && balanceRate && (
          <div style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px' }}>
            적용 환율 {balanceRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원/달러
          </div>
        )}
        {editing ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ color: theme.text.muted, fontSize: '12px' }}>{isKRW ? '₩' : '$'}</span>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={inputRaw}
              onChange={(e) => setInputRaw(fmtInput(e.target.value))}
              onKeyDown={handleKey}
              style={{
                flex: 1, background: theme.bg.input, border: `1px solid ${theme.accent}`,
                borderRadius: '4px', color: theme.text.primary, fontSize: '13px',
                padding: '3px 6px', outline: 'none', width: 0,
              }}
            />
            <button onClick={confirmEdit} style={{ background: theme.accent, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '3px 7px', cursor: 'pointer' }}>확인</button>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: `1px solid ${theme.border}`, borderRadius: '4px', color: theme.text.muted, fontSize: '11px', padding: '3px 7px', cursor: 'pointer' }}>취소</button>
          </div>
        ) : (
          <div style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary }}>{balanceDisplay}</div>
        )}
      </div>

      {/* 통화 토글 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {(['KRW', 'USD'] as const).map((c) => (
          <button
            key={c}
            onClick={toggleDisplayCurrency}
            style={{
              padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${displayCurrency === c ? theme.up : theme.border}`,
              background: displayCurrency === c ? theme.upBg : 'transparent',
              color: displayCurrency === c ? theme.up : theme.text.muted,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 포트폴리오 요약 */}
      <div style={{ padding: '12px', background: theme.bg.card, borderRadius: '8px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: theme.text.muted }}>총 투자금</span>
          <span style={{ color: theme.text.primary, fontWeight: 600 }}>{totalCostDisplay}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: theme.text.muted }}>평가금액</span>
          <span style={{ color: theme.text.primary, fontWeight: 600 }}>{totalValueDisplay}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: theme.text.muted }}>수익률</span>
          <span style={{ color: hasData ? (isPositive ? theme.up : theme.down) : theme.text.muted, fontWeight: 600 }}>
            {hasData ? `${isPositive ? '+' : ''}${gainLossPercent.toFixed(2)}%` : '+0.00%'}
          </span>
        </div>
      </div>
    </div>
  )
}
