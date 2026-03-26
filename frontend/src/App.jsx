import { useState, useRef, useEffect, useCallback } from "react";

const AGENT_ID = "cryptosentinel";
const API_BASE = "/api";

const QUICK_COMMANDS = [
  { label: "Market Summary", prompt: "Give me a crypto market summary" },
  { label: "BTC Price", prompt: "What is the price of Bitcoin?" },
  { label: "ETH Price", prompt: "What is the price of Ethereum?" },
  { label: "SOL Price", prompt: "What is the price of Solana?" },
  { label: "Top 10", prompt: "Show me the top 10 coins by market cap" },
  { label: "NOS Price", prompt: "What is the price of Nosana?" },
];

const WELCOME_MSG = {
  id: "welcome",
  role: "agent",
  text: `🛡️ **CryptoSentinel Online**

I'm your personal DeFi monitoring agent. I can help you:

• **Price checks** — "What's the price of ETH?"
• **Wallet lookup** — "Check wallet 0x1234...abcd"
• **Market overview** — "Give me a market summary"
• **Any token** — "How is SOL doing?"

What do you want to track?`,
  ts: Date.now(),
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, '<span style="opacity:0.6;font-size:0.85em">$1</span>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent-green);text-decoration:underline">$1</a>')
    .replace(/\n/g, "<br/>");
}

