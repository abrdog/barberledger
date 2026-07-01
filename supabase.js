const supabaseUrl = "https://nqjnbogxthoxlqhxlffg.supabase.co";
const supabaseKey = "sb_publishable_5E6buSxFuSqEu8TAxaMvhQ_RHo8hXx6";
const { createClient } = supabase;

// Глобальный клиент для доступа из всех скриптов
window.supabaseClient = createClient(supabaseUrl, supabaseKey);