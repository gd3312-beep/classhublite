import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = "Admin Panel" }: NavbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-highlight text-highlight-foreground shadow-soft">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-base sm:text-lg">
            ClassHub <span className="text-muted-foreground font-normal">Lite</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">{title}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="default">
              <Link to="/admin/login">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Login</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