function TickerBar() {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,nosana&order=market_cap_desc"
        );
        const data = await res.json();
        setPrices(data);
      } catch (_) {}
    }
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  if (prices.length === 0) return null;
  const items = [...prices, ...prices];

  return (
    <div style={styles.tickerWrapper}>
      <div style={styles.tickerInner}>
        <div style={styles.tickerTrack}>
          {items.map((c, i) => {
            const up = c.price_change_percentage_24h >= 0;
            return (
              <span key={i} style={styles.tickerItem}>
                <span style={styles.tickerSymbol}>{c.symbol.toUpperCase()}</span>
                <span style={styles.tickerPrice}>
                  ${c.current_price?.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
                <span style={{ ...styles.tickerChange, color: up ? "var(--accent-green)" : "var(--accent-red)" }}>
                  {up ? "▲" : "▼"} {Math.abs(c.price_change_percentage_24h)?.toFixed(2)}%
                </span>
                <span style={styles.tickerDivider}>·</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ ...styles.msgRow, justifyContent: isUser ? "flex-end" : "flex-start", animation: "fadeSlideUp 0.2s ease" }}>
      {!isUser && <div style={styles.agentAvatar}><span style={{ fontSize: 14 }}>🛡</span></div>}
      <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleAgent) }}>
        {msg.loading ? (
          <div style={styles.loadingDots}>
            <span style={{ ...styles.dot, animationDelay: "0ms" }} />
            <span style={{ ...styles.dot, animationDelay: "160ms" }} />
            <span style={{ ...styles.dot, animationDelay: "320ms" }} />
          </div>
        ) : (
          <>
            <div style={styles.msgText} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
            <div style={styles.msgTime}>{formatTime(msg.ts)}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: uid(), role: "user", text: trimmed, ts: Date.now() };
    const loadingMsg = { id: uid() + "_load", role: "agent", loading: true, ts: Date.now() };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/${AGENT_ID}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, userId: "user", roomId: "cryptosentinel-room" }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const agentText = Array.isArray(data) && data.length > 0
        ? data.map(d => d.text).join("\n\n")
        : data?.text || "No response received.";

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: uid(), role: "agent", text: agentText, ts: Date.now() },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: uid(), role: "agent", text: `⚠️ Connection error: ${err.message}`, ts: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.scanline} />
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⬡</span>
            <span style={styles.logoText}>CRYPTO<span style={styles.logoAccent}>SENTINEL</span></span>
          </div>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot} />
            LIVE
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.headerTag}>ElizaOS v2</span>
          <span style={styles.headerTag}>Nosana GPU</span>
          <span style={styles.headerTag}>Qwen3.5-27B</span>
        </div>
      </header>

      <TickerBar />

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>QUICK COMMANDS</div>
            {QUICK_COMMANDS.map(cmd => (
              <button key={cmd.label} style={styles.quickBtn}
                onClick={() => sendMessage(cmd.prompt)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--accent-green)";
                  e.currentTarget.style.color = "var(--accent-green)";
                  e.currentTarget.style.background = "var(--accent-green-glow)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}>
                <span style={styles.quickBtnPrefix}>&gt;</span>{cmd.label}
              </button>
            ))}
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>CAPABILITIES</div>
            {[["◈","Live Prices"],["◈","Wallet Lookup"],["◈","Market Overview"],["◈","24h Changes"],["◈","On-chain Data"]].map(([icon, label]) => (
              <div key={label} style={styles.capItem}>
                <span style={{ color: "var(--accent-green)", marginRight: 8 }}>{icon}</span>{label}
              </div>
            ))}
          </div>
          <div style={styles.sidebarFooter}>
            <div style={styles.poweredBy}>Powered by</div>
            <div style={styles.poweredByLogos}>
              <span style={styles.poweredByTag}>Nosana</span>
              <span style={styles.poweredByTag}>ElizaOS</span>
            </div>
          </div>
        </aside>

        <div style={styles.chatArea}>
          <div style={styles.messages}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>
          <div style={styles.inputBar}>
            <span style={styles.inputPrompt}>$</span>
            <textarea ref={inputRef} style={styles.textarea} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about prices, wallets, market trends..."
              rows={1} disabled={isLoading} />
            <button style={{ ...styles.sendBtn, opacity: isLoading || !input.trim() ? 0.4 : 1 }}
              onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}>
              {isLoading ? <span style={styles.spinner} /> : "↵"}
            </button>
          </div>
          <div style={styles.inputHint}>
            ENTER to send · SHIFT+ENTER for newline · Data from CoinGecko & Etherscan
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-void)", position: "relative", overflow: "hidden" },
  scanline: { position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.08), transparent)", animation: "scanline 8s linear infinite", pointerEvents: "none", zIndex: 9999 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-deep)", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  logo: { display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "0.08em" },
  logoIcon: { color: "var(--accent-green)", fontSize: 22 },
  logoText: { color: "var(--text-primary)" },
  logoAccent: { color: "var(--accent-green)" },
  statusBadge: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--accent-green)", fontWeight: 700, letterSpacing: "0.1em", padding: "3px 8px", border: "1px solid var(--accent-green-glow)", borderRadius: 2, background: "var(--accent-green-glow)" },
  statusDot: { width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", animation: "pulse-glow 2s infinite", display: "inline-block" },
  headerRight: { display: "flex", gap: 8 },
  headerTag: { fontSize: 10, color: "var(--text-muted)", border: "1px solid var(--border-subtle)", padding: "2px 6px", borderRadius: 2, letterSpacing: "0.05em" },
  tickerWrapper: { background: "var(--bg-deep)", borderBottom: "1px solid var(--border-subtle)", overflow: "hidden", height: 30, flexShrink: 0 },
  tickerInner: { overflow: "hidden", height: "100%", display: "flex", alignItems: "center" },
  tickerTrack: { display: "flex", whiteSpace: "nowrap", animation: "ticker 30s linear infinite" },
  tickerItem: { display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px" },
  tickerSymbol: { color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" },
  tickerPrice: { color: "var(--text-primary)", fontSize: 12 },
  tickerChange: { fontSize: 11 },
  tickerDivider: { color: "var(--text-muted)", margin: "0 8px" },
  main: { flex: 1, display: "flex", overflow: "hidden", minHeight: 0 },
  sidebar: { width: 200, background: "var(--bg-deep)", borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", padding: "16px 0", flexShrink: 0, overflowY: "auto" },
  sidebarSection: { padding: "0 12px 20px" },
  sidebarLabel: { fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.15em", fontWeight: 700, padding: "0 4px 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 8 },
  quickBtn: { display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "6px 8px", borderRadius: "var(--radius)", cursor: "pointer", marginBottom: 4, textAlign: "left", transition: "all var(--transition)" },
  quickBtnPrefix: { color: "var(--text-muted)", fontWeight: 700 },
  capItem: { fontSize: 11, color: "var(--text-muted)", padding: "4px 4px", display: "flex", alignItems: "center" },
  sidebarFooter: { marginTop: "auto", padding: "16px 16px 0", borderTop: "1px solid var(--border-subtle)" },
  poweredBy: { fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 },
  poweredByLogos: { display: "flex", gap: 6 },
  poweredByTag: { fontSize: 10, color: "var(--accent-green-dim)", border: "1px solid rgba(0,255,136,0.2)", padding: "2px 6px", borderRadius: 2 },
  chatArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-void)" },
  messages: { flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 10 },
  agentAvatar: { width: 32, height: 32, borderRadius: "var(--radius)", background: "var(--bg-elevated)", border: "1px solid var(--border-active)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { maxWidth: "72%", padding: "12px 16px", borderRadius: "var(--radius-lg)", position: "relative" },
  bubbleUser: { background: "var(--bg-elevated)", border: "1px solid rgba(68,153,255,0.3)", borderBottomRightRadius: 2 },
  bubbleAgent: { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderBottomLeftRadius: 2 },
  msgText: { fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", fontFamily: "var(--font-mono)" },
  msgTime: { fontSize: 10, color: "var(--text-muted)", marginTop: 6, textAlign: "right" },
  loadingDots: { display: "flex", gap: 6, padding: "4px 0", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", display: "inline-block", animation: "blink 1.2s infinite" },
  inputBar: { display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "var(--bg-deep)", borderTop: "1px solid var(--border-subtle)" },
  inputPrompt: { color: "var(--accent-green)", fontWeight: 700, fontSize: 16, flexShrink: 0, fontFamily: "var(--font-mono)" },
  textarea: { flex: 1, background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 13, padding: "10px 14px", resize: "none", outline: "none", lineHeight: 1.5 },
  sendBtn: { width: 40, height: 40, background: "var(--accent-green-glow)", border: "1px solid var(--border-active)", color: "var(--accent-green)", fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, borderRadius: "var(--radius)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  spinner: { width: 16, height: 16, border: "2px solid rgba(0,255,136,0.3)", borderTopColor: "var(--accent-green)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" },
  inputHint: { fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: "4px 0 8px", letterSpacing: "0.04em" },
};
