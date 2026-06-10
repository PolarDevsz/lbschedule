import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "โปรไฟล์ — LBSchedule" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState<string>("none");
  const [saving, setSaving] = useState(false);

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
    });
    setSaving(false);
    if (error) toast.error("บันทึกไม่สำเร็จ", { description: error.message });
    else toast.success("บันทึกโปรไฟล์เรียบร้อย");
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">โปรไฟล์ของฉัน</h1>
      </div>

      <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-6 shadow-card space-y-5">
        <div className="space-y-2">
          <Label>อีเมล</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">ชื่อ-นามสกุล</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
