import { useEffect, useState } from "react";
import { useSyncStream } from "@/hooks/useSyncStream";
import { Link } from "react-router-dom";
import { BookOpen, Users, ChevronRight, Search, Filter, LayoutGrid, List, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { gradesApi, advisoryApi, type ClassAssignment } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";

const gradeLevelLabels: Record<string, string> = {
  GRADE_7: "Grade 7",
  GRADE_8: "Grade 8",
  GRADE_9: "Grade 9",
  GRADE_10: "Grade 10",
};

const gradeLevelColors: Record<string, string> = {
  GRADE_7: "border",
  GRADE_8: "border",
  GRADE_9: "border",
  GRADE_10: "border",
};

const gradeLevelOpacity: Record<string, string> = {
  GRADE_7: "18",
  GRADE_8: "28",
  GRADE_9: "38",
  GRADE_10: "48",
};

export default function ClassRecordsList() {
  const { colors } = useTheme();
  const { syncVersion } = useSyncStream();
  const [classes, setClasses] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

    // Silent background sync — pulls fresh Atlas + EnrollPro data, then re-fetches
    advisoryApi.syncFromEnrollPro()
      .then(() => gradesApi.getMyClasses().then(r => setClasses(r.data)))
      .catch(() => {/* silent */});
  }, [syncVersion]);

  const filteredClasses = classes.filter(
    (c) =>
      c.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gradeLevelLabels[c.section.gradeLevel]
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

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
              style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
            />
          </div>
          <p className="text-gray-500 font-medium text-lg">Loading class rosters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase tracking-widest px-3">
              {classes.length} ACTIVE CLASSES
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Class Records</h1>
          <p className="text-slate-500 font-medium text-lg">Select a section to manage student performance and mastery</p>
        </div>
      </div>

      {/* Modern Filter Bar */}
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

      {/* Class List - Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClasses.map((assignment, index) => (
            <Link 
              key={assignment.id} 
              to={`/teacher/records/${assignment.id}`}
              className="animate-slide-up group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="h-full border-0 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 rounded-[2.5rem] bg-white overflow-hidden flex flex-col relative group-hover:-translate-y-2">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -mr-10 -mt-10 group-hover:bg-indigo-50 transition-colors" />
                
                <CardHeader className="p-8 pb-4 relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <Badge
                      className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase tracking-[0.1em] px-4 py-1.5 rounded-full"
                    >
                      {gradeLevelLabels[assignment.section.gradeLevel]}
                    </Badge>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject Title</p>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {assignment.subject.name}
                    </h3>
                  </div>
                  <div className="pt-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-sm font-bold text-slate-500">
                      Section {assignment.section.name} &bull; {assignment.schoolYear}
                    </p>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 pt-6 mt-auto relative z-10">
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled</p>
                        <p className="text-sm font-black text-slate-900">
                          {assignment.section.enrollments?.length || 0} Learners
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weights</p>
                      <p className="text-xs font-black text-slate-900 font-mono tracking-tighter">
                        {assignment.subject.writtenWorkWeight}/{assignment.subject.perfTaskWeight}/{assignment.subject.quarterlyAssessWeight}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Class List - List View */}
      {viewMode === "list" && (
        <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
          <div className="divide-y divide-slate-50">
            {filteredClasses.map((assignment, index) => (
              <Link 
                key={assignment.id} 
                to={`/teacher/records/${assignment.id}`}
                className="animate-slide-up block group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-8 hover:bg-slate-50/50 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-8 group">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-indigo-100 transition-all duration-500">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {assignment.subject.name}
                      </h3>
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
                      <p className="text-2xl font-black text-slate-900 leading-none">
                        {assignment.section.enrollments?.length || 0}
                      </p>
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

      {filteredClasses.length === 0 && (
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
