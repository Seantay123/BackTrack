import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Login.css";

export default function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = () => {
    let err = {};

    if (!form.name) err.name = "Information is required";
    if (!form.email) err.email = "Information is required";
    if (!form.password) err.password = "Information is required";

    if (form.email && !form.email.includes("@")) {
      err.email = "Email must contain @";
    }

    if (!role) err.role = "Information is required";

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const exists = users.find((u) => u.email === form.email);

    if (exists) {
      setErrors({ email: "User already exists. Please login." });
      return;
    }

    users.push({ ...form, role });
    localStorage.setItem("users", JSON.stringify(users));

    navigate("/");
  };

  return (
    <div className="login-container bg-image">
      <div className="login-card">

        <h1>BACKTRACK</h1>

        <label>Name *</label>
        <input name="name" onChange={handleChange} />
        {errors.name && <p className="error">{errors.name}</p>}

        <label>Email *</label>
        <input name="email" onChange={handleChange} />
        {errors.email && <p className="error">{errors.email}</p>}

        <label>Password *</label>
        <input
          name="password"
          type="password"
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

        <button onClick={handleRegister}>Register</button>

        <p className="register">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}