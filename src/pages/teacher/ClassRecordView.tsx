import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Award,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  FileSpreadsheet,
  Upload,
  X,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  gradesApi,
  SERVER_URL,
  type ClassAssignment,
  type ClassRecord,
  type ScoreItem,
} from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";

const gradeLevelLabels: Record<string, string> = {
  GRADE_7: "Grade 7",
  GRADE_8: "Grade 8",
  GRADE_9: "Grade 9",
  GRADE_10: "Grade 10",
};

const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
const HG_DESCRIPTORS = [
  'No Improvement',
  'Needs Improvement',
  'Developing',
  'Sufficiently Developed',
] as const;

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

// ─── Optimized Ledger Row Component ───────────────────────────────────────

interface LedgerRowProps {
  record: ClassRecord | null;
  idx: number;
  isHps?: boolean;
  hpsData?: { wwScores: ScoreItem[]; ptScores: ScoreItem[]; qaMax: number };
  selectedQuarter: string;
  wwCount: number;
  ptCount: number;
  weights: { ww: number; pt: number; qa: number };
  onScoreUpdate: (sid: string, cat: 'WW' | 'PT' | 'QA', idx: number, val: number) => void;
  onHpsUpdate: (cat: 'WW' | 'PT' | 'QA', idx: number, val: number) => void;
}

interface AssessmentTaskMeta {
  description: string;
  date: string;
}

const LedgerRow = React.memo(({ 
  record, idx, isHps = false, hpsData, selectedQuarter, wwCount, ptCount, weights, onScoreUpdate, onHpsUpdate 
}: LedgerRowProps) => {
  const studentId = record?.student.id || "HPS";
  const grade = record?.grades?.find(g => g.quarter === selectedQuarter);
  
  const wwScores = isHps
    ? (hpsData?.wwScores || [])
    : ((grade?.writtenWorkScores || []) as ScoreItem[]);
  const ptScores = isHps
    ? (hpsData?.ptScores || [])
    : ((grade?.perfTaskScores || []) as ScoreItem[]);

  // Helper for safe number display
  const formatNum = (val: number | undefined | null, fallback = "—") => {
    if (val === undefined || val === null) return fallback;
    return Number(val).toFixed(1);
  };

  // Client-side calculation fallbacks for instant feedback and robustness
  const calcTotal = (scores: ScoreItem[]) => scores.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
  const calcMax = (scores: ScoreItem[]) => scores.reduce((acc, curr) => acc + (Number(curr.maxScore) || 0), 0);
  const calcPS = (total: number, max: number) => max > 0 ? (total / max) * 100 : 0;

  const wwTotal = calcTotal(wwScores);
  const wwMaxTotal = calcMax(wwScores);
  const displayWWPS = grade?.writtenWorkPS ?? (wwMaxTotal > 0 ? calcPS(wwTotal, wwMaxTotal) : null);
  const displayWWWS = displayWWPS !== null ? (displayWWPS * (weights.ww / 100)) : null;

  const ptTotal = calcTotal(ptScores);
  const ptMaxTotal = calcMax(ptScores);
  const displayPTPS = grade?.perfTaskPS ?? (ptMaxTotal > 0 ? calcPS(ptTotal, ptMaxTotal) : null);
  const displayPTWS = displayPTPS !== null ? (displayPTPS * (weights.pt / 100)) : null;

  const qaScore = Number(grade?.quarterlyAssessScore) || 0;
  const qaMax = isHps
    ? (hpsData?.qaMax ?? 100)
    : (Number(grade?.quarterlyAssessMax) || 100);
  const displayQAPS = grade?.quarterlyAssessPS ?? (qaMax > 0 ? calcPS(qaScore, qaMax) : null);
  const displayQAWS = displayQAPS !== null ? (displayQAPS * (weights.qa / 100)) : null;

  const computedInitialGrade =
    displayWWWS !== null && displayPTWS !== null && displayQAWS !== null
      ? displayWWWS + displayPTWS + displayQAWS
      : null;
  const displayInitialGrade = grade?.initialGrade ?? computedInitialGrade;
  const displayQuarterlyGrade =
    grade?.quarterlyGrade ??
    (displayInitialGrade !== null ? transmuteGrade(displayInitialGrade) : null);

  const cellClass = "text-center text-[10px] font-bold border-r border-slate-100 p-0 h-9";
  const inputClass = "w-full h-full bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-inset focus:ring-indigo-500/30 outline-none transition-all px-1 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <TableRow className={`${isHps ? 'bg-slate-800 text-white border-y border-slate-700 sticky top-0 z-20 shadow-lg' : 'hover:bg-indigo-50/10'} transition-all border-b border-slate-100 group h-9`}>
      <TableCell className={`text-center font-bold text-[9px] border-r border-slate-100 ${isHps ? 'text-indigo-300' : 'text-slate-300'}`}>{isHps ? "MAX" : idx + 1}</TableCell>
      <TableCell className={`font-mono text-[9px] font-medium border-r border-slate-100 px-3 truncate ${isHps ? 'text-slate-500' : 'text-slate-400'}`}>{isHps ? "—" : record?.student.lrn}</TableCell>
      <TableCell className="border-r border-slate-200 px-3 min-w-[200px]">
        <p className={`font-bold text-[10px] tracking-tight uppercase truncate ${isHps ? 'text-indigo-300' : 'text-slate-700'}`}>
          {isHps ? "HIGHEST POSSIBLE SCORE" : `${record?.student.lastName}, ${record?.student.firstName}`}
        </p>
      </TableCell>
      
      {/* WW Individual */}
      {Array.from({ length: wwCount }).map((_, i) => (
        <TableCell key={`ww-${i}`} className={cellClass}>
          <input 
            type="number"
            inputMode="decimal"
            defaultValue={isHps ? (wwScores[i]?.maxScore || 0) : (wwScores[i]?.score || '')}
            placeholder="0"
            className={`${inputClass} ${isHps ? 'text-indigo-300 font-black' : 'text-slate-600'}`}
            onBlur={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              if (isHps) onHpsUpdate('WW', i, val);
              else onScoreUpdate(studentId, 'WW', i, val);
            }}
          />
        </TableCell>
      ))}
      <TableCell className={`text-center text-[10px] font-black border-r border-slate-100 ${isHps ? 'bg-slate-700' : 'bg-slate-50/50 text-slate-500'}`}>
        {isHps ? wwMaxTotal : wwTotal}
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-indigo-600 border-r border-slate-100 bg-indigo-50/5">
        {isHps ? "100.0" : formatNum(displayWWPS)}
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-indigo-700 border-r border-slate-200 bg-indigo-50/10">
        {isHps ? weights.ww.toFixed(1) : formatNum(displayWWWS)}
      </TableCell>
      
      {/* PT Individual */}
      {Array.from({ length: ptCount }).map((_, i) => (
        <TableCell key={`pt-${i}`} className={cellClass}>
          <input 
            type="number"
            inputMode="decimal"
            defaultValue={isHps ? (ptScores[i]?.maxScore || 0) : (ptScores[i]?.score || '')}
            placeholder="0"
            className={`${inputClass} ${isHps ? 'text-purple-300 font-black' : 'text-slate-600'}`}
            onBlur={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              if (isHps) onHpsUpdate('PT', i, val);
              else onScoreUpdate(studentId, 'PT', i, val);
            }}
          />
        </TableCell>
      ))}
      <TableCell className={`text-center text-[10px] font-black border-r border-slate-100 ${isHps ? 'bg-slate-700' : 'bg-slate-50/50 text-slate-500'}`}>
        {isHps ? ptMaxTotal : ptTotal}
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-purple-600 border-r border-slate-100 bg-purple-50/5">
        {isHps ? "100.0" : formatNum(displayPTPS)}
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-purple-700 border-r border-slate-200 bg-purple-50/10">
        {isHps ? weights.pt.toFixed(1) : formatNum(displayPTWS)}
      </TableCell>
      
      {/* QA */}
      <TableCell className={cellClass}>
        <input 
          type="number"
          inputMode="decimal"
          defaultValue={isHps ? qaMax : (grade?.quarterlyAssessScore || '')}
          placeholder="0"
          className={`${inputClass} ${isHps ? 'text-amber-300 font-black' : 'text-amber-600'}`}
          onBlur={(e) => {
            const val = e.target.value === '' ? 0 : Number(e.target.value);
            if (isHps) onHpsUpdate('QA', 0, val);
            else onScoreUpdate(studentId, 'QA', 0, val);
          }}
        />
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-amber-600 border-r border-slate-100 bg-amber-50/10">
        {isHps ? "100.0" : formatNum(displayQAPS)}
      </TableCell>
      <TableCell className="text-center font-black text-[10px] text-amber-700 border-r border-slate-200 bg-amber-50/20">
        {isHps ? weights.qa.toFixed(1) : formatNum(displayQAWS)}
      </TableCell>
      
      {/* Summary */}
      <TableCell className="text-center font-black text-[10px] text-emerald-600 border-r border-slate-100 bg-emerald-50/10">
        {isHps ? "100.0" : formatNum(displayInitialGrade)}
      </TableCell>
      <TableCell className={`text-center font-black text-xs bg-emerald-100/30 ${isHps ? 'text-white' : getGradeColor(displayQuarterlyGrade)}`}>
        {isHps ? "100" : (displayQuarterlyGrade ?? <span className="text-slate-300">—</span>)}
      </TableCell>
    </TableRow>
  );
});

