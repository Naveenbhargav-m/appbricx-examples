// Eventra: an organiser signs in, checks sales for an event and has the AI write the blurb (not saved).
import { signIn } from './_lib.mjs';
export default {
  name: 'eventra',
  url: 'https://eventra.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'jules@eventra.test', 'cobalt-harbor-zest-76', { ready: 'text=YOUR NIGHTS' });
    s.keep();
    s.cue('Every night at a glance: sold and checked in');
    await s.pause(2400);
    s.cue('Sales by tier and the guest list, live');
    await s.click('text=VELVET RIOT LIVE');
    await s.pause(2600);
    await s.click('button:has-text("Edit event")');
    await s.pause(1200);
    await s.scrollTo('button:has-text("Write blurb with AI")');
    s.cue('In-app AI writes the event blurb');
    await s.ai('button:has-text("Write blurb with AI")', { retry: 'button:has-text("blurb"), button:has-text("Rewrite")', min: 90, tries: 14 });
    await s.scrollTo('textarea >> nth=0', 'center');
    await s.pause(3800);
  },
};
