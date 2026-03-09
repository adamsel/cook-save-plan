import { supabase } from '@/integrations/supabase/client';

export async function uploadRecipeImage(
  userId: string,
  recipeId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${recipeId}.${ext}`;

  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, file, { upsert: true });

  if (error) return null;

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path);

  return `${publicUrl}?t=${Date.now()}`;
}
