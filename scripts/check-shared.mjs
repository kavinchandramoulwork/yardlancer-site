// The header, menu, footer and waitlist block are copied into every page, so
// this checks the copies still match and every page has its own SEO tags.
//
//   node scripts/check-shared.mjs            checks, and lists any placeholders
//   node scripts/check-shared.mjs --deploy   also fails if a placeholder remains
import { readFileSync } from 'node:fs';

const PAGES = ['', 'teens/', 'parents/', 'neighbors/', 'trust/', 'privacy/', 'terms/', 'support/'];
const WITH_WAITLIST = ['', 'teens/', 'parents/', 'neighbors/'];
const PARENT_EXTRA = " That's all we use your address for.";

const read = (page) => readFileSync(`${page}index.html`, 'utf8');
const between = (text, start, end) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  return from < 0 || to < 0 ? null : text.slice(from, to + end.length);
};

const problems = [];
const compare = (label, pages, extract) => {
  const expected = extract('');
  if (!expected) problems.push(`Home has no ${label}`);
  for (const page of pages) {
    if (extract(page) !== expected) problems.push(`${label} differs on /${page}`);
  }
};

compare('header and menu', PAGES, (page) => between(read(page), '<a class="skip-link"', '</dialog>'));
compare('footer', PAGES, (page) => between(read(page), '<footer class="site-footer', '</footer>'));
compare('waitlist block', WITH_WAITLIST, (page) =>
  between(read(page), '<section class="section waitlist-block"', '</section>')?.replace(PARENT_EXTRA, '')
);

const TAGS = [
  /<title>[^<]+<\/title>/,
  /<meta name="description" content="[^"]+"/,
  /<link rel="canonical" href="https:\/\/yardlancer\.com\/[^"]*"/,
  /<meta property="og:title"/,
  /<meta property="og:description"/,
  /<meta property="og:image"/,
  /<meta name="twitter:card" content="summary_large_image"/,
];
const seenTitles = new Set();
for (const page of PAGES) {
  const html = read(page);
  for (const tag of TAGS) {
    if (!tag.test(html)) problems.push(`/${page} is missing ${tag.source}`);
  }
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  if (seenTitles.has(title)) problems.push(`/${page} repeats the title "${title}"`);
  seenTitles.add(title);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) problems.push(`/${page} needs exactly one h1`);
}

const placeholders = [];
for (const page of PAGES) {
  const html = read(page);
  for (const match of html.matchAll(/class="phone-empty"[^>]*>(?:Screenshot coming<br \/>)?([^<]+)</g)) {
    placeholders.push(`/${page}  ${match[1]}`);
  }
  for (const match of html.matchAll(/data-placeholder>([^<]+)</g)) {
    placeholders.push(`/${page}  "${match[1]}"`);
  }
}

console.log(placeholders.length ? `Placeholders still showing:\n  ${placeholders.join('\n  ')}` : 'No placeholders.');
if (process.argv.includes('--deploy') && placeholders.length) {
  problems.push(`${placeholders.length} placeholder(s) remain`);
}

if (problems.length) {
  console.error(`\nFAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\nShared pieces match on every page, and every page has its own tags.');
