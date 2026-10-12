// Builder lifecycle on a SCRATCH project (never a showcase app):
// Backend tab, Dev/Prod switch, snapshot, edit a row, restore the snapshot (rollback),
// SQL on dev, Run now on a workflow, Live events, Secrets (names only).
//
//   STORAGE_STATE=.auth/builder.json BUILDER_PROJECT=<project id> node scripts/record.mjs builder
//
// The session file comes from scripts/login.mjs; no password is typed on screen.
// Net effect on the project: one manual snapshot (plus the automatic pre-restore one),
// the row edit is rolled back by the restore, and one dummy secret named DEMO_WEBHOOK_KEY
// is added (value hidden).
const PROJECT = process.env.BUILDER_PROJECT || 'd8d62bc7-dd27-4d85-8900-962ab3f56db3';
const EDITOR = `https://appbricx.com/editor/${PROJECT}`;

export default {
  name: 'builder',
  url: EDITOR,
  colorScheme: 'dark',
  async run(page, s) {
    const tab = (t) => `button:text-is("${t}")`;
    await page.waitForSelector('button[title=Backend]', { timeout: 60000 });
    await page.locator('button[title="Toggle sidebar"]').click().catch(() => {});
    await page.locator('button[title=Backend]').click();
    await page.waitForSelector('text=Database Overview', { timeout: 60000 });
    await s.pause(1500);
    s.keep();
    s.cue('The Backend tab: data, logic and ops for your app');
    await s.pause(2200);
    s.cue('Every pane works on Dev or Prod');
    await s.click('button:text-is("Prod")');
    await s.pause(1500);
    await s.click('button:text-is("Dev")');
    await s.pause(900);

    s.cue('Take a snapshot before a risky change');
    await s.click(tab('Backups'));
    await page.waitForSelector('text=Database snapshots');
    await s.pause(900);
    await s.click('button:has-text("Take snapshot now")');
    await page.waitForSelector('text=Took a snapshot', { timeout: 30000 });
    await s.pause(1800);

    s.cue('Edit any row in the table editor');
    await s.click(tab('Data'));
    await page.waitForSelector('text=Browse and edit rows');
    await s.pause(600);
    await s.moveTo('select >> nth=0');
    await page.locator('select').first().selectOption('member');
    await page.waitForSelector('td:has-text("Marketing Manager")', { timeout: 20000 });
    await s.pause(1000);
    await s.click('tr:has-text("Marketing Manager") button[aria-label^="Edit row"]');
    await page.waitForSelector('text=Edit row');
    await s.pause(700);
    const job = page.locator('input[value="Marketing Manager"]').first();
    await job.click({ clickCount: 3 });
    await s.moveTo('input[value="Marketing Manager"]');
    await job.pressSequentially('Chief Sourdough Officer', { delay: 45 });
    await s.pause(500);
    await s.click('button:text-is("Save changes")');
    await page.waitForSelector('td:has-text("Chief Sourdough Officer")', { timeout: 20000 });
    await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollLeft > 0) e.scrollTo({ left: 0, behavior: 'smooth' }); }));
    await s.pause(900);
    await s.moveTo('td:has-text("Chief Sourdough Officer")');
    await s.pause(1600);

    s.cue('Changed your mind? Restore the snapshot');
    await s.click(tab('Backups'));
    await page.waitForSelector('text=Taken by hand');
    await s.pause(800);
    await s.click('button:has-text("Restore") >> nth=0');
    await page.waitForSelector('text=Restore this snapshot?');
    await s.pause(1500);
    await s.click('button:text-is("Restore") >> nth=-1');
    await s.pause(600);
    s.cut();
    await page.waitForSelector('text=/[Rr]estored/', { timeout: 60000 }).catch(() => {});
    await s.pause(800);
    s.keep();
    await s.pause(1500);
    s.cue('The row is back, as it was');
    await s.click(tab('Data'));
    await page.waitForSelector('text=Browse and edit rows');
    await page.locator('select').first().selectOption('member');
    await page.waitForSelector('td:has-text("Marketing Manager")', { timeout: 20000 });
    await s.moveTo('td:has-text("Marketing Manager")');
    await s.pause(1800);

    s.cue('Run SQL on the dev database');
    await s.click(tab('SQL'));
    await page.waitForSelector('text=SQL Runner');
    await s.type('textarea[placeholder*="Supports SELECT"]', 'select name, job, city from member order by name limit 6;', 30);
    await s.click('button:text-is("Run")');
    await page.waitForSelector('td:has-text("Chloe")', { timeout: 30000 }).catch(() => {});
    await s.pause(2600);

    s.cue('Run any workflow now and read its log');
    await s.click(tab('Workflows'));
    await page.waitForSelector('text=Run a workflow');
    await s.scrollTo('text=expire-matches');
    await s.click('button:text-is("Run now") >> nth=0');
    await s.pause(900);
    await s.click('button:text-is("Run now") >> nth=-1');
    await page.waitForSelector('text=succeeded', { timeout: 30000 });
    await s.pause(2600);
    await s.click('button:text-is("Close")');

    s.cue('Live: every row change as it happens');
    await s.click(tab('Live'));
    await page.waitForSelector('text=Live events');
    await s.pause(1200);
    // A second, unrecorded tab touches a few rows (values unchanged) so events arrive.
    const p2 = await page.context().newPage();
    await p2.goto(`${EDITOR}?pane=queries`, { waitUntil: 'networkidle' });
    await p2.locator('button[title=Backend]').click().catch(() => {});
    await p2.waitForSelector('text=SQL Runner', { timeout: 30000 });
    await p2.locator('textarea[placeholder*="Supports SELECT"]').click();
    await p2.locator('textarea[placeholder*="Supports SELECT"]').pressSequentially("update member set job = job where name in ('Matt', 'Chloe', 'Maya');", { delay: 5 });
    await p2.locator('button:text-is("Run")').click();
    await p2.waitForTimeout(1500);
    await p2.close();
    await page.bringToFront();
    await s.pause(3200);

    s.cue('Secrets: names are shown, values never are');
    await s.click(tab('Secrets'));
    await page.waitForSelector('text=Secrets and environment variables');
    await s.click('button:has-text("Add variable")');
    await s.type('input[aria-label=Name]', 'DEMO_WEBHOOK_KEY', 40);
    await s.type('input[aria-label=Value]', 'demo-not-a-real-key', 25);
    await s.click('button:text-is("Save")');
    await page.waitForSelector('text=DEMO_WEBHOOK_KEY', { timeout: 20000 });
    await s.pause(2600);
  },
};
