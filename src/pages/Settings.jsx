import "./Settings.css";

import {
  FaUser,
  FaBell,
  FaLock,
  FaPalette,
  FaCamera,
} from "react-icons/fa";

import { useState } from "react";

export default function Settings() {

  const [darkMode, setDarkMode] =
    useState(false);

  const [notifications, setNotifications] =
    useState(true);

  const [language, setLanguage] =
    useState("English");

  return (
    <div
      className={`settings-page ${
        darkMode ? "dark" : ""
      }`}
    >

      {/* HEADER */}

      <div className="settings-header">

        <div>
          <h1>Settings</h1>
          <p>
            Manage your account preferences
          </p>
        </div>

        <button className="save-btn">
          Save Changes
        </button>

      </div>

      {/* SETTINGS GRID */}

      <div className="settings-grid">

        {/* PROFILE */}

        <div className="settings-card">

          <div className="card-title">
            <FaUser />
            <h2>Profile</h2>
          </div>

          <div className="profile-upload">

            <img
              src="https://i.pravatar.cc/150?img=12"
              alt=""
            />

            <button className="upload-btn">
              <FaCamera />
              Change Photo
            </button>

          </div>

          <input
            type="text"
            placeholder="Full Name"
            defaultValue="John Doe"
          />

          <input
            type="email"
            placeholder="Email"
            defaultValue="john@gmail.com"
          />

        </div>

        {/* APPEARANCE */}

        <div className="settings-card">

          <div className="card-title">
            <FaPalette />
            <h2>Appearance</h2>
          </div>

          <div className="toggle-row">

            <div>
              <h4>Dark Mode</h4>
              <p>
                Toggle dashboard theme
              </p>
            </div>

            <label className="switch">

              <input
                type="checkbox"
                checked={darkMode}
                onChange={() =>
                  setDarkMode(!darkMode)
                }
              />

              <span className="slider"></span>

            </label>

          </div>

          <div className="language-box">

            <label>
              Language
            </label>

            <select
              value={language}
              onChange={(e) =>
                setLanguage(
                  e.target.value
                )
              }
            >
              <option>
                English
              </option>

              <option>
                Spanish
              </option>

              <option>
                French
              </option>

            </select>

          </div>

        </div>

        {/* NOTIFICATIONS */}

        <div className="settings-card">

          <div className="card-title">
            <FaBell />
            <h2>Notifications</h2>
          </div>

          <div className="toggle-row">

            <div>
              <h4>Email Notifications</h4>
              <p>
                Receive task reminders
              </p>
            </div>

            <label className="switch">

              <input
                type="checkbox"
                checked={notifications}
                onChange={() =>
                  setNotifications(
                    !notifications
                  )
                }
              />

              <span className="slider"></span>

            </label>

          </div>

          <div className="toggle-row">

            <div>
              <h4>Push Notifications</h4>
              <p>
                Receive browser alerts
              </p>
            </div>

            <label className="switch">

              <input type="checkbox" />

              <span className="slider"></span>

            </label>

          </div>

        </div>

        {/* SECURITY */}

        <div className="settings-card">

          <div className="card-title">
            <FaLock />
            <h2>Security</h2>
          </div>

          <input
            type="password"
            placeholder="Current Password"
          />

          <input
            type="password"
            placeholder="New Password"
          />

          <input
            type="password"
            placeholder="Confirm Password"
          />

          <button className="change-btn">
            Update Password
          </button>

        </div>

      </div>
    </div>
  );
}