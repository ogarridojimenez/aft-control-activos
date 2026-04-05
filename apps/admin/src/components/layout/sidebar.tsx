import Link from 'next/link';

const nav = [
  { href: '/', label: 'Inicio' },
  { href: '/upload', label: 'Carga Excel' },
  { href: '/inventories', label: 'Inventarios' },
  { href: '/assets', label: 'Activos' },
  { href: '/qr', label: 'Generar QR' },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="text-sm font-semibold tracking-tight text-brand-900">AFT</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
