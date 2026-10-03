'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** Yes/no confirmation before an action that costs money or ends the session. */
export function ConfirmDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Tidak',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: IconType;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-10">
            <Icon aria-hidden="true" className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
