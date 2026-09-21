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

    <!-- 복주머니 팔레트. 단청(丹靑)의 오방색에서 가져왔다 -->
    <linearGradient id="g-kr-red" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#ffb3a8"/>
      <stop offset="20%" stop-color="#ef6a5a"/>
      <stop offset="48%" stop-color="#c62828"/>
      <stop offset="76%" stop-color="#8a1616"/>
      <stop offset="100%" stop-color="#4a0a0a"/>
    </linearGradient>
    <linearGradient id="g-kr-blue" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#a9d8e8"/>
      <stop offset="20%" stop-color="#5aa8c8"/>
      <stop offset="48%" stop-color="#2a6f96"/>
      <stop offset="76%" stop-color="#174a68"/>
      <stop offset="100%" stop-color="#0a2436"/>
    </linearGradient>
    <linearGradient id="g-kr-green" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#bfe8c0"/>
      <stop offset="20%" stop-color="#6fc276"/>
      <stop offset="48%" stop-color="#2f8a46"/>
      <stop offset="76%" stop-color="#1b5a2e"/>
      <stop offset="100%" stop-color="#0c2a16"/>
    </linearGradient>
    <linearGradient id="g-kr-jade" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#e2f4ec"/>
      <stop offset="22%" stop-color="#a9d6c4"/>
      <stop offset="50%" stop-color="#6faa95"/>
      <stop offset="78%" stop-color="#3f6f60"/>
      <stop offset="100%" stop-color="#1d3830"/>
    </linearGradient>
    <linearGradient id="g-kr-bronze" x1="8%" y1="0%" x2="26%" y2="100%">
      <stop offset="0%" stop-color="#f6e3b8"/>
      <stop offset="18%" stop-color="#d4a94f"/>
      <stop offset="38%" stop-color="#7a5a18"/>
      <stop offset="54%" stop-color="#e8cd88"/>
      <stop offset="72%" stop-color="#6b4c12"/>
      <stop offset="88%" stop-color="#b08c2e"/>
      <stop offset="100%" stop-color="#3d2a08"/>
    </linearGradient>
    <linearGradient id="g-kr-white" x1="6%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="24%" stop-color="#f4f6f8"/>
      <stop offset="56%" stop-color="#dde3e8"/>
      <stop offset="82%" stop-color="#a8b2bb"/>
      <stop offset="100%" stop-color="#5f6a73"/>
    </linearGradient>

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

    <!-- 용문 팔레트. 물빛 계열이라 앞의 두 게임(붉은 단청 · 모래빛 이집트)과 겹치지 않는다 -->
    <linearGradient id="g-dg-water" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#d4f6ff"/>
      <stop offset="20%" stop-color="#77d2ea"/>
      <stop offset="48%" stop-color="#2b93b8"/>
      <stop offset="76%" stop-color="#155a7c"/>
      <stop offset="100%" stop-color="#062537"/>
    </linearGradient>
    <linearGradient id="g-dg-deep" x1="6%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#5d7f96"/>
      <stop offset="26%" stop-color="#37596f"/>
      <stop offset="56%" stop-color="#22404f"/>
      <stop offset="82%" stop-color="#132632"/>
      <stop offset="100%" stop-color="#070f16"/>
    </linearGradient>
    <!-- 조개 안쪽 자패(紫貝). 크림빛에 분홍이 섞인다 -->
    <linearGradient id="g-dg-shell" x1="6%" y1="0%" x2="72%" y2="100%">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="22%" stop-color="#ffe6df"/>
      <stop offset="50%" stop-color="#eebfb4"/>
      <stop offset="78%" stop-color="#ba8577"/>
      <stop offset="100%" stop-color="#6b4338"/>
    </linearGradient>
    <!-- 잉어의 홍백. 등에서 배로 붉은빛이 빠진다 -->
    <linearGradient id="g-dg-koi" x1="14%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#ffd9a8"/>
      <stop offset="18%" stop-color="#ff9a4d"/>
      <stop offset="44%" stop-color="#ef5a22"/>
      <stop offset="70%" stop-color="#b52f0e"/>
      <stop offset="100%" stop-color="#5c1405"/>
    </linearGradient>
    <!-- 가재 껍질. 삶은 듯한 주홍에 갈색이 깔린다 -->
    <linearGradient id="g-dg-crust" x1="10%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#ffcfb0"/>
      <stop offset="20%" stop-color="#f2845c"/>
      <stop offset="48%" stop-color="#c94a28"/>
      <stop offset="76%" stop-color="#8a2f16"/>
      <stop offset="100%" stop-color="#3d1207"/>
    </linearGradient>
    <!-- 용의 비늘. 청록에 금이 섞인 채색 -->
    <linearGradient id="g-dg-scale" x1="8%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" stop-color="#e8fff4"/>
      <stop offset="16%" stop-color="#7fe0c0"/>
      <stop offset="36%" stop-color="#1f7a68"/>
      <stop offset="54%" stop-color="#b6f0d8"/>
      <stop offset="74%" stop-color="#155a52"/>
      <stop offset="90%" stop-color="#4fb89a"/>
      <stop offset="100%" stop-color="#062824"/>
    </linearGradient>
    <!-- 여의주. 안쪽에서 빛이 나오는 구슬이라 중심이 가장 밝다 -->
    <radialGradient id="g-dg-pearl" cx="36%" cy="30%" r="76%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#e8fbff"/>
      <stop offset="46%" stop-color="#9fe4f5"/>
      <stop offset="72%" stop-color="#4aa8cc"/>
      <stop offset="100%" stop-color="#12506c"/>
    </radialGradient>
    <!-- 여의주를 감싼 서기(瑞氣) -->
    <radialGradient id="g-dg-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#bff4ff" stop-opacity="0.85"/>
      <stop offset="52%" stop-color="#6fd8f2" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#2f9ec4" stop-opacity="0"/>
    </radialGradient>

    <!-- 화투 팔레트. 카드는 두꺼운 플라스틱 테와 아이보리 면으로 읽혀야 한다 -->
    <linearGradient id="g-hw-rim" x1="10%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#4a4650"/>
      <stop offset="22%" stop-color="#26232c"/>
      <stop offset="60%" stop-color="#141218"/>
      <stop offset="100%" stop-color="#050407"/>
    </linearGradient>
    <linearGradient id="g-hw-face" x1="8%" y1="0%" x2="72%" y2="100%">
      <stop offset="0%" stop-color="#fffdf5"/>
      <stop offset="26%" stop-color="#f8f0dc"/>
      <stop offset="62%" stop-color="#ecdfc2"/>
      <stop offset="100%" stop-color="#cbb894"/>
    </linearGradient>
    <linearGradient id="g-hw-red" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#ff8a6a"/>
      <stop offset="22%" stop-color="#f0402a"/>
      <stop offset="56%" stop-color="#cc1410"/>
      <stop offset="100%" stop-color="#6b0706"/>
    </linearGradient>
    <linearGradient id="g-hw-blue" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#8fb6ea"/>
      <stop offset="22%" stop-color="#3f6fc4"/>
      <stop offset="56%" stop-color="#22417e"/>
      <stop offset="100%" stop-color="#0d1c3c"/>
    </linearGradient>
    <linearGradient id="g-hw-green" x1="10%" y1="0%" x2="84%" y2="100%">
      <stop offset="0%" stop-color="#b3e08a"/>
      <stop offset="24%" stop-color="#5fa93c"/>
      <stop offset="58%" stop-color="#2d6b21"/>
      <stop offset="100%" stop-color="#123008"/>
    </linearGradient>
    <!-- 카드 면에 얹는 가로 유광. 플라스틱 코팅으로 읽히게 한다 -->
    <linearGradient id="g-hw-gloss" x1="0%" y1="0%" x2="100%" y2="14%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="38%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="52%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
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
    <!-- 석판 타일 5종이 같은 판을 쓴다 -->
    <rect id="p-tile" x="13" y="9" width="74" height="82" rx="10"/>
    <!-- 코브라 후드: 아래가 평평한 넓은 방패(83 × 54).
         아래에 좁은 몸통을 붙이면 버섯 기둥처럼 읽히므로 몸통을 두지 않는다. -->
    <path id="p-hood" d="M50 24C30 24 12 37 9 56c-2 14 5 24 17 24h48c12 0 19-10 17-24C88 37 70 24 50 24z"/>
    <!-- 연꽃 꽃잎 하나. 끝이 뾰족하고 아래가 평평하다. 회전시켜 다섯 장을 만든다 -->
    <path id="p-petal" d="M0-30C13-12 15 4 9 18H-9C-15 4-13-12 0-30z"/>
    <!-- 모란 꽃잎. 끝이 갈라져 있어 단순한 타원과 달리 꽃잎으로 읽힌다 -->
    <path id="p-moran-petal" d="M0 0C-15-5-18-21-10-30-6-35-2-31 0-26 2-31 6-35 10-30 18-21 15-5 0 0Z"/>
    <!-- 복(福) 자. 24x34 자리에 ㅂ·ㅗ·ㄱ을 쌓았다. 글꼴에 기대지 않으려고 직접 그린다 -->
    <g id="p-bok">
      <rect x="0" y="0" width="2.8" height="12" rx="1"/>
      <rect x="21.2" y="0" width="2.8" height="12" rx="1"/>
      <rect x="0" y="4.8" width="24" height="2.8" rx="1"/>
      <rect x="0" y="9.2" width="24" height="2.8" rx="1"/>
      <rect x="10.6" y="14" width="2.8" height="5.2" rx="1"/>
      <rect x="0" y="18.6" width="24" height="2.8" rx="1"/>
      <rect x="2" y="24" width="20" height="2.8" rx="1"/>
      <rect x="19.2" y="24" width="2.8" height="10" rx="1"/>
    </g>
    <!-- 가면의 네메스 머리쓰개 -->
    <path id="p-nemes" d="M50 5C30 5 18 17 16 35l-4 31 17 6 3 15h36l3-15 17-6-4-31C82 17 70 5 50 5z"/>

    <!-- ── 용문 공용 패스 ── -->
    <!-- 부채꼴 조개. 아래 경첩에서 부챗살이 퍼진다 -->
    <path id="p-shell" d="M50 84C22 82 5 59 11 36 17 17 33 8 50 8s33 9 39 28c6 23-11 46-39 48z"/>
    <!-- 자라 등딱지 -->
    <ellipse id="p-carapace" cx="50" cy="56" rx="31" ry="27"/>
    <!-- 잉어 몸통. 오른쪽 위로 뛰어오르는 측면 자세다.
         정면(눈 두 개)으로 그리면 벌레로 읽힌다. 측면이라 눈이 하나뿐이다. -->
    <path id="p-koi" d="M84 12C68 10 54 21 43 39 35 52 31 64 28 75 44 74 58 62 70 44 78 27 89 20 84 12z"/>
    <!-- 용 갈기 한 가닥. 머리 둘레를 따라 회전시켜 쓴다 -->
    <path id="p-mane-spike" d="M-7-25 0-47 7-25z"/>
    <!-- 여의주를 감싼 불꽃 한 가닥 -->
    <path id="p-orb-flame" d="M-8-29C-6-40 0-47 8-51 3-42 5-33 1-27z"/>
    <!-- 용 머리. 주둥이가 길고 턱이 각졌다 -->
    <path id="p-dragon-head" d="M50 22C33 22 22 33 21 48c-1 11 4 19 11 25 5 5 10 10 18 10s13-5 18-10c7-6 12-14 11-25C78 33 67 22 50 22z"/>
    <!-- 용문 기와지붕. 처마 끝이 위로 들린 한식 지붕이다 -->
    <path id="p-gate-roof" d="M50 6 88 24c4 2 6 5 9 10-6-2-10-2-14 0L50 20 17 34c-4-2-8-2-14 0 3-5 5-8 9-10z"/>

    <!-- ── 화투 공용 패스 ──
         카드 13종이 같은 테와 같은 면을 쓴다. 그림만 갈린다.
         읽는 규칙을 그림 문법으로 고정했다: 빨간 「광」 배지 = 광, 동물 = 열끗,
         가로 띠 = 띠, 아무것도 없음 = 피. 족보는 장수를 세는 게임이므로
         한 눈에 셀 수 있어야 한다. -->
    <rect id="p-card" x="20" y="5" width="60" height="90" rx="9"/>
    <rect id="p-card-face" x="25" y="10" width="50" height="80" rx="5"/>
    <!-- 광 배지. 다섯 광 카드가 모두 이걸 왼쪽 아래에 달고 있다 -->
    <g id="p-gwang-badge">
      <rect x="27" y="70" width="20" height="18" rx="3" fill="url(#g-hw-red)"/>
      <rect x="27" y="70" width="20" height="18" rx="3" fill="none" stroke="#3d0403" stroke-width="1.4"/>
      <rect x="28.6" y="71.4" width="16.8" height="2.4" rx="1.2" fill="#fff" opacity="0.5"/>
      <text x="37" y="84.4" text-anchor="middle" font-family="Black Han Sans, Gothic A1, sans-serif"
            font-size="14" fill="#fff8ec">광</text>
    </g>

    <!-- ── 복주머니 잭팟 용기 ──
         쌓이는 돈이 보여야 하므로 수정(水晶) 복주머니로 그린다. 천이면 속이 안 보인다.
         용기 기하는 js/vessel.js가, 색과 움직임은 css/cabinet.css가 맡는다. -->
    <linearGradient id="v-gold" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%" stop-color="#fff3c4"/>
      <stop offset="22%" stop-color="#e8bd54"/>
      <stop offset="46%" stop-color="#a5741c"/>
      <stop offset="64%" stop-color="#f2d98e"/>
      <stop offset="84%" stop-color="#8a5c12"/>
      <stop offset="100%" stop-color="#d4a94f"/>
    </linearGradient>
    <!-- 쌓인 돈의 표면. 위로 갈수록 빛이 번진다 -->
    <linearGradient id="v-surface" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff8dc" stop-opacity="0"/>
      <stop offset="48%" stop-color="#fff8dc" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ffd980" stop-opacity="0"/>
    </linearGradient>
    <!-- 용기 안쪽 그늘 -->
    <linearGradient id="v-inner" x1="0%" y1="0%" x2="26%" y2="100%">
      <stop offset="0%" stop-color="#1a0d06"/>
      <stop offset="100%" stop-color="#050302"/>
    </linearGradient>
    <!-- 낱개 엽전. 무늬 한 칸과 터질 때 튀는 동전이 같은 걸 쓴다 -->
    <g id="v-coin">
      <circle cx="9" cy="9" r="8.4" fill="url(#v-gold)"/>
      <circle cx="9" cy="9" r="8.4" fill="none" stroke="#3d2a08" stroke-width="1"/>
      <circle cx="9" cy="9" r="8.4" fill="none" stroke="url(#m-key)" stroke-width="1.6"/>
      <rect x="6.6" y="6.6" width="4.8" height="4.8" rx="0.6" fill="#2a1c06"/>
    </g>
    <!-- 엇갈려 쌓인 동전 무늬. 타일 한 칸을 브라우저가 한 번만 그려 두고 반복한다 -->
    <pattern id="v-coins" width="22" height="19" patternUnits="userSpaceOnUse">
      <use href="#v-coin" transform="scale(0.84)"/>
      <use href="#v-coin" transform="translate(11 9.5) scale(0.68) rotate(20 9 9)"/>
      <use href="#v-coin" transform="translate(-11 9.5) scale(0.92) rotate(-14 9 9)"/>
      <use href="#v-coin" transform="translate(17 -3) scale(0.58) rotate(34 9 9)"/>
    </pattern>
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

  <symbol id="sym-coin" viewBox="0 0 100 100">
    <ellipse cx="50" cy="92" rx="26" ry="4.5" fill="url(#m-shadow)"/>
    <!-- 테두리 톱니(리딩): 원 하나에 파선을 걸어 만든다 -->
    <circle cx="50" cy="50" r="41" fill="none" stroke="url(#m-gold)" stroke-width="7" stroke-dasharray="3 3.4"/>
    <!-- 원판 -->
    <circle cx="50" cy="50" r="38" fill="url(#m-gold)"/>
    <circle cx="50" cy="50" r="38" fill="url(#m-occl)"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <!-- 안쪽 단: 테두리보다 한 단 낮다 -->
    <circle cx="50" cy="50" r="30" fill="none" stroke="#4a2c05" stroke-width="2.4" opacity="0.55"/>
    <circle cx="50" cy="50" r="28" fill="url(#m-gold-soft)"/>
    <circle cx="50" cy="50" r="28" fill="url(#m-occl)" opacity="0.6"/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <!-- 음각 사방 빛살 -->
    <path d="M50 30 54 46 70 50 54 54 50 70 46 54 30 50 46 46z" fill="#5c3a04" opacity="0.5"/>
    <path d="M50 31.6 53.4 46.6 68.4 50 53.4 53.4 50 68.4 46.6 53.4 31.6 50 46.6 46.6z" fill="#fff6d0" opacity="0.5"/>
    <!-- 금속 반사 -->
    <ellipse cx="38" cy="36" rx="13" ry="8.5" fill="url(#m-sheen)" transform="rotate(-28 38 36)"/>
  </symbol>

  <!-- ── 복주머니 심볼 (창작) ──
       오방색과 전통 문양에서 형태만 가져왔다. 같은 광원과 조명 레이어를 쓴다. -->

  <symbol id="sym-yeopjeon" viewBox="0 0 100 100">
    <ellipse cx="50" cy="90" rx="26" ry="4.4" fill="url(#m-shadow)"/>
    <!-- 엽전: 둥근 몸에 네모 구멍 -->
    <circle cx="50" cy="50" r="36" fill="url(#g-kr-bronze)"/>
    <circle cx="50" cy="50" r="36" fill="url(#m-occl)"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <!-- 안쪽으로 한 단 낮춘 자리 -->
    <circle cx="50" cy="50" r="29" fill="none" stroke="#3d2a08" stroke-width="1.6" opacity="0.45"/>
    <!-- 네모 구멍. 파낸 자리라 위·왼쪽 벽은 그늘지고 아래·오른쪽 벽은 빛을 받는다 -->
    <rect x="39" y="39" width="22" height="22" rx="1" fill="#120b08"/>
    <path d="M39 61V39h22l-3 3H42v19z" fill="#000" opacity="0.55"/>
    <path d="M61 39v22H39l3-3h16V42z" fill="#f6e3b8" opacity="0.26"/>
    <!-- 둘레에 새긴 네 글자 자리 -->
    <g fill="#3d2a08" opacity="0.55">
      <rect x="45" y="24" width="10" height="3.4" rx="1.7"/>
      <rect x="45" y="72.6" width="10" height="3.4" rx="1.7"/>
      <rect x="24" y="45" width="3.4" height="10" rx="1.7"/>
      <rect x="72.6" y="45" width="3.4" height="10" rx="1.7"/>
    </g>
    <ellipse cx="36" cy="34" rx="11" ry="7" fill="url(#m-sheen)" transform="rotate(-28 36 34)"/>
  </symbol>

  <symbol id="sym-maedeup" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="16" ry="3.2" fill="url(#m-shadow)"/>
    <!-- 매듭 노리개: 네 갈래 고리 · 엮인 가운데 · 아래로 늘어진 술.
         고리 속이 비어 릴 배경이 보이므로 꽃(모란)과 헷갈리지 않는다. -->
    <circle cx="50" cy="9" r="4.6" fill="none" stroke="url(#g-kr-bronze)" stroke-width="3"/>
    <!-- 곧은 세로선은 경계 상자 폭이 0이라 그라디언트가 칠해지지 않는다. 살짝 기울여 둔다 -->
    <path d="M49.4 11L50.6 29" fill="none" stroke="url(#g-kr-blue)" stroke-width="6" stroke-linecap="round"/>
    <!-- 위 고리를 아래보다 크게 둔다. 좌우가 같으면 나비 날개로 읽힌다 -->
    <g fill="none" stroke-width="9">
      <ellipse cx="32" cy="31" rx="8" ry="14" stroke="url(#g-kr-blue)" transform="rotate(-45 32 31)"/>
      <ellipse cx="68" cy="31" rx="8" ry="14" stroke="url(#g-kr-blue)" transform="rotate(45 68 31)"/>
      <ellipse cx="34" cy="54" rx="7" ry="10.5" stroke="url(#g-kr-blue)" transform="rotate(45 34 54)"/>
      <ellipse cx="66" cy="54" rx="7" ry="10.5" stroke="url(#g-kr-blue)" transform="rotate(-45 66 54)"/>
    </g>
    <g fill="none" stroke-width="9" stroke="url(#m-occl)">
      <ellipse cx="32" cy="31" rx="8" ry="14" transform="rotate(-45 32 31)"/>
      <ellipse cx="68" cy="31" rx="8" ry="14" transform="rotate(45 68 31)"/>
      <ellipse cx="34" cy="54" rx="7" ry="10.5" transform="rotate(45 34 54)"/>
      <ellipse cx="66" cy="54" rx="7" ry="10.5" transform="rotate(-45 66 54)"/>
    </g>
    <!-- 엮인 가운데. 가로 가닥을 깔고 세로 가닥을 위로 올린 뒤 겹친 자리에 그늘을 넣는다 -->
    <g fill="url(#g-kr-blue)">
      <rect x="33" y="34.5" width="34" height="7" rx="3.5"/>
      <rect x="33" y="44.5" width="34" height="7" rx="3.5"/>
    </g>
    <g fill="#0a2436" opacity="0.4">
      <rect x="39.5" y="34.5" width="2.5" height="7"/>
      <rect x="49.5" y="34.5" width="2.5" height="7"/>
      <rect x="39.5" y="44.5" width="2.5" height="7"/>
      <rect x="49.5" y="44.5" width="2.5" height="7"/>
    </g>
    <g fill="url(#g-kr-blue)">
      <rect x="41.5" y="26" width="7" height="34" rx="3.5"/>
      <rect x="51.5" y="26" width="7" height="34" rx="3.5"/>
    </g>
    <g fill="url(#m-occl)">
      <rect x="33" y="34.5" width="34" height="7" rx="3.5"/>
      <rect x="33" y="44.5" width="34" height="7" rx="3.5"/>
      <rect x="41.5" y="26" width="7" height="34" rx="3.5"/>
      <rect x="51.5" y="26" width="7" height="34" rx="3.5"/>
    </g>
    <path d="M43 28c-1 10-1 20 0 30" fill="none" stroke="#a9d8e8" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
    <!-- 술 -->
    <rect x="41" y="59" width="18" height="8" rx="3" fill="url(#g-kr-bronze)"/>
    <rect x="41" y="59" width="18" height="8" rx="3" fill="url(#m-occl)" opacity="0.5"/>
    <g fill="none" stroke="url(#g-kr-blue)" stroke-width="3" stroke-linecap="round">
      <path d="M44 66l-4 22"/>
      <path d="M47 66l-2.4 23"/>
      <path d="M49.6 66l0.8 24"/>
      <path d="M53 66l2.4 23"/>
      <path d="M56 66l4 22"/>
    </g>
  </symbol>

  <symbol id="sym-moran" viewBox="0 0 100 100">
    <ellipse cx="50" cy="91" rx="26" ry="4.4" fill="url(#m-shadow)"/>
    <!-- 모란: 끝이 갈라진 겹꽃잎을 두 겹으로 돌려 세웠다 -->
    <path d="M25 72C15 72 8 78 5 87c11 3 21-1 26-9z" fill="url(#g-kr-green)"/>
    <path d="M75 72c10 0 17 6 20 15-11 3-21-1-26-9z" fill="url(#g-kr-green)"/>
    <path d="M25 72C15 72 8 78 5 87c11 3 21-1 26-9z" fill="url(#m-occl)" opacity="0.7"/>
    <path d="M75 72c10 0 17 6 20 15-11 3-21-1-26-9z" fill="url(#m-occl)"/>
    <g fill="url(#g-kr-red)">
      <use href="#p-moran-petal" transform="translate(50 52) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(72) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(144) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(216) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(288) scale(1.05)"/>
    </g>
    <g fill="url(#m-occl)">
      <use href="#p-moran-petal" transform="translate(50 52) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(72) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(144) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(216) scale(1.05)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(288) scale(1.05)"/>
    </g>
    <!-- 안쪽 겹. 바깥 겹 사이에 끼워 겹꽃으로 읽히게 한다 -->
    <g fill="url(#g-kr-red)" stroke="#ffb3a8" stroke-width="1" stroke-opacity="0.45">
      <use href="#p-moran-petal" transform="translate(50 52) rotate(36) scale(0.62)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(108) scale(0.62)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(180) scale(0.62)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(252) scale(0.62)"/>
      <use href="#p-moran-petal" transform="translate(50 52) rotate(324) scale(0.62)"/>
    </g>
    <!-- 꽃술. 단추가 아니라 실이 퍼진 모양이라 꽃 가운데로 읽힌다 -->
    <g fill="none" stroke="url(#g-kr-bronze)" stroke-width="1.8" stroke-linecap="round">
      <path d="M50 52 50 40M50 52 44 42M50 52 56 42M50 52 41 48M50 52 59 48M50 52 44 58M50 52 56 58"/>
    </g>
    <g fill="#f6e3b8">
      <circle cx="50" cy="39" r="1.7"/><circle cx="43.4" cy="41.2" r="1.7"/><circle cx="56.6" cy="41.2" r="1.7"/>
      <circle cx="40.2" cy="47.4" r="1.7"/><circle cx="59.8" cy="47.4" r="1.7"/>
      <circle cx="43.4" cy="58.8" r="1.7"/><circle cx="56.6" cy="58.8" r="1.7"/>
    </g>
    <circle cx="50" cy="52" r="5" fill="url(#g-kr-bronze)"/>
    <circle cx="50" cy="52" r="5" fill="url(#m-occl)" opacity="0.6"/>
  </symbol>

  <symbol id="sym-cheongja" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="24" ry="4" fill="url(#m-shadow)"/>
    <!-- 청자 매병: 어깨가 넓고 굽으로 갈수록 좁아지는 실루엣 -->
    <path d="M41 13h18c0 4-2 6-3 8 14 4 26 12 26 24 0 17-8 31-16 40H34c-8-9-16-23-16-40 0-12 12-20 26-24-1-2-3-4-3-8z"
          fill="url(#g-kr-jade)"/>
    <path d="M41 13h18c0 4-2 6-3 8 14 4 26 12 26 24 0 17-8 31-16 40H34c-8-9-16-23-16-40 0-12 12-20 26-24-1-2-3-4-3-8z"
          fill="url(#m-occl)"/>
    <!-- 유약이 흘러내린 세로 광택 -->
    <path d="M36 26c-8 6-14 12-14 21 0 13 4 24 10 32-4-10-6-21-6-32 0-9 4-15 10-21z" fill="#e2f4ec" opacity="0.45"/>
    <!-- 아가리 -->
    <rect x="38" y="10" width="24" height="5" rx="2.5" fill="url(#g-kr-jade)"/>
    <rect x="38" y="10" width="24" height="5" rx="2.5" fill="url(#m-occl)" opacity="0.6"/>
    <!-- 상감 문양: 어깨와 아래를 두른 띠 사이에 모란 덩굴을 새겼다 -->
    <g fill="none" stroke="#1d3830" stroke-width="2.2" stroke-linecap="round" opacity="0.5">
      <path d="M20 38Q50 47 80 38"/>
      <path d="M26 71Q50 78 74 71"/>
      <path d="M31 57C35 50 41 52 43 57"/>
      <path d="M69 57C65 50 59 52 57 57"/>
      <circle cx="50" cy="55" r="4.4"/>
    </g>
    <g fill="#1d3830" opacity="0.42">
      <circle cx="50" cy="47.5" r="2.6"/><circle cx="57.1" cy="52.7" r="2.6"/>
      <circle cx="54.4" cy="61.1" r="2.6"/><circle cx="45.6" cy="61.1" r="2.6"/>
      <circle cx="42.9" cy="52.7" r="2.6"/>
    </g>
    <!-- 굽 -->
    <path d="M33 84h34l-1.5 7h-31z" fill="url(#g-kr-jade)"/>
    <path d="M33 84h34l-1.5 7h-31z" fill="url(#m-occl)" opacity="0.75"/>
  </symbol>

  <symbol id="sym-crane" viewBox="0 0 100 100">
    <ellipse cx="46" cy="94" rx="24" ry="3.6" fill="url(#m-shadow)"/>
    <!-- 단정학: 검은 목이 흰 몸과 대비되고 정수리가 붉다 -->
    <path d="M28 52C16 54 8 62 8 72c10 2 20-4 26-14z" fill="#26303a"/>
    <path d="M28 52C16 54 8 62 8 72c10 2 20-4 26-14z" fill="url(#m-occl)" opacity="0.6"/>
    <ellipse cx="46" cy="58" rx="22" ry="16" fill="url(#g-kr-white)" transform="rotate(-10 46 58)"/>
    <ellipse cx="46" cy="58" rx="22" ry="16" fill="url(#m-occl)" opacity="0.55" transform="rotate(-10 46 58)"/>
    <path d="M32 50C42 47 56 51 62 60" fill="none" stroke="#a8b2bb" stroke-width="2" opacity="0.7" stroke-linecap="round"/>
    <path d="M58 52C66 44 68 33 67 25" fill="none" stroke="#26303a" stroke-width="9" stroke-linecap="round"/>
    <circle cx="69" cy="20" r="8.4" fill="url(#g-kr-white)"/>
    <circle cx="69" cy="20" r="8.4" fill="url(#m-occl)" opacity="0.4"/>
    <path d="M62 15c2-4 10-5 14-1-4 3-10 3-14 1z" fill="url(#g-kr-red)"/>
    <circle cx="72" cy="19" r="2.2" fill="#12161c"/>
    <path d="M77 19l16 3-16 3z" fill="url(#g-kr-bronze)"/>
    <g fill="none" stroke="#3a2a12" stroke-width="3" stroke-linecap="round">
      <path d="M42 72v10l-4 5"/>
      <path d="M52 72v10l4 5"/>
    </g>
  </symbol>

  <symbol id="sym-toad" viewBox="0 0 100 100">
    <ellipse cx="50" cy="91" rx="30" ry="5" fill="url(#m-shadow)"/>
    <!-- 두꺼비: 넓적한 초록 몸에 볼록한 눈, 입에 금 엽전을 물었다 -->
    <circle cx="31" cy="31" r="12" fill="url(#g-kr-green)"/>
    <circle cx="69" cy="31" r="12" fill="url(#g-kr-green)"/>
    <path d="M50 24C28 24 14 40 14 58c0 18 16 30 36 30s36-12 36-30c0-18-14-34-36-34z" fill="url(#g-kr-green)"/>
    <path d="M50 24C28 24 14 40 14 58c0 18 16 30 36 30s36-12 36-30c0-18-14-34-36-34z" fill="url(#m-occl)"/>
    <path d="M50 24C28 24 14 40 14 58c0 18 16 30 36 30s36-12 36-30c0-18-14-34-36-34z"
          fill="none" stroke="url(#m-key)" stroke-width="2.6"/>
    <ellipse cx="34" cy="46" rx="10" ry="6" fill="url(#m-sheen)" transform="rotate(-24 34 46)"/>
    <!-- 볼록한 눈 -->
    <circle cx="31" cy="31" r="12" fill="url(#m-occl)" opacity="0.45"/>
    <circle cx="69" cy="31" r="12" fill="url(#m-occl)" opacity="0.7"/>
    <circle cx="31" cy="31" r="12" fill="none" stroke="url(#m-key)" stroke-width="2.2"/>
    <circle cx="69" cy="31" r="12" fill="none" stroke="url(#m-key)" stroke-width="2.2"/>
    <ellipse cx="31" cy="30" rx="5" ry="5.6" fill="#0d1a10"/>
    <ellipse cx="69" cy="30" rx="5" ry="5.6" fill="#0d1a10"/>
    <circle cx="29" cy="28" r="1.8" fill="#dff3e2"/>
    <circle cx="67" cy="28" r="1.8" fill="#dff3e2"/>
    <!-- 등의 혹 -->
    <g fill="#0c2a16" opacity="0.3">
      <circle cx="38" cy="46" r="3.2"/><circle cx="62" cy="46" r="3.2"/><circle cx="50" cy="42" r="3.2"/>
      <circle cx="26" cy="58" r="2.8"/><circle cx="74" cy="58" r="2.8"/>
    </g>
    <!-- 입 -->
    <path d="M32 56C40 63 60 63 68 56" fill="none" stroke="#0c2a16" stroke-width="3.2" stroke-linecap="round"/>
    <!-- 입에 문 금 엽전. 초록 몸 위의 금이라 따로 읽힌다 -->
    <ellipse cx="50" cy="74" rx="15" ry="12" fill="url(#g-kr-bronze)"/>
    <ellipse cx="50" cy="74" rx="15" ry="12" fill="url(#m-occl)" opacity="0.5"/>
    <ellipse cx="50" cy="74" rx="15" ry="12" fill="none" stroke="#3d2a08" stroke-width="2.4"/>
    <ellipse cx="50" cy="74" rx="15" ry="12" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <rect x="45.5" y="69.5" width="9" height="9" rx="1" fill="#120b08"/>
  </symbol>

  <symbol id="sym-tiger" viewBox="0 0 100 100">
    <ellipse cx="50" cy="92" rx="30" ry="4.6" fill="url(#m-shadow)"/>
    <!-- 민화 호랑이: 귀가 크고 볼 털이 벌어진 정면 얼굴 -->
    <path d="M14 36C10 24 15 14 25 13c5 6 6 15 4 24z" fill="url(#g-kr-bronze)"/>
    <path d="M86 36C90 24 85 14 75 13c-5 6-6 15-4 24z" fill="url(#g-kr-bronze)"/>
    <path d="M14 36C10 24 15 14 25 13c5 6 6 15 4 24z" fill="url(#m-occl)" opacity="0.7"/>
    <path d="M86 36C90 24 85 14 75 13c-5 6-6 15-4 24z" fill="url(#m-occl)"/>
    <path d="M18 32c-2-8 1-14 7-15 3 4 3 10 2 15z" fill="#6b1616" opacity="0.6"/>
    <path d="M82 32c2-8-1-14-7-15-3 4-3 10-2 15z" fill="#6b1616" opacity="0.6"/>
    <path d="M50 20C36 20 24 28 20 40l-8 4 8 4-7 7 8 3-6 8h9c5 12 14 18 26 18s21-6 26-18h9l-6-8 8-3-7-7 8-4-8-4C76 28 64 20 50 20z"
          fill="url(#g-kr-bronze)"/>
    <path d="M50 20C36 20 24 28 20 40l-8 4 8 4-7 7 8 3-6 8h9c5 12 14 18 26 18s21-6 26-18h9l-6-8 8-3-7-7 8-4-8-4C76 28 64 20 50 20z"
          fill="url(#m-occl)" opacity="0.75"/>
    <path d="M50 20C36 20 24 28 20 40l-8 4 8 4-7 7 8 3-6 8h9c5 12 14 18 26 18s21-6 26-18h9l-6-8 8-3-7-7 8-4-8-4C76 28 64 20 50 20z"
          fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <!-- 이마와 볼의 검은 줄무늬 -->
    <g fill="#20150a" opacity="0.88">
      <path d="M44 23h4.4l1 19h-6.4z"/>
      <path d="M51.6 23H56l1 19h-6.4z"/>
      <path d="M36 26l4.4-1 3 16-5.4 1z"/>
      <path d="M64 26l-4.4-1-3 16 5.4 1z"/>
      <path d="M22 45c6 1 10 3 13 6l-2 4.6c-4-3-7-4.6-12-5.6z"/>
      <path d="M78 45c-6 1-10 3-13 6l2 4.6c4-3 7-4.6 12-5.6z"/>
      <path d="M23 57c6 0 10 1 13 3l-1 4.6c-4-2-7-2.6-12-2.6z"/>
      <path d="M77 57c-6 0-10 1-13 3l1 4.6c4-2 7-2.6 12-2.6z"/>
    </g>
    <!-- 주둥이. 밝은 면이라 코·이빨이 또렷하게 읽힌다 -->
    <ellipse cx="50" cy="70" rx="16" ry="11" fill="#fff4d8" opacity="0.92"/>
    <ellipse cx="50" cy="70" rx="16" ry="11" fill="url(#m-occl)" opacity="0.35"/>
    <!-- 눈 -->
    <path d="M30 48C34 42 44 42 47 48 43 54 33 54 30 48z" fill="#fff6d8"/>
    <path d="M70 48C66 42 56 42 53 48 57 54 67 54 70 48z" fill="#fff6d8"/>
    <circle cx="38.5" cy="48" r="3.6" fill="#140c04"/>
    <circle cx="61.5" cy="48" r="3.6" fill="#140c04"/>
    <circle cx="37.2" cy="46.6" r="1.2" fill="#fff"/>
    <circle cx="60.2" cy="46.6" r="1.2" fill="#fff"/>
    <g fill="none" stroke="#20150a" stroke-width="3" opacity="0.8" stroke-linecap="round">
      <path d="M29 43C33 38 44 38 48 43"/>
      <path d="M71 43C67 38 56 38 52 43"/>
    </g>
    <!-- 코 · 입 · 송곳니 -->
    <path d="M45 63h10l-5 6z" fill="#b02525"/>
    <g fill="none" stroke="#20150a" stroke-width="2.8" stroke-linecap="round">
      <path d="M50 69v3"/>
      <path d="M50 72C47 77 41 77 39 73"/>
      <path d="M50 72c3 5 9 5 11-1"/>
    </g>
    <path d="M42 75l2.4 7 2.4-7zM53.2 75l2.4 7 2.4-7z" fill="#fffdf2"/>
    <g fill="none" stroke="#fff4d8" stroke-width="1.4" opacity="0.45" stroke-linecap="round">
      <path d="M35 66l-11-3M35 70l-12 1M65 66l11-3M65 70l12 1"/>
    </g>
  </symbol>

  <symbol id="sym-pouch" viewBox="0 0 100 100">
    <ellipse cx="50" cy="93" rx="28" ry="4.6" fill="url(#m-shadow)"/>
    <!-- 복주머니(와일드): 조인 목 위로 천이 부풀고 아래는 둥글다 -->
    <path d="M35 34C37 24 43 19 50 19s13 5 15 15z" fill="url(#g-kr-red)"/>
    <path d="M35 34C37 24 43 19 50 19s13 5 15 15z" fill="url(#m-occl)"/>
    <!-- 조인 끈의 두 끝이 어깨를 타고 흘러내린다 -->
    <g fill="none" stroke="url(#g-kr-bronze)" stroke-width="3.2" stroke-linecap="round">
      <path d="M43 34C36 29 29 29 24 34"/>
      <path d="M57 34c7-5 14-5 19 0"/>
    </g>
    <circle cx="22" cy="36" r="3.6" fill="url(#g-kr-bronze)"/>
    <circle cx="78" cy="36" r="3.6" fill="url(#g-kr-bronze)"/>
    <path d="M36 40C24 47 16 58 16 68c0 14 15 24 34 24s34-10 34-24c0-10-8-21-20-28z" fill="url(#g-kr-red)"/>
    <path d="M36 40C24 47 16 58 16 68c0 14 15 24 34 24s34-10 34-24c0-10-8-21-20-28z" fill="url(#m-occl)"/>
    <path d="M36 40C24 47 16 58 16 68c0 14 15 24 34 24s34-10 34-24c0-10-8-21-20-28z"
          fill="none" stroke="url(#m-key)" stroke-width="2.6"/>
    <g fill="none" stroke="#4a0a0a" stroke-width="2" opacity="0.32">
      <path d="M31 48c-5 8-7 17-5 26"/>
      <path d="M69 48c5 8 7 17 5 26"/>
    </g>
    <ellipse cx="32" cy="56" rx="10" ry="13" fill="url(#m-sheen)" opacity="0.4" transform="rotate(-18 32 56)"/>
    <!-- 목을 조인 금띠 -->
    <rect x="31" y="33" width="38" height="11" rx="5.5" fill="url(#g-kr-bronze)"/>
    <rect x="31" y="33" width="38" height="11" rx="5.5" fill="url(#m-occl)" opacity="0.45"/>
    <rect x="34" y="35.4" width="32" height="3" rx="1.5" fill="#f6e3b8" opacity="0.6"/>
    <!-- 복(福) -->
    <circle cx="50" cy="66" r="17" fill="none" stroke="#f6e3b8" stroke-width="2.2" opacity="0.55"/>
    <g fill="#f6e3b8" opacity="0.92">
      <use href="#p-bok" transform="translate(41.36 53.76) scale(0.72)"/>
    </g>
  </symbol>

  <!-- ── 파라오의 문 심볼 (창작) ──
       캐비닛 심볼과 같은 광원·같은 조명 레이어를 쓴다. 릴에 섞여도 빛 방향이 어긋나지 않는다. -->

  <symbol id="sym-ankh" viewBox="0 0 100 100">
    <ellipse cx="50" cy="95" rx="20" ry="4" fill="url(#m-shadow)"/>
    <ellipse cx="50" cy="28" rx="17" ry="20" fill="none" stroke="url(#g-eg-gold)" stroke-width="11"/>
    <rect x="43" y="46" width="14" height="46" rx="4" fill="url(#g-eg-gold)"/>
    <rect x="21" y="52" width="58" height="13" rx="5" fill="url(#g-eg-gold)"/>
    <!-- 둥근 금속의 위쪽 반사와 아래쪽 어두움 -->
    <ellipse cx="50" cy="28" rx="17" ry="20" fill="none" stroke="url(#m-key)" stroke-width="3.4"/>
    <ellipse cx="50" cy="28" rx="17" ry="20" fill="none" stroke="url(#m-rim)" stroke-width="2.4"/>
    <rect x="43" y="46" width="14" height="46" rx="4" fill="url(#m-occl)"/>
    <rect x="21" y="52" width="58" height="13" rx="5" fill="url(#m-occl)"/>
    <!-- 좁은 스페큘러 -->
    <rect x="45" y="48" width="3.6" height="40" rx="1.8" fill="#fff8dc" opacity="0.62"/>
    <rect x="24" y="54" width="50" height="3.4" rx="1.7" fill="#fff8dc" opacity="0.55"/>
    <path d="M38 14c6-4 14-4 20 0" fill="none" stroke="#fff8dc" stroke-width="2.6" opacity="0.7" stroke-linecap="round"/>
  </symbol>

  <symbol id="sym-lotus" viewBox="0 0 100 100">
    <ellipse cx="50" cy="90" rx="28" ry="4.4" fill="url(#m-shadow)"/>
    <!-- 같은 꽃잎을 회전시켜 다섯 장을 만든다. 끝이 뾰족해야 잎이 아니라 꽃잎으로 읽힌다 -->
    <use href="#p-petal" fill="url(#g-eg-teal)" transform="translate(50 54) rotate(-60) scale(0.9)"/>
    <use href="#p-petal" fill="url(#g-eg-teal)" transform="translate(50 54) rotate(60) scale(0.9)"/>
    <use href="#p-petal" fill="url(#m-occl)" opacity="0.45" transform="translate(50 54) rotate(-60) scale(0.9)"/>
    <use href="#p-petal" fill="url(#m-occl)" transform="translate(50 54) rotate(60) scale(0.9)"/>
    <use href="#p-petal" fill="url(#g-eg-teal)" transform="translate(50 50) rotate(-30)"/>
    <use href="#p-petal" fill="url(#g-eg-teal)" transform="translate(50 50) rotate(30)"/>
    <use href="#p-petal" fill="url(#m-occl)" opacity="0.4" transform="translate(50 50) rotate(-30)"/>
    <use href="#p-petal" fill="url(#m-occl)" opacity="0.85" transform="translate(50 50) rotate(30)"/>
    <use href="#p-petal" fill="none" stroke="#07443f" stroke-width="1.6" opacity="0.4" transform="translate(50 50) rotate(-30)"/>
    <use href="#p-petal" fill="none" stroke="#07443f" stroke-width="1.6" opacity="0.4" transform="translate(50 50) rotate(30)"/>
    <!-- 가운데 꽃잎: 상아색으로 초점을 만든다. 너무 크면 꽃이 아니라 깃털로 읽힌다 -->
    <use href="#p-petal" fill="url(#g-eg-ivory)" transform="translate(50 48) scale(0.82)"/>
    <use href="#p-petal" fill="url(#m-occl)" opacity="0.5" transform="translate(50 48) scale(0.82)"/>
    <use href="#p-petal" fill="none" stroke="#6b5c3c" stroke-width="1.5" opacity="0.45" transform="translate(50 48) scale(0.82)"/>
    <!-- 오목한 느낌을 주는 안쪽 밝은 띠 -->
    <path d="M48 30c-2 8-3 17-2 25h3c-1-8 0-17 2-25z" fill="#fffdf2" opacity="0.6"/>
    <!-- 꽃받침과 받침대 -->
    <path d="M36 64c5 5 23 5 28 0-3 8-25 8-28 0z" fill="url(#g-eg-teal)"/>
    <rect x="23" y="70" width="54" height="11" rx="5.5" fill="url(#g-eg-gold)"/>
    <rect x="23" y="70" width="54" height="11" rx="5.5" fill="url(#m-occl)" opacity="0.6"/>
    <rect x="26" y="72" width="48" height="3.4" rx="1.7" fill="#fff8dc" opacity="0.6"/>
  </symbol>

  <symbol id="sym-papyrus" viewBox="0 0 100 100">
    <ellipse cx="50" cy="90" rx="34" ry="4.6" fill="url(#m-shadow)"/>
    <!-- 종이 -->
    <rect x="22" y="22" width="56" height="58" rx="3" fill="url(#g-eg-ivory)"/>
    <rect x="22" y="22" width="56" height="58" rx="3" fill="url(#m-occl)" opacity="0.7"/>
    <!-- 말린 자리는 그림자가 진다 -->
    <path d="M26 22h5v58h-5z" fill="#6b5c3c" opacity="0.28"/>
    <path d="M69 22h5v58h-5z" fill="#6b5c3c" opacity="0.28"/>
    <!-- 글줄 -->
    <g stroke="#6b5734" stroke-width="3.4" stroke-linecap="round" opacity="0.8">
      <path d="M34 36h32"/>
      <path d="M34 48h23"/>
      <path d="M34 59h32"/>
      <path d="M34 70h18"/>
    </g>
    <!-- 양쪽 두루마리 축: 원통이라 가운데가 밝고 위아래가 어둡다 -->
    <rect x="12" y="16" width="15" height="70" rx="7.5" fill="url(#g-eg-gold)"/>
    <rect x="73" y="16" width="15" height="70" rx="7.5" fill="url(#g-eg-gold)"/>
    <rect x="12" y="16" width="15" height="70" rx="7.5" fill="url(#m-occl)" opacity="0.55"/>
    <rect x="73" y="16" width="15" height="70" rx="7.5" fill="url(#m-occl)" opacity="0.55"/>
    <rect x="16" y="20" width="3.6" height="62" rx="1.8" fill="#fff8dc" opacity="0.62"/>
    <rect x="77" y="20" width="3.6" height="62" rx="1.8" fill="#fff8dc" opacity="0.5"/>
    <rect x="22" y="22" width="56" height="8" fill="#fffdf2" opacity="0.4"/>
  </symbol>

  <symbol id="sym-cobra" viewBox="0 0 100 100">
    <!-- 정면 후드는 어떻게 그려도 버섯으로 읽힌다(폭·비율을 세 번 바꿔 확인했다).
         옆모습이면 몸통과 후드가 갈려 뱀으로 읽힌다. -->
    <ellipse cx="34" cy="95" rx="26" ry="4" fill="url(#m-shadow)"/>
    <!-- 뒤로 펴진 후드 -->
    <path d="M58 16C43 13 30 21 26 34c4 13 18 19 32 15 7-5 7-28 0-33z" fill="url(#g-eg-teal)"/>
    <path d="M58 16C43 13 30 21 26 34c4 13 18 19 32 15 7-5 7-28 0-33z" fill="url(#m-occl)" opacity="0.7"/>
    <g fill="none" stroke="#07443f" stroke-width="1.6" opacity="0.45">
      <path d="M34 22c8-4 16-5 22-3"/>
      <path d="M30 32c9-4 18-5 26-3"/>
      <path d="M33 42c8-3 16-4 23-2"/>
    </g>
    <path d="M58 16C43 13 30 21 26 34c4 13 18 19 32 15 7-5 7-28 0-33z" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <!-- 몸통: 아래로 흐르는 S자 -->
    <path d="M52 48C50 63 40 73 28 79c-7 4-11 9-9 15" fill="none" stroke="url(#g-eg-teal)" stroke-width="17" stroke-linecap="round"/>
    <path d="M52 48C50 63 40 73 28 79c-7 4-11 9-9 15" fill="none" stroke="#07443f" stroke-width="17" stroke-linecap="round" opacity="0.22"/>
    <path d="M48 50C46 62 38 70 27 76" fill="none" stroke="#c8faf3" stroke-width="3.4" opacity="0.45" stroke-linecap="round"/>
    <!-- 머리: 오른쪽을 본다 -->
    <path d="M54 21c10-4 22 0 28 9-6 9-18 12-28 8-5-4-5-13 0-17z" fill="url(#g-eg-gold)"/>
    <path d="M54 21c10-4 22 0 28 9-6 9-18 12-28 8-5-4-5-13 0-17z" fill="url(#m-occl)" opacity="0.45"/>
    <path d="M58 23c8-2 16 1 21 6" fill="none" stroke="#fff8dc" stroke-width="2.4" opacity="0.62" stroke-linecap="round"/>
    <!-- 눈 -->
    <circle cx="67" cy="28" r="3.8" fill="#1a1208"/>
    <circle cx="65.7" cy="26.7" r="1.4" fill="#fffdf2"/>
    <!-- 입선과 갈라진 혀 -->
    <path d="M62 36c7 1 14-1 19-5" fill="none" stroke="#8a5c07" stroke-width="1.8" opacity="0.7"/>
    <path d="M82 31h8m0 0-5-3m5 3-5 4" fill="none" stroke="#c8432f" stroke-width="2.2" stroke-linecap="round"/>
  </symbol>

  <symbol id="sym-falcon" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="26" ry="4" fill="url(#m-shadow)"/>
    <!-- 오른쪽을 보는 옆모습. 두개골에서 목까지 한 덩어리로 잇는다 -->
    <path d="M38 88C29 70 30 47 42 35 51 26 66 23 76 30c4 3 5 7 3 11 4 2 7 6 6 10-2 6-10 9-18 7-3 10-5 20-6 30z" fill="url(#g-eg-lapis)"/>
    <path d="M38 88C29 70 30 47 42 35 51 26 66 23 76 30c4 3 5 7 3 11 4 2 7 6 6 10-2 6-10 9-18 7-3 10-5 20-6 30z" fill="url(#m-occl)" opacity="0.78"/>
    <!-- 정수리 깃 -->
    <path d="M45 33c5-6 13-9 22-8" fill="none" stroke="#9fc4f5" stroke-width="3.4" opacity="0.6" stroke-linecap="round"/>
    <!-- 갈고리 부리: 머리 안에서 시작해 끝이 아래로 휜다 -->
    <path d="M74 29c9 1 18 6 23 12-7 4-16 4-24 0z" fill="url(#g-eg-gold)"/>
    <path d="M97 41c-1 6-6 10-12 9l-2-7z" fill="url(#g-eg-gold)"/>
    <path d="M74 29c9 1 18 6 23 12-7 4-16 4-24 0z" fill="url(#m-occl)" opacity="0.35"/>
    <path d="M77 32c7 1 13 4 17 8" fill="none" stroke="#fff8dc" stroke-width="1.8" opacity="0.6"/>
    <!-- 눈과 호루스 눈매 -->
    <circle cx="61" cy="38" r="7.6" fill="url(#g-eg-gold)"/>
    <circle cx="61" cy="38" r="3.4" fill="#1a1208"/>
    <circle cx="59.4" cy="36.4" r="1.3" fill="#fffdf2"/>
    <path d="M50 31c4-4 12-5 18-2" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M54 47c5 2 10 1 14-2" fill="none" stroke="url(#g-eg-gold)" stroke-width="2.6" stroke-linecap="round"/>
    <!-- 목 깃 선 -->
    <path d="M44 62c7 3 14 3 20 0" fill="none" stroke="url(#g-eg-gold)" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>
    <path d="M43 70c7 3 15 3 21 0" fill="none" stroke="url(#g-eg-gold)" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
    <!-- 목걸이 받침 -->
    <path d="M32 86h38l-5 12H37z" fill="url(#g-eg-gold)"/>
    <path d="M34 88h34l-1 3H35z" fill="#fff8dc" opacity="0.5"/>
  </symbol>

  <symbol id="sym-scarab" viewBox="0 0 100 100">
    <ellipse cx="50" cy="95" rx="30" ry="4.4" fill="url(#m-shadow)"/>
    <!-- 다리 6개: 끝으로 갈수록 얇아진다 -->
    <g stroke="url(#g-eg-gold)" fill="none" stroke-linecap="round">
      <path d="M30 40C22 36 14 34 7 36" stroke-width="5"/>
      <path d="M70 40C78 36 86 34 93 36" stroke-width="5"/>
      <path d="M26 58C17 58 10 61 5 66" stroke-width="5"/>
      <path d="M74 58C83 58 90 61 95 66" stroke-width="5"/>
      <path d="M30 76C23 79 17 84 14 91" stroke-width="4.4"/>
      <path d="M70 76C77 79 83 84 86 91" stroke-width="4.4"/>
    </g>
    <!-- 앞가슴 방패 -->
    <path d="M50 20c-9 0-17 3-23 9l-3 13h52l-3-13c-6-6-14-9-23-9z" fill="url(#g-eg-gold)"/>
    <path d="M50 20c-9 0-17 3-23 9l-3 13h52l-3-13c-6-6-14-9-23-9z" fill="url(#m-occl)" opacity="0.5"/>
    <path d="M32 27c10-5 26-5 36 0" fill="none" stroke="#fff8dc" stroke-width="2.4" opacity="0.6"/>
    <!-- 등판(겉날개) 좌우: 밝고 어두움이 갈린다 -->
    <path d="M50 42H24c-4 14-2 30 6 42 5 6 13 10 20 10z" fill="url(#g-eg-teal)"/>
    <path d="M50 42h26c4 14 2 30-6 42-5 6-13 10-20 10z" fill="url(#g-eg-teal)"/>
    <path d="M50 42h26c4 14 2 30-6 42-5 6-13 10-20 10z" fill="url(#m-occl)"/>
    <path d="M50 42H24c-4 14-2 30 6 42 5 6 13 10 20 10z" fill="url(#m-occl)" opacity="0.35"/>
    <!-- 가운데 이음선 -->
    <rect x="47.6" y="42" width="4.8" height="52" rx="2.4" fill="url(#g-eg-gold)"/>
    <rect x="48.4" y="44" width="1.8" height="46" rx="0.9" fill="#fff8dc" opacity="0.55"/>
    <!-- 등판 광택 -->
    <ellipse cx="36" cy="56" rx="8" ry="11" fill="#c8faf3" opacity="0.4" transform="rotate(-16 36 56)"/>
    <!-- 겉날개 결 -->
    <path d="M32 52c-2 12-1 24 4 32M68 52c2 12 1 24-4 32" fill="none" stroke="#07443f" stroke-width="1.4" opacity="0.4"/>
  </symbol>

  <symbol id="sym-mask" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="26" ry="4" fill="url(#m-shadow)"/>
    <!-- 네메스 머리쓰개 -->
    <use href="#p-nemes" fill="url(#g-eg-lapis)"/>
    <use href="#p-nemes" fill="url(#m-occl)" opacity="0.7"/>
    <!-- 좌우로 늘어뜨린 천의 금띠. 머리쓰개 안쪽에만 들어간다 -->
    <g fill="url(#g-eg-gold)">
      <rect x="18" y="39" width="10" height="5" rx="2.5"/>
      <rect x="17" y="49" width="11" height="5" rx="2.5"/>
      <rect x="16" y="59" width="12" height="5" rx="2.5"/>
      <rect x="72" y="39" width="10" height="5" rx="2.5"/>
      <rect x="72" y="49" width="11" height="5" rx="2.5"/>
      <rect x="72" y="59" width="12" height="5" rx="2.5"/>
    </g>
    <!-- 이마 띠 -->
    <path d="M30 20h40l3 10H27z" fill="url(#g-eg-red)"/>
    <path d="M30 20h40l1.4 4H28.6z" fill="#ffc2ad" opacity="0.6"/>
    <!-- 얼굴: 폭이 넓고 턱으로 갈수록 좁아진다 -->
    <path d="M50 28c12 0 20 6 20 16 0 8-1 16-4 22-3 7-9 11-16 11s-13-4-16-11c-3-6-4-14-4-22 0-10 8-16 20-16z" fill="url(#g-eg-gold)"/>
    <path d="M50 28c12 0 20 6 20 16 0 8-1 16-4 22-3 7-9 11-16 11s-13-4-16-11c-3-6-4-14-4-22 0-10 8-16 20-16z" fill="url(#m-occl)" opacity="0.5"/>
    <path d="M36 34c-3 4-4 7-4 11 0 9 1 17 4 23 2 5 5 8 9 10-7-1-12-5-15-11-3-6-4-14-4-22 0-5 3-9 10-11z" fill="#fff8dc" opacity="0.45"/>
    <!-- 눈썹 -->
    <path d="M36 44c3-3 9-3 12 0M52 44c3-3 9-3 12 0" fill="none" stroke="#1a2a4a" stroke-width="3" stroke-linecap="round"/>
    <!-- 눈: 아몬드 + 눈꼬리 선 -->
    <path d="M36 51c3-4 10-4 13 0-3 4-10 4-13 0z" fill="#fffdf2"/>
    <path d="M51 51c3-4 10-4 13 0-3 4-10 4-13 0z" fill="#fffdf2"/>
    <circle cx="42.5" cy="51" r="2.8" fill="#1a1208"/>
    <circle cx="57.5" cy="51" r="2.8" fill="#1a1208"/>
    <path d="M49 50h5M46 50h-5" fill="none" stroke="#1a2a4a" stroke-width="1.6" stroke-linecap="round"/>
    <!-- 코와 입 -->
    <path d="M48 56h4l2 8h-8z" fill="#8a5c07" opacity="0.38"/>
    <path d="M44 68c4 2 8 2 12 0" fill="none" stroke="#8a5c07" stroke-width="2.8" stroke-linecap="round"/>
    <!-- 가짜 수염: 아래로 갈수록 살짝 넓어진다 -->
    <path d="M44 78h12l-1 8-2 10h-6l-2-10z" fill="url(#g-eg-lapis)"/>
    <path d="M44 78h12l-0.4 4H44.4z" fill="url(#g-eg-gold)" opacity="0.85"/>
    <path d="M46.6 84h6.8l-1.4 12h-4z" fill="#0c1e3f" opacity="0.32"/>
  </symbol>

  <symbol id="sym-eye" viewBox="0 0 100 100">
    <ellipse cx="46" cy="94" rx="26" ry="4" fill="url(#m-shadow)"/>
    <!-- 흰자 -->
    <path d="M12 40c14-14 30-20 46-20 12 0 22 4 30 11-10 12-26 21-44 21-12 0-23-4-32-12z" fill="url(#g-eg-ivory)"/>
    <path d="M12 40c14-14 30-20 46-20 12 0 22 4 30 11-10 12-26 21-44 21-12 0-23-4-32-12z" fill="url(#m-occl)" opacity="0.6"/>
    <!-- 눈동자 -->
    <circle cx="46" cy="40" r="11" fill="#1a1208"/>
    <circle cx="42.4" cy="36.4" r="3.4" fill="#fffdf2" opacity="0.85"/>
    <!-- 위쪽 눈매: 굵은 금선 -->
    <path d="M10 30c16-16 36-22 56-20 10 1 18 4 24 9" fill="none" stroke="url(#g-eg-gold)" stroke-width="9" stroke-linecap="round"/>
    <path d="M14 29c14-13 32-18 50-16" fill="none" stroke="#fff8dc" stroke-width="2.6" opacity="0.6" stroke-linecap="round"/>
    <!-- 아래 장식 두 갈래 -->
    <path d="M40 54l-6 30h12l4-28z" fill="url(#g-eg-gold)"/>
    <path d="M40 54l-6 30h12l4-28z" fill="url(#m-occl)" opacity="0.5"/>
    <path d="M41 56l-4 26h3l3-25z" fill="#fff8dc" opacity="0.45"/>
    <path d="M60 54c10 2 18 10 18 22 0 6-4 10-10 10s-11-5-11-11c0-5 3-8 7-9" fill="none" stroke="url(#g-eg-gold)" stroke-width="9" stroke-linecap="round"/>
    <path d="M62 57c7 3 13 9 13 19" fill="none" stroke="#fff8dc" stroke-width="2.2" opacity="0.5" stroke-linecap="round"/>
  </symbol>

  <symbol id="sym-obelisk" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="28" ry="4" fill="url(#m-shadow)"/>
    <!-- 피라미디온(금박 꼭대기) -->
    <path d="M50 6 63 27H37z" fill="url(#g-eg-gold)"/>
    <path d="M50 6 56 27h-6z" fill="#3a2404" opacity="0.32"/>
    <path d="M50 6 44 27h6z" fill="#fff8dc" opacity="0.5"/>
    <!-- 기둥: 네 면 중 두 면이 보이므로 밝은 면과 어두운 면이 갈린다 -->
    <path d="M37 27h26l5 61H32z" fill="url(#g-eg-stone)"/>
    <path d="M50 27h13l5 61H50z" fill="#3f331b" opacity="0.3"/>
    <path d="M37 27h6l-4 61h-7z" fill="#fffdf2" opacity="0.3"/>
    <!-- 새긴 글자 -->
    <g stroke="#3f331b" stroke-width="3" stroke-linecap="round" opacity="0.7">
      <path d="M44 38h12"/>
      <path d="M44 50h12"/>
      <path d="M44 62h12"/>
      <path d="M44 74h12"/>
    </g>
    <g stroke="#fffdf2" stroke-width="1.2" stroke-linecap="round" opacity="0.35">
      <path d="M44 36.4h12"/>
      <path d="M44 48.4h12"/>
      <path d="M44 60.4h12"/>
      <path d="M44 72.4h12"/>
    </g>
    <!-- 받침 -->
    <rect x="26" y="88" width="48" height="10" rx="3" fill="url(#g-eg-gold)"/>
    <rect x="26" y="88" width="48" height="10" rx="3" fill="url(#m-occl)" opacity="0.5"/>
    <rect x="29" y="89.6" width="42" height="3" rx="1.5" fill="#fff8dc" opacity="0.6"/>
  </symbol>

  <!-- ── 용문 11종 중 새로 그린 8종 (저배당 5종은 파라오와 공유) ── -->

  <symbol id="sym-shell" viewBox="0 0 100 100">
    <ellipse cx="50" cy="90" rx="28" ry="4.2" fill="url(#m-shadow)"/>
    <use href="#p-shell" fill="url(#g-dg-shell)"/>
    <use href="#p-shell" fill="url(#m-occl)" opacity="0.62"/>
    <!-- 부챗살. 경첩에서 퍼져 나가야 조개로 읽힌다 -->
    <g stroke="#6b4338" stroke-width="2.4" stroke-linecap="round" opacity="0.5" fill="none">
      <path d="M49 80 13 41"/>
      <path d="M49 80 24 21"/>
      <path d="M49 80 38 11"/>
      <path d="M50 80 51 10"/>
      <path d="M51 80 63 12"/>
      <path d="M51 80 77 23"/>
      <path d="M51 80 88 43"/>
    </g>
    <g stroke="#fffaf2" stroke-width="1.1" stroke-linecap="round" opacity="0.42" fill="none">
      <path d="M47 79 11 40"/>
      <path d="M47 79 22 20"/>
      <path d="M47 79 36 10"/>
      <path d="M48 79 49 9"/>
    </g>
    <ellipse cx="34" cy="34" rx="16" ry="11" fill="url(#m-sheen)" opacity="0.7" transform="rotate(-32 34 34)"/>
    <use href="#p-shell" fill="none" stroke="url(#m-key)" stroke-width="2.6"/>
    <use href="#p-shell" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <!-- 경첩 -->
    <path d="M41 79h18l-3 11H44z" fill="url(#g-kr-bronze)"/>
    <path d="M41 79h18l-0.6 3H41.6z" fill="#fffaf2" opacity="0.55"/>
  </symbol>

  <symbol id="sym-minnow" viewBox="0 0 100 100">
    <ellipse cx="50" cy="90" rx="27" ry="4" fill="url(#m-shadow)"/>
    <!-- 붕어: 머리가 오른쪽인 가로 자세. 세로로 뛰는 잉어와 실루엣이 갈린다 -->
    <path d="M22 50 6 30c-3 13-3 27 0 40z" fill="url(#g-dg-water)"/>
    <path d="M22 50 6 30c-3 13-3 27 0 40z" fill="url(#m-occl)" opacity="0.5"/>
    <path d="M40 34 46 17 62 24l2 12z" fill="url(#g-dg-water)"/>
    <path d="M40 34 46 17 62 24l2 12z" fill="url(#m-occl)" opacity="0.55"/>
    <path d="M52 64 48 80 66 74l-2-10z" fill="url(#g-dg-water)"/>
    <path d="M52 64 48 80 66 74l-2-10z" fill="url(#m-occl)" opacity="0.6"/>
    <path d="M88 50C81 34 66 26 50 26 35 26 25 34 20 50c5 16 15 24 30 24 16 0 31-8 38-24z"
          fill="url(#g-kr-white)"/>
    <path d="M88 50C81 34 66 26 50 26 35 26 25 34 20 50c5 16 15 24 30 24 16 0 31-8 38-24z"
          fill="url(#g-dg-water)" opacity="0.5"/>
    <path d="M88 50C81 34 66 26 50 26 35 26 25 34 20 50c5 16 15 24 30 24 16 0 31-8 38-24z"
          fill="url(#m-occl)" opacity="0.55"/>
    <!-- 비늘 두 줄 -->
    <g fill="none" stroke="#5f6a73" stroke-width="1.8" opacity="0.42" stroke-linecap="round">
      <path d="M38 38c4 4 4 20 0 24"/>
      <path d="M48 36c4 5 4 24 0 29"/>
      <path d="M58 36c4 5 4 24 0 29"/>
      <path d="M68 38c4 4 4 20 0 24"/>
    </g>
    <ellipse cx="42" cy="40" rx="12" ry="5" fill="url(#m-sheen)" opacity="0.6" transform="rotate(-14 42 40)"/>
    <path d="M88 50C81 34 66 26 50 26 35 26 25 34 20 50c5 16 15 24 30 24 16 0 31-8 38-24z"
          fill="none" stroke="url(#m-key)" stroke-width="2.2"/>
    <!-- 아가미 -->
    <path d="M74 31C69 39 69 61 74 69" fill="none" stroke="#5f6a73" stroke-width="2.4" opacity="0.6" stroke-linecap="round"/>
    <circle cx="80" cy="44" r="5" fill="#101820"/>
    <circle cx="78.4" cy="42.4" r="1.7" fill="#eaf4fa"/>
    <path d="M88 52c3 0 5 1 6 3" fill="none" stroke="#101820" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>
  </symbol>

  <symbol id="sym-crayfish" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="27" ry="4" fill="url(#m-shadow)"/>
    <!-- 가재: 위에서 본 자세. 집게 두 개가 위로 벌어져 실루엣이 확실하다 -->
    <g fill="none" stroke="#3d1207" stroke-width="2.2" stroke-linecap="round" opacity="0.8">
      <path d="M43 32C36 20 26 11 14 7"/>
      <path d="M57 32C64 20 74 11 86 7"/>
    </g>
    <!-- 집게 팔 -->
    <g stroke="url(#g-dg-crust)" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M38 46 24 36"/>
      <path d="M62 46 76 36"/>
    </g>
    <!-- 집게발: 두 갈래가 벌어져 있다 -->
    <path d="M24 36c-8-3-16 0-18 7 2 6 9 8 15 5z" fill="url(#g-dg-crust)"/>
    <path d="M24 36c-6-7-14-9-19-5 0 6 5 11 12 12z" fill="url(#g-dg-crust)"/>
    <path d="M76 36c8-3 16 0 18 7-2 6-9 8-15 5z" fill="url(#g-dg-crust)"/>
    <path d="M76 36c6-7 14-9 19-5 0 6-5 11-12 12z" fill="url(#g-dg-crust)"/>
    <g fill="url(#m-occl)" opacity="0.5">
      <path d="M24 36c-8-3-16 0-18 7 2 6 9 8 15 5z"/>
      <path d="M76 36c8-3 16 0 18 7-2 6-9 8-15 5z"/>
    </g>
    <!-- 다리 세 쌍 -->
    <g stroke="url(#g-dg-crust)" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M36 58 20 62"/><path d="M64 58 80 62"/>
      <path d="M37 68 22 76"/><path d="M63 68 78 76"/>
      <path d="M39 76 28 87"/><path d="M61 76 72 87"/>
    </g>
    <!-- 머리가슴 -->
    <path d="M50 26c-11 0-17 8-17 19l3 13h28l3-13c0-11-6-19-17-19z" fill="url(#g-dg-crust)"/>
    <path d="M50 26c-11 0-17 8-17 19l3 13h28l3-13c0-11-6-19-17-19z" fill="url(#m-occl)" opacity="0.55"/>
    <path d="M50 26c-11 0-17 8-17 19l3 13h28l3-13c0-11-6-19-17-19z" fill="none" stroke="url(#m-key)" stroke-width="2.2"/>
    <!-- 배 마디 -->
    <g fill="url(#g-dg-crust)" stroke="#3d1207" stroke-width="1.4">
      <path d="M37 58h26l-1.4 8H38.4z"/>
      <path d="M38.4 66h23.2l-1.4 8H39.8z"/>
      <path d="M39.8 74h20.4l-1.4 8H41.2z"/>
    </g>
    <!-- 꼬리 부채 -->
    <path d="M41 82h18l10 15c-8 3-12-1-19-1s-11 4-19 1z" fill="url(#g-dg-crust)"/>
    <path d="M41 82h18l10 15c-8 3-12-1-19-1s-11 4-19 1z" fill="url(#m-occl)" opacity="0.5"/>
    <g stroke="#3d1207" stroke-width="1.4" opacity="0.6" fill="none">
      <path d="M46 84 42 96"/><path d="M50 84v13"/><path d="M54 84 58 96"/>
    </g>
    <ellipse cx="42" cy="38" rx="7" ry="5" fill="url(#m-sheen)" opacity="0.65" transform="rotate(-24 42 38)"/>
    <circle cx="43" cy="33" r="3.6" fill="#1a0704"/>
    <circle cx="57" cy="33" r="3.6" fill="#1a0704"/>
    <circle cx="42" cy="32" r="1.3" fill="#ffd7c2"/>
    <circle cx="56" cy="32" r="1.3" fill="#ffd7c2"/>
  </symbol>

  <symbol id="sym-turtle" viewBox="0 0 100 100">
    <ellipse cx="50" cy="92" rx="29" ry="4.2" fill="url(#m-shadow)"/>
    <!-- 자라: 위에서 본 자세. 네 발과 꼬리가 등딱지 밖으로 나온다 -->
    <g fill="url(#g-kr-green)">
      <ellipse cx="24" cy="36" rx="10" ry="7" transform="rotate(-38 24 36)"/>
      <ellipse cx="76" cy="36" rx="10" ry="7" transform="rotate(38 76 36)"/>
      <ellipse cx="25" cy="74" rx="10" ry="7" transform="rotate(34 25 74)"/>
      <ellipse cx="75" cy="74" rx="10" ry="7" transform="rotate(-34 75 74)"/>
      <path d="M50 78c3 0 5 6 3 12-2 3-4 3-6 0-2-6 0-12 3-12z"/>
    </g>
    <g fill="url(#m-occl)" opacity="0.55">
      <ellipse cx="24" cy="36" rx="10" ry="7" transform="rotate(-38 24 36)"/>
      <ellipse cx="76" cy="36" rx="10" ry="7" transform="rotate(38 76 36)"/>
      <ellipse cx="25" cy="74" rx="10" ry="7" transform="rotate(34 25 74)"/>
      <ellipse cx="75" cy="74" rx="10" ry="7" transform="rotate(-34 75 74)"/>
    </g>
    <!-- 목과 머리 -->
    <path d="M44 32h12v10H44z" fill="url(#g-kr-green)"/>
    <ellipse cx="50" cy="20" rx="11" ry="10" fill="url(#g-kr-green)"/>
    <ellipse cx="50" cy="20" rx="11" ry="10" fill="url(#m-occl)" opacity="0.45"/>
    <ellipse cx="50" cy="20" rx="11" ry="10" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <circle cx="45" cy="18" r="2.6" fill="#0d1a10"/>
    <circle cx="55" cy="18" r="2.6" fill="#0d1a10"/>
    <path d="M45 26c3 2 7 2 10 0" fill="none" stroke="#0d1a10" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
    <!-- 등딱지 -->
    <use href="#p-carapace" fill="url(#g-kr-jade)"/>
    <use href="#p-carapace" fill="url(#m-occl)" opacity="0.6"/>
    <!-- 육각 무늬. 가운데 한 칸과 둘레 여섯 칸 -->
    <g fill="none" stroke="#1d3830" stroke-width="2.2" opacity="0.55">
      <path d="M50 44 60 50v12L50 68 40 62V50z"/>
      <path d="M50 44 44 36h12z"/>
      <path d="M60 50 70 44l2 10z"/>
      <path d="M60 62 72 66l-8 8z"/>
      <path d="M50 68 56 76H44z"/>
      <path d="M40 62 28 66l8 8z"/>
      <path d="M40 50 30 44l-2 10z"/>
    </g>
    <use href="#p-carapace" fill="none" stroke="url(#g-kr-bronze)" stroke-width="3.4"/>
    <use href="#p-carapace" fill="none" stroke="url(#m-key)" stroke-width="2.2"/>
    <ellipse cx="36" cy="44" rx="14" ry="8" fill="url(#m-sheen)" opacity="0.55" transform="rotate(-24 36 44)"/>
  </symbol>

  <symbol id="sym-carp" viewBox="0 0 100 100">
    <ellipse cx="46" cy="95" rx="26" ry="3.6" fill="url(#m-shadow)"/>
    <!-- 잉어: 용문을 뛰어오르는 측면 자세 (어변성룡) -->
    <!-- 꼬리지느러미 두 갈래 -->
    <path d="M31 73C25 81 19 91 17 99c9-2 16-9 20-18z" fill="url(#g-dg-koi)"/>
    <path d="M29 71C20 73 9 78 3 84c8 4 19 2 27-5z" fill="url(#g-dg-koi)"/>
    <g fill="url(#m-occl)" opacity="0.5">
      <path d="M31 73C25 81 19 91 17 99c9-2 16-9 20-18z"/>
      <path d="M29 71C20 73 9 78 3 84c8 4 19 2 27-5z"/>
    </g>
    <g stroke="#5c1405" stroke-width="1.5" opacity="0.5" fill="none">
      <path d="M30 76 24 92"/><path d="M34 78 32 95"/>
      <path d="M26 74 12 80"/><path d="M27 78 16 83"/>
    </g>
    <!-- 등지느러미 -->
    <path d="M56 21C51 11 44 5 35 3c0 10 5 20 14 28z" fill="url(#g-dg-koi)"/>
    <path d="M56 21C51 11 44 5 35 3c0 10 5 20 14 28z" fill="url(#m-occl)" opacity="0.55"/>
    <!-- 배지느러미 -->
    <path d="M60 46c5 10 5 20 1 29-7-6-10-16-8-25z" fill="url(#g-dg-koi)"/>
    <path d="M60 46c5 10 5 20 1 29-7-6-10-16-8-25z" fill="url(#m-occl)" opacity="0.6"/>
    <!-- 몸통 -->
    <use href="#p-koi" fill="url(#g-dg-koi)"/>
    <use href="#p-koi" fill="url(#m-occl)" opacity="0.45"/>
    <!-- 배는 흰 홍백무늬다 -->
    <path d="M78 18C64 20 54 30 46 44 39 55 34 65 31 74c10-4 21-14 31-28 9-13 15-22 16-28z"
          fill="#fff6ea" opacity="0.42"/>
    <!-- 비늘 -->
    <g fill="none" stroke="#7d2408" stroke-width="1.8" opacity="0.4" stroke-linecap="round">
      <path d="M66 20c-2 8-8 16-16 22"/>
      <path d="M56 30c-2 8-8 16-16 22"/>
      <path d="M47 42c-2 7-7 14-13 19"/>
      <path d="M40 55c-1 6-5 11-9 15"/>
    </g>
    <ellipse cx="60" cy="30" rx="16" ry="6" fill="url(#m-sheen)" opacity="0.55" transform="rotate(-48 60 30)"/>
    <use href="#p-koi" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <use href="#p-koi" fill="none" stroke="url(#m-rim)" stroke-width="1.8"/>
    <!-- 아가미 -->
    <path d="M74 19C68 24 66 32 68 38" fill="none" stroke="#7d2408" stroke-width="2.2" opacity="0.6" stroke-linecap="round"/>
    <!-- 수염. 잉어와 붕어를 가르는 표시다 -->
    <g fill="none" stroke="#7d2408" stroke-width="2.2" stroke-linecap="round">
      <path d="M85 17C90 22 94 24 99 24"/>
      <path d="M83 20C86 27 87 32 86 38"/>
    </g>
    <!-- 측면이라 눈은 하나다 -->
    <circle cx="78" cy="22" r="4.6" fill="#1c0a03"/>
    <circle cx="76.4" cy="20.4" r="1.7" fill="#ffe9d4"/>
    <path d="M86 14c3 1 5 3 6 6" fill="none" stroke="#5c1405" stroke-width="2.4" stroke-linecap="round"/>
  </symbol>

  <symbol id="sym-dragon" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4.4" fill="url(#m-shadow)"/>
    <!-- 용: 기와 용면(龍面)처럼 정면을 본다. 갈기 고리 · 뿔 · 수염 · 송곳니가 다 보인다 -->
    <!-- 갈기 고리. 아래(턱 쪽)만 비워 둔다 -->
    <g transform="translate(50 52)" fill="url(#g-kr-bronze)">
      <use href="#p-mane-spike" transform="rotate(-150)"/>
      <use href="#p-mane-spike" transform="rotate(-120)"/>
      <use href="#p-mane-spike" transform="rotate(-90)"/>
      <use href="#p-mane-spike" transform="rotate(-60)"/>
      <use href="#p-mane-spike" transform="rotate(60)"/>
      <use href="#p-mane-spike" transform="rotate(90)"/>
      <use href="#p-mane-spike" transform="rotate(120)"/>
      <use href="#p-mane-spike" transform="rotate(150)"/>
    </g>
    <g transform="translate(50 52)" fill="url(#m-occl)" opacity="0.5">
      <use href="#p-mane-spike" transform="rotate(60)"/>
      <use href="#p-mane-spike" transform="rotate(90)"/>
      <use href="#p-mane-spike" transform="rotate(120)"/>
      <use href="#p-mane-spike" transform="rotate(150)"/>
    </g>
    <!-- 뿔. 사슴뿔처럼 가지가 갈라진다 -->
    <path d="M37 26C30 18 27 10 28 2c5 3 9 8 11 14 2-4 2-8 1-12 4 4 6 10 6 18z" fill="url(#g-kr-bronze)"/>
    <path d="M63 26C70 18 73 10 72 2c-5 3-9 8-11 14-2-4-2-8-1-12-4 4-6 10-6 18z" fill="url(#g-kr-bronze)"/>
    <path d="M37 26C30 18 27 10 28 2c5 3 9 8 11 14 2-4 2-8 1-12 4 4 6 10 6 18z" fill="url(#m-occl)" opacity="0.45"/>
    <path d="M63 26C70 18 73 10 72 2c-5 3-9 8-11 14-2-4-2-8-1-12-4 4-6 10-6 18z" fill="url(#m-occl)"/>
    <path d="M37 26C30 18 27 10 28 2c5 3 9 8 11 14 2-4 2-8 1-12 4 4 6 10 6 18z"
          fill="none" stroke="#3d2a08" stroke-width="1.8"/>
    <path d="M63 26C70 18 73 10 72 2c-5 3-9 8-11 14-2-4-2-8-1-12-4 4-6 10-6 18z"
          fill="none" stroke="#3d2a08" stroke-width="1.8"/>
    <!-- 머리 -->
    <use href="#p-dragon-head" fill="url(#g-dg-scale)"/>
    <use href="#p-dragon-head" fill="url(#m-occl)" opacity="0.6"/>
    <!-- 이마 비늘 -->
    <g fill="none" stroke="#062824" stroke-width="1.8" opacity="0.45">
      <path d="M34 33c5-4 11-4 16 0 5-4 11-4 16 0"/>
      <path d="M32 41c6-4 12-4 18 0 6-4 12-4 18 0"/>
    </g>
    <ellipse cx="38" cy="35" rx="11" ry="7" fill="url(#m-sheen)" opacity="0.6" transform="rotate(-24 38 35)"/>
    <use href="#p-dragon-head" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <!-- 눈: 금테 안에 붉은 눈동자 -->
    <path d="M27 51c4-7 13-7 17 0-4 7-13 7-17 0z" fill="#fff6d8"/>
    <path d="M73 51c-4-7-13-7-17 0 4 7 13 7 17 0z" fill="#fff6d8"/>
    <ellipse cx="35.5" cy="51" rx="4" ry="5" fill="#ef5a22"/>
    <ellipse cx="64.5" cy="51" rx="4" ry="5" fill="#ef5a22"/>
    <path d="M35.5 46v10" stroke="#1c0a03" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M64.5 46v10" stroke="#1c0a03" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M26 50c5-8 14-8 19 0" fill="none" stroke="url(#g-kr-bronze)" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M74 50c-5-8-14-8-19 0" fill="none" stroke="url(#g-kr-bronze)" stroke-width="3.4" stroke-linecap="round"/>
    <!-- 주둥이 -->
    <path d="M34 62h32c0 7-3 12-8 14H42c-5-2-8-7-8-14z" fill="#e8fff4" opacity="0.55"/>
    <path d="M42 60c0-3 2-5 4-4 2-1 4 1 4 4z" fill="#062824" opacity="0.7"/>
    <path d="M50 60c0-3 2-5 4-4 2-1 4 1 4 4z" fill="#062824" opacity="0.7"/>
    <!-- 벌린 입. 안이 어두워야 송곳니가 읽힌다 -->
    <path d="M36 70h28c-2 8-8 13-14 13s-12-5-14-13z" fill="#1a0f06"/>
    <g fill="#fff6d8">
      <path d="M37 70h5.4l-2.4 8z"/>
      <path d="M57.6 70H63l-3 8z"/>
      <path d="M46 70h8l-1 10h-6z"/>
      <path d="M40 83h4.6l-1 -5h-2.6z"/>
      <path d="M55.4 83H60l-1.6-5h-2.6z"/>
    </g>
    <!-- 수염 -->
    <g fill="none" stroke="#fff6d8" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
      <path d="M34 72C25 82 15 88 5 90"/>
      <path d="M66 72C75 82 85 88 95 90"/>
    </g>
  </symbol>

  <symbol id="sym-orb" viewBox="0 0 100 100">
    <!-- 여의주(와일드): 서기(瑞氣)와 불꽃이 감싼 구슬 -->
    <circle cx="50" cy="50" r="48" fill="url(#g-dg-aura)"/>
    <!-- 불꽃 고리. 한 가닥을 돌려 여덟 방향에 둔다 -->
    <g transform="translate(50 51)" fill="url(#g-dg-koi)" opacity="0.92">
      <use href="#p-orb-flame"/>
      <use href="#p-orb-flame" transform="rotate(45)"/>
      <use href="#p-orb-flame" transform="rotate(90)"/>
      <use href="#p-orb-flame" transform="rotate(135)"/>
      <use href="#p-orb-flame" transform="rotate(180)"/>
      <use href="#p-orb-flame" transform="rotate(225)"/>
      <use href="#p-orb-flame" transform="rotate(270)"/>
      <use href="#p-orb-flame" transform="rotate(315)"/>
    </g>
    <g transform="translate(50 51)" fill="#ffe9c0" opacity="0.5">
      <use href="#p-orb-flame" transform="scale(0.72)"/>
      <use href="#p-orb-flame" transform="rotate(90) scale(0.72)"/>
      <use href="#p-orb-flame" transform="rotate(180) scale(0.72)"/>
      <use href="#p-orb-flame" transform="rotate(270) scale(0.72)"/>
    </g>
    <circle cx="50" cy="51" r="30" fill="url(#g-dg-pearl)"/>
    <circle cx="50" cy="51" r="30" fill="url(#m-occl)" opacity="0.26"/>
    <!-- 아래쪽에서 올라오는 반사. 구슬이 비어 보이지 않게 한다 -->
    <path d="M26 62c10 8 28 10 46 2-4 11-14 17-25 17-10 0-18-7-21-19z" fill="#dff8ff" opacity="0.3"/>
    <circle cx="50" cy="51" r="30" fill="none" stroke="url(#g-kr-bronze)" stroke-width="3.4"/>
    <circle cx="50" cy="51" r="30" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <ellipse cx="39" cy="39" rx="13" ry="8.6" fill="url(#m-sheen)" transform="rotate(-30 39 39)"/>
    <circle cx="62" cy="64" r="5.4" fill="url(#m-sheen)" opacity="0.55"/>
  </symbol>

  <symbol id="sym-gate" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="34" ry="4" fill="url(#m-shadow)"/>
    <!-- 용문(스캐터): 돌기둥 둘과 기와지붕, 그 사이로 물이 쏟아진다 -->
    <path d="M28 34h44v58H28z" fill="url(#v-inner)"/>
    <!-- 쏟아지는 물. 기둥보다 훨씬 밝아야 문으로 읽힌다 -->
    <path d="M33 34h34c0 20-4 38-6 58H39c-2-20-6-38-6-58z" fill="#eafbff" opacity="0.92"/>
    <path d="M33 34h34c0 20-4 38-6 58H39c-2-20-6-38-6-58z" fill="url(#g-dg-water)" opacity="0.4"/>
    <g fill="none" stroke="#2b93b8" stroke-width="1.6" stroke-linecap="round" opacity="0.5">
      <path d="M41 40c-1 16 0 33 1 50"/>
      <path d="M50 40v50"/>
      <path d="M59 40c1 16 0 33-1 50"/>
    </g>
    <!-- 물살의 가로 거품 -->
    <g fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.75">
      <path d="M36 52c5 3 10 3 14 0 4 3 9 3 14 0"/>
      <path d="M37 68c5 3 9 3 13 0 4 3 8 3 13 0"/>
    </g>
    <!-- 돌기둥. 물보다 어둡고 돌 줄눈이 보인다 -->
    <path d="M13 32h15l3 60H11z" fill="url(#g-dg-deep)"/>
    <path d="M87 32H72l-3 60h19z" fill="url(#g-dg-deep)"/>
    <path d="M22 32h6l3 60h-7z" fill="#070f16" opacity="0.4"/>
    <path d="M78 32h6l-3 60h-7z" fill="#070f16" opacity="0.22"/>
    <g stroke="#070f16" stroke-width="1.8" opacity="0.5">
      <path d="M12 47h17"/><path d="M12 62h18"/><path d="M13 77h18"/>
      <path d="M71 47h17"/><path d="M70 62h18"/><path d="M69 77h18"/>
      <path d="M20 32v15"/><path d="M25 47v15"/><path d="M19 62v15"/><path d="M25 77v15"/>
      <path d="M80 32v15"/><path d="M75 47v15"/><path d="M81 62v15"/><path d="M75 77v15"/>
    </g>
    <g stroke="#5d7f96" stroke-width="1" opacity="0.4">
      <path d="M12 45.4h17"/><path d="M12 60.4h18"/><path d="M13 75.4h18"/>
      <path d="M71 45.4h17"/><path d="M70 60.4h18"/><path d="M69 75.4h18"/>
    </g>
    <!-- 창방. 기둥 둘을 가로로 잇는 보 -->
    <path d="M9 30h82l-1.4 9H10.4z" fill="url(#g-kr-red)"/>
    <path d="M9 30h82l-1.4 9H10.4z" fill="url(#m-occl)" opacity="0.5"/>
    <path d="M10 31.4h80l-0.4 2.4H10.4z" fill="#ffb3a8" opacity="0.5"/>
    <!-- 지붕 -->
    <use href="#p-gate-roof" fill="url(#g-kr-red)"/>
    <use href="#p-gate-roof" fill="url(#m-occl)" opacity="0.55"/>
    <g stroke="#4a0a0a" stroke-width="1.6" opacity="0.5">
      <path d="M50 20V8"/><path d="M40 24 43 11"/><path d="M60 24 57 11"/>
      <path d="M30 28 34 15"/><path d="M70 28 66 15"/><path d="M20 32 25 20"/><path d="M80 32 75 20"/>
    </g>
    <use href="#p-gate-roof" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>
    <!-- 용마루 구슬 -->
    <circle cx="50" cy="7" r="5.2" fill="url(#g-dg-pearl)"/>
    <circle cx="50" cy="7" r="5.2" fill="none" stroke="url(#g-kr-bronze)" stroke-width="1.8"/>
    <!-- 문 아래 물보라 -->
    <g fill="#eafbff" opacity="0.7">
      <ellipse cx="34" cy="90" rx="8" ry="3.6"/>
      <ellipse cx="50" cy="93" rx="10" ry="3.8"/>
      <ellipse cx="66" cy="90" rx="8" ry="3.6"/>
    </g>
  </symbol>

  <!-- ── 화투 13종 ──
       광 5 · 열끗 4 · 띠 3 · 피 1. 상표를 쓰지 않으려고 그림을 모두 새로 그렸다. -->

  <symbol id="sym-songhak" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 송학: 붉은 해, 학, 솔잎 -->
    <circle cx="61" cy="26" r="13" fill="url(#g-hw-red)"/>
    <circle cx="61" cy="26" r="13" fill="none" stroke="#6b0706" stroke-width="1.2"/>
    <circle cx="57" cy="22" r="4.4" fill="#ffd3c2" opacity="0.6"/>
    <g fill="none" stroke="#2d6b21" stroke-width="2.2" stroke-linecap="round">
      <path d="M27 22c5 3 9 8 11 14"/>
      <path d="M27 30c5 1 9 4 12 8"/>
      <path d="M31 16c3 4 5 9 6 14"/>
    </g>
    <!-- 학: 검은 목, 흰 몸 -->
    <ellipse cx="47" cy="60" rx="15" ry="10" fill="#fffdf5" transform="rotate(-8 47 60)"/>
    <ellipse cx="47" cy="60" rx="15" ry="10" fill="none" stroke="#6b5c3c" stroke-width="1.2" transform="rotate(-8 47 60)"/>
    <path d="M56 54c6-5 8-11 8-16" fill="none" stroke="#141218" stroke-width="5" stroke-linecap="round"/>
    <circle cx="65" cy="37" r="4.6" fill="#fffdf5"/>
    <circle cx="65" cy="37" r="4.6" fill="none" stroke="#6b5c3c" stroke-width="1"/>
    <path d="M62 34c2-2 5-2 6 0-2 1-4 1-6 0z" fill="url(#g-hw-red)"/>
    <circle cx="66.4" cy="36.4" r="1.2" fill="#141218"/>
    <path d="M69 37l6 1-6 1.4z" fill="#141218"/>
    <g fill="none" stroke="#5a4a2a" stroke-width="2" stroke-linecap="round">
      <path d="M44 70v6"/><path d="M52 70v6"/>
    </g>
    <use href="#p-gwang-badge"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-byeotggot" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 벚꽃: 붉은 만막(커튼)과 분홍 꽃잎 -->
    <path d="M25 14h50v10l-6 5 6 5v6H25v-6l6-5-6-5z" fill="url(#g-hw-red)"/>
    <path d="M25 14h50v3H25z" fill="#fff" opacity="0.4"/>
    <g fill="#ffb7cf" stroke="#c4356a" stroke-width="1.2">
      <circle cx="40" cy="52" r="8"/>
      <circle cx="58" cy="46" r="7"/>
      <circle cx="61" cy="62" r="6.4"/>
      <circle cx="44" cy="68" r="6"/>
    </g>
    <g fill="#c4356a">
      <circle cx="40" cy="52" r="2.2"/><circle cx="58" cy="46" r="2"/>
      <circle cx="61" cy="62" r="1.8"/><circle cx="44" cy="68" r="1.6"/>
    </g>
    <path d="M32 78c8-3 22-3 36 0" fill="none" stroke="#2d6b21" stroke-width="2.2" stroke-linecap="round"/>
    <use href="#p-gwang-badge"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-gongsan" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 공산: 흰 보름달과 검은 산 -->
    <circle cx="50" cy="32" r="14" fill="#fffdf5"/>
    <circle cx="50" cy="32" r="14" fill="none" stroke="#8d7c5c" stroke-width="1.4"/>
    <circle cx="45" cy="27" r="5" fill="#ecdfc2" opacity="0.8"/>
    <path d="M25 74c6-14 12-22 17-22 5 0 8 6 12 11 3-5 6-8 9-8 5 0 9 8 12 19z" fill="#26232c"/>
    <path d="M25 74c6-14 12-22 17-22 3 0 5 2 7 5-6 3-11 9-15 17z" fill="#4a4650"/>
    <path d="M25 74h50v6H25z" fill="#141218"/>
    <use href="#p-gwang-badge"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-odong" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 오동: 금빛 봉황. 정면으로 그리면 얼굴 덩어리로 읽혀 측면으로 세웠다 -->
    <path d="M28 22c10-3 19 0 24 7-8 2-17 1-24-2z" fill="#2d6b21"/>
    <path d="M72 18c-8-1-15 3-18 10 8 1 14-2 18-7z" fill="#2d6b21"/>
    <!-- 긴 깃 꼬리. 이게 봉황으로 읽히게 하는 핵심이다 -->
    <g fill="none" stroke="url(#g-kr-bronze)" stroke-width="3" stroke-linecap="round">
      <path d="M42 56C34 62 28 72 27 84"/>
      <path d="M44 58C38 66 35 76 36 86"/>
      <path d="M46 60c-2 9-1 18 3 26"/>
    </g>
    <!-- 몸통과 날개 -->
    <path d="M62 44c-10-2-19 2-22 10-2 6 2 11 8 12 8 1 15-4 18-11 2-5 1-9-4-11z" fill="url(#g-kr-bronze)"/>
    <path d="M62 44c-10-2-19 2-22 10-2 6 2 11 8 12 8 1 15-4 18-11 2-5 1-9-4-11z" fill="url(#m-occl)" opacity="0.4"/>
    <path d="M52 48c6 1 10 5 11 11-6 1-11-3-13-8z" fill="#fff6d0" opacity="0.4"/>
    <!-- 머리와 부리 -->
    <circle cx="66" cy="38" r="7" fill="url(#g-kr-bronze)"/>
    <circle cx="66" cy="38" r="7" fill="url(#m-occl)" opacity="0.3"/>
    <circle cx="68" cy="36.4" r="2" fill="#141218"/>
    <path d="M72 38 82 41 72 43z" fill="#f0402a"/>
    <!-- 볏 -->
    <path d="M63 31c-1-6 1-10 4-12 2 4 2 8 1 12z" fill="#f0402a"/>
    <!-- 다리 -->
    <g fill="none" stroke="#8a5c12" stroke-width="2.2" stroke-linecap="round">
      <path d="M52 66v7l-4 4"/><path d="M58 66v7l4 4"/>
    </g>
    <use href="#p-gwang-badge"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-bigwang" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 비광: 우산과 빗줄기, 늘어진 버들 -->
    <g stroke="#3f6fc4" stroke-width="2" stroke-linecap="round" opacity="0.7">
      <path d="M30 16 26 30"/><path d="M40 14 36 30"/><path d="M60 14 56 30"/><path d="M70 16 66 30"/>
    </g>
    <path d="M28 46c0-12 10-21 22-21s22 9 22 21z" fill="url(#g-hw-red)"/>
    <path d="M28 46c0-12 10-21 22-21s22 9 22 21z" fill="url(#m-occl)" opacity="0.35"/>
    <g fill="none" stroke="#3d0403" stroke-width="1.4" opacity="0.6">
      <path d="M39 46c0-12 4-21 11-21"/>
      <path d="M61 46c0-12-4-21-11-21"/>
    </g>
    <path d="M28 46c0-12 10-21 22-21s22 9 22 21z" fill="none" stroke="#3d0403" stroke-width="1.6"/>
    <path d="M50 25v44c0 4-3 6-6 5" fill="none" stroke="#5a4a2a" stroke-width="2.6" stroke-linecap="round"/>
    <g fill="none" stroke="#2d6b21" stroke-width="2" stroke-linecap="round" opacity="0.85">
      <path d="M68 52c2 10 0 20-5 28"/>
      <path d="M72 54c1 9-1 18-5 26"/>
    </g>
    <use href="#p-gwang-badge"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-maejo" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 매조: 붉은 매화와 휘파람새. 머리와 몸이 같은 색이면 덩어리로 읽혀 배를 밝혔다 -->
    <path d="M30 82c4-14 10-26 18-34" fill="none" stroke="#6b5c3c" stroke-width="3" stroke-linecap="round"/>
    <g fill="#ff8fb0" stroke="#c4356a" stroke-width="1.2">
      <circle cx="34" cy="32" r="6.4"/><circle cx="49" cy="24" r="5.6"/><circle cx="62" cy="34" r="5"/>
    </g>
    <g fill="#c4356a">
      <circle cx="34" cy="32" r="1.8"/><circle cx="49" cy="24" r="1.6"/><circle cx="62" cy="34" r="1.4"/>
    </g>
    <!-- 꼬리 -->
    <path d="M40 70c-8 2-13 6-15 12 7 1 13-2 17-7z" fill="url(#g-hw-green)"/>
    <path d="M40 70c-8 2-13 6-15 12 7 1 13-2 17-7z" fill="url(#m-occl)" opacity="0.4"/>
    <!-- 몸통 -->
    <path d="M62 50c-10-2-20 3-23 12-2 6 2 11 9 11 9 0 16-6 18-14 1-5-1-8-4-9z" fill="url(#g-hw-green)"/>
    <path d="M44 66c2-6 8-10 15-10 1 5-3 11-9 13-3 1-5 0-6-3z" fill="#fff6e4" opacity="0.62"/>
    <path d="M62 50c-10-2-20 3-23 12-2 6 2 11 9 11 9 0 16-6 18-14 1-5-1-8-4-9z"
          fill="none" stroke="#123008" stroke-width="1.4"/>
    <!-- 머리. 몸과 겹치지 않게 위로 올렸다 -->
    <circle cx="65" cy="44" r="7" fill="url(#g-hw-green)"/>
    <circle cx="65" cy="44" r="7" fill="none" stroke="#123008" stroke-width="1.4"/>
    <circle cx="67" cy="42.4" r="2.2" fill="#141218"/>
    <circle cx="66.2" cy="41.6" r="0.8" fill="#fffdf5"/>
    <path d="M71 44 82 46.6 71 48.6z" fill="#e8ae2c"/>
    <path d="M71 44 82 46.6 71 48.6z" fill="none" stroke="#8a5c12" stroke-width="0.8"/>
    <g fill="none" stroke="#8a5c12" stroke-width="2" stroke-linecap="round">
      <path d="M50 73v6"/><path d="M57 72v7"/>
    </g>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-girogi" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 기러기: 밤하늘에 세 마리. V자가 커야 44px에서 새로 읽힌다 -->
    <rect x="25" y="10" width="50" height="48" rx="5" fill="url(#g-hw-blue)"/>
    <rect x="25" y="10" width="50" height="48" rx="5" fill="url(#m-occl)" opacity="0.3"/>
    <g fill="none" stroke="#fffdf5" stroke-width="3.4" stroke-linecap="round">
      <path d="M31 25c4-5 7-5 9-1 2-4 5-4 9 1"/>
      <path d="M52 40c4-5 7-5 9-1 2-4 5-4 9 1"/>
      <path d="M32 50c4-5 7-5 9-1 2-4 5-4 9 1"/>
    </g>
    <g fill="#fffdf5">
      <ellipse cx="40" cy="25.6" rx="3.4" ry="2.4"/>
      <ellipse cx="61" cy="40.6" rx="3.4" ry="2.4"/>
      <ellipse cx="41" cy="50.6" rx="3.4" ry="2.4"/>
    </g>
    <g fill="#e8ae2c">
      <path d="M43.2 25.2 47 25.9l-3.8 0.8z"/>
      <path d="M64.2 40.2 68 40.9l-3.8 0.8z"/>
      <path d="M44.2 50.2 48 50.9l-3.8 0.8z"/>
    </g>
    <g fill="none" stroke="#2d6b21" stroke-width="2.4" stroke-linecap="round">
      <path d="M30 86c6-10 12-16 20-18"/>
      <path d="M70 86c-6-10-12-16-20-18"/>
    </g>
    <path d="M44 66c4-3 8-3 12 0-4 3-8 3-12 0z" fill="#5fa93c"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-sasum" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 사슴: 단풍과 사슴 머리 -->
    <g fill="url(#g-hw-red)" stroke="#6b0706" stroke-width="1">
      <path d="M32 22 37 14l5 8 5-3-4 10H35l-4-10z"/>
      <path d="M60 18 65 10l5 8 5-3-4 10H63l-4-10z"/>
    </g>
    <!-- 뿔 -->
    <g fill="none" stroke="#8a5c12" stroke-width="2.6" stroke-linecap="round">
      <path d="M42 44C38 36 34 32 30 30"/>
      <path d="M38 38c-4 0-7-1-9-3"/>
      <path d="M58 44c4-8 8-12 12-14"/>
      <path d="M62 38c4 0 7-1 9-3"/>
    </g>
    <!-- 머리 -->
    <path d="M50 42c-9 0-14 5-14 13 0 8 6 16 14 21 8-5 14-13 14-21 0-8-5-13-14-13z" fill="#c98a45"/>
    <path d="M50 42c-9 0-14 5-14 13 0 8 6 16 14 21 8-5 14-13 14-21 0-8-5-13-14-13z" fill="url(#m-occl)" opacity="0.4"/>
    <g fill="#fff6e4" opacity="0.7">
      <circle cx="43" cy="62" r="2"/><circle cx="57" cy="62" r="2"/><circle cx="50" cy="56" r="2"/>
    </g>
    <circle cx="44" cy="52" r="2.6" fill="#141218"/>
    <circle cx="56" cy="52" r="2.6" fill="#141218"/>
    <ellipse cx="50" cy="70" rx="5" ry="4" fill="#5a3a18"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-yeoltkkeut" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 열끗: 모란과 나비 두 마리. 광도 띠도 없는 열끗의 대표다 -->
    <g fill="#ff8fb0" stroke="#c4356a" stroke-width="1.2">
      <circle cx="42" cy="66" r="9"/><circle cx="58" cy="72" r="7"/>
    </g>
    <circle cx="42" cy="66" r="3" fill="#c4356a"/>
    <circle cx="58" cy="72" r="2.4" fill="#c4356a"/>
    <path d="M30 80c8-3 22-4 40-2" fill="none" stroke="#2d6b21" stroke-width="2.2" stroke-linecap="round"/>
    <!-- 나비 -->
    <g fill="url(#g-kr-bronze)" stroke="#5a3a08" stroke-width="1">
      <path d="M44 32c-8-8-16-9-18-3-2 5 4 10 12 11z"/>
      <path d="M46 32c8-8 16-9 18-3 2 5-4 10-12 11z"/>
      <path d="M44 36c-6 4-10 10-7 14 3 3 8 0 11-6z"/>
      <path d="M46 36c6 4 10 10 7 14-3 3-8 0-11-6z"/>
    </g>
    <path d="M44.4 28h1.6v22h-1.6z" fill="#141218"/>
    <g fill="none" stroke="#141218" stroke-width="1.4" stroke-linecap="round">
      <path d="M44 28c-2-4-5-6-8-6"/><path d="M46 28c2-4 5-6 8-6"/>
    </g>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-hongdan" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 홍단: 붉은 띠에 흰 글씨, 아래 매화 -->
    <g fill="#ff8fb0" stroke="#c4356a" stroke-width="1.2">
      <circle cx="40" cy="70" r="7"/><circle cx="58" cy="76" r="5.6"/>
    </g>
    <circle cx="40" cy="70" r="2.4" fill="#c4356a"/>
    <path d="M28 84c8-3 20-4 36-2" fill="none" stroke="#2d6b21" stroke-width="2" stroke-linecap="round"/>
    <rect x="25" y="24" width="50" height="26" fill="url(#g-hw-red)"/>
    <rect x="25" y="24" width="50" height="4" fill="#fff" opacity="0.38"/>
    <rect x="25" y="46" width="50" height="4" fill="#3d0403" opacity="0.4"/>
    <!-- 띠 위의 붓글씨. 글꼴에 기대지 않으려고 획으로 그린다 -->
    <g fill="#fff8ec">
      <rect x="41" y="29" width="18" height="2.6" rx="1.3"/>
      <rect x="48.4" y="29" width="3.2" height="16" rx="1.4"/>
      <rect x="38" y="35" width="24" height="2.6" rx="1.3"/>
      <rect x="41" y="41.4" width="18" height="2.6" rx="1.3"/>
    </g>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-cheongdan" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 청단: 푸른 띠에 흰 글씨, 아래 모란 -->
    <g fill="#c6a8e8" stroke="#6b4a9c" stroke-width="1.2">
      <circle cx="40" cy="70" r="7"/><circle cx="58" cy="76" r="5.6"/>
    </g>
    <circle cx="40" cy="70" r="2.4" fill="#6b4a9c"/>
    <path d="M28 84c8-3 20-4 36-2" fill="none" stroke="#2d6b21" stroke-width="2" stroke-linecap="round"/>
    <rect x="25" y="24" width="50" height="26" fill="url(#g-hw-blue)"/>
    <rect x="25" y="24" width="50" height="4" fill="#fff" opacity="0.38"/>
    <rect x="25" y="46" width="50" height="4" fill="#0d1c3c" opacity="0.45"/>
    <g fill="#fff8ec">
      <rect x="38" y="29" width="24" height="2.6" rx="1.3"/>
      <rect x="41" y="34" width="3.2" height="11" rx="1.4"/>
      <rect x="55.8" y="34" width="3.2" height="11" rx="1.4"/>
      <rect x="41" y="37.4" width="18" height="2.6" rx="1.3"/>
      <rect x="41" y="42.4" width="18" height="2.6" rx="1.3"/>
    </g>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-chodan" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 초단: 글씨 없는 민 붉은 띠. 홍단과 가르는 표시다 -->
    <g fill="none" stroke="#2d6b21" stroke-width="2.4" stroke-linecap="round">
      <path d="M33 86c2-12 6-20 12-24"/>
      <path d="M50 86c0-12 2-21 6-26"/>
      <path d="M67 86c-2-12-5-19-9-23"/>
    </g>
    <rect x="25" y="24" width="50" height="26" fill="url(#g-hw-red)"/>
    <rect x="25" y="24" width="50" height="4" fill="#fff" opacity="0.38"/>
    <rect x="25" y="46" width="50" height="4" fill="#3d0403" opacity="0.4"/>
    <rect x="30" y="33" width="40" height="8" rx="4" fill="#fff" opacity="0.14"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <symbol id="sym-pi" viewBox="0 0 100 100">
    <ellipse cx="50" cy="96" rx="27" ry="3.4" fill="url(#m-shadow)"/>
    <use href="#p-card" fill="url(#g-hw-rim)"/>
    <use href="#p-card" fill="none" stroke="url(#m-key)" stroke-width="2"/>
    <use href="#p-card-face" fill="url(#g-hw-face)"/>
    <!-- 피: 광도 동물도 띠도 없다. 풀잎만 있다 -->
    <g fill="url(#g-hw-green)" stroke="#123008" stroke-width="1">
      <path d="M50 22c-12 8-18 20-16 32 10-4 17-16 16-32z"/>
      <path d="M50 22c12 8 18 20 16 32-10-4-17-16-16-32z"/>
      <path d="M36 58c-8 6-12 15-10 24 8-3 13-12 10-24z"/>
      <path d="M64 58c8 6 12 15 10 24-8-3-13-12-10-24z"/>
    </g>
    <g fill="none" stroke="#123008" stroke-width="1.2" opacity="0.5">
      <path d="M50 24v28"/><path d="M37 60c-3 7-4 14-2 20"/><path d="M63 60c3 7 4 14 2 20"/>
    </g>
    <path d="M28 88c10-4 34-4 44 0" fill="none" stroke="#6b5c3c" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <use href="#p-card-face" fill="url(#g-hw-gloss)"/>
    <use href="#p-card-face" fill="none" stroke="#8d7c5c" stroke-width="1.2" opacity="0.6"/>
  </symbol>

  <!-- 저배당 석판 타일. 같은 판에 색과 글자만 바꾼다 -->
  <symbol id="sym-rank10" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4" fill="url(#m-shadow)"/>
    <use href="#p-tile" fill="url(#g-eg-lapis)"/>
    <use href="#p-tile" fill="url(#m-occl)" opacity="0.7"/>
    <use href="#p-tile" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-tile" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="65.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="34" font-weight="900" fill="#0c1e3f" opacity="0.5">10</text>
    <text x="50" y="64" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="34" font-weight="900" fill="url(#g-eg-gold)">10</text>
  </symbol>
  <symbol id="sym-rankj" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4" fill="url(#m-shadow)"/>
    <use href="#p-tile" fill="url(#g-eg-teal)"/>
    <use href="#p-tile" fill="url(#m-occl)" opacity="0.7"/>
    <use href="#p-tile" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-tile" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="65.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="#07443f" opacity="0.5">J</text>
    <text x="50" y="64" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="url(#g-eg-gold)">J</text>
  </symbol>
  <symbol id="sym-rankq" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4" fill="url(#m-shadow)"/>
    <use href="#p-tile" fill="url(#g-eg-red)"/>
    <use href="#p-tile" fill="url(#m-occl)" opacity="0.7"/>
    <use href="#p-tile" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-tile" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="65.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="42" font-weight="900" fill="#4a100a" opacity="0.5">Q</text>
    <text x="50" y="64" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="42" font-weight="900" fill="url(#g-eg-gold)">Q</text>
  </symbol>
  <symbol id="sym-rankk" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4" fill="url(#m-shadow)"/>
    <use href="#p-tile" fill="url(#g-eg-stone)"/>
    <use href="#p-tile" fill="url(#m-occl)" opacity="0.7"/>
    <use href="#p-tile" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-tile" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="url(#g-eg-gold)" stroke-width="3.5"/>
    <text x="50" y="65.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="#3f331b" opacity="0.5">K</text>
    <text x="50" y="64" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="url(#g-eg-gold)">K</text>
  </symbol>
  <symbol id="sym-ranka" viewBox="0 0 100 100">
    <ellipse cx="50" cy="94" rx="30" ry="4" fill="url(#m-shadow)"/>
    <use href="#p-tile" fill="url(#g-eg-gold)"/>
    <use href="#p-tile" fill="url(#m-occl)" opacity="0.6"/>
    <use href="#p-tile" fill="none" stroke="url(#m-key)" stroke-width="3"/>
    <use href="#p-tile" fill="none" stroke="url(#m-rim)" stroke-width="2"/>
    <rect x="19" y="15" width="62" height="70" rx="6" fill="none" stroke="#513305" stroke-width="3.5" opacity="0.6"/>
    <text x="50" y="65.4" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="#fff8dc" opacity="0.45">A</text>
    <text x="50" y="64" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="44" font-weight="900" fill="#2a1c08">A</text>
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
