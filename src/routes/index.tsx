import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CalendarDays, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Schedy — ระบบจัดการตารางเรียน" },
      { name: "description", content: "ค้นหาและดูตารางเรียนได้ทันที ระบบจัดการตารางเรียนสมัยใหม่" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [majorId, setMajorId] = useState<string>("all");

  const { data: majors = [] } = useQuery({
    queryKey: ["majors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("majors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSearch = () => {
    navigate({ to: "/schedule", search: { major: majorId === "all" ? undefined : majorId } as never });
  };

  return (
    <div className="container mx-auto px-4">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/40 to-accent/40 rounded-full" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-accent to-primary shadow-glow">
            <CalendarDays className="h-14 w-14 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance max-w-3xl">
          ระบบจัดการ<span className="text-gradient-teal">ตารางเรียน</span>
        </h1>
        <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
          ยินดีต้อนรับสู่ระบบจัดตารางเรียน ภาควิชาคอมพิวเตอร์ศึกษา
          สำหรับนักศึกษาและบุคคลทั่วไป ค้นหาและดูตารางเรียนได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
        </p>

        {/* Search */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-card/60 border border-border backdrop-blur-xl shadow-card">
            <Select value={majorId} onValueChange={setMajorId}>
              <SelectTrigger className="flex-1 h-12 border-0 bg-transparent text-base focus:ring-0">
                <SelectValue placeholder="-- แสดงตารางเรียนทุกสาขาวิชา --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- แสดงตารางเรียนทุกสาขาวิชา --</SelectItem>
                {majors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>สาขาวิชา {m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSearch}
              size="lg"
              className="h-12 px-8 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 gap-2"
            >
              <Search className="h-4 w-4" /> ค้นหา
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-4 pb-24 max-w-5xl mx-auto">
        {[
          { icon: CalendarDays, title: "ดูตารางทั้งสัปดาห์", desc: "แสดงตารางเรียนแบบ timetable เข้าใจง่าย" },
          { icon: Clock, title: "ค้นหาตามสาขา", desc: "เลือกสาขาวิชาเพื่อดูตารางของชั้นปีนั้นๆ" },
          { icon: MapPin, title: "ห้องเรียน & อาจารย์", desc: "ข้อมูลห้องเรียนและผู้สอนครบทุกวิชา" },
        ].map((f) => (
          <div
            key={f.title}
            className="group p-6 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-md hover:bg-card/70 hover:border-primary/40 transition-all"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
