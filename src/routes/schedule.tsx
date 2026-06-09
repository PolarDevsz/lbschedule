import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

type Search = { major?: string };
const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00

export const Route = createFileRoute("/schedule")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    major: typeof s.major === "string" ? s.major : undefined,
  }),
  head: () => ({ meta: [{ title: "ตารางเรียน — Schedy" }] }),
  component: SchedulePage,
});

type ScheduleRow = {
  id: string;
  year: number;
  section: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  major_id: string | null;
  subjects: { code: string; name: string } | null;
  teachers: { name: string } | null;
  rooms: { name: string } | null;
  majors: { name: string } | null;
};

function SchedulePage() {
  const { major } = Route.useSearch();
  const [majorFilter, setMajorFilter] = useState<string>(major ?? "all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const { data: majors = [] } = useQuery({
    queryKey: ["majors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("majors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", majorFilter, yearFilter],
    queryFn: async () => {
      let q = supabase
        .from("schedules")
        .select("*, subjects(code,name), teachers(name), rooms(name), majors(name)")
        .order("day_of_week")
        .order("start_time");
      if (majorFilter !== "all") q = q.eq("major_id", majorFilter);
      if (yearFilter !== "all") q = q.eq("year", Number(yearFilter));
      const { data, error } = await q;
      if (error) throw error;
      return data as ScheduleRow[];
    },
  });

  const hourToMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const colors = [
    "from-cyan-500/30 to-teal-500/30 border-cyan-400/40",
    "from-violet-500/30 to-purple-500/30 border-violet-400/40",
    "from-amber-500/30 to-orange-500/30 border-amber-400/40",
    "from-rose-500/30 to-pink-500/30 border-rose-400/40",
    "from-emerald-500/30 to-green-500/30 border-emerald-400/40",
    "from-blue-500/30 to-indigo-500/30 border-blue-400/40",
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <CalendarDays className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">ตารางเรียน</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">เลือกสาขาวิชาและชั้นปีเพื่อแสดงตารางเรียน</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={majorFilter} onValueChange={setMajorFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">-- ทุกสาขาวิชา --</SelectItem>
            {majors.map((m) => (
              <SelectItem key={m.id} value={m.id}>สาขาวิชา {m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกชั้นปี</SelectItem>
            {[1, 2, 3, 4].map((y) => (
              <SelectItem key={y} value={String(y)}>ชั้นปีที่ {y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">กำลังโหลด...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground rounded-2xl bg-card/40 border border-border">
          ไม่พบตารางเรียน
        </div>
      ) : (
        <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl p-4 overflow-x-auto shadow-card">
          <div className="min-w-[900px] grid grid-cols-[100px_repeat(11,minmax(70px,1fr))] gap-1">
            {/* header */}
            <div className="text-xs font-medium text-muted-foreground py-2 px-2">วัน</div>
            {HOURS.map((h) => (
              <div key={h} className="text-xs text-muted-foreground text-center py-2 border-l border-border/40">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}

            {DAYS.map((d, idx) => (
              <div key={d} className="contents">
                <div className="text-sm font-medium py-3 px-2 flex items-center">{d}</div>
                <div className="col-span-11 relative h-16 border-l border-border/40 rounded-lg">
                  {schedules
                    .filter((s) => s.day_of_week === idx)
                    .map((s, i) => {
                      const startMin = hourToMin(s.start_time) - 8 * 60;
                      const endMin = hourToMin(s.end_time) - 8 * 60;
                      const totalMin = 11 * 60;
                      const left = (startMin / totalMin) * 100;
                      const width = ((endMin - startMin) / totalMin) * 100;
                      return (
                        <div
                          key={s.id}
                          className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-br border ${colors[i % colors.length]} p-2 overflow-hidden backdrop-blur-sm`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${s.subjects?.code} ${s.subjects?.name}\n${s.teachers?.name ?? ""} · ${s.rooms?.name ?? ""}`}
                        >
                          <div className="text-[10px] font-semibold truncate">{s.subjects?.code}</div>
                          <div className="text-[10px] text-foreground/80 truncate">{s.subjects?.name}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{s.rooms?.name}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List view */}
      {schedules.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-3">รายการวิชา</h2>
          <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">วัน</th>
                  <th className="text-left p-3">เวลา</th>
                  <th className="text-left p-3">รหัสวิชา</th>
                  <th className="text-left p-3">ชื่อวิชา</th>
                  <th className="text-left p-3">ผู้สอน</th>
                  <th className="text-left p-3">ห้อง</th>
                  <th className="text-left p-3">ชั้นปี/หมู่</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-3">{DAYS[s.day_of_week]}</td>
                    <td className="p-3">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                    <td className="p-3 font-mono text-xs">{s.subjects?.code}</td>
                    <td className="p-3">{s.subjects?.name}</td>
                    <td className="p-3 text-muted-foreground">{s.teachers?.name}</td>
                    <td className="p-3 text-muted-foreground">{s.rooms?.name}</td>
                    <td className="p-3 text-muted-foreground">ปี {s.year} / {s.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
