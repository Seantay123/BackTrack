import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PeerEvaluation() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await response.json();
      
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
        fetchMembers(allGroups[0].group_id);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMembers = async (groupId) => {
    try {
      const response = await fetch(`http://localhost:5000/groups/${groupId}/peer-evaluation`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMembers(data);
      
      // Initialize ratings and comments
      const initialRatings = {};
      const initialComments = {};
      data.forEach(member => {
        initialRatings[member.user_id] = 3;
        initialComments[member.user_id] = "";
      });
      setRatings(initialRatings);
      setComments(initialComments);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleSubmit = async (evaluateeId) => {
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5000/groups/${selectedGroup}/peer-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          evaluatee_id: evaluateeId,
          rating: ratings[evaluateeId],
          comment: comments[evaluateeId]
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✓ Evaluation submitted successfully!`);
        // Refresh member list to update status
        fetchMembers(selectedGroup);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error submitting evaluation`);
    } finally {
      setSubmitting(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="container">
        <h1>Peer Evaluation</h1>
        <p>You are not in any groups yet.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Peer Evaluation</h1>
      
      {/* Group Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label>Select Group: </label>
        <select 
          value={selectedGroup || ""} 
          onChange={(e) => {
            setSelectedGroup(parseInt(e.target.value));
            fetchMembers(parseInt(e.target.value));
          }}
          style={{ padding: '8px', marginLeft: '10px' }}
        >
          {groups.map(group => (
            <option key={group.group_id} value={group.group_id}>
              {group.group_name}
            </option>
          ))}
        </select>
      </div>

      {/* Success Message */}
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: message.includes('✓') ? '#d4edda' : '#f8d7da',
          color: message.includes('✓') ? '#155724' : '#721c24',
          borderRadius: '5px'
        }}>
          {message}
        </div>
      )}

      {/* Members to Evaluate */}
      {members.length === 0 ? (
        <p>No members to evaluate in this group.</p>
      ) : (
        members.map((member) => (
          <div key={member.user_id} className="card" style={{
            backgroundColor: member.already_evaluated ? '#f0f0f0' : 'white'
          }}>
            <h3>{member.name}</h3>
            <p>{member.email}</p>
            
            {member.already_evaluated ? (
              <p style={{ color: 'green' }}>✓ Already evaluated</p>
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label>Rating (1-5): </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={ratings[member.user_id] || 3}
                    onChange={(e) => setRatings({
                      ...ratings,
                      [member.user_id]: parseFloat(e.target.value)
                    })}
                    style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label>Feedback: </label>
                  <textarea
                    value={comments[member.user_id] || ""}
                    onChange={(e) => setComments({
                      ...comments,
                      [member.user_id]: e.target.value
                    })}
                    placeholder="Enter your feedback for this teammate..."
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      marginTop: '5px',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                    rows="3"
                  />
                </div>
                
                <button 
                  onClick={() => handleSubmit(member.user_id)}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#111827',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}