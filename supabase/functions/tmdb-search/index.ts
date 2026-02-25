import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TMDB_ACCESS_TOKEN = Deno.env.get("TMDB_ACCESS_TOKEN");
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!TMDB_ACCESS_TOKEN) {
      throw new Error("TMDB_ACCESS_TOKEN not configured");
    }

    // Search both movies and TV shows
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter to only movies and TV shows, format response
    const results = data.results
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 10)
      .map((item: any) => ({
        id: item.id,
        title: item.media_type === "movie" ? item.title : item.name,
        media_type: item.media_type,
        year: item.media_type === "movie"
          ? item.release_date?.split("-")[0] || null
          : item.first_air_date?.split("-")[0] || null,
        poster_path: item.poster_path
          ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
          : null,
      }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TMDB search error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
