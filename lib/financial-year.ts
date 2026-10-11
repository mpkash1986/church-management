export function getCurrentFinancialYear(date = new Date()) {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

export function getFinancialYears(date = new Date(), count = 8) {
  const currentStartYear = Number(getCurrentFinancialYear(date).slice(0, 4));
  return Array.from({ length: count }, (_, index) => {
    const startYear = currentStartYear - index;
    return `${startYear}-${startYear + 1}`;
  });
}

export function isCurrentOrPastFinancialYear(value: string, date = new Date()) {
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) return false;
  const startYear = Number(match[1]);
  if (Number(match[2]) !== startYear + 1) return false;
  const currentStartYear = Number(getCurrentFinancialYear(date).slice(0, 4));
  return startYear <= currentStartYear;
}
