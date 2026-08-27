import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const repositoryRoot = process.cwd();
const sitemapPath = resolve(repositoryRoot, 'sitemap.xml');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCanonicalUrl(html, filePath) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (!match) fail(`Canonical URL is missing in ${filePath}.`);
  return match[1];
}

function isNoindex(html) {
  return [...html.matchAll(/<meta\s+([^>]+)>/gi)].some((match) => {
    const attributes = match[1];
    const name = attributes.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = attributes.match(/\bcontent=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    return (name === 'robots' || name === 'googlebot') && content.includes('noindex');
  });
}

const args = process.argv.slice(2);
let updateDate = formatLocalDate();
let explicitDateProvided = false;
const htmlPaths = [];

for (const arg of args) {
  if (arg.startsWith('--date=')) {
    if (explicitDateProvided) fail('Specify --date only once.');
    explicitDateProvided = true;
    updateDate = arg.slice('--date='.length);
  } else if (arg.startsWith('--')) {
    fail(`Unknown option: ${arg}`);
  } else {
    htmlPaths.push(arg);
  }
}

if (htmlPaths.length === 0) fail('Provide one or more repository-relative HTML file paths.');
if (!isValidDate(updateDate)) fail(`Invalid date: ${updateDate}. Use YYYY-MM-DD.`);
if (!existsSync(sitemapPath)) fail('sitemap.xml was not found in the repository root.');

const sitemap = readFileSync(sitemapPath, 'utf8');
const updates = [];
const seenCanonicals = new Set();

for (const inputPath of htmlPaths) {
  if (inputPath === '404.html' || inputPath.endsWith('/404.html') || inputPath.endsWith('\\404.html')) {
    fail('404.html cannot be added to sitemap lastmod updates.');
  }

  const absolutePath = resolve(repositoryRoot, inputPath);
  const repositoryRelativePath = relative(repositoryRoot, absolutePath);
  if (repositoryRelativePath.startsWith(`..${sep}`) || repositoryRelativePath === '..') {
    fail(`Path must be inside the repository: ${inputPath}`);
  }
  if (!repositoryRelativePath.toLowerCase().endsWith('.html')) {
    fail(`Path must be an HTML file: ${inputPath}`);
  }
  if (!existsSync(absolutePath)) fail(`File does not exist: ${inputPath}`);

  const html = readFileSync(absolutePath, 'utf8');
  if (isNoindex(html)) fail(`Noindex page cannot be updated: ${inputPath}`);

  const canonicalUrl = getCanonicalUrl(html, inputPath);
  const escapedCanonical = escapeRegExp(canonicalUrl);
  const entryPattern = new RegExp(`(<url>\\s*<loc>${escapedCanonical}</loc>\\s*<lastmod>)([^<]+)(</lastmod>\\s*</url>)`);
  const entryMatch = sitemap.match(entryPattern);
  if (!entryMatch) fail(`Canonical URL is not present in sitemap.xml: ${canonicalUrl}`);
  if (!seenCanonicals.has(canonicalUrl)) {
    seenCanonicals.add(canonicalUrl);
    updates.push({ filePath: inputPath, canonicalUrl, entryPattern });
  }
}

let updatedSitemap = sitemap;
for (const update of updates) {
  updatedSitemap = updatedSitemap.replace(update.entryPattern, `$1${updateDate}$3`);
}

if (updatedSitemap !== sitemap) writeFileSync(sitemapPath, updatedSitemap, 'utf8');

console.log('Updated sitemap lastmod:');
for (const update of updates) {
  console.log(update.filePath);
  console.log(update.canonicalUrl);
  console.log(updateDate);
}
