import Image from 'next/image';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { OnboardingProvider } from '@/providers/onboarding-provider';

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider>
      <OnboardingProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-canvas">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hairline bg-surface/80 px-4 shadow-xs backdrop-blur-md md:hidden">
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
