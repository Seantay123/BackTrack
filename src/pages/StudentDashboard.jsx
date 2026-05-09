import "./StudentDashboard.css";

import {
  FaBell,
  FaMoon,
  FaChevronDown,
  FaCog, // settings icon
} from "react-icons/fa";

import { useState } from "react";

import {
  studentDashboard,
  tasks,
} from "../services/mockData";

import Settings from "./Settings"; // IMPORTANT: your settings component

export default function StudentDashboard() {
  const [darkMode, setDarkMode] = useState(false);

  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");

  // SETTINGS MODAL STATE
  const [showSettings, setShowSettings] = useState(false);

  // FILTER TASKS
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filter === "All" ? true : task.status === filter;

    const matchesDate =
      selectedDate === "" ? true : task.dueDate === selectedDate;

    return matchesStatus && matchesDate;
  });

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>

      {/* TOPBAR */}
      <div className="topbar">

        <div className="nav-tabs">
          <button className="tab active">Dashboard</button>
          <button className="tab">Tasks</button>
          <button className="tab">Peer Evaluation</button>
          <button className="tab">Analytics</button>
        </div>

        <div className="topbar-right">

          <FaBell className="icon" />

          <FaMoon
            className="icon"
            onClick={() => setDarkMode(!darkMode)}
          />

          {/* SETTINGS BUTTON */}
          <FaCog
            className="icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          />

          <div className="profile">
            <img
              src="https://i.pravatar.cc/150?img=12"
              alt=""
            />

            <div className="profile-info">
              <h4>{studentDashboard.name}</h4>
              <p>{studentDashboard.role}</p>
            </div>
          </div>

        </div>
      </div>

      {/* BODY */}
      <div className="layout">

        {/* SIDEBAR */}
        <div className="sidebar">

          <div className="sidebar-header">
            <h2>My Tasks</h2>
            <button className="add-btn">+</button>
          </div>

          {/* FILTERS */}
          <div className="filters">

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>In Progress</option>
              <option>Not Started</option>
              <option>Completed</option>
            </select>

            <div className="calendar-box">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

          </div>

          {/* TASKS */}
          {filteredTasks.map((task) => (
            <div className="task-card" key={task.id}>

              <div className="task-top">

                <div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                </div>

                <FaChevronDown />

              </div>

              <div className="task-footer">

                <span
                  className={`status ${task.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {task.status}
                </span>

                <span className="date">{task.dueDate}</span>

              </div>

            </div>
          ))}

        </div>

        {/* MAIN */}
        <div className="main">

          <h1>Project Dashboard</h1>

          <div className="grid">

            <div className="card">
              <h3>Welcome back 👋</h3>
              <p>{studentDashboard.project}</p>
              <span>Group {studentDashboard.group}</span>
            </div>

            <div className="card">
              <h3>Progress</h3>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${studentDashboard.progress}%`,
                  }}
                />
              </div>

              <p>{studentDashboard.progress}% Complete</p>
            </div>

            <div className="card">
              <h3>Members</h3>

              <div className="members">
                {studentDashboard.members.map((m, i) => (
                  <div key={i} className="member">
                    {m}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">

            {/* close button */}
            <button
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>

            <Settings
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />

          </div>
        </div>
      )}

    </div>
  );
}