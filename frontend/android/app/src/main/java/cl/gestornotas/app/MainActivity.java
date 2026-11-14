package cl.gestornotas.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.os.SystemClock;
import android.animation.ValueAnimator;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    private volatile boolean webReady = false;
    private volatile boolean reducedMotion = false;

    public void finishLaunch(boolean reducedMotion) {
        this.reducedMotion = reducedMotion;
        this.webReady = true;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        long startedAt = SystemClock.elapsedRealtime();
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        registerPlugin(StudyMotionPlugin.class);
        registerPlugin(AppLaunchPlugin.class);
        super.onCreate(savedInstanceState);
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.elapsedRealtime() - startedAt < 4000);
        splash.setOnExitAnimationListener(provider -> {
            if (reducedMotion || !ValueAnimator.areAnimatorsEnabled()) {
                provider.remove();
                return;
            }
            provider.getView().animate().alpha(0f).setDuration(180).withEndAction(provider::remove).start();
        });
    }
}
