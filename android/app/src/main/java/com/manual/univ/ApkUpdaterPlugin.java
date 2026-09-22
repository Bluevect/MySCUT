package com.manual.univ;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String UPDATE_DIR_NAME = "apk-updates";
    private static final int PROGRESS_MIN_INTERVAL_MS = 150;
    private static final int PROGRESS_MIN_BYTES = 512 * 1024;
    private static final int IO_BUFFER_SIZE = 64 * 1024;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }

        final String expectedSha256 = normalizeSha256(call.getString("expectedSha256"));
        final Integer expectedSize = call.getInt("expectedSize");
        final File targetFile = new File(resolveUpdateDir(), resolveFileName(url));

        executor.execute(() -> {
            try {
                if (isCachedFileValid(targetFile, expectedSha256, expectedSize)) {
                    JSObject result = new JSObject();
                    result.put("path", targetFile.getAbsolutePath());
                    result.put("cached", true);
                    call.resolve(result);
                    return;
                }

                cleanUpOtherFiles(targetFile);
                downloadToFileSync(url, targetFile, expectedSha256);

                JSObject result = new JSObject();
                result.put("path", targetFile.getAbsolutePath());
                result.put("cached", false);
                call.resolve(result);
            } catch (Exception error) {
                //noinspection ResultOfMethodCallIgnored
                targetFile.delete();
                call.reject("APK download failed: " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void install(final PluginCall call) {
        final String path = call.getString("path");
        if (path == null || path.trim().isEmpty()) {
            call.reject("path is required");
            return;
        }

        File file = new File(path);
        if (!file.exists()) {
            call.reject("APK file does not exist: " + path);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);

            JSObject result = new JSObject();
            result.put("status", "needs-permission");
            call.resolve(result);
            return;
        }

        Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file);
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(installIntent);

        JSObject result = new JSObject();
        result.put("status", "install-started");
        call.resolve(result);
    }

    private File resolveUpdateDir() {
        File dir = new File(getContext().getCacheDir(), UPDATE_DIR_NAME);
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    private String resolveFileName(String url) {
        String withoutQuery = url.split("\\?")[0];
        int lastSlash = withoutQuery.lastIndexOf('/');
        String name = lastSlash >= 0 ? withoutQuery.substring(lastSlash + 1) : "";
        if (name.isEmpty() || !name.toLowerCase(Locale.ROOT).endsWith(".apk")) {
            name = "update.apk";
        }
        return name;
    }

    private void cleanUpOtherFiles(File keepFile) {
        File[] files = resolveUpdateDir().listFiles();
        if (files == null) {
            return;
        }
        for (File file : files) {
            if (!file.getAbsolutePath().equals(keepFile.getAbsolutePath())) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }
    }

    private boolean isCachedFileValid(File file, String expectedSha256, Integer expectedSize) {
        if (!file.exists() || file.length() == 0) {
            return false;
        }
        if (expectedSize != null && file.length() != expectedSize) {
            return false;
        }
        if (expectedSha256 == null) {
            return false;
        }
        try {
            return expectedSha256.equals(hashFile(file));
        } catch (Exception error) {
            return false;
        }
    }

    private void downloadToFileSync(String url, File targetFile, String expectedSha256) throws Exception {
        OkHttpClient client = new OkHttpClient();
        Request request = new Request.Builder().url(url).build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IllegalStateException("HTTP " + response.code());
            }

            ResponseBody body = response.body();
            if (body == null) {
                throw new IllegalStateException("Empty response body");
            }

            long totalBytes = body.contentLength();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            try (InputStream input = body.byteStream();
                 OutputStream output = new FileOutputStream(targetFile)) {
                byte[] buffer = new byte[IO_BUFFER_SIZE];
                long receivedBytes = 0;
                long lastNotifyTime = 0;
                long lastNotifyBytes = 0;
                int read;

                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                    digest.update(buffer, 0, read);
                    receivedBytes += read;

                    long now = System.currentTimeMillis();
                    if (totalBytes > 0
                            && receivedBytes - lastNotifyBytes >= PROGRESS_MIN_BYTES
                            && now - lastNotifyTime >= PROGRESS_MIN_INTERVAL_MS) {
                        lastNotifyTime = now;
                        lastNotifyBytes = receivedBytes;
                        notifyProgress(receivedBytes, totalBytes);
                    }
                }

                if (totalBytes > 0) {
                    notifyProgress(receivedBytes, totalBytes);
                }
            }

            if (expectedSha256 != null) {
                String actualSha256 = toHex(digest.digest());
                if (!expectedSha256.equals(actualSha256)) {
                    throw new IllegalStateException("SHA-256 mismatch");
                }
            }
        }
    }

    private void notifyProgress(long receivedBytes, long totalBytes) {
        JSObject progress = new JSObject();
        progress.put("receivedBytes", receivedBytes);
        progress.put("totalBytes", totalBytes);
        notifyListeners("apkDownloadProgress", progress);
    }

    private String hashFile(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[IO_BUFFER_SIZE];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return toHex(digest.digest());
    }

    private String normalizeSha256(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte item : bytes) {
            builder.append(String.format(Locale.ROOT, "%02x", item));
        }
        return builder.toString();
    }
}
