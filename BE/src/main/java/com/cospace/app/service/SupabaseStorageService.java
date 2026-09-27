package com.cospace.app.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Uploads files to a public Supabase Storage bucket with the service-role key, which never leaves
 * the backend. The bucket is created (public) the first time an upload finds it missing.
 */
@Service
@Slf4j
public class SupabaseStorageService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.supabase.service-role-key:}")
    private String serviceRoleKey;

    @Value("${app.supabase.storage-bucket:workspace-images}")
    private String bucket;

    public boolean isConfigured() {
        return supabaseUrl != null && !supabaseUrl.isBlank() && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    /**
     * Stores {@code content} at {@code path} in the bucket.
     *
     * @return the file's public URL
     */
    public String upload(String path, byte[] content, String contentType) {
        requireConfigured();
        try {
            putObject(path, content, contentType);
        } catch (HttpClientErrorException e) {
            if (!isMissingBucket(e)) throw failure(e);
            createBucket();
            try {
                putObject(path, content, contentType);
            } catch (RestClientException retry) {
                throw failure(retry);
            }
        } catch (RestClientException e) {
            throw failure(e);
        }
        return publicUrl(path);
    }

    /** Removes a file; a failure is only logged so the database row can still be deleted. */
    public void delete(String path) {
        if (!isConfigured() || path == null || path.isBlank()) return;
        try {
            restTemplate.exchange(base() + "/storage/v1/object/" + bucket, HttpMethod.DELETE,
                    new HttpEntity<>(Map.of("prefixes", List.of(path)), jsonHeaders()), String.class);
        } catch (RestClientException e) {
            log.warn("Could not delete {} from storage: {}", path, e.getMessage());
        }
    }

    public String publicUrl(String path) {
        return base() + "/storage/v1/object/public/" + bucket + "/" + path;
    }

    private void putObject(String path, byte[] content, String contentType) {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.set("x-upsert", "true");
        headers.set("cache-control", "max-age=31536000");
        restTemplate.exchange(base() + "/storage/v1/object/" + bucket + "/" + path, HttpMethod.POST,
                new HttpEntity<>(content, headers), String.class);
    }

    private void createBucket() {
        try {
            restTemplate.exchange(base() + "/storage/v1/bucket", HttpMethod.POST,
                    new HttpEntity<>(Map.of("id", bucket, "name", bucket, "public", true), jsonHeaders()), String.class);
            log.info("Created public storage bucket {}", bucket);
        } catch (HttpClientErrorException e) {
            // Created concurrently by another upload: fine.
            if (e.getStatusCode().value() != 409 && !e.getResponseBodyAsString().contains("already exists")) {
                throw failure(e);
            }
        }
    }

    private static boolean isMissingBucket(HttpClientErrorException e) {
        String body = e.getResponseBodyAsString();
        return e.getStatusCode().value() == 404 || body.contains("Bucket not found") || body.contains("bucket_not_found");
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        return headers;
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = authHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String base() {
        return supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("Chưa cấu hình Supabase Storage (SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY) nên chưa thể tải ảnh lên.");
        }
    }

    private static IllegalStateException failure(RestClientException e) {
        log.error("Supabase Storage request failed: {}", e.getMessage());
        return new IllegalStateException("Không tải được ảnh lên kho lưu trữ. Vui lòng thử lại sau.", e);
    }
}
