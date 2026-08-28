import { logger } from '@/lib/logger'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('station_id')
    const days = parseInt(searchParams.get('days') || '7', 10)
    const tz = searchParams.get('tz') || 'UTC' 
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
      timezone: tz,                              
      utc_offset_seconds: getOffsetSeconds(tz),  
      data: data || [] 
    }, { status: 200 })

  } catch (error) {
    logger.error('Unexpected error in AQI aggregates endpoint:', error.message || error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}
function getOffsetSeconds(timeZone) {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    return Math.round((tzDate - utcDate) / 1000);
  } catch {
    return 0;
  }
}