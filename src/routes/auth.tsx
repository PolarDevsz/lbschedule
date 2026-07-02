import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { z } from "zod";

type Search = { mode?: "login" | "register" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "register" ? "register" : "login",
  }),
  head: () => ({ meta: [{ title: "เข้าสู่ระบบ — LBSchedule" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("ยินดีต้อนรับ");
    navigate({ to: "/" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const schema = z.object({
      name: z.string().min(2, "กรุณากรอกชื่อ"),
      email: z.string().email("อีเมลไม่ถูกต้อง"),
      password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร"),
    });
    const parsed = schema.safeParse({ name: regName, email: regEmail, password: regPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: regName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("สมัครสมาชิกไม่สำเร็จ", { description: error.message });
      return;
    }
    toast.success("สมัครสมาชิกสำเร็จ!");
    navigate({ to: "/" });
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-primary shadow-glow mb-4">
            <CalendarDays className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ยินดีต้อนรับสู่ LBSchedule</h1>
          <p className="text-sm text-muted-foreground mt-1">เข้าสู่ระบบเพื่อจัดการตารางเรียนของคุณ</p>
        </div>

        <div className="rounded-lg bg-card border border-border backdrop-blur p-6 shadow-sm">
          <Tabs defaultValue={mode}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="register">สมัครสมาชิก</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="le">อีเมล</Label>
                  <Input id="le" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lp">รหัสผ่าน</Label>
                  <Input id="lp" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rn">ชื่อ-นามสกุล</Label>
                  <Input id="rn" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="re">อีเมล</Label>
                  <Input id="re" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rp">รหัสผ่าน</Label>
                  <Input id="rp" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
