# Lucky Cabinet

가상 코인으로만 돌아가는 개인용 슬롯머신 웹게임. 서버 없음, 빌드 없음, 실제 금전 요소 없음.

- 심볼은 전부 인라인 SVG, 효과음은 WebAudio API 합성. 외부 이미지/오디오 파일을 쓰지 않는다.
- 외부 리소스는 Google Fonts CSS 하나만 사용한다.
- 상용 슬롯의 상표/로고/타이틀은 쓰지 않는다. 메커니즘만 참고하고 이름과 아트는 전부 창작이다.

## 로컬 실행

ES Module을 쓰기 때문에 `file://`로 열면 CORS로 막힌다. 반드시 HTTP로 띄운다.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## GitHub Pages 배포

1. 이 브랜치를 `main`에 머지한다.
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**
3. Branch: `main` / `(root)` → Save
4. 루트의 `.nojekyll` 때문에 Jekyll 처리 없이 파일이 그대로 서빙된다.

## 디렉토리

```
index.html
css/tokens.css     디자인 토큰(색/타이포/간격) 변수
css/cabinet.css    캐비닛·릴·마퀴 등 게임 셸
css/ui.css         버튼·모달·토스트·테이블
js/main.js         부트스트랩, 화면 라우팅
js/config.js       모드·심볼·배당표·릴 스트립 상수 (밸런스 조정은 이 파일만)
js/storage.js      localStorage 읽기/쓰기/스키마 마이그레이션
js/rng.js          난수 + 릴 스톱 결정
js/engine.js       스핀 결과 판정 (DOM 의존 없음, 순수 함수)
js/reels.js        릴 DOM 생성·회전 애니메이션
js/ui.js           미터·메시지·모달·토스트 렌더
js/audio.js        WebAudio 효과음
js/symbols.js      SVG <symbol> 정의
tools/sim.mjs      밸런스 시뮬레이터 (개발용, 배포에 영향 없음)
```

`package.json`은 Node가 `js/`의 ES Module을 그대로 import 하기 위한 파일이다. 의존성은 없고 `npm install`도 필요 없다.

## 밸런스

(2단계에서 측정값 기록)
