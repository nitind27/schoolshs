import { StudentEditPortal } from "@/components/students/student-edit-portal";

export default async function StudentEditByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <StudentEditPortal initialCode={code} />;
}
