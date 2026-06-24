const TINYVERSE_ACCESS_DEFAULT_EMAILS = [
  'jason@bouncingfish.com',
  'jason.kneen@bouncingfish.com',
  'jason.kneen@gmail.com',
];

function cleanTinyverseEmail(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

export function tinyverseAccessEmails() {
  return new Set(TINYVERSE_ACCESS_DEFAULT_EMAILS);
}

export function isTinyverseAccessEmail(email) {
  const e = cleanTinyverseEmail(email);
  if (!e) return false;
  return tinyverseAccessEmails().has(e);
}

export function tinyverseLobbyAccessForEmail(email) {
  return isTinyverseAccessEmail(email);
}

// Dark-launch gate for the economy: the whole tinyverse economy (GOLD, coins,
// marketplace, referrals, paid AI, Stripe) is live on prod but reachable only by
// allowlisted (verified) accounts. Call AFTER requireAuthUser succeeds, passing the
// verified auth.user. Returns a 403 Response to return, or null if access is allowed.
export function requireTinyverseAccess(user, origin) {
  if (isTinyverseAccessEmail(user && user.email)) return null;
  return new Response(JSON.stringify({ error: 'tinyverse-access-required' }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
