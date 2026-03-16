import { useTheme } from '../../context/ThemeContext'
import { useWindowSize } from '../../hooks/useWindowSize'

interface Item {
  label: string
  desc: string
  note?: string
}

interface Section {
  title: string
  intro?: string
  items: Item[]
}

const SECTIONS: Section[] = [
  {
    title: '홈',
    intro: '앱을 처음 열면 보이는 기본 화면입니다. 시장 전반을 한눈에 파악하고 관심 종목을 검색할 수 있습니다.',
    items: [
      { label: '시장 현황', desc: '나스닥·S&P500·다우·러셀2000 선물, USD/KRW 환율, 달러 인덱스, 2년·10년 국채, VIX, 금·은·원유, 코스피·코스닥, 비트코인·이더리움 등 16개 주요 지표의 실시간 시세를 표시합니다.' },
      { label: '글로벌 뉴스', desc: 'Reuters, CNBC, AP News, MarketWatch 등 주요 금융 뉴스를 최신순으로 모아 보여줍니다. 스크롤을 내리면 자동으로 추가 뉴스를 불러오는 무한 스크롤 방식입니다.' },
      { label: '종목 검색', desc: '상단 검색창에 티커 심볼(예: AAPL, TSLA) 또는 종목명을 입력하면 자동완성 목록이 나타납니다. 종목을 선택하면 상세 정보 화면으로 이동합니다.' },
    ],
  },
  {
    title: '종목 정보',
    intro: '종목을 검색하거나 목록·즐겨찾기에서 클릭하면 이 화면이 표시됩니다.',
    items: [
      { label: '현재가 및 등락', desc: '현재 거래 가격과 전일 대비 등락폭·등락률을 표시합니다. 티커 아래의 뱃지 옆에도 등락률이 바로 보입니다.' },
      { label: '장 구분 뱃지', desc: '본장(초록), 프리장(주황), 애프터장(보라), 장마감(회색)으로 현재 어느 장이 열려 있는지 표시합니다. 프리장이나 애프터장 데이터가 있으면 해당 가격과 등락도 함께 보여줍니다.', note: '미국 주식은 본장 외에도 프리마켓(장 시작 전)과 애프터마켓(장 마감 후)에 거래됩니다.' },
      { label: 'USD / KRW 전환', desc: '종목 정보 우측의 USD·KRW 버튼으로 전환합니다. KRW 선택 시 현재 환율 기준으로 시가·고가·저가·52주 범위를 원화로 환산해 표시하며, 적용 환율도 함께 보여줍니다.' },
      { label: '당일 지표', desc: '시가·고가·저가·거래량을 확인할 수 있습니다.' },
      { label: '기본 지표', desc: '시가총액·P/E(주가수익비율)·배당수익률·52주 최고/최저를 표시합니다.' },
      { label: '즐겨찾기 (★)', desc: '★ 버튼을 누르면 즐겨찾기에 추가되고 금색으로 바뀝니다. 다시 누르면 해제됩니다. 추가된 종목은 즐겨찾기 탭에서 한눈에 볼 수 있습니다.' },
      { label: '새로고침 (↻)', desc: '최신 시세 정보로 갱신합니다.' },
      { label: '매수', desc: '매수 버튼을 클릭하면 매수 모달이 열립니다. 투자 날짜를 입력하고 가격 조회 후 금액 또는 주수를 입력해 매수합니다.' },
    ],
  },
  {
    title: '종목 목록 (스크리너)',
    intro: '시장에서 조건에 맞는 종목을 빠르게 탐색할 수 있는 화면입니다.',
    items: [
      { label: '유형 필터', desc: '전체 / 주식(EQUITY) / ETF 중에서 선택해 원하는 종류만 볼 수 있습니다.' },
      { label: '정렬 기준', desc: '1일 등락률 / 1일 거래량 / 3개월 평균 거래량 기준으로 정렬합니다. 수익률 상위 종목을 찾거나 거래량이 많은 종목을 한눈에 파악할 수 있습니다.' },
      { label: '오름 / 내림차순', desc: '내림차순이면 수익률 상위 또는 거래량 최다 순서로, 오름차순이면 반대로 정렬됩니다.' },
      { label: '종목 클릭', desc: '행을 클릭하면 해당 종목의 상세 정보 화면으로 이동합니다.' },
      { label: '데이터 기준', desc: '본장(정규장) 기준이며 약 15분 지연된 데이터입니다.', note: 'ETF 목록은 Yahoo Finance API 특성상 일부 고거래량 ETF가 누락될 수 있습니다.' },
    ],
  },
  {
    title: '종목 비교',
    intro: '여러 종목의 수익률 추이를 같은 차트에서 비교하고, 다양한 분석 지표를 나란히 확인할 수 있습니다.',
    items: [
      { label: '종목 추가', desc: '검색창에서 종목을 검색해 추가합니다. 최대 10개까지 추가 가능하며, 각 종목은 고유한 색상으로 구분됩니다.' },
      { label: '차트', desc: '첫 시점 가격을 기준(0%)으로 한 상대 수익률 변화를 선 그래프로 표시합니다. 기준점이 같아 가격대가 다른 종목도 공정하게 비교할 수 있습니다.' },
      { label: '인터벌', desc: '1분·5분·1일·한달 단위로 캔들 인터벌을 변경할 수 있습니다.' },
      { label: '날짜 범위', desc: '시작일과 종료일을 직접 지정해 원하는 기간의 데이터를 조회합니다.' },
      { label: '기간 성과 요약', desc: '선택한 기간 동안 각 종목의 시작가·종가·기간 수익률을 가로 막대 그래프로 시각화합니다. 수익·손실 여부에 따라 색상이 구분됩니다.' },
      { label: '지표 비교 테이블', desc: '현재가·등락률·시가총액·P/E·배당수익률·52주 최고/최저를 종목별로 나란히 비교합니다.' },
      { label: '변동성 비교', desc: '해당 기간 수익률의 표준편차를 계산해 리스크 크기를 막대 그래프로 보여줍니다. 수치가 낮을수록 가격 변동이 적은 안정적인 종목입니다.', note: '변동성이 높다는 것은 수익 기회도 크지만 손실 위험도 크다는 의미입니다.' },
      { label: '상관관계 매트릭스', desc: '두 종목 간 Pearson 상관계수(−1 ~ +1)를 색상 히트맵으로 표시합니다. 1에 가까울수록 같이 움직이는 경향이 강하고, −1에 가까울수록 반대로 움직입니다. 분산 투자 효과를 확인할 때 활용하세요.', note: '상관계수가 낮은 종목끼리 함께 보유하면 리스크를 분산할 수 있습니다.' },
    ],
  },
  {
    title: '투자 방식 시뮬레이터',
    intro: '과거 주가 데이터를 바탕으로 적립식(DCA) 또는 거치식(Buy & Hold) 투자 전략의 수익률을 시뮬레이션합니다.',
    items: [
      { label: '적립식 투자 (DCA)', desc: '시작일부터 종료일까지 매일·매주·매달·매년 일정 금액을 투자했을 때의 누적 수익률을 계산합니다. 각 투자 시점의 실제 종가로 주식을 매수하는 방식으로 계산됩니다.', note: 'DCA(Dollar Cost Averaging)는 분할 매수를 통해 매수 단가를 평균화하는 전략입니다. 시장 타이밍을 맞추기 어려울 때 리스크를 낮출 수 있습니다.' },
      { label: '거치식 투자 (Buy & Hold)', desc: '특정 날짜에 일정 금액을 한 번에 투자하고 종료일까지 보유했을 때의 수익률을 계산합니다. 매수일 종가 기준으로 주식 수량이 결정됩니다.' },
      { label: '차트', desc: '평가금액과 투자 원금을 Area 차트로 함께 표시합니다. 두 선의 차이가 수익 또는 손실에 해당합니다.' },
      { label: '결과 요약', desc: '총 투자금액·최종 평가금액·수익금·수익률을 카드 형태로 표시합니다. 수익이면 빨간색, 손실이면 파란색으로 구분됩니다.' },
      { label: '종목 검색', desc: '검색창에 티커 또는 종목명을 입력해 시뮬레이션할 종목을 선택합니다. 미국 주식·ETF 모두 지원합니다.' },
    ],
  },
  {
    title: '매수 / 매도',
    intro: '과거 특정 날짜를 기준으로 매수·매도를 기록해 수익률을 시뮬레이션합니다.',
    items: [
      { label: '투자 날짜', desc: '오늘 이전의 날짜를 자유롭게 지정할 수 있습니다. 1980년대 이후 데이터를 지원합니다.' },
      { label: '가격 조회', desc: '날짜를 입력한 뒤 가격 조회 버튼을 누르면 해당 날짜의 종가와 USDKRW 환율을 자동으로 가져옵니다. 주말·공휴일이면 가장 가까운 직전 거래일의 데이터를 사용합니다.' },
      { label: '금액 ↔ 주수 자동 계산', desc: '투자 금액을 입력하면 주수가 자동으로 계산되고, 주수를 먼저 입력해도 금액이 자동으로 채워집니다.' },
      { label: 'KRW / USD 선택', desc: '매수·매도 시 원화 또는 달러 기준으로 입력할 수 있습니다. KRW 선택 시 해당 날짜의 실제 환율이 적용되며, 환율도 화면에 표시됩니다.' },
      { label: '계좌 잔액 제한', desc: '매수 금액이 계좌 잔액을 초과하면 매수가 불가합니다. 부족한 금액을 화면에 표시해줍니다.' },
      { label: '매도 날짜 제한', desc: '매도 날짜는 해당 종목의 가장 이른 매수 날짜 이후여야 합니다. 이전 날짜로 매도를 시도하면 오류 메시지가 표시됩니다.' },
      { label: '전량 매도', desc: '매도 모달의 전량 버튼을 누르면 보유 수량 전체를 입력합니다.' },
    ],
  },
  {
    title: '포트폴리오',
    intro: '현재 보유 중인 모든 종목의 평가 현황과 손익을 확인합니다.',
    items: [
      { label: '보유 현황 테이블', desc: '종목별 보유 수량·평균 매수가·현재가·평가금액·손익·수익률을 한눈에 파악합니다.' },
      { label: 'KRW 보기', desc: 'KRW 선택 시 환차손익과 가격손익을 분리해 표시합니다. 환차손익은 매수 시점과 현재 환율 차이에서 발생하는 손익이고, 가격손익은 주가 변동에서 발생하는 손익입니다.', note: '원화 투자자 입장에서는 주가가 올라도 환율이 하락하면 수익이 줄 수 있습니다.' },
      { label: '종목 클릭', desc: '행을 클릭하면 해당 종목의 상세 정보 화면으로 이동합니다.' },
    ],
  },
  {
    title: '거래내역',
    intro: '지금까지 기록한 모든 매수·매도 내역을 최신순으로 확인합니다.',
    items: [
      { label: '거래 목록', desc: '날짜·종목·구분(매수/매도)·체결가·수량·거래금액·적용 환율을 표시합니다.' },
      { label: 'KRW / USD 전환', desc: '거래금액을 원화 또는 달러로 표시합니다.' },
      { label: '삭제', desc: '잘못 입력한 거래를 삭제할 수 있습니다. 삭제 시 해당 금액만큼 계좌 잔액이 자동으로 복구됩니다.' },
    ],
  },
  {
    title: '즐겨찾기',
    intro: '관심 있는 종목을 저장해두고 현재 시세를 빠르게 확인할 수 있습니다.',
    items: [
      { label: '추가 / 해제', desc: '종목 정보 화면의 ★ 버튼으로 추가하거나 해제합니다. 즐겨찾기 목록에서 ★ 버튼을 눌러도 해제됩니다.' },
      { label: '목록 조회', desc: '저장된 종목의 현재가·본장 등락·시장 상태를 한 줄씩 요약해 확인합니다. 탭을 열 때마다 최신 시세를 새로 가져옵니다.' },
      { label: '종목 이동', desc: '행을 클릭하면 해당 종목의 상세 정보 화면으로 이동합니다.' },
    ],
  },
  {
    title: '사이드바 (내 정보)',
    intro: '화면 왼쪽에 항상 표시되는 패널입니다. 계좌 잔액과 보유 종목을 빠르게 확인할 수 있습니다.',
    items: [
      { label: '계좌 잔액', desc: '수정 버튼을 눌러 초기 잔액을 설정합니다. 매수 시 매수 금액만큼 차감되고, 매도 시 매도 금액만큼 증가합니다. KRW 모드에서는 현재 환율 기준으로 환산해 표시합니다.', note: '처음 사용 시 계좌 잔액을 먼저 설정해야 매수가 가능합니다.' },
      { label: 'KRW / USD 전환', desc: '잔액·총 투자금·평가금액·수익률을 원화 또는 달러로 전환합니다. KRW 모드에서는 현재 환율과 함께 표시됩니다.' },
      { label: '보유 종목', desc: '현재 보유 중인 종목 목록을 간단히 확인할 수 있습니다. 현재가 새로고침(↻) 버튼으로 최신 가격을 업데이트합니다.' },
      { label: '접기 / 펼치기', desc: '사이드바 오른쪽 경계의 ◀ / ▶ 버튼으로 접고 펼칩니다. 접으면 메인 화면이 더 넓게 보입니다.' },
    ],
  },
  {
    title: '기타',
    items: [
      { label: '다크 / 라이트 모드', desc: '우측 상단의 🌙 다크 / ☀️ 라이트 버튼으로 테마를 전환합니다. 선택한 테마는 브라우저에 저장되어 다음 방문 시에도 유지됩니다.' },
      { label: '색상 규칙', desc: '한국 증권 관례에 따라 상승은 빨간색, 하락은 파란색으로 표시합니다. 미국·유럽 방식(초록=상승, 빨강=하락)과 반대입니다.' },
      { label: '데이터 저장 방식', desc: '거래내역·즐겨찾기·계좌 잔액·테마 설정은 모두 브라우저 로컬 스토리지에 저장됩니다. 서버에 계정이 없으므로 브라우저 데이터를 삭제하거나 다른 기기에서 접속하면 데이터가 초기화됩니다.' },
      { label: '시세 데이터 출처', desc: 'Yahoo Finance API를 통해 시세·차트·뉴스 데이터를 제공합니다. 실시간 데이터는 약간의 지연이 있을 수 있습니다.' },
      { label: '환율 데이터', desc: 'USDKRW 환율도 Yahoo Finance에서 실시간으로 가져옵니다. 매수·매도 시 해당 날짜의 실제 환율을 적용합니다.' },
    ],
  },
]

