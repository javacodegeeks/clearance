// IndexedDB storage for AI conversation history and tasks
// Each user's conversations and tasks are stored in their browser

import type { Mission, MissionCacheEntry } from '@/lib/types/github';

const DB_NAME = 'pr-dashboard';
const DB_VERSION = 3; // Incremented for missions store
const CONVERSATIONS_STORE = 'ai_conversations';
const TASKS_STORE = 'tasks';
const MISSIONS_STORE = 'missions';

export interface AIMessage {
  id?: number;
  pr_number: number;
  repository: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number; // timestamp
}

export interface Task {
  id?: number;
  pr_number: number;
  repository: string;
  description: string;
  completed: boolean;
  created_at: number; // timestamp
  completed_at?: number; // timestamp when completed
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create conversations store if it doesn't exist
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Create index for querying by PR
        store.createIndex('pr_repo', ['pr_number', 'repository'], { unique: false });
        store.createIndex('repository', 'repository', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Create tasks store if it doesn't exist
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const store = db.createObjectStore(TASKS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Create index for querying by PR
        store.createIndex('pr_repo', ['pr_number', 'repository'], { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Create missions store if it doesn't exist
      if (!db.objectStoreNames.contains(MISSIONS_STORE)) {
        const store = db.createObjectStore(MISSIONS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });

        // Create index for querying by PR
        store.createIndex('pr_repo', ['pr_number', 'repository'], { unique: false });
        store.createIndex('repository', 'repository', { unique: false });
        store.createIndex('generated_at', 'generated_at', { unique: false });
      }
    };
  });
}

export async function saveMessage(message: Omit<AIMessage, 'id' | 'created_at'>): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    const messageWithTimestamp: Omit<AIMessage, 'id'> = {
      ...message,
      created_at: Date.now(),
    };

    const request = store.add(messageWithTimestamp);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getConversation(
  prNumber: number,
  repository: string
): Promise<AIMessage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('pr_repo');

    const request = index.getAll([prNumber, repository]);

    request.onsuccess = () => {
      const messages = request.result as AIMessage[];
      // Sort by created_at to maintain order
      messages.sort((a, b) => a.created_at - b.created_at);
      resolve(messages);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function deleteConversation(
  prNumber: number,
  repository: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('pr_repo');

    const request = index.openCursor([prNumber, repository]);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

export async function getPRsWithConversations(): Promise<
  Array<{ pr_number: number; repository: string; message_count: number; last_updated: number }>
> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const messages = request.result as AIMessage[];

      // Group by PR
      const prMap = new Map<string, { messages: AIMessage[] }>();

      messages.forEach((msg) => {
        const key = `${msg.pr_number}:${msg.repository}`;
        if (!prMap.has(key)) {
          prMap.set(key, { messages: [] });
        }
        prMap.get(key)!.messages.push(msg);
      });

      // Convert to result format
      const result = Array.from(prMap.entries()).map(([key, data]) => {
        const [prNumber, repository] = key.split(':');
        const lastMessage = data.messages.reduce((latest, msg) =>
          msg.created_at > latest.created_at ? msg : latest
        );

        return {
          pr_number: parseInt(prNumber),
          repository,
          message_count: data.messages.length,
          last_updated: lastMessage.created_at,
        };
      });

      resolve(result);
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function clearAllConversations(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

// ===== Task Management =====

export async function saveTask(task: Omit<Task, 'id' | 'created_at'>): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASKS_STORE], 'readwrite');
    const store = transaction.objectStore(TASKS_STORE);

    const taskWithTimestamp: Omit<Task, 'id'> = {
      ...task,
      created_at: Date.now(),
    };

    const request = store.add(taskWithTimestamp);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getTasks(
  prNumber: number,
  repository: string
): Promise<Task[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASKS_STORE], 'readonly');
    const store = transaction.objectStore(TASKS_STORE);
    const index = store.index('pr_repo');

    const request = index.getAll([prNumber, repository]);

    request.onsuccess = () => {
      const tasks = request.result as Task[];
      // Sort by created_at (newest first)
      tasks.sort((a, b) => b.created_at - a.created_at);
      resolve(tasks);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASKS_STORE], 'readwrite');
    const store = transaction.objectStore(TASKS_STORE);

    const getRequest = store.get(taskId);

    getRequest.onsuccess = () => {
      const task = getRequest.result as Task;
      if (!task) {
        reject(new Error('Task not found'));
        return;
      }

      const updatedTask = { ...task, ...updates };
      const putRequest = store.put(updatedTask);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASKS_STORE], 'readwrite');
    const store = transaction.objectStore(TASKS_STORE);

    const request = store.delete(taskId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getTaskCounts(
  prs: Array<{ pr_number: number; repository: string }>
): Promise<Map<string, number>> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TASKS_STORE], 'readonly');
    const store = transaction.objectStore(TASKS_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      const allTasks = request.result as Task[];
      const counts = new Map<string, number>();

      prs.forEach(pr => {
        const key = `${pr.pr_number}:${pr.repository}`;
        const prTasks = allTasks.filter(
          task => task.pr_number === pr.pr_number && task.repository === pr.repository && !task.completed
        );
        if (prTasks.length > 0) {
          counts.set(key, prTasks.length);
        }
      });

      resolve(counts);
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

// ===== Mission Management =====

export async function saveMissions(
  prNumber: number,
  repository: string,
  missions: Mission[],
  prUpdatedAt: string
): Promise<void> {
  // First delete existing missions
  await deleteMissions(prNumber, repository);

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MISSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MISSIONS_STORE);

    const cacheEntry: Omit<MissionCacheEntry, 'id'> = {
      pr_number: prNumber,
      repository,
      missions,
      generated_at: Date.now(),
      pr_updated_at: prUpdatedAt,
    };

    const request = store.add(cacheEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getMissions(
  prNumber: number,
  repository: string
): Promise<MissionCacheEntry | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MISSIONS_STORE], 'readonly');
    const store = transaction.objectStore(MISSIONS_STORE);
    const index = store.index('pr_repo');

    const request = index.getAll([prNumber, repository]);

    request.onsuccess = () => {
      const entries = request.result as MissionCacheEntry[];

      if (entries.length === 0) {
        resolve(null);
      } else {
        // Return the most recent entry (in case there are duplicates)
        entries.sort((a, b) => b.generated_at - a.generated_at);
        resolve(entries[0]);
      }
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function updateMissionStatus(
  prNumber: number,
  repository: string,
  missionId: string,
  status: 'pending' | 'complete' | 'skipped'
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MISSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MISSIONS_STORE);
    const index = store.index('pr_repo');

    const getRequest = index.getAll([prNumber, repository]);

    getRequest.onsuccess = () => {
      const entries = getRequest.result as MissionCacheEntry[];

      if (entries.length === 0) {
        reject(new Error('Missions not found'));
        return;
      }

      // Get the most recent entry
      entries.sort((a, b) => b.generated_at - a.generated_at);
      const entry = entries[0];

      // Update the specific mission
      const updatedMissions = entry.missions.map(mission =>
        mission.id === missionId ? { ...mission, status } : mission
      );

      const updatedEntry = { ...entry, missions: updatedMissions };
      const putRequest = store.put(updatedEntry);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function deleteMissions(
  prNumber: number,
  repository: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MISSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(MISSIONS_STORE);
    const index = store.index('pr_repo');

    const request = index.openCursor([prNumber, repository]);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}
