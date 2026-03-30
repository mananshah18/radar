// Shared app types — matches Prisma schema output (camelCase)

export type Priority = "P0" | "P1" | "P2" | "P3";
export type Effort   = "Quick" | "Medium" | "Deep";
export type Status   = "Todo" | "In Progress" | "Waiting On" | "Done";

export interface Area {
  id:        string;
  userId:    string;
  name:      string;
  groupName: string;
  sortOrder: number;
  isInbox:   boolean;
  deadline:  string | null;
  createdAt: string;
  taskCount?: number;
}

export interface Task {
  id:          string;
  userId:      string;
  areaId:      string | null;
  title:       string;
  notes:       string | null;
  priority:    Priority;
  effort:      Effort;
  status:      Status;
  waitingOn:   string | null;
  dueDate:     string | null;
  source:      string;
  createdAt:   string;
  completedAt: string | null;
  updatedAt:   string;
  area?: { id: string; name: string; groupName: string } | null;
}
