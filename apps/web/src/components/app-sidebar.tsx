'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CircleHelp,
  ListOrdered,
  LogOut,
  type LucideIcon,
  ShieldAlert,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { LOGIN_PATH } from '@/lib/api-client';
import { USER_ROLE_LABELS } from '@/lib/claim-labels';
import { useStartTour } from '@/providers/onboarding-provider';
import { logOut } from '@/services/auth.service';
import type { UserRole } from '@/types/auth.types';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MenuGroup {
  label: string;
  allowedRoles: UserRole[];
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'Verifikasi',
    allowedRoles: ['VERIFIER', 'SUPERVISOR'],
    items: [{ href: '/claims', label: 'Antrean Klaim', icon: ListOrdered }],
  },
  {
    label: 'Supervisor',
    allowedRoles: ['SUPERVISOR'],
    items: [
      { href: '/escalations', label: 'Eskalasi', icon: ShieldAlert },
      { href: '/facilities', label: 'Ringkasan Faskes', icon: Building2 },
    ],
  },
];

const MENU_BUTTON_CLASS_NAME =
  'h-9 text-sm font-medium text-ink-secondary hover:bg-subtle hover:text-ink data-[active=true]:bg-primary-wash data-[active=true]:text-primary-hover [&>svg]:text-current';

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const startTour = useStartTour();
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;
  const visibleMenuGroups = MENU_GROUPS.filter(
    (menuGroup) =>
      currentUser && menuGroup.allowedRoles.includes(currentUser.role),
  );

  async function handleLogOut() {
    await logOut();
    queryClient.clear();
    router.replace(LOGIN_PATH);
  }

  return (
    <Sidebar className="border-hairline">
      <SidebarHeader className="border-b border-hairline px-4 py-4">
        <Link href="/claims" className="flex items-center gap-2.5">
          <Image
            src="/integra-mark.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <span className="flex flex-col">
            <span className="font-display text-base leading-tight font-semibold tracking-display text-ink">
              INTEGRA
            </span>
            <span className="text-caption text-ink-secondary">
              Detect with evidence
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent data-tour="main-nav" className="py-2">
        {currentUserQuery.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 bg-subtle" />
            <Skeleton className="h-8 bg-subtle" />
          </div>
        ) : (
          visibleMenuGroups.map((menuGroup) => (
            <SidebarGroup key={menuGroup.label}>
              <SidebarGroupLabel className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
                {menuGroup.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuGroup.items.map((menuItem) => (
                    <SidebarMenuItem key={menuItem.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(menuItem.href)}
                        className={MENU_BUTTON_CLASS_NAME}
                      >
                        <Link href={menuItem.href}>
                          <menuItem.icon aria-hidden="true" />
                          <span>{menuItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-hairline p-3">
        {currentUser && (
          <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-surface text-caption font-medium text-ink">
                {toInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-small font-medium text-ink">
                {currentUser.name}
              </span>
              <span className="truncate text-caption text-ink-secondary">
                {USER_ROLE_LABELS[currentUser.role]}
              </span>
            </span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={startTour}
              className={MENU_BUTTON_CLASS_NAME}
            >
              <CircleHelp aria-hidden="true" />
              <span>Panduan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogOut}
              className={MENU_BUTTON_CLASS_NAME}
            >
              <LogOut aria-hidden="true" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
