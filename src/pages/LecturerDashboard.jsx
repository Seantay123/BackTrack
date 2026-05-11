import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log("Fetching dashboard data...");
      
      // Fetch projects
      const projectsRes = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsRes.json();
      console.log("Projects:", projects);
      
      // Fetch groups
      const groupsRes = await fetch('http://localhost:5000/groups/all', {
        credentials: 'include'
      });
      const groups = await groupsRes.json();
      console.log("Groups:", groups);
      
      // Fetch students
      const studentsRes = await fetch('http://localhost:5000/users/students', {
        credentials: 'include'
      });
      const students = await studentsRes.json();
      console.log("Students:", students);
      
      // Get current user
      const userRes = await fetch('http://localhost:5000/api/me', {
        credentials: 'include'
      });
      const userData = await userRes.json();
      console.log("User:", userData);
      
      setDashboardData({
        projects: projects,
        groups: groups,
        students: students,
        user: userData
      });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Loading Dashboard...</h2>
        <p>Please wait while we load your data.</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>No Data Available</h2>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '20px 30px',
        borderRadius: '24px',
        marginBottom: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0 }}>BACKTRACK</h1>
          <p style={{ color: '#6b7280', margin: '5px 0 0' }}>Lecturer Dashboard</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#111827',
            color: 'white',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Welcome Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '28px',
        marginBottom: '30px'
      }}>
        <h2 style={{ fontSize: '32px', margin: '0 0 10px 0' }}>
          Welcome back, {dashboardData.user?.name || 'Lecturer'}!
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>
          Manage projects, monitor student progress, and track contributions.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#6b7280', margin: '0 0 10px 0' }}>Total Projects</p>
          <h2 style={{ fontSize: '42px', margin: 0 }}>{dashboardData.projects?.length || 0}</h2>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#6b7280', margin: '0 0 10px 0' }}>Active Groups</p>
          <h2 style={{ fontSize: '42px', margin: 0 }}>{dashboardData.groups?.length || 0}</h2>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#6b7280', margin: '0 0 10px 0' }}>Total Students</p>
          <h2 style={{ fontSize: '42px', margin: 0 }}>{dashboardData.students?.length || 0}</h2>
        </div>
      </div>

      {/* Groups Section */}
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginBottom: '20px' }}>Group Progress</h2>
        {dashboardData.groups?.length === 0 ? (
          <p>No groups created yet. Create your first group!</p>
        ) : (
          dashboardData.groups.map((group) => (
            <div key={group.group_id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{group.group_name}</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>Group ID: {group.group_id}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}