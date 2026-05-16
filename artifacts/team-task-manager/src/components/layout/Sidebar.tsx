import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/users", label: "Team", icon: Users },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-200",
          "lg:relative lg:translate-x-0 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">TaskFlow</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-2">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email || "User"}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
