"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export default function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // On success the browser redirects to Google, no further action needed.
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="h-auto w-full gap-2.5 rounded-[9px] border-white/15 bg-white px-4 py-[11px] text-[0.9rem] font-semibold text-[#1f1f1f] transition-opacity hover:bg-white hover:text-[#1f1f1f] disabled:opacity-70 [&_svg:not([class*='size-'])]:size-[18px]"
      >
        {loading ? (
          <Loader2 className="size-[15px] animate-spin text-[#1f1f1f]" />
        ) : (
          <GoogleGlyph />
        )}
        {loading ? "Redirecting…" : label}
      </Button>
      {error && (
        <p className="mt-2 text-center text-[0.78rem] text-destructive">{error}</p>
      )}
    </div>
  );
}
