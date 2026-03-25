#!/usr/bin/env node

const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SKILLS = [
  'Number Theory', 'Algebraic Geometry', 'Arithmetic Statistics',
  'Machine Learning', 'Large Language Models', 'Formal Verification',
  'Statistical Modeling', 'Python', 'SageMath', 'LaTeX', 'Lean 4',
  'Probability Theory', 'Mathematical Research', 'Data Analysis'
];

const TOP_PAPERS = [
  {
    title: 'The second moment of the size of the 2-Selmer group of elliptic curves',
    authors: 'Manjul Bhargava, Arul Shankar, Ashvin Swaminathan',
    url: 'https://arxiv.org/abs/2110.09063',
  },
  {
    title: 'Counting integral points on symmetric varieties with applications to arithmetic statistics',
    authors: 'Arul Shankar, Artane Siad, Ashvin Swaminathan',
    journal: 'Proceedings of the London Mathematical Society',
    url: 'https://arxiv.org/abs/2304.01050',
  },
  {
    title: 'Most odd-degree binary forms fail to primitively represent a square',
    authors: 'Ashvin Swaminathan',
    journal: 'Compositio Mathematica',
    url: 'https://arxiv.org/abs/1910.12409',
  },
  {
    title: 'A new parametrization for ideal classes in rings defined by binary forms, and applications',
    authors: 'Ashvin Swaminathan',
    journal: "Journal fur die Reine und Angewandte Mathematik (Crelle's Journal)",
    url: 'https://arxiv.org/abs/2011.13578',
  },
  {
    title: 'Inflectionary invariants for isolated complete intersection curve singularities',
    authors: 'Anand Patel, Ashvin Swaminathan',
    journal: 'Memoirs of the American Mathematical Society',
    url: 'https://arxiv.org/abs/1705.08761',
  },
];

const AWARDS = [
  { title: 'Frank and Brennie Morgan Prize', issuer: 'AMS/MAA/SIAM', year: '2017', desc: 'For outstanding research by an undergraduate student.' },
  { title: 'Paul and Daisy Soros Fellowship for New Americans', issuer: 'Paul & Daisy Soros Fellowships', year: '2017', desc: 'Two-year graduate fellowship for immigrants and children of immigrants.' },
  { title: 'NSF Graduate Research Fellowship', issuer: 'National Science Foundation', year: '2017', desc: 'Five-year graduate research fellowship.' },
  { title: 'Barry M. Goldwater Scholarship', issuer: 'Barry Goldwater Scholarship Foundation', year: '2016', desc: 'For undergraduate students in STEM research.' },
  { title: 'David B. Mumford Prize', issuer: 'Harvard University', year: '2017', desc: 'For excellence in mathematics.' },
  { title: 'NSF Postdoctoral Fellowship', issuer: 'National Science Foundation', year: '2022', desc: 'Mathematical Sciences Postdoctoral Research Fellowship.' },
];

