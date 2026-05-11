import { Bar } from "react-chartjs-2";
import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function Analytics() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      // Fetch projects first
      const projectsRes = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsRes.json();
      
      // For each project, fetch groups
      let allGroups = [];
      for (const project of projects) {
        const groupsRes = await fetch(`http://localhost:5000/projects/${project.project_id}/groups`, {
          credentials: 'include'
        });
        const groups = await groupsRes.json();
        allGroups = [...allGroups, ...groups];
      }
      
      setGroups(allGroups);
      if (allGroups.length > 0) {
        setSelectedGroup(allGroups[0].group_id);
        fetchScores(allGroups[0].group_id);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
      setLoading(false);
    }
  };

  const fetchScores = async (groupId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/groups/${groupId}/scores`, {
        credentials: 'include'
      });
      const scores = await response.json();
      
      // Prepare chart data
      setChartData({
        labels: scores.map(s => s.name),
        datasets: [
          {
            label: "Contribution Score (%)",
            data: scores.map(s => s.final_score),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: "Task Score (40%)",
            data: scores.map(s => s.task_score),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: "Peer Score (30%)",
            data: scores.map(s => s.peer_score),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          }
        ]
      });
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Student Contribution Scores by Group',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score (%)'
        }
      }
    }
  };

  if (loading) return <div className="container"><p>Loading analytics...</p></div>;
  if (error) return <div className="container"><p style={{color: 'red'}}>{error}</p></div>;
  if (!chartData) return <div className="container"><p>No data available</p></div>;

  return (
    <div className="container">
      <h1>Analytics Dashboard</h1>
      
      {/* Group Selector */}
      {groups.length > 0 && (
        <div className="group-selector" style={{ marginBottom: '20px' }}>
          <label>Select Group: </label>
          <select 
            value={selectedGroup} 
            onChange={(e) => fetchScores(parseInt(e.target.value))}
            style={{ padding: '8px', marginLeft: '10px' }}
          >
            {groups.map(group => (
              <option key={group.group_id} value={group.group_id}>
                {group.group_name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="card">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Score Breakdown */}
      <div className="score-breakdown" style={{ marginTop: '20px' }}>
        <h3>Scoring Formula:</h3>
        <p>40% Task Completion + 30% Activity Logs + 30% Peer Evaluation = Final Score</p>
      </div>
    </div>
  );
}