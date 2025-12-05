import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./today.module.css";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    setLoading(true);
    setError(null);

    try {
      // Get today's date range (start and end of today)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .neq("status", "completed")
        .gte("due_at", startOfDay.toISOString())
        .lte("due_at", endOfDay.toISOString())
        .order("due_at", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Optimistically update the UI
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div className={styles["dashboard-error"]}>{error}</div>;

  return (
    <main className={styles["dashboard-main"]}>
      <h1>Today&apos;s Tasks</h1>
      {tasks.length === 0 && <p>No tasks due today 🎉</p>}

      {tasks.length > 0 && (
        <table className={styles["dashboard-table"]}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Application</th>
              <th>Due At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td className={styles["task-type-cell"]}>{t.type}</td>
                <td className={styles["task-app-cell"]}>
                  {t.application_id.substring(0, 8)}...
                </td>
                <td>{new Date(t.due_at).toLocaleString()}</td>
                <td className={styles["task-status-cell"]}>{t.status}</td>
                <td>
                  {t.status !== "completed" && (
                    <button
                      onClick={() => markComplete(t.id)}
                      className={styles["mark-complete-button"]}
                    >
                      Mark Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}