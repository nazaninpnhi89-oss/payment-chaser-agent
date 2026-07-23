export function penceToPounds(pence: number): number {
  return pence / 100;
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(penceToPounds(pence));
}
