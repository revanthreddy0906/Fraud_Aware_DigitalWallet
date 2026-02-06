-- Fraud-Aware Digital Wallet Database Schema
-- MySQL Database

CREATE DATABASE IF NOT EXISTS fraud_aware_wallet;
USE fraud_aware_wallet;

-- Users Table
-- Stores user profile, security preferences, wallet status, and login metadata
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Security Preferences
    allowed_start_hour INT DEFAULT 6,          -- Start of allowed transaction hours (0-23)
    allowed_end_hour INT DEFAULT 23,           -- End of allowed transaction hours (0-23)
    max_txn_amount DECIMAL(15, 2) DEFAULT 10000.00,  -- Maximum single transaction amount
    max_txns_10min INT DEFAULT 5,              -- Maximum transactions in 10 minutes
    
    -- Wallet Status
    wallet_status ENUM('active', 'frozen') DEFAULT 'active',
    balance DECIMAL(15, 2) DEFAULT 10000.00,
    freeze_until DATETIME NULL,
    freeze_duration_minutes INT DEFAULT 30,    -- Default freeze duration
    
    -- Alert Preferences
    alert_sms BOOLEAN DEFAULT TRUE,
    alert_email BOOLEAN DEFAULT TRUE,
    
    -- Login Metadata
    last_login_time DATETIME,
    last_login_location VARCHAR(100),
    last_login_device VARCHAR(255),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transactions Table
-- Complete audit trail of wallet transactions with fraud analysis results
CREATE TABLE IF NOT EXISTS transactions (
    txn_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Transaction Details
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type ENUM('credit', 'debit') NOT NULL,
    recipient VARCHAR(100),
    description VARCHAR(255),
    
    -- Context Information
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_id VARCHAR(255),
    location VARCHAR(100),
    ip_address VARCHAR(45),
    
    -- Fraud Analysis Results
    anomaly_score INT DEFAULT 0,               -- 0-100 risk score
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
    risk_factors JSON,                         -- Array of triggered rules
    
    -- Status
    status ENUM('pending', 'completed', 'blocked', 'cancelled') DEFAULT 'completed',
    requires_confirmation BOOLEAN DEFAULT FALSE,
    confirmed_at DATETIME NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_anomaly_score (anomaly_score)
);

-- Alerts Table
-- Security alerts generated during suspicious activities
CREATE TABLE IF NOT EXISTS alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    txn_id INT,
    
    -- Alert Details
    alert_type ENUM('high_amount', 'unusual_time', 'new_device', 'new_location', 
                    'high_velocity', 'impossible_travel', 'auto_freeze', 'manual_freeze') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    message TEXT,
    
    -- Status
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME NULL,
    resolution_note VARCHAR(255),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (txn_id) REFERENCES transactions(txn_id) ON DELETE SET NULL,
    INDEX idx_user_resolved (user_id, resolved)
);

-- Known Devices Table
-- Track recognized devices for each user
CREATE TABLE IF NOT EXISTS known_devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_device (user_id, device_fingerprint)
);

-- Known Locations Table
-- Track recognized locations for each user
CREATE TABLE IF NOT EXISTS known_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    location_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Behavior Baselines Table
-- Computed behavioral features for fraud detection
CREATE TABLE IF NOT EXISTS behavior_baselines (
    baseline_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    
    -- Transaction Patterns
    avg_transaction_amount DECIMAL(15, 2) DEFAULT 0,
    max_historical_amount DECIMAL(15, 2) DEFAULT 0,
    typical_txn_count_daily INT DEFAULT 0,
    
    -- Time Patterns
    most_active_hour_start INT DEFAULT 9,
    most_active_hour_end INT DEFAULT 21,
    
    -- Velocity Patterns
    avg_txns_per_10min DECIMAL(5, 2) DEFAULT 1.0,
    
    -- Last Updated
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    transaction_count INT DEFAULT 0,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
