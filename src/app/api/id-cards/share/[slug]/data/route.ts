import { NextRequest, NextResponse } from "next/server";
import { parseIdCardShareToken, ID_CARD_SHARE_COOKIE } from "@/lib/id-card-share-token";
import {
  fetchStudentsForShareLink,
  getSchoolSettingsForShare,
  getShareLinkBySlug,
  isShareLinkValid,
  sharePhotoApiPath,
  shareLogoApiPath,
} from "@/lib/id-card-share";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const access = await requireShareAccess(request, slug);
    if (!access) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { link } = access;
    const [students, settings] = await Promise.all([
      fetchStudentsForShareLink(link),
      getSchoolSettingsForShare(link.schoolId),
    ]);

    const studentPayload = students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      middleName: s.middleName,
      surname: s.surname,
      fatherName: s.fatherName,
      mobileNumber: s.mobileNumber,
      dateOfBirth: s.dateOfBirth,
      grNumber: s.grNumber,
      rollNumber: s.rollNumber,
      standard: s.standard,
      section: s.section,
      currentAddress: s.currentAddress,
      currentCity: s.currentCity,
      currentDistrict: s.currentDistrict,
      schoolClass: s.schoolClass,
      hasPhoto: !!(s.idPhotoProcessedPath || s.photoPath),
      photoUrl: sharePhotoApiPath(slug, s.id),
    }));

    return NextResponse.json({
      students: studentPayload,
      settings: {
        schoolName: settings.schoolName,
        schoolAddress: settings.schoolAddress,
        schoolPhone: settings.schoolPhone,
        academicYear: settings.academicYear,
        tagline: settings.tagline,
        idCardPrimaryColor: settings.idCardPrimaryColor,
        idCardAccentColor: settings.idCardAccentColor,
        logoUrl: settings.logoPath ? shareLogoApiPath(slug) : null,
      },
      total: studentPayload.length,
      label: link.label,
    });
  } catch (error) {
    console.error("Share data error:", error);
    return NextResponse.json({ error: "Failed to load ID cards" }, { status: 500 });
  }
}
