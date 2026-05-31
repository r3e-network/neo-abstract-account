// Stable per-instance unique id for scoping inline-SVG gradient/filter ids so
// multiple illustrations on one page never collide on shared `url(#id)` refs.
let counter = 0;

export function nextUid(prefix = "ns") {
  counter += 1;
  return `${prefix}${counter}`;
}
