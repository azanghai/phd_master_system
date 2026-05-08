package com.phd.workspace;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Locale;

@CapacitorPlugin(name = "AttachmentStore")
public class AttachmentStorePlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        try {
            String storageKey = safeStorageKey(call.getString("storageKey", ""));
            String dataBase64 = call.getString("dataBase64", "");
            byte[] bytes = Base64.decode(dataBase64, Base64.DEFAULT);
            File file = attachmentFile(storageKey);
            try (FileOutputStream stream = new FileOutputStream(file)) {
                stream.write(bytes);
            }
            call.resolve(response(file, true, bytes.length, null));
        } catch (Exception error) {
            call.reject(error.getMessage(), error.getClass().getSimpleName(), error);
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            String storageKey = safeStorageKey(call.getString("storageKey", ""));
            File file = attachmentFile(storageKey);
            if (!file.exists()) {
                call.resolve(response(file, false, 0, ""));
                return;
            }
            byte[] bytes = readAllBytes(file);
            call.resolve(response(file, true, bytes.length, Base64.encodeToString(bytes, Base64.NO_WRAP)));
        } catch (Exception error) {
            call.reject(error.getMessage(), error.getClass().getSimpleName(), error);
        }
    }

    @PluginMethod
    public void exists(PluginCall call) {
        try {
            String storageKey = safeStorageKey(call.getString("storageKey", ""));
            File file = attachmentFile(storageKey);
            call.resolve(response(file, file.exists(), file.exists() ? file.length() : 0, null));
        } catch (Exception error) {
            call.reject(error.getMessage(), error.getClass().getSimpleName(), error);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            deleteRecursively(attachmentDir());
            attachmentDir().mkdirs();
            call.resolve();
        } catch (Exception error) {
            call.reject(error.getMessage(), error.getClass().getSimpleName(), error);
        }
    }

    private File attachmentDir() throws IOException {
        File dir = new File(getContext().getFilesDir(), "attachments");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("failed to create attachment dir");
        return dir;
    }

    private File attachmentFile(String storageKey) throws IOException {
        return new File(attachmentDir(), storageKey);
    }

    private String safeStorageKey(String storageKey) throws IOException {
        String value = storageKey == null ? "" : storageKey.trim().toLowerCase(Locale.ROOT);
        String[] parts = value.split("\\.", -1);
        if (parts.length > 2) throw new IOException("unsafe attachment key: " + storageKey);
        String hash = parts.length > 0 ? parts[0] : "";
        if (!hash.matches("[a-f0-9]{64}")) throw new IOException("unsafe attachment key: " + storageKey);
        if (parts.length == 2 && !parts[1].matches("[a-z0-9]{1,12}")) {
            throw new IOException("unsafe attachment key: " + storageKey);
        }
        return value;
    }

    private JSObject response(File file, boolean exists, long size, String dataBase64) {
        JSObject result = new JSObject();
        result.put("path", file.getAbsolutePath());
        result.put("exists", exists);
        result.put("size", size);
        if (dataBase64 != null) result.put("dataBase64", dataBase64);
        return result;
    }

    private byte[] readAllBytes(File file) throws IOException {
        long length = file.length();
        if (length > Integer.MAX_VALUE) throw new IOException("attachment file is too large");
        byte[] bytes = new byte[(int) length];
        int offset = 0;
        try (FileInputStream stream = new FileInputStream(file)) {
            while (offset < bytes.length) {
                int read = stream.read(bytes, offset, bytes.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        if (offset == bytes.length) return bytes;
        byte[] trimmed = new byte[offset];
        System.arraycopy(bytes, 0, trimmed, 0, offset);
        return trimmed;
    }

    private void deleteRecursively(File file) throws IOException {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursively(child);
            }
        }
        if (!file.delete()) throw new IOException("failed to delete " + file.getAbsolutePath());
    }
}
