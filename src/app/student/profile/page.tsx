"use client";

import { useState } from "react";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentSection,
  StudentField,
  StudentDigitalIdModal,
} from "@/components/student-portal/student-portal-ui";
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  IdCard,
  Building2,
  Calendar,
  Phone,
  Mail,
  IndianRupee,
  Fingerprint,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu, studentFullNameEn } from "@/lib/student-names";

export default function StudentProfilePage() {
  const t = useT();
  const { student, loading, error } = useStudentData();
  const [showIdModal, setShowIdModal] = useState(false);

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const fullNameEn = studentFullNameEn(student);
  const fullNameGu = studentFullNameGu(student);
  const initials = (student.firstName?.[0] || "S") + (student.surname?.[0] || "T");

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <StudentPageHeader
        icon={User}
        title={t("studentNav.myProfile")}
        subtitle={t("studentPortal.profileSubtitle") || "Official Student Profile & Academic Record"}
        backHref="/student"
        backLabel="Back to Dashboard"
        action={
          <button
            type="button"
            onClick={() => setShowIdModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f4d78a] to-[#e0b44a] px-4 py-2.5 text-xs font-bold text-[#3a2a08] shadow-sm transition hover:brightness-105 active:scale-95 sm:text-sm"
          >
            <IdCard className="h-4 w-4" />
            <span>Digital ID Card</span>
          </button>
        }
      />

      <section className="student-subhero">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="student-hero-avatar-ring !h-20 !w-20 text-2xl">
              {student.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoPath as string}
                  alt={fullNameEn}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="student-subhero-kicker">Student Profile</span>
                {student.admissionStatus && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                    {student.admissionStatus === "verified" ? "Verified" : student.admissionStatus}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">{fullNameEn}</h2>
              {fullNameGu && fullNameGu !== fullNameEn && (
                <p className="text-xs font-semibold text-teal-100/90 sm:text-sm">{fullNameGu}</p>
              )}
              <p className="mt-1 text-xs text-teal-100/80">
                Class {student.standard || "—"}-{student.section || "—"} • Roll: {student.rollNumber || "—"} • GR: {student.grNumber || "—"}
              </p>
            </div>
          </div>

          <div className="student-hero-aside !gap-2 sm:max-w-[220px]">
            <div className="student-hero-chip">
              <span>{t("studentPortal.category")}</span>
              <strong>{String(student.category || "General")}</strong>
            </div>
            <div className="student-hero-chip">
              <span>{t("studentPortal.bloodGroup")}</span>
              <strong>{(student.bloodGroup as string) || "—"}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Personal Information */}
      <StudentSection
        title={t("studentPortal.personalInfo")}
        description={t("studentPortal.personalInfoDesc") || "Official identity details registered with school board"}
        icon={User}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentField
            label="Full Name (English)"
            value={fullNameEn}
            copyable
          />
          <StudentField
            label="Full Name (Gujarati / માતૃભાષા)"
            value={fullNameGu || "—"}
            copyable
          />
          <StudentField
            label={t("studentPortal.aadhaarName")}
            value={student.aadhaarName as string}
          />
          <StudentField
            label={t("studentPortal.dob")}
            value={student.dateOfBirth as string}
            icon={Calendar}
          />
          <StudentField label={t("studentPortal.gender")} value={student.gender as string} />
          <StudentField
            label={t("studentPortal.bloodGroup")}
            value={student.bloodGroup as string}
          />
          <StudentField
            label={t("studentPortal.aadhaar")}
            value={student.aadhaarNumber as string}
            copyable
            icon={Fingerprint}
          />
          <StudentField
            label={t("studentPortal.mobile")}
            value={student.mobileNumber as string}
            copyable
            icon={Phone}
          />
          <StudentField label={t("studentPortal.category")} value={student.category as string} />
          <StudentField label="Caste / Sub-caste" value={student.caste as string} />
          <StudentField label="Religion" value={student.religion as string} />
          <StudentField label="Ration Card Number" value={student.rationCardNumber as string} copyable />
        </div>
      </StudentSection>

      {/* 2. Academic & Enrollment Details */}
      <StudentSection
        title={t("studentPortal.academicInfo")}
        description={t("studentPortal.academicInfoDesc") || "Current class enrollment and institutional records"}
        icon={GraduationCap}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentField
            label={t("studentPortal.class")}
            value={`${student.standard || "—"} - ${student.section || "—"}`}
          />
          <StudentField
            label={t("studentPortal.rollNumber")}
            value={student.rollNumber as string}
            copyable
          />
          <StudentField
            label={t("studentPortal.grNumber")}
            value={student.grNumber as string}
            copyable
          />
          <StudentField
            label="Child UID / Student ID"
            value={student.childUid as string}
            copyable
          />
          <StudentField
            label="APAAR ID (One Nation One Student ID)"
            value={student.apaarId as string}
            copyable
          />
          <StudentField
            label={t("fields.financialYear")}
            value={student.financialYear as string}
          />
          <StudentField
            label={t("fields.course")}
            value={String(student.courseName || "General Curriculum")}
          />
          <StudentField
            label={t("studentPortal.institution")}
            value={student.school?.name || (student.institutionName as string)}
            fullWidth
            icon={Building2}
          />
        </div>
      </StudentSection>

      {/* 3. Parents & Guardians Information */}
      <StudentSection
        title="Parents & Guardians Details"
        description="Parental bio-data and family income records"
        icon={Users}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentField
            label={t("studentPortal.father")}
            value={student.fatherName as string}
          />
          <StudentField
            label="Father Name (Gujarati)"
            value={student.fatherNameGu as string}
          />
          <StudentField
            label={t("studentPortal.mother")}
            value={student.motherName as string}
          />
          <StudentField
            label="Mother Name (Gujarati)"
            value={student.motherNameGu as string}
          />
          <StudentField
            label="Father Aadhaar Number"
            value={student.fatherAadhaarNumber as string}
            copyable
          />
          <StudentField
            label="Mother Aadhaar Number"
            value={student.motherAadhaarNumber as string}
            copyable
          />
          <StudentField
            label="Parent / Guardian Occupation"
            value={student.parentOccupation as string}
          />
          <StudentField
            label="Annual Family Income"
            value={
              <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                {Number(student.annualFamilyIncome || 0).toLocaleString("en-IN")}
              </span>
            }
          />
        </div>
      </StudentSection>

      {/* 4. Contact & Address */}
      <StudentSection
        title={t("studentPortal.contactAddress") || "Contact & Residential Address"}
        description="Permanent communication address and emergency contacts"
        icon={MapPin}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentField
            label={t("studentPortal.email")}
            value={student.email as string}
            icon={Mail}
            copyable
          />
          <StudentField
            label={t("studentPortal.mobile")}
            value={student.mobileNumber as string}
            icon={Phone}
            copyable
          />
          <StudentField
            label={t("studentPortal.address")}
            value={student.currentAddress as string}
            fullWidth
            icon={MapPin}
          />
          <StudentField
            label={t("studentPortal.cityDistrict")}
            value={
              `${student.currentCity || ""}, ${student.currentDistrict || ""}`.replace(/^, |, $/g, "") || "—"
            }
          />
          <StudentField
            label="Verification Note"
            value="Address verified as per school admission form & Aadhaar card"
          />
        </div>
      </StudentSection>

      {/* Digital ID Card Modal */}
      <StudentDigitalIdModal
        student={student}
        isOpen={showIdModal}
        onClose={() => setShowIdModal(false)}
      />
    </div>
  );
}
