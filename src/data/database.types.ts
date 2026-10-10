export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  core: {
    Tables: {
      activity: {
        Row: {
          actor: string | null
          at: string
          changed: NonNullable<Json>
          id: number
          item_id: string
          verb: string
        }
        ComputedFields: never
        Insert: {
          actor?: string | null
          at?: string
          changed?: NonNullable<Json>
          id?: never
          item_id: string
          verb: string
        }
        Update: {
          actor?: string | null
          at?: string
          changed?: NonNullable<Json>
          id?: never
          item_id?: string
          verb?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      item_types: {
        Row: {
          capturable: boolean
          completable: boolean
          converts_to: string[]
          default_space: string
          key: string
          label: string
          module: string
          schedulable: boolean
          shareable: boolean
          statuses: string[]
          time_fields: string[]
        }
        ComputedFields: never
        Insert: {
          capturable: boolean
          completable: boolean
          converts_to: string[]
          default_space: string
          key: string
          label: string
          module: string
          schedulable: boolean
          shareable: boolean
          statuses: string[]
          time_fields: string[]
        }
        Update: {
          capturable?: boolean
          completable?: boolean
          converts_to?: string[]
          default_space?: string
          key?: string
          label?: string
          module?: string
          schedulable?: boolean
          shareable?: boolean
          statuses?: string[]
          time_fields?: string[]
        }
        Relationships: []
      }
      items: {
        Row: {
          all_day: boolean | null
          archived_at: string | null
          body: string | null
          created_at: string
          do_at: string | null
          do_on: string | null
          due_on: string | null
          ends_at: string | null
          id: string
          owner_id: string
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          all_day?: boolean | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          do_at?: string | null
          do_on?: string | null
          due_on?: string | null
          ends_at?: string | null
          id?: string
          owner_id?: string
          series_id?: string | null
          slot?: string | null
          space_id: string
          starts_at?: string | null
          status?: string
          title?: string
          touched_at?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          do_at?: string | null
          do_on?: string | null
          due_on?: string | null
          ends_at?: string | null
          id?: string
          owner_id?: string
          series_id?: string | null
          slot?: string | null
          space_id?: string
          starts_at?: string | null
          status?: string
          title?: string
          touched_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'items_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_space_id_fkey'
            columns: ['space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_type_fkey'
            columns: ['type']
            isOneToOne: false
            referencedRelation: 'item_types'
            referencedColumns: ['key']
          },
        ]
      }
      link_types: {
        Row: {
          from_types: string[] | null
          inverse_label: string
          is_symmetric: boolean
          key: string
          label: string
          to_types: string[] | null
        }
        ComputedFields: never
        Insert: {
          from_types?: string[] | null
          inverse_label: string
          is_symmetric: boolean
          key: string
          label: string
          to_types?: string[] | null
        }
        Update: {
          from_types?: string[] | null
          inverse_label?: string
          is_symmetric?: boolean
          key?: string
          label?: string
          to_types?: string[] | null
        }
        Relationships: []
      }
      links: {
        Row: {
          created_at: string
          created_by: string
          from_item: string
          id: string
          link_type: string
          origin: string
          to_item: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string
          from_item: string
          id?: string
          link_type: string
          origin?: string
          to_item: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_item?: string
          id?: string
          link_type?: string
          origin?: string
          to_item?: string
        }
        Relationships: [
          {
            foreignKeyName: 'links_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'links_from_item_fkey'
            columns: ['from_item']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'links_link_type_fkey'
            columns: ['link_type']
            isOneToOne: false
            referencedRelation: 'link_types'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'links_to_item_fkey'
            columns: ['to_item']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          id: string
          name: string
          timezone: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id: string
          name?: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      space_members: {
        Row: {
          joined_at: string
          person_id: string
          space_id: string
        }
        ComputedFields: never
        Insert: {
          joined_at?: string
          person_id: string
          space_id: string
        }
        Update: {
          joined_at?: string
          person_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'space_members_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'space_members_space_id_fkey'
            columns: ['space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'spaces_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_item: {
        Args: { p_id: string }
        Returns: {
          all_day: boolean | null
          archived_at: string | null
          body: string | null
          created_at: string
          do_at: string | null
          do_on: string | null
          due_on: string | null
          ends_at: string | null
          id: string
          owner_id: string
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_item: {
        Args: { p_fields?: Json; p_id: string; p_type: string }
        Returns: {
          all_day: boolean | null
          archived_at: string | null
          body: string | null
          created_at: string
          do_at: string | null
          do_on: string | null
          due_on: string | null
          ends_at: string | null
          id: string
          owner_id: string
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      link_items: {
        Args: { p_from: string; p_id: string; p_link_type: string; p_to: string }
        Returns: undefined
      }
      report_event: {
        Args: {
          p_actions?: Json
          p_app_version?: string
          p_details?: Json
          p_kind: string
          p_message: string
          p_screen?: string
        }
        Returns: undefined
      }
      restore_item: {
        Args: { p_id: string }
        Returns: {
          all_day: boolean | null
          archived_at: string | null
          body: string | null
          created_at: string
          do_at: string | null
          do_on: string | null
          due_on: string | null
          ends_at: string | null
          id: string
          owner_id: string
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlink_items: {
        Args: { p_from: string; p_link_type: string; p_to: string }
        Returns: undefined
      }
      update_item: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          all_day: boolean | null
          archived_at: string | null
          body: string | null
          created_at: string
          do_at: string | null
          do_on: string | null
          due_on: string | null
          ends_at: string | null
          id: string
          owner_id: string
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  core: {
    Enums: {},
  },
} as const
