import { useState, useEffect } from 'react'
import { NewsItem } from '../types/stock'
import { useTheme } from '../context/ThemeContext'

interface Props {
  symbol: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}

function NewsList({ items, onSelect, theme }: { items: NewsItem[]; onSelect: (item: NewsItem) => void; theme: ReturnType<typeof useTheme>['theme'] }) {
  if (items.length === 0) return <p style={{ color: theme.text.muted, fontSize: '13px' }}>뉴스가 없습니다.</p>

  return (
    <ul style={{ listStyle: 'none' }}>
      {items.map((item, i) => (
        <li
          key={i}
          onClick={() => onSelect(item)}
          style={{
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ fontSize: '13px', color: theme.text.primary, lineHeight: '1.4' }}>{item.title}</div>
          <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '3px' }}>
            {item.publisher} · {formatDate(item.publishedAt)}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function StockNews({ symbol }: Props) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [translated, setTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const { theme } = useTheme()

  function loadNews(translate: boolean, isRefresh = false) {
    const url = translate ? `/api/stocks/news/${symbol}?translate=true` : `/api/stocks/news/${symbol}`
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    fetch(url)
      .then((res) => res.json())
      .then((data: NewsItem[]) => setNews(data))
      .catch(() => {})
      .finally(() => { setRefreshing(false); setLoading(false) })
  }

  useEffect(() => {
    setTranslated(false)
    loadNews(false)
  }, [symbol])

  async function toggleTranslate() {
    setTranslating(true)
    const next = !translated
    await fetch(next ? `/api/stocks/news/${symbol}?translate=true` : `/api/stocks/news/${symbol}`)
      .then((res) => res.json())
      .then((data: NewsItem[]) => { setNews(data); setTranslated(next) })
      .catch(() => {})
    setTranslating(false)
  }

  const yahooNews = news.filter((n) => n.source === 'yahoo')
  const googleNews = news.filter((n) => n.source === 'google')

  return (
    <>
      <div style={{
        background: theme.bg.card,
        borderRadius: '12px',
        padding: '20px 24px',
        border: `1px solid ${theme.border}`,
        marginTop: '12px',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: theme.text.primary }}>관련 뉴스</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => loadNews(translated, true)}
              disabled={loading || translating || refreshing}
              title="새로고침"
              style={{
                padding: '4px 10px', borderRadius: '6px',
                border: `1px solid ${theme.border}`, background: 'transparent',
                color: theme.text.secondary, cursor: 'pointer', fontSize: '14px',
              }}
            >
              {refreshing ? '⟳' : '↻'}
            </button>
            <button
              onClick={toggleTranslate}
              disabled={loading || translating || refreshing}
              style={{
                padding: '4px 12px', borderRadius: '6px',
                border: `1px solid ${theme.border}`,
                background: translated ? theme.accent : 'transparent',
                color: translated ? '#fff' : theme.text.secondary,
                cursor: 'pointer', fontSize: '12px',
              }}
            >
              {translating ? '번역 중...' : translated ? '원문 보기' : '한국어 번역'}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: theme.text.muted, fontSize: '14px' }}>불러오는 중...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '10px', fontWeight: 600 }}>
                Yahoo Finance 제공
              </div>
              <NewsList items={yahooNews} onSelect={setSelected} theme={theme} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '10px', fontWeight: 600 }}>
                Google News
              </div>
              <NewsList items={googleNews} onSelect={setSelected} theme={theme} />
            </div>
          </div>
        )}
      </div>

      {/* 오버레이 */}
      {selected && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{
            position: 'fixed',
            inset: 0,
            background: theme.overlay,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: theme.bg.card,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '10px' }}>
              {selected.publisher} · {formatDate(selected.publishedAt)}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, lineHeight: '1.5', color: theme.text.primary, marginBottom: '20px' }}>
              {selected.title}
            </h2>
            <p style={{ fontSize: '13px', color: theme.text.muted, marginBottom: '20px' }}>
              기사 본문은 제공되지 않습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  background: 'transparent',
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                닫기
              </button>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: theme.accent,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                기사 전체 보기
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
