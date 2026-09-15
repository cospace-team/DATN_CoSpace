package com.cospace.app.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * In-memory response cache for the admin console's slow-changing or expensive-to-recompute reads.
 * Each named cache gets its own TTL matched to how fast that data actually changes: long for
 * near-static config (branches, workspace types, price policies), short for anything a mutation
 * should make visible again quickly (users, audit logs), moderate for the heavy report
 * aggregation query. Controllers evict the relevant cache on their own writes so an admin never
 * sees stale data right after making a change; the TTL alone absorbs staleness from writes made
 * elsewhere (e.g. a new booking shifting report numbers, or another admin's edit).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String ADMIN_BRANCHES = "adminBranches";
    public static final String ADMIN_WORKSPACE_TYPES = "adminWorkspaceTypes";
    public static final String ADMIN_PRICE_POLICIES = "adminPricePolicies";
    public static final String EXTRA_SERVICES = "extraServices";
    public static final String CANCELLATION_POLICIES = "cancellationPolicies";
    public static final String ADMIN_USERS = "adminUsers";
    public static final String AUDIT_LOGS = "auditLogs";
    public static final String REPORTS_OVERVIEW = "reportsOverview";
    public static final String AMENITIES = "amenities";
    public static final String WORKSPACE_TYPE_AMENITIES = "workspaceTypeAmenities";
    public static final String MEMBERSHIP_TIERS = "membershipTiers";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                buildCache(ADMIN_BRANCHES, 10, TimeUnit.MINUTES),
                buildCache(ADMIN_WORKSPACE_TYPES, 10, TimeUnit.MINUTES),
                buildCache(ADMIN_PRICE_POLICIES, 10, TimeUnit.MINUTES),
                buildCache(EXTRA_SERVICES, 5, TimeUnit.MINUTES),
                buildCache(CANCELLATION_POLICIES, 5, TimeUnit.MINUTES),
                buildCache(ADMIN_USERS, 1, TimeUnit.MINUTES),
                buildCache(AUDIT_LOGS, 1, TimeUnit.MINUTES),
                buildCache(REPORTS_OVERVIEW, 2, TimeUnit.MINUTES),
                buildCache(AMENITIES, 10, TimeUnit.MINUTES),
                buildCache(WORKSPACE_TYPE_AMENITIES, 10, TimeUnit.MINUTES),
                // Read on every booking/quote to resolve the tier discount; evicted on tier edits.
                buildCache(MEMBERSHIP_TIERS, 10, TimeUnit.MINUTES)
        ));
        return manager;
    }

    private CaffeineCache buildCache(String name, long ttl, TimeUnit unit) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .expireAfterWrite(ttl, unit)
                .maximumSize(500)
                .build());
    }
}