LedgerRow.displayName = "LedgerRow";

export default function ClassRecordView() {
  const { colors } = useTheme();
  const { classAssignmentId } = useParams();
  const [classAssignment, setClassAssignment] = useState<ClassAssignment | null>(null);
  const [classRecord, setClassRecord] = useState<ClassRecord[]>([]);
  const [effectiveWeights, setEffectiveWeights] = useState<{
    ww: number;
    pt: number;
    qa: number;
    source: "subject" | "generic-fallback";
    hasExactEcrTemplate: boolean;
  } | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");
  const [quarterInitialized, setQuarterInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingDescriptorStudentId, setSavingDescriptorStudentId] = useState<string | null>(null);
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);
  const [wwMeta, setWwMeta] = useState<AssessmentTaskMeta[]>([]);
  const [ptMeta, setPtMeta] = useState<AssessmentTaskMeta[]>([]);
  const [qaMeta, setQaMeta] = useState<{ description: string; date: string }>({ description: '', date: '' });

  const [separateByGender, setSeparateByGender] = useState(false);
  const ecrFileInputRef = useRef<HTMLInputElement>(null);
  const isHGClass = (classAssignment?.subject?.code ?? '').startsWith('HG');

  // Dynamic Column Counts
  const wwCount = useMemo(() => {
    let max = 1;
    classRecord.forEach(r => {
      const grade = r.grades.find(g => g.quarter === selectedQuarter);
      if (grade?.writtenWorkScores) max = Math.max(max, (grade.writtenWorkScores as any[]).length);
    });
    return max;
  }, [classRecord, selectedQuarter]);

  const ptCount = useMemo(() => {
    let max = 1;
    classRecord.forEach(r => {
      const grade = r.grades.find(g => g.quarter === selectedQuarter);
      if (grade?.perfTaskScores) max = Math.max(max, (grade.perfTaskScores as any[]).length);
    });
    return max;
  }, [classRecord, selectedQuarter]);

  const hpsData = useMemo(() => {
    const wwScores: ScoreItem[] = Array.from({ length: wwCount }, (_, i) => ({
      name: `WW ${i + 1}`,
      score: 0,
      maxScore: 0,
    }));
    const ptScores: ScoreItem[] = Array.from({ length: ptCount }, (_, i) => ({
      name: `PT ${i + 1}`,
      score: 0,
      maxScore: 0,
    }));

    let qaMax = 0;

    classRecord.forEach((record) => {
      const grade = record.grades.find((g) => g.quarter === selectedQuarter);
      if (!grade) return;

      const ww = (grade.writtenWorkScores || []) as ScoreItem[];
      const pt = (grade.perfTaskScores || []) as ScoreItem[];

      ww.forEach((item, i) => {
        if (i < wwScores.length) {
          wwScores[i].maxScore = Math.max(wwScores[i].maxScore || 0, Number(item.maxScore) || 0);
        }
      });

      pt.forEach((item, i) => {
        if (i < ptScores.length) {
          ptScores[i].maxScore = Math.max(ptScores[i].maxScore || 0, Number(item.maxScore) || 0);
        }
      });

      qaMax = Math.max(qaMax, Number(grade.quarterlyAssessMax) || 0);
    });

    return {
      wwScores,
      ptScores,
      qaMax: qaMax || 100,
    };
  }, [classRecord, selectedQuarter, wwCount, ptCount]);

  useEffect(() => {
    const gradeSamples = classRecord
      .map((record) => record.grades.find((g) => g.quarter === selectedQuarter))
      .filter(Boolean) as Array<any>;

    const wwSample = gradeSamples.find((g) => Array.isArray(g.writtenWorkScores) && g.writtenWorkScores.length > 0);
    const ptSample = gradeSamples.find((g) => Array.isArray(g.perfTaskScores) && g.perfTaskScores.length > 0);

    const wwSource = ((wwSample?.writtenWorkScores || []) as ScoreItem[]);
    const ptSource = ((ptSample?.perfTaskScores || []) as ScoreItem[]);

    setWwMeta((prev) =>
      Array.from({ length: wwCount }, (_, i) => ({
        description: prev[i]?.description || wwSource[i]?.description || wwSource[i]?.name || `WW ${i + 1}`,
        date: i === 0 ? (prev[0]?.date || wwSource[0]?.date || '') : (prev[0]?.date || wwSource[0]?.date || ''),
      }))
    );

    setPtMeta((prev) =>
      Array.from({ length: ptCount }, (_, i) => ({
        description: prev[i]?.description || ptSource[i]?.description || ptSource[i]?.name || `PT ${i + 1}`,
        date: i === 0 ? (prev[0]?.date || ptSource[0]?.date || '') : (prev[0]?.date || ptSource[0]?.date || ''),
      }))
    );

    setQaMeta((prev) => {
      const qaSample = gradeSamples.find((g) => g.qaDescription || g.qaDate);
      return {
        description: prev.description || qaSample?.qaDescription || '',
        date: prev.date || qaSample?.qaDate || '',
      };
    });
  }, [classRecord, selectedQuarter, wwCount, ptCount]);

  const applyMetaToScores = (
    scores: ScoreItem[],
    category: 'WW' | 'PT',
    minLength = 0,
  ): ScoreItem[] => {
    const meta = category === 'WW' ? wwMeta : ptMeta;
    const dateFromTopCell = meta[0]?.date || '';
    const targetLength = Math.max(scores.length, minLength);

    return Array.from({ length: targetLength }, (_, i) => {
      const existing = scores[i] || ({ score: 0, maxScore: 10 } as ScoreItem);
      const description = meta[i]?.description?.trim() || `${category} ${i + 1}`;
      return {
        ...existing,
        name: description,
        description,
        date: dateFromTopCell || undefined,
        maxScore: Number(existing.maxScore ?? 10),
        score: Number(existing.score ?? 0),
      };
    });
  };

  useEffect(() => {
    fetchClassRecord();
  }, [classAssignmentId, selectedQuarter]);

  useEffect(() => {
    if (classAssignmentId && !isHGClass) {
      fetchEcrStatus();
    }
  }, [classAssignmentId, isHGClass]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchClassRecord = async (silent = false) => {
    if (!classAssignmentId) return;
    try {
      if (!silent) setLoading(true);
      const response = await gradesApi.getClassRecord(classAssignmentId, selectedQuarter);

      // Align initial quarter to system current quarter to avoid saving/viewing grades in the wrong quarter.
      if (!quarterInitialized && response.data.currentQuarter) {
        setQuarterInitialized(true);
        if (response.data.currentQuarter !== selectedQuarter) {
          setSelectedQuarter(response.data.currentQuarter);
          return;
        }
      }

      setClassAssignment(response.data.classAssignment);
      setClassRecord(response.data.classRecord);
      setEffectiveWeights(response.data.effectiveWeights ?? null);
    } catch (err) {
      console.error("Failed to fetch class record:", err);
      if (!silent) setError("Failed to load class record");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEcrStatus = async () => {
    if (!classAssignmentId) return;
    try {
      await gradesApi.getEcrStatus(classAssignmentId);
    } catch (err) {
      console.error("Failed to fetch ECR status:", err);
    }
  };

  const handleEcrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleEcrImport(file);
    }
  };

  const handleEcrImport = async (file: File) => {
    if (!classAssignmentId) return;
    try {
      const response = await gradesApi.importEcr(classAssignmentId, file);
      setSuccess(`Successfully imported ${response.data.importedGrades} grades from ECR.`);
      fetchClassRecord();
    } catch (err: any) {
      console.error("Failed to import ECR:", err);
      setError(err.response?.data?.message || "Failed to import ECR grades");
    }
  };

  const handleScoreUpdate = async (
    studentId: string, 
    category: 'WW' | 'PT' | 'QA', 
    index: number, 
    newValue: number
  ) => {
    if (!classAssignmentId) return;
    
    // 1. Optimistic Local Update
    setClassRecord(prev => prev.map(record => {
      if (record.student.id !== studentId) return record;

      const newRecord = { ...record, grades: [...record.grades] };
      const gradeIdx = newRecord.grades.findIndex(g => g.quarter === selectedQuarter);
      
      let targetGrade = gradeIdx > -1 ? { ...newRecord.grades[gradeIdx] } : {
        studentId,
        classAssignmentId,
        quarter: selectedQuarter,
        writtenWorkScores: [],
        perfTaskScores: [],
        quarterlyAssessScore: 0,
        quarterlyAssessMax: 100
      } as any;

      if (category === 'WW') {
        const scores = [...(targetGrade.writtenWorkScores as any[] || [])];
        while (scores.length <= index) scores.push({ name: `WW ${scores.length+1}`, score: 0, maxScore: 10 });
        scores[index] = { ...scores[index], score: newValue };
        targetGrade.writtenWorkScores = applyMetaToScores(scores as ScoreItem[], 'WW', index + 1);
      } else if (category === 'PT') {
        const scores = [...(targetGrade.perfTaskScores as any[] || [])];
        while (scores.length <= index) scores.push({ name: `PT ${scores.length+1}`, score: 0, maxScore: 10 });
        scores[index] = { ...scores[index], score: newValue };
        targetGrade.perfTaskScores = applyMetaToScores(scores as ScoreItem[], 'PT', index + 1);
      } else if (category === 'QA') {
        targetGrade.quarterlyAssessScore = newValue;
        targetGrade.qaDescription = qaMeta.description || null;
        targetGrade.qaDate = qaMeta.date || null;
      }

      if (gradeIdx > -1) newRecord.grades[gradeIdx] = targetGrade;
      else newRecord.grades.push(targetGrade);

      return newRecord;
    }));

    try {
      const record = classRecord.find(r => r.student.id === studentId);
      const grade = record?.grades.find(g => g.quarter === selectedQuarter);
      
      const wwScores = [...((grade?.writtenWorkScores || []) as ScoreItem[])];
      const ptScores = [...((grade?.perfTaskScores || []) as ScoreItem[])];
      
      if (category === 'WW') {
        while (wwScores.length <= index) wwScores.push({ name: `WW ${wwScores.length + 1}`, score: 0, maxScore: 10 });
        wwScores[index].score = newValue;
      } else if (category === 'PT') {
        while (ptScores.length <= index) ptScores.push({ name: `PT ${ptScores.length + 1}`, score: 0, maxScore: 10 });
        ptScores[index].score = newValue;
      }

      const wwScoresWithMeta = applyMetaToScores(wwScores, 'WW', index + 1);
      const ptScoresWithMeta = applyMetaToScores(ptScores, 'PT', index + 1);

      await gradesApi.saveGrade({
        studentId,
        classAssignmentId,
        quarter: selectedQuarter,
        writtenWorkScores: category === 'WW' ? wwScoresWithMeta : undefined,
        perfTaskScores: category === 'PT' ? ptScoresWithMeta : undefined,
        quarterlyAssessScore: category === 'QA' ? newValue : undefined,
        qaDescription: qaMeta.description || undefined,
        qaDate: qaMeta.date || undefined,
      });

      fetchClassRecord(true);
    } catch (err: any) {
      console.error("Failed to update score:", err);
      setError(err?.response?.data?.message || "Failed to save grade. Please retry.");
      fetchClassRecord(true);
    }
  };

  const handleHpsUpdate = async (
    category: 'WW' | 'PT' | 'QA', 
    index: number, 
    newMax: number
  ) => {
    if (!classAssignmentId || classRecord.length === 0) return;
    
    // 1. Optimistic Local Update
    setClassRecord(prev => prev.map(record => {
      const newRecord = { ...record, grades: [...record.grades] };
      const gradeIdx = newRecord.grades.findIndex(g => g.quarter === selectedQuarter);
      
      let targetGrade = gradeIdx > -1 ? { ...newRecord.grades[gradeIdx] } : {
        studentId: record.student.id,
        classAssignmentId,
        quarter: selectedQuarter,
        writtenWorkScores: [],
        perfTaskScores: [],
        quarterlyAssessScore: 0,
        quarterlyAssessMax: 100
      } as any;

      if (category === 'WW') {
        const scores = [...(targetGrade.writtenWorkScores as any[] || [])];
        while (scores.length <= index) scores.push({ name: `WW ${scores.length+1}`, score: 0, maxScore: newMax });
        scores[index] = { ...scores[index], maxScore: newMax };
        targetGrade.writtenWorkScores = applyMetaToScores(scores as ScoreItem[], 'WW', index + 1);
      } else if (category === 'PT') {
        const scores = [...(targetGrade.perfTaskScores as any[] || [])];
        while (scores.length <= index) scores.push({ name: `PT ${scores.length+1}`, score: 0, maxScore: newMax });
        scores[index] = { ...scores[index], maxScore: newMax };
        targetGrade.perfTaskScores = applyMetaToScores(scores as ScoreItem[], 'PT', index + 1);
      } else if (category === 'QA') {
        targetGrade.quarterlyAssessMax = newMax;
        targetGrade.qaDescription = qaMeta.description || null;
        targetGrade.qaDate = qaMeta.date || null;
      }

      if (gradeIdx > -1) newRecord.grades[gradeIdx] = targetGrade;
      else newRecord.grades.push(targetGrade);
      return newRecord;
    }));
    
    try {
      const updatePromises = classRecord.map(record => {
        const grade = record.grades.find(g => g.quarter === selectedQuarter);
        const wwScores = [...((grade?.writtenWorkScores || []) as ScoreItem[])];
        const ptScores = [...((grade?.perfTaskScores || []) as ScoreItem[])];
        
        if (category === 'WW') {
          while (wwScores.length <= index) wwScores.push({ name: `WW ${wwScores.length + 1}`, score: 0, maxScore: newMax });
          wwScores[index].maxScore = newMax;
        } else if (category === 'PT') {
          while (ptScores.length <= index) ptScores.push({ name: `PT ${ptScores.length + 1}`, score: 0, maxScore: newMax });
          ptScores[index].maxScore = newMax;
        }

        const wwScoresWithMeta = applyMetaToScores(wwScores, 'WW', index + 1);
        const ptScoresWithMeta = applyMetaToScores(ptScores, 'PT', index + 1);

        return gradesApi.saveGrade({
          studentId: record.student.id,
          classAssignmentId,
          quarter: selectedQuarter,
          writtenWorkScores: category === 'WW' ? wwScoresWithMeta : undefined,
          perfTaskScores: category === 'PT' ? ptScoresWithMeta : undefined,
          quarterlyAssessMax: category === 'QA' ? newMax : undefined,
          qaDescription: qaMeta.description || undefined,
          qaDate: qaMeta.date || undefined,
        });
      });

      await Promise.all(updatePromises);
      fetchClassRecord(true);
    } catch (err: any) {
      console.error("Failed to update HPS:", err);
      setError(err?.response?.data?.message || "Failed to save HPS changes.");
      fetchClassRecord(true);
    }
  };

  const handleDescriptorUpdate = async (studentId: string, descriptor: string) => {
    if (!classAssignmentId) return;
    try {
      setSavingDescriptorStudentId(studentId);
      await gradesApi.saveGrade({
        studentId,
        classAssignmentId,
        quarter: selectedQuarter,
        qualitativeDescriptor: descriptor,
      });
      setSuccess('Descriptor saved');
      fetchClassRecord(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save descriptor');
    } finally {
      setSavingDescriptorStudentId(null);
    }
  };

  const addTask = async (category: 'WW' | 'PT') => {
    const targetIdx = category === 'WW' ? wwCount : ptCount;
    if (category === 'WW') {
      setWwMeta((prev) => [...prev, { description: `WW ${targetIdx + 1}`, date: prev[0]?.date || '' }]);
    } else {
      setPtMeta((prev) => [...prev, { description: `PT ${targetIdx + 1}`, date: prev[0]?.date || '' }]);
    }
    handleHpsUpdate(category, targetIdx, 10);
  };

  const removeTask = async (category: 'WW' | 'PT') => {
    if (!classAssignmentId || classRecord.length === 0) return;

    const currentCount = category === 'WW' ? wwCount : ptCount;
    if (currentCount <= 1) return;

    if (category === 'WW') {
      setWwMeta((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
    } else {
      setPtMeta((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
    }

    // 1. Optimistic local update
    setClassRecord(prev => prev.map(record => {
      const newRecord = { ...record, grades: [...record.grades] };
      const gradeIdx = newRecord.grades.findIndex(g => g.quarter === selectedQuarter);
      if (gradeIdx === -1) return newRecord;

      const targetGrade = { ...newRecord.grades[gradeIdx] } as any;
      if (category === 'WW') {
        const scores = [...((targetGrade.writtenWorkScores || []) as ScoreItem[])];
        targetGrade.writtenWorkScores = scores.slice(0, Math.max(0, scores.length - 1));
      } else {
        const scores = [...((targetGrade.perfTaskScores || []) as ScoreItem[])];
        targetGrade.perfTaskScores = scores.slice(0, Math.max(0, scores.length - 1));
      }

      newRecord.grades[gradeIdx] = targetGrade;
      return newRecord;
    }));

    try {
      const updatePromises = classRecord.map(record => {
        const grade = record.grades.find(g => g.quarter === selectedQuarter);
        const wwScores = [...((grade?.writtenWorkScores || []) as ScoreItem[])];
        const ptScores = [...((grade?.perfTaskScores || []) as ScoreItem[])];

        if (category === 'WW') {
          wwScores.splice(Math.max(0, wwScores.length - 1), 1);
        } else {
          ptScores.splice(Math.max(0, ptScores.length - 1), 1);
        }

        const wwScoresWithMeta = applyMetaToScores(wwScores, 'WW');
        const ptScoresWithMeta = applyMetaToScores(ptScores, 'PT');

        return gradesApi.saveGrade({
          studentId: record.student.id,
          classAssignmentId,
          quarter: selectedQuarter,
          writtenWorkScores: category === 'WW' ? wwScoresWithMeta : undefined,
          perfTaskScores: category === 'PT' ? ptScoresWithMeta : undefined,
          qaDescription: qaMeta.description || undefined,
          qaDate: qaMeta.date || undefined,
        });
      });

      await Promise.all(updatePromises);
      fetchClassRecord(true);
      setSuccess(`${category} activity removed`);
    } catch (err: any) {
      console.error(`Failed to remove ${category} task:`, err);
      fetchClassRecord(true);
      setError(err?.response?.data?.message || `Failed to remove ${category} activity`);
    }
  };

  const stats = useMemo(() => {
    if (classRecord.length === 0) return null;
    const grades = classRecord
      .map((r) => r.grades.find((g) => g.quarter === selectedQuarter)?.quarterlyGrade)
      .filter((g): g is number => g !== undefined && g !== null);
    if (grades.length === 0) return { avg: 0, passed: 0, highest: 0, lowest: 0 };
    return {
      avg: grades.reduce((a, b) => a + b, 0) / grades.length,
      passed: grades.filter((g) => g >= 75).length,
      highest: Math.max(...grades),
      lowest: Math.min(...grades),
    };
  }, [classRecord, selectedQuarter]);

  const sortedRecords = useMemo(
    () =>
      [...classRecord].sort((a, b) => {
        const nameA = `${a.student.lastName}, ${a.student.firstName}`.toLowerCase();
        const nameB = `${b.student.lastName}, ${b.student.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }),
    [classRecord]
  );

  const saveAssessmentDetails = async () => {
    if (!classAssignmentId) return;

    try {
      const updatePromises = classRecord
        .map((record) => {
          const grade = record.grades.find((g) => g.quarter === selectedQuarter);
          if (!grade) return null;

          const wwScores = applyMetaToScores([...(grade.writtenWorkScores || []) as ScoreItem[]], 'WW');
          const ptScores = applyMetaToScores([...(grade.perfTaskScores || []) as ScoreItem[]], 'PT');

          return gradesApi.saveGrade({
            studentId: record.student.id,
            classAssignmentId,
            quarter: selectedQuarter,
            writtenWorkScores: wwScores,
            perfTaskScores: ptScores,
            qaDescription: qaMeta.description || undefined,
            qaDate: qaMeta.date || undefined,
          });
        })
        .filter(Boolean) as Promise<any>[];

      if (updatePromises.length === 0) {
        setSuccess('No existing scores yet. Metadata will apply as you start encoding.');
        return;
      }

      await Promise.all(updatePromises);
      setSuccess('Assessment details saved');
      fetchClassRecord(true);
    } catch (err: any) {
      console.error('Failed to save assessment details:', err);
      setError(err?.response?.data?.message || 'Failed to save assessment details');
    }
  };

  const maleRecords = useMemo(() => sortedRecords.filter(r => r.student.gender?.toLowerCase() === 'male'), [sortedRecords]);
  const femaleRecords = useMemo(() => sortedRecords.filter(r => r.student.gender?.toLowerCase() === 'female'), [sortedRecords]);

  const [ecrProgress, setEcrProgress] = useState<string>('');
  const [ecrPercentage, setEcrPercentage] = useState<number>(0);
  const [showEcrGenerationDialog, setShowEcrGenerationDialog] = useState(false);
  
  const downloadECR = async () => {
    if (!classAssignment) return;
    try {
      setShowEcrGenerationDialog(true);
      setEcrPercentage(0);
      setEcrProgress('Initializing compilation...');
      setEcrPercentage(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const token = sessionStorage.getItem("token");
      const response = await fetch(`${SERVER_URL}/api/ecr-templates/generate/${classAssignment.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter: selectedQuarter }),
      });

      if (!response.ok) throw new Error('Failed to generate ECR');
      
      setEcrPercentage(60);
      setEcrProgress('Injecting records...');
      const blob = await response.blob();
      
      setEcrPercentage(90);
      setEcrProgress('Finalizing workbook...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ECR_${classAssignment.subject.name}_${classAssignment.section.name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setEcrPercentage(100);
      setEcrProgress('Download started!');
      setTimeout(() => setShowEcrGenerationDialog(false), 1500);
    } catch (error: any) {
      setError(error.message);
      setShowEcrGenerationDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Fetching Class Records...</p>
        </div>
      </div>
    );
  }

  if (!classAssignment) return null;
  const isArchivedAssignment = classAssignment.isActive === false;

  return (
    <div className="space-y-8 animate-fade-in max-w-full mx-auto px-6 pb-12">
      {/* Toast Messages */}
      {(error || success) && (
        <div className={`fixed top-20 right-6 z-[100] flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl border-0 animate-slide-in-right ${error ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"}`}>
          {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-black uppercase tracking-widest">{error || success}</span>
          <button onClick={() => { setError(''); setSuccess(''); }} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <Link to="/teacher/classes">
              <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase tracking-widest px-3">{gradeLevelLabels[classAssignment.section.gradeLevel]}</Badge>
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Section {classAssignment.section.name}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{classAssignment.subject.name}</h1>
              {effectiveWeights?.source === "generic-fallback" && !isHGClass && (
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mt-2">
                  Generic WW/PT/QA fallback active (no exact ECR template for this subject)
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isHGClass ? (
              <>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={downloadECR}>
                  <Download className="w-4 h-4 mr-2" />EXPORT ECR
                </Button>
                <Button className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] tracking-widest uppercase transition-all shadow-xl shadow-slate-300" onClick={() => ecrFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-3" />IMPORT ECR
                </Button>
                <input type="file" ref={ecrFileInputRef} onChange={handleEcrFileSelect} accept=".xlsx,.xls" className="hidden" />
              </>
            ) : (
              <Badge className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">
                Qualitative Grading Mode
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isArchivedAssignment && (
        <Card className="border-0 shadow-lg shadow-rose-100/50 rounded-[2rem] overflow-hidden bg-rose-50/60 border border-rose-100">
          <CardContent className="p-6 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-600">Archived from Atlas</p>
            <p className="text-sm font-bold text-slate-700">
              This subject was removed from the current Atlas load. SMART keeps the grade history for recovery, but this class is no longer active on the dashboard.
            </p>
            {classAssignment.archivedReason && (
              <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest">
                Reason: {classAssignment.archivedReason}
              </p>
            )}
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
              If this was not intended, contact the EnrollPro/Atlas admin to restore the subject assignment.
            </p>
          </CardContent>
        </Card>
      )}

      {isHGClass && (
        <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-8 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Homeroom Guidance Descriptors</h2>
              <p className="text-slate-500 text-sm mt-1">Select one qualitative descriptor per learner for {selectedQuarter}.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
              <Select value={selectedQuarter} onValueChange={(val) => val && setSelectedQuarter(val)}>
                <SelectTrigger className="h-11 w-40 bg-white border-slate-200 text-sm font-black uppercase rounded-xl shadow-sm px-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-2">
                  {quarters.map((q) => (
                    <SelectItem key={q} value={q} className="text-xs font-black uppercase rounded-lg py-2.5 px-4 focus:bg-indigo-50 focus:text-indigo-600 transition-colors cursor-pointer">
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <div className="overflow-x-auto border-t border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>LRN</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead className="w-[320px]">Descriptor ({selectedQuarter})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map((record, index) => {
                  const quarterGrade = record.grades.find((g) => g.quarter === selectedQuarter);
                  const descriptor = quarterGrade?.qualitativeDescriptor ?? '';
                  const isSaving = savingDescriptorStudentId === record.student.id;
                  return (
                    <TableRow key={record.student.id}>
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{record.student.lrn}</TableCell>
                      <TableCell className="font-semibold">{record.student.lastName}, {record.student.firstName}</TableCell>
                      <TableCell>
                        <Select
                          value={descriptor || undefined}
                          onValueChange={(value) => {
                            if (!value) return;
                            handleDescriptorUpdate(record.student.id, value);
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Select descriptor" />
                          </SelectTrigger>
                          <SelectContent>
                            {HG_DESCRIPTORS.map((item) => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Analytics Insights */}
      {!isHGClass && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Class Average", value: stats.avg.toFixed(1), icon: Target, color: "indigo" },
            { label: "Passing Rate", value: `${Math.round((stats.passed/classRecord.length)*100)}%`, icon: TrendingUp, color: "emerald" },
            { label: "Highest Grade", value: stats.highest, icon: Award, color: "amber" },
            { label: "Needs Support", value: classRecord.length - stats.passed, icon: TrendingDown, color: "rose" },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-7 flex flex-col justify-between h-full">
                <div className="p-3 rounded-2xl w-fit mb-4 bg-slate-50 group-hover:bg-white transition-colors shadow-sm">
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 leading-none">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Ledger Table */}
      {!isHGClass && (
      <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-8 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Class Ledger</h2>
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
              <Button 
                variant="ghost" 
                onClick={() => setSeparateByGender(false)} 
                className={`h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!separateByGender ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Alphabetical
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSeparateByGender(true)} 
                className={`h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${separateByGender ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Gendered
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className={`h-11 rounded-xl border-slate-200 font-bold ${showAssessmentDetails ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-600'}`}
              onClick={() => setShowAssessmentDetails((prev) => !prev)}
            >
              Optional Assessment Details
            </Button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</span>
            <Select value={selectedQuarter} onValueChange={(val) => val && setSelectedQuarter(val)}>
              <SelectTrigger className="h-11 w-40 bg-white border-slate-200 text-sm font-black uppercase rounded-xl shadow-sm px-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-2">
                {quarters.map((q) => (
                  <SelectItem key={q} value={q} className="text-xs font-black uppercase rounded-lg py-2.5 px-4 focus:bg-indigo-50 focus:text-indigo-600 transition-colors cursor-pointer">
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {showAssessmentDetails && (
          <div className="mx-8 mb-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white border border-indigo-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">Written Work (Optional)</p>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Top Date (applies to all WW)</label>
                <input
                  type="date"
                  value={wwMeta[0]?.date || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWwMeta((prev) => prev.map((m) => ({ ...m, date: val })));
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
                />
                {Array.from({ length: wwCount }).map((_, i) => (
                  <input
                    key={`ww-meta-${i}`}
                    type="text"
                    value={wwMeta[i]?.description || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWwMeta((prev) => {
                        const next = [...prev];
                        while (next.length <= i) next.push({ description: `WW ${next.length + 1}`, date: next[0]?.date || '' });
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Top Date (applies to all PT)</label>
                <input
                  type="date"
                  value={ptMeta[0]?.date || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPtMeta((prev) => prev.map((m) => ({ ...m, date: val })));
                  }}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold mb-2"
                />
                {Array.from({ length: ptCount }).map((_, i) => (
                  <input
                    key={`pt-meta-${i}`}
                    type="text"
                    value={ptMeta[i]?.description || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPtMeta((prev) => {
                        const next = [...prev];
                        while (next.length <= i) next.push({ description: `PT ${next.length + 1}`, date: next[0]?.date || '' });
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
                <Button onClick={saveAssessmentDetails} className="w-full h-9 rounded-lg text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white">
                  Save Details
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border-t border-slate-100">
          <Table className="border-collapse table-fixed w-max min-w-full">
            <TableHeader>
              {/* Grouped Header Row */}
              <TableRow className="hover:bg-transparent border-0 bg-slate-50/50 h-10">
                <TableHead colSpan={3} className="border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-0 w-[400px]">LEARNER INFORMATION</TableHead>
                <TableHead colSpan={wwCount + 3} className="border-r border-slate-200 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center px-0 bg-indigo-50/30">
                  <div className="flex items-center justify-center gap-3">
                    WRITTEN WORK ({effectiveWeights?.ww ?? classAssignment.subject.writtenWorkWeight}%)
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={wwCount <= 1}
                      className="w-6 h-6 rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => removeTask('WW')}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6 rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                      onClick={() => addTask('WW')}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead colSpan={ptCount + 3} className="border-r border-slate-200 text-[10px] font-black text-purple-600 uppercase tracking-widest text-center px-0 bg-purple-50/30">
                  <div className="flex items-center justify-center gap-3">
                    PERF. TASKS ({effectiveWeights?.pt ?? classAssignment.subject.perfTaskWeight}%)
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={ptCount <= 1}
                      className="w-6 h-6 rounded-full bg-white text-purple-600 shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => removeTask('PT')}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6 rounded-full bg-white text-purple-600 shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white transition-all"
                      onClick={() => addTask('PT')}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableHead>
                <TableHead colSpan={3} className="border-r border-slate-200 text-[10px] font-black text-amber-600 uppercase tracking-widest text-center px-0 bg-amber-50/30">QA ({effectiveWeights?.qa ?? classAssignment.subject.quarterlyAssessWeight}%)</TableHead>
                <TableHead colSpan={2} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center px-0 bg-emerald-50/30 uppercase tracking-widest">Summary</TableHead>
              </TableRow>
              {/* Detailed Header Row */}
              <TableRow className="hover:bg-transparent border-b border-slate-200 h-10">
                <TableHead className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-r border-slate-100">#</TableHead>
                <TableHead className="w-28 text-[9px] font-black text-slate-400 uppercase border-r border-slate-100 px-3">LRN</TableHead>
                <TableHead className="w-56 text-[9px] font-black text-slate-400 uppercase border-r border-slate-200 px-3">Full Name</TableHead>
                
                {/* Dynamic WW Columns */}
                {Array.from({ length: wwCount }).map((_, i) => (
                  <TableHead key={`h-ww-${i}`} className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-r border-slate-100">{i + 1}</TableHead>
                ))}
                <TableHead className="w-12 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-100 bg-slate-100/50">Total</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-indigo-600 uppercase border-r border-slate-100 bg-indigo-50/30">PS</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-indigo-700 uppercase border-r border-slate-200 bg-indigo-100/50">WS</TableHead>
                
                {/* Dynamic PT Columns */}
                {Array.from({ length: ptCount }).map((_, i) => (
                  <TableHead key={`h-pt-${i}`} className="w-10 text-center text-[9px] font-black text-slate-400 uppercase border-r border-slate-100">{i + 1}</TableHead>
                ))}
                <TableHead className="w-12 text-center text-[9px] font-black text-slate-500 uppercase border-r border-slate-100 bg-slate-100/50">Total</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-purple-600 uppercase border-r border-slate-100 bg-purple-50/30">PS</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-purple-700 uppercase border-r border-slate-200 bg-purple-100/50">WS</TableHead>
                
                {/* QA */}
                <TableHead className="w-14 text-center text-[9px] font-black text-amber-600 uppercase border-r border-slate-100 bg-amber-50/20">SCORE</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-amber-600 uppercase border-r border-slate-100 bg-amber-50/30">PS</TableHead>
                <TableHead className="w-12 text-center text-[9px] font-black text-amber-700 uppercase border-r border-slate-200 bg-amber-100/50">WS</TableHead>
                
                <TableHead className="w-16 text-center text-[9px] font-black text-emerald-600 uppercase border-r border-slate-100 bg-emerald-50/20">INITIAL</TableHead>
                <TableHead className="w-16 text-center text-[9px] font-black text-slate-900 uppercase bg-emerald-100/50 font-bold">FINAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const weights = {
                  ww: effectiveWeights?.ww ?? classAssignment.subject.writtenWorkWeight,
                  pt: effectiveWeights?.pt ?? classAssignment.subject.perfTaskWeight,
                  qa: effectiveWeights?.qa ?? classAssignment.subject.quarterlyAssessWeight
                };

                const rows = [];
                // HPS (Benchmark) row
                rows.push(
                  <LedgerRow 
                    key="HPS-ROW" 
                    record={null} 
                    idx={0} 
                    isHps={true} 
                    hpsData={hpsData}
                    selectedQuarter={selectedQuarter} 
                    wwCount={wwCount} 
                    ptCount={ptCount} 
                    weights={weights} 
                    onScoreUpdate={handleScoreUpdate} 
                    onHpsUpdate={handleHpsUpdate} 
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
                    maleRecords.forEach((r, i) => rows.push(
                      <LedgerRow 
                        key={r.student.id} 
                        record={r} 
                        idx={i} 
                        selectedQuarter={selectedQuarter} 
                        wwCount={wwCount} 
                        ptCount={ptCount} 
                        weights={weights} 
                        onScoreUpdate={handleScoreUpdate} 
                        onHpsUpdate={handleHpsUpdate} 
                      />
                    ));
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
                    femaleRecords.forEach((r, i) => rows.push(
                      <LedgerRow 
                        key={r.student.id} 
                        record={r} 
                        idx={i} 
                        selectedQuarter={selectedQuarter} 
                        wwCount={wwCount} 
                        ptCount={ptCount} 
                        weights={weights} 
                        onScoreUpdate={handleScoreUpdate} 
                        onHpsUpdate={handleHpsUpdate} 
                      />
                    ));
                  }
                } else {
                  sortedRecords.forEach((r, i) => rows.push(
                    <LedgerRow 
                      key={r.student.id} 
                      record={r} 
                      idx={i} 
                      selectedQuarter={selectedQuarter} 
                      wwCount={wwCount} 
                      ptCount={ptCount} 
                      weights={weights} 
                      onScoreUpdate={handleScoreUpdate} 
                      onHpsUpdate={handleHpsUpdate} 
                    />
                  ));
                }
                return rows;
              })()}
            </TableBody>
          </Table>
        </div>
      </Card>
      )}

      <Dialog open={showEcrGenerationDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-0 shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-10 text-center">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="#f8fafc" strokeWidth="10" fill="none" />
                <circle cx="64" cy="64" r="58" stroke={colors.primary} strokeWidth="10" fill="none" strokeDasharray="364.4" strokeDashoffset={364.4 * (1 - ecrPercentage / 100)} className="transition-all duration-700 ease-out" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-black" style={{ color: colors.primary }}>{ecrPercentage}%</span></div>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Generating Workbook</h3>
            <p className="text-slate-500 font-medium text-sm mb-8 px-4">{ecrProgress}</p>
            <div className="bg-slate-50 rounded-3xl p-6 text-left border border-slate-100 flex items-start gap-5">
              <div className="p-3 rounded-2xl bg-white shadow-sm"><FileSpreadsheet className="w-6 h-6 text-emerald-500" /></div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Message</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">Your Electronic Class Record is being auto-filled with student data. It will download automatically.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
