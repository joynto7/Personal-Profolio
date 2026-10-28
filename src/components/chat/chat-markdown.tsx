import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the small Markdown subset the assistant is asked to write — paragraphs, bullet and
 * numbered lists, bold, italics, inline code and links — as React elements, never raw HTML.
 * Links only go to this site, http(s), mailto or tel; anything else stays plain text.
 */

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; text: string }
  | { type: "list"; ordered: boolean; items: { marker: string; text: string }[] }
  | { type: "code"; code: string };

/** "- ", "* ", "• ", "1. ", "2) " — and Bangla numerals, which the assistant uses in Bangla lists. */
const LIST_ITEM = /^\s*([-*•]|[0-9\u09E6-\u09EF]+[.)])\s+(.*)$/;
const FENCE = /^\s*```/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (FENCE.test(line)) {
      const code: string[] = [];
      for (i++; i < lines.length && !FENCE.test(lines[i]); i++) code.push(lines[i]);
      i++; // the closing fence, if it has streamed in yet
      blocks.push({ type: "code", code: code.join("\n") });
    } else if (HEADING.test(line)) {
      blocks.push({ type: "heading", text: HEADING.exec(line)![1] });
      i++;
    } else if (LIST_ITEM.test(line)) {
      const ordered = !/^[-*•]$/.test(LIST_ITEM.exec(line)![1]);
      const items: { marker: string; text: string }[] = [];
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i]);
        if (item && !/^[-*•]$/.test(item[1]) === ordered) {
          items.push({ marker: item[1], text: item[2] });
        } else if (items.length > 0 && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`; // wrapped continuation line
        } else {
          break;
        }
        i++;
      }
      blocks.push({ type: "list", ordered, items });
    } else {
      const paragraph: string[] = [];
      for (; i < lines.length && lines[i].trim(); i++) {
        if (paragraph.length > 0 && (LIST_ITEM.test(lines[i]) || FENCE.test(lines[i]) || HEADING.test(lines[i]))) break;
        paragraph.push(lines[i].trim());
      }
      blocks.push({ type: "paragraph", lines: paragraph });
    }
  }
  return blocks;
}

function safeHref(raw: string): { href: string; internal: boolean } | null {
  const href = raw.trim();
  if (href.startsWith("/") && !href.startsWith("//")) return { href, internal: true };
  if (href.startsWith("#")) return { href: `/${href}`, internal: true };
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? { href: url.href, internal: false } : null;
  } catch {
    return null;
  }
}

const INLINE = new RegExp(
  [
    String.raw`\*\*(.+?)\*\*`, // 1 bold
    String.raw`\[([^\]]+)\]\(([^)\s]+)\)`, // 2 link text, 3 link target
    String.raw`\x60([^\x60]+)\x60`, // 4 inline code
    String.raw`(https?://[^\s<>()\[\]]*[^\s<>()\[\].,;:!?'"])`, // 5 bare URL, minus trailing punctuation
    String.raw`([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})`, // 6 bare email
    String.raw`\*([^*\s][^*]*?)\*`, // 7 italics
  ].join("|"),
  "g"
);

const linkClass =
  "font-medium text-mocha underline decoration-caramel/50 underline-offset-2 transition-colors hover:decoration-caramel dark:text-caramel";

function renderInline(text: string, onNavigate?: () => void, allowLinks = true): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [whole, bold, linkText, linkTarget, code, url, email, italic] = match;
    const start = match.index;
    const key = `${start}-${whole.length}`;
    const isLink = linkText !== undefined || url !== undefined || email !== undefined;
    if (isLink && !allowLinks) continue;
    if (start > last) nodes.push(text.slice(last, start));
    last = start + whole.length;

    if (bold !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(bold, onNavigate, allowLinks)}
        </strong>
      );
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{renderInline(italic, onNavigate, allowLinks)}</em>);
    } else if (code !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {code}
        </code>
      );
    } else {
      const label = linkText ?? url ?? email;
      const target = safeHref(linkTarget ?? url ?? `mailto:${email}`);
      if (!target) {
        nodes.push(renderInline(label, onNavigate, false));
      } else if (target.internal) {
        nodes.push(
          <Link key={key} href={target.href} onClick={onNavigate} className={linkClass}>
            {renderInline(label, onNavigate, false)}
          </Link>
        );
      } else {
        const external = target.href.startsWith("http");
        nodes.push(
          <a
            key={key}
            href={target.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={`${linkClass} break-words`}
          >
            {renderInline(label, onNavigate, false)}
          </a>
        );
      }
    }
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMarkdown({
  text,
  streaming = false,
  onNavigate,
}: {
  text: string;
  /** While text is still arriving, an unclosed **bold** renders as bold instead of showing its asterisks. */
  streaming?: boolean;
  /** Called when the visitor follows a link to another page of this site. */
  onNavigate?: () => void;
}) {
  const source = streaming && (text.match(/\*\*/g)?.length ?? 0) % 2 === 1 ? `${text}**` : text;

  return (
    <div className="space-y-2.5">
      {parseBlocks(source).map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {renderInline(line, onNavigate)}
                  </span>
                ))}
              </p>
            );
          case "heading":
            return (
              <p key={i} className="font-semibold text-foreground">
                {renderInline(block.text, onNavigate)}
              </p>
            );
          case "list": {
            // Numbered items keep the marker as written, so Bangla numerals stay Bangla.
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={i} className="space-y-1.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    {block.ordered ? (
                      <span className="shrink-0 font-medium text-mocha tabular-nums dark:text-caramel">{item.marker}</span>
                    ) : (
                      <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-caramel" />
                    )}
                    <span className="min-w-0">{renderInline(item.text, onNavigate)}</span>
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
                <code>{block.code}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
