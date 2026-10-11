export function formatMemberNumber(sequence: number) {
  return `M${String(sequence).padStart(4, "0")}`;
}

export function getHighestMemberNumber(memberNumbers: Array<string | null>) {
  return memberNumbers.reduce((highest, memberNumber) => {
    const match = /^M(\d+)$/.exec(memberNumber || "");
    const sequence = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
}
