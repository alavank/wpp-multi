import { useDepartments } from "../hooks/useDepartments";

/** Cor estável por id de departamento — distingue setores na UI multi-dept. */
function colorFor(id: string): string {
  const palette = [
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
    "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30",
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
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorFor(departmentId)} ${className}`}
      title={`Setor: ${dept.name}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {dept.name}
    </span>
  );
}
