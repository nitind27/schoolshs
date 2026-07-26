/** Soft navigation fallback — never blank the whole app (feels like a hard reload). */
export default function Loading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden"
      aria-hidden
    >
      <div
        className="h-full w-1/3 animate-pulse rounded-full"
        style={{
          background: "linear-gradient(90deg, #0d7377, #0c1929 55%, #c45c26)",
        }}
      />
    </div>
  );
}
