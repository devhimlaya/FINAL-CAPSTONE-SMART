import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Users,
  Settings,
  Shield,
  Activity,
  Sliders,
  FileSpreadsheet,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getAcronym } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { SERVER_URL } from "@/lib/api";

interface UserData {
  id: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  isDropdown?: boolean;
  children?: Array<{ name: string; href: string; icon: any }>;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Class Assignments", href: "/admin/assignments", icon: BookOpen },
  { name: "Audit Logs", href: "/admin/logs", icon: Activity },
  { name: "Grading Config", href: "/admin/grading", icon: Sliders },
  {
    name: "Template Managers",
    icon: FileSpreadsheet,
    isDropdown: true,
    children: [
      { name: "SF Forms", href: "/admin/templates", icon: FileSpreadsheet },
      { name: "ECR Templates", href: "/admin/ecr-templates", icon: BookOpen },
    ],
  },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('adminDropdownState');
    return saved ? JSON.parse(saved) : { 'Template Managers': true };
  });
  const { colors, logoUrl, schoolName } = useTheme();
  const acronym = getAcronym(schoolName);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    const token = sessionStorage.getItem("token");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "ADMIN") {
      navigate("/login");
      return;
    }

    setUser(parsedUser);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('adminSidebarCollapsed', String(newState));
  };

  const toggleDropdown = (name: string) => {
    const newState = { ...dropdownOpen, [name]: !dropdownOpen[name] };
    setDropdownOpen(newState);
    localStorage.setItem('adminDropdownState', JSON.stringify(newState));
  };

  const getCurrentPageTitle = () => {
    for (const nav of navigation) {
      if (nav.href && (location.pathname === nav.href || (nav.href !== "/admin" && location.pathname.startsWith(nav.href)))) {
        return nav.name;
      }
      if (nav.children) {
        const child = nav.children.find(c => location.pathname === c.href || location.pathname.startsWith(c.href));
        if (child) return child.name;
      }
    }
    return "Dashboard";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const userEmail = user.email || `${user.username}@school.edu.ph`;
  const userDisplayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.username;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-sm will-change-[width,transform]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[70px] w-[280px]" : "w-[280px]"
        )}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center border-b border-slate-100 overflow-hidden px-4">
          <div className="flex items-center w-full min-w-[240px]">
            <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out"
                style={{ 
                  backgroundColor: logoUrl ? 'white' : colors.primary, 
                  boxShadow: `0 4px 10px ${colors.primary}20`,
                  transform: sidebarCollapsed ? 'scale(0.9)' : 'scale(1)'
                }}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl.startsWith("http") ? logoUrl : `${SERVER_URL}${logoUrl}`}
                    alt="School Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shield className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
            <div className={cn(
              "ml-3 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left flex-shrink-0",
              sidebarCollapsed ? "opacity-0 scale-90 -translate-x-4 pointer-events-none" : "opacity-100 scale-100 translate-x-0"
            )}>
              <span className="font-bold text-slate-800 text-base tracking-tight whitespace-nowrap uppercase">{acronym}</span>
            </div>
          </div>
          <button
            className="lg:hidden ml-auto p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar overflow-x-hidden">
          <div className="space-y-1">
            {navigation.map((item) => {
              if (item.isDropdown && item.children) {
                const hasActiveChild = item.children.some(child => 
                  location.pathname === child.href || location.pathname.startsWith(child.href)
                );
                const isOpen = dropdownOpen[item.name];
                
                return (
                  <div key={item.name}>
                    {/* Dropdown Header */}
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(
                        "w-full flex items-center rounded-xl text-sm font-medium transition-colors duration-200 mb-0.5 group overflow-hidden px-2 py-2.5",
                        hasActiveChild ? "text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      )}
                      style={{
                        backgroundColor: hasActiveChild && !sidebarCollapsed ? `${colors.primary}10` : undefined,
                      }}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center w-full min-w-[240px]">
                        <div className="w-6 h-6 flex flex-shrink-0 items-center justify-center">
                          <item.icon className={cn(
                            "w-5 h-5 transition-colors duration-200",
                            hasActiveChild ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                          )} />
                        </div>
                        <div className={cn(
                          "ml-4 flex items-center justify-between flex-1 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left",
                          sidebarCollapsed ? "opacity-0 scale-90 -translate-x-4 pointer-events-none" : "opacity-100 scale-100 translate-x-0"
                        )}>
                          <span className="whitespace-nowrap">{item.name}</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            isOpen && "transform rotate-180"
                          )} />
                        </div>
                      </div>
                    </button>
                    
                    {/* Dropdown Children */}
                    {isOpen && !sidebarCollapsed && (
                      <div className="mt-0.5 space-y-0.5 pl-10 animate-in fade-in slide-in-from-top-1 duration-200">
                        {item.children.map((child) => {
                          const isActive = location.pathname === child.href || location.pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.name}
                              to={child.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200 px-4 py-2"
                              )}
                              style={{
                                backgroundColor: isActive ? colors.primary : undefined,
                                color: isActive ? "white" : undefined,
                              }}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Regular navigation item
              const isActive = location.pathname === item.href || 
                (item.href && item.href !== "/admin" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-colors duration-200 mb-0.5 group overflow-hidden px-2 py-2.5",
                    isActive ? "text-white shadow-md shadow-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  style={{
                    backgroundColor: isActive ? colors.primary : undefined,
                  }}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center w-full min-w-[240px]">
                    <div className="w-6 h-6 flex flex-shrink-0 items-center justify-center">
                      <item.icon className={cn(
                        "w-5 h-5 transition-colors duration-200",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                    </div>
                    <span className={cn(
                      "ml-4 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left whitespace-nowrap flex-shrink-0",
                      sidebarCollapsed ? "opacity-0 scale-90 -translate-x-4 pointer-events-none" : "opacity-100 scale-100 translate-x-0"
                    )}>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 overflow-hidden">
          <div className="flex items-center w-full min-w-[240px] px-1 py-1">
            <div className="w-9 h-9 flex flex-shrink-0 items-center justify-center">
              <Avatar className="w-9 h-9 border border-white shadow-sm transition-transform duration-200" style={{ transform: sidebarCollapsed ? 'scale(0.9)' : 'scale(1)' }}>
                <AvatarFallback className="bg-white text-slate-700 font-semibold text-xs">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className={cn(
              "ml-3 flex-1 min-w-0 flex items-center justify-between transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left",
              sidebarCollapsed ? "opacity-0 scale-90 -translate-x-4 pointer-events-none" : "opacity-100 scale-100 translate-x-0"
            )}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{userDisplayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-white hover:text-red-600 text-slate-400 transition-colors duration-200 ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        "transition-[padding] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col min-h-screen will-change-[padding]",
        sidebarCollapsed ? "lg:pl-[70px]" : "lg:pl-[280px]"
      )}>
        {/* Top navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6">
          <div className="h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all active:scale-95"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    toggleSidebarCollapse();
                  } else {
                    setSidebarOpen(true);
                  }
                }}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Page Title */}
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admin Portal</span>
                <span className="text-base font-bold text-slate-900 -mt-1">
                  {getCurrentPageTitle()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User Avatar and Name */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-slate-900 leading-none">
                    {user.firstName || user.username}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1">
                    Online
                  </span>
                </div>
                <Avatar className="w-9 h-9 ring-2 ring-slate-100 ring-offset-2">
                  <AvatarFallback className="bg-slate-200 text-slate-700 text-sm font-bold">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
