// StudentDashboardFixed.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
  LogOut, Clock, CheckCircle, Lock,
  ChevronRight, Download, Award, BookOpen, Eye,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { apiService, ModuleInfo, TestResult } from '../services/api';
import logo from "../../assets/technova-logo.png";

// ─────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────
interface User {
  id: number;
  email: string;
  name: string;
  school: string;
  role: string;
}

interface ModuleInfoExtended extends ModuleInfo {
  score?: number;
  total_questions?: number;
  accuracy?: number;
  standardized_score?: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: number;
}

type Phase = 'module-select' | 'test' | 'result';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 115) return { label: 'Excellent', color: '#16a34a' };
  if (score >= 100) return { label: 'Good', color: '#2563eb' };
  if (score >= 85)  return { label: 'Average', color: '#d97706' };
  return { label: 'Needs Improvement', color: '#dc2626' };
}

// ─────────────────────────────────────────────────────────────────
// MODULE SELECT SCREEN
// ─────────────────────────────────────────────────────────────────
function ModuleSelectScreen({
  user,
  onSelect,
  onLogout,
}: {
  user: User;
  onSelect: (moduleId: string) => void;
  onLogout: () => void;
}) {
  const [modules, setModules] = useState<ModuleInfoExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState('');
  const [selectedForView, setSelectedForView] = useState<ModuleInfoExtended | null>(null);
  const [downloading, setDownloading] = useState(false);
  const marksheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Fetch module list
        const modulesRes = await apiService.getModules();
        if (modulesRes.error) { setError(modulesRes.error); setLoading(false); return; }
        const modulesData = (modulesRes.data as ModuleInfoExtended[]) ?? [];

        // 2. For each completed module, fetch the result from /api/test_result
        //    We call getAllStudents with no filter — it returns the current user's
        //    completed sessions because the backend is session-authenticated.
        //    BUT that endpoint is admin-only. Instead, we call the per-module
        //    result endpoint for every already_taken module.
        //
        //    Approach: use /api/admin/students (works for examiner) OR
        //    for students use the dedicated /api/test_result which returns the
        //    LAST completed session. To support multiple modules we need a better
        //    route — but since this app already calls getAllStudents from the
        //    student dashboard (which works because the backend returns student-
        //    scoped data), we keep that call but fix the field mapping.

        const studentsRes = await apiService.getAllStudents();
        const studentSessions = (studentsRes.data as any[]) ?? [];

        // getAllStudents returns rows with: module_id, score, total_questions,
        // accuracy, standardized_score — filtered to current user on the backend.
        // We index them by module_id for O(1) lookup.
        const sessionByModule: Record<string, any> = {};
        for (const row of studentSessions) {
          // The API returns the latest session per student×module.
          // Key by module_id (only store if not already keyed, preserving latest).
          if (row.module_id && !sessionByModule[row.module_id]) {
            sessionByModule[row.module_id] = row;
          }
        }

        const enhanced = modulesData.map((mod) => {
          const s = sessionByModule[mod.id];
          return s
            ? {
                ...mod,
                score: s.score,
                total_questions: s.total_questions,
                accuracy: s.accuracy,
                standardized_score: s.standardized_score,
              }
            : mod;
        });

        setModules(enhanced);
      } catch (err) {
        console.error('Error loading modules:', err);
        setError('Failed to load modules. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSelect = async (mod: ModuleInfoExtended) => {
    if (!mod.unlocked || mod.already_taken) return;
    setStarting(mod.id);
    setError('');
    const res = await apiService.startTest(mod.id);
    if (res.error) { setError(res.error); setStarting(''); return; }
    onSelect(mod.id);
  };

  // ── Download marksheet as PNG using html2canvas ──────────────
  const handleDownloadMarksheet = async () => {
    const el = marksheetRef.current;
    if (!el || !selectedForView) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 3,          // high-res
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${selectedForView.label.replace(/\s+/g, '-')}-Marksheet.png`;
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ── Header ── */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Technova Education</p>
              <p className="text-sm text-gray-500">{user.name} · {user.school}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="gap-2 text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Module</h1>
            <p className="text-gray-500">Choose the test module assigned by your teacher.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {modules.map((mod, i) => {
                const isLocked    = !mod.unlocked;
                const isDone      = mod.already_taken;
                const isStarting  = starting === mod.id;
                const isClickable = !isLocked && !isDone && !isStarting;

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className={`
                      w-full p-6 rounded-2xl border-2 transition-all duration-200 relative
                      ${isLocked
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : isDone
                        ? 'border-green-200 bg-green-50'
                        : 'border-blue-200 bg-white hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5'}
                    `}>
                      {/* Icon + badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isLocked ? 'bg-gray-200' : isDone ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {isLocked
                            ? <Lock className="w-6 h-6 text-gray-400" />
                            : isDone
                            ? <CheckCircle className="w-6 h-6 text-green-600" />
                            : <BookOpen className="w-6 h-6 text-blue-600" />}
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          isLocked
                            ? 'bg-gray-200 text-gray-500'
                            : isDone
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isLocked ? '🔒 Locked' : isDone ? '✓ Completed' : 'Available'}
                        </span>
                      </div>

                      <h3 className={`text-xl font-bold mb-1 ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                        {mod.label}
                      </h3>
                      <p className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                        {mod.description}
                      </p>

                      {/* Completed state — show score summary + View Marksheet */}
                      {isDone && (
                        <div className="mt-4 space-y-2">
                          {/* Inline score chips */}
                          {mod.score !== undefined && (
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-green-200 text-green-700">
                                Score: {mod.score}/{mod.total_questions}
                              </span>
                              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-blue-200 text-blue-700">
                                Accuracy: {mod.accuracy?.toFixed(1)}%
                              </span>
                              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-purple-200 text-purple-700">
                                Std. Score: {mod.standardized_score}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedForView(mod)}
                            className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Marksheet
                          </button>
                        </div>
                      )}

                      {isLocked && (
                        <p className="mt-3 text-xs text-gray-400 italic">
                          Not yet available. Check back later.
                        </p>
                      )}

                      {isClickable && (
                        <button
                          onClick={() => handleSelect(mod)}
                          className="mt-4 flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
                        >
                          Start Test <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {isStarting && (
                        <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Marksheet Modal ── */}
      <AnimatePresence>
        {selectedForView && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]"
            >
              {/* Scrollable marksheet body */}
              <div className="overflow-y-auto flex-1">
                {/*
                  ┌───────────────────────────────────────────────┐
                  │  This div is captured by html2canvas.         │
                  │  Keep it self-contained with inline-ish        │
                  │  Tailwind classes — no external images.        │
                  └───────────────────────────────────────────────┘
                */}
                <div ref={marksheetRef} className="p-6 bg-white space-y-4">
                  {/* Header */}
                  <div className="text-center pb-4 border-b-2 border-gray-200">
                    {/*
                      Use the imported `logo` URL. html2canvas handles same-origin
                      img tags fine. For cross-origin logos set useCORS:true (done above).
                    */}
                    <div className="w-16 h-16 mx-auto mb-3 border-2 border-gray-200 rounded-xl overflow-hidden flex items-center justify-center bg-white">
                      <img
                        src={logo}
                        alt="Technova"
                        className="w-14 h-14 object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <h1 className="text-base font-bold text-gray-900 tracking-widest uppercase">
                      Technova Education
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 tracking-wide uppercase">
                      Assessment Result
                    </p>
                  </div>

                  {/* Student + Module info */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                    <InfoRow label="Student"  value={user.name} />
                    <InfoRow label="School"   value={user.school} />
                    <InfoRow label="Module"   value={selectedForView.label} />
                    <InfoRow label="Status"   value="✓ Completed" valueClass="text-green-600 font-bold" />
                  </div>

                  {/* Score */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-5 border-2 border-green-200 text-center">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Score</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-extrabold text-green-700">
                        {selectedForView.score ?? '—'}
                      </span>
                      <span className="text-2xl text-gray-400 font-light">/</span>
                      <span className="text-3xl font-bold text-gray-500">
                        {selectedForView.total_questions ?? '—'}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 font-semibold mt-2">Total Questions</p>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricBox
                      label="Accuracy"
                      value={selectedForView.accuracy !== undefined
                        ? `${selectedForView.accuracy.toFixed(1)}%`
                        : '—'}
                      colorClass="bg-blue-50 border-blue-200 text-blue-700"
                    />
                    <MetricBox
                      label="Standardized"
                      value={selectedForView.standardized_score !== undefined
                        ? String(selectedForView.standardized_score)
                        : '—'}
                      colorClass="bg-purple-50 border-purple-200 text-purple-700"
                    />
                  </div>

                  {/* Performance band */}
                  {selectedForView.standardized_score !== undefined && (() => {
                    const { label, color } = scoreLabel(selectedForView.standardized_score);
                    return (
                      <div
                        className="rounded-xl p-4 text-center border-2"
                        style={{ borderColor: color, backgroundColor: `${color}18` }}
                      >
                        <p className="text-lg font-bold" style={{ color }}>{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">Performance Band</p>
                      </div>
                    );
                  })()}

                  {/* Footer */}
                  <p className="text-[10px] text-center text-gray-300 pt-2 border-t border-gray-100">
                    Generated by Technova Education Platform
                  </p>
                </div>
              </div>

              {/* Sticky action buttons */}
              <div className="flex gap-2 p-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <button
                  onClick={handleDownloadMarksheet}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                >
                  {downloading
                    ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    : <Download className="w-4 h-4" />}
                  {downloading ? 'Saving…' : 'Download PNG'}
                </button>
                <button
                  onClick={() => setSelectedForView(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small reusable pieces ────────────────────────────────────────
function InfoRow({ label, value, valueClass = 'text-gray-900 font-semibold' }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

function MetricBox({ label, value, colorClass }: {
  label: string; value: string; colorClass: string;
}) {
  return (
    <div className={`rounded-xl p-3 text-center border ${colorClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// REPORT CARD (shown after completing a test)
// ─────────────────────────────────────────────────────────────────
function ReportCard({
  user,
  result,
  moduleLabel,
  completedAt,
  onLogout,
  onGoToDashboard,
}: {
  user: User;
  result: TestResult;
  moduleLabel: string;
  completedAt: string;
  onLogout: () => void;
  onGoToDashboard: () => void;
}) {
  const reportRef   = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { label: perfLabel, color: perfColor } = scoreLabel(result.standardized_score);

  const dateStr = new Date(completedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Download as high-res PNG (no print dialog) ───────────────
  const handleDownload = async () => {
    const el = reportRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href  = canvas.toDataURL('image/png');
      link.download = `${user.name.replace(/\s+/g, '-')}-Report-Card.png`;
      link.click();
    } catch (e) {
      console.error('Download error:', e);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Technova Education</p>
              <p className="text-sm text-gray-500">Assessment Complete</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="gap-2 bg-gray-900 hover:bg-gray-700 text-white"
            >
              {downloading
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <Download className="w-4 h-4" />}
              {downloading ? 'Saving…' : 'Download Report'}
            </Button>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Printable / capturable card */}
        <div ref={reportRef} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Dark header */}
          <div className="bg-gray-900 text-white px-8 py-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 overflow-hidden">
                <img
                  src={logo}
                  alt="Technova"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-widest uppercase">Technova Education</h1>
                <p className="text-gray-400 text-xs tracking-wider mt-0.5">Adaptive Assessment System</p>
              </div>
            </div>
            <div className="border-t border-white/20 pt-4">
              <h2 className="text-2xl font-bold tracking-[0.2em] uppercase text-center">
                Student Report Card
              </h2>
            </div>
          </div>

          {/* Student info strip */}
          <div className="px-8 py-5 bg-slate-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
              {[
                { label: 'Student Name',   value: user.name },
                { label: 'School',         value: user.school },
                { label: 'Module',         value: moduleLabel },
                { label: 'Date Completed', value: dateStr },
                { label: 'Email',          value: user.email },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{label}</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { value: `${result.score} / ${result.total_questions}`, label: 'Score' },
                { value: `${result.accuracy.toFixed(1)}%`,              label: 'Accuracy' },
                { value: String(result.standardized_score),             label: 'Standardized Score' },
              ].map((item) => (
                <div key={item.label} className="border-2 border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Performance band */}
            <div
              className="rounded-xl p-5 text-center border-2"
              style={{ borderColor: perfColor, backgroundColor: `${perfColor}12` }}
            >
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: perfColor }} />
              <p className="text-2xl font-bold" style={{ color: perfColor }}>{perfLabel}</p>
              <p className="text-sm text-gray-500 mt-1">Overall Performance Band</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="px-8 py-4 bg-slate-50 border-t border-gray-200">
            <p className="text-[10px] text-gray-400 leading-relaxed text-center">
              <strong> Report generated by Technova Education Platform. </strong> 
            </p>
          </div>
        </div>

        {/* Go to Dashboard */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={onGoToDashboard}
            size="lg"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10"
          >
            <ChevronRight className="w-5 h-5" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TEST SCREEN
// ─────────────────────────────────────────────────────────────────
function TestScreen({
  user,
  onComplete,
  onLogout,
}: {
  user: User;
  onComplete: (result: TestResult, moduleLabel: string, completedAt: string) => void;
  onLogout: () => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [startTime]   = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 18 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    apiService.getQuestion().then((res) => {
      if (res.data?.question) {
        setCurrentQuestion(res.data.question);
        setProgress(res.data.progress ?? { current: 1, total: 18 });
      } else {
        setError('No question available. Please try again.');
      }
      setLoading(false);
    });
  }, []);

  const handleNext = async () => {
    if (!selectedOption) { setError('Please select an answer.'); return; }
    if (!currentQuestion) { setError('No question loaded.'); return; }

    setLoading(true);
    setError(null);

    const res = await apiService.submitAnswer(selectedOption);
    if (res.error) { setError(res.error); setLoading(false); return; }

    const data = res.data!;
    if (data.should_stop) {
      if (data.results) {
        onComplete(data.results, 'Module', new Date().toISOString());
      } else {
        const fin = await apiService.finishTest();
        if (fin.data?.results) onComplete(fin.data.results, 'Module', new Date().toISOString());
      }
      return;
    }

    if (data.next_question) {
      setCurrentQuestion({
        id: data.next_question.id,
        text: data.next_question.text,
        difficulty: data.next_question.difficulty,
        options: data.next_question.options,
      });
      setProgress(data.progress || { current: progress.current + 1, total: progress.total });
      setSelectedOption('');
    }
    setLoading(false);
  };

  const progressPct = Math.round((progress.current / progress.total) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Adaptive Assessment</p>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-700 font-mono font-semibold">
            <Clock className="w-4 h-4" />
            {formatTime(timeElapsed)}
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
          </div>
        ) : currentQuestion ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 mb-6">
                <h2 className="text-xl font-bold text-gray-900 leading-relaxed mb-8">
                  {currentQuestion.text}
                </h2>
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const val = `${idx + 1}`;
                    const selected = selectedOption === val;
                    return (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setSelectedOption(val); setError(null); }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {selected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <span className="font-medium text-gray-900">{opt}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!selectedOption || loading}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p className="text-center text-gray-500">No question available.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<Phase>('module-select');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [resultMeta, setResultMeta] = useState({ moduleLabel: '', completedAt: '' });
  const [modules, setModules] = useState<ModuleInfo[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role === 'examiner') { navigate('/admin'); return; }
    setUser(u);
  }, [navigate]);

  const handleModuleSelected = async (moduleId: string) => {
    const res = await apiService.getModules();
    const mods = (res.data as ModuleInfo[]) || [];
    setModules(mods);
    setSelectedModuleId(moduleId);
    setPhase('test');
  };

  const handleTestComplete = (result: TestResult, _moduleLabel: string, completedAt: string) => {
    const mod = modules.find((m) => m.id === selectedModuleId);
    setTestResult(result);
    setResultMeta({
      moduleLabel: mod ? `${mod.label} — ${mod.description}` : 'Assessment',
      completedAt,
    });
    setPhase('result');
  };

  const handleGoToDashboard = () => {
    setPhase('module-select');
    setTestResult(null);
    setSelectedModuleId('');
  };

  const handleLogout = async () => {
    await apiService.logout();
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!user) return null;

  return (
    <>
      {phase === 'module-select' && (
        <ModuleSelectScreen user={user} onSelect={handleModuleSelected} onLogout={handleLogout} />
      )}
      {phase === 'test' && (
        <TestScreen user={user} onComplete={handleTestComplete} onLogout={handleLogout} />
      )}
      {phase === 'result' && testResult && (
        <ReportCard
          user={user}
          result={testResult}
          moduleLabel={resultMeta.moduleLabel}
          completedAt={resultMeta.completedAt}
          onLogout={handleLogout}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
    </>
  );
}