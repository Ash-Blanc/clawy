import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Send, RotateCcw, ExternalLink, Zap, BookOpen } from "lucide-react";
import "highlight.js/styles/github-dark.css";

const STARTERS = [
  { icon: "⚡", text: "How do I install Hermes Agent on Linux?" },
  { icon: "🔧", text: "How do I configure providers and models?" },
  { icon: "🧠", text: "How does the memory and skills system work?" },
  { icon: "💬", text: "How do I connect Telegram or Discord?" },
  { icon: "🔌", text: "How do I use MCP with Hermes?" },
  { icon: "🔒", text: "What security and sandboxing options exist?" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function MsgContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ className, children, ...props }: any) {
          const isBlock = !!className;
          const text = String(children).replace(/\n$/, "");
          if (!isBlock) return <code className="bg-zinc-800 text-orange-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
          return (
            <div className="relative group my-3">
              <pre className="bg-[#0d0d0d] border border-zinc-800 rounded-xl overflow-x-auto p-4 text-sm">
                <code className={className} {...props}>{children}</code>
              </pre>
              <CopyButton text={text} />
            </div>
          );
        },
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline underline-offset-2 inline-flex items-center gap-0.5">
            {children}<ExternalLink size={10} className="inline" />
          </a>
        ),
        h1: ({ children }) => <h1 className="text-xl font-bold text-zinc-100 mt-5 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold text-zinc-100 mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mt-3 mb-1">{children}</h3>,
        p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="text-zinc-300 list-disc list-inside mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="text-zinc-300 list-decimal list-inside mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-300">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-orange-500 pl-4 my-3 text-zinc-400 italic">{children}</blockquote>,
        strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
        hr: () => <hr className="border-zinc-800 my-4" />,
        table: ({ children }) => <div className="overflow-x-auto my-3"><table className="text-sm w-full border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="text-left text-zinc-200 font-semibold border border-zinc-700 px-3 py-1.5 bg-zinc-800">{children}</th>,
        td: ({ children }) => <td className="text-zinc-300 border border-zinc-700 px-3 py-1.5">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function StreamingCursor() {
  return <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />;
}

export default function IndexPage() {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/messages" }),
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const send = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-[#080808] text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800/50 flex flex-col bg-[#0c0c0c] flex-shrink-0">
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Zap size={15} className="text-orange-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100 leading-tight">Hermes Docs</div>
              <div className="text-[11px] text-orange-400/80 font-mono leading-tight">AI Assistant</div>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 space-y-4">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-2">Status</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-zinc-400">Live docs active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-xs text-zinc-400">Nous Research</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-2">About</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Every answer is grounded in fresh Hermes docs — never hallucinated.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/50 space-y-2">
          <a href="https://hermes-agent.nousresearch.com/docs" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-orange-400 transition-colors">
            <BookOpen size={12} />Docs
          </a>
          <a href="https://github.com/NousResearch/hermes-agent" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-orange-400 transition-colors">
            <ExternalLink size={12} />GitHub
          </a>
          {!isEmpty && (
            <button onClick={() => setMessages([])}
              className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1">
              <RotateCcw size={12} />New chat
            </button>
          )}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-semibold text-sm text-zinc-100">Hermes Agent Assistant</h1>
            <p className="text-xs text-zinc-600">Grounded answers from live documentation</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            {isStreaming ? "Thinking…" : "Ready"}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                <Zap size={28} className="text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">Hermes Docs AI</h2>
              <p className="text-sm text-zinc-500 mb-8 max-w-md text-center leading-relaxed">
                Ask anything about Hermes Agent. Every answer is pulled from the live docs — never outdated, never hallucinated.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {STARTERS.map((q) => (
                  <button key={q.text}
                    onClick={() => { setInput(q.text); setTimeout(() => inputRef.current?.focus(), 0); }}
                    className="text-left px-3.5 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-orange-500/30 hover:bg-zinc-800/60 transition-all text-xs text-zinc-400 hover:text-zinc-300">
                    <span className="mr-1.5">{q.icon}</span>{q.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {messages.map((msg: UIMessage, idx) => {
                const isUser = msg.role === "user";
                const isLast = idx === messages.length - 1;
                const textContent = msg.parts
                  ?.filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("") ?? (msg as any).content ?? "";

                return (
                  <div key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap size={13} className="text-orange-400" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${
                      isUser
                        ? "bg-orange-950/30 border border-orange-900/30 px-4 py-2.5 rounded-2xl rounded-tr-md text-sm text-zinc-200"
                        : "flex-1 min-w-0"
                    }`}>
                      {isUser ? (
                        <span>{textContent}</span>
                      ) : (
                        <div className="text-sm">
                          <MsgContent content={textContent} />
                          {isLast && isStreaming && <StreamingCursor />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading state when submitted but no response yet */}
              {status === "submitted" && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap size={13} className="text-orange-400" />
                  </div>
                  <div className="flex items-center gap-1.5 px-1 py-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <span className="text-xs text-zinc-600 ml-1">Fetching docs…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 pb-5 pt-3 flex-shrink-0 border-t border-zinc-800/40">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-zinc-900/70 border border-zinc-700/50 rounded-2xl px-4 py-3 focus-within:border-orange-500/40 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask anything about Hermes Agent…"
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-50"
                style={{ minHeight: "22px" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 144) + "px";
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || isStreaming}
                className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
            <p className="text-center text-[11px] text-zinc-700 mt-2">
              Grounded in <a href="https://hermes-agent.nousresearch.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-500 transition-colors">live Hermes docs</a> · Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
