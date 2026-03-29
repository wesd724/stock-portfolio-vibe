import { useEffect, useState } from 'react'
import { useFavorites } from '../../context/FavoritesContext'
import { useStock } from '../../context/StockContext'
import { useNavigation } from '../../context/NavigationContext'
import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'
import { StockQuote } from '../../types/stock'

function marketStateLabel(state: string, regularMarketTime?: number | null) {
  const todayStr = new Date().toDateString()
  const lastTradeStr = regularMarketTime != null ? new Date(regularMarketTime).toDateString() : null
  if (state === 'CLOSED') {
    return lastTradeStr === todayStr ? { label: '장마감', color: '#64748b' } : { label: '휴장', color: '#64748b' }
  }
  if (state === 'REGULAR' && lastTradeStr != null && lastTradeStr !== todayStr) {
    return { label: '휴장', color: '#64748b' }
  }
  const map: Record<string, { label: string; color: string }> = {
    REGULAR: { label: '본장', color: '#22c55e' },
    PRE: { label: '프리장', color: '#f59e0b' },
    PREPRE: { label: '데이장', color: '#64748b' },
    POST: { label: '애프터장', color: '#818cf8' },
    POSTPOST: { label: '데이장', color: '#64748b' },
  }
  return map[state] ?? { label: state, color: '#64748b' }
}

// 기본: 티커 | 종목명 | 현재가 | 등락률 | 상태 | ★  (6열)
const GRID_NORMAL_PC     = '80px 1fr 120px 110px 68px 40px'
const GRID_NORMAL_MOBILE = '52px 1fr 76px 62px 46px 24px'

// 편집: ▲▼ | 티커 | 종목명 | 현재가 | 등락률 | 그룹 | ★  (7열)
const GRID_EDIT_PC     = '36px 76px 1fr 120px 110px 90px 40px'
const GRID_EDIT_MOBILE = '32px 48px 1fr 74px 62px 72px 22px'

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

