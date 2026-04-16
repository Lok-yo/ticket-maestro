import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { clabe } = await request.json()
    if (!clabe || clabe.length !== 18 || !/^\d+$/.test(clabe)) {
       return NextResponse.json({ error: 'La CLABE debe contener exactamente 18 números.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('balance_organizador')
      .upsert({ 
         organizador_id: user.id, 
         clabe
      }, { onConflict: 'organizador_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
