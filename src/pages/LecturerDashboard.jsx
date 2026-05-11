import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    projects: [],
    groups: [],
    students: [],
    user: null
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    
    const userData = JSON.parse(storedUser);
    if (userData.role !== 'instructor' && userData.role !== 'admin') {
      navigate('/student');
      return;
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [projectsRes, groupsRes, studentsRes, userRes] = await Promise.all([
        fetch('http://localhost:5000/projects', { credentials: 'include' }),
        fetch('http://localhost:5000/groups/all', { credentials: 'include' }),
        fetch('http://localhost:5000/users/students', { credentials: 'include' }),
        fetch('http://localhost:5000/api/me', { credentials: 'include' })
      ]);
      
      const projects = await projectsRes.json();
      const groups = await groupsRes.json();
      const students = await studentsRes.json();
      const user = await userRes.json();
      
      setData({ projects, groups, students, user });
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard. Make sure backend is running.');
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
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7fb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '20px 30px',
        borderRadius: '24px',
        marginBottom: '30px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>BACKTRACK</h1>
          <p style={{ margin: '5px 0 0', color: '#666' }}>Lecturer Dashboard</p>
        </div>
        <div>
          <span style={{ marginRight: '20px' }}>Welcome, {data.user?.name || 'Lecturer'}!</span>
          <button onClick={handleLogout} style={{
            backgroundColor: '#111827',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer'
          }}>Logout</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', margin: 0 }}>Total Projects</p>
          <h2 style={{ fontSize: '36px', margin: '10px 0 0' }}>{data.projects.length}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', margin: 0 }}>Active Groups</p>
          <h2 style={{ fontSize: '36px', margin: '10px 0 0' }}>{data.groups.length}</h2>
        </div>
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', margin: 0 }}>Total Students</p>
          <h2 style={{ fontSize: '36px', margin: '10px 0 0' }}>{data.students.length}</h2>
        </div>
      </div>

      {/* Projects List */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', marginBottom: '30px' }}>
        <h2>Projects</h2>
        {data.projects.length === 0 ? (
          <p>No projects yet. Create your first project!</p>
        ) : (
          data.projects.map(project => (
            <div key={project.project_id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{project.project_name}</h3>
              <p style={{ margin: 0, color: '#666' }}>{project.description}</p>
            </div>
          ))
        )}
      </div>

      {/* Groups List */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px' }}>
        <h2>Groups</h2>
        {data.groups.length === 0 ? (
          <p>No groups yet. Create your first group!</p>
        ) : (
          data.groups.map(group => (
            <div key={group.group_id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{group.group_name}</h3>
              <p style={{ margin: 0, color: '#666' }}>Project ID: {group.project_id}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}