import { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // First, get user's groups
      const projectsRes = await fetch('http://localhost:5000/projects', {
        credentials: 'include'
      });
      const projects = await projectsRes.json();
      
      let allActivities = [];
      
      // Fetch activity for each project's groups
      for (const project of projects) {
        const groupsRes = await fetch(`http://localhost:5000/projects/${project.project_id}/groups`, {
          credentials: 'include'
        });
        const groups = await groupsRes.json();
        
        for (const group of groups) {
          const activityRes = await fetch(`http://localhost:5000/groups/${group.group_id}/activity`, {
            credentials: 'include'
          });
          const activities = await activityRes.json();
          allActivities = [...allActivities, ...activities];
        }
      }
      
      // Sort by timestamp and get latest 5
      const sortedActivities = allActivities.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      ).slice(0, 5);
      
      const notifs = sortedActivities.map(activity => ({
        msg: activity.action,
        time: timeAgo(activity.timestamp),
        name: activity.name
      }));
      
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const markAsRead = () => {
    setUnreadCount(0);
    setOpen(false);
  };

  return (
    <div className="notif" style={{ position: 'relative' }}>
      <div style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <FaBell />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '12px',
            minWidth: '18px',
            textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </div>

      {open && (
        <div className="notif-box" style={{
          position: 'absolute',
          top: '35px',
          right: '0',
          width: '320px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            Notifications
          </div>
          
          {notifications.length === 0 ? (
            <div style={{ 
              padding: '30px 20px', 
              textAlign: 'center', 
              color: '#9ca3af' 
            }}>
              No new notifications
            </div>
          ) : (
            notifications.map((n, i) => (
              <div 
                key={i} 
                className="notif-item" 
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={markAsRead}
              >
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#374151' }}>
                  {n.msg}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <small style={{ color: '#9ca3af' }}>{n.time}</small>
                  {n.name && <small style={{ color: '#6b7280' }}>by {n.name}</small>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}