// Nook: a guest signs in, finds a stay and asks the AI about it (answers come only from the listing).
import { signIn } from './_lib.mjs';
export default {
  name: 'nook',
  url: 'https://nook.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'maya@nook.test', 'coral-sunrise-2026', { ready: 'text=Find your next nook.' });
    s.keep();
    s.cue('Stays worth the trip');
    await s.pause(1600);
    await s.click('button:has-text("Kyoto")');
    await s.pause(1200);
    s.cue('Photos, amenities and live availability');
    await s.click('button:has-text("Machiya Garden House")');
    await s.pause(2000);
    await s.scrollTo('text=What this place offers');
    await s.pause(1400);
    await s.scrollTo('input[aria-label="Ask about this stay"]');
    s.cue('In-app AI answers from the listing only');
    await s.type('input[aria-label="Ask about this stay"]', 'Is it good for kids?', 50);
    await s.ai('button:text-is("Ask")', { min: 60 });
    await s.pause(3600);
  },
};
