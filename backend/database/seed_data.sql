-- Fraud-Aware Digital Wallet - Sample Data
-- This script populates the database with test users and transactions

USE fraud_aware_wallet;

-- Clear existing data (for re-seeding)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE alerts;
TRUNCATE TABLE transactions;
TRUNCATE TABLE known_devices;
TRUNCATE TABLE known_locations;
TRUNCATE TABLE behavior_baselines;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Test Users
-- Password for all users: "password123" (bcrypt hashed)
-- Hash: $2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y

INSERT INTO users (username, email, password_hash, phone, allowed_start_hour, allowed_end_hour, 
                   max_txn_amount, max_txns_10min, balance, last_login_time, last_login_location, last_login_device) VALUES
('john_doe', 'john@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+1-555-0101', 8, 22, 5000.00, 5, 15000.00, 
 DATE_SUB(NOW(), INTERVAL 2 HOUR), 'New York, USA', 'Chrome on MacOS'),

('jane_smith', 'jane@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+1-555-0102', 6, 23, 10000.00, 3, 25000.00, 
 DATE_SUB(NOW(), INTERVAL 1 DAY), 'Los Angeles, USA', 'Safari on iPhone'),

('mike_wilson', 'mike@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+1-555-0103', 9, 18, 2000.00, 4, 8500.00, 
 DATE_SUB(NOW(), INTERVAL 5 HOUR), 'Chicago, USA', 'Firefox on Windows'),

('sarah_jones', 'sarah@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+1-555-0104', 7, 21, 8000.00, 6, 42000.00, 
 DATE_SUB(NOW(), INTERVAL 12 HOUR), 'Seattle, USA', 'Chrome on Android'),

('demo_user', 'demo@fraudwallet.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+1-555-0100', 0, 23, 15000.00, 10, 50000.00, 
 DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'San Francisco, USA', 'Chrome on MacOS');

-- Insert Known Devices
INSERT INTO known_devices (user_id, device_fingerprint, device_name, is_trusted) VALUES
(1, 'fp_chrome_mac_001', 'Johns MacBook Pro', TRUE),
(1, 'fp_safari_iphone_001', 'Johns iPhone', TRUE),
(2, 'fp_safari_iphone_002', 'Janes iPhone', TRUE),
(2, 'fp_chrome_mac_002', 'Janes iMac', TRUE),
(3, 'fp_firefox_win_001', 'Mikes PC', TRUE),
(4, 'fp_chrome_android_001', 'Sarahs Pixel', TRUE),
(5, 'fp_chrome_mac_demo', 'Demo MacBook', TRUE);

-- Insert Known Locations
INSERT INTO known_locations (user_id, location_name, latitude, longitude, is_trusted) VALUES
(1, 'New York, USA', 40.7128, -74.0060, TRUE),
(1, 'Boston, USA', 42.3601, -71.0589, TRUE),
(2, 'Los Angeles, USA', 34.0522, -118.2437, TRUE),
(2, 'San Diego, USA', 32.7157, -117.1611, TRUE),
(3, 'Chicago, USA', 41.8781, -87.6298, TRUE),
(4, 'Seattle, USA', 47.6062, -122.3321, TRUE),
(4, 'Portland, USA', 45.5152, -122.6784, TRUE),
(5, 'San Francisco, USA', 37.7749, -122.4194, TRUE),
(5, 'Oakland, USA', 37.8044, -122.2712, TRUE);

