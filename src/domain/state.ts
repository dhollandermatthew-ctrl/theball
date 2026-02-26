  // FILE: src/domain/state.ts
  import { create } from "zustand";
  import { immer } from "zustand/middleware/immer";
  import type { Goal, MeetingSpace, HealthData, MeetingRecord, SpaceNotePage, BloodWorkRecord, WorkoutRecord, PersonalProfile, ProductKnowledgeItem } from "./types";

  import { enqueue } from "@/db/sync";
  import { db } from "@/db/client";
  import { eq } from "drizzle-orm";

  import {
    tasks as tasksTable,
    oneOnOnes as oneOnOneTable,
    oneOnOnePeople as oneOnOnePeopleTable,
    goals as goalsTable,
    meetingSpaces as meetingSpacesTable,
    meetingRecords as meetingRecordsTable,
    spaceNotes as spaceNotesTable,
    healthBloodwork as healthBloodworkTable,
    healthWorkouts as healthWorkoutsTable,
    healthProfile as healthProfileTable,
    productKnowledge as productKnowledgeTable,
  } from "@/db/schema";

  export const CURRENT_STATE_VERSION = 5;



  // -----------------------------------------------------
  // Types
  // -----------------------------------------------------
  export interface Task {
    id: string;
    title: string;
    content: string;
  
    // ✅ calendar only
    date?: string | null;
  
    // ✅ task routing (so 1:1 tasks persist + reload correctly)
    taskType: "calendar" | "oneonone";
    conversationWith?: string; // OneOnOnePerson.id
  
    status: "todo" | "in_progress" | "done" | "missed";
    priority: "p1" | "p2" | "p3";
    category: "work" | "personal";
  
    createdAt: string;
  }

  export interface OneOnOneItem {
    id: string;
    personId: string;
    content: string;
    isCompleted: boolean;
    createdAt: string;
  }

  export interface OneOnOnePerson {
    id: string;
    name: string;
    avatarColor: string;
    sortOrder: number;
  }

  export interface Settings {
    zoom: number;
    sidebarOpen: boolean;
    sidebarWidth?: number;
  }

  // -----------------------------------------------------
  // Main app state shape
  // -----------------------------------------------------
  export interface AppState {
    version: number;

    tasks: Task[];
    people: OneOnOnePerson[];
    oneOnOnes: Record<string, OneOnOneItem[]>;
    goals: Goal[];
    meetingSpaces: MeetingSpace[];
    healthData: HealthData;
    productKnowledge: ProductKnowledgeItem[];

    settings: Settings;

    hydrated: boolean;

    set: (fn: (draft: AppState) => void) => void;
    setHydrated: () => void;
    
    // Goals
    loadGoals: (goals: Goal[]) => void;
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    deleteGoal: (id: string) => void;
    reorderGoals: (goals: Goal[]) => void;

    // Tasks
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;

    // 1:1 people
    addPerson: (p: OneOnOnePerson) => void;
    editPerson: (id: string, updates: Partial<OneOnOnePerson>) => void;
    reorderPeople: (orderedIds: string[]) => void;
    deletePerson: (id: string) => void;

    // 1:1 notes
    addOneOnOneItem: (item: OneOnOneItem) => void;
    updateOneOnOneItem: (id: string, updates: Partial<OneOnOneItem>) => void;
    deleteOneOnOneItem: (id: string) => void;

    // Meetings
    addMeetingSpace: (space: MeetingSpace) => void;
    updateMeetingSpace: (id: string, updates: Partial<MeetingSpace>) => void;
    deleteMeetingSpace: (id: string) => void;
    reorderMeetingSpaces: (spaces: MeetingSpace[]) => void;
    addMeetingRecord: (spaceId: string, record: MeetingRecord) => void;
    updateMeetingRecord: (spaceId: string, recordId: string, updates: Partial<MeetingRecord>) => void;
    deleteMeetingRecord: (spaceId: string, recordId: string) => void;
    addSpaceNote: (spaceId: string, note: SpaceNotePage) => void;
    updateSpaceNote: (spaceId: string, noteId: string, updates: Partial<SpaceNotePage>) => void;
    deleteSpaceNote: (spaceId: string, noteId: string) => void;

    // Health
    addBloodwork: (record: BloodWorkRecord) => void;
    updateBloodwork: (id: string, updates: Partial<BloodWorkRecord>) => void;
    deleteBloodwork: (id: string) => void;
    addWorkout: (record: WorkoutRecord) => void;
    updateWorkout: (id: string, updates: Partial<WorkoutRecord>) => void;
    deleteWorkout: (id: string) => void;
    updateHealthProfile: (profile: PersonalProfile) => void;

    // Product Knowledge
    addKnowledgeItem: (item: ProductKnowledgeItem) => void;
    updateKnowledgeItem: (id: string, updates: Partial<ProductKnowledgeItem>) => void;
    deleteKnowledgeItem: (id: string) => void;

    // helpers
    getNoteCount: (id: string) => number;
  }

  // -----------------------------------------------------
  // Default state
  // -----------------------------------------------------
