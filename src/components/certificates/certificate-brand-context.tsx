"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  resolveCertificateBrand,
  type CertificateSchoolBrand,
  type LiveSchoolLetterhead,
} from "@/lib/certificates/school-brand";
import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";

const CertificateBrandContext = createContext<CertificateSchoolBrand>(CERTIFICATE_SCHOOL);

export function CertificateBrandProvider({
  packId,
  letterhead,
  children,
}: {
  packId?: string | null;
  letterhead?: LiveSchoolLetterhead | null;
  children: ReactNode;
}) {
  const brand = useMemo(
    () => resolveCertificateBrand(packId, letterhead),
    [packId, letterhead],
  );
  return (
    <CertificateBrandContext.Provider value={brand}>{children}</CertificateBrandContext.Provider>
  );
}

export function useCertificateBrand(): CertificateSchoolBrand {
  return useContext(CertificateBrandContext);
}
