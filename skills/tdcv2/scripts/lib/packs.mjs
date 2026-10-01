/**
 * Search TDCv2 data packs by words. Shared by scripts/find-packs.mjs and the
 * MCP server.
 *
 * Ranking: a word matching the last segment of the address beats one matching
 * a middle segment; the description only breaks ties. A pack that matches the
 * description alone is not offered — "a diagnosis any patient can have"
 * mentions "patient" and is not a patient name. No fuzzy matching: on tens of
 * thousands of addresses a typo matches nearly everything. Pack contents are
 * never returned.
 */
const split = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9À-￿]+/).filter(Boolean);
const baseOf = (loc) => (loc?.includes('-') ? loc.slice(0, loc.lastIndexOf('-')) : null);

/** One row per path a config writes, built once per engine. */
const indexes = new WeakMap();
function indexOf(tdc) {
  if (indexes.has(tdc)) return indexes.get(tdc);
  // packRoots() sees what a run sees: bundled packs plus those installed with
  // `tdcv2 pack add`. Engines before it only expose the bundled ones.
  const seesInstalled = typeof tdc.packRoots === 'function';
  const roots = seesInstalled ? tdc.packRoots() : [tdc.bundledPacksDir()];
  const { registry, locales: knownLocales } = tdc.scanPacks(roots);
  // Engines up to 0.3.2 leave `locale` empty for packs without a `locale:` line,
  // though a run finds them by folder; later ones fill it. For the older ones:
  // take the locale from the address when its first segment is a locale the
  // engine lists.
  const localeOf = (e) => {
    if (e.locale) return e.locale;
    const first = e.address.split('.')[0];
    return knownLocales?.has?.(first) ? first : undefined;
  };
  const byPath = new Map();
  for (const e of registry.values()) {
    const loc = localeOf(e);
    const path = loc && e.address.startsWith(`${loc}.`) ? e.address.slice(loc.length + 1) : e.address;
    const row = byPath.get(path) ?? { path, locales: new Set(), descs: new Map() };
    if (loc) row.locales.add(loc);
    if (e.description) row.descs.set(loc ?? '', e.description);
    byPath.set(path, row);
  }
  // Keyed families — geo.capitalByCountry.France, …Germany — are one pack to a
  // config: value="geo.capitalByCountry.${{Country}}" under parent="Country".
  for (const [path, row] of [...byPath]) {
    const segs = path.split('.');
    const at = segs.findIndex((seg, k) => k < segs.length - 1 && /By[A-Z]/.test(seg));
    if (at < 0) continue;
    const family = `${segs.slice(0, at + 1).join('.')}.\${{…}}`;
    const key = segs.slice(at + 1).join('.');
    const fam = byPath.get(family) ?? { path: family, locales: new Set(), descs: new Map(), keys: [] };
    fam.keys.push(key);
    for (const l of row.locales) fam.locales.add(l);
    for (const [l, d] of row.descs) if (!fam.descs.has(l)) fam.descs.set(l, d.replace(key, '<key>'));
    byPath.set(family, fam);
    byPath.delete(path);
  }
  const installed = new Set([...registry.values()].map(localeOf).filter(Boolean));
  const idx = { byPath, installed, seesInstalled, version: tdc.VERSION };
  indexes.set(tdc, idx);
  return idx;
}

/**
 * @returns {{ engine, seesInstalled, installed, locale, missingLocale,
 *   matches: {path, locales, description}[], more, partial,
 *   closest: {path, locales, description}[] }}
 */
