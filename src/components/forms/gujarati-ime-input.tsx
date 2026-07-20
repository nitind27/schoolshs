"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildGujaratiDisplay, type GujaratiSuggestion } from "@/lib/gujarati/gujarati-suggestions";
import { isGujaratiScript } from "@/lib/gujarati/gujarati-script";
import { fetchGujaratiTranslation } from "@/lib/gujarati/google-translate-client";
import { useT } from "@/i18n/locale-provider";

type DisplaySuggestion = GujaratiSuggestion & { fromGoogle?: boolean };

function mergeGoogleSuggestions(
  local: GujaratiSuggestion[],
  currentLatin: string,
  googleByLatin: Record<string, string>
): DisplaySuggestion[] {
  const key = currentLatin.toLowerCase();
  const google = googleByLatin[key];
  if (!google) return local;
  const rest = local.filter((s) => s.gujarati !== google);
  return [
    { gujarati: google, latin: key, preferred: true, fromGoogle: true },
    ...rest.map((s) => ({ ...s, preferred: false })),
  ];
}

type GujaratiImeInputProps = {
  label?: string;
  required?: boolean;
  value: string;
  latinSource?: string;
  syncFromLatin?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onManualGuEdit?: () => void;
  placeholder?: string;
  hint?: string;
  className?: string;
  id?: string;
};

