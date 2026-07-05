import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, ClipboardList } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject: { id: string; code?: string; name?: string } | null;
};

type Assignment = {
  id: string;
  title: string;
  details: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
};

export function SubjectAssignmentsDialog({ open, onOpenChange, subject }: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", subject?.id],
    enabled: !!subject?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("subject_id", subject!.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Assignment[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const { error } = await supabase.from("assignments").insert({
        subject_id: subject!.id,
        title: title.trim(),
        details: details.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("เพิ่มงานเรียบร้อย");
      setTitle(""); setDetails(""); setDueDate("");
      qc.invalidateQueries({ queryKey: ["assignments", subject?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบแล้ว");
      qc.invalidateQueries({ queryKey: ["assignments", subject?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ไม่กำหนด";

  const isOverdue = (s: string | null) => s && new Date(s) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto "
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm text-muted-foreground">{subject?.code}</span>
            <span>{subject?.name}</span>
          </DialogTitle>
          <DialogDescription>งานที่ได้รับมอบหมายของวิชานี้</DialogDescription>
        </DialogHeader>

        {/* Add form */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4 text-primary" /> เพิ่มงานใหม่
          </div>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">หัวข้องาน *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น รายงานบทที่ 3" />
            </div>
            <div>
              <Label className="text-xs">รายละเอียด</Label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="รายละเอียดของงาน..." />
            </div>
            <div>
              <Label className="text-xs">กำหนดส่ง</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <Button
              onClick={() => addMut.mutate()}
              disabled={!title.trim() || addMut.isPending}
              className="bg-primary"
            >
              {addMut.isPending ? "กำลังเพิ่ม..." : "เพิ่มงาน"}
            </Button>
            {!userId && <p className="text-xs text-muted-foreground">* ต้องเข้าสู่ระบบเพื่อเพิ่มงาน</p>}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> รายการงาน ({assignments.length})
          </h3>
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-6">กำลังโหลด...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6 rounded-lg border border-dashed border-border">
              ยังไม่มีงาน
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{a.title}</span>
                    {a.due_date && (
                      <Badge variant={isOverdue(a.due_date) ? "destructive" : "secondary"} className="text-[10px]">
                        {isOverdue(a.due_date) ? "เลยกำหนด" : "กำหนดส่ง"} - {fmt(a.due_date)}
                      </Badge>
                    )}
                  </div>
                  {a.details && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.details}</p>}
                </div>
                {userId === a.created_by && (
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(a.id)} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