export default function FavoritesPage() {
  const { groups, toggle, addGroup, removeGroup, renameGroup, moveToGroup, reorderSymbols, reorderGroups } = useFavorites()
  const allSymbols = groups.flatMap((g) => g.symbols)
  const { setSelectedQuote } = useStock()
  const { setPage } = useNavigation()
  const { theme } = useTheme()
  const { isMobile } = useWindowSize()

  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editing, setEditing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (allSymbols.length === 0) return
    setLoading(true)
    Promise.all(
      allSymbols.map((sym) =>
        fetch(`/api/stocks/quote/${sym}`)
          .then((r) => r.json())
          .then((data: StockQuote) => [sym, data] as const)
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, StockQuote> = {}
      results.forEach((entry) => { if (entry) map[entry[0]] = entry[1] })
      setQuotes(map)
      setLoading(false)
    })
  }, [allSymbols.slice().sort().join(','), refreshKey])

  function handleRowClick(quote: StockQuote) {
    setSelectedQuote(quote)
    setPage('home')
  }

  function handleAddGroup() {
    const name = newGroupName.trim()
    if (name) addGroup(name)
    setNewGroupName('')
    setAddingGroup(false)
  }

  function handleRenameConfirm(id: string) {
    const name = editingName.trim()
    if (name) renameGroup(id, name)
    setEditingGroupId(null)
  }

  const btnBase: React.CSSProperties = {
    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    border: `1px solid ${theme.border}`, background: 'none',
    color: theme.text.muted, cursor: 'pointer',
  }

  function arrowBtnStyle(disabled: boolean): React.CSSProperties {
    return {
      background: theme.bg.input, border: `1px solid ${theme.border}`,
      color: theme.text.muted, borderRadius: '3px',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '10px', padding: '2px 4px', lineHeight: 1,
      opacity: disabled ? 0.3 : 1, display: 'block', width: '100%',
    }
  }

  function ArrowCell({ onUp, onDown, disableUp, disableDown }: {
    onUp: () => void; onDown: () => void; disableUp: boolean; disableDown: boolean
  }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'stretch', justifyContent: 'center', padding: '0 2px' }}>
        <button disabled={disableUp} onClick={(e) => { e.stopPropagation(); onUp() }} style={arrowBtnStyle(disableUp)}>▲</button>
        <button disabled={disableDown} onClick={(e) => { e.stopPropagation(); onDown() }} style={arrowBtnStyle(disableDown)}>▼</button>
      </div>
    )
  }

  const gridCols = editing
    ? (isMobile ? GRID_EDIT_MOBILE : GRID_EDIT_PC)
    : (isMobile ? GRID_NORMAL_MOBILE : GRID_NORMAL_PC)

  const padding = isMobile ? '10px 14px' : '14px 20px'
  const minW = isMobile ? undefined : (editing ? '680px' : '560px')

  return (
    <div style={{ background: theme.bg.card, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>즐겨찾기</span>
        <span style={{ fontSize: '12px', color: theme.text.muted }}>총 {allSymbols.length}개</span>
        <div style={{ flex: 1 }} />
        {!editing && (
          <button onClick={() => setRefreshKey((k) => k + 1)}
            style={{ fontSize: '14px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: theme.text.muted, cursor: 'pointer' }}
            title="현재가 새로고침">↻</button>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          style={{
            fontSize: '12px', padding: '5px 12px', borderRadius: '6px',
            border: `1px solid ${editing ? theme.accent : theme.border}`,
            background: editing ? theme.accent : 'none',
            color: editing ? '#fff' : theme.text.secondary, cursor: 'pointer',
          }}
        >{editing ? '완료' : '편집'}</button>
        {!editing && (addingGroup ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input autoFocus value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGroup()
                if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
              }}
              placeholder="그룹 이름"
              style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.primary, width: '120px', outline: 'none' }}
            />
            <button onClick={handleAddGroup}
              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: theme.accent, color: '#fff', cursor: 'pointer' }}>추가</button>
            <button onClick={() => { setAddingGroup(false); setNewGroupName('') }} style={{ ...btnBase, padding: '4px 8px' }}>취소</button>
          </div>
        ) : (
          <button onClick={() => setAddingGroup(true)}
            style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: theme.text.secondary, cursor: 'pointer' }}>
            + 그룹 추가</button>
        ))}
      </div>

      {allSymbols.length === 0 && !groups.some((g) => g.symbols.length === 0 && groups.length > 1) ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
          즐겨찾기한 종목이 없습니다.<br />종목 정보 화면의 ☆ 버튼으로 추가하세요.
        </div>
      ) : loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>불러오는 중...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* 컬럼 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: gridCols,
            ...(minW ? { minWidth: minW } : {}),
            padding: isMobile ? '8px 14px' : '8px 20px',
            fontSize: '11px', color: theme.text.muted, borderBottom: `1px solid ${theme.border}`,
          }}>
            {editing ? (
              // 편집: ▲▼ | 티커 | 종목명 | 현재가 | 등락률 | 그룹 | ★
              <>
                <span />
                <span>티커</span>
                <span>종목명</span>
                <span style={{ textAlign: 'right' }}>현재가</span>
                <span style={{ textAlign: 'right' }}>등락률</span>
                <span style={{ textAlign: 'center' }}>그룹 이동</span>
                <span />
              </>
            ) : (
              // 기본: 티커 | 종목명 | 현재가 | 등락률 | 상태 | ★
              <>
                <span>티커</span>
                <span>종목명</span>
                <span style={{ textAlign: 'right' }}>현재가</span>
                <span style={{ textAlign: 'right' }}>등락률</span>
                <span style={{ textAlign: 'center' }}>상태</span>
                <span />
              </>
            )}
          </div>

          {/* 그룹 섹션 */}
          {groups.map((group, groupIdx) => (
            <div key={group.id}>
              {/* 그룹 헤더 */}
              <div style={{
                ...(minW ? { minWidth: minW } : {}),
                padding: '6px 14px 6px 14px',
                background: theme.bg.hover, borderBottom: `1px solid ${theme.border}`,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {editing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, width: '28px' }}>
                    <button disabled={groupIdx === 0}
                      onClick={() => reorderGroups(moveItem(groups, groupIdx, groupIdx - 1))}
                      style={arrowBtnStyle(groupIdx === 0)}>▲</button>
                    <button disabled={groupIdx === groups.length - 1}
                      onClick={() => reorderGroups(moveItem(groups, groupIdx, groupIdx + 1))}
                      style={arrowBtnStyle(groupIdx === groups.length - 1)}>▼</button>
                  </div>
                )}
                {editingGroupId === group.id ? (
                  <>
                    <input autoFocus value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameConfirm(group.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      style={{ fontSize: '13px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.primary, width: '130px', outline: 'none' }}
                    />
                    <button onClick={() => handleRenameConfirm(group.id)}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: 'none', background: theme.accent, color: '#fff', cursor: 'pointer' }}>확인</button>
                    <button onClick={() => setEditingGroupId(null)} style={btnBase}>취소</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary }}>{group.name}</span>
                    <span style={{ fontSize: '11px', color: theme.text.muted }}>({group.symbols.length}개)</span>
                    <div style={{ flex: 1 }} />
                    {editing && (
                      <button onClick={() => { setEditingGroupId(group.id); setEditingName(group.name) }} style={btnBase}>이름 변경</button>
                    )}
                    {editing && groups.length > 1 && (
                      <button onClick={() => removeGroup(group.id)} style={btnBase}>삭제</button>
                    )}
                  </>
                )}
              </div>

              {/* 종목 행 */}
              {group.symbols.length === 0 ? (
                <div style={{ ...(minW ? { minWidth: minW } : {}), padding, fontSize: '12px', color: theme.text.muted, fontStyle: 'italic', borderBottom: `1px solid ${theme.border}` }}>
                  이 그룹에 종목이 없습니다.
                </div>
              ) : group.symbols.map((sym, idx) => {
                const q = quotes[sym]
                const isLast = idx === group.symbols.length - 1

                const rowStyle: React.CSSProperties = {
                  display: 'grid', gridTemplateColumns: gridCols,
                  ...(minW ? { minWidth: minW } : {}),
                  padding, fontSize: '13px',
                  borderBottom: `1px solid ${theme.border}`,
                  alignItems: 'center',
                  cursor: editing ? 'default' : 'pointer',
                  transition: 'background 0.1s',
                }

                const arrowCell = (
                  <ArrowCell
                    disableUp={idx === 0} disableDown={isLast}
                    onUp={() => reorderSymbols(group.id, moveItem(group.symbols, idx, idx - 1))}
                    onDown={() => reorderSymbols(group.id, moveItem(group.symbols, idx, idx + 1))}
                  />
                )

                const groupSelect = groups.length > 1 ? (
                  <span style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <select value={group.id} onChange={(e) => moveToGroup(sym, group.id, e.target.value)}
                      style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.bg.input, color: theme.text.secondary, cursor: 'pointer', width: '100%', maxWidth: '86px' }}>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </span>
                ) : <span />

                const starBtn = (
                  <button onClick={(e) => { e.stopPropagation(); toggle(sym) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0, justifySelf: 'center' }}
                    title="즐겨찾기 해제">★</button>
                )

                if (!q) {
                  return (
                    <div key={sym} style={rowStyle}>
                      {editing && arrowCell}
                      <span style={{ color: theme.text.muted, fontSize: isMobile ? '12px' : '13px' }}>{sym}</span>
                      <span style={{ color: theme.text.muted }}>로드 실패</span>
                      <span /><span />
                      {editing ? groupSelect : <span />}
                      {starBtn}
                    </div>
                  )
                }

                const isPositive = q.change >= 0
                const changeColor = isPositive ? theme.up : theme.down
                const sign = isPositive ? '+' : ''
                const ms = marketStateLabel(q.marketState, q.regularMarketTime)

                return (
                  <div key={sym}
                    onClick={() => { if (!editing) handleRowClick(q) }}
                    style={rowStyle}
                    onMouseEnter={(e) => { if (!editing) e.currentTarget.style.background = theme.bg.hover }}
                    onMouseLeave={(e) => { if (!editing) e.currentTarget.style.background = 'transparent' }}
                  >
                    {editing && arrowCell}
                    <span style={{ fontWeight: 600, color: theme.text.primary, fontSize: isMobile ? '12px' : '13px' }}>{q.symbol}</span>
                    <span style={{ color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isMobile ? '11px' : '13px' }}>{q.name}</span>
                    <span style={{ textAlign: 'right', color: theme.text.primary, fontWeight: 500, fontSize: isMobile ? '12px' : '13px' }}>
                      {q.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ textAlign: 'right', color: changeColor, fontSize: isMobile ? '12px' : '13px', fontWeight: 500 }}>
                      {sign}{q.changePercent?.toFixed(2)}%
                    </span>
                    {editing ? groupSelect : (
                      <span style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: theme.bg.input, color: ms.color }}>
                          {ms.label}
                        </span>
                      </span>
                    )}
                    {starBtn}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
