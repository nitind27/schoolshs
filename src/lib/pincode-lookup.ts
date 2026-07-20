import { GUJARAT_DISTRICTS } from "@/lib/constants";

export type PincodeOffice = {
  name: string;
  branchType: string;
  district: string;
  taluka: string;
  state: string;
  pincode: string;
};

export type PincodeLookupResult = {
  pincode: string;
  state: string;
  district: string;
  taluka: string;
  city: string;
  address: string;
  offices: PincodeOffice[];
};

type RawPostOffice = {
  Name?: string;
  BranchType?: string;
  District?: string;
  Block?: string;
  Division?: string;
  State?: string;
  Pincode?: string;
};

type RawPincodeResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: RawPostOffice[] | null;
};

function normalizeDistrict(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  const exact = GUJARAT_DISTRICTS.find((d) => d.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const fuzzy = GUJARAT_DISTRICTS.find(
    (d) =>
      d.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(d.toLowerCase()),
  );
  return fuzzy || trimmed;
}

function pickTaluka(office: RawPostOffice): string {
  return (office.Block || office.Division || "").trim();
}

function officePriority(branchType: string): number {
  const bt = branchType.toLowerCase();
  if (bt.includes("head post")) return 0;
  if (bt.includes("sub post")) return 1;
  if (bt.includes("branch post")) return 2;
  return 3;
}

function sortOffices(offices: PincodeOffice[]): PincodeOffice[] {
  return [...offices].sort((a, b) => officePriority(a.branchType) - officePriority(b.branchType));
}

export function buildAddressFromOffice(office: PincodeOffice): string {
  const parts = [office.name, office.taluka, office.district, office.state, office.pincode].filter(
    Boolean,
  );
  return parts.join(", ");
}

export function officeToFill(office: PincodeOffice): Omit<PincodeLookupResult, "offices" | "pincode"> {
  return {
    state: office.state,
    district: office.district,
    taluka: office.taluka,
    city: office.name,
    address: buildAddressFromOffice(office),
  };
}

export async function lookupIndianPincode(pincode: string): Promise<PincodeLookupResult> {
  const code = String(pincode || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter a valid 6-digit pincode");
  }

  const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error("Pincode lookup service unavailable");
  }

  const json = (await res.json()) as RawPincodeResponse[];
  const payload = Array.isArray(json) ? json[0] : json;

  if (!payload || payload.Status !== "Success" || !payload.PostOffice?.length) {
    throw new Error("Pincode not found. Please check and try again.");
  }

  const offices: PincodeOffice[] = payload.PostOffice.map((po) => ({
    name: String(po.Name || "").trim(),
    branchType: String(po.BranchType || "").trim(),
    district: normalizeDistrict(String(po.District || "")),
    taluka: pickTaluka(po),
    state: String(po.State || "").trim(),
    pincode: String(po.Pincode || code).trim(),
  })).filter((o) => o.name);

  if (!offices.length) {
    throw new Error("No location data found for this pincode");
  }

  const sorted = sortOffices(offices);
  const primary = sorted[0]!;
  const fill = officeToFill(primary);

  return {
    pincode: code,
    offices: sorted,
    ...fill,
  };
}
