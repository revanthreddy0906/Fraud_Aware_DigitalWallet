-- Money Square Digital Wallet - Sample Data (India)
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
('rahul_sharma', 'rahul@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+91-98765-43210', 8, 22, 500000.00, 5, 1250000.00, 
 DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Mumbai, Maharashtra', 'Chrome on MacOS'),

('priya_patel', 'priya@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+91-87654-32109', 6, 23, 1000000.00, 3, 2500000.00, 
 DATE_SUB(NOW(), INTERVAL 1 DAY), 'Delhi, NCR', 'Safari on iPhone'),

('amit_kumar', 'amit@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+91-76543-21098', 9, 18, 200000.00, 4, 850000.00, 
 DATE_SUB(NOW(), INTERVAL 5 HOUR), 'Bangalore, Karnataka', 'Firefox on Windows'),

('sneha_reddy', 'sneha@example.com', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+91-65432-10987', 7, 21, 800000.00, 6, 4200000.00, 
 DATE_SUB(NOW(), INTERVAL 12 HOUR), 'Hyderabad, Telangana', 'Chrome on Android'),

('demo_user', 'demo@moneysquare.in', '$2b$12$3Hi/rwOQbIxSRYy.4YCy5OpwPwfR5tgd4yl4l2hzrJwxedxpZwP.y', 
 '+91-99999-12345', 0, 23, 1500000.00, 10, 5000000.00, 
 DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'Chennai, Tamil Nadu', 'Chrome on MacOS');

-- Insert Known Devices
INSERT INTO known_devices (user_id, device_fingerprint, device_name, is_trusted) VALUES
(1, 'fp_chrome_mac_001', 'Rahul MacBook Pro', TRUE),
(1, 'fp_safari_iphone_001', 'Rahul iPhone', TRUE),
(2, 'fp_safari_iphone_002', 'Priya iPhone', TRUE),
(2, 'fp_chrome_mac_002', 'Priya iMac', TRUE),
(3, 'fp_firefox_win_001', 'Amit PC', TRUE),
(4, 'fp_chrome_android_001', 'Sneha Pixel', TRUE),
(5, 'fp_chrome_mac_demo', 'Demo MacBook', TRUE);

-- Insert Known Locations (Indian Cities)
INSERT INTO known_locations (user_id, location_name, latitude, longitude, is_trusted) VALUES
(1, 'Mumbai, Maharashtra', 19.0760, 72.8777, TRUE),
(1, 'Pune, Maharashtra', 18.5204, 73.8567, TRUE),
(2, 'Delhi, NCR', 28.6139, 77.2090, TRUE),
(2, 'Noida, Uttar Pradesh', 28.5355, 77.3910, TRUE),
(3, 'Bangalore, Karnataka', 12.9716, 77.5946, TRUE),
(4, 'Hyderabad, Telangana', 17.3850, 78.4867, TRUE),
(4, 'Vijayawada, Andhra Pradesh', 16.5062, 80.6480, TRUE),
(5, 'Chennai, Tamil Nadu', 13.0827, 80.2707, TRUE),
(5, 'Coimbatore, Tamil Nadu', 11.0168, 76.9558, TRUE);

-- Insert Historical Transactions for User 1 (rahul_sharma) - Normal Pattern
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
(1, 15000.00, 'debit', 'Amazon India', 'Online Shopping', DATE_SUB(NOW(), INTERVAL 30 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 5, 'low', '[]', 'completed'),
(1, 7500.00, 'debit', 'Netflix India', 'Annual Subscription', DATE_SUB(NOW(), INTERVAL 28 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 250000.00, 'credit', 'TCS', 'Monthly Salary', DATE_SUB(NOW(), INTERVAL 25 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 4500.00, 'debit', 'Uber India', 'Cab Rides', DATE_SUB(NOW(), INTERVAL 22 DAY), 'fp_safari_iphone_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 20000.00, 'debit', 'DMart', 'Groceries', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_safari_iphone_001', 'Mumbai, Maharashtra', 5, 'low', '[]', 'completed'),
(1, 8999.00, 'debit', 'Spotify', 'Annual Plan', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 35000.00, 'debit', 'BEST', 'Electricity Bill', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 10, 'low', '[]', 'completed'),
(1, 12500.00, 'debit', 'Taj Hotel', 'Dinner', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_safari_iphone_001', 'Pune, Maharashtra', 15, 'low', '["known_secondary_location"]', 'completed'),
(1, 50000.00, 'debit', 'IndiGo', 'Flight Tickets', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 20, 'low', '[]', 'completed'),
(1, 18000.00, 'debit', 'OYO Hotels', 'Accommodation', DATE_SUB(NOW(), INTERVAL 9 DAY), 'fp_safari_iphone_001', 'Pune, Maharashtra', 10, 'low', '[]', 'completed'),
(1, 6500.00, 'debit', 'Indian Oil', 'Petrol', DATE_SUB(NOW(), INTERVAL 7 DAY), 'fp_safari_iphone_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 120000.00, 'debit', 'Rent', 'Monthly Rent', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 15, 'low', '[]', 'completed'),
(1, 9500.00, 'debit', 'Apollo Pharmacy', 'Medicine', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_safari_iphone_001', 'Mumbai, Maharashtra', 0, 'low', '[]', 'completed'),
(1, 25000.00, 'debit', 'Croma', 'Headphones', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_001', 'Mumbai, Maharashtra', 10, 'low', '[]', 'completed');

-- Insert Historical Transactions for User 2 (priya_patel) - Higher spending pattern
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
(2, 350000.00, 'credit', 'Consulting', 'Client Payment', DATE_SUB(NOW(), INTERVAL 28 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 0, 'low', '[]', 'completed'),
(2, 89000.00, 'debit', 'Zara India', 'Clothing', DATE_SUB(NOW(), INTERVAL 25 DAY), 'fp_safari_iphone_002', 'Delhi, NCR', 15, 'low', '[]', 'completed'),
(2, 220000.00, 'debit', 'Rent', 'Monthly Rent', DATE_SUB(NOW(), INTERVAL 22 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 10, 'low', '[]', 'completed'),
(2, 45000.00, 'debit', 'O2 Spa', 'Wellness Day', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_safari_iphone_002', 'Noida, Uttar Pradesh', 20, 'low', '[]', 'completed'),
(2, 150000.00, 'debit', 'Zerodha', 'Stock Purchase', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 25, 'low', '[]', 'completed'),
(2, 32000.00, 'debit', 'ITC Maurya', 'Business Dinner', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_safari_iphone_002', 'Delhi, NCR', 10, 'low', '[]', 'completed'),
(2, 500000.00, 'credit', 'Performance Bonus', 'Quarter Bonus', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 0, 'low', '[]', 'completed'),
(2, 75000.00, 'debit', 'Apple Store', 'New iPad', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_safari_iphone_002', 'Delhi, NCR', 15, 'low', '[]', 'completed'),
(2, 18000.00, 'debit', 'Cult.fit', 'Annual Membership', DATE_SUB(NOW(), INTERVAL 8 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 5, 'low', '[]', 'completed'),
(2, 9500.00, 'debit', 'Prime Video', 'Subscriptions', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 0, 'low', '[]', 'completed'),
(2, 42000.00, 'debit', 'MakeMyTrip', 'Weekend Trip', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_safari_iphone_002', 'Noida, Uttar Pradesh', 15, 'low', '[]', 'completed'),
(2, 110000.00, 'debit', 'Urban Ladder', 'Furniture', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_002', 'Delhi, NCR', 20, 'low', '[]', 'completed');

-- Insert Transactions for Demo User with varying risk levels
INSERT INTO transactions (user_id, amount, transaction_type, recipient, description, timestamp, 
                         device_id, location, anomaly_score, risk_level, risk_factors, status) VALUES
-- Normal transactions
(5, 5000.00, 'debit', 'Starbucks', 'Morning Coffee', DATE_SUB(NOW(), INTERVAL 20 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 0, 'low', '[]', 'completed'),
(5, 150000.00, 'credit', 'NEFT Transfer', 'Incoming Transfer', DATE_SUB(NOW(), INTERVAL 18 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 0, 'low', '[]', 'completed'),
(5, 20000.00, 'debit', 'Saravana Bhavan', 'Dinner', DATE_SUB(NOW(), INTERVAL 15 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 5, 'low', '[]', 'completed'),
(5, 8900.00, 'debit', 'Airtel', 'Internet Bill', DATE_SUB(NOW(), INTERVAL 12 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 0, 'low', '[]', 'completed'),
(5, 35000.00, 'debit', 'Phoenix Mall', 'Clothing', DATE_SUB(NOW(), INTERVAL 10 DAY), 'fp_chrome_mac_demo', 'Coimbatore, Tamil Nadu', 10, 'low', '[]', 'completed'),
-- Medium risk transaction
(5, 850000.00, 'debit', 'Vijay Sales', 'New Laptop', DATE_SUB(NOW(), INTERVAL 7 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 45, 'medium', '["high_amount"]', 'completed'),
(5, 12000.00, 'debit', 'Medplus', 'Medicine', DATE_SUB(NOW(), INTERVAL 5 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 5, 'low', '[]', 'completed'),
-- Transaction outside normal hours (simulated)
(5, 50000.00, 'debit', 'Flipkart', 'Late Night Purchase', DATE_SUB(NOW(), INTERVAL 3 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 35, 'medium', '["unusual_hour"]', 'completed'),
(5, 7500.00, 'debit', 'Big Bazaar', 'Weekly Shopping', DATE_SUB(NOW(), INTERVAL 1 DAY), 'fp_chrome_mac_demo', 'Chennai, Tamil Nadu', 0, 'low', '[]', 'completed'),
-- High risk transaction (new location)
(5, 200000.00, 'debit', 'ATM Withdrawal', 'Cash Withdrawal', DATE_SUB(NOW(), INTERVAL 6 HOUR), 'fp_unknown_device', 'Kolkata, West Bengal', 72, 'high', '["new_device", "new_location", "high_amount"]', 'completed');

-- Insert diverse alerts for demo user (multiple types and severities)
INSERT INTO alerts (user_id, txn_id, alert_type, severity, message, resolved, created_at) VALUES
-- High amount alerts (5 total - varied resolution status)
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 45 LIMIT 1), 
 'high_amount', 'medium', 'Transaction amount ₹8,50,000 exceeds your typical spending pattern', TRUE, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 1), 
 'high_amount', 'high', 'Large transaction of ₹3,25,000 detected', TRUE, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 2), 
 'high_amount', 'medium', 'Transaction amount ₹1,80,000 is above average', FALSE, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 3), 
 'high_amount', 'low', 'Slightly elevated transaction of ₹95,000', TRUE, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 4), 
 'high_amount', 'critical', 'Suspicious large transfer of ₹12,50,000 flagged', FALSE, DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- New location alerts (4 total)
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 72 LIMIT 1), 
 'new_location', 'high', 'Transaction detected from new location: Kolkata, West Bengal', FALSE, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 5), 
 'new_location', 'medium', 'First transaction from Jaipur, Rajasthan', TRUE, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 6), 
 'new_location', 'high', 'Transaction from international location: Dubai, UAE', TRUE, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 7), 
 'new_location', 'low', 'New city detected: Pune, Maharashtra', TRUE, DATE_SUB(NOW(), INTERVAL 18 DAY)),

-- New device alerts (3 total)
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 AND anomaly_score = 72 LIMIT 1), 
 'new_device', 'high', 'Transaction initiated from unrecognized device', FALSE, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 8), 
 'new_device', 'medium', 'Login from new Android device detected', TRUE, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 9), 
 'new_device', 'low', 'New browser fingerprint on existing device', TRUE, DATE_SUB(NOW(), INTERVAL 22 DAY)),

-- Unusual time alerts (2 total)
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1), 
 'unusual_time', 'medium', 'Transaction at 3:45 AM outside your typical hours', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 1), 
 'unusual_time', 'low', 'Late night transaction at 11:30 PM', TRUE, DATE_SUB(NOW(), INTERVAL 14 DAY)),

-- Velocity alerts (2 total)
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 2), 
 'high_velocity', 'high', 'Multiple rapid transactions detected (5 in 10 minutes)', FALSE, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, (SELECT txn_id FROM transactions WHERE user_id = 5 LIMIT 1 OFFSET 3), 
 'high_velocity', 'critical', 'Unusual burst of 8 transactions within 5 minutes', FALSE, DATE_SUB(NOW(), INTERVAL 12 HOUR));

-- Insert Behavior Baselines
INSERT INTO behavior_baselines (user_id, avg_transaction_amount, max_historical_amount, typical_txn_count_daily, 
                                most_active_hour_start, most_active_hour_end, avg_txns_per_10min, transaction_count) VALUES
(1, 35000.00, 250000.00, 3, 9, 21, 0.5, 14),
(2, 95000.00, 500000.00, 2, 10, 22, 0.3, 12),
(3, 18000.00, 80000.00, 2, 9, 18, 0.4, 8),
(4, 45000.00, 200000.00, 3, 8, 20, 0.6, 15),
(5, 65000.00, 850000.00, 2, 8, 23, 0.4, 10);
