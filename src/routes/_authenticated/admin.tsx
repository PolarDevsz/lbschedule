import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Plus, Trash2 } from "lucide-react";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const WEEKDAYS = [
  { label: "จันทร์", dbIndex: 1 },
  { label: "อังคาร", dbIndex: 2 },
  { label: "พุธ", dbIndex: 3 },
  { label: "พฤหัสบดี", dbIndex: 4 },
  { label: "ศุกร์", dbIndex: 5 },
];

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "login" } as never });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "ผู้ดูแลระบบ — LBSchedule" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ผู้ดูแลระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการสาขาวิชา รายวิชา อาจารย์ ห้อง และตารางเรียน</p>
        </div>
      </div>

      <Tabs defaultValue="schedules">
        <TabsList className="mb-6">
          <TabsTrigger value="schedules">ตารางเรียน</TabsTrigger>
          <TabsTrigger value="subjects">รายวิชา</TabsTrigger>
          <TabsTrigger value="majors">สาขาวิชา</TabsTrigger>
          <TabsTrigger value="teachers">อาจารย์</TabsTrigger>
          <TabsTrigger value="rooms">ห้อง</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules"><SchedulesAdmin /></TabsContent>
        <TabsContent value="subjects"><SubjectsAdmin /></TabsContent>
        <TabsContent value="majors"><SimpleAdmin table="majors" label="สาขาวิชา" /></TabsContent>
        <TabsContent value="teachers"><SimpleAdmin table="teachers" label="อาจารย์" /></TabsContent>
        <TabsContent value="rooms"><SimpleAdmin table="rooms" label="ห้อง" /></TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-6 shadow-card">
      {children}
    </div>
  );
}

function SimpleAdmin({ table, label }: { table: "majors" | "teachers" | "rooms"; label: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name });
    if (error) return toast.error(error.message);
    setName("");
    toast.success("เพิ่มสำเร็จ");
    qc.invalidateQueries({ queryKey: [table] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ลบแล้ว");
    qc.invalidateQueries({ queryKey: [table] });
  };

  return (
    <Card>
      <div className="flex gap-2 mb-4">
        <Input placeholder={`ชื่อ${label}ใหม่`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} className="gap-1.5"><Plus className="h-4 w-4" /> เพิ่ม</Button>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between py-3">
            <span>{it.name}</span>
            <Button size="sm" variant="ghost" onClick={() => del(it.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีข้อมูล</div>}
      </div>
    </Card>
  );
}

function SubjectsAdmin() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("3");
  const [majorId, setMajorId] = useState<string>("none");

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*, majors(name)").order("code");
      if (error) throw error;
      return data;
    },
  });
  const { data: majors = [] } = useQuery({
    queryKey: ["majors"],
    queryFn: async () => (await supabase.from("majors").select("*").order("name")).data ?? [],
  });

  const add = async () => {
    if (!code || !name) return toast.error("กรอกรหัสและชื่อวิชา");
    const { error } = await supabase.from("subjects").insert({
      code, name, credits: Number(credits), major_id: majorId === "none" ? null : majorId,
    });
    if (error) return toast.error(error.message);
    setCode(""); setName(""); setCredits("3"); setMajorId("none");
    toast.success("เพิ่มวิชาสำเร็จ");
    qc.invalidateQueries({ queryKey: ["subjects-admin"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["subjects-admin"] });
  };

  return (
    <Card>
      <div className="grid sm:grid-cols-5 gap-2 mb-4">
        <Input placeholder="รหัสวิชา" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input className="sm:col-span-2" placeholder="ชื่อวิชา" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="number" placeholder="หน่วยกิต" value={credits} onChange={(e) => setCredits(e.target.value)} />
        <Select value={majorId} onValueChange={setMajorId}>
          <SelectTrigger><SelectValue placeholder="สาขา" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ไม่ระบุสาขา</SelectItem>
            {majors.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={add} className="gap-1.5 mb-4"><Plus className="h-4 w-4" /> เพิ่มวิชา</Button>
      <div className="divide-y divide-border/40">
        {subjects.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-3 gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-muted-foreground">{s.code} · {s.credits} หน่วยกิต</div>
              <div className="font-medium truncate">{s.name}</div>
              {s.majors && <div className="text-xs text-muted-foreground">{(s.majors as { name: string }).name}</div>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => del(s.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {subjects.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีรายวิชา</div>}
      </div>
    </Card>
  );
}

function SchedulesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject_id: "", teacher_id: "", room_id: "", major_id: "",
    year: "1", section: "1", day_of_week: "1", start_time: "09:00", end_time: "12:00",
  });

  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("*").order("code")).data ?? [] });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: async () => (await supabase.from("teachers").select("*").order("name")).data ?? [] });
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: async () => (await supabase.from("rooms").select("*").order("name")).data ?? [] });
  const { data: majors = [] } = useQuery({ queryKey: ["majors"], queryFn: async () => (await supabase.from("majors").select("*").order("name")).data ?? [] });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, subjects(code,name), teachers(name), rooms(name), majors(name)")
        .order("day_of_week").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const save = async () => {
    if (!form.subject_id) return toast.error("เลือกวิชา");
    const { error } = await supabase.from("schedules").insert({
      subject_id: form.subject_id,
      teacher_id: form.teacher_id || null,
      room_id: form.room_id || null,
      major_id: form.major_id || null,
      year: Number(form.year),
      section: form.section,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    if (error) return toast.error(error.message);
    toast.success("เพิ่มตารางสำเร็จ");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["schedules-admin"] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["schedules-admin"] });
  };

  return (
    <Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-1.5 mb-4"><Plus className="h-4 w-4" /> เพิ่มตารางเรียน</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>เพิ่มตารางเรียน</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>วิชา</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="เลือกวิชา" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ผู้สอน</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ห้อง</Label>
              <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สาขา</Label>
              <Select value={form.major_id} onValueChange={(v) => setForm({ ...form, major_id: v })}>
                <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                <SelectContent>{majors.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>วัน</Label>
              <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEKDAYS.map((d) => <SelectItem key={d.dbIndex} value={String(d.dbIndex)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ชั้นปี</Label>
              <Input type="number" min="1" max="6" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>หมู่</Label>
              <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>เวลาเริ่ม</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>เวลาจบ</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">วัน</th>
              <th className="text-left p-3">เวลา</th>
              <th className="text-left p-3">วิชา</th>
              <th className="text-left p-3">ผู้สอน</th>
              <th className="text-left p-3">ห้อง</th>
              <th className="text-left p-3">สาขา/ปี</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => {
              const sub = s.subjects as { code: string; name: string } | null;
              const teach = s.teachers as { name: string } | null;
              const room = s.rooms as { name: string } | null;
              const mj = s.majors as { name: string } | null;
              return (
                <tr key={s.id} className="border-t border-border/40">
                  <td className="p-3">{DAYS[s.day_of_week]}</td>
                  <td className="p-3">{s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}</td>
                  <td className="p-3"><span className="font-mono text-xs">{sub?.code}</span> {sub?.name}</td>
                  <td className="p-3 text-muted-foreground">{teach?.name}</td>
                  <td className="p-3 text-muted-foreground">{room?.name}</td>
                  <td className="p-3 text-muted-foreground">{mj?.name} · ปี{s.year}/{s.section}</td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" onClick={() => del(s.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {schedules.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">ยังไม่มีตารางเรียน</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
