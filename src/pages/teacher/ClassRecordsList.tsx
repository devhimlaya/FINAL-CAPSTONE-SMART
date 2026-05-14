import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter,
  LayoutGrid,
  List,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { gradesApi, type ClassAssignment } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import { useSyncStream } from "@/hooks/useSyncStream";

const gradeLevelLabels: Record<string, string> = {
  GRADE_7: "Grade 7",
  GRADE_8: "Grade 8",
  GRADE_9: "Grade 9",
  GRADE_10: "Grade 10",
};

function AssignmentCard({ assignment, archived }: { assignment: ClassAssignment; archived: boolean }) {
  const titleHover = archived ? "group-hover:text-rose-600" : "group-hover:text-indigo-600";
  const badgeClass = archived
    ? "bg-rose-100 text-rose-700 border-rose-200"
    : "bg-indigo-50 text-indigo-700 border-indigo-100";
  const containerClass = archived
    ? "border border-rose-200 shadow-xl shadow-rose-100/50 hover:shadow-2xl hover:shadow-rose-200"
    : "border-0 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100";
  const cardBg = "bg-white";
  const sectionText = archived ? "text-rose-500" : "text-slate-500";
  const mutedText = archived ? "text-rose-400" : "text-slate-400";
  const iconClass = archived
    ? "w-8 h-8 rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-600 group-hover:text-white"
    : "w-10 h-10 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white";
  const chevronClass = archived
    ? "w-10 h-10 rounded-xl bg-rose-100 text-rose-400"
    : "w-12 h-12 rounded-2xl bg-slate-50 text-slate-300";

  return (
    <Link to={`/teacher/records/${assignment.id}`} className="animate-slide-up group block h-full">
      <Card className={`h-full ${containerClass} transition-all duration-500 ${archived ? 'rounded-[2rem]' : 'rounded-[2.5rem]'} ${cardBg} overflow-hidden flex flex-col relative group-hover:-translate-y-2`}>
        <div
          className={
            archived
              ? "absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-[3rem] -mr-8 -mt-8 group-hover:bg-rose-100 transition-colors"
              : "absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -mr-10 -mt-10 group-hover:bg-indigo-50 transition-colors"
          }
        />
        <CardHeader className={`${archived ? 'p-6 pb-3' : 'p-8 pb-4'} relative z-10`}>
          <div className={`flex items-start justify-between ${archived ? 'mb-4' : 'mb-8'}`}>
            <Badge className={`${badgeClass} text-[10px] font-black uppercase tracking-[0.1em] ${archived ? 'px-3 py-1' : 'px-4 py-1.5'} rounded-full`}>
              {archived ? "ARCHIVED" : gradeLevelLabels[assignment.section.gradeLevel]}
            </Badge>
            <div className={`${archived ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} ${archived ? "bg-rose-50 text-rose-500 group-hover:bg-rose-600 group-hover:text-white" : "bg-slate-50 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white"} flex items-center justify-center transition-all duration-500 shadow-sm`}>
              <ArrowUpRight className={`${archived ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </div>
          </div>

          <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${mutedText}`}>Subject Title</p>
            <h3 className={`${archived ? 'text-lg' : 'text-2xl'} font-black text-slate-900 ${titleHover} transition-colors leading-tight`}>
              {assignment.subject.name}
            </h3>
          </div>

          <div className={`${archived ? 'pt-3' : 'pt-4'} flex items-center gap-2`}>
            <div className={`w-1.5 h-1.5 rounded-full ${archived ? "bg-rose-400" : "bg-emerald-400"} animate-pulse`} />
            <p className={`${archived ? 'text-xs' : 'text-sm'} font-bold ${sectionText}`}>
              Section {assignment.section.name} &bull; {assignment.schoolYear}
            </p>
          </div>

          {archived && assignment.archivedReason && (
            <p className="mt-3 text-[10px] font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2 border border-rose-100 leading-relaxed line-clamp-2">
              {assignment.archivedReason}
            </p>
          )}
        </CardHeader>

        <CardContent className={`${archived ? 'p-6 pt-4' : 'p-8 pt-6'} mt-auto relative z-10`}>
          <div className={`flex items-center justify-between ${archived ? 'pt-4' : 'pt-6'} border-t ${archived ? "border-rose-100" : "border-slate-50"}`}>
            <div className={`flex items-center ${archived ? 'gap-2' : 'gap-3'}`}>
              <div className={`${iconClass} flex items-center justify-center transition-colors shadow-sm`}>
                <Users className={`${archived ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Enrolled</p>
                <p className={`${archived ? 'text-xs' : 'text-sm'} font-black text-slate-900`}>{assignment.section.enrollments?.length || 0} Learners</p>
              </div>
            </div>

            <div className="text-right">
              <p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Weights</p>
              <p className={`${archived ? 'text-[10px]' : 'text-xs'} font-black text-slate-900 font-mono tracking-tighter`}>
                {assignment.subject.writtenWorkWeight}/{assignment.subject.perfTaskWeight}/{assignment.subject.quarterlyAssessWeight}
              </p>
            </div>
          </div>

          <div className={`${archived ? 'mt-3' : 'mt-4'} flex items-center justify-between`}>
            <Badge className={`${archived ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-500 border-0"} text-[10px] font-black uppercase tracking-widest ${archived ? 'px-2' : 'px-3'}`}>
              {archived ? "Backup" : "Active Record"}
            </Badge>
            <div className={`${chevronClass} flex items-center justify-center transition-all group-hover:translate-x-2`}>
              <ChevronRight className={`${archived ? 'w-5 h-5' : 'w-6 h-6'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ClassRecordsList() {
  const { colors } = useTheme();
  const { syncVersion } = useSyncStream();
  const [classes, setClasses] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await gradesApi.getMyClasses();
        setClasses(response.data);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [syncVersion]);

  const filteredClasses = classes.filter(
    (c) =>
      c.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gradeLevelLabels[c.section.gradeLevel].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeClasses = filteredClasses.filter((assignment) => assignment.isActive !== false);
  const archivedClasses = filteredClasses.filter((assignment) => assignment.isActive === false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <div
              className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
              style={{ borderColor: colors.primary, borderTopColor: "transparent" }}
            />
          </div>
          <p className="text-gray-500 font-medium text-lg">Loading class rosters...</p>
        </div>
      </div>
    );
  }

  const hasArchived = archivedClasses.length > 0;

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase tracking-widest px-3">
              {activeClasses.length} ACTIVE CLASSES
            </Badge>
            {hasArchived && (
              <Badge className="bg-rose-600 text-white border-rose-200 text-[10px] font-black uppercase tracking-widest px-3 shadow-lg shadow-rose-100">
                {archivedClasses.length} BACKUP ARCHIVED
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Class Records</h1>
          <p className="text-slate-500 font-medium text-lg">Select a section to manage student performance and mastery</p>
        </div>
      </div>

      <Card className="border-0 shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-slate-100 text-slate-400 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder="Search by subject, section, or grade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-16 h-14 bg-slate-50/50 border-0 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-2xl text-base font-bold transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex-1 lg:flex-none">
                <Filter className="w-4 h-4 mr-3 text-slate-400" />
                ADVANCED FILTERS
              </Button>

              <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-11 w-11 rounded-xl transition-all ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-11 w-11 rounded-xl transition-all ${viewMode === "list" ? "bg-white text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" && (
        <div className="space-y-10">
          {activeClasses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeClasses.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} archived={false} />
              ))}
            </div>
          )}

          {hasArchived && (
            <div className="space-y-6">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                    <Archive className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Archived Class Records</h2>
                    <p className="text-slate-500 font-medium">Backup data from previous syncs or manual archives</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-black px-4 py-2 rounded-xl">
                    {archivedClasses.length} RECORDS
                  </Badge>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                    {isArchivedExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </div>
                </div>
              </div>

              {isArchivedExpanded && (
                <div className="relative">
                  <div className="flex overflow-x-auto pb-8 pt-2 gap-6 rose-scrollbar snap-x snap-mandatory">
                    {archivedClasses.map((assignment) => (
                      <div key={assignment.id} className="w-[320px] shrink-0 snap-start">
                        <AssignmentCard assignment={assignment} archived />
                      </div>
                    ))}
                  </div>
                  {/* Fade indicators for scroll */}
                  <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-slate-50/50 to-transparent pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-10">
          {activeClasses.length > 0 && (
            <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
              <div className="divide-y divide-slate-50">
                {activeClasses.map((assignment) => (
                  <Link key={assignment.id} to={`/teacher/records/${assignment.id}`} className="block group">
                    <div className="p-8 hover:bg-slate-50/50 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-8 group">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-indigo-100 transition-all duration-500">
                        <BookOpen className="w-8 h-8" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{assignment.subject.name}</h3>
                          <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] font-black uppercase tracking-widest px-3">
                            {gradeLevelLabels[assignment.section.gradeLevel]}
                          </Badge>
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                          Section {assignment.section.name} &bull; {assignment.schoolYear}
                        </p>
                      </div>

                      <div className="flex items-center gap-12">
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-900 leading-none">{assignment.section.enrollments?.length || 0}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Learners</p>
                        </div>

                        <div className="hidden lg:block">
                          <div className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 text-center">WW / PT / QA</p>
                            <p className="text-sm text-slate-900 font-black font-mono tracking-tighter text-center">
                              {assignment.subject.writtenWorkWeight} / {assignment.subject.perfTaskWeight} / {assignment.subject.quarterlyAssessWeight}
                            </p>
                          </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:translate-x-2 transition-all">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {hasArchived && (
            <div className="space-y-6">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                    <Archive className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Archived Class Records</h2>
                    <p className="text-slate-500 font-medium">Backup data from previous syncs or manual archives</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-black px-4 py-2 rounded-xl">
                    {archivedClasses.length} RECORDS
                  </Badge>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                    {isArchivedExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </div>
                </div>
              </div>

              {isArchivedExpanded && (
                <Card className="border-0 shadow-2xl shadow-rose-200/40 rounded-[2.5rem] overflow-hidden bg-white border border-rose-100 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="divide-y divide-rose-50">
                    {archivedClasses.map((assignment) => (
                      <Link key={assignment.id} to={`/teacher/records/${assignment.id}`} className="block group">
                        <div className="p-8 hover:bg-rose-50 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-8 group">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-rose-100 text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-rose-100 transition-all duration-500">
                            <BookOpen className="w-8 h-8" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="text-xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">{assignment.subject.name}</h3>
                              <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-black uppercase tracking-widest px-3">
                                ARCHIVED
                              </Badge>
                            </div>
                            <p className="text-rose-500 font-bold text-sm uppercase tracking-widest">
                              Section {assignment.section.name} &bull; {assignment.schoolYear}
                            </p>
                            {assignment.archivedReason && (
                              <p className="mt-3 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                                {assignment.archivedReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-12">
                            <div className="text-center">
                              <p className="text-2xl font-black text-slate-900 leading-none">{assignment.section.enrollments?.length || 0}</p>
                              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mt-2">Learners</p>
                            </div>

                            <div className="hidden lg:block">
                              <div className="px-5 py-3 rounded-2xl bg-rose-50 border border-rose-100 group-hover:bg-white transition-colors">
                                <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-1 text-center">WW / PT / QA</p>
                                <p className="text-sm text-slate-900 font-black font-mono tracking-tighter text-center">
                                  {assignment.subject.writtenWorkWeight} / {assignment.subject.perfTaskWeight} / {assignment.subject.quarterlyAssessWeight}
                                </p>
                              </div>
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-400 flex items-center justify-center group-hover:translate-x-2 transition-all">
                              <ChevronRight className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {activeClasses.length === 0 && archivedClasses.length === 0 && (
        <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="py-32 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
              <BookOpen className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="font-black text-slate-900 text-2xl mb-3">No Classes Found</h3>
            <p className="text-slate-400 max-w-sm mx-auto font-medium text-lg leading-relaxed">
              {searchTerm
                ? "We couldn't find any classes matching your current search parameters."
                : "You don't have any assigned classes for this academic year yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
