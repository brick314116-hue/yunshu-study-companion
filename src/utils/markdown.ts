import katex from 'katex'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

/**
 * 将包含 Markdown 与 LaTeX 数学公式的文本渲染为带样式的 HTML。
 *
 * 处理管线：
 * 1. 保护代码块（``` 与 `），防止代码中字符被误当公式解析；
 * 2. 提取并使用 KaTeX 渲染块级数学公式（$$...$$ 与 \[...\]）；
 * 3. 提取并使用 KaTeX 渲染行内数学公式（$...$ 与 \(...\)）；
 * 4. 还原代码块后交由 marked 编译排版；
 * 5. 将编译后的 HTML 与 KaTeX 公式占位符无缝拼接还原。
 */
export function renderMarkdown(content: string): string {
  if (!content) return ''

  const codeBlocks: string[] = []
  const mathBlocks: string[] = []

  // 1. 保护多行代码块与行内代码
  let text = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const idx = codeBlocks.length
    codeBlocks.push(match)
    return `@@CODE_BLOCK_${idx}@@`
  })

  // 2. 保护块级公式 $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      })
      const idx = mathBlocks.length
      mathBlocks.push(`<div class="katex-display-wrapper">${rendered}</div>`)
      return `@@MATH_BLOCK_${idx}@@`
    } catch {
      return `$$${math}$$`
    }
  })

  // 3. 保护块级公式 \[...\]
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      })
      const idx = mathBlocks.length
      mathBlocks.push(`<div class="katex-display-wrapper">${rendered}</div>`)
      return `@@MATH_BLOCK_${idx}@@`
    } catch {
      return `\\[${math}\\]`
    }
  })

  // 4. 保护行内公式 \(...\)
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      })
      const idx = mathBlocks.length
      mathBlocks.push(rendered)
      return `@@MATH_INLINE_${idx}@@`
    } catch {
      return `\\(${math}\\)`
    }
  })

  // 5. 保护行内公式 $...$（排除转义符 \$ 与纯数字金额，如 $100）
  text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, math) => {
    const trimmed = math.trim()
    if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) {
      return match
    }
    try {
      const rendered = katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: false,
      })
      const idx = mathBlocks.length
      mathBlocks.push(rendered)
      return `@@MATH_INLINE_${idx}@@`
    } catch {
      return match
    }
  })

  // 6. 还原被保护的代码块
  text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, i) => codeBlocks[Number(i)] || '')

  // 7. 使用 marked 解析 Markdown
  let html = marked.parse(text, { async: false }) as string

  // 8. 还原 KaTeX 渲染后的公式 HTML
  html = html.replace(/@@MATH_BLOCK_(\d+)@@/g, (_, i) => mathBlocks[Number(i)] || '')
  html = html.replace(/@@MATH_INLINE_(\d+)@@/g, (_, i) => mathBlocks[Number(i)] || '')

  return html
}
