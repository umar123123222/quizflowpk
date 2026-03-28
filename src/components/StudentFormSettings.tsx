import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, ClipboardList, Plus, Trash2, X } from "lucide-react";
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

interface CustomField {
  id: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  dropdown_options: string[];
  sort_order: number;
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

  // Add custom field form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newDropdownOptions, setNewDropdownOptions] = useState("");

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

  const { data: customFields = [], isLoading: loadingCustom } = useQuery({
    queryKey: ["custom-fields", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_custom_fields")
        .select("*")
        .eq("organization_id", org!.id)
        .order("sort_order", { ascending: true });
      return (data || []).map((f: any) => ({
        ...f,
        dropdown_options: Array.isArray(f.dropdown_options) ? f.dropdown_options : [],
      })) as CustomField[];
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
      toast({ title: "Saved", description: "Form settings updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: async () => {
      if (!org?.id) throw new Error("No organization found");
      if (!newLabel.trim()) throw new Error("Field label is required");

      const options =
        newType === "dropdown"
          ? newDropdownOptions.split(",").map((o) => o.trim()).filter(Boolean)
          : [];

      if (newType === "dropdown" && options.length < 2) {
        throw new Error("Dropdown needs at least 2 comma-separated options");
      }

      const { error } = await supabase.from("organization_custom_fields").insert({
        organization_id: org.id,
        field_label: newLabel.trim(),
        field_type: newType,
        is_required: newRequired,
        dropdown_options: options,
        sort_order: customFields.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      setNewLabel("");
      setNewType("text");
      setNewRequired(false);
      setNewDropdownOptions("");
      setShowAddForm(false);
      toast({ title: "Field added", description: "Custom field has been added." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from("organization_custom_fields")
        .delete()
        .eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Deleted", description: "Custom field removed." });
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
  const inputClass =
    "bg-[hsl(var(--dashboard-bg))] border-[hsl(var(--dashboard-border))] text-white/80 placeholder:text-white/20 focus-visible:ring-[hsl(var(--dashboard-gold)/0.4)]";
  const selectClass =
    "w-full rounded-md px-3 py-2 text-[12px] font-mono bg-[hsl(var(--dashboard-bg))] border border-[hsl(var(--dashboard-border))] text-white/80 outline-none focus:ring-1 focus:ring-[hsl(var(--dashboard-gold)/0.4)]";

  const defaultFields: { key: keyof FormSettings; label: string }[] = [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
  ];

  if (isLoading || loadingCustom) return null;

  return (
    <div className={sectionClass}>
      <div className="h-[2px] bg-[hsl(var(--dashboard-gold))]" />
      <div className={sectionHeaderClass}>
        <ClipboardList className="h-4 w-4 text-[hsl(var(--dashboard-gold))]" />
        <span className="font-mono text-[11px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
          Student Identification Form
        </span>
      </div>
      <div className="p-5 space-y-5">
        <p className="font-mono text-[9px] text-white/20">
          Configure which fields students see when taking your organization's exams
        </p>

        {/* Default fields table */}
        <div className="rounded-md border border-[hsl(var(--dashboard-border))] overflow-hidden">
          <div className="grid grid-cols-3 gap-4 px-4 py-2.5 bg-[hsl(var(--dashboard-bg))] border-b border-[hsl(var(--dashboard-border))]">
            <span className={labelClass}>Field</span>
            <span className={`${labelClass} text-center`}>Visible</span>
            <span className={`${labelClass} text-center`}>Required</span>
          </div>
          {defaultFields.map((f) => (
            <div
              key={f.key}
              className="grid grid-cols-3 gap-4 items-center px-4 py-3 border-b last:border-b-0 border-[hsl(var(--dashboard-border))]"
            >
              <span className="font-mono text-[11px] text-white/70">{f.label}</span>
              <div className="flex justify-center">
                <Switch
                  checked={settings[f.key].visible}
                  onCheckedChange={() => toggleVisible(f.key)}
                  disabled={f.key === "name"}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={settings[f.key].required}
                  onCheckedChange={() => toggleRequired(f.key)}
                  disabled={f.key === "name" || !settings[f.key].visible}
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

        {/* Custom Fields */}
        <div className="pt-4 border-t border-[hsl(var(--dashboard-border))] space-y-3">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Custom Fields</span>
            {!showAddForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase border-[hsl(var(--dashboard-border))] text-white/50 hover:text-white/80 hover:bg-[hsl(var(--dashboard-border))]"
              >
                <Plus className="h-3 w-3" /> Add Custom Field
              </Button>
            )}
          </div>

          {/* Existing custom fields */}
          {customFields.length > 0 && (
            <div className="rounded-md border border-[hsl(var(--dashboard-border))] overflow-hidden">
              {customFields.map((cf) => (
                <div
                  key={cf.id}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-[hsl(var(--dashboard-border))]"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-[11px] text-white/70">{cf.field_label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-white/30 capitalize">{cf.field_type}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${cf.is_required ? "bg-[hsl(var(--dashboard-gold)/0.15)] text-[hsl(var(--dashboard-gold))]" : "bg-white/5 text-white/30"}`}>
                        {cf.is_required ? "Required" : "Optional"}
                      </span>
                    </div>
                    {cf.field_type === "dropdown" && cf.dropdown_options.length > 0 && (
                      <p className="font-mono text-[9px] text-white/20">
                        Options: {cf.dropdown_options.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteFieldMutation.mutate(cf.id)}
                    className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Delete field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {customFields.length === 0 && !showAddForm && (
            <p className="font-mono text-[9px] text-white/20 text-center py-3">
              No custom fields added yet
            </p>
          )}

          {/* Add custom field form */}
          {showAddForm && (
            <div className="rounded-md border border-[hsl(var(--dashboard-gold)/0.3)] bg-[hsl(var(--dashboard-bg))] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-wider uppercase text-[hsl(var(--dashboard-gold))] font-semibold">
                  New Custom Field
                </span>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-white/20 hover:text-white/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Field Label</label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Roll Number, Department"
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Field Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className={selectClass}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>

              {newType === "dropdown" && (
                <div className="space-y-2">
                  <label className={labelClass}>Dropdown Options (comma-separated)</label>
                  <Input
                    value={newDropdownOptions}
                    onChange={(e) => setNewDropdownOptions(e.target.value)}
                    placeholder="e.g. CS, IT, BBA, Accounting"
                    className={inputClass}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  checked={newRequired}
                  onCheckedChange={setNewRequired}
                />
                <span className="font-mono text-[11px] text-white/60">
                  {newRequired ? "Required" : "Optional"}
                </span>
              </div>

              <Button
                onClick={() => addFieldMutation.mutate()}
                disabled={addFieldMutation.isPending || !newLabel.trim()}
                className="flex items-center gap-2 bg-[hsl(var(--dashboard-gold))] text-[hsl(var(--dashboard-bg))] font-mono text-[11px] tracking-wider uppercase font-bold hover:bg-[hsl(var(--dashboard-gold)/0.85)]"
              >
                {addFieldMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {addFieldMutation.isPending ? "Adding..." : "Add Field"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFormSettings;
