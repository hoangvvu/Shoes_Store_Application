export type IconName =
  | 'dashboard' | 'users' | 'user' | 'box' | 'tag' | 'image' | 'bell' | 'chart' | 'history'
  | 'cart' | 'card' | 'return' | 'store' | 'warehouse' | 'clipboard' | 'book' | 'logout' | 'menu';

const PATHS: Record<IconName, JSX.Element> = {
  dashboard: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M17.5 14c2.5 0 4 1.8 4 4.5" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>),
  box: (<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M4 7.5L12 12l8-4.5M12 12v9" /></>),
  tag: (<><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 9" /></>),
  bell: (<><path d="M6 17v-6a6 6 0 1 1 12 0v6l2 2H4l2-2z" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  chart: (<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>),
  cart: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11l2-8H6" /></>),
  card: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  return: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>),
  store: (<><path d="M4 9l1-5h14l1 5" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></>),
  warehouse: (<><path d="M3 9l9-6 9 6v11H3z" /><path d="M8 20v-7h8v7" /></>),
  clipboard: (<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>),
  book: (<><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M5 18a2 2 0 0 1 2-2h12" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
  menu: (<path d="M4 6h16M4 12h16M4 18h16" />),
};

export function NavIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
