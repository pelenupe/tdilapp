const TIER_POINTS = {
  bronze: {
    userBonus: 10,
    sponsorPoints: 5
  },
  silver: {
    userBonus: 25,
    sponsorPoints: 10
  },
  gold: {
    userBonus: 50,
    sponsorPoints: 20
  }
};

const normalizeTier = (tier) => {
  if (!tier) return 'bronze';
  const normalized = String(tier).toLowerCase().trim();
  if (!TIER_POINTS[normalized]) return 'bronze';
  return normalized;
};

const getTierPoints = (tier) => {
  const normalized = normalizeTier(tier);
  return {
    tier: normalized,
    ...TIER_POINTS[normalized]
  };
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceMeters = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }

  const R = 6371000; // Earth radius meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  TIER_POINTS,
  normalizeTier,
  getTierPoints,
  distanceMeters
};
