"use client";

import {
  Filter,
  RotateCcw,
  GraduationCap,
  LayoutGrid,
  Tag,
  Activity,
  Users,
  X,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export interface DashboardFilterValues {
  standard: string;
  section: string;
  status: string;
  category: string;
  gender: string;
}

export interface DashboardFilterMeta {
  standards: string[];
  sections: string[];
  statuses: string[];
  categories: string[];
  genders: string[];
}

export const EMPTY_FILTERS: DashboardFilterValues = {
  standard: "",
  section: "",
  status: "",
  category: "",
  gender: "all",
};

interface Props {
  filters: DashboardFilterValues;
  meta: DashboardFilterMeta;
  onChange: (filters: DashboardFilterValues) => void;
  onReset: () => void;
  resultCount?: number;
}

const selectClass = "dashboard-filter-select";

type PresetId = "all" | "ready" | "draft" | "submitted";

export function DashboardFiltersBar({
  filters,
  meta,
  onChange,
  onReset,
  resultCount,
}: Props) {
  const t = useT();

  const hasActive =
    filters.standard ||
    filters.section ||
    filters.status ||
    filters.category ||
    (filters.gender && filters.gender !== "all");

  const set = (key: keyof DashboardFilterValues, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const activeChips: { key: keyof DashboardFilterValues; label: string }[] = [];
  if (filters.standard) {
    activeChips.push({
      key: "standard",
      label: t("dashboard.stdLabel", { standard: filters.standard }),
    });
  }
  if (filters.section) {
    activeChips.push({
      key: "section",
      label: t("dashboard.divLabel", { section: filters.section }),
    });
  }
  if (filters.status) {
    activeChips.push({ key: "status", label: t(`status.${filters.status}`) });
  }
  if (filters.category) {
    activeChips.push({ key: "category", label: filters.category });
  }
  if (filters.gender && filters.gender !== "all") {
    const gl = t(`gender.${filters.gender}`);
    activeChips.push({
      key: "gender",
      label: gl !== `gender.${filters.gender}` ? gl : filters.gender,
    });
  }

  const removeChip = (key: keyof DashboardFilterValues) => {
    if (key === "gender") set("gender", "all");
    else set(key, "");
  };

  const statusOnlyPreset =
    !filters.standard &&
    !filters.section &&
    !filters.category &&
    (filters.gender === "all" || !filters.gender);

  const activePreset: PresetId | null =
    statusOnlyPreset && filters.status === "ready"
      ? "ready"
      : statusOnlyPreset && filters.status === "draft"
        ? "draft"
        : statusOnlyPreset && filters.status === "submitted"
          ? "submitted"
          : !hasActive
            ? "all"
            : null;

  const applyPreset = (id: PresetId) => {
    if (id === "all") {
      onReset();
      return;
    }
    onChange({
      ...EMPTY_FILTERS,
      status: id,
    });
  };

  const presets: { id: PresetId; label: string }[] = [
    { id: "all", label: t("dashboard.filterPresetAll") },
    { id: "ready", label: t("dashboard.filterPresetReady") },
    { id: "draft", label: t("dashboard.filterPresetDraft") },
    { id: "submitted", label: t("dashboard.filterPresetSubmitted") },
  ];

  return (
    <section className="dashboard-filters-card" aria-label={t("dashboard.filters")}>
      <header className="dashboard-filters-head">
        <div className="dashboard-filters-title">
          <div className="dashboard-filters-icon">
            <Filter className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="dashboard-filters-heading">{t("dashboard.filters")}</p>
            <p className="dashboard-filters-desc">{t("dashboard.filtersDesc")}</p>
          </div>
        </div>

        <div className="dashboard-filters-meta">
          {resultCount !== undefined && (
            <span className="dashboard-filter-badge">
              {t("dashboard.showingStudents", { count: resultCount })}
            </span>
          )}
          {hasActive ? (
            <button type="button" onClick={onReset} className="dashboard-filter-reset">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("dashboard.resetFilters")}
            </button>
          ) : null}
        </div>
      </header>

      <div className="dashboard-filter-presets" role="group" aria-label={t("dashboard.filterPresets")}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn("dashboard-filter-preset", activePreset === p.id && "is-active")}
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activeChips.length > 0 ? (
        <div className="dashboard-filter-chips">
          <span className="dashboard-filter-chips-label">{t("dashboard.activeFilters")}</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeChip(chip.key)}
              className="dashboard-filter-chip"
            >
              {chip.label}
              <X className="h-3 w-3 opacity-70" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="dashboard-filters-grid">
        <FilterField icon={<GraduationCap className="h-3.5 w-3.5" />} label={t("dashboard.filterStandard")}>
          <select
            value={filters.standard}
            onChange={(e) => set("standard", e.target.value)}
            className={selectClass}
            aria-label={t("dashboard.filterStandard")}
          >
            <option value="">{t("dashboard.allStandards")}</option>
            {meta.standards.map((s) => (
              <option key={s} value={s}>
                {t("dashboard.stdLabel", { standard: s })}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField icon={<LayoutGrid className="h-3.5 w-3.5" />} label={t("dashboard.filterSection")}>
          <select
            value={filters.section}
            onChange={(e) => set("section", e.target.value)}
            className={selectClass}
            aria-label={t("dashboard.filterSection")}
          >
            <option value="">{t("dashboard.allSections")}</option>
            {meta.sections.map((s) => (
              <option key={s} value={s}>
                {t("dashboard.divLabel", { section: s })}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField icon={<Activity className="h-3.5 w-3.5" />} label={t("dashboard.filterStatus")}>
          <select
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
            className={selectClass}
            aria-label={t("dashboard.filterStatus")}
          >
            <option value="">{t("dashboard.allStatuses")}</option>
            {meta.statuses.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField icon={<Tag className="h-3.5 w-3.5" />} label={t("dashboard.filterCategory")}>
          <select
            value={filters.category}
            onChange={(e) => set("category", e.target.value)}
            className={selectClass}
            aria-label={t("dashboard.filterCategory")}
          >
            <option value="">{t("dashboard.allCategories")}</option>
            {meta.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField icon={<Users className="h-3.5 w-3.5" />} label={t("dashboard.filterGender")}>
          <select
            value={filters.gender}
            onChange={(e) => set("gender", e.target.value)}
            className={selectClass}
            aria-label={t("dashboard.filterGender")}
          >
            <option value="all">{t("dashboard.allGenders")}</option>
            {meta.genders.map((g) => (
              <option key={g} value={g}>
                {t(`gender.${g}`) !== `gender.${g}` ? t(`gender.${g}`) : g}
              </option>
            ))}
          </select>
        </FilterField>
      </div>

      <p className="dashboard-filters-help">{t("dashboard.filtersHelp")}</p>
    </section>
  );
}

function FilterField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="dashboard-filter-field">
      <span className="dashboard-filter-label">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
