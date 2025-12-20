package com.splitmate.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.splitmate.ui.auth.LoginScreen
import com.splitmate.ui.dashboard.DashboardScreen
import com.splitmate.ui.groups.GroupDetailScreen
import com.splitmate.ui.groups.GroupDetailScreenEnhanced
import com.splitmate.ui.groups.CreateGroupScreen
import com.splitmate.ui.groups.GroupSettingsScreen
import com.splitmate.ui.invite.InviteAcceptScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object GroupDetail : Screen("group/{groupId}") {
        fun createRoute(groupId: String) = "group/$groupId"
    }
    object GroupSettings : Screen("group/{groupId}/settings") {
        fun createRoute(groupId: String) = "group/$groupId/settings"
    }
    object CreateGroup : Screen("create_group")
    object InviteAccept : Screen("invite/{token}") {
        fun createRoute(token: String) = "invite/$token"
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onSignInSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onNavigateToGroup = { groupId ->
                    navController.navigate(Screen.GroupDetail.createRoute(groupId))
                },
                onNavigateToCreateGroup = {
                    navController.navigate(Screen.CreateGroup.route)
                }
            )
        }

        composable(
            route = Screen.GroupDetail.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: ""
            var currentUserId by remember { mutableStateOf<String>("") }
            
            LaunchedEffect(Unit) {
                val authRepository = com.splitmate.data.repository.AuthRepository()
                val user = authRepository.getCurrentUser()
                currentUserId = user?.id ?: ""
            }
            
            if (currentUserId.isNotEmpty()) {
                GroupDetailScreenEnhanced(
                    groupId = groupId,
                    currentUserId = currentUserId,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToExpense = { expenseId ->
                        // Navigate to expense form if needed
                    },
                    onNavigateToSettings = { groupId ->
                        navController.navigate(Screen.GroupSettings.createRoute(groupId))
                    }
                )
            }
        }

        composable(Screen.CreateGroup.route) {
            CreateGroupScreen(
                onNavigateBack = { navController.popBackStack() },
                onGroupCreated = { groupId ->
                    navController.popBackStack()
                    navController.navigate(Screen.GroupDetail.createRoute(groupId))
                }
            )
        }

        composable(
            route = Screen.GroupSettings.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: ""
            GroupSettingsScreen(
                groupId = groupId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.InviteAccept.route,
            arguments = listOf(navArgument("token") { type = NavType.StringType })
        ) { backStackEntry ->
            val token = backStackEntry.arguments?.getString("token") ?: ""
            InviteAcceptScreen(
                token = token,
                onAcceptSuccess = { groupId ->
                    navController.navigate(Screen.GroupDetail.createRoute(groupId)) {
                        popUpTo(Screen.Dashboard.route) { inclusive = false }
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}

