export function computeHotScore(score: number, createdAt: Date): number {
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  return order + (sign * createdAt.getTime()) / 1000 / 45000;
}
