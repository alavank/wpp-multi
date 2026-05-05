import { forwardRef, useState } from "react";
import { apiFetch } from "../../lib/apiClient";

type Props = {
  contact: { name: string; phone: string };
  conversationId: string;
};

export const ScheduleReturnModal = forwardRef<HTMLDialogElement, Props>(
  function ScheduleReturnModal({ contact, conversationId }, ref) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [subject, setSubject] = useState("");
    const [notify, setNotify] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const scheduledFor = new Date(`${date}T${time}:00`);
        await apiFetch("/scheduled-returns", {
          method: "POST",
          body: JSON.stringify({
            conversationId,
            scheduledFor: scheduledFor.toISOString(),
            subject,
            notifyOnSave: notify,
          }),
        });
        (ref as React.RefObject<HTMLDialogElement>).current?.close();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="font-semibold text-lg mb-4">Agendar retorno</h3>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="Nome do contato">
              <input
                type="text"
                className="input input-bordered w-full"
                value={contact.name}
                readOnly
              />
            </Field>
            <Field label="Número">
              <input
                type="text"
                className="input input-bordered w-full"
                value={contact.phone}
                readOnly
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input
                  type="date"
                  className="input input-bordered w-full"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Horário">
                <input
                  type="time"
                  className="input input-bordered w-full"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Assunto">
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                required
                placeholder="O que será tratado no retorno?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>

            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <span className="label-text">
                Enviar mensagem automática de confirmação ao cliente
              </span>
            </label>

            {error && (
              <div role="alert" className="alert alert-error text-sm">
                {error}
              </div>
            )}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={(e) =>
                  (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close()
                }
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>fechar</button>
        </form>
      </dialog>
    );
  },
);

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="form-control">
      <span className="label-text mb-1">{label}</span>
      {children}
    </label>
  );
}