// -----------------------------------------------------
// Default state
// -----------------------------------------------------
export const defaultState: Pick<
  AppState,
  | "version"
  | "tasks"
  | "people"
  | "oneOnOnes"
  | "goals"
  | "meetingSpaces"
  | "healthData"
  | "productKnowledge"
  | "settings"
  | "hydrated"
> = {
  version: CURRENT_STATE_VERSION,

  tasks: [],
  people: [],
  oneOnOnes: {},
  goals: [],
  meetingSpaces: [],
  healthData: {
    bloodWorkRecords: [],
    workoutRecords: [],
  },
  productKnowledge: [],

  settings: {
    zoom: 1,
    sidebarOpen: true,
    sidebarWidth: 260,  
  },

  hydrated: false,
};
  export type PersistedState = typeof defaultState;
  // -----------------------------------------------------
  // Zustand Store
  // -----------------------------------------------------
  export const useAppStore = create<AppState>()(
    immer((set, get) => ({
      ...defaultState,

      set: (fn) => set(fn),

      setHydrated: () =>
        set((s) => {
          s.hydrated = true;
        }),

      // ---------------------- TASKS ----------------------
      addTask: async (task) => {
        useAppStore.setState((state) => {
          state.tasks.push(task);
        });
      
        db.insert(tasksTable).values(task).catch(console.error);
      },

        updateTask: (id, updates) =>
          set((state) => {
            state.tasks = state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            );
        
            enqueue({
              type: "update",
              table: "tasks",
              id,
              data: updates,
            });
          }),

      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id);

          enqueue({
            type: "delete",
            table: "tasks",
            id,
          });
        }),

  // ---------------------- GOALS ----------------------
// ---------------------- GOALS ----------------------

