-- Create trigger to auto-create user_integrations row on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_integrations
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_integrations();

-- Ensure existing users have a user_integrations row
INSERT INTO public.user_integrations (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_integrations)
ON CONFLICT (user_id) DO NOTHING;