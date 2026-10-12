// Stride: a coach signs in, opens an athlete, and has the in-app AI draft feedback (not sent).
import { signIn } from './_lib.mjs';
export default {
  name: 'stride',
  url: 'https://stride.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'marcus@stride.test', 'cotton-plum-spark-21');
    await page.goto('https://stride.apps.appbricx.com/coach', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=ATHLETES');
    await s.pause(1500);
    s.keep();
    s.cue('A coach’s roster with streaks and check-ins');
    await s.pause(2600);
    s.cue('Open an athlete: logs, plan and check-ins');
    await s.click('button:has-text("Jordan Blake") >> nth=0');
    await page.waitForSelector('text=DRAFT FEEDBACK');
    await s.pause(2000);
    s.cue('In-app AI drafts encouraging feedback');
    await s.ai('button:has-text("DRAFT FEEDBACK")', { retry: 'button:has-text("DRAFT")', min: 80 });
    await s.pause(3500);
    s.cue('The coach edits it, then sends');
    await s.moveTo('button:has-text("SEND NOTE")');
    await s.pause(1600);
  },
};
