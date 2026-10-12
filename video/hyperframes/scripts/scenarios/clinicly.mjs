// Clinicly: a doctor signs in, opens today's appointment, types visit notes and has the AI write a
// patient-friendly summary. Notes are not saved.
import { signIn } from './_lib.mjs';
export default {
  name: 'clinicly',
  url: 'https://clinicly.apps.appbricx.com',
  async run(page, s) {
    await signIn(page, s, 'amara@clinicly.test', 'ivory-tango-daisy-30', { ready: 'text=Day timeline' });
    s.keep();
    s.cue('A doctor’s day, with no double booking');
    await s.pause(1600);
    await s.click('button:has-text("SUN")');
    await s.pause(1800);
    await s.click('button:has-text("TODAY")');
    await s.pause(900);
    s.cue('Private patient history for each visit');
    await s.click('button:has-text("Lab results review")');
    await s.pause(2000);
    await s.scrollTo('text=Patient history');
    await s.pause(2200);
    const before = s.mark();
    s.cue('Notes from the visit');
    await s.scrollTo('textarea[aria-label="Summary"]');
    await s.type('textarea[aria-label="Summary"]', 'Blood panel reviewed. Iron slightly low. Headaches better with more sleep.', 22);
    await s.type('textarea[aria-label="Plan"]', 'Iron supplement daily for 8 weeks.', 22);
    await s.scrollTo('button:has-text("Write patient summary")');
    s.cue('In-app AI drafts a patient-friendly summary');
    const answer = await s.ai('button:has-text("Write patient summary")', { retry: 'button:has-text("patient summary"), button:has-text("Rewrite"), button:has-text("Regenerate")', min: 60, tries: 6, optional: true });
    if (!answer) { s.rewind(before); return; } // AI unavailable: end on the patient history
    await s.pause(3600);
  },
};
