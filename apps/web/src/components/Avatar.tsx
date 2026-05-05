import { avatarColor, initials } from "../lib/avatar";

type Props = {
  name: string;
  src?: string | null;
  /** Tailwind size token (default w-10) */
  sizeClass?: string;
};

export function Avatar({ name, src, sizeClass = "w-10" }: Props) {
  if (src) {
    return (
      <div className="avatar">
        <div className={`rounded-full ${sizeClass}`}>
          <img src={src} alt={name} />
        </div>
      </div>
    );
  }
  return (
    <div className="avatar placeholder">
      <div className={`rounded-full ${sizeClass} ${avatarColor(name)}`}>
        <span className="text-xs font-semibold">{initials(name)}</span>
      </div>
    </div>
  );
}
