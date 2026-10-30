'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuTrash2 } from 'react-icons/lu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { NoticeDialog } from '@/components/notice-dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';
import { deleteAllClaims } from '@/services/import.service';

/** Supervisor-only reset that removes every claim so a bad import can be redone. */
export function DeleteAllClaimsButton() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [isConfirming, setIsConfirming] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteAllClaims,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
        queryClient.invalidateQueries({ queryKey: ['facilities'] }),
      ]),
  });

  if (currentUser?.role !== 'SUPERVISOR') return null;

  return (
    <>
      <Button
        variant="destructive"
        disabled={deleteMutation.isPending}
        onClick={() => setIsConfirming(true)}
      >
        <LuTrash2 aria-hidden="true" />
        {deleteMutation.isPending ? 'Menghapus…' : 'Hapus semua klaim'}
      </Button>

      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        icon={LuTrash2}
        title="Hapus semua klaim?"
        description="Semua klaim beserta dokumen, hasil analisis AI, dan riwayat keputusannya akan dihapus permanen. Faskes dan pasien yang tidak lagi memiliki klaim juga ikut terhapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, hapus semua"
        onConfirm={() => deleteMutation.mutate()}
      />

      <NoticeDialog
        open={deleteMutation.isSuccess || deleteMutation.isError}
        onOpenChange={(open) => {
          if (!open) deleteMutation.reset();
        }}
        icon={deleteMutation.isSuccess ? LuCircleCheck : LuCircleAlert}
        title={
          deleteMutation.isSuccess
            ? `${deleteMutation.data.deletedCount.toLocaleString('id-ID')} klaim dihapus`
            : 'Klaim gagal dihapus'
        }
        description={
          deleteMutation.isSuccess
            ? 'Antrean Klaim sekarang kosong. Impor ulang file klaim yang benar.'
            : 'Periksa koneksi ke server, lalu coba lagi. Tidak ada data yang berubah.'
        }
        actionLabel="Tutup"
        onAction={() => deleteMutation.reset()}
      />
    </>
  );
}
