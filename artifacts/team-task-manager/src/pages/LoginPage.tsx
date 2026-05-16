import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg border p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-md">
              <CheckSquare className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">TaskFlow</h1>
            <p className="text-muted-foreground text-sm">
              Team task management made simple. Organize projects, track progress, and collaborate with your team.
            </p>
          </div>
          <Button
            onClick={onLogin}
            size="lg"
            className="w-full font-semibold"
          >
            Sign in with Replit
          </Button>
          <p className="text-xs text-muted-foreground">
            Sign in to access your team's workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
