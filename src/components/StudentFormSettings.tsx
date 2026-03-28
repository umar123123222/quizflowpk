import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FormFieldConfig {
  visible: boolean;
  required: boolean;
}

interface FormSettings {
  name: FormFieldConfig;
  email: FormFieldConfig;
  phone: FormFieldConfig;
}

const defaultSettings: FormSettings = {
  name: { visible: true, required: true },
  email: { visible: true, required: true },
  phone: { visible: true, required: true },
};

const StudentFormSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FormSettings>(defaultSettings);

  // Get org id
  const { data: org } = useQuery({
    queryKey: ["owner-org", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["form-settings", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_form_settings")
        .select("*")
        .eq("organization_id", org!.id)
        .single();
      return data;
    },
    enabled: !!org?.id,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        name: { visible: existingSettings.name_visible, required: existingSettings.name_required },
        email: { visible: existingSettings.email_visible, required: existingSettings.email_required },
        phone: { visible: existingSettings.phone_visible, required: existingSettings.phone_required },
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!org?.id) throw new Error("No organization found");

      const payload = {
        organization_id: org.id,
        name_visible: settings.name.visible,
        name_required: settings.name.required,
        email_visible: settings.email.visible,
        email_required: settings.email.required,
        phone_visible: settings.phone.visible,
        phone_required: settings.phone.required,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        const { error } = await supabase
          .from("organization_form_settings")
          .update(payload)
          .eq("organization_id", org.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_form_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-settings"] });
      toast({ title: "Saved", description: "Student identification form settings updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleVisible = (field: keyof FormSettings) => {
    setSettings((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        visible: !prev[field].visible,
        // If hiding, also make it not required
        required: !prev[field].visible ? prev[field].required : false,
      },
    }));
  };

  const toggleRequired = (field: keyof FormSettings) => {
    setSettings((prev) => ({
      ...prev,
      [field]: { ...prev[field], required: !prev[field].required },
    }));
  };

  const sectionClass =
    "rounded-lg border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-card))] overflow-hidden";
  const sectionHeaderClass =
    "flex items-center gap-2.5 px-5 py-4 border-b border-[hsl(var(--dashboard-border))]";
  const labelClass = "font-mono text-[10px] tracking-[0.15em] uppercase text-white/35";

  const fields: { key: keyof FormSettings; label: string }[] = [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
  ];

  if (isLoading) return null;

  return (
    <div className={sectionClass}>
      <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
      <div className={sectionHeaderClass}>
        <ClipboardList className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
        <span className="font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
          Student Identification Form
        </span>
      </div>
      <div className="p-5 space-y-4">
        <p className="font-mono text-[9px] text-white/20">
          Configure which fields students see when taking your organization's exams
        </p>

        <div className="rounded-md border border-[hsl(var(--dashboard-border))] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 px-4 py-2.5 bg-[hsl(var(--dashboard-bg))] border-b border-[hsl(var(--dashboard-border))]">
            <span className={labelClass}>Field</span>
            <span className={`${labelClass} text-center`}>Visible</span>
            <span className={`${labelClass} text-center`}>Required</span>
          </div>

          {fields.map((f) => (
            <div
              key={f.key}
              className="grid grid-cols-3 gap-4 items-center px-4 py-3 border-b last:border-b-0 border-[hsl(var(--dashboard-border))]"
            >
              <span className="font-mono text-[11px] text-white/70">{f.label}</span>
              <div className="flex justify-center">
                <Switch
                  checked={settings[f.key].visible}
                  onCheckedChange={() => toggleVisible(f.key)}
                  disabled={f.key === "name"} // Name always visible
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={settings[f.key].required}
                  onCheckedChange={() => toggleRequired(f.key)}
                  disabled={f.key === "name" || !settings[f.key].visible} // Name always required, hidden fields can't be required
                />
              </div>
            </div>
          ))}
        </div>

        <p className="font-mono text-[9px] text-white/20">
          Name is always visible and required. Hidden fields won't appear on the student form.
        </p>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-mono text-[11px] tracking-wider uppercase font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saveMutation.isPending ? "Saving..." : "Save Form Settings"}
        </Button>
      </div>
    </div>
  );
};

export default StudentFormSettings;
