import { config } from '@/config';
import { CITIES, CITY_ORDER } from '@/data/cities';
import { areaPages } from '@/domain/areas';
import { investorsAt } from '@/domain/people';
import { routeHref, slugify } from '@/domain/routes';
import type { Cafe, City, Investor, SceneItem } from '@/domain/types';
import { ZONES, zoneOf } from '@/domain/zones';
import { hostOf, issueUrl } from '@/lib/links';
import { plural } from '@/lib/text';
import { joinList } from './pages';

/**
 * llms.txt (https://llmstxt.org): what the site is and a link to every city, neighbourhood and café,
 * for language models that read the site. llms-full.txt holds the data itself, every post quoted in
 * full, since the map's pages need a browser to read.
 */

const cities = (): City[] => CITY_ORDER.map((id) => CITIES[id]);
const allCafes = (): Cafe[] => cities().flatMap((c) => c.cafes);

function summary(): string {
  return `> The cafés in ${joinList(cities().map((c) => c.name))} where VCs and angels have met founders. Every café is backed by a public post, a tweet or an article, quoted word for word with a link to the original. No post, no pin.`;
}

function notes(updated: string | null): string {
  const remove = issueUrl({ city: '', request: 'Remove me' });
  return [
    `- ${plural(allCafes().length, 'café')} and ${plural(investorsAt(allCafes()).length, 'investor')} across ${plural(cities().length, 'city', 'cities')}${updated ? `; the newest post is from ${updated}` : ''}.`,
    '- A post shows someone was there once, not that they will be there tomorrow.',
    `- Each café is tagged by who meets there most: ${joinList(Object.values(ZONES).map((z) => `${z.label} (${z.blurb[0]?.toLowerCase()}${z.blurb.slice(1)})`))}.`,
    ...(remove ? [`- Anyone listed can ask to be removed: ${remove}`] : []),
  ].join('\n');
}

/** One line per café: who was seen there, or that founders meet there. */
function cafeLine(site: string, city: City, cafe: Cafe): string {
  const seen = investorsAt([cafe]).map((p) => (p.fund ? `${p.name} (${p.fund})` : p.name));
  const who = seen.length ? `investors seen: ${joinList(seen)}` : 'founders post about meetings here';
  return `- [${cafe.name}, ${cafe.branch}, ${cafe.area}](${site}${routeHref(city.id, { kind: 'cafe', slug: cafe.slug })}): ${ZONES[zoneOf(cafe)].label}; ${who}.`;
}

export function llmsTxt(site: string, updated: string | null): string {
  const out = [`# ${config.name}`, '', summary(), '', notes(updated), '', '## Cities', ''];
  for (const city of cities()) {
    const busiest = areaPages(city.cafes)
      .slice(0, 3)
      .map(([area, list]) => `${area} (${list.length})`);
    const where = busiest.length ? ` Busiest neighbourhoods: ${joinList(busiest)}.` : '';
    out.push(
      `- [${city.headline}](${site}${routeHref(city.id)}): ${plural(city.cafes.length, 'café')}, ${plural(investorsAt(city.cafes).length, 'investor')}.${where}`,
    );
  }
  out.push('', '## Neighbourhoods', '');
  for (const city of cities()) {
    for (const [area, list] of areaPages(city.cafes)) {
      const note = city.areas[area];
      out.push(
        `- [${area}, ${city.name}](${site}${routeHref(city.id, { kind: 'area', slug: slugify(area) })}): ${plural(list.length, 'café')}.${note ? ` ${note}` : ''}`,
      );
    }
  }
  for (const city of cities()) {
    out.push('', `## ${city.name} cafés`, '', ...city.cafes.map((cafe) => cafeLine(site, city, cafe)));
  }
  out.push(
    '',
    '## Optional',
    '',
    `- [Full data](${site}/llms-full.txt): every café with its address and map link, the investors seen there, and each post quoted in full with its link.`,
    `- [Sitemap](${site}/sitemap.xml): every page on the site.`,
    '',
  );
  return out.join('\n');
}

/** A post as a block quote, so line breaks inside it survive. */
const quote = (text: string): string =>
  text
    .trim()
    .split('\n')
    .map((line) => `  > ${line}`.trimEnd())
    .join('\n');

function investorBlock(vc: Investor): string {
  const p = vc.proof;
  const by = p.kind === 'own' ? vc.name : (p.author ?? hostOf(p.url));
  const how = p.kind === 'own' ? 'posted' : p.kind === 'spotted' ? `named ${vc.name} here,` : 'wrote';
  const handle = vc.handle ? `, @${vc.handle} on X` : '';
  return `- ${vc.name}${vc.fund ? `, ${vc.fund}` : ''} (${ZONES[vc.crowd].label}${handle}). ${by} ${how} ${p.date}: ${p.url}\n${quote(p.text)}`;
}

function sceneBlock(item: SceneItem): string {
  return `- ${item.author}, ${item.date}: ${item.url}\n${quote(item.text)}`;
}

function cafeSection(site: string, city: City, cafe: Cafe): string {
  const lines = [
    `### ${cafe.name}, ${cafe.branch}`,
    '',
    `- Page: ${site}${routeHref(city.id, { kind: 'cafe', slug: cafe.slug })}`,
    `- Neighbourhood: ${cafe.area}, ${city.name}`,
    `- Address: ${cafe.address}`,
    `- Map: ${cafe.maps_url}`,
    `- Coordinates: ${cafe.lat}, ${cafe.lon}`,
    `- Who meets here most: ${ZONES[zoneOf(cafe)].label}`,
  ];
  if (cafe.note) lines.push(`- Note: ${cafe.note}`);
  if (cafe.vcs.length) lines.push('', 'Investors seen here:', '', ...cafe.vcs.map(investorBlock));
  if (cafe.scene.length) lines.push('', 'What founders say:', '', ...cafe.scene.map(sceneBlock));
  return lines.join('\n');
}

export function llmsFullTxt(site: string, updated: string | null): string {
  const out = [`# ${config.name}: every café, investor and post`, '', summary(), '', notes(updated)];
  for (const city of cities()) {
    out.push('', `## ${city.name}`, '', `${city.headline}: ${site}${routeHref(city.id)}`);
    for (const cafe of city.cafes) out.push('', cafeSection(site, city, cafe));
  }
  out.push('');
  return out.join('\n');
}
