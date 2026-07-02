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
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card">
          <CalendarDays className="h-8 w-8 text-primary" strokeWidth={1.75} />
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance max-w-3xl text-foreground">
          ระบบจัดการตารางเรียน
        </h1>
        <p className="mt-4 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
          ยินดีต้อนรับสู่ระบบจัดตารางเรียน จากแผนกวิชาช่างเทคนิคคอมพิวเตอร์ สำหรับนักศึกษาและบุคคลทั่วไป ค้นหาและดูตารางเรียนได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
        </p>

        {/* Search */}
        <div className="mt-10 w-full max-w-xl">
          <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-lg bg-card border border-border shadow-sm">
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
              <Search className="h-4 w-4" /> ค้นหา
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-4 pb-20 border-t border-border pt-12">
        {[
          { icon: CalendarDays, title: "ดูตารางทั้งสัปดาห์", desc: "แสดงตารางเรียนแบบ timetable เข้าใจง่าย" },
          { icon: Clock, title: "ค้นหาตามสาขา", desc: "เลือกสาขาวิชาเพื่อดูตารางของชั้นปีนั้นๆ" },
          { icon: MapPin, title: "ห้องเรียน & อาจารย์", desc: "ข้อมูลห้องเรียนและผู้สอนครบทุกวิชา" },
        ].map((f) => (
          <div
            key={f.title}
            className="p-5 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted mb-3">
              <f.icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
            </div>
            <h3 className="font-medium text-sm mb-1 text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

