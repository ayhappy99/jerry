// 심볼은 전부 인라인 SVG다. 외부 이미지 파일을 쓰지 않는다.
// 문서에 <symbol> 스프라이트를 한 번 심고, 각 릴 셀은 <use>로 참조한다.
// 그라디언트와 하이라이트를 넣어 플랫 아이콘이 아니라 입체감 있는 물체로 보이게 한다.

const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="g-cherry-body" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ff8a93"/>
      <stop offset="45%" stop-color="#d81f3c"/>
      <stop offset="100%" stop-color="#6d0716"/>
    </radialGradient>
    <linearGradient id="g-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8ede7a"/>
      <stop offset="100%" stop-color="#1f7a35"/>
    </linearGradient>
    <radialGradient id="g-lemon-body" cx="32%" cy="28%" r="80%">
      <stop offset="0%" stop-color="#fff8c2"/>
      <stop offset="50%" stop-color="#f5c518"/>
      <stop offset="100%" stop-color="#9a6b03"/>
    </radialGradient>
    <linearGradient id="g-bell-body" x1="20%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ffeaa8"/>
      <stop offset="40%" stop-color="#e8ae2c"/>
      <stop offset="100%" stop-color="#8a5a09"/>
    </linearGradient>
    <linearGradient id="g-bar-plate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffdf6"/>
      <stop offset="50%" stop-color="#e4d6b4"/>
      <stop offset="100%" stop-color="#9c8a63"/>
    </linearGradient>
    <linearGradient id="g-seven-body" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ff9aa6"/>
      <stop offset="42%" stop-color="#e01b3c"/>
      <stop offset="100%" stop-color="#70091b"/>
    </linearGradient>
    <linearGradient id="g-diamond-top" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eafcff"/>
      <stop offset="100%" stop-color="#5fd7f0"/>
    </linearGradient>
    <linearGradient id="g-diamond-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#48c3e6"/>
      <stop offset="100%" stop-color="#0c4b68"/>
    </linearGradient>
    <linearGradient id="g-crown-body" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff3c0"/>
      <stop offset="45%" stop-color="#f0bb3a"/>
      <stop offset="100%" stop-color="#8d5c06"/>
    </linearGradient>
    <radialGradient id="g-star-body" cx="42%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#ffe066"/>
      <stop offset="100%" stop-color="#e07d0a"/>
    </radialGradient>
    <linearGradient id="g-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- 이집션 팔레트 -->
    <linearGradient id="g-eg-gold" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#fff4c9"/>
      <stop offset="42%" stop-color="#eab534"/>
      <stop offset="100%" stop-color="#8a5c07"/>
    </linearGradient>
    <linearGradient id="g-eg-lapis" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#6b9ee6"/>
      <stop offset="45%" stop-color="#2b5fa8"/>
      <stop offset="100%" stop-color="#132f5c"/>
    </linearGradient>
    <linearGradient id="g-eg-teal" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#9df0e6"/>
      <stop offset="45%" stop-color="#2ec4b6"/>
      <stop offset="100%" stop-color="#0d6b63"/>
    </linearGradient>
    <linearGradient id="g-eg-red" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ff9b84"/>
      <stop offset="45%" stop-color="#c8432f"/>
      <stop offset="100%" stop-color="#6b1a10"/>
    </linearGradient>
    <linearGradient id="g-eg-ivory" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fdf6e3"/>
      <stop offset="60%" stop-color="#e5d5b2"/>
      <stop offset="100%" stop-color="#9b8a68"/>
    </linearGradient>
    <linearGradient id="g-eg-stone" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d9c9a4"/>
      <stop offset="55%" stop-color="#a6905f"/>
      <stop offset="100%" stop-color="#5d4c2b"/>
    </linearGradient>

    <!-- 회전 중 세로 방향 모션 블러. CSS의 blur()는 등방성이라 세로만 흐리려면 SVG 필터가 필요하다. -->
    <filter id="blur-spin" x="-25%" y="-60%" width="150%" height="220%">
      <feGaussianBlur stdDeviation="0 7"/>
    </filter>
    <filter id="blur-spin-soft" x="-25%" y="-60%" width="150%" height="220%">
      <feGaussianBlur stdDeviation="0 3"/>
    </filter>
  </defs>

  <symbol id="sym-cherry" viewBox="0 0 100 100">
    <path d="M52 24c-10 12-24 16-34 34" fill="none" stroke="#3f7d2c" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 24c8 14 14 18 20 34" fill="none" stroke="#3f7d2c" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 24c10-14 26-14 34-8-8 12-24 14-34 8z" fill="url(#g-leaf)"/>
    <circle cx="34" cy="68" r="19" fill="url(#g-cherry-body)"/>
    <circle cx="70" cy="74" r="16" fill="url(#g-cherry-body)"/>
    <ellipse cx="28" cy="60" rx="6" ry="4" fill="#fff" opacity="0.6"/>
    <ellipse cx="65" cy="68" rx="5" ry="3" fill="#fff" opacity="0.5"/>
  </symbol>

  <symbol id="sym-lemon" viewBox="0 0 100 100">
    <path d="M50 20c4-6 10-6 14-2" fill="none" stroke="#3f7d2c" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 20c10-6 22-2 26 4-10 8-22 6-26-4z" fill="url(#g-leaf)"/>
    <ellipse cx="50" cy="60" rx="33" ry="25" fill="url(#g-lemon-body)"/>
    <path d="M17 60c6 4 14 6 33 6s27-2 33-6" fill="none" stroke="#b98a06" stroke-width="2" opacity="0.5"/>
    <ellipse cx="38" cy="48" rx="11" ry="6" fill="url(#g-gloss)"/>
  </symbol>

  <symbol id="sym-bell" viewBox="0 0 100 100">
    <circle cx="50" cy="16" r="7" fill="url(#g-bell-body)"/>
    <path d="M50 22c-16 0-25 11-25 29 0 18-5 24-11 31h72c-6-7-11-13-11-31 0-18-9-29-25-29z" fill="url(#g-bell-body)"/>
    <rect x="18" y="78" width="64" height="7" rx="3.5" fill="#6d4506"/>
    <circle cx="50" cy="90" r="8" fill="url(#g-bell-body)"/>
    <path d="M38 34c-5 6-7 14-7 24 0 10-2 16-5 20" fill="none" stroke="#fff6d8" stroke-width="4" stroke-linecap="round" opacity="0.65"/>
  </symbol>

  <symbol id="sym-bar" viewBox="0 0 100 100">
    <rect x="8" y="30" width="84" height="40" rx="8" fill="#5a3a06"/>
    <rect x="11" y="33" width="78" height="34" rx="6" fill="url(#g-bar-plate)"/>
    <rect x="11" y="33" width="78" height="12" rx="6" fill="url(#g-gloss)" opacity="0.7"/>
    <text x="50" y="57" text-anchor="middle" font-family="Gothic A1, sans-serif" font-size="25" font-weight="900" fill="#4a2f04" letter-spacing="2">BAR</text>
  </symbol>

  <symbol id="sym-seven" viewBox="0 0 100 100">
    <path d="M22 14h56L56 90H32l20-58H22z" fill="#5a0512"/>
    <path d="M25 17h50L53 87H35l20-58H25z" fill="url(#g-seven-body)"/>
    <path d="M28 20h44l-3 9H28z" fill="url(#g-gloss)"/>
  </symbol>

  <symbol id="sym-diamond" viewBox="0 0 100 100">
    <path d="M50 10 88 40 50 92 12 40z" fill="url(#g-diamond-bottom)"/>
    <path d="M50 10 88 40H12z" fill="url(#g-diamond-top)"/>
    <path d="M50 10 68 40H32z" fill="#ffffff" opacity="0.55"/>
    <path d="M12 40h76L50 92z" fill="none" stroke="#bff0ff" stroke-width="2" opacity="0.7"/>
    <path d="M32 40 50 92 68 40" fill="none" stroke="#bff0ff" stroke-width="2" opacity="0.5"/>
  </symbol>

  <symbol id="sym-crown" viewBox="0 0 100 100">
    <path d="M12 76 18 28l18 18L50 20l14 26 18-18 6 48z" fill="url(#g-crown-body)"/>
    <rect x="10" y="74" width="80" height="14" rx="6" fill="url(#g-crown-body)"/>
    <rect x="10" y="74" width="80" height="5" rx="2.5" fill="#fff6d8" opacity="0.6"/>
    <circle cx="18" cy="28" r="6" fill="#e0344f"/>
    <circle cx="50" cy="20" r="7" fill="#49d3f0"/>
    <circle cx="82" cy="28" r="6" fill="#e0344f"/>
    <path d="M30 62h40" stroke="#8d5c06" stroke-width="3" opacity="0.5"/>
  </symbol>

  <symbol id="sym-star" viewBox="0 0 100 100">
    <path d="M50 6 62 38h34L68 58l10 34-28-20-28 20 10-34L4 38h34z" fill="url(#g-star-body)"/>
    <path d="M50 6 62 38h34L68 58l10 34-28-20-28 20 10-34L4 38h34z" fill="none" stroke="#fff3b0" stroke-width="2.5"/>
    <path d="M50 18 57 40H43z" fill="#fff" opacity="0.7"/>
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
