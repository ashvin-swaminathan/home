#!/usr/bin/env node

const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EXPERIENCE_DESC = `Research in number theory and algebraic geometry, focusing on arithmetic statistics, invariant theory, and the Cohen-Lenstra heuristics. Building workflows combining large language models, symbolic computation, and formal verification for mathematical research.

Key results include determining the second moment of 2-Selmer groups of elliptic curves (with Bhargava and Shankar), proving geometry-of-numbers methods work in cusps of fundamental domains, and showing most odd-degree binary forms fail to primitively represent a square.

Teaching: Instructor for courses on Rational Points on Varieties and Arithmetic Statistics. Mentoring undergraduate and graduate researchers.`;

const PHD_DESC = `PhD in Mathematics. Thesis: "2-Selmer groups, 2-class groups, and the arithmetic of binary forms."
Advisor: Manjul Bhargava.

Awards: NSF Graduate Research Fellowship, Paul and Daisy Soros Fellowship for New Americans, Centennial Fellowship, Princeton Engineering Council Teaching Award.`;

const AB_DESC = `AB in Mathematics, AM in Physics.
Senior thesis: "Inflection points of linear systems on families of curves," advised by Joe Harris and Anand Patel. Published as a Memoir of the American Mathematical Society.

Awards: Frank and Brennie Morgan Prize (AMS/MAA/SIAM), David B. Mumford Prize, Barry M. Goldwater Scholarship, Phi Beta Kappa (Junior 24), Detur Book Prize.`;

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

    // Scroll to experience section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Experience');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(1000);
    await page.screenshot({ path: '/tmp/linkedin-experience.png', fullPage: false });
    console.log('Experience screenshot saved.');

    // Scroll to education
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Education');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(1000);
    await page.screenshot({ path: '/tmp/linkedin-education.png', fullPage: false });
    console.log('Education screenshot saved.');

  } else if (mode === 'edit-experience') {
    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Scroll to Experience section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Experience');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(1500);

    // Find the edit link near Experience heading (same pattern as About)
    const expY = await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Experience');
      return el ? el.getBoundingClientRect().y : null;
    });
    console.log(`Experience heading at y=${expY}`);

    // Look for the first experience entry's edit link - click on the Harvard entry
    const expLinks = await page.locator('a:visible').all();
    for (const link of expLinks) {
      const href = await link.getAttribute('href') || '';
      if (href.includes('add-edit') && href.includes('POSITION')) {
        const box = await link.boundingBox();
        if (box && expY && Math.abs(box.y - expY) < 200) {
          console.log(`Found experience edit link: ${href.substring(0, 80)}`);
          await link.click();
          await sleep(3000);
          await page.screenshot({ path: '/tmp/linkedin-exp-edit.png', fullPage: false });

          // Look for description textarea
          const textareas = await page.locator('textarea:visible').all();
          console.log(`Found ${textareas.length} textareas`);
          for (let i = 0; i < textareas.length; i++) {
            const id = await textareas[i].getAttribute('id') || '';
            const val = await textareas[i].inputValue();
            console.log(`  Textarea ${i}: id="${id.substring(0, 40)}" val="${val.substring(0, 40)}"`);
            if (id.toLowerCase().includes('description') || id.toLowerCase().includes('summary')) {
              await textareas[i].click();
              await page.keyboard.press('Meta+a');
              await sleep(300);
              await textareas[i].fill(EXPERIENCE_DESC);
              console.log('Experience description filled!');
              break;
            }
          }

          await sleep(1000);
          await page.screenshot({ path: '/tmp/linkedin-exp-filled.png', fullPage: false });

          // Save
          const saveBtn = page.locator('button:has-text("Save")').first();
          if (await saveBtn.isVisible({ timeout: 3000 })) {
            await saveBtn.click();
            await sleep(3000);
            await page.screenshot({ path: '/tmp/linkedin-exp-saved.png', fullPage: false });
            console.log('Saved experience!');
          }
          break;
        }
      }
    }

  } else if (mode === 'edit-education') {
    console.log('Navigating to profile...');
    await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);

    // Scroll to Education
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Education');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(1500);

    const eduY = await page.evaluate(() => {
      const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Education');
      return el ? el.getBoundingClientRect().y : null;
    });
    console.log(`Education heading at y=${eduY}`);

    // Find education edit links
    const eduLinks = await page.locator('a:visible').all();
    let editedCount = 0;
    for (const link of eduLinks) {
      const href = await link.getAttribute('href') || '';
      if (href.includes('add-edit') && href.includes('EDUCATION')) {
        const box = await link.boundingBox();
        if (box && eduY && Math.abs(box.y - eduY) < 300) {
          const text = await link.innerText().catch(() => '');
          console.log(`Found education edit link: "${text.substring(0,30)}" href=${href.substring(0, 80)}`);

          // Determine which school this is
          const isPrinceton = href.toLowerCase().includes('princeton') || text.toLowerCase().includes('princeton');
          const isHarvard = href.toLowerCase().includes('harvard') || text.toLowerCase().includes('harvard');

          await link.click();
          await sleep(3000);
          await page.screenshot({ path: `/tmp/linkedin-edu-edit-${editedCount}.png`, fullPage: false });

          // Find the activities/description textarea
          const textareas = await page.locator('textarea:visible').all();
          console.log(`Found ${textareas.length} textareas`);
          for (let i = 0; i < textareas.length; i++) {
            const id = await textareas[i].getAttribute('id') || '';
            const val = await textareas[i].inputValue();
            console.log(`  Textarea ${i}: id="${id.substring(0, 60)}" val="${val.substring(0, 40)}"`);
          }

          // Fill the description/activities textarea (usually the last or largest one)
          // Look for one with "activities" or "description" in the id
          for (const ta of textareas) {
            const id = await ta.getAttribute('id') || '';
            if (id.toLowerCase().includes('activit') || id.toLowerCase().includes('descript')) {
              const desc = isPrinceton ? PHD_DESC : AB_DESC;
              await ta.click();
              await page.keyboard.press('Meta+a');
              await sleep(300);
              await ta.fill(desc);
              console.log(`Filled ${isPrinceton ? 'Princeton' : 'Harvard'} description!`);
              break;
            }
          }

          await sleep(1000);
          await page.screenshot({ path: `/tmp/linkedin-edu-filled-${editedCount}.png`, fullPage: false });

          // Save
          const saveBtn = page.locator('button:has-text("Save")').first();
          if (await saveBtn.isVisible({ timeout: 3000 })) {
            await saveBtn.click();
            await sleep(3000);
            console.log('Saved education entry!');
          }

          editedCount++;
          if (editedCount >= 2) break;

          // Go back to profile for the next entry
          await page.goto('https://www.linkedin.com/in/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
          await sleep(4000);
          await page.evaluate(() => {
            const el = [...document.querySelectorAll('span, h2')].find(e => e.textContent.trim() === 'Education');
            if (el) el.scrollIntoView({ block: 'center' });
          });
          await sleep(1500);
        }
      }
    }
  }

  console.log('Done. Browser stays open for 30s.');
  await sleep(30000);
  await browser.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
