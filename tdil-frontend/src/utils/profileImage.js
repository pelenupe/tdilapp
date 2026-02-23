export function resolveProfileImageUrl(profileImage) {
  if (!profileImage || typeof profileImage !== 'string') return null;

  const value = profileImage.trim();
  if (!value) return null;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')
  ) {
    return value;
  }

  return value.startsWith('/') ? value : `/${value}`;
}

export function appendCacheBust(url, cacheKey) {
  if (!url) return null;
  if (!cacheKey) return url;

  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}v=${encodeURIComponent(cacheKey)}`;
}

export function getUserProfileImageUrl(user) {
  if (!user) return null;

  const rawUrl =
    user.profileImage ||
    user.profile_image ||
    user.profilePicUrl ||
    user.profile_pic_url ||
    null;

  const normalized = resolveProfileImageUrl(rawUrl);
  const cacheKey = user.profileImageUpdatedAt || user.updatedAt || user.updated_at || null;

  return appendCacheBust(normalized, cacheKey);
}
