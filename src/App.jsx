import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/StudentDashboard";
import LecturerDashboard from "./pages/LecturerDashboard";
import Tasks from "./pages/Tasks";
import PeerEvaluation from "./pages/PeerEvaluation";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

function Layout() {
  return (
    <div className="app-layout">

      <div className="main-content">

        <Routes>
          <Route path="student" element={<StudentDashboard />} />
          <Route path="lecturer" element={<LecturerDashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="peer" element={<PeerEvaluation />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />

        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* APP */}
        <Route path="/*" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  );
}