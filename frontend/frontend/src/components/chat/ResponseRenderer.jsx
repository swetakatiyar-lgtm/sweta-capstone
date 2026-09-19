import { Children, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Info,
  Quote,
  ChevronDown,
} from "lucide-react";
import { parseResponseBlocks } from "../../lib/parseResponseBlocks";
import { getIconForText } from "../../lib/responseIcons";

const VISIBLE_BLOCK_COUNT = 6;

const CALLOUT_STYLES = {
  tip: {
    bg: "bg-[#F6F2FF]",
    border: "border-[#E8E2FF]",
    icon: Lightbulb,
    iconColor: "text-[#8B7CF6]",
    titleColor: "text-[#6B5AE0]",
  },
  warning: {
    bg: "bg-[#FFF8E8]",
    border: "border-[#F3E3B5]",
    icon: AlertTriangle,
    iconColor: "text-[#B8860B]",
    titleColor: "text-[#8A6A1F]",
  },
  success: {
    bg: "bg-[#EAF6EC]",
    border: "border-[#CBE9D1]",
    icon: CheckCircle2,
    iconColor: "text-[#3F8F5A]",
    titleColor: "text-[#3F8F5A]",
  },
  important: {
    bg: "bg-[#F5F5F4]",
    border: "border-[#E7E5E2]",
    icon: Info,
    iconColor: "text-[#57534E]",
    titleColor: "text-[#292524]",
  },
  quote: {
    bg: "bg-[#FAFAF9]",
    border: "border-[#ECE8DF]",
    icon: Quote,
    iconColor: "text-[#9A8F83]",
    titleColor: "text-[#57534E]",
  },
};

