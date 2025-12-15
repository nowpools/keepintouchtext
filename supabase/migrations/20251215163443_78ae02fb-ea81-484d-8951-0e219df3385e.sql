-- Add birthday fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN birthday_month INTEGER CHECK (birthday_month >= 1 AND birthday_month <= 12),
ADD COLUMN birthday_day INTEGER CHECK (birthday_day >= 1 AND birthday_day <= 31),
ADD COLUMN birthday_year INTEGER;

-- Create user_streaks table for tracking daily completion streaks
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_streaks
CREATE POLICY "Users can view their own streak"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
ON public.user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
ON public.user_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- Create contact_history table for logging completions (for export)
CREATE TABLE public.contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_name TEXT NOT NULL,
  label TEXT,
  notes TEXT,
  cadence TEXT,
  reason TEXT, -- 'cadence', 'birthday', 'follow_up'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_history
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_history
CREATE POLICY "Users can view their own contact history"
ON public.contact_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact history"
ON public.contact_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact history"
ON public.contact_history FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for user_streaks updated_at
CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create streak record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$;

-- Trigger to auto-create streak on user creation
CREATE TRIGGER on_auth_user_created_streak
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_streak();