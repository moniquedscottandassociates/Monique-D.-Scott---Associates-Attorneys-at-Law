/**
 * build-indexes.js
 * Monique D. Scott & Associates — CMS Index Builder
 *
 * Runs during Netlify build (node scripts/build-indexes.js).
 * Reads all markdown files in content/publications/ and content/listings/,
 * extracts front matter, and writes JSON index files used by the frontend JS.
 *
 * No npm dependencies required — pure Node.js.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse YAML front matter from a markdown string.
 * Handles: strings, booleans, numbers, and simple quoted values.
 */
function parseFrontMatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) return {};

    const data = {};
    match[1].split(/\r?\n/).forEach(line => {
        const colonIdx = line.indexOf(': ');
        if (colonIdx === -1) return;

        const key = line.slice(0, colonIdx).trim();
        let val   = line.slice(colonIdx + 2).trim();

        // Strip surrounding quotes
        val = val.replace(/^["']|["']$/g, '');

        // Coerce type
        if (val === 'true')       val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(val) && val !== '') val = Number(val);

        data[key] = val;
    });

    return data;
}

/**
 * Read all .md files in a folder and return an array of parsed front matter objects,
 * each augmented with a `slug` field derived from the filename.
 */
function buildIndex(folder) {
    const dir = path.join(ROOT, folder);

    if (!fs.existsSync(dir)) {
        console.warn(`  [warn] Folder not found: ${folder} — skipping`);
        return [];
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

    const items = files.map(file => {
        const slug    = file.replace(/\.md$/, '');
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const data    = parseFrontMatter(content);
        return { slug, ...data };
    });

    // Filter to published / available items only
    const visible = items.filter(item => {
        if (item.status === 'draft') return false;
        return true;
    });

    // Sort by date descending (publications), or by title (listings)
    visible.sort((a, b) => {
        if (a.date && b.date) return new Date(b.date) - new Date(a.date);
        return (a.title || '').localeCompare(b.title || '');
    });

    return visible;
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('\nMDS Build — generating content indexes…\n');

// Publications
const publications = buildIndex('content/publications');
fs.writeFileSync(
    path.join(ROOT, 'content', 'publications-index.json'),
    JSON.stringify(publications, null, 2),
    'utf8'
);
console.log(`  ✓ publications-index.json — ${publications.length} item(s)`);

// Listings
const listings = buildIndex('content/listings');
fs.writeFileSync(
    path.join(ROOT, 'content', 'listings-index.json'),
    JSON.stringify(listings, null, 2),
    'utf8'
);
console.log(`  ✓ listings-index.json     — ${listings.length} item(s)`);

console.log('\nBuild complete.\n');
