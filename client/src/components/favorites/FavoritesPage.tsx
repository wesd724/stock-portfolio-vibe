import { useEffect, useRef, useState } from 'react'
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
    return lastTradeStr === todayStr
      ? { label: '장마감', color: '#64748b' }
      : { label: '휴장', color: '#64748b' }
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

const GRID_COLS = '80px 1fr 120px 160px 100px 88px 40px'
const GRID_COLS_REORDER = '24px 80px 1fr 120px 160px 100px 88px 40px'
const GRID_MIN_WIDTH = '630px'
// 모바일: 티커 | 종목명 | 현재가 | 등락률 | ★
const GRID_COLS_MOBILE = '64px 1fr 72px 56px 32px'
// 모바일 순서변경: 티커 | 종목명 | 현재가 | ↑ | ↓
const GRID_COLS_MOBILE_REORDER = '64px 1fr 72px 28px 28px'

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
  const [reordering, setReordering] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dragOver, setDragOver] = useState<{ groupId: string; index: number } | null>(null)
  const dragRef = useRef<{ groupId: string; index: number } | null>(null)
  const [dragGroupOver, setDragGroupOver] = useState<number | null>(null)
  const dragGroupRef = useRef<number | null>(null)

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
      results.forEach((entry) => {
        if (entry) map[entry[0]] = entry[1]
      })
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
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    border: `1px solid ${theme.border}`,
    background: 'none',
    color: theme.text.muted,
    cursor: 'pointer',
  }

  return (
    <div style={{ background: theme.bg.card, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>즐겨찾기</span>
        <span style={{ fontSize: '12px', color: theme.text.muted }}>총 {allSymbols.length}개</span>
        <div style={{ flex: 1 }} />
        {!reordering && (
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ fontSize: '14px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: theme.text.muted, cursor: 'pointer' }}
            title="현재가 새로고침"
          >↻</button>
        )}
        <button
          onClick={() => setReordering((v) => !v)}
          style={{
            fontSize: '12px', padding: '5px 12px', borderRadius: '6px',
            border: `1px solid ${reordering ? theme.accent : theme.border}`,
            background: reordering ? theme.accent : 'none',
            color: reordering ? '#fff' : theme.text.secondary,
            cursor: 'pointer',
          }}
        >{reordering ? '완료' : '순서 변경'}</button>
        {!reordering && addingGroup ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGroup()
                if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
              }}
              placeholder="그룹 이름"
              style={{
                fontSize: '13px', padding: '4px 8px', borderRadius: '6px',
                border: `1px solid ${theme.border}`, background: theme.bg.input,
                color: theme.text.primary, width: '120px', outline: 'none',
              }}
            />
            <button
              onClick={handleAddGroup}
              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: theme.accent, color: '#fff', cursor: 'pointer' }}
            >추가</button>
            <button
              onClick={() => { setAddingGroup(false); setNewGroupName('') }}
              style={{ ...btnBase, padding: '4px 8px' }}
            >취소</button>
          </div>
        ) : (
          !reordering && (
            <button
              onClick={() => setAddingGroup(true)}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'none', color: theme.text.secondary, cursor: 'pointer' }}
            >+ 그룹 추가</button>
          )
        )}
      </div>

      {allSymbols.length === 0 && !groups.some((g) => g.symbols.length === 0 && groups.length > 1) ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>
          즐겨찾기한 종목이 없습니다.<br />
          종목 정보 화면의 ☆ 버튼으로 추가하세요.
        </div>
      ) : loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: theme.text.muted, fontSize: '14px' }}>불러오는 중...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* 컬럼 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? (reordering ? GRID_COLS_MOBILE_REORDER : GRID_COLS_MOBILE)
              : (reordering ? GRID_COLS_REORDER : GRID_COLS),
            ...(isMobile ? {} : { minWidth: GRID_MIN_WIDTH }),
            padding: isMobile ? '8px 14px' : '8px 20px',
            fontSize: '11px',
            color: theme.text.muted,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            {!isMobile && reordering && <span />}
            <span>티커</span>
            <span>종목명</span>
            <span style={{ textAlign: 'right' }}>현재가</span>
            {isMobile ? (
              reordering ? <><span /><span /></> : <span style={{ textAlign: 'right' }}>등락률</span>
            ) : (
              <>
                <span style={{ textAlign: 'right' }}>본장 등락</span>
                <span style={{ textAlign: 'center' }}>상태</span>
                <span style={{ textAlign: 'center' }}>그룹 이동</span>
              </>
            )}
            {(!isMobile || !reordering) && <span />}
          </div>

          {/* 그룹 섹션 */}
          {groups.map((group, groupIdx) => (
            <div key={group.id}>
              {/* 그룹 헤더 */}
              <div
                draggable={reordering}
                onDragStart={() => { dragGroupRef.current = groupIdx }}
                onDragOver={(e) => { e.preventDefault(); setDragGroupOver(groupIdx) }}
                onDragLeave={() => setDragGroupOver(null)}
                onDrop={() => {
                  if (dragGroupRef.current === null || dragGroupRef.current === groupIdx) return
                  const from = dragGroupRef.current
                  const arr = [...groups]
                  arr.splice(groupIdx, 0, arr.splice(from, 1)[0])
                  reorderGroups(arr)
                  setDragGroupOver(null)
                }}
                style={{
                  ...(isMobile ? {} : { minWidth: GRID_MIN_WIDTH }),
                  padding: '6px 20px',
                  background: dragGroupOver === groupIdx ? theme.bg.card : theme.bg.hover,
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: reordering && !isMobile ? 'grab' : 'default',
                }}>
                {reordering && !isMobile && <span style={{ color: theme.text.muted, fontSize: '14px', userSelect: 'none', flexShrink: 0 }}>≡</span>}
                {editingGroupId === group.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameConfirm(group.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      style={{
                        fontSize: '13px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                        border: `1px solid ${theme.border}`, background: theme.bg.input,
                        color: theme.text.primary, width: '130px', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleRenameConfirm(group.id)}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: 'none', background: theme.accent, color: '#fff', cursor: 'pointer' }}
                    >확인</button>
                    <button onClick={() => setEditingGroupId(null)} style={btnBase}>취소</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary }}>{group.name}</span>
                    <span style={{ fontSize: '11px', color: theme.text.muted }}>({group.symbols.length}개)</span>
                    <div style={{ flex: 1 }} />
                    {(!isMobile || !reordering) && (
                      <button
                        onClick={() => { setEditingGroupId(group.id); setEditingName(group.name) }}
                        style={btnBase}
                        title="그룹명 변경"
                      >이름 변경</button>
                    )}
                    {(!isMobile || !reordering) && groups.length > 1 && (
                      <button
                        onClick={() => removeGroup(group.id)}
                        style={btnBase}
                        title="그룹 삭제"
                      >삭제</button>
                    )}
                    {isMobile && reordering && (
                      <>
                        <button
                          disabled={groupIdx === 0}
                          onClick={() => reorderGroups(moveItem(groups, groupIdx, groupIdx - 1))}
                          style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: groupIdx === 0 ? 0.3 : 1 }}
                        >↑</button>
                        <button
                          disabled={groupIdx === groups.length - 1}
                          onClick={() => reorderGroups(moveItem(groups, groupIdx, groupIdx + 1))}
                          style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: groupIdx === groups.length - 1 ? 0.3 : 1 }}
                        >↓</button>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* 종목 행 */}
              {group.symbols.length === 0 ? (
                <div style={{
                  ...(isMobile ? {} : { minWidth: GRID_MIN_WIDTH }),
                  padding: isMobile ? '12px 14px' : '12px 20px',
                  fontSize: '12px',
                  color: theme.text.muted,
                  fontStyle: 'italic',
                  borderBottom: `1px solid ${theme.border}`,
                }}>
                  이 그룹에 종목이 없습니다.
                </div>
              ) : group.symbols.map((sym, idx) => {
                const q = quotes[sym]
                const isDragTarget = dragOver?.groupId === group.id && dragOver?.index === idx

                if (!q) return (
                  <div key={sym}
                    draggable={reordering}
                    onDragStart={() => { dragRef.current = { groupId: group.id, index: idx } }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver({ groupId: group.id, index: idx }) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      if (!dragRef.current || dragRef.current.groupId !== group.id) return
                      const from = dragRef.current.index
                      if (from === idx) return
                      const syms = [...group.symbols]
                      syms.splice(idx, 0, syms.splice(from, 1)[0])
                      reorderSymbols(group.id, syms)
                      setDragOver(null)
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile
                        ? (reordering ? GRID_COLS_MOBILE_REORDER : GRID_COLS_MOBILE)
                        : (reordering ? GRID_COLS_REORDER : GRID_COLS),
                      ...(isMobile ? {} : { minWidth: GRID_MIN_WIDTH }),
                      padding: isMobile ? '12px 14px' : '14px 20px',
                      fontSize: '13px',
                      color: theme.text.muted,
                      borderBottom: `1px solid ${theme.border}`,
                      alignItems: 'center',
                      background: isDragTarget ? theme.bg.hover : 'transparent',
                      cursor: reordering && !isMobile ? 'grab' : 'default',
                    }}>
                    {!isMobile && reordering && <span style={{ color: theme.text.muted, fontSize: '14px', justifySelf: 'center', userSelect: 'none' }}>≡</span>}
                    <span>{sym}</span>
                    <span>로드 실패</span>
                    {isMobile && reordering ? (
                      <>
                        <button disabled={idx === 0} onClick={(e) => { e.stopPropagation(); idx > 0 && reorderSymbols(group.id, moveItem(group.symbols, idx, idx - 1)) }} style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: idx === 0 ? 0.3 : 1, justifySelf: 'center' }}>↑</button>
                        <button disabled={idx === group.symbols.length - 1} onClick={(e) => { e.stopPropagation(); idx < group.symbols.length - 1 && reorderSymbols(group.id, moveItem(group.symbols, idx, idx + 1)) }} style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: idx === group.symbols.length - 1 ? 0.3 : 1, justifySelf: 'center' }}>↓</button>
                      </>
                    ) : (
                      <>
                        <span /><span />
                        <button onClick={(e) => { e.stopPropagation(); toggle(sym) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0 }}>★</button>
                      </>
                    )}
                  </div>
                )

                const isPositive = q.change >= 0
                const changeColor = isPositive ? theme.up : theme.down
                const sign = isPositive ? '+' : ''
                const ms = marketStateLabel(q.marketState, q.regularMarketTime)

                return (
                  <div
                    key={sym}
                    draggable={reordering}
                    onDragStart={() => { dragRef.current = { groupId: group.id, index: idx } }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver({ groupId: group.id, index: idx }) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      if (!dragRef.current || dragRef.current.groupId !== group.id) return
                      const from = dragRef.current.index
                      if (from === idx) return
                      const syms = [...group.symbols]
                      syms.splice(idx, 0, syms.splice(from, 1)[0])
                      reorderSymbols(group.id, syms)
                      setDragOver(null)
                    }}
                    onClick={() => { if (!reordering) handleRowClick(q) }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile
                        ? (reordering ? GRID_COLS_MOBILE_REORDER : GRID_COLS_MOBILE)
                        : (reordering ? GRID_COLS_REORDER : GRID_COLS),
                      ...(isMobile ? {} : { minWidth: GRID_MIN_WIDTH }),
                      padding: isMobile ? '12px 14px' : '14px 20px',
                      fontSize: '13px',
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: reordering && !isMobile ? 'grab' : reordering ? 'default' : 'pointer',
                      transition: 'background 0.1s',
                      alignItems: 'center',
                      background: isDragTarget ? theme.bg.hover : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!reordering) e.currentTarget.style.background = theme.bg.hover }}
                    onMouseLeave={(e) => { if (!reordering) e.currentTarget.style.background = 'transparent' }}
                  >
                    {!isMobile && reordering && <span style={{ color: theme.text.muted, fontSize: '14px', justifySelf: 'center', userSelect: 'none' }}>≡</span>}
                    <span style={{ fontWeight: 600, color: theme.text.primary, fontSize: isMobile ? '12px' : '13px' }}>{q.symbol}</span>
                    <span style={{ color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isMobile ? '11px' : '13px' }}>{q.name}</span>
                    <span style={{ textAlign: 'right', color: theme.text.primary, fontWeight: 500, fontSize: isMobile ? '12px' : '13px' }}>
                      {q.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {isMobile ? (
                      reordering ? (
                        <>
                          <button
                            disabled={idx === 0}
                            onClick={(e) => { e.stopPropagation(); idx > 0 && reorderSymbols(group.id, moveItem(group.symbols, idx, idx - 1)) }}
                            style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: idx === 0 ? 0.3 : 1, justifySelf: 'center' }}
                          >↑</button>
                          <button
                            disabled={idx === group.symbols.length - 1}
                            onClick={(e) => { e.stopPropagation(); idx < group.symbols.length - 1 && reorderSymbols(group.id, moveItem(group.symbols, idx, idx + 1)) }}
                            style={{ background: theme.bg.input, border: `1px solid ${theme.border}`, color: theme.text.muted, borderRadius: '4px', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, opacity: idx === group.symbols.length - 1 ? 0.3 : 1, justifySelf: 'center' }}
                          >↓</button>
                        </>
                      ) : (
                        <>
                          <span style={{ textAlign: 'right', color: changeColor, fontSize: '12px', fontWeight: 600 }}>
                            {sign}{q.changePercent?.toFixed(2)}%
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggle(sym) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0, justifySelf: 'center' }}
                            title="즐겨찾기 해제"
                          >★</button>
                        </>
                      )
                    ) : (
                      <>
                        <span style={{ textAlign: 'right', color: changeColor }}>
                          {sign}{q.change?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({sign}{q.changePercent?.toFixed(2)}%)
                        </span>
                        <span style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: theme.bg.input, color: ms.color }}>
                            {ms.label}
                          </span>
                        </span>
                        <span style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {!reordering && groups.length > 1 && (
                            <select
                              value={group.id}
                              onChange={(e) => moveToGroup(sym, group.id, e.target.value)}
                              style={{
                                fontSize: '11px',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: `1px solid ${theme.border}`,
                                background: theme.bg.input,
                                color: theme.text.secondary,
                                cursor: 'pointer',
                                maxWidth: '84px',
                              }}
                            >
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          )}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!reordering) toggle(sym) }}
                          style={{ background: 'none', border: 'none', cursor: reordering ? 'default' : 'pointer', fontSize: '16px', color: '#f59e0b', padding: 0, justifySelf: 'center' }}
                          title="즐겨찾기 해제"
                        >★</button>
                      </>
                    )}
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
