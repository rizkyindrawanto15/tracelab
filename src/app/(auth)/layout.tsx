import Link from "next/link";
import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <header className="relative z-10 flex h-14 items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] rounded-xl border border-border bg-card/90 p-6 shadow-2xl shadow-black/10 backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </main>
      <footer className="relative z-10 flex h-14 items-center justify-center gap-4 px-5 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} TraceLab</span>
        <span aria-hidden>·</span>
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
      </footer>
    </div>
  );
}
