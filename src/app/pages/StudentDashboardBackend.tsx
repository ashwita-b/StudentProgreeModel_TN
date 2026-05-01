// studentdashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  Clock,
  CheckCircle,
  Brain,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Card } from '../components/ui/card';
import { apiService } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: number;
}

interface TestResult {
  score: number;
  total_questions: number;
  accuracy: number;
  theta: number;
  sem: number;
  standardized_score: number;
  parametric_values: {
    comprehension: number;
    analytical_thinking: number;
    problem_solving: number;
    speed_efficiency: number;
    consistency: number;
  };
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [startTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 18 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize test on mount
  useEffect(() => {
    initializeTest();
  }, []);

  // Timer
  useEffect(() => {
    if (!testCompleted) {
      const timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, testCompleted]);

  const initializeTest = async () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    await apiService.startTest();

    const response = await apiService.getQuestion();

    if (response.data?.question) {
      setCurrentQuestion(response.data.question);
      setProgress(response.data.progress ?? { current: 0, total: 18 });
      setSelectedOption('');
      setError(null);
    } else {
      setError('No question available');
    }

  } catch (err) {
    setError('Failed to initialize test.');
    console.error(err);
  }

  setLoading(false); 
};

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = async () => {
    if (!selectedOption) {
      setError("Please select an option.");
      return;
    }
    if (!currentQuestion) {
      setError("No question to answer — try refreshing the page.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiService.submitAnswer(selectedOption);

      if (res.error) {
        setError(res.error);
        return;
      }

      const data = res.data;

     if (data.should_stop) {

  if (data.results) {
    setTestResult(data.results);
    setTestCompleted(true);
    setCurrentQuestion(null);
    setSelectedOption("");
    return;
  }

  // fallback if results not returned
  await finishTest();
  return;
} 

      // Happy path: use the next question the backend just gave us
      setCurrentQuestion({
        id: data.next_question.id,
        text: data.next_question.text,
        difficulty: data.next_question.difficulty,
        options: data.next_question.options,
      });

      setProgress(data.progress || {
        current: progress.current + 1,
        total: progress.total,
      });

      setSelectedOption(""); // clear selection for next question

    } catch (err) {
      setError("Couldn't submit answer. Try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const finishTest = async () => {
    setLoading(true);
    try {
      const response = await apiService.finishTest();
      if (response.data && response.data.results) {
        setTestResult(response.data.results as TestResult);
        setTestCompleted(true);
        setCurrentQuestion(null);
        setSelectedOption('');
      }
    } catch (err) {
      setError('Failed to finish test.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {testCompleted ? 'Technova Education' : 'Adaptive Assessment (Rasch Model)'}
              </h1>
              <p className="text-sm text-gray-600">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!testCompleted && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-semibold">{formatTime(timeElapsed)}</span>
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto p-4 text-red-600 font-semibold">{error}</div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
          </div>
        ) : testCompleted && testResult ? (
          <TestResultCard user={user} result={testResult} onLogout={handleLogout} />
        ) : currentQuestion ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 mb-8">
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                    Difficulty: {currentQuestion.difficulty?.toFixed(1) ?? 'N/A'}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentQuestion.text ?? 'Loading question...'}
                  </h2>
                </div>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionSelect(`${idx + 1}`)}
                      className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                        selectedOption === `${idx + 1}`
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedOption === `${idx + 1}`
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedOption === `${idx + 1}` && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Navigation */}
              <div className="flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!selectedOption || loading}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next Question
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center text-gray-600 text-xl">No question available</div>
        )}
      </div>
    </div>
  );
}

function getIconForKey(key: string) {
  switch (key) {
    case 'comprehension': return Brain;
    case 'analytical_thinking': return TrendingUp;
    case 'problem_solving': return Target;
    case 'speed_efficiency': return Zap;
    case 'consistency': return BarChart3;
    default: return Brain;
  }
}

function getColorForKey(key: string) {
  switch (key) {
    case 'comprehension': return 'blue';
    case 'analytical_thinking': return 'purple';
    case 'problem_solving': return 'green';
    case 'speed_efficiency': return 'orange';
    case 'consistency': return 'indigo';
    default: return 'gray';
  }
}

function TestResultCard({ user, result, onLogout }: { user: User; result: TestResult; onLogout: () => void }) {
  const paramValues = result.parametric_values ?? {}; // fallback to empty object

  return (
    <div>
      {/* Basic Marks */}
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Assessment Report</h2>
      <Card className="p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Score</p>
            <p className="text-2xl font-bold">{result.score} / {result.total_questions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Accuracy</p>
            <p className="text-2xl font-bold">{result.accuracy.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Standardized Score</p>
            <p className="text-2xl font-bold">{result.standardized_score}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Theta</p>
            <p className="text-2xl font-bold">{result.theta.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">SEM</p>
            <p className="text-2xl font-bold">{result.sem.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      {/* Parametric Values */}
      {Object.keys(paramValues).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(paramValues).map(([key, value], idx) => {
            const Icon = getIconForKey(key);
            const colorClass = getColorForKey(key);

            return (
              <Card key={idx} className={`p-6 ${key === 'consistency' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 bg-${colorClass}-100 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${colorClass}-600`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{key.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">Performance metric</p>
                  </div>
                </div>
                <Progress value={value} className="h-3" />
                <p className={`text-right mt-2 font-semibold text-${colorClass}-600`}>
                  {value}%
                </p>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-6">No parametric performance data available.</p>
      )}
    </div>
  );
}
