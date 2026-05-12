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
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [myGroups, setMyGroups] = useState([]);

  // Fetch fresh user data from backend to verify role
  const fetchUserFromBackend = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      
      const userData = await response.json();
      console.log('Backend user data:', userData);
      
      // CRITICAL FIX: Check if user is a student
      if (userData.role !== 'student') {
        console.error('User role is not student:', userData.role);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect to appropriate dashboard
        if (userData.role === 'lecturer' || userData.role === 'admin' || userData.role === 'instructor') {
          navigate('/lecturer');
        } else {
          navigate('/');
        }
        return null;
      }
      
      // Update localStorage with correct data
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
      
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user data. Please login again.');
      setTimeout(() => {
        localStorage.removeItem('user');
        navigate('/');
      }, 2000);
      return null;
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First verify user is a student
      const currentUser = await fetchUserFromBackend();
      if (!currentUser) {
        return;
      }
      
      // Fetch projects
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
          
          // Only show tasks assigned to current user
          const userTasks = tasks.filter(task => task.assigned_to === currentUser.user_id);
          allTasks = [...allTasks, ...userTasks];
          
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'submitted',
          file_link: fileLink 
        })
      });
      
      if (response.ok) {
        // Update the task status locally IMMEDIATELY
        const updatedTasks = tasks.map(task => 
          task.task_id === selectedTask.task_id 
            ? { ...task, status: 'submitted' }
            : task
        );
        setTasks(updatedTasks);
        
        // Calculate updated progress
        const completedOrSubmitted = updatedTasks.filter(t => t.status === 'completed' || t.status === 'submitted').length;
        const newProgress = Math.round((completedOrSubmitted / updatedTasks.length) * 100);
        
        setSubmitMessage("✅ Task submitted successfully!");
        setToastMessage(`✅ "${selectedTask.title}" submitted! Progress: ${newProgress}%`);
        
        // Close modal after delay
        setTimeout(() => {
          setShowSubmitModal(false);
          setSelectedTask(null);
          setFileLink("");
          setSubmitMessage("");
          
          // Refresh in background to sync with backend
          setTimeout(() => {
            loadUserData();
          }, 500);
          
          setTimeout(() => setToastMessage(""), 3000);
        }, 1500);
      } else {
        const error = await response.json();
        setSubmitMessage(`❌ Error: ${error.error || 'Submission failed'}`);
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
    } else if (task.status === 'submitted') {
      setToastMessage("⏳ Task is already submitted and pending review");
      setTimeout(() => setToastMessage(""), 2000);
    } else if (task.status === 'completed') {
      setToastMessage("✅ Task is already completed!");
      setTimeout(() => setToastMessage(""), 2000);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filter === "All" ? true : task.status === filter;
    const matchesDate = selectedDate === "" ? true : task.deadline === selectedDate;
    return matchesStatus && matchesDate;
  });

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    // Consider both 'completed' AND 'submitted' as progress
    const completedOrSubmitted = tasks.filter(t => t.status === 'completed' || t.status === 'submitted').length;
    return Math.round((completedOrSubmitted / tasks.length) * 100);
  };

  const getProgressMessage = () => {
    const progress = calculateProgress();
    if (progress === 100) return "🎉 All tasks completed! Great job!";
    if (progress >= 75) return "🌟 Almost there! Keep going!";
    if (progress >= 50) return "📈 Halfway there! Good progress!";
    if (progress >= 25) return "💪 Making progress! Stay focused!";
    return "🚀 Start working on your tasks!";
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Refresh data
  const refreshData = () => {
    loadUserData();
    setToastMessage("🔄 Dashboard refreshed!");
    setTimeout(() => setToastMessage(""), 2000);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className="loading-spinner"></div>
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

  const progress = calculateProgress();

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="toast-message">
          {toastMessage}
        </div>
      )}

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
          <button className="refresh-btn-header" onClick={refreshData} title="Refresh">
            🔄
          </button>
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
            <button className="refresh-btn-small" onClick={refreshData} title="Refresh tasks">
              🔄
            </button>
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
              <button className="refresh-btn-small" onClick={refreshData}>Refresh</button>
            </div>
          )}
        </div>

        {/* MAIN - Project Dashboard */}
        <div className="main">
          <h1>Project Dashboard</h1>

          <div className="grid">
            <div className="card">
              <h3>Welcome back 👋</h3>
              <p>{user?.name || "Student"}</p>
              <p style={{ fontSize: '14px', color: '#666' }}>Group: {myGroups[0]?.group_name || "No group"}</p>
              <span>Role: {user?.role || "Student"}</span>
            </div>

            <div className="card">
              <h3>Your Progress</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-stats">
                <p className="progress-percentage">{progress}% Complete</p>
                <p className="progress-message">{getProgressMessage()}</p>
              </div>
              <div className="task-summary">
                <span>✅ Completed: {tasks.filter(t => t.status === 'completed').length}</span>
                <span>📤 Submitted: {tasks.filter(t => t.status === 'submitted').length}</span>
                <span>⏳ Pending: {tasks.filter(t => t.status === 'pending').length}</span>
              </div>
            </div>

            <div className="card">
              <h3>Team Members</h3>
              <div className="members">
                {members.length > 0 ? (
                  members.map((member, i) => (
                    <div key={i} className="member">
                      <span className="member-name">{member.name}</span>
                      {member.user_id === user?.user_id && <span className="you-badge">(You)</span>}
                    </div>
                  ))
                ) : (
                  <p>No members in group</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {tasks.filter(t => t.status === 'submitted').slice(0, 3).map(task => (
                <div key={task.task_id} className="activity-item">
                  <span className="activity-icon">📤</span>
                  <div>
                    <p><strong>{task.title}</strong> submitted for review</p>
                    <small>Waiting for lecturer approval</small>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'completed').slice(0, 3).map(task => (
                <div key={task.task_id} className="activity-item">
                  <span className="activity-icon">✅</span>
                  <div>
                    <p><strong>{task.title}</strong> completed</p>
                    <small>Great work!</small>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'pending' && t.status !== 'submitted' && t.status !== 'completed').length === 0 && (
                <div className="activity-item">
                  <span className="activity-icon">📭</span>
                  <div>
                    <p>No recent activity</p>
                    <small>Start working on your tasks</small>
                  </div>
                </div>
              )}
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
              <p><strong>Deadline:</strong> {selectedTask.deadline || "No deadline"}</p>
              
              <div className="form-group">
                <label>File Link (Google Drive, GitHub, etc.):</label>
                <input 
                  type="text" 
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>
              
              {submitMessage && (
                <div className={`submit-message ${submitMessage.includes("✅") ? "success" : "error"}`}>
                  {submitMessage}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={handleSubmitTask} disabled={submitting} className="submit-btn">
                {submitting ? "Submitting..." : "Submit Task"}
              </button>
              <button onClick={() => setShowSubmitModal(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <button className="close-settings" onClick={() => setShowSettings(false)}>✕</button>
            <h3>Settings</h3>
            <div className="settings-option">
              <label>
                <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                Dark Mode
              </label>
            </div>
            <button className="close-btn" onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}