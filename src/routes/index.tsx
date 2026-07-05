import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CalendarDays, Clock, MapPin, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LBSchedule — ระบบจัดการตารางเรียน" },
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
    <div className="relative">
      {/* Ambient hero backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-hero" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-grid opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="container relative mx-auto px-4 max-w-6xl">
        {/* Hero */}
        <section className="flex flex-col items-start pt-16 pb-14 md:pt-28 md:pb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            วิทยาลัยเทคนิคลพบุรี - ช่างเทคนิคคอมพิวเตอร์
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-balance">
            ตารางเรียน <span className="text-gradient-primary">/LBSchedule</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            ระบบจัดตารางเรียนสำหรับนักศึกษาและอาจารย์ ค้นหาได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
            มีระบบมอบหมายงาน แจ้งเตือน และรองรับการใช้งานบนมือถือ
          </p>

          {/* Search */}
          <div className="mt-8 w-full max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl bg-card border border-border shadow-sm">
              <Select value={majorId} onValueChange={setMajorId}>
                <SelectTrigger className="flex-1 h-11 border-0 bg-transparent text-sm focus:ring-0 shadow-none">
                  <SelectValue placeholder="-- แสดงตารางเรียนทุกสาขาวิชา --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- แสดงตารางเรียนทุกสาขาวิชา --</SelectItem>
                  {majors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>สาขาวิชา {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="default" className="h-11 px-6 gap-2">
                <Search className="h-4 w-4" /> ค้นหาตาราง
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <Link to="/schedule" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                ดูตารางทั้งหมด <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="opacity-40">-</span>
              <Link to="/auth" search={{ mode: "login" } as never} className="hover:text-foreground transition-colors">เข้าสู่ระบบ</Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-4 pb-24 border-t border-border pt-12">
          {[
            { icon: CalendarDays, title: "ดูตารางทั้งสัปดาห์", desc: "แสดงตารางเรียนแบบ timetable เข้าใจง่าย ใช้งานได้บนทุกอุปกรณ์" },
            { icon: Clock, title: "ค้นหาตามสาขา", desc: "เลือกสาขาวิชาและชั้นปีเพื่อดูตารางเฉพาะกลุ่มที่ต้องการ" },
            { icon: MapPin, title: "ห้องเรียน & อาจารย์", desc: "รายละเอียดผู้สอน ห้องเรียน และงานที่ได้รับมอบหมายครบทุกวิชา" },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-base mb-1.5 text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
