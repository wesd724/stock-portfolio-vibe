import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

interface NewsItem {
  title: string
  link: string
  publisher: string
  publishedAt: string
  source: string
}

const PAGE_SIZE = 10

const SOURCE_COLORS: Record<string, string> = {
  Reuters: '#f87171',
  CNBC: '#60a5fa',
  'Google News': '#34d399',
  'AP News': '#fb923c',
  MarketWatch: '#a78bfa',
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

export default function GlobalNews() {
  const [allNews, setAllNews] = useState<NewsItem[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [translated, setTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const allNewsRef = useRef<NewsItem[]>([])
  const { theme } = useTheme()
  allNewsRef.current = allNews

  function fetchNews(translate: boolean, isRefresh = false) {
    const url = translate ? '/api/news/global?translate=true' : '/api/news/global'
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    return fetch(url)
      .then((r) => r.json())
      .then((data: NewsItem[]) => { setAllNews(data); setVisibleCount(PAGE_SIZE) })
      .catch(() => {})
      .finally(() => { setRefreshing(false); setLoading(false) })
  }

  useEffect(() => {
    fetchNews(false)
  }, [])

  // 무한 스크롤
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allNewsRef.current.length))
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  async function toggleTranslate() {
    setTranslating(true)
    const next = !translated
    await fetchNews(next)
    setTranslated(next)
    setTranslating(false)
  }

  const visibleNews = allNews.slice(0, visibleCount)
  const hasMore = visibleCount < allNews.length

  return (
    <>
      <div style={{
        background: theme.bg.card, borderRadius: '12px',
        padding: '20px 24px', border: `1px solid ${theme.border}`, marginTop: '12px',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: theme.text.primary, margin: 0 }}>국제 금융 뉴스</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Object.entries(SOURCE_COLORS).map(([src, color]) => (
                <span key={src} style={{
                  fontSize: '11px', padding: '2px 7px', borderRadius: '999px',
                  background: theme.bg.input, color, border: `1px solid ${color}`,
                }}>{src}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => fetchNews(translated, true)}
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
                cursor: loading || translating || refreshing ? 'default' : 'pointer',
                fontSize: '12px',
              }}
            >
              {translating ? '번역 중...' : translated ? '원문 보기' : '한국어 번역'}
            </button>
          </div>
        </div>

        {/* 뉴스 목록 */}
        {loading ? (
          <p style={{ color: theme.text.muted, fontSize: '14px' }}>불러오는 중...</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {visibleNews.map((item, i) => {
              const color = SOURCE_COLORS[item.source] ?? theme.text.muted
              return (
                <li
                  key={i}
                  onClick={() => setSelected(item)}
                  style={{
                    padding: '12px 0',
                    borderBottom: i < visibleNews.length - 1 ? `1px solid ${theme.border}` : 'none',
                    cursor: 'pointer',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{
                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                    background: theme.bg.input, color, border: `1px solid ${color}`,
                    flexShrink: 0, marginTop: '2px',
                  }}>{item.source}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: theme.text.primary, lineHeight: '1.5' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: theme.text.muted, marginTop: '3px' }}>
                      {item.publisher} · {formatDate(item.publishedAt)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* 무한 스크롤 센티넬 - 항상 렌더링 */}
        <div ref={sentinelRef} style={{ height: '1px' }} />
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', padding: '12px 0', color: theme.text.muted, fontSize: '13px' }}>
            스크롤하여 더 보기
          </div>
        )}
      </div>

      {/* 클릭 오버레이 */}
      {selected && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{
            position: 'fixed', inset: 0, background: theme.overlay,
            zIndex: 300, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '24px',
          }}
        >
          <div
            style={{
              background: theme.bg.card, border: `1px solid ${theme.border}`,
              borderRadius: '12px', padding: '28px',
              maxWidth: '560px', width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                background: theme.bg.input,
                color: SOURCE_COLORS[selected.source] ?? theme.text.muted,
                border: `1px solid ${SOURCE_COLORS[selected.source] ?? theme.text.muted}`,
              }}>{selected.source}</span>
              <span style={{ fontSize: '11px', color: theme.text.muted }}>
                {selected.publisher} · {formatDate(selected.publishedAt)}
              </span>
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
                  padding: '8px 16px', borderRadius: '8px',
                  border: `1px solid ${theme.border}`, background: 'transparent',
                  color: theme.text.secondary, cursor: 'pointer', fontSize: '14px',
                }}
              >닫기</button>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: theme.accent, color: '#fff',
                  cursor: 'pointer', fontSize: '14px', textDecoration: 'none',
                }}
              >기사 전체 보기</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
