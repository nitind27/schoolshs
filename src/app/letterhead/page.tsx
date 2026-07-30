"use client";

export default function LetterheadPage() {
  return (
    <div className="letterhead-page-shell fixed inset-x-0 bottom-0 top-14 z-30 min-h-0 bg-[#e6ebf2] lg:left-[var(--shell-sidebar-w)]">
      <iframe
        title="Letterhead Editor"
        src="/shs/index.html?embed=1"
        className="block h-full w-full border-0 bg-[#e6ebf2]"
      />
    </div>
  );
}
