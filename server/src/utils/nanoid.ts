/**
 * Tiny URL-safe random ID. No external dep.
 * Avoids pulling in `nanoid` and getting tangled in the ESM/CJS interop dance.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function nanoid(length = 12): string {
  let id = ''
  for (let i = 0; i < length; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return id
}
