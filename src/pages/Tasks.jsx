import React, { useState } from "react";
import { tasks } from "../services/mockData";

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("My Tasks");

  const tabs = ["My Tasks", "Group Tasks", "Submit Assignment", "Peer Review", "View Scores"];

  return (
    <div className="container">
      {/* Navigation Tabs */}
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
        {activeTab === "Submit Assignment" && renderSubmitAssignment()}
      </div>
    </div>
  );

  // View for the "My Tasks" tab
  function renderMyTasks() {
    return (
      <section>
        <h2>Your Assigned Tasks</h2>
        {tasks.map((task) => (
          <div className="card" key={task.id}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <p><strong>Status:</strong> {task.status}</p>
            <button onClick={() => setActiveTab("Submit Assignment")}>
              Submit
            </button>
          </div>
        ))}
      </section>
    );
  }

  // View for the "Submit Assignment" tab (Matching the Image)
  function renderSubmitAssignment() {
    return (
      <section>
        <h2>Submit Assignment</h2>
        <div className="instruction-box">
          Select a task from "My Tasks" tab and click the Submit button to upload your assignment.
        </div>
        
        <h3>Submitted Assignments</h3>
        {/* You would map over a 'submissions' array here */}
        <div className="card">
          <div className="card-header">
            <h4>Frontend Implementation</h4>
            <span>{'>'}</span>
          </div>
          <p>File: assignment.pdf</p>
          <p>Submitted: 05/06/2026</p>
          <p><strong>Grade: 95/100</strong></p>
        </div>
      </section>
    );
  }
}