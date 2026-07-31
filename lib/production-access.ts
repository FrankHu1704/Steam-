// Shared by the developer-panel actions and the /api/v1/charges route so
// both agree on what counts as "production access unlocked". Two paths:
// a permanent unlock (one-time 300 MT payment, production_unlocked_at) or
// a single free 24h trial (production_access_expires_at) — whichever a
// producer used first. The permanent unlock always wins once granted,
// even if a past (expired) trial timestamp is still sitting on the row.
export const PRODUCTION_TRIAL_HOURS = 24;

export interface ProductionAccessProfile {
  production_unlocked_at: string | null;
  production_access_expires_at: string | null;
}

export function hasActiveProductionAccess(profile: ProductionAccessProfile): boolean {
  if (profile.production_unlocked_at) return true;
  if (profile.production_access_expires_at) {
    return new Date(profile.production_access_expires_at) > new Date();
  }
  return false;
}

export function isTrialExpired(profile: ProductionAccessProfile): boolean {
  return (
    !profile.production_unlocked_at &&
    !!profile.production_access_expires_at &&
    new Date(profile.production_access_expires_at) <= new Date()
  );
}

export function canStartProductionTrial(profile: ProductionAccessProfile): boolean {
  return !profile.production_unlocked_at && !profile.production_access_expires_at;
}
