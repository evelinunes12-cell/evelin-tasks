/**
 * Brazilian phone number mask utility
 * Formats phone numbers in the pattern: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */

export function formatPhoneBR(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");

  // Limit to 11 digits (Brazilian mobile with DDD)
  const limited = numbers.slice(0, 11);

  if (limited.length === 0) return "";
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10) {
    // Landline format: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  // Mobile format: (XX) XXXXX-XXXX
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}
