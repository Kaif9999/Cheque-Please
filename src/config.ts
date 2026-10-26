export const config = {
  /** Name in the footer credit; the credit omits "made by" while this is empty. */
  maker: '',
  /** GitHub "owner/repo" whose issue form takes new receipts and removal requests. Those links hide while this is empty. */
  repo: '',
};

export function issueUrl(fields: { city: string; cafe?: string; request: 'Add a receipt' | 'Remove me' }): string | null {
  if (!config.repo) return null;
  const q = new URLSearchParams({ template: 'receipt.yml', city: fields.city, request: fields.request });
  if (fields.cafe) q.set('cafe', fields.cafe);
  return `https://github.com/${config.repo}/issues/new?${q}`;
}
