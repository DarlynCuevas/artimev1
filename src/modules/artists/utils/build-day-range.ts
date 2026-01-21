export function buildDayRange(from: string, to: string): string[] {
  const result: string[] = [];

  const start = new Date(from);
  const end = new Date(to);

  // Normalizamos a medianoche UTC para evitar desfases
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  const current = new Date(start);

  while (current <= end) {
    result.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}
