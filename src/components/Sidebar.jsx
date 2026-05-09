import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const links = [
    { name: "Student Dashboard", path: "/student" },
    { name: "Lecturer Dashboard", path: "/lecturer" },
    { name: "Tasks", path: "/tasks" },
    { name: "Peer Evaluation", path: "/peer" },
    { name: "Analytics", path: "/analytics" }
  ];

  return (
    <div className="sidebar">
      <h2>BackTrack</h2>

      {links.map((l) => (
        <NavLink
          key={l.name}
          to={l.path}
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          {l.name}
        </NavLink>
      ))}
    </div>
  );
}