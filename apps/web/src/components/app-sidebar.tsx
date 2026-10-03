'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { IconType } from 'react-icons';
import {
  LuCircleHelp,
  LuFileUp,
  LuHospital,
  LuLayoutDashboard,
  LuListOrdered,
  LuLogOut,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuShieldAlert,
} from 'react-icons/lu';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  SidebarRail,
  useSidebar,
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
  icon: IconType;
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
    items: [
      { href: '/claims', label: 'Antrean Klaim', icon: LuListOrdered },
      { href: '/imports', label: 'Impor Klaim', icon: LuFileUp },
    ],
  },
  {
    label: 'Supervisor',
    allowedRoles: ['SUPERVISOR'],
    items: [
      { href: '/overview', label: 'Ikhtisar', icon: LuLayoutDashboard },
      { href: '/escalations', label: 'Eskalasi', icon: LuShieldAlert },
      { href: '/facilities', label: 'Ringkasan Faskes', icon: LuHospital },
    ],
  },
];

/** The 2px green bar marks the active page; DESIGN.md allows green there. */
const MENU_BUTTON_CLASS_NAME =
  'relative h-9 text-sm font-medium text-ink-secondary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity before:duration-200 hover:bg-subtle hover:text-ink data-[active=true]:bg-primary-wash data-[active=true]:text-primary-hover data-[active=true]:before:opacity-100 [&>svg]:text-current';

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
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const currentUserQuery = useCurrentUser();
  const [isLogOutConfirmOpen, setIsLogOutConfirmOpen] = useState(false);
  const currentUser = currentUserQuery.data;
  const isCollapsed = state === 'collapsed' && !isMobile;
  const visibleMenuGroups = MENU_GROUPS.filter(
    (menuGroup) =>
      currentUser && menuGroup.allowedRoles.includes(currentUser.role),
  );

  /** The sheet below `lg` closes once a page is chosen. */
  function closeMobileSheet() {
    if (isMobile) setOpenMobile(false);
  }

  async function handleLogOut() {
    await logOut();
    queryClient.clear();
    router.replace(LOGIN_PATH);
  }

  return (
    <Sidebar collapsible="icon" className="border-hairline">
      <SidebarHeader className="border-b border-hairline p-3 group-data-[collapsible=icon]:px-2">
        <Link
          href="/claims"
          onClick={closeMobileSheet}
          className="flex items-center gap-2.5 overflow-hidden rounded-md"
        >
          <Image
            src="/integra-mark.png"
            alt=""
            width={32}
            height={32}
            priority
            className="size-8 shrink-0"
          />
          <span className="flex flex-col whitespace-nowrap">
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
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-9 bg-subtle" />
            <Skeleton className="h-9 bg-subtle" />
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
                        tooltip={menuItem.label}
                        className={MENU_BUTTON_CLASS_NAME}
                      >
                        <Link href={menuItem.href} onClick={closeMobileSheet}>
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
      <SidebarFooter className="gap-2 border-t border-hairline p-3 group-data-[collapsible=icon]:px-2">
        {currentUser && (
          <div
            title={isCollapsed ? currentUser.name : undefined}
            className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-hairline bg-canvas p-2 transition-[padding,background-color,border-color] duration-300 ease-out group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 motion-reduce:transition-none"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-subtle text-caption font-medium text-ink">
                {toInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col leading-tight whitespace-nowrap">
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
              onClick={() => {
                closeMobileSheet();
                startTour();
              }}
              tooltip="Panduan"
              className={MENU_BUTTON_CLASS_NAME}
            >
              <LuCircleHelp aria-hidden="true" />
              <span>Panduan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isMobile && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip="Perluas menu (Ctrl+B)"
                aria-expanded={!isCollapsed}
                className={MENU_BUTTON_CLASS_NAME}
              >
                {isCollapsed ? (
                  <LuPanelLeftOpen aria-hidden="true" />
                ) : (
                  <LuPanelLeftClose aria-hidden="true" />
                )}
                <span>{isCollapsed ? 'Perluas menu' : 'Ciutkan menu'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsLogOutConfirmOpen(true)}
              tooltip="Keluar"
              className={MENU_BUTTON_CLASS_NAME}
            >
              <LuLogOut aria-hidden="true" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <ConfirmDialog
        open={isLogOutConfirmOpen}
        onOpenChange={setIsLogOutConfirmOpen}
        icon={LuLogOut}
        title="Keluar dari INTEGRA?"
        description="Untuk masuk lagi, Anda perlu email dan kode dari aplikasi autentikator."
        confirmLabel="Ya, keluar"
        onConfirm={handleLogOut}
      />
    </Sidebar>
  );
}
