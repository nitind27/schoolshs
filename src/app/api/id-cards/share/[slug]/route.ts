import { NextRequest, NextResponse } from "next/server";
import { parseIdCardShareToken, ID_CARD_SHARE_COOKIE } from "@/lib/id-card-share-token";
import { getSchoolSettingsForShare, getShareLinkBySlug, isShareLinkValid } from "@/lib/id-card-share";

async function requireShareAccess(request: NextRequest, slug: string) {
  const token = request.cookies.get(ID_CARD_SHARE_COOKIE)?.value;
  if (!token) return null;

  const session = await parseIdCardShareToken(token);
  if (!session || session.slug !== slug) return null;

  const link = await getShareLinkBySlug(slug);
  if (!link || !isShareLinkValid(link)) return null;
  if (session.linkId !== link.id || session.schoolId !== link.schoolId) return null;

  return { session, link };
}

/** Public meta for login screen (no sensitive data) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const link = await getShareLinkBySlug(slug);

    if (!link || !isShareLinkValid(link)) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }

    const settings = await getSchoolSettingsForShare(link.schoolId);
    const access = await requireShareAccess(request, slug);

    return NextResponse.json({
      slug: link.slug,
      label: link.label,
      schoolName: settings.schoolName,
      academicYear: link.academicYear,
      filter: {
        classId: link.classId,
        standard: link.standard,
        section: link.section,
      },
      authenticated: !!access,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