-- Insert Historical Transactions for User 1 (john_doe) - Normal Pattern
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
(1, 150.00, 'debit', 'Amazon', 'Online Shopping', DATE_SUB(NOW(), INTERVAL 30 DAY), 'fp_chrome_mac_001', 'New York, USA', 5, 'low', '[]', 'completed'),
(1, 75.50, 'debit', 'Netflix', 'Subscription', DATE_SUB(NOW(), INTERVAL 28 DAY), 'fp_chrome_mac_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 2500.00, 'credit', 'Salary', 'Monthly Salary', DATE_SUB(NOW(), INTERVAL 25 DAY), 'fp_chrome_mac_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 45.00, 'debit', 'Uber', 'Ride', DATE_SUB(NOW(), INTERVAL 22 DAY), 'fp_safari_iphone_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 200.00, 'debit', 'Whole Foods', 'Groceries', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_safari_iphone_001', 'New York, USA', 5, 'low', '[]', 'completed'),
(1, 89.99, 'debit', 'Spotify', 'Annual Plan', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 350.00, 'debit', 'Electric Co', 'Utility Bill', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_chrome_mac_001', 'New York, USA', 10, 'low', '[]', 'completed'),
(1, 125.00, 'debit', 'Restaurant', 'Dinner', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_safari_iphone_001', 'Boston, USA', 15, 'low', '["known_secondary_location"]', 'completed'),
(1, 500.00, 'debit', 'Flight', 'Boston Trip', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_chrome_mac_001', 'New York, USA', 20, 'low', '[]', 'completed'),
(1, 180.00, 'debit', 'Hotel', 'Accommodation', DATE_SUB(NOW(), INTERVAL 9 DAY), 'fp_safari_iphone_001', 'Boston, USA', 10, 'low', '[]', 'completed'),
(1, 65.00, 'debit', 'Gas Station', 'Fuel', DATE_SUB(NOW(), INTERVAL 7 DAY), 'fp_safari_iphone_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 1200.00, 'debit', 'Rent', 'Monthly Rent', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_001', 'New York, USA', 15, 'low', '[]', 'completed'),
(1, 95.00, 'debit', 'Pharmacy', 'Medicine', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_safari_iphone_001', 'New York, USA', 0, 'low', '[]', 'completed'),
(1, 250.00, 'debit', 'Electronics', 'Headphones', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_001', 'New York, USA', 10, 'low', '[]', 'completed');

-- Insert Historical Transactions for User 2 (jane_smith) - Higher spending pattern
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
(2, 3500.00, 'credit', 'Consulting', 'Client Payment', DATE_SUB(NOW(), INTERVAL 28 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 0, 'low', '[]', 'completed'),
(2, 890.00, 'debit', 'Designer Store', 'Clothing', DATE_SUB(NOW(), INTERVAL 25 DAY), 'fp_safari_iphone_002', 'Los Angeles, USA', 15, 'low', '[]', 'completed'),
(2, 2200.00, 'debit', 'Rent', 'Monthly Rent', DATE_SUB(NOW(), INTERVAL 22 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 10, 'low', '[]', 'completed'),
(2, 450.00, 'debit', 'Spa', 'Wellness Day', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_safari_iphone_002', 'San Diego, USA', 20, 'low', '[]', 'completed'),
(2, 1500.00, 'debit', 'Investment', 'Stock Purchase', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 25, 'low', '[]', 'completed'),
(2, 320.00, 'debit', 'Restaurant', 'Business Dinner', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_safari_iphone_002', 'Los Angeles, USA', 10, 'low', '[]', 'completed'),
(2, 5000.00, 'credit', 'Bonus', 'Performance Bonus', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 0, 'low', '[]', 'completed'),
(2, 750.00, 'debit', 'Electronics', 'New iPad', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_safari_iphone_002', 'Los Angeles, USA', 15, 'low', '[]', 'completed'),
(2, 180.00, 'debit', 'Gym', 'Annual Membership', DATE_SUB(NOW(), INTERVAL 8 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 5, 'low', '[]', 'completed'),
(2, 95.00, 'debit', 'Streaming', 'Subscriptions', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 0, 'low', '[]', 'completed'),
(2, 420.00, 'debit', 'Travel', 'Weekend Trip', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_safari_iphone_002', 'San Diego, USA', 15, 'low', '[]', 'completed'),
(2, 1100.00, 'debit', 'Furniture', 'Home Decor', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_002', 'Los Angeles, USA', 20, 'low', '[]', 'completed');

-- Insert Transactions for Demo User with varying risk levels
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
-- Normal transactions
(5, 50.00, 'debit', 'Coffee Shop', 'Morning Coffee', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 0, 'low', '[]', 'completed'),
(5, 1500.00, 'credit', 'Transfer', 'Incoming Transfer', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 0, 'low', '[]', 'completed'),
(5, 200.00, 'debit', 'Restaurant', 'Dinner', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 5, 'low', '[]', 'completed'),
(5, 89.00, 'debit', 'Utilities', 'Internet Bill', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 0, 'low', '[]', 'completed'),
(5, 350.00, 'debit', 'Shopping', 'Clothing', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_chrome_mac_demo', 'Oakland, USA', 10, 'low', '[]', 'completed'),
-- Medium risk transaction
(5, 8500.00, 'debit', 'Electronics', 'New Laptop', DATE_SUB(NOW(), INTERVAL 7 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 45, 'medium', '["high_amount"]', 'completed'),
(5, 120.00, 'debit', 'Pharmacy', 'Medicine', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 5, 'low', '[]', 'completed'),
-- Transaction outside normal hours (simulated)
(5, 500.00, 'debit', 'Online Store', 'Late Night Purchase', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 35, 'medium', '["unusual_hour"]', 'completed'),
(5, 75.00, 'debit', 'Groceries', 'Weekly Shopping', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_demo', 'San Francisco, USA', 0, 'low', '[]', 'completed'),
-- High risk transaction (new location)
(5, 2000.00, 'debit', 'ATM Withdrawal', 'Cash Withdrawal', DATE_SUB(NOW(), INTERVAL 6 HOUR), 'fp_unknown_device', 'Miami, USA', 72, 'high', '["new_device", "new_location", "high_amount"]', 'completed');

-- Insert some alerts for demo user
INSERT INTO alerts (user_id, txn_id, alert_type, severity, message, resolved, created_at) VALUES
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 45 LIMIT 1), 
 'high_amount', 'medium', 'Transaction amount $8,500 exceeds your typical spending pattern', TRUE, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 72 LIMIT 1), 
 'new_location', 'high', 'Transaction detected from new location: Miami, USA', FALSE, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 72 LIMIT 1), 
 'new_device', 'high', 'Transaction initiated from unrecognized device', FALSE, DATE_SUB(NOW(), INTERVAL 6 HOUR));

-- Insert Behavior Baselines
INSERT INTO behavior_baselines (user_id, avg_transaction_amount, max_historical_amount, typical_txn_count_daily, 
                                most_active_hour_start, most_active_hour_end, avg_txns_per_10min, transaction_count) VALUES
(1, 350.00, 2500.00, 3, 9, 21, 0.5, 14),
(2, 950.00, 5000.00, 2, 10, 22, 0.3, 12),
(3, 180.00, 800.00, 2, 9, 18, 0.4, 8),
(4, 450.00, 2000.00, 3, 8, 20, 0.6, 15),
(5, 650.00, 8500.00, 2, 8, 23, 0.4, 10);
