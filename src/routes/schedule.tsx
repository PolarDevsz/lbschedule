import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { SubjectAssignmentsDialog } from "@/components/SubjectAssignmentsDialog";
import { toast } from "sonner";

type Search = { major?: string };
const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const WEEKDAYS = [
  { label: "จันทร์", dbIndex: 1 },
  { label: "อังคาร", dbIndex: 2 },
  { label: "พุธ", dbIndex: 3 },
  { label: "พฤหัสบดี", dbIndex: 4 },
  { label: "ศุกร์", dbIndex: 5 },
];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00

export const Route = createFileRoute("/schedule")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    major: typeof s.major === "string" ? s.major : undefined,
  }),
  head: () => ({ meta: [{ title: "ตารางเรียน — LBSchedule" }] }),
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
  subject_id: string;
  subjects: { id: string; code: string; name: string } | null;
  teachers: { name: string } | null;
  rooms: { name: string } | null;
  majors: { name: string } | null;
};

function SchedulePage() {
  const { major } = Route.useSearch();
  const [majorFilter, setMajorFilter] = useState<string>(major ?? "all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<{ id: string; code?: string; name?: string } | null>(null);
  const queryClient = useQueryClient();

  // Realtime: auto-refresh schedule and assignments on any change
  useEffect(() => {
    const channel = supabase
      .channel("schedule-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        const evt = payload.eventType;
        if (evt === "INSERT") toast.success("มีการเพิ่มตารางเรียนใหม่", { description: "อัปเดตหน้าจออัตโนมัติ" });
        else if (evt === "UPDATE") toast("ตารางเรียนถูกอัปเดต");
        else if (evt === "DELETE") toast("ตารางเรียนถูกลบ");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["assignment-counts"] });
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        const evt = payload.eventType;
        if (evt === "INSERT") toast.success("มีงานใหม่ถูกเพิ่ม", { description: "ไอคอนการแจ้งเตือนถูกอัปเดต" });
        else if (evt === "UPDATE") toast("งานถูกอัปเดต");
        else if (evt === "DELETE") toast("งานถูกลบออก");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


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
        .select("*, subjects(id,code,name), teachers(name), rooms(name), majors(name)")
        .order("day_of_week")
        .order("start_time");
      if (majorFilter !== "all") q = q.eq("major_id", majorFilter);
      if (yearFilter !== "all") q = q.eq("year", Number(yearFilter));
      const { data, error } = await q;
      if (error) throw error;
      return data as ScheduleRow[];
    },
  });

  const subjectIds = Array.from(
    new Set(schedules.map((s) => s.subjects?.id).filter(Boolean) as string[])
  );

  const { data: assignmentCounts = {} } = useQuery({
    queryKey: ["assignment-counts", subjectIds.sort().join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("subject_id,due_date")
        .in("subject_id", subjectIds);
      if (error) throw error;
      const now = Date.now();
      const map: Record<string, { total: number; upcoming: number; overdue: number }> = {};
      for (const a of data as { subject_id: string; due_date: string | null }[]) {
        const m = (map[a.subject_id] ??= { total: 0, upcoming: 0, overdue: 0 });
        m.total += 1;
        if (a.due_date) {
          if (new Date(a.due_date).getTime() < now) m.overdue += 1;
          else m.upcoming += 1;
        }
      }
      return map;
    },
  });

  const hourToMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const colors = [
    "from-cyan-500/25 to-teal-500/25 border-cyan-400/50 hover:from-cyan-500/55 hover:to-teal-500/55",
    "from-violet-500/25 to-purple-500/25 border-violet-400/50 hover:from-violet-500/55 hover:to-purple-500/55",
    "from-amber-500/25 to-orange-500/25 border-amber-400/50 hover:from-amber-500/55 hover:to-orange-500/55",
    "from-rose-500/25 to-pink-500/25 border-rose-400/50 hover:from-rose-500/55 hover:to-pink-500/55",
    "from-emerald-500/25 to-green-500/25 border-emerald-400/50 hover:from-emerald-500/55 hover:to-green-500/55",
    "from-blue-500/25 to-indigo-500/25 border-blue-400/50 hover:from-blue-500/55 hover:to-indigo-500/55",
  ];

  const openSubject = (s: ScheduleRow) => {
    if (!s.subjects) return;
    setActiveSubject({ id: s.subjects.id, code: s.subjects.code, name: s.subjects.name });
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2 animate-slide-down">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow animate-glow-pulse">
          <CalendarDays className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gradient-teal">ตารางเรียน</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        เลือกสาขาวิชาและชั้นปีเพื่อแสดงตารางเรียน · คลิกที่วิชาเพื่อดู/เพิ่มงาน
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <Select value={majorFilter} onValueChange={setMajorFilter}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">-- ทุกสาขาวิชา --</SelectItem>
            {majors.map((m) => (
              <SelectItem key={m.id} value={m.id}>สาขาวิชา {m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกชั้นปี</SelectItem>
            {[1, 2, 3].map((y) => (
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
        <>
          <p className="md:hidden text-xs text-muted-foreground mb-2">← เลื่อนแนวนอนเพื่อดูตารางทั้งหมด →</p>
          <div className="rounded-2xl bg-card/60 border-2 border-border backdrop-blur-xl p-2 sm:p-4 overflow-x-auto shadow-card animate-float-in">
            <div className="min-w-[820px] sm:min-w-[1000px] grid grid-cols-[92px_repeat(11,minmax(60px,1fr))] sm:grid-cols-[110px_repeat(11,minmax(80px,1fr))] gap-0">
              {/* header */}
              <div className="text-xs font-semibold text-muted-foreground py-3 px-2 border-b-2 border-r border-border bg-muted/40 rounded-tl-lg">
                วัน / เวลา
              </div>
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className={`text-xs font-semibold text-foreground/80 text-center py-3 border-b-2 border-l border-border bg-muted/40 ${
                    i === HOURS.length - 1 ? "rounded-tr-lg" : ""
                  }`}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}

              {WEEKDAYS.map((d, idx) => (
                <div key={d.label} className="contents">
                  <div
                    className={`text-[11px] sm:text-sm font-semibold py-3 sm:py-4 px-1.5 sm:px-3 flex items-center border-b border-r border-border bg-muted/20 ${
                      idx === WEEKDAYS.length - 1 ? "rounded-bl-lg border-b-0" : ""
                    }`}
                  >
                    <span className="truncate">{d.label}</span>
                  </div>
                  <div
                    className={`col-span-11 relative h-20 border-b border-border ${
                      idx === WEEKDAYS.length - 1 ? "border-b-0" : ""
                    } ${idx % 2 === 0 ? "bg-muted/10" : ""}`}
                  >
                    {/* vertical hour gridlines */}
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-11">
                      {HOURS.map((h) => (
                        <div key={h} className="border-l border-border/60 first:border-l-0" />
                      ))}
                    </div>
                    {schedules
                      .filter((s) => s.day_of_week === d.dbIndex)
                      .map((s, i) => {
                        const startMin = hourToMin(s.start_time) - 8 * 60;
                        const endMin = hourToMin(s.end_time) - 8 * 60;
                        const totalMin = 11 * 60;
                        const left = (startMin / totalMin) * 100;
                        const width = ((endMin - startMin) / totalMin) * 100;
                        const counts = s.subjects ? assignmentCounts[s.subjects.id] : undefined;
                        const hasWork = !!counts && counts.total > 0;
                        const hasOverdue = !!counts && counts.overdue > 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => openSubject(s)}
                            className={`group absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-br border-2 ${colors[i % colors.length]} p-1.5 sm:p-2 overflow-hidden backdrop-blur-md shadow-md hover:shadow-glow transition-all duration-300 cursor-pointer text-left hover:scale-[1.04] hover:z-10 animate-float-in`}
                            style={{ left: `${left}%`, width: `${width}%`, animationDelay: `${i * 40}ms` }}
                            title={`${s.subjects?.code} ${s.subjects?.name}\n${s.teachers?.name ?? ""} · ${s.rooms?.name ?? ""}${hasWork ? `\nงาน ${counts!.total} รายการ` : ""}\nคลิกเพื่อดูงาน`}
                          >
                            {/* shine sweep on hover */}
                            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:[animation:shine_1.1s_ease-out]" />
                            {/* assignment indicator */}
                            {hasWork && (
                              <span className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                                {hasOverdue && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                                  </span>
                                )}
                                <span className="rounded-full bg-background/80 backdrop-blur px-1.5 py-0.5 text-[9px] font-bold text-foreground border border-border shadow-sm">
                                  {counts!.total}
                                </span>
                              </span>
                            )}
                            <div className="relative text-[11px] font-bold truncate text-foreground">{s.subjects?.code}</div>
                            <div className="relative text-[10px] text-foreground/90 truncate">{s.subjects?.name}</div>
                            <div className="relative text-[9px] text-foreground/70 truncate">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.rooms?.name}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* List view */}
      {schedules.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-3">รายการวิชา</h2>
          <div className="rounded-2xl bg-card/60 border border-border backdrop-blur-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
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
                {schedules.map((s, idx) => {
                  const counts = s.subjects ? assignmentCounts[s.subjects.id] : undefined;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openSubject(s)}
                      className="border-t border-border/40 hover:bg-muted/30 cursor-pointer animate-stagger-in"
                      style={{ animationDelay: `${Math.min(idx * 30, 400)}ms` }}
                    >
                      <td className="p-3 whitespace-nowrap">{DAYS[s.day_of_week]}</td>
                      <td className="p-3 whitespace-nowrap">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{s.subjects?.code}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span className="truncate max-w-[260px]">{s.subjects?.name}</span>
                          {counts && counts.total > 0 && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap ${counts.overdue > 0 ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-primary/15 text-primary border-primary/40"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${counts.overdue > 0 ? "bg-destructive animate-pulse" : "bg-primary"}`} />
                              {counts.total} งาน{counts.overdue > 0 ? ` · เลย ${counts.overdue}` : ""}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{s.teachers?.name}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{s.rooms?.name}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">ปี {s.year} / {s.section}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubjectAssignmentsDialog open={dialogOpen} onOpenChange={setDialogOpen} subject={activeSubject} />
    </div>
  );
}
