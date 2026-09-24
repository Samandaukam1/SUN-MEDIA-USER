import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const key = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;
if (!url || !key) throw new Error('Supabase public konfiguratsiyasi topilmadi. .env faylini sozlang.');
export const supabase = createClient(url, key);
