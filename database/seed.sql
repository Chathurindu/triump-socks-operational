-- ============================================================
--  Triumph Socks – Seed / Demo Data
-- ============================================================

-- ROLES
INSERT INTO roles (name, permissions) VALUES
  ('admin',      '{"all": true}'),
  ('manager',    '{"dashboard":true,"inventory":true,"production":true,"hr":true,"finance":true,"analytics":true}'),
  ('hr',         '{"hr":true,"dashboard":true}'),
  ('finance',    '{"finance":true,"dashboard":true,"analytics":true}'),
  ('production', '{"production":true,"inventory":true,"dashboard":true}'),
  ('viewer',     '{"dashboard":true,"analytics":true}')
ON CONFLICT (name) DO NOTHING;

-- USERS  (passwords are bcrypt hashed "password123")
INSERT INTO users (id, email, password_hash, full_name, role_id) VALUES
  ('00000000-0000-0000-0000-000000000001','admin@triumphsocks.com',    '$2b$10$rQZ9uAVMHbBuGxLq6kLXq.YkZdMVzNs9WL8jqE5UH3tqEsXomLfMm','Admin User', 1),
  ('00000000-0000-0000-0000-000000000002','manager@triumphsocks.com',  '$2b$10$rQZ9uAVMHbBuGxLq6kLXq.YkZdMVzNs9WL8jqE5UH3tqEsXomLfMm','Rahman Hossain',2),
  ('00000000-0000-0000-0000-000000000003','hr@triumphsocks.com',       '$2b$10$rQZ9uAVMHbBuGxLq6kLXq.YkZdMVzNs9WL8jqE5UH3tqEsXomLfMm','Nasrin Akter',  3),
  ('00000000-0000-0000-0000-000000000004','finance@triumphsocks.com',  '$2b$10$rQZ9uAVMHbBuGxLq6kLXq.YkZdMVzNs9WL8jqE5UH3tqEsXomLfMm','Kamal Uddin',   4),
  ('00000000-0000-0000-0000-000000000005','prod@triumphsocks.com',     '$2b$10$rQZ9uAVMHbBuGxLq6kLXq.YkZdMVzNs9WL8jqE5UH3tqEsXomLfMm','Jamal Islam',   5)
ON CONFLICT (email) DO NOTHING;

-- DEPARTMENTS
INSERT INTO departments (name, head_user_id, description) VALUES
  ('Management',      '00000000-0000-0000-0000-000000000002', 'Top-level management'),
  ('Production',      '00000000-0000-0000-0000-000000000005', 'Socks manufacturing'),
  ('Human Resources', '00000000-0000-0000-0000-000000000003', 'HR & Admin'),
  ('Finance',         '00000000-0000-0000-0000-000000000004', 'Accounts & Finance'),
  ('Inventory',       '00000000-0000-0000-0000-000000000002', 'Warehouse & Stock'),
  ('Dispatch',        '00000000-0000-0000-0000-000000000002', 'Shipping & Distribution'),
  ('Quality Control', '00000000-0000-0000-0000-000000000005', 'QA & testing')
ON CONFLICT DO NOTHING;

