export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      avatar_collections: {
        Row: {
          border_css: string | null
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          required_level_code: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          border_css?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          required_level_code?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          border_css?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          required_level_code?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      avatars: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatars_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "avatar_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          color: string
          created_at: string
          criteria: Json
          description_ar: string | null
          description_en: string | null
          icon: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          criteria?: Json
          description_ar?: string | null
          description_en?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          criteria?: Json
          description_ar?: string | null
          description_en?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          blocked_by_email: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          blocked_by_email?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          blocked_by_email?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          accent_color: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_main: boolean
          name_ar: string
          name_en: string
          parent_id: string | null
          slug: string
          sort_order: number
          tagline_ar: string | null
          tagline_en: string | null
          theme_color: string | null
          theme_gradient: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name_ar: string
          name_en: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          tagline_ar?: string | null
          tagline_en?: string | null
          theme_color?: string | null
          theme_gradient?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          tagline_ar?: string | null
          tagline_en?: string | null
          theme_color?: string | null
          theme_gradient?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_jod: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_jod?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_jod?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          assigned_user_id: string | null
          category_slugs: string[]
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_jod: number | null
          min_order_jod: number
          per_user_limit: number
          product_slugs: string[]
          scope: Database["public"]["Enums"]["coupon_scope"]
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          assigned_user_id?: string | null
          category_slugs?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_jod?: number | null
          min_order_jod?: number
          per_user_limit?: number
          product_slugs?: string[]
          scope?: Database["public"]["Enums"]["coupon_scope"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          assigned_user_id?: string | null
          category_slugs?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_jod?: number | null
          min_order_jod?: number
          per_user_limit?: number
          product_slugs?: string[]
          scope?: Database["public"]["Enums"]["coupon_scope"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      game_tournament_scores: {
        Row: {
          created_at: string
          id: string
          score: number
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_tournament_scores_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "game_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      game_tournaments: {
        Row: {
          created_at: string
          ends_at: string
          game_icon: string
          game_path: string | null
          game_slug: string
          id: string
          is_active: boolean
          max_players: number | null
          prizes: Json
          sort_order: number
          starts_at: string
          status: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          game_icon?: string
          game_path?: string | null
          game_slug: string
          id?: string
          is_active?: boolean
          max_players?: number | null
          prizes?: Json
          sort_order?: number
          starts_at: string
          status?: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          game_icon?: string
          game_path?: string | null
          game_slug?: string
          id?: string
          is_active?: boolean
          max_players?: number | null
          prizes?: Json
          sort_order?: number
          starts_at?: string
          status?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      gx_coin_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          order_id: string | null
          reason: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          order_id?: string | null
          reason?: string | null
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          order_id?: string | null
          reason?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      home_settings_history: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          key: string
          note: string | null
          value: Json
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          key: string
          note?: string | null
          value: Json
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          key?: string
          note?: string | null
          value?: Json
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          period: string
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          period?: string
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          period?: string
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: []
      }
      level_rewards: {
        Row: {
          created_at: string
          id: string
          label_ar: string
          label_en: string
          level_id: string
          reward_type: string
          sort_order: number
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          label_ar: string
          label_en: string
          level_id: string
          reward_type: string
          sort_order?: number
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          label_ar?: string
          label_en?: string
          level_id?: string
          reward_type?: string
          sort_order?: number
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "level_rewards_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          code: string
          coins_bonus_pct: number
          color: string
          coupon_max_discount_jod: number | null
          coupon_percent: number
          coupon_valid_days: number
          created_at: string
          gradient: string
          icon: string
          id: string
          is_active: boolean
          min_xp: number
          name_ar: string
          name_en: string
          reward_coins: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          coins_bonus_pct?: number
          color?: string
          coupon_max_discount_jod?: number | null
          coupon_percent?: number
          coupon_valid_days?: number
          created_at?: string
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          min_xp?: number
          name_ar: string
          name_en: string
          reward_coins?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          coins_bonus_pct?: number
          color?: string
          coupon_max_discount_jod?: number | null
          coupon_percent?: number
          coupon_valid_days?: number
          created_at?: string
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          min_xp?: number
          name_ar?: string
          name_en?: string
          reward_coins?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          order_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          client_ip: string | null
          client_meta: Json
          codes_reveal_count: number
          codes_revealed_at: string | null
          coins_awarded: number
          coins_discount_jod: number
          coins_multiplier: number
          coins_refunded: number
          coins_reversed: number
          coins_used: number
          contact_type: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          credit_refunded_jod: number
          credit_used_jod: number
          currency_snapshot: string | null
          customer_name: string | null
          customer_whatsapp: string | null
          delivery_data: Json | null
          discount_jod: number
          id: string
          items: Json
          order_number: string
          paid_jod: number | null
          refunded_at: string | null
          refunded_jod: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal_jod: number
          total_jod: number
          updated_at: string
          user_agent: string | null
          user_coupon_id: string | null
          user_id: string | null
          xp_awarded: number
          xp_multiplier: number
          xp_reversed: number
        }
        Insert: {
          admin_notes?: string | null
          client_ip?: string | null
          client_meta?: Json
          codes_reveal_count?: number
          codes_revealed_at?: string | null
          coins_awarded?: number
          coins_discount_jod?: number
          coins_multiplier?: number
          coins_refunded?: number
          coins_reversed?: number
          coins_used?: number
          contact_type?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          credit_refunded_jod?: number
          credit_used_jod?: number
          currency_snapshot?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          delivery_data?: Json | null
          discount_jod?: number
          id?: string
          items?: Json
          order_number?: string
          paid_jod?: number | null
          refunded_at?: string | null
          refunded_jod?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_jod?: number
          total_jod?: number
          updated_at?: string
          user_agent?: string | null
          user_coupon_id?: string | null
          user_id?: string | null
          xp_awarded?: number
          xp_multiplier?: number
          xp_reversed?: number
        }
        Update: {
          admin_notes?: string | null
          client_ip?: string | null
          client_meta?: Json
          codes_reveal_count?: number
          codes_revealed_at?: string | null
          coins_awarded?: number
          coins_discount_jod?: number
          coins_multiplier?: number
          coins_refunded?: number
          coins_reversed?: number
          coins_used?: number
          contact_type?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          credit_refunded_jod?: number
          credit_used_jod?: number
          currency_snapshot?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          delivery_data?: Json | null
          discount_jod?: number
          id?: string
          items?: Json
          order_number?: string
          paid_jod?: number | null
          refunded_at?: string | null
          refunded_jod?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_jod?: number
          total_jod?: number
          updated_at?: string
          user_agent?: string | null
          user_coupon_id?: string | null
          user_id?: string | null
          xp_awarded?: number
          xp_multiplier?: number
          xp_reversed?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_boosts: {
        Row: {
          boost_type: Database["public"]["Enums"]["boost_type"]
          consumed_at: string | null
          consumed_order_id: string | null
          created_at: string
          expires_at: string
          id: string
          multiplier: number
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          boost_type: Database["public"]["Enums"]["boost_type"]
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          multiplier?: number
          source?: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          boost_type?: Database["public"]["Enums"]["boost_type"]
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          multiplier?: number
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_boosts_consumed_order_id_fkey"
            columns: ["consumed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_country_prices: {
        Row: {
          country_code: string
          created_at: string
          currency: string
          id: string
          price_jod: number | null
          price_local: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          currency: string
          id?: string
          price_jod?: number | null
          price_local: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          price_jod?: number | null
          price_local?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_country_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          created_at: string
          desc_ar: string | null
          desc_en: string | null
          icon: string | null
          id: string
          product_id: string
          sort_order: number
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          desc_ar?: string | null
          desc_en?: string | null
          icon?: string | null
          id?: string
          product_id: string
          sort_order?: number
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          desc_ar?: string | null
          desc_en?: string | null
          icon?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          cart_id: string | null
          created_at: string
          delivery_type:
            | Database["public"]["Enums"]["product_delivery_type"]
            | null
          face_currency: string | null
          face_value: number | null
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          old_price_jod: number | null
          plan_group: string | null
          price_jod: number
          product_id: string
          region: string | null
          sort_order: number
          tag_ar: string | null
          tag_en: string | null
          updated_at: string
        }
        Insert: {
          cart_id?: string | null
          created_at?: string
          delivery_type?:
            | Database["public"]["Enums"]["product_delivery_type"]
            | null
          face_currency?: string | null
          face_value?: number | null
          id?: string
          is_active?: boolean
          label_ar: string
          label_en: string
          old_price_jod?: number | null
          plan_group?: string | null
          price_jod: number
          product_id: string
          region?: string | null
          sort_order?: number
          tag_ar?: string | null
          tag_en?: string | null
          updated_at?: string
        }
        Update: {
          cart_id?: string | null
          created_at?: string
          delivery_type?:
            | Database["public"]["Enums"]["product_delivery_type"]
            | null
          face_currency?: string | null
          face_value?: number | null
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          old_price_jod?: number | null
          plan_group?: string | null
          price_jod?: number
          product_id?: string
          region?: string | null
          sort_order?: number
          tag_ar?: string | null
          tag_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accent_color: string | null
          badge: string | null
          base_price_jod: number | null
          card_gradient: string | null
          category_id: string | null
          created_at: string
          delivery_details: Json
          delivery_instructions_ar: string | null
          delivery_instructions_en: string | null
          delivery_method_ar: string | null
          delivery_method_en: string | null
          delivery_type: Database["public"]["Enums"]["product_delivery_type"]
          description_ar: string | null
          description_en: string | null
          icon: string | null
          icon_image_url: string | null
          id: string
          identifier_label_ar: string | null
          identifier_label_en: string | null
          identifier_placeholder: string | null
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_pinned_bestseller: boolean
          name_ar: string
          name_en: string
          page_template: Database["public"]["Enums"]["product_page_template"]
          pinned_sort: number
          purchases_count: number
          region: string | null
          requires_player_id: boolean
          sku: string | null
          slug: string
          sort_order: number
          tagline_ar: string | null
          tagline_en: string | null
          thumb_bg: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          badge?: string | null
          base_price_jod?: number | null
          card_gradient?: string | null
          category_id?: string | null
          created_at?: string
          delivery_details?: Json
          delivery_instructions_ar?: string | null
          delivery_instructions_en?: string | null
          delivery_method_ar?: string | null
          delivery_method_en?: string | null
          delivery_type?: Database["public"]["Enums"]["product_delivery_type"]
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          icon_image_url?: string | null
          id?: string
          identifier_label_ar?: string | null
          identifier_label_en?: string | null
          identifier_placeholder?: string | null
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_pinned_bestseller?: boolean
          name_ar: string
          name_en: string
          page_template?: Database["public"]["Enums"]["product_page_template"]
          pinned_sort?: number
          purchases_count?: number
          region?: string | null
          requires_player_id?: boolean
          sku?: string | null
          slug: string
          sort_order?: number
          tagline_ar?: string | null
          tagline_en?: string | null
          thumb_bg?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          badge?: string | null
          base_price_jod?: number | null
          card_gradient?: string | null
          category_id?: string | null
          created_at?: string
          delivery_details?: Json
          delivery_instructions_ar?: string | null
          delivery_instructions_en?: string | null
          delivery_method_ar?: string | null
          delivery_method_en?: string | null
          delivery_type?: Database["public"]["Enums"]["product_delivery_type"]
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          icon_image_url?: string | null
          id?: string
          identifier_label_ar?: string | null
          identifier_label_en?: string | null
          identifier_placeholder?: string | null
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_pinned_bestseller?: boolean
          name_ar?: string
          name_en?: string
          page_template?: Database["public"]["Enums"]["product_page_template"]
          pinned_sort?: number
          purchases_count?: number
          region?: string | null
          requires_player_id?: boolean
          sku?: string | null
          slug?: string
          sort_order?: number
          tagline_ar?: string | null
          tagline_en?: string | null
          thumb_bg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_border: string | null
          avatar_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gx_coins: number
          id: string
          level: number
          level_code: string
          orders_count: number
          store_credit_jod: number
          total_refunded_jod: number
          total_spent: number
          updated_at: string
          username: string | null
          whatsapp: string | null
          xp: number
        }
        Insert: {
          avatar_border?: string | null
          avatar_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gx_coins?: number
          id: string
          level?: number
          level_code?: string
          orders_count?: number
          store_credit_jod?: number
          total_refunded_jod?: number
          total_spent?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
          xp?: number
        }
        Update: {
          avatar_border?: string | null
          avatar_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gx_coins?: number
          id?: string
          level?: number
          level_code?: string
          orders_count?: number
          store_credit_jod?: number
          total_refunded_jod?: number
          total_spent?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
          xp?: number
        }
        Relationships: []
      }
      refund_log: {
        Row: {
          admin_email: string | null
          admin_id: string | null
          amount_jod: number
          avatars_locked: number
          badges_removed: number
          coins_removed: number
          coupons_revoked: number
          created_at: string
          id: string
          level_after: string | null
          level_before: string | null
          order_id: string
          order_number: string | null
          reason: string
          user_id: string | null
          xp_removed: number
        }
        Insert: {
          admin_email?: string | null
          admin_id?: string | null
          amount_jod?: number
          avatars_locked?: number
          badges_removed?: number
          coins_removed?: number
          coupons_revoked?: number
          created_at?: string
          id?: string
          level_after?: string | null
          level_before?: string | null
          order_id: string
          order_number?: string | null
          reason: string
          user_id?: string | null
          xp_removed?: number
        }
        Update: {
          admin_email?: string | null
          admin_id?: string | null
          amount_jod?: number
          avatars_locked?: number
          badges_removed?: number
          coins_removed?: number
          coupons_revoked?: number
          created_at?: string
          id?: string
          level_after?: string | null
          level_before?: string | null
          order_id?: string
          order_number?: string | null
          reason?: string
          user_id?: string | null
          xp_removed?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_notes: string | null
          comment: string
          created_at: string
          display_name: string | null
          id: string
          is_featured: boolean
          order_id: string | null
          order_number: string | null
          product_name: string | null
          product_slug: string | null
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          comment?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_featured?: boolean
          order_id?: string | null
          order_number?: string | null
          product_name?: string | null
          product_slug?: string | null
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          comment?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_featured?: boolean
          order_id?: string | null
          order_number?: string | null
          product_name?: string | null
          product_slug?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      store_credit_transactions: {
        Row: {
          actor_id: string | null
          amount_jod: number
          balance_after: number | null
          created_at: string
          id: string
          kind: string
          order_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          amount_jod: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
          order_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          amount_jod?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
          order_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tournament_best_scores: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          score: number
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          score?: number
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          score?: number
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_best_scores_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "game_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          created_at: string
          id: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "game_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_winners: {
        Row: {
          awarded: boolean
          awarded_at: string | null
          awarded_by: string | null
          created_at: string
          id: string
          note: string | null
          prize: Json
          rank: number
          score: number
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded?: boolean
          awarded_at?: string | null
          awarded_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          prize?: Json
          rank: number
          score?: number
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded?: boolean
          awarded_at?: string | null
          awarded_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          prize?: Json
          rank?: number
          score?: number
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_winners_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "game_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_avatars: {
        Row: {
          avatar_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          avatar_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          avatar_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_avatars_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          issued_at: string
          level_code: string
          max_discount_jod: number | null
          order_id: string | null
          percent: number
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          issued_at?: string
          level_code: string
          max_discount_jod?: number | null
          order_id?: string | null
          percent: number
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          issued_at?: string
          level_code?: string
          max_discount_jod?: number | null
          order_id?: string | null
          percent?: number
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wheel_bonus_spins: {
        Row: {
          created_at: string
          spins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          spins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          spins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wheel_prizes: {
        Row: {
          color: string
          coupon_max_discount_jod: number | null
          coupon_valid_hours: number
          created_at: string
          icon: string
          id: string
          is_active: boolean
          max_discount_jod: number | null
          name: string
          rarity: Database["public"]["Enums"]["wheel_rarity"]
          reward_type: Database["public"]["Enums"]["wheel_reward_type"]
          reward_value: number | null
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          color?: string
          coupon_max_discount_jod?: number | null
          coupon_valid_hours?: number
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          max_discount_jod?: number | null
          name: string
          rarity?: Database["public"]["Enums"]["wheel_rarity"]
          reward_type?: Database["public"]["Enums"]["wheel_reward_type"]
          reward_value?: number | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          color?: string
          coupon_max_discount_jod?: number | null
          coupon_valid_hours?: number
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          max_discount_jod?: number | null
          name?: string
          rarity?: Database["public"]["Enums"]["wheel_rarity"]
          reward_type?: Database["public"]["Enums"]["wheel_reward_type"]
          reward_value?: number | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      wheel_spins: {
        Row: {
          coupon_id: string | null
          id: string
          is_bonus: boolean
          prize_id: string | null
          prize_snapshot: Json
          spun_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          id?: string
          is_bonus?: boolean
          prize_id?: string | null
          prize_snapshot?: Json
          spun_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          id?: string
          is_bonus?: boolean
          prize_id?: string | null
          prize_snapshot?: Json
          spun_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "user_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wheel_spins_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "wheel_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          metadata: Json
          order_id: string | null
          reason: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          reason?: string | null
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          reason?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_loyalty: {
        Args: { _coins: number; _reason: string; _user_id: string; _xp: number }
        Returns: Json
      }
      admin_adjust_store_credit: {
        Args: {
          _amount: number
          _order_id?: string
          _reason?: string
          _user_id: string
        }
        Returns: Json
      }
      admin_block_ip: { Args: { _ip: string; _reason?: string }; Returns: Json }
      admin_delete_tournament_score: {
        Args: { _tournament_id: string; _user_id: string }
        Returns: Json
      }
      admin_finalize_tournament: {
        Args: { _top?: number; _tournament_id: string }
        Returns: Json
      }
      admin_grant_wheel_spins: {
        Args: { _count: number; _target: string }
        Returns: Json
      }
      admin_refund_order: {
        Args: { _amount: number; _order_id: string; _reason: string }
        Returns: Json
      }
      admin_reset_tournament_scores: {
        Args: { _clear_registrations?: boolean; _tournament_id: string }
        Returns: Json
      }
      admin_set_order_amounts: {
        Args: {
          _coins_used: number
          _order_id: string
          _reason: string
          _subtotal_jod: number
        }
        Returns: Json
      }
      admin_set_tournament_score: {
        Args: {
          _is_valid?: boolean
          _score: number
          _tournament_id: string
          _user_id: string
        }
        Returns: Json
      }
      admin_set_winner_awarded: {
        Args: { _awarded: boolean; _note?: string; _winner_id: string }
        Returns: Json
      }
      admin_tournament_scores: {
        Args: { _tournament_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          is_valid: boolean
          score: number
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      admin_tournament_winners: {
        Args: { _tournament_id: string }
        Returns: {
          avatar_url: string
          awarded: boolean
          awarded_at: string
          full_name: string
          id: string
          note: string
          prize: Json
          rank: number
          score: number
          user_id: string
          username: string
        }[]
      }
      admin_unblock_ip: { Args: { _ip: string }; Returns: Json }
      auto_cancel_stale_orders: { Args: never; Returns: number }
      award_badges: { Args: { _user_id: string }; Returns: undefined }
      create_store_order: {
        Args: {
          _client_total: number
          _coins_used: number
          _contact_type: string
          _coupon_code: string
          _credit_jod: number
          _currency: string
          _customer_name: string
          _customer_whatsapp: string
          _delivery_data: Json
          _items: Json
          _subtotal: number
          _user_id: string
        }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      get_loyalty_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          full_name: string
          level_code: string
          rank: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      get_my_loyalty: { Args: never; Returns: Json }
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          level: number
          level_code: string
          orders_count: number
          rank: number
          username: string
          xp: number
        }[]
      }
      get_wheel_status: { Args: never; Returns: Json }
      guard_store_order_user: { Args: { _claimed: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_blocked: { Args: { _ip: string }; Returns: boolean }
      issue_level_coupon: {
        Args: {
          _level: Database["public"]["Tables"]["levels"]["Row"]
          _user_id: string
        }
        Returns: string
      }
      level_for_xp: {
        Args: { _xp: number }
        Returns: {
          code: string
          coins_bonus_pct: number
          color: string
          coupon_max_discount_jod: number | null
          coupon_percent: number
          coupon_valid_days: number
          created_at: string
          gradient: string
          icon: string
          id: string
          is_active: boolean
          min_xp: number
          name_ar: string
          name_en: string
          reward_coins: number
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "levels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_tournaments: {
        Args: never
        Returns: {
          ends_at: string
          game_icon: string
          game_path: string
          game_slug: string
          id: string
          live_status: string
          participants: number
          prizes: Json
          server_now: string
          starts_at: string
          title_ar: string
          title_en: string
          top_score: number
        }[]
      }
      log_admin_action: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _metadata?: Json
        }
        Returns: string
      }
      my_tournament_standing: {
        Args: { _tournament_id: string }
        Returns: Json
      }
      normalize_contact: { Args: { _v: string }; Returns: string }
      record_order_client_meta: {
        Args: { _ip: string; _meta?: Json; _order_id: string; _ua: string }
        Returns: undefined
      }
      redeem_gx_coins: {
        Args: { _coins: number; _subtotal_jod: number }
        Returns: Json
      }
      refund_order_coins: {
        Args: { _kind?: string; _order_id: string; _ratio: number }
        Returns: number
      }
      refund_order_credit: {
        Args: { _kind?: string; _order_id: string; _ratio: number }
        Returns: number
      }
      reveal_order_codes: { Args: { _order_id: string }; Returns: Json }
      revoke_ineligible_rewards: { Args: { _user_id: string }; Returns: Json }
      search_public_profiles: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          level: number
          username: string
        }[]
      }
      spend_gx_coins: {
        Args: { _coins: number; _order_id: string }
        Returns: Json
      }
      spin_wheel: { Args: never; Returns: Json }
      submit_tournament_score: {
        Args: { _score: number; _tournament_id: string }
        Returns: Json
      }
      sync_user_level: { Args: { _user_id: string }; Returns: undefined }
      tournament_leaderboard: {
        Args: { _limit?: number; _tournament_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          level_code: string
          level_color: string
          level_icon: string
          level_name_ar: string
          level_name_en: string
          rank: number
          score: number
          user_id: string
          username: string
        }[]
      }
      tournament_registration_count: {
        Args: { _tournament_id: string }
        Returns: number
      }
      validate_coupon: {
        Args: {
          _category_slugs: string[]
          _code: string
          _product_slugs: string[]
          _subtotal_jod: number
          _user_id: string
        }
        Returns: Json
      }
      validate_my_level_coupon: {
        Args: { _code: string; _subtotal_jod: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      boost_type: "double_gx_coins" | "double_xp"
      coupon_discount_type: "percent" | "fixed"
      coupon_scope: "all" | "products" | "categories"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "delivered"
        | "cancelled"
        | "refunded"
      product_delivery_type: "code" | "account" | "topup" | "manual"
      product_page_template:
        | "standard"
        | "multi_account"
        | "dual_plans"
        | "gift_card"
      review_status: "pending" | "approved" | "rejected" | "hidden"
      wheel_rarity: "common" | "rare" | "epic" | "legendary"
      wheel_reward_type:
        | "xp"
        | "gx_coins"
        | "discount_percent"
        | "boost_double_coins"
        | "boost_double_xp"
        | "no_reward"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      boost_type: ["double_gx_coins", "double_xp"],
      coupon_discount_type: ["percent", "fixed"],
      coupon_scope: ["all", "products", "categories"],
      order_status: [
        "pending",
        "paid",
        "processing",
        "delivered",
        "cancelled",
        "refunded",
      ],
      product_delivery_type: ["code", "account", "topup", "manual"],
      product_page_template: [
        "standard",
        "multi_account",
        "dual_plans",
        "gift_card",
      ],
      review_status: ["pending", "approved", "rejected", "hidden"],
      wheel_rarity: ["common", "rare", "epic", "legendary"],
      wheel_reward_type: [
        "xp",
        "gx_coins",
        "discount_percent",
        "boost_double_coins",
        "boost_double_xp",
        "no_reward",
      ],
    },
  },
} as const
