import { useState } from "react";
import { FaBell } from "react-icons/fa";

export default function Notifications() {
  const [open, setOpen] = useState(false);

  const data = [
    { msg: "New assignment posted", time: "2m" },
    { msg: "Peer review due soon", time: "1h" },
    { msg: "Grade updated", time: "Today" }
  ];

  return (
    <div className="notif">
      <FaBell onClick={() => setOpen(!open)} />

      {open && (
        <div className="notif-box">
          {data.map((n, i) => (
            <div key={i} className="notif-item">
              <p>{n.msg}</p>
              <small>{n.time}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}