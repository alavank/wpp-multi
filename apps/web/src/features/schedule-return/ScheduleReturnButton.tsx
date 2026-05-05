import { useRef } from "react";
import { ScheduleReturnModal } from "./ScheduleReturnModal";

export function ScheduleReturnButton() {
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
      <ScheduleReturnModal ref={dialogRef} />
    </>
  );
}
