import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { User, Camera, KeyRound, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "โปรไฟล์ — LBSchedule" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState<string>("none");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const { data: majors = [] } = useQuery({
    queryKey: ["majors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("majors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setMajor(data.major ?? "none");
        setBio((data as any).bio ?? "");
        setPhone((data as any).phone ?? "");
        const url = (data as any).avatar_url as string | null;
        setAvatarUrl(url);
        if (url) {
          const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(url, 3600);
          setSignedAvatar(signed?.signedUrl ?? null);
        }
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      major: major === "none" ? null : major,
      bio,
      phone,
    });
    setSaving(false);
    if (error) toast.error("บันทึกไม่สำเร็จ", { description: error.message });
    else toast.success("บันทึกโปรไฟล์เรียบร้อย");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast.error("อัปโหลดไม่สำเร็จ", { description: upErr.message });
      return;
    }
    if (avatarUrl) {
      await supabase.storage.from("avatars").remove([avatarUrl]).catch(() => {});
    }
    await supabase.from("profiles").upsert({ id: userId, full_name: fullName, avatar_url: path });
    setAvatarUrl(path);
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setSignedAvatar(signed?.signedUrl ?? null);
    setUploading(false);
    toast.success("เปลี่ยนรูปโปรไฟล์เรียบร้อย");
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ", { description: error.message });
    else {
      toast.success("เปลี่ยนรหัสผ่านเรียบร้อย");
      setNewPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("ออกจากระบบเรียบร้อย");
    navigate({ to: "/" });
  };

  const initials = (fullName || email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl animate-float-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">โปรไฟล์ของฉัน</h1>
      </div>

      {/* Avatar card */}
      <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-6 shadow-card mb-6 animate-float-in" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar className="h-20 w-20 ring-2 ring-primary/40 shadow-glow transition-transform hover:scale-105">
              <AvatarImage src={signedAvatar ?? undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground border-2 border-background grid place-items-center shadow-md hover:scale-110 transition-transform"
              title="เปลี่ยนรูป"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{fullName || "ยังไม่ระบุชื่อ"}</div>
            <div className="text-sm text-muted-foreground truncate">{email}</div>
            <p className="text-xs text-muted-foreground mt-1">รองรับ JPG/PNG ขนาดไม่เกิน 5MB</p>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-6 shadow-card space-y-5 animate-float-in" style={{ animationDelay: "120ms" }}>
        <div className="space-y-2">
          <Label>อีเมล</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">ชื่อ-นามสกุล</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph">เบอร์โทรศัพท์</Label>
          <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xx-xxx-xxxx" maxLength={20} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">เกี่ยวกับฉัน</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="แนะนำตัวสั้นๆ..." rows={3} maxLength={300} />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
        </div>
        <div className="space-y-2">
          <Label>สาขาวิชา</Label>
          <Select value={major} onValueChange={setMajor}>
            <SelectTrigger><SelectValue placeholder="เลือกสาขา" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
              {majors.map((m) => (
                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-all hover:scale-[1.01]">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังบันทึก...</> : "บันทึก"}
        </Button>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-6 shadow-card mt-6 space-y-4 animate-float-in" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">ความปลอดภัย</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">เปลี่ยนรหัสผ่านใหม่</Label>
          <Input id="pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
        </div>
        <Button variant="outline" onClick={handlePasswordChange} disabled={changingPw || !newPassword} className="w-full">
          {changingPw ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
        </Button>
      </div>

      {/* Sign out */}
      <div className="mt-6 animate-float-in" style={{ animationDelay: "240ms" }}>
        <Button variant="destructive" onClick={handleSignOut} className="w-full hover:scale-[1.01] transition-transform">
          <LogOut className="h-4 w-4 mr-2" />ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
