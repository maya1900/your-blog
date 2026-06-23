export function displayName(user: { username: string; nickname?: string | null }) {
  return user.nickname?.trim() || user.username
}
