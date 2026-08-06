import { redirect } from "next/navigation";

/** Teacher nav entry — calendar UI lives at /staff/holidays (read-only for teachers). */
export default function TeacherHolidaysRedirect() {
  redirect("/staff/holidays");
}
