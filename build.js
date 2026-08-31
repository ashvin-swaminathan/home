#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');

// Directories
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const STATIC_DIR = path.join(ROOT, 'static');
const DIST_DIR = path.join(ROOT, 'dist');
const LAYOUT_PATH = path.join(TEMPLATES_DIR, '_layout.ejs');

// Pages configuration
const PAGES = [
  {
    output: 'index.html',
    template: 'index.ejs',
    title: 'Home',
    currentPage: 'home',
    dataKeys: ['profile', 'papers'],
  },
  {
    output: 'research.html',
    template: 'research.ejs',
    title: 'Research',
    currentPage: 'research',
    dataKeys: ['profile', 'papers'],
  },
  {
    output: 'projects.html',
    template: 'projects.ejs',
    title: 'Projects',
    currentPage: 'projects',
    dataKeys: ['profile', 'projects'],
  },
  {
    output: 'talks.html',
    template: 'talks.ejs',
    title: 'Presentations',
    currentPage: 'talks',
    dataKeys: ['profile', 'talks'],
  },
  {
    output: 'teaching.html',
    template: 'teaching.ejs',
    title: 'Teaching',
    currentPage: 'teaching',
    dataKeys: ['profile', 'teaching'],
  },
  {
    output: 'vita.html',
    template: 'vita.ejs',
    title: 'Vita',
    currentPage: 'vita',
    dataKeys: ['profile', 'vita'],
  },
];

/**
 * Load all JSON data files from the data/ directory.
 */
function loadData() {
  const data = {};
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const key = path.basename(file, '.json');
    data[key] = fs.readJsonSync(path.join(DATA_DIR, file));
  }
  return data;
}

/**
 * Format an author list into an HTML string, bolding the site owner.
 * Uses ", " as separator and " and " before the last author when >1.
 */
function formatAuthors(authors, matchStrings) {
  const parts = authors.map(author => {
    const isMatch = matchStrings.some(ms =>
      author.toLowerCase().includes(ms.toLowerCase())
    );
    return isMatch
      ? `<strong class="self-author">${author}</strong>`
      : author;
  });

  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/**
 * Process papers: attach an `authorsHtml` field to each paper.
 */
function processPapers(papersData, profile) {
  const matchStrings = profile.authorMatchStrings || [];
  for (const section of papersData.sections) {
    for (const paper of section.papers) {
      if (paper.authors && paper.authors.length > 0) {
        paper.authorsHtml = formatAuthors(paper.authors, matchStrings);
      } else {
        paper.authorsHtml = '';
      }
    }
  }
  return papersData;
}

/**
 * Parse a year from a string that may contain ranges like "2017-2019"
 * or comma-separated values like "2016, 2015, 2014".
 * Returns the most recent (largest) year found, or null.
 */
function parseYear(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const str = String(value);
  const matches = str.match(/\d{4}/g);
  if (!matches) return null;
  return Math.max(...matches.map(Number));
}

/**
 * Format a news date for display. `date` carries whatever precision is known:
 * "2026-09-01", "2026-09" or "2026". An explicit `dateDisplay` wins, which is
 * how a date range ("Apr 13-17, 2026") gets rendered.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatNewsDate(item) {
  if (item.dateDisplay) return item.dateDisplay;
  const parts = String(item.date || '').split('-');
  const [y, m, d] = parts;
  if (!y) return '';
  if (!m) return y;
  const month = MONTHS[Number(m) - 1] || '';
  return d ? `${month} ${Number(d)}, ${y}` : `${month} ${y}`;
}

/**
 * The news feed: the profile's hand-written entries, newest first.
 * Entries known only to the year sort below the dated ones for that year,
 * since we cannot place them any more precisely.
 */
function generateNewsFeed(profile) {
  const items = (profile.highlights || []).map(item => ({
    ...item,
    dateLabel: formatNewsDate(item),
    // Normalise to YYYY-MM-DD so a year-only entry ("2026-00-00") sorts
    // below every dated entry of that year rather than above them.
    sortKey: (() => {
      const [y = '0000', m = '00', d = '00'] = String(item.date || '').split('-');
      return `${y}-${m}-${d}`;
    })(),
  }));
  return items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
}

/**
 * Build every page: render template, wrap in layout, write to dist/.
 */
function build() {
  const startTime = Date.now();
  console.log('Building site...\n');

  // Load data
  const allData = loadData();
  const { profile } = allData;

  // Process papers
  if (allData.papers) {
    allData.papers = processPapers(allData.papers, profile);
  }

  // Ensure dist/ exists and copy static assets
  fs.emptyDirSync(DIST_DIR);
  if (fs.existsSync(STATIC_DIR)) {
    fs.copySync(STATIC_DIR, DIST_DIR);
  }

  // Read the layout template once
  const layoutSource = fs.readFileSync(LAYOUT_PATH, 'utf-8');

  // Build each page
  const built = [];
  for (const page of PAGES) {
    const templatePath = path.join(TEMPLATES_DIR, page.template);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');

    // Assemble the data context for this page template
    const dataContext = {};
    for (const key of page.dataKeys) {
      dataContext[key] = allData[key];
    }

    // Build the news feed for the homepage
    if (page.currentPage === 'home') {
      dataContext.news = generateNewsFeed(profile);
    }

    // 1. Render the page template to get inner content
    const content = ejs.render(templateSource, dataContext, {
      filename: templatePath,
    });

    // 2. Render the layout with the content embedded
    const html = ejs.render(layoutSource, {
      title: page.title,
      currentPage: page.currentPage,
      profile,
      content,
    }, {
      filename: LAYOUT_PATH,
    });

    // 3. Write to dist/
    const outputPath = path.join(DIST_DIR, page.output);
    fs.writeFileSync(outputPath, html, 'utf-8');
    built.push(page.output);
  }

  const elapsed = Date.now() - startTime;
  console.log(`Built ${built.length} pages in ${elapsed}ms:`);
  for (const name of built) {
    console.log(`  - ${name}`);
  }
  console.log();
}

/**
 * Watch mode: rebuild on changes in data/ and templates/.
 */
function watch() {
  console.log('Watching for changes in data/ and templates/...\n');

  let debounce = null;
  const rebuild = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        build();
      } catch (err) {
        console.error('Build error:', err.message);
      }
    }, 100);
  };

  for (const dir of [DATA_DIR, TEMPLATES_DIR]) {
    fs.watch(dir, { recursive: true }, rebuild);
  }
}

// --- Main ---
try {
  build();
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}

if (process.argv.includes('--watch')) {
  watch();
}
