/** Nearest slide index for a scroll offset. Returns 0 before layout settles. */
export function slideIndexFromScroll(scrollLeft: number, slideWidth: number, gap: number): number {
  const stride = slideWidth + gap
  if (stride <= 0) return 0
  return Math.max(0, Math.round(scrollLeft / stride))
}
