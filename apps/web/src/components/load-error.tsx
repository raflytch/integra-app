import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function LoadError({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  return (
    <Alert className="border-hairline bg-surface">
      <AlertTitle className="text-ink">{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3 text-ink-secondary">
        Periksa koneksi ke server, lalu coba lagi.
        <Button size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      </AlertDescription>
    </Alert>
  );
}
