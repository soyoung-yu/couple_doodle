// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Supabase 콘솔 → Project Settings → API 에서 아래 2개 복사
const SUPABASE_URL = 'https://yedjqqdbgramzlllwckd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZGpxcWRiZ3JhbXpsbGx3Y2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjA3ODAsImV4cCI6MjA3NzgzNjc4MH0.C6OviKdFrbDuFWtwBioge1ufms1j2JiXODgZ11wqQy4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)