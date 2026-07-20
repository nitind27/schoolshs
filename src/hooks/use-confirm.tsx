"use client";

import { useCallback, useRef, useState } from "react";
import {
  ConfirmModal,
  type ConfirmModalProps,
  type ConfirmVariant,
} from "@/components/ui/confirm-modal";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
};

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
      setOpen(true);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOpen(false);
    setLoading(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options) return;
    setLoading(true);
    try {
      if (options.onConfirm) await options.onConfirm();
      close(true);
    } catch {
      setLoading(false);
    }
  }, [close, options]);

  const ConfirmDialog = useCallback(() => {
    if (!options) return null;

    const modalProps: ConfirmModalProps = {
      isOpen: open,
      onClose: () => close(false),
      onConfirm: handleConfirm,
      loading,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      variant: options.variant,
    };

    return <ConfirmModal {...modalProps} />;
  }, [close, handleConfirm, loading, open, options]);

  return { confirm, ConfirmDialog };
}
