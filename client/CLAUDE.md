## 구조
- 모듈화
```bash
src/
├── components/
│   ├── layout/       # Navbar, Sidebar, Layout
│   ├── portfolio/    # BuyModal, SellModal, HoldingItem, PortfolioPage, TransactionHistoryPage
│   ├── market/       # MarketOverview, MarketCard
│   ├── comparison/   # ComparisonPage
│   ├── screener/     # ScreenerPage
│   ├── news/         # GlobalNews
│   ├── user/         # UserInfo
│   ├── favorites/    # FavoritesPage
│   ├── help/         # HelpPage
│   ├── investment/   # InvestmentPage
│   ├── StockCard.tsx
│   ├── StockChart.tsx
│   ├── StockNews.tsx
│   ├── StockSearch.tsx
│   └── MainContent.tsx
├── context/
│   ├── ThemeContext.tsx       # 다크/라이트 테마, useTheme()
│   ├── NavigationContext.ts   # 페이지 라우팅, useNavigation()
│   ├── StockContext.tsx       # 선택된 종목, useStock()
│   ├── PortfolioContext.ts    # 거래내역·보유종목·계좌잔액·환율, usePortfolio()
│   └── FavoritesContext.ts   # 즐겨찾기 심볼 목록, useFavorites()
├── types/
│   ├── portfolio.ts  # Transaction, Holding
│   └── stock.ts      # StockQuote, ChartPoint, MarketItem 등
├── utils/
│   └── portfolioCalc.ts  # computeHoldings, computeSummary
├── hooks/
│   └── useWindowSize.ts  # isMobile 여부 반환
├── storage/
│   ├── IPortfolioStorage.ts      # 스토리지 인터페이스
│   ├── SessionStorageAdapter.ts  # sessionStorage 기반 구현
│   ├── ApiStorageAdapter.ts      # 서버 API 기반 구현
│   └── index.ts
├── styles/
│   └── index.css
└── main.tsx
```

## 주요 규칙
- 스타일: CSS 파일 없이 인라인 스타일(`style={{...}}`) 사용, 테마 값은 항상 `useTheme()`의 `theme` 객체 참조
- 상태관리: Zustand 사용 (Context API 아님)
- 모달: `createPortal(…, document.body)`로 렌더링 (Sidebar overflow 클리핑 방지)
- 모달 backdrop 닫기: `onMouseDown`에서 `e.target === e.currentTarget` 패턴 사용
- 통화: 내부 계산은 항상 USD 기준, 표시 시에만 KRW 환산
- 색상 규칙: 상승 `theme.up` (빨강), 하락 `theme.down` (파랑) — 한국 증권 관례
- 숫자 입력: `type="text"` + `inputMode="decimal"` + 쉼표 포맷팅 (`fmtInput` / `parseInput`)
