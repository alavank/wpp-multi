import { useRef } from "react";
import { ScheduleReturnModal } from "./ScheduleReturnModal";

type Props = {
  contact: { name: string; phone: string };
  conversationId: string;
};

export function ScheduleReturnButton({ contact, conversationId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => dialogRef.current?.showModal()}
      >
        Agendar Retorno
      </button>
      <ScheduleReturnModal ref={dialogRef} contact={contact} conversationId={conversationId} />
    </>
  );
}
