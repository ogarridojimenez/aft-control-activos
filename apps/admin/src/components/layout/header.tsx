import { UserMenu } from '@/components/layout/UserMenu';

export function Header({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-medium text-slate-800">Portal administrativo</h1>
      <UserMenu email={userEmail} />
    </header>
  );
}
