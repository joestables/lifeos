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
      attachments: {
        Row: {
          bytes: number | null
          created_at: string
          created_by: string
          height: number | null
          id: string
          item_id: string
          kind: string
          path: string
          width: number | null
        }
        ComputedFields: never
        Insert: {
          bytes?: number | null
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          item_id: string
          kind?: string
          path: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          item_id?: string
          kind?: string
          path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'attachments_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_links: {
        Row: {
          calendar_id: string
          can_edit: boolean
          connection_id: string
          created_at: string
          id: string
          is_primary: boolean
          level: string
          name: string
          new_events: boolean
          person_id: string
          sync_token: string | null
          synced_until: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          calendar_id: string
          can_edit?: boolean
          connection_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          level?: string
          name?: string
          new_events?: boolean
          person_id: string
          sync_token?: string | null
          synced_until?: string | null
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          can_edit?: boolean
          connection_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          level?: string
          name?: string
          new_events?: boolean
          person_id?: string
          sync_token?: string | null
          synced_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_links_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'connections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_links_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      connections: {
        Row: {
          account: string
          broken_since: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          last_synced_at: string | null
          person_id: string
          provider: string
          state: string
          token_secret: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          account?: string
          broken_since?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_synced_at?: string | null
          person_id?: string
          provider: string
          state?: string
          token_secret?: string | null
          updated_at?: string
        }
        Update: {
          account?: string
          broken_since?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_synced_at?: string | null
          person_id?: string
          provider?: string
          state?: string
          token_secret?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'connections_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      external_refs: {
        Row: {
          calendar_link_id: string | null
          connection_id: string
          created_at: string
          etag: string | null
          external_id: string
          external_updated: string | null
          item_id: string
          made_in_lifeos: boolean
          mapping_version: number
          raw: Json | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          calendar_link_id?: string | null
          connection_id: string
          created_at?: string
          etag?: string | null
          external_id: string
          external_updated?: string | null
          item_id: string
          made_in_lifeos?: boolean
          mapping_version?: number
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          calendar_link_id?: string | null
          connection_id?: string
          created_at?: string
          etag?: string | null
          external_id?: string
          external_updated?: string | null
          item_id?: string
          made_in_lifeos?: boolean
          mapping_version?: number
          raw?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'external_refs_calendar_link_id_fkey'
            columns: ['calendar_link_id']
            isOneToOne: false
            referencedRelation: 'calendar_links'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'external_refs_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'connections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'external_refs_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
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
          has_place: boolean
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
          has_place?: boolean
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
          has_place?: boolean
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
          place: string | null
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
          place?: string | null
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
          place?: string | null
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
          meal_space_id: string | null
          name: string
          plan_hidden_types: string[]
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
          meal_space_id?: string | null
          name?: string
          plan_hidden_types?: string[]
          reminder_defaults?: NonNullable<Json>
          timezone?: string
        }
        Update: {
          created_at?: string
          default_reminder_time?: string
          digest_on?: boolean
          digest_time?: string
          id?: string
          meal_space_id?: string | null
          name?: string
          plan_hidden_types?: string[]
          reminder_defaults?: NonNullable<Json>
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'people_meal_space_id_fkey'
            columns: ['meal_space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
          },
        ]
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
      space_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          space_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          space_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'space_invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'space_invites_space_id_fkey'
            columns: ['space_id']
            isOneToOne: false
            referencedRelation: 'spaces'
            referencedColumns: ['id']
          },
        ]
      }
      space_members: {
        Row: {
          joined_at: string
          person_id: string
          role: string
          space_id: string
        }
        ComputedFields: never
        Insert: {
          joined_at?: string
          person_id: string
          role?: string
          space_id: string
        }
        Update: {
          joined_at?: string
          person_id?: string
          role?: string
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
      ai_failed: {
        Args: { p_message: string; p_person: string; p_task: string }
        Returns: undefined
      }
      ai_left: { Args: { p_allowance: number; p_person: string }; Returns: number }
      ai_take: {
        Args: { p_allowance: number; p_details?: Json; p_person: string; p_task: string }
        Returns: boolean
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
          place: string | null
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
      calendar_begin: { Args: { p_return_to: string }; Returns: string }
      calendar_broken: { Args: { p_connection: string; p_reason: string }; Returns: undefined }
      calendar_connected: {
        Args: { p_account: string; p_refresh_token: string; p_state: string }
        Returns: Json
      }
      calendar_disconnected: { Args: { p_connection: string }; Returns: undefined }
      calendar_finish: { Args: { p_code: string }; Returns: string }
      calendar_outbox_claim: { Args: { p_limit?: number }; Returns: Json }
      calendar_prune: {
        Args: { p_from: string; p_link: string; p_masters: Json; p_until: string }
        Returns: number
      }
      calendar_pushed: {
        Args: { p_outbox: number; p_refs: Json; p_series_ref?: Json }
        Returns: undefined
      }
      calendar_received: {
        Args: { p_account: string; p_refresh_token: string; p_state: string }
        Returns: Json
      }
      calendar_save_events: { Args: { p_events: Json; p_link: string }; Returns: number }
      calendar_secret_ok: { Args: { p_secret: string }; Returns: boolean }
      calendar_sent: {
        Args: { p_outbox: number; p_queued_at: string; p_refs: Json; p_series_ref: Json }
        Returns: undefined
      }
      calendar_set_calendars: {
        Args: { p_calendars: Json; p_connection: string }
        Returns: undefined
      }
      calendar_synced: {
        Args: { p_link: string; p_sync_token: string; p_synced_until: string }
        Returns: undefined
      }
      calendar_token: { Args: { p_connection: string }; Returns: string }
      calendar_unpushed: { Args: { p_error: string; p_outbox: number }; Returns: undefined }
      calendars_to_sync: {
        Args: { p_connection?: string }
        Returns: {
          calendar_id: string
          connection_id: string
          level: string
          link_id: string
          sync_token: string
          synced_until: string
          timezone: string
        }[]
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
          place: string | null
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
          place: string | null
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
      create_household: {
        Args: { p_id: string; p_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
        }
        SetofOptions: {
          from: '*'
          to: 'spaces'
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
          place: string | null
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
      decline_invite: { Args: { p_invite: string }; Returns: undefined }
      delete_household: { Args: { p_id: string }; Returns: undefined }
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
      invite: { Args: { p_email: string; p_id: string; p_space: string }; Returns: undefined }
      join_household: { Args: { p_invite: string }; Returns: undefined }
      leave_household: { Args: { p_id: string }; Returns: undefined }
      link_items: {
        Args: { p_from: string; p_id: string; p_link_type: string; p_to: string }
        Returns: undefined
      }
      my_invites: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          from_name: string
          id: string
          space_id: string
          space_name: string
        }[]
      }
      plan_items: {
        Args: { p_from: string; p_to: string }
        Returns: {
          calendar_level: string
          calendar_name: string
          item: Database['core']['Tables']['items']['Row']
          plan_from: string
          plan_to: string
          repeats: boolean
        }[]
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
      remove_member: { Args: { p_person: string; p_space: string }; Returns: undefined }
      remove_photo: { Args: { p_item: string }; Returns: undefined }
      remove_reminder: { Args: { p_id: string }; Returns: undefined }
      remove_subtask: { Args: { p_id: string }; Returns: undefined }
      rename_household: {
        Args: { p_id: string; p_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
        }
        SetofOptions: {
          from: '*'
          to: 'spaces'
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          place: string | null
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
          place: string | null
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
      set_calendar_level: {
        Args: { p_level: string; p_link: string }
        Returns: {
          calendar_id: string
          can_edit: boolean
          connection_id: string
          created_at: string
          id: string
          is_primary: boolean
          level: string
          name: string
          new_events: boolean
          person_id: string
          sync_token: string | null
          synced_until: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'calendar_links'
          isOneToOne: true
          isSetofReturn: false
        }
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
      set_event_calendar: { Args: { p_item: string; p_link: string }; Returns: undefined }
      set_mark: { Args: { p_item: string; p_on: boolean }; Returns: undefined }
      set_new_events_calendar: {
        Args: { p_link: string }
        Returns: {
          calendar_id: string
          can_edit: boolean
          connection_id: string
          created_at: string
          id: string
          is_primary: boolean
          level: string
          name: string
          new_events: boolean
          person_id: string
          sync_token: string | null
          synced_until: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'calendar_links'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_photo: {
        Args: { p_bytes: number; p_height: number; p_id: string; p_item: string; p_width: number }
        Returns: {
          bytes: number | null
          created_at: string
          created_by: string
          height: number | null
          id: string
          item_id: string
          kind: string
          path: string
          width: number | null
        }
        SetofOptions: {
          from: '*'
          to: 'attachments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          place: string | null
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
          place: string | null
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
          place: string | null
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
          meal_space_id: string | null
          name: string
          plan_hidden_types: string[]
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
      withdraw_invite: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  food: {
    Tables: {
      change_notes: {
        Row: {
          activity_id: number
          item_id: string
          note: string
          person_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          activity_id: number
          item_id: string
          note: string
          person_id?: string
          updated_at?: string
        }
        Update: {
          activity_id?: number
          item_id?: string
          note?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cooks: {
        Row: {
          cooked_at: string
          created_at: string
          id: string
          meal_id: string | null
          notes: string | null
          person_id: string
          servings: number | null
          snapshot: NonNullable<Json>
          updated_at: string
          variation_id: string
          verdict: number | null
        }
        ComputedFields: never
        Insert: {
          cooked_at?: string
          created_at?: string
          id?: string
          meal_id?: string | null
          notes?: string | null
          person_id?: string
          servings?: number | null
          snapshot?: NonNullable<Json>
          updated_at?: string
          variation_id: string
          verdict?: number | null
        }
        Update: {
          cooked_at?: string
          created_at?: string
          id?: string
          meal_id?: string | null
          notes?: string | null
          person_id?: string
          servings?: number | null
          snapshot?: NonNullable<Json>
          updated_at?: string
          variation_id?: string
          verdict?: number | null
        }
        Relationships: []
      }
      meal: {
        Row: {
          item_id: string
          leftovers_of: string | null
          servings: number | null
          source: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          item_id: string
          leftovers_of?: string | null
          servings?: number | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          item_id?: string
          leftovers_of?: string | null
          servings?: number | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meal_lines: {
        Row: {
          approx: boolean
          created_at: string
          id: string
          meal_id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          approx?: boolean
          created_at?: string
          id?: string
          meal_id: string
          pantry_id?: string | null
          position: string
          qty?: number | null
          qty_max?: number | null
          text?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          approx?: boolean
          created_at?: string
          id?: string
          meal_id?: string
          pantry_id?: string | null
          position?: string
          qty?: number | null
          qty_max?: number | null
          text?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_lines_pantry_id_fkey'
            columns: ['pantry_id']
            isOneToOne: false
            referencedRelation: 'pantry'
            referencedColumns: ['id']
          },
        ]
      }
      pantry: {
        Row: {
          added_by: string | null
          aisle: string | null
          created_at: string
          default_unit: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          added_by?: string | null
          aisle?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          aisle?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recent_views: {
        Row: {
          person_id: string
          recipe_id: string
          viewed_at: string
        }
        ComputedFields: never
        Insert: {
          person_id?: string
          recipe_id: string
          viewed_at?: string
        }
        Update: {
          person_id?: string
          recipe_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      recipe: {
        Row: {
          carbs: string[]
          category: string | null
          cuisine: string | null
          default_variation: string | null
          item_id: string
          protein: string[]
          tags: string[]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          carbs?: string[]
          category?: string | null
          cuisine?: string | null
          default_variation?: string | null
          item_id: string
          protein?: string[]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          carbs?: string[]
          category?: string | null
          cuisine?: string | null
          default_variation?: string | null
          item_id?: string
          protein?: string[]
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      space_entries: {
        Row: {
          kind: string
          needed: boolean
          pantry_id: string
          space_id: string
        }
        ComputedFields: never
        Insert: {
          kind?: string
          needed?: boolean
          pantry_id: string
          space_id: string
        }
        Update: {
          kind?: string
          needed?: boolean
          pantry_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'space_entries_pantry_id_fkey'
            columns: ['pantry_id']
            isOneToOne: false
            referencedRelation: 'pantry'
            referencedColumns: ['id']
          },
        ]
      }
      values: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          person_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          person_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          person_id?: string
        }
        Relationships: []
      }
      variation: {
        Row: {
          archived_from: string | null
          cook_min: number | null
          item_id: string
          notes: string | null
          prep_min: number | null
          servings: number | null
          sources: string[]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          archived_from?: string | null
          cook_min?: number | null
          item_id: string
          notes?: string | null
          prep_min?: number | null
          servings?: number | null
          sources?: string[]
          updated_at?: string
        }
        Update: {
          archived_from?: string | null
          cook_min?: number | null
          item_id?: string
          notes?: string | null
          prep_min?: number | null
          servings?: number | null
          sources?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      variation_lines: {
        Row: {
          approx: boolean
          created_at: string
          heading: string | null
          id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
          variation_id: string
        }
        ComputedFields: never
        Insert: {
          approx?: boolean
          created_at?: string
          heading?: string | null
          id?: string
          pantry_id?: string | null
          position: string
          qty?: number | null
          qty_max?: number | null
          text?: string | null
          unit?: string | null
          updated_at?: string
          variation_id: string
        }
        Update: {
          approx?: boolean
          created_at?: string
          heading?: string | null
          id?: string
          pantry_id?: string | null
          position?: string
          qty?: number | null
          qty_max?: number | null
          text?: string | null
          unit?: string | null
          updated_at?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'variation_lines_pantry_id_fkey'
            columns: ['pantry_id']
            isOneToOne: false
            referencedRelation: 'pantry'
            referencedColumns: ['id']
          },
        ]
      }
      variation_steps: {
        Row: {
          created_at: string
          id: string
          position: string
          text: string
          updated_at: string
          variation_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          position: string
          text?: string
          updated_at?: string
          variation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: string
          text?: string
          updated_at?: string
          variation_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_line: {
        Args: { p_fields: Json; p_id: string; p_variation: string }
        Returns: {
          approx: boolean
          created_at: string
          heading: string | null
          id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
          variation_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'variation_lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_meal_line: {
        Args: { p_fields: Json; p_id: string; p_meal: string }
        Returns: {
          approx: boolean
          created_at: string
          id: string
          meal_id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'meal_lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_pantry: {
        Args: { p_fields: Json; p_id: string }
        Returns: {
          added_by: string | null
          aisle: string | null
          created_at: string
          default_unit: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'pantry'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_step: {
        Args: { p_id: string; p_position: string; p_text: string; p_variation: string }
        Returns: {
          created_at: string
          id: string
          position: string
          text: string
          updated_at: string
          variation_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'variation_steps'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_value: {
        Args: { p_id: string; p_kind: string; p_name: string }
        Returns: {
          created_at: string
          id: string
          kind: string
          name: string
          person_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'values'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_variation: {
        Args: { p_from?: string; p_id: string; p_ids?: Json; p_name: string; p_recipe: string }
        Returns: Database['core']['Tables']['items']['Row']
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_recipe: {
        Args: {
          p_id: string
          p_name: string
          p_status?: string
          p_variation: string
          p_variation_name?: string
        }
        Returns: Database['core']['Tables']['items']['Row']
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      keep_entry: {
        Args: { p_kind: string; p_needed?: boolean; p_pantry: string; p_space: string }
        Returns: {
          kind: string
          needed: boolean
          pantry_id: string
          space_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'space_entries'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      keep_import: {
        Args: { p_draft: Json; p_recipe: string; p_variation: string }
        Returns: Database['core']['Tables']['items']['Row']
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_cook: {
        Args: { p_fields?: Json; p_id: string; p_variation: string }
        Returns: {
          cooked_at: string
          created_at: string
          id: string
          meal_id: string | null
          notes: string | null
          person_id: string
          servings: number | null
          snapshot: NonNullable<Json>
          updated_at: string
          variation_id: string
          verdict: number | null
        }
        SetofOptions: {
          from: '*'
          to: 'cooks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      merge_pantry: {
        Args: { p_keep: string; p_merge: string }
        Returns: {
          added_by: string | null
          aisle: string | null
          created_at: string
          default_unit: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'pantry'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_value_uses: {
        Args: { p_from: string; p_kind: string; p_to: string }
        Returns: undefined
      }
      note_change: { Args: { p_activity: number; p_note: string }; Returns: undefined }
      plan_meal: {
        Args: { p_fields: Json; p_id: string }
        Returns: Database['core']['Tables']['items']['Row']
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_cook: { Args: { p_id: string }; Returns: undefined }
      remove_entry: { Args: { p_pantry: string; p_space: string }; Returns: undefined }
      remove_line: { Args: { p_id: string }; Returns: undefined }
      remove_meal_line: { Args: { p_id: string }; Returns: undefined }
      remove_pantry: { Args: { p_id: string }; Returns: undefined }
      remove_step: { Args: { p_id: string }; Returns: undefined }
      remove_value: { Args: { p_id: string }; Returns: undefined }
      rename_value: {
        Args: { p_id: string; p_name: string }
        Returns: {
          created_at: string
          id: string
          kind: string
          name: string
          person_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'values'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_meal_variation: { Args: { p_meal: string; p_variation: string }; Returns: undefined }
      update_cook: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          cooked_at: string
          created_at: string
          id: string
          meal_id: string | null
          notes: string | null
          person_id: string
          servings: number | null
          snapshot: NonNullable<Json>
          updated_at: string
          variation_id: string
          verdict: number | null
        }
        SetofOptions: {
          from: '*'
          to: 'cooks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_line: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          approx: boolean
          created_at: string
          heading: string | null
          id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
          variation_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'variation_lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_meal: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          item_id: string
          leftovers_of: string | null
          servings: number | null
          source: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'meal'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_meal_line: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          approx: boolean
          created_at: string
          id: string
          meal_id: string
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'meal_lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_pantry: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          added_by: string | null
          aisle: string | null
          created_at: string
          default_unit: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'pantry'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_recipe: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          carbs: string[]
          category: string | null
          cuisine: string | null
          default_variation: string | null
          item_id: string
          protein: string[]
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'recipe'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_step: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          created_at: string
          id: string
          position: string
          text: string
          updated_at: string
          variation_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'variation_steps'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_variation: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          archived_from: string | null
          cook_min: number | null
          item_id: string
          notes: string | null
          prep_min: number | null
          servings: number | null
          sources: string[]
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'variation'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      view_recipe: { Args: { p_at?: string; p_recipe: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  shopping: {
    Tables: {
      lines: {
        Row: {
          approx: boolean
          checked: boolean
          created_at: string
          heading: string | null
          id: string
          list_id: string
          meal_id: string | null
          needed_space_id: string | null
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          source_id: string | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          approx?: boolean
          checked?: boolean
          created_at?: string
          heading?: string | null
          id?: string
          list_id: string
          meal_id?: string | null
          needed_space_id?: string | null
          pantry_id?: string | null
          position?: string
          qty?: number | null
          qty_max?: number | null
          source_id?: string | null
          text?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          approx?: boolean
          checked?: boolean
          created_at?: string
          heading?: string | null
          id?: string
          list_id?: string
          meal_id?: string | null
          needed_space_id?: string | null
          pantry_id?: string | null
          position?: string
          qty?: number | null
          qty_max?: number | null
          source_id?: string | null
          text?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      list_meals: {
        Row: {
          created_at: string
          list_id: string
          meal_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          list_id: string
          meal_id: string
        }
        Update: {
          created_at?: string
          list_id?: string
          meal_id?: string
        }
        Relationships: []
      }
      shopping_list: {
        Row: {
          created_at: string
          item_id: string
          kind: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          item_id: string
          kind?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          kind?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_line: {
        Args: { p_fields: Json; p_id: string; p_list: string }
        Returns: {
          approx: boolean
          checked: boolean
          created_at: string
          heading: string | null
          id: string
          list_id: string
          meal_id: string | null
          needed_space_id: string | null
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          source_id: string | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_meals: { Args: { p_list: string; p_meals: string[] }; Returns: undefined }
      create_list: {
        Args: { p_fields: Json; p_id: string }
        Returns: Database['core']['Tables']['items']['Row']
        SetofOptions: {
          from: '*'
          to: 'items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_line: { Args: { p_id: string }; Returns: undefined }
      meals_of: {
        Args: { p_list: string }
        Returns: {
          do_on: string
          live: boolean
          meal_id: string
          personal: boolean
          servings: number
          slot: string
          title: string
        }[]
      }
      remove_meal: { Args: { p_list: string; p_meal: string }; Returns: undefined }
      tick: { Args: { p_checked: boolean; p_ids: string[] }; Returns: undefined }
      update_line: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          approx: boolean
          checked: boolean
          created_at: string
          heading: string | null
          id: string
          list_id: string
          meal_id: string | null
          needed_space_id: string | null
          pantry_id: string | null
          position: string
          qty: number | null
          qty_max: number | null
          source_id: string | null
          text: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'lines'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_list: {
        Args: { p_id: string; p_patch: Json }
        Returns: {
          created_at: string
          item_id: string
          kind: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'shopping_list'
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
  food: {
    Enums: {},
  },
  shopping: {
    Enums: {},
  },
} as const
