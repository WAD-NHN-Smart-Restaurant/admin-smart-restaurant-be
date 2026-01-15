import { Controller, Get, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  @Get()
  async checkHealth() {
    try {
      // Test database connection
      const { data: restaurants, error: restaurantError } = await this.supabase
        .from('restaurants')
        .select('id, name')
        .limit(1);

      const { data: tables, error: tableError } = await this.supabase
        .from('tables')
        .select('id, table_number, qr_token')
        .limit(1);

      const { data: menuItems, error: menuError } = await this.supabase
        .from('menu_items')
        .select('id, name, price')
        .limit(1);

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        checks: {
          restaurants: {
            connected: !restaurantError,
            count: restaurants?.length || 0,
            sample: restaurants?.[0] || null,
            error: restaurantError?.message || null,
          },
          tables: {
            connected: !tableError,
            count: tables?.length || 0,
            sample: tables?.[0] || null,
            error: tableError?.message || null,
          },
          menuItems: {
            connected: !menuError,
            count: menuItems?.length || 0,
            sample: menuItems?.[0] || null,
            error: menuError?.message || null,
          },
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          supabaseUrl: process.env.SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SECRET_KEY,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          supabaseUrl: process.env.SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SECRET_KEY,
        },
      };
    }
  }
}
