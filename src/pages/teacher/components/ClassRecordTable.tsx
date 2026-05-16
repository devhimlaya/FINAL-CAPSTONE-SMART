import React from "react";
import { Plus, Minus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassAssignment, ClassRecord, ScoreItem } from "@/lib/api";

const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;

function getGradeColor(grade: number | null): string {
  if (grade === null) return "text-slate-300";
  if (grade >= 90) return "text-emerald-600";
  if (grade >= 85) return "text-blue-600";
  if (grade >= 80) return "text-amber-600";
  if (grade >= 75) return "text-orange-600";
  return "text-rose-600";
}

function transmuteGrade(initialGrade: number): number {
  const transmutationTable: [number, number, number][] = [
    [100, 100, 100],
    [98.4, 99.99, 99],
    [96.8, 98.39, 98],
    [95.2, 96.79, 97],
    [93.6, 95.19, 96],
    [92, 93.59, 95],
    [90.4, 91.99, 94],
    [88.8, 90.39, 93],
    [87.2, 88.79, 92],
    [85.6, 87.19, 91],
    [84, 85.59, 90],
    [82.4, 83.99, 89],
    [80.8, 82.39, 88],
    [79.2, 80.79, 87],
    [77.6, 79.19, 86],
    [76, 77.59, 85],
    [74.4, 75.99, 84],
    [72.8, 74.39, 83],
    [71.2, 72.79, 82],
    [69.6, 71.19, 81],
    [68, 69.59, 80],
    [66.4, 67.99, 79],
    [64.8, 66.39, 78],
    [63.2, 64.79, 77],
    [61.6, 63.19, 76],
    [60, 61.59, 75],
    [56, 59.99, 74],
    [52, 55.99, 73],
    [48, 51.99, 72],
    [44, 47.99, 71],
    [40, 43.99, 70],
    [36, 39.99, 69],
    [32, 35.99, 68],
    [28, 31.99, 67],
    [24, 27.99, 66],
    [20, 23.99, 65],
    [16, 19.99, 64],
    [12, 15.99, 63],
    [8, 11.99, 62],
    [4, 7.99, 61],
    [0, 3.99, 60],
  ];

  for (const [min, max, grade] of transmutationTable) {
    if (initialGrade >= min && initialGrade <= max) {
      return grade;
    }
  }

  return Math.round(Math.max(60, Math.min(100, initialGrade)));
}

interface LedgerRowProps {
  record: ClassRecord | null;
  idx: number;
  rowIndex: number;
  isHps?: boolean;
  hpsStickyTop?: number;
  hpsData?: { wwScores: ScoreItem[]; ptScores: ScoreItem[]; qaMax: number };
  selectedQuarter: string;
  wwCount: number;
  ptCount: number;
  weights: { ww: number; pt: number; qa: number };
  onHpsUpdate: (cat: "WW" | "PT" | "QA", idx: number, val: number) => void;
  onScoreCommit: (inputEl: HTMLInputElement, sid: string, cat: "WW" | "PT" | "QA", idx: number) => boolean;
  onCellFocus: (cat: "WW" | "PT" | "QA", idx: number) => void;
  isCellInvalid: (sid: string, cat: "WW" | "PT" | "QA", idx: number) => boolean;
}

