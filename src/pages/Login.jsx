import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = () => {
    let err = {};

    if (!form.email) err.email = "Information is required";
    if (!form.password) err.password = "Information is required";
    if (!role) err.role = "Information is required";

    if (form.email && !form.email.includes("@")) {
      err.email = "Email must contain @";
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
      (u) => u.email === form.email && u.password === form.password
    );

    if (!user) {
      setErrors({
        general: "User not registered. Please register first."
      });
      return;
    }

    navigate(`/${role}`);
  };

  return (
    <div className="login-container bg-image">
      <div className="login-card">

        <h1>BACKTRACK</h1>

        <label>Email *</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
        />
        {errors.email && <p className="error">{errors.email}</p>}

        <label>Password *</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
        />
        {errors.password && <p className="error">{errors.password}</p>}

        <label>Role *</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
        </select>

        {errors.role && <p className="error">{errors.role}</p>}

        {errors.general && (
          <p className="error general">{errors.general}</p>
        )}

        <button onClick={handleLogin}>Login</button>

        <p className="register">
          Don’t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}