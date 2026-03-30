"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam  = searchParams.get("error");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(
    errorParam === "CredentialsSignin" ? "Invalid email or password." : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
    }}>
      {/* Paper texture card */}
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "var(--paper-surface)",
        border: "1.5px solid var(--border-ink)",
        boxShadow: "5px 5px 0 rgba(0,0,0,0.1), 2px 2px 0 rgba(0,0,0,0.06)",
        padding: "2.5rem 2rem",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: "2rem",
            letterSpacing: "0.15em",
            color: "var(--ink)",
            marginBottom: "0.25rem",
          }}>
            RADAR
          </div>
          <div style={{
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontSize: "1rem",
            color: "var(--ink-faint)",
          }}>
            sign in to your workspace
          </div>
          {/* Ruled line divider */}
          <div style={{
            marginTop: "1rem",
            borderBottom: "1px solid var(--border-ink)",
          }} />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            background: "transparent",
            border: "1.5px solid var(--border-ink)",
            color: "var(--ink)",
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontSize: "0.85rem",
            cursor: "pointer",
            letterSpacing: "0.05em",
            marginBottom: "1.25rem",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--paper-dark)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <GoogleIcon />
          CONTINUE WITH GOOGLE
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          color: "var(--ink-ghost)",
          fontSize: "0.75rem",
          letterSpacing: "0.08em",
        }}>
          <div style={{ flex: 1, borderBottom: "1px dashed var(--border-ink)" }} />
          OR
          <div style={{ flex: 1, borderBottom: "1px dashed var(--border-ink)" }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: "1rem",
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--stamp-red)",
            color: "var(--stamp-red)",
            fontSize: "0.8rem",
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            letterSpacing: "0.03em",
          }}>
            ✕ {error}
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="typewriter-btn"
            style={{
              width: "100%",
              padding: "0.65rem",
              background: "var(--ink)",
              color: "var(--paper-surface)",
              border: "1.5px solid var(--ink)",
              fontFamily: "var(--font-dm-serif)",
              fontSize: "0.95rem",
              letterSpacing: "0.15em",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>

        {/* Footer links */}
        <div style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px dashed var(--border-ink)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.78rem",
          color: "var(--ink-faint)",
          fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
        }}>
          <span>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--stamp-blue)", textDecoration: "underline" }}>
              Sign up
            </Link>
          </span>
          <Link href="/forgot-password" style={{ color: "var(--ink-faint)", textDecoration: "underline" }}>
            Forgot password
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  letterSpacing: "0.12em",
  color: "var(--ink-faint)",
  marginBottom: "0.35rem",
  fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1.5px solid var(--border-ink)",
  padding: "0.4rem 0.1rem",
  fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
  fontSize: "0.9rem",
  color: "var(--ink)",
  outline: "none",
  letterSpacing: "0.03em",
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
