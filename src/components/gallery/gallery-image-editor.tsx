"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
  Sun,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import "./gallery-image-editor.css";

export type GalleryEditorItem = {
  id: string;
  name: string;
  src: string;
  imageId?: string;
};

export type GalleryEditorOutput = {
  id: string;
  name: string;
  blob: Blob;
  imageId?: string;
};

type CropRect = { x: number; y: number; w: number; h: number };
type AspectKey = "free" | "1:1" | "4:3" | "16:9" | "3:4" | "9:16";
type PresetKey = "original" | "vivid" | "warm" | "cool" | "bw" | "sepia";

type EditState = {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  straighten: number;
  brightness: number;
  contrast: number;
  saturate: number;
  preset: PresetKey;
  crop: CropRect;
  aspect: AspectKey;
};

const DEFAULT_EDIT: EditState = {
  rotate: 0,
  flipH: false,
  flipV: false,
  straighten: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  preset: "original",
  crop: { x: 0, y: 0, w: 1, h: 1 },
  aspect: "free",
};

const ASPECTS: { key: AspectKey; ratio: number | null }[] = [
  { key: "free", ratio: null },
  { key: "1:1", ratio: 1 },
  { key: "4:3", ratio: 4 / 3 },
  { key: "16:9", ratio: 16 / 9 },
  { key: "3:4", ratio: 3 / 4 },
  { key: "9:16", ratio: 9 / 16 },
];

const PRESETS: PresetKey[] = ["original", "vivid", "warm", "cool", "bw", "sepia"];

function cssFilter(edit: EditState) {
  const extra =
    edit.preset === "bw"
      ? " grayscale(1)"
      : edit.preset === "sepia"
        ? " sepia(0.85)"
        : edit.preset === "vivid"
          ? " saturate(1.35) contrast(1.08)"
          : edit.preset === "warm"
            ? " sepia(0.22) saturate(1.15)"
            : edit.preset === "cool"
              ? " hue-rotate(190deg) saturate(0.92)"
              : "";
  return `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturate}%)${extra}`;
}

function fitAspect(nw: number, nh: number, ratio: number): CropRect {
  const img = nw / nh;
  if (img > ratio) {
    const w = (ratio * nh) / nw;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = nw / ratio / nh;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

function clampCrop(c: CropRect): CropRect {
  const w = Math.min(1, Math.max(0.08, c.w));
  const h = Math.min(1, Math.max(0.08, c.h));
  const x = Math.min(1 - w, Math.max(0, c.x));
  const y = Math.min(1 - h, Math.max(0, c.y));
  return { x, y, w, h };
}

function isUnchanged(edit: EditState) {
  return (
    edit.rotate === 0 &&
    !edit.flipH &&
    !edit.flipV &&
    edit.straighten === 0 &&
    edit.brightness === 100 &&
    edit.contrast === 100 &&
    edit.saturate === 100 &&
    edit.preset === "original" &&
    edit.crop.x === 0 &&
    edit.crop.y === 0 &&
    edit.crop.w === 1 &&
    edit.crop.h === 1
  );
}

async function renderEditedBlob(img: HTMLImageElement, edit: EditState): Promise<Blob> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cx = Math.round(edit.crop.x * w);
  const cy = Math.round(edit.crop.y * h);
  const cw = Math.max(1, Math.round(edit.crop.w * w));
  const ch = Math.max(1, Math.round(edit.crop.h * h));

  const rad = ((edit.rotate + edit.straighten) * Math.PI) / 180;
  let bbW = Math.abs(cw * Math.cos(rad)) + Math.abs(ch * Math.sin(rad));
  let bbH = Math.abs(cw * Math.sin(rad)) + Math.abs(ch * Math.cos(rad));
  const scale = Math.min(1, 1920 / Math.max(bbW, bbH, 1));
  bbW = Math.max(1, Math.round(bbW * scale));
  bbH = Math.max(1, Math.round(bbH * scale));
  const dw = cw * scale;
  const dh = ch * scale;

  const out = document.createElement("canvas");
  out.width = bbW;
  out.height = bbH;
  const ctx = out.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, bbW, bbH);
  ctx.filter = cssFilter(edit);
  ctx.translate(bbW / 2, bbH / 2);
  ctx.rotate(rad);
  ctx.scale(edit.flipH ? -1 : 1, edit.flipV ? -1 : 1);
  ctx.drawImage(img, cx, cy, cw, ch, -dw / 2, -dh / 2, dw, dh);

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/jpeg", 0.82);
  });
}

