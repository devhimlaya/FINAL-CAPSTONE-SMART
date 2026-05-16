import React from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassRecord } from "@/lib/api";

interface ClassRecordMobileListProps {
  records: ClassRecord[];
  selectedQuarter: string;
  isHGClass: boolean;
  onQuarterChange: (quarter: string) => void;
  onOpenEditor: (studentId: string) => void;
  getDisplayFinalGrade: (record: ClassRecord) => number | null;
  getGradeColor: (grade: number | null) => string;
}

const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;

export function ClassRecordMobileList({
  records,
  selectedQuarter,
  isHGClass,
  onQuarterChange,
  onOpenEditor,
  getDisplayFinalGrade,
  getGradeColor,
}: ClassRecordMobileListProps) {
  return (
    <Card className="lg:hidden border-0 shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
          {isHGClass ? "Homeroom Guidance" : "Class Ledger"}
        </h2>
        <Select value={selectedQuarter} onValueChange={(val) => val && onQuarterChange(val)}>
          <SelectTrigger className="h-10 w-24 bg-white border-slate-200 text-xs font-black uppercase rounded-xl shadow-sm px-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-2">
            {quarters.map((q) => (
              <SelectItem
                key={q}
                value={q}
                className="text-xs font-black uppercase rounded-lg py-2 px-4 focus:bg-indigo-50 focus:text-indigo-600 transition-colors cursor-pointer"
              >
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-4 space-y-3 bg-slate-50/40">
        {records.map((record, index) => {
          const grade = record.grades.find((g) => g.quarter === selectedQuarter);
          const descriptor = grade?.qualitativeDescriptor ?? "Not set";
          const finalGrade = getDisplayFinalGrade(record);

          return (
            <button
              key={record.student.id}
              type="button"
              onClick={() => onOpenEditor(record.student.id)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.995] transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{index + 1}</p>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {record.student.lastName}, {record.student.firstName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">{record.student.lrn}</p>
                </div>

                <div className="text-right">
                  {isHGClass ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriptor</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{descriptor}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Final</p>
                      <p className={`text-xl font-black ${getGradeColor(finalGrade)}`}>{finalGrade ?? "-"}</p>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
