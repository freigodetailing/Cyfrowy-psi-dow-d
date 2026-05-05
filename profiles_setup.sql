-- Tabela profili użytkowników
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Włącz RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Polisa: Użytkownicy mogą czytać wszystkie profile (potrzebne do wyświetlania imienia partnera)
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT 
USING (true);

-- Polisa: Użytkownicy mogą aktualizować tylko swój własny profil
CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Polisa: Użytkownicy mogą wkładać tylko swój własny profil
CREATE POLICY "Users can insert own profile." 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Funkcja automatycznie tworząca profil przy rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger do funkcji powyżej
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
