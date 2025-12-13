import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const ll = searchParams.get("ll")
  const categories = searchParams.get("categories") 
  const radius = searchParams.get("radius") || "5000"
  const limit = searchParams.get("limit") || "10"

  const apiKey = process.env.FOURSQUARE_API_KEY 

  // --- DEBUG LOG 1: Check Key Status ---
  console.log("--- Foursquare Debug Info ---");
  console.log(`API Key Status: ${apiKey ? 'Loaded' : 'MISSING'}`);
  if (apiKey) {
    console.log(`API Key Length: ${apiKey.length}`); 
  } else {
    // If key is missing, return the error immediately
    return NextResponse.json(
      { message: "Missing Foursquare API key (Check .env file and server restart)" },
      { status: 500 }
    )
  }
  
  if (!ll || !categories) {
      return NextResponse.json(
          { message: "Missing required parameters: 'll' or 'categories'" },
          { status: 400 }
      );
  }
  
  // 🚨 CRITICAL FIX: Prepend 'Bearer ' to the API Key value
  const authorizationHeader = `Bearer ${apiKey}`;
  
  const fsqResponse = await fetch(
    `https://places-api.foursquare.com/places/search?ll=${ll}&fsq_category_ids=${categories}&radius=${radius}&limit=${limit}`,
    {
      headers: {
        // 🟢 FIXED: Using the Bearer token format
        Authorization: authorizationHeader, 
        
        "X-Places-Api-Version": "2025-06-17",
        Accept: "application/json",
      },
    }
  );

  const data = await fsqResponse.json().catch(() => ({ 
      message: "Could not parse JSON response from Foursquare" 
  }));

  // --- DEBUG LOG 2: Log Response Status and Details ---
  console.log(`Foursquare API Status: ${fsqResponse.status}`);
  
  if (!fsqResponse.ok) {
    console.error("Foursquare API Error Details:", data);
    
    // Check for the known credit/billing issue (the final potential problem)
    if (data.message && data.message.includes("no API credits remaining")) {
        return NextResponse.json(data, { status: 403 }); 
    }
    
    // Return the specific Foursquare error
    return NextResponse.json(data, { status: fsqResponse.status });
  }

  // --- DEBUG LOG 3: Log Success ---
  console.log("Foursquare API Success: Data received.");
  console.log("--- End Foursquare Debug Info ---");
  
  return NextResponse.json(data)
}
