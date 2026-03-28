import { supabase } from "@/integrations/supabase/client";

interface CalendarEventData {
  title: string;
  description?: string | null;
  date: string; // yyyy-MM-dd
}

export async function createGoogleCalendarEvent(data: CalendarEventData): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const providerToken = sessionData?.session?.provider_token;

  if (!providerToken) {
    console.log("Google Calendar sync skipped: no provider_token available");
    return false;
  }

  const event = {
    summary: data.title,
    description: data.description || undefined,
    start: { date: data.date },
    end: { date: data.date },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn("Google Calendar API error:", response.status, errorBody);
    return false;
  }

  return true;
}
