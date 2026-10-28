import { config } from '@/config';

/** A file under public/, addressed from the site root so it loads at any page depth. */
export function asset(path: string): string {
  return /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export function followUrl(handle: string): string {
  return `https://x.com/intent/follow?screen_name=${encodeURIComponent(handle)}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const isTweetUrl = (url: string): boolean => /^https:\/\/(x|twitter)\.com\//.test(url);

export type IssueRequest = 'Add a receipt' | 'Remove me';

/** Pre-filled GitHub issue for a suggestion or a removal; null until a repo is configured. */
export function issueUrl(fields: { city: string; cafe?: string; request: IssueRequest }): string | null {
  if (!config.repo) return null;
  const q = new URLSearchParams({ template: 'receipt.yml', city: fields.city, request: fields.request });
  if (fields.cafe) q.set('cafe', fields.cafe);
  return `https://github.com/${config.repo}/issues/new?${q}`;
}
