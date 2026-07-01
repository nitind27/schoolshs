"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Play } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";
import type { Student } from "@/generated/prisma/client";

function DetailRow({
  label,
  value,
  yesLabel,
  noLabel,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  yesLabel: string;
  noLabel: string;
}) {
  const display = value === null || value === undefined
    ? "-"
    : typeof value === "boolean"
      ? value ? yesLabel : noLabel
      : String(value);
  return (
    <div className="py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{display}</p>
    </div>
  );
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => r.json())
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-center text-slate-500 py-16">{t("students.notFound")}</p>;
  }

  const yes = t("common.yes");
  const no = t("common.no");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <button className="p-2 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {student.firstName} {student.middleName} {student.surname}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge status={student.status} />
              <CategoryBadge category={student.category} />
            </div>
          </div>
        </div>
          <Link href={`/students/${id}/auto-submit`}>
            <Button variant="success"><Play className="h-4 w-4" /> {t("students.directAutoFill")}</Button>
          </Link>
          <Link href={`/students/${id}/edit`}>
          <Button><Edit className="h-4 w-4" /> {t("common.edit")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t("students.personalDetails")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4">
            <DetailRow label={t("fields.aadhaarName")} value={student.aadhaarName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.aadhaarNumber")} value={student.aadhaarNumber} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.dateOfBirth")} value={student.dateOfBirth} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.gender")} value={student.gender} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.mobileNumber")} value={student.mobileNumber} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.email")} value={student.email} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.religion")} value={student.religion} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.maritalStatus")} value={student.maritalStatus} yesLabel={yes} noLabel={no} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("students.familyDetails")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4">
            <DetailRow label={t("fields.fatherName")} value={student.fatherName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.motherName")} value={student.motherName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.guardianName")} value={student.guardianName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("students.occupation")} value={student.parentOccupation} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("students.familyIncome")} value={`₹${student.annualFamilyIncome.toLocaleString("en-IN")}`} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.familySize")} value={student.familySize} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.isOrphan")} value={student.isOrphan} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.caste")} value={student.caste} yesLabel={yes} noLabel={no} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("students.academicDetails")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4">
            <DetailRow label={t("common.scholarship")} value={student.scholarshipScheme} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.financialYear")} value={student.financialYear} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.courseName")} value={student.courseName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.courseType")} value={student.courseType} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.institutionName")} value={student.institutionName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.currentYear")} value={student.currentYear} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.board10th")} value={student.board10th} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("students.percentage10th")} value={student.percentage10th} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.board12th")} value={student.board12th} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("students.percentage12th")} value={student.percentage12th} yesLabel={yes} noLabel={no} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("students.bankDetails")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4">
            <DetailRow label={t("fields.bankName")} value={student.bankName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.branchName")} value={student.branchName} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.accountNumber")} value={student.accountNumber} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.ifscCode")} value={student.ifscCode} yesLabel={yes} noLabel={no} />
            <DetailRow label={t("fields.accountHolderName")} value={student.accountHolderName} yesLabel={yes} noLabel={no} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{t("common.address")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">{t("students.currentAddressTitle")}</h4>
              <DetailRow label={t("common.address")} value={student.currentAddress} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("common.district")} value={student.currentDistrict} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("fields.currentCity")} value={student.currentCity} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("fields.currentPincode")} value={student.currentPincode} yesLabel={yes} noLabel={no} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">{t("students.permanentAddressTitle")}</h4>
              <DetailRow label={t("common.address")} value={student.permanentAddress} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("common.district")} value={student.permanentDistrict} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("fields.permanentCity")} value={student.permanentCity} yesLabel={yes} noLabel={no} />
              <DetailRow label={t("fields.permanentPincode")} value={student.permanentPincode} yesLabel={yes} noLabel={no} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
