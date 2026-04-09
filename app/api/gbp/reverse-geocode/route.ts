import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface NominatimAddress {
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  state_district?: string;
  county?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResponse {
  address: NominatimAddress;
  display_name: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng query params required" },
        { status: 400 }
      );
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Clamp to valid ranges
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json(
        { error: "Coordinates out of range" },
        { status: 400 }
      );
    }

    const nominatimUrl = new URL(
      "https://nominatim.openstreetmap.org/reverse"
    );
    nominatimUrl.searchParams.set("lat", String(latNum));
    nominatimUrl.searchParams.set("lon", String(lngNum));
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("addressdetails", "1");

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "SEOContentAI/1.0 (business-info-autofill)",
        Accept: "application/json",
      },
      // Cache for 24h — same coordinates always return the same location
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NominatimResponse;
    const addr = data.address;

    // Nominatim uses different fields depending on location size
    const city =
      addr.city || addr.town || addr.village || addr.municipality || undefined;
    const stateRegion = addr.state || addr.state_district || undefined;
    const postalCode = addr.postcode || undefined;

    return NextResponse.json({
      success: true,
      data: { city, stateRegion, postalCode },
    });
  } catch (error) {
    console.error("[GBP reverse-geocode] Error:", error);
    return NextResponse.json(
      { error: "Failed to reverse geocode" },
      { status: 500 }
    );
  }
}
