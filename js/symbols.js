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
