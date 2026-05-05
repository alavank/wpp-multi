import { ScheduleReturnButton } from "../schedule-return/ScheduleReturnButton";

type Props = { className?: string };

export function ChatPanel({ className }: Props) {
  return (
    <section className={`flex flex-col bg-base-100 ${className ?? ""}`}>
      <header className="border-b border-base-300 px-4 py-3 flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-10">
            <span className="text-xs">CG</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="font-medium">Selecione uma conversa</div>
          <div className="text-xs opacity-60">— sem chat ativo —</div>
        </div>
        <ScheduleReturnButton />
        <button type="button" className="btn btn-sm btn-ghost">
          Transferir
        </button>
        <button type="button" className="btn btn-sm">
          Encerrar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-sm opacity-60">
        Nenhuma conversa ativa. Escolha uma conversa na lista para começar.
      </div>

      <footer className="border-t border-base-300 p-3 flex gap-2">
        <button type="button" className="btn btn-ghost btn-square btn-sm" aria-label="Anexar">
          📎
        </button>
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Digite uma mensagem..."
          disabled
        />
        <button type="button" className="btn btn-primary" disabled>
          Enviar
        </button>
      </footer>
    </section>
  );
}
