import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaMoon, FaChevronDown, FaCog, FaTimes } from "react-icons/fa";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [fileLink, setFileLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [myGroups, setMyGroups] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      
      const projectsRes = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projectsData = await projectsRes.json();
      setProjects(projectsData);
      
      let allGroups = [];
      let allTasks = [];
      let allMembers = [];
      
      for (const project of projectsData) {
        const groupsRes = await fetch(`http://localhost:5000/projects/${project.project_id}/groups`, {
          credentials: 'include'
        });
        const groups = await groupsRes.json();
        allGroups = [...allGroups, ...groups];
        
        for (const group of groups) {
          const tasksRes = await fetch(`http://localhost:5000/groups/${group.group_id}/tasks`, {
            credentials: 'include'
          });
          const tasks = await tasksRes.json();
          allTasks = [...allTasks, ...tasks];
          
          const membersRes = await fetch(`http://localhost:5000/groups/${group.group_id}/members`, {
            credentials: 'include'
          });
          const members = await membersRes.json();
          allMembers = [...allMembers, ...members];
        }
      }
      
      setMyGroups(allGroups);
      setTasks(allTasks);
      setMembers(allMembers);
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
  if (!fileLink) {
    setSubmitMessage("Please provide a file link");
    return;
  }
  
  setSubmitting(true);
  setSubmitMessage("");
  
  try {
    const response = await fetch(`http://localhost:5000/tasks/${selectedTask.task_id}/submit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ file_link: fileLink })
    });
    
    if (response.ok) {
      setSubmitMessage("✅ Task submitted successfully!");
      
      // Update the task status locally
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.task_id === selectedTask.task_id 
            ? { ...task, status: 'submitted' }
            : task
        )
      );
      
      setTimeout(() => {
        setShowSubmitModal(false);
        setSelectedTask(null);
        setFileLink("");
        setSubmitMessage("");
        // Refresh data from backend to ensure accuracy
        loadUserData();
      }, 1500);
    } else {
      const error = await response.json();
      setSubmitMessage(`❌ Error: ${error.error}`);
    }
  } catch (err) {
    console.error('Submission error:', err);
    setSubmitMessage("❌ Failed to submit task");
  } finally {
    setSubmitting(false);
  }
};

  const openSubmitModal = (task) => {
    if (task.status === 'pending') {
      setSelectedTask(task);
      setShowSubmitModal(true);
      setFileLink("");
      setSubmitMessage("");
    } else {
      setSubmitMessage(`Task already ${task.status}`);
      setTimeout(() => setSubmitMessage(""), 2000);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filter === "All" ? true : task.status === filter;
    const matchesDate = selectedDate === "" ? true : task.deadline === selectedDate;
    return matchesStatus && matchesDate;
  });

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    window.location.href = '/';
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
          <button className="tab active" onClick={() => navigate('/student')}>Dashboard</button>
          <button className="tab" onClick={() => navigate('/tasks')}>Tasks</button>
          <button className="tab" onClick={() => navigate('/peer')}>Peer Evaluation</button>
          <button className="tab" onClick={() => navigate('/analytics')}>Analytics</button>
        </div>

        <div className="topbar-right">
          <FaBell className="icon" />
          <FaMoon className="icon" onClick={() => setDarkMode(!darkMode)} />
          <FaCog className="icon" onClick={() => setShowSettings(true)} title="Settings" />
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Logout</button>
          
          <div className="profile">
            <div className="profile-info">
              <h4>{user?.name || "Student"}</h4>
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
            <button className="add-btn" onClick={() => {
              const pendingTasks = tasks.filter(t => t.status === 'pending');
              if (pendingTasks.length > 0) {
                openSubmitModal(pendingTasks[0]);
              } else {
                setSubmitMessage("No pending tasks to submit");
                setTimeout(() => setSubmitMessage(""), 2000);
              }
            }}>+</button>
          </div>

          <div className="filters">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              <option>pending</option>
              <option>submitted</option>
              <option>completed</option>
            </select>
            <div className="calendar-box">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>

          {submitMessage && !showSubmitModal && (
            <div style={{ padding: '10px', margin: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
              {submitMessage}
            </div>
          )}

          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div 
                className="task-card" 
                key={task.task_id}
                onClick={() => openSubmitModal(task)}
                style={{ cursor: 'pointer' }}
              >
                <div className="task-top">
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.description}</p>
                  </div>
                  <FaChevronDown />
                </div>
                <div className="task-footer">
                  <span className={`status ${task.status || "pending"}`}>
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
              <span>Group {myGroups[0]?.group_name || "No group"}</span>
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

      {/* SUBMIT TASK MODAL */}
      {showSubmitModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Submit Task</h2>
              <button className="close-modal" onClick={() => setShowSubmitModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <h3>{selectedTask.title}</h3>
              <p>{selectedTask.description}</p>
              
              <div className="form-group">
                <label>File Link (Google Drive, GitHub, etc.):</label>
                <input 
                  type="text" 
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              {submitMessage && (
                <div className={`submit-message ${submitMessage.includes("✅") ? "success" : "error"}`}>
                  {submitMessage}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={handleSubmitTask} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Task"}
              </button>
              <button onClick={() => setShowSubmitModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <button className="close-settings" onClick={() => setShowSettings(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}