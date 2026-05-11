import "./StudentDashboard.css";
import { FaBell, FaMoon, FaChevronDown, FaCog } from "react-icons/fa";
import { useState, useEffect } from "react";
import Settings from "./Settings";
import { fetchDashboard, fetchProjects, fetchGroupTasks, fetchGroupMembers } from "../services/api";

export default function StudentDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  // State for real data from backend
  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Fetch data when component mounts
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user from localStorage (set during login)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        
        // Fetch dashboard data from backend
        const dashData = await fetchDashboard();
        setDashboardData(dashData);
        
        // Fetch projects
        const projectsData = await fetchProjects();
        setProjects(projectsData);
        
        // If there are projects, get first group's tasks and members
        if (projectsData && projectsData.length > 0) {
          const firstProject = projectsData[0];
          
          // You'll need to get groups for this project
          // For now, we'll fetch from a groups endpoint
          const groupsResponse = await fetch(`http://localhost:5000/projects/${firstProject.project_id}/groups`, {
            credentials: 'include'
          });
          const groups = await groupsResponse.json();
          
          if (groups && groups.length > 0) {
            const firstGroup = groups[0];
            
            // Fetch tasks for this group
            const tasksData = await fetchGroupTasks(firstGroup.group_id);
            setTasks(tasksData);
            
            // Fetch members for this group
            const membersData = await fetchGroupMembers(firstGroup.group_id);
            setMembers(membersData);
          }
        }
        
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // Filter tasks based on status and date
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filter === "All" ? true : task.status === filter;
    const matchesDate = selectedDate === "" ? true : task.deadline === selectedDate;
    return matchesStatus && matchesDate;
  });

  // Calculate project progress based on completed tasks
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading your dashboard...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

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
          <FaMoon className="icon" onClick={() => setDarkMode(!darkMode)} />
          <FaCog className="icon" onClick={() => setShowSettings(true)} title="Settings" />

          <div className="profile">
            <img src="https://i.pravatar.cc/150?img=12" alt="" />
            <div className="profile-info">
              <h4>{user?.name || dashboardData?.[0]?.group_name || "Student"}</h4>
              <p>{user?.role || "Student"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="layout">
        {/* SIDEBAR - My Tasks */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>My Tasks</h2>
            <button className="add-btn">+</button>
          </div>

          {/* FILTERS */}
          <div className="filters">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              <option>In Progress</option>
              <option>Not Started</option>
              <option>Completed</option>
            </select>
            <div className="calendar-box">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>

          {/* TASKS - Now showing real tasks from backend */}
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div className="task-card" key={task.task_id}>
                <div className="task-top">
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.description}</p>
                  </div>
                  <FaChevronDown />
                </div>
                <div className="task-footer">
                  <span className={`status ${task.status?.toLowerCase().replace(" ", "-") || "pending"}`}>
                    {task.status || "Pending"}
                  </span>
                  <span className="date">{task.deadline || "No deadline"}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>No tasks assigned yet</p>
            </div>
          )}
        </div>

        {/* MAIN - Project Dashboard */}
        <div className="main">
          <h1>Project Dashboard</h1>

          <div className="grid">
            <div className="card">
              <h3>Welcome back 👋</h3>
              <p>{projects[0]?.project_name || "No projects assigned"}</p>
              <span>Group {dashboardData?.[0]?.group_name || "Loading..."}</span>
            </div>

            <div className="card">
              <h3>Progress</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${calculateProgress()}%` }} />
              </div>
              <p>{calculateProgress()}% Complete</p>
            </div>

            <div className="card">
              <h3>Members</h3>
              <div className="members">
                {members.length > 0 ? (
                  members.map((member, i) => (
                    <div key={i} className="member">
                      {member.name} {member.user_id === user?.user_id ? "(You)" : ""}
                    </div>
                  ))
                ) : (
                  <p>No members in group</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <button className="close-settings" onClick={() => setShowSettings(false)}>✕</button>
            <Settings darkMode={darkMode} setDarkMode={setDarkMode} />
          </div>
        </div>
      )}
    </div>
  );
}