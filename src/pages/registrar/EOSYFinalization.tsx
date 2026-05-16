import { useState, useEffect } from "react";
import { GraduationCap, Loader2, AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { registrarApi } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useTheme } from "@/contexts/ThemeContext";

// NOTE: This page is intentionally read-only.
// EOSY finalization (POST /eosy/sections/:id/finalize) writes to EnrollPro and is STRICTLY FORBIDDEN
// in SMART. All finalization actions must be performed directly in EnrollPro.

export default function EOSYFinalization() {
  const { colors } = useTheme();
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [sectionMeta, setSectionMeta] = useState<any>(null);

  const loadSections = async () => {
    setSectionsLoading(true);
    setSectionsError(null);
    try {
      const res = await registrarApi.getEosySections();
      const payload = res.data as any;
      setSections(payload.sections ?? payload.data ?? payload ?? []);
    } catch (err: any) {
      setSectionsError(err?.response?.data?.message ?? "Failed to load EOSY sections from EnrollPro.");
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadRecords = async (sectionId: string) => {
    setRecordsLoading(true);
    setRecordsError(null);
    setRecords([]);
    setSectionMeta(null);
    try {
      const res = await registrarApi.getEosySectionRecords(parseInt(sectionId, 10));
      const payload = res.data as any;
      const rawRecords: any[] = payload.records ?? payload.learners ?? payload.data ?? [];

      // Normalize: EnrollPro EOSY records nest learner under rec.enrollmentApplication.learner
      const normalized = rawRecords.map((rec: any) => {
        const l = rec.enrollmentApplication?.learner ?? rec.learner ?? rec;
        const rawSex = (l.sex ?? rec.sex ?? "").toString().trim().toUpperCase();
        const sex = rawSex === "MALE" || rawSex === "M" ? "Male" : rawSex === "FEMALE" || rawSex === "F" ? "Female" : "";
        return {
          enrollmentRecordId: rec.id ?? rec.enrollmentRecordId,
          learnerId: l.id ?? rec.learnerId,
          lrn: l.lrn ?? rec.lrn ?? "",
          firstName: l.firstName ?? rec.firstName ?? "",
          lastName: l.lastName ?? rec.lastName ?? "",
          middleName: l.middleName ?? rec.middleName ?? "",
          sex,
          finalAverage: rec.finalAverage ?? rec.finalGrade ?? l.finalAverage ?? l.previousGenAve ?? null,
          // Promotion status
          promoted: rec.eosyStatus === "PROMOTED" || l.promotionStatus === "PROMOTED" || rec.promoted || rec.isPromoted,
          finalStatus: rec.eosyStatus ?? l.promotionStatus ?? rec.finalStatus ?? "",
          promotedToGradeLevel: rec.promotedToGradeLevel ?? rec.nextGradeLevel ?? "",
        };
      });

      setRecords(normalized);
      setSectionMeta(payload.section ?? payload.meta ?? null);
    } catch (err: any) {
      setRecordsError(err?.response?.data?.message ?? "Failed to load EOSY records from EnrollPro.");
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => { void loadSections(); }, []);
  useEffect(() => {
    if (selectedSectionId) void loadRecords(selectedSectionId);
  }, [selectedSectionId]);

  const promoted = records.filter((r) => r.promoted || r.finalStatus === "PROMOTED").length;
  const held = records.filter((r) => !r.promoted && r.finalStatus !== "PROMOTED" && r.finalStatus).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[{ label: "Dashboard", href: "/registrar" }, { label: "EOSY Finalization" }]} />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EOSY — End of School Year</h1>
          <p className="text-gray-600 mt-1">
            View EOSY promotion status from EnrollPro.{" "}
            <span className="font-medium text-amber-600">
              This page is read-only. Finalization must be done in EnrollPro directly.
            </span>
          </p>
        </div>
        <Button onClick={() => void loadSections()} variant="outline" className="rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Sections
        </Button>
      </div>

      {/* Read-only notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-amber-700 text-sm">
          <strong>Read-Only:</strong> SMART displays EOSY data from EnrollPro for reference only.
          To finalize EOSY, log into EnrollPro and use the Finalization workflow there.
        </p>
      </div>

      {/* Section picker */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: colors.primary }}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Select Section</CardTitle>
              <CardDescription>View final promotion status for a section</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {sectionsLoading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.primary }} />
              <span>Loading EOSY sections…</span>
            </div>
          ) : sectionsError ? (
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <span>{sectionsError}</span>
              <Button onClick={loadSections} variant="outline" size="sm" className="rounded-xl ml-2">Retry</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-full max-w-sm rounded-xl border-gray-200">
                  <SelectValue placeholder="— Select a section —" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name ?? s.sectionName}{s.gradeLevel?.name ? ` (${s.gradeLevel.name})` : ""}
                      {s.finalized ? " ✓ Finalized" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">{sections.length} section(s) available</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Records table */}
      {selectedSectionId && (
        <Card className="border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <CardTitle>
                  {sectionMeta?.name ?? sections.find((s) => String(s.id) === selectedSectionId)?.name ?? "Section"} — Final Records
                </CardTitle>
                <CardDescription>
                  {records.length} learner(s){" "}
                  {records.length > 0 && (
                    <span>
                      — <span className="text-emerald-600 font-medium">{promoted} promoted</span>
                      {held > 0 && <span className="text-red-500 font-medium"> · {held} held</span>}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recordsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
              </div>
            ) : recordsError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                <p className="text-gray-700 font-medium">Unable to load EOSY records</p>
                <p className="text-gray-500 text-sm mt-1">{recordsError}</p>
                <Button onClick={() => void loadRecords(selectedSectionId)} variant="outline" className="mt-4 rounded-xl">Try Again</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-bold text-gray-700 w-8">#</TableHead>
                      <TableHead className="font-bold text-gray-700">LRN</TableHead>
                      <TableHead className="font-bold text-gray-700">Learner Name</TableHead>
                      <TableHead className="font-bold text-gray-700">Sex</TableHead>
                      <TableHead className="font-bold text-gray-700">Final Average</TableHead>
                      <TableHead className="font-bold text-gray-700">Status</TableHead>
                      <TableHead className="font-bold text-gray-700">Promoted To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                          No EOSY records for this section
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((rec: any, i: number) => {
                        const isPromoted = rec.promoted || rec.finalStatus === "PROMOTED";
                        return (
                          <TableRow key={rec.enrollmentRecordId ?? rec.learnerId ?? i}>
                            <TableCell className="text-gray-500 text-sm">{i + 1}</TableCell>
                            <TableCell className="font-mono text-sm text-gray-600">{rec.lrn ?? "—"}</TableCell>
                            <TableCell className="font-medium text-gray-900">
                              {rec.lastName}, {rec.firstName} {rec.middleName ?? ""}
                            </TableCell>
                            <TableCell>
                              <Badge className={rec.sex === "MALE" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}>
                                {rec.sex ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {rec.finalAverage != null ? rec.finalAverage.toFixed(2) : "—"}
                            </TableCell>
                            <TableCell>
                              {isPromoted ? (
                                <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                                  <CheckCircle className="w-3 h-3" /> PROMOTED
                                </Badge>
                              ) : rec.finalStatus ? (
                                <Badge className="bg-red-100 text-red-700 gap-1">
                                  <XCircle className="w-3 h-3" /> {rec.finalStatus}
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-500">—</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {rec.promotedToGradeLevel?.name ?? rec.nextGradeLevel?.name ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
