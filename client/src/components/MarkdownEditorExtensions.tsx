import MDEditor, {
  commands,
  type ExecuteState,
  type ICommand,
  TextAreaTextApi,
} from '@uiw/react-md-editor'
import type { ComponentProps, CSSProperties } from 'react'
import {
  AlertTriangle,
  BookTemplate,
  CheckSquare,
  EyeOff,
  FileText,
  Highlighter,
  Info,
  Lightbulb,
  Link2,
  ListCollapse,
  MessageSquareQuote,
  MessageSquareReply,
  Smile,
  Subscript,
  Superscript,
  Table2,
  Keyboard,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { emojiItems, type EmojiItem } from '@/utils/emoji'

type WrapBlockKind = 'details' | 'spoiler' | 'note' | 'tip' | 'warning' | 'onebox' | 'reply'
export type SlashCommandId =
  | 'details'
  | 'spoiler'
  | 'note'
  | 'tip'
  | 'warning'
  | 'onebox'
  | 'reply'
  | 'table'
  | 'emoji'
  | 'checklist'
  | 'note-template'
  | 'tutorial-template'
  | 'review-template'

export interface SlashCommandItem {
  id: SlashCommandId
  label: string
  hint: string
  token: string
}

export interface SlashState {
  query: string
  range: { start: number; end: number }
}

export interface EmojiState {
  query: string
  range: { start: number; end: number }
}

const TEMPLATE_SNIPPETS = {
  note: `## 背景

## 结论

## 细节

[details="延伸阅读"]
- 
[/details]
`,
  tutorial: `## 目标

## 准备

## 步骤

1. 

## 常见坑

[spoiler="先别急着看答案"]

[/spoiler]
`,
  review: `## 发生了什么

## 影响范围

## 判断过程

## 后续动作

- [ ] 
`,
}

export type TemplateId = keyof typeof TEMPLATE_SNIPPETS

export const markdownTemplates: Array<{
  id: TemplateId
  label: string
  description: string
  content: string
}> = [
  {
    id: 'note',
    label: '笔记模板',
    description: '适合记录结论、背景和延伸阅读',
    content: TEMPLATE_SNIPPETS.note.trimEnd(),
  },
  {
    id: 'tutorial',
    label: '教程模板',
    description: '适合步骤型文章和操作说明',
    content: TEMPLATE_SNIPPETS.tutorial.trimEnd(),
  },
  {
    id: 'review',
    label: '复盘模板',
    description: '适合事故、项目和阶段复盘',
    content: TEMPLATE_SNIPPETS.review.trimEnd(),
  },
]

export const slashCommandItems: SlashCommandItem[] = [
  { id: 'details', label: '折叠', hint: 'details', token: 'details' },
  { id: 'spoiler', label: '隐藏', hint: 'spoiler', token: 'spoiler' },
  { id: 'note', label: '提示', hint: 'note', token: 'note' },
  { id: 'tip', label: '技巧', hint: 'tip', token: 'tip' },
  { id: 'warning', label: '警告', hint: 'warning', token: 'warning' },
  { id: 'onebox', label: '链接卡片', hint: 'onebox', token: 'onebox' },
  { id: 'reply', label: '回复可见', hint: 'reply', token: 'reply' },
  { id: 'table', label: '表格', hint: 'table', token: 'table' },
  { id: 'emoji', label: 'Emoji', hint: ':smile:', token: 'emoji' },
  { id: 'checklist', label: '任务列表', hint: 'todo', token: 'todo' },
  { id: 'note-template', label: '笔记模板', hint: 'template', token: 'note-template' },
  { id: 'tutorial-template', label: '教程模板', hint: 'template', token: 'tutorial-template' },
  { id: 'review-template', label: '复盘模板', hint: 'template', token: 'review-template' },
]

function blankBefore(text: string, start: number) {
  if (start === 0) return ''
  const before = text.slice(0, start)
  if (before.endsWith('\n\n')) return ''
  if (before.endsWith('\n')) return '\n'
  return '\n\n'
}

function blankAfter(text: string, end: number) {
  if (end >= text.length) return '\n'
  const after = text.slice(end)
  if (after.startsWith('\n\n')) return ''
  if (after.startsWith('\n')) return '\n'
  return '\n\n'
}

function insertBlock(
  state: ExecuteState,
  api: TextAreaTextApi,
  kind: WrapBlockKind,
  title: string,
  placeholder: string,
) {
  const body = state.selectedText || placeholder
  const before = blankBefore(state.text, state.selection.start)
  const after = blankAfter(state.text, state.selection.end)
  const open = `[${kind}="${title}"]`
  const close = `[/${kind}]`
  const insert = `${before}${open}\n${body}\n${close}${after}`

  api.replaceSelection(insert)

  const bodyStart = state.selection.start + before.length + open.length + 1
  api.setSelectionRange({ start: bodyStart, end: bodyStart + body.length })
}

function snippetForCommand(id: SlashCommandId, selectedText = '') {
  switch (id) {
    case 'details':
      return `[details="展开查看"]\n${selectedText || '这里写可折叠内容'}\n[/details]`
    case 'spoiler':
      return `[spoiler="隐藏内容"]\n${selectedText || '这里写需要先隐藏的内容'}\n[/spoiler]`
    case 'note':
      return `[note="提示"]\n${selectedText || '这里写补充说明'}\n[/note]`
    case 'tip':
      return `[tip="技巧"]\n${selectedText || '这里写实践建议'}\n[/tip]`
    case 'warning':
      return `[warning="注意"]\n${selectedText || '这里写风险或边界'}\n[/warning]`
    case 'onebox':
      return `[onebox="链接标题"]\n${selectedText || 'https://example.com'}\n[/onebox]`
    case 'reply':
      return `[reply="回复后可见"]\n${selectedText || '这里写回复后可见内容'}\n[/reply]`
    case 'table':
      return createMarkdownTable({ rows: 3, columns: 4 })
    case 'emoji':
      return ':smile:'
    case 'checklist':
      return selectedText || '- [ ] 待办\n- [ ] 待办'
    case 'note-template':
      return markdownTemplates.find((item) => item.id === 'note')!.content
    case 'tutorial-template':
      return markdownTemplates.find((item) => item.id === 'tutorial')!.content
    case 'review-template':
      return markdownTemplates.find((item) => item.id === 'review')!.content
  }
}

export function getEmojiState(textarea: HTMLTextAreaElement): EmojiState | null {
  const cursor = textarea.selectionStart ?? 0
  const before = textarea.value.slice(0, cursor)
  const lineStart = before.lastIndexOf('\n') + 1
  const line = before.slice(lineStart)
  const match = line.match(/(^|\s):([a-zA-Z0-9_+-]{1,24})$/)
  if (!match) return null
  const token = match[2] ?? ''
  return {
    query: token,
    range: { start: cursor - token.length - 1, end: cursor },
  }
}

export function filterEmoji(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return emojiItems
  return emojiItems.filter((item) =>
    [item.shortcode, item.label].some((value) => value.toLowerCase().includes(q)),
  )
}

export function insertEmoji(
  textarea: HTMLTextAreaElement,
  item: EmojiItem,
  emojiState: EmojiState,
  onChange: (next: string) => void,
) {
  const current = textarea.value
  const next = `${current.slice(0, emojiState.range.start)}${item.emoji}${current.slice(emojiState.range.end)}`
  onChange(next)
  requestAnimationFrame(() => {
    const pos = emojiState.range.start + item.emoji.length
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
  })
}

export type TableAlignment = 'left' | 'center' | 'right'
export type HtmlInlineTag = 'mark' | 'kbd' | 'sub' | 'sup'

export function createMarkdownTable({
  rows,
  columns,
  alignments = [],
}: {
  rows: number
  columns: number
  alignments?: TableAlignment[]
}) {
  const safeRows = Math.max(1, Math.min(rows, 20))
  const safeColumns = Math.max(1, Math.min(columns, 10))
  const header = Array.from({ length: safeColumns }, (_, idx) => `列 ${idx + 1}`)
  const divider = Array.from({ length: safeColumns }, (_, idx) => {
    const alignment = alignments[idx] ?? 'left'
    if (alignment === 'center') return ':---:'
    if (alignment === 'right') return '---:'
    return '---'
  })
  const body = Array.from({ length: safeRows }, () =>
    Array.from({ length: safeColumns }, () => ' ').join(' | '),
  )
  return [`| ${header.join(' | ')} |`, `| ${divider.join(' | ')} |`, ...body.map((row) => `| ${row} |`)].join('\n')
}

export function getSlashState(textarea: HTMLTextAreaElement): SlashState | null {
  const cursor = textarea.selectionStart ?? 0
  const before = textarea.value.slice(0, cursor)
  const lineStart = before.lastIndexOf('\n') + 1
  const line = before.slice(lineStart)
  const match = line.match(/^\/([\w-]*)$/)
  if (!match) return null
  return {
    query: match[1] ?? '',
    range: { start: lineStart, end: cursor },
  }
}

export function filterSlashCommands(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return slashCommandItems
  return slashCommandItems.filter((item) =>
    [item.label, item.hint, item.token].some((value) => value.toLowerCase().includes(q)),
  )
}

export function insertSlashCommand(
  textarea: HTMLTextAreaElement,
  id: SlashCommandId,
  slashState: SlashState,
  onChange: (next: string) => void,
) {
  const current = textarea.value
  const selectedText =
    textarea.selectionStart !== textarea.selectionEnd
      ? current.slice(textarea.selectionStart, textarea.selectionEnd)
      : ''
  const snippet = snippetForCommand(id, selectedText)
  const before = current.slice(0, slashState.range.start)
  const after = current.slice(slashState.range.end)
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
  const insert = `${prefix}${snippet}${suffix}`
  const next = `${before}${insert}${after}`

  onChange(next)
  requestAnimationFrame(() => {
    const pos = before.length + insert.length
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
  })
}

export function insertOneboxForUrl(
  textarea: HTMLTextAreaElement,
  url: string,
  onChange: (next: string) => void,
  title?: string,
) {
  const current = textarea.value
  const start = textarea.selectionStart ?? current.length
  const end = textarea.selectionEnd ?? current.length
  const before = current.slice(0, start)
  const after = current.slice(end)
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
  const open = title ? `[onebox="${title.replace(/"/g, '\\"')}"]` : '[onebox]'
  const insert = `${prefix}${open}\n${url}\n[/onebox]${suffix}`
  const next = `${before}${insert}${after}`

  onChange(next)
  requestAnimationFrame(() => {
    const pos = before.length + insert.length
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
  })
}

export function replaceTextEverywhere(
  textarea: HTMLTextAreaElement | null,
  from: string,
  to: string,
  onChange: (next: string) => void,
  fallbackText: string,
) {
  const current = textarea?.value ?? fallbackText
  const next = current.replace(from, to)
  onChange(next)
}

export function insertInlineLinkForUrl(
  textarea: HTMLTextAreaElement,
  url: string,
  onChange: (next: string) => void,
) {
  const current = textarea.value
  const start = textarea.selectionStart ?? current.length
  const end = textarea.selectionEnd ?? current.length
  const selected = current.slice(start, end).trim()
  const label = selected && !/^https?:\/\/\S+$/.test(selected) ? selected : url
  const insert = `[${label}](${url})`
  const next = `${current.slice(0, start)}${insert}${current.slice(end)}`

  onChange(next)
  requestAnimationFrame(() => {
    const pos = start + insert.length
    textarea.focus()
    textarea.setSelectionRange(pos, pos)
  })
}

export function insertMarkdownAtSelection(
  textarea: HTMLTextAreaElement | null,
  text: string,
  onChange: (next: string) => void,
  fallbackText: string,
) {
  const current = textarea?.value ?? fallbackText
  const start = textarea?.selectionStart ?? current.length
  const end = textarea?.selectionEnd ?? current.length
  const before = blankBefore(current, start)
  const after = blankAfter(current, end)
  const content = text.trimEnd()
  const insert = `${before}${content}${after}`
  const next = `${current.slice(0, start)}${insert}${current.slice(end)}`

  onChange(next)
  requestAnimationFrame(() => {
    if (!textarea) return
    const selectionStart = start + before.length
    textarea.focus()
    textarea.setSelectionRange(selectionStart, selectionStart + content.length)
  })
}

function wrapSelectionWithHtml(state: ExecuteState, api: TextAreaTextApi, tag: HtmlInlineTag) {
  const fallback = tag === 'mark' ? '高亮文字' : tag === 'kbd' ? '⌘K' : '文字'
  const body = state.selectedText || fallback
  const insert = `<${tag}>${body}</${tag}>`
  api.replaceSelection(insert)
  const start = state.selection.start + tag.length + 2
  api.setSelectionRange({ start, end: start + body.length })
}

function insertTemplate(state: ExecuteState, api: TextAreaTextApi, template: string) {
  const content = template.trimEnd()
  const before = blankBefore(state.text, state.selection.start)
  const after = blankAfter(state.text, state.selection.end)
  const insert = `${before}${content}${after}`

  api.replaceSelection(insert)
  api.setSelectionRange({
    start: state.selection.start + before.length,
    end: state.selection.start + before.length + content.length,
  })
}

const detailsCommand: ICommand = {
  name: 'details',
  keyCommand: 'details',
  buttonProps: { 'aria-label': '插入折叠块', title: '插入折叠块' },
  icon: <ListCollapse size={14} />,
  execute: (state, api) => insertBlock(state, api, 'details', '展开查看', '这里写可折叠内容'),
}

const spoilerCommand: ICommand = {
  name: 'spoiler',
  keyCommand: 'spoiler',
  buttonProps: { 'aria-label': '插入隐藏块', title: '插入隐藏块' },
  icon: <EyeOff size={14} />,
  execute: (state, api) => insertBlock(state, api, 'spoiler', '隐藏内容', '这里写需要先隐藏的内容'),
}

const calloutCommands: ICommand[] = [
  {
    name: 'note-callout',
    keyCommand: 'note-callout',
    buttonProps: { 'aria-label': '插入提示块', title: '提示块' },
    icon: <Info size={14} />,
    execute: (state, api) => insertBlock(state, api, 'note', '提示', '这里写补充说明'),
  },
  {
    name: 'tip-callout',
    keyCommand: 'tip-callout',
    buttonProps: { 'aria-label': '插入技巧块', title: '技巧块' },
    icon: <Lightbulb size={14} />,
    execute: (state, api) => insertBlock(state, api, 'tip', '技巧', '这里写实践建议'),
  },
  {
    name: 'warning-callout',
    keyCommand: 'warning-callout',
    buttonProps: { 'aria-label': '插入警告块', title: '警告块' },
    icon: <AlertTriangle size={14} />,
    execute: (state, api) => insertBlock(state, api, 'warning', '注意', '这里写风险或边界'),
  },
]

const calloutGroup = commands.group(calloutCommands, {
  name: 'callouts',
  groupName: 'callouts',
  buttonProps: { 'aria-label': '插入提示块', title: '插入提示块' },
  icon: <MessageSquareQuote size={14} />,
})

const oneboxCommand: ICommand = {
  name: 'onebox',
  keyCommand: 'onebox',
  buttonProps: { 'aria-label': '插入链接卡片', title: '插入链接卡片' },
  icon: <Link2 size={14} />,
  execute: (state, api) => insertBlock(state, api, 'onebox', '链接标题', 'https://example.com'),
}

const replyVisibleCommand: ICommand = {
  name: 'reply-visible',
  keyCommand: 'reply-visible',
  buttonProps: { 'aria-label': '插入回复可见内容', title: '回复可见' },
  icon: <MessageSquareReply size={14} />,
  execute: (state, api) => insertBlock(state, api, 'reply', '回复后可见', '这里写回复后可见内容'),
}

function createTableCommand(onOpenTableBuilder?: () => void): ICommand {
  return {
    name: 'table-builder',
    keyCommand: 'table-builder',
    buttonProps: { 'aria-label': '插入表格', title: '插入表格' },
    icon: <Table2 size={14} />,
    execute: (state, api) => {
      if (onOpenTableBuilder) {
        onOpenTableBuilder()
        return
      }
      const table = createMarkdownTable({ rows: 3, columns: 4 })
      api.replaceSelection(`${blankBefore(state.text, state.selection.start)}${table}${blankAfter(state.text, state.selection.end)}`)
    },
  }
}

const checklistCommand: ICommand = {
  name: 'checklist',
  keyCommand: 'checklist',
  buttonProps: { 'aria-label': '插入任务列表', title: '插入任务列表' },
  icon: <CheckSquare size={14} />,
  execute: (state, api) => {
    const body = state.selectedText
      ? state.selectedText
          .split('\n')
          .map((line) => (line.trim() ? `- [ ] ${line.replace(/^[-*]\s+/, '')}` : line))
          .join('\n')
      : '- [ ] 待办\n- [ ] 待办\n- [x] 待办'
    api.replaceSelection(`${blankBefore(state.text, state.selection.start)}${body}${blankAfter(state.text, state.selection.end)}`)
  },
}

const emojiCommand: ICommand = {
  name: 'emoji',
  keyCommand: 'emoji',
  buttonProps: { 'aria-label': '插入 Emoji 短代码', title: 'Emoji 短代码' },
  icon: <Smile size={14} />,
  execute: (state, api) => {
    const insert = state.selectedText || ':smile:'
    api.replaceSelection(insert)
    const pos = state.selection.start + insert.length
    api.setSelectionRange({ start: pos, end: pos })
  },
}

function createEmojiCommand(onOpenEmojiPicker?: () => void): ICommand {
  return {
    ...emojiCommand,
    execute: (state, api) => {
      if (onOpenEmojiPicker) {
        onOpenEmojiPicker()
        return
      }
      emojiCommand.execute?.(state, api)
    },
  }
}

const htmlInlineCommands: ICommand[] = [
  {
    name: 'mark-inline',
    keyCommand: 'mark-inline',
    buttonProps: { 'aria-label': '高亮文字', title: '高亮文字' },
    icon: <Highlighter size={14} />,
    execute: (state, api) => wrapSelectionWithHtml(state, api, 'mark'),
  },
  {
    name: 'kbd-inline',
    keyCommand: 'kbd-inline',
    buttonProps: { 'aria-label': '键盘按键', title: '键盘按键' },
    icon: <Keyboard size={14} />,
    execute: (state, api) => wrapSelectionWithHtml(state, api, 'kbd'),
  },
  {
    name: 'sub-inline',
    keyCommand: 'sub-inline',
    buttonProps: { 'aria-label': '下标', title: '下标' },
    icon: <Subscript size={14} />,
    execute: (state, api) => wrapSelectionWithHtml(state, api, 'sub'),
  },
  {
    name: 'sup-inline',
    keyCommand: 'sup-inline',
    buttonProps: { 'aria-label': '上标', title: '上标' },
    icon: <Superscript size={14} />,
    execute: (state, api) => wrapSelectionWithHtml(state, api, 'sup'),
  },
]

const htmlInlineGroup = commands.group(htmlInlineCommands, {
  name: 'html-inline',
  groupName: 'html-inline',
  buttonProps: { 'aria-label': '安全 HTML 标签', title: '安全 HTML 标签' },
  icon: <Highlighter size={14} />,
})

const templateCommands: ICommand[] = [
  {
    name: 'note-template',
    keyCommand: 'note-template',
    buttonProps: { 'aria-label': '插入笔记模板', title: '笔记模板' },
    icon: <FileText size={14} />,
    execute: (state, api) => insertTemplate(state, api, TEMPLATE_SNIPPETS.note),
  },
  {
    name: 'tutorial-template',
    keyCommand: 'tutorial-template',
    buttonProps: { 'aria-label': '插入教程模板', title: '教程模板' },
    icon: <BookTemplate size={14} />,
    execute: (state, api) => insertTemplate(state, api, TEMPLATE_SNIPPETS.tutorial),
  },
  {
    name: 'review-template',
    keyCommand: 'review-template',
    buttonProps: { 'aria-label': '插入复盘模板', title: '复盘模板' },
    icon: <ListCollapse size={14} />,
    execute: (state, api) => insertTemplate(state, api, TEMPLATE_SNIPPETS.review),
  },
]

function createTemplatePreviewCommand(onOpenTemplatePreview: (id: TemplateId) => void): ICommand {
  const templatePreviewCommands: ICommand[] = [
    {
      name: 'note-template',
      keyCommand: 'note-template',
      buttonProps: { 'aria-label': '预览笔记模板', title: '笔记模板' },
      icon: <FileText size={14} />,
      execute: () => onOpenTemplatePreview('note'),
    },
    {
      name: 'tutorial-template',
      keyCommand: 'tutorial-template',
      buttonProps: { 'aria-label': '预览教程模板', title: '教程模板' },
      icon: <BookTemplate size={14} />,
      execute: () => onOpenTemplatePreview('tutorial'),
    },
    {
      name: 'review-template',
      keyCommand: 'review-template',
      buttonProps: { 'aria-label': '预览复盘模板', title: '复盘模板' },
      icon: <ListCollapse size={14} />,
      execute: () => onOpenTemplatePreview('review'),
    },
  ]

  return commands.group(templatePreviewCommands, {
    name: 'templates',
    groupName: 'templates',
    buttonProps: { 'aria-label': '预览模板', title: '预览模板' },
    icon: <BookTemplate size={14} />,
  })
}

const templateGroup = commands.group(templateCommands, {
  name: 'templates',
  groupName: 'templates',
  buttonProps: { 'aria-label': '插入模板', title: '插入模板' },
  icon: <BookTemplate size={14} />,
})

export const markdownEditorCommands: ICommand[] = [
  ...commands.getCommands(),
  commands.divider,
  detailsCommand,
  spoilerCommand,
  calloutGroup,
  oneboxCommand,
  replyVisibleCommand,
  createTableCommand(),
  checklistCommand,
  createEmojiCommand(),
  htmlInlineGroup,
  templateGroup,
]

export function createMarkdownEditorCommands(
  onOpenTemplatePreview?: (id: TemplateId) => void,
  onOpenTableBuilder?: () => void,
  onOpenEmojiPicker?: () => void,
): ICommand[] {
  return [
    ...commands.getCommands(),
    commands.divider,
    detailsCommand,
    spoilerCommand,
    calloutGroup,
    oneboxCommand,
    replyVisibleCommand,
    createTableCommand(onOpenTableBuilder),
    checklistCommand,
    createEmojiCommand(onOpenEmojiPicker),
    htmlInlineGroup,
    onOpenTemplatePreview ? createTemplatePreviewCommand(onOpenTemplatePreview) : templateGroup,
  ]
}

export const markdownEditorExtraCommands: ICommand[] = commands.getExtraCommands()

export const markdownEditorComponents: NonNullable<
  ComponentProps<typeof MDEditor>['components']
> = {
  preview: (source) => (
    <MarkdownRenderer className="md-editor-preview-prose">{source}</MarkdownRenderer>
  ),
}

export function MarkdownSlashMenu({
  commands: items,
  activeIndex,
  onChoose,
}: {
  commands: SlashCommandItem[]
  activeIndex: number
  onChoose: (id: SlashCommandId) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="slash-command-menu" role="listbox" aria-label="Slash commands">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={index === activeIndex ? 'is-active' : ''}
          onMouseDown={(event) => {
            event.preventDefault()
            onChoose(item.id)
          }}
          role="option"
          aria-selected={index === activeIndex}
        >
          <span>{item.label}</span>
          <kbd>/{item.token}</kbd>
        </button>
      ))}
    </div>
  )
}

export function EmojiSuggestMenu({
  items,
  activeIndex,
  onChoose,
  variant = 'suggest',
  style,
}: {
  items: EmojiItem[]
  activeIndex: number
  onChoose: (item: EmojiItem) => void
  variant?: 'suggest' | 'picker'
  style?: CSSProperties
}) {
  if (items.length === 0) return null

  return (
    <div
      className={`emoji-suggest-menu ${variant === 'picker' ? 'emoji-picker-menu' : ''}`}
      role="listbox"
      aria-label="Emoji suggestions"
      style={style}
    >
      {items.map((item, index) => (
        <button
          key={item.shortcode}
          type="button"
          className={index === activeIndex ? 'is-active' : ''}
          onMouseDown={(event) => {
            event.preventDefault()
            onChoose(item)
          }}
          role="option"
          aria-selected={index === activeIndex}
        >
          <span className="emoji-suggest-glyph">{item.emoji}</span>
          {variant === 'suggest' && <span>{item.label}</span>}
          <kbd>:{item.shortcode}:</kbd>
        </button>
      ))}
    </div>
  )
}
