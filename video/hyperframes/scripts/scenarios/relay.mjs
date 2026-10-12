// Relay: an agent signs in to the help desk, opens a ticket and has the AI suggest a reply (not sent).
import { signIn } from './_lib.mjs';
export default {
  name: 'relay',
  url: 'https://relay.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'maya@relay.test', 'saffron-panda-plum-36', { ready: 'text=Queue' });
    s.keep();
    s.cue('A live help-desk queue with SLA timers');
    await s.pause(2400);
    s.cue('Open a ticket and read the thread');
    await s.click('button:has-text("Checkout page returns 500")');
    await s.pause(2200);
    s.cue('In-app AI suggests a reply in your tone');
    await s.ai('button:has-text("Suggest reply")', { min: 60 });
    await s.pause(3800);
  },
};
