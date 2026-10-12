// Tablefor: a guest signs in, asks the menu (in-app AI), looks at the slot picker and her QR pass.
// Creates nothing. Demo login from https://appbricx.com/showcase.
import { signIn } from './_lib.mjs';
export default {
  name: 'tablefor',
  url: 'https://tablefor.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'maya@tablefor.test', 'ember-polar-hazel-29', { ready: 'text=From the fire' });
    s.keep();
    s.cue('A real restaurant: menu, hours and booking');
    await s.pause(2000);
    await s.scrollTo('input[aria-label="Ask the menu"]');
    s.cue('In-app AI: ask the menu for a craving');
    await s.type('input[aria-label="Ask the menu"]', 'vegetarian, not too spicy', 45);
    await s.ai('button:has-text("Suggest dishes")', { min: 40 });
    await s.scrollBy(140);
    await s.pause(2600);
    s.cue('Pick a date, party size and time slot');
    await s.click('header button:has-text("Book"), nav button:has-text("Book") >> nth=0');
    await s.pause(1200);
    await s.click('button:has-text("FRI") >> nth=0');
    await s.pause(700);
    await s.click('button[aria-label="More guests"]');
    await s.pause(500);
    await s.click('button:has-text("19:00")');
    await s.pause(1600);
    s.cue('Every booking gets a QR pass for the door');
    await s.click('button:has-text("My bookings")');
    await s.pause(1500);
    await s.click('button:has-text("Party of")');
    await s.pause(2600);
  },
};
