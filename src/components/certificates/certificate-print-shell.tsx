"use client";

import { Eye, Printer, X, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { useRouter } from "next/navigation";

export function CertificatePrintShell({
  children,
  landscape = false,
  title,
  isPreview = false,
  onPreview,
  onExitPreview,
  canPrint = true,
  hidePrint = false,
  printMargin,
}: {
  children: React.ReactNode;
  landscape?: boolean;
  title: string;
  isPreview?: boolean;
  onPreview?: () => void;
  onExitPreview?: () => void;
  canPrint?: boolean;
  /** Hide the header Print button when page has its own */
  hidePrint?: boolean;
  /** @page margin — default 8mm portrait / 4mm landscape */
  printMargin?: string;
}) {
  const t = useT();
  const router = useRouter();
  const pageMargin = printMargin ?? (landscape ? "4mm" : "8mm");

  return (
    <div className="certificates-module space-y-5">

      {/* ── Top bar ────────────────────────────────── */}
      <div className="no-print page-hero p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="border-l-4 border-blue-500 pl-3">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPreview ? "Template preview — sample data" : "Load student data and print"}
              </p>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isPreview && onExitPreview && (
              <Button variant="outline" size="sm" onClick={onExitPreview}>
                <X className="h-3.5 w-3.5" />
                {t("certificates.exitPreview")}
              </Button>
            )}
            {onPreview && !isPreview && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-3.5 w-3.5" />
                {t("certificates.preview")}
              </Button>
            )}
            {!hidePrint && (
              <Button
                size="sm"
                onClick={() => window.print()}
                disabled={!canPrint}
                className="gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                {t("certificates.print")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview banner ─────────────────────────── */}
      {isPreview && (
        <div className="no-print flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">{t("certificates.previewBanner")}</p>
            <p className="text-xs text-blue-600 mt-0.5">Sample data shown — load a student to fill real data</p>
          </div>
          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="shrink-0 text-xs font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              Exit Preview
            </button>
          )}
        </div>
      )}

      {/* ── Can print indicator ────────────────────── */}
      {canPrint && !isPreview && (
        <div className="no-print flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          Student data loaded — ready to print
        </div>
      )}

      {/* ── Certificate content ─────────────────────── */}
      <div
        className={`print-area ${landscape ? "print-landscape" : "print-portrait"} ${isPreview ? "cert-preview-frame" : ""}`}
      >
        {children}
      </div>

      {/* ── Global print + cert styles ────────────── */}
      <style jsx global>{`
        /* ─ Print ─ */
        @media print {
          /* Beat dashboard.css body * { visibility: hidden !important } */
          .print-area,
          .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            background: #fff !important;
            z-index: 99999 !important;
            overflow: visible !important;
          }
          .print-area:has(.ora-print-wrap) {
            width: 200mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print { display: none !important; visibility: hidden !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-\\[260px\\] { padding-left: 0 !important; }
          .cert-preview-frame {
            box-shadow: none !important;
            background: #fff !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .cert-preview-frame .cert-page,
          .cert-preview-frame .bonafide-cert-sheet,
          .cert-preview-frame .cr-root {
            box-shadow: none !important;
            border: none !important;
          }
        }
        @page {
          size: ${landscape ? "A4 landscape" : "A4 portrait"};
          margin: ${pageMargin};
        }
        @media print {
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }

        /* ─ Preview frame ─ */
        .cert-preview-frame {
          background: #e8ecf0;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          overflow-x: auto;
          overflow-y: visible;
        }
        .cert-preview-frame .bonafide-cert-sheet {
          max-width: 212mm;
        }
        .cert-preview-frame .cert-page {
          margin: 0 auto;
          max-width: ${landscape ? "297mm" : "210mm"};
          box-shadow: 0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1);
          border-radius: 2px;
        }

        /* ─ Base cert styles ─ */
        .cert-page {
          font-family: "Times New Roman", Times, Georgia, serif;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        }
        .cert-border-double {
          border: 2px double #000;
          padding: 14px 18px;
        }
        .cert-dots {
          border-bottom: 1px dotted #333;
          display: inline-block;
          min-width: 120px;
          padding: 0 4px 2px;
          font-weight: 600;
        }
        .cert-title {
          text-align: center;
          font-weight: bold;
          text-decoration: underline;
          letter-spacing: 0.05em;
        }
        .cert-school-name {
          text-align: center;
          font-weight: bold;
          font-size: 1.35rem;
          text-transform: uppercase;
        }
        .cert-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .cert-table th, .cert-table td {
          border: 1px solid #000;
          padding: 3px 5px;
          vertical-align: top;
        }
        .cert-table th {
          font-weight: 600;
          text-align: center;
          background: #f8f8f8;
          print-color-adjust: exact;
        }
        .cert-reports-table th, .cert-reports-table td {
          border-color: #1a5c6e !important;
          color: #1a5c6e;
        }
        .print-landscape-wide { width: 100%; }
        @media print {
          .print-landscape-wide {
            transform: none;
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  );
}
