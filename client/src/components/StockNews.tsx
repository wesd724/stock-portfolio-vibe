import { useState, useEffect } from 'react'
import { NewsItem } from '../types/stock'

interface Props {
  symbol: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function NewsList({ items, onSelect }: { items: NewsItem[]; onSelect: (item: NewsItem) => void }) {
  if (items.length === 0) return <p style={{ color: '#475569', fontSize: '13px' }}>뉴스가 없습니다.</p>

  return (
    <ul style={{ listStyle: 'none' }}>
      {items.map((item, i) => (
        <li
          key={i}
          onClick={() => onSelect(item)}
          style={{
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid #334155' : 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: '1.4' }}>{item.title}</div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
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
  const [selected, setSelected] = useState<NewsItem | null>(null)

  useEffect(() => {
    setLoading(true)
    setTranslated(false)
    fetch(`/api/stocks/news/${symbol}`)
      .then((res) => res.json())
      .then((data: NewsItem[]) => setNews(data))
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [symbol])

  async function toggleTranslate() {
    if (translated) {
      // 원문으로 되돌리기
      setTranslating(true)
      fetch(`/api/stocks/news/${symbol}`)
        .then((res) => res.json())
        .then((data: NewsItem[]) => { setNews(data); setTranslated(false) })
        .catch(() => {})
        .finally(() => setTranslating(false))
    } else {
      setTranslating(true)
      fetch(`/api/stocks/news/${symbol}?translate=true`)
        .then((res) => res.json())
        .then((data: NewsItem[]) => { setNews(data); setTranslated(true) })
        .catch(() => {})
        .finally(() => setTranslating(false))
    }
  }

  const yahooNews = news.filter((n) => n.source === 'yahoo')
  const googleNews = news.filter((n) => n.source === 'google')

  return (
    <>
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '20px 24px',
        border: '1px solid #334155',
        marginTop: '12px',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>관련 뉴스</h3>
          <button
            onClick={toggleTranslate}
            disabled={loading || translating}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: translated ? '#3b82f6' : 'transparent',
              color: translated ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {translating ? '번역 중...' : translated ? '원문 보기' : '한국어 번역'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#475569', fontSize: '14px' }}>불러오는 중...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 600 }}>
                Yahoo Finance
              </div>
              <NewsList items={yahooNews} onSelect={setSelected} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 600 }}>
                Google News
              </div>
              <NewsList items={googleNews} onSelect={setSelected} />
            </div>
          </div>
        )}
      </div>

      {/* 오버레이 */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
              {selected.publisher} · {formatDate(selected.publishedAt)}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, lineHeight: '1.5', color: '#f1f5f9', marginBottom: '20px' }}>
              {selected.title}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              기사 본문은 제공되지 않습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94a3b8',
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
                  background: '#3b82f6',
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
