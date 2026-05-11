import React, { useState, useEffect } from "react";

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("My Tasks");
  const [myTasks, setMyTasks] = useState([]);
  const [groupTasks, setGroupTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [fileLink, setFileLink] = useState("");
  const [user, setUser] = useState(null);

  const tabs = ["My Tasks", "Group Tasks", "Submit Assignment", "Peer Review", "View Scores"];

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch projects and groups
      const projectsRes = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsRes.json();
      
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
        await fetchTasks(allGroups[0].group_id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const fetchTasks = async (groupId) => {
    try {
      const response = await fetch(`http://localhost:5000/groups/${groupId}/tasks`, {
        credentials: 'include'
      });
      const tasks = await response.json();
      
      // Separate tasks: assigned to me vs group tasks
      const myAssigned = tasks.filter(t => t.assigned_to === user?.user_id);
      setMyTasks(myAssigned);
      setGroupTasks(tasks);
      
      // Fetch submissions for completed tasks
      const submissionsData = tasks
        .filter(t => t.status === 'submitted' || t.status === 'completed')
        .map(t => ({
          task_id: t.task_id,
          title: t.title,
          status: t.status,
          deadline: t.deadline
        }));
      setSubmissions(submissionsData);
      
      // Fetch scores for this group
      const scoresRes = await fetch(`http://localhost:5000/groups/${groupId}/scores/me`, {
        credentials: 'include'
      });
      const myScores = await scoresRes.json();
      setScores(myScores);
      
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleSubmitTask = async (taskId) => {
    if (!fileLink) {
      alert('Please provide a file link');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5000/tasks/${taskId}/submit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ file_link: fileLink })
      });
      
      if (response.ok) {
        alert('Task submitted successfully!');
        setSelectedTask(null);
        setFileLink("");
        fetchTasks(selectedGroup); // Refresh tasks
      } else {
        const error = await response.json();
        alert(error.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMyTasks = () => (
    <section>
      <h2>Your Assigned Tasks</h2>
      {myTasks.length === 0 ? (
        <p>No tasks assigned to you yet.</p>
      ) : (
        myTasks.map((task) => (
          <div className="card" key={task.task_id}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p><strong>Status:</strong> {task.status}</p>
            <p><strong>Deadline:</strong> {task.deadline || 'No deadline'}</p>
            {task.status === 'pending' && (
              <button onClick={() => {
                setSelectedTask(task);
                setActiveTab("Submit Assignment");
              }}>
                Submit
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );

  const renderGroupTasks = () => (
    <section>
      <h2>Group Tasks</h2>
      <div className="group-selector">
        <label>Select Group: </label>
        <select 
          value={selectedGroup} 
          onChange={(e) => {
            setSelectedGroup(parseInt(e.target.value));
            fetchTasks(parseInt(e.target.value));
          }}
        >
          {groups.map(group => (
            <option key={group.group_id} value={group.group_id}>
              {group.group_name}
            </option>
          ))}
        </select>
      </div>
      
      {groupTasks.length === 0 ? (
        <p>No tasks in this group.</p>
      ) : (
        groupTasks.map((task) => (
          <div className="card" key={task.task_id}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p><strong>Assigned to:</strong> {task.assignee_name}</p>
            <p><strong>Status:</strong> {task.status}</p>
            <p><strong>Deadline:</strong> {task.deadline || 'No deadline'}</p>
          </div>
        ))
      )}
    </section>
  );

  const renderSubmitAssignment = () => (
    <section>
      <h2>Submit Assignment</h2>
      {selectedTask ? (
        <div className="card">
          <h3>Submitting: {selectedTask.title}</h3>
          <p>{selectedTask.description}</p>
          <div>
            <label>File Link (Google Drive, GitHub, etc.):</label>
            <input 
              type="text" 
              value={fileLink}
              onChange={(e) => setFileLink(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', padding: '8px', margin: '10px 0' }}
            />
          </div>
          <button onClick={() => handleSubmitTask(selectedTask.task_id)} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm Submission'}
          </button>
          <button onClick={() => setSelectedTask(null)} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="instruction-box">
            Select a task from "My Tasks" tab and click the Submit button to upload your assignment.
          </div>
          
          <h3>Submitted Assignments</h3>
          {submissions.length === 0 ? (
            <p>No assignments submitted yet.</p>
          ) : (
            submissions.map((sub, idx) => (
              <div className="card" key={idx}>
                <div className="card-header">
                  <h4>{sub.title}</h4>
                </div>
                <p><strong>Status:</strong> {sub.status}</p>
                <p><strong>Submitted:</strong> {sub.deadline || 'Pending review'}</p>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );

  const renderPeerReview = () => (
    <section>
      <h2>Peer Evaluation</h2>
      <p>Coming soon - Evaluate your group members' performance.</p>
    </section>
  );

  const renderViewScores = () => (
    <section>
      <h2>Your Contribution Score</h2>
      {scores ? (
        <div className="card">
          <h3>Final Score: {scores.final_score}%</h3>
          <p><strong>Task Score (40%):</strong> {scores.task_score}%</p>
          <p><strong>Activity Score (30%):</strong> {scores.activity_score}%</p>
          <p><strong>Peer Score (30%):</strong> {scores.peer_score}%</p>
          <p><em>Formula: {scores.formula}</em></p>
        </div>
      ) : (
        <p>No scores available yet.</p>
      )}
    </section>
  );

  if (loading) return <div className="container"><p>Loading tasks...</p></div>;

  return (
    <div className="container">
      <nav className="tab-header">
        {tabs.map((tab) => (
          <button 
            key={tab} 
            className={activeTab === tab ? "active" : ""} 
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="content-area">
        {activeTab === "My Tasks" && renderMyTasks()}
        {activeTab === "Group Tasks" && renderGroupTasks()}
        {activeTab === "Submit Assignment" && renderSubmitAssignment()}
        {activeTab === "Peer Review" && renderPeerReview()}
        {activeTab === "View Scores" && renderViewScores()}
      </div>
    </div>
  );
}