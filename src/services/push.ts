import { supabase } from "@/integrations/supabase/client";

export async function sendTestPushNotification(userId: string) {
  const { data, error } = await supabase.functions.invoke("send-push", {
    body: {
      userId,
      title: "Zenit: Tudo pronto! 🚀",
      body: "As notificações Push estão configuradas e a funcionar no seu dispositivo.",
      url: "/",
    },
  });

  if (error) throw error;
  return data;
}
