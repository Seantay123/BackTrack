-- Create Database
DROP DATABASE IF EXISTS backtrack_db;
CREATE DATABASE backtrack_db;
USE backtrack_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','instructor','admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE project_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE group_members (
    group_id INT,
    user_id INT,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES project_groups(group_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    assigned_to INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    deadline DATE,
    status ENUM('pending','submitted','completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES project_groups(group_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    file_link VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE peer_evaluations (
    evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id INT NOT NULL,
    evaluatee_id INT NOT NULL,
    group_id INT NOT NULL,
    rating DECIMAL(3,2) NOT NULL,
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluator_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (evaluatee_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (group_id) REFERENCES project_groups(group_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE document_versions (
    version_id INT AUTO_INCREMENT PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    task_id INT,
    user_id INT NOT NULL,
    version_number INT NOT NULL,
    file_link VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_user_id ON activity_logs(user_id);
CREATE INDEX idx_task_id ON submissions(task_id);
CREATE INDEX idx_group_id ON tasks(group_id);
CREATE INDEX idx_peer_eval ON peer_evaluations(evaluatee_id);

CREATE VIEW contribution_scores AS
SELECT 
    u.user_id,
    u.name,

    -- Task Completion Score (%)
    COALESCE(
        (COUNT(CASE WHEN t.status = 'completed' THEN 1 END) / 
         NULLIF(COUNT(t.task_id), 0)) * 100, 0
    ) AS task_score,

    -- Activity Score (raw count)
    COUNT(DISTINCT al.log_id) AS activity_score,

    -- Peer Evaluation Score (/100)
    COALESCE(AVG(pe.rating) * 20, 0) AS peer_score

FROM users u
LEFT JOIN tasks t ON u.user_id = t.assigned_to
LEFT JOIN activity_logs al ON u.user_id = al.user_id
LEFT JOIN peer_evaluations pe ON u.user_id = pe.evaluatee_id
GROUP BY u.user_id;