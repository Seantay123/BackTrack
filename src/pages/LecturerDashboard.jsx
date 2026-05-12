import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LecturerDashboard.css";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, group-analytics, individual-analytics
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    groupPerformance: [],
    individualPerformance: [],
    overallStats: {}
  });
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
    fetchAnalyticsData();
  }, [navigate]);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch group performance analytics
      const groupsResponse = await fetch('http://localhost:5000/groups/all', {
        credentials: 'include'
      });
      const groups = await groupsResponse.json();
      
      const groupPerformance = [];
      const individualPerformance = [];
      let totalCompletionRate = 0;
      let totalTasksAcrossGroups = 0;
      let totalCompletedTasks = 0;
      
      for (const group of groups) {
        // Get group tasks
        const tasksResponse = await fetch(`http://localhost:5000/groups/${group.group_id}/tasks`, {
          credentials: 'include'
        });
        const tasks = await tasksResponse.json();
        
        // Get group members
        const membersResponse = await fetch(`http://localhost:5000/groups/${group.group_id}/members`, {
          credentials: 'include'
        });
        const members = await membersResponse.json();
        
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'submitted').length;
        const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
        
        totalCompletionRate += completionRate;
        totalTasksAcrossGroups += tasks.length;
        totalCompletedTasks += completedTasks;
        
        // Group analytics
        groupPerformance.push({
          group_id: group.group_id,
          group_name: group.group_name,
          project_name: group.project_name || "Unknown Project",
          total_tasks: tasks.length,
          completed_tasks: completedTasks,
          pending_tasks: pendingTasks,
          completion_rate: Math.round(completionRate),
          member_count: members.length,
          members: members,
          tasks: tasks
        });
        
        // Individual student analytics
        for (const member of members) {
          const studentTasks = tasks.filter(t => t.assigned_to === member.user_id);
          const studentCompleted = studentTasks.filter(t => t.status === 'completed').length;
          const studentCompletionRate = studentTasks.length > 0 ? (studentCompleted / studentTasks.length) * 100 : 0;
          
          individualPerformance.push({
            user_id: member.user_id,
            name: member.name,
            email: member.email,
            group_name: group.group_name,
            group_id: group.group_id,
            total_tasks: studentTasks.length,
            completed_tasks: studentCompleted,
            completion_rate: Math.round(studentCompletionRate),
            pending_tasks: studentTasks.filter(t => t.status === 'submitted').length,
            overdue_tasks: studentTasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length
          });
        }
      }
      
      const overallStats = {
        average_completion_rate: groups.length > 0 ? Math.round(totalCompletionRate / groups.length) : 0,
        total_groups: groups.length,
        total_tasks: totalTasksAcrossGroups,
        total_completed_tasks: totalCompletedTasks,
        total_students: individualPerformance.length,
        top_performing_group: groupPerformance.sort((a, b) => b.completion_rate - a.completion_rate)[0],
        needs_attention_groups: groupPerformance.filter(g => g.completion_rate < 50)
      };
      
      setAnalyticsData({
        groupPerformance,
        individualPerformance,
        overallStats
      });
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchLecturerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const projectsResponse = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsResponse.json();
      
      const groupsResponse = await fetch('http://localhost:5000/groups/all', {
        credentials: 'include'
      });
      const groups = await groupsResponse.json();
      
      const studentsResponse = await fetch('http://localhost:5000/users/students', {
        credentials: 'include'
      });
      const students = await studentsResponse.json();
      
      const totalProjects = projects.length;
      const totalGroups = groups.length;
      const totalStudents = students.length;
      
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
        fetchAnalyticsData();
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
        fetchAnalyticsData();
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
        fetchAnalyticsData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign task');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      alert('Failed to assign task');
    }
  };

  const exportReport = (type, id = null, name = null) => {
    let reportData = [];
    let filename = '';
    let headers = [];

    if (type === 'group' && id) {
      const group = analyticsData.groupPerformance.find(g => g.group_id === id);
      if (group) {
        reportData = group.tasks.map(task => ({
          'Task Title': task.title,
          'Assigned To': task.assigned_to_name || 'Unknown',
          'Status': task.status,
          'Deadline': task.deadline,
          'Completed At': task.completed_at || 'Not completed'
        }));
        filename = `${group.group_name}_report.csv`;
        headers = ['Task Title', 'Assigned To', 'Status', 'Deadline', 'Completed At'];
      }
    } 
    else if (type === 'student' && id) {
      const student = analyticsData.individualPerformance.find(s => s.user_id === id);
      if (student) {
        reportData = [{
          'Student Name': student.name,
          'Email': student.email,
          'Group': student.group_name,
          'Total Tasks': student.total_tasks,
          'Completed Tasks': student.completed_tasks,
          'Completion Rate': `${student.completion_rate}%`,
          'Pending Tasks': student.pending_tasks,
          'Overdue Tasks': student.overdue_tasks
        }];
        filename = `${student.name}_performance_report.csv`;
        headers = ['Student Name', 'Email', 'Group', 'Total Tasks', 'Completed Tasks', 'Completion Rate', 'Pending Tasks', 'Overdue Tasks'];
      }
    }
    else if (type === 'all-groups') {
      reportData = analyticsData.groupPerformance.map(group => ({
        'Group Name': group.group_name,
        'Project': group.project_name,
        'Members': group.member_count,
        'Total Tasks': group.total_tasks,
        'Completed Tasks': group.completed_tasks,
        'Completion Rate': `${group.completion_rate}%`,
        'Pending Tasks': group.pending_tasks
      }));
      filename = 'all_groups_performance_report.csv';
      headers = ['Group Name', 'Project', 'Members', 'Total Tasks', 'Completed Tasks', 'Completion Rate', 'Pending Tasks'];
    }
    else if (type === 'all-students') {
      reportData = analyticsData.individualPerformance.map(student => ({
        'Student Name': student.name,
        'Email': student.email,
        'Group': student.group_name,
        'Total Tasks': student.total_tasks,
        'Completed Tasks': student.completed_tasks,
        'Completion Rate': `${student.completion_rate}%`,
        'Pending Tasks': student.pending_tasks,
        'Overdue Tasks': student.overdue_tasks
      }));
      filename = 'all_students_performance_report.csv';
      headers = ['Student Name', 'Email', 'Group', 'Total Tasks', 'Completed Tasks', 'Completion Rate', 'Pending Tasks', 'Overdue Tasks'];
    }

    // Convert to CSV
    const csvRows = [headers.join(',')];
    for (const row of reportData) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    navigate('/');
  };

  const renderAnalyticsOverview = () => {
    const { overallStats, groupPerformance, individualPerformance } = analyticsData;
    
    return (
      <div className="analytics-overview">
        <div className="analytics-header">
          <h2>Performance Analytics</h2>
          <div className="export-buttons">
            <button onClick={() => exportReport('all-groups')} className="secondary-btn">📊 Export All Groups</button>
            <button onClick={() => exportReport('all-students')} className="secondary-btn">👥 Export All Students</button>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat-card">
            <p>Average Completion Rate</p>
            <h2>{overallStats.average_completion_rate}%</h2>
          </div>
          <div className="stat-card">
            <p>Total Groups</p>
            <h2>{overallStats.total_groups}</h2>
          </div>
          <div className="stat-card">
            <p>Total Students</p>
            <h2>{overallStats.total_students}</h2>
          </div>
          <div className="stat-card">
            <p>Tasks Completed</p>
            <h2>{overallStats.total_completed_tasks}/{overallStats.total_tasks}</h2>
          </div>
        </div>

        {overallStats.top_performing_group && (
          <div className="top-performer">
            <h3>🏆 Top Performing Group</h3>
            <div className="performer-card">
              <h4>{overallStats.top_performing_group.group_name}</h4>
              <p>Completion Rate: {overallStats.top_performing_group.completion_rate}%</p>
              <p>Tasks: {overallStats.top_performing_group.completed_tasks}/{overallStats.top_performing_group.total_tasks}</p>
            </div>
          </div>
        )}

        {overallStats.needs_attention_groups?.length > 0 && (
          <div className="attention-groups">
            <h3>⚠️ Groups Needing Attention</h3>
            <div className="attention-list">
              {overallStats.needs_attention_groups.map(group => (
                <div key={group.group_id} className="attention-card">
                  <h4>{group.group_name}</h4>
                  <p>Completion Rate: {group.completion_rate}%</p>
                  <button onClick={() => {
                    setActiveTab('group-analytics');
                    setSelectedGroup(group.group_id);
                  }} className="small-btn">View Details</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroupAnalytics = () => {
    return (
      <div className="group-analytics">
        <div className="analytics-header">
          <h2>Group Performance Analytics</h2>
          <button onClick={() => exportReport('all-groups')} className="secondary-btn">📥 Export All Groups</button>
        </div>
        
        <div className="groups-list">
          {analyticsData.groupPerformance.map(group => (
            <div 
              key={group.group_id} 
              className={`group-analytics-card ${selectedGroup === group.group_id ? 'selected' : ''}`}
              onClick={() => setSelectedGroup(selectedGroup === group.group_id ? null : group.group_id)}
            >
              <div className="group-header">
                <h3>{group.group_name}</h3>
                <span className={`completion-badge ${group.completion_rate >= 70 ? 'high' : group.completion_rate >= 40 ? 'medium' : 'low'}`}>
                  {group.completion_rate}%
                </span>
              </div>
              <div className="group-stats">
                <div>📊 Project: {group.project_name}</div>
                <div>👥 Members: {group.member_count}</div>
                <div>✅ Tasks: {group.completed_tasks}/{group.total_tasks}</div>
                <div>⏳ Pending: {group.pending_tasks}</div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${group.completion_rate}%` }}></div>
              </div>
              
              {selectedGroup === group.group_id && (
                <div className="group-details">
                  <h4>Member Performance</h4>
                  <table className="member-table">
                    <thead>
                      <tr><th>Name</th><th>Tasks</th><th>Completion</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {group.members.map(member => {
                        const studentStats = analyticsData.individualPerformance.find(s => s.user_id === member.user_id);
                        return studentStats ? (
                          <tr key={member.user_id}>
                            <td>{member.name}</td>
                            <td>{studentStats.completed_tasks}/{studentStats.total_tasks}</td>
                            <td>{studentStats.completion_rate}%</td>
                            <td>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('individual-analytics');
                                  setSelectedStudent(member.user_id);
                                }}
                                className="small-btn"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ) : null;
                      })}
                    </tbody>
                  </table>
                  <button onClick={() => exportReport('group', group.group_id)} className="export-btn-small">
                    📥 Export Group Report
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIndividualAnalytics = () => {
    const filteredStudents = selectedStudent 
      ? analyticsData.individualPerformance.filter(s => s.user_id === selectedStudent)
      : analyticsData.individualPerformance;

    return (
      <div className="individual-analytics">
        <div className="analytics-header">
          <h2>Student Performance Analytics</h2>
          <div className="filter-bar">
            <select onChange={(e) => setSelectedStudent(e.target.value || null)} value={selectedStudent || ''}>
              <option value="">All Students</option>
              {students.map(s => (
                <option key={s.user_id} value={s.user_id}>{s.name}</option>
              ))}
            </select>
            <button onClick={() => exportReport('all-students')} className="secondary-btn">📥 Export All</button>
          </div>
        </div>

        <div className="students-list">
          {filteredStudents.map(student => (
            <div key={student.user_id} className="student-analytics-card">
              <div className="student-header">
                <div>
                  <h3>{student.name}</h3>
                  <p>{student.email}</p>
                  <span className="group-tag">{student.group_name}</span>
                </div>
                <div className="student-score">
                  <h1>{student.completion_rate}%</h1>
                  <p>Completion Rate</p>
                </div>
              </div>
              
              <div className="student-stats-grid">
                <div className="stat">
                  <label>📋 Total Tasks</label>
                  <h4>{student.total_tasks}</h4>
                </div>
                <div className="stat">
                  <label>✅ Completed</label>
                  <h4>{student.completed_tasks}</h4>
                </div>
                <div className="stat">
                  <label>⏳ Pending</label>
                  <h4>{student.pending_tasks}</h4>
                </div>
                <div className="stat">
                  <label>⚠️ Overdue</label>
                  <h4 className={student.overdue_tasks > 0 ? 'warning' : ''}>
                    {student.overdue_tasks}
                  </h4>
                </div>
              </div>
              
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${student.completion_rate}%` }}></div>
              </div>
              
              <button onClick={() => exportReport('student', student.user_id, student.name)} className="export-btn-small">
                📥 Download Individual Report
              </button>
            </div>
          ))}
        </div>
      </div>
    );
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

      {/* TABS */}
      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'group-analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('group-analytics')}
        >
          👥 Group Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'individual-analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('individual-analytics')}
        >
          👤 Individual Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
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

          {/* Analytics Overview */}
          {renderAnalyticsOverview()}

          {/* MAIN CONTENT */}
          <div className="main-content">
            <div className="group-progress">
              <div className="section-header">
                <div>
                  <h2>Group Progress</h2>
                  <p>Track active student project performance.</p>
                </div>
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
                <button className="gray-btn" onClick={() => setActiveTab('group-analytics')}>View Analytics</button>
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
        </>
      )}

      {activeTab === 'group-analytics' && renderGroupAnalytics()}
      {activeTab === 'individual-analytics' && renderIndividualAnalytics()}

      {/* Modals remain the same */}
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
  );
}