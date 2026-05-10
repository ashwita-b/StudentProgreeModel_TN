import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import {
  LogOut, Users, TrendingUp, Award, Clock,
  Search, Download, Lock, Unlock, X, Eye,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { apiService, ModuleInfo } from '../services/api';
import logo from "../../assets/technova-logo.png";

const SCHOOLS = [
  "All Schools",
  "Anant English School, Siddhipur",
  "LRI School, Kalanki",
  "MBBS, Hetauda",
];

interface StudentResult {
  student_id: number;
  student_name: string;
  student_email: string;
  school: string;
  module_id: string;
  module_label: string;
  session_id: number;
  score: number;
  total_questions: number;
  accuracy: number;
  theta: number;
  sem: number;
  standardized_score: number;
  completed_at: string;
}

interface StudentDetail {
  student_name: string;
  student_email: string;
  school: string;
  module_id: string;
  module_label: string;
  score: number;
  total_questions: number;
  accuracy: number;
  theta: number;
  sem: number;
  standardized_score: number;
  completed_at: string;
  parametric_values: Record<string, number>;
  responses: Array<{
    question_code: string;
    question_text: string;
    difficulty: number;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────
function perfLabel(score: number) {
  if (score >= 115) return { label: 'Excellent',         color: '#16a34a' };
  if (score >= 100) return { label: 'Good',              color: '#2563eb' };
  if (score >= 85)  return { label: 'Average',           color: '#d97706' };
  return              { label: 'Needs Improvement',      color: '#dc2626' };
}

// ── Export Confirmation Modal ────────────────────────────────────
function ExportModal({
  schoolFilter,
  onClose,
  onSuccess,
}: {
  schoolFilter: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'confirm' | 'loading' | 'done'>('confirm');
  const [preview, setPreview] = useState<{ total_sessions: number; confirm_token: string } | null>(null);
  const [deleteAfter, setDeleteAfter] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService
      .getExportPreview(schoolFilter !== 'All Schools' ? schoolFilter : undefined)
      .then((res) => {
        if (res.error) { setError(res.error); return; }
        setPreview(res.data!);
      });
  }, [schoolFilter]);

  const handleExport = async () => {
    if (!preview) return;
    setStep('loading');
    setError('');
    try {
      await apiService.exportResults(
        preview.confirm_token,
        schoolFilter !== 'All Schools' ? schoolFilter : undefined,
        deleteAfter,
      );
      setStep('done');
      if (deleteAfter) setTimeout(onSuccess, 1500);
      else onSuccess();
    } catch (e: any) {
      setError(e.message || 'Export failed');
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova" className="w-9 h-9 object-contain" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Export Results</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">School filter</span>
                <span className="font-semibold">{schoolFilter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sessions to export</span>
                <span className="font-semibold">{preview ? preview.total_sessions : '—'}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAfter}
                  onChange={(e) => setDeleteAfter(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600"
                />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Delete all data after export</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    This permanently wipes all test sessions and responses. Cannot be undone.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleExport}
                disabled={!preview}
                className={`flex-1 gap-2 ${deleteAfter ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-700'} text-white`}
              >
                <Download className="w-4 h-4" />
                {deleteAfter ? 'Export & Delete' : 'Export CSV'}
              </Button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
            />
            <p className="text-sm text-gray-500">Generating CSV…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Download started!</p>
            <p className="text-sm text-gray-500">
              {deleteAfter ? 'Database has been cleared.' : 'Data is preserved.'}
            </p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Admin Report Modal — html2canvas download, no print dialog ───
function AdminReportModal({ detail, onClose }: { detail: StudentDetail; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const dateStr = new Date(detail.completed_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const { label, color } = perfLabel(detail.standardized_score);

  // ── Download the report card div as a PNG ───────────────────
  const handleDownload = async () => {
    const el = cardRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 3,           // 3× for high-res
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${detail.student_name.replace(/\s+/g, '-')}-Report.png`;
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            Student Report — {detail.student_name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              {downloading
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <Download className="w-4 h-4" />}
              {downloading ? 'Saving…' : 'Download PNG'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto max-h-[80vh] p-6 space-y-4">

          {/*
            ┌────────────────────────────────────────────────────┐
            │  cardRef — this entire block is captured as PNG.   │
            │  Keep it self-contained, no external font deps.    │
            └────────────────────────────────────────────────────┘
          */}
          <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden border border-gray-200">

            {/* Dark header band */}
            <div className="bg-gray-900 text-white px-7 py-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 overflow-hidden">
                  <img
                    src={logo}
                    alt="Technova"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-widest uppercase">Technova Education</h1>
                  <p className="text-gray-400 text-xs tracking-wider mt-0.5">Adaptive Assessment System</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-4">
                <h2 className="text-xl font-bold tracking-[0.18em] uppercase text-center">
                  Student Report Card
                </h2>
              </div>
            </div>

            {/* Student info strip */}
            <div className="px-7 py-5 bg-slate-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                {[
                  { l: 'Student Name',   v: detail.student_name },
                  { l: 'School',         v: detail.school },
                  { l: 'Module',         v: detail.module_label },
                  { l: 'Date Completed', v: dateStr },
                  { l: 'Email',          v: detail.student_email },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{l}</p>
                    <p className="font-semibold text-gray-900 mt-0.5 text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary scores */}
            <div className="px-7 py-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { v: `${detail.score} / ${detail.total_questions}`, l: 'Score' },
                  { v: `${detail.accuracy.toFixed(1)}%`,              l: 'Accuracy' },
                  { v: String(detail.standardized_score),             l: 'Standardized Score' },
                ].map((item) => (
                  <div key={item.l} className="border-2 border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{item.v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.l}</p>
                  </div>
                ))}
              </div>

              {/* IRT metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { v: detail.theta.toFixed(3), l: 'Theta (Ability Estimate)' },
                  { v: detail.sem.toFixed(3),   l: 'SEM (Measurement Error)' },
                ].map((item) => (
                  <div key={item.l} className="border-2 border-slate-100 rounded-xl p-3 bg-slate-50 text-center">
                    <p className="text-xl font-bold text-gray-900">{item.v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.l}</p>
                  </div>
                ))}
              </div>

              {/* Performance band */}
              <div
                className="rounded-xl p-4 text-center border-2"
                style={{ borderColor: color, backgroundColor: `${color}12` }}
              >
                <p className="text-xl font-bold" style={{ color }}>{label}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Overall Performance Band</p>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-7 py-3 bg-slate-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Theta = estimated ability level (higher = stronger). SEM = standard error of measurement (lower = more precise).
                Standardized Score scaled to mean 100. Generated by Technova Education Platform.
              </p>
            </div>
          </div>
          {/* ── end cardRef ── */}

          {/* Response table — outside the captured area (too long for PNG) */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Question-by-Question Responses</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    {['Code', 'Question', 'Diff.', 'Your Ans', 'Correct', 'Result'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.responses.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-gray-500">{r.question_code}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-gray-700"
                          title={r.question_text}>{r.question_text}</td>
                      <td className="px-3 py-2 text-gray-500">{r.difficulty?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-700 font-medium">{r.user_answer}</td>
                      <td className="px-3 py-2 text-gray-700 font-medium">{r.correct_answer}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          r.is_correct
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {r.is_correct ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────
export default function AdminDashboardFixed() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('All Schools');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState({
    total_students: 0, completed_tests: 0, average_score: 0, average_questions: 0,
  });
  const [loadingModules, setLoadingModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'examiner') { navigate('/'); return; }
    setUser(u);
    initializeDashboard();
  }, [navigate]);

  const initializeDashboard = async () => {
    const [statsRes, studentsRes, modulesRes] = await Promise.all([
      apiService.getAdminStats(),
      apiService.getAllStudents(),
      apiService.getModules(),
    ]);
    if (statsRes.data)   setStats(statsRes.data as any);
    if (studentsRes.data) setStudents(studentsRes.data as StudentResult[]);
    if (modulesRes.data)  setModules(modulesRes.data as ModuleInfo[]);
  };

  const handleSchoolFilter = async (school: string) => {
    setSchoolFilter(school);
    const res = await apiService.getAllStudents(school !== 'All Schools' ? school : undefined);
    if (res.data) setStudents(res.data as StudentResult[]);
  };

  const handleViewStudent = async (sessionId: number) => {
    const res = await apiService.getStudentDetail(sessionId);
    if (res.data) setSelectedStudent(res.data as StudentDetail);
  };

  const handleToggleModule = async (mod: ModuleInfo) => {
    setLoadingModules((prev) => ({ ...prev, [mod.id]: true }));
    const res = mod.unlocked
      ? await apiService.lockModule(mod.id)
      : await apiService.unlockModule(mod.id);
    if (!res.error) {
      setModules((prev) =>
        prev.map((m) => m.id === mod.id ? { ...m, unlocked: !m.unlocked } : m),
      );
    }
    setLoadingModules((prev) => ({ ...prev, [mod.id]: false }));
  };

  const handleLogout = async () => {
    await apiService.logout();
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.student_email.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q)
    );
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Technova Admin</p>
              <p className="text-sm text-gray-500">Examiner Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Administrator</h2>
          <p className="text-gray-600">Monitor student performance with Rasch Model analytics</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Students',  value: stats.total_students,               icon: Users,      from: 'from-blue-50',   to: 'to-blue-100',   border: 'border-blue-200',   iconBg: 'bg-blue-600',   text: 'text-blue-700',   num: 'text-blue-900'   },
            { label: 'Completed Tests', value: stats.completed_tests,              icon: Award,      from: 'from-green-50',  to: 'to-green-100',  border: 'border-green-200',  iconBg: 'bg-green-600',  text: 'text-green-700',  num: 'text-green-900'  },
            { label: 'Avg Score',       value: stats.average_score.toFixed(1),     icon: TrendingUp, from: 'from-purple-50', to: 'to-purple-100', border: 'border-purple-200', iconBg: 'bg-purple-600', text: 'text-purple-700', num: 'text-purple-900' },
            { label: 'Avg Questions',   value: stats.average_questions.toFixed(1), icon: Clock,      from: 'from-orange-50', to: 'to-orange-100', border: 'border-orange-200', iconBg: 'bg-orange-600', text: 'text-orange-700', num: 'text-orange-900' },
          ].map(({ label, value, icon: Icon, from, to, border, iconBg, text, num }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + 1) * 0.1 }}
            >
              <Card className={`p-6 bg-gradient-to-br ${from} ${to} ${border}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className={`w-5 h-5 ${text}`} />
                </div>
                <p className={`text-sm ${text} font-medium mb-1`}>{label}</p>
                <p className={`text-3xl font-bold ${num}`}>{value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Module Access Control */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Module Access Control</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mod.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 text-sm">{mod.label}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    mod.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {mod.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{mod.description}</p>
                <button
                  onClick={() => handleToggleModule(mod)}
                  disabled={loadingModules[mod.id]}
                  className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all disabled:opacity-50 ${
                    mod.unlocked
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {loadingModules[mod.id] ? (
                    <span>Loading…</span>
                  ) : mod.unlocked ? (
                    <><Lock className="w-3 h-3" /> Lock Module</>
                  ) : (
                    <><Unlock className="w-3 h-3" /> Unlock Module</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Student Results */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900">Student Results</h2>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              {/* School filter */}
              <div className="relative">
                <select
                  value={schoolFilter}
                  onChange={(e) => handleSchoolFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search students…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-48 text-sm"
                />
              </div>

              {/* Export */}
              <Button
                onClick={() => setShowExportModal(true)}
                className="gap-2 bg-gray-900 hover:bg-gray-700 text-white h-9 text-sm"
              >
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No student results found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Student</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Std. Score</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow key={s.session_id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{s.student_name}</p>
                          <p className="text-xs text-gray-400">{s.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{s.school}</TableCell>
                      <TableCell>
                        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {s.module_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {s.score} / {s.total_questions}
                      </TableCell>
                      <TableCell className="text-sm">{s.accuracy}%</TableCell>
                      <TableCell>
                        <span className={`font-bold text-sm ${
                          s.standardized_score >= 115 ? 'text-green-600' :
                          s.standardized_score >= 100 ? 'text-blue-600'  :
                          s.standardized_score >= 85  ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {s.standardized_score}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {new Date(s.completed_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleViewStudent(s.session_id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          schoolFilter={schoolFilter}
          onClose={() => setShowExportModal(false)}
          onSuccess={() => { setShowExportModal(false); initializeDashboard(); }}
        />
      )}

      {selectedStudent && (
        <AdminReportModal
          detail={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}