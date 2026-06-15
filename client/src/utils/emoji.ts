export interface EmojiItem {
  shortcode: string
  emoji: string
  label: string
}

export const emojiItems: EmojiItem[] = [
  { shortcode: 'smile', emoji: '😀', label: '笑脸' },
  { shortcode: 'heart', emoji: '❤️', label: '红心' },
  { shortcode: 'rocket', emoji: '🚀', label: '火箭' },
  { shortcode: 'fire', emoji: '🔥', label: '火焰' },
  { shortcode: 'sparkles', emoji: '✨', label: '闪光' },
  { shortcode: 'coder', emoji: '👨‍💻', label: '码字' },
  { shortcode: 'rage_coder', emoji: '👨‍💻', label: '暴躁码字' },
  { shortcode: 'triumph', emoji: '😤', label: '哼' },
  { shortcode: 'thinking', emoji: '🤔', label: '思考' },
  { shortcode: 'joy', emoji: '😂', label: '笑哭' },
  { shortcode: 'mask', emoji: '😷', label: '口罩' },
  { shortcode: 'dizzy', emoji: '😵', label: '晕' },
  { shortcode: 'pleading', emoji: '🥺', label: '委屈' },
  { shortcode: 'confused', emoji: '😕', label: '困惑' },
  { shortcode: 'side_eye', emoji: '🙄', label: '斜眼' },
  { shortcode: 'blush', emoji: '☺️', label: '害羞' },
  { shortcode: 'grin', emoji: '😁', label: '露齿笑' },
  { shortcode: 'tongue', emoji: '😛', label: '吐舌' },
  { shortcode: 'sweat', emoji: '😓', label: '冷汗' },
  { shortcode: 'giggle', emoji: '🤭', label: '偷笑' },
  { shortcode: 'silly', emoji: '🙃', label: '倒脸' },
  { shortcode: 'hammer', emoji: '🔨', label: '锤' },
  { shortcode: 'unamused_sweat', emoji: '😒', label: '无语' },
  { shortcode: 'sob', emoji: '😭', label: '大哭' },
  { shortcode: 'cry', emoji: '😢', label: '哭' },
  { shortcode: 'shush', emoji: '🤫', label: '嘘' },
  { shortcode: 'cool', emoji: '😎', label: '墨镜' },
  { shortcode: 'scream', emoji: '😱', label: '惊恐' },
  { shortcode: 'flushed', emoji: '🥵', label: '脸红' },
  { shortcode: 'sad', emoji: '😞', label: '难过' },
  { shortcode: 'poop', emoji: '💩', label: '便便' },
  { shortcode: 'relaxed', emoji: '😊', label: '微笑' },
  { shortcode: 'heart_eyes', emoji: '😍', label: '喜欢' },
  { shortcode: 'sleepy', emoji: '😴', label: '困' },
  { shortcode: 'smirk_cool', emoji: '😎', label: '得意' },
  { shortcode: 'vomit', emoji: '🤮', label: '吐' },
  { shortcode: 'slight_smile', emoji: '🙂', label: '浅笑' },
  { shortcode: 'warning', emoji: '⚠️', label: '警告' },
  { shortcode: 'tip', emoji: '💡', label: '提示' },
  { shortcode: 'check', emoji: '✅', label: '完成' },
  { shortcode: 'x', emoji: '❌', label: '错误' },
]

export function replaceEmojiShortcodes(source: string) {
  return source.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name: string) => {
    return emojiItems.find((item) => item.shortcode === name)?.emoji ?? match
  })
}
