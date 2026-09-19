// 심볼은 전부 인라인 SVG다. 외부 이미지 파일을 쓰지 않는다.
// 문서에 <symbol> 스프라이트를 한 번 심고, 각 릴 셀은 <use>로 참조한다.
//
// 플랫 아이콘처럼 보이지 않게 하는 것은 그림 솜씨가 아니라 빛 모델링이다.
// 심볼마다 아래 레이어를 쌓는다. 광원은 왼쪽 위 하나로 고정한다.
//   접지 그림자 → 본체(재질 그라디언트) → 면 분할 → 오클루전 → 스페큘러 → 림 라이트
// 조명 필터(feSpecularLighting 등)는 쓰지 않는다. 릴이 돌 때 셀이 동시에 150~200개
// 그려지고 거기에 모션 블러 필터가 이미 걸려 있어서, 조명 필터를 심볼마다 얹으면
// 스핀 프레임이 무너진다. 블러가 필요한 자리는 투명도로 페이드하는 그라디언트로 대신한다.
// 같은 패스를 여러 겹 쓰는 자리는 defs에 한 번만 두고 <use>로 참조해 레이어가 어긋나지 않게 한다.

const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <!-- ── 공용 조명 레이어. 모든 심볼이 같은 광원(왼쪽 위)을 쓴다 ── -->
    <!-- 접지 그림자: 심볼이 릴 위에 떠 있어 보이게 한다 -->
    <radialGradient id="m-shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.6"/>
      <stop offset="58%" stop-color="#000" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <!-- 위에서 들어오는 빛이 닿는 테두리 -->
    <linearGradient id="m-key" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffdf4" stop-opacity="0.92"/>
      <stop offset="34%" stop-color="#fffdf4" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fffdf4" stop-opacity="0"/>
    </linearGradient>
    <!-- 아래에서 반사되어 올라오는 빛 -->
    <linearGradient id="m-rim" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ffe6c6" stop-opacity="0.7"/>
      <stop offset="42%" stop-color="#ffe6c6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffe6c6" stop-opacity="0"/>
    </linearGradient>
    <!-- 빛 반대쪽(오른쪽 아래)이 어두워지는 정도 -->
    <linearGradient id="m-occl" x1="6%" y1="0%" x2="100%" y2="92%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.44"/>
    </linearGradient>
    <!-- 에나멜·유리의 좁고 선명한 반사 -->
    <linearGradient id="m-spec" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <!-- 둥근 물체의 넓고 부드러운 반사 -->
    <radialGradient id="m-sheen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.8"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>

    <!-- ── 재질 ──
         금속은 밝은 띠와 어두운 골을 번갈아 둔다. 이 밴딩이 금속으로 읽히게 하는 핵심이다. -->
    <linearGradient id="m-gold" x1="4%" y1="0%" x2="22%" y2="100%">
      <stop offset="0%" stop-color="#fffbe8"/>
      <stop offset="16%" stop-color="#eac668"/>
      <stop offset="34%" stop-color="#8a5c12"/>
      <stop offset="50%" stop-color="#f6e0a2"/>
      <stop offset="66%" stop-color="#7d4f0d"/>
      <stop offset="86%" stop-color="#c79a35"/>
      <stop offset="100%" stop-color="#4a2c05"/>
    </linearGradient>
    <!-- 넓은 면에 쓰는 부드러운 금 -->
    <linearGradient id="m-gold-soft" x1="12%" y1="0%" x2="82%" y2="100%">
      <stop offset="0%" stop-color="#fff6d0"/>
      <stop offset="26%" stop-color="#f0c85c"/>
      <stop offset="56%" stop-color="#c9962f"/>
      <stop offset="80%" stop-color="#8a5c12"/>
      <stop offset="100%" stop-color="#4f3105"/>
    </linearGradient>
    <linearGradient id="m-brass" x1="10%" y1="0%" x2="78%" y2="100%">
      <stop offset="0%" stop-color="#fff4cd"/>
      <stop offset="18%" stop-color="#f2cf72"/>
      <stop offset="42%" stop-color="#e8ae2c"/>
      <stop offset="70%" stop-color="#9c6a0c"/>
      <stop offset="100%" stop-color="#583c05"/>
    </linearGradient>
    <!-- 에나멜 빨강 (세븐·체리) -->
    <linearGradient id="m-red" x1="14%" y1="2%" x2="86%" y2="100%">
      <stop offset="0%" stop-color="#ff9fae"/>
      <stop offset="14%" stop-color="#f4485f"/>
      <stop offset="40%" stop-color="#d6112f"/>
      <stop offset="66%" stop-color="#a30c22"/>
      <stop offset="86%" stop-color="#6d0716"/>
      <stop offset="100%" stop-color="#4a040f"/>
    </linearGradient>
    <!-- 잘 익은 과일의 구면. 가장자리에서 급히 어두워진다 -->
    <radialGradient id="m-cherry" cx="32%" cy="26%" r="78%">
      <stop offset="0%" stop-color="#ff9fa8"/>
      <stop offset="22%" stop-color="#ef3a53"/>
      <stop offset="52%" stop-color="#cf1032"/>
      <stop offset="78%" stop-color="#8d0a20"/>
      <stop offset="100%" stop-color="#4c0311"/>
    </radialGradient>
    <radialGradient id="m-lemon" cx="30%" cy="24%" r="82%">
      <stop offset="0%" stop-color="#fffdea"/>
      <stop offset="24%" stop-color="#ffe680"/>
      <stop offset="54%" stop-color="#f5c518"/>
      <stop offset="80%" stop-color="#b3820a"/>
      <stop offset="100%" stop-color="#6b4c03"/>
    </radialGradient>
    <linearGradient id="m-leaf" x1="0%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#b6f0a0"/>
      <stop offset="35%" stop-color="#5cbd54"/>
      <stop offset="72%" stop-color="#258039"/>
      <stop offset="100%" stop-color="#11491f"/>
    </linearGradient>
    <linearGradient id="m-stem" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7fc16a"/>
      <stop offset="45%" stop-color="#437f2e"/>
      <stop offset="100%" stop-color="#22491a"/>
    </linearGradient>
    <!-- BAR 금속판: 가로 밴딩(브러시드 메탈) -->
    <linearGradient id="m-plate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffdf6"/>
      <stop offset="18%" stop-color="#efe6cd"/>
      <stop offset="38%" stop-color="#bdae8a"/>
      <stop offset="52%" stop-color="#f2e9d4"/>
      <stop offset="74%" stop-color="#9c8a63"/>
      <stop offset="100%" stop-color="#5f5132"/>
    </linearGradient>

    <!-- 다이아몬드: 면마다 밝기를 다르게 둔다. 이 대비가 젬으로 읽히게 한다 -->
    <linearGradient id="m-gem-table" x1="8%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#d8f8ff"/>
      <stop offset="100%" stop-color="#7fdcf2"/>
    </linearGradient>
    <linearGradient id="m-gem-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eafdff"/>
      <stop offset="100%" stop-color="#63c8e6"/>
    </linearGradient>
    <linearGradient id="m-gem-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3f9fc4"/>
      <stop offset="100%" stop-color="#14556f"/>
    </linearGradient>
    <linearGradient id="m-gem-deep" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1d6c8c"/>
      <stop offset="100%" stop-color="#07293a"/>
    </linearGradient>
    <linearGradient id="m-gem-mid" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a5ecfb"/>
      <stop offset="100%" stop-color="#2b86a8"/>
    </linearGradient>
    <linearGradient id="m-gem-core" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#8fe4f8"/>
      <stop offset="100%" stop-color="#1b6d8e"/>
    </linearGradient>
    <!-- 젬 안에서 빛이 모이는 곳 -->
    <radialGradient id="m-caustic" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#bdf4ff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#bdf4ff" stop-opacity="0"/>
    </radialGradient>
    <!-- 젬이 바닥에 흘리는 청색광 -->
    <radialGradient id="m-glow-cyan" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#5fd7f0" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#5fd7f0" stop-opacity="0"/>
    </radialGradient>

    <!-- 이집션 팔레트. 같은 방식으로 스톱을 늘려 재질감을 올렸다 -->
    <linearGradient id="g-eg-gold" x1="8%" y1="0%" x2="26%" y2="100%">
      <stop offset="0%" stop-color="#fff8dc"/>
      <stop offset="18%" stop-color="#f2cf73"/>
      <stop offset="38%" stop-color="#9a6a12"/>
      <stop offset="54%" stop-color="#f5dc9c"/>
      <stop offset="72%" stop-color="#8a5c07"/>
      <stop offset="88%" stop-color="#c99a30"/>
      <stop offset="100%" stop-color="#513305"/>
    </linearGradient>
    <linearGradient id="g-eg-lapis" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#9fc4f5"/>
      <stop offset="20%" stop-color="#5a8fd8"/>
      <stop offset="48%" stop-color="#2b5fa8"/>
      <stop offset="76%" stop-color="#1a3c6c"/>
      <stop offset="100%" stop-color="#0c1e3f"/>
    </linearGradient>
    <linearGradient id="g-eg-teal" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#c8faf3"/>
      <stop offset="20%" stop-color="#7ce6d9"/>
      <stop offset="48%" stop-color="#2ec4b6"/>
      <stop offset="76%" stop-color="#16867c"/>
      <stop offset="100%" stop-color="#07443f"/>
    </linearGradient>
    <linearGradient id="g-eg-red" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#ffc2ad"/>
      <stop offset="20%" stop-color="#f08268"/>
      <stop offset="48%" stop-color="#c8432f"/>
      <stop offset="76%" stop-color="#8b2519"/>
      <stop offset="100%" stop-color="#4a100a"/>
    </linearGradient>
    <linearGradient id="g-eg-ivory" x1="6%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%" stop-color="#fffdf2"/>
      <stop offset="24%" stop-color="#f4e8cd"/>
      <stop offset="56%" stop-color="#ddc9a0"/>
      <stop offset="82%" stop-color="#a8956f"/>
      <stop offset="100%" stop-color="#6b5c3c"/>
    </linearGradient>
    <linearGradient id="g-eg-stone" x1="6%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#eaddbc"/>
      <stop offset="26%" stop-color="#c9b483"/>
      <stop offset="56%" stop-color="#a6905f"/>
      <stop offset="82%" stop-color="#6f5c36"/>
      <stop offset="100%" stop-color="#3f331b"/>
    </linearGradient>

    <!-- 회전 중 세로 방향 모션 블러. CSS의 blur()는 등방성이라 세로만 흐리려면 SVG 필터가 필요하다. -->
    <filter id="blur-spin" x="-25%" y="-60%" width="150%" height="220%">
      <feGaussianBlur stdDeviation="0 7"/>
    </filter>
    <filter id="blur-spin-soft" x="-25%" y="-60%" width="150%" height="220%">
      <feGaussianBlur stdDeviation="0 3"/>
    </filter>

    <!-- 조명 레이어를 여러 겹 올리는 심볼은 실루엣을 여기 한 번만 두고 <use>로 참조한다.
         같은 패스를 복붙하지 않으므로 레이어가 어긋날 일이 없다. -->
    <path id="p-seven" d="M22 13h57L57 91H32l20-58H22z"/>
    <path id="p-crown" d="M11 78 17 27l19 19L50 19l14 27 19-19 6 51z"/>
    <path id="p-star" d="M50 8 60.6 37.4 91.9 38.4 67.1 57.6 75.9 87.6 50 70 24.1 87.6 32.9 57.6 8.1 38.4 39.4 37.4z"/>
    <path id="p-bell" d="M50 23c-16 0-25 11-25 29 0 18-5 24-11 31h72c-6-7-11-13-11-31 0-18-9-29-25-29z"/>
  </defs>

  <symbol id="sym-cherry" viewBox="0 0 100 100">
    <ellipse cx="50" cy="93" rx="33" ry="5.5" fill="url(#m-shadow)"/>
    <path d="M53 22c-10 12-23 17-31 36" fill="none" stroke="url(#m-stem)" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M53 22c7 14 13 19 18 35" fill="none" stroke="url(#m-stem)" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M53 22c9-14 25-15 34-9-8 12-24 15-34 9z" fill="url(#m-leaf)"/>
    <path d="M56 19c8-7 18-8 26-5" fill="none" stroke="#e6ffd9" stroke-width="1.6" opacity="0.5"/>
    <!-- 큰 열매: 구면 → 어두운 가장자리 → 아래 반사광 → 넓은 광택 → 좁은 스페큘러 -->
    <circle cx="34" cy="67" r="20" fill="url(#m-cherry)"/>
    <circle cx="34" cy="67" r="20" fill="none" stroke="#3d0210" stroke-width="1.5" opacity="0.5"/>
    <path d="M17 75a20 20 0 0 0 31 8" fill="none" stroke="#ff8f7c" stroke-width="3" opacity="0.38" stroke-linecap="round"/>
    <ellipse cx="27" cy="58" rx="10.5" ry="7.5" fill="url(#m-sheen)" transform="rotate(-28 27 58)"/>
    <ellipse cx="25.5" cy="56" rx="3.4" ry="2.3" fill="#fff" opacity="0.92" transform="rotate(-28 25.5 56)"/>
    <!-- 작은 열매 -->
    <circle cx="70" cy="73" r="16.5" fill="url(#m-cherry)"/>
    <circle cx="70" cy="73" r="16.5" fill="none" stroke="#3d0210" stroke-width="1.5" opacity="0.5"/>
    <path d="M56 79a16.5 16.5 0 0 0 26 7" fill="none" stroke="#ff8f7c" stroke-width="2.6" opacity="0.34" stroke-linecap="round"/>
    <ellipse cx="64" cy="65" rx="8" ry="5.6" fill="url(#m-sheen)" transform="rotate(-28 64 65)"/>
    <ellipse cx="62.6" cy="63.6" rx="2.6" ry="1.8" fill="#fff" opacity="0.85" transform="rotate(-28 62.6 63.6)"/>
    <!-- 꼭지가 박힌 자리는 오목하다 -->
    <ellipse cx="35" cy="49" rx="4" ry="2.4" fill="#40030f" opacity="0.55"/>
    <ellipse cx="70.5" cy="57.5" rx="3.4" ry="2" fill="#40030f" opacity="0.5"/>
  </symbol>

  <symbol id="sym-lemon" viewBox="0 0 100 100">
    <ellipse cx="50" cy="92" rx="32" ry="5" fill="url(#m-shadow)"/>
    <path d="M50 21c4-6 10-6 14-2" fill="none" stroke="url(#m-stem)" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 20c10-6 22-2 26 4-10 8-22 6-26-4z" fill="url(#m-leaf)"/>
    <path d="M66 19c7-3 14-2 19 1" fill="none" stroke="#e6ffd9" stroke-width="1.5" opacity="0.5"/>
    <!-- 껍질 -->
    <ellipse cx="50" cy="60" rx="33" ry="25" fill="url(#m-lemon)"/>
    <ellipse cx="50" cy="60" rx="33" ry="25" fill="none" stroke="#5c4103" stroke-width="1.4" opacity="0.45"/>
    <!-- 양 끝 꼭지가 튀어나온 레몬 특유의 형태 -->
    <ellipse cx="82" cy="60" rx="5" ry="3.4" fill="url(#m-lemon)"/>
    <ellipse cx="18" cy="60" rx="5" ry="3.4" fill="url(#m-lemon)"/>
    <!-- 오른쪽 아래가 빛에서 멀어진다 -->
    <ellipse cx="50" cy="60" rx="33" ry="25" fill="url(#m-occl)"/>
    <!-- 아래에서 올라오는 반사광 -->
    <path d="M22 72c8 8 20 11 33 10" fill="none" stroke="#ffe9a0" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
    <!-- 왁스 질감: 넓은 광택 + 좁은 스페큘러 -->
    <ellipse cx="37" cy="48" rx="13" ry="7" fill="url(#m-sheen)" transform="rotate(-14 37 48)"/>
    <ellipse cx="33" cy="46" rx="4.6" ry="2.2" fill="#fff" opacity="0.9" transform="rotate(-14 33 46)"/>
    <!-- 껍질 결 -->
    <path d="M24 66c9 5 22 7 36 6" fill="none" stroke="#8a6205" stroke-width="1.6" opacity="0.35"/>
    <path d="M30 74c10 3 20 4 30 2" fill="none" stroke="#8a6205" stroke-width="1.4" opacity="0.25"/>
  </symbol>

  <symbol id="sym-bell" viewBox="0 0 100 100">
    <ellipse cx="50" cy="95" rx="30" ry="4.6" fill="url(#m-shadow)"/>
    <!-- 손잡이 고리 -->
    <circle cx="50" cy="15" r="7.5" fill="url(#m-gold)"/>
    <circle cx="50" cy="15" r="3.2" fill="#3a2404"/>
    <!-- 종 몸통: 금속 밴딩 → 위 테두리 빛 → 아래 반사광 → 오클루전 -->
    <use href="#p-bell" fill="url(#m-brass)"/>
    <use href="#p-bell" fill="url(#m-occl)"/>
    <use href="#p-bell" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-bell" fill="none" stroke="url(#m-rim)" stroke-width="2.4"/>
    <!-- 주조 금속의 세로 스페큘러. 종은 이 줄무늬로 읽힌다 -->
    <path d="M37 33c-5 7-7 15-7 25 0 10-2 16-5 20h7c3-5 5-11 5-20 0-10 2-18 6-25z" fill="#fff6d8" opacity="0.62"/>
    <path d="M61 34c4 7 6 15 6 24 0 10 2 16 5 21h-5c-3-5-5-11-5-21 0-9-2-17-5-24z" fill="#3a2404" opacity="0.3"/>
    <!-- 아래 테 -->
    <rect x="16" y="79" width="68" height="8" rx="4" fill="url(#m-gold)"/>
    <rect x="16" y="79" width="68" height="3" rx="1.5" fill="#fffbe8" opacity="0.6"/>
    <!-- 추 -->
    <circle cx="50" cy="91" r="8" fill="url(#m-brass)"/>
    <circle cx="47.6" cy="88.6" r="2.6" fill="#fff" opacity="0.7"/>
  </symbol>

  <symbol id="sym-bar" viewBox="0 0 100 100">
    <ellipse cx="50" cy="76" rx="36" ry="5" fill="url(#m-shadow)"/>
    <!-- 두께: 아래쪽에 어두운 판을 깔아 판이 떠 보이게 한다 -->
    <rect x="8" y="33" width="84" height="40" rx="9" fill="#4a3205"/>
    <rect x="8" y="29" width="84" height="40" rx="9" fill="url(#m-gold)"/>
    <!-- 안쪽 금속판 -->
    <rect x="12" y="33" width="76" height="32" rx="6" fill="url(#m-plate)"/>
    <rect x="12" y="33" width="76" height="32" rx="6" fill="url(#m-occl)" opacity="0.7"/>
    <!-- 테두리 베벨 -->
    <rect x="12" y="33" width="76" height="32" rx="6" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <rect x="12" y="33" width="76" height="32" rx="6" fill="none" stroke="url(#m-rim)" stroke-width="1.8"/>
    <!-- 새겨 넣은 글자: 어두운 글자 위에 1px 밝은 글자를 얹으면 음각으로 읽힌다 -->
    <text x="50" y="55.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="25" font-weight="900" fill="#fffdf2" opacity="0.5" letter-spacing="2">BAR</text>
    <text x="50" y="54" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="25" font-weight="900" fill="#3d2703" letter-spacing="2">BAR</text>
  </symbol>

  <symbol id="sym-seven" viewBox="0 0 100 100">
    <ellipse cx="52" cy="95" rx="31" ry="5.5" fill="url(#m-shadow)"/>
    <!-- 금속 프레임: 같은 패스를 두껍게 스트로크해 바깥으로 테를 만든다 -->
    <use href="#p-seven" fill="url(#m-gold)" stroke="url(#m-gold)" stroke-width="9" stroke-linejoin="round"/>
    <use href="#p-seven" fill="none" stroke="url(#m-key)" stroke-width="3" stroke-linejoin="round"/>
    <use href="#p-seven" fill="none" stroke="url(#m-rim)" stroke-width="2" stroke-linejoin="round"/>
    <!-- 에나멜 본체 -->
    <use href="#p-seven" fill="url(#m-red)"/>
    <use href="#p-seven" fill="url(#m-occl)"/>
    <!-- 가로 바와 사선이 꺾이는 면 -->
    <path d="M52 33 79 13 57 91 44 68z" fill="#000" opacity="0.16"/>
    <!-- 스페큘러: 가로 바 위쪽 + 사선 위 좁은 줄 -->
    <path d="M26 17h48l-2.4 7H26z" fill="url(#m-spec)"/>
    <path d="M48 40 57 36 42 82 36 80z" fill="url(#m-spec)" opacity="0.45"/>
    <path d="M24 30h26l-1 3H24z" fill="#ffd0d8" opacity="0.35"/>
  </symbol>

  <symbol id="sym-diamond" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="26" ry="5" fill="url(#m-shadow)"/>
    <ellipse cx="50" cy="88" rx="34" ry="13" fill="url(#m-glow-cyan)"/>
    <!-- 파빌리온(아래): 밝고 어두운 면을 번갈아 둔다 -->
    <path d="M12 42h16L50 92z" fill="url(#m-gem-deep)"/>
    <path d="M28 42h15L50 92z" fill="url(#m-gem-mid)"/>
    <path d="M43 42h14L50 92z" fill="url(#m-gem-core)"/>
    <path d="M57 42h15L50 92z" fill="url(#m-gem-deep)"/>
    <path d="M72 42h16L50 92z" fill="url(#m-gem-dark)"/>
    <!-- 크라운(위) -->
    <path d="M31 22h38l-7 20H38z" fill="url(#m-gem-table)"/>
    <path d="M31 22 38 42H12z" fill="url(#m-gem-light)"/>
    <path d="M69 22 88 42H62z" fill="url(#m-gem-dark)"/>
    <!-- 거들(허리)이 빛을 받는다 -->
    <path d="M12 42h76" stroke="#ffffff" stroke-width="2.2" opacity="0.8"/>
    <!-- 젬 안에서 빛이 모이는 곳 -->
    <ellipse cx="50" cy="58" rx="16" ry="18" fill="url(#m-caustic)"/>
    <!-- 면 경계 -->
    <path d="M31 22 38 42M69 22 62 42M28 42 50 92M43 42 50 92M57 42 50 92M72 42 50 92"
          stroke="#eafdff" stroke-width="0.9" opacity="0.45" fill="none"/>
    <!-- 글린트 -->
    <path d="M37 26 39.4 31 44.5 33.4 39.4 35.8 37 41 34.6 35.8 29.5 33.4 34.6 31z" fill="#fff" opacity="0.95"/>
    <path d="M66 45 67.4 48 70.5 49.4 67.4 50.8 66 54 64.6 50.8 61.5 49.4 64.6 48z" fill="#fff" opacity="0.7"/>
    <!-- 외곽 어두운 테두리: 배경에서 떨어져 보이게 -->
    <path d="M31 22h38l19 20L50 92 12 42z" fill="none" stroke="#062b3d" stroke-width="1.6" opacity="0.8"/>
  </symbol>

  <symbol id="sym-crown" viewBox="0 0 100 100">
    <ellipse cx="50" cy="93" rx="34" ry="5" fill="url(#m-shadow)"/>
    <!-- 넓은 면이라 밴딩 대신 부드러운 금을 쓴다 -->
    <use href="#p-crown" fill="url(#m-gold-soft)"/>
    <!-- 봉우리마다 능선을 기준으로 밝은 면과 어두운 면이 갈린다. 이게 접힌 금판으로 읽히게 한다 -->
    <path d="M17 27 9 78 21 78zM50 19 40 78 54 78zM83 27 75 78 87 78z" fill="#fff6d0" opacity="0.4"/>
    <path d="M17 27 21 78 29 78zM50 19 54 78 62 78zM83 27 87 78 91 78z" fill="#4a2c05" opacity="0.32"/>
    <!-- 봉우리 사이 골은 깊게 파인다 -->
    <path d="M36 46 31 78 42 78zM64 46 59 78 69 78z" fill="#2e1c03" opacity="0.38"/>
    <use href="#p-crown" fill="url(#m-occl)" opacity="0.7"/>
    <use href="#p-crown" fill="none" stroke="url(#m-key)" stroke-width="2.6" stroke-linejoin="round"/>
    <!-- 아래 밴드 -->
    <rect x="9" y="74" width="82" height="16" rx="7" fill="url(#m-gold-soft)"/>
    <rect x="9" y="74" width="82" height="16" rx="7" fill="url(#m-occl)" opacity="0.55"/>
    <rect x="9" y="74" width="82" height="5" rx="2.5" fill="#fff6d8" opacity="0.65"/>
    <rect x="9" y="86" width="82" height="3" rx="1.5" fill="#ffe6c6" opacity="0.4"/>
    <!-- 보석: 구면 음영 + 글린트 -->
    <circle cx="17" cy="27" r="6.4" fill="#c21b38"/>
    <circle cx="15.4" cy="25.4" r="2.6" fill="#ff9aa6" opacity="0.9"/>
    <circle cx="50" cy="19" r="7.4" fill="#2aaacb"/>
    <circle cx="48" cy="17" r="3" fill="#bdf4ff" opacity="0.9"/>
    <circle cx="83" cy="27" r="6.4" fill="#c21b38"/>
    <circle cx="81.4" cy="25.4" r="2.6" fill="#ff9aa6" opacity="0.85"/>
    <circle cx="30" cy="81.5" r="5" fill="#2aaacb"/>
    <circle cx="28.6" cy="80.2" r="2" fill="#bdf4ff" opacity="0.85"/>
    <circle cx="70" cy="81.5" r="5" fill="#c21b38"/>
    <circle cx="68.6" cy="80.2" r="2" fill="#ff9aa6" opacity="0.8"/>
  </symbol>

  <symbol id="sym-star" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4.6" fill="url(#m-shadow)"/>
    <use href="#p-star" fill="url(#m-gold-soft)"/>
    <!-- 별은 봉우리마다 밝은 면과 어두운 면이 갈려야 입체로 읽힌다 -->
    <path d="M50 52 39.4 37.4 50 8zM50 52 60.6 37.4 91.9 38.4zM50 52 67.1 57.6 75.9 87.6zM50 52 50 70 24.1 87.6zM50 52 32.9 57.6 8.1 38.4z"
          fill="#fff3c0" opacity="0.58"/>
    <path d="M50 52 50 8 60.6 37.4zM50 52 91.9 38.4 67.1 57.6zM50 52 75.9 87.6 50 70zM50 52 24.1 87.6 32.9 57.6zM50 52 8.1 38.4 39.4 37.4z"
          fill="#6b4406" opacity="0.55"/>
    <use href="#p-star" fill="url(#m-occl)" opacity="0.5"/>
    <use href="#p-star" fill="none" stroke="url(#m-key)" stroke-width="2.6" stroke-linejoin="round"/>
    <use href="#p-star" fill="none" stroke="url(#m-rim)" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 능선이 모이는 가운데가 가장 밝다 -->
    <circle cx="47" cy="45" r="5" fill="url(#m-sheen)"/>
  </symbol>

  <!-- ── 파라오의 문 심볼 (창작) ── -->

  <symbol id="sym-ankh" viewBox="0 0 100 100">
    <ellipse cx="50" cy="28" rx="17" ry="20" fill="none" stroke="url(#g-eg-gold)" stroke-width="10"/>
    <rect x="43" y="46" width="14" height="46" rx="4" fill="url(#g-eg-gold)"/>
    <rect x="21" y="52" width="58" height="13" rx="5" fill="url(#g-eg-gold)"/>
    <ellipse cx="50" cy="28" rx="17" ry="20" fill="none" stroke="#fff4c9" stroke-width="2.5" opacity="0.55"/>
    <rect x="45" y="48" width="4" height="40" rx="2" fill="#fff4c9" opacity="0.45"/>
  </symbol>

  <symbol id="sym-lotus" viewBox="0 0 100 100">
    <g fill="url(#g-eg-teal)">
      <ellipse cx="29" cy="58" rx="11" ry="25" transform="rotate(-30 29 58)"/>
      <ellipse cx="71" cy="58" rx="11" ry="25" transform="rotate(30 71 58)"/>
      <ellipse cx="50" cy="50" rx="14" ry="31"/>
    </g>
    <ellipse cx="50" cy="48" rx="7" ry="23" fill="url(#g-eg-ivory)"/>
    <ellipse cx="46" cy="40" rx="3" ry="10" fill="#fdf6e3" opacity="0.7"/>
    <rect x="23" y="82" width="54" height="10" rx="5" fill="url(#g-eg-gold)"/>
    <rect x="23" y="82" width="54" height="3.5" rx="1.75" fill="#fff4c9" opacity="0.6"/>
  </symbol>

  <symbol id="sym-papyrus" viewBox="0 0 100 100">
    <rect x="22" y="22" width="56" height="56" rx="4" fill="url(#g-eg-ivory)"/>
    <rect x="12" y="16" width="14" height="68" rx="7" fill="url(#g-eg-gold)"/>
    <rect x="74" y="16" width="14" height="68" rx="7" fill="url(#g-eg-gold)"/>
    <g stroke="#7a6134" stroke-width="3.5" stroke-linecap="round" opacity="0.8">
      <path d="M32 36h36"/>
      <path d="M32 48h26"/>
      <path d="M32 60h36"/>
      <path d="M32 70h20"/>
    </g>
    <rect x="22" y="22" width="56" height="10" fill="#fdf6e3" opacity="0.5"/>
  </symbol>

  <symbol id="sym-cobra" viewBox="0 0 100 100">
    <path d="M50 20C26 20 8 37 8 56c0 9 6 14 13 15h58c7-1 13-6 13-15 0-19-18-36-42-36z" fill="url(#g-eg-teal)"/>
    <path d="M50 30C32 30 19 42 19 56c0 6 4 10 9 11h44c5-1 9-5 9-11 0-14-13-26-31-26z" fill="url(#g-eg-gold)" opacity="0.5"/>
    <ellipse cx="50" cy="48" rx="13" ry="15" fill="url(#g-eg-gold)"/>
    <circle cx="45" cy="45" r="3.6" fill="#1a1208"/>
    <circle cx="55" cy="45" r="3.6" fill="#1a1208"/>
    <circle cx="43.8" cy="43.6" r="1.2" fill="#fdf6e3"/>
    <circle cx="53.8" cy="43.6" r="1.2" fill="#fdf6e3"/>
    <path d="M47 57h6l-3 8z" fill="url(#g-eg-red)"/>
    <path d="M42 71c1 9-2 13-9 16h34c-7-3-10-7-9-16z" fill="url(#g-eg-teal)"/>
    <rect x="25" y="86" width="50" height="10" rx="5" fill="url(#g-eg-gold)"/>
    <path d="M20 40c6-8 15-13 25-14v6c-8 1-15 5-20 12z" fill="#9df0e6" opacity="0.55"/>
  </symbol>

  <symbol id="sym-falcon" viewBox="0 0 100 100">
    <path d="M30 88c-6-14-8-28-4-42 4-15 16-26 32-26 8 0 14 3 18 7l-10 9c3 3 5 7 5 12 0 8-5 14-12 17 2 8 2 16 0 23z" fill="url(#g-eg-lapis)"/>
    <path d="M76 27c6 1 12 4 16 9-6 2-12 3-18 2z" fill="url(#g-eg-gold)"/>
    <circle cx="56" cy="36" r="6" fill="url(#g-eg-gold)"/>
    <circle cx="56" cy="36" r="2.6" fill="#1a1208"/>
    <path d="M36 52c8 4 18 5 26 2-4 8-14 12-26 10z" fill="url(#g-eg-gold)" opacity="0.85"/>
    <path d="M26 88h40l-6 8H32z" fill="url(#g-eg-gold)"/>
  </symbol>

  <symbol id="sym-scarab" viewBox="0 0 100 100">
    <ellipse cx="50" cy="56" rx="30" ry="32" fill="url(#g-eg-teal)"/>
    <path d="M50 24c-9 0-16 6-16 13 0 5 3 9 8 11h16c5-2 8-6 8-11 0-7-7-13-16-13z" fill="url(#g-eg-gold)"/>
    <path d="M47 40h6v48h-6z" fill="url(#g-eg-gold)"/>
    <path d="M22 44c-7 2-12 8-14 15 6 2 12 1 17-2z" fill="url(#g-eg-gold)"/>
    <path d="M78 44c7 2 12 8 14 15-6 2-12 1-17-2z" fill="url(#g-eg-gold)"/>
    <path d="M24 70c-6 3-10 9-11 16 6 1 12-1 16-5z" fill="url(#g-eg-gold)"/>
    <path d="M76 70c6 3 10 9 11 16-6 1-12-1-16-5z" fill="url(#g-eg-gold)"/>
    <ellipse cx="38" cy="46" rx="7" ry="11" fill="#9df0e6" opacity="0.45"/>
  </symbol>

  <symbol id="sym-mask" viewBox="0 0 100 100">
    <path d="M50 8c-17 0-28 9-30 24l-6 36 15 5 3 15h36l3-15 15-5-6-36C78 17 67 8 50 8z" fill="url(#g-eg-lapis)"/>
    <g fill="url(#g-eg-gold)">
      <rect x="16" y="38" width="9" height="28" rx="4"/>
      <rect x="28" y="30" width="9" height="14" rx="4"/>
      <rect x="63" y="30" width="9" height="14" rx="4"/>
      <rect x="75" y="38" width="9" height="28" rx="4"/>
    </g>
    <path d="M31 24h38l4 11H27z" fill="url(#g-eg-red)"/>
    <path d="M33 33h34v29c0 10-8 16-17 16s-17-6-17-16z" fill="url(#g-eg-gold)"/>
    <circle cx="42" cy="48" r="4" fill="#1a1208"/>
    <circle cx="58" cy="48" r="4" fill="#1a1208"/>
    <path d="M47 52h6v9h-6z" fill="#8a5c07" opacity="0.35"/>
    <path d="M43 66h14" stroke="#8a5c07" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="45" y="76" width="10" height="17" rx="5" fill="url(#g-eg-lapis)"/>
    <path d="M33 33h6v27h-6z" fill="#fff4c9" opacity="0.3"/>
  </symbol>

  <symbol id="sym-eye" viewBox="0 0 100 100">
    <path d="M12 40c14-14 30-20 46-20 12 0 22 4 30 11-10 12-26 21-44 21-12 0-23-4-32-12z" fill="url(#g-eg-ivory)"/>
    <ellipse cx="46" cy="40" rx="11" ry="11" fill="#1a1208"/>
    <ellipse cx="42" cy="36" rx="3.4" ry="3.4" fill="#fdf6e3" opacity="0.8"/>
    <path d="M10 30c16-16 36-22 56-20 10 1 18 4 24 9" fill="none" stroke="url(#g-eg-gold)" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 54l-6 30h12l4-28z" fill="url(#g-eg-gold)"/>
    <path d="M60 54c10 2 18 10 18 22 0 6-4 10-10 10s-11-5-11-11c0-5 3-8 7-9" fill="none" stroke="url(#g-eg-gold)" stroke-width="8" stroke-linecap="round"/>
  </symbol>

  <symbol id="sym-obelisk" viewBox="0 0 100 100">
    <path d="M50 6 62 26H38z" fill="url(#g-eg-gold)"/>
    <path d="M38 26h24l6 62H32z" fill="url(#g-eg-stone)"/>
    <rect x="26" y="88" width="48" height="10" rx="3" fill="url(#g-eg-gold)"/>
    <g stroke="#5d4c2b" stroke-width="3" stroke-linecap="round" opacity="0.75">
      <path d="M44 38h12"/>
      <path d="M44 50h12"/>
      <path d="M44 62h12"/>
      <path d="M44 74h12"/>
    </g>
    <path d="M38 26h6l4 62h-6z" fill="#fdf6e3" opacity="0.28"/>
    <path d="M50 6 56 26h-6z" fill="#fff4c9" opacity="0.5"/>
  </symbol>

  <!-- 저배당 석판 타일 -->
  <symbol id="sym-rank10" viewBox="0 0 100 100">
    <rect x="13" y="9" width="74" height="82" rx="9" fill="url(#g-eg-lapis)"/>
    <rect x="13" y="9" width="74" height="22" rx="9" fill="#fdf6e3" opacity="0.18"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="63" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="34" font-weight="900" fill="url(#g-eg-gold)">10</text>
  </symbol>
  <symbol id="sym-rankj" viewBox="0 0 100 100">
    <rect x="13" y="9" width="74" height="82" rx="9" fill="url(#g-eg-teal)"/>
    <rect x="13" y="9" width="74" height="22" rx="9" fill="#fdf6e3" opacity="0.18"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="63" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="url(#g-eg-gold)">J</text>
  </symbol>
  <symbol id="sym-rankq" viewBox="0 0 100 100">
    <rect x="13" y="9" width="74" height="82" rx="9" fill="url(#g-eg-red)"/>
    <rect x="13" y="9" width="74" height="22" rx="9" fill="#fdf6e3" opacity="0.18"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="63" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="42" font-weight="900" fill="url(#g-eg-gold)">Q</text>
  </symbol>
  <symbol id="sym-rankk" viewBox="0 0 100 100">
    <rect x="13" y="9" width="74" height="82" rx="9" fill="url(#g-eg-stone)"/>
    <rect x="13" y="9" width="74" height="22" rx="9" fill="#fdf6e3" opacity="0.18"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="63" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="url(#g-eg-gold)">K</text>
  </symbol>
  <symbol id="sym-ranka" viewBox="0 0 100 100">
    <rect x="13" y="9" width="74" height="82" rx="9" fill="url(#g-eg-gold)"/>
    <rect x="13" y="9" width="74" height="22" rx="9" fill="#fdf6e3" opacity="0.18"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="63" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="#2a1c08">A</text>
  </symbol>
</svg>
`;

export function mountSymbolSprite(host) {
  host.innerHTML = SPRITE;
}

export function symbolHref(key) {
  return `#sym-${key}`;
}

// 배당표·기록 모달에서 심볼 하나를 그릴 때 쓴다.
export function symbolMarkup(key, className = 'symbol') {
  return `<svg class="${className}" viewBox="0 0 100 100" role="img"><use href="${symbolHref(key)}"/></svg>`;
}
