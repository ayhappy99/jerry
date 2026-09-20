// 복주머니 잭팟 용기의 기하. 이 파일은 문자열만 만들고 DOM을 만지지 않는다.
//
// 속이 보이지 않는 천 주머니다. 얼마나 찼는지 밖에서 알 수 없어야 하기 때문이다.
// 채움 높이를 보여 주면 언제 터질지 짐작할 수 있고, 터지는 순간의 놀라움이 사라진다.
// 금액은 주머니 아래 숫자가 알려 주고, 그 숫자와 터질 지점의 거리는 숨어 있다.

// 용기 몸. 천과 터질 때 번지는 섬광이 같은 경로를 쓴다.
const BODY = 'M40 44C22 55 10 75 10 98c0 24 20 41 50 41s50-17 50-41c0-23-12-43-30-54z';

// 부푼 천과 그 주름. 금띠 위로 올라온 부분이다.
const FRILL = 'M40 34C42 21 49 14 60 14s18 7 20 20z';

// 목에서 아래로 퍼지는 주름. 조여 묶은 천이라 위에서 모이고 아래로 벌어진다.
const GATHERS = [
  'M44 48C36 62 32 80 33 98',
  'M52 46C48 62 46 80 47 100',
  'M68 46C72 62 74 80 73 100',
  'M76 48C84 62 88 80 87 98',
];

// 터질 때 튀는 동전. 각도와 거리를 미리 정해 두고 CSS가 그대로 날린다.
// 무작위로 뽑지 않는 이유: 같은 잭팟이 매번 같게 보여야 녹화·점검이 가능하다.
const SPRAY = [
  { a: -90, d: 132 }, { a: -62, d: 78 }, { a: -34, d: 116 }, { a: -8, d: 62 },
  { a: 18, d: 104 }, { a: 44, d: 58 }, { a: 70, d: 124 }, { a: 96, d: 70 },
  { a: 122, d: 96 }, { a: 148, d: 56 }, { a: 174, d: 128 }, { a: -158, d: 86 },
  { a: -132, d: 110 }, { a: -116, d: 64 },
];

function sprayCoins() {
  return SPRAY.map(({ a, d }, i) =>
    `<g class="vessel__spray" style="--a:${a}deg;--d:${d};--i:${i}">` +
    '<use href="#v-coin" x="-9" y="-9"/></g>',
  ).join('');
}

/**
 * 용기 하나의 마크업.
 * @param {string} label 금띠에 새길 등급 이름
 */
export function vesselMarkup(label) {
  return (
    '<svg class="vessel__art" viewBox="0 0 120 152" aria-hidden="true">' +
    '<ellipse class="vessel__shadow" cx="60" cy="144" rx="34" ry="6"/>' +

    // 천으로 된 몸. 터질 때 이 묶음 하나만 부풀려 날리면 되므로 g로 묶는다
    '<g class="vessel__shell">' +
    `<path class="vessel__cloth" d="${BODY}"/>` +
    `<path class="vessel__shade" d="${BODY}"/>` +
    `<path d="${BODY}" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>` +
    `<path class="vessel__edge" d="${BODY}" fill="none"/>` +
    `<g class="vessel__gathers" fill="none">${GATHERS.map((d) => `<path d="${d}"/>`).join('')}</g>` +
    '<ellipse class="vessel__sheen" cx="38" cy="74" rx="13" ry="22" transform="rotate(-18 38 74)"/>' +
    // 복(福) 메달
    '<circle class="vessel__medal" cx="60" cy="92" r="21" fill="none"/>' +
    '<g class="vessel__bok"><use href="#p-bok" transform="translate(49.2 77.3) scale(0.9)"/></g>' +
    '</g>' +

    // 목을 조인 금띠와 그 위로 부푼 천. 터질 때 같이 위로 튄다
    '<g class="vessel__top">' +
    `<path class="vessel__cloth" d="${FRILL}"/>` +
    `<path class="vessel__shade" d="${FRILL}"/>` +
    '<g class="vessel__gathers" fill="none" stroke-width="1.5">' +
    '<path d="M49.6 33C48.4 26 51 20 55 16"/>' +
    '<path d="M59.6 33L60.4 15"/>' +
    '<path d="M70.4 33C71.6 26 69 20 65 16"/>' +
    '</g>' +
    '<circle cx="60" cy="13" r="4.2" fill="url(#v-gold)"/>' +
    '<g fill="none" stroke="url(#v-gold)" stroke-width="3.4" stroke-linecap="round">' +
    '<path d="M39 33C31 27 22 27 16 33"/><path d="M81 33c8-6 17-6 23 0"/></g>' +
    '<circle cx="13" cy="35" r="3.8" fill="url(#v-gold)"/>' +
    '<circle cx="107" cy="35" r="3.8" fill="url(#v-gold)"/>' +
    '<rect x="27" y="31" width="66" height="17" rx="8.5" fill="url(#v-gold)"/>' +
    '<rect x="31" y="34" width="58" height="3.4" rx="1.7" fill="#fff8dc" opacity="0.55"/>' +
    `<text class="vessel__name" x="60" y="45">${label}</text>` +
    '</g>' +

    // 터질 때만 보이는 층. 평소에는 CSS가 감춘다
    `<path class="vessel__flash" d="${BODY}"/>` +
    '<circle class="vessel__wave" cx="60" cy="95" r="10" fill="none"/>' +
    `<g class="vessel__sprays" transform="translate(60 95)">${sprayCoins()}</g>` +
    '<text class="vessel__pop" x="60" y="102">팡!</text>' +
    '</svg>'
  );
}

/**
 * 잭팟 바 하나. 등급 순서는 호출자가 정한다.
 * @param {string[]} tierKeys
 * @param {Record<string, {label: string}>} tiers
 */
export function vesselBarMarkup(tierKeys, tiers) {
  return tierKeys.map((key) =>
    `<div class="vessel vessel--${key}" data-tier="${key}">` +
    vesselMarkup(tiers[key].label) +
    '<span class="vessel__meta">' +
    // 가로 화면에서는 용기가 작아 금띠의 글자를 읽을 수 없다. 그때만 이 이름표를 쓴다.
    `<span class="vessel__tier">${tiers[key].label}</span>` +
    // 속성 이름을 공유 잭팟 바와 다르게 둔다. 같으면 setJackpot의 전역 선택자가
    // 이 칸까지 덮어써서 공유 풀 금액이 복주머니에 표시된다.
    `<output class="vessel__value" data-pouch-value="${key}" aria-label="${tiers[key].label} 잭팟">0</output>` +
    '</span></div>',
  ).join('');
}
