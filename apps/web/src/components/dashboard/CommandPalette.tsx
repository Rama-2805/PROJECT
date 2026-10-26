"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/lib/store/auth";
import { REAL_STUDENTS } from "@/lib/data/realStudents";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  X,
  Users,
  GraduationCap,
  UserCheck,
  Building2,
  Video,
  Cpu,
  FileText,
  Sparkles,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Shield,
  BookOpen,
  Layers,
  Activity,
  CornerDownLeft,
} from "lucide-react";

type CategoryFilter = "ALL" | "STUDENTS" | "FACULTY" | "CLASSROOMS" | "PAGES" | "ACTIONS";

interface SearchItem {
  id: string;
  category: CategoryFilter;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  extraInfo?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  onSelect: () => void;
  keywords?: string[];
}

// ── Faculty Dataset (VTU CSE Department) ─────────────────────────────
const FACULTY_LIST = [
  {
    id: "fac-1",
    name: "Prof. Kalaiselvi S",
    role: "Class Teacher (7th Sem - Section A)",
    department: "Computer Science & Engineering",
    email: "kalaiselvis@vemanait.edu.in",
    subjects: "Machine Learning & AI (21CS71), AI Lab (21CSL76)",
    room: "Room 701",
  },
  {
    id: "fac-2",
    name: "Prof. Harish Kumar",
    role: "Class Teacher (7th Sem - Section B)",
    department: "Computer Science & Engineering",
    email: "harishkumar@vemanait.edu.in",
    subjects: "Distributed & Cloud Computing (21CS72)",
    room: "Room 702",
  },
  {
    id: "fac-3",
    name: "Dr. Ramakrishna",
    role: "Head of Department (HOD CSE)",
    department: "Computer Science & Engineering",
    email: "ramakrishna@vemanait.edu.in",
    subjects: "Natural Language Processing (21CS73)",
    room: "HOD Office - Academic Block A",
  },
  {
    id: "fac-4",
    name: "Prof. Suresh B",
    role: "Associate Professor",
    department: "Computer Science & Engineering",
    email: "sureshb@vemanait.edu.in",
    subjects: "Information & Network Security (21CS74)",
    room: "Staff Cabin 104",
  },
  {
    id: "fac-5",
    name: "Prof. Divya R",
    role: "Assistant Professor",
    department: "Computer Science & Engineering",
    email: "divyar@vemanait.edu.in",
    subjects: "Database Management Systems & Cloud",
    room: "Staff Cabin 105",
  },
];

// ── Classrooms Dataset ───────────────────────────────────────────────
const CLASSROOMS_LIST = [
  {
    id: "room-701",
    name: "7th Sem - Section A",
    roomNumber: "Room 701 (023)",
    building: "Academic Block A, 1st Floor",
    camera: "CAM-023-A (Front AI) & CAM-023-B",
    capacity: "64 Seats",
    teacher: "Prof. Kalaiselvi S",
  },
  {
    id: "room-702",
    name: "7th Sem - Section B",
    roomNumber: "Room 702 (402)",
    building: "Academic Block A, 4th Floor",
    camera: "CAM-402-A (High-Def Scanner)",
    capacity: "60 Seats",
    teacher: "Prof. Harish Kumar",
  },
  {
    id: "room-lab3",
    name: "CSE IoT Lab 3",
    roomNumber: "Lab Block B, 2nd Floor",
    building: "Lab Block B",
    camera: "CAM-LAB-3 (Biometric Terminal)",
    capacity: "45 Seats",
    teacher: "Prof. Kalaiselvi S",
  },
  {
    id: "room-sem1",
    name: "CSE Seminar Hall 1",
    roomNumber: "Auditorium Block, 1st Floor",
    building: "Auditorium Block",
    camera: "CAM-SEM-1 (Dome AI Scanner)",
    capacity: "120 Seats",
    teacher: "Dr. Ramakrishna",
  },
];

