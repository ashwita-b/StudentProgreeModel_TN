import { createBrowserRouter } from "react-router-dom";
import Login from "./app/pages/Login";
import Register from "./app/pages/Register";
import StudentDashboard from "./app/pages/StudentDashboardBackend";
import AdminDashboard from "./app/pages/AdminDashboardBackend";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/student",
    element: <StudentDashboard />,
  },
  {
    path: "/admin",
    element: <AdminDashboard />,
  },
]);