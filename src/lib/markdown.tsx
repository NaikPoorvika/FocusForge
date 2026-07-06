// Tiny, safe markdown renderer for journal entries. No new deps.
// Supports: # H1, ## H2, ### H3, **bold**, *italic*, `code`,
// - bullets, [text](url), blank line -> paragraph.
import React from "react";

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function inline(s: string) {
  let out = escape(s);
  out = out.replace(/`([^`]+)`/g, "<code class=\"rounded bg-muted px-1 py-0.5 text-[0.85em]\">$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>',
  );
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1">
          {listBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^-\s+/.test(l)) {
      listBuf.push(l.replace(/^-\s+/, ""));
      continue;
    }
    flushList();
    if (!l.trim()) continue;
    if (/^###\s+/.test(l)) {
      blocks.push(<h3 key={blocks.length} className="text-base font-semibold" dangerouslySetInnerHTML={{ __html: inline(l.replace(/^###\s+/, "")) }} />);
    } else if (/^##\s+/.test(l)) {
      blocks.push(<h2 key={blocks.length} className="text-lg font-bold" dangerouslySetInnerHTML={{ __html: inline(l.replace(/^##\s+/, "")) }} />);
    } else if (/^#\s+/.test(l)) {
      blocks.push(<h1 key={blocks.length} className="text-xl font-bold" dangerouslySetInnerHTML={{ __html: inline(l.replace(/^#\s+/, "")) }} />);
    } else {
      blocks.push(<p key={blocks.length} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(l) }} />);
    }
  }
  flushList();
  return <div className="space-y-2 text-sm">{blocks}</div>;
}
