export function normalizeIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase('vi');
}

export function maskDestination(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    const [name = '', domain = ''] = trimmed.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-3)}`;
}
