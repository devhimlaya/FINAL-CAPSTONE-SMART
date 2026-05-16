import React from "react";
import { Button } from "@/components/ui/button";

interface AssessmentTaskMeta {
  description: string;
  date: string;
}

interface AssessmentHeaderProps {
  showAssessmentDetails: boolean;
  metaEditorTop: number;
  assessmentDetailsTop: number;
  assessmentDetailsRef: React.RefObject<HTMLDivElement | null>;
  metaEditorRef: React.RefObject<HTMLDivElement | null>;
  wwCount: number;
  ptCount: number;
  wwMeta: AssessmentTaskMeta[];
  ptMeta: AssessmentTaskMeta[];
  qaMeta: { description: string; date: string };
  setWwMeta: React.Dispatch<React.SetStateAction<AssessmentTaskMeta[]>>;
  setPtMeta: React.Dispatch<React.SetStateAction<AssessmentTaskMeta[]>>;
  setQaMeta: React.Dispatch<React.SetStateAction<{ description: string; date: string }>>;
  saveAssessmentDetails: () => void;
  savingMeta: boolean;
  metaEditorTarget: { category: "WW" | "PT" | "QA"; index: number } | null;
  metaEditorDraft: { description: string; date: string };
  setMetaEditorDraft: React.Dispatch<React.SetStateAction<{ description: string; date: string }>>;
  setMetaEditorTarget: React.Dispatch<React.SetStateAction<{ category: "WW" | "PT" | "QA"; index: number } | null>>;
  saveColumnMeta: () => void;
}

export function AssessmentHeader({
  showAssessmentDetails,
  metaEditorTop,
  assessmentDetailsTop,
  assessmentDetailsRef,
  metaEditorRef,
  wwCount,
  ptCount,
  wwMeta,
  ptMeta,
  qaMeta,
  setWwMeta,
  setPtMeta,
  setQaMeta,
  saveAssessmentDetails,
  savingMeta,
  metaEditorTarget,
  metaEditorDraft,
  setMetaEditorDraft,
  setMetaEditorTarget,
  saveColumnMeta,
}: AssessmentHeaderProps) {
  return (
    <>
      {metaEditorTarget && (
        <div
          ref={metaEditorRef}
          className="bg-white sticky z-40 w-full"
          style={{ top: metaEditorTop }}
        >
          <div className="mx-8 pb-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  {metaEditorTarget.category} {metaEditorTarget.category === "QA" ? "" : metaEditorTarget.index + 1} Description (Optional)
                </p>
                <input
                  type="text"
                  value={metaEditorDraft.description}
                  onChange={(e) => setMetaEditorDraft((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={`${metaEditorTarget.category} description`}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Column Date (Applies To All Students)</p>
                <input
                  type="date"
                  value={metaEditorDraft.date}
                  onChange={(e) => setMetaEditorDraft((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg text-xs font-bold"
                onClick={() => setMetaEditorTarget(null)}
                disabled={savingMeta}
              >
                Close
              </Button>
              <Button
                className="h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: "var(--theme-primary)", color: "var(--theme-primary-text)" }}
                onClick={saveColumnMeta}
                disabled={savingMeta}
              >
                {savingMeta ? "Applying..." : "Apply"}
              </Button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssessmentDetails && (
        <div
          ref={assessmentDetailsRef}
          className="bg-white sticky z-40 w-full"
          style={{ top: assessmentDetailsTop }}
        >
          <div className="mx-8 pb-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white border border-indigo-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">Written Work (Optional)</p>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">WW 1 Date</label>
              <input
                type="date"
                value={wwMeta[0]?.date || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setWwMeta((prev) => {
                    const next = [...prev];
                    while (next.length < wwCount) next.push({ description: `WW ${next.length + 1}`, date: "" });
                    next[0] = { ...(next[0] || { description: "WW 1", date: "" }), date: val };
                    return next;
                  });
                }}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
              />
              {Array.from({ length: wwCount }).map((_, i) => (
                <input
                  key={`ww-meta-${i}`}
                  type="text"
                  value={wwMeta[i]?.description || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWwMeta((prev) => {
                      const next = [...prev];
                      while (next.length <= i) next.push({ description: `WW ${next.length + 1}`, date: next[0]?.date || "" });
                      next[i] = { ...next[i], description: val };
                      return next;
                    });
                  }}
                  placeholder={`WW ${i + 1} description`}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
                />
              ))}
            </div>

            <div className="rounded-xl bg-white border border-purple-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-3">Performance Tasks (Optional)</p>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PT 1 Date</label>
              <input
                type="date"
                value={ptMeta[0]?.date || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setPtMeta((prev) => {
                    const next = [...prev];
                    while (next.length < ptCount) next.push({ description: `PT ${next.length + 1}`, date: "" });
                    next[0] = { ...(next[0] || { description: "PT 1", date: "" }), date: val };
                    return next;
                  });
                }}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
              />
              {Array.from({ length: ptCount }).map((_, i) => (
                <input
                  key={`pt-meta-${i}`}
                  type="text"
                  value={ptMeta[i]?.description || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPtMeta((prev) => {
                      const next = [...prev];
                      while (next.length <= i) next.push({ description: `PT ${next.length + 1}`, date: next[0]?.date || "" });
                      next[i] = { ...next[i], description: val };
                      return next;
                    });
                  }}
                  placeholder={`PT ${i + 1} description`}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
                />
              ))}
            </div>

            <div className="rounded-xl bg-white border border-amber-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">Quarterly Assessment (Optional)</p>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">QA Date</label>
              <input
                type="date"
                value={qaMeta.date}
                onChange={(e) => setQaMeta((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
              />
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">QA Description</label>
              <input
                type="text"
                value={qaMeta.description}
                onChange={(e) => setQaMeta((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="QA Description"
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
              />
              <Button
                onClick={saveAssessmentDetails}
                className="w-full h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                style={{ backgroundColor: "var(--theme-primary)", color: "var(--theme-primary-text)" }}
              >
                Save Details
              </Button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
