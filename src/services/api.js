// src/services/api.js
const API_BASE = 'http://localhost:5000';

// Helper for API calls with credentials
const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

// Dashboard API
export const fetchDashboard = async () => {
  return apiRequest('/dashboard');
};

// Projects API
export const fetchProjects = async () => {
  return apiRequest('/projects');
};

// Tasks API for a specific group
export const fetchGroupTasks = async (groupId) => {
  return apiRequest(`/groups/${groupId}/tasks`);
};

// Group members API
export const fetchGroupMembers = async (groupId) => {
  return apiRequest(`/groups/${groupId}/members`);
};