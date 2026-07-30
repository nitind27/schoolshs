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
  Region?: string;
  State?: string;
  Pincode?: string;
};

type RawPincodeResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: RawPostOffice[] | null;
};

/**
 * India Post API still returns outdated parent districts for some areas
 * carved out later (e.g. Tapi from Surat in 2007).
 * Prefer Block/taluka + known pincodes over raw District.
 */
const PINCODE_DISTRICT_OVERRIDES: Record<string, string> = {
  // Songadh / Fort Songadh / Uchchhal area — Dist. Tapi
  "394670": "Tapi",
  "394651": "Tapi",
  "394650": "Tapi",
  "394655": "Tapi",
  "394640": "Tapi",
  "394641": "Tapi",
  "394635": "Tapi",
  "394630": "Tapi",
  "394633": "Tapi",
};

/** Taluka / Block names that belong to Tapi (API often still says Surat) */
const TAPI_BLOCKS = new Set([
  "songadh",
  "vyara",
  "uchchhal",
  "uchhal",
  "nizar",
  "valod",
  "dolvan",
]);

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

function correctGujaratDistrict(opts: {
  district: string;
  taluka: string;
  officeName: string;
  pincode: string;
}): string {
  const pin = opts.pincode.trim();
  if (PINCODE_DISTRICT_OVERRIDES[pin]) {
    return PINCODE_DISTRICT_OVERRIDES[pin]!;
  }

  const district = normalizeDistrict(opts.district);
  const block = opts.taluka.trim().toLowerCase();
  const name = opts.officeName.trim().toLowerCase();

  // Tapi was carved from Surat — postal DB often still lists District = Surat
  if (district.toLowerCase() === "surat") {
    if (
      TAPI_BLOCKS.has(block) ||
      name.includes("songadh") ||
      name.includes("vyara") ||
      name.includes("uchchhal") ||
      name.includes("nizar") ||
      name.includes("valod")
    ) {
      return "Tapi";
    }
  }

  return district;
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
  // Prefer taluka (Block) as city for school forms — more useful than PO name
  const city = office.taluka || office.name;
  return {
    state: office.state,
    district: office.district,
    taluka: office.taluka,
    city,
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

  const offices: PincodeOffice[] = payload.PostOffice.map((po) => {
    const name = String(po.Name || "").trim();
    const taluka = pickTaluka(po);
    const pincodeVal = String(po.Pincode || code).trim();
    const district = correctGujaratDistrict({
      district: String(po.District || ""),
      taluka,
      officeName: name,
      pincode: pincodeVal,
    });
    return {
      name,
      branchType: String(po.BranchType || "").trim(),
      district,
      taluka,
      state: String(po.State || "").trim(),
      pincode: pincodeVal,
    };
  }).filter((o) => o.name);

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
