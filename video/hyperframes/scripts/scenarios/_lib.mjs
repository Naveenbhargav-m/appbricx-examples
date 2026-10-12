// Shared steps for showcase scenarios.
//
// signIn: show the app's own sign-in screen for a moment, type the public demo
// login (listed on https://appbricx.com/showcase), press Sign in, and cut the
// wait while the app loads.
export async function signIn(page, s, email, password, { hold = 2200, cue = 'A sign-in screen of its own, with Google sign-in', ready } = {}) {
  await page.waitForSelector('input[type=email]', { timeout: 30000 });
  await s.pause(1200); // let the entrance animation finish off camera
  s.keep();
  s.cue(cue);
  await s.pause(hold);
  await s.type('input[type=email]', email, 30);
  await s.type('input[type=password]', password, 18);
  // Point at the button, then submit with Enter: some sign-in buttons animate
  // forever and never count as "stable" for a click.
  await s.moveTo('button:has-text("Sign in")');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /sign in/i.test(x.textContent)); if (b) { const r = b.getBoundingClientRect(); window.__recRipple && window.__recRipple(r.x + r.width / 2, r.y + r.height / 2); } });
  await page.keyboard.press('Enter');
  await s.pause(400);
  s.cut();
  await page.waitForSelector('input[type=password]', { state: 'detached', timeout: 30000 });
  if (ready) await page.waitForSelector(ready, { timeout: 30000 });
  await s.pause(1200);
}
