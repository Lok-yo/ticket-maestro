import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventoId: string; staffId: string }> }
) {
  try {
    const { eventoId, staffId } = await params;
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('evento_staff')
      .delete()
      .eq('id', staffId)
      .eq('evento_id', eventoId);

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar staff' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