// Shared inline markdown renderer (headings/lists/code/emphasis) — used for
// both regular markdown blocks and the small body text inside callouts.
const markdownComponents = {
  h1({ children }) {
    const Icon = getIconForText(String(children));
    return (
      <div className="mb-3 mt-6 flex items-center gap-3 first:mt-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F2FF]">
          <Icon size={18} className="text-[#8B7CF6]" />
        </span>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#18181B] sm:text-[40px]">
          {children}
        </h1>
      </div>
    );
  },
  h2({ children }) {
    const Icon = getIconForText(String(children));
    return (
      <div className="mb-3 mt-6 flex items-center gap-2.5 first:mt-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F6F2FF]">
          <Icon size={15} className="text-[#8B7CF6]" />
        </span>
        <h2 className="text-[22px] font-bold leading-snug text-[#18181B] sm:text-[26px]">
          {children}
        </h2>
      </div>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mb-2 mt-5 text-[18px] font-semibold leading-snug text-[#18181B] first:mt-0">
        {children}
      </h3>
    );
  },
  p({ children }) {
    return <p className="mb-4 text-[16px] leading-[1.7] text-[#3F3D3A] last:mb-0">{children}</p>;
  },
  strong({ children }) {
    return (
      <strong className="rounded bg-[#F6F2FF] px-1 py-0.5 font-semibold text-[#18181B]">
        {children}
      </strong>
    );
  },
  em({ children }) {
    return <em className="text-[#57534E]">{children}</em>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-[#8B7CF6] underline decoration-[#8B7CF6]/30 underline-offset-2 hover:decoration-[#8B7CF6]"
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return (
      <ul className="mb-4 flex list-disc flex-col gap-2 pl-6 marker:text-[#8B7CF6] last:mb-0">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="mb-4 flex list-decimal flex-col gap-2 pl-6 marker:font-semibold marker:text-[#8B7CF6] last:mb-0">
        {children}
      </ol>
    );
  },
  li({ children }) {
    // react-markdown v9+ doesn't forward `checked`/`ordered` props to `li` —
    // detect GFM task-list checkboxes by inspecting the rendered children
    // for the checkbox <input> remark-gfm emits.
    const childArray = Children.toArray(children);
    const checkbox = childArray.find(
      (child) => child?.props?.type === "checkbox",
    );

    if (checkbox) {
      const checked = !!checkbox.props.checked;
      const rest = childArray.filter((child) => child !== checkbox);
      return (
        <li className="flex list-none items-start gap-2.5 text-[15px] leading-[1.7] text-[#3F3D3A] marker:content-none">
          <CheckCircle2
            size={18}
            className={`mt-0.5 shrink-0 ${checked ? "text-[#4FA66B]" : "text-[#C4BFB7]"}`}
          />
          <span className={checked ? "text-[#9CA3AF] line-through" : ""}>{rest}</span>
        </li>
      );
    }

    return <li className="pl-1 text-[15px] leading-[1.7] text-[#3F3D3A]">{children}</li>;
  },
  code({ className, children }) {
    const text = String(children);
    const isBlock = /language-/.test(className ?? "") || text.includes("\n");

    if (!isBlock) {
      return (
        <code className="rounded bg-[#F4F1EC] px-1.5 py-0.5 font-mono text-[0.9em] text-[#6B5AE0]">
          {children}
        </code>
      );
    }
    return (
      <code className={`font-mono text-[13px] leading-relaxed ${className ?? ""}`}>{children}</code>
    );
  },
  pre({ children }) {
    return (
      <pre className="mb-4 overflow-x-auto rounded-2xl bg-[#18181B] p-4 text-white last:mb-0">
        {children}
      </pre>
    );
  },
  hr() {
    return <hr className="my-6 border-[#ECE8DF]" />;
  },
};

function TopicCardGrid({ headers, rows }) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      {rows.map((row, i) => {
        const title = row[0] || `Item ${i + 1}`;
        const body =
          row.length === 2
            ? row[1]
            : headers
                .slice(1)
                .map((h, idx) => (row[idx + 1] ? `${h}: ${row[idx + 1]}` : null))
                .filter(Boolean)
                .join(" · ");
        const Icon = getIconForText(title);

        return (
          <motion.div
            key={`${title}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            whileHover={{ y: -2 }}
            className="rounded-[24px] border border-[#ECE8DF] bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.03)] transition-shadow hover:shadow-[0_12px_24px_-12px_rgba(139,124,246,0.25)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F2FF]">
                <Icon size={16} className="text-[#8B7CF6]" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#18181B]">{title}</p>
                {body && <p className="mt-1 text-[14px] leading-relaxed text-[#6B7280]">{body}</p>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Callout({ kind, title, body }) {
  const style = CALLOUT_STYLES[kind] ?? CALLOUT_STYLES.quote;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`mb-4 flex gap-3 rounded-2xl border ${style.border} ${style.bg} p-4`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
      <div className="min-w-0">
        {title && <p className={`mb-1 font-semibold ${style.titleColor}`}>{title}</p>}
        <div className="text-[15px] leading-relaxed text-[#3F3D3A] [&>p]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {body}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}

function Block({ block, index }) {
  if (block.type === "table") {
    return <TopicCardGrid headers={block.headers} rows={block.rows} />;
  }
  if (block.type === "callout") {
    return <Callout kind={block.kind} title={block.title} body={block.body} />;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.03 }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {block.content}
      </ReactMarkdown>
    </motion.div>
  );
}

export default function ResponseRenderer({ text }) {
  const blocks = useMemo(() => parseResponseBlocks(text), [text]);
  const [expanded, setExpanded] = useState(false);

  const hasOverflow = blocks.length > VISIBLE_BLOCK_COUNT;
  const visibleBlocks = expanded ? blocks : blocks.slice(0, VISIBLE_BLOCK_COUNT);
  const hiddenCount = blocks.length - VISIBLE_BLOCK_COUNT;

  return (
    <div className="max-w-[680px] select-text">
      {visibleBlocks.map((block, i) => (
        <Block key={i} block={block} index={i} />
      ))}

      {hasOverflow && !expanded && (
        <AnimatePresence>
          <motion.button
            key="show-more"
            type="button"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 rounded-full border border-[#ECE8DF] bg-white px-4 py-2 text-sm font-medium text-[#6B5AE0] transition hover:border-[#8B7CF6]/40 hover:bg-[#F8F6FF]"
          >
            Show {hiddenCount} more section{hiddenCount === 1 ? "" : "s"}
            <ChevronDown size={14} />
          </motion.button>
        </AnimatePresence>
      )}
    </div>
  );
}
