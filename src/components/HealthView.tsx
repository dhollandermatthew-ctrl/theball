// FILE: src/components/HealthView.tsx
import React, { useState, useRef } from "react";
import { Upload, Plus, FileText, Image as ImageIcon, Trash2, TrendingUp, TrendingDown, Minus, ArrowLeft, Settings, User, X, Zap, ChevronRight } from "lucide-react";
import { HealthData, BloodWorkRecord, LabValue, PersonalProfile } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { extractBloodWorkFromFile } from "@/domain/ai/bloodwork";
import { tokenTracker } from "@/domain/tokenTracker";
import { TokenStatsModal } from "./TokenStatsModal";
import { useAppStore } from "@/domain/state";

/* ------------------------------------------------------------------
 * MAIN VIEW
 * ------------------------------------------------------------------ */

export const HealthView: React.FC = () => {
  const healthData = useAppStore((s) => s.healthData);
  const addBloodwork = useAppStore((s) => s.addBloodwork);
  const deleteBloodwork = useAppStore((s) => s.deleteBloodwork);
  const updateHealthProfile = useAppStore((s) => s.updateHealthProfile);

  const [view, setView] = useState<"overview" | "detail">("overview");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const update = () => setTotalTokens(tokenTracker.getTotalTokens());
    update();
    const unsub = tokenTracker.subscribe(update);
    return () => { unsub(); };
  }, []);

  const sortedRecords = [...(healthData.bloodWorkRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Default selected record to newest
  React.useEffect(() => {
    if (sortedRecords.length > 0 && !selectedRecordId) {
      setSelectedRecordId(sortedRecords[0].id);
    }
  }, [sortedRecords.length]);

  const selectedRecord = sortedRecords.find((r) => r.id === selectedRecordId) ?? sortedRecords[0] ?? null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const record = await extractBloodWorkFromFile(file);
      addBloodwork(record);
      setSelectedRecordId(record.id);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const low = msg.toLowerCase();
      const isQuota =
        low.includes("429") ||
        low.includes("resource_exhausted") ||
        (low.includes("quota") && low.includes("exceeded"));
      setUploadError(
        isQuota
          ? "API quota exceeded. Try again later or enter data manually."
          : `Failed to process file: ${msg.substring(0, 300)}`
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectReport = (id: string) => {
    setSelectedRecordId(id);
    setView("detail");
  };

  const handleDeleteRecord = (id: string) => {
    deleteBloodwork(id);
    if (selectedRecordId === id) {
      const next = sortedRecords.find((r) => r.id !== id);
      setSelectedRecordId(next?.id ?? null);
      setView("overview");
    }
  };

  return (
    <>
      <TokenStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex h-full bg-slate-50 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-52 flex-none flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-slate-200 flex-none">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-sm font-semibold text-slate-900">Blood</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsStatsOpen(true)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400"
                  title="Token usage"
                >
                  <Zap size={13} className="text-amber-500" />
                </button>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400"
                  title="Profile settings"
                >
                  <Settings size={13} />
                </button>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                <Plus size={12} />
                Manual
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50"
              >
                <Upload size={12} />
                {isUploading ? "..." : "Upload"}
              </button>
            </div>
            {uploadError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-1.5 leading-snug">
                {uploadError}
              </div>
            )}
          </div>

          {/* Nav + report list */}
          <nav className="flex-1 overflow-y-auto py-1">
            {/* Overview nav item */}
            <button
              onClick={() => setView("overview")}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                view === "overview"
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="text-base leading-none">📊</span>
              Overview
            </button>

            {sortedRecords.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                  Reports
                </div>
                {sortedRecords.map((record) => (
                  <ReportSidebarItem
                    key={record.id}
                    record={record}
                    isActive={view === "detail" && selectedRecordId === record.id}
                    onClick={() => handleSelectReport(record.id)}
                  />
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* ── Main panel ── */}
        <main className="flex-1 overflow-y-auto">
          {sortedRecords.length === 0 ? (
            <EmptyState onUpload={() => fileInputRef.current?.click()} onManual={() => setShowManualEntry(true)} isUploading={isUploading} />
          ) : view === "overview" ? (
            <OverviewPanel
              records={sortedRecords}
              profile={healthData.personalProfile}
              onSelectReport={handleSelectReport}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          ) : selectedRecord ? (
            <DetailPanel
              record={selectedRecord}
              allRecords={sortedRecords}
              onBack={() => setView("overview")}
              onDelete={handleDeleteRecord}
            />
          ) : null}
        </main>
      </div>

      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSave={(record) => {
            addBloodwork(record);
            setShowManualEntry(false);
          }}
        />
      )}

      {showProfileModal && (
        <PersonalProfileModal
          profile={healthData.personalProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={(profile) => {
            updateHealthProfile(profile);
            setShowProfileModal(false);
          }}
        />
      )}
    </>
  );
};

/* ------------------------------------------------------------------
 * SIDEBAR ITEM
 * ------------------------------------------------------------------ */

const ReportSidebarItem: React.FC<{
  record: BloodWorkRecord;
  isActive: boolean;
  onClick: () => void;
}> = ({ record, isActive, onClick }) => {
  const flagCount = record.labValues.filter((v) => v.flag).length;
  const hasRed = record.labValues.some((v) => v.flag === "HH" || v.flag === "LL" || v.flag === "CRIT");
  const date = new Date(record.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-colors group ${
        isActive ? "bg-indigo-50" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${isActive ? "text-indigo-700" : "text-slate-800"}`}>
          {date}
        </span>
        {flagCount > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            hasRed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}>
            {flagCount}
          </span>
        )}
      </div>
      {record.labName && (
        <div className="text-[10px] text-slate-400 mt-0.5">{record.labName}</div>
      )}
    </button>
  );
};

/* ------------------------------------------------------------------
 * EMPTY STATE
 * ------------------------------------------------------------------ */

const EmptyState: React.FC<{
  onUpload: () => void;
  onManual: () => void;
  isUploading: boolean;
}> = ({ onUpload, onManual, isUploading }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
      <FileText size={32} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-medium text-slate-900 mb-2">No blood work records yet</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-sm">
      Upload a PDF or image of your lab results. AI extracts all values and tracks trends automatically.
    </p>
    <div className="flex gap-2">
      <button
        onClick={onManual}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors"
      >
        <Plus size={16} /> Enter Manually
      </button>
      <button
        onClick={onUpload}
        disabled={isUploading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm transition-colors disabled:opacity-50"
      >
        <Upload size={16} /> Upload Report
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------
 * OVERVIEW PANEL — category cards + flags banner + expandable trends
 * ------------------------------------------------------------------ */

const CATEGORIES: Array<{ key: string; label: string; keywords: string[] }> = [
  { key: "lipid", label: "Lipid Panel", keywords: ["cholesterol", "ldl", "hdl", "triglyceride", "lipoprotein", "apolipoprotein", "non-hdl", "lp(a)"] },
  { key: "sugar", label: "Blood Sugar", keywords: ["glucose", "hba1c", "hemoglobin a", "insulin", "c-peptide", "fructosamine"] },
  { key: "kidney", label: "Kidney", keywords: ["creatinine", "egfr", "gfr", "bun", "urea nitrogen", "uric acid", "cystatin"] },
  { key: "liver", label: "Liver", keywords: ["alt", "ast", "alp", "alkaline phosphatase", "bilirubin", "ggt", "gamma-glutamyl"] },
  { key: "cbc", label: "CBC", keywords: ["hemoglobin", "hematocrit", "wbc", "white blood", "rbc", "red blood", "platelet", "neutrophil", "lymphocyte", "monocyte", "eosinophil", "basophil", "mcv", "mch", "rdw"] },
  { key: "thyroid", label: "Thyroid", keywords: ["tsh", "free t3", "free t4", "thyroid stimulating", "thyroxine", "triiodothyronine"] },
  { key: "electrolyte", label: "Electrolytes", keywords: ["sodium", "potassium", "chloride", "bicarbonate", "calcium", "magnesium", "phosphate", "co2"] },
  { key: "iron", label: "Iron Studies", keywords: ["iron", "ferritin", "transferrin", "tibc", "saturation"] },
];

function categorizeLabValue(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.key;
  }
  return "other";
}

interface OverviewPanelProps {
  records: BloodWorkRecord[];
  profile?: PersonalProfile;
  onSelectReport: (id: string) => void;
  onOpenProfile: () => void;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ records }) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const latest = records[0];

  // Build trendMap across all records: name → [{date, value, flag, referenceRange}] oldest-first
  const trendMap = new Map<string, Array<{ date: string; value: number; flag?: string; referenceRange?: string }>>();
  [...records].reverse().forEach((r) => {
    r.labValues.forEach((lv) => {
      const num = parseFloat(lv.value);
      if (!isNaN(num)) {
        if (!trendMap.has(lv.name)) trendMap.set(lv.name, []);
        trendMap.get(lv.name)!.push({ date: r.date, value: num, flag: lv.flag, referenceRange: lv.referenceRange });
      }
    });
  });

  const flaggedValues = latest.labValues.filter((lv) => lv.flag);

  // Group latest values by category
  const grouped = new Map<string, LabValue[]>();
  latest.labValues.forEach((lv) => {
    const cat = categorizeLabValue(lv.name);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(lv);
  });

  const presentCategories = CATEGORIES.filter((c) => grouped.has(c.key));
  const otherValues = grouped.get("other") ?? [];

  const getTrend = (name: string): { dir: "up" | "down" | "flat" | "none" } => {
    const history = trendMap.get(name) ?? [];
    if (history.length < 2) return { dir: "none" };
    const curr = history[history.length - 1].value;
    const prev = history[history.length - 2].value;
    const pct = ((curr - prev) / prev) * 100;
    return { dir: Math.abs(pct) < 3 ? "flat" : pct > 0 ? "up" : "down" };
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-3 max-w-4xl">

        {/* Flags banner */}
        {flaggedValues.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-2">
              Out of Range · {new Date(latest.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {latest.labName ? ` · ${latest.labName}` : ""}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {flaggedValues.map((lv, i) => {
                const isCrit = lv.flag === "HH" || lv.flag === "LL" || lv.flag === "CRIT";
                return (
                  <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                    isCrit ? "bg-red-100 border-red-200 text-red-700" : "bg-amber-100 border-amber-200 text-amber-700"
                  }`}>
                    <span className="text-slate-500">{lv.name}</span>
                    <span className="font-semibold tabular-nums">{lv.value}</span>
                    {lv.unit && <span className="text-[10px] opacity-60">{lv.unit}</span>}
                    <span className="text-[10px] font-bold opacity-70">{lv.flag}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category cards grid */}
        {presentCategories.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {presentCategories.map((cat) => {
              const values = grouped.get(cat.key)!;
              const worstFlag = values.some((v) => v.flag === "HH" || v.flag === "LL" || v.flag === "CRIT")
                ? "bad" : values.some((v) => v.flag === "H" || v.flag === "L")
                ? "warn" : "ok";
              const statusLabel = worstFlag === "bad" ? "Needs attention" : worstFlag === "warn" ? "Monitor" : "Normal";
              const statusCls = worstFlag === "bad"
                ? "bg-red-100 text-red-700"
                : worstFlag === "warn"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700";

              const sortedValues = [...values].sort((a, b) => {
                const rank = (f?: string) => f === "HH" || f === "LL" || f === "CRIT" ? 0 : f === "H" || f === "L" ? 1 : 2;
                return rank(a.flag) - rank(b.flag);
              });

              return (
                <div key={cat.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{cat.label}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                  </div>

                  {sortedValues.map((lv, i) => {
                    const history = trendMap.get(lv.name) ?? [];
                    const vals = history.map((h) => h.value);
                    const trend = getTrend(lv.name);
                    const isBad = lv.flag === "HH" || lv.flag === "LL" || lv.flag === "CRIT";
                    const isWarn = lv.flag === "H" || lv.flag === "L";
                    const sparkStatus: "bad" | "warn" | "good" = isBad ? "bad" : isWarn ? "warn" : "good";
                    const expandKey = `${cat.key}-${i}`;
                    const isExpanded = expandedMetric === expandKey;

                    const arrowEl = trend.dir === "none" || trend.dir === "flat"
                      ? <Minus size={11} className="text-slate-300" />
                      : trend.dir === "up"
                      ? <TrendingUp size={11} className={isBad || isWarn ? "text-red-400" : "text-slate-400"} />
                      : <TrendingDown size={11} className={isBad || isWarn ? "text-green-500" : "text-slate-400"} />;

                    const histForChart = [...history].sort(
                      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                    );

                    return (
                      <React.Fragment key={i}>
                        <div
                          onClick={() => setExpandedMetric(isExpanded ? null : expandKey)}
                          className={`flex items-center gap-2 px-4 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? "bg-slate-50" : ""}`}
                        >
                          <span className="flex-1 text-xs text-slate-500 truncate min-w-0">{lv.name}</span>
                          <span className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isBad ? "text-red-600" : isWarn ? "text-amber-600" : "text-slate-800"}`}>
                            {lv.value}
                            {lv.unit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{lv.unit}</span>}
                          </span>
                          <span className="flex-none w-4 flex justify-center">{arrowEl}</span>
                          <SparkLine vals={vals} status={sparkStatus} />
                        </div>
                        {isExpanded && histForChart.length >= 2 && (
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <TrendChart name={lv.name} values={histForChart} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Other / uncategorized values */}
        {otherValues.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Other</span>
            </div>
            {otherValues.map((lv, i) => {
              const history = trendMap.get(lv.name) ?? [];
              const vals = history.map((h) => h.value);
              const trend = getTrend(lv.name);
              const isBad = lv.flag === "HH" || lv.flag === "LL" || lv.flag === "CRIT";
              const isWarn = lv.flag === "H" || lv.flag === "L";
              const sparkStatus: "bad" | "warn" | "good" = isBad ? "bad" : isWarn ? "warn" : "good";
              const expandKey = `other-${i}`;
              const isExpanded = expandedMetric === expandKey;

              const arrowEl = trend.dir === "none" || trend.dir === "flat"
                ? <Minus size={11} className="text-slate-300" />
                : trend.dir === "up"
                ? <TrendingUp size={11} className={isBad || isWarn ? "text-red-400" : "text-slate-400"} />
                : <TrendingDown size={11} className={isBad || isWarn ? "text-green-500" : "text-slate-400"} />;

              const histForChart = [...history].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              return (
                <React.Fragment key={i}>
                  <div
                    onClick={() => setExpandedMetric(isExpanded ? null : expandKey)}
                    className={`flex items-center gap-2 px-4 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? "bg-slate-50" : ""}`}
                  >
                    <span className="flex-1 text-xs text-slate-500 truncate min-w-0">{lv.name}</span>
                    <span className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isBad ? "text-red-600" : isWarn ? "text-amber-600" : "text-slate-800"}`}>
                      {lv.value}
                      {lv.unit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{lv.unit}</span>}
                    </span>
                    <span className="flex-none w-4 flex justify-center">{arrowEl}</span>
                    <SparkLine vals={vals} status={sparkStatus} />
                  </div>
                  {isExpanded && histForChart.length >= 2 && (
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <TrendChart name={lv.name} values={histForChart} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* AI analysis */}
        {(latest.aiAnalysis || (latest.aiFlags && latest.aiFlags.length > 0)) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">AI Analysis</div>
            {latest.aiAnalysis && (
              <p className="text-sm text-slate-700 leading-relaxed mb-2">{latest.aiAnalysis}</p>
            )}
            {latest.aiFlags && latest.aiFlags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {latest.aiFlags.map((flag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full">{flag}</span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * SPARKLINE
 * ------------------------------------------------------------------ */

const SparkLine: React.FC<{ vals: number[]; status: "bad" | "warn" | "good" }> = ({ vals, status }) => {
  const pts = vals.filter((v) => !isNaN(v));
  if (pts.length < 2) {
    return (
      <svg width="70" height="26" viewBox="0 0 70 26">
        <circle cx="35" cy="13" r="3" fill={status === "bad" ? "#ef4444" : status === "warn" ? "#f59e0b" : "#22c55e"} />
      </svg>
    );
  }
  const W = 70, H = 26, P = 3;
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const rng = mx - mn || 0.1;
  const coords = pts.map((v, i) => [
    P + (i / (pts.length - 1)) * (W - P * 2),
    H - P - ((v - mn) / rng) * (H - P * 2),
  ]);
  const col = status === "bad" ? "#ef4444" : status === "warn" ? "#f59e0b" : "#22c55e";
  const d = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" overflow="visible">
      <path d={d} stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="2.5" fill={col} />
    </svg>
  );
};

/* ------------------------------------------------------------------
 * DETAIL PANEL
 * ------------------------------------------------------------------ */

interface DetailPanelProps {
  record: BloodWorkRecord;
  allRecords: BloodWorkRecord[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ record, allRecords, onBack, onDelete }) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Sort values: flagged first
  const sortedValues = [...record.labValues].sort((a, b) => {
    const rank = (flag?: string) =>
      flag === "HH" || flag === "LL" || flag === "CRIT" ? 0 :
      flag === "H" || flag === "L" ? 1 : 2;
    return rank(a.flag) - rank(b.flag);
  });

  // Build history for expanded chart
  const labValuesByName = new Map<string, Array<{ date: string; value: number; unit: string; flag?: string; referenceRange?: string }>>();
  allRecords.forEach((r) => {
    r.labValues.forEach((lv) => {
      const num = parseFloat(lv.value);
      if (!isNaN(num)) {
        if (!labValuesByName.has(lv.name)) labValuesByName.set(lv.name, []);
        labValuesByName.get(lv.name)!.push({ date: r.date, value: num, unit: lv.unit, flag: lv.flag, referenceRange: lv.referenceRange });
      }
    });
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} /> Overview
          </button>
          <span className="text-slate-300">/</span>
          <div>
            <div className="text-base font-semibold text-slate-900">
              {new Date(record.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            {record.labName && <div className="text-xs text-slate-500">{record.labName}</div>}
          </div>
        </div>
        <button
          onClick={() => onDelete(record.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {/* AI analysis */}
      {(record.aiAnalysis || (record.aiFlags && record.aiFlags.length > 0)) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">AI Analysis</div>
          {record.aiAnalysis && (
            <p className="text-sm text-slate-700 leading-relaxed mb-3">{record.aiAnalysis}</p>
          )}
          {record.aiFlags && record.aiFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {record.aiFlags.map((flag, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full">
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab values table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 grid grid-cols-[1fr_auto_auto_auto] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <div>Test</div>
          <div className="w-32 text-right">Value</div>
          <div className="w-28 text-center">Reference</div>
          <div className="w-16 text-center">Flag</div>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedValues.map((lv, i) => {
            const history = labValuesByName.get(lv.name);
            const canExpand = history && history.length > 1;
            const isExpanded = expandedMetric === lv.name;
            const isBad = lv.flag === "HH" || lv.flag === "LL" || lv.flag === "CRIT";
            const isWarn = lv.flag === "H" || lv.flag === "L";
            return (
              <React.Fragment key={i}>
                <div
                  onClick={() => canExpand && setExpandedMetric(isExpanded ? null : lv.name)}
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3 transition-colors ${canExpand ? "cursor-pointer hover:bg-slate-50" : ""} ${isExpanded ? "bg-indigo-50" : ""}`}
                >
                  <span className="text-sm text-slate-800">{lv.name}</span>
                  <div className="w-32 text-right">
                    <span className={`text-sm font-medium ${isBad ? "text-red-700" : isWarn ? "text-amber-700" : "text-slate-900"}`}>
                      {lv.value}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{lv.unit}</span>
                  </div>
                  <div className="w-28 text-center text-xs text-slate-400">
                    {lv.referenceRange ?? "—"}
                  </div>
                  <div className="w-16 text-center">
                    {lv.flag ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBad ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {lv.flag}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </div>
                </div>
                {isExpanded && history && (
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                    <TrendChart name={lv.name} values={history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {record.sourceFileName && (
        <p className="text-xs text-slate-400 text-center mt-4">Source: {record.sourceFileName}</p>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------
 * TREND CHART (expanded in detail view)
 * ------------------------------------------------------------------ */

interface TrendChartProps {
  name: string;
  values: Array<{ date: string; value: number; flag?: string; referenceRange?: string }>;
}

const TrendChart: React.FC<TrendChartProps> = ({ name, values }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const referenceRangeStr = values.find((v) => v.referenceRange)?.referenceRange;
  let refMin: number | null = null;
  let refMax: number | null = null;

  if (referenceRangeStr) {
    const cleaned = referenceRangeStr.replace(/\s*(mmol\/L|mg\/dL|g\/L|U\/L|IU\/L|µmol\/L|umol\/L)\s*/gi, "").trim();
    const range = cleaned.match(/([\d.]+)\s*[-–—]\s*([\d.]+)/);
    const lt = cleaned.match(/<\s*=?\s*([\d.]+)/);
    const gt = cleaned.match(/>\s*=?\s*([\d.]+)/);
    if (range) { refMin = parseFloat(range[1]); refMax = parseFloat(range[2]); }
    else if (lt) { refMax = parseFloat(lt[1]); refMin = 0; }
    else if (gt) { refMin = parseFloat(gt[1]); }
  }

  const dataMin = Math.min(...values.map((v) => v.value));
  const dataMax = Math.max(...values.map((v) => v.value));

  let scaledMin: number, scaledMax: number;
  if (refMin !== null && refMax !== null) {
    const pad = (refMax - refMin) * 0.4;
    scaledMin = Math.max(0, refMin - pad);
    scaledMax = refMax + pad;
    scaledMin = Math.min(scaledMin, dataMin - (dataMax - dataMin) * 0.2);
    scaledMax = Math.max(scaledMax, dataMax + (dataMax - dataMin) * 0.2);
  } else if (refMax !== null) {
    scaledMin = 0;
    scaledMax = Math.max(refMax * 1.5, dataMax * 1.25);
  } else {
    const rng = dataMax - dataMin || 1;
    scaledMin = Math.max(0, dataMin - rng * 0.25);
    scaledMax = dataMax + rng * 0.25;
  }

  const scaledRange = scaledMax - scaledMin;
  const getY = (v: number) => ((scaledMax - v) / scaledRange) * 100;

  const getColor = (flag?: string) =>
    flag === "HH" || flag === "LL" || flag === "CRIT" ? "#ef4444" :
    flag === "H" || flag === "L" ? "#f59e0b" : "#3b82f6";

  const yTicks = Array.from({ length: 5 }, (_, i) => scaledMin + (scaledRange * (4 - i) / 4));

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{name} — Trend</h3>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between h-[140px] text-[10px] text-slate-500 text-right">
          {yTicks.map((t, i) => <div key={i} className="w-10 pr-1">{t.toFixed(1)}</div>)}
        </div>
        <div className="flex-1 relative">
          <div className="h-[140px] bg-white rounded border border-slate-200 relative overflow-visible">
            <svg className="w-full h-full" viewBox="0 0 600 140" preserveAspectRatio="none">
              {refMin !== null && refMax !== null && (
                <rect x="0" y={`${getY(refMax)}%`} width="600" height={`${getY(refMin) - getY(refMax)}%`} fill="#dcfce7" opacity="0.5" />
              )}
              {yTicks.map((_, i) => (
                <line key={i} x1="0" y1={`${(100 * i) / 4}%`} x2="600" y2={`${(100 * i) / 4}%`} stroke="#e2e8f0" strokeWidth="1" />
              ))}
              {values.length > 1 && (
                <polyline
                  points={values.map((item, idx) => {
                    const x = (600 * idx) / (values.length - 1);
                    const y = (getY(item.value) / 100) * 140;
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                />
              )}
              {values.map((item, idx) => {
                const x = values.length === 1 ? 300 : (600 * idx) / (values.length - 1);
                const y = (getY(item.value) / 100) * 140;
                const col = getColor(item.flag);
                const hov = hoveredPoint === idx;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r={hov ? "8" : "6"} fill={col} stroke="white" strokeWidth="2"
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)} />
                  </g>
                );
              })}
            </svg>
            {hoveredPoint !== null && (
              <div
                className="absolute z-50 bg-slate-900 text-white px-2.5 py-1.5 rounded-md shadow-xl text-xs pointer-events-none whitespace-nowrap"
                style={{ left: `${(hoveredPoint / (values.length - 1)) * 100}%`, bottom: "110%", transform: "translateX(-50%)" }}
              >
                <div className="text-slate-300 text-[10px]">
                  {new Date(values[hoveredPoint].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="font-bold">{values[hoveredPoint].value.toFixed(2)}</div>
                {values[hoveredPoint].flag && <div className="text-amber-300 text-[10px]">{values[hoveredPoint].flag}</div>}
              </div>
            )}
          </div>
          <div className="relative mt-1 h-8">
            {values.map((item, idx) => (
              <div
                key={idx}
                className="absolute text-[10px] text-slate-500 text-center"
                style={{ left: `${values.length === 1 ? 50 : (100 * idx) / (values.length - 1)}%`, transform: "translateX(-50%)" }}
              >
                {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * MANUAL ENTRY MODAL
 * ------------------------------------------------------------------ */

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (record: BloodWorkRecord) => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ onClose, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState("");
  const [labValues, setLabValues] = useState<LabValue[]>([{ name: "", value: "", unit: "" }]);

  const addLabValue = () => setLabValues([...labValues, { name: "", value: "", unit: "" }]);
  const updateLabValue = (index: number, field: keyof LabValue, value: string) => {
    const updated = [...labValues];
    updated[index] = { ...updated[index], [field]: value };
    setLabValues(updated);
  };
  const removeLabValue = (index: number) => setLabValues(labValues.filter((_, i) => i !== index));

  const handleSave = () => {
    const validValues = labValues.filter((v) => v.name && v.value && v.unit);
    if (validValues.length === 0) { alert("Please add at least one lab value"); return; }
    onSave({
      id: generateId(),
      date,
      labName: labName || undefined,
      sourceType: "manual",
      labValues: validValues,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Manual Blood Work Entry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lab Name (optional)</label>
            <input type="text" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g., LifeLabs"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Lab Values</label>
              <button onClick={addLabValue} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {labValues.map((value, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input type="text" placeholder="Test name" value={value.name} onChange={(e) => updateLabValue(index, "name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  <input type="text" placeholder="Value" value={value.value} onChange={(e) => updateLabValue(index, "value", e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  <input type="text" placeholder="Unit" value={value.unit} onChange={(e) => updateLabValue(index, "unit", e.target.value)}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  {labValues.length > 1 && (
                    <button onClick={() => removeLabValue(index)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * PERSONAL PROFILE MODAL
 * ------------------------------------------------------------------ */

interface PersonalProfileModalProps {
  profile?: PersonalProfile;
  onClose: () => void;
  onSave: (profile: PersonalProfile) => void;
}

const PersonalProfileModal: React.FC<PersonalProfileModalProps> = ({ profile, onClose, onSave }) => {
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || "");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">(profile?.sex || "");
  const [weight, setWeight] = useState(profile?.weight?.toString() || "");
  const [height, setHeight] = useState(profile?.height?.toString() || "");

  const age = dateOfBirth ? (() => {
    const b = new Date(dateOfBirth), t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  })() : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
              <User size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Personal Profile</h2>
              <p className="text-xs text-slate-500">Used to personalize reference ranges</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            {age !== null && <p className="mt-1 text-xs text-slate-400">Age: {age}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Biological Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weight (lbs)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="154" step="0.1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            {weight && <p className="mt-1 text-xs text-slate-400">{(parseFloat(weight) / 2.20462).toFixed(1)} kg</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" step="0.1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            {height && (
              <p className="mt-1 text-xs text-slate-400">
                {Math.floor(parseFloat(height) / 2.54 / 12)}'{Math.round((parseFloat(height) / 2.54) % 12)}"
              </p>
            )}
          </div>
          {weight && height && (
            <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-xs text-slate-500">BMI: </span>
              <span className="text-sm font-semibold text-slate-900">
                {((parseFloat(weight) / 2.20462) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 ml-1">kg/m²</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-white">Cancel</button>
          <button
            onClick={() => onSave({ dateOfBirth: dateOfBirth || undefined, sex: sex || undefined, weight: weight ? parseFloat(weight) : undefined, height: height ? parseFloat(height) : undefined })}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};
