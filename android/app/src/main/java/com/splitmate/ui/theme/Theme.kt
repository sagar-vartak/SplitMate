package com.splitmate.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Green and black theme (money website style)
private val MoneyGreen = Color(0xFF10B981) // Green-500
private val MoneyGreenDark = Color(0xFF059669) // Green-600
private val MoneyGreenLight = Color(0xFF34D399) // Green-400
private val Black = Color(0xFF000000)
private val DarkGray = Color(0xFF1F2937)
private val LightGray = Color(0xFFF3F4F6)

private val DarkColorScheme = darkColorScheme(
    primary = MoneyGreen,
    secondary = MoneyGreenLight,
    background = Black,
    surface = DarkGray,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = MoneyGreen,
    secondary = MoneyGreenDark,
    background = LightGray,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Black,
    onSurface = Black
)

@Composable
fun SplitMateTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

