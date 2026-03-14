## 구조
- 레이어드 아키텍처
- 기능 모듈화 해서, 각 모듈별로 디렉토리를 만들고 그 안에 controller, service, repository 파일

## 모듈 목록
```bash
src/
├── stocks/     # 종목 시세·차트·검색·뉴스·스크리너·환율 API
├── market/     # 시장 현황 16종목 (지수·환율·원자재·암호화폐)
├── portfolio/  # 거래내역 CRUD (SQLite DB 사용)
├── news/       # 글로벌 뉴스 RSS 수집·번역
└── database/   # SQLite 전역 프로바이더 (better-sqlite3)
```

## 역할 구분
- **Yahoo Finance 프록시**: stocks, market, news 모듈은 브라우저에서 직접 호출 불가한 외부 API를 서버가 대신 호출해 반환
- **DB 저장**: portfolio 모듈만 SQLite에 실제 데이터를 저장 (현재 클라이언트는 localStorage 사용 중으로 미연동 상태)

## 주요 엔드포인트
- `GET /api/stocks/quote/:symbol` — 종목 시세
- `GET /api/stocks/chart/:symbol` — 차트 데이터
- `GET /api/stocks/search` — 종목 검색
- `GET /api/stocks/price-at/:symbol` — 특정 날짜 종가
- `GET /api/stocks/screener` — 종목 스크리너
- `GET /api/stocks/forex/rate` — 특정 날짜 USDKRW 환율
- `GET /api/stocks/forex/current` — 현재 USDKRW 환율
- `GET /api/market/overview` — 시장 현황 16종목
- `GET /api/news/global` — 글로벌 뉴스 RSS

## 기타
- 서버 포트: 4000
- 글로벌 API prefix: `/api`
- 외부 라이브러리: `yahoo-finance2`
