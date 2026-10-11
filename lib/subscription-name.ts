export function createSubscriptionName(memberName: string, financialYear: string, period: string) {
  return `${memberName} - ${financialYear} - ${period}`;
}
