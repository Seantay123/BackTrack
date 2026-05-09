
import "./TeacherDashboard.css";

export default function TeacherDashboard() {
  const dashboardData = {
    lecturer: "Dr. Sarah Johnson",
    role: "Senior Lecturer - Computer Science",
    totalProjects: 12,
    totalGroups: 28,
    totalStudents: 143,
    tasksCompleted: 94,
    totalTasks: 120,
    pendingReviews: 8,
    completionRate: 78,
    recentActivity: [
      "Group 10 submitted milestone report",
      "Database Project deadline updated",
      "3 assignments graded today",
    ],
    groups: [
      {
        id: 1,
        name: "Group 10",
        project: "Web Development Final Project",
        progress: 88,
        members: 4,
        deadline: "May 15, 2026",
        status: "On Track",
      },
      {
        id: 2,
        name: "Group 3",
        project: "Database Design Assignment",
        progress: 67,
        members: 3,
        deadline: "May 20, 2026",
        status: "Pending Review",
      },
      {
        id: 3,
        name: "Group 7",
        project: "AI Research Presentation",
        progress: 94,
        members: 5,
        deadline: "May 10, 2026",
        status: "Completed",
      },
    ],
  };

  return (
    <div className="dashboard-container">
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="logo-title">
          <h1>BACKTRACK</h1>
          <p>Smart Project Monitoring System</p>
        </div>

        <button className="logout-btn">Logout</button>
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