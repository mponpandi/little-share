import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestData {
  id: string;
  message: string | null;
  receiver_name: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id } = await req.json();

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: "item_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all pending requests for this item with receiver profiles
    const { data: requests, error: fetchError } = await supabase
      .from("requests")
      .select(`
        id,
        message,
        created_at,
        profiles:receiver_id(full_name)
      `)
      .eq("item_id", item_id)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching requests:", fetchError);
      throw new Error("Failed to fetch requests");
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ rankings: [], message: "No pending requests to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare request data for AI analysis
    const requestsForAnalysis: RequestData[] = requests.map((r: any) => ({
      id: r.id,
      message: r.message || "No message provided",
      receiver_name: r.profiles?.full_name || "Anonymous",
      created_at: r.created_at,
    }));

    // Call Lovable AI for analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes donation requests to help donors make fair decisions.
            
Your task is to analyze each request message and score them based on:
1. **Emotional Intensity** (0-30): How genuine and heartfelt is the message? Does it convey real need?
2. **Urgency Indicators** (0-30): Look for keywords like: poor, exam, student, orphan, flood, fire, medical, emergency, urgent, homeless, single parent, disabled, etc.
3. **Clarity & Detail** (0-20): Is the explanation clear? Does it explain why they need the item?
4. **Specificity** (0-20): Does the message mention specific circumstances or just generic requests?

Total score is out of 100. Be fair and unbiased. Empty or very short messages should get low scores (10-20).
            
Analyze the requests and return a JSON array with rankings.`
          },
          {
            role: "user",
            content: `Analyze these donation requests and rank them by genuine need:

${requestsForAnalysis.map((r, i) => `Request ${i + 1} (ID: ${r.id}):
- From: ${r.receiver_name}
- Message: "${r.message}"
`).join("\n")}

Return a JSON object with this exact structure:
{
  "rankings": [
    {
      "request_id": "uuid",
      "score": 85,
      "emotional_score": 25,
      "urgency_score": 28,
      "clarity_score": 17,
      "specificity_score": 15,
      "summary": "Brief explanation of why this request ranked here"
    }
  ]
}

Order the rankings array from highest score to lowest.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the AI response - extract JSON from the response
    let rankings;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        rankings = parsed.rankings;
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis");
    }

    // Merge rankings with original request data
    const enrichedRankings = rankings.map((ranking: any) => {
      const originalRequest = requestsForAnalysis.find(r => r.id === ranking.request_id);
      return {
        ...ranking,
        receiver_name: originalRequest?.receiver_name || "Unknown",
        message: originalRequest?.message || "",
      };
    });

    return new Response(
      JSON.stringify({ 
        rankings: enrichedRankings,
        total_analyzed: requests.length,
        analysis_timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-requests:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
