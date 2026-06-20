import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, BarChart3, Layers, Sparkles, Target } from "lucide-react";
import logoSrc from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CtrlTrack — Control Your Goals. Track Your Progress." },
      { name: "description", content: "A personal command center for tasks, goals, habits, applications, and growth — beautifully organized in one dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background bg-hero text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <img src={logoSrc} alt="CtrlTrack" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-display">CtrlTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-gradient-primary shadow-elegant">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid place-items-center py-20 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Your personal command center
          </span>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Control Your Goals.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">Track Your Progress.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Organize job applications, learning goals, habits, projects, and notes from one beautifully designed dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary shadow-elegant">
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">See features</Button>
            </a>
          </div>
        </section>

        <section id="features" className="grid gap-6 py-20 md:grid-cols-3">
          {[
            { icon: Layers, title: "Unlimited categories", body: "Companies applied, habits, learning goals, projects — build your own structure." },
            { icon: CheckCircle2, title: "Task tracking", body: "Priorities, descriptions, completion states, and dates. Stay focused on what matters." },
            { icon: BarChart3, title: "Progress at a glance", body: "Animated progress bars, completion rates, and a live activity feed." },
            { icon: Target, title: "Personal goals", body: "Set the career goal that drives you, and align every task to it." },
            { icon: Sparkles, title: "Beautiful by default", body: "A dark, modern interface designed to feel calm and powerful." },
            { icon: Zap, title: "Lightning fast", body: "Realtime cloud sync, secure auth, and instant search across everything." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-gradient-surface p-6 shadow-card backdrop-blur">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CtrlTrack. Your command center.
        </footer>
      </main>
    </div>
  );
}
