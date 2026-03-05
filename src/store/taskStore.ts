import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Task,
  Section,
  AppData,
  DEFAULT_SECTIONS,
  APP_DATA_VERSION,
} from "../types";
import {
  loadData,
  saveData,
  scanForConflicts,
  mergeConflictFile,
  watchDataFile,
} from "../storage/persistence";

interface TaskStore {
  // State
  sections: Section[];
  tasks: Task[];
  isLoaded: boolean;
  showCompleted: boolean;
  newTaskModalOpen: boolean;
  conflictFiles: string[];

  // Data actions
  initialize: () => Promise<void>;
  persist: () => Promise<void>;

  // Task actions
  addTask: (title: string, sectionId: string, parentId?: string) => void;
  addTasks: (entries: { title: string; indent: boolean }[], sectionId: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  editTaskWithSubtasks: (id: string, lines: { title: string; indent: boolean }[]) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  reorderTask: (taskId: string, newSectionId: string, newOrder: number) => void;
  makeSubtask: (taskId: string, parentId: string) => void;

  // Section actions
  addSection: (name: string) => void;
  renameSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;
  reorderSection: (sectionId: string, newOrder: number) => void;

  // UI actions
  toggleShowCompleted: () => void;
  setNewTaskModalOpen: (open: boolean) => void;

  // Conflict actions
  mergeConflicts: () => Promise<void>;
  dismissConflicts: () => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(store: TaskStore) {
  if (!store.isLoaded) {
    console.log('[debouncedSave] skipping — store not loaded yet');
    return;
  }
  if (saveTimeout) clearTimeout(saveTimeout);
  console.log('[debouncedSave] scheduling save in 500ms');
  saveTimeout = setTimeout(() => {
    console.log('[debouncedSave] executing persist now');
    store.persist();
  }, 500);
}

/** Flush any pending debounced save immediately. Called on window close. */
export function flushPendingSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    const store = useTaskStore.getState();
    if (store.isLoaded) store.persist();
  }
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  sections: [...DEFAULT_SECTIONS],
  tasks: [],
  isLoaded: false,
  showCompleted: false,
  newTaskModalOpen: false,
  conflictFiles: [],

  initialize: async () => {
    try {
      const data = await loadData();
      const conflicts = await scanForConflicts();

      set({
        sections: data.sections,
        tasks: data.tasks,
        isLoaded: true,
        conflictFiles: conflicts,
      });

      // Watch for external changes (e.g. OneDrive sync from another machine)
      watchDataFile((externalData) => {
        set({
          sections: externalData.sections,
          tasks: externalData.tasks,
        });
      }).catch((e) => console.warn("File watch setup failed:", e));
    } catch (error) {
      console.error("Failed to initialize store:", error);
      set({ isLoaded: true });
    }
  },

  persist: async () => {
    const { sections, tasks } = get();
    console.log('[persist] saving sections:', sections.map(s => `${s.id}(order=${s.order})`));
    const data: AppData = {
      version: APP_DATA_VERSION,
      sections,
      tasks,
      lastModified: new Date().toISOString(),
      deviceId: localStorage.getItem("nictasks-device-id") || "unknown",
    };
    await saveData(data);
    console.log('[persist] save complete');
  },

