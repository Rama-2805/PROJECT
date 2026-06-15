"use client";

import { useRef, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { Search, Filter, MoreHorizontal, Download, UserPlus, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

// Mock Data Generator for 10,000+ students
const MOCK_DEPARTMENTS = ["Computer Science", "Electrical Eng", "Mechanical Eng", "Business", "Design"];
const generateMockStudents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `STU-${10000 + i}`,
    name: `Student ${i + 1}`,
    department: MOCK_DEPARTMENTS[Math.floor(Math.random() * MOCK_DEPARTMENTS.length)],
    semester: Math.floor(Math.random() * 8) + 1,
    attendance: Math.floor(Math.random() * 40) + 60,
    engagement: Math.floor(Math.random() * 50) + 50,
    riskLevel: Math.random() > 0.9 ? "HIGH" : Math.random() > 0.7 ? "MEDIUM" : "LOW",
    status: Math.random() > 0.95 ? "INACTIVE" : "ACTIVE"
  }));
};

const allStudents = generateMockStudents(50000); // Massive mock dataset

export default function StudentsPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            student.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = filterRisk === "ALL" || student.riskLevel === filterRisk;
      return matchesSearch && matchesRisk;
    });
  }, [searchQuery, filterRisk]);

  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // 64px row height
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Student Directory</h1>
          <p className="text-gray-400 text-sm mt-1">Manage {filteredStudents.length.toLocaleString()} enrolled students</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or department..."
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Virtualized Data Table */}
      <div className="flex-1 rounded-xl border border-white/10 bg-[#0A0F1E]/80 backdrop-blur-md overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Student</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-1">Sem</div>
          <div className="col-span-2">Attendance</div>
          <div className="col-span-2">AI Risk Level</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Virtualized Body */}
        <div 
          ref={parentRef} 
          className="flex-1 overflow-auto custom-scrollbar"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const student = filteredStudents[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center cursor-pointer"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => router.push(`/dashboard/students/${student.id}`)}
                >
                  {/* Student Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.id}</div>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="col-span-2 text-sm text-gray-300">
                    {student.department}
                  </div>

                  {/* Semester */}
                  <div className="col-span-1 text-sm text-gray-300">
                    {student.semester}
                  </div>

                  {/* Attendance */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-full max-w-[100px] h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", student.attendance > 85 ? "bg-emerald-500" : student.attendance > 75 ? "bg-yellow-500" : "bg-red-500")}
                        style={{ width: `${student.attendance}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{student.attendance}%</span>
                  </div>

                  {/* Risk Level */}
                  <div className="col-span-2 flex items-center gap-2">
                    {student.riskLevel === 'HIGH' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <ShieldAlert className="w-3 h-3" /> High Risk
                      </span>
                    ) : student.riskLevel === 'MEDIUM' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Medium Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Low Risk
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-center">
                    <span className={cn("text-xs font-medium", student.status === 'ACTIVE' ? "text-emerald-400" : "text-gray-500")}>
                      {student.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <button className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
