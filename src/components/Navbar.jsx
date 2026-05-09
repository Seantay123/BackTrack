import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import Notifications from "./Notifications";
import { FaMoon, FaSun } from "react-icons/fa";

export default function Navbar({ user, role }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="navbar">
      <h3>
        Welcome {user} ({role})
      </h3>

      <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
        <Notifications />

        {theme === "dark" ? (
          <FaSun onClick={toggleTheme} />
        ) : (
          <FaMoon onClick={toggleTheme} />
        )}

        <button onClick={() => (window.location.href = "/")}>
          Logout
        </button>
      </div>
    </div>
  );
}