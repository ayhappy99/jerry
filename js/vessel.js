// 복주머니 잭팟 용기의 기하. 돈이 쌓이는 높이는 CSS 변수 --fill(0~1)이 정하고,
// 터지는 연출은 CSS가 맡는다. 이 파일은 문자열만 만들고 DOM을 만지지 않는다.
//
// 천 주머니면 속이 안 보이므로 수정(水晶) 복주머니로 그린다.
// 주머니 몸을 클립으로 쓰고 그 안에서 동전 무늬를 위로 밀어 올리는 방식이다.

// 용기 몸. 클립과 유리면이 같은 경로를 쓴다.
const BODY = 'M40 44C22 55 10 75 10 98c0 24 20 41 50 41s50-17 50-41c0-23-12-43-30-54z';

// 부푼 천과 그 주름. 금띠 위로 올라온 부분이다.
const FRILL = 'M40 34C42 21 49 14 60 14s18 7 20 20z';

// 쌓인 돈이 차지할 수 있는 최대 높이. CSS가 (1 - fill) 만큼 아래로 밀어낸다.
export const FILL_SPAN = 95;

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
 * @param {string} tierKey 등급 키. 같은 문서에 네 개가 놓이므로 클립 id에 섞는다.
 * @param {string} label 띠에 새길 등급 이름
 */
export function vesselMarkup(tierKey, label) {
  const clip = `v-clip-${tierKey}`;
  return (
    '<svg class="vessel__art" viewBox="0 0 120 152" aria-hidden="true">' +
    `<defs><clipPath id="${clip}"><path d="${BODY}"/></clipPath></defs>` +

    // 안쪽 그늘. 빈 용기가 검게 비어 보이게 한다
    `<path class="vessel__inner" d="${BODY}" fill="url(#v-inner)"/>` +

    // 쌓인 돈. 클립 안에서 통째로 위아래로 움직인다
    `<g clip-path="url(#${clip})">` +
    '<g class="vessel__pile">' +
    `<rect x="8" y="44" width="104" height="${FILL_SPAN}" fill="url(#v-gold)"/>` +
    `<rect x="8" y="44" width="104" height="${FILL_SPAN}" fill="url(#v-coins)"/>` +
    '<rect x="8" y="41" width="104" height="8" fill="url(#v-surface)"/>' +
    '</g></g>' +

    // 유리 껍데기. 반투명이라 쌓인 돈이 등급 색으로 물들어 보인다.
    // 터질 때 이 묶음 하나만 부풀려 날리면 되므로 g로 묶는다.
    '<g class="vessel__shell">' +
    `<path class="vessel__glass" d="${BODY}"/>` +
    `<path class="vessel__edge" d="${BODY}" fill="none"/>` +
    `<path d="${BODY}" fill="none" stroke="url(#m-key)" stroke-width="2.4"/>` +
    '<path class="vessel__facet" d="M34 56C24 66 18 80 18 98c0 12 4 23 12 31-6-10-9-21-9-31 0-15 4-30 13-42z"/>' +
    '<ellipse class="vessel__spec" cx="38" cy="72" rx="8" ry="16" transform="rotate(-18 38 72)"/>' +
    '</g>' +

    // 목을 조인 금띠와 그 위로 부푼 천. 터질 때 같이 위로 튄다
    '<g class="vessel__top">' +
    `<path d="${FRILL}" fill="url(#v-inner)"/>` +
    `<path class="vessel__frill" d="${FRILL}"/>` +
    '<g class="vessel__gather" fill="none" stroke-width="1.5" stroke-linecap="round">' +
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
    `<div class="vessel vessel--${key}" data-tier="${key}" style="--fill:0">` +
    vesselMarkup(key, tiers[key].label) +
    '<span class="vessel__meta">' +
    // 가로 화면에서는 용기가 작아 금띠의 글자를 읽을 수 없다. 그때만 이 이름표를 쓴다.
    `<span class="vessel__tier">${tiers[key].label}</span>` +
    // 속성 이름을 공유 잭팟 바와 다르게 둔다. 같으면 setJackpot의 전역 선택자가
    // 이 칸까지 덮어써서 공유 풀 금액이 복주머니에 표시된다.
    `<output class="vessel__value" data-pouch-value="${key}" aria-label="${tiers[key].label} 잭팟">0</output>` +
    '</span></div>',
  ).join('');
}
