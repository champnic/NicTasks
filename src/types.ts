export interface Task {
  id: string;
  title: string;
  sectionId: string;
  parentId?: string;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
}

export interface AppData {
  version: number;
  sections: Section[];
  tasks: Task[];
  lastModified: string;
  deviceId: string;
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: "today", name: "Sooner", order: 0, isDefault: true },
  { id: "later", name: "Later", order: 1, isDefault: true },
];

export const APP_DATA_VERSION = 1;
