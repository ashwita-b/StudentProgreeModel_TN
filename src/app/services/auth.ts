// Authentication service for the education system

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
}

export interface Student extends User {
  role: 'student';
  registeredAt: string;
}

export interface TestResult {
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeSpent: number; // in seconds
  completedAt: string;
  answers: Record<number, string>;
  parametricValues: {
    comprehension: number;
    analyticalThinking: number;
    problemSolving: number;
    speedEfficiency: number;
    consistency: number;
  };
}

const ADMIN_CREDENTIALS = {
  email: 'admin@technova.com',
  password: 'admin123'
};

export const authService = {
  login(email: string, password: string): User | null {
    // Check admin credentials
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const admin: User = {
        id: 'admin-1',
        email: ADMIN_CREDENTIALS.email,
        name: 'Admin',
        role: 'admin'
      };
      localStorage.setItem('currentUser', JSON.stringify(admin));
      return admin;
    }

    // Check student credentials
    const students = this.getStudents();
    const student = students.find(s => s.email === email);
    
    if (student && this.verifyPassword(email, password)) {
      localStorage.setItem('currentUser', JSON.stringify(student));
      return student;
    }

    return null;
  },

  register(email: string, password: string, name: string): Student | null {
    const students = this.getStudents();
    
    // Check if email already exists
    if (students.some(s => s.email === email) || email === ADMIN_CREDENTIALS.email) {
      return null;
    }

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      email,
      name,
      role: 'student',
      registeredAt: new Date().toISOString()
    };

    students.push(newStudent);
    localStorage.setItem('students', JSON.stringify(students));
    
    // Store password (in real app, this should be hashed)
    const passwords = this.getPasswords();
    passwords[email] = password;
    localStorage.setItem('passwords', JSON.stringify(passwords));

    return newStudent;
  },

  logout(): void {
    localStorage.removeItem('currentUser');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  getStudents(): Student[] {
    const studentsStr = localStorage.getItem('students');
    return studentsStr ? JSON.parse(studentsStr) : [];
  },

  getPasswords(): Record<string, string> {
    const passwordsStr = localStorage.getItem('passwords');
    return passwordsStr ? JSON.parse(passwordsStr) : {};
  },

  verifyPassword(email: string, password: string): boolean {
    const passwords = this.getPasswords();
    return passwords[email] === password;
  },

  saveTestResult(result: TestResult): void {
    const results = this.getTestResults();
    results.push(result);
    localStorage.setItem('testResults', JSON.stringify(results));
  },

  getTestResults(): TestResult[] {
    const resultsStr = localStorage.getItem('testResults');
    return resultsStr ? JSON.parse(resultsStr) : [];
  },

  getStudentTestResult(studentId: string): TestResult | null {
    const results = this.getTestResults();
    return results.find(r => r.studentId === studentId) || null;
  }
};
