package com.cospace.app.service;

import com.cospace.app.entity.NotificationEntity;
import com.cospace.app.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public NotificationEntity createNotification(UUID userId, String title, String content, String type, UUID refId, String refType) {
        NotificationEntity noti = NotificationEntity.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .type(type != null ? type : "SYSTEM")
                .referenceId(refId)
                .referenceType(refType)
                .isRead(false)
                .build();
        return notificationRepository.save(noti);
    }

    @Transactional(readOnly = true)
    public List<NotificationEntity> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(noti -> {
            if (noti.getUserId().equals(userId)) {
                noti.setRead(true);
                notificationRepository.save(noti);
            }
        });
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<NotificationEntity> unreadList = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        for (NotificationEntity noti : unreadList) {
            noti.setRead(true);
        }
        notificationRepository.saveAll(unreadList);
    }
}
