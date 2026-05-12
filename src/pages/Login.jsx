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
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
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

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      
      const data = await response.json();

      console.log(data.user);
      console.log(data.user.role);
      
      if (response.ok) {
        // Save user data for dashboard
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role from backend (not from dropdown)
        const userRole = data.user.role;
        
        // Block admin login - if user is admin, redirect to login with error
        if (userRole === 'admin') {
          setErrors({ general: "Admin access has been disabled. Please contact system administrator." });
          setLoading(false);
          return;
        }
        
        if (userRole === 'student') {
          navigate('/student');
        } else if (userRole === 'lecturer') {
          navigate('/lecturer');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors({ general: data.error || "Login failed" });
      }
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({ general: "Cannot connect to server. Make sure backend is running on http://localhost:5000" });
    } finally {
      setLoading(false);
    }
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
          {/* Admin option removed */}
        </select>

        {errors.role && <p className="error">{errors.role}</p>}

        {errors.general && (
          <p className="error general">{errors.general}</p>
        )}

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="register">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}