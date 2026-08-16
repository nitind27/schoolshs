"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n/locale-provider";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Images,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { GalleryImageEditor, type GalleryEditorItem, type GalleryEditorOutput } from "@/components/gallery/gallery-image-editor";
import "../gallery.css";

type GalleryImage = {
  id: string;
  url: string;
  originalName: string | null;
  uploadedByName: string | null;
  uploadedById: string | null;
  createdAt: string;
  canDelete: boolean;
};

type GalleryTitle = {
  id: string;
  title: string;
  images: GalleryImage[];
};

type GalleryEvent = {
  id: string;
  activityName: string;
  eventDate: string;
  canDelete: boolean;
  titles: GalleryTitle[];
};

function formatDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function GalleryEventPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<GalleryEvent | null>(null);
  const [dashHref, setDashHref] = useState("/dashboard");
  const [role, setRole] = useState<string>("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ activityName: "", eventDate: "" });
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingTitle, setAddingTitle] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ titleId: string; index: number } | null>(null);
  const [editor, setEditor] = useState<{
    titleId: string;
    items: GalleryEditorItem[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const r = d?.user?.role;
        setRole(r || "");
        if (r === "clerk") setDashHref("/clerk");
        else if (r === "teacher") setDashHref("/teacher");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setErr("");
    const res = await fetch(`/api/gallery/${eventId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEvent(null);
      setErr(data.error || t("gallery.notFound"));
    } else {
      setEvent(data.event);
      setForm({
        activityName: data.event.activityName,
        eventDate: data.event.eventDate,
      });
    }
    setLoading(false);
  }, [eventId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const flatPhotos = useMemo(() => {
    if (!event || !lightbox) return [];
    const title = event.titles.find((x) => x.id === lightbox.titleId);
    return title?.images || [];
  }, [event, lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") {
        setLightbox((cur) => {
          if (!cur) return cur;
          const n = flatPhotos.length;
          if (!n) return cur;
          return { ...cur, index: (cur.index - 1 + n) % n };
        });
      }
      if (e.key === "ArrowRight") {
        setLightbox((cur) => {
          if (!cur) return cur;
          const n = flatPhotos.length;
          if (!n) return cur;
          return { ...cur, index: (cur.index + 1) % n };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, flatPhotos.length]);

  const saveEvent = async () => {
    if (!form.activityName.trim() || !form.eventDate) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`/api/gallery/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || t("gallery.saveFailed"));
        return;
      }
      setEvent(data.event);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!event) return;
    const ok = await confirm({
      title: t("gallery.deleteActivity"),
      message: t("gallery.deleteActivityConfirm", { name: event.activityName }),
      confirmLabel: t("common.delete"),
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/gallery/${eventId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || t("gallery.deleteFailed"));
      return;
    }
    router.push("/gallery");
  };

  const addTitle = async () => {
    const title = newTitle.trim();
    if (!title) {
      setErr(t("gallery.titleRequired"));
      return;
    }
    setAddingTitle(true);
    setErr("");
    try {
      const res = await fetch(`/api/gallery/${eventId}/titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || t("gallery.saveFailed"));
        return;
      }
      setNewTitle("");
      await load();
    } finally {
      setAddingTitle(false);
    }
  };

  const saveRename = async (titleId: string) => {
    const title = renameVal.trim();
    if (!title) return;
    const res = await fetch(`/api/gallery/titles/${titleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || t("gallery.saveFailed"));
      return;
    }
    setRenameId(null);
    await load();
  };

  const deleteTitle = async (album: GalleryTitle) => {
    const ok = await confirm({
      title: t("gallery.deleteTitle"),
      message: t("gallery.deleteTitleConfirm", { name: album.title }),
      confirmLabel: t("common.delete"),
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/gallery/titles/${album.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || t("gallery.deleteFailed"));
      return;
    }
    await load();
  };

  const uploadFiles = async (titleId: string, files: FileList | null) => {
    if (!files?.length) return;
    const items: GalleryEditorItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 20)
      .map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        src: URL.createObjectURL(f),
      }));
    if (!items.length) {
      setErr(t("gallery.uploadFailed"));
      return;
    }
    setEditor({ titleId, items });
  };

  const openEditImage = (titleId: string, image: GalleryImage) => {
    setLightbox(null);
    setEditor({
      titleId,
      items: [
        {
          id: image.id,
          name: image.originalName || "photo.jpg",
          src: image.url,
          imageId: image.id,
        },
      ],
    });
  };

  const finishEditor = async (outputs: GalleryEditorOutput[]) => {
    if (!editor || !outputs.length) {
      setEditor(null);
      return;
    }
    const titleId = editor.titleId;
    const objectUrls = editor.items.map((it) => it.src).filter((s) => s.startsWith("blob:"));
    setUploadingId(titleId);
    setErr("");
    try {
      const replace = outputs.filter((o) => o.imageId);
      const create = outputs.filter((o) => !o.imageId);
      if (replace.length) {
        await Promise.all(
          replace.map(async (item) => {
            const fd = new FormData();
            fd.append("file", item.blob, item.name);
            const res = await fetch(`/api/gallery/images/${item.imageId}`, { method: "PATCH", body: fd });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || t("gallery.uploadFailed"));
            }
          }),
        );
      }
      if (create.length) {
        const fd = new FormData();
        create.forEach((o) => fd.append("files", o.blob, o.name));
        const res = await fetch(`/api/gallery/titles/${titleId}/images`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || t("gallery.uploadFailed"));
        }
      }
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      setEditor(null);
      void load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("gallery.uploadFailed"));
      throw e;
    } finally {
      setUploadingId(null);
    }
  };

  const deleteImage = async (image: GalleryImage) => {
    const ok = await confirm({
      title: t("gallery.deletePhoto"),
      message: t("gallery.deletePhotoConfirm"),
      confirmLabel: t("common.delete"),
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/gallery/images/${image.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || t("gallery.deleteFailed"));
      return;
    }
    if (lightbox) {
      setLightbox(null);
    }
    await load();
  };

  const currentPhoto = lightbox ? flatPhotos[lightbox.index] : null;

  return (
    <PageShell
      title={event?.activityName || t("gallery.title")}
      subtitle={event ? formatDate(event.eventDate) : t("gallery.subtitle")}
      icon={<Images className="h-6 w-6 text-teal-700" />}
      accentColor="border-teal-500"
      variant={role === "teacher" ? "teacher" : "default"}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("gallery.title"), href: "/gallery" },
        { label: event?.activityName || t("gallery.title") },
      ]}
      actions={
        <div className="gal-head__actions">
          <Link href="/gallery">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              {t("gallery.back")}
            </Button>
          </Link>
          {event?.canDelete ? (
            <Button size="sm" variant="destructive" onClick={() => void deleteEvent()}>
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          ) : null}
        </div>
      }
    >
      <ConfirmDialog />
      {loading ? (
        <PageLoader />
      ) : !event ? (
        <div className="gal-empty">
          <h3>{t("gallery.notFound")}</h3>
          <p>{err}</p>
          <Link href="/gallery">
            <Button className="mt-4">{t("gallery.back")}</Button>
          </Link>
        </div>
      ) : (
        <div className="gal-wrap">
          {err ? <p className="gal-error">{err}</p> : null}

          <div className="gal-album">
            <div className="gal-album__bar">
              {editing ? (
                <div className="gal-rename">
                  <Input
                    value={form.activityName}
                    onChange={(e) => setForm((p) => ({ ...p, activityName: e.target.value }))}
                    placeholder={t("gallery.activityName")}
                  />
                  <DateField
                    value={form.eventDate}
                    onChange={(v) => setForm((p) => ({ ...p, eventDate: v }))}
                    outputFormat="iso"
                  />
                  <Button size="sm" disabled={saving} onClick={() => void saveEvent()}>
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="gal-head__title">{event.activityName}</h2>
                    <p className="gal-head__date">{formatDate(event.eventDate)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                    {t("common.edit")}
                  </Button>
                </>
              )}
            </div>
          </div>

          <form
            className="gal-add-title"
            onSubmit={(e) => {
              e.preventDefault();
              void addTitle();
            }}
          >
            <div className="gal-add-title__field">
              <Input
                label={t("gallery.addTitle")}
                value={newTitle}
                placeholder={t("gallery.titlePlaceholder")}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={addingTitle}>
              <Plus className="h-4 w-4" />
              {addingTitle ? t("common.saving") : t("gallery.saveTitle")}
            </Button>
          </form>

          {event.titles.length === 0 ? (
            <div className="gal-empty">
              <Images className="mx-auto h-10 w-10 text-teal-300" />
              <h3>{t("gallery.noTitles")}</h3>
              <p>{t("gallery.noTitlesHint")}</p>
            </div>
          ) : (
            event.titles.map((album) => (
              <section key={album.id} className="gal-album">
                <div className="gal-album__bar">
                  {renameId === album.id ? (
                    <div className="gal-rename">
                      <Input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                      />
                      <Button size="sm" onClick={() => void saveRename(album.id)}>
                        {t("common.save")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRenameId(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <h3 className="gal-album__title">{album.title}</h3>
                  )}
                  <div className="gal-head__actions">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenameId(album.id);
                        setRenameVal(album.title);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("common.edit")}
                    </Button>
                    {event.canDelete ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteTitle(album)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                {album.images.length === 0 ? (
                  <p className="gal-album__empty">{t("gallery.noPhotos")}</p>
                ) : (
                  <div className="gal-photos">
                    {album.images.map((img, index) => (
                      <div key={img.id} className="gal-photo">
                        <button
                          type="button"
                          className="gal-photo__open"
                          onClick={() => setLightbox({ titleId: album.id, index })}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.originalName || album.title} />
                          {img.uploadedByName ? (
                            <span className="gal-photo__by">{img.uploadedByName}</span>
                          ) : null}
                        </button>
                        {img.canDelete ? (
                          <button
                            type="button"
                            className="gal-photo__del"
                            aria-label={t("gallery.deletePhoto")}
                            onClick={() => void deleteImage(img)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="gal-photo__edit"
                          aria-label={t("gallery.editPhoto")}
                          onClick={() => openEditImage(album.id, img)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`gal-drop${uploadingId === album.id ? " is-busy" : ""}`} style={{ marginTop: "0.75rem" }}>
                  {uploadingId === album.id ? (
                    <>
                      <Spinner />
                      {t("gallery.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      {t("gallery.addPhotosHint")}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={uploadingId === album.id}
                    onChange={(e) => {
                      void uploadFiles(album.id, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </section>
            ))
          )}
        </div>
      )}

      {lightbox && currentPhoto ? (
        <div className="gal-lightbox" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="gal-lightbox__close"
            aria-label={t("common.close")}
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {flatPhotos.length > 1 ? (
            <>
              <button
                type="button"
                className="gal-lightbox__nav is-prev"
                aria-label={t("common.previous")}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((cur) =>
                    cur
                      ? { ...cur, index: (cur.index - 1 + flatPhotos.length) % flatPhotos.length }
                      : cur,
                  );
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="gal-lightbox__nav is-next"
                aria-label={t("common.next")}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((cur) =>
                    cur ? { ...cur, index: (cur.index + 1) % flatPhotos.length } : cur,
                  );
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPhoto.url}
            alt={currentPhoto.originalName || event?.activityName || ""}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="gal-lightbox__caption">
            {currentPhoto.uploadedByName
              ? t("gallery.uploadedBy", { name: currentPhoto.uploadedByName })
              : ""}
            {flatPhotos.length > 1
              ? `  ${lightbox.index + 1} / ${flatPhotos.length}`
              : ""}
          </p>
          <button
            type="button"
            className="gal-lightbox__edit"
            onClick={(e) => {
              e.stopPropagation();
              const titleId = lightbox.titleId;
              setLightbox(null);
              openEditImage(titleId, currentPhoto);
            }}
          >
            <Pencil className="h-4 w-4" />
            {t("gallery.editPhoto")}
          </button>
        </div>
      ) : null}

      {editor ? (
        <GalleryImageEditor
          items={editor.items}
          onClose={() => {
            editor.items.forEach((it) => {
              if (it.src.startsWith("blob:")) URL.revokeObjectURL(it.src);
            });
            setEditor(null);
          }}
          onComplete={(out) => void finishEditor(out)}
        />
      ) : null}
    </PageShell>
  );
}
