// ============================================================
//  Triumph Socks – Shared TypeScript Types
// ============================================================

export type Role = 'admin' | 'manager' | 'hr' | 'finance' | 'production' | 'viewer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: Role;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  emp_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department_id?: number;
  department_name?: string;
  employment_type: 'full-time' | 'part-time' | 'contract';
  join_date: string;
  termination_date?: string;
  status: 'active' | 'on-leave' | 'terminated';
  salary: number;
  avatar_url?: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  head_user_id?: string;
  description?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  overtime_hrs: number;
  notes?: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  employee_name?: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  overtime_pay: number;
  bonus: number;
  tax: number;
  net_salary: number;
  payment_status: 'pending' | 'paid';
  payment_date?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category_id: number;
  category_name?: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  unit_cost: number;
  supplier_id?: string;
  supplier_name?: string;
  location?: string;
  is_active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  rating: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'retail' | 'wholesale' | 'distributor';
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: number;
  category_name?: string;
  description?: string;
  image_url?: string;
  unit_price: number;
  cost_price: number;
  is_active: boolean;
  min_stock: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string;
  supplier_name?: string;
  order_date: string;
  expected_date?: string;
  status: 'pending' | 'confirmed' | 'received' | 'cancelled';
  total_amount: number;
  notes?: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  order_date: string;
  delivery_date?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  grand_total: number;
  discount: number;
  tax_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
}

export interface ProductionOrder {
  id: string;
  order_number: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  produced_qty: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  machine_id?: string;
  machine_name?: string;
  supervisor_id?: string;
  supervisor_name?: string;
}

export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  type: 'knitting' | 'overlock' | 'sealer' | 'other';
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_price?: number;
  status: 'operational' | 'maintenance' | 'idle' | 'retired';
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface Transaction {
  id: string;
  txn_date: string;
  txn_type: 'income' | 'expense' | 'transfer';
  category?: string;
  description?: string;
  amount: number;
  account_id?: number;
  account_name?: string;
}

export interface AppSettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  currency: string;
  currency_symbol: string;
  tax_rate: string;
  low_stock_alert: string;
  payroll_cycle: string;
  working_hours: string;
  overtime_rate: string;
  financial_year_start: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  totalEmployees: number;
  presentToday: number;
  activeOrders: number;
  lowStockItems: number;
  productionInProgress: number;
  monthlyRevenue: { month: string; revenue: number; expense: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentTransactions: Transaction[];
}

export interface StockMovement {
  id: string;
  item_id: string;
  item_name?: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
