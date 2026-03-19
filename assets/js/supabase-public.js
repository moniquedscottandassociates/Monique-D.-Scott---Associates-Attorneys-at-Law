/**
 * supabase-public.js
 * Initialises the public (anon) Supabase client used by frontend pages.
 * Exposes window.mdsDb for use in cms-renderer.js.
 */
(function () {
  var SUPABASE_URL     = 'https://efvnklokllobqsoripxy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdm5rbG9rbGxvYnFzb3JpcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODk2MTUsImV4cCI6MjA4OTQ2NTYxNX0.ALq-QLhQqCb2FXciB46FY1wxLc_F5DvL8U5EpW_XOn8';
  window.mdsDb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
