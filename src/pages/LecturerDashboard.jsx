import "./LecturerDashboard.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    // Check if user has instructor or admin role
    if (userData.role !== 'instructor' && userData.role !== 'admin') {
      navigate('/student');
      return;
    }
    
    fetchTeacherData();
  }, [navigate]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const projectsResponse = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsResponse.json();
      
      // Fetch all groups (you may need to create this endpoint)
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
        // Fetch tasks for each group
        const tasksResponse = await fetch(`http://localhost:5000/groups/${group.group_id}/tasks`, {
          credentials: 'include'
        });
        const tasks = await tasksResponse.json();
        
        totalTasks += tasks.length;
        tasksCompleted += tasks.filter(t => t.status === 'completed').length;
        pendingReviews += tasks.filter(t => t.status === 'submitted').length;
        
        // Get project info for this group
        const project = projects.find(p => p.project_id === group.project_id);
        
        // Calculate group progress
        const groupProgress = tasks.length > 0 
          ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
          : 0;
        
        // Get group members count
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
        
        // Add to recent activity (last 3 groups)
        if (recentActivity.length < 3) {
          recentActivity.push(`${group.group_name} is at ${groupProgress}% completion`);
        }
      }
      
      // Calculate completion rate
      const completionRate = totalTasks > 0 
        ? Math.round((tasksCompleted / totalTasks) * 100)
        : 0;
      
      // Get user info from session
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
      console.error('Error fetching teacher data:', err);
      setError('Failed to load dashboard data. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('user');
      navigate('/');
    }
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
          <p>Smart Project Monitoring System</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-card">
          <p className="hero-subtitle">Teacher Dashboard</p>

          <h2>Welcome back, {dashboardData.lecturer}</h2>

          <p>
            Manage projects, monitor student contribution, review
            progress, and export reports all from one premium dashboard
            interface.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">+ Create Project</button>
            <button className="secondary-btn">Assign Tasks</button>
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
              <h4>
                {dashboardData.tasksCompleted}/
                {dashboardData.totalTasks}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className="active-tab">Overview</button>
        <button>Projects</button>
        <button>Tasks</button>
        <button>Analytics</button>
        <button>Reports</button>
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
          <h2>
            {dashboardData.tasksCompleted}/
            {dashboardData.totalTasks}
          </h2>
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

            <button className="black-btn export-btn">
              Export Report
            </button>
          </div>

          {dashboardData.groups.map((group) => (
            <div className="group-card" key={group.id}>
              <div className="group-top">
                <div>
                  <h3>{group.name}</h3>
                  <p>{group.project}</p>
                </div>

                <span
                  className={`group-status ${
                    group.status === "Completed"
                      ? "completed"
                      : group.status === "Pending Review"
                      ? "pending"
                      : "active"
                  }`}
                >
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
                <div
                  className="progress-fill"
                  style={{ width: `${group.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* SIDE PANEL */}
        <div className="side-panel">
          <div className="quick-actions">
            <h2>Quick Actions</h2>

            <button className="black-btn">
              + Create New Project
            </button>

            <button className="gray-btn">
              Assign New Task
            </button>

            <button className="gray-btn">
              Generate Analytics
            </button>
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
    </div>
  );
}