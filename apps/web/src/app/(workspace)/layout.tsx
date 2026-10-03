import { cookies } from 'next/headers';
import Image from 'next/image';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { OnboardingProvider } from '@/providers/onboarding-provider';

/** Written by the sidebar when it is collapsed or expanded on desktop. */
const SIDEBAR_STATE_COOKIE = 'sidebar_state';

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const isSidebarOpen =
    cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <OnboardingProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-canvas">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hairline bg-surface px-4 shadow-xs lg:hidden">
            <SidebarTrigger aria-label="Buka menu" />
            <Image src="/integra-mark.png" alt="" width={24} height={24} />
            <span className="font-display text-base font-semibold tracking-display text-ink">
              INTEGRA
            </span>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
            {children}
          </main>
        </SidebarInset>
      </OnboardingProvider>
    </SidebarProvider>
  );
}
