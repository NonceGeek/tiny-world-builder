import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bootJs = readFileSync(new URL('../engine/world/30-ui-boot-wiring.js', import.meta.url), 'utf8');
const multiplayerJs = readFileSync(new URL('../engine/world/38-multiplayer-partykit.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../tiny-world-builder.html', import.meta.url), 'utf8');
const i18nEn = readFileSync(new URL('../engine/i18n/en.js', import.meta.url), 'utf8');

test('time of day is live GMT/UTC instead of saved local preference', () => {
  assert.match(bootJs, /function gmtTodMinutes\(now\) \{[\s\S]*getUTCHours\(\) \* 60 \+ d\.getUTCMinutes\(\) \+ \(d\.getUTCSeconds\(\) \/ 60\)/);
  assert.match(bootJs, /let todMinutes = gmtTodMinutes\(\)/);
  assert.match(bootJs, /setInterval\(syncTodToGmt, TOD_GMT_SYNC_INTERVAL_MS\)/);
  assert.match(bootJs, /readout\.textContent = formatTime\(todMinutes\) \+ ' GMT'/);
  assert.match(bootJs, /range\.disabled = true/);
  assert.doesNotMatch(bootJs, /tinyworld:tod\.v1/);
  assert.doesNotMatch(bootJs, /localStorage\.(?:getItem|setItem)\(TOD_LS/);
  assert.match(html, /Time of day \(GMT\)/);
  assert.match(i18nEn, /'time\.timeOfDay': 'Time of day \(GMT\)'/);
});

test('multiplayer environment does not overwrite GMT time of day', () => {
  assert.match(multiplayerJs, /new clients ignore host time and follow GMT\/UTC/);
  assert.doesNotMatch(multiplayerJs, /setRange\('time-range'/);
  assert.doesNotMatch(multiplayerJs, /const timeRange = document\.getElementById\('time-range'\)/);

  const envKeyMatch = multiplayerJs.match(/function envKey\(env\) \{([\s\S]*?)\n    \}/);
  assert.ok(envKeyMatch, 'envKey function exists');
  assert.doesNotMatch(envKeyMatch[1], /timeOfDay/);
});
