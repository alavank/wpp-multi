import { useDepartments } from "../hooks/useDepartments";

/** Cor estável por id de departamento — distingue setores na UI multi-dept. */
function colorFor(id: string): string {
  const palette = [
    "bg-blue-500/12 text-blue-700 dark:text-blue-300",
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
    "bg-lime-500/12 text-lime-700 dark:text-lime-300",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length]!;
}

export function DepartmentTag({
  departmentId,
  className = "",
}: {
  departmentId: string;
  className?: string;
}) {
  const { items } = useDepartments();
  const dept = items.find((d) => d.id === departmentId);
  if (!dept) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorFor(departmentId)} ${className}`}
      title={`Setor: ${dept.name}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {dept.name}
    </span>
  );
}
