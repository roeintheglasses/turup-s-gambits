import { createClient, SupabaseClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Use a global variable to store the client instance
// This ensures we only create one instance across the entire application
let supabaseInstance: SupabaseClient | undefined;

// Use a global variable to track if we've warned about multiple imports
let hasWarnedAboutMultipleImports = false;

function getSupabaseClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    // Check if we already have an instance in the global window object
    if ((window as any).__SUPABASE_INSTANCE__) {
      return (window as any).__SUPABASE_INSTANCE__;
    }
  }

  if (supabaseInstance) {
    // If we're creating a second instance through normal imports, warn once
    if (!hasWarnedAboutMultipleImports && typeof window !== "undefined") {
      console.warn(
        "[Supabase] Using cached Supabase instance to prevent duplicates"
      );
      hasWarnedAboutMultipleImports = true;
    }
    return supabaseInstance;
  }

  // Create a new instance
  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  // Store in global window object for cross-module access
  if (typeof window !== "undefined") {
    (window as any).__SUPABASE_INSTANCE__ = supabaseInstance;
  }

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
