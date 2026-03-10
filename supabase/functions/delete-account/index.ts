import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deleteUserBucketFolder(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string
): Promise<void> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(userId, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list ${bucket} files: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    const paths = data
      .filter((file) => file.name && file.name !== ".emptyFolderPlaceholder")
      .map((file) => `${userId}/${file.name}`);

    if (paths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (removeError) {
        throw new Error(`Failed to delete ${bucket} files: ${removeError.message}`);
      }
    }

    if (data.length < limit) {
      break;
    }
    offset += limit;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await deleteUserBucketFolder(supabaseAdmin, "videos", user.id);
    await deleteUserBucketFolder(supabaseAdmin, "thumbnails", user.id);
    await deleteUserBucketFolder(supabaseAdmin, "avatars", user.id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to delete account",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