const LedgerRow = React.memo(
  ({
    record,
    idx,
    rowIndex,
    isHps = false,
    hpsStickyTop,
    hpsData,
    selectedQuarter,
    wwCount,
    ptCount,
    weights,
    onHpsUpdate,
    onScoreCommit,
    onCellFocus,
    isCellInvalid,
  }: LedgerRowProps) => {
    const studentId = record?.student.id || "HPS";
    const grade = record?.grades?.find((g) => g.quarter === selectedQuarter);

    const wwScores = isHps ? hpsData?.wwScores || [] : ((grade?.writtenWorkScores || []) as ScoreItem[]);
    const ptScores = isHps ? hpsData?.ptScores || [] : ((grade?.perfTaskScores || []) as ScoreItem[]);

    const formatNum = (val: number | undefined | null, fallback = "-") => {
      if (val === undefined || val === null) return fallback;
      return Number(val).toFixed(1);
    };

    const calcTotal = (scores: ScoreItem[]) => scores.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    const calcMax = (scores: ScoreItem[]) => scores.reduce((acc, curr) => acc + (Number(curr.maxScore) || 0), 0);
    const calcPS = (total: number, max: number) => (max > 0 ? (total / max) * 100 : 0);

    const wwTotal = calcTotal(wwScores);
    const wwMaxTotal = calcMax(wwScores);
    const displayWWPS = grade?.writtenWorkPS ?? (wwMaxTotal > 0 ? calcPS(wwTotal, wwMaxTotal) : null);
    const displayWWWS = displayWWPS !== null ? displayWWPS * (weights.ww / 100) : null;

    const ptTotal = calcTotal(ptScores);
    const ptMaxTotal = calcMax(ptScores);
    const displayPTPS = grade?.perfTaskPS ?? (ptMaxTotal > 0 ? calcPS(ptTotal, ptMaxTotal) : null);
    const displayPTWS = displayPTPS !== null ? displayPTPS * (weights.pt / 100) : null;

    const qaScore = Number(grade?.quarterlyAssessScore) || 0;
    const qaMax = isHps ? hpsData?.qaMax ?? 100 : Number(grade?.quarterlyAssessMax) || 100;
    const displayQAPS = grade?.quarterlyAssessPS ?? (qaMax > 0 ? calcPS(qaScore, qaMax) : null);
    const displayQAWS = displayQAPS !== null ? displayQAPS * (weights.qa / 100) : null;

    const computedInitialGrade =
      displayWWWS !== null && displayPTWS !== null && displayQAWS !== null ? displayWWWS + displayPTWS + displayQAWS : null;
    const displayInitialGrade = grade?.initialGrade ?? computedInitialGrade;
    const displayQuarterlyGrade =
      grade?.quarterlyGrade ?? (displayInitialGrade !== null ? transmuteGrade(displayInitialGrade) : null);

    const cellClass = "text-center text-[10px] font-bold border-r border-slate-100 p-0 h-10";
    const inputClass =
      "w-full h-full bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-inset focus:ring-indigo-500/30 outline-none transition-all px-1 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
      <TableRow
        className={
          isHps
            ? "bg-slate-800 text-white shadow-lg h-10 hover:bg-slate-800 transition-none"
            : "hover:bg-indigo-50/10 transition-all group h-10"
        }
      >
        <TableCell
          className={`text-center font-bold text-[9px] border-r border-b border-slate-100 ${
            isHps
              ? "text-indigo-300 sticky z-20 bg-slate-800 border-y border-l border-slate-700 bg-clip-padding"
              : "text-slate-300"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "MAX" : idx + 1}
        </TableCell>
        <TableCell
          className={`font-mono text-[9px] font-medium border-r border-b border-slate-100 px-3 truncate ${
            isHps ? "text-slate-500 sticky z-20 bg-slate-800 border-y border-slate-700 bg-clip-padding" : "text-slate-400"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "-" : record?.student.lrn}
        </TableCell>
        <TableCell
          className={`border-r border-b border-slate-200 px-3 min-w-[200px] ${
            isHps ? "sticky z-20 bg-slate-800 border-y border-slate-700 bg-clip-padding" : ""
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          <p className={`font-bold text-[10px] tracking-tight uppercase truncate ${isHps ? "text-indigo-300" : "text-slate-700"}`}>
            {isHps ? "HIGHEST POSSIBLE SCORE" : `${record?.student.lastName}, ${record?.student.firstName}`}
          </p>
        </TableCell>

        {Array.from({ length: wwCount }).map((_, i) => (
          <TableCell
            key={`ww-${i}`}
            className={`${cellClass} border-b border-slate-100 ${isHps ? "sticky z-20 bg-slate-800 border-y border-slate-700 bg-clip-padding" : ""}`}
            style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
          >
            {(() => {
              const invalid = !isHps && isCellInvalid(studentId, "WW", i);
              return (
                <input
                  type="number"
                  inputMode="decimal"
                  defaultValue={isHps ? wwScores[i]?.maxScore || 0 : wwScores[i]?.score || ""}
                  placeholder="0"
                  className={`${inputClass} ${isHps ? "text-indigo-300 font-black" : "text-slate-600"} ${
                    invalid ? "ring-1 ring-inset ring-rose-500 bg-rose-50/40 text-rose-700" : ""
                  }`}
                  onFocus={(e) => {
                    onCellFocus("WW", i);
                    e.currentTarget.select();
                    e.currentTarget.dataset.prev = e.currentTarget.value;
                  }}
                  onBlur={(e) => {
                    if (isHps) {
                      const val = e.currentTarget.value === "" ? 0 : Number(e.currentTarget.value);
                      onHpsUpdate("WW", i, val);
                    } else {
                      onScoreCommit(e.currentTarget, studentId, "WW", i);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || isHps) return;
                    e.preventDefault();
                    const didSave = onScoreCommit(e.currentTarget, studentId, "WW", i);
                    if (!didSave) return;
                    const nextInput = document.querySelector<HTMLInputElement>(
                      `[data-row-index="${rowIndex + 1}"][data-cat="WW"][data-col="${i}"]`
                    );
                    nextInput?.focus();
                  }}
                  data-row-index={isHps ? -1 : rowIndex}
                  data-cat="WW"
                  data-col={i}
                />
              );
            })()}
          </TableCell>
        ))}
        <TableCell
          className={`text-center text-[10px] font-black border-r border-b border-slate-100 ${
            isHps ? "bg-slate-700 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-slate-50/50 text-slate-500"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? wwMaxTotal : wwTotal}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-indigo-600 border-r border-b border-slate-100 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-indigo-50/5"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "100.0" : formatNum(displayWWPS)}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-indigo-700 border-r border-b border-slate-200 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-indigo-50/10"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? weights.ww.toFixed(1) : formatNum(displayWWWS)}
        </TableCell>

        {Array.from({ length: ptCount }).map((_, i) => (
          <TableCell
            key={`pt-${i}`}
            className={`${cellClass} border-b border-slate-100 ${isHps ? "sticky z-20 bg-slate-800 border-y border-slate-700 bg-clip-padding" : ""}`}
            style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
          >
            {(() => {
              const invalid = !isHps && isCellInvalid(studentId, "PT", i);
              return (
                <input
                  type="number"
                  inputMode="decimal"
                  defaultValue={isHps ? ptScores[i]?.maxScore || 0 : ptScores[i]?.score || ""}
                  placeholder="0"
                  className={`${inputClass} ${isHps ? "text-purple-300 font-black" : "text-slate-600"} ${
                    invalid ? "ring-1 ring-inset ring-rose-500 bg-rose-50/40 text-rose-700" : ""
                  }`}
                  onFocus={(e) => {
                    onCellFocus("PT", i);
                    e.currentTarget.select();
                    e.currentTarget.dataset.prev = e.currentTarget.value;
                  }}
                  onBlur={(e) => {
                    if (isHps) {
                      const val = e.currentTarget.value === "" ? 0 : Number(e.currentTarget.value);
                      onHpsUpdate("PT", i, val);
                    } else {
                      onScoreCommit(e.currentTarget, studentId, "PT", i);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || isHps) return;
                    e.preventDefault();
                    const didSave = onScoreCommit(e.currentTarget, studentId, "PT", i);
                    if (!didSave) return;
                    const nextInput = document.querySelector<HTMLInputElement>(
                      `[data-row-index="${rowIndex + 1}"][data-cat="PT"][data-col="${i}"]`
                    );
                    nextInput?.focus();
                  }}
                  data-row-index={isHps ? -1 : rowIndex}
                  data-cat="PT"
                  data-col={i}
                />
              );
            })()}
          </TableCell>
        ))}
        <TableCell
          className={`text-center text-[10px] font-black border-r border-b border-slate-100 ${
            isHps ? "bg-slate-700 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-slate-50/50 text-slate-500"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? ptMaxTotal : ptTotal}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-purple-600 border-r border-b border-slate-100 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-purple-50/5"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "100.0" : formatNum(displayPTPS)}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-purple-700 border-r border-b border-slate-200 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-purple-50/10"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? weights.pt.toFixed(1) : formatNum(displayPTWS)}
        </TableCell>

        <TableCell
          className={`${cellClass} border-b border-slate-100 ${isHps ? "sticky z-20 bg-slate-800 border-y border-slate-700 bg-clip-padding" : ""}`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {(() => {
            const invalid = !isHps && isCellInvalid(studentId, "QA", 0);
            return (
              <input
                type="number"
                inputMode="decimal"
                defaultValue={isHps ? qaMax : grade?.quarterlyAssessScore || ""}
                placeholder="0"
                className={`${inputClass} ${isHps ? "text-amber-300 font-black" : "text-amber-600"} ${
                  invalid ? "ring-1 ring-inset ring-rose-500 bg-rose-50/40 text-rose-700" : ""
                }`}
                onFocus={(e) => {
                  onCellFocus("QA", 0);
                  e.currentTarget.select();
                  e.currentTarget.dataset.prev = e.currentTarget.value;
                }}
                onBlur={(e) => {
                  if (isHps) {
                    const val = e.currentTarget.value === "" ? 0 : Number(e.currentTarget.value);
                    onHpsUpdate("QA", 0, val);
                  } else {
                    onScoreCommit(e.currentTarget, studentId, "QA", 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || isHps) return;
                  e.preventDefault();
                  const didSave = onScoreCommit(e.currentTarget, studentId, "QA", 0);
                  if (!didSave) return;
                  const nextInput = document.querySelector<HTMLInputElement>(
                    `[data-row-index="${rowIndex + 1}"][data-cat="QA"][data-col="0"]`
                  );
                  nextInput?.focus();
                }}
                data-row-index={isHps ? -1 : rowIndex}
                data-cat="QA"
                data-col={0}
              />
            );
          })()}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-amber-600 border-r border-b border-slate-100 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-amber-50/10"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "100.0" : formatNum(displayQAPS)}
        </TableCell>
        <TableCell
          className={`text-center font-black text-[10px] text-amber-700 border-r border-b border-slate-200 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-amber-50/20"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? weights.qa.toFixed(1) : formatNum(displayQAWS)}
        </TableCell>

        <TableCell
          className={`text-center font-black text-[10px] text-emerald-600 border-r border-b border-slate-100 ${
            isHps ? "bg-slate-800 sticky z-20 border-y border-slate-700 bg-clip-padding" : "bg-emerald-50/10"
          }`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "100.0" : formatNum(displayInitialGrade)}
        </TableCell>
        <TableCell
          className={`text-center font-black text-xs border-b border-slate-100 ${
            isHps
              ? "text-white bg-slate-800 sticky z-20 border-y border-r border-slate-700 bg-clip-padding"
              : "bg-emerald-100/30"
          } ${!isHps ? getGradeColor(displayQuarterlyGrade) : ""}`}
          style={isHps ? { top: hpsStickyTop ?? 0 } : undefined}
        >
          {isHps ? "100" : displayQuarterlyGrade ?? <span className="text-slate-300">-</span>}
        </TableCell>
      </TableRow>
    );
  }
);

LedgerRow.displayName = "LedgerRow";

interface ClassRecordTableProps {
  classAssignment: ClassAssignment;
  effectiveWeights: {
    ww: number;
    pt: number;
    qa: number;
  } | null;
  selectedQuarter: string;
  onQuarterChange: (quarter: string) => void;
  separateByGender: boolean;
  onSeparateByGenderChange: (value: boolean) => void;
  showAssessmentDetails: boolean;
  onToggleAssessmentDetails: () => void;
  ledgerHeaderRef: React.RefObject<HTMLDivElement | null>;
  topNavHeight: number;
  headerTop: number;
  subHeaderTop: number;
  hpsTop: number;
  wwCount: number;
  ptCount: number;
  hpsData: { wwScores: ScoreItem[]; ptScores: ScoreItem[]; qaMax: number };
  sortedRecords: ClassRecord[];
  maleRecords: ClassRecord[];
  femaleRecords: ClassRecord[];
  onRemoveTask: (category: "WW" | "PT") => void;
  onAddTask: (category: "WW" | "PT") => void;
  onHpsUpdate: (cat: "WW" | "PT" | "QA", idx: number, val: number) => void;
  onScoreCommit: (inputEl: HTMLInputElement, sid: string, cat: "WW" | "PT" | "QA", idx: number) => boolean;
  onCellFocus: (cat: "WW" | "PT" | "QA", idx: number) => void;
  isCellInvalid: (sid: string, cat: "WW" | "PT" | "QA", idx: number) => boolean;
  assessmentHeaderNode?: React.ReactNode;
}

export function ClassRecordTable({
  classAssignment,
  effectiveWeights,
  selectedQuarter,
  onQuarterChange,
  separateByGender,
  onSeparateByGenderChange,
  showAssessmentDetails,
  onToggleAssessmentDetails,
  ledgerHeaderRef,
  topNavHeight,
  headerTop,
  subHeaderTop,
  hpsTop,
  wwCount,
  ptCount,
  hpsData,
  sortedRecords,
  maleRecords,
  femaleRecords,
  onRemoveTask,
  onAddTask,
  onHpsUpdate,
  onScoreCommit,
  onCellFocus,
  isCellInvalid,
  assessmentHeaderNode,
}: ClassRecordTableProps) {
  return (
    <Card className="hidden lg:block border-0 shadow-2xl shadow-slate-200/40 overflow-visible bg-white">
      <div ref={ledgerHeaderRef} className="sticky z-40 bg-white" style={{ top: topNavHeight }}>
        <CardHeader className="p-8 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Class Ledger</h2>
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
              <Button
                variant="ghost"
                onClick={() => onSeparateByGenderChange(false)}
                className={`h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  !separateByGender ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Alphabetical
              </Button>
              <Button
                variant="ghost"
                onClick={() => onSeparateByGenderChange(true)}
                className={`h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  separateByGender ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Gendered
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className={`h-11 rounded-xl border-slate-200 font-bold ${
                showAssessmentDetails ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-slate-600"
              }`}
              onClick={onToggleAssessmentDetails}
            >
              Optional Assessment Details
            </Button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
            <Select value={selectedQuarter} onValueChange={(val) => val && onQuarterChange(val)}>
              <SelectTrigger className="h-11 w-40 bg-white border-slate-200 text-sm font-black uppercase rounded-xl shadow-sm px-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-2">
                {quarters.map((q) => (
                  <SelectItem
                    key={q}
                    value={q}
                    className="text-xs font-black uppercase rounded-lg py-2.5 px-4 focus:bg-indigo-50 focus:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </div>

      {assessmentHeaderNode}

      <div className="relative overflow-visible border-t border-slate-100">
        <Table className="border-separate border-spacing-0 table-fixed w-max min-w-full">
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-0 bg-slate-50 h-10 transition-none">
              <TableHead
                colSpan={3}
                className="border-l border-r border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-0 w-[400px] bg-slate-50 sticky z-30 bg-clip-padding"
                style={{ top: headerTop }}
              >
                LEARNER INFORMATION
              </TableHead>
              <TableHead
                colSpan={wwCount + 3}
                className="border-r border-b border-slate-200 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center px-0 bg-indigo-50 sticky z-30 bg-clip-padding"
                style={{ top: headerTop }}
              >
                <div className="flex items-center justify-center gap-3">
                  WRITTEN WORK ({effectiveWeights?.ww ?? classAssignment.subject.writtenWorkWeight}%)
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={wwCount <= 1}
                    className="w-6 h-6 rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => onRemoveTask("WW")}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                    onClick={() => onAddTask("WW")}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </TableHead>
              <TableHead
                colSpan={ptCount + 3}
                className="border-r border-b border-slate-200 text-[10px] font-black text-purple-600 uppercase tracking-widest text-center px-0 bg-purple-50 sticky z-30 bg-clip-padding"
                style={{ top: headerTop }}
              >
                <div className="flex items-center justify-center gap-3">
                  PERF. TASKS ({effectiveWeights?.pt ?? classAssignment.subject.perfTaskWeight}%)
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={ptCount <= 1}
                    className="w-6 h-6 rounded-full bg-white text-purple-600 shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => onRemoveTask("PT")}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-full bg-white text-purple-600 shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white transition-all"
                    onClick={() => onAddTask("PT")}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </TableHead>
              <TableHead
                colSpan={3}
                className="border-r border-b border-slate-200 text-[10px] font-black text-amber-600 uppercase tracking-widest text-center px-0 bg-amber-50 sticky z-30 bg-clip-padding"
                style={{ top: headerTop }}
              >
                QA ({effectiveWeights?.qa ?? classAssignment.subject.quarterlyAssessWeight}%)
              </TableHead>
              <TableHead
                colSpan={2}
                className="border-r border-b border-slate-200 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center px-0 bg-emerald-50 sticky z-30 bg-clip-padding"
                style={{ top: headerTop }}
              >
                Summary
              </TableHead>
            </TableRow>

            <TableRow className="hover:bg-transparent border-0 h-10 bg-white transition-none">
              <TableHead
                className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-l border-r border-b border-slate-100 bg-white sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                #
              </TableHead>
              <TableHead
                className="w-28 text-[9px] font-black text-slate-400 uppercase border-r border-b border-slate-100 px-3 bg-white sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                LRN
              </TableHead>
              <TableHead
                className="w-56 text-[9px] font-black text-slate-400 uppercase border-r border-b border-slate-200 px-3 bg-white sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                Full Name
              </TableHead>

              {Array.from({ length: wwCount }).map((_, i) => (
                <TableHead
                  key={`h-ww-${i}`}
                  className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-r border-b border-slate-100 bg-white sticky z-30 bg-clip-padding"
                  style={{ top: subHeaderTop }}
                >
                  {i + 1}
                </TableHead>
              ))}
              <TableHead
                className="w-12 text-center text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-100 bg-slate-100 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                Total
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-indigo-600 uppercase border-r border-b border-slate-100 bg-indigo-50 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                PS
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-indigo-700 uppercase border-r border-b border-slate-200 bg-indigo-100 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                WS
              </TableHead>

              {Array.from({ length: ptCount }).map((_, i) => (
                <TableHead
                  key={`h-pt-${i}`}
                  className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-r border-b border-slate-100 bg-white sticky z-30 bg-clip-padding"
                  style={{ top: subHeaderTop }}
                >
                  {i + 1}
                </TableHead>
              ))}
              <TableHead
                className="w-12 text-center text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-100 bg-slate-100 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                Total
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-purple-600 uppercase border-r border-b border-slate-100 bg-purple-50 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                PS
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-purple-700 uppercase border-r border-b border-slate-200 bg-purple-100 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                WS
              </TableHead>

              <TableHead
                className="w-14 text-center text-[9px] font-black text-amber-600 uppercase border-r border-b border-slate-100 bg-amber-50 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                SCORE
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-amber-600 uppercase border-r border-b border-slate-100 bg-amber-50 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                PS
              </TableHead>
              <TableHead
                className="w-12 text-center text-[9px] font-black text-amber-700 uppercase border-r border-b border-slate-200 bg-amber-100 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                WS
              </TableHead>

              <TableHead
                className="w-16 text-center text-[9px] font-black text-emerald-600 uppercase border-r border-b border-slate-100 bg-emerald-50 sticky z-30 bg-clip-padding"
                style={{ top: subHeaderTop }}
              >
                INITIAL
              </TableHead>
              <TableHead
                className="w-16 text-center text-[9px] font-black text-slate-900 uppercase bg-emerald-100 font-bold sticky z-30 bg-clip-padding border-r border-b border-slate-200"
                style={{ top: subHeaderTop }}
              >
                FINAL
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {(() => {
              const weights = {
                ww: effectiveWeights?.ww ?? classAssignment.subject.writtenWorkWeight,
                pt: effectiveWeights?.pt ?? classAssignment.subject.perfTaskWeight,
                qa: effectiveWeights?.qa ?? classAssignment.subject.quarterlyAssessWeight,
              };

              const rows: React.ReactNode[] = [];
              let rowCounter = 0;

              rows.push(
                <LedgerRow
                  key="HPS-ROW"
                  record={null}
                  idx={0}
                  rowIndex={-1}
                  isHps
                  hpsStickyTop={hpsTop}
                  hpsData={hpsData}
                  selectedQuarter={selectedQuarter}
                  wwCount={wwCount}
                  ptCount={ptCount}
                  weights={weights}
                  onHpsUpdate={onHpsUpdate}
                  onScoreCommit={onScoreCommit}
                  onCellFocus={onCellFocus}
                  isCellInvalid={isCellInvalid}
                />
              );

              if (separateByGender) {
                if (maleRecords.length > 0) {
                  rows.push(
                    <TableRow key="male-sep" className="bg-blue-50/50 hover:bg-blue-50/50 border-y border-blue-100/50 h-8">
                      <TableCell colSpan={wwCount + ptCount + 14} className="py-1 px-8">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          MALE LEARNERS ({maleRecords.length})
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                  maleRecords.forEach((r, i) =>
                    rows.push(
                      <LedgerRow
                        key={r.student.id}
                        record={r}
                        idx={i}
                        rowIndex={rowCounter++}
                        selectedQuarter={selectedQuarter}
                        wwCount={wwCount}
                        ptCount={ptCount}
                        weights={weights}
                        onHpsUpdate={onHpsUpdate}
                        onScoreCommit={onScoreCommit}
                        onCellFocus={onCellFocus}
                        isCellInvalid={isCellInvalid}
                      />
                    )
                  );
                }
                if (femaleRecords.length > 0) {
                  rows.push(
                    <TableRow key="female-sep" className="bg-pink-50/50 hover:bg-pink-50/50 border-y border-pink-100/50 h-8">
                      <TableCell colSpan={wwCount + ptCount + 14} className="py-1 px-8">
                        <span className="text-[9px] font-black text-pink-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                          FEMALE LEARNERS ({femaleRecords.length})
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                  femaleRecords.forEach((r, i) =>
                    rows.push(
                      <LedgerRow
                        key={r.student.id}
                        record={r}
                        idx={i}
                        rowIndex={rowCounter++}
                        selectedQuarter={selectedQuarter}
                        wwCount={wwCount}
                        ptCount={ptCount}
                        weights={weights}
                        onHpsUpdate={onHpsUpdate}
                        onScoreCommit={onScoreCommit}
                        onCellFocus={onCellFocus}
                        isCellInvalid={isCellInvalid}
                      />
                    )
                  );
                }
              } else {
                sortedRecords.forEach((r, i) =>
                  rows.push(
                    <LedgerRow
                      key={r.student.id}
                      record={r}
                      idx={i}
                      rowIndex={rowCounter++}
                      selectedQuarter={selectedQuarter}
                      wwCount={wwCount}
                      ptCount={ptCount}
                      weights={weights}
                      onHpsUpdate={onHpsUpdate}
                      onScoreCommit={onScoreCommit}
                      onCellFocus={onCellFocus}
                      isCellInvalid={isCellInvalid}
                    />
                  )
                );
              }

              return rows;
            })()}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
