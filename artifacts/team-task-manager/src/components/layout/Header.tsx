import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/users": "Team",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { logout } = useAuth();
  const [location] = useLocation();

  const title =
    pageTitles[location] ??
    (location.startsWith("/projects/") ? "Project Details" : "Team Task Manager");

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </header>
  );
}