// ── Edge Devices Dataset ─────────────────────────────────────────────
const DEVICES_LIST = [
  {
    id: "cam-023-a",
    name: "CAM-023-A: Classroom 701 Front AI Camera",
    location: "7th Sem - Section A (Room 701)",
    type: "NVIDIA Jetson Nano 4GB",
    status: "ONLINE",
  },
  {
    id: "cam-023-b",
    name: "CAM-023-B: Classroom 701 Rear AI Camera",
    location: "7th Sem - Section A (Room 701)",
    type: "NVIDIA Jetson Nano 4GB",
    status: "ONLINE",
  },
  {
    id: "cam-402-a",
    name: "CAM-402-A: Classroom 702 Vision Scanner",
    location: "7th Sem - Section B (Room 702)",
    type: "NVIDIA Jetson Nano 4GB",
    status: "ONLINE",
  },
  {
    id: "cam-lab-3",
    name: "CAM-LAB-3: IoT Lab Biometric Terminal",
    location: "CSE IoT Lab 3 (Lab Block B)",
    type: "Raspberry Pi 5 + Coral TPU",
    status: "ONLINE",
  },
  {
    id: "cam-sem-1",
    name: "CAM-SEM-1: Seminar Hall Dome AI Scanner",
    location: "CSE Seminar Hall 1",
    type: "NVIDIA Jetson Orin Nano",
    status: "ONLINE",
  },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open & reset state
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("ALL");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global escape & shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  // ── Construct All Search Items ─────────────────────────────────────
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];

    // 1. Core Pages & Modules
    const pages = [
      {
        id: "nav-live",
        title: "Live CCTV Vision Stream",
        subtitle: "Real-time edge face recognition & live attendance headcount",
        badge: "Live CCTV",
        badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        path: "/dashboard/live-monitoring",
        icon: Video,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        keywords: ["cctv", "camera", "stream", "video", "headcount", "live", "recognition"],
      },
      {
        id: "nav-enroll",
        title: "Face Enrollment & Centroids",
        subtitle: "Video capture, DBSCAN face clustering & identity assignment",
        badge: "Biometrics",
        badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        path: "/dashboard/face-enrollment",
        icon: Sparkles,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        keywords: ["enroll", "face", "clusters", "clustering", "video", "photos", "vectors"],
      },
      {
        id: "nav-reports",
        title: "VTU Attendance Registers & Reports",
        subtitle: "Official ledgers, exam shortage notices (< 75%) & student cards",
        badge: "VTU Official",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        path: "/dashboard/reports",
        icon: FileText,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        keywords: ["reports", "registers", "vtu", "shortage", "attendance", "cards", "pdf", "csv"],
      },
      {
        id: "nav-twin",
        title: "Campus 3D Digital Twin",
        subtitle: "Interactive 3D Three.js campus model & camera sensor mesh",
        badge: "3D Twin",
        badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        path: "/dashboard/digital-twin",
        icon: Layers,
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-400",
        keywords: ["digital twin", "3d", "campus", "buildings", "spatial", "sensors", "mesh"],
      },
      {
        id: "nav-devices",
        title: "Edge Devices & Hardware Nodes",
        subtitle: "Jetson Nano camera telemetry, remote reboot & diagnostics",
        badge: "Hardware",
        badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        path: "/dashboard/devices",
        icon: Cpu,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-400",
        keywords: ["devices", "jetson", "cameras", "hardware", "iot", "nodes", "reboot"],
      },
      {
        id: "nav-analytics",
        title: "Student Attendance Analytics",
        subtitle: "Attendance curves, dropout alerts & monthly departmental trends",
        badge: "Analytics",
        badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        path: "/dashboard/analytics",
        icon: Activity,
        iconBg: "bg-indigo-500/10",
        iconColor: "text-indigo-400",
        keywords: ["analytics", "trends", "curves", "insights", "dropout", "statistics"],
      },
      {
        id: "nav-courses",
        title: "VTU Course Curriculum & Syllabus",
        subtitle: "7th Semester Computer Science syllabus (2021 Scheme)",
        badge: "Curriculum",
        badgeColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        path: "/dashboard/courses",
        icon: BookOpen,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-400",
        keywords: ["courses", "syllabus", "scheme", "vtu", "subjects", "curriculum"],
      },
      {
        id: "nav-students",
        title: "Students Directory",
        subtitle: "Browse all 120 verified VTU students with attendance & face profile",
        badge: "120 Students",
        badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        path: "/dashboard/students",
        icon: Users,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        keywords: ["students", "roster", "directory", "profiles", "usn"],
      },
      {
        id: "nav-teachers",
        title: "Teachers Directory",
        subtitle: "CSE department faculty members, class teachers & assignments",
        badge: "Faculty",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        path: "/dashboard/teachers",
        icon: UserCheck,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        keywords: ["teachers", "faculty", "professors", "instructors"],
      },
      {
        id: "nav-hod",
        title: "HOD Management Dashboard",
        subtitle: "Department metrics, staff allocations & institutional approvals",
        badge: "HOD Portal",
        badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        path: "/dashboard/hod",
        icon: Shield,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
        keywords: ["hod", "department head", "management", "approvals"],
      },
    ];

    pages.forEach((p) => {
      items.push({
        id: p.id,
        category: "PAGES",
        title: p.title,
        subtitle: p.subtitle,
        badge: p.badge,
        badgeColor: p.badgeColor,
        icon: p.icon,
        iconBg: p.iconBg,
        iconColor: p.iconColor,
        keywords: p.keywords,
        onSelect: () => {
          router.push(p.path);
          setOpen(false);
        },
      });
    });

    // 2. Real Students (120 VTU Students)
    REAL_STUDENTS.forEach((s) => {
      items.push({
        id: `stu-${s.usn}`,
        category: "STUDENTS",
        title: s.fullName,
        subtitle: `USN: ${s.usn} • 7th Sem Section ${s.section} • Computer Science`,
        badge: `Sec ${s.section} · ${s.attendancePercentage}%`,
        badgeColor: s.attendancePercentage >= 75
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-rose-500/15 text-rose-400 border-rose-500/30",
        extraInfo: s.faceEnrolled ? "✓ Face Enrolled" : "Pending Enrollment",
        icon: GraduationCap,
        iconBg: s.section === "A" ? "bg-emerald-500/10" : "bg-purple-500/10",
        iconColor: s.section === "A" ? "text-emerald-400" : "text-purple-400",
        keywords: [s.usn, s.fullName, s.name, `section ${s.section}`, `sec ${s.section}`, "student"],
        onSelect: () => {
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedStudentUsn", s.usn);
          }
          router.push(`/dashboard/reports`);
          setOpen(false);
        },
      });
    });

    // 3. Faculty / Teachers
    FACULTY_LIST.forEach((f) => {
      items.push({
        id: f.id,
        category: "FACULTY",
        title: f.name,
        subtitle: `${f.role} • ${f.subjects} • ${f.room}`,
        badge: "Faculty",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        extraInfo: f.email,
        icon: UserCheck,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        keywords: [f.name, f.role, f.subjects, f.department, f.email, f.room, "faculty", "teacher", "professor"],
        onSelect: () => {
          router.push("/dashboard/teachers");
          setOpen(false);
        },
      });
    });

    // 4. Classrooms & Labs
    CLASSROOMS_LIST.forEach((c) => {
      items.push({
        id: c.id,
        category: "CLASSROOMS",
        title: c.name,
        subtitle: `${c.roomNumber} • ${c.building} • Camera: ${c.camera}`,
        badge: c.capacity,
        badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        extraInfo: `Teacher: ${c.teacher}`,
        icon: Building2,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-400",
        keywords: [c.name, c.roomNumber, c.building, c.camera, c.teacher, "room", "classroom", "lab"],
        onSelect: () => {
          router.push("/dashboard/classrooms");
          setOpen(false);
        },
      });
    });

    // 5. Edge Devices / Cameras
    DEVICES_LIST.forEach((d) => {
      items.push({
        id: d.id,
        category: "CLASSROOMS",
        title: d.name,
        subtitle: `Location: ${d.location} • Architecture: ${d.type}`,
        badge: d.status,
        badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: Cpu,
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-400",
        keywords: [d.name, d.location, d.type, "camera", "edge", "jetson", "device"],
        onSelect: () => {
          router.push("/dashboard/devices");
          setOpen(false);
        },
      });
    });

    // 6. Quick System Actions
    const actions: SearchItem[] = [
      {
        id: "act-theme",
        category: "ACTIONS",
        title: `Switch Theme to ${theme === "dark" ? "Light Mode" : "Dark Mode"}`,
        subtitle: `Currently in ${theme.toUpperCase()} mode. Toggle interface color palette`,
        badge: "Toggle Theme",
        badgeColor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        icon: theme === "dark" ? Sun : Moon,
        iconBg: "bg-yellow-500/10",
        iconColor: "text-yellow-400",
        keywords: ["theme", "light", "dark", "mode", "color", "appearance"],
        onSelect: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: "act-ai",
        category: "ACTIONS",
        title: "AI Attendance Intelligence & Analytics",
        subtitle: "Explore predictive models, attendance patterns, and automated insights",
        badge: "AI Analytics",
        badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        icon: Sparkles,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        keywords: ["ai", "assistant", "copilot", "analytics", "trends", "intelligence", "insights"],
        onSelect: () => {
          router.push("/dashboard/analytics");
          setOpen(false);
        },
      },
      {
        id: "act-shortage",
        category: "ACTIONS",
        title: "Generate VTU Shortage Notice (< 75%)",
        subtitle: "Jump to Reports Center and compile official shortage list for VTU exams",
        badge: "Shortage Alert",
        badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        icon: FileText,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
        keywords: ["shortage", "vtu", "notice", "exam", "below 75", "export"],
        onSelect: () => {
          router.push("/dashboard/reports");
          setOpen(false);
        },
      },
      {
        id: "act-logout",
        category: "ACTIONS",
        title: "Sign Out / End Session",
        subtitle: "Safely end current faculty or administrator session",
        badge: "Logout",
        badgeColor: "bg-red-500/15 text-red-400 border-red-500/30",
        icon: LogOut,
        iconBg: "bg-red-500/10",
        iconColor: "text-red-400",
        keywords: ["logout", "sign out", "exit", "disconnect"],
        onSelect: async () => {
          setOpen(false);
          await useAuthStore.getState().logout();
          window.location.href = "/";
        },
      },
    ];

    actions.forEach((a) => items.push(a));

    return items;
  }, [router, setOpen, theme, toggleTheme]);

  // ── Filter Results Based on Query & Category Filter ───────────────
  const filteredResults = useMemo(() => {
    const q = query.trim().toUpperCase();

    let list = allItems;
    if (activeCategory !== "ALL") {
      list = list.filter((item) => item.category === activeCategory);
    }

    if (!q) {
      // Default recommended / quick view
      if (activeCategory === "ALL") {
        return [
          ...allItems.filter((i) => i.category === "PAGES").slice(0, 5),
          ...allItems.filter((i) => i.category === "STUDENTS").slice(0, 4),
          ...allItems.filter((i) => i.category === "FACULTY").slice(0, 3),
          ...allItems.filter((i) => i.category === "ACTIONS").slice(0, 2),
        ];
      }
      return list.slice(0, 15);
    }

    // Ranked multi-token search
    return list
      .filter((item) => {
        const titleMatch = item.title.toUpperCase().includes(q);
        const subMatch = item.subtitle.toUpperCase().includes(q);
        const keywordMatch = item.keywords?.some((k) => k.toUpperCase().includes(q));
        const badgeMatch = item.badge?.toUpperCase().includes(q);
        return titleMatch || subMatch || keywordMatch || badgeMatch;
      })
      .slice(0, 35);
  }, [allItems, query, activeCategory]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredResults.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].onSelect();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const categories: CategoryFilter[] = ["ALL", "STUDENTS", "FACULTY", "CLASSROOMS", "PAGES", "ACTIONS"];
      const currentIdx = categories.indexOf(activeCategory);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + categories.length) % categories.length
        : (currentIdx + 1) % categories.length;
      setActiveCategory(categories[nextIdx]);
    }
  };

  if (!open) return null;

  const CATEGORY_TABS: { key: CategoryFilter; label: string; count?: number }[] = [
    { key: "ALL", label: "All" },
    { key: "STUDENTS", label: "Students", count: 120 },
    { key: "FACULTY", label: "Faculty", count: 5 },
    { key: "CLASSROOMS", label: "Rooms & Nodes", count: 9 },
    { key: "PAGES", label: "Pages" },
    { key: "ACTIONS", label: "Actions" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] sm:pt-[12vh] bg-black/65 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
    >
      {/* Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-2xl rounded-2xl bg-bg-secondary/95 dark:bg-[#0c1017]/95 border border-glass-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
      >
        {/* Glowing Top Subtle Ambient Line */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent pointer-events-none" />

        {/* ─── Search Input Bar (No rectangular focus border) ────────────────── */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-glass-border gap-3">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, USN (e.g. 1VI23CS001), teachers, classrooms, reports..."
            className="w-full bg-transparent text-sm sm:text-base text-text-primary placeholder:text-text-muted outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none font-normal"
            autoComplete="off"
            spellCheck={false}
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-glass-light transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-glass-light border border-glass-border text-[10px] font-mono text-text-muted font-semibold tracking-wider">
            ESC
          </kbd>
        </div>

        {/* ─── Category Scope Filter Pills ───────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-glass-border/40 bg-glass-light/30 overflow-x-auto scrollbar-none text-xs">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveCategory(tab.key);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold shadow-sm"
                    : "text-text-muted hover:text-text-primary hover:bg-glass-light border border-transparent"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive ? "bg-blue-500/30 text-blue-300" : "bg-glass-light text-text-dim"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Results List ─────────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="overflow-y-auto max-h-[50vh] p-2 space-y-1 custom-scrollbar"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Search className="w-8 h-8 text-text-muted/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-primary">
                No matching results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Try searching by USN (e.g. 1VI23CS001, 1VI23CS058), student name, teacher, room number, or module.
              </p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => item.onSelect()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all border",
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/35 text-text-primary shadow-sm"
                      : "bg-transparent border-transparent text-text-secondary hover:bg-glass-light hover:text-text-primary"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon / Avatar box */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-glass-border transition-transform duration-200 group-hover:scale-105",
                        item.iconBg,
                        item.iconColor
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Title + Subtitle */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-xs sm:text-sm font-semibold truncate",
                          isSelected ? "text-text-primary" : "text-text-primary/90"
                        )}>
                          {item.title}
                        </span>

                        {item.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0",
                              item.badgeColor || "bg-glass-light text-text-muted border-glass-border"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}

                        {item.extraInfo && (
                          <span className="text-[10px] text-text-dim truncate hidden md:inline">
                            • {item.extraInfo}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Enter selection action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/20 px-2 py-1 rounded-md border border-blue-500/30 animate-in fade-in duration-100">
                        Open <CornerDownLeft className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Modern Status Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-glass-border bg-glass-light/40 text-[11px] text-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-mono text-text-primary font-semibold">
              {filteredResults.length}
            </span>
            <span>{filteredResults.length === 1 ? "result" : "results"}</span>
            {query && (
              <span className="hidden sm:inline text-text-dim">
                for &ldquo;{query}&rdquo;
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="hidden sm:inline-flex items-center gap-1 text-text-dim">
              <kbd className="px-1.5 py-0.5 rounded bg-glass-light border border-glass-border text-text-primary font-bold">↑↓</kbd> Navigate
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-text-dim">
              <kbd className="px-1.5 py-0.5 rounded bg-glass-light border border-glass-border text-text-primary font-bold">↵</kbd> Select
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-text-dim">
              <kbd className="px-1.5 py-0.5 rounded bg-glass-light border border-glass-border text-text-primary font-bold">Tab</kbd> Scope
            </span>
            <span className="inline-flex items-center gap-1 text-text-dim">
              <kbd className="px-1.5 py-0.5 rounded bg-glass-light border border-glass-border text-text-primary font-bold">ESC</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
