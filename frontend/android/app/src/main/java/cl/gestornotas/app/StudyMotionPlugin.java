package cl.gestornotas.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Acelerómetro nativo: resta gravedad y emite muestras, sin guardar coordenadas. */
@CapacitorPlugin(name = "StudyMotion")
public class StudyMotionPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private final float[] gravity = new float[3];
    private boolean initialized;
    private long lastSample;

    @PluginMethod
    public void start(PluginCall call) {
        stopSensor();
        manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor sensor = manager == null ? null : manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (sensor == null) {
            call.reject("Este dispositivo no tiene acelerómetro disponible.");
            return;
        }
        initialized = false;
        lastSample = 0;
        if (!manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)) {
            call.reject("No se pudo activar el acelerómetro.");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopSensor();
        call.resolve();
    }

    private void stopSensor() {
        if (manager != null) manager.unregisterListener(this);
    }

    @Override
    protected void handleOnPause() { stopSensor(); }

    @Override
    protected void handleOnDestroy() { stopSensor(); }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!initialized) {
            System.arraycopy(event.values, 0, gravity, 0, 3);
            initialized = true;
            return;
        }
        double sum = 0;
        for (int i = 0; i < 3; i++) {
            gravity[i] = 0.8f * gravity[i] + 0.2f * event.values[i];
            double linear = event.values[i] - gravity[i];
            sum += linear * linear;
        }
        if (event.timestamp - lastSample < 100_000_000L) return;
        lastSample = event.timestamp;
        JSObject sample = new JSObject();
        sample.put("magnitude", Math.sqrt(sum));
        notifyListeners("sample", sample);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
