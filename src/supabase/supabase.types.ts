export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      menu_categories: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number | null;
          id: string;
          name: string;
          restaurant_id: string;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          name: string;
          restaurant_id: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          name?: string;
          restaurant_id?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_categories_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_item_modifier_groups: {
        Row: {
          group_id: string;
          menu_item_id: string;
        };
        Insert: {
          group_id: string;
          menu_item_id: string;
        };
        Update: {
          group_id?: string;
          menu_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_item_modifier_groups_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menu_item_modifier_groups_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_item_photos: {
        Row: {
          created_at: string;
          id: string;
          is_primary: boolean | null;
          menu_item_id: string;
          storage_key: string | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          menu_item_id: string;
          storage_key?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          menu_item_id?: string;
          storage_key?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_item_photos_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_chef_recommended: boolean | null;
          is_deleted: boolean | null;
          name: string;
          prep_time_minutes: number | null;
          price: number;
          restaurant_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_chef_recommended?: boolean | null;
          is_deleted?: boolean | null;
          name: string;
          prep_time_minutes?: number | null;
          price: number;
          restaurant_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_chef_recommended?: boolean | null;
          is_deleted?: boolean | null;
          name?: string;
          prep_time_minutes?: number | null;
          price?: number;
          restaurant_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'menu_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menu_items_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      modifier_groups: {
        Row: {
          created_at: string;
          display_order: number | null;
          id: string;
          is_required: boolean | null;
          max_selections: number | null;
          min_selections: number | null;
          name: string;
          restaurant_id: string;
          selection_type: string;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number | null;
          id?: string;
          is_required?: boolean | null;
          max_selections?: number | null;
          min_selections?: number | null;
          name: string;
          restaurant_id: string;
          selection_type?: string;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number | null;
          id?: string;
          is_required?: boolean | null;
          max_selections?: number | null;
          min_selections?: number | null;
          name?: string;
          restaurant_id?: string;
          selection_type?: string;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modifier_groups_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      modifier_options: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          name: string;
          price_adjustment: number | null;
          status: string | null;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          name: string;
          price_adjustment?: number | null;
          status?: string | null;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          name?: string;
          price_adjustment?: number | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'modifier_options_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      order_item_options: {
        Row: {
          created_at: string;
          id: string;
          modifier_option_id: string | null;
          order_item_id: string | null;
          price_at_time: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          modifier_option_id?: string | null;
          order_item_id?: string | null;
          price_at_time?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          modifier_option_id?: string | null;
          order_item_id?: string | null;
          price_at_time?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_item_options_modifier_option_id_fkey';
            columns: ['modifier_option_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_item_options_order_item_id_fkey';
            columns: ['order_item_id'];
            isOneToOne: false;
            referencedRelation: 'order_items';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          notes: string | null;
          order_id: string;
          quantity: number;
          status: Database['public']['Enums']['order_item_status'];
          total_price: number;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          notes?: string | null;
          order_id: string;
          quantity?: number;
          status?: Database['public']['Enums']['order_item_status'];
          total_price: number;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          menu_item_id?: string;
          notes?: string | null;
          order_id?: string;
          quantity?: number;
          status?: Database['public']['Enums']['order_item_status'];
          total_price?: number;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_id: string | null;
          id: string;
          status: string | null;
          table_id: string | null;
          total_amount: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          status?: string | null;
          table_id?: string | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          status?: string | null;
          table_id?: string | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          order_id: string;
          payment_method: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          order_id: string;
          payment_method?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          order_id?: string;
          payment_method?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone_number: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone_number?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone_number?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          capacity: number;
          created_at: string;
          description: string | null;
          id: string;
          location: string | null;
          qr_token: string | null;
          qr_token_created_at: string | null;
          restaurant_id: string;
          status: Database['public']['Enums']['table_status'] | null;
          table_number: string;
          updated_at: string;
        };
        Insert: {
          capacity: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          qr_token?: string | null;
          qr_token_created_at?: string | null;
          restaurant_id: string;
          status?: Database['public']['Enums']['table_status'] | null;
          table_number: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          qr_token?: string | null;
          qr_token_created_at?: string | null;
          restaurant_id?: string;
          status?: Database['public']['Enums']['table_status'] | null;
          table_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_tables_restaurant';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_menu_item_popularity: {
        Args: { days_back?: number; restaurant_id_param: string };
        Returns: {
          menu_item_id: string;
          popularity_score: number;
        }[];
      };
    };
    Enums: {
      order_item_status:
        | 'pending'
        | 'accepted'
        | 'rejected'
        | 'preparing'
        | 'ready'
        | 'served';
      order_status: 'active' | 'payment_pending' | 'completed' | 'cancelled';
      payment_method: 'cash' | 'zalopay' | 'momo' | 'vnpay' | 'stripe';
      payment_status: 'pending' | 'success' | 'failed';
      table_status: 'available' | 'occupied' | 'inactive';
      user_role:
        | 'super_admin'
        | 'admin'
        | 'waiter'
        | 'kitchen_staff'
        | 'customer'
        | 'guest';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      order_item_status: [
        'pending',
        'accepted',
        'rejected',
        'preparing',
        'ready',
        'served',
      ],
      order_status: ['active', 'payment_pending', 'completed', 'cancelled'],
      payment_method: ['cash', 'zalopay', 'momo', 'vnpay', 'stripe'],
      payment_status: ['pending', 'success', 'failed'],
      table_status: ['available', 'occupied', 'inactive'],
      user_role: [
        'super_admin',
        'admin',
        'waiter',
        'kitchen_staff',
        'customer',
        'guest',
      ],
    },
  },
} as const;
