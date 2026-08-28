import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

const host = 'www.kfysmart.com';
const key = 'd99bae1b515b4b05a40d9b0cb47aee66';
const keyFileName = `${key}.txt`;
const repositoryRoot = process.cwd();
const keyFilePath = resolve(repositoryRoot, keyFileName);
const keyLocation = `https://${host}/${keyFileName}`;
const endpoint = 'https://api.indexnow.org/indexnow';
const maximumUrls = 10_000;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function isNoindex(html) {
  return [...html.matchAll(/<meta\s+([^>]+)>/gi)].some((match) => {
    const attributes = match[1];
    const name = attributes.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = attributes.match(/\bcontent=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    return (name === 'robots' || name === 'googlebot') && content.includes('noindex');
  });
}

function canonicalFromHtml(html, filePath) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (!match) fail(`Canonical URL is missing in ${filePath}.`);
  return match[1];
}

function validateProductionUrl(value, source) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`Invalid production URL from ${source}: ${value}`);
  }

  if (url.protocol !== 'https:') fail(`URL must use https: ${value}`);
  if (url.hostname !== host) fail(`URL host must be ${host}: ${value}`);
  if (url.username || url.password) fail(`URL must not include credentials: ${value}`);
  return url.href;
}

function validateKeyFile() {
  if (basename(keyFilePath) !== keyFileName) fail('IndexNow key filename does not match the configured key.');
  if (!existsSync(keyFilePath)) fail(`IndexNow key file is missing: ${keyFileName}`);
  if (readFileSync(keyFilePath, 'utf8').trim() !== key) fail('IndexNow key file content does not match the configured key.');
}

function resolveHtmlPath(inputPath) {
  const absolutePath = resolve(repositoryRoot, inputPath);
  const repositoryRelativePath = relative(repositoryRoot, absolutePath);
  const outsideRepository = repositoryRelativePath === '..'
    || repositoryRelativePath.startsWith(`..${sep}`)
    || isAbsolute(repositoryRelativePath);

  if (outsideRepository) fail(`Path must be inside the repository: ${inputPath}`);
  if (!repositoryRelativePath.toLowerCase().endsWith('.html')) fail(`Path must be an HTML file: ${inputPath}`);
  if (basename(repositoryRelativePath).toLowerCase() === '404.html') fail('404.html cannot be submitted to IndexNow.');
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) fail(`File does not exist: ${inputPath}`);

  return { absolutePath, repositoryRelativePath };
}

function resolveInput(input) {
  if (input.includes('://')) return validateProductionUrl(input, 'explicit input URL');

  const { absolutePath, repositoryRelativePath } = resolveHtmlPath(input);
  const html = readFileSync(absolutePath, 'utf8');
  if (isNoindex(html)) fail(`Noindex page cannot be submitted: ${repositoryRelativePath}`);
  return validateProductionUrl(canonicalFromHtml(html, repositoryRelativePath), repositoryRelativePath);
}

function printSummary(title, urls, status) {
  console.log(title);
  console.log(`Host: ${host}`);
  console.log(`Key location: ${keyLocation}`);
  console.log(`URLs: ${urls.length}`);
  if (status) console.log(`Status: ${status}`);
  console.log('Submitted:');
  for (const url of urls) console.log(url);
}

const args = process.argv.slice(2);
let dryRun = false;
const inputs = [];

for (const arg of args) {
  if (arg === '--dry-run') {
    if (dryRun) fail('Specify --dry-run only once.');
    dryRun = true;
  } else if (arg.startsWith('--')) {
    fail(`Unknown option: ${arg}`);
  } else {
    inputs.push(arg);
  }
}

if (inputs.length === 0) fail('Provide one or more repository-relative HTML paths or production URLs.');
validateKeyFile();

const urls = [...new Set(inputs.map(resolveInput))];
if (urls.length > maximumUrls) fail(`A maximum of ${maximumUrls} unique URLs can be submitted at once.`);

if (dryRun) {
  printSummary('IndexNow DRY RUN', urls);
  process.exit(0);
}

const payload = { host, key, keyLocation, urlList: urls };

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (response.status === 200) {
    printSummary('IndexNow submission:', urls, '200 OK');
  } else if (response.status === 202) {
    printSummary('IndexNow submission:', urls, '202 Accepted — key validation pending');
  } else {
    const explanations = {
      400: 'Bad request / invalid format.',
      403: 'IndexNow key verification failed.',
      422: 'URL host or protocol does not match the submission host.',
      429: 'Too many requests. No automatic retry was attempted.',
    };
    fail(`IndexNow request failed with HTTP ${response.status}. ${explanations[response.status] ?? ''}`.trim());
  }
} catch (error) {
  fail(`IndexNow network request failed: ${error.message}`);
}
