// Shared app types — matches Prisma schema output (camelCase)

export type Priority = "P0" | "P1" | "P2" | "P3";
export type Effort   = "Quick" | "Medium" | "Deep";
export type Status   = "Todo" | "In Progress" | "Waiting On" | "Done";

export interface Subcategory {
  id:         string;
  userId:     string;
  categoryId: string;
  name:       string;
  createdAt:  string;
  taskCount?: number;
}

export interface Category {
  id:           string;
  userId:       string;
  name:         string;
  isInbox:      boolean;
  sortOrder:    number;
  createdAt:    string;
  subcategories?: Subcategory[];
  taskCount?:   number;
}

export interface Task {
  id:            string;
  userId:        string;
  categoryId:    string | null;
  subcategoryId: string | null;
  title:         string;
  notes:         string | null;
  priority:      Priority;
  effort:        Effort;
  status:        Status;
  waitingOn:     string | null;
  dueDate:       string | null;
  source:        string;
  createdAt:     string;
  completedAt:   string | null;
  updatedAt:     string;
  category?:    { id: string; name: string } | null;
  subcategory?: { id: string; name: string; categoryId: string } | null;
}
