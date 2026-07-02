import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, LogIn, UserPlus, LogOut, User, Shield, Menu, X } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 min-w-0" onClick={closeMobile}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <Calendar className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight truncate">LBSchedule</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/schedule">
            <Button variant="ghost" size="sm">ตารางเรียน</Button>
          </Link>

          <ThemeToggle />
          {user ? (
            <UserMenu user={user} isAdmin={isAdmin} onSignOut={handleSignOut} />
          ) : (
            <>
              <Link to="/auth" search={{ mode: "login" } as never}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LogIn className="h-4 w-4" /> เข้าสู่ระบบ
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "register" } as never}>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-4 w-4" /> สมัครสมาชิก
                </Button>
              </Link>
            </>

          )}
        </nav>


        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1.5">
            <Link to="/schedule" onClick={closeMobile}>
              <Button variant="ghost" className="w-full justify-start">ตารางเรียน</Button>
            </Link>
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={closeMobile}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Shield className="h-4 w-4" /> ผู้ดูแล
                    </Button>
                  </Link>
                )}
                <Link to="/profile" onClick={closeMobile}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <User className="h-4 w-4" /> โปรไฟล์
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { closeMobile(); handleSignOut(); }}
                >
                  <LogOut className="h-4 w-4" /> ออกจากระบบ
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "login" } as never} onClick={closeMobile}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <LogIn className="h-4 w-4" /> เข้าสู่ระบบ
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "register" } as never} onClick={closeMobile}>
                  <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="h-4 w-4" /> สมัครสมาชิก
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
