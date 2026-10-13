import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAuthConfigured, isValidSession, SESSION_COOKIE, sessionToken } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const next = String(formData.get("next") || "/");
  const token = await sessionToken(String(formData.get("password") ?? ""));
  if (!(await isValidSession(token))) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="font-medium text-3xl tracking-tight">PRM</h1>
      {isAuthConfigured() ? (
        <form action={login} className="flex flex-col gap-3">
          <input name="next" type="hidden" value={next ?? "/"} />
          <Input aria-label="Password" autoFocus name="password" placeholder="Password" type="password" />
          {error ? <p className="text-destructive text-sm">That password didn't match.</p> : null}
          <Button type="submit">Sign in</Button>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">
          Set the <code>APP_PASSWORD</code> environment variable to sign in.
        </p>
      )}
    </main>
  );
}
