export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
};

export type Housemate = {
  id: string;
  household_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user?: User;
};

export type Bill = {
  id: string;
  household_id: string;
  title: string;
  amount: number;
  category: "electricity" | "water" | "internet" | "rent" | "groceries" | "other";
  created_by: string;
  due_date?: string;
  is_recurring: boolean;
  split_type: "equal" | "percentage" | "custom";
  created_at: string;
};

export type BillShare = {
  id: string;
  bill_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  verified_at?: string;
  paid_at?: string;
};
