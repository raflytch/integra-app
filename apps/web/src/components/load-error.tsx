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
    <Alert className="border-linen-border bg-eggshell-canvas">
      <AlertTitle className="text-graphite">{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3 text-charcoal-copy">
        Periksa koneksi ke server, lalu coba lagi.
        <Button size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      </AlertDescription>
    </Alert>
  );
}
