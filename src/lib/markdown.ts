/**
 * Lightweight, dependency-free Markdown <-> HTML conversion used to bridge the
 * editor's Markdown mode (canonical text) and WYSIWYG mode (contentEditable).
 * It supports the common subset: headings, bold, italic, inline code, links,
 * blockquotes, unordered/ordered lists, code fences, and paragraphs.
 */

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function inlineToHtml(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const out: string[] = []
  let i = 0
  let listType: "ul" | "ol" | null = null

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // code fence
    if (line.trim().startsWith("```")) {
      closeList()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(escapeHtml(lines[i]))
        i++
      }
      i++
      out.push(`<pre><code>${code.join("\n")}</code></pre>`)
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inlineToHtml(heading[2])}</h${level}>`)
      i++
      continue
    }

    if (/^>\s?/.test(line)) {
      closeList()
      out.push(`<blockquote>${inlineToHtml(line.replace(/^>\s?/, ""))}</blockquote>`)
      i++
      continue
    }

    const ul = /^[-*]\s+(.*)$/.exec(line)
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ul || ol) {
      const wanted = ul ? "ul" : "ol"
      if (listType !== wanted) {
        closeList()
        listType = wanted
        out.push(`<${wanted}>`)
      }
      out.push(`<li>${inlineToHtml((ul ?? ol)![1])}</li>`)
      i++
      continue
    }

    if (line.trim() === "") {
      closeList()
      i++
      continue
    }

    closeList()
    out.push(`<p>${inlineToHtml(line)}</p>`)
    i++
  }
  closeList()
  return out.join("\n")
}

function inlineToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
  if (node.nodeType !== Node.ELEMENT_NODE) return ""
  const el = node as HTMLElement
  const inner = Array.from(el.childNodes).map(inlineToMarkdown).join("")
  switch (el.tagName) {
    case "STRONG":
    case "B":
      return `**${inner}**`
    case "EM":
    case "I":
      return `*${inner}*`
    case "CODE":
      return `\`${inner}\``
    case "A":
      return `[${inner}](${el.getAttribute("href") ?? "#"})`
    case "BR":
      return "\n"
    default:
      return inner
  }
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
  const blocks: string[] = []

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim()
      if (t) blocks.push(t)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    switch (el.tagName) {
      case "H1":
        blocks.push(`# ${inlineToMarkdown(el).trim()}`)
        break
      case "H2":
        blocks.push(`## ${inlineToMarkdown(el).trim()}`)
        break
      case "H3":
        blocks.push(`### ${inlineToMarkdown(el).trim()}`)
        break
      case "BLOCKQUOTE":
        blocks.push(`> ${inlineToMarkdown(el).trim()}`)
        break
      case "UL":
        Array.from(el.children).forEach((li) => blocks.push(`- ${inlineToMarkdown(li).trim()}`))
        break
      case "OL":
        Array.from(el.children).forEach((li, idx) =>
          blocks.push(`${idx + 1}. ${inlineToMarkdown(li).trim()}`),
        )
        break
      case "PRE":
        blocks.push("```\n" + (el.textContent ?? "").replace(/\n$/, "") + "\n```")
        break
      case "DIV":
      case "P": {
        const t = inlineToMarkdown(el).trim()
        blocks.push(t)
        break
      }
      case "BR":
        blocks.push("")
        break
      default:
        blocks.push(inlineToMarkdown(el).trim())
    }
  })

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim()
}
