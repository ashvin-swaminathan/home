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
    dataKeys: ['profile', 'papers', 'talks', 'vita'],
  },
  {
    output: 'research.html',
    template: 'research.ejs',
    title: 'Research',
    currentPage: 'research',
    dataKeys: ['profile', 'papers'],
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
 * Generate a curated activity feed:
 * - The most recent paper (by year)
 * - The most recent past talk (year <= current year)
 * - All upcoming talks (year >= current year, future-looking)
 * - Manual highlights from profile
 */
function generateActivityFeed(allData) {
  const items = [];
  const currentYear = new Date().getFullYear();

  // (a) Most recent paper: find the one with the highest year
  if (allData.papers && allData.papers.sections) {
    let bestPaper = null;
    let bestYear = 0;
    for (const section of allData.papers.sections) {
      if (section.id === 'theses-expository') continue;
      for (const paper of section.papers) {
        const y = paper.year || 0;
        if (y > bestYear) {
          bestYear = y;
          bestPaper = paper;
        }
      }
    }
    if (bestPaper) {
      const links = bestPaper.links || {};
      const link = links.arxiv || links.journal || links.pdf || null;
      items.push({
        type: 'paper',
        text: bestPaper.title,
        detail: bestPaper.venue || bestPaper.status || null,
        date: bestYear,
        link,
      });
    }
  }

  // (b) Talks: most recent past talk + all upcoming (year >= currentYear)
  if (allData.talks) {
    const allTalks = [
      ...(allData.talks.invited || []),
      ...(allData.talks.contributed || []),
    ];

    // Find most recent past talk
    let recentTalk = null;
    let recentYear = 0;
    const upcomingTalks = [];

    for (const talk of allTalks) {
      if (talk.year == null) continue;
      if (talk.year >= currentYear) {
        upcomingTalks.push(talk);
      } else if (talk.year > recentYear) {
        recentYear = talk.year;
        recentTalk = talk;
      }
    }

    if (recentTalk) {
      items.push({
        type: 'talk',
        text: recentTalk.title,
        detail: recentTalk.venue,
        date: recentTalk.year,
      });
    }

    // Add all upcoming talks
    upcomingTalks.sort((a, b) => {
      const da = a.date || String(a.year);
      const db = b.date || String(b.year);
      return da < db ? -1 : da > db ? 1 : 0;
    });
    for (const talk of upcomingTalks) {
      items.push({
        type: 'upcoming',
        text: talk.title,
        detail: talk.venue,
        date: talk.year,
      });
    }
  }

  // (c) Manual highlights from profile
  if (allData.profile && allData.profile.highlights) {
    for (const highlight of allData.profile.highlights) {
      if (!highlight.manual) continue;
      items.push({
        type: 'news',
        text: highlight.text,
        detail: null,
        date: highlight.sortDate ? parseInt(highlight.sortDate, 10) : 0,
        link: highlight.link || null,
      });
    }
  }

  return items;
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

    // Generate activity feed for the homepage
    if (page.currentPage === 'home') {
      dataContext.activityFeed = generateActivityFeed(allData);
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
