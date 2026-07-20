"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GUJARAT_DISTRICTS } from "@/lib/constants";
import type { PincodeOffice } from "@/lib/pincode-lookup";
import { Loader2, MapPin } from "lucide-react";

export type SchoolLocationValues = {
  pincode: string;
  district: string;
  taluka: string;
  city: string;
  address: string;
};

type Props = {
  values: SchoolLocationValues;
  onChange: (patch: Partial<SchoolLocationValues>) => void;
};

export function SchoolLocationFields({ values, onChange }: Props) {
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [offices, setOffices] = useState<PincodeOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState("");
  const [addressEdited, setAddressEdited] = useState(false);
  const lastLookup = useRef("");

  const applyOffice = (office: PincodeOffice, pincode: string) => {
    onChange({
      district: office.district,
      taluka: office.taluka,
      city: office.name,
      pincode,
      address: addressEdited
        ? values.address
        : [office.name, office.taluka, office.district, office.state, pincode]
            .filter(Boolean)
            .join(", "),
    });
  };

  const lookupPincode = async (raw: string) => {
    const pincode = raw.replace(/\D/g, "").slice(0, 6);
    if (pincode !== raw.replace(/\D/g, "")) {
      onChange({ pincode });
    }

    if (pincode.length !== 6) {
      setOffices([]);
      setSelectedOffice("");
      setPincodeError("");
      return;
    }

    if (pincode === lastLookup.current) return;
    lastLookup.current = pincode;

    setPincodeLoading(true);
    setPincodeError("");
    try {
      const res = await fetch(`/api/admin/pincode/${pincode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");

      const list = (data.offices || []) as PincodeOffice[];
      setOffices(list);
      setAddressEdited(false);
      const first = list[0];
      if (first) {
        setSelectedOffice(first.name);
        applyOffice(first, pincode);
      }
    } catch (err) {
      setOffices([]);
      setSelectedOffice("");
      setPincodeError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setPincodeLoading(false);
    }
  };

  const pincodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pincodeTimer.current) clearTimeout(pincodeTimer.current);
    const pincode = values.pincode.replace(/\D/g, "").slice(0, 6);
    if (pincode.length !== 6) return;

    pincodeTimer.current = setTimeout(() => {
      lookupPincode(pincode);
    }, 450);

    return () => {
      if (pincodeTimer.current) clearTimeout(pincodeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.pincode]);

  const onOfficePick = (name: string) => {
    setSelectedOffice(name);
    const office = offices.find((o) => o.name === name);
    if (office) applyOffice(office, values.pincode);
  };

  return (
    <>
      <div>
        <Input
          label="Pincode"
          value={values.pincode}
          onChange={(e) => {
            const pincode = e.target.value.replace(/\D/g, "").slice(0, 6);
            setAddressEdited(false);
            onChange({ pincode });
            if (pincode.length < 6) {
              lastLookup.current = "";
              setOffices([]);
              setPincodeError("");
            }
          }}
          placeholder="394365"
          inputMode="numeric"
          maxLength={6}
        />
        <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
          {pincodeLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-violet-600" />
              <span className="text-violet-600">Fetching taluka, district & address…</span>
            </>
          ) : pincodeError ? (
            <span className="text-red-600">{pincodeError}</span>
          ) : offices.length > 0 ? (
            <>
              <MapPin className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700">Location auto-filled from pincode</span>
            </>
          ) : (
            <span>Enter 6-digit pincode — district, taluka & address auto-fill</span>
          )}
        </p>
      </div>

      {offices.length > 1 && (
        <Select
          label="Post Office / Area"
          options={offices.map((o) => ({
            value: o.name,
            label: `${o.name} (${o.branchType || "Area"})`,
          }))}
          value={selectedOffice}
          onChange={(e) => onOfficePick(e.target.value)}
        />
      )}

      <Select
        label="District"
        options={["", ...GUJARAT_DISTRICTS]}
        value={values.district}
        onChange={(e) => onChange({ district: e.target.value })}
      />

      <Input
        label="Taluka / Area"
        value={values.taluka}
        onChange={(e) => onChange({ taluka: e.target.value })}
        placeholder="Auto from pincode"
      />

      <Input
        label="City / Village"
        value={values.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder="Auto from pincode"
      />

      <div className="md:col-span-2">
        <Input
          label="Full Address"
          value={values.address}
          onChange={(e) => {
            setAddressEdited(true);
            onChange({ address: e.target.value });
          }}
          placeholder="Street, landmark, area — pincode se base address aayega"
        />
      </div>
    </>
  );
}
