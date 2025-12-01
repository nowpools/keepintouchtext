-- Create a table for label cadence settings
CREATE TABLE public.label_settings (
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

-- Enable Row Level Security
ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own label settings" 
ON public.label_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own label settings" 
ON public.label_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own label settings" 
ON public.label_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own label settings" 
ON public.label_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_label_settings_updated_at
BEFORE UPDATE ON public.label_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();