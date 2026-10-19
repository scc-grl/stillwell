import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
      <Card className="w-full max-w-md border-border shadow-none">
        <CardContent className="p-7 md:p-8">
          <div className="mb-4 flex items-center gap-3 text-secondary-foreground">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
            <h1 className="font-serif text-3xl text-foreground">
              404 Page Not Found
            </h1>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            That page isn’t part of the clinician portal.
          </p>
          <Button asChild className="mt-6" data-testid="button-not-found-home">
            <Link href="/" data-testid="link-not-found-home"><ArrowLeft aria-hidden="true" /> Back to Stillwell</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
