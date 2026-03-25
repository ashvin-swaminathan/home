#!/usr/bin/env node

const { chromium } = require('playwright');

const HEADLINE = 'NSF Postdoctoral Fellow & Benjamin Peirce Fellow | Harvard Mathematics | Number Theory & Algebraic Geometry';

const ABOUT = `Mathematician working at the intersection of number theory and algebraic geometry. My research focuses on arithmetic statistics, invariant theory, the Cohen-Lenstra heuristics, rational points on varieties, Diophantine equations, and enumerative geometry.

I am increasingly focused on building workflows that combine large language models, symbolic computation, and formal verification to attack research problems in number theory. I am broadly interested in roles in quantitative research and AI research that leverage deep mathematical thinking, statistical modeling, and computational problem-solving.

I received my AB in mathematics from Harvard College (senior thesis advised by Joe Harris and Anand Patel) and my PhD from Princeton University (advised by Manjul Bhargava). I am currently an NSF Postdoctoral Fellow and Benjamin Peirce Fellow at Harvard, mentored by Melanie Matchett Wood.

I am on the job market for 2026–27.`;

const WEBSITE_URL = 'https://ashvin-swaminathan.github.io/home/';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    await sleep(3000);
    await page.screenshot({ path: '/tmp/linkedin-profile.png', fullPage: false });
    console.log('Screenshot saved to /tmp/linkedin-profile.png');

  } else if (mode === 'update-headline') {
    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);

    // Click edit intro
    console.log('Opening edit intro...');
    await page.locator('button[aria-label*="Edit intro"]').first().click({ timeout: 10000 });
    await sleep(2000);

    // Scroll down in the modal to find headline
    const modal = page.locator('.artdeco-modal__content, [role="dialog"]').first();
    await modal.evaluate(el => el.scrollTop = el.scrollHeight);
    await sleep(1000);
    await page.screenshot({ path: '/tmp/linkedin-modal-scrolled.png', fullPage: false });

    // The headline is a textarea with "headline" in its id
    const headlineTextarea = page.locator('textarea[id*="headline"]').first();
    if (await headlineTextarea.isVisible({ timeout: 5000 })) {
      console.log('Found headline textarea, filling...');
      await headlineTextarea.click();
      await page.keyboard.press('Meta+a');
      await sleep(200);
      await headlineTextarea.fill(HEADLINE);
      console.log('Headline filled!');
    } else {
      console.log('Headline textarea not found by id. Trying first textarea...');
      const firstTA = page.locator('textarea:visible').first();
      const taId = await firstTA.getAttribute('id') || '';
      const taVal = await firstTA.inputValue();
      console.log(`  First textarea: id=${taId} value="${taVal.substring(0,50)}"`);
      if (taVal.toLowerCase().includes('postdoctoral') || taVal.toLowerCase().includes('fellow')) {
        await firstTA.click();
        await page.keyboard.press('Meta+a');
        await sleep(200);
        await firstTA.fill(HEADLINE);
        console.log('Headline filled via first textarea!');
      }
    }

    await sleep(1000);
    await page.screenshot({ path: '/tmp/linkedin-after-fill.png', fullPage: false });

    // Click Save
    console.log('Clicking Save...');
    await page.locator('button:has-text("Save")').first().click({ timeout: 5000 });
    await sleep(3000);
    await page.screenshot({ path: '/tmp/linkedin-saved.png', fullPage: false });
    console.log('Saved!');

  } else if (mode === 'update-about') {
    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Hover over the About section to reveal the edit button
    await page.evaluate(() => {
      const aboutHeader = [...document.querySelectorAll('span, h2')].find(el => el.textContent.trim() === 'About');
      if (aboutHeader) aboutHeader.scrollIntoView({ block: 'center' });
    });
    await sleep(1000);

    // Hover over the About section area to trigger the edit icon
    const aboutSection = page.locator('#about, section:has(span:text("About"))').first();
    if (await aboutSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aboutSection.hover();
      await sleep(1000);
    }
    await page.screenshot({ path: '/tmp/linkedin-scrolled.png', fullPage: false });

    // Find the About section edit button by looking for all buttons and their positions
    // relative to the "About" heading
    let aboutEdit = null;
    let found = false;

    // First find where the "About" heading is
    const aboutY = await page.evaluate(() => {
      const spans = [...document.querySelectorAll('span, h2')];
      const aboutEl = spans.find(el => el.textContent.trim() === 'About');
      if (aboutEl) return aboutEl.getBoundingClientRect().y;
      return null;
    });
    console.log(`About heading at y=${aboutY}`);

    if (aboutY) {
      // Find the closest pencil/edit button to the About heading
      const buttons = await page.locator('button:visible').all();
      let bestBtn = null;
      let bestDist = 999;
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        if (!box) continue;
        const dist = Math.abs(box.y - aboutY);
        const label = await btn.getAttribute('aria-label') || '';
        const svg = await btn.locator('svg').count();
        // Look for small icon buttons (pencil) near the About heading
        if (dist < 50 && svg > 0 && box.width < 60) {
          console.log(`  Candidate button: y=${box.y} dist=${dist} label="${label}" w=${box.width}`);
          if (dist < bestDist) {
            bestDist = dist;
            bestBtn = btn;
          }
        }
      }
      if (bestBtn) {
        aboutEdit = bestBtn;
        found = true;
        console.log(`Using edit button at distance ${bestDist}px from About heading`);
      }
    }

    if (!found) {
      // Fallback: try aria-label approach
      aboutEdit = page.locator('button[aria-label*="Edit about" i]').first();
      found = await aboutEdit.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!found) {
      // Try clicking on the pencil icon via a[href] or any clickable near About
      console.log('Checking for links/anchors near About...');
      const links = await page.locator('a:visible, [role="button"]:visible').all();
      for (const link of links) {
        const box = await link.boundingBox();
        if (!box || !aboutY) continue;
        const dist = Math.abs(box.y - aboutY);
        if (dist < 40 && box.width < 80) {
          const href = await link.getAttribute('href') || '';
          const label = await link.getAttribute('aria-label') || '';
          const cls = await link.getAttribute('class') || '';
          console.log(`  Near About: dist=${dist} href="${href}" label="${label}" cls="${cls.substring(0,40)}"`);
          if (href.includes('edit') || label.toLowerCase().includes('edit') || cls.includes('edit')) {
            aboutEdit = link;
            found = true;
            console.log('  -> Using this as About edit!');
            break;
          }
        }
      }
    }

    // Nuclear option: use the "Edit experience" page and navigate to about
    if (!found) {
      console.log('Trying direct navigation to about edit...');
      // LinkedIn sometimes has this URL pattern
      await page.goto('https://www.linkedin.com/in/me/edit/about/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await sleep(3000);
      await page.screenshot({ path: '/tmp/linkedin-about-direct.png', fullPage: false });
      const ta = page.locator('textarea:visible').first();
      if (await ta.isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true;
        console.log('Direct navigation worked! Found textarea.');
        await ta.click();
        await page.keyboard.press('Meta+a');
        await sleep(300);
        await ta.fill(ABOUT);
        console.log('About section filled!');
        await sleep(1000);
        await page.screenshot({ path: '/tmp/linkedin-about-filled.png', fullPage: false });
        await page.locator('button:has-text("Save")').first().click({ timeout: 5000 });
        await sleep(3000);
        await page.screenshot({ path: '/tmp/linkedin-about-saved.png', fullPage: false });
        console.log('Saved About!');
      } else {
        console.log('Direct URL did not work either.');
        await page.screenshot({ path: '/tmp/linkedin-about-direct.png', fullPage: false });
      }
    }

    if (found) {
      console.log('Found About edit button, clicking...');
      await aboutEdit.click();
      await sleep(3000);
      await page.screenshot({ path: '/tmp/linkedin-about-clicked.png', fullPage: false });
      console.log('Screenshot after click saved.');

      // Look for any textarea in a modal/dialog
      const allTextareas = await page.locator('textarea:visible').all();
      console.log(`Found ${allTextareas.length} visible textareas after click`);
      for (let i = 0; i < allTextareas.length; i++) {
        const id = await allTextareas[i].getAttribute('id') || '';
        const val = await allTextareas[i].inputValue();
        console.log(`  Textarea ${i}: id="${id}" value="${val.substring(0,60)}..."`);
      }

      // Find the right textarea - look for one with existing about text or the largest one
      let targetTA = null;
      for (const ta of allTextareas) {
        const val = await ta.inputValue();
        if (val.toLowerCase().includes('mathematician') || val.toLowerCase().includes('research') || val.length > 50) {
          targetTA = ta;
          break;
        }
      }
      if (!targetTA && allTextareas.length > 0) {
        targetTA = allTextareas[0]; // fallback to first
      }

      if (targetTA) {
        await targetTA.click();
        await page.keyboard.press('Meta+a');
        await sleep(300);
        await targetTA.fill(ABOUT);
        console.log('About section filled!');
        await sleep(1000);
        await page.screenshot({ path: '/tmp/linkedin-about-filled.png', fullPage: false });

        // Save
        console.log('Clicking Save...');
        await page.locator('button:has-text("Save")').first().click({ timeout: 5000 });
        await sleep(3000);
        await page.screenshot({ path: '/tmp/linkedin-about-saved.png', fullPage: false });
        console.log('Saved About!');
      } else {
        console.log('No suitable textarea found after clicking edit.');
      }
    } else {
      console.log('About edit button not found. Taking debug screenshot...');
      await page.screenshot({ path: '/tmp/linkedin-about-debug.png', fullPage: false });
      // List all buttons
      const buttons = await page.locator('button:visible').all();
      for (let i = 0; i < Math.min(buttons.length, 30); i++) {
        const label = await buttons[i].getAttribute('aria-label');
        const text = await buttons[i].innerText();
        if (label || text) console.log(`  Button ${i}: label="${label}" text="${text.substring(0,40)}"`);
      }
    }
  }

  console.log('Done. Browser stays open for 60s.');
  await sleep(60000);
  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
