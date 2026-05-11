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
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
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

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: role === "lecturer" ? "instructor" : role  // Map 'lecturer' to 'instructor'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Registration successful! Please login.");
        navigate("/");
      } else {
        setErrors({ general: data.error || "Registration failed" });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({ general: "Cannot connect to server. Make sure backend is running on http://localhost:5000" });
    } finally {
      setLoading(false);
    }
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
          <option value="lecturer">Instructor</option>
          <option value="admin">Admin</option>
        </select>

        {errors.role && <p className="error">{errors.role}</p>}
        
        {errors.general && <p className="error general">{errors.general}</p>}

        <button onClick={handleRegister} disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="register">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}