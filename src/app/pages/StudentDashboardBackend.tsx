// StudentDashboardBackend.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Clock, CheckCircle, Lock,
  ChevronRight, Download, Award, BookOpen, TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { apiService, ModuleInfo, TestResult } from '../services/api';
import logo from "../../assets/technova-logo.png";

// ── Logo (base64 embedded so no import issues) ──────────────────
const LOGO_B64 = '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';

interface User {
  id: number;
  email: string;
  name: string;
  school: string;
  role: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: number;
}

type Phase = 'module-select' | 'test' | 'result';

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 115) return { label: 'Excellent', color: '#16a34a' };
  if (score >= 100) return { label: 'Good', color: '#2563eb' };
  if (score >= 85) return { label: 'Average', color: '#d97706' };
  return { label: 'Needs Improvement', color: '#dc2626' };
}

// ── Module Selection Screen ───────────────────────────────────────
function ModuleSelectScreen({
  user,
  onSelect,
  onLogout,
}: {
  user: User;
  onSelect: (moduleId: string) => void;
  onLogout: () => void;
}) {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState('');

  useEffect(() => {
    apiService.getModules().then((res) => {
      if (res.error) setError(res.error);
      else setModules(res.data as ModuleInfo[]);
      setLoading(false);
    });
  }, []);

  const handleSelect = async (mod: ModuleInfo) => {
    if (!mod.unlocked || mod.already_taken) return;
    setStarting(mod.id);
    setError('');
    const res = await apiService.startTest(mod.id);
    if (res.error) {
      setError(res.error);
      setStarting('');
      return;
    }
    onSelect(mod.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={logo} alt="Technova Logo" className="w-9 h-9 object-contain" />
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
            <p className="text-gray-500">Choose the test module assigned by your teacher. Locked modules will be available when your teacher unlocks them.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {modules.map((mod, i) => {
                const isLocked = !mod.unlocked;
                const isDone = mod.already_taken;
                const isStarting = starting === mod.id;
                const isClickable = !isLocked && !isDone && !isStarting;

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <button
                      onClick={() => isClickable && handleSelect(mod)}
                      disabled={!isClickable}
                      className={`
                        w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 relative
                        ${isLocked
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : isDone
                          ? 'border-green-200 bg-green-50 cursor-not-allowed'
                          : 'border-blue-200 bg-white hover:border-blue-500 hover:shadow-lg cursor-pointer hover:-translate-y-0.5 active:translate-y-0'}
                      `}
                    >
                      {/* Status badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isLocked ? 'bg-gray-200' : isDone ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {isLocked ? (
                            <Lock className="w-6 h-6 text-gray-400" />
                          ) : isDone ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-blue-600" />
                          )}
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

                      {isLocked && (
                        <p className="mt-3 text-xs text-gray-400 italic">
                          This module is not yet available. Check back later.
                        </p>
                      )}

                      {isDone && (
                        <p className="mt-3 text-xs text-green-600 font-medium">
                          You have already completed this module.
                        </p>
                      )}

                      {isClickable && (
                        <div className="mt-4 flex items-center gap-1 text-blue-600 text-sm font-semibold">
                          Start Test <ChevronRight className="w-4 h-4" />
                        </div>
                      )}

                      {isStarting && (
                        <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Report Card ───────────────────────────────────────────────────
function ReportCard({
  user,
  result,
  moduleLabel,
  completedAt,
  onLogout,
}: {
  user: User;
  result: TestResult;
  moduleLabel: string;
  completedAt: string;
  onLogout: () => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { label: perfLabel, color: perfColor } = scoreLabel(result.standardized_score);
  const dateStr = new Date(completedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const handleDownload = async () => {
    const el = reportRef.current;
    if (!el) return;

    // Use browser print for clean PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Technova Report Card – ${user.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background: #fff; color: #1a1a2e; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; }
    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; margin-bottom: 20px; }
    .logo { width: 64px; height: 64px; object-fit: contain; }
    .org h1 { font-size: 22px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
    .org p { font-size: 11px; color: #555; letter-spacing: 1px; margin-top: 2px; }
    .title { text-align: center; margin-bottom: 24px; }
    .title h2 { font-size: 18px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; color: #1a1a2e; border: 2px solid #1a1a2e; display: inline-block; padding: 6px 24px; }
    .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f8f8fc; border: 1px solid #ddd; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; }
    .info-item label { font-weight: bold; color: #555; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
    .info-item span { display: block; color: #1a1a2e; font-size: 14px; margin-top: 2px; }
    .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .score-box { border: 1.5px solid #1a1a2e; border-radius: 8px; padding: 12px; text-align: center; }
    .score-box .val { font-size: 28px; font-weight: bold; color: #1a1a2e; }
    .score-box .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-top: 4px; }
    .perf-band { text-align: center; padding: 14px; border-radius: 8px; margin-bottom: 20px; background: #f0f4ff; border: 2px solid #1a1a2e; }
    .perf-band .band-label { font-size: 22px; font-weight: bold; }
    .perf-band .band-sub { font-size: 12px; color: #555; margin-top: 4px; }
    .notes { font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 12px; line-height: 1.6; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #aaa; letter-spacing: 1px; }
    @media print { .page { padding: 10mm; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <img class="logo" src="data:image/jpeg;base64,${LOGO_B64}" alt="Logo"/>
    <div class="org">
      <h1>Technova Education</h1>
      <p>Technova Hardware & I.T. Solutions · Adaptive Assessment System</p>
    </div>
  </div>

  <div class="title"><h2>Student Report Card</h2></div>

  <div class="student-info">
    <div class="info-item"><label>Student Name</label><span>${user.name}</span></div>
    <div class="info-item"><label>School</label><span>${user.school}</span></div>
    <div class="info-item"><label>Module</label><span>${moduleLabel}</span></div>
    <div class="info-item"><label>Date</label><span>${dateStr}</span></div>
    <div class="info-item"><label>Email</label><span>${user.email}</span></div>
  </div>

  <div class="scores-grid">
    <div class="score-box"><div class="val">${result.score}/${result.total_questions}</div><div class="lbl">Score</div></div>
    <div class="score-box"><div class="val">${result.accuracy.toFixed(1)}%</div><div class="lbl">Accuracy</div></div>
    <div class="score-box"><div class="val">${result.standardized_score}</div><div class="lbl">Standardized Score</div></div>
  </div>

  <div class="scores-grid">
    <div class="score-box"><div class="val">${result.theta.toFixed(2)}</div><div class="lbl">Theta (Ability)</div></div>
    <div class="score-box"><div class="val">${result.sem.toFixed(2)}</div><div class="lbl">SEM (Precision)</div></div>
  </div>

  <div class="perf-band">
    <div class="band-label">${perfLabel}</div>
    <div class="band-sub">Overall Performance Band</div>
  </div>

  <div class="notes">
    <strong>About this report:</strong> This assessment uses the Rasch Model (Item Response Theory). 
    <strong>Theta</strong> represents estimated ability level (higher = stronger). 
    <strong>SEM</strong> is Standard Error of Measurement — lower values indicate more precise scoring. 
    <strong>Standardized Score</strong> is scaled to a mean of 100.
  </div>

  <div class="footer">Generated by Technova Education Platform · ${new Date().toLocaleDateString()}</div>
</div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Technova Education</p>
              <p className="text-sm text-gray-500">Assessment Complete</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDownload} className="gap-2 bg-gray-900 hover:bg-gray-700 text-white">
              <Download className="w-4 h-4" /> Download Report
            </Button>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* The printable report card */}
        <div ref={reportRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Report Header */}
            <div className="bg-gray-900 text-white px-8 py-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1">
                  <img
                    src={`data:image/jpeg;base64,${LOGO_B64}`}
                    alt="Technova Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-widest uppercase">Technova Education</h1>
                  <p className="text-gray-400 text-xs tracking-wider mt-0.5">Technova Hardware & I.T. Solutions</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-4 mt-2">
                <h2 className="text-2xl font-bold tracking-[0.2em] uppercase text-center">
                  Student Report Card
                </h2>
              </div>
            </div>

            {/* Student Info */}
            <div className="px-8 py-5 bg-slate-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Student Name</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{user.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">School</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{user.school}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{moduleLabel}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Date Completed</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{dateStr}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Email</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="px-8 py-6">
              {/* Primary score row */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { value: `${result.score} / ${result.total_questions}`, label: 'Score' },
                  { value: `${result.accuracy.toFixed(1)}%`, label: 'Accuracy' },
                  { value: String(result.standardized_score), label: 'Standardized Score' },
                ].map((item) => (
                  <div key={item.label} className="border-2 border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* IRT metrics */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  {
                    value: result.theta.toFixed(2),
                    label: 'Theta — Ability Estimate',
                    sub: 'Higher = stronger ability',
                  },
                  {
                    value: result.sem.toFixed(2),
                    label: 'SEM — Measurement Precision',
                    sub: 'Lower = more precise score',
                  },
                ].map((item) => (
                  <div key={item.label} className="border-2 border-gray-100 rounded-xl p-4 bg-slate-50">
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 font-semibold">{item.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Performance band */}
              <div
                className="rounded-xl p-5 text-center border-2"
                style={{ borderColor: perfColor, backgroundColor: `${perfColor}10` }}
              >
                <Award className="w-8 h-8 mx-auto mb-2" style={{ color: perfColor }} />
                <p className="text-2xl font-bold" style={{ color: perfColor }}>{perfLabel}</p>
                <p className="text-sm text-gray-500 mt-1">Overall Performance Band</p>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-8 py-4 bg-slate-50 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                This assessment uses the Rasch Model (Item Response Theory). <strong>Theta</strong> represents estimated ability level. 
                <strong> SEM</strong> is Standard Error of Measurement. <strong>Standardized Score</strong> is scaled to a mean of 100. 
                Report generated by Technova Education Platform.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button onClick={handleDownload} size="lg" className="gap-2 bg-gray-900 hover:bg-gray-700 text-white px-8">
            <Download className="w-5 h-5" />
            Download / Print Report Card
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Test Screen ───────────────────────────────────────────────────
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
  const [startTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 18 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Timer
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    // Load first question (test was started by ModuleSelectScreen)
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
        onComplete(
          data.results,
          'Module',
          new Date().toISOString()
        );
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
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Adaptive Assessment</p>
              <p className="text-sm text-gray-500">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700 font-mono font-semibold">
              <Clock className="w-4 h-4" />
              {formatTime(timeElapsed)}
            </div>
          </div>
        </div>
        {/* Progress bar */}
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
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
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
              {/* Question card */}
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
                  'Next'
                  <ChevronRight className="w-5 h-5" />
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

// ── Main Component ────────────────────────────────────────────────
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
    // Fetch module list to get label
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
        />
      )}
    </>
  );
}