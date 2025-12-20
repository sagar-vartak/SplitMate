package com.splitmate.data.repository

import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.User
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Google
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class AuthRepository {
    private val supabase = SupabaseClient.client

    suspend fun signInWithGoogle(): Result<Unit> {
        return try {
            supabase.auth.signInWith(Google) {}
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCurrentUser(): User? {
        return try {
            val session = supabase.auth.currentSessionOrNull()
            val userId = session?.user?.id ?: return null

            // Get user profile from database
            val userData = supabase.postgrest.from("users")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("id", userId)
                    }
                }
                .decodeSingle<Map<String, Any>>()

            User(
                id = userData["id"] as String,
                email = userData["email"] as String,
                name = userData["name"] as String,
                avatar = userData["avatar"] as? String
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun signOut() {
        supabase.auth.signOut()
    }

    suspend fun observeAuthState(): Flow<User?> = flow {
        // Check initial state
        emit(getCurrentUser())
        
        // Note: For real-time auth state changes, you'd use a proper flow collector
        // This is a simplified version that checks on demand
    }
}

