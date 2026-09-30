import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <Card className="w-full border-linen-border bg-eggshell-canvas shadow-none">
        <CardHeader>
          <p className="text-sm font-medium text-quiet-gray">
            Foundation ready
          </p>
          <CardTitle className="font-jakarta-sans text-4xl font-medium tracking-tight text-graphite">
            Resik App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-charcoal-copy">
          <p>A Next.js and NestJS workspace prepared for future development.</p>
          <div className="flex flex-wrap gap-2 text-sm text-quiet-gray">
            <span>Next.js</span>
            <span aria-hidden="true">·</span>
            <span>Tailwind CSS</span>
            <span aria-hidden="true">·</span>
            <span>shadcn/ui</span>
          </div>
          <Button disabled>Ready for development</Button>
        </CardContent>
      </Card>
    </main>
  );
}