async function main() {
  const mode = process.argv[2] || 'screenshot';
  console.log(`Mode: ${mode}`);

  const browser = await chromium.launchPersistentContext(
    '/Users/ashvin/Library/Application Support/Google/Chrome/Default',
    {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
      args: ['--disable-blink-features=AutomationControlled'],
    }
  );

  const page = await browser.newPage();

  if (mode === 'screenshot') {
    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Scroll through the page and capture everything
    for (let i = 0; i < 5; i++) {
      await page.evaluate((idx) => window.scrollBy(0, 500), i);
      await sleep(800);
      await page.screenshot({ path: `/tmp/linkedin-scroll-${i}.png`, fullPage: false });
    }
    console.log('Screenshots saved.');

  } else if (mode === 'add-publications') {
    // LinkedIn publications are added through the "Add profile section" button
    // or via direct URL
    console.log('Navigating to add publication...');

    for (let i = 0; i < TOP_PAPERS.length; i++) {
      const paper = TOP_PAPERS[i];
      console.log(`\nAdding paper ${i + 1}/${TOP_PAPERS.length}: ${paper.title.substring(0, 50)}...`);

      await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);

      // Scroll to top and click "Add profile section"
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(2000);
      // Force click via JS since button may be in a tricky position
      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const addBtn = btns.find(b => b.textContent.includes('Add profile section'));
        if (addBtn) { addBtn.click(); return true; }
        return false;
      });
      if (!clicked) {
        console.log('Could not find Add profile section button');
        break;
      }
      await sleep(2000);
      await page.screenshot({ path: `/tmp/linkedin-add-menu-${i}.png`, fullPage: false });

      // Look for "Publications" or "Recommended" section in the dropdown
      // Click on the publications option
      const pubOption = page.locator('text=Publications').first();
      if (await pubOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pubOption.click();
        await sleep(2000);
      } else {
        // May need to click "Recommended" or "Additional" first
        const additionalBtn = page.locator('text=Additional').first();
        if (await additionalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await additionalBtn.click();
          await sleep(1000);
        }
        const pubOption2 = page.locator('text=Publications').first();
        if (await pubOption2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await pubOption2.click();
          await sleep(2000);
        } else {
          // Try "Accomplishments" category
          const accBtn = page.locator('text=Accomplishments').first();
          if (await accBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await accBtn.click();
            await sleep(1000);
            const pubOption3 = page.locator('text=Publication').first();
            await pubOption3.click({ timeout: 3000 });
            await sleep(2000);
          }
        }
      }

      await page.screenshot({ path: `/tmp/linkedin-pub-form-${i}.png`, fullPage: false });

      // Fill the publication form
      const inputs = await page.locator('input:visible').all();
      console.log(`Found ${inputs.length} inputs`);
      for (let j = 0; j < inputs.length; j++) {
        const id = await inputs[j].getAttribute('id') || '';
        const label = await inputs[j].getAttribute('aria-label') || '';
        const placeholder = await inputs[j].getAttribute('placeholder') || '';
        console.log(`  Input ${j}: id="${id.substring(0,50)}" label="${label}" placeholder="${placeholder}"`);

        const idLower = id.toLowerCase();
        const labelLower = label.toLowerCase();
        if (idLower.includes('title') || labelLower.includes('title')) {
          await inputs[j].fill(paper.title);
          console.log('  -> Filled title');
        } else if (idLower.includes('publisher') || labelLower.includes('publisher') || idLower.includes('journal')) {
          await inputs[j].fill(paper.journal || 'arXiv preprint');
          console.log('  -> Filled publisher');
        } else if (idLower.includes('url') || labelLower.includes('url') || idLower.includes('link')) {
          await inputs[j].fill(paper.url);
          console.log('  -> Filled URL');
        }
      }

      // Fill authors in textarea if available
      const textareas = await page.locator('textarea:visible').all();
      for (const ta of textareas) {
        const id = await ta.getAttribute('id') || '';
        if (id.toLowerCase().includes('author') || id.toLowerCase().includes('description')) {
          await ta.fill(paper.authors);
          console.log('  -> Filled authors/description');
        }
      }

      await sleep(1000);
      await page.screenshot({ path: `/tmp/linkedin-pub-filled-${i}.png`, fullPage: false });

      // Save
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 })) {
        await saveBtn.click();
        await sleep(3000);
        console.log('  Saved!');
      }
    }

  } else if (mode === 'add-awards') {
    console.log('Adding honors and awards...');

    for (let i = 0; i < AWARDS.length; i++) {
      const award = AWARDS[i];
      console.log(`\nAdding award ${i + 1}/${AWARDS.length}: ${award.title}`);

      await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);

      // Scroll to Honors & awards and click the + button
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Honors & awards');
        if (el) el.scrollIntoView({ block: 'center' });
      });
      await sleep(1500);

      // Find the + button near Honors & awards
      const honorsY = await page.evaluate(() => {
        const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Honors & awards');
        return el ? el.getBoundingClientRect().y : null;
      });

      let addClicked = false;
      if (honorsY) {
        const links = await page.locator('a:visible, button:visible').all();
        for (const link of links) {
          const box = await link.boundingBox();
          if (!box || Math.abs(box.y - honorsY) > 30) continue;
          const label = await link.getAttribute('aria-label') || '';
          const href = await link.getAttribute('href') || '';
          if (href.includes('add-edit') && href.includes('HONOR')) {
            await link.click();
            addClicked = true;
            break;
          }
          if (label.toLowerCase().includes('add') || box.width < 50) {
            const svg = await link.locator('svg').count();
            if (svg > 0) {
              await link.click();
              addClicked = true;
              break;
            }
          }
        }
      }

      if (!addClicked) {
        // Fallback: use Add profile section menu
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(1000);
        await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')];
          const addBtn = btns.find(b => b.textContent.includes('Add profile section'));
          if (addBtn) addBtn.click();
        });
        await sleep(2000);
        const accBtn = page.locator('text=Accomplishments').first();
        if (await accBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await accBtn.click();
          await sleep(1000);
        }
        let awardOption = page.locator('text=Honor').first();
        if (!(await awardOption.isVisible({ timeout: 2000 }).catch(() => false))) {
          awardOption = page.locator('text=Award').first();
        }
        await awardOption.click({ timeout: 3000 }).catch(() => {});
      }
      await sleep(2000);

      await page.screenshot({ path: `/tmp/linkedin-award-form-${i}.png`, fullPage: false });

      // Fill the form
      const inputs = await page.locator('input:visible').all();
      console.log(`Found ${inputs.length} inputs`);
      for (let j = 0; j < inputs.length; j++) {
        const id = await inputs[j].getAttribute('id') || '';
        const labelAttr = await inputs[j].getAttribute('aria-label') || '';
        console.log(`  Input ${j}: id="${id.substring(0,50)}" label="${labelAttr}"`);

        const idLower = id.toLowerCase();
        if (idLower.includes('title') || idLower.includes('name')) {
          await inputs[j].fill(award.title);
          console.log('  -> Filled title');
        } else if (idLower.includes('issuer') || idLower.includes('organization') || idLower.includes('associatedWith')) {
          await inputs[j].fill(award.issuer);
          console.log('  -> Filled issuer');
        }
      }

      // Fill description textarea
      const textareas = await page.locator('textarea:visible').all();
      for (const ta of textareas) {
        const id = await ta.getAttribute('id') || '';
        if (id.toLowerCase().includes('description')) {
          await ta.fill(award.desc);
          console.log('  -> Filled description');
        }
      }

      await sleep(1000);

      // Save
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 })) {
        await saveBtn.click();
        await sleep(3000);
        console.log('  Saved!');
      }
    }

  } else if (mode === 'add-skills') {
    console.log('Navigating to skills...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Scroll to Skills
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Skills');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(1000);

    // Find the + button or "Add" near skills, or the pencil edit
    const skillsY = await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Skills');
      return el ? el.getBoundingClientRect().y : null;
    });
    console.log(`Skills heading at y=${skillsY}`);

    // Find add/edit links near Skills
    const links = await page.locator('a:visible, button:visible').all();
    for (const link of links) {
      const href = await link.getAttribute('href') || '';
      const box = await link.boundingBox();
      if (box && skillsY && Math.abs(box.y - skillsY) < 40) {
        const label = await link.getAttribute('aria-label') || '';
        const text = await link.innerText().catch(() => '');
        console.log(`  Near Skills: href="${href.substring(0,60)}" label="${label}" text="${text.substring(0,20)}"`);
      }
    }

    await page.screenshot({ path: '/tmp/linkedin-skills.png', fullPage: false });
  }

  console.log('\nDone. Browser stays open for 30s.');
  await sleep(30000);
  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
