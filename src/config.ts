export const config = {
  /** The product's name, in titles, link previews and llms.txt. */
  name: 'captable.cafe',
  /** The production address. Canonical links, the sitemap and preview images point here; SITE_URL overrides it at build time. */
  site: 'https://captable.cafe',
  /** Name in the footer credit; the credit omits "Made by" while this is empty. */
  maker: '',
  /** GitHub "owner/repo" whose issue form takes suggestions and removal requests. Those links hide while this is empty. */
  repo: '',
  /** PostHog project. The key is public by design; analytics stay off while it is empty. */
  posthog: {
    key: '',
    /** The PostHog app in the project's region. vercel.json relays /beans to the same region. */
    ui: 'https://us.posthog.com',
  },
};
