import { useState } from "react";
import {
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";

const gradeLevelLabels: Record<string, string> = {
  GRADE_7: "Grade 7",
  GRADE_8: "Grade 8",
  GRADE_9: "Grade 9",
  GRADE_10: "Grade 10",
};

// Mock data
const mockEnrollments = [
  { id: 1, lrn: "100000000011", name: "Santos, Maria Clara G.", gradeLevel: "GRADE_7", section: "Einstein", enrollmentType: "New", date: "2026-03-30", status: "Approved" },
  { id: 2, lrn: "100000000012", name: "Reyes, Juan Miguel D.", gradeLevel: "GRADE_8", section: "Newton", enrollmentType: "Transferee", date: "2026-03-29", status: "Pending" },
  { id: 3, lrn: "100000000013", name: "Cruz, Angela Mae L.", gradeLevel: "GRADE_7", section: "Darwin", enrollmentType: "New", date: "2026-03-28", status: "Approved" },
  { id: 4, lrn: "100000000014", name: "Garcia, Paolo Jose M.", gradeLevel: "GRADE_9", section: "TBD", enrollmentType: "Transferee", date: "2026-03-27", status: "Pending" },
  { id: 5, lrn: "100000000015", name: "Fernandez, Sofia R.", gradeLevel: "GRADE_10", section: "Curie", enrollmentType: "Continuing", date: "2026-03-26", status: "Approved" },
  { id: 6, lrn: "100000000016", name: "Bautista, Francisco G.", gradeLevel: "GRADE_7", section: "TBD", enrollmentType: "New", date: "2026-03-25", status: "Pending" },
  { id: 7, lrn: "100000000017", name: "Dela Cruz, Anna Maria P.", gradeLevel: "GRADE_8", section: "Newton", enrollmentType: "Continuing", date: "2026-03-24", status: "Approved" },
  { id: 8, lrn: "100000000018", name: "Gonzales, Roberto C.", gradeLevel: "GRADE_9", section: "TBD", enrollmentType: "Transferee", date: "2026-03-23", status: "Rejected" },
];

const statusColors: Record<string, string> = {
  Approved: "status-theme",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
};

const statusIcons: Record<string, React.ReactNode> = {
  Approved: <CheckCircle2 className="w-3 h-3 mr-1" />,
  Pending: <Clock className="w-3 h-3 mr-1" />,
  Rejected: <XCircle className="w-3 h-3 mr-1" />,
};

export default function Enrollment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const { colors } = useTheme();

  const filteredEnrollments = mockEnrollments.filter((enrollment) => {
    const matchesSearch = enrollment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.lrn.includes(searchQuery);
    const matchesStatus = selectedStatus === "all" || enrollment.status === selectedStatus;
    const matchesTab = activeTab === "all" || enrollment.status.toLowerCase() === activeTab;
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: mockEnrollments.length,
    approved: mockEnrollments.filter(e => e.status === "Approved").length,
    pending: mockEnrollments.filter(e => e.status === "Pending").length,
    rejected: mockEnrollments.filter(e => e.status === "Rejected").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/registrar" },
          { label: "Enrollment" },
        ]}
      />
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>
            Enrollment Management
          </h1>
          <p style={{ color: '#6b7280' }} className="mt-1">
            Process and manage student enrollments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip content="Add a new student enrollment application">
            <Button 
              className="text-white rounded-xl px-5 py-2.5 font-semibold shadow-lg transition-all"
              style={{ backgroundColor: colors.primary }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              New Enrollment
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
              <Users className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ backgroundColor: `${colors.secondary}10`, borderColor: `${colors.secondary}20` }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors.secondary}20` }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: colors.secondary }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <Card className="border-0 shadow-xl shadow-gray-200/50 bg-white overflow-hidden rounded-2xl p-0">
        <CardHeader className="border-b border-gray-100 px-6 py-5" style={{ backgroundColor: `${colors.primary}08` }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl text-white shadow-lg" style={{ backgroundColor: colors.primary }}>
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Enrollment Applications</CardTitle>
                <CardDescription className="text-gray-500 text-sm">S.Y. 2026-2027</CardDescription>
              </div>
            </div>
            
            {/* Search and Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search enrollments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 rounded-xl border-gray-200"
                />
              </div>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4 border-b border-gray-100">
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg px-4">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg px-4">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved" className="rounded-lg px-4">Approved ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-lg px-4">Rejected ({stats.rejected})</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="m-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-bold text-gray-700">LRN</TableHead>
                    <TableHead className="font-bold text-gray-700">Student Name</TableHead>
                    <TableHead className="font-bold text-gray-700">Grade Level</TableHead>
                    <TableHead className="font-bold text-gray-700">Section</TableHead>
                    <TableHead className="font-bold text-gray-700">Type</TableHead>
                    <TableHead className="font-bold text-gray-700">Date</TableHead>
                    <TableHead className="font-bold text-gray-700">Status</TableHead>
                    <TableHead className="font-bold text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id} className="transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}08`} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                      <TableCell className="font-mono text-sm text-gray-600">{enrollment.lrn}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: colors.primary }}
                          >
                            {enrollment.name.charAt(0)}
                          </div>
                          <p className="font-semibold text-gray-900">{enrollment.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
                          {gradeLevelLabels[enrollment.gradeLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">{enrollment.section}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-300">
                          {enrollment.enrollmentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {new Date(enrollment.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={statusColors[enrollment.status] === 'status-theme' ? '' : statusColors[enrollment.status]}
                          style={statusColors[enrollment.status] === 'status-theme' ? { backgroundColor: `${colors.primary}15`, color: colors.primary } : undefined}
                        >
                          {statusIcons[enrollment.status]}
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem className="rounded-lg">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {enrollment.status === "Pending" && (
                              <>
                                <DropdownMenuItem className="rounded-lg" style={{ color: colors.primary }}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
