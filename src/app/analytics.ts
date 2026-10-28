import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Vercel Web Analytics and Speed Insights. Both are cookieless, so no consent banner.
 * Page views follow the router's pushState on their own, so every city, area and café counts.
 * Only Vercel serves their scripts, so local and CI builds skip them.
 */
export function startAnalytics(): void {
  if (!__VERCEL__) return;
  inject();
  injectSpeedInsights();
}
