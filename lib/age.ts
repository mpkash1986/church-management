export function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateAge(dateOfBirth: Date | string | null, asOf: Date | string): number | null {
  if (!dateOfBirth) return null;

  const birthDate = typeof dateOfBirth === "string" ? dateOfBirth : localDateString(dateOfBirth);
  const today = typeof asOf === "string" ? asOf : localDateString(asOf);
  const birthMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!birthMatch || !todayMatch) return null;

  const [, birthYear, birthMonth, birthDay] = birthMatch;
  const [, currentYear, currentMonth, currentDay] = todayMatch;
  const birthParts = [Number(birthYear), Number(birthMonth), Number(birthDay)];
  const todayParts = [Number(currentYear), Number(currentMonth), Number(currentDay)];
  const [year, month, day] = birthParts;
  const [thisYear, thisMonth, thisDay] = todayParts;
  const birthDateCheck = new Date(Date.UTC(year, month - 1, day));
  const todayCheck = new Date(Date.UTC(thisYear, thisMonth - 1, thisDay));
  if (
    birthDateCheck.getUTCFullYear() !== year || birthDateCheck.getUTCMonth() + 1 !== month ||
    birthDateCheck.getUTCDate() !== day || todayCheck.getUTCFullYear() !== thisYear ||
    todayCheck.getUTCMonth() + 1 !== thisMonth || todayCheck.getUTCDate() !== thisDay ||
    birthDateCheck > todayCheck
  ) {
    return null;
  }

  let age = thisYear - year;
  if (thisMonth < month || (thisMonth === month && thisDay < day)) age--;
  return age;
}
