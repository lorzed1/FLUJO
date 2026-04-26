import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csaawhhzqaedvdvqtzjs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYWF3aGh6cWFlZHZkdnF0empzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM5ODgsImV4cCI6MjA4NjU4OTk4OH0.4xXmVA_IuBm3bdbwtHJmoizToPcDOZv_1tsSf3xpJjE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error, status, statusText } = await supabase
        .from('reconciliation_history')
        .insert([{
            source_table: 'accounting_cta_natalia',
            source_record_id: '5fb11f15-6122-489b-9504-6700502959d7',
            target_record_id: '1044db5c-b370-4d80-9160-3ce81d01b6d9',
            match_type: 'auto',
            score: 100,
            status: 'active'
        }])
        .select();
    
    console.log('Error:', error);
    console.log('Status:', status, statusText);
    console.log('Data:', data);
}

test();