  addTask: (title: string, sectionId: string, parentId?: string) => {
    const state = get();
    const tasksInSection = state.tasks.filter(
      (t) => t.sectionId === sectionId && !t.completed && (parentId ? t.parentId === parentId : !t.parentId)
    );
    const maxOrder = tasksInSection.reduce(
      (max, t) => Math.max(max, t.order),
      -1
    );

    const newTask: Task = {
      id: uuidv4(),
      title,
      sectionId,
      ...(parentId ? { parentId } : {}),
      order: maxOrder + 1,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      tasks: [...state.tasks, newTask],
    }));
    debouncedSave(get());
  },

  addTasks: (entries: { title: string; indent: boolean }[], sectionId: string) => {
    const state = get();
    const now = new Date().toISOString();
    const newTasks: Task[] = [];
    let lastParentId: string | undefined;

    // Find max order for top-level tasks in section
    const topLevelTasks = state.tasks.filter(
      (t) => t.sectionId === sectionId && !t.completed && !t.parentId
    );
    let topOrder = topLevelTasks.reduce((max, t) => Math.max(max, t.order), -1);

    // Track sub-task order per parent
    const subOrderMap = new Map<string, number>();

    for (const entry of entries) {
      if (entry.indent && lastParentId) {
        // Sub-task
        const currentSubOrder = subOrderMap.get(lastParentId) ?? 
          state.tasks.filter(t => t.parentId === lastParentId).reduce((max, t) => Math.max(max, t.order), -1);
        const nextSubOrder = currentSubOrder + 1;
        subOrderMap.set(lastParentId, nextSubOrder);

        newTasks.push({
          id: uuidv4(),
          title: entry.title,
          sectionId,
          parentId: lastParentId,
          order: nextSubOrder,
          completed: false,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Top-level task
        topOrder++;
        const taskId = uuidv4();
        lastParentId = taskId;
        newTasks.push({
          id: taskId,
          title: entry.title,
          sectionId,
          order: topOrder,
          completed: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    set((state) => ({
      tasks: [...state.tasks, ...newTasks],
    }));
    debouncedSave(get());
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
    debouncedSave(get());
  },

  editTaskWithSubtasks: (id: string, lines: { title: string; indent: boolean }[]) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    const now = new Date().toISOString();
    const firstLine = lines[0];
    if (!firstLine) return;

    // Update the task's own title from the first non-indented line
    const newTitle = firstLine.title;

    // Collect new subtask lines (indented lines after the first)
    const subtaskLines = lines.slice(1).filter((l) => l.indent && l.title.trim());

    // Find existing subtask max order
    const existingSubtasks = state.tasks.filter((t) => t.parentId === id);
    let maxOrder = existingSubtasks.reduce((max, t) => Math.max(max, t.order), -1);

    const newSubtasks: Task[] = subtaskLines.map((line) => ({
      id: uuidv4(),
      title: line.title,
      sectionId: task.sectionId,
      parentId: id,
      order: ++maxOrder,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }));

    set((state) => ({
      tasks: [
        ...state.tasks.map((t) =>
          t.id === id ? { ...t, title: newTitle, updatedAt: now } : t
        ),
        ...newSubtasks,
      ],
    }));
    debouncedSave(get());
  },

  deleteTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
    }));
    debouncedSave(get());
  },

  toggleComplete: (id: string) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return state;
      const newCompleted = !task.completed;
      const now = new Date().toISOString();
      return {
        tasks: state.tasks.map((t) => {
          if (t.id === id) {
            return { ...t, completed: newCompleted, updatedAt: now };
          }
          // If completing a parent, also complete its subtasks
          if (t.parentId === id && newCompleted && !t.completed) {
            return { ...t, completed: true, updatedAt: now };
          }
          return t;
        }),
      };
    });
    debouncedSave(get());
  },

  reorderTask: (taskId: string, newSectionId: string, newOrder: number) => {
    set((state) => {
      const tasks = [...state.tasks];
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return state;

      const task = tasks[taskIndex];
      const oldSectionId = task.sectionId;

      // Update the moved task — clear parentId when reordering as top-level
      tasks[taskIndex] = {
        ...task,
        sectionId: newSectionId,
        parentId: undefined,
        order: newOrder,
        updatedAt: new Date().toISOString(),
      };

      // Re-number top-level tasks in the affected section(s)
      const affectedSections = new Set([oldSectionId, newSectionId]);
      for (const sectionId of affectedSections) {
        const sectionTasks = tasks
          .filter((t) => t.sectionId === sectionId && !t.parentId)
          .sort((a, b) => a.order - b.order);

        sectionTasks.forEach((t, i) => {
          const idx = tasks.findIndex((tt) => tt.id === t.id);
          tasks[idx] = { ...tasks[idx], order: i };
        });
      }

      return { tasks };
    });
    debouncedSave(get());
  },

  makeSubtask: (taskId: string, parentId: string) => {
    set((state) => {
      const tasks = [...state.tasks];
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      const parentTask = tasks.find((t) => t.id === parentId);
      if (taskIndex === -1 || !parentTask) return state;

      // Don't allow nesting subtasks under subtasks
      if (parentTask.parentId) return state;

      // If source has subtasks, reassign them to the new parent (flatten)
      const childSubtasks = tasks.filter((t) => t.parentId === taskId);
      const existingSubtasks = tasks.filter((t) => t.parentId === parentId);
      const maxOrder = existingSubtasks.reduce((max, t) => Math.max(max, t.order), -1);

      // Move the source task as a subtask
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        parentId,
        sectionId: parentTask.sectionId,
        order: maxOrder + 1,
        updatedAt: new Date().toISOString(),
      };

      // Reassign any children of source to the new parent
      let nextOrder = maxOrder + 2;
      for (const child of childSubtasks) {
        const childIndex = tasks.findIndex((t) => t.id === child.id);
        if (childIndex !== -1) {
          tasks[childIndex] = {
            ...tasks[childIndex],
            parentId,
            sectionId: parentTask.sectionId,
            order: nextOrder++,
            updatedAt: new Date().toISOString(),
          };
        }
      }

      return { tasks };
    });
    debouncedSave(get());
  },

  addSection: (name: string) => {
    const state = get();
    const maxOrder = state.sections.reduce(
      (max, s) => Math.max(max, s.order),
      -1
    );

    const newSection: Section = {
      id: uuidv4(),
      name,
      order: maxOrder + 1,
      isDefault: false,
    };

    set((state) => ({
      sections: [...state.sections, newSection],
    }));
    debouncedSave(get());
  },

  renameSection: (id: string, name: string) => {
    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
    debouncedSave(get());
  },

  deleteSection: (id: string) => {
    const state = get();
    const section = state.sections.find((s) => s.id === id);
    if (!section) return;

    // Don't allow deleting the last section
    if (state.sections.length <= 1) return;

    // Move tasks to the first remaining section
    const fallback = state.sections.find((s) => s.id !== id);
    const fallbackId = fallback?.id || "today";

    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      tasks: state.tasks.map((t) =>
        t.sectionId === id ? { ...t, sectionId: fallbackId } : t
      ),
    }));
    debouncedSave(get());
  },

  reorderSection: (sectionId: string, newOrder: number) => {
    console.log('[reorderSection] called with sectionId:', sectionId, 'newOrder:', newOrder);
    set((state) => {
      // Sort by order first so array positions correspond to visual order
      const sections = [...state.sections].sort((a, b) => a.order - b.order);
      console.log('[reorderSection] sections before (sorted):', sections.map(s => `${s.id}(order=${s.order})`));
      const sectionIndex = sections.findIndex((s) => s.id === sectionId);
      if (sectionIndex === -1) {
        console.log('[reorderSection] section not found, aborting');
        return state;
      }

      // Remove the section from its current position
      const [moved] = sections.splice(sectionIndex, 1);
      console.log('[reorderSection] removed', moved.id, 'from index', sectionIndex, ', remaining:', sections.map(s => s.id));

      // Insert at the new position
      const clampedOrder = Math.max(0, Math.min(newOrder, sections.length));
      sections.splice(clampedOrder, 0, moved);
      console.log('[reorderSection] inserted at index', clampedOrder, ', array now:', sections.map(s => s.id));

      // Re-number all sections sequentially
      const updated = sections.map((s, i) => ({ ...s, order: i }));
      console.log('[reorderSection] final order:', updated.map(s => `${s.id}(order=${s.order})`));

      return { sections: updated };
    });
    debouncedSave(get());
  },

  toggleShowCompleted: () => {
    set((state) => ({ showCompleted: !state.showCompleted }));
  },

  setNewTaskModalOpen: (open: boolean) => {
    set({ newTaskModalOpen: open });
  },

  mergeConflicts: async () => {
    const state = get();
    let data: AppData = {
      version: APP_DATA_VERSION,
      sections: state.sections,
      tasks: state.tasks,
      lastModified: new Date().toISOString(),
      deviceId: localStorage.getItem("nictasks-device-id") || "unknown",
    };

    for (const conflictPath of state.conflictFiles) {
      data = await mergeConflictFile(conflictPath, data);
    }

    set({
      sections: data.sections,
      tasks: data.tasks,
      conflictFiles: [],
    });

    await get().persist();
  },

  dismissConflicts: () => {
    set({ conflictFiles: [] });
  },
}));
