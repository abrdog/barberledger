const supabaseUrl = "https://nqjnbogxthoxlqhxlffg.supabase.co";
const supabaseKey = "sb_publishable_5E6buSxFuSqEu8TAxaMvhQ_RHo8hXx6";
const { createClient } = supabase;

// Глобальный клиент для доступа из всех скриптов
window.supabaseClient = createClient(supabaseUrl, supabaseKey);

async function saveDataToSupabase(payload) {
  const { data, error } = await window.supabaseClient
    .from('peon')
    .insert([
      {
        sum: payload.sum,
        hours: payload.hours,
        bonus: payload.bonus,
        brut: payload.brut,
        net: payload.net,
        hourly_rate: payload.hourly_rate,
        com: payload.com // Сохранение комиссии
      }
    ]);

  if (error) {
    console.error('Database Error:', error.message);
    alert('Error: ' + error.message);
    return null;
  }
  return data;
}