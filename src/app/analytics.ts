import type { PostHog } from 'posthog-js';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { config } from '@/config';

type Props = Record<string, string | number>;

let posthog: PostHog | null = null;
/** Events from before PostHog loads, or null when it never will. */
let early: [string, Props?][] | null = null;

/**
 * PostHog for what people do, Vercel Speed Insights for how fast pages load. Both run on the live
 * site only, so local, CI and preview builds send nothing. Page views follow the router's
 * pushState, so every city, area and café counts. PostHog loads after the map, in its own chunk,
 * and goes through /beans on this domain (see vercel.json), which ad blockers leave alone.
 */
export function startAnalytics(): void {
  if (!__LIVE__) return;
  injectSpeedInsights();
  if (!config.posthog.key) return;
  early = [];
  void import('posthog-js').then(({ default: ph }) => {
    ph.init(config.posthog.key, {
      api_host: '/beans',
      ui_host: config.posthog.ui,
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
    });
    posthog = ph;
    for (const [event, props] of early ?? []) ph.capture(event, props);
    early = null;
  });
  // Links out (posts, follows on X, directions) say what they are in data-link.
  for (const type of ['click', 'auxclick'] as const) {
    document.addEventListener(type, (e) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-link]');
      if (link) track('link_opened', { kind: link.dataset.link ?? '', url: link.href });
    });
  }
}

export function track(event: string, props?: Props): void {
  if (posthog) posthog.capture(event, props);
  else early?.push([event, props]);
}
