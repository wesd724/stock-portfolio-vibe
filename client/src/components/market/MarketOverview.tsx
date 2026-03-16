import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MarketItem } from '../../types/stock'
import MarketCard from './MarketCard'
import { useTheme } from '../../context/ThemeContext'

interface PutCallItem { symbol: string; ratio: number | null }

export default function MarketOverview() {
  const [items, setItems] = useState<MarketItem[]>([])
  const [putCall, setPutCall] = useState<PutCallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { theme } = useTheme()

  function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    Promise.all([
      fetch('/api/market/overview').then((r) => r.json()),
      fetch('/api/market/putcall').then((r) => r.json()),
    ])
      .then(([overview, pc]) => { setItems(overview); setPutCall(pc) })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return <p style={{ color: theme.text.muted, fontSize: '15px' }}>시장 정보를 불러오는 중...</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>시장 현황</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="새로고침"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '16px', padding: '2px' }}
          >
            {refreshing ? '⟳' : '↻'}
          </button>
          <span style={{ fontSize: '12px', color: theme.text.muted }}>15분 지연 데이터</span>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {items.map((item) => (
          <MarketCard key={item.symbol} item={item} />
        ))}
      </div>

      {/* 풋콜 비율 */}
      {putCall.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.secondary }}>풋/콜 비율</span>
            <button
              onClick={() => setShowGuide(true)}
              title="풋/콜 비율이란?"
              style={{
                width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${theme.border}`,
                background: 'transparent', color: theme.text.muted, fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >?</button>
            <span style={{ fontSize: '11px', color: theme.text.muted }}>전체 만기 기준</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {putCall.map(({ symbol, ratio }) => {
              const bearish = ratio != null && ratio > 1
              const bullish = ratio != null && ratio < 1
              const color = bearish ? theme.down : bullish ? theme.up : theme.text.muted
              const sentiment = bearish ? '약세' : bullish ? '강세' : '-'
              return (
                <div key={symbol} style={{
                  background: theme.bg.card, border: `1px solid ${theme.border}`,
                  borderRadius: '10px', padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: theme.text.primary }}>{symbol}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color }}>
                    {ratio != null ? ratio.toFixed(2) : '-'}
                  </span>
                  <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{sentiment}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>

      {/* 풋/콜 비율 설명 모달 */}
      {showGuide && createPortal(
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowGuide(false) }}
          style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>풋/콜 비율이란?</h3>
              <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '18px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: theme.text.secondary, lineHeight: 1.7 }}>
              <p>
                <strong style={{ color: theme.text.primary }}>풋/콜 비율(Put/Call Ratio)</strong>은 풋 옵션 거래량을 콜 옵션 거래량으로 나눈 값입니다.
              </p>
              <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.down, fontWeight: 600 }}>비율 {'>'} 1 &nbsp;→&nbsp; 약세 신호</span>
                  <span style={{ color: theme.text.muted }}>풋 우세 (하락 베팅 많음)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.up, fontWeight: 600 }}>비율 {'<'} 1 &nbsp;→&nbsp; 강세 신호</span>
                  <span style={{ color: theme.text.muted }}>콜 우세 (상승 베팅 많음)</span>
                </div>
              </div>
              <p style={{ color: theme.text.muted, fontSize: '12px' }}>
                💡 단독 지표로 쓰기보다 다른 시장 지표와 함께 참고하는 것이 좋습니다. 극단적으로 높거나 낮은 값은 오히려 반대 방향의 신호(역발상 지표)로 해석하기도 합니다.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
  )
}
