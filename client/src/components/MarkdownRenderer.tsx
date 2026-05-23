import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

// Allow `className` on `<code>` so rehype-highlight can color tokens.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
  },
}

interface Props {
  children: string
  className?: string
}

export function MarkdownRenderer({ children, className }: Props) {
  return (
    <div className={`prose-article ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehype-sanitize MUST run after rehype-highlight, so highlight's
        // class names survive sanitization (we allow `className` above).
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, schema]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
