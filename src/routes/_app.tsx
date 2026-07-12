import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, FolderKanban, Activity, User, LogOut, Menu, Sparkles } from "lucide-react";
import logoSrc from "@/assets/logo.png";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/categories", label: "Categories", icon: FolderKanban },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/profile", label: "Profile", icon: User },
];

function AppShell() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/dashboard" className="flex items-center gap-2 p-2 font-bold">
              <img src={logoSrc} alt="CtrlTrack" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
              <span className="group-data-[collapsible=icon]:hidden font-display">CtrlTrack</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => {
                    const active = pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign out"
                  onClick={async () => {
                    await signOut();
                    toast.success("Signed out");
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger>
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
            <div className="flex flex-1 justify-center">
              <div className="tagline-shell group hidden sm:inline-flex">
                <Sparkles className="tagline-spark h-3.5 w-3.5" strokeWidth={2.25} />
                <p className="cursor-default text-[13px] font-semibold uppercase tracking-[0.18em]">
                  <span className="tagline-text">Control Your Goals</span>
                  <span className="tagline-dot mx-2.5 inline-block align-middle" />
                  <span className="tagline-text">Track Your Progress</span>
                </p>
                <Sparkles className="tagline-spark h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {user.email}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}