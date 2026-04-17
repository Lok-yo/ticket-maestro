import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: evento } = await supabaseAdmin
      .from('evento')
      .select('id, titulo, fecha, ubicacion, capacidad')
      .eq('id', eventoId)
      .single();

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const { data: boletosRaw } = await supabaseAdmin
      .from('boleto')
      .select('id, estado')
      .eq('evento_id', eventoId);

    const boletos = boletosRaw || [];

    const totalVendidos = boletos.filter(b => b.estado === 'vendido' || b.estado === 'usado').length;
    const totalUsados = boletos.filter(b => b.estado === 'usado').length;
    const asistenciaPorcentaje = totalVendidos > 0
      ? Math.round((totalUsados / totalVendidos) * 100 * 10) / 10
      : 0;

    const boletoIds = boletos.map(b => b.id);
    let validaciones: any[] = [];
    
    // Ahora consultamos directamente por evento_id para atrapar incluso los intentos inválidos
    const { data: valData } = await supabaseAdmin
      .from('validacion')
      .select('resultado, fecha_hora, boleto_id')
      .eq('evento_id', eventoId);
    
    validaciones = valData || [];

    let ultimosIngresos: any[] = [];
    if (boletoIds.length > 0) {
        const { data: recientes } = await supabaseAdmin
            .from('validacion')
            .select(`
                id,
                boleto_id,
                fecha_hora,
                boleto (
                    tipo
                )
            `)
            .in('boleto_id', boletoIds)
            .eq('resultado', 'valido')
            .order('fecha_hora', { ascending: false })
            .limit(5);
        ultimosIngresos = recientes || [];
    }

    return NextResponse.json({
      data: {
        evento,
        boletos: {
          total_vendidos: totalVendidos,
          total_usados: totalUsados,
          total_restantes: totalVendidos - totalUsados,
          asistencia_porcentaje: asistenciaPorcentaje
        },
        resumen_validaciones: {
          total_intentos: validaciones.length,
          validos: validaciones.filter(v => v.resultado === 'valido').length,
          invalidos: validaciones.filter(v => v.resultado === 'invalido').length,
          ya_usados: validaciones.filter(v => v.resultado === 'ya_usado').length
        },
        ultimos_ingresos: ultimosIngresos
      }
    });

  } catch (error: any) {
    console.error('Error fetching stats API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
