import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";

const APP_SCHEME = "app.keepintouch.crm://callback";

export default function OAuthCallback() {
  const deepLink = useMemo(() => {
    const suffix = `${window.location.search}${window.location.hash}`;
    return `${APP_SCHEME}${suffix}`;
  }, []);

  useEffect(() => {
    document.title = "Returning to app | Keep in Touch";

    // This page is meant to run in the browser (Google OAuth redirect).
    // It immediately deep-links back into the native app with the auth params.
    const t = window.setTimeout(() => {
      window.location.replace(deepLink);
    }, 300);

    return () => window.clearTimeout(t);
  }, [deepLink]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <article className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Returning to the app</CardTitle>
            <CardDescription>
              If you don’t get prompted to open the app, tap the button below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finishing sign-in…
            </div>

            <Button asChild className="w-full gap-2">
              <a href={deepLink}>
                Open the app <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard">Continue in browser</a>
            </Button>
          </CardContent>
        </Card>
      </article>
    </main>
  );
}
