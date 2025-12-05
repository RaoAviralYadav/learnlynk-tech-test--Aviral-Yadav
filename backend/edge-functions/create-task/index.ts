// @ts-nocheck
// This is a Deno Edge Function. These errors are expected in VS Code's TypeScript checker
// which doesn't have Deno types. The code will run correctly in Deno/Supabase Edge Functions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // Validate required fields
    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: application_id, task_type, due_at" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate task_type
    if (!VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid task_type. Must be one of: ${VALID_TYPES.join(", ")}` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate due_at is a valid date and in the future
    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid due_at timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    if (dueDate <= now) {
      return new Response(
        JSON.stringify({ error: "due_at must be in the future" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify application exists and get tenant_id
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert task
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        tenant_id: application.tenant_id,
        type: task_type,
        due_at,
        status: "open",
        title: `${task_type.charAt(0).toUpperCase() + task_type.slice(1)} task`
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create task" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});