// api.ts — FIXED
// Added getMyResults() — student-scoped endpoint that returns only the
// calling user's completed sessions, one entry per module.

const API_URL = import.meta.env.VITE_API_URL || "";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

export interface Question {
  id: string;
  text: string;
  difficulty: number;
  options: string[];
}

export interface TestResult {
  score: number;
  total_questions: number;
  accuracy: number;
  theta: number;
  sem: number;
  standardized_score: number;
  parametric_values?: Record<string, number>;
}

export interface ModuleInfo {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  already_taken: boolean;
}

// Shape returned by /api/admin/students (student-scoped) and /api/my/results
export interface MyModuleResult {
  module_id: string;
  module_label: string;
  session_id: number;
  score: number;
  total_questions: number;
  accuracy: number;
  standardized_score: number;
  completed_at: string | null;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || "Server error" };
      }
      return { data };
    } catch {
      return { error: "Network error. Backend may not be running." };
    }
  }

  // ── AUTH ────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string, school: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, school }),
    });
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async getCurrentUser() {
    return this.request("/api/auth/me");
  }

  async getSchools() {
    return this.request<{ schools: string[] }>("/api/schools");
  }

  // ── MODULES ─────────────────────────────────────────────────────
  async getModules() {
    return this.request<ModuleInfo[]>("/api/modules");
  }

  async unlockModule(moduleId: string) {
    return this.request(`/api/admin/modules/${moduleId}/unlock`, { method: "POST" });
  }

  async lockModule(moduleId: string) {
    return this.request(`/api/admin/modules/${moduleId}/lock`, { method: "POST" });
  }

  // ── STUDENT RESULTS ─────────────────────────────────────────────
  /**
   * Returns the current student's completed sessions (one per module).
   * Works for students only — the backend scopes to current_user.
   * This is the preferred way to populate per-module score chips
   * on the module select screen.
   */
  async getMyResults() {
    return this.request<MyModuleResult[]>("/api/my/results");
  }

  // ── TEST ────────────────────────────────────────────────────────
  async startTest(moduleId: string) {
    return this.request("/api/test/start", {
      method: "POST",
      body: JSON.stringify({ module_id: moduleId }),
    });
  }

  async getQuestion() {
    return this.request<{
      question: Question;
      progress: { current: number; total: number };
      completed?: boolean;
    }>("/api/test/question");
  }

  async submitAnswer(answer: string) {
    return this.request<{
      should_stop: boolean;
      next_question?: Question;
      progress?: { current: number; total: number };
      results?: TestResult;
      theta?: number;
      sem?: number;
      is_correct?: boolean;
    }>("/api/test/answer", {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  }

  async finishTest() {
    return this.request<{ results: TestResult }>("/api/test/finish", { method: "POST" });
  }

  async getTestResult() {
    return this.request<TestResult>("/api/test_result");
  }

  // ── ADMIN ────────────────────────────────────────────────────────
  async getAdminStats() {
    return this.request("/api/admin/stats");
  }

  /**
   * For examiners: returns all students (optionally filtered by school).
   * For students: returns only their own sessions (backend scoped).
   */
  async getAllStudents(school?: string) {
    const query = school ? `?school=${encodeURIComponent(school)}` : "";
    return this.request(`/api/admin/students${query}`);
  }

  async getStudentDetail(sessionId: number) {
    return this.request(`/api/admin/student/${sessionId}`);
  }

  async getExportPreview(school?: string) {
    const query = school ? `?school=${encodeURIComponent(school)}` : "";
    return this.request<{
      total_sessions: number;
      school_filter: string | null;
      confirm_token: string;
      warning: string;
    }>(`/api/admin/export/preview${query}`);
  }

  async exportResults(confirmToken: string, schoolFilter?: string, deleteAfter?: boolean) {
    const response = await fetch(`${API_URL}/api/admin/export`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirm_token: confirmToken,
        school_filter: schoolFilter || "",
        delete_after: deleteAfter || false,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Export failed");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = schoolFilter
      ? `technova_${schoolFilter.replace(/[^a-z0-9]/gi, "_")}.csv`
      : "technova_results.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

export const apiService = new ApiService();