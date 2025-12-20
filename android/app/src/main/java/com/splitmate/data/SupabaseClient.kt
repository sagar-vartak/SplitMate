package com.splitmate.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.serializer.KotlinXSerializer
import com.splitmate.BuildConfig

object SupabaseClient {
    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
        install(io.github.jan.supabase.gotrue.Auth)
        install(io.github.jan.supabase.postgrest.Postgrest) {
            serializer = KotlinXSerializer()
        }
        install(io.github.jan.supabase.realtime.Realtime)
    }
}

