// ======================================================
// API SERVICE
// Handles all communication between React and Flask
// ======================================================

// Backend base URL
// If .env has VITE_API_URL it will use that
// otherwise default is localhost:5000

const API_URL = import.meta.env.VITE_API_URL || "";


// ======================================================
// TYPES (helps prevent bugs in React)
// ======================================================

// Generic API response
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}


// Question structure returned from backend
export interface Question {
  id: string
  text: string
  difficulty: number
  options: string[]
}


// Test result structure
export interface TestResult {
  score: number
  total_questions: number
  accuracy: number
  theta: number
  sem: number
  standardized_score: number
}


// ======================================================
// MAIN API CLASS
// ======================================================

class ApiService {

  /**
   * Generic request function
   * All API calls go through here
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {

    try {

      const response = await fetch(`${API_URL}${endpoint}`, {

        ...options,

        // Needed for Flask login session cookies
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        }

      })


      const data = await response.json()


      if (!response.ok) {
        return { error: data.error || "Server error" }
      }

      return { data }

    } catch (error) {

      return { error: "Network error. Backend may not be running." }

    }
  }


  // ======================================================
  // AUTH ROUTES
  // ======================================================

  async login(email: string, password: string) {

    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    })

  }


  async register(email: string, password: string, name: string) {

    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    })

  }


  async logout() {

    return this.request("/api/auth/logout", {
      method: "POST"
    })

  }


  async getCurrentUser() {

    return this.request("/api/auth/me")

  }


  // ======================================================
  // ADAPTIVE TEST ROUTES
  // ======================================================


  /**
   * Start a new adaptive test
   */
  async startTest() {

    return this.request("/api/test/start", {
      method: "POST"
    })

  }


  /**
   * Get next question
   */
  async getQuestion() {
  return this.request<{
    question: Question
    progress: { current: number; total: number }
    completed?: boolean
  }>("/api/test/question")
}


  /**
   * Submit answer to backend
   */
  async submitAnswer(answer: string) {

  return this.request<{
    should_stop: boolean
    next_question?: Question
    progress?: { current: number; total: number }
    results?: TestResult
    theta?: number
    sem?: number
    is_correct?: boolean
  }>("/api/test/answer", {

      method: "POST",

      body: JSON.stringify({
        answer
      })

    })

  }


 async finishTest() {

  return this.request<{
    results: TestResult
  }>("/api/test/finish", {
    method: "POST"
  })

 }


  /**
   * Get stored test results
   */
  async getTestResult() {

    return this.request<TestResult>("/api/test_result")

  }


  // ======================================================
  // ADMIN ROUTES
  // ======================================================

  async getAdminStats() {

    return this.request("/api/admin/stats")

  }


  async getAllStudents() {

    return this.request("/api/admin/students")

  }


  async getStudentDetail(sessionId: number) {

    return this.request(`/api/admin/student/${sessionId}`)

  }

async exportResults() {

  const response = await fetch(`${API_URL}/api/admin/export`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Export failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "technova_results.csv";
  a.click();

  window.URL.revokeObjectURL(url);
}

}

// ======================================================
// EXPORT SINGLE INSTANCE
// ======================================================

export const apiService = new ApiService()