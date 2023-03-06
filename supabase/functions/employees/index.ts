// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient,SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}

interface Employee {
  employee_id: number,
  first_name: string,
  last_name: string,
  email: string,
  phone_number: string,
  hire_date: string,
  job_id: number,
  salary: number,
  manager_id: number | null,
  department_id: number
}

async function getEmployees(supabaseClient: SupabaseClient) {
  const { data: employees, error } = await supabaseClient.from('employees').select(`job_id, first_name, last_name, jobs: job_id (job_title)`)
  if (error) throw error

  return new Response(JSON.stringify({ employees }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function getEmployee(supabaseClient: SupabaseClient, id: string) {
  const { data: employee, error } = await supabaseClient.from('employees').select('*').eq('employee_id', id)
  if (error) throw error

  return new Response(JSON.stringify({ employee }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function deleteEmployee(supabaseClient: SupabaseClient, id: string) {
  const { error } = await supabaseClient.from('employees').delete().eq('employee_id', id)
  if (error) throw error

  return new Response(JSON.stringify({}), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function createEmployee(supabaseClient: SupabaseClient, employee: Employee) {
  const { error } = await supabaseClient.from('employees').insert(employee)
  if (error) throw error

  return new Response(JSON.stringify({ employee }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function updateEmployee(supabaseClient: SupabaseClient, id: string, employee: Employee) {
  const { error } = await supabaseClient.from('employees').update(employee).eq('employee_id', id)
  if (error) throw error

  return new Response(JSON.stringify({ employee }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

serve(async (req) => {
  const { url, method } = req

  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {

    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const taskPattern = new URLPattern({ pathname: '/employees/:id' })
    const matchingPath = taskPattern.exec(url)
    const id = matchingPath ? matchingPath.pathname.groups.id : null

    let employee = null

    if (method === 'POST' || method === 'PUT') {
      const body = await req.json()
      employee = body.employees
    }

    switch (true) {
      case id && method === 'GET':
        return getEmployee(supabaseClient, id as string)
        break;
      
      case id && method === 'PUT':
        return updateEmployee(supabaseClient, id as string, employee)
        break;
      
      case id && method === 'DELETE':
        return deleteEmployee(supabaseClient, id as string)
        break;
      
      case method === 'POST':
        return createEmployee(supabaseClient, employee)
        break;
      
      case method === 'GET':
        return getEmployees(supabaseClient)
        break;
    
      default:
        return getEmployees(supabaseClient)
        break;
    }
    
  } catch (error) {
    return new Response(error.message, { status: 500 })
  }
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
