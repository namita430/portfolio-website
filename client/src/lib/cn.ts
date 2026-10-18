type ClassValue = string | false | null | undefined | 0;

/** Tiny className joiner: cn('a', cond && 'b') */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
