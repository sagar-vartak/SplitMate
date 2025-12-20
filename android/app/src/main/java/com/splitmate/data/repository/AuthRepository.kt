package com.splitmate.data.repository

import android.content.Context
import com.splitmate.data.SupabaseClient
import com.splitmate.data.model.User
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Google
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class AuthRepository {
    private val supabase = SupabaseClient.client

    suspend fun signInWithGoogle(context: Context? = null): Result<Unit> {
        return try {
            // Use Supabase's Google OAuth provider
            // For Android, we need to provide a redirect URL scheme
            val redirectUrl = if (context != null) {
                "com.splitmate://auth"
            } else {
                null
            }
            
            supabase.auth.signInWith(Google) {
                // Configure OAuth options if needed
                redirectUrl?.let {
                    // Note: Supabase Kotlin SDK handles OAuth differently
                    // The redirect URL is typically configured in Supabase dashboard
                }
            }
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

