-- Drop existing tables that will be replaced
DROP TABLE IF EXISTS public.contact_history CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.label_settings CASCADE;

-- Create enum types
CREATE TYPE contact_source AS ENUM ('apple', 'google', 'app');
CREATE TYPE sync_direction AS ENUM ('pull', 'push');
CREATE TYPE sync_status AS ENUM ('pending', 'processing', 'success', 'failed');
CREATE TYPE contacts_permission AS ENUM ('unknown', 'granted', 'denied');
CREATE TYPE conflict_resolution_preference AS ENUM ('apple', 'google', 'ask');

-- Create app_contacts table (unified contact record)
CREATE TABLE public.app_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source_preference contact_source DEFAULT 'app',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create contact_links table (links app contacts to external sources)
CREATE TABLE public.contact_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_contact_id UUID NOT NULL REFERENCES public.app_contacts(id) ON DELETE CASCADE,
  source contact_source NOT NULL,
  external_id TEXT NOT NULL,
  external_etag TEXT,
  last_pulled_at TIMESTAMP WITH TIME ZONE,
  last_pushed_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(app_contact_id, source)
);

-- Create user_integrations table (per-user sync settings and tokens)
CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMP WITH TIME ZONE,
  google_sync_token TEXT,
  apple_contacts_permission contacts_permission DEFAULT 'unknown',
  apple_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  apple_visible BOOLEAN NOT NULL DEFAULT true,
  google_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  google_visible BOOLEAN NOT NULL DEFAULT true,
  conflict_preference conflict_resolution_preference DEFAULT 'ask',
  last_sync_apple TIMESTAMP WITH TIME ZONE,
  last_sync_google TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_queue table (pending sync operations)
CREATE TABLE public.sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source contact_source NOT NULL,
  direction sync_direction NOT NULL,
  app_contact_id UUID REFERENCES public.app_contacts(id) ON DELETE CASCADE,
  external_id TEXT,
  payload JSONB,
  status sync_status NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_profiles table (for auth user metadata)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  apple_sub TEXT,
  google_sub TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.app_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_contacts
CREATE POLICY "Users can view their own contacts" ON public.app_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" ON public.app_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON public.app_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON public.app_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contact_links (via app_contact ownership)
CREATE POLICY "Users can view their contact links" ON public.contact_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.app_contacts WHERE id = app_contact_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create their contact links" ON public.contact_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_contacts WHERE id = app_contact_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their contact links" ON public.contact_links
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.app_contacts WHERE id = app_contact_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their contact links" ON public.contact_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.app_contacts WHERE id = app_contact_id AND user_id = auth.uid())
  );

-- RLS policies for user_integrations
CREATE POLICY "Users can view their own integrations" ON public.user_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations" ON public.user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" ON public.user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for sync_queue
CREATE POLICY "Users can view their sync queue" ON public.sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sync queue items" ON public.sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their sync queue items" ON public.sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their sync queue items" ON public.sync_queue
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_app_contacts_updated_at
  BEFORE UPDATE ON public.app_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_contact_links_updated_at
  BEFORE UPDATE ON public.contact_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sync_queue_updated_at
  BEFORE UPDATE ON public.sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to initialize user_integrations on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_integrations()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_integrations (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to initialize user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for new users
CREATE TRIGGER on_auth_user_created_integrations
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_integrations();

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Create indexes for performance
CREATE INDEX idx_app_contacts_user_id ON public.app_contacts(user_id);
CREATE INDEX idx_app_contacts_deleted_at ON public.app_contacts(deleted_at);
CREATE INDEX idx_contact_links_app_contact_id ON public.contact_links(app_contact_id);
CREATE INDEX idx_contact_links_source ON public.contact_links(source);
CREATE INDEX idx_contact_links_external_id ON public.contact_links(external_id);
CREATE INDEX idx_sync_queue_user_id ON public.sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON public.sync_queue(status);