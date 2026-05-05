import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { describeAction, toneClasses } from "./events";

const WINDOW_MS = 90_000; // 90s visíveis (entre 60–120 do briefing)
const LANES = 5; // faixas verticais
const CARD_WIDTH = 280; // px

type LiveEvent = {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: number; // epoch ms
  lane: number;
};

export function MonitorTimeline() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setNow] = useState(Date.now());

  // Tick para re-render contínuo (faz os cards andarem).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  // GC dos cards expirados.
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - WINDOW_MS;
      setEvents((prev) => prev.filter((e) => e.createdAt > cutoff));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Subscribe Supabase Realtime em audit_logs.
  useEffect(() => {
    const channel = supabase
      .channel("monitor:audit_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const row = payload.new as {
            id: string;
            action: string;
            actorName: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: string;
          };
          setEvents((prev) => {
            const lane = pickLane(prev);
            const ev: LiveEvent = {
              id: row.id,
              action: row.action,
              actorName: row.actorName,
              metadata: (row.metadata ?? {}) as Record<string, unknown>,
              createdAt: new Date(row.createdAt).getTime(),
              lane,
            };
            return [...prev, ev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
        <Link to="/" className="text-sm opacity-70 hover:opacity-100">← Voltar</Link>
        <h1 className="text-lg font-semibold tracking-wide">Monitor em tempo real</h1>
        <div className="ml-auto text-xs opacity-60">
          janela: {Math.round(WINDOW_MS / 1000)}s · {events.length} evento(s) ativo(s)
        </div>
      </header>

      <main
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% 50%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, #020617 0%, #0b1220 100%)",
        }}
      >
        <Grid />
        <LaneGuides />
        {events.map((e) => (
          <Card key={e.id} ev={e} container={containerRef.current} />
        ))}
        <div className="absolute inset-y-0 right-0 w-32 pointer-events-none bg-gradient-to-l from-slate-950 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none bg-gradient-to-r from-slate-950 to-transparent" />
      </main>
    </div>
  );
}

/** Linhas horizontais discretas marcando as lanes. */
function LaneGuides() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: LANES }).map((_, i) => {
        const top = ((i + 0.5) / LANES) * 100;
        return (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-cyan-300/5"
            style={{ top: `${top}%` }}
          />
        );
      })}
    </div>
  );
}

/** Grid sutil de fundo (visual futurista). */
function Grid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.07]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(125, 211, 252, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function Card({ ev, container }: { ev: LiveEvent; container: HTMLDivElement | null }) {
  const visual = useMemo(
    () => describeAction(ev.action, ev.metadata, ev.actorName),
    [ev.action, ev.actorName, ev.metadata],
  );

  const width = container?.clientWidth ?? 1200;
  const elapsed = Date.now() - ev.createdAt;
  const progress = Math.max(0, Math.min(1, elapsed / WINDOW_MS));
  // Card desliza de 100% (direita) até -CARD_WIDTH (sai pela esquerda).
  const x = width - progress * (width + CARD_WIDTH);
  const top = ((ev.lane + 0.5) / LANES) * 100;
  const opacity =
    progress < 0.05 ? progress / 0.05 : progress > 0.9 ? (1 - progress) / 0.1 : 1;

  return (
    <div
      className="absolute"
      style={{
        transform: `translate3d(${x}px, 0, 0)`,
        top: `calc(${top}% - 28px)`,
        width: CARD_WIDTH,
        opacity,
        transition: "transform 0.05s linear, opacity 0.2s ease-out",
      }}
    >
      <div
        className={`relative rounded-2xl border bg-gradient-to-br ${toneClasses(visual.tone)} backdrop-blur-md px-3 py-2 shadow-[0_0_30px_-5px_var(--tw-shadow-color)]`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{visual.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{visual.label}</div>
            <div className="text-[10px] opacity-70 tabular-nums">
              {new Date(ev.createdAt).toLocaleTimeString("pt-BR")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** First-fit lane: escolhe a primeira lane sem card cuja janela ainda intersecta. */
function pickLane(active: LiveEvent[]): number {
  const minLeadMs = 1500; // distância mínima entre cards na mesma lane
  const now = Date.now();
  for (let lane = 0; lane < LANES; lane++) {
    const lastInLane = active
      .filter((e) => e.lane === lane)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!lastInLane || now - lastInLane.createdAt > minLeadMs) {
      return lane;
    }
  }
  // Todas ocupadas — escolhe pseudo-aleatória (ainda evita encavalar visualmente
  // pois a velocidade é constante e o card recém-chegado está atrás do anterior
  // na mesma lane apenas por ~1.5s).
  return Math.floor(Math.random() * LANES);
}
