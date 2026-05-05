export function ContactDetailsPanel() {
  return (
    <aside className="w-72 border-l border-base-300 bg-base-100 hidden xl:flex flex-col">
      <header className="border-b border-base-300 px-4 py-3 flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-12">
            <span>—</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">Detalhes do contato</div>
          <div className="text-xs opacity-60">Sem contato selecionado</div>
        </div>
      </header>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
        <Section title="Informações">
          <Field label="Canal" value="WhatsApp" />
          <Field label="Telefone" value="—" />
        </Section>

        <Section title="Notas">
          <p className="opacity-60">Sem notas registradas.</p>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider opacity-60 mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="opacity-60">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
