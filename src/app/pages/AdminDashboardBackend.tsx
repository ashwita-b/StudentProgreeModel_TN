import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LogOut, Users, TrendingUp, Award, Clock,
  Search, Download, Lock, Unlock, AlertTriangle, X, Eye,
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
    apiService.getExportPreview(schoolFilter !== 'All Schools' ? schoolFilter : undefined).then((res) => {
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
        deleteAfter
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
              <img src={logo} alt="Technova Logo" className="w-9 h-9 object-contain" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Export Results</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

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
                  <p className="text-xs text-red-600 mt-0.5">This permanently wipes all test sessions and responses from the database. This cannot be undone.</p>
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
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Generating CSV…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Download started!</p>
            <p className="text-sm text-gray-500">{deleteAfter ? 'Database has been cleared.' : 'Data is preserved.'}</p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Student Report Print (from admin) ───────────────────────────
function AdminReportPrint({ detail, onClose }: { detail: StudentDetail; onClose: () => void }) {
  const LOGO_B64 = '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';

  const dateStr = new Date(detail.completed_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const doPrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Report – ${detail.student_name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Georgia, serif; background:#fff; color:#1a1a2e; }
      .page { width:210mm; padding:12mm 14mm; }
      .header { display:flex; align-items:center; gap:16px; padding-bottom:16px; border-bottom:3px solid #1a1a2e; margin-bottom:20px; }
      .logo { width:60px; height:60px; object-fit:contain; }
      .org h1 { font-size:20px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; }
      .org p { font-size:11px; color:#555; letter-spacing:1px; margin-top:2px; }
      .title { text-align:center; margin-bottom:24px; }
      .title h2 { font-size:17px; font-weight:bold; letter-spacing:4px; text-transform:uppercase; border:2px solid #1a1a2e; display:inline-block; padding:5px 20px; }
      .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; background:#f8f8fc; border:1px solid #ddd; border-radius:8px; padding:12px 16px; margin-bottom:18px; font-size:12px; }
      .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
      .grid2-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:16px; }
      .info label { font-weight:bold; color:#555; text-transform:uppercase; font-size:9px; letter-spacing:1px; }
      .info span { display:block; color:#1a1a2e; font-size:13px; margin-top:2px; }
      .sbox { border:1.5px solid #1a1a2e; border-radius:8px; padding:10px; text-align:center; }
      .sbox .v { font-size:24px; font-weight:bold; }
      .sbox .l { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#666; margin-top:3px; }
      .band { text-align:center; padding:12px; border-radius:8px; background:#f0f4ff; border:2px solid #1a1a2e; margin-bottom:16px; }
      .band .bl { font-size:20px; font-weight:bold; }
      .notes { font-size:10px; color:#777; border-top:1px solid #ddd; padding-top:10px; line-height:1.6; }
      .footer { margin-top:20px; text-align:center; font-size:9px; color:#aaa; letter-spacing:1px; }
    </style></head><body>
    <div class="page">
      <div class="header">
        <img class="logo" src="data:image/jpeg;base64,${LOGO_B64}" alt="Logo"/>
        <div class="org"><h1>Technova Education</h1><p>Adaptive Assessment System</p></div>
      </div>
      <div class="title"><h2>Student Report Card</h2></div>
      <div class="grid2">
        <div class="info"><label>Student Name</label><span>${detail.student_name}</span></div>
        <div class="info"><label>School</label><span>${detail.school}</span></div>
        <div class="info"><label>Module</label><span>${detail.module_label}</span></div>
        <div class="info"><label>Date Completed</label><span>${dateStr}</span></div>
        <div class="info"><label>Email</label><span>${detail.student_email}</span></div>
      </div>
      <div class="grid3">
        <div class="sbox"><div class="v">${detail.score}/${detail.total_questions}</div><div class="l">Score</div></div>
        <div class="sbox"><div class="v">${detail.accuracy.toFixed(1)}%</div><div class="l">Accuracy</div></div>
        <div class="sbox"><div class="v">${detail.standardized_score}</div><div class="l">Standardized Score</div></div>
      </div>
      <div class="grid2-2">
        <div class="sbox"><div class="v">${detail.theta.toFixed(2)}</div><div class="l">Theta (Ability)</div></div>
        <div class="sbox"><div class="v">${detail.sem.toFixed(2)}</div><div class="l">SEM (Precision)</div></div>
      </div>
      <div class="band"><div class="bl">${detail.standardized_score >= 115 ? 'Excellent' : detail.standardized_score >= 100 ? 'Good' : detail.standardized_score >= 85 ? 'Average' : 'Needs Improvement'}</div><div style="font-size:11px;color:#555;margin-top:3px;">Overall Performance Band</div></div>
      <div class="notes"><strong>About:</strong> Theta = estimated ability (higher is better). SEM = measurement error (lower is better). Standardized Score scaled to mean 100.</div>
      <div class="footer">Generated by Technova Education Platform · ${new Date().toLocaleDateString()}</div>
    </div></body></html>`);
    pw.document.close();
    pw.onload = () => { pw.focus(); pw.print(); };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Student Report — {detail.student_name}</h2>
          <div className="flex gap-2">
            <Button onClick={doPrint} className="gap-2 bg-gray-900 hover:bg-gray-700 text-white">
              <Download className="w-4 h-4" /> Print / Download
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4 text-sm">
            {[
              ['Student', detail.student_name],
              ['School', detail.school],
              ['Module', detail.module_label],
              ['Email', detail.student_email],
              ['Date', new Date(detail.completed_at).toLocaleDateString('en-IN')],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{l}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { v: `${detail.score}/${detail.total_questions}`, l: 'Score' },
              { v: `${detail.accuracy.toFixed(1)}%`, l: 'Accuracy' },
              { v: String(detail.standardized_score), l: 'Standardized Score' },
            ].map((item) => (
              <div key={item.l} className="border-2 border-gray-200 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{item.v}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.l}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { v: detail.theta.toFixed(2), l: 'Theta (Ability)' },
              { v: detail.sem.toFixed(2), l: 'SEM (Precision)' },
            ].map((item) => (
              <div key={item.l} className="border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-center">
                <p className="text-xl font-bold text-gray-900">{item.v}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.l}</p>
              </div>
            ))}
          </div>

          {/* Response table */}
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Question Responses</h3>
            <div className="max-h-60 overflow-y-auto border rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Question</TableHead>
                    <TableHead className="text-xs">Difficulty</TableHead>
                    <TableHead className="text-xs">Your Answer</TableHead>
                    <TableHead className="text-xs">Correct</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.responses.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{r.question_code}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.question_text}</TableCell>
                      <TableCell className="text-xs">{r.difficulty?.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{r.user_answer}</TableCell>
                      <TableCell className="text-xs">{r.correct_answer}</TableCell>
                      <TableCell>
                        <Badge className={r.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {r.is_correct ? '✓' : '✗'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────
export default function AdminDashboardBackend() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('All Schools');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState({ total_students: 0, completed_tests: 0, average_score: 0, average_questions: 0 });
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
    if (statsRes.data) setStats(statsRes.data as any);
    if (studentsRes.data) setStudents(studentsRes.data as StudentResult[]);
    if (modulesRes.data) setModules(modulesRes.data as ModuleInfo[]);
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
        prev.map((m) => m.id === mod.id ? { ...m, unlocked: !m.unlocked } : m)
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
              <img src={logo} alt="Technova Logo" className="w-9 h-9 object-contain" />
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

        {/* Welcome Message */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Administrator</h2>
          <p className="text-gray-600">Monitor student performance with Rasch Model analytics</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 font-medium mb-1">Total Students</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total_students}</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 font-medium mb-1">Completed Tests</p>
              <p className="text-3xl font-bold text-green-900">{stats.completed_tests}</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 font-medium mb-1">Avg Score</p>
              <p className="text-3xl font-bold text-purple-900">{stats.average_score.toFixed(1)}</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-orange-700 font-medium mb-1">Avg Questions</p>
              <p className="text-3xl font-bold text-orange-900">{stats.average_questions.toFixed(1)}</p>
            </Card>
          </motion.div>
        </div>

        {/* Module Access Control */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Module Access Control</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {modules.map((mod) => (
              <div key={mod.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mod.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 text-sm">{mod.label}</p>
                  {mod.unlocked
                    ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Unlocked</span>
                    : <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Locked</span>
                  }
                </div>
                <p className="text-xs text-gray-500 mb-3">{mod.description}</p>
                <button
                  onClick={() => handleToggleModule(mod)}
                  disabled={loadingModules[mod.id]}
                  className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${
                    mod.unlocked
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  } disabled:opacity-50`}
                >
                  {loadingModules[mod.id] ? (
                    <span>Loading…</span>
                  ) : mod.unlocked ? (
                    <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Lock Module</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Unlock className="w-3 h-3" /> Unlock Module</span>
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
                        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">{s.module_label}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{s.score} / {s.total_questions}</TableCell>
                      <TableCell className="text-sm">{s.accuracy}%</TableCell>
                      <TableCell>
                        <span className={`font-bold text-sm ${
                          s.standardized_score >= 115 ? 'text-green-600' :
                          s.standardized_score >= 100 ? 'text-blue-600' :
                          s.standardized_score >= 85 ? 'text-yellow-600' : 'text-red-600'
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
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
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
          onSuccess={() => {
            setShowExportModal(false);
            initializeDashboard();
          }}
        />
      )}

      {selectedStudent && (
        <AdminReportPrint
          detail={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}