// Ledgerly: a member signs in, looks at the dashboard and budgets, and asks the AI to explain the month.
import { signIn } from './_lib.mjs';
export default {
  name: 'ledgerly',
  url: 'https://ledgerly.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'maya.chen@ledgerly.test', 'cobalt-maple-2027', { ready: 'button:has-text("Insights")' });
    s.keep();
    s.cue('Your money at a glance, with real data');
    await s.pause(2200);
    await s.scrollBy(380, 'main');
    await s.pause(800);
    s.cue('Every transaction, with categories');
    await s.click('button:has-text("Activity")');
    await s.pause(2600);
    s.cue('Budgets that fill up as you spend');
    await s.click('button:has-text("Budgets")');
    await s.pause(2800);
    const before = s.mark();
    s.cue('In-app AI explains your month');
    await s.click('button:has-text("Insights")');
    await s.pause(1200);
    const answer = await s.ai('button:has-text("Explain my month")', { retry: 'button:has-text("Explain")', min: 80, tries: 6, optional: true });
    if (!answer) { s.rewind(before); return; } // AI unavailable: end on budgets rather than show the fallback
    await s.pause(4200);
  },
};
