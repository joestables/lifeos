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
      item_labels: {
        Row: {
          created_at: string
          item_id: string
          label_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          item_id: string
          label_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'item_labels_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_labels_label_id_fkey'
            columns: ['label_id']
            isOneToOne: false
            referencedRelation: 'labels'
            referencedColumns: ['id']
          },
        ]
      }
      item_types: {
        Row: {
          capturable: boolean
          colour: string
          completable: boolean
          converts_to: string[]
          default_reminder: string | null
          default_space: string
          has_subtasks: boolean
          key: string
          label: string
          mark: string | null
          module: string
          schedulable: boolean
          shareable: boolean
          statuses: string[]
          time_fields: string[]
          uses_labels: boolean
        }
        ComputedFields: never
        Insert: {
          capturable: boolean
          colour?: string
          completable: boolean
          converts_to: string[]
          default_reminder?: string | null
          default_space: string
          has_subtasks?: boolean
          key: string
          label: string
          mark?: string | null
          module: string
          schedulable: boolean
          shareable: boolean
          statuses: string[]
          time_fields: string[]
          uses_labels?: boolean
        }
        Update: {
          capturable?: boolean
          colour?: string
          completable?: boolean
          converts_to?: string[]
          default_reminder?: string | null
          default_space?: string
          has_subtasks?: boolean
          key?: string
          label?: string
          mark?: string | null
          module?: string
          schedulable?: boolean
          shareable?: boolean
          statuses?: string[]
          time_fields?: string[]
          uses_labels?: boolean
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
          occurrence_on?: string | null
          owner_id?: string
          position?: string | null
          search?: unknown
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
          occurrence_on?: string | null
          owner_id?: string
          position?: string | null
          search?: unknown
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
            foreignKeyName: 'items_series_id_fkey'
            columns: ['series_id']
            isOneToOne: false
            referencedRelation: 'series'
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
      labels: {
        Row: {
          aliases: string[]
          created_at: string
          created_by: string
          id: string
          name: string
          space_id: string
        }
        ComputedFields: never
        Insert: {
          aliases?: string[]
          created_at?: string
          created_by?: string
          id?: string
          name: string
          space_id: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'labels_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'labels_space_id_fkey'
            columns: ['space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
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
      marks: {
        Row: {
          created_at: string
          item_id: string
          person_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          item_id: string
          person_id?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'marks_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'marks_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          default_reminder_time: string
          digest_on: boolean
          digest_time: string
          id: string
          name: string
          reminder_defaults: NonNullable<Json>
          timezone: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          default_reminder_time?: string
          digest_on?: boolean
          digest_time?: string
          id: string
          name?: string
          reminder_defaults?: NonNullable<Json>
          timezone?: string
        }
        Update: {
          created_at?: string
          default_reminder_time?: string
          digest_on?: boolean
          digest_time?: string
          id?: string
          name?: string
          reminder_defaults?: NonNullable<Json>
          timezone?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          auth: string | null
          created_at: string
          enabled: boolean
          endpoint: string
          gone_at: string | null
          id: string
          kind: string
          label: string
          last_sent_at: string | null
          p256dh: string | null
          person_id: string
        }
        ComputedFields: never
        Insert: {
          auth?: string | null
          created_at?: string
          enabled?: boolean
          endpoint: string
          gone_at?: string | null
          id?: string
          kind?: string
          label?: string
          last_sent_at?: string | null
          p256dh?: string | null
          person_id?: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          enabled?: boolean
          endpoint?: string
          gone_at?: string | null
          id?: string
          kind?: string
          label?: string
          last_sent_at?: string | null
          p256dh?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_devices_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      reminder_deliveries: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          device_id: string
          error: string | null
          fire_at: string
          id: number
          item_id: string | null
          key: string
          kind: string
          person_id: string
          reminder_id: string | null
          sent_at: string | null
          status: string
          token: string
        }
        ComputedFields: never
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          device_id: string
          error?: string | null
          fire_at: string
          id?: never
          item_id?: string | null
          key: string
          kind: string
          person_id: string
          reminder_id?: string | null
          sent_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          device_id?: string
          error?: string | null
          fire_at?: string
          id?: never
          item_id?: string | null
          key?: string
          kind?: string
          person_id?: string
          reminder_id?: string | null
          sent_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reminder_deliveries_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'push_devices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminder_deliveries_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminder_deliveries_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminder_deliveries_reminder_id_fkey'
            columns: ['reminder_id']
            isOneToOne: false
            referencedRelation: 'reminders'
            referencedColumns: ['id']
          },
        ]
      }
      reminders: {
        Row: {
          anchor: string | null
          at_time: string | null
          created_at: string
          default_time: string | null
          fires_at: string | null
          fixed_at: string | null
          id: string
          is_default: boolean
          item_id: string
          offset_days: number
          offset_minutes: number
          person_id: string
          snoozed_until: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          anchor?: string | null
          at_time?: string | null
          created_at?: string
          default_time?: string | null
          fires_at?: string | null
          fixed_at?: string | null
          id?: string
          is_default?: boolean
          item_id: string
          offset_days?: number
          offset_minutes?: number
          person_id?: string
          snoozed_until?: string | null
          updated_at?: string
        }
        Update: {
          anchor?: string | null
          at_time?: string | null
          created_at?: string
          default_time?: string | null
          fires_at?: string | null
          fixed_at?: string | null
          id?: string
          is_default?: boolean
          item_id?: string
          offset_days?: number
          offset_minutes?: number
          person_id?: string
          snoozed_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reminders_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminders_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      series: {
        Row: {
          created_at: string
          ended_on: string | null
          generated_until: string | null
          id: string
          mode: string
          owner_id: string
          rule: string
          space_id: string
          starts_on: string
          template: NonNullable<Json>
          timezone: string
          type: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          ended_on?: string | null
          generated_until?: string | null
          id?: string
          mode: string
          owner_id?: string
          rule: string
          space_id: string
          starts_on: string
          template?: NonNullable<Json>
          timezone: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_on?: string | null
          generated_until?: string | null
          id?: string
          mode?: string
          owner_id?: string
          rule?: string
          space_id?: string
          starts_on?: string
          template?: NonNullable<Json>
          timezone?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'series_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'series_space_id_fkey'
            columns: ['space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'series_type_fkey'
            columns: ['type']
            isOneToOne: false
            referencedRelation: 'item_types'
            referencedColumns: ['key']
          },
        ]
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
      subtasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          item_id: string
          position: string
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          item_id: string
          position: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          item_id?: string
          position?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subtasks_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      act_on_delivery: {
        Args: {
          p_action: string
          p_delivery: number
          p_next?: string
          p_next_on?: string
          p_token: string
        }
        Returns: boolean
      }
      add_label: { Args: { p_item: string; p_label: string }; Returns: undefined }
      add_reminder: {
        Args: { p_fields: Json; p_id: string; p_item: string }
        Returns: {
          anchor: string | null
          at_time: string | null
          created_at: string
          default_time: string | null
          fires_at: string | null
          fixed_at: string | null
          id: string
          is_default: boolean
          item_id: string
          offset_days: number
          offset_minutes: number
          person_id: string
          snoozed_until: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'reminders'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_subtask: {
        Args: { p_id: string; p_item: string; p_position: string; p_title: string }
        Returns: {
          created_at: string
          done: boolean
          id: string
          item_id: string
          position: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'subtasks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      claim_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          auth: string
          endpoint: string
          id: number
          p256dh: string
          payload: Json
          ttl: number
        }[]
      }
      complete_occurrence: {
        Args: { p_id: string; p_next: string; p_next_on: string }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      convert_item: {
        Args: { p_id: string; p_type: string }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      create_label: {
        Args: { p_id: string; p_name: string; p_space_id?: string }
        Returns: {
          aliases: string[]
          created_at: string
          created_by: string
          id: string
          name: string
          space_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'labels'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_label: { Args: { p_id: string }; Returns: undefined }
      delivery_for_action: {
        Args: { p_delivery: number; p_token: string }
        Returns: {
          item_id: string
          kind: string
          mode: string
          rule: string
          timezone: string
        }[]
      }
      extend_series: {
        Args: { p_days: string[]; p_series: string; p_until: string }
        Returns: undefined
      }
      finish_series_run: { Args: { p_details?: Json; p_ok: boolean }; Returns: number }
      link_items: {
        Args: { p_from: string; p_id: string; p_link_type: string; p_to: string }
        Returns: undefined
      }
      push_keys: {
        Args: Record<PropertyKey, never>
        Returns: {
          private_key: string
          public_key: string
        }[]
      }
      push_secret_ok: { Args: { p_secret: string }; Returns: boolean }
      record_deliveries: { Args: { p_results: Json }; Returns: undefined }
      register_device: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_id: string
          p_label: string
          p_p256dh: string
        }
        Returns: {
          auth: string | null
          created_at: string
          enabled: boolean
          endpoint: string
          gone_at: string | null
          id: string
          kind: string
          label: string
          last_sent_at: string | null
          p256dh: string | null
          person_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'push_devices'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_device: { Args: { p_id: string }; Returns: undefined }
      remove_label: { Args: { p_item: string; p_label: string }; Returns: undefined }
      remove_reminder: { Args: { p_id: string }; Returns: undefined }
      remove_subtask: { Args: { p_id: string }; Returns: undefined }
      rename_label: {
        Args: { p_id: string; p_name: string }
        Returns: {
          aliases: string[]
          created_at: string
          created_by: string
          id: string
          name: string
          space_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'labels'
          isOneToOne: true
          isSetofReturn: false
        }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      search_items: {
        Args: { p_limit?: number; p_query: string }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
          series_id: string | null
          slot: string | null
          space_id: string
          starts_at: string | null
          status: string
          title: string
          touched_at: string | null
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      series_secret_ok: { Args: { p_secret: string }; Returns: boolean }
      series_to_extend: {
        Args: Record<PropertyKey, never>
        Returns: {
          ended_on: string
          generated_until: string
          id: string
          last_done_on: string
          mode: string
          rule: string
          starts_on: string
          timezone: string
        }[]
      }
      set_device: {
        Args: { p_enabled: boolean; p_id: string }
        Returns: {
          auth: string | null
          created_at: string
          enabled: boolean
          endpoint: string
          gone_at: string | null
          id: string
          kind: string
          label: string
          last_sent_at: string | null
          p256dh: string | null
          person_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'push_devices'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_mark: { Args: { p_item: string; p_on: boolean }; Returns: undefined }
      set_push_keys: {
        Args: { p_private: string; p_public: string }
        Returns: {
          private_key: string
          public_key: string
        }[]
      }
      set_repeat: {
        Args: {
          p_item: string
          p_mode: string
          p_occurrences: Json
          p_rule: string
          p_series: string
          p_starts_on: string
          p_template: Json
          p_timezone: string
          p_until: string
        }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      snooze_reminder: {
        Args: { p_id: string; p_until: string }
        Returns: {
          anchor: string | null
          at_time: string | null
          created_at: string
          default_time: string | null
          fires_at: string | null
          fixed_at: string | null
          id: string
          is_default: boolean
          item_id: string
          offset_days: number
          offset_minutes: number
          person_id: string
          snoozed_until: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'reminders'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stop_repeat: {
        Args: { p_item: string }
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
          occurrence_on: string | null
          owner_id: string
          position: string | null
          search: unknown
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
      update_reminder: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          anchor: string | null
          at_time: string | null
          created_at: string
          default_time: string | null
          fires_at: string | null
          fixed_at: string | null
          id: string
          is_default: boolean
          item_id: string
          offset_days: number
          offset_minutes: number
          person_id: string
          snoozed_until: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'reminders'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_settings: {
        Args: { p_patch: Json }
        Returns: {
          created_at: string
          default_reminder_time: string
          digest_on: boolean
          digest_time: string
          id: string
          name: string
          reminder_defaults: NonNullable<Json>
          timezone: string
        }
        SetofOptions: {
          from: '*'
          to: 'people'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_subtask: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          created_at: string
          done: boolean
          id: string
          item_id: string
          position: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'subtasks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vapid_public_key: { Args: Record<PropertyKey, never>; Returns: string }
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
