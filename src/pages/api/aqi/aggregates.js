import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('station_id')
    const days = parseInt(searchParams.get('days') || '7', 10)

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('mv_aqi_daily_aggregates')
      .select('*')
      .order('aggregate_date', { ascending: false })
      .limit(days)

    if (stationId) {
      query = query.eq('station_id', stationId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching pre-computed AQI aggregates:', error.message)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      source: 'materialized_view', 
      data: data || [] 
    }, { status: 200 })

  } catch (error) {
    logger.error('Unexpected error in AQI aggregates endpoint:', error.message || error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}
