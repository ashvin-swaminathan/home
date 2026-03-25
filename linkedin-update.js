#!/usr/bin/env node

/**
 * LinkedIn Profile Updater
 * Opens a browser, waits for you to log in, then fills out profile sections.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load profile data
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/profile.json'), 'utf8'));
const vita = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vita.json'), 'utf8'));
const teaching = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/teaching.json'), 'utf8'));
const papers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/papers.json'), 'utf8'));

const HEADLINE = 'NSF Postdoctoral Fellow & Benjamin Peirce Fellow | Harvard Mathematics | Number Theory & Algebraic Geometry';

const ABOUT = `Mathematician working at the intersection of number theory and algebraic geometry. My research focuses on arithmetic statistics, invariant theory, the Cohen-Lenstra heuristics, rational points on varieties, Diophantine equations, and enumerative geometry.

I am increasingly focused on building workflows that combine large language models, symbolic computation, and formal verification to attack research problems in number theory.

I received my AB in mathematics from Harvard College (senior thesis advised by Joe Harris and Anand Patel) and my PhD from Princeton University (advised by Manjul Bhargava). I am currently an NSF Postdoctoral Fellow and Benjamin Peirce Fellow at Harvard, mentored by Melanie Matchett Wood.

I am on the job market for 2026–27.`;

async function main() {
  console.log('Launching browser...');
  console.log('A Chrome window will open. Please log into LinkedIn manually.');
  console.log('Once you are on your LinkedIn feed, press Enter here to continue.\n');

  const browser = await chromium.launchPersistentContext(
    '/Users/ashvin/Library/Application Support/Google/Chrome/Default',
    {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
      args: ['--disable-blink-features=AutomationControlled'],
    }
  );

  const context = browser;

  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/login');

  // Wait for user to log in
  await waitForEnter('Press Enter after you have logged in to LinkedIn...');

  console.log('\nNavigating to your profile edit page...');
  await page.goto('https://www.linkedin.com/in/me/');
  await page.waitForLoadState('networkidle');
  await sleep(2000);

  // Take a screenshot so we can see what we're working with
  await page.screenshot({ path: '/tmp/linkedin-profile.png' });
  console.log('Screenshot saved to /tmp/linkedin-profile.png');

  console.log('\n=== Ready to update your profile ===');
  console.log('I will now attempt to update your headline and about section.');
  console.log('LinkedIn\'s UI changes frequently, so I\'ll go step by step.\n');

  await waitForEnter('Press Enter to start updating...');

  // Try to click the pencil/edit icon on the intro section
  try {
    console.log('Looking for the edit intro button...');

    // LinkedIn typically has a pencil icon button near the top of the profile
    const editBtn = page.locator('button[aria-label*="Edit intro"]').first();
    if (await editBtn.isVisible({ timeout: 5000 })) {
      await editBtn.click();
      await sleep(2000);
      await page.screenshot({ path: '/tmp/linkedin-edit-intro.png' });
      console.log('Edit intro modal opened. Screenshot at /tmp/linkedin-edit-intro.png');

      // Try to fill headline
      const headlineInput = page.locator('input[id*="headline"], input[aria-label*="Headline"]').first();
      if (await headlineInput.isVisible({ timeout: 3000 })) {
        await headlineInput.click({ clickCount: 3 }); // select all
        await headlineInput.fill(HEADLINE);
        console.log('Headline updated!');
      } else {
        console.log('Could not find headline input. You may need to fill it manually.');
      }

      // Save
      await waitForEnter('Review the changes in the browser, then press Enter to save...');
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 })) {
        await saveBtn.click();
        await sleep(2000);
        console.log('Saved intro changes.');
      }
    } else {
      console.log('Could not find "Edit intro" button. LinkedIn may have changed their UI.');
      console.log('Try clicking the pencil icon manually, then press Enter.');
      await waitForEnter('Press Enter after opening the edit dialog...');
    }
  } catch (e) {
    console.log('Error editing intro:', e.message);
  }

  // Update About section
  try {
    console.log('\nNow updating the About section...');
    await page.goto('https://www.linkedin.com/in/me/');
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Scroll to About section
    await page.evaluate(() => {
      const aboutSection = document.querySelector('#about');
      if (aboutSection) aboutSection.scrollIntoView();
    });
    await sleep(1000);

    // Look for edit button near About
    const aboutEdit = page.locator('button[aria-label*="Edit about"]').first();
    if (await aboutEdit.isVisible({ timeout: 5000 })) {
      await aboutEdit.click();
      await sleep(2000);

      const aboutTextarea = page.locator('textarea[id*="about"], textarea[aria-label*="About"]').first();
      if (await aboutTextarea.isVisible({ timeout: 3000 })) {
        await aboutTextarea.click({ clickCount: 3 });
        await aboutTextarea.fill(ABOUT);
        console.log('About section updated!');
      }

      await waitForEnter('Review the About text in the browser, then press Enter to save...');
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 })) {
        await saveBtn.click();
        await sleep(2000);
        console.log('Saved About section.');
      }
    } else {
      console.log('Could not find About edit button.');
      console.log('You can paste this About text manually:\n');
      console.log(ABOUT);
    }
  } catch (e) {
    console.log('Error editing About:', e.message);
  }

  console.log('\n=== Done with automated updates ===');
  console.log('The browser will stay open so you can make additional changes.');
  console.log('Press Enter here when you are done to close the browser.');
  await waitForEnter('');

  await browser.close();
  console.log('Browser closed. Done!');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForEnter(prompt) {
  return new Promise(resolve => {
    if (prompt) process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