async function loadImageEl(src: string, fallback?: HTMLImageElement | null) {
  if (fallback?.complete && fallback.naturalWidth && fallback.src === src) return fallback;
  const img = new Image();
  if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
  if (img.decode) await img.decode().catch(() => undefined);
  return img;
}

type DragKind = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export function GalleryImageEditor({
  items,
  onClose,
  onComplete,
}: {
  items: GalleryEditorItem[];
  onClose: () => void;
  onComplete: (out: GalleryEditorOutput[]) => void | Promise<void>;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [reviewed, setReviewed] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const savingRef = useRef(false);
  const [cropping, setCropping] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: DragKind;
    startX: number;
    startY: number;
    crop: CropRect;
  } | null>(null);

  const item = items[index];
  const edit = edits[item?.id] || DEFAULT_EDIT;

  const setEdit = useCallback(
    (patch: Partial<EditState> | ((prev: EditState) => EditState)) => {
      if (!item) return;
      setEdits((prev) => {
        const cur = prev[item.id] || DEFAULT_EDIT;
        const next = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
        return { ...prev, [item.id]: next };
      });
    },
    [item],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const previewStyle = useMemo(
    () => ({
      transform: `rotate(${edit.rotate + edit.straighten}deg) scaleX(${edit.flipH ? -1 : 1}) scaleY(${edit.flipV ? -1 : 1})`,
    }),
    [edit.rotate, edit.straighten, edit.flipH, edit.flipV],
  );

  const applyAspect = (key: AspectKey) => {
    const img = imgRef.current;
    const spec = ASPECTS.find((a) => a.key === key);
    if (!spec || !img?.naturalWidth) {
      setEdit({ aspect: key });
      return;
    }
    if (spec.ratio == null) {
      setEdit({ aspect: "free", crop: { x: 0, y: 0, w: 1, h: 1 } });
      return;
    }
    const swap = edit.rotate === 90 || edit.rotate === 270;
    const nw = swap ? img.naturalHeight : img.naturalWidth;
    const nh = swap ? img.naturalWidth : img.naturalHeight;
    setEdit({ aspect: key, crop: fitAspect(nw, nh, spec.ratio) });
  };

  const onPointerDown = (kind: DragKind) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { kind, startX: e.clientX, startY: e.clientY, crop: edit.crop };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!drag || !stage || !img) return;
    const box = img.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return;
    const dx = (e.clientX - drag.startX) / box.width;
    const dy = (e.clientY - drag.startY) / box.height;
    let { x, y, w, h } = drag.crop;
    const ratioSpec = ASPECTS.find((a) => a.key === edit.aspect)?.ratio;

    if (drag.kind === "move") {
      x += dx;
      y += dy;
    } else {
      if (drag.kind.includes("w")) {
        const nx = x + dx;
        w = w - dx;
        x = nx;
      }
      if (drag.kind.includes("e")) w += dx;
      if (drag.kind.includes("n")) {
        const ny = y + dy;
        h = h - dy;
        y = ny;
      }
      if (drag.kind.includes("s")) h += dy;
      if (ratioSpec) {
        const swap = edit.rotate === 90 || edit.rotate === 270;
        const nw = swap ? img.naturalHeight : img.naturalWidth;
        const nh = swap ? img.naturalWidth : img.naturalHeight;
        const pixelRatio = (w * nw) / Math.max(0.001, h * nh);
        if (pixelRatio > ratioSpec) w = (h * nh * ratioSpec) / nw;
        else h = (w * nw) / ratioSpec / nh;
      }
    }
    setEdit({ crop: clampCrop({ x, y, w, h }) });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const markReviewed = (id: string) => {
    setReviewed((p) => (p[id] ? p : { ...p, [id]: true }));
  };

  const goPrevious = () => {
    if (!item || index <= 0) return;
    markReviewed(item.id);
    setIndex(index - 1);
  };

  const applyAndNext = () => {
    if (!item) return;
    markReviewed(item.id);
    if (index < items.length - 1) setIndex(index + 1);
  };

  const finish = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    setSaveErr("");
    try {
      const outputs: GalleryEditorOutput[] = await Promise.all(
        items.map(async (it, i) => {
          const nextEdit = edits[it.id] || DEFAULT_EDIT;
          let blob: Blob;
          if (isUnchanged(nextEdit)) {
            const res = await fetch(it.src);
            if (!res.ok) throw new Error("load");
            blob = await res.blob();
          } else {
            const img = await loadImageEl(it.src, i === index ? imgRef.current : null);
            blob = await renderEditedBlob(img, nextEdit);
          }
          return {
            id: it.id,
            name: it.name.replace(/\.[^.]+$/, "") + ".jpg",
            blob,
            imageId: it.imageId,
          };
        }),
      );
      await onComplete(outputs);
    } catch {
      setSaveErr(t("gallery.uploadFailed"));
      savingRef.current = false;
      setBusy(false);
    }
  };

  if (!item) return null;
  const crop = edit.crop;

  return (
    <div className="gie-root" role="dialog" aria-modal="true" aria-label={t("gallery.editorTitle")}>
      <header className="gie-top">
        <div>
          <p className="gie-kicker">{t("gallery.editorTitle")}</p>
          <h2>
            {item.name}{" "}
            <span>
              {index + 1}/{items.length}
            </span>
          </h2>
        </div>
        <button
          type="button"
          className="gie-icon-btn"
          onClick={onClose}
          disabled={busy}
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="gie-body">
        <aside className="gie-thumbs" aria-label={t("gallery.editorQueue")}>
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className={`gie-thumb${i === index ? " is-on" : ""}${reviewed[it.id] ? " is-done" : ""}`}
              onClick={() => setIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt="" />
              {reviewed[it.id] ? <Check className="gie-thumb__ok" /> : null}
            </button>
          ))}
        </aside>

        <div className="gie-stage-wrap">
          <div
            ref={stageRef}
            className="gie-stage"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="gie-frame" style={previewStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={item.src}
                alt=""
                className="gie-photo"
                style={{ filter: cssFilter(edit) }}
                draggable={false}
              />
              {cropping ? (
                <div
                  className="gie-crop"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                  }}
                  onPointerDown={onPointerDown("move")}
                >
                  <span className="gie-handle nw" onPointerDown={onPointerDown("nw")} />
                  <span className="gie-handle ne" onPointerDown={onPointerDown("ne")} />
                  <span className="gie-handle sw" onPointerDown={onPointerDown("sw")} />
                  <span className="gie-handle se" onPointerDown={onPointerDown("se")} />
                  <span className="gie-handle n" onPointerDown={onPointerDown("n")} />
                  <span className="gie-handle s" onPointerDown={onPointerDown("s")} />
                  <span className="gie-handle e" onPointerDown={onPointerDown("e")} />
                  <span className="gie-handle w" onPointerDown={onPointerDown("w")} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="gie-tools">
          <section className="gie-card">
            <p className="gie-label">
              <Crop className="h-3.5 w-3.5" /> {t("gallery.editorCrop")}
            </p>
            <div className="gie-chips">
              {ASPECTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={edit.aspect === a.key ? "is-on" : ""}
                  onClick={() => applyAspect(a.key)}
                >
                  {a.key === "free" ? t("gallery.editorFree") : a.key}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`gie-toggle${cropping ? " is-on" : ""}`}
              onClick={() => setCropping((v) => !v)}
            >
              <Crop className="h-4 w-4" />
              {cropping ? t("gallery.editorCropOn") : t("gallery.editorCropOff")}
            </button>
          </section>

          <section className="gie-card">
            <p className="gie-label">{t("gallery.editorTransform")}</p>
            <div className="gie-row">
              <button type="button" title={t("gallery.editorRotateLeft")} onClick={() => setEdit({ rotate: ((edit.rotate + 270) % 360) as EditState["rotate"], crop: { x: 0, y: 0, w: 1, h: 1 } })}>
                <RotateCcw className="h-4 w-4" />
                <span>90°</span>
              </button>
              <button type="button" title={t("gallery.editorRotateRight")} onClick={() => setEdit({ rotate: ((edit.rotate + 90) % 360) as EditState["rotate"], crop: { x: 0, y: 0, w: 1, h: 1 } })}>
                <RotateCw className="h-4 w-4" />
                <span>90°</span>
              </button>
              <button type="button" className={edit.flipH ? "is-on" : ""} title={t("gallery.editorFlipH")} onClick={() => setEdit({ flipH: !edit.flipH })}>
                <FlipHorizontal className="h-4 w-4" />
              </button>
              <button type="button" className={edit.flipV ? "is-on" : ""} title={t("gallery.editorFlipV")} onClick={() => setEdit({ flipV: !edit.flipV })}>
                <FlipVertical className="h-4 w-4" />
              </button>
            </div>
            <label className="gie-range">
              <span>{t("gallery.editorStraighten")}</span>
              <input
                type="range"
                min={-15}
                max={15}
                value={edit.straighten}
                onChange={(e) => setEdit({ straighten: Number(e.target.value) })}
              />
            </label>
          </section>

          <section className="gie-card">
            <p className="gie-label">
              <Sun className="h-3.5 w-3.5" /> {t("gallery.editorAdjust")}
            </p>
            <label className="gie-range">
              <span>{t("gallery.editorBrightness")}</span>
              <input
                type="range"
                min={50}
                max={150}
                value={edit.brightness}
                onChange={(e) => setEdit({ brightness: Number(e.target.value) })}
              />
            </label>
            <label className="gie-range">
              <span>{t("gallery.editorContrast")}</span>
              <input
                type="range"
                min={50}
                max={150}
                value={edit.contrast}
                onChange={(e) => setEdit({ contrast: Number(e.target.value) })}
              />
            </label>
            <label className="gie-range">
              <span>{t("gallery.editorSaturate")}</span>
              <input
                type="range"
                min={0}
                max={200}
                value={edit.saturate}
                onChange={(e) => setEdit({ saturate: Number(e.target.value) })}
              />
            </label>
          </section>

          <section className="gie-card">
            <p className="gie-label">
              <Sparkles className="h-3.5 w-3.5" /> {t("gallery.editorFilters")}
            </p>
            <div className="gie-chips">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={edit.preset === p ? "is-on" : ""}
                  onClick={() => setEdit({ preset: p })}
                >
                  {t(`gallery.filter_${p}`)}
                </button>
              ))}
            </div>
          </section>

          <button type="button" className="gie-reset" onClick={() => setEdit({ ...DEFAULT_EDIT })}>
            {t("gallery.editorReset")}
          </button>
        </aside>
      </div>

      {saveErr ? <p className="gie-save-err">{saveErr}</p> : null}

      {busy ? (
        <div className="gie-saving" role="status" aria-live="polite">
          <Spinner size="lg" />
          <p>{t("gallery.uploading")}</p>
        </div>
      ) : null}

      <footer className="gie-foot">
        <p className="gie-remain">{t("gallery.editorUnsavedHint")}</p>
        <div className="gie-foot__btns">
          <Button className="gie-btn-cancel" variant="outline" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {items.length > 1 ? (
            <>
              <Button
                className="gie-btn-prev"
                variant="outline"
                disabled={busy || index <= 0}
                onClick={goPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("gallery.editorPrevious")}
              </Button>
              <Button
                className="gie-btn-next"
                variant="outline"
                disabled={busy || index >= items.length - 1}
                onClick={applyAndNext}
              >
                {t("gallery.editorApplyNext")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          <Button className="gie-btn-save" loading={busy} disabled={busy} onClick={() => void finish()}>
            {busy ? t("gallery.uploading") : t("gallery.editorSave")}
          </Button>
        </div>
      </footer>
    </div>
  );
}