-- EMPLOYEES
INSERT INTO employees (id, emp_code, full_name, email, phone, position, department_id, employment_type, join_date, status, salary, address) VALUES
  ('10000000-0000-0000-0000-000000000001','EMP001','Md. Rahim Uddin',       'rahim@ts.com',  '01711-001001','Production Manager',   2,'full-time','2020-03-15','active',55000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000002','EMP002','Fatema Begum',           'fatema@ts.com', '01711-001002','Knitting Operator',     2,'full-time','2021-06-01','active',22000,'Narayanganj'),
  ('10000000-0000-0000-0000-000000000003','EMP003','Mosharraf Hussain',      'mosharraf@ts.com','01711-001003','Overlock Operator',   2,'full-time','2021-06-01','active',20000,'Gazipur'),
  ('10000000-0000-0000-0000-000000000004','EMP004','Roksana Parvin',         'roksana@ts.com','01711-001004','Sealing Operator',      2,'full-time','2021-08-10','active',19000,'Narayanganj'),
  ('10000000-0000-0000-0000-000000000005','EMP005','Aminul Islam',           'aminul@ts.com', '01711-001005','QC Inspector',          7,'full-time','2022-01-10','active',25000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000006','EMP006','Shiuli Khatun',          'shiuli@ts.com', '01711-001006','HR Executive',          3,'full-time','2020-09-20','active',30000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000007','EMP007','Rafiqul Haque',          'rafiqul@ts.com','01711-001007','Accountant',            4,'full-time','2019-05-12','active',35000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000008','EMP008','Moriam Sultana',         'moriam@ts.com', '01711-001008','Warehouse Keeper',      5,'full-time','2021-11-03','active',22000,'Gazipur'),
  ('10000000-0000-0000-0000-000000000009','EMP009','Sajjad Ali',             'sajjad@ts.com', '01711-001009','Dispatch Officer',      6,'full-time','2022-03-01','active',24000,'Narayanganj'),
  ('10000000-0000-0000-0000-000000000010','EMP010','Nargis Akter',           'nargis@ts.com', '01711-001010','Knitting Operator',     2,'full-time','2022-07-15','active',21000,'Gazipur'),
  ('10000000-0000-0000-0000-000000000011','EMP011','Habibur Rahman',         'habib@ts.com',  '01711-001011','Knitting Operator',     2,'full-time','2022-07-15','active',21000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000012','EMP012','Kulsum Begum',           'kulsum@ts.com', '01711-001012','Packing & Sealing',     2,'full-time','2023-01-05','active',18000,'Narayanganj'),
  ('10000000-0000-0000-0000-000000000013','EMP013','Belal Hossain',          'belal@ts.com',  '01711-001013','Driver',                6,'full-time','2020-06-20','active',16000,'Gazipur'),
  ('10000000-0000-0000-0000-000000000014','EMP014','Taslima Khanom',         'taslima@ts.com','01711-001014','Finance Officer',        4,'full-time','2021-04-18','active',32000,'Dhaka'),
  ('10000000-0000-0000-0000-000000000015','EMP015','Monir Hossain',          'monir@ts.com',  '01711-001015','Machine Technician',    2,'contract', '2023-02-01','active',28000,'Gazipur')
ON CONFLICT (emp_code) DO NOTHING;

-- LEAVE TYPES
INSERT INTO leave_types (name, days_allowed) VALUES
  ('Annual Leave', 18),
  ('Sick Leave',   10),
  ('Casual Leave',  8),
  ('Maternity Leave', 120),
  ('Paternity Leave', 7)
ON CONFLICT DO NOTHING;

-- ATTENDANCE (last 30 days sample)
INSERT INTO attendance (employee_id, date, check_in, check_out, status, overtime_hrs) VALUES
  ('10000000-0000-0000-0000-000000000001', CURRENT_DATE - 1,  '08:05','17:08','present', 0),
  ('10000000-0000-0000-0000-000000000002', CURRENT_DATE - 1,  '08:10','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000003', CURRENT_DATE - 1,  '09:30','17:00','late',    0),
  ('10000000-0000-0000-0000-000000000004', CURRENT_DATE - 1,  NULL,   NULL,  'absent',   0),
  ('10000000-0000-0000-0000-000000000005', CURRENT_DATE - 1,  '08:00','18:00','present', 1),
  ('10000000-0000-0000-0000-000000000001', CURRENT_DATE - 2,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000002', CURRENT_DATE - 2,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000003', CURRENT_DATE - 2,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000004', CURRENT_DATE - 2,  '08:15','17:05','present', 0),
  ('10000000-0000-0000-0000-000000000005', CURRENT_DATE - 2,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000006', CURRENT_DATE - 1,  '08:02','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000007', CURRENT_DATE - 1,  '08:00','17:30','present', 0.5),
  ('10000000-0000-0000-0000-000000000008', CURRENT_DATE - 1,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000009', CURRENT_DATE - 1,  '08:00','17:00','present', 0),
  ('10000000-0000-0000-0000-000000000010', CURRENT_DATE - 1,  '08:05','17:00','present', 0)
ON CONFLICT (employee_id, date) DO NOTHING;

-- PAYROLL (current month sample)
INSERT INTO payroll (employee_id, period_month, period_year, basic_salary, allowances, deductions, overtime_pay, bonus, tax, payment_status, payment_date)
VALUES
  ('10000000-0000-0000-0000-000000000001', 2, 2026, 55000, 8000, 2000, 1500, 5000, 1200, 'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000002', 2, 2026, 22000, 3000, 500,  0,    0,    400,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000003', 2, 2026, 20000, 3000, 500,  0,    0,    300,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000004', 2, 2026, 19000, 2500, 500,  0,    0,    250,  'pending',NULL),
  ('10000000-0000-0000-0000-000000000005', 2, 2026, 25000, 4000, 800,  800,  0,    500,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000006', 2, 2026, 30000, 5000, 1000, 0,    0,    600,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000007', 2, 2026, 35000, 6000, 1200, 400,  0,    800,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000014',2, 2026, 32000, 5000, 1000, 0,    0,    700,  'paid', '2026-02-25'),
  ('10000000-0000-0000-0000-000000000015',2, 2026, 28000, 4000, 800,  600,  0,    550,  'pending',NULL)
ON CONFLICT DO NOTHING;

-- SUPPLIERS
INSERT INTO suppliers (id, name, contact, phone, email, category) VALUES
  ('20000000-0000-0000-0000-000000000001','Meghna Yarn Industries',      'Mr. Salam',    '01812-100001','meghna@yarn.com',    'yarn'),
  ('20000000-0000-0000-0000-000000000002','Titas Synthetic Fibre Co.',   'Mr. Habib',    '01812-100002','titas@fibre.com',    'yarn'),
  ('20000000-0000-0000-0000-000000000003','BD Needle & Accessories',     'Ms. Ruma',     '01812-100003','bdneedle@acc.com',   'needle'),
  ('20000000-0000-0000-0000-000000000004','Green Poly Pack Ltd.',        'Mr. Karim',    '01812-100004','greenply@pk.com',    'polythene'),
  ('20000000-0000-0000-0000-000000000005','Knit Machine World',          'Mr. Fahim',    '01812-100005','kmworld@mac.com',    'machine'),
  ('20000000-0000-0000-0000-000000000006','Overlock & Sealer Solutions', 'Mr. Rezaul',   '01812-100006','overlock@sol.com',   'machine'),
  ('20000000-0000-0000-0000-000000000007','Dhaka Chemical Suppliers',    'Ms. Tania',    '01812-100007','dhakachem@sup.com',  'other')
ON CONFLICT DO NOTHING;

-- CUSTOMERS
INSERT INTO customers (id, name, contact, phone, email, customer_type) VALUES
  ('30000000-0000-0000-0000-000000000001','Agora Superstore',           'Ms. Mitu',   '01912-200001','agora@retail.com',  'retail'),
  ('30000000-0000-0000-0000-000000000002','Shwapno Outlets Ltd.',       'Mr. Anwar',  '01912-200002','shwapno@out.com',   'wholesale'),
  ('30000000-0000-0000-0000-000000000003','Meena Bazaar',               'Ms. Rimi',   '01912-200003','meena@bazar.com',   'retail'),
  ('30000000-0000-0000-0000-000000000004','Star Fashion Distributors',  'Mr. Babul',  '01912-200004','starfd@dist.com',   'distributor'),
  ('30000000-0000-0000-0000-000000000005','City Garments BD',           'Mr. Nasir',  '01912-200005','citygb@bd.com',     'wholesale'),
  ('30000000-0000-0000-0000-000000000006','Online Export Partner A',    'Mr. Hasan',  '01912-200006','exporta@intl.com',  'distributor'),
  ('30000000-0000-0000-0000-000000000007','Khulna Retail Zone',         'Ms. Sumi',   '01912-200007','khulnarz@ret.com',  'retail')
ON CONFLICT DO NOTHING;

-- ITEM CATEGORIES
INSERT INTO item_categories (name, type) VALUES
  ('Cotton Yarn',      'raw_material'),
  ('Synthetic Yarn',   'raw_material'),
  ('Mixed Yarn',       'raw_material'),
  ('Machine Needles',  'raw_material'),
  ('Polythene Bags',   'raw_material'),
  ('Labels & Tags',    'raw_material'),
  ('Knitting Machine', 'machine'),
  ('Overlock Machine', 'machine'),
  ('Sealer Machine',   'machine'),
  ('Ankle Socks',      'finished_good'),
  ('Sports Socks',     'finished_good'),
  ('Formal Socks',     'finished_good'),
  ('Thermal Socks',    'finished_good'),
  ('Kids Socks',       'finished_good'),
  ('Packaging Box',    'consumable')
ON CONFLICT DO NOTHING;

-- INVENTORY ITEMS
INSERT INTO inventory_items (id, sku, name, category_id, unit, current_stock, reorder_level, unit_cost, supplier_id, location)
VALUES
  ('40000000-0000-0000-0000-000000000001','RAW-YRN-001','Cotton Yarn 20/1 Combed',   1,'kg', 2500, 500,  420.00,'20000000-0000-0000-0000-000000000001','Warehouse A - Rack 1'),
  ('40000000-0000-0000-0000-000000000002','RAW-YRN-002','Cotton Yarn 30/1 Carded',   1,'kg', 1800, 400,  380.00,'20000000-0000-0000-0000-000000000001','Warehouse A - Rack 2'),
  ('40000000-0000-0000-0000-000000000003','RAW-YRN-003','Polyester Synthetic Yarn',  2,'kg', 3200, 600,  310.00,'20000000-0000-0000-0000-000000000002','Warehouse A - Rack 3'),
  ('40000000-0000-0000-0000-000000000004','RAW-YRN-004','Nylon Yarn 70D',            2,'kg', 950,  300,  490.00,'20000000-0000-0000-0000-000000000002','Warehouse A - Rack 4'),
  ('40000000-0000-0000-0000-000000000005','RAW-YRN-005','Mixed Cotton-Poly Yarn',    3,'kg', 4100, 800,  350.00,'20000000-0000-0000-0000-000000000001','Warehouse A - Rack 5'),
  ('40000000-0000-0000-0000-000000000006','RAW-NDL-001','Hosiery Machine Needles S2',4,'pcs',15000,2000, 12.50,'20000000-0000-0000-0000-000000000003','Store B - Shelf 1'),
  ('40000000-0000-0000-0000-000000000007','RAW-NDL-002','Hosiery Machine Needles S3',4,'pcs',8000, 1500, 15.00,'20000000-0000-0000-0000-000000000003','Store B - Shelf 2'),
  ('40000000-0000-0000-0000-000000000008','RAW-PLY-001','LDPE Polythene Bag 6x9',    5,'pcs',50000,10000,1.80, '20000000-0000-0000-0000-000000000004','Store B - Shelf 3'),
  ('40000000-0000-0000-0000-000000000009','RAW-PLY-002','OPP Polythene Bag 10x12',   5,'pcs',35000,8000, 2.50, '20000000-0000-0000-0000-000000000004','Store B - Shelf 4'),
  ('40000000-0000-0000-0000-000000000010','RAW-LBL-001','Triumph Brand Labels',      6,'pcs',100000,20000,0.50,'20000000-0000-0000-0000-000000000007','Store B - Shelf 5'),
  ('40000000-0000-0000-0000-000000000011','FG-ANK-001', 'Ankle Socks White Pair',    10,'pair',12500,3000,35.00,NULL,'Finished Goods - Row 1'),
  ('40000000-0000-0000-0000-000000000012','FG-SPT-001', 'Sports Socks Black Pair',   11,'pair',8200, 2000,55.00,NULL,'Finished Goods - Row 2'),
  ('40000000-0000-0000-0000-000000000013','FG-FRM-001', 'Formal Socks Navy/Black',   12,'pair',5400, 1500,65.00,NULL,'Finished Goods - Row 3'),
  ('40000000-0000-0000-0000-000000000014','FG-THM-001', 'Thermal Socks Woolen',      13,'pair',3100, 800, 95.00,NULL,'Finished Goods - Row 4'),
  ('40000000-0000-0000-0000-000000000015','FG-KDS-001', 'Kids Animal Print Socks',   14,'pair',6800, 2000,30.00,NULL,'Finished Goods - Row 5')
ON CONFLICT (sku) DO NOTHING;

-- MACHINES
INSERT INTO machines (id, machine_code, name, type, brand, model, purchase_date, purchase_price, status, last_maintenance, next_maintenance) VALUES
  ('50000000-0000-0000-0000-000000000001','MCH-KNT-001','Knitting Machine KM-400',    'knitting','Lonati',  'LM-400',  '2019-06-15',850000, 'operational','2026-01-10','2026-04-10'),
  ('50000000-0000-0000-0000-000000000002','MCH-KNT-002','Knitting Machine KM-400',    'knitting','Lonati',  'LM-400',  '2019-06-15',850000, 'operational','2026-01-15','2026-04-15'),
  ('50000000-0000-0000-0000-000000000003','MCH-KNT-003','Knitting Machine KM-600',    'knitting','Santoni', 'SM-600',  '2021-03-20',1200000,'operational','2026-02-01','2026-05-01'),
  ('50000000-0000-0000-0000-000000000004','MCH-KNT-004','Knitting Machine KM-200',    'knitting','Matec',   'MT-200',  '2022-08-10',650000, 'maintenance','2026-02-20','2026-03-20'),
  ('50000000-0000-0000-0000-000000000005','MCH-OVL-001','Overlock Machine OVL-Pro',   'overlock','Brother', 'B-OVL5',  '2020-05-10',120000, 'operational','2026-01-20','2026-04-20'),
  ('50000000-0000-0000-0000-000000000006','MCH-OVL-002','Overlock Machine OVL-Pro',   'overlock','Brother', 'B-OVL5',  '2020-05-10',120000, 'operational','2026-01-20','2026-04-20'),
  ('50000000-0000-0000-0000-000000000007','MCH-SEL-001','Sealer Machine SL-200',      'sealer',  'Impulse', 'IMP-SL2', '2021-11-05',85000,  'operational','2026-02-05','2026-05-05'),
  ('50000000-0000-0000-0000-000000000008','MCH-SEL-002','Sealer Machine SL-300',      'sealer',  'Impulse', 'IMP-SL3', '2023-04-12',110000, 'operational','2026-02-10','2026-05-10')
ON CONFLICT (machine_code) DO NOTHING;

-- PRODUCT CATEGORIES
INSERT INTO product_categories (name, slug) VALUES
  ('Ankle Socks',   'ankle-socks'),
  ('Sports Socks',  'sports-socks'),
  ('Formal Socks',  'formal-socks'),
  ('Thermal Socks', 'thermal-socks'),
  ('Kids Socks',    'kids-socks'),
  ('Diabetic Socks','diabetic-socks'),
  ('Compression',   'compression-socks')
ON CONFLICT (slug) DO NOTHING;

-- PRODUCTS
INSERT INTO products (id, sku, name, category_id, description, unit_price, cost_price, min_stock)
VALUES
  ('60000000-0000-0000-0000-000000000001','PROD-ANK-001','Classic White Ankle Socks',       1,'100% combed cotton ankle sock, breathable and durable.',  85, 35, 5000),
  ('60000000-0000-0000-0000-000000000002','PROD-ANK-002','Black Ankle Socks 3-Pack',         1,'Premium black ankle socks, moisture-wicking.',            220, 95, 3000),
  ('60000000-0000-0000-0000-000000000003','PROD-SPT-001','Pro Sports Sock with Cushion',     2,'Extra cushioning for athletes, anti-blister design.',     150, 55, 3000),
  ('60000000-0000-0000-0000-000000000004','PROD-SPT-002','Running Sock Arch Support',        2,'Specialized arch support for long-distance running.',     180, 70, 2000),
  ('60000000-0000-0000-0000-000000000005','PROD-FRM-001','Navy Blue Formal Cotton Sock',     3,'Smooth finish formal sock for office and events.',        120, 65, 2000),
  ('60000000-0000-0000-0000-000000000006','PROD-FRM-002','Charcoal Business Dress Sock',     3,'Fine gauge formal dress sock, breathable.',               130, 65, 1500),
  ('60000000-0000-0000-0000-000000000007','PROD-THM-001','Thermal Woolen Winter Sock',       4,'Warm thermal socks for cold climate.',                    220, 95, 1000),
  ('60000000-0000-0000-0000-000000000008','PROD-KDS-001','Kids Cartoon Print Socks',         5,'Fun cartoon-printed socks for kids 3-10 years.',           65, 30, 5000),
  ('60000000-0000-0000-0000-000000000009','PROD-KDS-002','Kids Bear Pattern Ankle Sock',     5,'Soft and colorful socks for toddlers.',                    75, 32, 4000),
  ('60000000-0000-0000-0000-000000000010','PROD-DIA-001','Diabetic Comfort Sock – White',   6,'Non-binding soft top for diabetic comfort.',              195, 80, 800),
  ('60000000-0000-0000-0000-000000000011','PROD-CMP-001','Compression Sock 15-20mmHg',      7,'Medical-grade compression for circulation.',              350, 120,500)
ON CONFLICT (sku) DO NOTHING;

-- PURCHASE ORDERS
INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, expected_date, status, total_amount, created_by) VALUES
  ('70000000-0000-0000-0000-000000000001','PO-2026-001','20000000-0000-0000-0000-000000000001','2026-01-10','2026-01-18','received', 1050000,'00000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000002','PO-2026-002','20000000-0000-0000-0000-000000000002','2026-01-15','2026-01-25','received',  930000,'00000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000003','PO-2026-003','20000000-0000-0000-0000-000000000003','2026-02-01','2026-02-10','received',  187500,'00000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000004','PO-2026-004','20000000-0000-0000-0000-000000000004','2026-02-05','2026-02-14','received',   90000,'00000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000005','PO-2026-005','20000000-0000-0000-0000-000000000001','2026-02-20','2026-03-01','confirmed', 840000,'00000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000006','PO-2026-006','20000000-0000-0000-0000-000000000002','2026-02-22','2026-03-05','pending',  620000,'00000000-0000-0000-0000-000000000002')
ON CONFLICT (po_number) DO NOTHING;

-- PURCHASE ORDER ITEMS
INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, received_qty) VALUES
  ('70000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',1500,420.00,1500),
  ('70000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',1000,380.00,1000),
  ('70000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000003',2000,310.00,2000),
  ('70000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004', 500,490.00, 500),
  ('70000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000006',8000, 12.50,8000),
  ('70000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000007',5000, 15.00,5000),
  ('70000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000008',30000,1.80,30000),
  ('70000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000009',12000,2.50, 12000),
  ('70000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000001',1200,420.00,0),
  ('70000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000005',1500,350.00,0),
  ('70000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000003',2000,310.00,0)
ON CONFLICT DO NOTHING;

-- PRODUCTION ORDERS
INSERT INTO production_orders (id, order_number, product_id, quantity, produced_qty, status, start_date, end_date, machine_id, supervisor_id) VALUES
  ('80000000-0000-0000-0000-000000000001','PRD-2026-001','60000000-0000-0000-0000-000000000001',20000,20000,'completed','2026-01-05','2026-01-14','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000002','PRD-2026-002','60000000-0000-0000-0000-000000000003',10000,10000,'completed','2026-01-10','2026-01-20','50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000003','PRD-2026-003','60000000-0000-0000-0000-000000000008',15000,15000,'completed','2026-01-15','2026-01-22','50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000004','PRD-2026-004','60000000-0000-0000-0000-000000000001',25000,12000,'in_progress','2026-02-10',NULL,'50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000005','PRD-2026-005','60000000-0000-0000-0000-000000000005', 8000, 3500,'in_progress','2026-02-12',NULL,'50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000006','PRD-2026-006','60000000-0000-0000-0000-000000000007', 5000,    0,'planned',   '2026-03-01',NULL,NULL,'10000000-0000-0000-0000-000000000001')
ON CONFLICT (order_number) DO NOTHING;

-- SALES ORDERS
INSERT INTO sales_orders (id, order_number, customer_id, order_date, delivery_date, status, total_amount, discount, tax_amount, payment_status, created_by) VALUES
  ('90000000-0000-0000-0000-000000000001','SO-2026-001','30000000-0000-0000-0000-000000000001','2026-01-12','2026-01-15','delivered', 127500,5000,0,'paid','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000002','SO-2026-002','30000000-0000-0000-0000-000000000002','2026-01-18','2026-01-22','delivered', 330000,15000,0,'paid','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000003','SO-2026-003','30000000-0000-0000-0000-000000000004','2026-01-25','2026-01-30','delivered', 540000,25000,0,'paid','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000004','SO-2026-004','30000000-0000-0000-0000-000000000003','2026-02-03','2026-02-07','delivered', 195000,8000,0,'paid','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000005','SO-2026-005','30000000-0000-0000-0000-000000000005','2026-02-10','2026-02-15','shipped',   462000,20000,0,'partial','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000006','SO-2026-006','30000000-0000-0000-0000-000000000006','2026-02-18','2026-02-25','confirmed', 720000,30000,0,'unpaid','00000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000007','SO-2026-007','30000000-0000-0000-0000-000000000007','2026-02-25',NULL,         'pending',  85000, 0,   0,'unpaid','00000000-0000-0000-0000-000000000002')
ON CONFLICT (order_number) DO NOTHING;

-- SALES ORDER ITEMS
INSERT INTO sales_order_items (so_id, product_id, quantity, unit_price) VALUES
  ('90000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',1000,85),
  ('90000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000008', 500,65),
  ('90000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001',2000,85),
  ('90000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002', 500,220),
  ('90000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003', 500,150),
  ('90000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000005',2000,120),
  ('90000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000006',2000,130),
  ('90000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000003', 600,150),
  ('90000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000008',1500,65),
  ('90000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000009', 800,75),
  ('90000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000001',3000,85),
  ('90000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000003',1200,150),
  ('90000000-0000-0000-0000-000000000006','60000000-0000-0000-0000-000000000003',2000,120),
  ('90000000-0000-0000-0000-000000000006','60000000-0000-0000-0000-000000000007',1500,220),
  ('90000000-0000-0000-0000-000000000007','60000000-0000-0000-0000-000000000008',1000,65),
  ('90000000-0000-0000-0000-000000000007','60000000-0000-0000-0000-000000000009', 200,75)
ON CONFLICT DO NOTHING;

-- ACCOUNTS
INSERT INTO accounts (name, type, balance) VALUES
  ('Cash in Hand',        'asset',    485000),
  ('Bank – BRAC',         'asset',   5200000),
  ('Bank – Dutch Bangla', 'asset',   3100000),
  ('Accounts Receivable', 'asset',   1820000),
  ('Raw Material Stock',  'asset',   4250000),
  ('Finished Goods Stock','asset',   2800000),
  ('Machinery & Equipment','asset', 15000000),
  ('Accounts Payable',    'liability',950000),
  ('Short-term Loan',     'liability',2500000),
  ('Capital',             'equity',  18000000),
  ('Sales Revenue',       'revenue', 8420000),
  ('Other Income',        'revenue',   250000),
  ('Raw Material Cost',   'expense', 3850000),
  ('Salaries & Wages',    'expense', 1420000),
  ('Utilities',           'expense',  185000),
  ('Marketing',           'expense',  120000),
  ('Maintenance',         'expense',   95000),
  ('Miscellaneous',       'expense',   75000)
ON CONFLICT DO NOTHING;

-- TRANSACTIONS (last 2 months)
INSERT INTO transactions (txn_date, txn_type, category, description, amount, account_id, created_by) VALUES
  ('2026-01-05','expense','Raw Material','Yarn purchase from Meghna Industries', 1050000, 13,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-08','expense','Raw Material','Yarn purchase from Titas Fibre',        930000, 13,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-12','income', 'Sales',       'Sales to Agora Superstore',             122500, 11,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-18','income', 'Sales',       'Sales to Shwapno Outlets',              315000, 11,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-25','income', 'Sales',       'Sales to Star Fashion Distributors',    515000, 11,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-31','expense','Salaries',    'January 2026 Payroll',                  412000, 14,'00000000-0000-0000-0000-000000000004'),
  ('2026-01-31','expense','Utilities',   'January electricity & gas',              48000, 15,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-01','expense','Raw Material','Needles purchase',                       187500, 13,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-05','expense','Raw Material','Polythene bags purchase',                 90000, 13,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-03','income', 'Sales',       'Sales to Meena Bazaar',                 187000, 11,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-10','income', 'Sales',       'Sales to City Garments',                442000, 11,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-15','income', 'Other',       'Machine maintenance service income',     25000, 12,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-20','expense','Marketing',  'Social media & print ads',                35000, 16,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-25','expense','Salaries',   'February 2026 Payroll – advance',        200000, 14,'00000000-0000-0000-0000-000000000004'),
  ('2026-02-28','expense','Maintenance','Machine KM-400 service',                  18000, 17,'00000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- APP SETTINGS
INSERT INTO app_settings (key, value, description) VALUES
  ('company_name',        'Triumph Socks',          'Company display name'),
  ('company_email',       'info@triumphsocks.com',  'Company contact email'),
  ('company_phone',       '+880-1812-100000',       'Company phone'),
  ('company_address',     'Industrial Area, Narayanganj, Bangladesh', 'Company address'),
  ('currency',            'BDT',                    'Default currency'),
  ('currency_symbol',     'Rs',                      'Currency symbol'),
  ('tax_rate',            '5',                      'Default tax rate (%)'),
  ('low_stock_alert',     '20',                     'Alert when stock below this % of reorder'),
  ('payroll_cycle',       'monthly',                'Payroll cycle: monthly | biweekly'),
  ('working_hours',       '8',                      'Standard working hours per day'),
  ('overtime_rate',       '1.5',                    'Overtime multiplier'),
  ('financial_year_start','July',                   'Financial year start month')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- STOCK MOVEMENTS (sample)
INSERT INTO stock_movements (item_id, movement_type, quantity, reference_type, notes, moved_by) VALUES
  ('40000000-0000-0000-0000-000000000001','in', 1500,'purchase_order','PO-2026-001 received','00000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003','in', 2000,'purchase_order','PO-2026-002 received','00000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000001','out', 800,'production',    'PRD-2026-001 material use','00000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000003','out', 600,'production',    'PRD-2026-001 material use','00000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000001','out', 700,'production',    'PRD-2026-004 material use','00000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;
