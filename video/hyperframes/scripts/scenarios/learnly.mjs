// Learnly: a student signs in, continues a lesson, starts the quiz, asks the AI for a hint
// (Socratic, never the answer) and then answers. Progress resets nightly.
import { signIn } from './_lib.mjs';
export default {
  name: 'learnly',
  url: 'https://learnly.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'priya@learnly.test', 'cosmos-daisy-storm-40', { ready: 'text=My courses' });
    s.keep();
    s.cue('Courses and progress, picked up where you left off');
    await s.pause(2200);
    s.cue('Short lessons, then a quick quiz');
    await s.click('button:has-text("Continue")');
    await s.pause(1800);
    await s.scrollBy(320);
    await s.pause(600);
    await s.scrollTo('text=Start quiz');
    await s.click('text=Start quiz');
    await s.pause(1500);
    await s.scrollTo('button:has-text("Ask for a hint")');
    s.cue('In-app AI gives a hint, never the answer');
    await s.ai('button:has-text("Ask for a hint")', { retry: 'button:has-text("hint")', min: 50 });
    await s.pause(3400);
    s.cue('Then you answer it yourself');
    await s.click('button:has-text("Indentation")');
    await s.pause(2600);
  },
};