loadGoals: (goals) =>
  set((state) => {
    state.goals = goals;
  }),
    
  addGoal: (goal) =>
      set((state) => {
        const next: Goal = {
          ...goal,
          sort_order: state.goals.length,
        };
    
        state.goals.push(next);
    
        enqueue({
          type: "insert",
          table: "goals",
          data: next,
        });
      }),

  updateGoal: (id, updates) =>
    set((state) => {
      const goal = state.goals.find((g) => g.id === id);
      if (!goal) return;

      Object.assign(goal, updates, {
        updatedAt: new Date().toISOString(),
      });

      enqueue({
        type: "update",
        table: "goals",
        id,
        data: updates,
      });
    }),

  deleteGoal: (id) =>
    set((state) => {
      state.goals = state.goals.filter((g) => g.id !== id);

      enqueue({
        type: "delete",
        table: "goals",
        id,
      });
    }),

    reorderGoals: (orderedGoals) =>
      set((state) => {
        const next = assignGoalSortOrder(orderedGoals);
        state.goals = next;
    
        next.forEach((g) => {
          enqueue({
            type: "update",
            table: "goals",
            id: g.id,
            data: { sort_order: g.sort_order },
          });
        });
      }),

      // ---------------------- 1:1 PEOPLE ----------------------
      addPerson: (person) =>
        set((state) => {
          const maxOrder =
            state.people.length > 0
              ? Math.max(...state.people.map((p) => p.sortOrder))
              : 0;

          person.sortOrder = maxOrder + 1;

          state.people.push(person);

          enqueue({
            type: "insert",
            table: "oneOnOnePeople",
            data: person,
          });
        }),

      editPerson: (id, updates) =>
        set((state) => {
          const person = state.people.find((p) => p.id === id);
          if (!person) return;

          Object.assign(person, updates);

          enqueue({
            type: "update",
            table: "oneOnOnePeople",
            id,
            data: updates,
          });
        }),

      reorderPeople: (orderedIds) =>
        set((state) => {
          state.people = orderedIds.map((id, index) => {
            const p = state.people.find((x) => x.id === id)!;
            p.sortOrder = index;

            enqueue({
              type: "update",
              table: "oneOnOnePeople",
              id,
              data: { sortOrder: index },
            });

            return p;
          });
        }),

        deletePerson: (id) =>
          set((state) => {
      
        
            // Remove all 1:1 notes for this person
            if (state.oneOnOnes[id]) {
              delete state.oneOnOnes[id];
            }
        
            // Remove the person
            state.people = state.people.filter((p) => p.id !== id);
        
            // DB delete
            enqueue({
              type: "delete",
              table: "oneOnOnePeople",
              id,
            });
          }),

      getNoteCount: (id) => {
        const st = get();
        return st.oneOnOnes[id]?.length ?? 0;
      },

      // ---------------------- 1:1 NOTES ----------------------
      addOneOnOneItem: (item) =>
        set((state) => {
          const list = state.oneOnOnes[item.personId] ?? [];
          state.oneOnOnes[item.personId] = [item, ...list];

          enqueue({
            type: "insert",
            table: "oneOnOnes",
            data: item,
          });
        }),

      updateOneOnOneItem: (id, updates) =>
        set((state) => {
          for (const list of Object.values(state.oneOnOnes)) {
            const found = list.find((i) => i.id === id);
            if (found) {
              Object.assign(found, updates);

              enqueue({
                type: "update",
                table: "oneOnOnes",
                id,
                data: updates,
              });
            }
          }
        }),

      deleteOneOnOneItem: (id) =>
        set((state) => {
          for (const [pid, list] of Object.entries(state.oneOnOnes)) {
            const next = list.filter((i) => i.id !== id);
            if (next.length !== list.length) {
              state.oneOnOnes[pid] = next;
            }
          }

          enqueue({
            type: "delete",
            table: "oneOnOnes",
            id,
          });
        }),

      // ---------------------- MEETINGS ----------------------
      addMeetingSpace: (space) =>
        set((state) => {
          const maxOrder = state.meetingSpaces.length > 0
            ? Math.max(...state.meetingSpaces.map((s) => s.sortOrder ?? 0))
            : -1;
          
          const spaceWithOrder = { ...space, sortOrder: maxOrder + 1 };
          state.meetingSpaces.push(spaceWithOrder);

          enqueue({
            type: "insert",
            table: "meetingSpaces",
            data: {
              id: spaceWithOrder.id,
              name: spaceWithOrder.name,
              description: spaceWithOrder.description,
              category: spaceWithOrder.category,
              color: spaceWithOrder.color,
              sortOrder: spaceWithOrder.sortOrder,
              createdAt: spaceWithOrder.id, // Using id as createdAt placeholder
            },
          });
        }),

      updateMeetingSpace: (id, updates) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === id);
          if (!space) return;

          Object.assign(space, updates);

          enqueue({
            type: "update",
            table: "meetingSpaces",
            id,
            data: updates,
          });
        }),

      deleteMeetingSpace: (id) =>
        set((state) => {
          state.meetingSpaces = state.meetingSpaces.filter((s) => s.id !== id);

          enqueue({
            type: "delete",
            table: "meetingSpaces",
            id,
          });
        }),

      reorderMeetingSpaces: (spaces) =>
        set((state) => {
          // Assign sortOrder based on array position
          const reordered = spaces.map((space, index) => ({
            ...space,
            sortOrder: index,
          }));
          
          state.meetingSpaces = reordered;

          // Persist sortOrder changes to Turso
          reordered.forEach((space) => {
            enqueue({
              type: "update",
              table: "meetingSpaces",
              id: space.id,
              data: { sortOrder: space.sortOrder },
            });
          });
        }),

      addMeetingRecord: (spaceId, record) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          space.records = space.records || [];
          space.records.push(record);

          enqueue({
            type: "insert",
            table: "meetingRecords",
            data: {
              id: record.id,
              spaceId,
              title: record.title,
              date: record.date,
              transcript: record.transcript,
              notes: record.notes || null,
              meetingType: record.meetingType || null,
              insight: record.insight ? JSON.stringify(record.insight) : null,
              createdAt: record.createdAt,
            },
          });
        }),

      updateMeetingRecord: (spaceId, recordId, updates) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          const record = space.records?.find((r) => r.id === recordId);
          if (!record) return;

          Object.assign(record, updates);

          enqueue({
            type: "update",
            table: "meetingRecords",
            id: recordId,
            data: {
              ...updates,
              insight: updates.insight ? JSON.stringify(updates.insight) : undefined,
            },
          });
        }),

      deleteMeetingRecord: (spaceId, recordId) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          space.records = space.records?.filter((r) => r.id !== recordId) || [];

          enqueue({
            type: "delete",
            table: "meetingRecords",
            id: recordId,
          });
        }),

      addSpaceNote: (spaceId, note) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          space.spaceNotes = space.spaceNotes || [];
          space.spaceNotes.push(note);

          enqueue({
            type: "insert",
            table: "spaceNotes",
            data: {
              id: note.id,
              spaceId,
              title: note.title,
              content: note.content,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
            },
          });
        }),

      updateSpaceNote: (spaceId, noteId, updates) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          const note = space.spaceNotes?.find((n) => n.id === noteId);
          if (!note) return;

          Object.assign(note, updates);

          enqueue({
            type: "update",
            table: "spaceNotes",
            id: noteId,
            data: updates,
          });
        }),

      deleteSpaceNote: (spaceId, noteId) =>
        set((state) => {
          const space = state.meetingSpaces.find((s) => s.id === spaceId);
          if (!space) return;

          space.spaceNotes = space.spaceNotes?.filter((n) => n.id !== noteId) || [];

          enqueue({
            type: "delete",
            table: "spaceNotes",
            id: noteId,
          });
        }),

      // ---------------------- HEALTH ----------------------
      addBloodwork: (record) =>
        set((state) => {
          state.healthData.bloodWorkRecords = [
            record,
            ...(state.healthData.bloodWorkRecords || []),
          ];

          enqueue({
            type: "insert",
            table: "healthBloodwork",
            data: {
              id: record.id,
              date: record.date,
              labName: record.labName || null,
              sourceType: record.sourceType,
              sourceFileName: record.sourceFileName || null,
              labValues: JSON.stringify(record.labValues),
              aiAnalysis: record.aiAnalysis || null,
              aiFlags: record.aiFlags ? JSON.stringify(record.aiFlags) : null,
              notes: record.notes || null,
              createdAt: record.createdAt,
            },
          });
        }),

      updateBloodwork: (id, updates) =>
        set((state) => {
          const record = state.healthData.bloodWorkRecords?.find((r) => r.id === id);
          if (!record) return;

          Object.assign(record, updates);

          enqueue({
            type: "update",
            table: "healthBloodwork",
            id,
            data: {
              ...updates,
              labValues: updates.labValues ? JSON.stringify(updates.labValues) : undefined,
              aiFlags: updates.aiFlags ? JSON.stringify(updates.aiFlags) : undefined,
            },
          });
        }),

      deleteBloodwork: (id) =>
        set((state) => {
          state.healthData.bloodWorkRecords = state.healthData.bloodWorkRecords?.filter(
            (r) => r.id !== id
          ) || [];

          enqueue({
            type: "delete",
            table: "healthBloodwork",
            id,
          });
        }),

      addWorkout: (record) =>
        set((state) => {
          state.healthData.workoutRecords = [
            record,
            ...(state.healthData.workoutRecords || []),
          ];

          enqueue({
            type: "insert",
            table: "healthWorkouts",
            data: {
              id: record.id,
              date: record.date,
              type: record.type,
              distance: record.distance || null,
              duration: record.duration || null,
              pace: record.pace || null,
              calories: record.calories || null,
              sourceType: record.sourceType,
              sourceFileName: record.sourceFileName || null,
              notes: record.notes || null,
              createdAt: record.createdAt,
            },
          });
        }),

      updateWorkout: (id, updates) =>
        set((state) => {
          const record = state.healthData.workoutRecords?.find((r) => r.id === id);
          if (!record) return;

          Object.assign(record, updates);

          enqueue({
            type: "update",
            table: "healthWorkouts",
            id,
            data: updates,
          });
        }),

      deleteWorkout: (id) =>
        set((state) => {
          state.healthData.workoutRecords = state.healthData.workoutRecords?.filter(
            (r) => r.id !== id
          ) || [];

          enqueue({
            type: "delete",
            table: "healthWorkouts",
            id,
          });
        }),

      updateHealthProfile: (profile) =>
        set((state) => {
          state.healthData.personalProfile = profile;

          const profileId = "singleton";
          enqueue({
            type: "upsert",
            table: "healthProfile",
            id: profileId,
            data: {
              id: profileId,
              dateOfBirth: profile.dateOfBirth || null,
              sex: profile.sex || null,
              weight: profile.weight || null,
              height: profile.height || null,
              updatedAt: new Date().toISOString(),
            },
          });
        }),

      // ---------------------- PRODUCT KNOWLEDGE ----------------------
      addKnowledgeItem: (item) =>
        set((state) => {
          state.productKnowledge = [item, ...state.productKnowledge];

          enqueue({
            type: "insert",
            table: "productKnowledge",
            data: {
              id: item.id,
              title: item.title,
              type: item.type,
              content: item.content || null,
              fileData: item.fileData || null,
              fileName: item.fileName || null,
              fileType: item.fileType || null,
              fileSize: item.fileSize || null,
              tags: item.tags ? JSON.stringify(item.tags) : null,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            },
          });
        }),

      updateKnowledgeItem: (id, updates) =>
        set((state) => {
          const item = state.productKnowledge.find((i) => i.id === id);
          if (!item) return;

          Object.assign(item, updates);
          item.updatedAt = new Date().toISOString();

          enqueue({
            type: "update",
            table: "productKnowledge",
            id,
            data: {
              ...updates,
              tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
              updatedAt: item.updatedAt,
            },
          });
        }),

      deleteKnowledgeItem: (id) =>
        set((state) => {
          console.log('[State] deleteKnowledgeItem called with id:', id);
          console.log('[State] Current productKnowledge count:', state.productKnowledge.length);
          
          const before = state.productKnowledge.length;
          state.productKnowledge = state.productKnowledge.filter((i) => i.id !== id);
          const after = state.productKnowledge.length;
          
          console.log('[State] After filter - before:', before, 'after:', after);
          console.log('[State] Item deleted:', before !== after);

          enqueue({
            type: "delete",
            table: "productKnowledge",
            id,
          });
          
          console.log('[State] Delete operation enqueued for sync');
        }),
    }))
  );

  function assignGoalSortOrder(goals: Goal[]): Goal[] {
    // DO NOT sort here. Trust the array order coming from DnD.
    return goals.map((g, i) => ({
      ...g,
      sort_order: i,
    }));
  }

  // -----------------------------------------------------
  // INITIALIZATION — Load from Turso
  // -----------------------------------------------------
  export async function initializeAppState() {
    const store = useAppStore.getState();
    if (store.hydrated) return;
  
    store.setHydrated(); // 🔒 LOCK hydration immediately
  
    try {
      // Run migration from localStorage → Turso (once)
      const { migrateLocalStorageToTurso } = await import("@/db/migrate-localStorage");
      await migrateLocalStorageToTurso();

      const [
        taskRows,
        oneOnOneRows,
        peopleRows,
        goalRows,
        meetingSpaceRows,
        meetingRecordRows,
        spaceNoteRows,
        bloodworkRows,
        workoutRows,
        profileRows,
        knowledgeRows,
      ] = await Promise.all([
        db.select().from(tasksTable),
        db.select().from(oneOnOneTable),
        db.select().from(oneOnOnePeopleTable),
        db.select().from(goalsTable),
        db.select().from(meetingSpacesTable),
        db.select().from(meetingRecordsTable),
        db.select().from(spaceNotesTable),
        db.select().from(healthBloodworkTable),
        db.select().from(healthWorkoutsTable),
        db.select().from(healthProfileTable),
        db.select().from(productKnowledgeTable),
      ]);

      // Group 1:1 notes by person
      const grouped: Record<string, OneOnOneItem[]> = {};
      for (const row of oneOnOneRows) {
        const item = row as unknown as OneOnOneItem;
        (grouped[item.personId] ??= []).push(item);
      }

      // Build meeting spaces with their records and notes
      const meetingSpaces: MeetingSpace[] = meetingSpaceRows.map((spaceRow: any) => {
        const records = meetingRecordRows
          .filter((r: any) => r.spaceId === spaceRow.id)
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            transcript: r.transcript,
            notes: r.notes || undefined,
            meetingType: r.meetingType as "normal" | "discovery" | undefined,
            insight: r.insight ? JSON.parse(r.insight) : undefined,
            createdAt: r.createdAt,
          }));

        const notes = spaceNoteRows
          .filter((n: any) => n.spaceId === spaceRow.id)
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          }));

        return {
          id: spaceRow.id,
          name: spaceRow.name,
          description: spaceRow.description,
          category: spaceRow.category as "tech" | "architecture" | "leadership" | "client",
          color: spaceRow.color,
          sortOrder: spaceRow.sortOrder ?? 0,
          records,
          spaceNotes: notes,
        };
      });

      // Sort meeting spaces by sortOrder (nulls last)
      meetingSpaces.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

      // Auto-assign sortOrder if any spaces are missing it (one-time fix)
      const needsSortOrder = meetingSpaces.some((s) => s.sortOrder == null);
      if (needsSortOrder) {
        console.log('[Init] Auto-assigning sortOrder to meeting spaces...');
        for (let i = 0; i < meetingSpaces.length; i++) {
          if (meetingSpaces[i].sortOrder == null) {
            meetingSpaces[i].sortOrder = i;
            // Update in database
            await db.update(meetingSpacesTable)
              .set({ sortOrder: i })
              .where(eq(meetingSpacesTable.id, meetingSpaces[i].id));
          }
        }
      }

      // Build health data
      const healthData: HealthData = {
        bloodWorkRecords: bloodworkRows.map((r: any) => ({
          id: r.id,
          date: r.date,
          labName: r.labName || undefined,
          sourceType: r.sourceType as "pdf" | "image" | "manual",
          sourceFileName: r.sourceFileName || undefined,
          labValues: JSON.parse(r.labValues),
          aiAnalysis: r.aiAnalysis || undefined,
          aiFlags: r.aiFlags ? JSON.parse(r.aiFlags) : undefined,
          notes: r.notes || undefined,
          createdAt: r.createdAt,
        })),
        workoutRecords: workoutRows.map((r: any) => ({
          id: r.id,
          date: r.date,
          type: r.type as "run" | "treadmill" | "bike" | "walk" | "other",
          distance: r.distance || undefined,
          duration: r.duration || undefined,
          pace: r.pace || undefined,
          calories: r.calories || undefined,
          sourceType: r.sourceType as "image" | "manual",
          sourceFileName: r.sourceFileName || undefined,
          notes: r.notes || undefined,
          createdAt: r.createdAt,
        })),
        personalProfile: profileRows.length > 0 ? {
          dateOfBirth: profileRows[0].dateOfBirth || undefined,
          sex: profileRows[0].sex as "male" | "female" | "other" | undefined,
          weight: profileRows[0].weight || undefined,
          height: profileRows[0].height || undefined,
        } : undefined,
      };

      // Build product knowledge items
      const productKnowledge: ProductKnowledgeItem[] = knowledgeRows.map((r: any) => ({
        id: r.id,
        title: r.title,
        type: r.type as 'note' | 'document',
        content: r.content || undefined,
        fileData: r.fileData || undefined,
        fileName: r.fileName || undefined,
        fileType: r.fileType || undefined,
        fileSize: r.fileSize || undefined,
        tags: r.tags ? JSON.parse(r.tags) : undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      useAppStore.setState((s) => {
        s.tasks = taskRows as Task[];
        s.goals = (goalRows as Goal[]).sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        s.people = (peopleRows as OneOnOnePerson[]).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        s.oneOnOnes = grouped;
        s.meetingSpaces = meetingSpaces;
        s.healthData = healthData;
        s.productKnowledge = productKnowledge;
        s.hydrated = true;
      });
    } catch (err) {
      console.error("Failed to initialize app state:", err);
    }
  }

  // Devtools helper
  // @ts-ignore
  (window as any).store = useAppStore;