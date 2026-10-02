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
  'text-charcoal-copy data-[active=true]:bg-integra-wash data-[active=true]:text-integra-deep';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const startTour = useStartTour();
  const currentUserQuery = useCurrentUser();
  const currentRole = currentUserQuery.data?.role;
  const visibleMenuGroups = MENU_GROUPS.filter(
    (menuGroup) => currentRole && menuGroup.allowedRoles.includes(currentRole),
  );

  async function handleLogOut() {
    await logOut();
    queryClient.clear();
    router.replace(LOGIN_PATH);
  }

  return (
    <Sidebar className="border-linen-border">
      <SidebarHeader className="px-4 py-4">
        <Link href="/claims" className="flex items-center gap-2">
          <Image
            src="/integra-mark.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <span className="flex flex-col">
            <span className="text-base leading-tight font-semibold tracking-tight text-integra-deep">
              INTEGRA
            </span>
            <span className="text-xs text-quiet-gray">
              Detect with evidence
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent data-tour="sidebar-menu">
        {currentUserQuery.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 bg-cloud-surface" />
            <Skeleton className="h-8 bg-cloud-surface" />
          </div>
        ) : (
          visibleMenuGroups.map((menuGroup) => (
            <SidebarGroup key={menuGroup.label}>
              <SidebarGroupLabel className="text-quiet-gray">
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
                          <menuItem.icon />
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
      <SidebarFooter className="gap-2 border-t border-linen-border">
        {currentUserQuery.data && (
          <div className="flex flex-col px-2 pt-1">
            <span className="truncate text-sm font-medium text-graphite">
              {currentUserQuery.data.name}
            </span>
            <span className="text-xs text-quiet-gray">
              {USER_ROLE_LABELS[currentUserQuery.data.role]}
            </span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={startTour}
              className={MENU_BUTTON_CLASS_NAME}
            >
              <CircleHelp />
              <span>Panduan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogOut}
              className={MENU_BUTTON_CLASS_NAME}
            >
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
