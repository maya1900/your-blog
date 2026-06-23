import { isValidElement } from 'react'
import type { ReactNode } from 'react'
import { replaceEmojiShortcodes } from '@/utils/emoji'

export function markdownHeadingText(source: string): string {
  return replaceEmojiShortcodes(source)
    .replace(/\s+#+\s*$/, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([\\`*{}[\]()#+\-.!_>])/g, '$1')
    .replace(/[*_~]+/g, '')
    .trim()
}

export function slugifyHeading(text: string): string {
  const slug = markdownHeadingText(text)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'section'
}

export function textFromReactNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node)
  }
  if (Array.isArray(node)) return node.map(textFromReactNode).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromReactNode(node.props.children)
  }
  return ''
}
