-- Re-create label_settings table (for category cadence definitions)
CREATE TABLE IF NOT EXISTS public.label_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label_name TEXT NOT NULL,
  description TEXT,
  cadence_days INTEGER NOT NULL DEFAULT 30,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, label_name)
);

-- Re-create contact_history table (for tracking contact completions)
CREATE TABLE IF NOT EXISTS public.contact_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  label TEXT,
  notes TEXT,
  cadence TEXT,
  reason TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for label_settings
CREATE POLICY "Users can view their own label settings" ON public.label_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own label settings" ON public.label_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own label settings" ON public.label_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own label settings" ON public.label_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contact_history
CREATE POLICY "Users can view their own contact history" ON public.contact_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contact history" ON public.contact_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact history" ON public.contact_history
  FOR DELETE USING (auth.uid() = user_id);

-- Apply updated_at trigger to label_settings
CREATE TRIGGER update_label_settings_updated_at
  BEFORE UPDATE ON public.label_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();