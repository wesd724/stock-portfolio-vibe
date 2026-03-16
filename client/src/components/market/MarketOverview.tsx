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
  const [showPutCallGuide, setShowPutCallGuide] = useState(false)
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

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: theme.text.primary }}>{title}</span>
      <div style={{ fontSize: '13px', color: theme.text.secondary, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )

  const box = (children: React.ReactNode) => (
    <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
      {children}
    </div>
  )

  const row = (label: string, desc: string, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ color: color ?? theme.text.primary, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color: theme.text.muted, textAlign: 'right' }}>{desc}</span>
    </div>
  )

  const note = (text: string) => (
    <p style={{ color: theme.text.muted, fontSize: '12px', marginTop: '4px' }}>{text}</p>
  )

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>시장 현황</h2>
            <button
              onClick={() => setShowGuide(true)}
              title="지표 설명 보기"
              style={{
                width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${theme.border}`,
                background: 'transparent', color: theme.text.muted, fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >?</button>
          </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {items.map((item) => <MarketCard key={item.symbol} item={item} />)}
        </div>

        {/* 풋/콜 비율 */}
        {putCall.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.secondary }}>풋/콜 비율</span>
              <button
                onClick={() => setShowPutCallGuide(true)}
                title="풋/콜 비율이란?"
                style={{
                  width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${theme.border}`,
                  background: 'transparent', color: theme.text.muted, fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
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

      {/* 지표 설명 모달 */}
      {showGuide && createPortal(
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowGuide(false) }}
          style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', maxWidth: '680px', width: '100%', maxHeight: '82vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>시장 지표 안내</h3>
              <button
                onClick={() => setShowGuide(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '18px', lineHeight: 1 }}
              >✕</button>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '0' }} />

            {section('미국 지수 선물', <>
              <p>주가지수를 기초자산으로 하는 선물 계약입니다. 본장 개장 전에도 거래되므로 <strong style={{ color: theme.text.primary }}>장 전 분위기를 미리 파악</strong>하는 데 활용됩니다.</p>
              {box(<>
                {row('나스닥100 (NQ)', '기술주 중심, 변동성 큼')}
                {row('S&P500 (ES)', '미국 대형주 500종목 대표 지수')}
                {row('다우존스 (YM)', '블루칩 30종목, 전통 산업 중심')}
                {row('러셀2000 (RTY)', '소형주 2000종목, 경기 민감도 높음')}
              </>)}
              {note('💡 선물 가격은 본장 지수와 항상 일치하지 않으며, 프리미엄·디스카운트가 발생할 수 있습니다.')}
            </>)}

            <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '0' }} />

            {section('환율 / 달러 인덱스', <>
              <p><strong style={{ color: theme.text.primary }}>달러 인덱스(DXY)</strong>는 유로·엔·파운드 등 주요 6개 통화 대비 달러의 강세를 나타내는 종합 지표입니다.</p>
              {box(<>
                {row('USD/KRW', '1달러 기준 원화 환율')}
                {row('달러 인덱스 (DX)', '달러 강세·약세의 종합 척도')}
              </>)}
              <p>달러 인덱스 <strong style={{ color: theme.down }}>상승</strong> → 달러 강세 → 신흥국 통화 약세 · 원자재 가격 하락 압력 경향이 있습니다.</p>
              {note('💡 달러 강세는 원/달러 환율 상승(원화 약세)을 의미하므로, 한국 투자자의 해외 자산 가치에 영향을 줍니다.')}
            </>)}

            <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '0' }} />

            {section('미국 국채 수익률', <>
              <p>채권 가격의 역수로, <strong style={{ color: theme.text.primary }}>시장 금리의 기준선</strong> 역할을 합니다. 수익률 상승 = 채권 가격 하락 = 금리 인상 기대.</p>
              {box(<>
                {row('2년물', '단기 금리 기대치, 연준 정책과 민감하게 연동')}
                {row('10년물', '장기 금리 기준선, 주식 밸류에이션과 역상관')}
              </>)}
              {note('💡 2년물 수익률이 10년물을 초과하는 장단기 금리 역전(Inverted Yield Curve)은 역사적으로 경기침체 선행지표로 해석됩니다.')}
            </>)}

            <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '0' }} />

            {section('VIX 지수', <>
              <p>S&P500 옵션 가격으로 산출한 향후 30일간 시장 변동성 기대치로, <strong style={{ color: theme.text.primary }}>"공포 지수"</strong>라고도 불립니다.</p>
              {box(<>
                {row('20 이하', '시장 안정 구간', theme.up)}
                {row('20 ~ 30', '변동성 주의 구간', theme.text.secondary)}
                {row('30 이상', '공포·패닉 구간', theme.down)}
              </>)}
              {note('💡 VIX가 극단적으로 높아지면 오히려 반등 신호로 해석하기도 합니다. 단독 지표보다 다른 지표와 함께 참고하세요.')}
            </>)}

          </div>
        </div>,
        document.body,
      )}

      {/* 풋/콜 비율 설명 모달 */}
      {showPutCallGuide && createPortal(
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPutCallGuide(false) }}
          style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>풋/콜 비율이란?</h3>
              <button
                onClick={() => setShowPutCallGuide(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text.muted, fontSize: '18px', lineHeight: 1 }}
              >✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: theme.text.secondary, lineHeight: 1.7 }}>
              <p>풋 옵션 거래량을 콜 옵션 거래량으로 나눈 값으로, 시장 참여자들의 <strong style={{ color: theme.text.primary }}>심리를 반영</strong>합니다.</p>
              <div style={{ background: theme.bg.input, borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.down, fontWeight: 600 }}>비율 &gt; 1 → 약세 신호</span>
                  <span style={{ color: theme.text.muted }}>풋 우세 (하락 베팅 많음)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.up, fontWeight: 600 }}>비율 &lt; 1 → 강세 신호</span>
                  <span style={{ color: theme.text.muted }}>콜 우세 (상승 베팅 많음)</span>
                </div>
              </div>
              <p style={{ color: theme.text.muted, fontSize: '12px' }}>💡 극단적으로 높거나 낮은 값은 오히려 반대 방향의 신호(역발상 지표)로 해석하기도 합니다.</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
