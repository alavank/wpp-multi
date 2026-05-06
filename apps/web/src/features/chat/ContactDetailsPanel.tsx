import { useSelectionStore } from "../../stores/selectionStore";
import { useConversations } from "../../hooks/useConversations";
import { Avatar } from "../../components/Avatar";
import { DepartmentTag } from "../../components/DepartmentTag";

export function ContactDetailsPanel() {
  const departmentId = useSelectionStore((s) => s.departmentId);
  const conversationId = useSelectionStore((s) => s.conversationId);
  const { items } = useConversations({ departmentId });
  const conv = items.find((c) => c.id === conversationId) ?? null;

  const name = conv
    ? (conv.contact.displayName ?? conv.contact.pushName ?? conv.contact.phoneE164)
    : null;

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col border-l divider-hair">
      <header className="px-5 py-5 flex flex-col items-center text-center gap-3">
        {conv ? (
          <>
            <Avatar
              name={name!}
              src={conv.contact.profilePicUrl ?? undefined}
              sizeClass="w-20"
            />
            <div className="space-y-1">
              <div className="font-semibold text-base">{name}</div>
              <DepartmentTag departmentId={conv.departmentId} />
              <div className="text-xs text-base-content/55">{conv.contact.phoneE164}</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-base-200 grid place-items-center text-base-content/40">
              —
            </div>
            <div className="font-semibold">Detalhes do contato</div>
            <div className="text-xs text-base-content/55">
              Selecione uma conversa
            </div>
          </>
        )}
      </header>

      <div className="px-5 py-4 flex-1 overflow-y-auto scrollbar-soft space-y-5 text-sm">
        <Section title="Informações">
          <Field label="Canal" value="WhatsApp" />
          <Field label="Telefone" value={conv?.contact.phoneE164 ?? "—"} />
        </Section>

        <Section title="Notas">
          <p className="text-base-content/55">Sem notas registradas.</p>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="surface-soft p-4 space-y-3">
      <h3 className="text-[11px] uppercase tracking-wider text-base-content/55 font-semibold">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-base-content/55">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
