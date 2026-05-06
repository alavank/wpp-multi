type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base(size = 18, props: IconProps) {
  const { size: _ignored, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function IconInbox(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  );
}
export function IconActivity(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
export function IconShield(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}
export function IconLock(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
export function IconBuilding(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}
export function IconUsers(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
export function IconSettings(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.07A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.07A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.07A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.27.62.86 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.07a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}
export function IconSearch(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
export function IconBell(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
export function IconPlus(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconSend(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
export function IconPaperclip(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
export function IconMic(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <path d="M12 19v3" />
    </svg>
  );
}
export function IconSmile(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}
export function IconSun(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
export function IconMoon(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
export function IconLogout(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
export function IconChat(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}
export function IconChevronDown(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
export function IconCalendar(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
export function IconMore(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
export function IconFilter(p: IconProps) {
  return (
    <svg {...base(p.size, p)}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54Z" />
    </svg>
  );
}