const LATIN_CHAR = /^[a-zA-Z0-9.'-]$/;

type InputMode = "free" | "ime";

function mergeWordLocks(
  prevLatin: string,
  nextLatin: string,
  prevLocks: Record<string, string>,
  prevChoices: Record<string, number>
): { locks: Record<string, string>; choices: Record<string, number> } {
  const prevWords = prevLatin.trim().split(/\s+/).filter(Boolean);
  const nextWords = nextLatin.trim().split(/\s+/).filter(Boolean);
  const locks: Record<string, string> = {};
  const choices: Record<string, number> = {};

  for (let i = 0; i < nextWords.length; i++) {
    const key = nextWords[i].toLowerCase();
    const prevKey = prevWords[i]?.toLowerCase();
    if (prevKey === key && prevLocks[key]) {
      locks[key] = prevLocks[key];
      if (prevChoices[key] !== undefined) choices[key] = prevChoices[key];
    }
  }
  return { locks, choices };
}

export function GujaratiImeInput({
  label,
  required,
  value,
  latinSource = "",
  syncFromLatin = false,
  onChange,
  onFocus,
  onManualGuEdit,
  placeholder,
  hint,
  className,
  id,
}: GujaratiImeInputProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const manualGuRef = useRef(false);
  const prevLatinSourceRef = useRef(latinSource);
  const skipFocusHandlerRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const wordGuLockedRef = useRef<Record<string, string>>({});
  const wordChoicesRef = useRef<Record<string, number>>({});
  onChangeRef.current = onChange;

  const [mode, setMode] = useState<InputMode>("free");
  const [latinFull, setLatinFull] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [wordChoices, setWordChoices] = useState<Record<string, number>>({});
  const [wordGuLocked, setWordGuLocked] = useState<Record<string, string>>({});
  const [suggestionsClosed, setSuggestionsClosed] = useState(false);
  const [googleByLatin, setGoogleByLatin] = useState<Record<string, string>>({});

  const pushGu = useCallback((gu: string) => {
    onChangeRef.current(gu);
  }, []);

  const rebuildAndPush = useCallback(
    (
      nextLatin: string,
      idx: number,
      choices: Record<string, number>,
      locked: Record<string, string>
    ) => {
      const built = buildGujaratiDisplay(nextLatin, idx, choices, locked);
      const cur = built.currentLatin;
      const google = cur ? googleByLatin[cur.toLowerCase()] : undefined;
      if (google && idx === 0 && !locked[cur.toLowerCase()]) {
        const nextLocked = { ...locked, [cur.toLowerCase()]: google };
        const rebuilt = buildGujaratiDisplay(nextLatin, 0, choices, nextLocked);
        pushGu(rebuilt.display);
        return;
      }
      pushGu(built.display);
    },
    [pushGu, googleByLatin]
  );

  const { suggestions: localSuggestions, currentLatin } = useMemo(() => {
    if (mode !== "ime" || !latinFull) {
      return { suggestions: [], currentLatin: "" };
    }
    return buildGujaratiDisplay(latinFull, selectedIdx, wordChoices, wordGuLocked);
  }, [mode, latinFull, selectedIdx, wordChoices, wordGuLocked]);

  const suggestions = useMemo(
    () => mergeGoogleSuggestions(localSuggestions, currentLatin, googleByLatin),
    [localSuggestions, currentLatin, googleByLatin]
  );

  const showSuggestions =
    mode === "ime" &&
    !suggestionsClosed &&
    currentLatin.length > 0 &&
    suggestions.length > 0;

  const markManualGu = useCallback(() => {
    if (!manualGuRef.current) {
      manualGuRef.current = true;
      onManualGuEdit?.();
    }
  }, [onManualGuEdit]);

  useEffect(() => {
    if (!value && !latinSource) {
      manualGuRef.current = false;
      prevLatinSourceRef.current = "";
      setMode("free");
      setLatinFull("");
      setSelectedIdx(0);
      setWordChoices({});
      setWordGuLocked({});
      setSuggestionsClosed(false);
      setGoogleByLatin({});
    }
  }, [value, latinSource]);

  // Google Translate for current IME word (suggestions)
  useEffect(() => {
    if (mode !== "ime" || !currentLatin.trim()) return;
    const word = currentLatin.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchGujaratiTranslation(word).then((gu) => {
        if (!cancelled && gu) {
          setGoogleByLatin((prev) => ({ ...prev, [word.toLowerCase()]: gu }));
        }
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentLatin, mode]);

  // English changed → sync Gujarati via Google Translate
  useEffect(() => {
    if (!syncFromLatin || manualGuRef.current) return;
    const prevLatin = prevLatinSourceRef.current;
    if (prevLatin === latinSource) return;
    prevLatinSourceRef.current = latinSource;

    const { locks, choices } = mergeWordLocks(
      prevLatin,
      latinSource,
      wordGuLockedRef.current,
      wordChoicesRef.current
    );
    wordGuLockedRef.current = locks;
    wordChoicesRef.current = choices;

    setMode("ime");
    setLatinFull(latinSource);
    setSelectedIdx(0);
    setWordChoices(choices);
    setWordGuLocked(locks);
    setSuggestionsClosed(false);

    if (!latinSource.trim()) {
      onChangeRef.current("");
      return;
    }

    const { display: localPreview } = buildGujaratiDisplay(latinSource, 0, choices, locks);
    onChangeRef.current(localPreview);

    let cancelled = false;
    const timer = setTimeout(async () => {
      const googleGu = await fetchGujaratiTranslation(latinSource);
      if (cancelled || manualGuRef.current) return;
      if (googleGu) {
        onChangeRef.current(googleGu);
        return;
      }
      const { display } = buildGujaratiDisplay(latinSource, 0, choices, locks);
      onChangeRef.current(display);
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to latinSource / sync flag
  }, [latinSource, syncFromLatin]);

  const applyLatin = useCallback(
    (nextLatin: string, idx = 0) => {
      setMode("ime");
      setSuggestionsClosed(false);
      setLatinFull(nextLatin);
      setSelectedIdx(idx);
      rebuildAndPush(nextLatin, idx, wordChoices, wordGuLocked);
    },
    [rebuildAndPush, wordChoices, wordGuLocked]
  );

  const pickSuggestion = useCallback(
    (idx: number) => {
      const { currentLatin: cur } = buildGujaratiDisplay(
        latinFull,
        selectedIdx,
        wordChoices,
        wordGuLocked
      );
      const sugs = mergeGoogleSuggestions(
        buildGujaratiDisplay(latinFull, selectedIdx, wordChoices, wordGuLocked).suggestions,
        cur,
        googleByLatin
      );
      const chosen = sugs[idx];
      if (!chosen || !cur) return;

      const key = cur.toLowerCase();
      const nextLocked = { ...wordGuLocked, [key]: chosen.gujarati };
      const nextChoices = { ...wordChoices, [key]: idx };

      setSelectedIdx(idx);
      setWordChoices(nextChoices);
      setWordGuLocked(nextLocked);
      wordChoicesRef.current = nextChoices;
      wordGuLockedRef.current = nextLocked;
      setSuggestionsClosed(true);

      const { display: gu } = buildGujaratiDisplay(latinFull, idx, nextChoices, nextLocked);
      onChangeRef.current(gu);

      skipFocusHandlerRef.current = true;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [latinFull, selectedIdx, wordChoices, wordGuLocked, googleByLatin]
  );

  const commitWord = useCallback(() => {
    const trimmed = latinFull.replace(/\s+$/, "");
    if (!trimmed) return;

    const lastSpace = trimmed.lastIndexOf(" ");
    const current = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1);

    const built = buildGujaratiDisplay(trimmed, selectedIdx, wordChoices, wordGuLocked);
    const sugs = mergeGoogleSuggestions(built.suggestions, current, googleByLatin);
    const chosen = sugs[selectedIdx];

    const nextChoices = { ...wordChoices };
    const nextLocked = { ...wordGuLocked };
    if (current && chosen) {
      nextChoices[current.toLowerCase()] = selectedIdx;
      nextLocked[current.toLowerCase()] = chosen.gujarati;
    }

    const withSpace = `${trimmed} `;
    setWordChoices(nextChoices);
    setWordGuLocked(nextLocked);
    wordChoicesRef.current = nextChoices;
    wordGuLockedRef.current = nextLocked;
    setLatinFull(withSpace);
    setSelectedIdx(0);
    setSuggestionsClosed(false);
    rebuildAndPush(withSpace, 0, nextChoices, nextLocked);
  }, [latinFull, selectedIdx, wordChoices, wordGuLocked, googleByLatin, rebuildAndPush]);

  const enterFreeEdit = useCallback(
    (nextValue: string) => {
      markManualGu();
      setMode("free");
      setLatinFull("");
      setSuggestionsClosed(true);
      pushGu(nextValue);
    },
    [markManualGu, pushGu]
  );

  const handleFreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (!next) {
      manualGuRef.current = false;
      setMode("free");
      setLatinFull("");
      setWordChoices({});
      setWordGuLocked({});
      pushGu("");
      return;
    }
    enterFreeEdit(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode === "free") {
      if (
        e.key.length === 1 &&
        LATIN_CHAR.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setMode("ime");
        setLatinFull(e.key);
        setSelectedIdx(0);
        setSuggestionsClosed(false);
        rebuildAndPush(e.key, 0, wordChoices, wordGuLocked);
      }
      return;
    }

    const { key } = e;

    if (showSuggestions && key >= "1" && key <= "9") {
      const pickIdx = parseInt(key, 10) - 1;
      if (pickIdx < suggestions.length) {
        e.preventDefault();
        pickSuggestion(pickIdx);
      }
      return;
    }

    if (showSuggestions && (key === "ArrowDown" || key === "ArrowUp")) {
      e.preventDefault();
      const next =
        key === "ArrowDown"
          ? (selectedIdx + 1) % suggestions.length
          : (selectedIdx - 1 + suggestions.length) % suggestions.length;
      setSelectedIdx(next);
      rebuildAndPush(latinFull, next, wordChoices, wordGuLocked);
      return;
    }

    if (key === " " && currentLatin) {
      e.preventDefault();
      commitWord();
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      setSuggestionsClosed(false);
      if (!latinFull) {
        setMode("free");
        pushGu("");
        return;
      }
      const next = latinFull.slice(0, -1);
      if (!next) {
        setMode("free");
        setLatinFull("");
        pushGu("");
        return;
      }
      applyLatin(next);
      return;
    }

    if (key === "Escape" && showSuggestions) {
      e.preventDefault();
      setSuggestionsClosed(true);
      return;
    }

    if (key === "Enter" && showSuggestions) {
      e.preventDefault();
      pickSuggestion(selectedIdx);
      return;
    }

    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (LATIN_CHAR.test(key)) {
        e.preventDefault();
        setSuggestionsClosed(false);
        applyLatin(latinFull + key, selectedIdx);
      } else if (key === " ") {
        e.preventDefault();
        if (latinFull) applyLatin(`${latinFull} `, selectedIdx);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    if (isGujaratiScript(text)) {
      enterFreeEdit(text);
      return;
    }
    applyLatin(latinFull ? `${latinFull}${text}` : text, 0);
  };

  const handleFocus = () => {
    onFocus?.();
    if (skipFocusHandlerRef.current) {
      skipFocusHandlerRef.current = false;
      return;
    }
    if (suggestionsClosed && value) {
      setMode("free");
      setLatinFull("");
    }
  };

  const handleBlur = () => {
    if (mode === "ime" && suggestionsClosed) {
      setMode("free");
      setLatinFull("");
    }
  };

  const activeSuggestionIdx = useMemo(() => {
    if (!currentLatin) return selectedIdx;
    const locked = wordGuLocked[currentLatin.toLowerCase()];
    if (locked) {
      const idx = suggestions.findIndex((s) => s.gujarati === locked);
      if (idx >= 0) return idx;
    }
    return selectedIdx;
  }, [currentLatin, wordGuLocked, suggestions, selectedIdx]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleFreeChange}
          onPaste={handlePaste}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            "transition-colors duration-150 font-[family-name:var(--font-noto-gujarati)]",
            showSuggestions && "rounded-b-none border-b-transparent",
            className
          )}
          style={{ fontFamily: '"Noto Sans Gujarati", sans-serif' }}
          autoComplete="off"
          spellCheck={false}
        />

        {showSuggestions && (
          <ul
            className="absolute left-0 right-0 top-full z-[60] max-h-48 overflow-y-auto rounded-b-xl border border-t-0 border-blue-200 bg-white shadow-lg"
            role="listbox"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((sug, i) => {
              const isActive = i === activeSuggestionIdx;
              const isLocked =
                !!currentLatin &&
                wordGuLocked[currentLatin.toLowerCase()] === sug.gujarati;
              return (
                <li key={`${sug.gujarati}-${sug.latin}-${i}`} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pickSuggestion(i);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer",
                      isActive
                        ? "bg-blue-50 text-blue-900 font-medium"
                        : "text-slate-800 hover:bg-slate-50",
                      isLocked && "border-l-2 border-l-blue-500",
                      sug.preferred && !isLocked && "border-l-2 border-l-emerald-500"
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-base leading-tight"
                        style={{ fontFamily: '"Noto Sans Gujarati", sans-serif' }}
                      >
                        {sug.gujarati}
                      </span>
                      {sug.latin !== currentLatin.toLowerCase() && (
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                          {sug.latin}
                        </span>
                      )}
                    </span>
                    {isLocked && (
                      <span className="shrink-0 text-[10px] font-medium text-blue-600">
                        {t("fields.nameGujaratiSelected")}
                      </span>
                    )}
                    {!isLocked && sug.fromGoogle && (
                      <span className="shrink-0 text-[10px] font-medium text-emerald-600">
                        {t("fields.nameGujaratiGoogle")}
                      </span>
                    )}
                    {!isLocked && sug.preferred && !sug.fromGoogle && (
                      <span className="shrink-0 text-[10px] font-medium text-emerald-600">
                        {t("fields.nameGujaratiRecommended")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            <li className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
              {t("fields.nameGujaratiSuggestionHint")}
            </li>
          </ul>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-400 leading-snug">{hint}</p>}
    </div>
  );
}
