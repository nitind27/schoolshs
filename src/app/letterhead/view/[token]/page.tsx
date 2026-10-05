import { notFound } from "next/navigation";

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

export default async function LetterheadViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN.test(token)) notFound();

  return (
    <iframe
      title="Letterhead"
      src={`/shs/index.html?view=1&v=20261005c&token=${encodeURIComponent(token)}`}
      className="fixed inset-0 z-[80] h-[100dvh] w-full border-0 bg-[#e6ebf2]"
    />
  );
}
