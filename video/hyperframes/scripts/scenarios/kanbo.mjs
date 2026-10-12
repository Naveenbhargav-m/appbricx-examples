// Kanbo: the demo manager signs in, filters the board, opens a card and has the AI break it down
// (steps are shown, not added).
import { signIn } from './_lib.mjs';
export default {
  name: 'kanbo',
  url: 'https://kanbo.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'priya@kanbo.test', 'kanbo-manager-2026', { ready: 'text=Overdue' });
    s.keep();
    s.cue('A live team board, with real data');
    await s.pause(2000);
    s.cue('Filter cards as you type');
    await s.type('input[placeholder="Filter cards"]', 'checklist', 60);
    await s.pause(1400);
    s.cue('Open a card');
    await s.click('text=Welcome checklist redesign');
    await s.pause(1800);
    s.cue('In-app AI breaks it into concrete steps');
    await s.ai('button:has-text("Break it down")', { min: 60 });
    await s.pause(3200);
    await s.click('button[aria-label="Close"]');
    await page.locator('input[placeholder="Filter cards"]').fill('');
    s.cue('Each person sees their own work');
    await s.click('button:has-text("My work")');
    await page.waitForSelector('text=/Good (morning|afternoon|evening)/', { timeout: 30000 });
    await s.pause(2400);
  },
};
