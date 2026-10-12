// Atelier: a maker signs in, browses the shop, opens a product in the studio and has the AI
// describe the piece (not saved).
import { signIn } from './_lib.mjs';
export default {
  name: 'atelier',
  url: 'https://atelier.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'hale@atelier.test', 'lilac-sage-harbor-98', { ready: 'text=Featured makers' });
    s.keep();
    s.cue('A marketplace for handmade work');
    await s.pause(1800);
    await s.scrollTo('text=The collection', 'start');
    await s.pause(1600);
    s.cue('Makers run their own studio');
    await s.click('button:has-text("My studio")');
    await s.pause(1800);
    await s.click('button:has-text("Products")');
    await s.pause(1500);
    await s.click('text=Speckled Stoneware Mug');
    await s.pause(1500);
    s.cue('In-app AI writes the product description');
    await s.ai('button:has-text("Describe my piece")', { min: 60 });
    await s.pause(3600);
  },
};