export function searchPacks(tdc, { words, locale, limit = 15 }) {
  const { byPath, installed, seesInstalled, version } = indexOf(tdc);
  words = words.flatMap((w) => w.toLowerCase().split(/[\s,]+/)).filter(Boolean);
  locale = locale?.toLowerCase();
  const describe = (row) => {
    const d = row.descs.get(locale) ?? row.descs.get(baseOf(locale)) ?? row.descs.get('en') ?? row.descs.get('') ?? [...row.descs.values()][0] ?? '';
    return row.keys ? `keyed by ${row.keys.length}: ${row.keys.slice(0, 4).join(', ')}${row.keys.length > 4 ? ', …' : ''} — ${d}` : d;
  };
  const wantLocale = (row) => {
    if (!locale || !row.locales.size) return true;
    if (row.locales.has(locale)) return true;
    const base = baseOf(locale);
    return base ? row.locales.has(base) : false;
  };
  const scored = [];
  for (const row of byPath.values()) {
    if (!wantLocale(row)) continue;
    const segs = row.path.split('.');
    const last = split(segs.at(-1));
    const middle = segs.slice(0, -1).flatMap(split);
    const description = describe(row);
    const desc = split(description);
    let matched = 0, addr = 0, byDesc = 0;
    for (const w of words) {
      const inLast = last.some((t) => t === w) ? 3 : last.some((t) => t.startsWith(w) || (w.startsWith(t) && t.length > 3)) ? 2 : 0;
      const inMiddle = middle.some((t) => t === w || t.startsWith(w)) ? 1 : 0;
      if (inLast || inMiddle) matched++;
      addr += Math.max(inLast, inMiddle);
      if (desc.some((t) => t === w || t.startsWith(w))) byDesc++;
    }
    if (matched) scored.push({ path: row.path, locales: [...row.locales].sort(), description, matched, addr, byDesc });
  }
  // Address first; then how widely the path exists (a common path is the one a
  // config usually wants); then the shorter path; the description last.
  scored.sort((a, b) => b.matched - a.matched || b.addr - a.addr || b.locales.length - a.locales.length
    || a.path.length - b.path.length || b.byDesc - a.byDesc);
  // Only packs that answer every word are an answer; the rest are a count, or —
  // when nothing answers every word — a labelled "closest".
  const full = scored.filter((h) => h.matched === words.length);
  const strip = ({ path, locales, description }) => ({ path, locales, description });
  const missingLocale = Boolean(locale && !installed.has(locale) && !(baseOf(locale) && installed.has(baseOf(locale))));
  return {
    engine: version,
    seesInstalled,
    installed: [...installed].sort(),
    locale: locale ?? null,
    words,
    missingLocale,
    matches: full.slice(0, limit).map(strip),
    more: Math.max(0, full.length - limit),
    partial: scored.length - full.length,
    closest: full.length ? [] : scored.slice(0, 3).map(strip),
  };
}

/** The result as the lines scripts/find-packs.mjs prints. */
export function formatPackSearch(r) {
  const out = [];
  const line = (row) => {
    const n = row.locales.length;
    const where = n ? ` [${row.locales.slice(0, 8).join(' ')}${n > 8 ? ` +${n - 8}` : ''}]` : '';
    const desc = row.description.length > 110 ? `${row.description.slice(0, 107).replace(/\s+\S*$/, '')}…` : row.description;
    return `${row.path}${where} — ${desc}`;
  };
  if (r.missingLocale) {
    // The answer is "install it", not "write the list by hand".
    if (r.seesInstalled) {
      out.push(`Locale "${r.locale}" is not installed here (installed: ${r.installed.join(', ') || 'none'}).`);
    } else {
      out.push(`This tdcv2 (${r.engine}) lists only its bundled packs (${r.installed.join(', ')}), not ones added with \`pack add\`.`);
      out.push(`If "${r.locale}" is already added: write the path you expect, set local="${r.locale}", and run`);
      out.push('`npx -y tdcv2@0.3.3 check --brief` — paths differ between locales, and TDC217 names where it exists.');
      out.push('If not added yet:');
    }
    out.push('Install it:  npx -y tdcv2@0.3.3 init --yes   (once per project, if tdcv2.config.json is missing)');
    out.push(`             npx -y tdcv2@0.3.3 pack add ${r.locale}`);
    if (r.seesInstalled) out.push('Then search again.');
    if (r.matches.length) out.push('', 'Locale-free packs that match meanwhile:');
  }
  if (!r.matches.length) {
    if (!r.missingLocale) {
      out.push(`No pack matches all of "${r.words.join(' ')}"${r.locale ? ` in locale ${r.locale}` : ''}.`);
      if (r.closest.length) {
        out.push('Closest, matching only some of the words — probably not what you want:');
        for (const h of r.closest) out.push(`  ${line(h)}`);
      }
      out.push('Try another word (English works best: lastName, iban, city), or write the list in the config yourself.');
    }
  } else {
    for (const h of r.matches) out.push(line(h));
    if (r.more) out.push(`… ${r.more} more; narrow the words or raise --limit.`);
    if (r.partial) out.push(`(${r.partial} more match only some of the words — search them one at a time to see those.)`);
  }
  return out;
}
