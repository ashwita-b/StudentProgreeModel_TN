import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  GraduationCap,
  LogOut,
  Users,
  TrendingUp,
  Award,
  Clock,
  Brain,
  Target,
  Zap,
  BarChart3,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { apiService } from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface StudentResult {
  student_id: number;
  student_name: string;
  student_email: string;
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
  score: number;
  total_questions: number;
  accuracy: number;
  theta: number;
  sem: number;
  standardized_score: number;
  completed_at: string;
  parametric_values: {
    comprehension: number;
    analytical_thinking: number;
    problem_solving: number;
    speed_efficiency: number;
    consistency: number;
  };
}

export default function AdminDashboardBackend() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [stats, setStats] = useState({
    total_students: 0,
    completed_tests: 0,
    average_score: 0,
    average_questions: 0
  });

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'examiner') {
      navigate('/');
      return;
    }
    setUser(userData);

    // Load stats and students
    await loadStats();
    await loadStudents();
  };

  const loadStats = async () => {
    const response = await apiService.getAdminStats();
    if (response.data) {
      setStats(response.data);
    }
  };

  const loadStudents = async () => {
    const response = await apiService.getAllStudents();
    if (response.data) {
      setStudents(response.data);
    }
  };

  const loadStudentDetail = async (sessionId: number) => {
    const response = await apiService.getStudentDetail(sessionId);
    if (response.data) {
      setSelectedStudent(response.data);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const filteredResults = students.filter(result =>
    result.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    result.student_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getPerformanceLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 60) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 40) return { label: 'Average', color: 'bg-yellow-500' };
    return { label: 'Needs Improvement', color: 'bg-red-500' };
  };

const handleExport = async () => {
  try {
    const response = await apiService.exportResults();

    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "student_results.csv");
    document.body.appendChild(link);
    link.click();

    link.remove();
  } catch (err) {
    console.error("Export failed", err);
  }
};

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Technova Education System</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, Administrator
          </h2>
          <p className="text-gray-600">
            Monitor student performance with Rasch Model analytics
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 font-medium mb-1">Avg Standardized</p>
              <p className="text-3xl font-bold text-purple-900">{stats.average_score.toFixed(1)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
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

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by student name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Student Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Rasch Model Performance Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                Adaptive test results with theta and standardized scores
              </p>
            </div>

            {filteredResults.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No test results available yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Students will appear here once they complete their assessments
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Theta (θ)</TableHead>
                      <TableHead>SEM</TableHead>
                      <TableHead>Standardized</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result, index) => {
                      const performance = getPerformanceLevel(result.accuracy);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.student_name}</TableCell>
                          <TableCell className="text-gray-600">{result.student_email}</TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {result.score}/{result.total_questions}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {result.accuracy.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-purple-600">
                              {result.theta.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600">
                              {result.sem.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {result.standardized_score}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${performance.color} text-white`}>
                              {performance.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Selected Student Details */}
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Detailed Metrics - {selectedStudent.student_name}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedStudent(null)}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Comprehension</p>
                        <p className="text-xs text-gray-600">Understanding ability</p>
                      </div>
                    </div>
                    <Progress value={selectedStudent.parametric_values.comprehension} className="h-2 mb-2" />
                    <p className="text-right font-bold text-blue-600">
                      {selectedStudent.parametric_values.comprehension}%
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Analytical Thinking</p>
                        <p className="text-xs text-gray-600">Logical reasoning</p>
                      </div>
                    </div>
                    <Progress value={selectedStudent.parametric_values.analytical_thinking} className="h-2 mb-2" />
                    <p className="text-right font-bold text-purple-600">
                      {selectedStudent.parametric_values.analytical_thinking}%
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Problem Solving</p>
                        <p className="text-xs text-gray-600">Solution finding</p>
                      </div>
                    </div>
                    <Progress value={selectedStudent.parametric_values.problem_solving} className="h-2 mb-2" />
                    <p className="text-right font-bold text-green-600">
                      {selectedStudent.parametric_values.problem_solving}%
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Speed Efficiency</p>
                        <p className="text-xs text-gray-600">Response time</p>
                      </div>
                    </div>
                    <Progress value={selectedStudent.parametric_values.speed_efficiency} className="h-2 mb-2" />
                    <p className="text-right font-bold text-orange-600">
                      {selectedStudent.parametric_values.speed_efficiency}%
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Consistency</p>
                        <p className="text-xs text-gray-600">Performance stability</p>
                      </div>
                    </div>
                    <Progress value={selectedStudent.parametric_values.consistency} className="h-2 mb-2" />
                    <p className="text-right font-bold text-indigo-600">
                      {selectedStudent.parametric_values.consistency}%
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-3">Rasch Model Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium">
                          {formatTime(selectedStudent.completed_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Score:</span>
                        <span className="font-medium">
                          {selectedStudent.score}/{selectedStudent.total_questions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Theta (θ):</span>
                        <span className="font-medium">{selectedStudent.theta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SEM:</span>
                        <span className="font-medium">{selectedStudent.sem.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Standardized:</span>
                        <span className="font-medium">{selectedStudent.standardized_score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
