import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from './supabase.types';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    {
      provide: SUPABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient<Database>(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_PUBLISHABLE_KEY')!,
        ),
    },
  ],
  exports: [SUPABASE],
})
export class SupabaseModule {}
