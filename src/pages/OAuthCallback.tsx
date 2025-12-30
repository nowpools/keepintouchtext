import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, AlertCircle } from "lucide-react";

const APP_SCHEME = "keepintouch://callback";

export default function OAuthCallback() {
  // Combine search params and hash into the deep link
  const { deepLink, hasError, errorMessage } = useMemo(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const params = new URLSearchParams(search);
    
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    return {
      deepLink: `${APP_SCHEME}${search}${hash}`,
      hasError: !!error,
      errorMessage: errorDesc || error || null
    };
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
            <CardTitle>{hasError ? "Sign-in Issue" : "Returning to the app"}</CardTitle>
            <CardDescription>
              {hasError 
                ? "There was a problem signing in. Please try again."
                : "If you don't get prompted to open the app, tap the button below."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasError ? (
              <div className="flex items-center gap-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMessage || "Authentication failed"}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finishing sign-in…
              </div>
            )}

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
