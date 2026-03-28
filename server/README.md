# 배포 및 인프라 문서

## 목차
1. [인프라 개요](#인프라-개요)
2. [통신 구조](#통신-구조)
3. [VM 환경](#vm-환경)
4. [Nginx 설정](#nginx-설정)
5. [NestJS 서버](#nestjs-서버)
6. [PM2 프로세스 관리](#pm2-프로세스-관리)
7. [프론트엔드 빌드](#프론트엔드-빌드)
8. [CI/CD (GitHub Actions)](#cicd-github-actions)
9. [VM 초기 세팅 가이드](#vm-초기-세팅-가이드)
10. [로컬 개발 환경](#로컬-개발-환경)

---

## 인프라 개요

| 항목 | 내용 |
|---|---|
| 인프라 | Oracle Cloud VM |
| OS | Ubuntu 22.04 LTS |
| 웹서버 | Nginx |
| 런타임 | Node.js 20 (NodeSource apt 설치) |
| 프로세스 관리 | PM2 |
| CI/CD | GitHub Actions |
| 배포 방식 | SSH 접속 → git pull → 빌드 → PM2 재시작 |

---

## 통신 구조

### 프로덕션 (배포 환경)

```
브라우저
    │
    │  http://VM-IP:80
    ▼
┌─────────────────────────────────────┐
│              Nginx (:80)            │
│                                     │
│  /api/*  →  localhost:4000 (프록시) │
│  /*      →  client/dist/ (정적파일) │
└─────────────────────────────────────┘
                    │
                    │ /api/* 요청만
                    ▼
        ┌───────────────────────┐
        │   NestJS (:4000)      │
        │   (localhost 전용)    │
        │                       │
        │   SQLite DB 파일      │
        └───────────────────────┘
```

- **80포트만 외부에 오픈** (Oracle Cloud Security List)
- NestJS 4000포트는 외부 노출 없이 Nginx와 내부 통신만 함
- React 정적 파일은 Nginx가 직접 서빙 (`client/dist/` 폴더)
- `/api/`로 시작하는 요청만 NestJS로 전달

### 개발 환경 (로컬)

```
브라우저 (:3000)
    │
    ▼
Vite Dev Server (:3000)
    │
    │  /api/* 요청 프록시
    ▼
NestJS (:4000)
```

- `client/vite.config.ts`에 프록시 설정 존재
- 프로덕션과 동일하게 `/api/` 경로 사용 → **코드 변경 없이 환경 전환 가능**

### API 경로 구조

| 경로 | 설명 |
|---|---|
| `GET /api/stocks/quote/:symbol` | 종목 시세 |
| `GET /api/stocks/chart/:symbol` | 차트 데이터 |
| `GET /api/stocks/search` | 종목 검색 |
| `GET /api/stocks/price-at/:symbol` | 특정 날짜 종가 |
| `GET /api/stocks/screener` | 종목 스크리너 |
| `GET /api/stocks/forex/rate` | 특정 날짜 USDKRW 환율 |
| `GET /api/stocks/forex/current` | 현재 USDKRW 환율 |
| `GET /api/market/overview` | 시장 현황 16종목 |
| `GET /api/news/global` | 글로벌 뉴스 RSS |

---

## VM 환경

### 서버 스펙
- **OS**: Ubuntu 22.04.3 LTS
- **플랫폼**: Oracle Cloud Infrastructure (OCI)
- **SSH 접속**: `ssh -i key ubuntu@VM-IP`

### 디렉토리 구조
```
/home/ubuntu/
└── stock-vibe/               # 레포 루트
    ├── client/
    │   ├── src/              # React 소스
    │   └── dist/             # 빌드 결과물 (Nginx가 여기서 서빙)
    └── server/
        ├── src/              # NestJS 소스
        ├── dist/             # 빌드 결과물 (PM2가 여기서 실행)
        ├── ecosystem.config.js
        └── portfolio.db      # SQLite DB 파일
```

### 오픈 포트

| 포트 | 용도 | 외부 오픈 |
|---|---|---|
| 22 | SSH | O |
| 80 | Nginx (프론트 + API 프록시) | O |
| 4000 | NestJS | X (내부 전용) |

---

## Nginx 설정

### 설정 파일 위치
```
/etc/nginx/sites-available/stock-vibe  ← 실제 설정 파일
/etc/nginx/sites-enabled/stock-vibe    ← 심볼릭 링크
```

### 설정 내용
```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /home/ubuntu/stock-vibe/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

- `try_files $uri $uri/ /index.html` → React Router의 클라이언트 사이드 라우팅 지원 (새로고침 시 404 방지)
- `/api/` 요청은 NestJS로 프록시, 나머지는 React 정적 파일 서빙

### Nginx 관리 명령어
```bash
sudo nginx -t                           # 설정 문법 검사
sudo systemctl restart nginx            # 재시작
sudo systemctl status nginx             # 상태 확인
sudo tail -f /var/log/nginx/error.log   # 에러 로그
```

---

## NestJS 서버

### 포트 및 설정
- **포트**: 4000 (기본값, `ecosystem.config.js`의 `PORT` 환경변수로 변경 가능)
- **글로벌 prefix**: `/api`
- **정적 파일 서빙**: `@nestjs/serve-static`으로 `client/dist/` 마운트 (Nginx 없는 환경에서도 동작 가능)

### 빌드 및 실행
```bash
cd ~/stock-vibe/server
npm install       # 의존성 설치 (better-sqlite3 등 네이티브 모듈 컴파일 포함)
npm run build     # TypeScript → JavaScript (dist/ 폴더 생성)
npm run start:prod  # 직접 실행 (PM2 없이)
```

### 네이티브 모듈 (better-sqlite3)
`better-sqlite3`는 C++ 네이티브 애드온으로, `npm install` 시 서버 OS에 맞게 직접 컴파일됨.
SQLite를 패키지 내부에 정적으로 포함하고 있어 시스템에 별도 sqlite3 설치 불필요.
컴파일에 필요한 시스템 패키지: `python3`, `make`, `g++` (Ubuntu 22.04에 기본 설치됨)

---

## PM2 프로세스 관리

### ecosystem.config.js
```js
module.exports = {
  apps: [
    {
      name: 'stock-server',
      script: './dist/main.js',
      instances: 1,
      autorestart: true,   // 크래시 시 자동 재시작
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
```

### 주요 명령어
```bash
pm2 start ecosystem.config.js   # 시작
pm2 restart stock-server        # 재시작
pm2 stop stock-server           # 중지
pm2 delete stock-server         # 삭제
pm2 logs stock-server           # 로그 보기
pm2 status                      # 프로세스 상태 확인
pm2 save                        # 현재 프로세스 목록 저장
pm2 startup                     # 부팅 시 자동 실행 등록
pm2 unstartup systemd           # 자동 실행 등록 해제
```

---

## 프론트엔드 빌드

### 빌드 과정
```bash
cd ~/stock-vibe/client
npm install
npm run build   # tsc + vite build → client/dist/ 생성
```

### 빌드 결과물
- `client/dist/` 폴더에 정적 파일 생성
- Nginx가 이 폴더를 직접 서빙
- React Router 사용으로 Nginx에 `try_files` 설정 필수

### 환경별 API 호출 방식
- 빌드된 React 앱은 `/api/...` 상대경로로 API 호출
- 개발: Vite가 `/api` → `localhost:4000` 프록시
- 프로덕션: Nginx가 `/api` → `localhost:4000` 프록시
- **별도 환경변수 불필요**

---

## CI/CD (GitHub Actions)

### 트리거
- `master` 브랜치에 push 시 자동 실행

### 워크플로우 파일
`.github/workflows/deploy.yml`

### 배포 흐름
```
git push (master)
        │
        ▼
GitHub Actions Runner (ubuntu-latest)
        │
        │  appleboy/ssh-action으로 SSH 접속
        ▼
Oracle VM (ubuntu@VM-IP)
        │
        ├── 1. git checkout -- package-lock.json  (충돌 방지)
        ├── 2. git pull origin master
        ├── 3. cd client → npm install → npm run build
        ├── 4. cd server → npm install → npm run build
        └── 5. pm2 restart stock-server (없으면 pm2 start)
```

### GitHub Secrets 설정
레포 → Settings → Secrets and variables → Actions

| Secret 이름 | 값 | 설명 |
|---|---|---|
| `ORACLE_HOST` | `xxx.xxx.xxx.xxx` | VM 공인 IP |
| `ORACLE_SSH_KEY` | `-----BEGIN ... -----END...` | SSH 개인키 파일(key) 전체 내용 |

- Secrets는 등록한 레포지토리에서만 접근 가능
- GitHub Actions가 `ubuntu` 유저로 SSH 접속

### package-lock.json 충돌 이슈
`npm install` 실행 시 Linux 환경에서 `package-lock.json`이 변경됨.
다음 `git pull` 때 충돌 발생을 막기 위해 배포 스크립트에서 `git checkout -- package-lock.json`으로 초기화 후 pull.

---

## VM 초기 세팅 가이드

> 최초 1회만 진행. 이후는 git push로 자동 배포.

### 1. Node.js 설치 (시스템 전역)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 확인
npm -v    # 확인
```

> NVM 대신 NodeSource apt 방식 사용.
> 이유: NVM은 유저별 설치라 GitHub Actions가 `ubuntu` 유저로 SSH 접속 시 node/npm 명령어를 찾지 못함.

### 2. PM2 설치
```bash
sudo npm install -g pm2
```

### 3. Nginx 설치
```bash
sudo apt install -y nginx
```

### 4. 레포 클론
```bash
cd ~
git clone https://github.com/wesd724/stock-portfolio-vibe.git stock-vibe
```

### 5. 최초 빌드
```bash
# 클라이언트
cd ~/stock-vibe/client
npm install
npm run build

# 서버
cd ~/stock-vibe/server
npm install
npm run build
```

### 6. Nginx 설정
```bash
sudo nano /etc/nginx/sites-available/stock-vibe
```

아래 내용 붙여넣기:
```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /home/ubuntu/stock-vibe/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stock-vibe /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # 기존 default 비활성화
sudo nginx -t                              # 설정 검사
sudo systemctl restart nginx              # 적용
```

### 7. PM2 시작 및 자동실행 등록
```bash
cd ~/stock-vibe/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # 출력된 sudo 명령어 복붙해서 실행
```

### 8. Oracle Cloud Security List
Oracle Cloud 콘솔 → VCN → Security List → 인바운드 규칙 추가:
- 프로토콜: TCP
- 포트: **80**

---

## 로컬 개발 환경

```bash
# 서버 실행 (포트 4000)
cd server
npm run start:dev

# 클라이언트 실행 (포트 3000)
cd client
npm run dev
```

접속: `http://localhost:3000`
