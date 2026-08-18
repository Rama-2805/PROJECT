#!/usr/bin/env python3
import sys

target_path = "/Users/rama/Major project/PROJECT/apps/web/src/app/dashboard/face-enrollment/page.tsx"

with open(target_path, "r", encoding="utf-8") as f:
    content = f.read()

correct_assign_modal = '''/* ═══════════════════════════════════════════════════════════════════
   ASSIGN STUDENT MODAL
═══════════════════════════════════════════════════════════════════ */
function AssignModal({ cluster, onClose, onDone }: { cluster: Cluster; onClose: () => void; onDone: (id: string, name: string) => void }) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [confirmStep, setConfirmStep] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<{ name: string; usn: string; existingId?: string; form?: any } | null>(null);

  const [form, setForm] = useState({
    name: "", usn: "", email: "", phone: "", dept: "CSE", sem: "7", section: "A"
  });
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "existing") {
      setLoadingStudents(true);
      authFetch(`${API_BASE}/students`)
        .then(r => r.json())
        .then(d => { setStudents(Array.isArray(d) ? d : d.data || []); })
        .catch(() => {})
        .finally(() => setLoadingStudents(false));
    }
  }, [tab]);

  const filtered = students.filter(s =>
    !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.usn?.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full bg-glass-light border border-glass-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  const handlePrepareNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.usn) {
      setError("Please fill in Student Name and USN");
      return;
    }
    setError(null);
    setPendingStudent({ name: form.name, usn: form.usn, form });
    setConfirmStep(true);
  };

  const handlePrepareExisting = (student: any) => {
    setError(null);
    setPendingStudent({ name: student.fullName, usn: student.usn || student.studentId, existingId: student.id });
    setConfirmStep(true);
  };

  const executeAssignment = async () => {
    if (!pendingStudent) return;
    setSaving(true);
    setError(null);
    try {
      let body: any = { clusterId: cluster.id };
      if (pendingStudent.existingId) {
        body.existingStudentId = pendingStudent.existingId;
        body.usn = pendingStudent.usn;
        body.fullName = pendingStudent.name;
      } else {
        body.fullName = pendingStudent.name;
        body.usn = pendingStudent.usn;
        body.email = pendingStudent.form?.email;
        body.phone = pendingStudent.form?.phone;
        body.department = pendingStudent.form?.dept;
        body.semester = `${pendingStudent.form?.sem}th Semester`;
        body.section = `Section ${pendingStudent.form?.section}`;
      }

      const res = await authFetch(`${API_BASE}/enrollment/clusters/assign-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Assignment failed");

      try {
        const aiClusterId = cluster.clusterId || cluster.id;
        await fetch(`${AI_BASE}/api/v1/sessions/${cluster.sessionId}/clusters/${aiClusterId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usn: pendingStudent.usn, name: pendingStudent.name }),
        });
      } catch {}

      onDone(cluster.id, pendingStudent.name);
    } catch (err: any) {
      setError(err.message || "Failed to assign student");
      setConfirmStep(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/75 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg bg-bg-secondary border border-glass-border rounded-2xl shadow-glow-purple overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <ClusterFace cluster={cluster} size={40} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Assign Student</h2>
              <p className="text-[11px] text-text-muted">{cluster.clusterId || `Cluster #${cluster.clusterNumber}`} · {cluster.sampleCount.toLocaleString()} detections · {Math.round(cluster.confidence * 100)}% consistency</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="px-6 py-5 space-y-4">
          {confirmStep && pendingStudent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-glass-light border border-glass-border space-y-3 text-center">
                <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Confirm Cluster Assignment</p>
                <p className="text-sm text-text-secondary">
                  Assign identity cluster <span className="font-mono text-blue-400 font-bold">{cluster.clusterId || `Cluster #${cluster.clusterNumber}`}</span> to student:
                </p>
                <div className="py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-base font-bold text-emerald-400">{pendingStudent.name}</p>
                  <p className="text-xs font-mono text-text-secondary mt-0.5">{pendingStudent.usn}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-secondary text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeAssignment}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex rounded-xl bg-glass-light p-1 border border-glass-border">
                <button
                  type="button"
                  onClick={() => setTab("existing")}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    tab === "existing" ? "bg-emerald-600 text-white shadow" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Select Existing Student
                </button>
                <button
                  type="button"
                  onClick={() => setTab("new")}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    tab === "new" ? "bg-emerald-600 text-white shadow" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Register New Student
                </button>
              </div>

              {tab === "existing" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search by name or USN (e.g. 1VI23CS001)…" className={cn(inputCls, "pl-10")} />
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {loadingStudents && (
                      <div className="text-center py-6 text-text-muted text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
                      </div>
                    )}
                    {!loadingStudents && filtered.map(s => (
                      <button key={s.id} type="button" onClick={() => handlePrepareExisting(s)} disabled={saving}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-glass-light border border-glass-border hover:bg-emerald-500/8 hover:border-emerald-500/30 text-left transition-all group disabled:opacity-60">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(s.fullName || "?")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{s.fullName}</p>
                          <p className="text-[11px] text-text-muted">{s.usn} · {s.department}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 transition-colors shrink-0" />
                      </button>
                    ))}
                    {!loadingStudents && filtered.length === 0 && (
                      <div className="text-center py-8 text-text-muted text-sm">No students found</div>
                    )}
                  </div>
                </div>
              )}

              {tab === "new" && (
                <form onSubmit={handlePrepareNew} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Full Name</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Aditya Sharma" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>USN</label>
                      <input value={form.usn} onChange={e => setForm(f => ({ ...f, usn: e.target.value }))}
                        placeholder="e.g. 1VI23CS001" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Department</label>
                      <select value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))} className={inputCls}>
                        {["CSE", "ISE", "ECE", "MECH", "CIVIL", "AI_ML"].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Semester</label>
                      <select value={form.sem} onChange={e => setForm(f => ({ ...f, sem: e.target.value }))} className={inputCls}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Section</label>
                      <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className={inputCls}>
                        {["A", "B", "C", "D"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-2">
                    Continue to Confirmation <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}'''

start_marker = "/* ═══════════════════════════════════════════════════════════════════\n   ASSIGN STUDENT MODAL\n═══════════════════════════════════════════════════════════════════ */"
end_marker = "/* ═══════════════════════════════════════════════════════════════════\n   GALLERY MODAL\n═══════════════════════════════════════════════════════════════════ */"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error finding markers: start={start_idx}, end={end_idx}")
    sys.exit(1)

new_content = content[:start_idx] + correct_assign_modal + "\n\n" + content[end_idx:]

with open(target_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully replaced AssignModal in page.tsx")
