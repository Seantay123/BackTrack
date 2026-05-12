import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LecturerDashboard.css";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    lecturer: "",
    role: "",
    totalProjects: 0,
    totalGroups: 0,
    totalStudents: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    pendingReviews: 0,
    completionRate: 0,
    recentActivity: [],
    groups: []
  });
  const [user, setUser] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [students, setStudents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: ""
  });
  const [newGroup, setNewGroup] = useState({
    project_id: "",
    group_name: ""
  });
  const [newTask, setNewTask] = useState({
    group_id: "",
    assigned_to: "",
    title: "",
    description: "",
    deadline: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    if (userData.role !== 'lecturer' && userData.role !== 'admin') {
      navigate('/student');
      return;
    }
    
    fetchLecturerData();
    fetchStudents();
    fetchProjects();
  }, [navigate]);

  const fetchLecturerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const projectsResponse = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsResponse.json();
      
      // Fetch all groups
      const groupsResponse = await fetch('http://localhost:5000/groups/all', {
        credentials: 'include'
      });
      const groups = await groupsResponse.json();
      
      // Fetch all students
      const studentsResponse = await fetch('http://localhost:5000/users/students', {
        credentials: 'include'
      });
      const students = await studentsResponse.json();
      
      // Calculate statistics
      const totalProjects = projects.length;
      const totalGroups = groups.length;
      const totalStudents = students.length;
      
      // Calculate task statistics
      let totalTasks = 0;
      let tasksCompleted = 0;
      let pendingReviews = 0;
      const recentActivity = [];
      const groupData = [];
      
      for (const group of groups) {
        const tasksResponse = await fetch(`http://localhost:5000/groups/${group.group_id}/tasks`, {
          credentials: 'include'
        });
        const tasks = await tasksResponse.json();
        
        totalTasks += tasks.length;
        tasksCompleted += tasks.filter(t => t.status === 'completed').length;
        pendingReviews += tasks.filter(t => t.status === 'submitted').length;
        
        const project = projects.find(p => p.project_id === group.project_id);
        const groupProgress = tasks.length > 0 
          ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
          : 0;
        
        const membersResponse = await fetch(`http://localhost:5000/groups/${group.group_id}/members`, {
          credentials: 'include'
        });
        const members = await membersResponse.json();
        
        groupData.push({
          id: group.group_id,
          name: group.group_name,
          project: project?.project_name || "Unknown Project",
          progress: groupProgress,
          members: members.length,
          deadline: project?.end_date || "No deadline",
          status: groupProgress === 100 ? "Completed" : 
                  groupProgress > 0 ? "On Track" : "Pending Review"
        });
        
        if (recentActivity.length < 3) {
          recentActivity.push(`${group.group_name} is at ${groupProgress}% completion`);
        }
      }
      
      const completionRate = totalTasks > 0 
        ? Math.round((tasksCompleted / totalTasks) * 100)
        : 0;
      
      const userInfo = await fetch('http://localhost:5000/api/me', {
        credentials: 'include'
      });
      const userData = await userInfo.json();
      
      setDashboardData({
        lecturer: userData.name || user?.name || "Instructor",
        role: userData.role === 'instructor' ? "Course Instructor" : "Administrator",
        totalProjects,
        totalGroups,
        totalStudents,
        tasksCompleted,
        totalTasks,
        pendingReviews,
        completionRate,
        recentActivity: recentActivity.length > 0 ? recentActivity : ["No recent activity"],
        groups: groupData
      });
      
    } catch (err) {
      console.error('Error fetching lecturer data:', err);
      setError('Failed to load dashboard data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:5000/users/students', {
        credentials: 'include'
      });
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProject)
      });
      
      if (response.ok) {
        alert('Project created successfully!');
        setShowCreateProject(false);
        setNewProject({ project_name: "", description: "", start_date: "", end_date: "" });
        fetchLecturerData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/projects/${newGroup.project_id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ group_name: newGroup.group_name })
      });
      
      if (response.ok) {
        alert('Group created successfully!');
        setShowCreateGroup(false);
        setNewGroup({ project_id: "", group_name: "" });
        fetchLecturerData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group');
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/groups/${newTask.group_id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assigned_to: newTask.assigned_to,
          title: newTask.title,
          description: newTask.description,
          deadline: newTask.deadline
        })
      });
      
      if (response.ok) {
        alert('Task assigned successfully!');
        setShowAssignTask(false);
        setNewTask({ group_id: "", assigned_to: "", title: "", description: "", deadline: "" });
        fetchLecturerData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign task');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      alert('Failed to assign task');
    }
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="logo-title">
          <h1>BACKTRACK</h1>
          <p>Lecturer Dashboard</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-card">
          <p className="hero-subtitle">Lecturer Dashboard</p>
          <h2>Welcome back, {dashboardData.lecturer}</h2>
          <p>Manage projects, monitor student contribution, review progress, and export reports.</p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => setShowCreateProject(true)}>+ Create Project</button>
            <button className="secondary-btn" onClick={() => setShowCreateGroup(true)}>+ Create Group</button>
            <button className="secondary-btn" onClick={() => setShowAssignTask(true)}>Assign Tasks</button>
          </div>
        </div>

        <div className="progress-card">
          <h3>Overall Progress</h3>
          <div className="progress-circle">
            <h1>{dashboardData.completionRate}%</h1>
          </div>
          <div className="progress-details">
            <div>
              <span>Pending Reviews</span>
              <h4>{dashboardData.pendingReviews}</h4>
            </div>
            <div>
              <span>Completed Tasks</span>
              <h4>{dashboardData.tasksCompleted}/{dashboardData.totalTasks}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <p>Total Projects</p>
          <h2>{dashboardData.totalProjects}</h2>
        </div>
        <div className="stat-card">
          <p>Active Groups</p>
          <h2>{dashboardData.totalGroups}</h2>
        </div>
        <div className="stat-card">
          <p>Total Students</p>
          <h2>{dashboardData.totalStudents}</h2>
        </div>
        <div className="stat-card">
          <p>Tasks Completed</p>
          <h2>{dashboardData.tasksCompleted}/{dashboardData.totalTasks}</h2>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="group-progress">
          <div className="section-header">
            <div>
              <h2>Group Progress</h2>
              <p>Track active student project performance.</p>
            </div>
            <button className="black-btn export-btn">Export Report</button>
          </div>

          {dashboardData.groups.map((group) => (
            <div className="group-card" key={group.id}>
              <div className="group-top">
                <div>
                  <h3>{group.name}</h3>
                  <p>{group.project}</p>
                </div>
                <span className={`group-status ${group.status === "Completed" ? "completed" : group.status === "Pending Review" ? "pending" : "active"}`}>
                  {group.status}
                </span>
              </div>
              <div className="group-meta">
                <span>👥 {group.members} Members</span>
                <span>📅 {group.deadline}</span>
              </div>
              <div className="group-progress-info">
                <h2>{group.progress}%</h2>
                <p>Completed</p>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${group.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* SIDE PANEL */}
        <div className="side-panel">
          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <button className="black-btn" onClick={() => setShowCreateProject(true)}>+ Create New Project</button>
            <button className="gray-btn" onClick={() => setShowCreateGroup(true)}>+ Create New Group</button>
            <button className="gray-btn" onClick={() => setShowAssignTask(true)}>Assign New Task</button>
            <button className="gray-btn">Generate Analytics</button>
          </div>

          <div className="recent-activity">
            <h2>Recent Activity</h2>
            {dashboardData.recentActivity.map((activity, index) => (
              <div className="activity-item" key={index}>
                <div className="activity-dot"></div>
                <div>
                  <p>{activity}</p>
                  <span>{index + 1} hour ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <input type="text" placeholder="Project Name" value={newProject.project_name} onChange={(e) => setNewProject({...newProject, project_name: e.target.value})} required />
              <textarea placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({...newProject, description: e.target.value})} />
              <input type="date" placeholder="Start Date" value={newProject.start_date} onChange={(e) => setNewProject({...newProject, start_date: e.target.value})} />
              <input type="date" placeholder="End Date" value={newProject.end_date} onChange={(e) => setNewProject({...newProject, end_date: e.target.value})} />
              <div className="modal-buttons">
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowCreateProject(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <select value={newGroup.project_id} onChange={(e) => setNewGroup({...newGroup, project_id: e.target.value})} required>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
              <input type="text" placeholder="Group Name" value={newGroup.group_name} onChange={(e) => setNewGroup({...newGroup, group_name: e.target.value})} required />
              <div className="modal-buttons">
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowCreateGroup(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignTask && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Assign Task</h2>
            <form onSubmit={handleAssignTask}>
              <select value={newTask.group_id} onChange={(e) => setNewTask({...newTask, group_id: e.target.value})} required>
                <option value="">Select Group</option>
                {dashboardData.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={newTask.assigned_to} onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
              </select>
              <input type="text" placeholder="Task Title" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required />
              <textarea placeholder="Description" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} />
              <input type="date" placeholder="Deadline" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} />
              <div className="modal-buttons">
                <button type="submit">Assign</button>
                <button type="button" onClick={() => setShowAssignTask(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );}
