import { forwardRef } from "react";

type ContactSummary = { name: string; phone: string };

type Props = {
  contact?: ContactSummary;
};

export const ScheduleReturnModal = forwardRef<HTMLDialogElement, Props>(
  function ScheduleReturnModal({ contact }, ref) {
    return (
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="font-semibold text-lg mb-4">Agendar retorno</h3>

          <form
            method="dialog"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              // submissão real será conectada ao backend em etapa posterior
              (ref as React.RefObject<HTMLDialogElement>).current?.close();
            }}
          >
            <Field label="Nome do contato">
              <input
                type="text"
                className="input input-bordered w-full"
                value={contact?.name ?? ""}
                readOnly
                placeholder="Autopreenchido pela sessão"
              />
            </Field>
            <Field label="Número">
              <input
                type="text"
                className="input input-bordered w-full"
                value={contact?.phone ?? ""}
                readOnly
                placeholder="Autopreenchido pela sessão"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input type="date" className="input input-bordered w-full" required />
              </Field>
              <Field label="Horário">
                <input type="time" className="input input-bordered w-full" required />
              </Field>
            </div>

            <Field label="Assunto">
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                required
                placeholder="O que será tratado no retorno?"
              />
            </Field>

            <label className="label cursor-pointer justify-start gap-2">
              <input type="checkbox" className="checkbox checkbox-sm" defaultChecked />
              <span className="label-text">
                Enviar mensagem automática de confirmação ao cliente
              </span>
            </label>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={(e) =>
                (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close()
              }>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar
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