export default function HelpPage() {
  const { theme } = useTheme()
  const { isMobile } = useWindowSize()

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: theme.text.primary, marginBottom: '6px' }}>도움말</h1>
        <p style={{ fontSize: '13px', color: theme.text.muted }}>Stock Vibe의 주요 기능과 사용법을 안내합니다.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={{
            background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden',
          }}>
            {/* 섹션 헤더 */}
            <div style={{
              padding: '14px 24px', borderBottom: `1px solid ${theme.border}`,
              background: theme.bg.input,
              display: 'flex', alignItems: isMobile ? 'flex-start' : 'baseline',
              flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '12px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: theme.accent }}>{section.title}</span>
              {section.intro && (
                <span style={{ fontSize: '12px', color: theme.text.muted }}>{section.intro}</span>
              )}
            </div>

            {/* 항목 */}
            <div>
              {section.items.map((item, i) => (
                <div key={item.label} style={{
                  display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr',
                  padding: isMobile ? '12px 16px' : '14px 24px', gap: isMobile ? '6px' : '24px', alignItems: 'flex-start',
                  borderBottom: i < section.items.length - 1 ? `1px solid ${theme.border}` : 'none',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary, paddingTop: '1px' }}>
                    {item.label}
                  </span>
                  <div>
                    <span style={{ fontSize: '13px', color: theme.text.secondary, lineHeight: '1.7' }}>
                      {item.desc}
                    </span>
                    {item.note && (
                      <div style={{
                        marginTop: '6px', fontSize: '12px', color: theme.text.muted,
                        padding: '6px 10px', background: theme.bg.input,
                        borderRadius: '6px', borderLeft: `3px solid ${theme.accent}`,
                        lineHeight: '1.6',
                      }}>
                        💡 {item.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
