export function hasContractData(sub: {
  contractNumber?: string | null;
  contractValue?: unknown;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  contractDocumentPath?: string | null;
  contractNotes?: string | null;
} | null | undefined): boolean {
  if (!sub) return false;
  return Boolean(
    sub.contractNumber ||
      sub.contractValue != null ||
      sub.contractStartDate ||
      sub.contractEndDate ||
      sub.contractDocumentPath ||
      sub.contractNotes,
  );
}
