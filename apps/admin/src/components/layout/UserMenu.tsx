'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Props = { email: string | null };

export function UserMenu({ email }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {email && <span className="max-w-[200px] truncate text-xs text-slate-500">{email}</span>}
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Salir
      </button>
    </div>
  );
}
