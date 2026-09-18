// 난수와 릴 스톱 결정만 담당한다. 여기서 결과가 확정되고, 연출은 이 결과를 따라갈 뿐이다.

export function randomInt(max) {
  return Math.floor(Math.random() * max);
}

// 릴별 스톱 인덱스. 스핀 시작 시점에 여기서 결과가 전부 확정된다.
export function drawStops(strips) {
  return strips.map((strip) => randomInt(strip.length));
}

// 스톱 인덱스에서 보이는 그리드를 만든다. grid[reel][row]
export function buildGrid(strips, stops, rows) {
  return strips.map((strip, reel) =>
    Array.from({ length: rows }, (_, row) => strip[(stops[reel] + row) % strip.length]),
  );
}
