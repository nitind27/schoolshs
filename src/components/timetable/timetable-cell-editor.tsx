"use client";

import { useEffect, useState } from "react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";
import { SCHOOL_SUBJECTS } from "@/lib/timetable";
import { Trash2, Save } from "lucide-react";

type StaffOption = { id: string; firstName: string; lastName: string; designation: string };

export function TimetableCellEditor({
  open,
  onClose,
  dayLabel,
  periodLabel,
  timeLabel,
  initialSubject,
  initialTeacherId,
  initialRoom,
  staff,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  dayLabel: string;
  periodLabel: string;
  timeLabel: string;
  initialSubject: string;
  initialTeacherId: string;
  initialRoom: string;
  staff: StaffOption[];
  onSave: (data: { subject: string; teacherId: string; room: string }) => Promise<void>;
}) {
  const t = useT();
  const [subject, setSubject] = useState(initialSubject);
  const [teacherId, setTeacherId] = useState(initialTeacherId);
  const [room, setRoom] = useState(initialRoom);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setTeacherId(initialTeacherId);
      setRoom(initialRoom);
    }
  }, [open, initialSubject, initialTeacherId, initialRoom]);

  const handleSave = async (clear = false) => {
    setSaving(true);
    try {
      await onSave({
        subject: clear ? "" : subject,
        teacherId: clear ? "" : teacherId,
        room: clear ? "" : room,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <InfoModal
      isOpen={open}
      onClose={onClose}
      title={t("timetable.editSlot")}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{dayLabel}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {periodLabel} · {timeLabel}
          </p>
        </div>

        <div>
          <Select
            label={t("timetable.subject")}
            emptyLabel={t("timetable.selectSubject")}
            options={[...SCHOOL_SUBJECTS]}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <Select
            label={t("timetable.teacher")}
            emptyLabel={t("timetable.noTeacher")}
            options={staff.map((s) => ({
              value: s.id,
              label: `${s.firstName} ${s.lastName}${s.designation ? ` (${s.designation})` : ""}`,
            }))}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {t("timetable.room")}
          </label>
          <Input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={t("timetable.roomPlaceholder")}
            className="mt-1.5"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={saving}
            onClick={() => void handleSave(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t("timetable.clearSlot")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSave(false)} disabled={saving || !subject}>
              <Save className="h-4 w-4" />
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </InfoModal>
  );
}
