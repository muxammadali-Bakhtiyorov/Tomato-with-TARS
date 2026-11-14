import { useEffect, useRef, useState } from 'react';
import { MessageSquare, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import type { FarmFieldPlot, NasaFarmResponse } from '../types/farm';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface TarsRobotChatProps {
  visible: boolean;
  chatOpen: boolean;
  onToggleChat: (open: boolean) => void;
  farmData: NasaFarmResponse;
  activeField?: FarmFieldPlot;
}

const QUICK_QUESTIONS = [
  'Should I water my crops today?',
  'Will my plants survive or die out?',
  'What order should I plant in?',
  'What do the live NASA satellites say?',
];

function TarsSvg({ walking, facing }: { walking: boolean; facing: 1 | -1 }) {
  return (
    <svg
      viewBox="0 0 100 116"
      fill="none"
      className={`w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)] ${walking ? 'tars-walking' : ''}`}
      style={{ transform: facing === -1 ? 'skewY(-1.5deg)' : 'skewY(1.5deg)' }}
    >
      <defs>
        <linearGradient id="tarsMetalMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="45%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
        <linearGradient id="tarsMetalSide" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="tarsScreenGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="50" cy="110" rx="28" ry="4.5" fill="rgba(0, 0, 0, 0.28)" />

      <g className="tars-chassis">
        {/* Left Outer Monolith Leg Slab */}
        <g className="tars-leg-left">
          <rect
            x="19"
            y="12"
            width="14"
            height="94"
            rx="1.5"
            fill="url(#tarsMetalSide)"
            stroke="#18181b"
            strokeWidth="1.6"
          />
          <rect x="20" y="34" width="12" height="4" fill="#18181b" opacity="0.85" />
          <rect x="20" y="79" width="12" height="5" fill="#18181b" opacity="0.85" />
          {/* Brushed seam highlight */}
          <line x1="21.5" y1="14" x2="21.5" y2="104" stroke="#9ca3af" strokeWidth="0.7" opacity="0.45" />
        </g>

        {/* Right Outer Monolith Leg Slab */}
        <g className="tars-leg-right">
          <rect
            x="67"
            y="12"
            width="14"
            height="94"
            rx="1.5"
            fill="url(#tarsMetalSide)"
            stroke="#18181b"
            strokeWidth="1.6"
          />
          <rect x="68" y="34" width="12" height="4" fill="#18181b" opacity="0.85" />
          <rect x="68" y="79" width="12" height="5" fill="#18181b" opacity="0.85" />
          <line x1="78.5" y1="14" x2="78.5" y2="104" stroke="#9ca3af" strokeWidth="0.7" opacity="0.35" />
        </g>

        {/* Center Inner Dual Monolith Blocks */}
        <rect
          x="33"
          y="10"
          width="17"
          height="94"
          rx="1.2"
          fill="url(#tarsMetalMain)"
          stroke="#18181b"
          strokeWidth="1.6"
        />
        <rect
          x="50"
          y="10"
          width="17"
          height="94"
          rx="1.2"
          fill="url(#tarsMetalMain)"
          stroke="#18181b"
          strokeWidth="1.6"
        />

        {/* Horizontal Pivot / Joint Bands */}
        <rect x="34" y="33" width="32" height="4.5" fill="#18181b" opacity="0.9" />
        <rect x="34" y="77" width="32" height="6" fill="#18181b" opacity="0.9" />

        {/* Glowing Cyan Chest Telemetry Screen */}
        <rect x="36" y="18" width="28" height="10" rx="1.5" fill="#091521" stroke="#0f172a" strokeWidth="1" />
        <rect x="38" y="20" width="24" height="6" rx="0.8" fill="url(#tarsScreenGlow)" opacity="0.92" />
        <line x1="39" y1="22.5" x2="61" y2="22.5" stroke="#e0f2fe" strokeWidth="0.8" opacity="0.75" />
        <line x1="39" y1="24.5" x2="55" y2="24.5" stroke="#bae6fd" strokeWidth="0.7" opacity="0.6" />

        {/* Gold TARS Braille / Vertical Marking on Left-Center Block (from reference photo) */}
        <g fill="#eab308" opacity="0.9">
          <text
            x="41"
            y="45"
            fontSize="6.5"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="0.8"
            transform="rotate(-90 41 56)"
          >
            TARS
          </text>
          <circle cx="46" cy="45" r="0.9" />
          <circle cx="46" cy="49" r="0.9" />
          <circle cx="46" cy="53" r="0.9" />
          <circle cx="46" cy="57" r="0.9" />
        </g>

        {/* Subtle Tomato Status LED */}
        <circle cx="60" cy="44" r="1.7" fill="#ef4444" />
      </g>
    </svg>
  );
}

export function TarsRobotChat({
  visible,
  chatOpen,
  onToggleChat,
  farmData,
  activeField,
}: TarsRobotChatProps) {
  const [posX, setPosX] = useState(72);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello, farmer. I'm TARS. Ask me anything about ${farmData.location.name}, your soil moisture, rain forecast, plant survival %, or crop rotation order.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const posXRef = useRef(72);
  const dirRef = useRef<1 | -1>(1);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Grounded horizontal walking loop only (no flying, jumping, or egg mechanics)
  useEffect(() => {
    if (!visible || hovered || chatOpen) return;

    let rafId = 0;
    const step = () => {
      const maxBound = Math.max(16, window.innerWidth - 110);
      let nextX = posXRef.current + 0.65 * dirRef.current;
      let nextDir = dirRef.current;
      if (nextX >= maxBound) {
        nextX = maxBound;
        nextDir = -1;
      } else if (nextX <= 16) {
        nextX = 16;
        nextDir = 1;
      }
      posXRef.current = nextX;
      dirRef.current = nextDir;
      setPosX(nextX);
      setDirection(nextDir);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [visible, hovered, chatOpen]);

  // Auto-scroll chat thread & focus input when opened
  useEffect(() => {
    if (chatOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [chatOpen, messages.length, sending]);

  if (!visible) return null;

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setErrorMsg(null);
    setSending(true);

    try {
      // Send clean conversation history (excluding synthetic welcome turn if it was first)
      const apiHistory = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistory,
          farmData,
          activeField,
        }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !json.reply) {
        throw new Error(json.error || 'TARS could not respond right now.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: json.reply!,
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach TARS AI.');
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setErrorMsg(null);
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: `Memory reset. Ask me about ${farmData.location.name}—rainfall forecast, ${farmData.soil.type} moisture, survival odds, or your rotation plan.`,
      },
    ]);
  };

  return (
    <>
      {/* Walking TARS Robot along bottom ground */}
      <button
        type="button"
        onClick={() => onToggleChat(!chatOpen)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open TARS AI farm assistant chat"
        title="Click TARS to ask AI questions about your farm"
        className="fixed z-40 select-none cursor-pointer group focus:outline-none"
        style={{
          width: '78px',
          height: '92px',
          left: `${posX}px`,
          bottom: '10px',
        }}
      >
        <div
          className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-almanac-card text-almanac-ink border border-almanac-borderDark text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-md transition-opacity duration-200 pointer-events-none flex items-center gap-1 ${
            hovered || chatOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <MessageSquare className="w-3 h-3 text-almanac-forest" />
          <span>{chatOpen ? 'Chat Open' : 'Ask TARS AI'}</span>
        </div>

        <TarsSvg walking={!hovered && !chatOpen} facing={direction} />
      </button>

      {/* Multi-turn TARS Gemini Chat Window */}
      {chatOpen && (
        <div
          role="dialog"
          aria-label="TARS Farm AI Assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[75vh] bg-almanac-card border border-almanac-borderDark rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-almanac-pill/80 border-b border-almanac-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-600 p-1 shrink-0 flex items-center justify-center">
                <TarsSvg walking={false} facing={1} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-sm text-almanac-ink">TARS Farm AI</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 badge-emerald text-almanac-forest text-[10px] font-mono font-bold flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Gemini</span>
                  </span>
                </div>
                <div className="text-[11px] text-almanac-muted truncate">
                  Using live data for {farmData.location.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-full text-almanac-muted hover:text-almanac-ink hover:bg-almanac-card transition cursor-pointer"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggleChat(false)}
                className="p-1.5 rounded-full text-almanac-muted hover:text-almanac-ink hover:bg-almanac-card transition cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[42vh]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-almanac-forest btn-forest text-white font-medium rounded-br-sm'
                      : 'bg-white surface-soft border border-almanac-border text-almanac-ink rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white surface-soft border border-almanac-border text-almanac-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs font-mono">
                  TARS is reading NASA &amp; farm telemetry...
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-orange-100/70 badge-orange border border-almanac-terracotta/40 text-almanac-terracotta rounded-xl px-3 py-2 text-[11px]">
                {errorMsg}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Quick Starter Questions */}
          <div className="px-4 py-2 border-t border-almanac-border/70 bg-almanac-pill/35 flex gap-1.5 overflow-x-auto">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => sendMessage(q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-almanac-card hover:bg-almanac-pill border border-almanac-border text-[11px] font-medium text-almanac-ink transition cursor-pointer whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t border-almanac-border bg-almanac-card flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${farmData.location.name.split(',')[0]}...`}
              disabled={sending}
              className="flex-1 bg-white surface-soft border border-almanac-borderDark rounded-full px-3.5 py-2 text-xs text-almanac-ink"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-almanac-forest btn-forest hover:bg-almanac-forestHover disabled:opacity-45 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
