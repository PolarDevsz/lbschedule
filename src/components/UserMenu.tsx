import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Shield, LogOut } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Props = {
  user: SupabaseUser;
  isAdmin: boolean;
  onSignOut: () => void;
};

export function UserMenu({ user, isAdmin, onSignOut }: Props) {
  const [fullName, setFullName] = useState<string>("");
  const [avatarSigned, setAvatarSigned] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setFullName(data.full_name ?? "");
      const url = (data as any).avatar_url as string | null;
      if (url) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(url, 3600);
        if (!cancelled) setAvatarSigned(signed?.signedUrl ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const display = fullName || user.email?.split("@")[0] || "ผู้ใช้";
  const initial = display.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-border/60 bg-card/50 pl-1 pr-3 py-1 transition-all duration-300 hover:bg-card hover:shadow-glow hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-ring">
        <Avatar className="h-8 w-8 ring-2 ring-primary/30 transition-all group-hover:ring-primary">
          <AvatarImage src={avatarSigned ?? undefined} alt={display} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium max-w-[140px] truncate hidden sm:inline">
          {display}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 animate-slide-down">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold">{display}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link to="/profile">
          <DropdownMenuItem className="cursor-pointer gap-2">
            <User className="h-4 w-4" /> โปรไฟล์
          </DropdownMenuItem>
        </Link>
        {isAdmin && (
          <Link to="/admin">
            <DropdownMenuItem className="cursor-pointer gap-2">
              <Shield className="h-4 w-4" /> ผู้ดูแล
            </DropdownMenuItem>
          </Link>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
