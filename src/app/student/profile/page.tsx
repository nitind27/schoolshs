"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentSection,
  StudentField,
} from "@/components/student-portal/student-portal-ui";
import { User } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentProfilePage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <StudentPageHeader
        icon={User}
        title={t("studentNav.myProfile")}
        subtitle={t("studentPortal.profileSubtitle")}
      />

      <StudentSection title={t("studentPortal.personalInfo")} description={t("studentPortal.personalInfoDesc")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <StudentField
            label={t("studentPortal.fullName")}
            value={`${student.firstName} ${student.middleName || ""} ${student.surname}`.replace(/\s+/g, " ").trim()}
          />
          <StudentField label={t("studentPortal.aadhaarName")} value={student.aadhaarName as string} />
          <StudentField label={t("studentPortal.dob")} value={student.dateOfBirth as string} />
          <StudentField label={t("studentPortal.gender")} value={student.gender as string} />
          <StudentField label={t("studentPortal.aadhaar")} value={student.aadhaarNumber as string} />
          <StudentField label={t("studentPortal.mobile")} value={student.mobileNumber as string} />
          <StudentField label={t("studentPortal.father")} value={student.fatherName as string} />
          <StudentField label={t("studentPortal.mother")} value={student.motherName as string} />
          <StudentField label={t("studentPortal.bloodGroup")} value={student.bloodGroup as string} />
          <StudentField label={t("studentPortal.category")} value={student.category as string} />
        </div>
      </StudentSection>

      <StudentSection title={t("studentPortal.academicInfo")} description={t("studentPortal.academicInfoDesc")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <StudentField
            label={t("studentPortal.class")}
            value={`${student.standard || "—"}-${student.section || "—"}`}
          />
          <StudentField label={t("studentPortal.rollNumber")} value={student.rollNumber as string} />
          <StudentField label={t("studentPortal.grNumber")} value={student.grNumber as string} />
          <StudentField label={t("fields.course")} value={String(student.courseName || "")} />
          <StudentField label={t("fields.financialYear")} value={student.financialYear as string} />
          <StudentField
            label={t("studentPortal.institution")}
            value={student.institutionName as string}
            fullWidth
          />
        </div>
      </StudentSection>

      <StudentSection title={t("studentPortal.contactAddress")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <StudentField label={t("studentPortal.email")} value={student.email as string} />
          <StudentField label={t("studentPortal.mobile")} value={student.mobileNumber as string} />
          <StudentField label={t("studentPortal.address")} value={student.currentAddress as string} fullWidth />
          <StudentField
            label={t("studentPortal.cityDistrict")}
            value={`${student.currentCity || ""}, ${student.currentDistrict || ""}`.replace(/^, |, $/g, "") || "—"}
          />
        </div>
      </StudentSection>
    </div>
  );
}
