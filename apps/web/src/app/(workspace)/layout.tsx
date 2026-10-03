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
        <SidebarInset className="min-w-0 bg-eggshell-canvas">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-linen-border bg-eggshell-canvas px-4 md:hidden">
            <SidebarTrigger aria-label="Buka menu" />
            <span className="text-sm font-semibold text-integra-deep">
              INTEGRA
            </span>
          </header>
          <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
            {children}
          </div>
        </SidebarInset>
      </OnboardingProvider>
    </SidebarProvider>
  );
}
