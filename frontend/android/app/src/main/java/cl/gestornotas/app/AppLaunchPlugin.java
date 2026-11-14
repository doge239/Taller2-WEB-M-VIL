package cl.gestornotas.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Angular avisa cuando su primera vista está lista; no espera peticiones de red. */
@CapacitorPlugin(name = "AppLaunch")
public class AppLaunchPlugin extends Plugin {
    @PluginMethod
    public void ready(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).finishLaunch(Boolean.TRUE.equals(call.getBoolean("reducedMotion", false)));
        }
        call.resolve();
    }
}
